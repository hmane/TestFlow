// =============================================================================
// Legal Workflow - Azure Functions
// AuthorizationHelper.cs - Authorization helper for validating JWT tokens
// =============================================================================
//
// This helper validates JWT tokens passed from APIM and extracts user claims.
// APIM handles initial authentication; this validates the token and extracts
// user identity for SharePoint group membership checks.
// =============================================================================

using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace LegalWorkflow.Functions.Helpers
{
    /// <summary>
    /// Helper class for validating JWT tokens passed through APIM.
    ///
    /// Authentication Flow:
    /// 1. User authenticates in SPFx app using Azure AD
    /// 2. SPFx app calls Azure Function through APIM with bearer token
    /// 3. APIM validates token (optional - can be disabled)
    /// 4. Azure Function validates token and extracts user identity
    /// 5. SharePointAuthorizationService checks SharePoint group membership
    /// </summary>
    public class AuthorizationHelper
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger _logger;
        private readonly string _tenantId;
        private readonly string _clientId;
        private readonly string _audience;
        private readonly ConfigurationManager<OpenIdConnectConfiguration> _configManager;

        /// <summary>
        /// Creates a new AuthorizationHelper instance.
        /// </summary>
        /// <param name="configuration">Application configuration containing Azure AD settings</param>
        /// <param name="logger">Logger instance for diagnostic logging</param>
        public AuthorizationHelper(IConfiguration configuration, ILogger logger)
        {
            _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));

            _tenantId = _configuration["AzureAd:TenantId"]
                ?? throw new InvalidOperationException("AzureAd:TenantId not configured");
            _clientId = _configuration["AzureAd:ClientId"]
                ?? throw new InvalidOperationException("AzureAd:ClientId not configured");

            // Audience can be the client ID or a custom API URI
            _audience = _configuration["AzureAd:Audience"] ?? _clientId;

            // Configure OpenID Connect metadata endpoint for token validation
            var metadataAddress = $"https://login.microsoftonline.com/{_tenantId}/v2.0/.well-known/openid-configuration";
            _configManager = new ConfigurationManager<OpenIdConnectConfiguration>(
                metadataAddress,
                new OpenIdConnectConfigurationRetriever(),
                new HttpDocumentRetriever());
        }

        /// <summary>
        /// Validates the authorization header and extracts user claims.
        /// Returns AuthorizationResult with user info if valid, error message if not.
        /// </summary>
        /// <param name="request">The HTTP request containing Authorization header</param>
        /// <returns>AuthorizationResult with validation status and user info</returns>
        public async Task<AuthorizationResult> ValidateTokenAsync(HttpRequest request)
        {
            try
            {
                // Extract the bearer token from the Authorization header
                var authHeader = request.Headers["Authorization"].FirstOrDefault();
                if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogWarning("Missing or invalid Authorization header");
                    return AuthorizationResult.Unauthorized("Missing or invalid Authorization header");
                }

                var token = authHeader.Substring("Bearer ".Length).Trim();

                // Get the OpenID Connect configuration (signing keys)
                var config = await _configManager.GetConfigurationAsync();

                // Configure token validation parameters
                var validationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuers = new[]
                    {
                        $"https://login.microsoftonline.com/{_tenantId}/v2.0",
                        $"https://sts.windows.net/{_tenantId}/"
                    },
                    ValidateAudience = true,
                    ValidAudiences = new[] { _audience, $"api://{_clientId}" },
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKeys = config.SigningKeys,
                    ClockSkew = TimeSpan.FromMinutes(5)
                };

                // Validate the token
                var tokenHandler = new JwtSecurityTokenHandler();
                var principal = tokenHandler.ValidateToken(token, validationParameters, out var validatedToken);

                // Extract user information from claims
                var userInfo = ExtractUserInfo(principal);

                _logger.LogInformation("Token validated successfully for user: {UserEmail}", userInfo.Email);

                return AuthorizationResult.Success(userInfo);
            }
            catch (SecurityTokenExpiredException)
            {
                _logger.LogWarning("Token has expired");
                return AuthorizationResult.Unauthorized("Token has expired");
            }
            catch (SecurityTokenInvalidAudienceException)
            {
                _logger.LogWarning("Invalid token audience");
                return AuthorizationResult.Unauthorized("Invalid token audience");
            }
            catch (SecurityTokenInvalidIssuerException)
            {
                _logger.LogWarning("Invalid token issuer");
                return AuthorizationResult.Unauthorized("Invalid token issuer");
            }
            catch (SecurityTokenException ex)
            {
                _logger.LogWarning("Token validation failed: {Message}", ex.Message);
                return AuthorizationResult.Unauthorized($"Token validation failed: {ex.Message}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during token validation");
                return AuthorizationResult.Unauthorized("Token validation failed");
            }
        }

        /// <summary>
        /// Extracts user information from the validated token claims.
        /// </summary>
        private UserAuthInfo ExtractUserInfo(ClaimsPrincipal principal)
        {
            var claims = principal.Claims.ToList();

            return new UserAuthInfo
            {
                // Azure AD Object ID (unique user identifier)
                UserId = claims.FirstOrDefault(c => c.Type == "oid" || c.Type == ClaimTypes.NameIdentifier)?.Value ?? string.Empty,

                // User's email address (from preferred_username or email claim)
                Email = claims.FirstOrDefault(c => c.Type == "preferred_username" || c.Type == ClaimTypes.Email || c.Type == "email")?.Value ?? string.Empty,

                // User's display name
                Name = claims.FirstOrDefault(c => c.Type == "name" || c.Type == ClaimTypes.Name)?.Value ?? string.Empty,

                // Tenant ID for multi-tenant validation
                TenantId = claims.FirstOrDefault(c => c.Type == "tid")?.Value ?? string.Empty,

                // User Principal Name (UPN) - typically the same as email
                UserPrincipalName = claims.FirstOrDefault(c => c.Type == "upn" || c.Type == ClaimTypes.Upn)?.Value ?? string.Empty
            };
        }
    }

    /// <summary>
    /// Result of an authorization validation attempt.
    /// </summary>
    public class AuthorizationResult
    {
        /// <summary>
        /// Whether the token validation was successful.
        /// Note: This only validates the token, not SharePoint group membership.
        /// </summary>
        public bool IsAuthorized { get; private set; }

        /// <summary>
        /// Error message if authorization failed.
        /// </summary>
        public string ErrorMessage { get; private set; } = string.Empty;

        /// <summary>
        /// User information if authorization succeeded.
        /// </summary>
        public UserAuthInfo? User { get; private set; }

        /// <summary>
        /// Creates a successful authorization result.
        /// </summary>
        public static AuthorizationResult Success(UserAuthInfo user)
        {
            return new AuthorizationResult
            {
                IsAuthorized = true,
                User = user
            };
        }

        /// <summary>
        /// Creates an unauthorized result with error message.
        /// </summary>
        public static AuthorizationResult Unauthorized(string message)
        {
            return new AuthorizationResult
            {
                IsAuthorized = false,
                ErrorMessage = message
            };
        }
    }

    /// <summary>
    /// User information extracted from the authentication token.
    /// </summary>
    public class UserAuthInfo
    {
        /// <summary>Azure AD Object ID of the user</summary>
        public string UserId { get; set; } = string.Empty;

        /// <summary>User's email address</summary>
        public string Email { get; set; } = string.Empty;

        /// <summary>User's display name</summary>
        public string Name { get; set; } = string.Empty;

        /// <summary>Azure AD tenant ID</summary>
        public string TenantId { get; set; } = string.Empty;

        /// <summary>User Principal Name (typically same as email)</summary>
        public string UserPrincipalName { get; set; } = string.Empty;

        /// <summary>
        /// Gets the login name format used by SharePoint.
        /// Format: i:0#.f|membership|user@domain.com
        /// </summary>
        public string SharePointLoginName => string.IsNullOrEmpty(Email)
            ? string.Empty
            : $"i:0#.f|membership|{Email.ToLowerInvariant()}";
    }
}

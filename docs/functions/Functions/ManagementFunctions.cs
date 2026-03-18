// =============================================================================
// Legal Workflow - Azure Functions
// ManagementFunctions.cs - Operational management endpoints
// =============================================================================

using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using LegalWorkflow.Functions.Helpers;
using LegalWorkflow.Functions.Models;
using LegalWorkflow.Functions.Services;

namespace LegalWorkflow.Functions
{
    /// <summary>
    /// Operational endpoints for health monitoring and certificate refresh.
    /// </summary>
    public class ManagementFunctions
    {
        private readonly ILogger<ManagementFunctions> _logger;
        private readonly PermissionGroupConfig _groupConfig;
        private readonly ReloadableX509AuthenticationProvider _authenticationProvider;
        private readonly AuthorizationHelper _authorizationHelper;

        public ManagementFunctions(
            ILogger<ManagementFunctions> logger,
            PermissionGroupConfig groupConfig,
            ReloadableX509AuthenticationProvider authenticationProvider,
            AuthorizationHelper authorizationHelper)
        {
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _groupConfig = groupConfig ?? throw new ArgumentNullException(nameof(groupConfig));
            _authenticationProvider = authenticationProvider ?? throw new ArgumentNullException(nameof(authenticationProvider));
            _authorizationHelper = authorizationHelper ?? throw new ArgumentNullException(nameof(authorizationHelper));
        }

        /// <summary>
        /// Public health endpoint for the Functions application.
        /// </summary>
        [Function("FunctionsHealth")]
        public IActionResult Health(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "health")] HttpRequest req)
        {
            return new OkObjectResult(new
            {
                Status = "Healthy",
                Timestamp = DateTime.UtcNow,
                Version = "1.0.0",
                Service = "LegalWorkflow.Functions"
            });
        }

        /// <summary>
        /// Reloads the certificate from Key Vault without restarting the Functions host.
        /// Only the configured Power Automate service account can invoke this endpoint.
        /// </summary>
        [Function("FlushCertificateCache")]
        public async Task<IActionResult> FlushCertificateCache(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "management/certificate-cache/flush")] HttpRequest req)
        {
            var logger = new Logger(_logger, "FlushCertificateCache");
            logger.Info("Certificate cache flush request received");

            try
            {
                var authResult = await AuthenticateAsync(req);
                if (!authResult.IsAuthorized)
                {
                    logger.LogAuditSummary("FlushCertificateCache", "Unauthorized", authResult.ErrorMessage ?? "Token validation failed");
                    return new UnauthorizedObjectResult(new
                    {
                        Success = false,
                        Message = authResult.ErrorMessage
                    });
                }

                var user = authResult.User!;
                logger.SetUserContext(user.Email, user.SharePointLoginName);

                if (!IsServiceAccount(user))
                {
                    logger.Warning("Certificate cache flush denied for non-service-account caller");
                    logger.LogAuditSummary("FlushCertificateCache", "Forbidden", $"{user.Email} is not the configured service account");
                    return new ObjectResult(new
                    {
                        Success = false,
                        Message = "Only the configured service account can flush the certificate cache."
                    })
                    { StatusCode = 403 };
                }

                var refreshResult = await _authenticationProvider.RefreshAsync();

                logger.Info("Certificate cache flushed successfully", new
                {
                    PreviousThumbprintSuffix = refreshResult.Previous.ThumbprintSuffix,
                    CurrentThumbprintSuffix = refreshResult.Current.ThumbprintSuffix,
                    RefreshedAtUtc = refreshResult.RefreshedAtUtc
                });
                logger.LogAuditSummary("FlushCertificateCache", "Success",
                    $"Certificate refreshed by {user.Email} — previous: ...{refreshResult.Previous.ThumbprintSuffix}, current: ...{refreshResult.Current.ThumbprintSuffix}");

                return new OkObjectResult(new
                {
                    Success = true,
                    Message = "Certificate cache flushed successfully.",
                    RefreshedAtUtc = refreshResult.RefreshedAtUtc,
                    PreviousCertificate = new
                    {
                        refreshResult.Previous.Subject,
                        refreshResult.Previous.ThumbprintSuffix,
                        refreshResult.Previous.LoadedAtUtc,
                        refreshResult.Previous.ExpiresOnUtc
                    },
                    CurrentCertificate = new
                    {
                        refreshResult.Current.Subject,
                        refreshResult.Current.ThumbprintSuffix,
                        refreshResult.Current.LoadedAtUtc,
                        refreshResult.Current.ExpiresOnUtc
                    }
                });
            }
            catch (Exception ex)
            {
                logger.Error("Unhandled exception while flushing certificate cache", ex);
                logger.LogAuditSummary("FlushCertificateCache", "Error", ex.Message);
                return new ObjectResult(new
                {
                    Success = false,
                    Message = "Internal server error"
                })
                { StatusCode = 500 };
            }
        }

        private async Task<AuthorizationResult> AuthenticateAsync(HttpRequest request)
        {
            return await _authorizationHelper.ValidateTokenAsync(request);
        }

        private bool IsServiceAccount(UserAuthInfo user)
        {
            if (string.IsNullOrWhiteSpace(_groupConfig.ServiceAccountUpn))
            {
                return false;
            }

            return _groupConfig.ServiceAccountUpn.Equals(user.Email, StringComparison.OrdinalIgnoreCase) ||
                   _groupConfig.ServiceAccountUpn.Equals(user.UserPrincipalName, StringComparison.OrdinalIgnoreCase);
        }
    }
}

// =============================================================================
// Legal Workflow - Azure Functions
// PermissionFunctions.cs - HTTP endpoints for permission management
// =============================================================================
//
// These endpoints manage SharePoint permissions on Legal Review Requests.
//
// Authorization Flow:
// 1. APIM handles authentication (token validation)
// 2. AuthorizationHelper extracts user identity from the token
// 3. SharePointAuthorizationService checks:
//    a. Is this the Power Automate service account? → Authorized
//    b. Does the user have Contribute/Contribute Without Delete on the item? → Authorized
// =============================================================================

using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using LegalWorkflow.Functions.Helpers;
using LegalWorkflow.Functions.Models;
using LegalWorkflow.Functions.Services;
using PnP.Core.Services;

namespace LegalWorkflow.Functions
{
    /// <summary>
    /// Azure Functions for managing SharePoint permissions on Legal Review Requests.
    ///
    /// Endpoints:
    /// - POST /api/permissions/initialize - Break inheritance and set initial permissions
    /// - POST /api/permissions/add-user - Add Read permission for a user
    /// - POST /api/permissions/remove-user - Remove a user's permissions
    /// - POST /api/permissions/complete - Set final permissions when request is completed
    ///
    /// Authorization:
    /// - Power Automate service account (matched via config) bypasses permission checks
    /// - Users must have Contribute or Contribute Without Delete on the request item
    /// </summary>
    public class PermissionFunctions
    {
        private readonly IPnPContextFactory _contextFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<PermissionFunctions> _logger;
        private readonly PermissionGroupConfig _groupConfig;
        private readonly JsonSerializerOptions _jsonOptions;

        /// <summary>
        /// Creates a new PermissionFunctions instance with dependency injection.
        /// </summary>
        public PermissionFunctions(
            IPnPContextFactory contextFactory,
            IConfiguration configuration,
            ILogger<PermissionFunctions> logger,
            PermissionGroupConfig groupConfig)
        {
            _contextFactory = contextFactory ?? throw new ArgumentNullException(nameof(contextFactory));
            _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _groupConfig = groupConfig ?? throw new ArgumentNullException(nameof(groupConfig));
            _jsonOptions = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };
        }

        /// <summary>
        /// Initializes permissions for a newly created request.
        /// Breaks inheritance and sets up initial permissions on both the request item
        /// and the RequestDocuments folder.
        ///
        /// Called from SPFx app when request is saved (Draft or Legal Intake).
        ///
        /// POST /api/permissions/initialize
        /// Body: { "requestId": 123, "requestTitle": "LRQ-2024-001234" }
        /// </summary>
        [Function("InitializePermissions")]
        public async Task<IActionResult> InitializePermissions(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "permissions/initialize")] HttpRequest req)
        {
            var logger = new Logger(_logger, "InitializePermissions");
            logger.Info("Permission initialization request received");

            try
            {
                // Step 1: Authenticate - Extract user identity from token
                var authResult = await AuthenticateAsync(req, logger);
                if (!authResult.IsAuthorized)
                {
                    return new UnauthorizedObjectResult(new PermissionResponse
                    {
                        Success = false,
                        Message = authResult.ErrorMessage
                    });
                }

                logger.SetUserContext(authResult.User!.Email, authResult.User.SharePointLoginName);

                // Step 2: Parse request body
                string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
                var request = JsonSerializer.Deserialize<InitializePermissionsRequest>(requestBody, _jsonOptions);

                if (request == null || request.RequestId <= 0 || string.IsNullOrEmpty(request.RequestTitle))
                {
                    logger.Warning("Invalid request - missing required fields");
                    return new BadRequestObjectResult(new PermissionResponse
                    {
                        Success = false,
                        Message = "Invalid request. RequestId and RequestTitle are required."
                    });
                }

                logger.SetRequestContext(request.RequestId, request.RequestTitle);

                // Step 3: Authorize - Service account check or item-level permission check
                var authzResult = await AuthorizeAsync(authResult.User!, request.RequestId, logger);
                if (!authzResult.IsAuthorized)
                {
                    return new ObjectResult(new PermissionResponse
                    {
                        Success = false,
                        Message = authzResult.ErrorMessage
                    })
                    { StatusCode = 403 };
                }

                logger.Info("Processing permission initialization", new
                {
                    request.RequestId,
                    request.RequestTitle,
                    User = authResult.User!.Email,
                    AuthReason = authzResult.Reason
                });

                // Step 4: Execute
                var permissionService = new PermissionService(_contextFactory, logger);
                var result = await permissionService.InitializePermissionsAsync(request);

                if (result.Success)
                {
                    logger.Info("Permission initialization completed successfully", new
                    {
                        ChangeCount = result.Changes.Count
                    });
                    return new OkObjectResult(result);
                }
                else
                {
                    logger.Error("Permission initialization failed", null, new { Error = result.Error });
                    return new ObjectResult(result) { StatusCode = 500 };
                }
            }
            catch (Exception ex)
            {
                logger.Error("Unhandled exception in InitializePermissions", ex);
                return new ObjectResult(new PermissionResponse
                {
                    Success = false,
                    Message = "Internal server error",
                    Error = ex.Message
                })
                { StatusCode = 500 };
            }
        }

        /// <summary>
        /// Adds Read permission for a user on the request and documents folder.
        /// Called from SPFx app when user is added via Manage Access component.
        ///
        /// POST /api/permissions/add-user
        /// Body: { "requestId": 123, "requestTitle": "LRQ-2024-001234",
        ///         "userLoginName": "i:0#.f|membership|user@domain.com",
        ///         "userEmail": "user@domain.com" }
        /// </summary>
        [Function("AddUserPermission")]
        public async Task<IActionResult> AddUserPermission(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "permissions/add-user")] HttpRequest req)
        {
            var logger = new Logger(_logger, "AddUserPermission");
            logger.Info("Add user permission request received");

            try
            {
                // Step 1: Authenticate
                var authResult = await AuthenticateAsync(req, logger);
                if (!authResult.IsAuthorized)
                {
                    return new UnauthorizedObjectResult(new PermissionResponse
                    {
                        Success = false,
                        Message = authResult.ErrorMessage
                    });
                }

                logger.SetUserContext(authResult.User!.Email, authResult.User.SharePointLoginName);

                // Step 2: Parse request body
                string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
                var request = JsonSerializer.Deserialize<AddUserPermissionRequest>(requestBody, _jsonOptions);

                if (request == null || request.RequestId <= 0 ||
                    string.IsNullOrEmpty(request.RequestTitle) ||
                    string.IsNullOrEmpty(request.UserLoginName))
                {
                    logger.Warning("Invalid request - missing required fields");
                    return new BadRequestObjectResult(new PermissionResponse
                    {
                        Success = false,
                        Message = "Invalid request. RequestId, RequestTitle, and UserLoginName are required."
                    });
                }

                logger.SetRequestContext(request.RequestId, request.RequestTitle);

                // Step 3: Authorize
                var authzResult = await AuthorizeAsync(authResult.User!, request.RequestId, logger);
                if (!authzResult.IsAuthorized)
                {
                    return new ObjectResult(new PermissionResponse
                    {
                        Success = false,
                        Message = authzResult.ErrorMessage
                    })
                    { StatusCode = 403 };
                }

                logger.Info("Processing add user permission", new
                {
                    request.RequestId,
                    request.RequestTitle,
                    TargetUser = request.UserEmail,
                    RequestedBy = authResult.User!.Email
                });

                // Step 4: Execute
                var permissionService = new PermissionService(_contextFactory, logger);
                var result = await permissionService.AddUserPermissionAsync(request);

                if (result.Success)
                {
                    logger.Info("User permission added successfully");
                    return new OkObjectResult(result);
                }
                else
                {
                    logger.Error("Failed to add user permission", null, new { Error = result.Error });
                    return new ObjectResult(result) { StatusCode = 500 };
                }
            }
            catch (Exception ex)
            {
                logger.Error("Unhandled exception in AddUserPermission", ex);
                return new ObjectResult(new PermissionResponse
                {
                    Success = false,
                    Message = "Internal server error",
                    Error = ex.Message
                })
                { StatusCode = 500 };
            }
        }

        /// <summary>
        /// Removes a user's permission from the request and documents folder.
        /// Called from SPFx app when user is removed via Manage Access component.
        ///
        /// POST /api/permissions/remove-user
        /// Body: { "requestId": 123, "requestTitle": "LRQ-2024-001234",
        ///         "userLoginName": "i:0#.f|membership|user@domain.com",
        ///         "userEmail": "user@domain.com" }
        /// </summary>
        [Function("RemoveUserPermission")]
        public async Task<IActionResult> RemoveUserPermission(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "permissions/remove-user")] HttpRequest req)
        {
            var logger = new Logger(_logger, "RemoveUserPermission");
            logger.Info("Remove user permission request received");

            try
            {
                // Step 1: Authenticate
                var authResult = await AuthenticateAsync(req, logger);
                if (!authResult.IsAuthorized)
                {
                    return new UnauthorizedObjectResult(new PermissionResponse
                    {
                        Success = false,
                        Message = authResult.ErrorMessage
                    });
                }

                logger.SetUserContext(authResult.User!.Email, authResult.User.SharePointLoginName);

                // Step 2: Parse request body
                string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
                var request = JsonSerializer.Deserialize<RemoveUserPermissionRequest>(requestBody, _jsonOptions);

                if (request == null || request.RequestId <= 0 ||
                    string.IsNullOrEmpty(request.RequestTitle) ||
                    string.IsNullOrEmpty(request.UserLoginName))
                {
                    logger.Warning("Invalid request - missing required fields");
                    return new BadRequestObjectResult(new PermissionResponse
                    {
                        Success = false,
                        Message = "Invalid request. RequestId, RequestTitle, and UserLoginName are required."
                    });
                }

                logger.SetRequestContext(request.RequestId, request.RequestTitle);

                // Step 3: Authorize
                var authzResult = await AuthorizeAsync(authResult.User!, request.RequestId, logger);
                if (!authzResult.IsAuthorized)
                {
                    return new ObjectResult(new PermissionResponse
                    {
                        Success = false,
                        Message = authzResult.ErrorMessage
                    })
                    { StatusCode = 403 };
                }

                logger.Info("Processing remove user permission", new
                {
                    request.RequestId,
                    request.RequestTitle,
                    TargetUser = request.UserEmail,
                    RequestedBy = authResult.User!.Email
                });

                // Step 4: Execute
                var permissionService = new PermissionService(_contextFactory, logger);
                var result = await permissionService.RemoveUserPermissionAsync(request);

                if (result.Success)
                {
                    logger.Info("User permission removed successfully");
                    return new OkObjectResult(result);
                }
                else
                {
                    logger.Error("Failed to remove user permission", null, new { Error = result.Error });
                    return new ObjectResult(result) { StatusCode = 500 };
                }
            }
            catch (Exception ex)
            {
                logger.Error("Unhandled exception in RemoveUserPermission", ex);
                return new ObjectResult(new PermissionResponse
                {
                    Success = false,
                    Message = "Internal server error",
                    Error = ex.Message
                })
                { StatusCode = 500 };
            }
        }

        /// <summary>
        /// Updates permissions when a request is completed.
        /// Admin keeps Full Control, everyone else gets Read only.
        /// Called from Power Automate when status changes to Completed.
        ///
        /// POST /api/permissions/complete
        /// Body: { "requestId": 123, "requestTitle": "LRQ-2024-001234" }
        /// </summary>
        [Function("CompletePermissions")]
        public async Task<IActionResult> CompletePermissions(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "permissions/complete")] HttpRequest req)
        {
            var logger = new Logger(_logger, "CompletePermissions");
            logger.Info("Complete permissions request received");

            try
            {
                // Step 1: Authenticate
                var authResult = await AuthenticateAsync(req, logger);
                if (!authResult.IsAuthorized)
                {
                    return new UnauthorizedObjectResult(new PermissionResponse
                    {
                        Success = false,
                        Message = authResult.ErrorMessage
                    });
                }

                logger.SetUserContext(authResult.User!.Email, authResult.User.SharePointLoginName);

                // Step 2: Parse request body
                string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
                var request = JsonSerializer.Deserialize<CompletePermissionsRequest>(requestBody, _jsonOptions);

                if (request == null || request.RequestId <= 0 || string.IsNullOrEmpty(request.RequestTitle))
                {
                    logger.Warning("Invalid request - missing required fields");
                    return new BadRequestObjectResult(new PermissionResponse
                    {
                        Success = false,
                        Message = "Invalid request. RequestId and RequestTitle are required."
                    });
                }

                logger.SetRequestContext(request.RequestId, request.RequestTitle);

                // Step 3: Authorize - service account or item-level permission
                var authzResult = await AuthorizeAsync(authResult.User!, request.RequestId, logger);
                if (!authzResult.IsAuthorized)
                {
                    return new ObjectResult(new PermissionResponse
                    {
                        Success = false,
                        Message = authzResult.ErrorMessage
                    })
                    { StatusCode = 403 };
                }

                logger.Info("Processing complete permissions", new
                {
                    request.RequestId,
                    request.RequestTitle,
                    AuthReason = authzResult.Reason
                });

                // Step 4: Execute
                var permissionService = new PermissionService(_contextFactory, logger);
                var result = await permissionService.CompletePermissionsAsync(request);

                if (result.Success)
                {
                    logger.Info("Completion permissions set successfully", new
                    {
                        ChangeCount = result.Changes.Count
                    });
                    return new OkObjectResult(result);
                }
                else
                {
                    logger.Error("Failed to set completion permissions", null, new { Error = result.Error });
                    return new ObjectResult(result) { StatusCode = 500 };
                }
            }
            catch (Exception ex)
            {
                logger.Error("Unhandled exception in CompletePermissions", ex);
                return new ObjectResult(new PermissionResponse
                {
                    Success = false,
                    Message = "Internal server error",
                    Error = ex.Message
                })
                { StatusCode = 500 };
            }
        }

        #region Private Helper Methods

        /// <summary>
        /// Authenticates the request by validating the JWT token and extracting user identity.
        /// APIM handles primary authentication; this provides defense-in-depth.
        /// </summary>
        private async Task<AuthorizationResult> AuthenticateAsync(HttpRequest request, Logger logger)
        {
            var authHelper = new AuthorizationHelper(_configuration, _logger);
            return await authHelper.ValidateTokenAsync(request);
        }

        /// <summary>
        /// Authorizes the request by checking service account match or item-level permissions.
        /// </summary>
        private async Task<SharePointAuthorizationResult> AuthorizeAsync(
            UserAuthInfo userInfo,
            int requestId,
            Logger logger)
        {
            var authzService = new SharePointAuthorizationService(_contextFactory, logger, _groupConfig);
            return await authzService.AuthorizeAsync(userInfo, requestId);
        }

        #endregion
    }
}

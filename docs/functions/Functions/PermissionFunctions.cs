// =============================================================================
// Legal Workflow - Azure Functions
// PermissionFunctions.cs - HTTP endpoints for permission management
// =============================================================================
//
// These endpoints manage SharePoint permissions on Legal Review Requests.
// All endpoints require authentication via APIM and authorization via
// SharePoint group membership.
//
// Authorization Flow:
// 1. APIM passes the user's OAuth token in the Authorization header
// 2. AuthorizationHelper validates the token and extracts user identity
// 3. SharePointAuthorizationService checks SharePoint group membership
// 4. Action-specific authorization is enforced (e.g., ownership checks)
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
    /// - All endpoints require a valid Azure AD token (passed from APIM)
    /// - User must be a member of an authorized SharePoint group
    /// - Some actions require ownership (submitter) or elevated permissions (admin)
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
        /// <param name="contextFactory">PnP Core context factory for SharePoint access</param>
        /// <param name="configuration">Application configuration</param>
        /// <param name="logger">ILogger instance for Azure Functions logging</param>
        /// <param name="groupConfig">SharePoint group configuration</param>
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
        /// Authorization: Any authorized group member (they're creating their own request)
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
                // Step 1: Authenticate - Validate the token
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

                // Step 3: Authorize - Check SharePoint group membership
                var authzResult = await AuthorizeAsync(authResult.User!, AuthorizationAction.InitializePermissions, request.RequestId, logger);
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
                    User = authResult.User!.Email
                });

                // Step 4: Execute - Create permission service and process request
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
        /// Authorization:
        /// - Admin or Legal Admin: Can add users to any request
        /// - Submitter: Can only add users to their own request
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

                // Step 3: Authorize - Check SharePoint group membership and ownership
                var authzResult = await AuthorizeAsync(authResult.User!, AuthorizationAction.AddUserPermission, request.RequestId, logger);
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
        /// Authorization:
        /// - Admin or Legal Admin: Can remove users from any request
        /// - Submitter: Can only remove users from their own request
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
                var authzResult = await AuthorizeAsync(authResult.User!, AuthorizationAction.RemoveUserPermission, request.RequestId, logger);
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
        /// Authorization:
        /// - Admin only (Power Automate uses function key for service calls)
        ///
        /// POST /api/permissions/complete
        /// Body: { "requestId": 123, "requestTitle": "LRQ-2024-001234" }
        /// </summary>
        [Function("CompletePermissions")]
        public async Task<IActionResult> CompletePermissions(
            [HttpTrigger(AuthorizationLevel.Function, "post", Route = "permissions/complete")] HttpRequest req)
        {
            var logger = new Logger(_logger, "CompletePermissions");
            logger.Info("Complete permissions request received");

            try
            {
                // Note: This endpoint uses Function-level auth for Power Automate calls
                // Power Automate uses the function key, not user tokens
                // For user-initiated calls through APIM, we also check authorization

                var authHeader = req.Headers["Authorization"].FirstOrDefault();
                if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                {
                    // User token present - validate and authorize
                    var authResult = await AuthenticateAsync(req, logger);
                    if (!authResult.IsAuthorized)
                    {
                        return new UnauthorizedObjectResult(new PermissionResponse
                        {
                            Success = false,
                            Message = authResult.ErrorMessage
                        });
                    }

                    // Only admin can complete permissions via user call
                    var authzResult = await AuthorizeAsync(authResult.User!, AuthorizationAction.CompletePermissions, null, logger);
                    if (!authzResult.IsAuthorized)
                    {
                        return new ObjectResult(new PermissionResponse
                        {
                            Success = false,
                            Message = authzResult.ErrorMessage
                        })
                        { StatusCode = 403 };
                    }

                    logger.SetUserContext(authResult.User!.Email, authResult.User.SharePointLoginName);
                }
                else
                {
                    // Function key auth (Power Automate) - log as system call
                    logger.Info("Complete permissions called via function key (system/Power Automate)");
                }

                // Parse request body
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
                logger.Info("Processing complete permissions", new
                {
                    request.RequestId,
                    request.RequestTitle
                });

                // Execute
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
        /// Authenticates the request by validating the JWT token.
        /// </summary>
        private async Task<AuthorizationResult> AuthenticateAsync(HttpRequest request, Logger logger)
        {
            var authHelper = new AuthorizationHelper(_configuration, _logger);
            return await authHelper.ValidateTokenAsync(request);
        }

        /// <summary>
        /// Authorizes the action by checking SharePoint group membership.
        /// </summary>
        private async Task<SharePointAuthorizationResult> AuthorizeAsync(
            UserAuthInfo userInfo,
            AuthorizationAction action,
            int? requestId,
            Logger logger)
        {
            var authzService = new SharePointAuthorizationService(_contextFactory, logger, _groupConfig);
            return await authzService.AuthorizeAsync(userInfo, action, requestId);
        }

        #endregion
    }
}

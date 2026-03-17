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
//    b. Does the user have effective edit permission on the item? → Authorized
// =============================================================================

using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
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
    /// - Users must have effective edit permission on the request item
    /// </summary>
    public class PermissionFunctions
    {
        private readonly IPnPContextFactory _contextFactory;
        private readonly ILogger<PermissionFunctions> _logger;
        private readonly PermissionGroupConfig _groupConfig;
        private readonly SharePointListConfig _listConfig;
        private readonly AuthorizationHelper _authorizationHelper;
        private readonly JsonSerializerOptions _jsonOptions;

        public PermissionFunctions(
            IPnPContextFactory contextFactory,
            ILogger<PermissionFunctions> logger,
            PermissionGroupConfig groupConfig,
            SharePointListConfig listConfig,
            AuthorizationHelper authorizationHelper)
        {
            _contextFactory = contextFactory ?? throw new ArgumentNullException(nameof(contextFactory));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _groupConfig = groupConfig ?? throw new ArgumentNullException(nameof(groupConfig));
            _listConfig = listConfig ?? throw new ArgumentNullException(nameof(listConfig));
            _authorizationHelper = authorizationHelper ?? throw new ArgumentNullException(nameof(authorizationHelper));
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
        /// Body: { "requestId": 123 }
        /// </summary>
        [Function("InitializePermissions")]
        public async Task<IActionResult> InitializePermissions(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "permissions/initialize")] HttpRequest req)
        {
            var logger = new Logger(_logger, "InitializePermissions");
            logger.Info("Permission initialization request received");

            try
            {
                // Step 1: Authenticate
                var authResult = await AuthenticateAsync(req, logger);
                if (!authResult.IsAuthorized)
                {
                    logger.LogAuditSummary("InitializePermissions", "Unauthorized", authResult.ErrorMessage ?? "Token validation failed");
                    return new UnauthorizedObjectResult(new PermissionResponse
                    {
                        Success = false,
                        Message = authResult.ErrorMessage ?? "Unauthorized"
                    });
                }

                logger.SetUserContext(authResult.User!.Email, authResult.User.SharePointLoginName);

                // Step 2: Parse request body
                string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
                var request = JsonSerializer.Deserialize<InitializePermissionsRequest>(requestBody, _jsonOptions);

                if (request == null || request.RequestId <= 0)
                {
                    logger.Warning("Invalid request - missing required fields");
                    logger.LogAuditSummary("InitializePermissions", "InvalidRequest", "RequestId is missing or invalid");
                    return new BadRequestObjectResult(new PermissionResponse
                    {
                        Success = false,
                        Message = "Invalid request. RequestId is required."
                    });
                }

                logger.SetRequestContext(request.RequestId, GetRequestContextTitle(request.RequestId, request.RequestTitle));

                // Step 3: Authorize
                var authzResult = await AuthorizeAsync(authResult.User!, request.RequestId, logger);
                if (!authzResult.IsAuthorized)
                {
                    logger.LogAuditSummary("InitializePermissions", "Forbidden", authzResult.ErrorMessage ?? "Insufficient permissions");
                    return new ObjectResult(new PermissionResponse
                    {
                        Success = false,
                        Message = authzResult.ErrorMessage ?? "Access denied"
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
                var permissionService = new PermissionService(_contextFactory, logger, _groupConfig, _listConfig);
                var result = await permissionService.InitializePermissionsAsync(request);

                if (result.Success)
                {
                    logger.Info("Permission initialization completed successfully", new { ChangeCount = result.Changes.Count });
                    logger.LogAuditSummary("InitializePermissions", "Success", $"{result.Changes.Count} permission changes applied to request {request.RequestId}");
                    return new OkObjectResult(result);
                }
                else
                {
                    logger.Error("Permission initialization failed", null, new { Error = result.Error });
                    logger.LogAuditSummary("InitializePermissions", "Failed", result.Error ?? "Permission initialization failed");
                    return new ObjectResult(CreateInternalErrorResponse("Permission initialization failed")) { StatusCode = 500 };
                }
            }
            catch (Exception ex)
            {
                logger.Error("Unhandled exception in InitializePermissions", ex);
                logger.LogAuditSummary("InitializePermissions", "Error", ex.Message);
                return new ObjectResult(CreateInternalErrorResponse()) { StatusCode = 500 };
            }
        }

        /// <summary>
        /// Adds Read permission for a user on the request and documents folder.
        /// Called from SPFx app when user is added via Manage Access component.
        ///
        /// POST /api/permissions/add-user
        /// Body: { "requestId": 123,
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
                    logger.LogAuditSummary("AddUserPermission", "Unauthorized", authResult.ErrorMessage ?? "Token validation failed");
                    return new UnauthorizedObjectResult(new PermissionResponse
                    {
                        Success = false,
                        Message = authResult.ErrorMessage ?? "Unauthorized"
                    });
                }

                logger.SetUserContext(authResult.User!.Email, authResult.User.SharePointLoginName);

                // Step 2: Parse request body
                string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
                var request = JsonSerializer.Deserialize<AddUserPermissionRequest>(requestBody, _jsonOptions);

                if (request == null || request.RequestId <= 0 ||
                    string.IsNullOrEmpty(request.UserLoginName))
                {
                    logger.Warning("Invalid request - missing required fields");
                    logger.LogAuditSummary("AddUserPermission", "InvalidRequest", "RequestId or UserLoginName is missing");
                    return new BadRequestObjectResult(new PermissionResponse
                    {
                        Success = false,
                        Message = "Invalid request. RequestId and UserLoginName are required."
                    });
                }

                logger.SetRequestContext(request.RequestId, GetRequestContextTitle(request.RequestId, request.RequestTitle));

                // Step 3: Authorize
                var authzResult = await AuthorizeAsync(authResult.User!, request.RequestId, logger);
                if (!authzResult.IsAuthorized)
                {
                    logger.LogAuditSummary("AddUserPermission", "Forbidden", authzResult.ErrorMessage ?? "Insufficient permissions");
                    return new ObjectResult(new PermissionResponse
                    {
                        Success = false,
                        Message = authzResult.ErrorMessage ?? "Access denied"
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
                var permissionService = new PermissionService(_contextFactory, logger, _groupConfig, _listConfig);
                var result = await permissionService.AddUserPermissionAsync(request);

                if (result.Success)
                {
                    logger.Info("User permission added successfully");
                    logger.LogAuditSummary("AddUserPermission", "Success", $"Read access granted to {request.UserEmail} on request {request.RequestId}");
                    return new OkObjectResult(result);
                }
                else
                {
                    logger.Error("Failed to add user permission", null, new { Error = result.Error });
                    logger.LogAuditSummary("AddUserPermission", "Failed", result.Error ?? "Failed to add user permission");
                    return new ObjectResult(CreateInternalErrorResponse("Failed to add user permission")) { StatusCode = 500 };
                }
            }
            catch (Exception ex)
            {
                logger.Error("Unhandled exception in AddUserPermission", ex);
                logger.LogAuditSummary("AddUserPermission", "Error", ex.Message);
                return new ObjectResult(CreateInternalErrorResponse()) { StatusCode = 500 };
            }
        }

        /// <summary>
        /// Removes a user's permission from the request and documents folder.
        /// Called from SPFx app when user is removed via Manage Access component.
        ///
        /// POST /api/permissions/remove-user
        /// Body: { "requestId": 123,
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
                    logger.LogAuditSummary("RemoveUserPermission", "Unauthorized", authResult.ErrorMessage ?? "Token validation failed");
                    return new UnauthorizedObjectResult(new PermissionResponse
                    {
                        Success = false,
                        Message = authResult.ErrorMessage ?? "Unauthorized"
                    });
                }

                logger.SetUserContext(authResult.User!.Email, authResult.User.SharePointLoginName);

                // Step 2: Parse request body
                string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
                var request = JsonSerializer.Deserialize<RemoveUserPermissionRequest>(requestBody, _jsonOptions);

                if (request == null || request.RequestId <= 0 ||
                    string.IsNullOrEmpty(request.UserLoginName))
                {
                    logger.Warning("Invalid request - missing required fields");
                    logger.LogAuditSummary("RemoveUserPermission", "InvalidRequest", "RequestId or UserLoginName is missing");
                    return new BadRequestObjectResult(new PermissionResponse
                    {
                        Success = false,
                        Message = "Invalid request. RequestId and UserLoginName are required."
                    });
                }

                logger.SetRequestContext(request.RequestId, GetRequestContextTitle(request.RequestId, request.RequestTitle));

                // Step 3: Authorize
                var authzResult = await AuthorizeAsync(authResult.User!, request.RequestId, logger);
                if (!authzResult.IsAuthorized)
                {
                    logger.LogAuditSummary("RemoveUserPermission", "Forbidden", authzResult.ErrorMessage ?? "Insufficient permissions");
                    return new ObjectResult(new PermissionResponse
                    {
                        Success = false,
                        Message = authzResult.ErrorMessage ?? "Access denied"
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
                var permissionService = new PermissionService(_contextFactory, logger, _groupConfig, _listConfig);
                var result = await permissionService.RemoveUserPermissionAsync(request);

                if (result.Success)
                {
                    logger.Info("User permission removed successfully");
                    logger.LogAuditSummary("RemoveUserPermission", "Success", $"Access removed for {request.UserEmail} from request {request.RequestId}");
                    return new OkObjectResult(result);
                }
                else
                {
                    logger.Error("Failed to remove user permission", null, new { Error = result.Error });
                    logger.LogAuditSummary("RemoveUserPermission", "Failed", result.Error ?? "Failed to remove user permission");
                    return new ObjectResult(CreateInternalErrorResponse("Failed to remove user permission")) { StatusCode = 500 };
                }
            }
            catch (Exception ex)
            {
                logger.Error("Unhandled exception in RemoveUserPermission", ex);
                logger.LogAuditSummary("RemoveUserPermission", "Error", ex.Message);
                return new ObjectResult(CreateInternalErrorResponse()) { StatusCode = 500 };
            }
        }

        /// <summary>
        /// Updates permissions when a request is completed.
        /// Admin keeps Full Control, everyone else gets Read only.
        /// Called from Power Automate when status changes to Completed.
        ///
        /// POST /api/permissions/complete
        /// Body: { "requestId": 123 }
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
                    logger.LogAuditSummary("CompletePermissions", "Unauthorized", authResult.ErrorMessage ?? "Token validation failed");
                    return new UnauthorizedObjectResult(new PermissionResponse
                    {
                        Success = false,
                        Message = authResult.ErrorMessage ?? "Unauthorized"
                    });
                }

                logger.SetUserContext(authResult.User!.Email, authResult.User.SharePointLoginName);

                // Step 2: Parse request body
                string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
                var request = JsonSerializer.Deserialize<CompletePermissionsRequest>(requestBody, _jsonOptions);

                if (request == null || request.RequestId <= 0)
                {
                    logger.Warning("Invalid request - missing required fields");
                    logger.LogAuditSummary("CompletePermissions", "InvalidRequest", "RequestId is missing or invalid");
                    return new BadRequestObjectResult(new PermissionResponse
                    {
                        Success = false,
                        Message = "Invalid request. RequestId is required."
                    });
                }

                logger.SetRequestContext(request.RequestId, GetRequestContextTitle(request.RequestId, request.RequestTitle));

                // Step 3: Authorize
                var authzResult = await AuthorizeAsync(authResult.User!, request.RequestId, logger);
                if (!authzResult.IsAuthorized)
                {
                    logger.LogAuditSummary("CompletePermissions", "Forbidden", authzResult.ErrorMessage ?? "Insufficient permissions");
                    return new ObjectResult(new PermissionResponse
                    {
                        Success = false,
                        Message = authzResult.ErrorMessage ?? "Access denied"
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
                var permissionService = new PermissionService(_contextFactory, logger, _groupConfig, _listConfig);
                var result = await permissionService.CompletePermissionsAsync(request);

                if (result.Success)
                {
                    logger.Info("Completion permissions set successfully", new { ChangeCount = result.Changes.Count });
                    logger.LogAuditSummary("CompletePermissions", "Success", $"{result.Changes.Count} principals set to read-only on request {request.RequestId}");
                    return new OkObjectResult(result);
                }
                else
                {
                    logger.Error("Failed to set completion permissions", null, new { Error = result.Error });
                    logger.LogAuditSummary("CompletePermissions", "Failed", result.Error ?? "Failed to finalize permissions");
                    return new ObjectResult(CreateInternalErrorResponse("Failed to finalize permissions")) { StatusCode = 500 };
                }
            }
            catch (Exception ex)
            {
                logger.Error("Unhandled exception in CompletePermissions", ex);
                logger.LogAuditSummary("CompletePermissions", "Error", ex.Message);
                return new ObjectResult(CreateInternalErrorResponse()) { StatusCode = 500 };
            }
        }

        #region Private Helper Methods

        private async Task<AuthorizationResult> AuthenticateAsync(HttpRequest request, Logger logger)
        {
            return await _authorizationHelper.ValidateTokenAsync(request);
        }

        private async Task<SharePointAuthorizationResult> AuthorizeAsync(
            UserAuthInfo userInfo,
            int requestId,
            Logger logger)
        {
            var authzService = new SharePointAuthorizationService(_contextFactory, logger, _groupConfig, _listConfig);
            return await authzService.AuthorizeAsync(userInfo, requestId);
        }

        private static PermissionResponse CreateInternalErrorResponse(string message = "Internal server error")
        {
            return new PermissionResponse
            {
                Success = false,
                Message = message
            };
        }

        private static string GetRequestContextTitle(int requestId, string? requestTitle)
        {
            return string.IsNullOrWhiteSpace(requestTitle) ? requestId.ToString() : requestTitle;
        }

        #endregion
    }
}

// =============================================================================
// Legal Workflow - Azure Functions
// NotificationFunctions.cs - HTTP endpoint for notification processing
// =============================================================================
//
// This function processes notification requests.
// It compares the current version with the previous version of a request
// to determine if a notification should be sent.
//
// Authorization:
// - APIM validates and forwards Azure AD bearer tokens
// - Power Automate service account (matched via config) bypasses item-level permission checks
// - Users must have effective edit permission on the request item
// - Health: Anonymous (for monitoring)
// =============================================================================

using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using LegalWorkflow.Functions.Helpers;
using LegalWorkflow.Functions.Models;
using LegalWorkflow.Functions.Services;
using PnP.Core.Services;

namespace LegalWorkflow.Functions
{
    /// <summary>
    /// Azure Function for processing notification requests.
    ///
    /// This function is called from Power Automate when a Legal Review Request
    /// is modified. It compares the current version with the previous version
    /// to determine if a notification should be sent.
    ///
    /// Endpoint:
    /// - POST /api/notifications/send - Process a notification request
    /// - GET /api/notifications/health - Health check endpoint
    ///
    /// Response:
    /// - Returns EmailResponse if notification should be sent
    /// - Returns null/empty if no notification needed (e.g., simple save without status change)
    ///
    /// The Power Automate flow consumes the EmailResponse and sends the actual email.
    /// </summary>
    public class NotificationFunctions
    {
        private readonly IPnPContextFactory _contextFactory;
        private readonly ILogger<NotificationFunctions> _logger;
        private readonly PermissionGroupConfig _groupConfig;
        private readonly NotificationConfig _notificationConfig;
        private readonly SharePointListConfig _listConfig;
        private readonly IMemoryCache _memoryCache;
        private readonly AuthorizationHelper _authorizationHelper;
        private readonly IAuthenticationProvider _authenticationProvider;
        private readonly JsonSerializerOptions _jsonOptions;

        public NotificationFunctions(
            IPnPContextFactory contextFactory,
            ILogger<NotificationFunctions> logger,
            PermissionGroupConfig groupConfig,
            NotificationConfig notificationConfig,
            SharePointListConfig listConfig,
            IMemoryCache memoryCache,
            AuthorizationHelper authorizationHelper,
            IAuthenticationProvider authenticationProvider)
        {
            _contextFactory = contextFactory ?? throw new ArgumentNullException(nameof(contextFactory));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _groupConfig = groupConfig ?? throw new ArgumentNullException(nameof(groupConfig));
            _notificationConfig = notificationConfig ?? throw new ArgumentNullException(nameof(notificationConfig));
            _listConfig = listConfig ?? throw new ArgumentNullException(nameof(listConfig));
            _memoryCache = memoryCache ?? throw new ArgumentNullException(nameof(memoryCache));
            _authorizationHelper = authorizationHelper ?? throw new ArgumentNullException(nameof(authorizationHelper));
            _authenticationProvider = authenticationProvider ?? throw new ArgumentNullException(nameof(authenticationProvider));
            _jsonOptions = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };
        }

        /// <summary>
        /// Processes a notification request and returns the email to send (if any).
        ///
        /// POST /api/notifications/send
        /// Body: { "requestId": 123, "previousVersion": "1.0" }
        /// </summary>
        [Function("SendNotification")]
        public async Task<IActionResult> SendNotification(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "notifications/send")] HttpRequest req)
        {
            var logger = new Logger(_logger, "SendNotification");
            logger.Info("Notification request received");

            try
            {
                // Step 1: Authenticate
                var authResult = await AuthenticateAsync(req);
                if (!authResult.IsAuthorized)
                {
                    logger.LogAuditSummary("SendNotification", "Unauthorized", authResult.ErrorMessage ?? "Token validation failed");
                    return new UnauthorizedObjectResult(new SendNotificationResponse
                    {
                        ShouldSendNotification = false,
                        Reason = authResult.ErrorMessage ?? "Unauthorized"
                    });
                }

                logger.SetUserContext(authResult.User!.Email, authResult.User.SharePointLoginName);

                // Step 2: Parse request body
                string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
                var request = JsonSerializer.Deserialize<SendNotificationRequest>(requestBody, _jsonOptions);

                if (request == null || request.RequestId <= 0)
                {
                    logger.Warning("Invalid request - missing RequestId");
                    logger.LogAuditSummary("SendNotification", "InvalidRequest", "RequestId is missing or invalid");
                    return new BadRequestObjectResult(new SendNotificationResponse
                    {
                        ShouldSendNotification = false,
                        Reason = "Invalid request. RequestId is required."
                    });
                }

                // Step 3: Authorize
                var authzResult = await AuthorizeAsync(authResult.User!, request.RequestId, logger);
                if (!authzResult.IsAuthorized)
                {
                    logger.LogAuditSummary("SendNotification", "Forbidden", authzResult.ErrorMessage ?? "Insufficient permissions");
                    return new ObjectResult(new SendNotificationResponse
                    {
                        ShouldSendNotification = false,
                        Reason = authzResult.ErrorMessage ?? "Access denied"
                    })
                    { StatusCode = 403 };
                }

                logger.Info("Processing notification for request", new { request.RequestId, AuthReason = authzResult.Reason });

                // Step 4: Execute
                var requestServiceLogger = new Logger(_logger, "RequestService");
                var requestService = new RequestService(_contextFactory, _authenticationProvider, requestServiceLogger, _listConfig);
                var notificationService = new NotificationService(
                    requestService, _contextFactory, _authenticationProvider, _groupConfig, logger, _notificationConfig, _memoryCache, _listConfig);

                var result = await notificationService.ProcessNotificationAsync(request);

                if (result.ShouldSendNotification && result.Email != null)
                {
                    logger.Info("Notification will be sent", new
                    {
                        NotificationId = result.Email.NotificationId,
                        RecipientCount = result.Email.To.Count,
                        Subject = result.Email.Subject
                    });
                    logger.LogAuditSummary("SendNotification", "Success",
                        $"{result.Email.NotificationId} queued for {result.Email.To.Count} recipient(s) on request {request.RequestId}");
                    return new OkObjectResult(result);
                }
                else
                {
                    logger.Info("No notification needed", new { Reason = result.Reason });
                    logger.LogAuditSummary("SendNotification", "Skipped",
                        $"Request {request.RequestId} — {result.Reason}");
                    return new OkObjectResult(result);
                }
            }
            catch (Exception ex)
            {
                logger.Error("Unhandled exception in SendNotification", ex);
                logger.LogAuditSummary("SendNotification", "Error", ex.Message);
                return new ObjectResult(new SendNotificationResponse
                {
                    ShouldSendNotification = false,
                    Reason = "Internal server error"
                })
                { StatusCode = 500 };
            }
        }

        /// <summary>
        /// Health check endpoint to verify the notification function is running.
        /// GET /api/notifications/health
        /// </summary>
        [Function("NotificationHealth")]
        public IActionResult HealthCheck(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "notifications/health")] HttpRequest req)
        {
            return new OkObjectResult(new
            {
                Status = "Healthy",
                Timestamp = DateTime.UtcNow,
                Version = "1.0.0",
                Service = "LegalWorkflow.NotificationFunctions"
            });
        }

        #region Private Helper Methods

        private async Task<AuthorizationResult> AuthenticateAsync(HttpRequest request)
        {
            return await _authorizationHelper.ValidateTokenAsync(request);
        }

        private async Task<SharePointAuthorizationResult> AuthorizeAsync(
            UserAuthInfo userInfo,
            int requestId,
            Logger logger)
        {
            var authzService = new SharePointAuthorizationService(_contextFactory, _authenticationProvider, logger, _groupConfig, _listConfig);
            return await authzService.AuthorizeAsync(userInfo, requestId);
        }

        #endregion
    }
}

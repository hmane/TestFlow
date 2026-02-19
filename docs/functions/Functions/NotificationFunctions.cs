// =============================================================================
// Legal Workflow - Azure Functions
// NotificationFunctions.cs - HTTP endpoint for notification processing
// =============================================================================
//
// This function processes notification requests from Power Automate.
// It compares the current version with the previous version of a request
// to determine if a notification should be sent.
//
// Authorization:
// - SendNotification: Function-level auth for Power Automate, or user token
// - Health: Anonymous (for monitoring)
// =============================================================================

using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Caching.Memory;
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
        private readonly IConfiguration _configuration;
        private readonly PermissionGroupConfig _groupConfig;
        private readonly NotificationConfig _notificationConfig;
        private readonly IMemoryCache _memoryCache;
        private readonly JsonSerializerOptions _jsonOptions;

        /// <summary>
        /// Creates a new NotificationFunctions instance with dependency injection.
        /// </summary>
        /// <param name="contextFactory">PnP Core context factory for SharePoint access</param>
        /// <param name="logger">ILogger instance for Azure Functions logging</param>
        /// <param name="configuration">Application configuration for settings</param>
        /// <param name="groupConfig">SharePoint group configuration</param>
        /// <param name="notificationConfig">Notification configuration</param>
        /// <param name="memoryCache">Memory cache for group member email caching</param>
        public NotificationFunctions(
            IPnPContextFactory contextFactory,
            ILogger<NotificationFunctions> logger,
            IConfiguration configuration,
            PermissionGroupConfig groupConfig,
            NotificationConfig notificationConfig,
            IMemoryCache memoryCache)
        {
            _contextFactory = contextFactory ?? throw new ArgumentNullException(nameof(contextFactory));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
            _groupConfig = groupConfig ?? throw new ArgumentNullException(nameof(groupConfig));
            _notificationConfig = notificationConfig ?? throw new ArgumentNullException(nameof(notificationConfig));
            _memoryCache = memoryCache ?? throw new ArgumentNullException(nameof(memoryCache));
            _jsonOptions = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };
        }

        /// <summary>
        /// Processes a notification request and returns the email to send (if any).
        ///
        /// This function:
        /// 1. Validates authentication (function key or user token)
        /// 2. Loads the current request data from SharePoint
        /// 3. Loads the previous version from version history
        /// 4. Compares versions to detect notification triggers
        /// 5. Generates and returns the email content if a notification is needed
        ///
        /// Called from Power Automate flow when a request is modified.
        ///
        /// Authorization:
        /// - Power Automate: Uses function key
        /// - User: Requires valid Azure AD token and SharePoint group membership
        ///
        /// POST /api/notifications/send
        /// Body: { "requestId": 123, "previousVersion": "1.0" }
        ///
        /// Response:
        /// {
        ///   "shouldSendNotification": true/false,
        ///   "email": { ... } or null,
        ///   "reason": "Explanation of why notification was/wasn't sent"
        /// }
        /// </summary>
        [Function("SendNotification")]
        public async Task<IActionResult> SendNotification(
            [HttpTrigger(AuthorizationLevel.Function, "post", Route = "notifications/send")] HttpRequest req)
        {
            var logger = new Logger(_logger, "SendNotification");
            logger.Info("Notification request received");

            try
            {
                // Check for user token (if present, validate and authorize)
                var authHeader = req.Headers["Authorization"].FirstOrDefault();
                if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                {
                    // User token present - validate and authorize
                    var authResult = await AuthenticateAsync(req, logger);
                    if (!authResult.IsAuthorized)
                    {
                        return new UnauthorizedObjectResult(new SendNotificationResponse
                        {
                            ShouldSendNotification = false,
                            Reason = authResult.ErrorMessage
                        });
                    }

                    // Check SharePoint group membership
                    var authzResult = await AuthorizeAsync(authResult.User!, AuthorizationAction.SendNotification, null, logger);
                    if (!authzResult.IsAuthorized)
                    {
                        return new ObjectResult(new SendNotificationResponse
                        {
                            ShouldSendNotification = false,
                            Reason = authzResult.ErrorMessage
                        })
                        { StatusCode = 403 };
                    }

                    logger.SetUserContext(authResult.User!.Email, authResult.User.SharePointLoginName);
                    logger.Info("User authenticated and authorized for notification processing");
                }
                else
                {
                    // Function key auth (Power Automate) - log as system call
                    logger.Info("Notification called via function key (system/Power Automate)");
                }

                // Parse request body
                string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
                var request = JsonSerializer.Deserialize<SendNotificationRequest>(requestBody, _jsonOptions);

                if (request == null || request.RequestId <= 0)
                {
                    logger.Warning("Invalid request - missing RequestId");
                    return new BadRequestObjectResult(new SendNotificationResponse
                    {
                        ShouldSendNotification = false,
                        Reason = "Invalid request. RequestId is required."
                    });
                }

                logger.Info("Processing notification for request", new { request.RequestId });

                // Create services with injected dependencies
                var requestServiceLogger = new Logger(_logger, "RequestService");
                var requestService = new RequestService(_contextFactory, requestServiceLogger);
                var notificationService = new NotificationService(
                    requestService, _contextFactory, _groupConfig, logger, _notificationConfig, _memoryCache);

                // Process the notification
                var result = await notificationService.ProcessNotificationAsync(request);

                // Log the outcome
                if (result.ShouldSendNotification && result.Email != null)
                {
                    logger.Info("Notification will be sent", new
                    {
                        NotificationId = result.Email.NotificationId,
                        RecipientCount = result.Email.To.Count,
                        Subject = result.Email.Subject
                    });

                    // Return the email response for Power Automate to send
                    return new OkObjectResult(result);
                }
                else
                {
                    logger.Info("No notification needed", new { Reason = result.Reason });

                    // Return response indicating no notification
                    return new OkObjectResult(result);
                }
            }
            catch (Exception ex)
            {
                logger.Error("Unhandled exception in SendNotification", ex);
                return new ObjectResult(new SendNotificationResponse
                {
                    ShouldSendNotification = false,
                    Reason = $"Error processing notification: {ex.Message}"
                })
                { StatusCode = 500 };
            }
        }

        /// <summary>
        /// Health check endpoint to verify the notification function is running.
        /// This endpoint is anonymous for monitoring purposes.
        ///
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

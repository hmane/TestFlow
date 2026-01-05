// =============================================================================
// Legal Workflow - Azure Functions
// RequestService.cs - Service for loading request data from SharePoint
// =============================================================================

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PnP.Core.Model.SharePoint;
using PnP.Core.Services;
using LegalWorkflow.Functions.Helpers;
using LegalWorkflow.Functions.Models;

namespace LegalWorkflow.Functions.Services
{
    /// <summary>
    /// Service for loading Legal Review Request data from SharePoint.
    /// Uses PnP Core SDK for SharePoint operations.
    /// </summary>
    public class RequestService
    {
        private readonly IPnPContextFactory _contextFactory;
        private readonly Logger _logger;

        // SharePoint list titles
        private const string RequestsListTitle = "Requests";
        private const string NotificationsListTitle = "Notifications";

        /// <summary>
        /// Creates a new RequestService instance.
        /// </summary>
        /// <param name="contextFactory">PnP Core context factory for SharePoint access</param>
        /// <param name="logger">Logger instance for logging operations</param>
        public RequestService(IPnPContextFactory contextFactory, Logger logger)
        {
            _contextFactory = contextFactory ?? throw new ArgumentNullException(nameof(contextFactory));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Loads a request by its SharePoint list item ID.
        /// Retrieves all fields needed for workflow processing.
        /// </summary>
        /// <param name="requestId">SharePoint list item ID</param>
        /// <returns>The request model or null if not found</returns>
        public async Task<RequestModel?> GetRequestByIdAsync(int requestId)
        {
            using var tracker = _logger.StartOperation($"GetRequestById({requestId})");

            try
            {
                using var context = await _contextFactory.CreateAsync("Default");

                // Get the Requests list
                var list = await context.Web.Lists.GetByTitleAsync(RequestsListTitle);

                // Load the item with all required fields
                var item = await list.Items.GetByIdAsync(requestId,
                    i => i.All,  // Load all fields
                    i => i.FieldValuesAsText  // Also get text values for lookups
                );

                if (item == null)
                {
                    _logger.Warning($"Request {requestId} not found in SharePoint");
                    tracker.Complete(false, $"Request {requestId} not found");
                    return null;
                }

                // Map SharePoint item to RequestModel
                var request = MapItemToRequest(item);

                _logger.SetRequestContext(request.Id, request.Title);
                _logger.Info("Request loaded successfully", new { FieldCount = item.Values.Count });

                tracker.Complete(true);
                return request;
            }
            catch (Exception ex)
            {
                _logger.Error($"Failed to load request {requestId}", ex);
                tracker.Complete(false, $"Error loading request: {ex.Message}");
                throw;
            }
        }

        /// <summary>
        /// Gets the previous version of a request for change detection.
        /// Uses SharePoint version history to retrieve the prior state.
        /// </summary>
        /// <param name="requestId">SharePoint list item ID</param>
        /// <returns>Previous version info or null if no previous version exists</returns>
        public async Task<RequestVersionInfo?> GetPreviousVersionAsync(int requestId)
        {
            using var tracker = _logger.StartOperation($"GetPreviousVersion({requestId})");

            try
            {
                using var context = await _contextFactory.CreateAsync("Default");

                var list = await context.Web.Lists.GetByTitleAsync(RequestsListTitle);
                var item = await list.Items.GetByIdAsync(requestId);

                // Load version history
                await item.LoadAsync(i => i.Versions);

                if (item.Versions == null || item.Versions.Length < 2)
                {
                    _logger.Info("No previous version found - this may be a new item");
                    tracker.Complete(true, "No previous version");
                    return null;
                }

                // Get the second-to-last version (index 1 is the previous version)
                // Note: Versions are ordered newest first
                var previousVersion = item.Versions.AsRequested().Skip(1).FirstOrDefault();

                if (previousVersion == null)
                {
                    _logger.Info("Could not retrieve previous version data");
                    tracker.Complete(true, "Previous version data unavailable");
                    return null;
                }

                var versionInfo = MapVersionToVersionInfo(previousVersion, requestId);

                _logger.Info($"Retrieved previous version: {versionInfo.Version}", new
                {
                    PreviousStatus = versionInfo.Status.ToString(),
                    PreviousLegalStatus = versionInfo.LegalReviewStatus.ToString(),
                    PreviousComplianceStatus = versionInfo.ComplianceReviewStatus.ToString()
                });

                tracker.Complete(true);
                return versionInfo;
            }
            catch (Exception ex)
            {
                _logger.Error($"Failed to get previous version for request {requestId}", ex);
                tracker.Complete(false, $"Error: {ex.Message}");
                // Return null instead of throwing - version comparison is optional
                return null;
            }
        }

        /// <summary>
        /// Gets notification template by its Title (notification ID).
        /// </summary>
        /// <param name="notificationId">The notification template Title</param>
        /// <returns>Notification template data or null if not found</returns>
        public async Task<NotificationTemplate?> GetNotificationTemplateAsync(string notificationId)
        {
            using var tracker = _logger.StartOperation($"GetNotificationTemplate({notificationId})");

            try
            {
                using var context = await _contextFactory.CreateAsync("Default");

                var list = await context.Web.Lists.GetByTitleAsync(NotificationsListTitle);

                // Query for the notification by Title
                var items = await list.Items.Where(i => i.Title == notificationId).ToListAsync();
                var item = items.FirstOrDefault();

                if (item == null)
                {
                    _logger.Warning($"Notification template '{notificationId}' not found");
                    tracker.Complete(false, "Template not found");
                    return null;
                }

                var template = new NotificationTemplate
                {
                    Id = notificationId,
                    Subject = GetFieldValue<string>(item, "Subject") ?? string.Empty,
                    Body = GetFieldValue<string>(item, "Body") ?? string.Empty,
                    Recipients = GetFieldValue<string>(item, "Recipients") ?? string.Empty,
                    CcRecipients = GetFieldValue<string>(item, "CcRecipients") ?? string.Empty,
                    Importance = ParseEnum<EmailImportance>(GetFieldValue<string>(item, "Importance"), EmailImportance.Normal),
                    Category = ParseEnum<NotificationCategory>(GetFieldValue<string>(item, "Category"), NotificationCategory.System),
                    TriggerEvent = GetFieldValue<string>(item, "TriggerEvent") ?? string.Empty,
                    IsActive = GetFieldValue<bool>(item, "IsActive")
                };

                _logger.Info($"Notification template loaded: {notificationId}", new { IsActive = template.IsActive });
                tracker.Complete(true);
                return template;
            }
            catch (Exception ex)
            {
                _logger.Error($"Failed to load notification template '{notificationId}'", ex);
                tracker.Complete(false, $"Error: {ex.Message}");
                throw;
            }
        }

        #region Private Helper Methods

        /// <summary>
        /// Maps a SharePoint list item to RequestModel.
        /// </summary>
        private RequestModel MapItemToRequest(IListItem item)
        {
            return new RequestModel
            {
                // System fields
                Id = item.Id,
                Title = GetFieldValue<string>(item, "Title") ?? string.Empty,
                Version = item.Values.ContainsKey("_UIVersionString")
                    ? item.Values["_UIVersionString"]?.ToString() ?? "1.0"
                    : "1.0",
                Created = GetFieldValue<DateTime>(item, "Created"),
                Modified = GetFieldValue<DateTime>(item, "Modified"),

                // Request Information
                RequestType = ParseEnum<RequestType>(GetFieldValue<string>(item, "RequestType"), RequestType.Communication),
                SubmissionType = ParseEnum<SubmissionType>(GetFieldValue<string>(item, "SubmissionType"), SubmissionType.New),
                Purpose = GetFieldValue<string>(item, "Purpose") ?? string.Empty,
                TargetReturnDate = GetFieldValueNullable<DateTime>(item, "TargetReturnDate"),
                RequestedDate = GetFieldValueNullable<DateTime>(item, "RequestedDate"),
                IsRushRequest = GetFieldValue<bool>(item, "IsRushRequest"),
                RushRationale = GetFieldValue<string>(item, "RushRationale") ?? string.Empty,
                ReviewAudience = ParseEnum<ReviewAudience>(GetFieldValue<string>(item, "ReviewAudience"), ReviewAudience.Both),

                // FINRA & Audience
                FINRAAudienceCategory = GetFieldValue<string>(item, "FINRAAudienceCategory") ?? string.Empty,
                Audience = GetFieldValue<string>(item, "Audience") ?? string.Empty,
                USFunds = ParseMultiChoice(GetFieldValue<object>(item, "USFunds")),
                UCITS = ParseMultiChoice(GetFieldValue<object>(item, "UCITS")),
                SeparateAccountStrategies = GetFieldValue<string>(item, "SeparateAccountStrategies") ?? string.Empty,
                SeparateAccountStrategiesIncludes = GetFieldValue<string>(item, "SeparateAccountStrategiesIncludes") ?? string.Empty,

                // Distribution
                DistributionMethods = ParseDistributionMethods(GetFieldValue<object>(item, "DistributionMethods")),
                ProposedFirstUseDate = GetFieldValueNullable<DateTime>(item, "ProposedFirstUseDate"),
                ProposedDiscontinueDate = GetFieldValueNullable<DateTime>(item, "ProposedDiscontinueDate"),

                // Legal Intake
                Attorney = ParseUserField(item, "Attorney"),
                AttorneyAssignNotes = GetFieldValue<string>(item, "AttorneyAssignNotes") ?? string.Empty,

                // Legal Review
                LegalReviewStatus = ParseEnum<ReviewStatus>(GetFieldValue<string>(item, "LegalReviewStatus"), ReviewStatus.NotStarted),
                LegalReviewOutcome = ParseEnum<ReviewOutcome>(GetFieldValue<string>(item, "LegalReviewOutcome"), ReviewOutcome.None),
                LegalReviewNotes = GetFieldValue<string>(item, "LegalReviewNotes") ?? string.Empty,
                LegalStatusUpdatedOn = GetFieldValueNullable<DateTime>(item, "LegalStatusUpdatedOn"),
                LegalReviewTime = GetFieldValueNullable<double>(item, "LegalReviewTime"),

                // Compliance Review
                ComplianceReviewStatus = ParseEnum<ReviewStatus>(GetFieldValue<string>(item, "ComplianceReviewStatus"), ReviewStatus.NotStarted),
                ComplianceReviewOutcome = ParseEnum<ReviewOutcome>(GetFieldValue<string>(item, "ComplianceReviewOutcome"), ReviewOutcome.None),
                ComplianceReviewNotes = GetFieldValue<string>(item, "ComplianceReviewNotes") ?? string.Empty,
                ComplianceStatusUpdatedOn = GetFieldValueNullable<DateTime>(item, "ComplianceStatusUpdatedOn"),
                ComplianceReviewTime = GetFieldValueNullable<double>(item, "ComplianceReviewTime"),
                IsForesideReviewRequired = GetFieldValue<bool>(item, "IsForesideReviewRequired"),
                IsRetailUse = GetFieldValue<bool>(item, "IsRetailUse"),

                // Closeout
                TrackingId = GetFieldValue<string>(item, "TrackingId") ?? string.Empty,

                // System Tracking
                Status = ParseEnum<RequestStatus>(GetFieldValue<string>(item, "Status"), RequestStatus.Draft),
                SubmittedBy = ParseUserField(item, "SubmittedBy"),
                SubmittedOn = GetFieldValueNullable<DateTime>(item, "SubmittedOn"),
                IsOnHold = GetFieldValue<bool>(item, "IsOnHold"),
                HoldReason = GetFieldValue<string>(item, "HoldReason") ?? string.Empty,
                HoldDate = GetFieldValueNullable<DateTime>(item, "HoldDate"),
                CompletedOn = GetFieldValueNullable<DateTime>(item, "CompletedOn"),
                CancelledOn = GetFieldValueNullable<DateTime>(item, "CancelledOn"),
                CancellationReason = GetFieldValue<string>(item, "CancellationReason") ?? string.Empty,

                // Additional Parties
                AdditionalParties = ParseMultiUserField(item, "AdditionalParties"),

                // Approvals
                CommunicationsApproval = ParseApproval(item, "Communications"),
                PortfolioManagerApproval = ParseApproval(item, "PortfolioManager"),
                ResearchAnalystApproval = ParseApproval(item, "ResearchAnalyst"),
                SubjectMatterExpertApproval = ParseApproval(item, "SubjectMatterExpert"),
                PerformanceApproval = ParseApproval(item, "Performance"),
                OtherApproval = ParseApproval(item, "Other")
            };
        }

        /// <summary>
        /// Maps version history entry to RequestVersionInfo for change detection.
        /// </summary>
        private RequestVersionInfo MapVersionToVersionInfo(IListItemVersion version, int requestId)
        {
            return new RequestVersionInfo
            {
                Id = requestId,
                Version = version.VersionLabel ?? "0.0",
                Status = ParseEnum<RequestStatus>(GetVersionFieldValue<string>(version, "Status"), RequestStatus.Draft),
                IsOnHold = GetVersionFieldValue<bool>(version, "IsOnHold"),
                LegalReviewStatus = ParseEnum<ReviewStatus>(GetVersionFieldValue<string>(version, "LegalReviewStatus"), ReviewStatus.NotStarted),
                LegalReviewOutcome = ParseEnum<ReviewOutcome>(GetVersionFieldValue<string>(version, "LegalReviewOutcome"), ReviewOutcome.None),
                ComplianceReviewStatus = ParseEnum<ReviewStatus>(GetVersionFieldValue<string>(version, "ComplianceReviewStatus"), ReviewStatus.NotStarted),
                ComplianceReviewOutcome = ParseEnum<ReviewOutcome>(GetVersionFieldValue<string>(version, "ComplianceReviewOutcome"), ReviewOutcome.None),
                Attorney = ParseVersionUserField(version, "Attorney")
            };
        }

        /// <summary>
        /// Gets a field value from a list item with type conversion.
        /// </summary>
        private T GetFieldValue<T>(IListItem item, string fieldName)
        {
            if (item.Values.TryGetValue(fieldName, out var value) && value != null)
            {
                if (value is T typedValue)
                {
                    return typedValue;
                }

                try
                {
                    return (T)Convert.ChangeType(value, typeof(T));
                }
                catch
                {
                    return default!;
                }
            }

            return default!;
        }

        /// <summary>
        /// Gets a nullable field value from a list item.
        /// </summary>
        private T? GetFieldValueNullable<T>(IListItem item, string fieldName) where T : struct
        {
            if (item.Values.TryGetValue(fieldName, out var value) && value != null)
            {
                if (value is T typedValue)
                {
                    return typedValue;
                }

                try
                {
                    return (T)Convert.ChangeType(value, typeof(T));
                }
                catch
                {
                    return null;
                }
            }

            return null;
        }

        /// <summary>
        /// Gets a field value from a version history entry.
        /// </summary>
        private T GetVersionFieldValue<T>(IListItemVersion version, string fieldName)
        {
            if (version.Values.TryGetValue(fieldName, out var value) && value != null)
            {
                if (value is T typedValue)
                {
                    return typedValue;
                }

                try
                {
                    return (T)Convert.ChangeType(value, typeof(T));
                }
                catch
                {
                    return default!;
                }
            }

            return default!;
        }

        /// <summary>
        /// Parses an enum value from a string, with a default fallback.
        /// </summary>
        private TEnum ParseEnum<TEnum>(string? value, TEnum defaultValue) where TEnum : struct, Enum
        {
            if (string.IsNullOrEmpty(value))
            {
                return defaultValue;
            }

            // Remove spaces for matching (e.g., "Legal Intake" -> "LegalIntake")
            var normalizedValue = value.Replace(" ", "");

            if (Enum.TryParse<TEnum>(normalizedValue, ignoreCase: true, out var result))
            {
                return result;
            }

            return defaultValue;
        }

        /// <summary>
        /// Parses a user lookup field from a list item.
        /// </summary>
        private UserInfo? ParseUserField(IListItem item, string fieldName)
        {
            // Try to get the user lookup value
            if (!item.Values.TryGetValue(fieldName, out var value) || value == null)
            {
                return null;
            }

            // Handle IFieldUserValue
            if (value is IFieldUserValue userValue)
            {
                return new UserInfo
                {
                    Id = userValue.LookupId,
                    Title = userValue.LookupValue ?? string.Empty,
                    Email = userValue.Email ?? string.Empty,
                    LoginName = userValue.Principal?.LoginName ?? string.Empty
                };
            }

            // Handle lookup value dictionary
            if (value is IDictionary<string, object> lookupDict)
            {
                return new UserInfo
                {
                    Id = lookupDict.ContainsKey("LookupId") ? Convert.ToInt32(lookupDict["LookupId"]) : 0,
                    Title = lookupDict.ContainsKey("LookupValue") ? lookupDict["LookupValue"]?.ToString() ?? string.Empty : string.Empty,
                    Email = lookupDict.ContainsKey("Email") ? lookupDict["Email"]?.ToString() ?? string.Empty : string.Empty
                };
            }

            return null;
        }

        /// <summary>
        /// Parses a multi-user lookup field from a list item.
        /// </summary>
        private List<UserInfo> ParseMultiUserField(IListItem item, string fieldName)
        {
            var users = new List<UserInfo>();

            if (!item.Values.TryGetValue(fieldName, out var value) || value == null)
            {
                return users;
            }

            // Handle array of user values
            if (value is IEnumerable<IFieldUserValue> userValues)
            {
                foreach (var userValue in userValues)
                {
                    users.Add(new UserInfo
                    {
                        Id = userValue.LookupId,
                        Title = userValue.LookupValue ?? string.Empty,
                        Email = userValue.Email ?? string.Empty,
                        LoginName = userValue.Principal?.LoginName ?? string.Empty
                    });
                }
            }

            return users;
        }

        /// <summary>
        /// Parses a user field from version history.
        /// </summary>
        private UserInfo? ParseVersionUserField(IListItemVersion version, string fieldName)
        {
            if (!version.Values.TryGetValue(fieldName, out var value) || value == null)
            {
                return null;
            }

            // Version history may have limited user info
            if (value is string stringValue && !string.IsNullOrEmpty(stringValue))
            {
                return new UserInfo
                {
                    Title = stringValue
                };
            }

            return null;
        }

        /// <summary>
        /// Parses a multi-choice field value.
        /// </summary>
        private List<string> ParseMultiChoice(object? value)
        {
            if (value == null)
            {
                return new List<string>();
            }

            if (value is IEnumerable<string> stringEnumerable)
            {
                return stringEnumerable.ToList();
            }

            if (value is string stringValue)
            {
                // Handle semi-colon or comma separated values
                return stringValue.Split(new[] { ';', ',' }, StringSplitOptions.RemoveEmptyEntries)
                    .Select(s => s.Trim())
                    .ToList();
            }

            return new List<string>();
        }

        /// <summary>
        /// Parses distribution methods from a multi-choice field.
        /// </summary>
        private List<DistributionMethod> ParseDistributionMethods(object? value)
        {
            var choices = ParseMultiChoice(value);
            var methods = new List<DistributionMethod>();

            foreach (var choice in choices)
            {
                if (Enum.TryParse<DistributionMethod>(choice.Replace(" ", ""), ignoreCase: true, out var method))
                {
                    methods.Add(method);
                }
            }

            return methods;
        }

        /// <summary>
        /// Parses approval information for a specific approval type.
        /// </summary>
        private ApprovalInfo? ParseApproval(IListItem item, string approvalPrefix)
        {
            var approvedBy = ParseUserField(item, $"{approvalPrefix}ApprovedBy");
            var approvedOn = GetFieldValueNullable<DateTime>(item, $"{approvalPrefix}ApprovedOn");

            // If no approval data exists, return null
            if (approvedBy == null && !approvedOn.HasValue)
            {
                return null;
            }

            return new ApprovalInfo
            {
                Type = ParseEnum<ApprovalType>(approvalPrefix, ApprovalType.Other),
                ApprovedBy = approvedBy,
                ApprovedOn = approvedOn,
                HasDocument = GetFieldValue<bool>(item, $"{approvalPrefix}HasDocument")
            };
        }

        #endregion
    }

    /// <summary>
    /// Represents a notification template from the Notifications SharePoint list.
    /// </summary>
    public class NotificationTemplate
    {
        /// <summary>Template ID (Title field)</summary>
        public string Id { get; set; } = string.Empty;

        /// <summary>Email subject template with tokens</summary>
        public string Subject { get; set; } = string.Empty;

        /// <summary>HTML email body template with tokens</summary>
        public string Body { get; set; } = string.Empty;

        /// <summary>Recipients configuration (e.g., "Submitter,LegalAdmin")</summary>
        public string Recipients { get; set; } = string.Empty;

        /// <summary>CC recipients configuration</summary>
        public string CcRecipients { get; set; } = string.Empty;

        /// <summary>Email importance level</summary>
        public EmailImportance Importance { get; set; }

        /// <summary>Notification category</summary>
        public NotificationCategory Category { get; set; }

        /// <summary>Event that triggers this notification</summary>
        public string TriggerEvent { get; set; } = string.Empty;

        /// <summary>Whether this notification is active</summary>
        public bool IsActive { get; set; }
    }
}

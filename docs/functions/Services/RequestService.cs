// =============================================================================
// Legal Workflow - Azure Functions
// RequestService.cs - Service for loading request data from SharePoint
// =============================================================================

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PnP.Core.Model.SharePoint;
using PnP.Core.QueryModel;
using PnP.Core.Services;
using LegalWorkflow.Functions.Constants;
using LegalWorkflow.Functions.Constants.SharePointFields;
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
        private readonly SharePointListConfig _listConfig;

        /// <summary>
        /// Creates a new RequestService instance.
        /// </summary>
        /// <param name="contextFactory">PnP Core context factory for SharePoint access</param>
        /// <param name="logger">Logger instance for logging operations</param>
        /// <param name="listConfig">SharePoint list name configuration (optional)</param>
        public RequestService(IPnPContextFactory contextFactory, Logger logger, SharePointListConfig? listConfig = null)
        {
            _contextFactory = contextFactory ?? throw new ArgumentNullException(nameof(contextFactory));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _listConfig = listConfig ?? new SharePointListConfig();
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
                var list = await context.Web.Lists.GetByTitleAsync(_listConfig.RequestsListName);

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
        public async Task<RequestVersionInfo?> GetPreviousVersionAsync(int requestId, string? versionLabel = null)
        {
            using var tracker = _logger.StartOperation($"GetPreviousVersion({requestId}, {versionLabel ?? "auto"})");

            try
            {
                using var context = await _contextFactory.CreateAsync("Default");

                var list = await context.Web.Lists.GetByTitleAsync(_listConfig.RequestsListName);
                var item = await list.Items.GetByIdAsync(requestId);

                // Load version history
                await item.LoadAsync(i => i.Versions);

                if (item.Versions == null || item.Versions.Length < 2)
                {
                    _logger.Info("No previous version found - this may be a new item");
                    tracker.Complete(true, "No previous version");
                    return null;
                }

                IListItemVersion? previousVersion;
                if (!string.IsNullOrWhiteSpace(versionLabel))
                {
                    previousVersion = item.Versions.AsRequested()
                        .FirstOrDefault(version => string.Equals(version.VersionLabel, versionLabel, StringComparison.OrdinalIgnoreCase));
                }
                else
                {
                    // Get the second-to-last version (index 1 is the previous version)
                    // Note: Versions are ordered newest first
                    previousVersion = item.Versions.AsRequested().Skip(1).FirstOrDefault();
                }

                if (previousVersion == null)
                {
                    _logger.Info("Could not retrieve previous version data", new { RequestedVersionLabel = versionLabel ?? "auto" });
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
        /// Gets notification template by its Title (notification ID), with optional request type scoping.
        /// Lookup cascade:
        ///   1. Find template matching notificationId + requestType (type-specific)
        ///   2. Fall back to template matching notificationId with no RequestType (generic)
        /// </summary>
        /// <param name="notificationId">The notification template Title</param>
        /// <param name="requestType">Optional request type for type-specific templates</param>
        /// <returns>Notification template data or null if not found</returns>
        public async Task<NotificationTemplate?> GetNotificationTemplateAsync(string notificationId, string? requestType = null)
        {
            using var tracker = _logger.StartOperation($"GetNotificationTemplate({notificationId}, {requestType ?? "generic"})");

            try
            {
                using var context = await _contextFactory.CreateAsync("Default");

                var list = await context.Web.Lists.GetByTitleAsync(_listConfig.NotificationsListName);

                // Load all templates matching notificationId in a single query
                var allItems = await list.Items
                    .Where(i => i.Title == notificationId)
                    .ToListAsync();

                // Step 1: Try type-specific template when a requestType is provided
                if (!string.IsNullOrEmpty(requestType))
                {
                    var specificItem = allItems.FirstOrDefault(i =>
                        RequestTypeMatchesTemplate(
                            GetFieldValue<string>(i, NotificationsFields.RequestType),
                            requestType));

                    if (specificItem != null)
                    {
                        _logger.Info($"Type-specific template found: {notificationId} / {requestType}");
                        tracker.Complete(true, "Type-specific template");
                        return MapToNotificationTemplate(notificationId, specificItem);
                    }

                    _logger.Debug($"No type-specific template for '{notificationId}' / '{requestType}', falling back to generic");
                }

                // Step 2: Fall back to generic template (RequestType = blank or "All")
                var genericItem = allItems.FirstOrDefault(i =>
                    IsGenericTemplateRequestType(GetFieldValue<string>(i, NotificationsFields.RequestType)));

                if (genericItem == null)
                {
                    _logger.Warning($"Notification template '{notificationId}' not found (checked type-specific and generic)");
                    tracker.Complete(false, "Template not found");
                    return null;
                }

                _logger.Info($"Generic template loaded: {notificationId}", new { RequestType = requestType ?? "N/A" });
                tracker.Complete(true, "Generic template");
                return MapToNotificationTemplate(notificationId, genericItem);
            }
            catch (Exception ex)
            {
                _logger.Error($"Failed to load notification template '{notificationId}'", ex);
                tracker.Complete(false, $"Error: {ex.Message}");
                throw;
            }
        }

        /// <summary>
        /// Maps a SharePoint list item to a NotificationTemplate.
        /// </summary>
        private NotificationTemplate MapToNotificationTemplate(string notificationId, IListItem item)
        {
            return new NotificationTemplate
            {
                Id = notificationId,
                Subject = GetFieldValue<string>(item, NotificationsFields.Subject) ?? string.Empty,
                Body = GetFieldValue<string>(item, NotificationsFields.Body) ?? string.Empty,
                ToRecipients = GetFieldValue<string>(item, NotificationsFields.ToRecipients) ?? string.Empty,
                CcRecipients = GetFieldValue<string>(item, NotificationsFields.CcRecipients) ?? string.Empty,
                BccRecipients = GetFieldValue<string>(item, NotificationsFields.BccRecipients) ?? string.Empty,
                IncludeDocuments = GetFieldValue<bool>(item, NotificationsFields.IncludeDocuments),
                Importance = ParseEnum<EmailImportance>(GetFieldValue<string>(item, NotificationsFields.Importance), EmailImportance.Normal),
                Category = ParseEnum<NotificationCategory>(GetFieldValue<string>(item, NotificationsFields.Category), NotificationCategory.System),
                TriggerEvent = GetFieldValue<string>(item, NotificationsFields.TriggerEvent) ?? string.Empty,
                RequestType = GetFieldValue<string>(item, NotificationsFields.RequestType),
                IsActive = GetFieldValue<bool>(item, NotificationsFields.IsActive)
            };
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
                Title = GetFieldValue<string>(item, RequestsFields.Title) ?? string.Empty,
                Version = item.Values.ContainsKey(RequestsFields.UIVersionString)
                    ? item.Values[RequestsFields.UIVersionString]?.ToString() ?? "1.0"
                    : "1.0",
                Created = GetFieldValue<DateTime>(item, RequestsFields.Created),
                Modified = GetFieldValue<DateTime>(item, RequestsFields.Modified),

                // Request Information
                RequestType = ParseEnum<RequestType>(GetFieldValue<string>(item, RequestsFields.RequestType), RequestType.Communication),
                SubmissionType = ParseEnum<SubmissionType>(GetFieldValue<string>(item, RequestsFields.SubmissionType), SubmissionType.New),
                SubmissionItem = GetFieldValue<string>(item, RequestsFields.SubmissionItem) ?? string.Empty,
                Purpose = GetFieldValue<string>(item, RequestsFields.Purpose) ?? string.Empty,
                TargetReturnDate = GetFieldValueNullable<DateTime>(item, RequestsFields.TargetReturnDate),
                RequestedDate = GetFieldValueNullable<DateTime>(item, RequestsFields.SubmittedOn), // RequestedDate maps to SubmittedOn
                IsRushRequest = GetFieldValue<bool>(item, RequestsFields.IsRushRequest),
                RushRationale = GetFieldValue<string>(item, RequestsFields.RushRationale) ?? string.Empty,
                ReviewAudience = ParseEnum<ReviewAudience>(GetFieldValue<string>(item, RequestsFields.ReviewAudience), ReviewAudience.Both),

                // FINRA & Audience
                FINRAAudienceCategory = GetFieldValue<string>(item, RequestsFields.FINRAAudienceCategory) ?? string.Empty,
                Audience = GetFieldValue<string>(item, RequestsFields.Audience) ?? string.Empty,
                USFunds = ParseMultiChoice(GetFieldValue<object>(item, RequestsFields.USFunds)),
                UCITS = ParseMultiChoice(GetFieldValue<object>(item, RequestsFields.UCITS)),
                SeparateAccountStrategies = GetFieldValue<string>(item, RequestsFields.SeparateAcctStrategies) ?? string.Empty,
                SeparateAccountStrategiesIncludes = GetFieldValue<string>(item, RequestsFields.SeparateAcctStrategiesIncl) ?? string.Empty,

                // Distribution
                DistributionMethods = ParseDistributionMethods(GetFieldValue<object>(item, RequestsFields.DistributionMethod)),
                ProposedFirstUseDate = GetFieldValueNullable<DateTime>(item, RequestsFields.DateOfFirstUse),
                ProposedDiscontinueDate = null, // Field not in current schema

                // Legal Intake
                Attorneys = ParseMultiUserField(item, RequestsFields.Attorney),
                AttorneyAssignNotes = GetFieldValue<string>(item, RequestsFields.AttorneyAssignNotes) ?? string.Empty,

                // Legal Review
                LegalReviewStatus = ParseEnum<ReviewStatus>(GetFieldValue<string>(item, RequestsFields.LegalReviewStatus), ReviewStatus.NotStarted),
                LegalReviewOutcome = ParseEnum<ReviewOutcome>(GetFieldValue<string>(item, RequestsFields.LegalReviewOutcome), ReviewOutcome.None),
                LegalReviewNotes = GetFieldValue<string>(item, RequestsFields.LegalReviewNotes) ?? string.Empty,
                LegalStatusUpdatedOn = GetFieldValueNullable<DateTime>(item, RequestsFields.LegalStatusUpdatedOn),
                LegalReviewTime = GetFieldValueNullable<double>(item, RequestsFields.LegalReviewAttorneyHours),

                // Compliance Review
                ComplianceReviewStatus = ParseEnum<ReviewStatus>(GetFieldValue<string>(item, RequestsFields.ComplianceReviewStatus), ReviewStatus.NotStarted),
                ComplianceReviewOutcome = ParseEnum<ReviewOutcome>(GetFieldValue<string>(item, RequestsFields.ComplianceReviewOutcome), ReviewOutcome.None),
                ComplianceReviewNotes = GetFieldValue<string>(item, RequestsFields.ComplianceReviewNotes) ?? string.Empty,
                ComplianceStatusUpdatedOn = GetFieldValueNullable<DateTime>(item, RequestsFields.ComplianceStatusUpdatedOn),
                ComplianceReviewTime = GetFieldValueNullable<double>(item, RequestsFields.ComplianceReviewReviewerHours),
                IsForesideReviewRequired = GetFieldValue<bool>(item, RequestsFields.IsForesideReviewRequired),
                RecordRetentionOnly = GetFieldValue<bool>(item, RequestsFields.RecordRetentionOnly),
                IsRetailUse = GetFieldValue<bool>(item, RequestsFields.IsRetailUse),

                // Closeout
                TrackingId = GetFieldValue<string>(item, RequestsFields.TrackingId) ?? string.Empty,

                // System Tracking
                Status = ParseEnum<RequestStatus>(GetFieldValue<string>(item, RequestsFields.Status), RequestStatus.Draft),
                SubmittedBy = ParseUserField(item, RequestsFields.SubmittedBy),
                SubmittedOn = GetFieldValueNullable<DateTime>(item, RequestsFields.SubmittedOn),
                IsOnHold = GetFieldValue<bool>(item, RequestsFields.IsOnHold),
                HoldReason = GetFieldValue<string>(item, RequestsFields.OnHoldReason) ?? string.Empty,
                HoldDate = GetFieldValueNullable<DateTime>(item, RequestsFields.OnHoldSince),
                CompletedOn = GetFieldValueNullable<DateTime>(item, RequestsFields.CloseoutOn),
                CancelledOn = GetFieldValueNullable<DateTime>(item, RequestsFields.CancelledOn),
                CancellationReason = GetFieldValue<string>(item, RequestsFields.CancelReason) ?? string.Empty,

                // Additional Parties
                AdditionalParties = ParseMultiUserField(item, RequestsFields.AdditionalParty),

                // Approvals
                CommunicationsApproval = ParseApprovalCommunications(item),
                PortfolioManagerApproval = ParseApprovalPortfolioManager(item),
                ResearchAnalystApproval = ParseApprovalResearchAnalyst(item),
                SubjectMatterExpertApproval = ParseApprovalSME(item),
                PerformanceApproval = ParseApprovalPerformance(item),
                OtherApproval = ParseApprovalOther(item)
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
                Status = ParseEnum<RequestStatus>(GetVersionFieldValue<string>(version, RequestsFields.Status), RequestStatus.Draft),
                IsOnHold = GetVersionFieldValue<bool>(version, RequestsFields.IsOnHold),
                LegalReviewStatus = ParseEnum<ReviewStatus>(GetVersionFieldValue<string>(version, RequestsFields.LegalReviewStatus), ReviewStatus.NotStarted),
                LegalReviewOutcome = ParseEnum<ReviewOutcome>(GetVersionFieldValue<string>(version, RequestsFields.LegalReviewOutcome), ReviewOutcome.None),
                ComplianceReviewStatus = ParseEnum<ReviewStatus>(GetVersionFieldValue<string>(version, RequestsFields.ComplianceReviewStatus), ReviewStatus.NotStarted),
                ComplianceReviewOutcome = ParseEnum<ReviewOutcome>(GetVersionFieldValue<string>(version, RequestsFields.ComplianceReviewOutcome), ReviewOutcome.None),
                Attorneys = ParseVersionMultiUserField(version, RequestsFields.Attorney)
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
        /// Handles SharePoint version history quirks, e.g. booleans stored as "Yes"/"No" strings.
        /// </summary>
        private T GetVersionFieldValue<T>(IListItemVersion version, string fieldName)
        {
            if (version.Values.TryGetValue(fieldName, out var value) && value != null)
            {
                if (value is T typedValue)
                {
                    return typedValue;
                }

                // SharePoint version history stores boolean fields as "Yes"/"No" strings
                if (typeof(T) == typeof(bool) && value is string boolString)
                {
                    var result = boolString.Equals("Yes", StringComparison.OrdinalIgnoreCase) ||
                                 boolString.Equals("True", StringComparison.OrdinalIgnoreCase) ||
                                 boolString.Equals("1", StringComparison.Ordinal);
                    return (T)(object)result;
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

            if (TryParseEnum(value, out TEnum result))
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
        /// Parses a multi-user field from version history.
        /// </summary>
        private List<UserInfo> ParseVersionMultiUserField(IListItemVersion version, string fieldName)
        {
            var users = new List<UserInfo>();

            if (!version.Values.TryGetValue(fieldName, out var value) || value == null)
            {
                return users;
            }

            // Version history may store multi-user as semicolon-separated string
            if (value is string stringValue && !string.IsNullOrEmpty(stringValue))
            {
                var parts = stringValue.Split(new[] { ';' }, StringSplitOptions.RemoveEmptyEntries);
                foreach (var part in parts)
                {
                    var trimmed = part.Trim();
                    if (!string.IsNullOrEmpty(trimmed) && !trimmed.StartsWith("#"))
                    {
                        users.Add(new UserInfo { Title = trimmed });
                    }
                }
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
                if (TryParseEnum<DistributionMethod>(choice, out var method))
                {
                    methods.Add(method);
                }
            }

            return methods;
        }

        private static bool RequestTypeMatchesTemplate(string? templateRequestType, string requestType)
        {
            if (string.IsNullOrWhiteSpace(templateRequestType))
            {
                return false;
            }

            return string.Equals(
                NormalizeEnumValue(templateRequestType),
                NormalizeEnumValue(requestType),
                StringComparison.OrdinalIgnoreCase);
        }

        private static bool IsGenericTemplateRequestType(string? templateRequestType)
        {
            return string.IsNullOrWhiteSpace(templateRequestType) ||
                   string.Equals(templateRequestType.Trim(), "All", StringComparison.OrdinalIgnoreCase);
        }

        private static string NormalizeEnumValue(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return string.Empty;
            }

            return new string(value
                .Where(char.IsLetterOrDigit)
                .Select(char.ToLowerInvariant)
                .ToArray());
        }

        private static bool TryParseEnum<TEnum>(string? value, out TEnum result) where TEnum : struct, Enum
        {
            result = default;

            if (string.IsNullOrWhiteSpace(value))
            {
                return false;
            }

            var normalizedValue = NormalizeEnumValue(value);
            foreach (var enumValue in Enum.GetValues<TEnum>())
            {
                if (string.Equals(
                    normalizedValue,
                    NormalizeEnumValue(enumValue.ToString()),
                    StringComparison.OrdinalIgnoreCase))
                {
                    result = enumValue;
                    return true;
                }
            }

            return false;
        }

        /// <summary>
        /// Parses Communications approval information.
        /// </summary>
        private ApprovalInfo? ParseApprovalCommunications(IListItem item)
        {
            var approvedBy = ParseUserField(item, RequestsFields.CommunicationsApprover);
            var approvedOn = GetFieldValueNullable<DateTime>(item, RequestsFields.CommunicationsApprovalDate);

            if (approvedBy == null && !approvedOn.HasValue)
            {
                return null;
            }

            return new ApprovalInfo
            {
                Type = ApprovalType.Communications,
                ApprovedBy = approvedBy,
                ApprovedOn = approvedOn,
                HasDocument = GetFieldValue<bool>(item, RequestsFields.RequiresCommunicationsApproval)
            };
        }

        /// <summary>
        /// Parses Portfolio Manager approval information.
        /// </summary>
        private ApprovalInfo? ParseApprovalPortfolioManager(IListItem item)
        {
            var approvedBy = ParseUserField(item, RequestsFields.PortfolioManager);
            var approvedOn = GetFieldValueNullable<DateTime>(item, RequestsFields.PortfolioManagerApprovalDate);

            if (approvedBy == null && !approvedOn.HasValue)
            {
                return null;
            }

            return new ApprovalInfo
            {
                Type = ApprovalType.PortfolioManager,
                ApprovedBy = approvedBy,
                ApprovedOn = approvedOn,
                HasDocument = GetFieldValue<bool>(item, RequestsFields.HasPortfolioManagerApproval)
            };
        }

        /// <summary>
        /// Parses Research Analyst approval information.
        /// </summary>
        private ApprovalInfo? ParseApprovalResearchAnalyst(IListItem item)
        {
            var approvedBy = ParseUserField(item, RequestsFields.ResearchAnalyst);
            var approvedOn = GetFieldValueNullable<DateTime>(item, RequestsFields.ResearchAnalystApprovalDate);

            if (approvedBy == null && !approvedOn.HasValue)
            {
                return null;
            }

            return new ApprovalInfo
            {
                Type = ApprovalType.ResearchAnalyst,
                ApprovedBy = approvedBy,
                ApprovedOn = approvedOn,
                HasDocument = GetFieldValue<bool>(item, RequestsFields.HasResearchAnalystApproval)
            };
        }

        /// <summary>
        /// Parses Subject Matter Expert approval information.
        /// </summary>
        private ApprovalInfo? ParseApprovalSME(IListItem item)
        {
            var approvedBy = ParseUserField(item, RequestsFields.SubjectMatterExpert);
            var approvedOn = GetFieldValueNullable<DateTime>(item, RequestsFields.SMEApprovalDate);

            if (approvedBy == null && !approvedOn.HasValue)
            {
                return null;
            }

            return new ApprovalInfo
            {
                Type = ApprovalType.SubjectMatterExpert,
                ApprovedBy = approvedBy,
                ApprovedOn = approvedOn,
                HasDocument = GetFieldValue<bool>(item, RequestsFields.HasSMEApproval)
            };
        }

        /// <summary>
        /// Parses Performance approval information.
        /// </summary>
        private ApprovalInfo? ParseApprovalPerformance(IListItem item)
        {
            var approvedBy = ParseUserField(item, RequestsFields.PerformanceApprover);
            var approvedOn = GetFieldValueNullable<DateTime>(item, RequestsFields.PerformanceApprovalDate);

            if (approvedBy == null && !approvedOn.HasValue)
            {
                return null;
            }

            return new ApprovalInfo
            {
                Type = ApprovalType.Performance,
                ApprovedBy = approvedBy,
                ApprovedOn = approvedOn,
                HasDocument = GetFieldValue<bool>(item, RequestsFields.HasPerformanceApproval)
            };
        }

        /// <summary>
        /// Parses Other approval information.
        /// </summary>
        private ApprovalInfo? ParseApprovalOther(IListItem item)
        {
            var approvedBy = ParseUserField(item, RequestsFields.OtherApproval);
            var approvedOn = GetFieldValueNullable<DateTime>(item, RequestsFields.OtherApprovalDate);

            if (approvedBy == null && !approvedOn.HasValue)
            {
                return null;
            }

            return new ApprovalInfo
            {
                Type = ApprovalType.Other,
                ApprovedBy = approvedBy,
                ApprovedOn = approvedOn,
                HasDocument = GetFieldValue<bool>(item, RequestsFields.HasOtherApproval)
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

        /// <summary>To recipients configuration (e.g., "Submitter,LegalAdmin")</summary>
        public string ToRecipients { get; set; } = string.Empty;

        /// <summary>CC recipients configuration</summary>
        public string CcRecipients { get; set; } = string.Empty;

        /// <summary>BCC recipients configuration</summary>
        public string BccRecipients { get; set; } = string.Empty;

        /// <summary>Whether to include request documents as attachments</summary>
        public bool IncludeDocuments { get; set; }

        /// <summary>Email importance level</summary>
        public EmailImportance Importance { get; set; }

        /// <summary>Notification category</summary>
        public NotificationCategory Category { get; set; }

        /// <summary>Event that triggers this notification</summary>
        public string TriggerEvent { get; set; } = string.Empty;

        /// <summary>Whether this notification is active</summary>
        public bool IsActive { get; set; }

        /// <summary>Request type scope - null means applies to all types (generic fallback)</summary>
        public string? RequestType { get; set; }
    }
}

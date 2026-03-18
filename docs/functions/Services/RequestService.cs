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
        private readonly IAuthenticationProvider _authenticationProvider;
        private readonly Logger _logger;
        private readonly SharePointListConfig _listConfig;
        private readonly Uri _siteUri;

        /// <summary>
        /// Creates a new RequestService instance.
        /// </summary>
        /// <param name="contextFactory">PnP Core context factory for SharePoint access</param>
        /// <param name="logger">Logger instance for logging operations</param>
        /// <param name="listConfig">SharePoint list name configuration (optional)</param>
        public RequestService(IPnPContextFactory contextFactory, IAuthenticationProvider authenticationProvider, Logger logger, SharePointListConfig? listConfig = null)
        {
            _contextFactory = contextFactory ?? throw new ArgumentNullException(nameof(contextFactory));
            _authenticationProvider = authenticationProvider ?? throw new ArgumentNullException(nameof(authenticationProvider));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _listConfig = listConfig ?? new SharePointListConfig();
            _siteUri = SharePointContextHelper.GetRequiredSiteUri(_listConfig);
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
                using var context = await CreateContextAsync();

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

                _logger.SetRequestContext(request.Id, GetRequestContextTitle(request));
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
                using var context = await CreateContextAsync();

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
                using var context = await CreateContextAsync();

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
            var created = GetFieldValue<DateTime>(item, RequestsFields.Created);
            var submittedOn = GetFieldValueNullable<DateTime>(item, RequestsFields.SubmittedOn);

            return new RequestModel
            {
                // System fields
                Id = item.Id,
                Title = GetFieldTextValue(item, RequestsFields.Title),
                RequestTitle = GetFieldTextValue(item, RequestsFields.RequestTitle),
                Version = item.Values.ContainsKey(RequestsFields.UIVersionString)
                    ? item.Values[RequestsFields.UIVersionString]?.ToString() ?? "1.0"
                    : "1.0",
                Created = created,
                Modified = GetFieldValue<DateTime>(item, RequestsFields.Modified),

                // Request Information
                RequestType = ParseEnum<RequestType>(GetFieldTextValue(item, RequestsFields.RequestType), RequestType.Communication),
                SubmissionType = ParseEnum<SubmissionType>(GetFieldTextValue(item, RequestsFields.SubmissionType), SubmissionType.New),
                SubmissionItem = GetFieldTextValue(item, RequestsFields.SubmissionItem),
                Purpose = GetFieldTextValue(item, RequestsFields.Purpose),
                TargetReturnDate = GetFieldValueNullable<DateTime>(item, RequestsFields.TargetReturnDate),
                RequestedDate = submittedOn ?? created,
                IsRushRequest = GetFieldValue<bool>(item, RequestsFields.IsRushRequest),
                RushRationale = GetFieldTextValue(item, RequestsFields.RushRationale),
                ReviewAudience = ParseEnum<ReviewAudience>(GetFieldTextValue(item, RequestsFields.ReviewAudience), ReviewAudience.Both),

                // FINRA & Audience
                FINRAAudienceCategory = GetFieldTextValue(item, RequestsFields.FINRAAudienceCategory),
                Audience = GetFieldTextValue(item, RequestsFields.Audience),
                USFunds = ParseMultiChoice(GetFieldValue<object>(item, RequestsFields.USFunds)),
                UCITS = ParseMultiChoice(GetFieldValue<object>(item, RequestsFields.UCITS)),
                SeparateAccountStrategies = GetFieldTextValue(item, RequestsFields.SeparateAcctStrategies),
                SeparateAccountStrategiesIncludes = GetFieldTextValue(item, RequestsFields.SeparateAcctStrategiesIncl),

                // Distribution
                DistributionMethods = ParseDistributionMethods(GetFieldValue<object>(item, RequestsFields.DistributionMethod)),
                ProposedFirstUseDate = GetFieldValueNullable<DateTime>(item, RequestsFields.DateOfFirstUse),
                ProposedDiscontinueDate = null, // Field not in current schema

                // Legal Intake
                Attorneys = ParseMultiUserField(item, RequestsFields.Attorney),
                AttorneyAssignNotes = GetFieldTextValue(item, RequestsFields.AttorneyAssignNotes),

                // Legal Review
                LegalReviewStatus = ParseEnum<ReviewStatus>(GetFieldTextValue(item, RequestsFields.LegalReviewStatus), ReviewStatus.NotStarted),
                LegalReviewOutcome = ParseEnum<ReviewOutcome>(GetFieldTextValue(item, RequestsFields.LegalReviewOutcome), ReviewOutcome.None),
                LegalReviewNotes = GetFieldTextValue(item, RequestsFields.LegalReviewNotes),
                LegalStatusUpdatedOn = GetFieldValueNullable<DateTime>(item, RequestsFields.LegalStatusUpdatedOn),
                LegalReviewTime = GetFieldValueNullable<double>(item, RequestsFields.LegalReviewAttorneyHours),

                // Compliance Review
                ComplianceReviewStatus = ParseEnum<ReviewStatus>(GetFieldTextValue(item, RequestsFields.ComplianceReviewStatus), ReviewStatus.NotStarted),
                ComplianceReviewOutcome = ParseEnum<ReviewOutcome>(GetFieldTextValue(item, RequestsFields.ComplianceReviewOutcome), ReviewOutcome.None),
                ComplianceReviewNotes = GetFieldTextValue(item, RequestsFields.ComplianceReviewNotes),
                ComplianceStatusUpdatedOn = GetFieldValueNullable<DateTime>(item, RequestsFields.ComplianceStatusUpdatedOn),
                ComplianceReviewTime = GetFieldValueNullable<double>(item, RequestsFields.ComplianceReviewReviewerHours),
                IsForesideReviewRequired = GetFieldValue<bool>(item, RequestsFields.IsForesideReviewRequired),
                RecordRetentionOnly = GetFieldValue<bool>(item, RequestsFields.RecordRetentionOnly),
                IsRetailUse = GetFieldValue<bool>(item, RequestsFields.IsRetailUse),

                // Closeout
                TrackingId = GetFieldTextValue(item, RequestsFields.TrackingId),

                // System Tracking
                Status = ParseEnum<RequestStatus>(GetFieldTextValue(item, RequestsFields.Status), RequestStatus.Draft),
                PreviousStatus = ParseNullableEnum<RequestStatus>(GetFieldTextValue(item, RequestsFields.PreviousStatus)),
                SubmittedBy = ParseUserField(item, RequestsFields.SubmittedBy),
                SubmittedOn = submittedOn,
                IsOnHold = GetFieldValue<bool>(item, RequestsFields.IsOnHold),
                HoldReason = GetFieldTextValue(item, RequestsFields.OnHoldReason),
                HoldDate = GetFieldValueNullable<DateTime>(item, RequestsFields.OnHoldSince),
                CompletedOn = GetFieldValueNullable<DateTime>(item, RequestsFields.CloseoutOn),
                CancelledOn = GetFieldValueNullable<DateTime>(item, RequestsFields.CancelledOn),
                CancellationReason = GetFieldTextValue(item, RequestsFields.CancelReason),

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
        /// Parses a nullable enum value from a string.
        /// </summary>
        private TEnum? ParseNullableEnum<TEnum>(string? value) where TEnum : struct, Enum
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            if (TryParseEnum(value, out TEnum result))
            {
                return result;
            }

            return null;
        }

        /// <summary>
        /// Gets the text representation of a field, including lookup-backed fields.
        /// Prefers FieldValuesAsText to avoid touching lazy-loaded SharePoint lookup properties.
        /// </summary>
        private string GetFieldTextValue(IListItem item, string fieldName)
        {
            if (TryGetFieldValueAsText(item, fieldName, out var fieldTextValue))
            {
                return fieldTextValue;
            }

            if (item.Values.TryGetValue(fieldName, out var value) && value != null)
            {
                if (value is string textValue)
                {
                    return textValue;
                }

                // IFieldUserValue / IFieldLookupValue — LookupValue is always loaded
                if (value is IFieldLookupValue lookupValue && lookupValue.LookupValue != null)
                {
                    return lookupValue.LookupValue;
                }

                if (value is IDictionary<string, object> lookupDict &&
                    lookupDict.TryGetValue("LookupValue", out var lookupText) &&
                    lookupText != null)
                {
                    return lookupText.ToString() ?? string.Empty;
                }
            }

            return string.Empty;
        }

        /// <summary>
        /// Reads a field's text value from FieldValuesAsText, which is pre-loaded in
        /// GetByIdAsync / QueryProperties calls. Returns true when a non-null value is found.
        /// Uses the IReadOnlyDictionary indexer directly to avoid fragile reflection.
        /// </summary>
        private static bool TryGetFieldValueAsText(IListItem item, string fieldName, out string value)
        {
            value = string.Empty;

            try
            {
                var fieldValuesAsText = item.FieldValuesAsText;
                if (fieldValuesAsText == null)
                {
                    return false;
                }

                // IFieldStringValues exposes a string indexer; access it in a nested try
                // so a missing key doesn't fall through as an unhandled exception.
                try
                {
                    var textValue = fieldValuesAsText[fieldName]?.ToString();
                    if (textValue != null)
                    {
                        value = textValue;
                        return true;
                    }
                }
                catch (KeyNotFoundException)
                {
                    // Field absent from FieldValuesAsText — fall back to Values dictionary
                }
            }
            catch (Exception)
            {
                // FieldValuesAsText not loaded or field absent — caller falls back to Values dictionary
            }

            return false;
        }

        private static string GetRequestContextTitle(RequestModel request)
        {
            return !string.IsNullOrWhiteSpace(request.RequestTitle)
                ? request.RequestTitle
                : request.Title;
        }

        /// <summary>
        /// Parses a user lookup field from a list item.
        /// Uses LookupValue (always loaded) for the display name instead of IFieldUserValue.Title,
        /// which is a lazy-loaded model property that throws "Property Title was not yet loaded"
        /// unless the user profile is explicitly expanded.
        /// </summary>
        private UserInfo? ParseUserField(IListItem item, string fieldName)
        {
            if (!item.Values.TryGetValue(fieldName, out var value) || value == null)
            {
                return null;
            }

            if (value is IFieldUserValue userValue)
            {
                // LookupValue == display name, always present in the field value response
                var title = userValue.LookupValue ?? string.Empty;

                // FieldValuesAsText gives the display name when LookupValue is unexpectedly empty
                if (string.IsNullOrEmpty(title))
                {
                    TryGetFieldValueAsText(item, fieldName, out title);
                }

                // Email and Principal.LoginName require the user profile to be loaded;
                // access them safely so a missing load never crashes the mapping.
                var email = string.Empty;
                var loginName = string.Empty;
                try { email = userValue.Email ?? string.Empty; } catch { }
                try { loginName = userValue.Principal?.LoginName ?? string.Empty; } catch { }

                return new UserInfo { Id = userValue.LookupId, Title = title, Email = email, LoginName = loginName };
            }

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
        /// Uses LookupValue for the display name — see ParseUserField for rationale.
        /// </summary>
        private List<UserInfo> ParseMultiUserField(IListItem item, string fieldName)
        {
            var users = new List<UserInfo>();

            if (!item.Values.TryGetValue(fieldName, out var value) || value == null)
            {
                return users;
            }

            if (value is IEnumerable<IFieldUserValue> userValues)
            {
                foreach (var userValue in userValues)
                {
                    var email = string.Empty;
                    var loginName = string.Empty;
                    try { email = userValue.Email ?? string.Empty; } catch { }
                    try { loginName = userValue.Principal?.LoginName ?? string.Empty; } catch { }

                    users.Add(new UserInfo
                    {
                        Id = userValue.LookupId,
                        Title = userValue.LookupValue ?? string.Empty,
                        Email = email,
                        LoginName = loginName
                    });
                }
            }

            return users;
        }

        /// <summary>
        /// Parses a multi-user field from version history.
        /// Version history may store multi-user values as semicolon-separated strings or
        /// as IFieldUserValue objects — handles both. Uses LookupValue for display name.
        /// </summary>
        private static List<UserInfo> ParseVersionMultiUserField(IListItemVersion version, string fieldName)
        {
            var users = new List<UserInfo>();

            if (!version.Values.TryGetValue(fieldName, out var value) || value == null)
            {
                return users;
            }

            // Version history may store multi-user as semicolon-separated string
            if (value is string stringValue && !string.IsNullOrEmpty(stringValue))
            {
                var parts = stringValue.Split(';', StringSplitOptions.RemoveEmptyEntries);
                foreach (var part in parts)
                {
                    var trimmed = part.Trim();
                    if (!string.IsNullOrEmpty(trimmed) && !trimmed.StartsWith('#'))
                    {
                        users.Add(new UserInfo { Title = trimmed });
                    }
                }
                return users;
            }

            if (value is IEnumerable<IFieldUserValue> userValues)
            {
                foreach (var userValue in userValues)
                {
                    var email = string.Empty;
                    var loginName = string.Empty;
                    try { email = userValue.Email ?? string.Empty; } catch { }
                    try { loginName = userValue.Principal?.LoginName ?? string.Empty; } catch { }

                    users.Add(new UserInfo
                    {
                        Id = userValue.LookupId,
                        Title = userValue.LookupValue ?? string.Empty,
                        Email = email,
                        LoginName = loginName
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

        private async Task<PnPContext> CreateContextAsync()
        {
            return await SharePointContextHelper.CreateContextAsync(_contextFactory, _siteUri, _authenticationProvider);
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

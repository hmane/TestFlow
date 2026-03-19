// =============================================================================
// Legal Workflow - Azure Functions
// RequestService.cs - Service for loading request data from SharePoint
// =============================================================================

using System;
using System.Collections.Concurrent;
using System.Collections;
using System.Linq;
using System.Net;
using System.Text.Json;
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

        // Cache normalized enum name → value maps per enum type to avoid repeated Enum.GetValues<T>() allocations
        private static readonly ConcurrentDictionary<Type, Dictionary<string, object>> _enumNormalizedCache = new();

        private static readonly string[] _requestReadFieldInternalNames =
        {
            RequestsFields.ID,
            RequestsFields.Title,
            RequestsFields.RequestTitle,
            RequestsFields.UIVersionString,
            RequestsFields.Created,
            RequestsFields.Modified,
            RequestsFields.RequestType,
            RequestsFields.SubmissionType,
            RequestsFields.SubmissionItem,
            RequestsFields.Purpose,
            RequestsFields.TargetReturnDate,
            RequestsFields.IsRushRequest,
            RequestsFields.RushRationale,
            RequestsFields.ReviewAudience,
            RequestsFields.FINRAAudienceCategory,
            RequestsFields.Audience,
            RequestsFields.USFunds,
            RequestsFields.UCITS,
            RequestsFields.SeparateAcctStrategies,
            RequestsFields.SeparateAcctStrategiesIncl,
            RequestsFields.DistributionMethod,
            RequestsFields.DateOfFirstUse,
            RequestsFields.Attorney,
            RequestsFields.AttorneyAssignNotes,
            RequestsFields.LegalReviewStatus,
            RequestsFields.LegalReviewOutcome,
            RequestsFields.LegalReviewNotes,
            RequestsFields.LegalStatusUpdatedOn,
            RequestsFields.LegalReviewAttorneyHours,
            RequestsFields.ComplianceReviewStatus,
            RequestsFields.ComplianceReviewOutcome,
            RequestsFields.ComplianceReviewNotes,
            RequestsFields.ComplianceStatusUpdatedOn,
            RequestsFields.ComplianceReviewReviewerHours,
            RequestsFields.IsForesideReviewRequired,
            RequestsFields.RecordRetentionOnly,
            RequestsFields.IsRetailUse,
            RequestsFields.TrackingId,
            RequestsFields.Status,
            RequestsFields.PreviousStatus,
            RequestsFields.SubmittedBy,
            RequestsFields.SubmittedOn,
            RequestsFields.IsOnHold,
            RequestsFields.OnHoldReason,
            RequestsFields.OnHoldSince,
            RequestsFields.CloseoutOn,
            RequestsFields.CancelledOn,
            RequestsFields.CancelReason,
            RequestsFields.AdditionalParty,
            RequestsFields.CommunicationsApprover,
            RequestsFields.CommunicationsApprovalDate,
            RequestsFields.HasCommunicationsApproval,
            RequestsFields.PortfolioManager,
            RequestsFields.PortfolioManagerApprovalDate,
            RequestsFields.HasPortfolioManagerApproval,
            RequestsFields.ResearchAnalyst,
            RequestsFields.ResearchAnalystApprovalDate,
            RequestsFields.HasResearchAnalystApproval,
            RequestsFields.SubjectMatterExpert,
            RequestsFields.SMEApprovalDate,
            RequestsFields.HasSMEApproval,
            RequestsFields.PerformanceApprover,
            RequestsFields.PerformanceApprovalDate,
            RequestsFields.HasPerformanceApproval,
            RequestsFields.OtherApproval,
            RequestsFields.OtherApprovalDate,
            RequestsFields.HasOtherApproval
        };

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

                // Load field metadata so PnP Core can translate complex field types
                // when using RenderListDataAsStream.
                var list = await context.Web.Lists.GetByTitleAsync(
                    _listConfig.RequestsListName,
                    l => l.Fields.QueryProperties(
                        f => f.InternalName,
                        f => f.FieldTypeKind,
                        f => f.TypeAsString,
                        f => f.Title)
                );

                var viewFieldsXml = string.Concat(
                    _requestReadFieldInternalNames.Select(fieldName => $"<FieldRef Name='{fieldName}'/>"));

                var viewXml = $@"<View>
                    <ViewFields>{viewFieldsXml}</ViewFields>
                    <Query>
                        <Where>
                            <Eq>
                                <FieldRef Name='ID'/>
                                <Value Type='Counter'>{requestId}</Value>
                            </Eq>
                        </Where>
                    </Query>
                    <RowLimit>1</RowLimit>
                </View>";

                await list.LoadListDataAsStreamAsync(new RenderListDataOptions
                {
                    ViewXml = viewXml,
                    RenderOptions = RenderListDataOptionsFlags.ListData
                });

                var item = list.Items.AsRequested().FirstOrDefault();

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
                var item = await list.Items.GetByIdAsync(requestId, i => i.Versions);

                if (item.Versions == null || item.Versions.AsRequested().Count() < 2)
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
                        GetFieldValue<bool>(i, NotificationsFields.IsActive) &&
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
                    GetFieldValue<bool>(i, NotificationsFields.IsActive) &&
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
        private static NotificationTemplate MapToNotificationTemplate(string notificationId, IListItem item)
        {
            return new NotificationTemplate
            {
                Id = notificationId,
                // HtmlDecode restores {{ }} from &#123;&#123; &#125;&#125; — SharePoint's RTE
                // encodes curly braces when saving rich text fields.
                // UnescapeTemplate also converts literal \n / \r / \\ sequences written by
                // template authors in plain-text fields into actual characters.
                Subject = UnescapeTemplate(WebUtility.HtmlDecode(GetFieldValue<string>(item, NotificationsFields.Subject) ?? string.Empty)),
                Body = UnescapeTemplate(WebUtility.HtmlDecode(GetFieldValue<string>(item, NotificationsFields.Body) ?? string.Empty)),
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

        /// <summary>
        /// Converts literal escape sequences written by template authors (e.g. \n, \r, \\)
        /// into their actual characters. This handles plain-text fields where authors type
        /// \n instead of inserting a real newline.
        /// </summary>
        private static string UnescapeTemplate(string value)
        {
            if (string.IsNullOrEmpty(value)) return value;

            return value
                .Replace("\\n", "\n")
                .Replace("\\r", "\r")
                .Replace("\\t", "\t")
                .Replace("\\\\", "\\");
        }

        #region Private Helper Methods

        /// <summary>
        /// Maps a SharePoint list item to RequestModel.
        /// </summary>
        private static RequestModel MapItemToRequest(IListItem item)
        {
            var created = GetFieldValue<DateTime>(item, RequestsFields.Created);
            var submittedOn = GetFieldValueNullable<DateTime>(item, RequestsFields.SubmittedOn);

            return new RequestModel
            {
                // System fields
                Id = item.Id,
                Title = GetFieldTextValue(item, RequestsFields.Title),
                RequestTitle = GetFieldTextValue(item, RequestsFields.RequestTitle),
                Version = item.Values.TryGetValue(RequestsFields.UIVersionString, out var versionRaw)
                    ? versionRaw?.ToString() ?? "1.0"
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
        private static RequestVersionInfo MapVersionToVersionInfo(IListItemVersion version, int requestId)
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
        private static T GetFieldValue<T>(IListItem item, string fieldName)
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
        private static T? GetFieldValueNullable<T>(IListItem item, string fieldName) where T : struct
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
        private static T GetVersionFieldValue<T>(IListItemVersion version, string fieldName)
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
        private static TEnum ParseEnum<TEnum>(string? value, TEnum defaultValue) where TEnum : struct, Enum
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
        private static TEnum? ParseNullableEnum<TEnum>(string? value) where TEnum : struct, Enum
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
        private static string GetFieldTextValue(IListItem item, string fieldName)
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
        ///
        /// All IFieldUserValue properties (LookupId, LookupValue, Email, Principal) go through
        /// PnP Core SDK's GetValue&lt;T&gt;() and throw "Property X was not yet loaded" when the
        /// sub-object was not explicitly expanded. We therefore:
        ///   1. Prefer the richer RenderListDataAsStream payload used by request reads.
        ///   2. Fall back to FieldValuesAsText when it is available for the display name.
        ///   3. Wrap every IFieldUserValue property access in its own try/catch as a final fallback.
        /// </summary>
        private static UserInfo? ParseUserField(IListItem item, string fieldName)
        {
            if (!item.Values.TryGetValue(fieldName, out var value) || value == null)
            {
                return null;
            }

            var user = ExtractUserInfos(value).FirstOrDefault();

            // FieldValuesAsText is the most reliable source for the display name — use it
            // as primary when populated; fall back only when it is also absent.
            if (user != null &&
                TryGetFieldValueAsText(item, fieldName, out var textTitle) &&
                !string.IsNullOrEmpty(textTitle) &&
                string.IsNullOrWhiteSpace(user.Title))
            {
                user.Title = textTitle;
            }

            return IsMeaningfulUser(user) ? user : null;
        }

        /// <summary>
        /// Parses a multi-user lookup field from a list item.
        /// Handles both strongly typed user values and dictionary-backed values returned by
        /// RenderListDataAsStream.
        /// </summary>
        private static List<UserInfo> ParseMultiUserField(IListItem item, string fieldName)
        {
            if (!item.Values.TryGetValue(fieldName, out var value) || value == null)
            {
                return new List<UserInfo>();
            }

            var users = ExtractUserInfos(value);

            if (users.Count == 0 &&
                TryGetFieldValueAsText(item, fieldName, out var textValue) &&
                !string.IsNullOrWhiteSpace(textValue))
            {
                users = ParseDelimitedUserTitles(textValue);
            }

            return users;
        }

        private static List<UserInfo> ExtractUserInfos(object? value)
        {
            if (value == null || value is string { Length: 0 })
            {
                return new List<UserInfo>();
            }

            if (value is IFieldUserValue userValue)
            {
                var typedUser = new UserInfo();
                try { typedUser.Id = userValue.LookupId; } catch { }
                try { typedUser.Title = userValue.LookupValue ?? string.Empty; } catch { }
                try { typedUser.Email = userValue.Email ?? string.Empty; } catch { }
                try { typedUser.LoginName = userValue.Principal?.LoginName ?? string.Empty; } catch { }

                return IsMeaningfulUser(typedUser)
                    ? new List<UserInfo> { typedUser }
                    : new List<UserInfo>();
            }

            if (value is IDictionary<string, object> lookupDict)
            {
                return ExtractUserInfosFromDictionary(lookupDict);
            }

            if (value is JsonElement jsonElement)
            {
                return ExtractUserInfosFromJsonElement(jsonElement);
            }

            if (value is IEnumerable enumerable && value is not string)
            {
                var users = new List<UserInfo>();
                foreach (var entry in enumerable)
                {
                    users.AddRange(ExtractUserInfos(entry));
                }

                return DeduplicateUsers(users);
            }

            if (value is string stringValue)
            {
                return ExtractUserInfosFromString(stringValue);
            }

            return new List<UserInfo>();
        }

        /// <summary>
        /// Parses a multi-user field from version history.
        /// Version history may store multi-user values as semicolon-separated strings or
        /// as IFieldUserValue objects — handles both. Uses LookupValue for display name.
        /// </summary>
        private static List<UserInfo> ParseVersionMultiUserField(IListItemVersion version, string fieldName)
        {
            if (!version.Values.TryGetValue(fieldName, out var value) || value == null)
            {
                return new List<UserInfo>();
            }

            return ExtractUserInfos(value);
        }

        private static List<UserInfo> ExtractUserInfosFromDictionary(IDictionary<string, object> lookupDict)
        {
            if (TryParseUserFromDictionary(lookupDict, out var singleUser))
            {
                return new List<UserInfo> { singleUser };
            }

            foreach (var collectionKey in new[] { "results", "Results", "value", "Value", "items", "Items" })
            {
                if (lookupDict.TryGetValue(collectionKey, out var nested) && nested != null)
                {
                    return ExtractUserInfos(nested);
                }
            }

            return new List<UserInfo>();
        }

        private static bool TryParseUserFromDictionary(IDictionary<string, object> lookupDict, out UserInfo user)
        {
            user = new UserInfo();

            if (TryGetDictionaryValue(lookupDict, "LookupId", out var rawId) ||
                TryGetDictionaryValue(lookupDict, "Id", out rawId) ||
                TryGetDictionaryValue(lookupDict, "ID", out rawId))
            {
                TryConvertToInt(rawId, out var userId);
                user.Id = userId;
            }

            if (TryGetDictionaryValue(lookupDict, "LookupValue", out var rawTitle) ||
                TryGetDictionaryValue(lookupDict, "Title", out rawTitle) ||
                TryGetDictionaryValue(lookupDict, "title", out rawTitle) ||
                TryGetDictionaryValue(lookupDict, "DisplayText", out rawTitle) ||
                TryGetDictionaryValue(lookupDict, "displayName", out rawTitle))
            {
                user.Title = rawTitle?.ToString() ?? string.Empty;
            }

            if (TryGetDictionaryValue(lookupDict, "Email", out var rawEmail) ||
                TryGetDictionaryValue(lookupDict, "EMail", out rawEmail) ||
                TryGetDictionaryValue(lookupDict, "email", out rawEmail))
            {
                user.Email = rawEmail?.ToString() ?? string.Empty;
            }

            if (TryGetDictionaryValue(lookupDict, "Name", out var rawLoginName) ||
                TryGetDictionaryValue(lookupDict, "LoginName", out rawLoginName) ||
                TryGetDictionaryValue(lookupDict, "loginName", out rawLoginName) ||
                TryGetDictionaryValue(lookupDict, "Claims", out rawLoginName))
            {
                user.LoginName = rawLoginName?.ToString() ?? string.Empty;
            }

            return IsMeaningfulUser(user);
        }

        private static bool TryGetDictionaryValue(IDictionary<string, object> dictionary, string key, out object? value)
        {
            foreach (var entry in dictionary)
            {
                if (string.Equals(entry.Key, key, StringComparison.OrdinalIgnoreCase))
                {
                    value = entry.Value;
                    return true;
                }
            }

            value = null;
            return false;
        }

        private static List<UserInfo> ExtractUserInfosFromJsonElement(JsonElement jsonElement)
        {
            if (jsonElement.ValueKind == JsonValueKind.Null || jsonElement.ValueKind == JsonValueKind.Undefined)
            {
                return new List<UserInfo>();
            }

            if (jsonElement.ValueKind == JsonValueKind.Array)
            {
                var users = new List<UserInfo>();
                foreach (var arrayEntry in jsonElement.EnumerateArray())
                {
                    users.AddRange(ExtractUserInfosFromJsonElement(arrayEntry));
                }

                return DeduplicateUsers(users);
            }

            if (jsonElement.ValueKind == JsonValueKind.Object)
            {
                var objectMap = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
                foreach (var property in jsonElement.EnumerateObject())
                {
                    objectMap[property.Name] = ConvertJsonElementToObject(property.Value) ?? string.Empty;
                }

                return ExtractUserInfosFromDictionary(objectMap);
            }

            if (jsonElement.ValueKind == JsonValueKind.String)
            {
                return ExtractUserInfosFromString(jsonElement.GetString() ?? string.Empty);
            }

            return new List<UserInfo>();
        }

        private static object? ConvertJsonElementToObject(JsonElement jsonElement)
        {
            return jsonElement.ValueKind switch
            {
                JsonValueKind.Object => jsonElement.EnumerateObject()
                    .ToDictionary(property => property.Name, property => ConvertJsonElementToObject(property.Value), StringComparer.OrdinalIgnoreCase),
                JsonValueKind.Array => jsonElement.EnumerateArray().Select(ConvertJsonElementToObject).ToList(),
                JsonValueKind.String => jsonElement.GetString(),
                JsonValueKind.Number when jsonElement.TryGetInt32(out var intValue) => intValue,
                JsonValueKind.Number when jsonElement.TryGetInt64(out var longValue) => longValue,
                JsonValueKind.Number when jsonElement.TryGetDouble(out var doubleValue) => doubleValue,
                JsonValueKind.True => true,
                JsonValueKind.False => false,
                _ => null
            };
        }

        private static List<UserInfo> ExtractUserInfosFromString(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return new List<UserInfo>();
            }

            var trimmed = value.Trim();

            if ((trimmed.StartsWith("{") && trimmed.EndsWith("}")) ||
                (trimmed.StartsWith("[") && trimmed.EndsWith("]")))
            {
                try
                {
                    using var jsonDocument = JsonDocument.Parse(trimmed);
                    return ExtractUserInfosFromJsonElement(jsonDocument.RootElement);
                }
                catch (JsonException)
                {
                    // Fall through to string-based parsing
                }
            }

            if (trimmed.Contains(";#"))
            {
                return ParseSharePointEncodedUsers(trimmed);
            }

            return ParseDelimitedUserTitles(trimmed);
        }

        private static List<UserInfo> ParseSharePointEncodedUsers(string value)
        {
            var tokens = value.Split(new[] { ";#" }, StringSplitOptions.None);
            var users = new List<UserInfo>();

            for (var i = 0; i < tokens.Length; i += 2)
            {
                var idToken = tokens[i].Trim();
                var titleToken = i + 1 < tokens.Length ? tokens[i + 1].Trim() : string.Empty;

                if (string.IsNullOrWhiteSpace(idToken) && string.IsNullOrWhiteSpace(titleToken))
                {
                    continue;
                }

                TryConvertToInt(idToken, out var userId);
                var user = new UserInfo
                {
                    Id = userId,
                    Title = titleToken
                };

                if (IsMeaningfulUser(user))
                {
                    users.Add(user);
                }
            }

            return DeduplicateUsers(users);
        }

        private static List<UserInfo> ParseDelimitedUserTitles(string value)
        {
            return value
                .Split(new[] { ';', ',' }, StringSplitOptions.RemoveEmptyEntries)
                .Select(part => part.Trim())
                .Where(part => !string.IsNullOrWhiteSpace(part) && !part.StartsWith('#'))
                .Select(part => new UserInfo { Title = part })
                .ToList();
        }

        private static bool TryConvertToInt(object? value, out int result)
        {
            result = 0;

            if (value == null)
            {
                return false;
            }

            if (value is int intValue)
            {
                result = intValue;
                return true;
            }

            if (value is long longValue && longValue <= int.MaxValue && longValue >= int.MinValue)
            {
                result = (int)longValue;
                return true;
            }

            var stringValue = value.ToString();
            return !string.IsNullOrWhiteSpace(stringValue) &&
                   int.TryParse(stringValue, out result);
        }

        private static bool IsMeaningfulUser(UserInfo? user)
        {
            return user != null &&
                   (user.Id != 0 ||
                    !string.IsNullOrWhiteSpace(user.Title) ||
                    !string.IsNullOrWhiteSpace(user.Email) ||
                    !string.IsNullOrWhiteSpace(user.LoginName));
        }

        private static List<UserInfo> DeduplicateUsers(IEnumerable<UserInfo> users)
        {
            return users
                .Where(IsMeaningfulUser)
                .GroupBy(user =>
                {
                    if (user.Id != 0) return $"id:{user.Id}";
                    if (!string.IsNullOrWhiteSpace(user.LoginName)) return $"login:{user.LoginName.Trim().ToLowerInvariant()}";
                    if (!string.IsNullOrWhiteSpace(user.Email)) return $"email:{user.Email.Trim().ToLowerInvariant()}";
                    return $"title:{user.Title.Trim().ToLowerInvariant()}";
                })
                .Select(group => group.First())
                .ToList();
        }

        /// <summary>
        /// Parses a multi-choice field value.
        /// </summary>
        private static List<string> ParseMultiChoice(object? value)
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
        private static List<DistributionMethod> ParseDistributionMethods(object? value)
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

            var map = _enumNormalizedCache.GetOrAdd(typeof(TEnum), static t =>
            {
                var dict = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
                foreach (var enumValue in Enum.GetValues(t))
                {
                    var normalized = NormalizeEnumValue(enumValue.ToString() ?? string.Empty);
                    dict.TryAdd(normalized, enumValue);
                }
                return dict;
            });

            var normalizedValue = NormalizeEnumValue(value);
            if (map.TryGetValue(normalizedValue, out var cached))
            {
                result = (TEnum)cached;
                return true;
            }

            return false;
        }

        /// <summary>
        /// Parses Communications approval information.
        /// </summary>
        private static ApprovalInfo? ParseApprovalCommunications(IListItem item)
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
                HasDocument = GetFieldValue<bool>(item, RequestsFields.HasCommunicationsApproval)
            };
        }

        /// <summary>
        /// Parses Portfolio Manager approval information.
        /// </summary>
        private static ApprovalInfo? ParseApprovalPortfolioManager(IListItem item)
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
        private static ApprovalInfo? ParseApprovalResearchAnalyst(IListItem item)
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
        private static ApprovalInfo? ParseApprovalSME(IListItem item)
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
        private static ApprovalInfo? ParseApprovalPerformance(IListItem item)
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
        private static ApprovalInfo? ParseApprovalOther(IListItem item)
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

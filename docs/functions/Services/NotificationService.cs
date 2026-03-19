// =============================================================================
// Legal Workflow - Azure Functions
// NotificationService.cs - Service for determining and generating notifications
// =============================================================================

using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.Extensions.Caching.Memory;
using PnP.Core.QueryModel;
using PnP.Core.Services;
using LegalWorkflow.Functions.Constants;
using LegalWorkflow.Functions.Helpers;
using LegalWorkflow.Functions.Models;

namespace LegalWorkflow.Functions.Services
{
    /// <summary>
    /// Service for determining which notifications should be sent based on
    /// changes to a Legal Review Request. Uses version comparison to detect
    /// actual changes and avoid false triggers.
    ///
    /// Notification Triggers:
    /// - RequestSubmitted: Status Draft → Legal Intake
    /// - RushRequestAlert: Status Draft → Legal Intake AND IsRushRequest = true
    /// - ReadyForAttorneyAssignment: Status → Assign Attorney
    /// - AttorneyAssigned: Status (Legal Intake OR Assign Attorney) → In Review (when Legal or Both)
    /// - AttorneyReassigned: Attorney field changes from one user to another
    /// - ComplianceReviewRequired: Status → In Review AND ReviewAudience = Compliance Only
    /// - LegalReviewApproved: LegalReviewStatus → Completed AND Outcome = Approved/ApprovedWithComments
    /// - LegalChangesRequested: LegalReviewStatus → Waiting On Submitter
    /// - LegalReviewNotApproved: LegalReviewStatus → Completed AND Outcome = Not Approved
    /// - ComplianceReviewApproved: ComplianceReviewStatus → Completed AND Outcome = Approved/ApprovedWithComments
    /// - ComplianceChangesRequested: ComplianceReviewStatus → Waiting On Submitter
    /// - ComplianceReviewNotApproved: ComplianceReviewStatus → Completed AND Outcome = Not Approved
    /// - ResubmissionReceivedLegal: LegalReviewStatus Waiting On Submitter → Waiting On Attorney
    /// - ResubmissionReceivedCompliance: ComplianceReviewStatus Waiting On Submitter → Waiting On Compliance
    /// - RequestOnHold: IsOnHold false → true
    /// - RequestResumed: IsOnHold true → false
    /// - RequestCancelled: Status → Cancelled
    /// - ReadyForCloseout: Status → Closeout
    /// - RequestCompleted: Status → Completed
    /// </summary>
    public partial class NotificationService
    {
        private readonly RequestService _requestService;
        private readonly IPnPContextFactory _contextFactory;
        private readonly IAuthenticationProvider _authenticationProvider;
        private readonly PermissionGroupConfig _groupConfig;
        private readonly IMemoryCache _groupMembersCache;
        private readonly Logger _logger;
        private readonly NotificationConfig _config;
        private readonly SharePointListConfig _listConfig;
        private readonly Uri _siteUri;

        /// <summary>
        /// Cache expiration time for group member emails (5 minutes).
        /// </summary>
        private static readonly TimeSpan GroupMembersCacheExpiration = TimeSpan.FromMinutes(5);

        /// <summary>
        /// Creates a new NotificationService instance.
        /// </summary>
        /// <param name="requestService">Service for loading request data</param>
        /// <param name="contextFactory">PnP Core context factory for SharePoint group member resolution</param>
        /// <param name="groupConfig">SharePoint group name configuration</param>
        /// <param name="logger">Logger instance for logging operations</param>
        /// <param name="config">Configuration for notification settings (optional)</param>
        /// <param name="memoryCache">Memory cache for caching group member emails (optional)</param>
        /// <param name="listConfig">SharePoint list name configuration (optional)</param>
        public NotificationService(
            RequestService requestService,
            IPnPContextFactory contextFactory,
            IAuthenticationProvider authenticationProvider,
            PermissionGroupConfig groupConfig,
            Logger logger,
            NotificationConfig? config = null,
            IMemoryCache? memoryCache = null,
            SharePointListConfig? listConfig = null)
        {
            _requestService = requestService ?? throw new ArgumentNullException(nameof(requestService));
            _contextFactory = contextFactory ?? throw new ArgumentNullException(nameof(contextFactory));
            _authenticationProvider = authenticationProvider ?? throw new ArgumentNullException(nameof(authenticationProvider));
            _groupConfig = groupConfig ?? throw new ArgumentNullException(nameof(groupConfig));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _config = config ?? new NotificationConfig();
            _groupMembersCache = memoryCache ?? new MemoryCache(new MemoryCacheOptions());
            _listConfig = listConfig ?? new SharePointListConfig();
            _siteUri = SharePointContextHelper.GetRequiredSiteUri(_listConfig);
        }

        /// <summary>
        /// Determines if a notification should be sent and generates the email content.
        /// Compares the current version with the previous version to detect changes.
        /// Called from Power Automate flow when a request is modified.
        /// </summary>
        /// <param name="request">The send notification request containing the request ID</param>
        /// <returns>SendNotificationResponse with email details or null if no notification needed</returns>
        public async Task<SendNotificationResponse> ProcessNotificationAsync(SendNotificationRequest request)
        {
            using var tracker = _logger.StartOperation($"ProcessNotification({request.RequestId})");

            try
            {
                // Load the current request
                var currentRequest = await _requestService.GetRequestByIdAsync(request.RequestId);
                if (currentRequest == null)
                {
                    _logger.Warning($"Request {request.RequestId} not found");
                    return new SendNotificationResponse
                    {
                        ShouldSendNotification = false,
                        Reason = "Request not found"
                    };
                }

                _logger.SetRequestContext(currentRequest.Id, currentRequest.Title);

                // Load the previous version for comparison
                var previousVersion = await _requestService.GetPreviousVersionAsync(request.RequestId, request.PreviousVersion);

                // If a previous version was specified but could not be loaded, we cannot safely
                // determine the change delta. Returning no notification is safer than misclassifying
                // an existing item as a new submission and firing a spurious RequestSubmitted/rush alert.
                if (previousVersion == null && !string.IsNullOrEmpty(request.PreviousVersion))
                {
                    _logger.Warning("Previous version not found — cannot determine change delta, skipping notification",
                        new { request.RequestId, RequestedVersion = request.PreviousVersion });
                    tracker.Complete(true, "Previous version not available");
                    return new SendNotificationResponse
                    {
                        ShouldSendNotification = false,
                        Reason = $"Previous version '{request.PreviousVersion}' not available for comparison"
                    };
                }

                // Determine which notification (if any) should be sent
                var notificationId = DetermineNotification(currentRequest, previousVersion);

                if (string.IsNullOrEmpty(notificationId))
                {
                    _logger.Info("No notification trigger detected", new
                    {
                        CurrentStatus = currentRequest.Status.ToString(),
                        PreviousStatus = previousVersion?.Status.ToString() ?? "N/A"
                    });

                    tracker.Complete(true, "No notification needed");
                    return new SendNotificationResponse
                    {
                        ShouldSendNotification = false,
                        Reason = "No relevant changes detected"
                    };
                }

                _logger.Info($"Notification trigger detected: {notificationId}");

                // Load the notification template - try type-specific first, fall back to generic
                var requestTypeName = GetTemplateRequestType(currentRequest.RequestType);
                var template = await _requestService.GetNotificationTemplateAsync(notificationId, requestTypeName);
                if (template == null || !template.IsActive)
                {
                    _logger.Warning($"Notification template '{notificationId}' not found or inactive");
                    return new SendNotificationResponse
                    {
                        ShouldSendNotification = false,
                        Reason = $"Template '{notificationId}' not found or inactive"
                    };
                }

                // Generate the email
                var email = await GenerateEmailAsync(currentRequest, template, notificationId);

                if (email.To.Count == 0 && email.Cc.Count == 0 && email.Bcc.Count == 0)
                {
                    _logger.Warning($"Notification '{notificationId}' resolved with no recipients");
                    tracker.Complete(true, "No recipients resolved");
                    return new SendNotificationResponse
                    {
                        ShouldSendNotification = false,
                        Reason = $"Notification '{notificationId}' has no resolved recipients"
                    };
                }

                _logger.LogNotification(
                    notificationId,
                    GetTriggerDescription(notificationId, currentRequest, previousVersion),
                    email.To,
                    sent: true,
                    reason: "Notification generated successfully"
                );

                tracker.Complete(true, $"Notification generated: {notificationId}");

                return new SendNotificationResponse
                {
                    ShouldSendNotification = true,
                    Email = email,
                    Reason = GetTriggerDescription(notificationId, currentRequest, previousVersion)
                };
            }
            catch (Exception ex)
            {
                _logger.Error("Failed to process notification", ex);
                tracker.Complete(false, $"Error: {ex.Message}");
                throw;
            }
        }

        #region Notification Detection Logic

        /// <summary>
        /// Determines which notification should be sent based on changes between versions.
        /// Returns the notification template ID or null if no notification should be sent.
        /// </summary>
        /// <param name="current">Current request state</param>
        /// <param name="previous">Previous request state (null for new items)</param>
        /// <returns>Notification template ID or null</returns>
        private string? DetermineNotification(RequestModel current, RequestVersionInfo? previous)
        {
            // If no previous version, this is a new item - check if submitted
            if (previous == null)
            {
                if (current.Status == RequestStatus.LegalIntake)
                {
                    // New request submitted directly
                    _logger.Debug("New request submitted directly to Legal Intake");
                    return current.IsRushRequest
                        ? NotificationTemplateIds.RushRequestAlert  // Rush takes priority
                        : NotificationTemplateIds.RequestSubmitted;
                }
                // Draft save - no notification
                return null;
            }

            // Check for status transitions (order matters - check more specific conditions first)

            // 1. Hold/Resume notifications
            if (!previous.IsOnHold && current.IsOnHold)
            {
                _logger.Debug("Request put on hold");
                return NotificationTemplateIds.RequestOnHold;
            }

            if (previous.IsOnHold && !current.IsOnHold)
            {
                _logger.Debug("Request resumed from hold");
                return NotificationTemplateIds.RequestResumed;
            }

            // 2. Cancellation
            if (previous.Status != RequestStatus.Cancelled && current.Status == RequestStatus.Cancelled)
            {
                _logger.Debug("Request cancelled");
                return NotificationTemplateIds.RequestCancelled;
            }

            // 3. Completion
            if (previous.Status != RequestStatus.Completed && current.Status == RequestStatus.Completed)
            {
                _logger.Debug("Request completed");
                return NotificationTemplateIds.RequestCompleted;
            }

            // 4. Closeout
            if (previous.Status != RequestStatus.Closeout && current.Status == RequestStatus.Closeout)
            {
                _logger.Debug("Request ready for closeout");
                return NotificationTemplateIds.ReadyForCloseout;
            }

            // 5. Request submitted (Draft → Legal Intake)
            if (previous.Status == RequestStatus.Draft && current.Status == RequestStatus.LegalIntake)
            {
                _logger.Debug("Request submitted (Draft → Legal Intake)");
                return current.IsRushRequest
                    ? NotificationTemplateIds.RushRequestAlert
                    : NotificationTemplateIds.RequestSubmitted;
            }

            // 6. Ready for attorney assignment (Any → Assign Attorney)
            if (previous.Status != RequestStatus.AssignAttorney && current.Status == RequestStatus.AssignAttorney)
            {
                _logger.Debug("Request ready for attorney assignment");
                return NotificationTemplateIds.ReadyForAttorneyAssignment;
            }

            // 7. Attorney reassigned (attorneys changed while in review)
            // Check this BEFORE status change checks to catch reassignments during In Review
            if (current.Status == RequestStatus.InReview &&
                previous.Attorneys.Count > 0 && current.Attorneys.Count > 0 &&
                !AttorneyListsMatch(previous.Attorneys, current.Attorneys))
            {
                _logger.Debug("Attorney reassigned", new
                {
                    PreviousAttorneys = string.Join(", ", previous.Attorneys.Select(a => a.Title)),
                    NewAttorneys = string.Join(", ", current.Attorneys.Select(a => a.Title))
                });
                return NotificationTemplateIds.AttorneyReassigned;
            }

            // 8. Status change to In Review - determine appropriate notification based on ReviewAudience
            if ((previous.Status == RequestStatus.LegalIntake || previous.Status == RequestStatus.AssignAttorney)
                && current.Status == RequestStatus.InReview)
            {
                // Compliance Only - no attorney involved, notify compliance team directly
                if (current.ReviewAudience == ReviewAudience.Compliance)
                {
                    _logger.Debug("Compliance review required (Compliance Only audience)");
                    return NotificationTemplateIds.ComplianceReviewRequired;
                }

                // Legal Only or Both - attorney is assigned, notify them
                // For "Both", compliance team will also see it in their dashboard
                if (current.Attorneys.Count == 0)
                {
                    _logger.Warning("Status moved to In Review but no attorneys are assigned — skipping AttorneyAssigned notification");
                    return null;
                }

                _logger.Debug("Attorney assigned - moving to In Review");
                return NotificationTemplateIds.AttorneyAssigned;
            }

            // 10. Legal review status changes
            var legalNotification = CheckLegalReviewChanges(current, previous);
            if (legalNotification != null)
            {
                return legalNotification;
            }

            // 11. Compliance review status changes
            var complianceNotification = CheckComplianceReviewChanges(current, previous);
            if (complianceNotification != null)
            {
                return complianceNotification;
            }

            // No notification trigger detected
            return null;
        }

        /// <summary>
        /// Checks for legal review status changes that trigger notifications.
        /// </summary>
        private string? CheckLegalReviewChanges(RequestModel current, RequestVersionInfo previous)
        {
            // Legal review completed
            if (previous.LegalReviewStatus != ReviewStatus.Completed &&
                current.LegalReviewStatus == ReviewStatus.Completed)
            {
                // Check outcome
                if (current.LegalReviewOutcome == ReviewOutcome.NotApproved)
                {
                    _logger.Debug("Legal review not approved");
                    return NotificationTemplateIds.LegalReviewNotApproved;
                }

                if (current.LegalReviewOutcome == ReviewOutcome.Approved ||
                    current.LegalReviewOutcome == ReviewOutcome.ApprovedWithComments)
                {
                    _logger.Debug("Legal review approved");
                    return NotificationTemplateIds.LegalReviewApproved;
                }

                // RespondToCommentsAndResubmit or None as a final completed outcome is unexpected
                _logger.Warning($"Legal review completed with unrecognized outcome '{current.LegalReviewOutcome}' — no notification sent",
                    new { RequestId = current.Id, Outcome = current.LegalReviewOutcome.ToString() });
            }

            // Changes requested (any status → Waiting On Submitter)
            if (previous.LegalReviewStatus != ReviewStatus.WaitingOnSubmitter &&
                current.LegalReviewStatus == ReviewStatus.WaitingOnSubmitter)
            {
                _logger.Debug("Legal review - changes requested");
                return NotificationTemplateIds.LegalChangesRequested;
            }

            // Resubmission (Waiting On Submitter → Waiting On Attorney)
            if (previous.LegalReviewStatus == ReviewStatus.WaitingOnSubmitter &&
                current.LegalReviewStatus == ReviewStatus.WaitingOnAttorney)
            {
                _logger.Debug("Legal review - resubmission");
                return NotificationTemplateIds.ResubmissionReceivedLegal;
            }

            return null;
        }

        /// <summary>
        /// Checks for compliance review status changes that trigger notifications.
        /// </summary>
        private string? CheckComplianceReviewChanges(RequestModel current, RequestVersionInfo previous)
        {
            // Compliance review completed
            if (previous.ComplianceReviewStatus != ReviewStatus.Completed &&
                current.ComplianceReviewStatus == ReviewStatus.Completed)
            {
                // Check outcome
                if (current.ComplianceReviewOutcome == ReviewOutcome.NotApproved)
                {
                    _logger.Debug("Compliance review not approved");
                    return NotificationTemplateIds.ComplianceReviewNotApproved;
                }

                if (current.ComplianceReviewOutcome == ReviewOutcome.Approved ||
                    current.ComplianceReviewOutcome == ReviewOutcome.ApprovedWithComments)
                {
                    _logger.Debug("Compliance review approved");
                    return NotificationTemplateIds.ComplianceReviewApproved;
                }

                // RespondToCommentsAndResubmit or None as a final completed outcome is unexpected
                _logger.Warning($"Compliance review completed with unrecognized outcome '{current.ComplianceReviewOutcome}' — no notification sent",
                    new { RequestId = current.Id, Outcome = current.ComplianceReviewOutcome.ToString() });
            }

            // Changes requested (any status → Waiting On Submitter)
            if (previous.ComplianceReviewStatus != ReviewStatus.WaitingOnSubmitter &&
                current.ComplianceReviewStatus == ReviewStatus.WaitingOnSubmitter)
            {
                _logger.Debug("Compliance review - changes requested");
                return NotificationTemplateIds.ComplianceChangesRequested;
            }

            // Resubmission (Waiting On Submitter → Waiting On Compliance)
            if (previous.ComplianceReviewStatus == ReviewStatus.WaitingOnSubmitter &&
                current.ComplianceReviewStatus == ReviewStatus.WaitingOnCompliance)
            {
                _logger.Debug("Compliance review - resubmission");
                return NotificationTemplateIds.ResubmissionReceivedCompliance;
            }

            return null;
        }

        #endregion

        #region Email Generation

        /// <summary>
        /// Generates the email notification from the template and request data.
        /// Resolves group-based recipients by querying SharePoint group members.
        /// </summary>
        private async Task<EmailResponse> GenerateEmailAsync(RequestModel request, NotificationTemplate template, string notificationId)
        {
            // Process the subject with token replacement
            var subject = ReplaceTokens(template.Subject, request);

            // Process the body with token replacement and conditionals
            var body = ProcessTemplate(template.Body, request);

            // Resolve recipients (queries SharePoint groups for group-based recipients)
            var recipients = await ResolveRecipientsAsync(template.ToRecipients, request);
            var ccRecipients = await ResolveRecipientsAsync(template.CcRecipients, request);
            var bccRecipients = await ResolveRecipientsAsync(template.BccRecipients, request);

            return new EmailResponse
            {
                NotificationId = notificationId,
                Subject = subject,
                Body = body,
                To = recipients,
                Cc = ccRecipients,
                Bcc = bccRecipients,
                Importance = template.Importance,
                RequestId = request.Id,
                RequestTitle = GetDisplayRequestTitle(request),
                Category = template.Category,
                Trigger = MapNotificationToTrigger(notificationId)
            };
        }

        /// <summary>
        /// Replaces tokens in a template string with request field values.
        /// Tokens are in the format {{FieldName}} and matched case-insensitively with
        /// whitespace trimmed, so {{ Request Id }} and {{requestId}} both resolve.
        /// Any unrecognized tokens are left empty and logged as warnings.
        /// </summary>
        private string ReplaceTokens(string template, RequestModel request)
        {
            if (string.IsNullOrEmpty(template))
            {
                return string.Empty;
            }

            var tokens = BuildTokenDictionary(request);

            return TokenRegex().Replace(template, match =>
            {
                var raw = match.Groups[1].Value;
                var (tokenName, tokenArgument) = ParseParameterizedToken(raw);
                var key = WhitespaceRegex().Replace(tokenName, string.Empty).ToLowerInvariant();

                if (key is "requestlinkbutton" or "requestlinkanchor")
                {
                    return BuildRequestLinkAnchor(request, tokenArgument);
                }

                if (tokens.TryGetValue(key, out var value))
                {
                    return value;
                }

                _logger.Warning($"Unrecognized template token '{{{{{raw.Trim()}}}}}' — leaving empty");
                return string.Empty;
            });
        }

        /// <summary>
        /// Builds a case-insensitive lookup of all supported template tokens for the given request.
        /// Keys are normalized (lowercase, no whitespace) to match template authors' varying styles.
        /// </summary>
        private Dictionary<string, string> BuildTokenDictionary(RequestModel request)
        {
            var attorneyNames = request.Attorneys.Count > 0
                ? string.Join(", ", request.Attorneys.Where(a => !string.IsNullOrEmpty(a.Title)).Select(a => a.Title))
                : "Not Assigned";
            var attorneyEmails = string.Join("; ", request.Attorneys
                .Where(a => !string.IsNullOrEmpty(a.Email))
                .Select(a => a.Email));
            var additionalPartyEmails = string.Join(", ", request.AdditionalParties
                .Where(u => !string.IsNullOrEmpty(u.Email))
                .Select(u => u.Email));
            var additionalPartyNames = string.Join(", ", request.AdditionalParties
                .Where(u => !string.IsNullOrEmpty(u.Title))
                .Select(u => u.Title));
            var distributionMethodsFormatted = string.Join(", ", request.DistributionMethods.Select(FormatDistributionMethod));
            var approvalCount = CountApprovals(request);

            var requestLink = BuildRequestLink(request);

            // Keys are lowercase with no whitespace — see ReplaceTokens normalization
            return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                // System fields
                ["requestid"] = request.Title,
                ["requesttitle"] = GetDisplayRequestTitle(request),
                ["status"] = FormatStatus(request.Status),
                ["submittedby"] = request.SubmittedBy?.Title ?? "Unknown",
                ["submittername"] = request.SubmittedBy?.Title ?? "Unknown",
                ["submittedbyemail"] = request.SubmittedBy?.Email ?? string.Empty,
                ["submitteremail"] = request.SubmittedBy?.Email ?? string.Empty,
                ["submittedon"] = request.SubmittedOn?.ToString("MMMM d, yyyy") ?? "N/A",

                // Request information
                ["requesttype"] = FormatRequestType(request.RequestType),
                ["submissiontype"] = request.SubmissionType == SubmissionType.New ? "New Submission" : "Material Updates",
                ["submissionitem"] = request.SubmissionItem ?? string.Empty,
                ["purpose"] = request.Purpose,
                ["targetreturndate"] = request.TargetReturnDate?.ToString("MMMM d, yyyy") ?? "N/A",
                ["isrushrequest"] = request.IsRushRequest ? "Yes" : "No",
                ["rushrationale"] = request.RushRationale,
                ["reviewaudience"] = FormatReviewAudience(request.ReviewAudience),

                // FINRA & Audience
                ["finraaudiencecategory"] = request.FINRAAudienceCategory,
                ["audience"] = request.Audience,
                ["usfunds"] = string.Join(", ", request.USFunds),
                ["ucits"] = string.Join(", ", request.UCITS),
                ["separateaccountstrategies"] = request.SeparateAccountStrategies,

                // Distribution
                ["distributionmethods"] = distributionMethodsFormatted,
                ["distributionmethod"] = distributionMethodsFormatted,
                ["proposedfirstusedate"] = request.ProposedFirstUseDate?.ToString("MMMM d, yyyy") ?? "N/A",
                ["dateoffirstuse"] = request.ProposedFirstUseDate?.ToString("MMMM d, yyyy") ?? "N/A",
                ["proposeddiscontinuedate"] = request.ProposedDiscontinueDate?.ToString("MMMM d, yyyy") ?? "N/A",

                // Legal Intake
                ["attorney"] = attorneyNames,
                ["assignedattorneyname"] = attorneyNames,
                ["attorneyemail"] = attorneyEmails,
                ["assignedattorneyemail"] = attorneyEmails,
                ["attorneyassignnotes"] = request.AttorneyAssignNotes,
                ["assignmentnotes"] = request.AttorneyAssignNotes,

                // Legal Review
                ["legalreviewstatus"] = FormatReviewStatus(request.LegalReviewStatus),
                ["legalreviewoutcome"] = FormatReviewOutcome(request.LegalReviewOutcome),
                ["legalreviewnotes"] = request.LegalReviewNotes,

                // Compliance Review
                ["compliancereviewstatus"] = FormatReviewStatus(request.ComplianceReviewStatus),
                ["compliancereviewoutcome"] = FormatReviewOutcome(request.ComplianceReviewOutcome),
                ["compliancereviewnotes"] = request.ComplianceReviewNotes,
                ["isforesidereviewrequired"] = request.IsForesideReviewRequired ? "Yes" : "No",
                ["recordretentiononly"] = request.RecordRetentionOnly ? "Yes" : "No",
                ["isretailuse"] = request.IsRetailUse ? "Yes" : "No",

                // Closeout
                ["trackingid"] = request.TrackingId,

                // Hold/Cancel
                ["holdreason"] = request.HoldReason,
                ["holddate"] = request.HoldDate?.ToString("MMMM d, yyyy") ?? "N/A",
                ["cancellationreason"] = request.CancellationReason,
                ["cancelledon"] = request.CancelledOn?.ToString("MMMM d, yyyy") ?? "N/A",

                // Completion
                ["completedon"] = request.CompletedOn?.ToString("MMMM d, yyyy") ?? "N/A",

                // Link (raw URL and HTML anchor variants)
                ["requestlink"] = requestLink,
                ["requestlinkurl"] = requestLink,
                ["requesturl"] = requestLink,   // alias for legacy templates
                ["viewrequestlink"] = BuildRequestLinkAnchor(request, "View Request"),

                // Additional parties
                ["additionalpartyemails"] = additionalPartyEmails,
                ["additionalparties"] = additionalPartyNames,
                ["additionalpartynames"] = additionalPartyNames,

                // Approvals
                ["approvalcount"] = approvalCount > 0 ? approvalCount.ToString() : string.Empty,
            };
        }

        /// <summary>
        /// Processes template conditionals like {{#if FieldName}}...{{/if}}.
        /// </summary>
        private string ProcessTemplate(string template, RequestModel request)
        {
            if (string.IsNullOrEmpty(template))
            {
                return string.Empty;
            }

            // First replace all tokens
            var result = ReplaceTokens(template, request);

            // Process conditionals: {{#if FieldName}}...{{/if}}
            result = IfConditionalRegex().Replace(result, match =>
            {
                var fieldName = match.Groups[1].Value;
                var content = match.Groups[2].Value;

                if (EvaluateCondition(fieldName, request))
                {
                    return content;
                }
                return string.Empty;
            });

            // Process negative conditionals: {{#unless FieldName}}...{{/unless}}
            result = UnlessConditionalRegex().Replace(result, match =>
            {
                var fieldName = match.Groups[1].Value;
                var content = match.Groups[2].Value;

                if (!EvaluateCondition(fieldName, request))
                {
                    return content;
                }
                return string.Empty;
            });

            // Remove any orphan {{#if}}, {{/if}}, {{#unless}}, {{/unless}} tags that had no
            // matching closer (e.g. unclosed blocks or unknown field names left by the regex).
            result = OrphanConditionalTagRegex().Replace(result, string.Empty);

            return result;
        }

        /// <summary>
        /// Evaluates a condition field for template conditionals.
        /// Supports both explicit boolean checks and "has value" checks for string/list fields.
        /// </summary>
        private bool EvaluateCondition(string fieldName, RequestModel request)
        {
            // Normalize to lowercase so {{#if isRushRequest}}, {{#if IsRushRequest}},
            // and {{#if ISRUSHREQUEST}} all resolve correctly.
            return fieldName.ToLowerInvariant() switch
            {
                // Boolean flags
                "isrushrequest" => request.IsRushRequest,
                "isonhold" => request.IsOnHold,
                "isforesidereviewrequired" => request.IsForesideReviewRequired,
                "recordretentiononly" => request.RecordRetentionOnly,
                "isretailuse" => request.IsRetailUse,

                // "Has" prefix conditions (explicit)
                "hasattorney" => request.Attorneys.Count > 0,
                "assignedattorneyname" => request.Attorneys.Count > 0,
                "hastrackingid" => !string.IsNullOrEmpty(request.TrackingId),
                "haslegalreviewnotes" => !string.IsNullOrEmpty(request.LegalReviewNotes),
                "hascompliancereviewnotes" => !string.IsNullOrEmpty(request.ComplianceReviewNotes),
                "hasattorneyassignnotes" => !string.IsNullOrEmpty(request.AttorneyAssignNotes),
                "hasholdreason" => !string.IsNullOrEmpty(request.HoldReason),
                "hascancellationreason" => !string.IsNullOrEmpty(request.CancellationReason),

                // Review conditions
                "requireslegalreview" => request.ReviewAudience == ReviewAudience.Legal || request.ReviewAudience == ReviewAudience.Both,
                "requirescompliancereview" => request.ReviewAudience == ReviewAudience.Compliance || request.ReviewAudience == ReviewAudience.Both,
                "legalapproved" => request.LegalReviewOutcome == ReviewOutcome.Approved || request.LegalReviewOutcome == ReviewOutcome.ApprovedWithComments,
                "complianceapproved" => request.ComplianceReviewOutcome == ReviewOutcome.Approved || request.ComplianceReviewOutcome == ReviewOutcome.ApprovedWithComments,
                "legalhascomments" => request.LegalReviewOutcome == ReviewOutcome.ApprovedWithComments,
                "compliancehascomments" => request.ComplianceReviewOutcome == ReviewOutcome.ApprovedWithComments,
                "trackingidrequired" => request.IsForesideReviewRequired,

                // Field "has value" conditions (used as {{#if FieldName}})
                "purpose" => !string.IsNullOrEmpty(request.Purpose),
                "rushrationale" => !string.IsNullOrEmpty(request.RushRationale),
                "finraaudiencecategory" => !string.IsNullOrEmpty(request.FINRAAudienceCategory),
                "audience" => !string.IsNullOrEmpty(request.Audience),
                "usfunds" => request.USFunds.Count > 0,
                "ucits" => request.UCITS.Count > 0,
                "separateaccountstrategies" => !string.IsNullOrEmpty(request.SeparateAccountStrategies),
                "distributionmethod" or "distributionmethods" => request.DistributionMethods.Count > 0,
                "dateoffirstuse" => request.ProposedFirstUseDate.HasValue,
                "approvalcount" => CountApprovals(request) > 0,
                "additionalparties" => request.AdditionalParties.Count > 0,
                "attorneyassignnotes" => !string.IsNullOrEmpty(request.AttorneyAssignNotes),
                "legalreviewnotes" => !string.IsNullOrEmpty(request.LegalReviewNotes),
                "compliancereviewnotes" => !string.IsNullOrEmpty(request.ComplianceReviewNotes),
                "holdreason" => !string.IsNullOrEmpty(request.HoldReason),
                "cancellationreason" => !string.IsNullOrEmpty(request.CancellationReason),

                _ => false
            };
        }

        /// <summary>
        /// Counts the number of approvals with a document attached (HasDocument == true).
        /// An ApprovalInfo may exist with only a name/date but no uploaded document —
        /// only documents-attached count toward the approval count shown in notifications.
        /// </summary>
        private static int CountApprovals(RequestModel request)
        {
            return new[]
            {
                request.CommunicationsApproval,
                request.PortfolioManagerApproval,
                request.ResearchAnalystApproval,
                request.SubjectMatterExpertApproval,
                request.PerformanceApproval,
                request.OtherApproval
            }.Count(a => a != null && a.HasDocument);
        }

        /// <summary>
        /// Resolves recipient identifiers to email addresses.
        /// Supports simple identifiers (e.g., "Submitter"), template tokens (e.g., "{{SubmitterEmail}}"),
        /// and group-based recipients that are resolved by querying SharePoint group members.
        /// </summary>
        private async Task<List<string>> ResolveRecipientsAsync(string recipientConfig, RequestModel request)
        {
            if (string.IsNullOrEmpty(recipientConfig))
            {
                return new List<string>();
            }

            var emails = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var recipients = recipientConfig.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries);

            foreach (var recipient in recipients.Select(r => r.Trim()))
            {
                // Handle template token format: {{TokenName}}
                // Normalize to lowercase for case-insensitive matching — template authors
                // may write "submitterEmail", "SubmitterEmail", or "SUBMITTEREMAIL" etc.
                var resolvedRecipient = NormalizeRecipientToken(recipient).ToLowerInvariant();

                switch (resolvedRecipient)
                {
                    // Email-based tokens (resolve from request data)
                    case "submitteremail":
                    case "submitter":
                        AddEmail(emails, request.SubmittedBy?.Email);
                        break;

                    case "attorneyemail":
                    case "assignedattorneyemail":
                    case "attorney":
                        AddEmails(emails, request.Attorneys
                            .Where(a => !string.IsNullOrEmpty(a.Email))
                            .Select(a => a.Email));
                        break;

                    // Multi-value tokens
                    case "additionalpartyemails":
                    case "additionalparties":
                        AddEmails(emails, request.AdditionalParties
                            .Where(u => !string.IsNullOrEmpty(u.Email))
                            .Select(u => u.Email));
                        break;

                    default:
                        if (TryResolveConfiguredGroupName(resolvedRecipient, out var configuredGroupName))
                        {
                            AddEmails(emails, await GetGroupMemberEmailsAsync(configuredGroupName));
                            break;
                        }

                        // Assume it's a direct email address if it contains @
                        if (recipient.Contains("@"))
                        {
                            AddEmail(emails, recipient);
                            break;
                        }

                        _logger.Warning($"Unrecognized notification recipient token '{recipient}'");
                        break;
                }
            }

            return emails.ToList();
        }

        /// <summary>
        /// Gets email addresses of all members in a SharePoint group.
        /// Results are cached for 5 minutes to avoid repeated SharePoint calls.
        /// </summary>
        /// <param name="groupName">The SharePoint group name (e.g., "LW - Legal Admins")</param>
        /// <returns>List of email addresses for group members</returns>
        private async Task<List<string>> GetGroupMemberEmailsAsync(string groupName)
        {
            if (string.IsNullOrEmpty(groupName))
            {
                return new List<string>();
            }

            var normalizedGroupName = groupName.Trim();
            var cacheKey = $"group-emails:{normalizedGroupName.ToLowerInvariant()}";

            // Check cache first
            if (_groupMembersCache.TryGetValue(cacheKey, out List<string>? cachedEmails) && cachedEmails != null)
            {
                _logger.Debug($"Using cached group member emails for '{normalizedGroupName}' ({cachedEmails.Count} members)");
                return cachedEmails;
            }

            try
            {
                using var context = await CreateContextAsync();

                var group = await context.Web.SiteGroups.FirstOrDefaultAsync(g => g.Title == normalizedGroupName);

                if (group == null)
                {
                    _logger.Warning($"SharePoint group '{normalizedGroupName}' not found");
                    return new List<string>();
                }

                // Load group members with explicit Mail property to avoid lazy-load exceptions
                await group.LoadAsync(g => g.Users.QueryProperties(u => u.Mail, u => u.LoginName));

                var memberEmails = group.Users.AsRequested()
                    .Select(u =>
                    {
                        try { return u.Mail; } catch { return null; }
                    })
                    .Where(mail => !string.IsNullOrEmpty(mail))
                    .Select(mail => mail!)
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList();

                _logger.Info($"Resolved {memberEmails.Count} email(s) from SharePoint group '{group.Title}'");

                // Cache the result
                var cacheEntryOptions = new MemoryCacheEntryOptions()
                    .SetSlidingExpiration(GroupMembersCacheExpiration)
                    .SetAbsoluteExpiration(TimeSpan.FromMinutes(15));
                _groupMembersCache.Set(cacheKey, memberEmails, cacheEntryOptions);

                return memberEmails;
            }
            catch (Exception ex)
            {
                _logger.Error($"Failed to resolve members for SharePoint group '{normalizedGroupName}'", ex);
                return new List<string>();
            }
        }

        /// <summary>
        /// Resolves a recipient token to a configured SharePoint group name.
        /// </summary>
        private bool TryResolveConfiguredGroupName(string token, out string groupName)
        {
            var normalizedToken = NormalizeKey(token);

            groupName = GetConfiguredGroupNameByAlias(normalizedToken);
            if (!string.IsNullOrWhiteSpace(groupName))
            {
                return true;
            }

            if (MatchesConfiguredGroup(normalizedToken, _groupConfig.SubmittersGroup, out groupName) ||
                MatchesConfiguredGroup(normalizedToken, _groupConfig.LegalAdminGroup, out groupName) ||
                MatchesConfiguredGroup(normalizedToken, _groupConfig.AttorneyAssignerGroup, out groupName) ||
                MatchesConfiguredGroup(normalizedToken, _groupConfig.ComplianceGroup, out groupName) ||
                MatchesConfiguredGroup(normalizedToken, _groupConfig.AdminGroup, out groupName) ||
                MatchesConfiguredGroup(normalizedToken, _groupConfig.AttorneysGroup, out groupName))
            {
                return true;
            }

            groupName = string.Empty;
            return false;
        }

        private string GetConfiguredGroupNameByAlias(string normalizedToken)
        {
            return normalizedToken switch
            {
                "submittersgroup" or "submitters" => _groupConfig.SubmittersGroup,
                "legaladmingroup" or "legaladmin" => _groupConfig.LegalAdminGroup,
                "attorneyassignergroup" or "attorneyassigner" => _groupConfig.AttorneyAssignerGroup,
                "compliancegroup" or "compliance" => _groupConfig.ComplianceGroup,
                "admingroup" or "admin" => _groupConfig.AdminGroup,
                "attorneysgroup" or "attorneys" => _groupConfig.AttorneysGroup,
                _ => string.Empty
            };
        }

        private static bool MatchesConfiguredGroup(string normalizedToken, string configuredGroupName, out string groupName)
        {
            if (!string.IsNullOrWhiteSpace(configuredGroupName) &&
                NormalizeKey(configuredGroupName) == normalizedToken)
            {
                groupName = configuredGroupName;
                return true;
            }

            groupName = string.Empty;
            return false;
        }

        private static void AddEmail(ISet<string> emails, string? email)
        {
            if (!string.IsNullOrWhiteSpace(email))
            {
                emails.Add(email);
            }
        }

        private static void AddEmails(ISet<string> emails, IEnumerable<string> candidates)
        {
            foreach (var candidate in candidates)
            {
                AddEmail(emails, candidate);
            }
        }

        /// <summary>
        /// Removes token wrappers and extra whitespace from recipient identifiers.
        /// </summary>
        private static string NormalizeRecipientToken(string recipient)
        {
            var trimmed = recipient.Trim();
            if (trimmed.StartsWith("{{", StringComparison.Ordinal) && trimmed.EndsWith("}}", StringComparison.Ordinal))
            {
                trimmed = trimmed.Substring(2, trimmed.Length - 4);
            }

            return trimmed.Trim();
        }

        /// <summary>
        /// Produces a normalization key that ignores case, spaces, punctuation, and separators.
        /// </summary>
        private static string NormalizeKey(string value)
        {
            return new string(value
                .Trim()
                .Where(char.IsLetterOrDigit)
                .Select(char.ToLowerInvariant)
                .ToArray());
        }

        #endregion

        #region Formatting Helpers

        /// <summary>
        /// Compares two attorney lists to determine if they contain the same users.
        /// </summary>
        private static bool AttorneyListsMatch(List<UserInfo> list1, List<UserInfo> list2)
        {
            if (list1.Count != list2.Count) return false;

            var ids1 = list1.Select(a => a.Id).OrderBy(id => id).ToList();
            var ids2 = list2.Select(a => a.Id).OrderBy(id => id).ToList();

            return ids1.SequenceEqual(ids2);
        }

        private string FormatStatus(RequestStatus status)
        {
            return status switch
            {
                RequestStatus.Draft => "Draft",
                RequestStatus.LegalIntake => "Legal Intake",
                RequestStatus.AssignAttorney => "Assign Attorney",
                RequestStatus.InReview => "In Review",
                RequestStatus.Closeout => "Closeout",
                RequestStatus.Completed => "Completed",
                RequestStatus.Cancelled => "Cancelled",
                RequestStatus.OnHold => "On Hold",
                RequestStatus.AwaitingFINRADocuments => "Awaiting FINRA Documents",
                _ => status.ToString()
            };
        }

        private static string GetTemplateRequestType(RequestType type)
        {
            return type switch
            {
                RequestType.Communication => "Communication",
                RequestType.GeneralReview => "General Review",
                RequestType.IMAReview => "IMA Review",
                _ => type.ToString()
            };
        }

        private string FormatRequestType(RequestType type)
        {
            return type switch
            {
                RequestType.Communication => "Communication Review",
                RequestType.GeneralReview => "General Review",
                RequestType.IMAReview => "IMA Review",
                _ => type.ToString()
            };
        }

        private string FormatReviewAudience(ReviewAudience audience)
        {
            return audience switch
            {
                ReviewAudience.Legal => "Legal Only",
                ReviewAudience.Compliance => "Compliance Only",
                ReviewAudience.Both => "Legal and Compliance",
                _ => audience.ToString()
            };
        }

        private string FormatReviewStatus(ReviewStatus status)
        {
            return status switch
            {
                ReviewStatus.NotRequired => "Not Required",
                ReviewStatus.NotStarted => "Not Started",
                ReviewStatus.InProgress => "In Progress",
                ReviewStatus.WaitingOnSubmitter => "Waiting on Submitter",
                ReviewStatus.WaitingOnAttorney => "Waiting on Attorney",
                ReviewStatus.WaitingOnCompliance => "Waiting on Compliance",
                ReviewStatus.Completed => "Completed",
                _ => status.ToString()
            };
        }

        private string FormatReviewOutcome(ReviewOutcome outcome)
        {
            return outcome switch
            {
                ReviewOutcome.None => "None",
                ReviewOutcome.Approved => "Approved",
                ReviewOutcome.ApprovedWithComments => "Approved with Comments",
                ReviewOutcome.RespondToCommentsAndResubmit => "Respond to Comments and Resubmit",
                ReviewOutcome.NotApproved => "Not Approved",
                _ => outcome.ToString()
            };
        }

        private string FormatDistributionMethod(DistributionMethod method)
        {
            return method switch
            {
                DistributionMethod.DodgeCoxWebsiteUS => "Dodge & Cox Website (US)",
                DistributionMethod.DodgeCoxWebsiteNonUS => "Dodge & Cox Website (Non-US)",
                DistributionMethod.ThirdPartyWebsite => "Third-Party Website",
                DistributionMethod.EmailMail => "Email/Mail",
                DistributionMethod.MobileApp => "Mobile App",
                DistributionMethod.DisplayCardSignage => "Display/Card/Signage",
                DistributionMethod.Handout => "Handout",
                DistributionMethod.LiveTalkingPoints => "Live/Talking Points",
                DistributionMethod.SocialMedia => "Social Media",
                DistributionMethod.InternalUseOnly => "Internal Use Only",
                _ => method.ToString()
            };
        }

        private NotificationTrigger MapNotificationToTrigger(string notificationId)
        {
            return notificationId switch
            {
                NotificationTemplateIds.RequestSubmitted => NotificationTrigger.StatusChange,
                NotificationTemplateIds.RushRequestAlert => NotificationTrigger.StatusChange,
                NotificationTemplateIds.ReadyForAttorneyAssignment => NotificationTrigger.StatusChange,
                NotificationTemplateIds.AttorneyAssigned => NotificationTrigger.AttorneyAssigned,
                NotificationTemplateIds.AttorneyReassigned => NotificationTrigger.AttorneyAssigned,
                NotificationTemplateIds.ComplianceReviewRequired => NotificationTrigger.StatusChange,
                NotificationTemplateIds.LegalReviewApproved => NotificationTrigger.ReviewComplete,
                NotificationTemplateIds.LegalChangesRequested => NotificationTrigger.ReviewChangesRequested,
                NotificationTemplateIds.LegalReviewNotApproved => NotificationTrigger.ReviewComplete,
                NotificationTemplateIds.ComplianceReviewApproved => NotificationTrigger.ReviewComplete,
                NotificationTemplateIds.ComplianceChangesRequested => NotificationTrigger.ReviewChangesRequested,
                NotificationTemplateIds.ComplianceReviewNotApproved => NotificationTrigger.ReviewComplete,
                NotificationTemplateIds.ResubmissionReceivedLegal => NotificationTrigger.Resubmission,
                NotificationTemplateIds.ResubmissionReceivedCompliance => NotificationTrigger.Resubmission,
                NotificationTemplateIds.RequestOnHold => NotificationTrigger.HoldResume,
                NotificationTemplateIds.RequestResumed => NotificationTrigger.HoldResume,
                NotificationTemplateIds.RequestCancelled => NotificationTrigger.Cancellation,
                NotificationTemplateIds.ReadyForCloseout => NotificationTrigger.StatusChange,
                NotificationTemplateIds.RequestCompleted => NotificationTrigger.StatusChange,
                _ => NotificationTrigger.StatusChange
            };
        }

        private string GetTriggerDescription(string notificationId, RequestModel current, RequestVersionInfo? previous)
        {
            var previousStatus = previous?.Status.ToString() ?? "New";
            var currentStatus = current.Status.ToString();

            return notificationId switch
            {
                NotificationTemplateIds.RequestSubmitted => $"Status changed from {previousStatus} to {currentStatus}",
                NotificationTemplateIds.RushRequestAlert => $"Rush request submitted (Status: {previousStatus} → {currentStatus})",
                NotificationTemplateIds.ReadyForAttorneyAssignment => $"Status changed to Assign Attorney",
                NotificationTemplateIds.AttorneyAssigned => $"Attorney assigned, moving to In Review",
                NotificationTemplateIds.AttorneyReassigned => $"Attorney reassigned to {(current.Attorneys.Count > 0 ? string.Join(", ", current.Attorneys.Select(a => a.Title)) : "new attorney")}",
                NotificationTemplateIds.ComplianceReviewRequired => "Compliance review required",
                NotificationTemplateIds.LegalReviewApproved => "Legal review completed with approval",
                NotificationTemplateIds.LegalChangesRequested => "Legal reviewer requested changes",
                NotificationTemplateIds.LegalReviewNotApproved => "Legal review not approved",
                NotificationTemplateIds.ComplianceReviewApproved => "Compliance review completed with approval",
                NotificationTemplateIds.ComplianceChangesRequested => "Compliance reviewer requested changes",
                NotificationTemplateIds.ComplianceReviewNotApproved => "Compliance review not approved",
                NotificationTemplateIds.ResubmissionReceivedLegal => "Submitter resubmitted for legal review",
                NotificationTemplateIds.ResubmissionReceivedCompliance => "Submitter resubmitted for compliance review",
                NotificationTemplateIds.RequestOnHold => "Request placed on hold",
                NotificationTemplateIds.RequestResumed => "Request resumed from hold",
                NotificationTemplateIds.RequestCancelled => "Request cancelled",
                NotificationTemplateIds.ReadyForCloseout => "All reviews complete, ready for closeout",
                NotificationTemplateIds.RequestCompleted => "Request workflow completed",
                _ => $"Status changed from {previousStatus} to {currentStatus}"
            };
        }

        private async Task<PnPContext> CreateContextAsync()
        {
            return await SharePointContextHelper.CreateContextAsync(_contextFactory, _siteUri, _authenticationProvider);
        }

        private static (string TokenName, string? Argument) ParseParameterizedToken(string rawToken)
        {
            var trimmedToken = rawToken.Trim();
            var separatorIndex = trimmedToken.IndexOf('|');

            if (separatorIndex < 0)
            {
                return (trimmedToken, null);
            }

            var tokenName = trimmedToken[..separatorIndex].Trim();
            var tokenArgument = trimmedToken[(separatorIndex + 1)..].Trim();

            return (tokenName, string.IsNullOrWhiteSpace(tokenArgument) ? null : tokenArgument);
        }

        private string BuildRequestLinkAnchor(RequestModel request, string? label)
        {
            var requestLink = BuildRequestLink(request);
            if (string.IsNullOrEmpty(requestLink))
            {
                return string.Empty;
            }

            var decodedLabel = WebUtility.HtmlDecode(label ?? string.Empty);
            var anchorLabel = string.IsNullOrWhiteSpace(decodedLabel) ? "View Request" : decodedLabel;
            var encodedHref = WebUtility.HtmlEncode(requestLink);
            var encodedLabel = WebUtility.HtmlEncode(anchorLabel);

            return $"<a href=\"{encodedHref}\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-weight:600;\">{encodedLabel}</a>";
        }

        private string BuildRequestLink(RequestModel request)
        {
            if (!string.IsNullOrEmpty(_config.SiteUrl))
            {
                return $"{_config.SiteUrl.TrimEnd('/')}/Lists/{_listConfig.RequestsListName}/EditForm.aspx?ID={request.Id}";
            }

            _logger.Warning("NotificationConfig.SiteUrl is not configured — request link tokens will be empty in notification emails");
            return string.Empty;
        }

        private static string GetDisplayRequestTitle(RequestModel request)
        {
            return !string.IsNullOrWhiteSpace(request.RequestTitle)
                ? request.RequestTitle
                : request.Title;
        }

        // \s* before }} allows optional trailing whitespace inside the tag (e.g. {{#if Field }})
        // IgnoreCase so {{#IF}} and {{#if}} both match
        [GeneratedRegex(@"\{\{#if\s+([\w]+)\s*\}\}(.*?)\{\{/if\s*\}\}", RegexOptions.Singleline | RegexOptions.IgnoreCase)]
        private static partial Regex IfConditionalRegex();

        [GeneratedRegex(@"\{\{#unless\s+([\w]+)\s*\}\}(.*?)\{\{/unless\s*\}\}", RegexOptions.Singleline | RegexOptions.IgnoreCase)]
        private static partial Regex UnlessConditionalRegex();

        // Removes any leftover {{#if...}} or {{/if}} tags that had no matching closer (false-branch cleanup)
        [GeneratedRegex(@"\{\{/?#?\s*(if|unless)\b[^}]*\}\}", RegexOptions.IgnoreCase)]
        private static partial Regex OrphanConditionalTagRegex();

        // Matches any {{...}} token that is NOT a conditional opener/closer (i.e. does not start with # or /)
        [GeneratedRegex(@"\{\{\s*(?!#|/)([^{}]+?)\s*\}\}")]
        private static partial Regex TokenRegex();

        // Collapses internal whitespace in a token name for lookup normalization
        [GeneratedRegex(@"\s+")]
        private static partial Regex WhitespaceRegex();

        #endregion
    }

    /// <summary>
    /// Configuration for the NotificationService.
    /// Contains settings needed for generating notification emails.
    /// </summary>
    public class NotificationConfig
    {
        /// <summary>
        /// SharePoint site URL where the Legal Workflow application is hosted.
        /// Used to generate request links in notification emails.
        /// Example: "https://contoso.sharepoint.com/sites/LegalWorkflow"
        /// </summary>
        public string SiteUrl { get; set; } = string.Empty;

        /// <summary>
        /// Whether to include debug information in logs.
        /// </summary>
        public bool EnableDebugLogging { get; set; } = false;
    }
}

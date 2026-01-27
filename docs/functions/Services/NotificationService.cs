// =============================================================================
// Legal Workflow - Azure Functions
// NotificationService.cs - Service for determining and generating notifications
// =============================================================================

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
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
    public class NotificationService
    {
        private readonly RequestService _requestService;
        private readonly Logger _logger;
        private readonly NotificationConfig _config;

        /// <summary>
        /// Creates a new NotificationService instance.
        /// </summary>
        /// <param name="requestService">Service for loading request data</param>
        /// <param name="logger">Logger instance for logging operations</param>
        /// <param name="config">Configuration for notification settings (optional)</param>
        public NotificationService(RequestService requestService, Logger logger, NotificationConfig? config = null)
        {
            _requestService = requestService ?? throw new ArgumentNullException(nameof(requestService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _config = config ?? new NotificationConfig();
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
                var previousVersion = await _requestService.GetPreviousVersionAsync(request.RequestId);

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

                // Load the notification template
                var template = await _requestService.GetNotificationTemplateAsync(notificationId);
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
                var email = GenerateEmail(currentRequest, template, notificationId);

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

                return new SendNotificationResponse
                {
                    ShouldSendNotification = false,
                    Reason = $"Error processing notification: {ex.Message}"
                };
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

            // 7. Attorney reassigned (attorney changed from one user to another while in review)
            // Check this BEFORE status change checks to catch reassignments during In Review
            if (current.Status == RequestStatus.InReview &&
                previous.Attorney != null && current.Attorney != null &&
                previous.Attorney.Id != current.Attorney.Id)
            {
                _logger.Debug("Attorney reassigned", new
                {
                    PreviousAttorney = previous.Attorney.Title,
                    NewAttorney = current.Attorney.Title
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
        /// </summary>
        private EmailResponse GenerateEmail(RequestModel request, NotificationTemplate template, string notificationId)
        {
            // Process the subject with token replacement
            var subject = ReplaceTokens(template.Subject, request);

            // Process the body with token replacement and conditionals
            var body = ProcessTemplate(template.Body, request);

            // Resolve recipients
            var recipients = ResolveRecipients(template.Recipients, request);
            var ccRecipients = ResolveRecipients(template.CcRecipients, request);

            return new EmailResponse
            {
                NotificationId = notificationId,
                Subject = subject,
                Body = body,
                To = recipients,
                Cc = ccRecipients,
                Importance = template.Importance,
                RequestId = request.Id,
                RequestTitle = request.Title,
                Category = template.Category,
                Trigger = MapNotificationToTrigger(notificationId)
            };
        }

        /// <summary>
        /// Replaces tokens in a template string with request field values.
        /// Tokens are in the format {{FieldName}}.
        /// </summary>
        private string ReplaceTokens(string template, RequestModel request)
        {
            if (string.IsNullOrEmpty(template))
            {
                return string.Empty;
            }

            // Token replacements
            var result = template;

            // System fields
            result = result.Replace("{{RequestId}}", request.Title);
            result = result.Replace("{{RequestTitle}}", request.Title);
            result = result.Replace("{{Status}}", FormatStatus(request.Status));
            result = result.Replace("{{SubmittedBy}}", request.SubmittedBy?.Title ?? "Unknown");
            result = result.Replace("{{SubmitterName}}", request.SubmittedBy?.Title ?? "Unknown"); // Template alias
            result = result.Replace("{{SubmittedByEmail}}", request.SubmittedBy?.Email ?? string.Empty);
            result = result.Replace("{{SubmittedOn}}", request.SubmittedOn?.ToString("MMMM d, yyyy") ?? "N/A");

            // Request information
            result = result.Replace("{{RequestType}}", FormatRequestType(request.RequestType));
            result = result.Replace("{{SubmissionType}}", request.SubmissionType == SubmissionType.New ? "New Submission" : "Material Updates");
            result = result.Replace("{{SubmissionItem}}", request.SubmissionItem ?? string.Empty); // Submission item name
            result = result.Replace("{{Purpose}}", request.Purpose);
            result = result.Replace("{{TargetReturnDate}}", request.TargetReturnDate?.ToString("MMMM d, yyyy") ?? "N/A");
            result = result.Replace("{{IsRushRequest}}", request.IsRushRequest ? "Yes" : "No");
            result = result.Replace("{{RushRationale}}", request.RushRationale);
            result = result.Replace("{{ReviewAudience}}", FormatReviewAudience(request.ReviewAudience));

            // FINRA & Audience
            result = result.Replace("{{FINRAAudienceCategory}}", request.FINRAAudienceCategory);
            result = result.Replace("{{Audience}}", request.Audience);
            result = result.Replace("{{USFunds}}", string.Join(", ", request.USFunds));
            result = result.Replace("{{UCITS}}", string.Join(", ", request.UCITS));
            result = result.Replace("{{SeparateAccountStrategies}}", request.SeparateAccountStrategies);

            // Distribution
            var distributionMethodsFormatted = string.Join(", ", request.DistributionMethods.Select(FormatDistributionMethod));
            result = result.Replace("{{DistributionMethods}}", distributionMethodsFormatted);
            result = result.Replace("{{DistributionMethod}}", distributionMethodsFormatted); // Template alias (singular)
            result = result.Replace("{{ProposedFirstUseDate}}", request.ProposedFirstUseDate?.ToString("MMMM d, yyyy") ?? "N/A");
            result = result.Replace("{{DateOfFirstUse}}", request.ProposedFirstUseDate?.ToString("MMMM d, yyyy") ?? "N/A"); // Template alias
            result = result.Replace("{{ProposedDiscontinueDate}}", request.ProposedDiscontinueDate?.ToString("MMMM d, yyyy") ?? "N/A");

            // Legal Intake
            result = result.Replace("{{Attorney}}", request.Attorney?.Title ?? "Not Assigned");
            result = result.Replace("{{AttorneyEmail}}", request.Attorney?.Email ?? string.Empty);
            result = result.Replace("{{AttorneyAssignNotes}}", request.AttorneyAssignNotes);
            result = result.Replace("{{AssignmentNotes}}", request.AttorneyAssignNotes); // Template alias

            // Legal Review
            result = result.Replace("{{LegalReviewStatus}}", FormatReviewStatus(request.LegalReviewStatus));
            result = result.Replace("{{LegalReviewOutcome}}", FormatReviewOutcome(request.LegalReviewOutcome));
            result = result.Replace("{{LegalReviewNotes}}", request.LegalReviewNotes);

            // Compliance Review
            result = result.Replace("{{ComplianceReviewStatus}}", FormatReviewStatus(request.ComplianceReviewStatus));
            result = result.Replace("{{ComplianceReviewOutcome}}", FormatReviewOutcome(request.ComplianceReviewOutcome));
            result = result.Replace("{{ComplianceReviewNotes}}", request.ComplianceReviewNotes);
            result = result.Replace("{{IsForesideReviewRequired}}", request.IsForesideReviewRequired ? "Yes" : "No");
            result = result.Replace("{{IsRetailUse}}", request.IsRetailUse ? "Yes" : "No");

            // Closeout
            result = result.Replace("{{TrackingId}}", request.TrackingId);

            // Hold/Cancel
            result = result.Replace("{{HoldReason}}", request.HoldReason);
            result = result.Replace("{{HoldDate}}", request.HoldDate?.ToString("MMMM d, yyyy") ?? "N/A");
            result = result.Replace("{{CancellationReason}}", request.CancellationReason);
            result = result.Replace("{{CancelledOn}}", request.CancelledOn?.ToString("MMMM d, yyyy") ?? "N/A");

            // Completion
            result = result.Replace("{{CompletedOn}}", request.CompletedOn?.ToString("MMMM d, yyyy") ?? "N/A");

            // Request Link - generates full URL to the request
            // Format: {SiteUrl}/Lists/{ListName}/EditForm.aspx?ID={RequestId}
            var requestLink = $"{_config.SiteUrl.TrimEnd('/')}/Lists/{SharePointLists.Requests}/EditForm.aspx?ID={request.Id}";
            result = result.Replace("{{RequestLink}}", requestLink);

            // Submitter email for recipient resolution
            result = result.Replace("{{SubmitterEmail}}", request.SubmittedBy?.Email ?? string.Empty);

            // Attorney name and email (alternative tokens used in templates)
            result = result.Replace("{{AssignedAttorneyName}}", request.Attorney?.Title ?? "Not Assigned");
            result = result.Replace("{{AssignedAttorneyEmail}}", request.Attorney?.Email ?? string.Empty);

            // Additional party emails (comma-separated list)
            var additionalPartyEmails = string.Join(", ", request.AdditionalParties
                .Where(u => !string.IsNullOrEmpty(u.Email))
                .Select(u => u.Email));
            result = result.Replace("{{AdditionalPartyEmails}}", additionalPartyEmails);

            // Additional party names (comma-separated list for display)
            var additionalPartyNames = string.Join(", ", request.AdditionalParties
                .Where(u => !string.IsNullOrEmpty(u.Title))
                .Select(u => u.Title));
            result = result.Replace("{{AdditionalParties}}", additionalPartyNames);

            // Approval count - count of non-null approvals
            var approvalCount = new[]
            {
                request.CommunicationsApproval,
                request.PortfolioManagerApproval,
                request.ResearchAnalystApproval,
                request.SubjectMatterExpertApproval,
                request.PerformanceApproval,
                request.OtherApproval
            }.Count(a => a != null);
            result = result.Replace("{{ApprovalCount}}", approvalCount > 0 ? approvalCount.ToString() : string.Empty);

            return result;
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
            var conditionalPattern = @"\{\{#if\s+(\w+)\}\}(.*?)\{\{/if\}\}";
            result = Regex.Replace(result, conditionalPattern, match =>
            {
                var fieldName = match.Groups[1].Value;
                var content = match.Groups[2].Value;

                if (EvaluateCondition(fieldName, request))
                {
                    return content;
                }
                return string.Empty;
            }, RegexOptions.Singleline);

            // Process negative conditionals: {{#unless FieldName}}...{{/unless}}
            var unlessPattern = @"\{\{#unless\s+(\w+)\}\}(.*?)\{\{/unless\}\}";
            result = Regex.Replace(result, unlessPattern, match =>
            {
                var fieldName = match.Groups[1].Value;
                var content = match.Groups[2].Value;

                if (!EvaluateCondition(fieldName, request))
                {
                    return content;
                }
                return string.Empty;
            }, RegexOptions.Singleline);

            return result;
        }

        /// <summary>
        /// Evaluates a condition field for template conditionals.
        /// Supports both explicit boolean checks and "has value" checks for string/list fields.
        /// </summary>
        private bool EvaluateCondition(string fieldName, RequestModel request)
        {
            return fieldName switch
            {
                // Boolean flags
                "IsRushRequest" => request.IsRushRequest,
                "IsOnHold" => request.IsOnHold,
                "IsForesideReviewRequired" => request.IsForesideReviewRequired,
                "IsRetailUse" => request.IsRetailUse,

                // "Has" prefix conditions (explicit)
                "HasAttorney" => request.Attorney != null,
                "HasTrackingId" => !string.IsNullOrEmpty(request.TrackingId),
                "HasLegalReviewNotes" => !string.IsNullOrEmpty(request.LegalReviewNotes),
                "HasComplianceReviewNotes" => !string.IsNullOrEmpty(request.ComplianceReviewNotes),
                "HasAttorneyAssignNotes" => !string.IsNullOrEmpty(request.AttorneyAssignNotes),
                "HasHoldReason" => !string.IsNullOrEmpty(request.HoldReason),
                "HasCancellationReason" => !string.IsNullOrEmpty(request.CancellationReason),

                // Review conditions
                "RequiresLegalReview" => request.ReviewAudience == ReviewAudience.Legal || request.ReviewAudience == ReviewAudience.Both,
                "RequiresComplianceReview" => request.ReviewAudience == ReviewAudience.Compliance || request.ReviewAudience == ReviewAudience.Both,
                "LegalApproved" => request.LegalReviewOutcome == ReviewOutcome.Approved || request.LegalReviewOutcome == ReviewOutcome.ApprovedWithComments,
                "ComplianceApproved" => request.ComplianceReviewOutcome == ReviewOutcome.Approved || request.ComplianceReviewOutcome == ReviewOutcome.ApprovedWithComments,
                "LegalHasComments" => request.LegalReviewOutcome == ReviewOutcome.ApprovedWithComments,
                "ComplianceHasComments" => request.ComplianceReviewOutcome == ReviewOutcome.ApprovedWithComments,
                "TrackingIdRequired" => request.IsForesideReviewRequired || request.IsRetailUse,

                // Field "has value" conditions (used as {{#if FieldName}})
                "Purpose" => !string.IsNullOrEmpty(request.Purpose),
                "RushRationale" => !string.IsNullOrEmpty(request.RushRationale),
                "FINRAAudienceCategory" => !string.IsNullOrEmpty(request.FINRAAudienceCategory),
                "Audience" => !string.IsNullOrEmpty(request.Audience),
                "USFunds" => request.USFunds.Count > 0,
                "UCITS" => request.UCITS.Count > 0,
                "SeparateAccountStrategies" => !string.IsNullOrEmpty(request.SeparateAccountStrategies),
                "DistributionMethod" => request.DistributionMethods.Count > 0,
                "DistributionMethods" => request.DistributionMethods.Count > 0,
                "DateOfFirstUse" => request.ProposedFirstUseDate.HasValue,
                "ApprovalCount" => CountApprovals(request) > 0,
                "AdditionalParties" => request.AdditionalParties.Count > 0,
                "AttorneyAssignNotes" => !string.IsNullOrEmpty(request.AttorneyAssignNotes),
                "LegalReviewNotes" => !string.IsNullOrEmpty(request.LegalReviewNotes),
                "ComplianceReviewNotes" => !string.IsNullOrEmpty(request.ComplianceReviewNotes),
                "HoldReason" => !string.IsNullOrEmpty(request.HoldReason),
                "CancellationReason" => !string.IsNullOrEmpty(request.CancellationReason),

                _ => false
            };
        }

        /// <summary>
        /// Counts the number of non-null approvals on a request.
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
            }.Count(a => a != null);
        }

        /// <summary>
        /// Resolves recipient identifiers to email addresses.
        /// Supports both simple identifiers (e.g., "Submitter") and template tokens (e.g., "{{SubmitterEmail}}").
        /// </summary>
        private List<string> ResolveRecipients(string recipientConfig, RequestModel request)
        {
            var emails = new List<string>();

            if (string.IsNullOrEmpty(recipientConfig))
            {
                return emails;
            }

            var recipients = recipientConfig.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries);

            foreach (var recipient in recipients.Select(r => r.Trim()))
            {
                // Handle template token format: {{TokenName}}
                var resolvedRecipient = recipient;
                if (recipient.StartsWith("{{") && recipient.EndsWith("}}"))
                {
                    resolvedRecipient = recipient.Substring(2, recipient.Length - 4); // Remove {{ and }}
                }

                switch (resolvedRecipient)
                {
                    // Email-based tokens (resolve to email address)
                    case "SubmitterEmail":
                    case "Submitter":
                        if (!string.IsNullOrEmpty(request.SubmittedBy?.Email))
                        {
                            emails.Add(request.SubmittedBy.Email);
                        }
                        break;

                    case "AttorneyEmail":
                    case "AssignedAttorneyEmail":
                    case "Attorney":
                        if (!string.IsNullOrEmpty(request.Attorney?.Email))
                        {
                            emails.Add(request.Attorney.Email);
                        }
                        break;

                    // Group-based tokens (resolve to group distribution list email)
                    case "LegalAdminGroup":
                    case "LegalAdmin":
                        if (!string.IsNullOrEmpty(_config.LegalAdminEmail))
                        {
                            emails.Add(_config.LegalAdminEmail);
                        }
                        break;

                    case "AttorneyAssignerGroup":
                    case "AttorneyAssigner":
                        if (!string.IsNullOrEmpty(_config.AttorneyAssignerEmail))
                        {
                            emails.Add(_config.AttorneyAssignerEmail);
                        }
                        break;

                    case "ComplianceGroup":
                    case "Compliance":
                        if (!string.IsNullOrEmpty(_config.ComplianceEmail))
                        {
                            emails.Add(_config.ComplianceEmail);
                        }
                        break;

                    // Multi-value tokens
                    case "AdditionalPartyEmails":
                    case "AdditionalParties":
                        emails.AddRange(request.AdditionalParties
                            .Where(u => !string.IsNullOrEmpty(u.Email))
                            .Select(u => u.Email));
                        break;

                    default:
                        // Assume it's a direct email address if it contains @
                        if (recipient.Contains("@"))
                        {
                            emails.Add(recipient);
                        }
                        break;
                }
            }

            return emails.Distinct().ToList();
        }

        #endregion

        #region Formatting Helpers

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
                RequestStatus.AwaitingForesideDocuments => "Awaiting Foreside Documents",
                _ => status.ToString()
            };
        }

        private string FormatRequestType(RequestType type)
        {
            return type switch
            {
                RequestType.Communication => "Communication",
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
                DistributionMethod.Hangout => "Hangout",
                DistributionMethod.LiveTalkingPoints => "Live/Talking Points",
                DistributionMethod.SocialMedia => "Social Media",
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
                NotificationTemplateIds.AttorneyReassigned => $"Attorney reassigned to {current.Attorney?.Title ?? "new attorney"}",
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
        /// Email address for the Legal Admin group.
        /// Used when resolving "LegalAdmin" recipient in templates.
        /// </summary>
        public string LegalAdminEmail { get; set; } = string.Empty;

        /// <summary>
        /// Email address for the Attorney Assigner group.
        /// Used when resolving "AttorneyAssigner" recipient in templates.
        /// </summary>
        public string AttorneyAssignerEmail { get; set; } = string.Empty;

        /// <summary>
        /// Email address for the Compliance group.
        /// Used when resolving "Compliance" recipient in templates.
        /// </summary>
        public string ComplianceEmail { get; set; } = string.Empty;

        /// <summary>
        /// Name of the Requests list in SharePoint.
        /// Defaults to "Requests".
        /// </summary>
        public string RequestsListName { get; set; } = "Requests";

        /// <summary>
        /// Whether to include debug information in logs.
        /// </summary>
        public bool EnableDebugLogging { get; set; } = false;
    }
}

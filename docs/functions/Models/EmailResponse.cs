// =============================================================================
// Legal Workflow - Azure Functions
// EmailResponse.cs - Email response model for notification service
// =============================================================================

using System.Collections.Generic;

namespace LegalWorkflow.Functions.Models
{
    /// <summary>
    /// Represents an email notification to be sent.
    /// This object is returned by the NotificationService and consumed by Power Automate.
    /// When null is returned, no email should be sent.
    /// </summary>
    public class EmailResponse
    {
        /// <summary>
        /// Unique identifier for the notification template used.
        /// Matches the Title field in the Notifications SharePoint list.
        /// </summary>
        public string NotificationId { get; set; } = string.Empty;

        /// <summary>
        /// Email subject line with tokens replaced.
        /// Example: "Legal Review Request LRQ-2024-001234 - Submitted for Review"
        /// </summary>
        public string Subject { get; set; } = string.Empty;

        /// <summary>
        /// HTML email body with all tokens and conditionals processed.
        /// Uses Handlebars-style templating that has been fully resolved.
        /// </summary>
        public string Body { get; set; } = string.Empty;

        /// <summary>
        /// List of recipient email addresses (To field).
        /// Resolved from recipient groups specified in the notification template.
        /// </summary>
        public List<string> To { get; set; } = new();

        /// <summary>
        /// List of CC recipient email addresses.
        /// Optional - may be empty.
        /// </summary>
        public List<string> Cc { get; set; } = new();

        /// <summary>
        /// List of BCC recipient email addresses.
        /// Optional - may be empty.
        /// </summary>
        public List<string> Bcc { get; set; } = new();

        /// <summary>
        /// Email importance level (Low, Normal, High).
        /// Power Automate uses this to set the email priority.
        /// </summary>
        public EmailImportance Importance { get; set; } = EmailImportance.Normal;

        /// <summary>
        /// Reference to the request this notification is for.
        /// Used for logging and audit trail.
        /// </summary>
        public int RequestId { get; set; }

        /// <summary>
        /// The Request ID (Title) for display purposes.
        /// Example: "LRQ-2024-001234"
        /// </summary>
        public string RequestTitle { get; set; } = string.Empty;

        /// <summary>
        /// Category of the notification for grouping and filtering.
        /// </summary>
        public NotificationCategory Category { get; set; }

        /// <summary>
        /// The trigger event that caused this notification.
        /// Used for logging and analytics.
        /// </summary>
        public NotificationTrigger Trigger { get; set; }
    }

    /// <summary>
    /// Request payload for the SendNotification Azure Function.
    /// Contains the request ID and allows the function to determine
    /// what notification (if any) should be sent by comparing versions.
    /// </summary>
    public class SendNotificationRequest
    {
        /// <summary>
        /// SharePoint list item ID of the request.
        /// </summary>
        public int RequestId { get; set; }

        /// <summary>
        /// Optional: Previous version number to compare against.
        /// If not provided, the function will retrieve the previous version.
        /// </summary>
        public string? PreviousVersion { get; set; }
    }

    /// <summary>
    /// Response from the SendNotification Azure Function.
    /// Contains either the email to send or null if no notification is needed.
    /// </summary>
    public class SendNotificationResponse
    {
        /// <summary>
        /// Whether a notification should be sent.
        /// If false, Email will be null.
        /// </summary>
        public bool ShouldSendNotification { get; set; }

        /// <summary>
        /// The email notification details.
        /// Null if ShouldSendNotification is false.
        /// </summary>
        public EmailResponse? Email { get; set; }

        /// <summary>
        /// Reason why notification was or was not sent.
        /// Used for logging and debugging.
        /// Example: "Status changed from LegalIntake to InReview"
        /// Example: "No relevant changes detected"
        /// </summary>
        public string Reason { get; set; } = string.Empty;
    }
}

// =============================================================================
// Legal Workflow - Azure Functions
// NotificationsFields.cs - SharePoint field name constants for Notifications list
// =============================================================================
//
// This file contains constants for SharePoint field internal names
// in the Notifications list. These must match the actual field names in SharePoint.
//
// IMPORTANT: Keep these values in sync with the SPFx solution:
//   - src/sp/listFields/NotificationsFields.ts
// =============================================================================

namespace LegalWorkflow.Functions.Constants.SharePointFields
{
    /// <summary>
    /// SharePoint field internal names for the Notifications list.
    /// These must match the actual field internal names in SharePoint.
    /// </summary>
    public static class NotificationsFields
    {
        // =================================================================
        // System Fields
        // =================================================================

        /// <summary>SharePoint item ID</summary>
        public const string ID = "ID";

        /// <summary>Notification template ID (stored in Title field)</summary>
        public const string Title = "Title";

        // =================================================================
        // Template Content
        // =================================================================

        /// <summary>Email subject template with tokens</summary>
        public const string Subject = "Subject";

        /// <summary>HTML email body template with tokens</summary>
        public const string Body = "Body";

        // =================================================================
        // Recipient Configuration
        // =================================================================

        /// <summary>To recipients configuration (e.g., "Submitter,LegalAdmin")</summary>
        public const string ToRecipients = "ToRecipients";

        /// <summary>CC recipients configuration</summary>
        public const string CcRecipients = "CcRecipients";

        /// <summary>BCC recipients configuration</summary>
        public const string BccRecipients = "BccRecipients";

        // =================================================================
        // Notification Settings
        // =================================================================

        /// <summary>Email importance level (Low, Normal, High)</summary>
        public const string Importance = "Importance";

        /// <summary>Notification category for grouping</summary>
        public const string Category = "Category";

        /// <summary>Event that triggers this notification</summary>
        public const string TriggerEvent = "TriggerEvent";

        /// <summary>Whether this notification template is active</summary>
        public const string IsActive = "IsActive";

        /// <summary>Whether to include request documents as attachments</summary>
        public const string IncludeDocuments = "IncludeDocuments";

        // =================================================================
        // Metadata
        // =================================================================

        /// <summary>Description of the notification</summary>
        public const string Description = "Description";

        /// <summary>Created date</summary>
        public const string Created = "Created";

        /// <summary>Modified date</summary>
        public const string Modified = "Modified";
    }
}

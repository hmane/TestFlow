// =============================================================================
// Legal Workflow - Azure Functions
// NotificationTemplateIds.cs - Notification template ID constants
// =============================================================================
//
// This file contains constants for notification template IDs.
// These IDs correspond to the Title field values in the Notifications list.
// =============================================================================

namespace LegalWorkflow.Functions.Constants
{
    /// <summary>
    /// Notification template IDs matching the Title field in the Notifications list.
    /// </summary>
    public static class NotificationTemplateIds
    {
        // =================================================================
        // Submission Notifications
        // =================================================================

        /// <summary>
        /// Notification when a request is submitted (Draft → Legal Intake).
        /// </summary>
        public const string RequestSubmitted = "RequestSubmitted";

        /// <summary>
        /// Notification when a rush request is submitted.
        /// Takes priority over RequestSubmitted when IsRushRequest is true.
        /// </summary>
        public const string RushRequestAlert = "RushRequestAlert";

        // =================================================================
        // Assignment Notifications
        // =================================================================

        /// <summary>
        /// Notification when a request is ready for attorney assignment.
        /// Triggered when Status changes to Assign Attorney.
        /// </summary>
        public const string ReadyForAttorneyAssignment = "ReadyForAttorneyAssignment";

        /// <summary>
        /// Notification when an attorney is assigned to a request.
        /// Triggered when Status changes from Legal Intake/Assign Attorney to In Review.
        /// </summary>
        public const string AttorneyAssigned = "AttorneyAssigned";

        // =================================================================
        // Legal Review Notifications
        // =================================================================

        /// <summary>
        /// Notification when legal review is approved (Approved or Approved With Comments).
        /// </summary>
        public const string LegalReviewApproved = "LegalReviewApproved";

        /// <summary>
        /// Notification when legal reviewer requests changes.
        /// Triggered when LegalReviewStatus changes to Waiting On Submitter.
        /// </summary>
        public const string LegalChangesRequested = "LegalChangesRequested";

        /// <summary>
        /// Notification when legal review is not approved.
        /// </summary>
        public const string LegalReviewNotApproved = "LegalReviewNotApproved";

        /// <summary>
        /// Notification when submitter resubmits for legal review.
        /// Triggered when LegalReviewStatus changes from Waiting On Submitter to Waiting On Attorney.
        /// </summary>
        public const string ResubmissionReceivedLegal = "ResubmissionReceivedLegal";

        // =================================================================
        // Compliance Review Notifications
        // =================================================================

        /// <summary>
        /// Notification when compliance review is approved (Approved or Approved With Comments).
        /// </summary>
        public const string ComplianceReviewApproved = "ComplianceReviewApproved";

        /// <summary>
        /// Notification when compliance reviewer requests changes.
        /// Triggered when ComplianceReviewStatus changes to Waiting On Submitter.
        /// </summary>
        public const string ComplianceChangesRequested = "ComplianceChangesRequested";

        /// <summary>
        /// Notification when compliance review is not approved.
        /// </summary>
        public const string ComplianceReviewNotApproved = "ComplianceReviewNotApproved";

        /// <summary>
        /// Notification when submitter resubmits for compliance review.
        /// Triggered when ComplianceReviewStatus changes from Waiting On Submitter to Waiting On Compliance.
        /// </summary>
        public const string ResubmissionReceivedCompliance = "ResubmissionReceivedCompliance";

        // =================================================================
        // Status Change Notifications
        // =================================================================

        /// <summary>
        /// Notification when a request is put on hold.
        /// Triggered when IsOnHold changes from false to true.
        /// </summary>
        public const string RequestOnHold = "RequestOnHold";

        /// <summary>
        /// Notification when a request is resumed from hold.
        /// Triggered when IsOnHold changes from true to false.
        /// </summary>
        public const string RequestResumed = "RequestResumed";

        /// <summary>
        /// Notification when a request is cancelled.
        /// Triggered when Status changes to Cancelled.
        /// </summary>
        public const string RequestCancelled = "RequestCancelled";

        /// <summary>
        /// Notification when a request is ready for closeout.
        /// Triggered when Status changes to Closeout.
        /// </summary>
        public const string ReadyForCloseout = "ReadyForCloseout";

        /// <summary>
        /// Notification when a request workflow is completed.
        /// Triggered when Status changes to Completed.
        /// </summary>
        public const string RequestCompleted = "RequestCompleted";
    }
}

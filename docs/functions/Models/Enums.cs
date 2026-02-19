// =============================================================================
// Legal Workflow - Azure Functions
// Enums.cs - Enumeration types for the Legal Review System
// =============================================================================

namespace LegalWorkflow.Functions.Models
{
    /// <summary>
    /// Represents the current status of a legal review request.
    /// These values correspond to the Status choice field in SharePoint.
    /// </summary>
    public enum RequestStatus
    {
        /// <summary>Request is saved but not yet submitted</summary>
        Draft,

        /// <summary>Request has been submitted and is pending triage by Legal Admin</summary>
        LegalIntake,

        /// <summary>Request is waiting for attorney assignment by committee</summary>
        AssignAttorney,

        /// <summary>Request is being reviewed by attorney and/or compliance</summary>
        InReview,

        /// <summary>All reviews complete, awaiting submitter closeout</summary>
        Closeout,

        /// <summary>Request workflow is complete</summary>
        Completed,

        /// <summary>Request has been cancelled</summary>
        Cancelled,

        /// <summary>Request is on hold (paused)</summary>
        OnHold,

        /// <summary>Request is awaiting FINRA documents upload</summary>
        AwaitingFINRA
    }

    /// <summary>
    /// Represents the type of legal review request.
    /// </summary>
    public enum RequestType
    {
        /// <summary>Marketing communication review</summary>
        Communication,

        /// <summary>General legal review (Phase 2)</summary>
        GeneralReview,

        /// <summary>Investment Management Agreement review (Phase 2)</summary>
        IMAReview
    }

    /// <summary>
    /// Represents whether this is a new submission or material update.
    /// </summary>
    public enum SubmissionType
    {
        /// <summary>New submission</summary>
        New,

        /// <summary>Material updates to existing communication</summary>
        MaterialUpdates
    }

    /// <summary>
    /// Indicates which review teams need to review the request.
    /// </summary>
    public enum ReviewAudience
    {
        /// <summary>Legal review only</summary>
        Legal,

        /// <summary>Compliance review only</summary>
        Compliance,

        /// <summary>Both Legal and Compliance reviews required</summary>
        Both
    }

    /// <summary>
    /// Status of an individual review (Legal or Compliance).
    /// </summary>
    public enum ReviewStatus
    {
        /// <summary>Review is not required for this request</summary>
        NotRequired,

        /// <summary>Review has not started yet</summary>
        NotStarted,

        /// <summary>Review is currently in progress</summary>
        InProgress,

        /// <summary>Reviewer has requested changes, waiting for submitter response</summary>
        WaitingOnSubmitter,

        /// <summary>Submitter has resubmitted, waiting for attorney to continue review</summary>
        WaitingOnAttorney,

        /// <summary>Submitter has resubmitted, waiting for compliance to continue review</summary>
        WaitingOnCompliance,

        /// <summary>Review has been completed</summary>
        Completed
    }

    /// <summary>
    /// Outcome of a completed review.
    /// </summary>
    public enum ReviewOutcome
    {
        /// <summary>No outcome yet (review not complete)</summary>
        None,

        /// <summary>Request approved without conditions</summary>
        Approved,

        /// <summary>Request approved but submitter must acknowledge comments at closeout</summary>
        ApprovedWithComments,

        /// <summary>Reviewer requests changes before approval</summary>
        RespondToCommentsAndResubmit,

        /// <summary>Request rejected - moves directly to Completed</summary>
        NotApproved
    }

    /// <summary>
    /// Types of approvals that can be attached to a request.
    /// </summary>
    public enum ApprovalType
    {
        /// <summary>Communications team approval</summary>
        Communications,

        /// <summary>Portfolio Manager approval</summary>
        PortfolioManager,

        /// <summary>Research Analyst approval</summary>
        ResearchAnalyst,

        /// <summary>Subject Matter Expert approval</summary>
        SubjectMatterExpert,

        /// <summary>Performance team approval</summary>
        Performance,

        /// <summary>Other type of approval</summary>
        Other
    }

    /// <summary>
    /// Distribution methods for communication requests.
    /// </summary>
    public enum DistributionMethod
    {
        DodgeCoxWebsiteUS,
        DodgeCoxWebsiteNonUS,
        ThirdPartyWebsite,
        EmailMail,
        MobileApp,
        DisplayCardSignage,
        Hangout,
        LiveTalkingPoints,
        SocialMedia
    }

    /// <summary>
    /// Email importance levels for notifications.
    /// </summary>
    public enum EmailImportance
    {
        Low,
        Normal,
        High
    }

    /// <summary>
    /// Types of notification triggers.
    /// These correspond to the TriggerEvent field in the Notifications list.
    /// </summary>
    public enum NotificationTrigger
    {
        /// <summary>Triggered when request status changes</summary>
        StatusChange,

        /// <summary>Triggered when a review is completed</summary>
        ReviewComplete,

        /// <summary>Triggered when reviewer requests changes</summary>
        ReviewChangesRequested,

        /// <summary>Triggered when attorney is assigned</summary>
        AttorneyAssigned,

        /// <summary>Triggered when submitter resubmits after addressing comments</summary>
        Resubmission,

        /// <summary>Triggered when request is put on hold or resumed</summary>
        HoldResume,

        /// <summary>Triggered when request is cancelled</summary>
        Cancellation
    }

    /// <summary>
    /// Categories of notifications for grouping.
    /// </summary>
    public enum NotificationCategory
    {
        Submission,
        Assignment,
        Review,
        StatusChange,
        Closeout,
        System
    }

    /// <summary>
    /// SharePoint permission levels used in the application.
    /// </summary>
    public enum PermissionLevel
    {
        /// <summary>Read-only access</summary>
        Read,

        /// <summary>Contribute access (add, edit, but not delete)</summary>
        ContributeWithoutDelete,

        /// <summary>Full contribute access including delete</summary>
        Contribute,

        /// <summary>Full control</summary>
        FullControl
    }
}

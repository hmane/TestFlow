// =============================================================================
// Legal Workflow - Azure Functions
// RequestModel.cs - Data model representing a Legal Review Request
// =============================================================================

using System;
using System.Collections.Generic;

namespace LegalWorkflow.Functions.Models
{
    /// <summary>
    /// Represents a Legal Review Request from the SharePoint Requests list.
    /// This model contains all fields needed for workflow processing, notifications,
    /// and permission management.
    /// </summary>
    public class RequestModel
    {
        #region System Fields

        /// <summary>SharePoint list item ID</summary>
        public int Id { get; set; }

        /// <summary>Request ID (auto-generated, e.g., "LRQ-2024-001234")</summary>
        public string Title { get; set; } = string.Empty;

        /// <summary>SharePoint item version number for concurrency</summary>
        public string Version { get; set; } = string.Empty;

        /// <summary>Item created date</summary>
        public DateTime Created { get; set; }

        /// <summary>Item last modified date</summary>
        public DateTime Modified { get; set; }

        #endregion

        #region Request Information

        /// <summary>Type of request (Communication, GeneralReview, IMAReview)</summary>
        public RequestType RequestType { get; set; }

        /// <summary>New submission or Material Updates</summary>
        public SubmissionType SubmissionType { get; set; }

        /// <summary>Submission item type from SubmissionItems list (e.g., "Marketing Material", "Fact Sheet")</summary>
        public string SubmissionItem { get; set; } = string.Empty;

        /// <summary>Purpose/description of the communication</summary>
        public string Purpose { get; set; } = string.Empty;

        /// <summary>Target return date for the review</summary>
        public DateTime? TargetReturnDate { get; set; }

        /// <summary>Original request date (when request was created/submitted)</summary>
        public DateTime? RequestedDate { get; set; }

        /// <summary>Whether this is a rush request (calculated field)</summary>
        public bool IsRushRequest { get; set; }

        /// <summary>Rationale for rush request (required if IsRushRequest)</summary>
        public string RushRationale { get; set; } = string.Empty;

        /// <summary>Which review teams need to review (Legal, Compliance, Both)</summary>
        public ReviewAudience ReviewAudience { get; set; }

        #endregion

        #region FINRA & Audience Fields

        /// <summary>FINRA audience category</summary>
        public string FINRAAudienceCategory { get; set; } = string.Empty;

        /// <summary>Target audience for the communication</summary>
        public string Audience { get; set; } = string.Empty;

        /// <summary>US Funds involved (multi-select)</summary>
        public List<string> USFunds { get; set; } = new();

        /// <summary>UCITS funds involved (multi-select)</summary>
        public List<string> UCITS { get; set; } = new();

        /// <summary>Separate Account Strategies involved</summary>
        public string SeparateAccountStrategies { get; set; } = string.Empty;

        /// <summary>Separate Account Strategies includes</summary>
        public string SeparateAccountStrategiesIncludes { get; set; } = string.Empty;

        #endregion

        #region Distribution Fields

        /// <summary>Distribution methods (multi-select)</summary>
        public List<DistributionMethod> DistributionMethods { get; set; } = new();

        /// <summary>Proposed first use date</summary>
        public DateTime? ProposedFirstUseDate { get; set; }

        /// <summary>Proposed discontinue date</summary>
        public DateTime? ProposedDiscontinueDate { get; set; }

        #endregion

        #region Approval Fields

        /// <summary>Communications team approval</summary>
        public ApprovalInfo? CommunicationsApproval { get; set; }

        /// <summary>Portfolio Manager approval</summary>
        public ApprovalInfo? PortfolioManagerApproval { get; set; }

        /// <summary>Research Analyst approval</summary>
        public ApprovalInfo? ResearchAnalystApproval { get; set; }

        /// <summary>Subject Matter Expert approval</summary>
        public ApprovalInfo? SubjectMatterExpertApproval { get; set; }

        /// <summary>Performance team approval</summary>
        public ApprovalInfo? PerformanceApproval { get; set; }

        /// <summary>Other approval</summary>
        public ApprovalInfo? OtherApproval { get; set; }

        #endregion

        #region Legal Intake Fields

        /// <summary>Assigned attorneys (multi-user lookup)</summary>
        public List<UserInfo> Attorneys { get; set; } = new();

        /// <summary>Notes from Legal Admin during attorney assignment</summary>
        public string AttorneyAssignNotes { get; set; } = string.Empty;

        #endregion

        #region Legal Review Fields

        /// <summary>Current status of legal review</summary>
        public ReviewStatus LegalReviewStatus { get; set; }

        /// <summary>Outcome of legal review</summary>
        public ReviewOutcome LegalReviewOutcome { get; set; }

        /// <summary>Notes from attorney during legal review</summary>
        public string LegalReviewNotes { get; set; } = string.Empty;

        /// <summary>When legal review status was last updated</summary>
        public DateTime? LegalStatusUpdatedOn { get; set; }

        /// <summary>Total time spent in legal review (in hours)</summary>
        public double? LegalReviewTime { get; set; }

        #endregion

        #region Compliance Review Fields

        /// <summary>Current status of compliance review</summary>
        public ReviewStatus ComplianceReviewStatus { get; set; }

        /// <summary>Outcome of compliance review</summary>
        public ReviewOutcome ComplianceReviewOutcome { get; set; }

        /// <summary>Notes from compliance during review</summary>
        public string ComplianceReviewNotes { get; set; } = string.Empty;

        /// <summary>When compliance review status was last updated</summary>
        public DateTime? ComplianceStatusUpdatedOn { get; set; }

        /// <summary>Total time spent in compliance review (in hours)</summary>
        public double? ComplianceReviewTime { get; set; }

        /// <summary>Whether Foreside review is required (parent checkbox)</summary>
        public bool IsForesideReviewRequired { get; set; }

        /// <summary>For record retention purpose only (visible when IsForesideReviewRequired is true)</summary>
        public bool RecordRetentionOnly { get; set; }

        /// <summary>Whether this is for retail use (visible when IsForesideReviewRequired is true)</summary>
        public bool IsRetailUse { get; set; }

        #endregion

        #region Closeout Fields

        /// <summary>Tracking ID (required at closeout if IsForesideReviewRequired is true)</summary>
        public string TrackingId { get; set; } = string.Empty;

        #endregion

        #region System Tracking Fields

        /// <summary>Current workflow status</summary>
        public RequestStatus Status { get; set; }

        /// <summary>Previous workflow status (for change detection)</summary>
        public RequestStatus? PreviousStatus { get; set; }

        /// <summary>User who submitted the request</summary>
        public UserInfo? SubmittedBy { get; set; }

        /// <summary>When request was submitted</summary>
        public DateTime? SubmittedOn { get; set; }

        /// <summary>Whether the request is currently on hold</summary>
        public bool IsOnHold { get; set; }

        /// <summary>Reason for putting request on hold</summary>
        public string HoldReason { get; set; } = string.Empty;

        /// <summary>When request was put on hold</summary>
        public DateTime? HoldDate { get; set; }

        /// <summary>When request was completed</summary>
        public DateTime? CompletedOn { get; set; }

        /// <summary>When request was cancelled</summary>
        public DateTime? CancelledOn { get; set; }

        /// <summary>Reason for cancellation</summary>
        public string CancellationReason { get; set; } = string.Empty;

        #endregion

        #region Additional Parties

        /// <summary>Additional party users who should have read access</summary>
        public List<UserInfo> AdditionalParties { get; set; } = new();

        #endregion
    }

    /// <summary>
    /// Represents user information from SharePoint user lookup field.
    /// </summary>
    public class UserInfo
    {
        /// <summary>SharePoint user ID</summary>
        public int Id { get; set; }

        /// <summary>User's display name</summary>
        public string Title { get; set; } = string.Empty;

        /// <summary>User's email address</summary>
        public string Email { get; set; } = string.Empty;

        /// <summary>User's login name (claims format)</summary>
        public string LoginName { get; set; } = string.Empty;
    }

    /// <summary>
    /// Represents approval information for a specific approval type.
    /// </summary>
    public class ApprovalInfo
    {
        /// <summary>Type of approval</summary>
        public ApprovalType Type { get; set; }

        /// <summary>User who provided the approval</summary>
        public UserInfo? ApprovedBy { get; set; }

        /// <summary>Date of approval</summary>
        public DateTime? ApprovedOn { get; set; }

        /// <summary>Whether a document was uploaded for this approval</summary>
        public bool HasDocument { get; set; }
    }

    /// <summary>
    /// Represents the previous version of a request for change detection.
    /// Used to determine which notifications should be triggered.
    /// </summary>
    public class RequestVersionInfo
    {
        /// <summary>SharePoint list item ID</summary>
        public int Id { get; set; }

        /// <summary>Version number</summary>
        public string Version { get; set; } = string.Empty;

        /// <summary>Previous workflow status</summary>
        public RequestStatus Status { get; set; }

        /// <summary>Previous IsOnHold value</summary>
        public bool IsOnHold { get; set; }

        /// <summary>Previous legal review status</summary>
        public ReviewStatus LegalReviewStatus { get; set; }

        /// <summary>Previous legal review outcome</summary>
        public ReviewOutcome LegalReviewOutcome { get; set; }

        /// <summary>Previous compliance review status</summary>
        public ReviewStatus ComplianceReviewStatus { get; set; }

        /// <summary>Previous compliance review outcome</summary>
        public ReviewOutcome ComplianceReviewOutcome { get; set; }

        /// <summary>Previous attorney assignments</summary>
        public List<UserInfo> Attorneys { get; set; } = new();
    }
}

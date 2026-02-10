// =============================================================================
// Legal Workflow - Azure Functions
// RequestsFields.cs - SharePoint field name constants for Requests list
// =============================================================================
//
// This file contains constants for SharePoint field internal names
// in the Requests list. These must match the actual field names in SharePoint.
//
// IMPORTANT: Keep these values in sync with the SPFx solution:
//   - src/sp/listFields/RequestsFields.ts
// =============================================================================

namespace LegalWorkflow.Functions.Constants.SharePointFields
{
    /// <summary>
    /// SharePoint field internal names for the Requests list.
    /// These must match the actual field internal names in SharePoint.
    /// </summary>
    public static class RequestsFields
    {
        // =================================================================
        // System Fields
        // =================================================================

        /// <summary>Content type of the item</summary>
        public const string ContentType = "ContentType";

        /// <summary>SharePoint item ID</summary>
        public const string ID = "ID";

        /// <summary>Request ID (stored in Title field)</summary>
        public const string RequestId = "Title";

        /// <summary>Title field (same as RequestId)</summary>
        public const string Title = "Title";

        /// <summary>Request title/name</summary>
        public const string RequestTitle = "RequestTitle";

        /// <summary>Created date</summary>
        public const string Created = "Created";

        /// <summary>Created by user</summary>
        public const string Author = "Author";

        /// <summary>Modified date</summary>
        public const string Modified = "Modified";

        /// <summary>Modified by user</summary>
        public const string Editor = "Editor";

        /// <summary>Version string for display</summary>
        public const string UIVersionString = "_UIVersionString";

        // =================================================================
        // Request Information
        // =================================================================

        /// <summary>Type of request (Communication, General Review, IMA Review)</summary>
        public const string RequestType = "RequestType";

        /// <summary>Submission type (New, Material Updates)</summary>
        public const string SubmissionType = "SubmissionType";

        /// <summary>Submission item lookup</summary>
        public const string SubmissionItem = "SubmissionItem";

        /// <summary>Purpose/description of the request</summary>
        public const string Purpose = "Purpose";

        /// <summary>Target return date requested by submitter</summary>
        public const string TargetReturnDate = "TargetReturnDate";

        /// <summary>Expected turnaround date based on submission item</summary>
        public const string ExpectedTurnaroundDate = "ExpectedTurnaroundDate";

        /// <summary>Whether this is a rush request</summary>
        public const string IsRushRequest = "IsRushRequest";

        /// <summary>Rationale for rush request</summary>
        public const string RushRationale = "RushRationale";

        /// <summary>Review audience (Legal, Compliance, Both)</summary>
        public const string ReviewAudience = "ReviewAudience";

        /// <summary>Department of the submitter</summary>
        public const string Department = "Department";

        // =================================================================
        // FINRA Audience & Product Fields
        // =================================================================

        /// <summary>FINRA audience category (Institutional, Retail / Public)</summary>
        public const string FINRAAudienceCategory = "FINRAAudienceCategory";

        /// <summary>Target audience</summary>
        public const string Audience = "Audience";

        /// <summary>US Funds selection (multi-choice)</summary>
        public const string USFunds = "USFunds";

        /// <summary>UCITS funds selection (multi-choice)</summary>
        public const string UCITS = "UCITS";

        /// <summary>Separate account strategies</summary>
        public const string SeparateAcctStrategies = "SeparateAcctStrategies";

        /// <summary>Separate account strategies includes</summary>
        public const string SeparateAcctStrategiesIncl = "SeparateAcctStrategiesIncl";

        // =================================================================
        // Distribution
        // =================================================================

        /// <summary>Distribution methods (multi-choice)</summary>
        public const string DistributionMethod = "DistributionMethod";

        /// <summary>Date of first use</summary>
        public const string DateOfFirstUse = "DateOfFirstUse";

        /// <summary>Prior submissions reference</summary>
        public const string PriorSubmissions = "PriorSubmissions";

        /// <summary>Notes about prior submissions</summary>
        public const string PriorSubmissionNotes = "PriorSubmissionNotes";

        // =================================================================
        // Status & Workflow
        // =================================================================

        /// <summary>Current workflow status</summary>
        public const string Status = "Status";

        /// <summary>Previous status before current</summary>
        public const string PreviousStatus = "PreviousStatus";

        /// <summary>Whether request is on hold</summary>
        public const string IsOnHold = "IsOnHold";

        /// <summary>Reason for putting on hold</summary>
        public const string OnHoldReason = "OnHoldReason";

        /// <summary>Date when put on hold</summary>
        public const string OnHoldSince = "OnHoldSince";

        /// <summary>User who put request on hold</summary>
        public const string OnHoldBy = "OnHoldBy";

        /// <summary>Reason for cancellation</summary>
        public const string CancelReason = "CancelReason";

        /// <summary>Date when cancelled</summary>
        public const string CancelledOn = "CancelledOn";

        /// <summary>User who cancelled the request</summary>
        public const string CancelledBy = "CancelledBy";

        // =================================================================
        // Submission Tracking
        // =================================================================

        /// <summary>User who submitted the request</summary>
        public const string SubmittedBy = "SubmittedBy";

        /// <summary>Date when submitted</summary>
        public const string SubmittedOn = "SubmittedOn";

        /// <summary>User who submitted for review</summary>
        public const string SubmittedForReviewBy = "SubmittedForReviewBy";

        /// <summary>Date when submitted for review</summary>
        public const string SubmittedForReviewOn = "SubmittedForReviewOn";

        /// <summary>User who submitted to Assign Attorney</summary>
        public const string SubmittedToAssignAttorneyBy = "SubmittedToAssignAttorneyBy";

        /// <summary>Date when submitted to Assign Attorney</summary>
        public const string SubmittedToAssignAttorneyOn = "SubmittedToAssignAttorneyOn";

        // =================================================================
        // Legal Intake / Attorney Assignment
        // =================================================================

        /// <summary>Assigned attorney (user lookup)</summary>
        public const string Attorney = "Attorney";

        /// <summary>Notes for attorney assignment</summary>
        public const string AttorneyAssignNotes = "AttorneyAssignNotes";

        // =================================================================
        // Legal Review
        // =================================================================

        /// <summary>Legal review status</summary>
        public const string LegalReviewStatus = "LegalReviewStatus";

        /// <summary>Legal review outcome</summary>
        public const string LegalReviewOutcome = "LegalReviewOutcome";

        /// <summary>Legal review notes</summary>
        public const string LegalReviewNotes = "LegalReviewNotes";

        /// <summary>User who last updated legal status</summary>
        public const string LegalStatusUpdatedBy = "LegalStatusUpdatedBy";

        /// <summary>Date when legal status was last updated</summary>
        public const string LegalStatusUpdatedOn = "LegalStatusUpdatedOn";

        /// <summary>User who completed legal review</summary>
        public const string LegalReviewCompletedBy = "LegalReviewCompletedBy";

        /// <summary>Date when legal review was completed</summary>
        public const string LegalReviewCompletedOn = "LegalReviewCompletedOn";

        // =================================================================
        // Compliance Review
        // =================================================================

        /// <summary>Compliance review status</summary>
        public const string ComplianceReviewStatus = "ComplianceReviewStatus";

        /// <summary>Compliance review outcome</summary>
        public const string ComplianceReviewOutcome = "ComplianceReviewOutcome";

        /// <summary>Compliance review notes</summary>
        public const string ComplianceReviewNotes = "ComplianceReviewNotes";

        /// <summary>User who last updated compliance status</summary>
        public const string ComplianceStatusUpdatedBy = "ComplianceStatusUpdatedBy";

        /// <summary>Date when compliance status was last updated</summary>
        public const string ComplianceStatusUpdatedOn = "ComplianceStatusUpdatedOn";

        /// <summary>User who completed compliance review</summary>
        public const string ComplianceReviewCompletedBy = "ComplianceReviewCompletedBy";

        /// <summary>Date when compliance review was completed</summary>
        public const string ComplianceReviewCompletedOn = "ComplianceReviewCompletedOn";

        /// <summary>Whether Foreside review is required</summary>
        public const string IsForesideReviewRequired = "IsForesideReviewRequired";

        /// <summary>Whether this is for retail use</summary>
        public const string IsRetailUse = "IsRetailUse";

        // =================================================================
        // Approvals - Communications
        // =================================================================

        /// <summary>Whether Communications approval is required</summary>
        public const string RequiresCommunicationsApproval = "RequiresCommunicationsApproval";

        /// <summary>Communications approver (user lookup)</summary>
        public const string CommunicationsApprover = "CommunicationsApprover";

        /// <summary>Date of Communications approval</summary>
        public const string CommunicationsApprovalDate = "CommunicationsApprovalDate";

        /// <summary>Communications approval notes</summary>
        public const string CommunicationsApprovalNotes = "CommunicationsApprovalNotes";

        /// <summary>Whether this is communications only</summary>
        public const string CommunicationsOnly = "CommunicationsOnly";

        // =================================================================
        // Approvals - Portfolio Manager
        // =================================================================

        /// <summary>Whether Portfolio Manager approval exists</summary>
        public const string HasPortfolioManagerApproval = "HasPortfolioManagerApproval";

        /// <summary>Portfolio Manager approver (user lookup)</summary>
        public const string PortfolioManager = "PortfolioManager";

        /// <summary>Date of Portfolio Manager approval</summary>
        public const string PortfolioManagerApprovalDate = "PortfolioManagerApprovalDate";

        /// <summary>Portfolio Manager approval notes</summary>
        public const string PortfolioMgrApprovalNotes = "PortfolioMgrApprovalNotes";

        // =================================================================
        // Approvals - Research Analyst
        // =================================================================

        /// <summary>Whether Research Analyst approval exists</summary>
        public const string HasResearchAnalystApproval = "HasResearchAnalystApproval";

        /// <summary>Research Analyst approver (user lookup)</summary>
        public const string ResearchAnalyst = "ResearchAnalyst";

        /// <summary>Date of Research Analyst approval</summary>
        public const string ResearchAnalystApprovalDate = "ResearchAnalystApprovalDate";

        /// <summary>Research Analyst approval notes</summary>
        public const string ResearchAnalystApprovalNotes = "ResearchAnalystApprovalNotes";

        // =================================================================
        // Approvals - Subject Matter Expert (SME)
        // =================================================================

        /// <summary>Whether SME approval exists</summary>
        public const string HasSMEApproval = "HasSMEApproval";

        /// <summary>Subject Matter Expert approver (user lookup)</summary>
        public const string SubjectMatterExpert = "SubjectMatterExpert";

        /// <summary>Date of SME approval</summary>
        public const string SMEApprovalDate = "SMEApprovalDate";

        /// <summary>SME approval notes</summary>
        public const string SMEApprovalNotes = "SMEApprovalNotes";

        // =================================================================
        // Approvals - Performance
        // =================================================================

        /// <summary>Whether Performance approval exists</summary>
        public const string HasPerformanceApproval = "HasPerformanceApproval";

        /// <summary>Performance approver (user lookup)</summary>
        public const string PerformanceApprover = "PerformanceApprover";

        /// <summary>Date of Performance approval</summary>
        public const string PerformanceApprovalDate = "PerformanceApprovalDate";

        /// <summary>Performance approval notes</summary>
        public const string PerformanceApprovalNotes = "PerformanceApprovalNotes";

        // =================================================================
        // Approvals - Other
        // =================================================================

        /// <summary>Whether Other approval exists</summary>
        public const string HasOtherApproval = "HasOtherApproval";

        /// <summary>Other approval type/title</summary>
        public const string OtherApprovalTitle = "OtherApprovalTitle";

        /// <summary>Other approval (user lookup)</summary>
        public const string OtherApproval = "OtherApproval";

        /// <summary>Date of Other approval</summary>
        public const string OtherApprovalDate = "OtherApprovalDate";

        /// <summary>Other approval notes</summary>
        public const string OtherApprovalNotes = "OtherApprovalNotes";

        // =================================================================
        // Closeout
        // =================================================================

        /// <summary>Tracking ID for completed requests</summary>
        public const string TrackingId = "TrackingId";

        /// <summary>Closeout notes</summary>
        public const string CloseoutNotes = "CloseoutNotes";

        /// <summary>User who completed closeout</summary>
        public const string CloseoutBy = "CloseoutBy";

        /// <summary>Date of closeout completion</summary>
        public const string CloseoutOn = "CloseoutOn";

        /// <summary>Whether comments have been acknowledged</summary>
        public const string CommentsAcknowledged = "CommentsAcknowledged";

        /// <summary>Date when comments were acknowledged</summary>
        public const string CommentsAcknowledgedOn = "CommentsAcknowledgedOn";

        // =================================================================
        // Additional Parties
        // =================================================================

        /// <summary>Additional parties (multi-user lookup)</summary>
        public const string AdditionalParty = "AdditionalParty";

        // =================================================================
        // Time Tracking - Legal Intake
        // =================================================================

        /// <summary>Hours spent by Legal Admin during intake</summary>
        public const string LegalIntakeLegalAdminHours = "LegalIntakeLegalAdminHours";

        /// <summary>Hours spent by Submitter during intake</summary>
        public const string LegalIntakeSubmitterHours = "LegalIntakeSubmitterHours";

        // =================================================================
        // Time Tracking - Legal Review
        // =================================================================

        /// <summary>Hours spent by Attorney during legal review</summary>
        public const string LegalReviewAttorneyHours = "LegalReviewAttorneyHours";

        /// <summary>Hours spent by Submitter during legal review</summary>
        public const string LegalReviewSubmitterHours = "LegalReviewSubmitterHours";

        // =================================================================
        // Time Tracking - Compliance Review
        // =================================================================

        /// <summary>Hours spent by Reviewer during compliance review</summary>
        public const string ComplianceReviewReviewerHours = "ComplianceReviewReviewerHours";

        /// <summary>Hours spent by Submitter during compliance review</summary>
        public const string ComplianceReviewSubmitterHours = "ComplianceReviewSubmitterHours";

        // =================================================================
        // Time Tracking - Closeout
        // =================================================================

        /// <summary>Hours spent by Reviewer during closeout</summary>
        public const string CloseoutReviewerHours = "CloseoutReviewerHours";

        /// <summary>Hours spent by Submitter during closeout</summary>
        public const string CloseoutSubmitterHours = "CloseoutSubmitterHours";

        // =================================================================
        // Time Tracking - Totals
        // =================================================================

        /// <summary>Total hours spent by all reviewers</summary>
        public const string TotalReviewerHours = "TotalReviewerHours";

        /// <summary>Total hours spent by submitter</summary>
        public const string TotalSubmitterHours = "TotalSubmitterHours";

        /// <summary>Total turnaround days</summary>
        public const string TotalTurnaroundDays = "TotalTurnaroundDays";

        // =================================================================
        // Admin Override Audit Trail
        // =================================================================

        /// <summary>Notes from admin overrides</summary>
        public const string AdminOverrideNotes = "AdminOverrideNotes";

        // =================================================================
        // FINRA Documents
        // =================================================================

        /// <summary>User who completed FINRA documents</summary>
        public const string FINRACompletedBy = "FINRACompletedBy";

        /// <summary>Date when FINRA documents were completed</summary>
        public const string FINRACompletedOn = "FINRACompletedOn";

        /// <summary>FINRA notes</summary>
        public const string FINRANotes = "FINRANotes";

        /// <summary>Date since awaiting FINRA documents</summary>
        public const string AwaitingFINRASince = "AwaitingFINRASince";

        /// <summary>Whether FINRA comments have been received</summary>
        public const string FINRACommentsReceived = "FINRACommentsReceived";
    }
}

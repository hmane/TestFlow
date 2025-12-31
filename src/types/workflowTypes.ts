/**
 * Workflow status and state-related types
 */

/**
 * Main workflow statuses for legal review requests
 */
export enum RequestStatus {
  Draft = 'Draft',
  LegalIntake = 'Legal Intake',
  AssignAttorney = 'Assign Attorney',
  InReview = 'In Review',
  Closeout = 'Closeout',
  AwaitingForesideDocuments = 'Awaiting Foreside Documents',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
  OnHold = 'On Hold',
}

/**
 * Legal review status progression
 */
export enum LegalReviewStatus {
  NotRequired = 'Not Required',
  NotStarted = 'Not Started',
  InProgress = 'In Progress',
  WaitingOnSubmitter = 'Waiting On Submitter',
  WaitingOnAttorney = 'Waiting On Attorney',
  Completed = 'Completed',
}

/**
 * Compliance review status progression
 */
export enum ComplianceReviewStatus {
  NotRequired = 'Not Required',
  NotStarted = 'Not Started',
  InProgress = 'In Progress',
  WaitingOnSubmitter = 'Waiting On Submitter',
  WaitingOnCompliance = 'Waiting On Compliance',
  Completed = 'Completed',
}

/**
 * Review outcome options
 */
export enum ReviewOutcome {
  Approved = 'Approved',
  ApprovedWithComments = 'Approved With Comments',
  RespondToCommentsAndResubmit = 'Respond To Comments And Resubmit',
  NotApproved = 'Not Approved',
}

/**
 * Review audience options - determines which reviews are required
 */
export enum ReviewAudience {
  Legal = 'Legal',
  Compliance = 'Compliance',
  Both = 'Both',
}

/**
 * Status transition metadata
 */
export interface IStatusTransition {
  fromStatus: RequestStatus;
  toStatus: RequestStatus;
  transitionedBy: string;
  transitionedOn: Date;
  reason?: string;
}

/**
 * Hold request metadata
 */
export interface IHoldMetadata {
  onHoldBy: string;
  onHoldSince: Date;
  onHoldReason: string;
  previousStatus: RequestStatus;
}

/**
 * Cancel request metadata
 */
export interface ICancelMetadata {
  cancelledBy: string;
  cancelledOn: Date;
  cancelReason: string;
}

/**
 * Workflow action types for state management
 */
export enum WorkflowAction {
  Submit = 'Submit',
  AssignAttorney = 'Assign Attorney',
  SendToCommittee = 'Send To Committee',
  SubmitReview = 'Submit Review',
  RequestChanges = 'Request Changes',
  Approve = 'Approve',
  Reject = 'Reject',
  Closeout = 'Closeout',
  Cancel = 'Cancel',
  Hold = 'Hold',
  Resume = 'Resume',
}

/**
 * Workflow stage configuration
 */
export interface IWorkflowStage {
  status: RequestStatus;
  label: string;
  description: string;
  order: number;
  isOptional: boolean;
  allowedRoles: string[];
  requiredFields?: string[];
}

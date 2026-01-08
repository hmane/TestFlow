/**
 * Workflow stepper types and interfaces
 * Uses spfx-toolkit WorkflowStepper component types
 */

import type { StepData, StepStatus, StepperMode } from 'spfx-toolkit/lib/components/WorkflowStepper/types';
import type { RequestStatus, RequestType } from '@appTypes/index';

// Re-export toolkit types for convenience
export type { StepData, StepStatus, StepperMode };

/**
 * Application-specific workflow step with business context
 */
export interface IWorkflowStep {
  key: string;
  label: string;
  description: string;
  requestStatus: RequestStatus;
  isOptional: boolean;
  content?: IStepContent;
  order: number;
}

/**
 * Step content for informational display
 */
export interface IStepContent {
  title: string;
  description: string;
  details: string[];
  tips?: string[];
  estimatedDuration?: string;
  requiredFields?: string[];
  whoIsInvolved?: string[];
}

/**
 * Application stepper mode
 */
export type AppStepperMode = 'informational' | 'progress';

/**
 * Request metadata for workflow stepper display
 */
export interface IRequestMetadata {
  /** Date the request was created */
  createdOn?: Date;
  /** User who created the request (display name) */
  createdBy?: string;
  /** User identifier (email/login) for created by */
  createdByLogin?: string;
  /** Date the request was submitted */
  submittedOn?: Date;
  /** User who submitted the request (display name) */
  submittedBy?: string;
  /** User identifier (email/login) for submitted by */
  submittedByLogin?: string;
  /** Date legal intake was completed */
  legalIntakeCompletedOn?: Date;
  /** User who completed legal intake (display name) */
  legalIntakeCompletedBy?: string;
  /** User identifier (email/login) for legal intake completed by */
  legalIntakeCompletedByLogin?: string;
  /** Assigned attorney (display name) */
  assignedAttorney?: string;
  /** Assigned attorney login */
  assignedAttorneyLogin?: string;
  /** Date review started */
  reviewStartedOn?: Date;
  /** Review audience (Legal, Compliance, Both) */
  reviewAudience?: string;
  /** Legal review completed */
  legalReviewCompleted?: boolean;
  /** Legal review outcome */
  legalReviewOutcome?: string;
  /** Date legal review was completed */
  legalReviewCompletedOn?: Date;
  /** User who completed legal review (display name) */
  legalReviewCompletedBy?: string;
  /** User identifier (email/login) for legal review completed by */
  legalReviewCompletedByLogin?: string;
  /** Compliance review completed */
  complianceReviewCompleted?: boolean;
  /** Compliance review outcome */
  complianceReviewOutcome?: string;
  /** Date compliance review was completed */
  complianceReviewCompletedOn?: Date;
  /** User who completed compliance review (display name) */
  complianceReviewCompletedBy?: string;
  /** User identifier (email/login) for compliance review completed by */
  complianceReviewCompletedByLogin?: string;
  /** User who completed closeout (display name) */
  closeoutCompletedBy?: string;
  /** User identifier (email/login) for closeout completed by */
  closeoutCompletedByLogin?: string;
  /** Date closeout started */
  closeoutStartedOn?: Date;
  /** Date request was completed */
  completedOn?: Date;
  /** Tracking ID (if applicable) */
  trackingId?: string;

  // Contextual coloring fields for "In Review" step
  /** Current legal review status (for contextual coloring) */
  legalReviewStatus?: string;
  /** Current compliance review status (for contextual coloring) */
  complianceReviewStatus?: string;
  /** Whether the current user is the submitter (for contextual coloring) */
  isCurrentUserSubmitter?: boolean;

  // FINRA Documents step fields
  /** Whether Foreside review is required (determines if FINRA Documents step is shown) */
  isForesideReviewRequired?: boolean;
  /** Date FINRA documents were completed */
  finraCompletedOn?: Date;
  /** User who completed FINRA documents (display name) */
  finraCompletedBy?: string;

  // Terminal state fields (Cancelled/OnHold)
  /** Previous status before Cancelled or OnHold */
  previousStatus?: RequestStatus;
  /** Date request was cancelled */
  cancelledOn?: Date;
  /** User who cancelled the request (display name) */
  cancelledBy?: string;
  /** User identifier (email/login) for cancelled by */
  cancelledByLogin?: string;
  /** Reason for cancellation */
  cancelReason?: string;
  /** Date request was put on hold */
  onHoldSince?: Date;
  /** User who put the request on hold (display name) */
  onHoldBy?: string;
  /** User identifier (email/login) for on hold by */
  onHoldByLogin?: string;
  /** Reason for putting on hold */
  onHoldReason?: string;
}

/**
 * Application workflow stepper props
 */
export interface IWorkflowStepperProps {
  mode: AppStepperMode;
  requestType: RequestType;
  currentStatus?: RequestStatus;
  onStepClick?: (step: StepData) => void;
  className?: string;
  /** Request metadata for displaying created/submitted info */
  requestMetadata?: IRequestMetadata;
}

/**
 * Step configuration for different request types
 */
export interface IStepConfiguration {
  requestType: RequestType;
  steps: IWorkflowStep[];
}

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
  /** Compliance review completed */
  complianceReviewCompleted?: boolean;
  /** Compliance review outcome */
  complianceReviewOutcome?: string;
  /** Date compliance review was completed */
  complianceReviewCompletedOn?: Date;
  /** Date closeout started */
  closeoutStartedOn?: Date;
  /** Date request was completed */
  completedOn?: Date;
  /** Tracking ID (if applicable) */
  trackingId?: string;
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

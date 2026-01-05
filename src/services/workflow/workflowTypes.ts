/**
 * Workflow Action Types
 *
 * Shared types and interfaces for workflow actions.
 */

import type { IPrincipal } from 'spfx-toolkit/lib/types';
import type { ILegalRequest } from '@appTypes/requestTypes';
import { RequestStatus, ReviewAudience, ReviewOutcome } from '@appTypes/workflowTypes';

// ============================================
// RESULT TYPES
// ============================================

/**
 * Result of a workflow action
 */
export interface IWorkflowActionResult {
  success: boolean;
  itemId: number;
  newStatus: RequestStatus;
  updatedRequest: ILegalRequest;
  fieldsUpdated: string[];
  /** Correlation ID for tracking this action across logs */
  correlationId: string;
}

// ============================================
// ACTION PAYLOADS
// ============================================

/**
 * Submit request payload - only fields relevant to submission
 */
export interface ISubmitRequestPayload {
  /** Notes to include with submission (optional) */
  submissionNotes?: string;
}

/**
 * Assign attorney payload
 */
export interface IAssignAttorneyPayload {
  /** Attorney to assign */
  attorney: IPrincipal;
  /** Assignment notes (optional) */
  notes?: string;
  /** Review audience override (optional - Legal Admin can change from submitter's selection) */
  reviewAudience?: ReviewAudience;
}

/**
 * Send to committee payload
 */
export interface ISendToCommitteePayload {
  /** Notes for the committee (optional) */
  notes?: string;
  /** Review audience override (optional - Legal Admin can change from submitter's selection) */
  reviewAudience?: ReviewAudience;
}

/**
 * Legal review payload
 */
export interface ILegalReviewPayload {
  /** Review outcome */
  outcome: ReviewOutcome;
  /** Review notes (required) */
  notes: string;
}

/**
 * Compliance review payload
 */
export interface IComplianceReviewPayload {
  /** Review outcome */
  outcome: ReviewOutcome;
  /** Review notes (required) */
  notes: string;
  /** Foreside review required flag */
  isForesideReviewRequired?: boolean;
  /** Retail use flag */
  isRetailUse?: boolean;
}

/**
 * Closeout payload
 */
export interface ICloseoutPayload {
  /** Tracking ID (required if compliance reviewed with retail/foreside flags) */
  trackingId?: string;
  /** Whether review comments have been acknowledged (required if outcome was Approved with Comments) */
  commentsAcknowledged?: boolean;
  /** Closeout notes */
  closeoutNotes?: string;
}

/**
 * Cancel request payload
 */
export interface ICancelPayload {
  /** Cancellation reason (required) */
  reason: string;
}

/**
 * Hold request payload
 */
export interface IHoldPayload {
  /** Hold reason (required) */
  reason: string;
}

/**
 * Complete Foreside documents payload
 */
export interface ICompleteForesideDocumentsPayload {
  /** Optional notes about the Foreside document completion */
  notes?: string;
}

// ============================================
// SAVE PROGRESS PAYLOADS
// ============================================

/**
 * Legal review save progress payload
 */
export interface ILegalReviewSavePayload {
  /** Review outcome (optional - save in progress) */
  outcome?: ReviewOutcome;
  /** Review notes */
  notes?: string;
}

/**
 * Compliance review save progress payload
 */
export interface IComplianceReviewSavePayload {
  /** Review outcome (optional - save in progress) */
  outcome?: ReviewOutcome;
  /** Review notes */
  notes?: string;
  /** Foreside review required flag */
  isForesideReviewRequired?: boolean;
  /** Retail use flag */
  isRetailUse?: boolean;
}

// ============================================
// RESUBMIT PAYLOADS
// ============================================

/**
 * Resubmit legal review payload
 */
export interface IResubmitLegalReviewPayload {
  /** Optional notes to include with resubmission */
  notes?: string;
}

/**
 * Resubmit compliance review payload
 */
export interface IResubmitComplianceReviewPayload {
  /** Optional notes to include with resubmission */
  notes?: string;
}

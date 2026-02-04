/**
 * Workflow Permission Service
 * Centralized permission validation for all workflow actions
 * Ensures role-based access control is enforced consistently
 */

import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import { RequestStatus, ReviewAudience } from '@appTypes/workflowTypes';
import type { ILegalRequest } from '@appTypes/index';
import type { IUserPermissions } from '@hooks/usePermissions';

/**
 * Permission check result
 */
export interface IPermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Action context for permission checks
 */
export interface IActionContext {
  request: ILegalRequest;
  permissions: IUserPermissions;
  currentUserId: string;
}

/**
 * Valid status transitions map
 * Key: Current status
 * Value: Array of valid next statuses
 */
const VALID_STATUS_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  [RequestStatus.Draft]: [RequestStatus.LegalIntake, RequestStatus.Cancelled],
  [RequestStatus.LegalIntake]: [
    RequestStatus.AssignAttorney,
    RequestStatus.InReview,
    RequestStatus.OnHold,
    RequestStatus.Cancelled,
  ],
  [RequestStatus.AssignAttorney]: [
    RequestStatus.InReview,
    RequestStatus.OnHold,
    RequestStatus.Cancelled,
  ],
  [RequestStatus.InReview]: [
    RequestStatus.Closeout,
    RequestStatus.Completed, // Direct to completed if Not Approved
    RequestStatus.OnHold,
    RequestStatus.Cancelled,
  ],
  [RequestStatus.Closeout]: [
    RequestStatus.AwaitingFINRADocuments, // If Foreside Review Required and Retail Use
    RequestStatus.Completed,
    RequestStatus.OnHold,
    RequestStatus.Cancelled,
  ],
  [RequestStatus.AwaitingFINRADocuments]: [
    RequestStatus.Completed, // Only transition is to Completed
  ],
  [RequestStatus.Completed]: [], // Terminal state - no transitions allowed
  [RequestStatus.Cancelled]: [], // Terminal state - no transitions allowed
  [RequestStatus.OnHold]: [
    // Can resume to previous status (handled specially)
    RequestStatus.LegalIntake,
    RequestStatus.AssignAttorney,
    RequestStatus.InReview,
    RequestStatus.Closeout,
  ],
};

/**
 * Check if a status transition is valid
 */
export function isValidStatusTransition(
  fromStatus: RequestStatus,
  toStatus: RequestStatus
): IPermissionCheckResult {
  const validTransitions = VALID_STATUS_TRANSITIONS[fromStatus];

  if (!validTransitions) {
    return {
      allowed: false,
      reason: `Unknown current status: ${fromStatus}`,
    };
  }

  if (validTransitions.indexOf(toStatus) === -1) {
    return {
      allowed: false,
      reason: `Cannot transition from ${fromStatus} to ${toStatus}`,
    };
  }

  return { allowed: true };
}

/**
 * Check if user can submit a request (Draft → Legal Intake)
 */
export function canSubmitRequest(context: IActionContext): IPermissionCheckResult {
  const { request, permissions, currentUserId } = context;

  // Must be in Draft status
  if (request.status !== RequestStatus.Draft) {
    return {
      allowed: false,
      reason: `Request must be in Draft status to submit (current: ${request.status})`,
    };
  }

  // Must be owner or admin
  const isOwner = request.submittedBy?.id === currentUserId ||
                  request.author?.id === currentUserId;

  if (!isOwner && !permissions.isAdmin) {
    return {
      allowed: false,
      reason: 'Only the request owner or admin can submit this request',
    };
  }

  return { allowed: true };
}

/**
 * Check if user can assign attorney directly
 * Who can perform: LegalAdmin, Admin
 * Valid from status: Legal Intake
 */
export function canAssignAttorney(context: IActionContext): IPermissionCheckResult {
  const { request, permissions } = context;

  // Check status
  if (request.status !== RequestStatus.LegalIntake) {
    return {
      allowed: false,
      reason: `Attorney can only be assigned when request is in Legal Intake status (current: ${request.status})`,
    };
  }

  // Check permissions
  if (!permissions.canAssignAttorney) {
    return {
      allowed: false,
      reason: 'You do not have permission to assign attorneys. Requires Legal Admin or Admin role.',
    };
  }

  return { allowed: true };
}

/**
 * Check if user can send to committee
 * Who can perform: LegalAdmin, Admin
 * Valid from status: Legal Intake
 */
export function canSendToCommittee(context: IActionContext): IPermissionCheckResult {
  const { request, permissions } = context;

  // Check status
  if (request.status !== RequestStatus.LegalIntake) {
    return {
      allowed: false,
      reason: `Can only send to committee when request is in Legal Intake status (current: ${request.status})`,
    };
  }

  // Check permissions - only Legal Admin or Admin
  if (!permissions.isLegalAdmin && !permissions.isAdmin) {
    return {
      allowed: false,
      reason: 'Only Legal Admin or Admin can send requests to committee',
    };
  }

  return { allowed: true };
}

/**
 * Check if user can assign attorney from committee
 * Who can perform: AttorneyAssigner, Admin
 * Valid from status: Assign Attorney
 */
export function canCommitteeAssignAttorney(context: IActionContext): IPermissionCheckResult {
  const { request, permissions } = context;

  // Check status
  if (request.status !== RequestStatus.AssignAttorney) {
    return {
      allowed: false,
      reason: `Committee can only assign attorney when request is in Assign Attorney status (current: ${request.status})`,
    };
  }

  // Check permissions
  if (!permissions.isAttorneyAssigner && !permissions.isAdmin) {
    return {
      allowed: false,
      reason: 'Only Attorney Assigner or Admin can assign attorneys from committee',
    };
  }

  return { allowed: true };
}

/**
 * Check if user can submit legal review
 * Who can perform: Assigned Attorney, LegalAdmin (override), Admin
 * Valid from status: In Review
 * Additional checks:
 *   - User must be the assigned attorney (unless Admin/LegalAdmin)
 *   - Legal review must not already be completed
 */
export function canSubmitLegalReview(context: IActionContext): IPermissionCheckResult {
  const { request, permissions, currentUserId } = context;

  // Check status
  if (request.status !== RequestStatus.InReview) {
    return {
      allowed: false,
      reason: `Legal review can only be submitted when request is In Review (current: ${request.status})`,
    };
  }

  // Check if legal review is required
  const reviewAudience = request.reviewAudience;
  const legalReviewRequired = reviewAudience === ReviewAudience.Legal || reviewAudience === ReviewAudience.Both;

  if (!legalReviewRequired) {
    return {
      allowed: false,
      reason: 'Legal review is not required for this request',
    };
  }

  // Check if legal review is already completed
  const legalReviewStatus = request.legalReview?.status || request.legalReviewStatus;
  if (legalReviewStatus === 'Completed') {
    return {
      allowed: false,
      reason: 'Legal review has already been completed',
    };
  }

  // Admin and Legal Admin can always submit
  if (permissions.isAdmin || permissions.isLegalAdmin) {
    return { allowed: true };
  }

  // Must be attorney role
  if (!permissions.canReviewLegal) {
    return {
      allowed: false,
      reason: 'You do not have permission to submit legal reviews. Requires Attorney role.',
    };
  }

  // Must be the assigned attorney - check both nested object and flat field
  const assignedAttorneyId = request.legalReview?.assignedAttorney?.id || request.attorney?.id;
  if (!assignedAttorneyId) {
    return {
      allowed: false,
      reason: 'No attorney has been assigned to this request',
    };
  }

  if (String(assignedAttorneyId) !== String(currentUserId)) {
    return {
      allowed: false,
      reason: 'Only the assigned attorney can submit the legal review',
    };
  }

  return { allowed: true };
}

/**
 * Check if user can submit compliance review
 * Who can perform: ComplianceUser, Admin
 * Valid from status: In Review
 * Additional check: Compliance review must not already be completed
 */
export function canSubmitComplianceReview(context: IActionContext): IPermissionCheckResult {
  const { request, permissions } = context;

  // Check status
  if (request.status !== RequestStatus.InReview) {
    return {
      allowed: false,
      reason: `Compliance review can only be submitted when request is In Review (current: ${request.status})`,
    };
  }

  // Check if compliance review is required
  const reviewAudience = request.reviewAudience;
  const complianceReviewRequired = reviewAudience === ReviewAudience.Compliance || reviewAudience === ReviewAudience.Both;

  if (!complianceReviewRequired) {
    return {
      allowed: false,
      reason: 'Compliance review is not required for this request',
    };
  }

  // Check if compliance review is already completed
  const complianceReviewStatus = request.complianceReview?.status || request.complianceReviewStatus;
  if (complianceReviewStatus === 'Completed') {
    return {
      allowed: false,
      reason: 'Compliance review has already been completed',
    };
  }

  // Check permissions
  if (!permissions.canReviewCompliance) {
    return {
      allowed: false,
      reason: 'You do not have permission to submit compliance reviews. Requires Compliance User or Admin role.',
    };
  }

  return { allowed: true };
}

/**
 * Check if user can closeout request
 * Who can perform: LegalAdmin, Admin
 * Valid from status: Closeout
 */
export function canCloseoutRequest(context: IActionContext): IPermissionCheckResult {
  const { request, permissions } = context;

  // Check status
  if (request.status !== RequestStatus.Closeout) {
    return {
      allowed: false,
      reason: `Request can only be closed out when in Closeout status (current: ${request.status})`,
    };
  }

  // Check permissions
  if (!permissions.isLegalAdmin && !permissions.isAdmin) {
    return {
      allowed: false,
      reason: 'Only Legal Admin or Admin can closeout requests',
    };
  }

  return { allowed: true };
}

/**
 * Check if user can complete FINRA documents phase
 * Who can perform: Submitter (owner), Admin
 * Valid from status: Awaiting FINRA Documents
 */
export function canCompleteFINRADocuments(context: IActionContext): IPermissionCheckResult {
  const { request, permissions, currentUserId } = context;

  // Check status
  if (request.status !== RequestStatus.AwaitingFINRADocuments) {
    return {
      allowed: false,
      reason: `Can only complete FINRA documents when in Awaiting FINRA Documents status (current: ${request.status})`,
    };
  }

  // Admin can always complete
  if (permissions.isAdmin) {
    return { allowed: true };
  }

  // Must be owner (submitter)
  const isOwner = request.submittedBy?.id === currentUserId ||
                  request.author?.id === currentUserId;

  if (!isOwner) {
    return {
      allowed: false,
      reason: 'Only the request submitter or Admin can complete FINRA documents',
    };
  }

  return { allowed: true };
}

/**
 * Check if user can cancel request
 * Who can perform: LegalAdmin, Admin, OR Owner if status is Draft
 * Valid from status: Any except Completed
 */
export function canCancelRequest(context: IActionContext): IPermissionCheckResult {
  const { request, permissions, currentUserId } = context;

  // Cannot cancel completed requests
  if (request.status === RequestStatus.Completed) {
    return {
      allowed: false,
      reason: 'Completed requests cannot be cancelled',
    };
  }

  // Cannot cancel already cancelled requests
  if (request.status === RequestStatus.Cancelled) {
    return {
      allowed: false,
      reason: 'Request is already cancelled',
    };
  }

  // Admin or Legal Admin can always cancel
  if (permissions.isAdmin || permissions.isLegalAdmin) {
    return { allowed: true };
  }

  // Owner can cancel only if in Draft
  const isOwner = request.submittedBy?.id === currentUserId ||
                  request.author?.id === currentUserId;

  if (isOwner && request.status === RequestStatus.Draft) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: 'You do not have permission to cancel this request',
  };
}

/**
 * Check if user can put request on hold
 * Who can perform: LegalAdmin, Admin
 * Valid from status: Any except Draft, Completed, Cancelled, On Hold
 */
export function canHoldRequest(context: IActionContext): IPermissionCheckResult {
  const { request, permissions } = context;

  // Check invalid statuses
  const invalidStatuses = [
    RequestStatus.Draft,
    RequestStatus.Completed,
    RequestStatus.Cancelled,
    RequestStatus.OnHold,
  ];

  if (invalidStatuses.indexOf(request.status as RequestStatus) !== -1) {
    return {
      allowed: false,
      reason: `Cannot put request on hold when status is ${request.status}`,
    };
  }

  // Check permissions
  if (!permissions.isLegalAdmin && !permissions.isAdmin) {
    return {
      allowed: false,
      reason: 'Only Legal Admin or Admin can put requests on hold',
    };
  }

  return { allowed: true };
}

/**
 * Check if user can resume request from hold
 * Who can perform: LegalAdmin, Admin
 * Valid from status: On Hold only
 */
export function canResumeRequest(context: IActionContext): IPermissionCheckResult {
  const { request, permissions } = context;

  // Check status
  if (request.status !== RequestStatus.OnHold) {
    return {
      allowed: false,
      reason: `Can only resume requests that are On Hold (current: ${request.status})`,
    };
  }

  // Check previous status exists
  if (!request.previousStatus) {
    return {
      allowed: false,
      reason: 'Cannot resume: no previous status recorded',
    };
  }

  // Check permissions
  if (!permissions.isLegalAdmin && !permissions.isAdmin) {
    return {
      allowed: false,
      reason: 'Only Legal Admin or Admin can resume requests',
    };
  }

  return { allowed: true };
}

/**
 * Check if user can save draft
 * Who can perform: Owner, Admin
 * Valid from status: Draft
 */
export function canSaveDraft(context: IActionContext): IPermissionCheckResult {
  const { request, permissions, currentUserId } = context;

  // Check status
  if (request.status !== RequestStatus.Draft) {
    return {
      allowed: false,
      reason: `Can only save drafts when request is in Draft status (current: ${request.status})`,
    };
  }

  // Admin can always save
  if (permissions.isAdmin) {
    return { allowed: true };
  }

  // Must be owner
  const isOwner = request.submittedBy?.id === currentUserId ||
                  request.author?.id === currentUserId;

  // For new requests (no submittedBy yet), any submitter can save
  if (!request.submittedBy && permissions.isSubmitter) {
    return { allowed: true };
  }

  if (!isOwner) {
    return {
      allowed: false,
      reason: 'Only the request owner can save draft changes',
    };
  }

  return { allowed: true };
}

/**
 * Check if user can edit request
 * Depends on status and role
 */
export function canEditRequest(context: IActionContext): IPermissionCheckResult {
  const { request, permissions, currentUserId } = context;

  // Admin can always edit
  if (permissions.isAdmin) {
    return { allowed: true };
  }

  // Legal Admin can edit in most statuses
  if (permissions.isLegalAdmin) {
    if (request.status === RequestStatus.Completed || request.status === RequestStatus.Cancelled) {
      return {
        allowed: false,
        reason: `Cannot edit ${request.status} requests`,
      };
    }
    return { allowed: true };
  }

  // Owner can edit in Draft
  const isOwner = request.submittedBy?.id === currentUserId ||
                  request.author?.id === currentUserId;

  if (isOwner && request.status === RequestStatus.Draft) {
    return { allowed: true };
  }

  // Assigned attorney can edit legal review fields during In Review
  if (permissions.isAttorney && request.status === RequestStatus.InReview) {
    const assignedAttorneyId = request.legalReview?.assignedAttorney?.id;
    if (String(assignedAttorneyId) === String(currentUserId)) {
      return { allowed: true };
    }
  }

  // Compliance user can edit compliance review fields during In Review
  if (permissions.isComplianceUser && request.status === RequestStatus.InReview) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: 'You do not have permission to edit this request',
  };
}

/**
 * Check if all required reviews are complete
 * Returns next status based on review outcomes
 */
export interface IReviewCompletionResult {
  allReviewsComplete: boolean;
  legalReviewRequired: boolean;
  legalReviewComplete: boolean;
  complianceReviewRequired: boolean;
  complianceReviewComplete: boolean;
  hasNotApprovedOutcome: boolean;
  nextStatus: RequestStatus | undefined;
}

export function checkReviewCompletion(request: ILegalRequest): IReviewCompletionResult {
  const reviewAudience = request.reviewAudience;

  // Determine which reviews are required
  const legalReviewRequired = reviewAudience === ReviewAudience.Legal || reviewAudience === ReviewAudience.Both;
  const complianceReviewRequired = reviewAudience === ReviewAudience.Compliance || reviewAudience === ReviewAudience.Both;

  // Check review completion status
  const legalReviewStatus = request.legalReview?.status || request.legalReviewStatus;
  const complianceReviewStatus = request.complianceReview?.status || request.complianceReviewStatus;

  const legalReviewComplete = !legalReviewRequired || legalReviewStatus === 'Completed';
  const complianceReviewComplete = !complianceReviewRequired || complianceReviewStatus === 'Completed';

  // Check for "Not Approved" outcome - if any review is Not Approved, skip to Completed
  const legalOutcome = request.legalReview?.outcome || request.legalReviewOutcome;
  const complianceOutcome = request.complianceReview?.outcome || request.complianceReviewOutcome;

  const hasNotApprovedOutcome =
    legalOutcome === 'Not Approved' || complianceOutcome === 'Not Approved';

  const allReviewsComplete = legalReviewComplete && complianceReviewComplete;

  // Determine next status
  let nextStatus: RequestStatus | undefined;
  if (allReviewsComplete) {
    if (hasNotApprovedOutcome) {
      // Skip Closeout, go directly to Completed
      nextStatus = RequestStatus.Completed;
    } else {
      // Normal flow to Closeout
      nextStatus = RequestStatus.Closeout;
    }
  }

  return {
    allReviewsComplete,
    legalReviewRequired,
    legalReviewComplete,
    complianceReviewRequired,
    complianceReviewComplete,
    hasNotApprovedOutcome,
    nextStatus,
  };
}

/**
 * Check if user can override review audience (Legal Admin only during Legal Intake)
 * Who can perform: LegalAdmin, Admin
 * Valid from status: Legal Intake
 */
export function canOverrideReviewAudience(context: IActionContext): IPermissionCheckResult {
  const { request, permissions } = context;

  // Check status - can only override during Legal Intake
  if (request.status !== RequestStatus.LegalIntake) {
    return {
      allowed: false,
      reason: `Review audience can only be changed during Legal Intake (current: ${request.status})`,
    };
  }

  // Check permissions - only Legal Admin or Admin
  if (!permissions.isLegalAdmin && !permissions.isAdmin) {
    return {
      allowed: false,
      reason: 'Only Legal Admin or Admin can override review audience',
    };
  }

  return { allowed: true };
}

/**
 * Get all available actions for current user and request
 */
export interface IAvailableActions {
  canSaveDraft: boolean;
  canSubmit: boolean;
  canAssignAttorney: boolean;
  canSendToCommittee: boolean;
  canCommitteeAssign: boolean;
  canSubmitLegalReview: boolean;
  canSubmitComplianceReview: boolean;
  canCloseout: boolean;
  canCompleteFINRADocuments: boolean;
  canCancel: boolean;
  canHold: boolean;
  canResume: boolean;
  canEdit: boolean;
  canOverrideReviewAudience: boolean;
}

/**
 * Get all available actions for the current context
 */
export function getAvailableActions(context: IActionContext): IAvailableActions {
  return {
    canSaveDraft: canSaveDraft(context).allowed,
    canSubmit: canSubmitRequest(context).allowed,
    canAssignAttorney: canAssignAttorney(context).allowed,
    canSendToCommittee: canSendToCommittee(context).allowed,
    canCommitteeAssign: canCommitteeAssignAttorney(context).allowed,
    canSubmitLegalReview: canSubmitLegalReview(context).allowed,
    canSubmitComplianceReview: canSubmitComplianceReview(context).allowed,
    canCloseout: canCloseoutRequest(context).allowed,
    canCompleteFINRADocuments: canCompleteFINRADocuments(context).allowed,
    canCancel: canCancelRequest(context).allowed,
    canHold: canHoldRequest(context).allowed,
    canResume: canResumeRequest(context).allowed,
    canEdit: canEditRequest(context).allowed,
    canOverrideReviewAudience: canOverrideReviewAudience(context).allowed,
  };
}

/**
 * Log permission check for audit trail
 */
export function logPermissionCheck(
  action: string,
  context: IActionContext,
  result: IPermissionCheckResult
): void {
  if (result.allowed) {
    SPContext.logger.info(`Permission granted: ${action}`, {
      userId: context.currentUserId,
      requestId: context.request.requestId,
      status: context.request.status,
    });
  } else {
    SPContext.logger.warn(`Permission denied: ${action}`, {
      userId: context.currentUserId,
      requestId: context.request.requestId,
      status: context.request.status,
      reason: result.reason,
    });
  }
}

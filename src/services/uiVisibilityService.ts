/**
 * UI Visibility Service
 *
 * Centralized service for determining UI element visibility and state.
 * This makes it easy to debug and maintain show/hide/enable/disable logic.
 *
 * Usage:
 *   const visibility = getUIVisibility(status, permissions, isOwner, isDirty);
 *   if (visibility.buttons.saveAsDraft.visible) { ... }
 *   if (visibility.buttons.saveAsDraft.enabled) { ... }
 */

import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import type { ILegalRequest } from '@appTypes/index';
import { RequestStatus } from '@appTypes/workflowTypes';
import type { IUserPermissions } from '@hooks/usePermissions';

/**
 * UI element state
 */
export interface IUIElementState {
  /** Whether the element should be rendered */
  visible: boolean;
  /** Whether the element is enabled (not disabled) */
  enabled: boolean;
  /** Reason for disabled state (for tooltips) */
  disabledReason?: string;
}

/**
 * Button visibility configuration
 */
export interface IButtonVisibility {
  // Draft actions
  saveAsDraft: IUIElementState;
  submitRequest: IUIElementState;

  // General actions
  save: IUIElementState;
  close: IUIElementState;

  // Workflow actions
  onHold: IUIElementState;
  resume: IUIElementState;
  cancelRequest: IUIElementState;

  // Legal Intake actions
  assignAttorney: IUIElementState;
  sendToCommittee: IUIElementState;

  // Closeout actions
  submitCloseout: IUIElementState;
  completeFINRADocuments: IUIElementState;

  // Review resubmission actions
  resubmitForReview: IUIElementState;
}

/**
 * Field visibility configuration
 */
export interface IFieldVisibility {
  // Request Summary fields
  requestInfo: {
    canEdit: boolean;
    reason?: string;
  };

  // Legal Intake fields
  legalIntake: {
    canView: boolean;
    canEditAttorney: boolean;
    canEditNotes: boolean;
    canEditReviewAudience: boolean;
  };

  // Legal Review fields
  legalReview: {
    canView: boolean;
    canEdit: boolean;
    reason?: string;
  };

  // Compliance Review fields
  complianceReview: {
    canView: boolean;
    canEdit: boolean;
    reason?: string;
  };

  // Closeout fields
  closeout: {
    canView: boolean;
    canEdit: boolean;
    reason?: string;
  };

  // FINRA Documents
  finra: {
    canView: boolean;
    canEdit: boolean;
    reason?: string;
  };

  // Attachments
  attachments: {
    canView: boolean;
    canAdd: boolean;
    canDelete: boolean;
    reason?: string;
  };
}

/**
 * Card visibility configuration
 */
export interface ICardVisibility {
  requestSummary: IUIElementState;
  requestDocuments: IUIElementState;
  requestApprovals: IUIElementState;
  legalIntake: IUIElementState;
  legalReview: IUIElementState;
  complianceReview: IUIElementState;
  closeout: IUIElementState;
}

/**
 * Complete UI visibility state
 */
export interface IUIVisibility {
  buttons: IButtonVisibility;
  fields: IFieldVisibility;
  cards: ICardVisibility;
}

/**
 * Context for visibility calculations
 */
export interface IVisibilityContext {
  status: RequestStatus;
  permissions: IUserPermissions;
  isOwner: boolean;
  isNewRequest: boolean;
  isDirty: boolean;
  isAssignedAttorney: boolean;
  hasAssignedAttorney: boolean;
  legalReviewRequired: boolean;
  complianceReviewRequired: boolean;
  legalReviewCompleted: boolean;
  complianceReviewCompleted: boolean;
  isWaitingOnSubmitter: boolean;
}

/**
 * Default disabled element state
 */
function hidden(): IUIElementState {
  return { visible: false, enabled: false };
}

/**
 * Default visible and enabled element state
 */
function enabled(): IUIElementState {
  return { visible: true, enabled: true };
}

/**
 * Visible but disabled element state
 */
function disabled(reason: string): IUIElementState {
  return { visible: true, enabled: false, disabledReason: reason };
}

function canManageCloseout(ctx: IVisibilityContext): boolean {
  const { status, permissions, isOwner } = ctx;
  return status === RequestStatus.Closeout && (permissions.isAdmin || permissions.isLegalAdmin || isOwner);
}

function canManageFINRADocuments(ctx: IVisibilityContext): boolean {
  const { status, permissions, isOwner } = ctx;
  return status === RequestStatus.AwaitingFINRADocuments && (permissions.isAdmin || isOwner);
}

/**
 * Get button visibility based on context
 */
export function getButtonVisibility(ctx: IVisibilityContext): IButtonVisibility {
  const { status, permissions, isOwner, isNewRequest, isDirty, hasAssignedAttorney } = ctx;
  const isAdmin = permissions.isAdmin;
  const isLegalAdmin = permissions.isLegalAdmin;
  const isAttorneyAssigner = permissions.isAttorneyAssigner;

  // Terminal statuses - only Close button
  if (status === RequestStatus.Completed || status === RequestStatus.Cancelled) {
    return {
      saveAsDraft: hidden(),
      submitRequest: hidden(),
      save: hidden(),
      close: enabled(),
      onHold: hidden(),
      resume: hidden(),
      cancelRequest: hidden(),
      assignAttorney: hidden(),
      sendToCommittee: hidden(),
      submitCloseout: hidden(),
      completeFINRADocuments: hidden(),
      resubmitForReview: hidden(),
    };
  }

  // On Hold - show Resume
  if (status === RequestStatus.OnHold) {
    return {
      saveAsDraft: hidden(),
      submitRequest: hidden(),
      save: hidden(),
      close: enabled(),
      onHold: hidden(),
      resume: isAdmin || isLegalAdmin ? enabled() : hidden(),
      cancelRequest: isAdmin || isLegalAdmin ? enabled() : hidden(),
      assignAttorney: hidden(),
      sendToCommittee: hidden(),
      submitCloseout: hidden(),
      completeFINRADocuments: hidden(),
      resubmitForReview: hidden(),
    };
  }

  // New Request (not yet saved)
  if (isNewRequest) {
    const canCreate = permissions.isSubmitter || isAdmin;
    return {
      saveAsDraft: canCreate
        ? (isDirty ? enabled() : disabled('No changes to save'))
        : hidden(),
      submitRequest: canCreate ? enabled() : hidden(),
      save: hidden(),
      close: enabled(),
      onHold: hidden(),
      resume: hidden(),
      cancelRequest: hidden(),
      assignAttorney: hidden(),
      sendToCommittee: hidden(),
      submitCloseout: hidden(),
      completeFINRADocuments: hidden(),
      resubmitForReview: hidden(),
    };
  }

  // Draft status
  if (status === RequestStatus.Draft) {
    const canEdit = isOwner || isAdmin;
    return {
      saveAsDraft: canEdit
        ? (isDirty ? enabled() : disabled('No changes to save'))
        : hidden(),
      submitRequest: canEdit ? enabled() : hidden(),
      save: hidden(),
      close: enabled(),
      onHold: hidden(),
      resume: hidden(),
      cancelRequest: canEdit ? enabled() : hidden(),
      assignAttorney: hidden(),
      sendToCommittee: hidden(),
      submitCloseout: hidden(),
      completeFINRADocuments: hidden(),
      resubmitForReview: hidden(),
    };
  }

  // Legal Intake status
  // Save is hidden: Legal Admin's changes (attorney, review audience, notes) are stored in
  // legalIntakeStore local state and saved via dedicated card footer buttons (Assign Attorney,
  // Send to Committee, edit-mode Save Changes). The global Save button is not connected to those.
  // OnHold/Cancel = Admin, LegalAdmin, Owner
  if (status === RequestStatus.LegalIntake) {
    const canEditIntake = isAdmin || isLegalAdmin;
    const canProceedToReview = !ctx.legalReviewRequired || hasAssignedAttorney;
    return {
      saveAsDraft: hidden(),
      submitRequest: hidden(),
      save: hidden(),
      close: enabled(),
      onHold: isAdmin || isLegalAdmin || isOwner ? enabled() : hidden(),
      resume: hidden(),
      cancelRequest: isOwner || isAdmin || isLegalAdmin ? enabled() : hidden(),
      assignAttorney: canEditIntake && canProceedToReview
        ? enabled()
        : (canEditIntake ? disabled('Select an attorney first') : hidden()),
      sendToCommittee: canEditIntake ? enabled() : hidden(),
      submitCloseout: hidden(),
      completeFINRADocuments: hidden(),
      resubmitForReview: hidden(),
    };
  }

  // Assign Attorney status (committee stage)
  // Per docs: No Save listed for Owner; OnHold/Cancel = Admin, LegalAdmin, Owner
  if (status === RequestStatus.AssignAttorney) {
    const canAssign = isAdmin || isAttorneyAssigner;
    const canProceedToReview = !ctx.legalReviewRequired || hasAssignedAttorney;
    return {
      saveAsDraft: hidden(),
      submitRequest: hidden(),
      save: canAssign && isDirty ? enabled() : hidden(),
      close: enabled(),
      onHold: isAdmin || isLegalAdmin || isOwner ? enabled() : hidden(),
      resume: hidden(),
      cancelRequest: isAdmin || isLegalAdmin || isOwner ? enabled() : hidden(),
      assignAttorney: canAssign && canProceedToReview
        ? enabled()
        : (canAssign ? disabled('Select an attorney first') : hidden()),
      sendToCommittee: hidden(),
      submitCloseout: hidden(),
      completeFINRADocuments: hidden(),
      resubmitForReview: hidden(),
    };
  }

  // In Review status
  // Per docs: Save = Admin, LegalAdmin, Owner (general); review-specific Submit in card footers
  // OnHold/Cancel = Admin, LegalAdmin, Owner
  // resubmitForReview: handled inside LegalReviewForm/ComplianceReviewForm card footers, not here
  if (status === RequestStatus.InReview) {
    const canSave = isAdmin || isLegalAdmin || isOwner;
    return {
      saveAsDraft: hidden(),
      submitRequest: hidden(),
      save: canSave && isDirty ? enabled() : hidden(),
      close: enabled(),
      onHold: isAdmin || isLegalAdmin || isOwner ? enabled() : hidden(),
      resume: hidden(),
      cancelRequest: isAdmin || isLegalAdmin || isOwner ? enabled() : hidden(),
      assignAttorney: hidden(),
      sendToCommittee: hidden(),
      submitCloseout: hidden(),
      completeFINRADocuments: hidden(),
      resubmitForReview: hidden(),
    };
  }

  // Closeout status
  if (status === RequestStatus.Closeout) {
    const canCloseout = canManageCloseout(ctx);
    return {
      saveAsDraft: hidden(),
      submitRequest: hidden(),
      save: canCloseout && isDirty ? enabled() : hidden(),
      close: enabled(),
      onHold: canCloseout ? enabled() : hidden(),
      resume: hidden(),
      cancelRequest: canCloseout ? enabled() : hidden(),
      assignAttorney: hidden(),
      sendToCommittee: hidden(),
      submitCloseout: canCloseout ? enabled() : hidden(),
      completeFINRADocuments: hidden(),
      resubmitForReview: hidden(),
    };
  }

  // Awaiting FINRA Documents status
  if (status === RequestStatus.AwaitingFINRADocuments) {
    const canCompleteFINRA = canManageFINRADocuments(ctx);
    return {
      saveAsDraft: hidden(),
      submitRequest: hidden(),
      save: hidden(),
      close: enabled(),
      onHold: hidden(),
      resume: hidden(),
      cancelRequest: hidden(),
      assignAttorney: hidden(),
      sendToCommittee: hidden(),
      submitCloseout: hidden(),
      completeFINRADocuments: canCompleteFINRA ? enabled() : hidden(),
      resubmitForReview: hidden(),
    };
  }

  // Default fallback
  return {
    saveAsDraft: hidden(),
    submitRequest: hidden(),
    save: hidden(),
    close: enabled(),
    onHold: hidden(),
    resume: hidden(),
    cancelRequest: hidden(),
    assignAttorney: hidden(),
    sendToCommittee: hidden(),
    submitCloseout: hidden(),
    completeFINRADocuments: hidden(),
    resubmitForReview: hidden(),
  };
}

/**
 * Get field visibility based on context
 */
export function getFieldVisibility(ctx: IVisibilityContext): IFieldVisibility {
  const { status, permissions, isOwner, isNewRequest, isWaitingOnSubmitter } = ctx;
  const isAdmin = permissions.isAdmin;
  const isLegalAdmin = permissions.isLegalAdmin;
  const isAttorney = permissions.isAttorney;
  const isComplianceUser = permissions.isComplianceUser;

  // Terminal statuses - everything readonly
  const isTerminal = status === RequestStatus.Completed || status === RequestStatus.Cancelled;

  // Check if before closeout (can edit attachments)
  const isBeforeCloseout = status !== RequestStatus.Closeout &&
                           status !== RequestStatus.Completed &&
                           status !== RequestStatus.Cancelled;

  return {
    // Request Summary fields
    // Per docs: Owner can edit request info until Closeout; Admin can always edit
    requestInfo: {
      canEdit: !isTerminal &&
               status !== RequestStatus.Closeout &&
               status !== RequestStatus.AwaitingFINRADocuments &&
               (isNewRequest || isOwner || isAdmin || isLegalAdmin),
      reason: isTerminal ? 'Request is closed' :
              status === RequestStatus.Closeout || status === RequestStatus.AwaitingFINRADocuments ? 'Cannot edit after Closeout' :
              !isOwner && !isAdmin && !isLegalAdmin ? 'Only owner, Legal Admin, or admin can edit' : undefined,
    },

    // Legal Intake fields
    legalIntake: {
      canView: status !== RequestStatus.Draft || isAdmin || isLegalAdmin,
      canEditAttorney: !isTerminal && (status === RequestStatus.LegalIntake || status === RequestStatus.AssignAttorney) &&
                       (isAdmin || isLegalAdmin || permissions.isAttorneyAssigner),
      canEditNotes: !isTerminal && (status === RequestStatus.LegalIntake || status === RequestStatus.AssignAttorney) &&
                    (isAdmin || isLegalAdmin || permissions.isAttorneyAssigner),
      canEditReviewAudience: !isTerminal && status === RequestStatus.LegalIntake && (isAdmin || isLegalAdmin),
    },

    // Legal Review fields
    legalReview: {
      canView: ctx.legalReviewRequired &&
               (status === RequestStatus.InReview ||
                status === RequestStatus.Closeout ||
                status === RequestStatus.Completed),
      canEdit: !isTerminal &&
               status === RequestStatus.InReview &&
               !ctx.legalReviewCompleted &&
               (isAdmin || isLegalAdmin || isAttorney),
      reason: ctx.legalReviewCompleted ? 'Legal review already completed' :
              !isAttorney && !isAdmin && !isLegalAdmin ? 'Only attorneys, Legal Admin, or admin can submit' :
              undefined,
    },

    // Compliance Review fields
    complianceReview: {
      canView: ctx.complianceReviewRequired &&
               (status === RequestStatus.InReview ||
                status === RequestStatus.Closeout ||
                status === RequestStatus.Completed),
      canEdit: !isTerminal &&
               status === RequestStatus.InReview &&
               !ctx.complianceReviewCompleted &&
               (isAdmin || isComplianceUser),
      reason: ctx.complianceReviewCompleted ? 'Compliance review already completed' :
              !isAdmin && !isComplianceUser ? 'Only compliance user can submit' :
              undefined,
    },

    // Closeout fields
    closeout: {
      canView: status === RequestStatus.Closeout || status === RequestStatus.Completed,
      canEdit: !isTerminal && canManageCloseout(ctx),
      reason: status === RequestStatus.Completed ? 'Request already completed' :
              status !== RequestStatus.Closeout ? 'Closeout is only editable during Closeout status' :
              !isAdmin && !isLegalAdmin && !isOwner ? 'Only the submitter, Legal Admin, or admin can closeout' :
              undefined,
    },

    finra: {
      canView: status === RequestStatus.AwaitingFINRADocuments || status === RequestStatus.Completed,
      canEdit: !isTerminal && canManageFINRADocuments(ctx),
      reason: status === RequestStatus.Completed ? 'Request already completed' :
              status !== RequestStatus.AwaitingFINRADocuments ? 'FINRA documents are only editable during Awaiting FINRA Documents' :
              !isAdmin && !isOwner ? 'Only the submitter or admin can manage FINRA documents' :
              undefined,
    },

    // Attachments
    attachments: {
      canView: true,
      canAdd: !isTerminal && (
        // Submitter/Admin can add attachments on an unsaved new request
        (isNewRequest && (permissions.isSubmitter || isAdmin)) ||
        // Owner can add in Draft
        (status === RequestStatus.Draft && (isOwner || isAdmin)) ||
        // Owner can respond to reviewer comments while waiting on submitter
        (status === RequestStatus.InReview && isOwner && isWaitingOnSubmitter) ||
        // LegalAdmin, Attorney, Compliance can add before closeout
        (isBeforeCloseout && (isAdmin || isLegalAdmin || isAttorney || isComplianceUser))
      ),
      canDelete: !isTerminal && (
        // Submitter/Admin can remove staged attachments on an unsaved new request
        (isNewRequest && (permissions.isSubmitter || isAdmin)) ||
        // Owner can delete in Draft
        (status === RequestStatus.Draft && (isOwner || isAdmin)) ||
        // Owner can update attachments while responding to reviewer comments
        (status === RequestStatus.InReview && isOwner && isWaitingOnSubmitter) ||
        // Admin, LegalAdmin can delete anytime before closeout
        (isBeforeCloseout && (isAdmin || isLegalAdmin))
      ),
      reason: isTerminal ? 'Request is closed' :
              status === RequestStatus.Closeout ? 'Cannot modify attachments in Closeout' :
              undefined,
    },
  };
}

/**
 * Get card visibility based on context
 */
export function getCardVisibility(ctx: IVisibilityContext): ICardVisibility {
  const { status, permissions, legalReviewRequired, complianceReviewRequired } = ctx;
  const isAdmin = permissions.isAdmin;
  const isLegalAdmin = permissions.isLegalAdmin;

  const showLegalIntake = status !== RequestStatus.Draft || isAdmin || isLegalAdmin;
  const showReviewCards = status === RequestStatus.InReview ||
                          status === RequestStatus.Closeout ||
                          status === RequestStatus.Completed;
  const showCloseout = status === RequestStatus.Closeout || status === RequestStatus.Completed;

  return {
    requestSummary: enabled(),
    requestDocuments: enabled(),
    requestApprovals: enabled(),
    legalIntake: showLegalIntake ? enabled() : hidden(),
    legalReview: showReviewCards && legalReviewRequired ? enabled() : hidden(),
    complianceReview: showReviewCards && complianceReviewRequired ? enabled() : hidden(),
    closeout: showCloseout ? enabled() : hidden(),
  };
}

/**
 * Get complete UI visibility
 */
export function getUIVisibility(ctx: IVisibilityContext): IUIVisibility {
  return {
    buttons: getButtonVisibility(ctx),
    fields: getFieldVisibility(ctx),
    cards: getCardVisibility(ctx),
  };
}

/**
 * Create visibility context from request and permissions
 * Helper function for components
 */
export function createVisibilityContext(
  status: RequestStatus | undefined,
  permissions: IUserPermissions,
  currentUserId: string,
  request?: Partial<ILegalRequest>,
  options?: {
    isDirty?: boolean;
    isNewRequest?: boolean;
  }
): IVisibilityContext {
  const isOwner = request ? (
    String(request.submittedBy?.id ?? '') === currentUserId ||
    String(request.author?.id ?? '') === currentUserId
  ) : false;

  const assignedAttorneys = request?.legalReview?.assignedAttorney?.length
    ? request.legalReview.assignedAttorney
    : request?.attorney;
  const isAssignedAttorney = assignedAttorneys?.some(
    a => String(a.id) === currentUserId
  ) ?? false;
  const hasAssignedAttorney = (assignedAttorneys?.length ?? 0) > 0;

  const reviewAudience = request?.reviewAudience || '';
  const legalReviewRequired = reviewAudience === 'Legal' || reviewAudience === 'Both';
  const complianceReviewRequired = reviewAudience === 'Compliance' || reviewAudience === 'Both';

  const legalReviewCompleted =
    request?.legalReview?.status === 'Completed' ||
    request?.legalReviewStatus === 'Completed';
  const complianceReviewCompleted =
    request?.complianceReview?.status === 'Completed' ||
    request?.complianceReviewStatus === 'Completed';
  const isWaitingOnSubmitter =
    request?.legalReview?.status === 'Waiting On Submitter' ||
    request?.legalReviewStatus === 'Waiting On Submitter' ||
    request?.complianceReview?.status === 'Waiting On Submitter' ||
    request?.complianceReviewStatus === 'Waiting On Submitter';

  return {
    status: status || RequestStatus.Draft,
    permissions,
    isOwner,
    isNewRequest: options?.isNewRequest ?? !request,
    isDirty: options?.isDirty ?? false,
    isAssignedAttorney,
    hasAssignedAttorney,
    legalReviewRequired,
    complianceReviewRequired,
    legalReviewCompleted,
    complianceReviewCompleted,
    isWaitingOnSubmitter,
  };
}

/**
 * Debug helper - logs visibility state using SPContext.logger
 *
 * Uses debug level so it only appears when log level is set to Verbose.
 */
export function debugVisibility(ctx: IVisibilityContext): void {
  const visibility = getUIVisibility(ctx);

  SPContext.logger.debug('UI Visibility Debug - Context', {
    status: ctx.status,
    isOwner: ctx.isOwner,
    isNewRequest: ctx.isNewRequest,
    isDirty: ctx.isDirty,
    hasAssignedAttorney: ctx.hasAssignedAttorney,
    isAssignedAttorney: ctx.isAssignedAttorney,
    isWaitingOnSubmitter: ctx.isWaitingOnSubmitter,
  });

  SPContext.logger.debug('UI Visibility Debug - Permissions', {
    isAdmin: ctx.permissions.isAdmin,
    isLegalAdmin: ctx.permissions.isLegalAdmin,
    isAttorneyAssigner: ctx.permissions.isAttorneyAssigner,
    isAttorney: ctx.permissions.isAttorney,
    isComplianceUser: ctx.permissions.isComplianceUser,
    isSubmitter: ctx.permissions.isSubmitter,
  });

  SPContext.logger.debug('UI Visibility Debug - Visibility', {
    buttons: visibility.buttons,
    fields: visibility.fields,
    cards: visibility.cards,
  });
}

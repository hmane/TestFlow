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
    };
  }

  // Legal Intake status
  if (status === RequestStatus.LegalIntake) {
    const canEditIntake = isAdmin || isLegalAdmin;
    return {
      saveAsDraft: hidden(),
      submitRequest: hidden(),
      save: canEditIntake
        ? (isDirty ? enabled() : disabled('No changes to save'))
        : hidden(),
      close: enabled(),
      onHold: canEditIntake ? enabled() : hidden(),
      resume: hidden(),
      cancelRequest: isOwner || isAdmin || isLegalAdmin ? enabled() : hidden(),
      assignAttorney: canEditIntake && hasAssignedAttorney
        ? enabled()
        : (canEditIntake ? disabled('Select an attorney first') : hidden()),
      sendToCommittee: canEditIntake ? enabled() : hidden(),
      submitCloseout: hidden(),
    };
  }

  // Assign Attorney status (committee stage)
  if (status === RequestStatus.AssignAttorney) {
    const canAssign = isAdmin || isAttorneyAssigner;
    return {
      saveAsDraft: hidden(),
      submitRequest: hidden(),
      save: canAssign
        ? (isDirty ? enabled() : disabled('No changes to save'))
        : hidden(),
      close: enabled(),
      onHold: isAdmin || isLegalAdmin ? enabled() : hidden(),
      resume: hidden(),
      cancelRequest: isAdmin || isLegalAdmin ? enabled() : hidden(),
      assignAttorney: canAssign && hasAssignedAttorney
        ? enabled()
        : (canAssign ? disabled('Select an attorney first') : hidden()),
      sendToCommittee: hidden(),
      submitCloseout: hidden(),
    };
  }

  // In Review status
  if (status === RequestStatus.InReview) {
    // Save button visible for anyone who can edit (Admin, LegalAdmin, assigned attorney, compliance)
    const canSave = isAdmin || isLegalAdmin || ctx.isAssignedAttorney || permissions.isComplianceUser;
    return {
      saveAsDraft: hidden(),
      submitRequest: hidden(),
      save: canSave
        ? (isDirty ? enabled() : disabled('No changes to save'))
        : hidden(),
      close: enabled(),
      onHold: isAdmin || isLegalAdmin ? enabled() : hidden(),
      resume: hidden(),
      cancelRequest: isAdmin || isLegalAdmin ? enabled() : hidden(),
      assignAttorney: hidden(),
      sendToCommittee: hidden(),
      submitCloseout: hidden(),
    };
  }

  // Closeout status
  if (status === RequestStatus.Closeout) {
    const canCloseout = isAdmin || isLegalAdmin;
    return {
      saveAsDraft: hidden(),
      submitRequest: hidden(),
      save: canCloseout
        ? (isDirty ? enabled() : disabled('No changes to save'))
        : hidden(),
      close: enabled(),
      onHold: canCloseout ? enabled() : hidden(),
      resume: hidden(),
      cancelRequest: canCloseout ? enabled() : hidden(),
      assignAttorney: hidden(),
      sendToCommittee: hidden(),
      submitCloseout: canCloseout ? enabled() : hidden(),
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
  };
}

/**
 * Get field visibility based on context
 */
export function getFieldVisibility(ctx: IVisibilityContext): IFieldVisibility {
  const { status, permissions, isOwner, isNewRequest, isAssignedAttorney } = ctx;
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
    requestInfo: {
      canEdit: !isTerminal && (isNewRequest || status === RequestStatus.Draft) && (isOwner || isAdmin),
      reason: isTerminal ? 'Request is closed' :
              status !== RequestStatus.Draft ? 'Can only edit in Draft status' :
              !isOwner && !isAdmin ? 'Only owner or admin can edit' : undefined,
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
               (isAdmin || isLegalAdmin || (isAttorney && isAssignedAttorney)),
      reason: ctx.legalReviewCompleted ? 'Legal review already completed' :
              !isAssignedAttorney && !isAdmin && !isLegalAdmin ? 'Only assigned attorney can submit' :
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
      canEdit: !isTerminal && status === RequestStatus.Closeout && (isAdmin || isLegalAdmin),
      reason: status === RequestStatus.Completed ? 'Request already completed' :
              !isAdmin && !isLegalAdmin ? 'Only Legal Admin can closeout' :
              undefined,
    },

    // Attachments
    attachments: {
      canView: true,
      canAdd: !isTerminal && (
        // Owner can add in Draft
        (status === RequestStatus.Draft && (isOwner || isAdmin)) ||
        // LegalAdmin, Attorney, Compliance can add before closeout
        (isBeforeCloseout && (isAdmin || isLegalAdmin || isAttorney || isComplianceUser))
      ),
      canDelete: !isTerminal && (
        // Owner can delete in Draft
        (status === RequestStatus.Draft && (isOwner || isAdmin)) ||
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
  request?: {
    submittedBy?: { id: string };
    author?: { id: string };
    legalReview?: {
      assignedAttorney?: { id: string };
      status?: string;
    };
    complianceReview?: {
      status?: string;
    };
    reviewAudience?: string;
  }
): IVisibilityContext {
  const isOwner = request ? (
    String(request.submittedBy?.id ?? '') === currentUserId ||
    String(request.author?.id ?? '') === currentUserId
  ) : false;

  const isAssignedAttorney = String(request?.legalReview?.assignedAttorney?.id ?? '') === currentUserId;
  const hasAssignedAttorney = !!request?.legalReview?.assignedAttorney?.id;

  const reviewAudience = request?.reviewAudience || '';
  const legalReviewRequired = reviewAudience === 'Legal' || reviewAudience === 'Both';
  const complianceReviewRequired = reviewAudience === 'Compliance' || reviewAudience === 'Both';

  const legalReviewCompleted = request?.legalReview?.status === 'Completed';
  const complianceReviewCompleted = request?.complianceReview?.status === 'Completed';

  return {
    status: status || RequestStatus.Draft,
    permissions,
    isOwner,
    isNewRequest: !request,
    isDirty: false, // Caller should set this
    isAssignedAttorney,
    hasAssignedAttorney,
    legalReviewRequired,
    complianceReviewRequired,
    legalReviewCompleted,
    complianceReviewCompleted,
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

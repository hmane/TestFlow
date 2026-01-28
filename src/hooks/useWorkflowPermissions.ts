/**
 * Custom hook for workflow permissions
 * Provides permission-aware workflow actions and availability checks
 */

import * as React from 'react';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import { useRequestStore } from '@stores/index';
import { useShallow } from 'zustand/react/shallow';
import { usePermissions } from '@hooks/usePermissions';
import type { IPrincipal } from '@appTypes/index';
import type { ReviewOutcome } from '@appTypes/workflowTypes';
import {
  canAssignAttorney,
  canSendToCommittee,
  canCommitteeAssignAttorney,
  canSubmitLegalReview,
  canSubmitComplianceReview,
  canCloseoutRequest,
  canCancelRequest,
  canHoldRequest,
  canResumeRequest,
  canSaveDraft,
  canSubmitRequest,
  canEditRequest,
  getAvailableActions,
  logPermissionCheck,
  type IActionContext,
  type IAvailableActions,
  type IPermissionCheckResult,
} from '@services/workflowPermissionService';
import {
  assignAttorneySchema,
  sendToCommitteeSchema,
  committeeAssignAttorneySchema,
  submitLegalReviewSchema,
  submitComplianceReviewSchema,
  closeoutRequestSchema,
  cancelRequestSchema,
  holdRequestSchema,
  resumeRequestSchema,
} from '@schemas/workflowSchema';

/**
 * Workflow permissions hook result
 */
export interface IWorkflowPermissionsResult {
  // Available actions
  availableActions: IAvailableActions;

  // Permission-aware action handlers
  assignAttorney: (attorney: IPrincipal, notes?: string) => Promise<IPermissionCheckResult>;
  sendToCommittee: (notes?: string) => Promise<IPermissionCheckResult>;
  committeeAssignAttorney: (attorney: IPrincipal, notes?: string) => Promise<IPermissionCheckResult>;
  submitLegalReview: (outcome: ReviewOutcome, notes: string) => Promise<IPermissionCheckResult>;
  submitComplianceReview: (
    outcome: ReviewOutcome,
    notes: string,
    isForesideReviewRequired: boolean,
    isRetailUse: boolean
  ) => Promise<IPermissionCheckResult>;
  closeoutRequest: (options?: { trackingId?: string; commentsAcknowledged?: boolean; closeoutNotes?: string }) => Promise<IPermissionCheckResult>;
  completeFINRADocuments: (notes?: string) => Promise<IPermissionCheckResult>;
  cancelRequest: (reason: string) => Promise<IPermissionCheckResult>;
  holdRequest: (reason: string) => Promise<IPermissionCheckResult>;
  resumeRequest: () => Promise<IPermissionCheckResult>;

  // Permission check utilities
  checkPermission: (action: string) => IPermissionCheckResult;

  // State
  isProcessing: boolean;
  error?: string;
  isLoading: boolean;
}

/**
 * Custom hook for permission-aware workflow actions
 */
export function useWorkflowPermissions(): IWorkflowPermissionsResult {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>(undefined);

  const {
    currentRequest,
    itemId,
    isLoading: storeIsLoading,
    assignAttorney: storeAssignAttorney,
    sendToCommittee: storeSendToCommittee,
    submitLegalReview: storeSubmitLegalReview,
    submitComplianceReview: storeSubmitComplianceReview,
    closeoutRequest: storeCloseoutRequest,
    cancelRequest: storeCancelRequest,
    holdRequest: storeHoldRequest,
    resumeRequest: storeResumeRequest,
    completeFINRADocuments: storeCompleteFINRADocuments,
  } = useRequestStore(
    useShallow((s) => ({
      currentRequest: s.currentRequest,
      itemId: s.itemId,
      isLoading: s.isLoading,
      assignAttorney: s.assignAttorney,
      sendToCommittee: s.sendToCommittee,
      submitLegalReview: s.submitLegalReview,
      submitComplianceReview: s.submitComplianceReview,
      closeoutRequest: s.closeoutRequest,
      cancelRequest: s.cancelRequest,
      holdRequest: s.holdRequest,
      resumeRequest: s.resumeRequest,
      completeFINRADocuments: s.completeFINRADocuments,
    }))
  );
  const permissions = usePermissions();

  const request = currentRequest;

  // Get current user ID
  const currentUserId = React.useMemo(() => {
    return SPContext.currentUser?.id?.toString() ?? '';
  }, []);

  // Build action context
  const actionContext = React.useMemo((): IActionContext | undefined => {
    if (!request || permissions.isLoading) {
      return undefined;
    }

    return {
      request,
      permissions,
      currentUserId,
    };
  }, [request, permissions, currentUserId]);

  // Determine if this is a new request (no itemId means not saved to SharePoint yet)
  const isNewRequest = !itemId;

  // Calculate available actions
  const availableActions = React.useMemo((): IAvailableActions => {
    // Handle new request case - user can save/submit if they have submitter permissions
    // For new requests, if permissions are still loading, default to allowing create
    // (the actual permission check happens on submit)

    if (isNewRequest) {
      const canCreate = permissions.isLoading || permissions.isSubmitter || permissions.isAdmin || permissions.isLegalAdmin;
      return {
        canSaveDraft: canCreate,
        canSubmit: canCreate,
        canAssignAttorney: false,
        canSendToCommittee: false,
        canCommitteeAssign: false,
        canSubmitLegalReview: false,
        canSubmitComplianceReview: false,
        canCloseout: false,
        canCompleteFINRADocuments: false,
        canCancel: false,
        canHold: false,
        canResume: false,
        canEdit: canCreate,
        canOverrideReviewAudience: false,
      };
    }

    if (!actionContext) {
      return {
        canSaveDraft: false,
        canSubmit: false,
        canAssignAttorney: false,
        canSendToCommittee: false,
        canCommitteeAssign: false,
        canSubmitLegalReview: false,
        canSubmitComplianceReview: false,
        canCloseout: false,
        canCompleteFINRADocuments: false,
        canCancel: false,
        canHold: false,
        canResume: false,
        canEdit: false,
        canOverrideReviewAudience: false,
      };
    }

    return getAvailableActions(actionContext);
  }, [actionContext, isNewRequest, permissions]);

  /**
   * Generic permission check
   */
  const checkPermission = React.useCallback(
    (action: string): IPermissionCheckResult => {
      if (!actionContext) {
        return { allowed: false, reason: 'Request not loaded' };
      }

      switch (action) {
        case 'assignAttorney':
          return canAssignAttorney(actionContext);
        case 'sendToCommittee':
          return canSendToCommittee(actionContext);
        case 'committeeAssignAttorney':
          return canCommitteeAssignAttorney(actionContext);
        case 'submitLegalReview':
          return canSubmitLegalReview(actionContext);
        case 'submitComplianceReview':
          return canSubmitComplianceReview(actionContext);
        case 'closeout':
          return canCloseoutRequest(actionContext);
        case 'cancel':
          return canCancelRequest(actionContext);
        case 'hold':
          return canHoldRequest(actionContext);
        case 'resume':
          return canResumeRequest(actionContext);
        case 'saveDraft':
          return canSaveDraft(actionContext);
        case 'submit':
          return canSubmitRequest(actionContext);
        case 'edit':
          return canEditRequest(actionContext);
        default:
          return { allowed: false, reason: `Unknown action: ${action}` };
      }
    },
    [actionContext]
  );

  /**
   * Assign attorney (direct assignment by Legal Admin)
   */
  const assignAttorney = React.useCallback(
    async (attorney: IPrincipal, notes?: string): Promise<IPermissionCheckResult> => {
      if (!actionContext || !itemId) {
        return { allowed: false, reason: 'Request not loaded' };
      }

      // Check permission
      const permissionCheck = canAssignAttorney(actionContext);
      logPermissionCheck('assignAttorney', actionContext, permissionCheck);

      if (!permissionCheck.allowed) {
        setError(permissionCheck.reason);
        return permissionCheck;
      }

      // Validate with schema
      const validation = assignAttorneySchema.safeParse({
        attorney,
        assignmentNotes: notes,
        currentStatus: actionContext.request.status,
      });

      if (!validation.success) {
        const errorMsg = validation.error.issues.map(i => i.message).join(', ');
        setError(errorMsg);
        return { allowed: false, reason: errorMsg };
      }

      setIsProcessing(true);
      setError(undefined);

      try {
        await storeAssignAttorney(attorney, notes);
        SPContext.logger.success('Attorney assigned', {
          attorneyId: attorney.id,
          requestId: itemId,
        });
        return { allowed: true };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        SPContext.logger.error('Failed to assign attorney', err, { itemId });
        return { allowed: false, reason: message };
      } finally {
        setIsProcessing(false);
      }
    },
    [actionContext, itemId, storeAssignAttorney]
  );

  /**
   * Send to committee for attorney assignment
   */
  const sendToCommittee = React.useCallback(
    async (notes?: string): Promise<IPermissionCheckResult> => {
      if (!actionContext || !itemId) {
        return { allowed: false, reason: 'Request not loaded' };
      }

      // Check permission
      const permissionCheck = canSendToCommittee(actionContext);
      logPermissionCheck('sendToCommittee', actionContext, permissionCheck);

      if (!permissionCheck.allowed) {
        setError(permissionCheck.reason);
        return permissionCheck;
      }

      // Validate with schema
      const validation = sendToCommitteeSchema.safeParse({
        notes,
        currentStatus: actionContext.request.status,
      });

      if (!validation.success) {
        const errorMsg = validation.error.issues.map(i => i.message).join(', ');
        setError(errorMsg);
        return { allowed: false, reason: errorMsg };
      }

      setIsProcessing(true);
      setError(undefined);

      try {
        await storeSendToCommittee(notes);
        SPContext.logger.success('Sent to committee', { requestId: itemId });
        return { allowed: true };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        SPContext.logger.error('Failed to send to committee', err, { itemId });
        return { allowed: false, reason: message };
      } finally {
        setIsProcessing(false);
      }
    },
    [actionContext, itemId, storeSendToCommittee]
  );

  /**
   * Committee assigns attorney
   */
  const committeeAssignAttorney = React.useCallback(
    async (attorney: IPrincipal, notes?: string): Promise<IPermissionCheckResult> => {
      if (!actionContext || !itemId) {
        return { allowed: false, reason: 'Request not loaded' };
      }

      // Check permission
      const permissionCheck = canCommitteeAssignAttorney(actionContext);
      logPermissionCheck('committeeAssignAttorney', actionContext, permissionCheck);

      if (!permissionCheck.allowed) {
        setError(permissionCheck.reason);
        return permissionCheck;
      }

      // Validate with schema
      const validation = committeeAssignAttorneySchema.safeParse({
        attorney,
        assignmentNotes: notes,
        currentStatus: actionContext.request.status,
      });

      if (!validation.success) {
        const errorMsg = validation.error.issues.map(i => i.message).join(', ');
        setError(errorMsg);
        return { allowed: false, reason: errorMsg };
      }

      setIsProcessing(true);
      setError(undefined);

      try {
        await storeAssignAttorney(attorney, notes);
        SPContext.logger.success('Attorney assigned by committee', {
          attorneyId: attorney.id,
          requestId: itemId,
        });
        return { allowed: true };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        SPContext.logger.error('Failed to assign attorney (committee)', err, { itemId });
        return { allowed: false, reason: message };
      } finally {
        setIsProcessing(false);
      }
    },
    [actionContext, itemId, storeAssignAttorney]
  );

  /**
   * Submit legal review
   */
  const submitLegalReview = React.useCallback(
    async (outcome: ReviewOutcome, notes: string): Promise<IPermissionCheckResult> => {
      if (!actionContext || !itemId) {
        return { allowed: false, reason: 'Request not loaded' };
      }

      // Check permission
      const permissionCheck = canSubmitLegalReview(actionContext);
      logPermissionCheck('submitLegalReview', actionContext, permissionCheck);

      if (!permissionCheck.allowed) {
        setError(permissionCheck.reason);
        return permissionCheck;
      }

      // Validate with schema
      const validation = submitLegalReviewSchema.safeParse({
        outcome,
        reviewNotes: notes,
        currentStatus: actionContext.request.status,
        assignedAttorneyId: actionContext.request.legalReview?.assignedAttorney?.id,
        currentUserId,
        isAdmin: permissions.isAdmin,
        isLegalAdmin: permissions.isLegalAdmin,
      });

      if (!validation.success) {
        const errorMsg = validation.error.issues.map(i => i.message).join(', ');
        setError(errorMsg);
        return { allowed: false, reason: errorMsg };
      }

      setIsProcessing(true);
      setError(undefined);

      try {
        await storeSubmitLegalReview(outcome, notes);
        SPContext.logger.success('Legal review submitted', {
          outcome,
          requestId: itemId,
        });
        return { allowed: true };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        SPContext.logger.error('Failed to submit legal review', err, { itemId });
        return { allowed: false, reason: message };
      } finally {
        setIsProcessing(false);
      }
    },
    [actionContext, itemId, storeSubmitLegalReview, currentUserId, permissions]
  );

  /**
   * Submit compliance review
   */
  const submitComplianceReview = React.useCallback(
    async (
      outcome: ReviewOutcome,
      notes: string,
      isForesideReviewRequired: boolean,
      isRetailUse: boolean
    ): Promise<IPermissionCheckResult> => {
      if (!actionContext || !itemId) {
        return { allowed: false, reason: 'Request not loaded' };
      }

      // Check permission
      const permissionCheck = canSubmitComplianceReview(actionContext);
      logPermissionCheck('submitComplianceReview', actionContext, permissionCheck);

      if (!permissionCheck.allowed) {
        setError(permissionCheck.reason);
        return permissionCheck;
      }

      // Validate with schema
      const validation = submitComplianceReviewSchema.safeParse({
        outcome,
        reviewNotes: notes,
        isForesideReviewRequired,
        isRetailUse,
        currentStatus: actionContext.request.status,
      });

      if (!validation.success) {
        const errorMsg = validation.error.issues.map(i => i.message).join(', ');
        setError(errorMsg);
        return { allowed: false, reason: errorMsg };
      }

      setIsProcessing(true);
      setError(undefined);

      try {
        await storeSubmitComplianceReview(outcome, notes, { isForesideReviewRequired, isRetailUse });
        SPContext.logger.success('Compliance review submitted', {
          outcome,
          requestId: itemId,
        });
        return { allowed: true };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        SPContext.logger.error('Failed to submit compliance review', err, { itemId });
        return { allowed: false, reason: message };
      } finally {
        setIsProcessing(false);
      }
    },
    [actionContext, itemId, storeSubmitComplianceReview]
  );

  /**
   * Closeout request
   */
  const closeoutRequest = React.useCallback(
    async (options?: { trackingId?: string; commentsAcknowledged?: boolean }): Promise<IPermissionCheckResult> => {
      if (!actionContext || !itemId) {
        return { allowed: false, reason: 'Request not loaded' };
      }

      // Check permission
      const permissionCheck = canCloseoutRequest(actionContext);
      logPermissionCheck('closeoutRequest', actionContext, permissionCheck);

      if (!permissionCheck.allowed) {
        setError(permissionCheck.reason);
        return permissionCheck;
      }

      // Validate with schema
      const complianceReview = actionContext.request.complianceReview;
      const validation = closeoutRequestSchema.safeParse({
        trackingId: options?.trackingId,
        currentStatus: actionContext.request.status,
        complianceReviewed: complianceReview?.status === 'Completed',
        isForesideReviewRequired: complianceReview?.isForesideReviewRequired ?? false,
        isRetailUse: complianceReview?.isRetailUse ?? false,
      });

      if (!validation.success) {
        const errorMsg = validation.error.issues.map(i => i.message).join(', ');
        setError(errorMsg);
        return { allowed: false, reason: errorMsg };
      }

      setIsProcessing(true);
      setError(undefined);

      try {
        await storeCloseoutRequest(options);
        SPContext.logger.success('Request closed out', {
          trackingId: options?.trackingId,
          commentsAcknowledged: options?.commentsAcknowledged,
          requestId: itemId,
        });
        return { allowed: true };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        SPContext.logger.error('Failed to closeout request', err, { itemId });
        return { allowed: false, reason: message };
      } finally {
        setIsProcessing(false);
      }
    },
    [actionContext, itemId, storeCloseoutRequest]
  );

  /**
   * Cancel request
   */
  const cancelRequest = React.useCallback(
    async (reason: string): Promise<IPermissionCheckResult> => {
      if (!actionContext || !itemId) {
        return { allowed: false, reason: 'Request not loaded' };
      }

      // Check permission
      const permissionCheck = canCancelRequest(actionContext);
      logPermissionCheck('cancelRequest', actionContext, permissionCheck);

      if (!permissionCheck.allowed) {
        setError(permissionCheck.reason);
        return permissionCheck;
      }

      // Validate with schema
      const validation = cancelRequestSchema.safeParse({
        cancelReason: reason,
        currentStatus: actionContext.request.status,
        isOwner:
          actionContext.request.submittedBy?.id === currentUserId ||
          actionContext.request.author?.id === currentUserId,
        isAdmin: permissions.isAdmin,
        isLegalAdmin: permissions.isLegalAdmin,
      });

      if (!validation.success) {
        const errorMsg = validation.error.issues.map(i => i.message).join(', ');
        setError(errorMsg);
        return { allowed: false, reason: errorMsg };
      }

      setIsProcessing(true);
      setError(undefined);

      try {
        await storeCancelRequest(reason);
        SPContext.logger.success('Request cancelled', { requestId: itemId });
        return { allowed: true };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        SPContext.logger.error('Failed to cancel request', err, { itemId });
        return { allowed: false, reason: message };
      } finally {
        setIsProcessing(false);
      }
    },
    [actionContext, itemId, storeCancelRequest, currentUserId, permissions]
  );

  /**
   * Put request on hold
   */
  const holdRequest = React.useCallback(
    async (reason: string): Promise<IPermissionCheckResult> => {
      if (!actionContext || !itemId) {
        return { allowed: false, reason: 'Request not loaded' };
      }

      // Check permission
      const permissionCheck = canHoldRequest(actionContext);
      logPermissionCheck('holdRequest', actionContext, permissionCheck);

      if (!permissionCheck.allowed) {
        setError(permissionCheck.reason);
        return permissionCheck;
      }

      // Validate with schema
      const validation = holdRequestSchema.safeParse({
        onHoldReason: reason,
        currentStatus: actionContext.request.status,
      });

      if (!validation.success) {
        const errorMsg = validation.error.issues.map(i => i.message).join(', ');
        setError(errorMsg);
        return { allowed: false, reason: errorMsg };
      }

      setIsProcessing(true);
      setError(undefined);

      try {
        await storeHoldRequest(reason);
        SPContext.logger.success('Request put on hold', { requestId: itemId });
        return { allowed: true };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        SPContext.logger.error('Failed to hold request', err, { itemId });
        return { allowed: false, reason: message };
      } finally {
        setIsProcessing(false);
      }
    },
    [actionContext, itemId, storeHoldRequest]
  );

  /**
   * Resume request from hold
   */
  const resumeRequest = React.useCallback(async (): Promise<IPermissionCheckResult> => {
    if (!actionContext || !itemId) {
      return { allowed: false, reason: 'Request not loaded' };
    }

    // Check permission
    const permissionCheck = canResumeRequest(actionContext);
    logPermissionCheck('resumeRequest', actionContext, permissionCheck);

    if (!permissionCheck.allowed) {
      setError(permissionCheck.reason);
      return permissionCheck;
    }

    // Validate with schema
    const validation = resumeRequestSchema.safeParse({
      currentStatus: actionContext.request.status,
      previousStatus: actionContext.request.previousStatus,
    });

    if (!validation.success) {
      const errorMsg = validation.error.issues.map(i => i.message).join(', ');
      setError(errorMsg);
      return { allowed: false, reason: errorMsg };
    }

    setIsProcessing(true);
    setError(undefined);

    try {
      await storeResumeRequest();
      SPContext.logger.success('Request resumed', { requestId: itemId });
      return { allowed: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      SPContext.logger.error('Failed to resume request', err, { itemId });
      return { allowed: false, reason: message };
    } finally {
      setIsProcessing(false);
    }
  }, [actionContext, itemId, storeResumeRequest]);

  /**
   * Complete FINRA documents (move from Awaiting FINRA Documents to Completed)
   */
  const completeFINRADocuments = React.useCallback(
    async (notes?: string): Promise<IPermissionCheckResult> => {
      if (!actionContext || !itemId) {
        return { allowed: false, reason: 'Request not loaded' };
      }

      // Check permission - only owner or admin can complete FINRA documents
      const isOwner =
        actionContext.request.submittedBy?.id === currentUserId ||
        actionContext.request.author?.id === currentUserId;

      if (!isOwner && !permissions.isAdmin) {
        const result = { allowed: false, reason: 'Only the submitter or admin can complete FINRA documents' };
        logPermissionCheck('completeFINRADocuments', actionContext, result);
        setError(result.reason);
        return result;
      }

      // Validate current status
      if (actionContext.request.status !== 'Awaiting FINRA Documents') {
        const result = { allowed: false, reason: 'Request is not in Awaiting FINRA Documents status' };
        logPermissionCheck('completeFINRADocuments', actionContext, result);
        setError(result.reason);
        return result;
      }

      logPermissionCheck('completeFINRADocuments', actionContext, { allowed: true });

      setIsProcessing(true);
      setError(undefined);

      try {
        await storeCompleteFINRADocuments(notes);
        SPContext.logger.success('FINRA documents completed', { requestId: itemId });
        return { allowed: true };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        SPContext.logger.error('Failed to complete FINRA documents', err, { itemId });
        return { allowed: false, reason: message };
      } finally {
        setIsProcessing(false);
      }
    },
    [actionContext, itemId, storeCompleteFINRADocuments, currentUserId, permissions]
  );

  return {
    availableActions,
    assignAttorney,
    sendToCommittee,
    committeeAssignAttorney,
    submitLegalReview,
    submitComplianceReview,
    closeoutRequest,
    completeFINRADocuments,
    cancelRequest,
    holdRequest,
    resumeRequest,
    checkPermission,
    isProcessing,
    error,
    isLoading: permissions.isLoading || storeIsLoading,
  };
}

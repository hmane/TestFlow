/**
 * Custom hook for workflow action handlers
 * Provides type-safe methods for all workflow transitions
 */

import * as React from 'react';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import { useRequestStore } from '@stores/index';
import { useShallow } from 'zustand/react/shallow';
import type { IPrincipal } from '@appTypes/index';

/**
 * Closeout options for workflow action
 */
export interface ICloseoutOptions {
  /** Optional tracking ID */
  trackingId?: string;
  /** Whether review comments have been acknowledged (required if outcome was Approved with Comments) */
  commentsAcknowledged?: boolean;
}

/**
 * Workflow actions result
 */
export interface IWorkflowActionsResult {
  // Attorney assignment
  assignAttorney: (attorney: IPrincipal, notes?: string) => Promise<void>;
  sendToCommittee: (notes?: string) => Promise<void>;

  // Review submissions
  submitLegalReview: (outcome: string, notes: string) => Promise<void>;
  submitComplianceReview: (
    outcome: string,
    notes: string,
    flags?: { isForesideReviewRequired?: boolean; isRetailUse?: boolean }
  ) => Promise<void>;

  // Closeout
  closeoutRequest: (options?: ICloseoutOptions) => Promise<void>;

  // State changes
  cancelRequest: (reason: string) => Promise<void>;
  holdRequest: (reason: string) => Promise<void>;
  resumeRequest: () => Promise<void>;

  // Status
  isProcessing: boolean;
  error?: string;
}

/**
 * Custom hook for workflow action handlers
 * Provides convenient methods for all workflow transitions
 */
export function useWorkflowActions(itemId?: number): IWorkflowActionsResult {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>(undefined);

  const {
    assignAttorney: storeAssignAttorney,
    sendToCommittee: storeSendToCommittee,
    submitLegalReview: storeSubmitLegalReview,
    submitComplianceReview: storeSubmitComplianceReview,
    closeoutRequest: storeCloseoutRequest,
    cancelRequest: storeCancelRequest,
    holdRequest: storeHoldRequest,
    resumeRequest: storeResumeRequest,
  } = useRequestStore(
    useShallow((s) => ({
      assignAttorney: s.assignAttorney,
      sendToCommittee: s.sendToCommittee,
      submitLegalReview: s.submitLegalReview,
      submitComplianceReview: s.submitComplianceReview,
      closeoutRequest: s.closeoutRequest,
      cancelRequest: s.cancelRequest,
      holdRequest: s.holdRequest,
      resumeRequest: s.resumeRequest,
    }))
  );

  /**
   * Assign attorney (direct assignment)
   */
  const assignAttorney = React.useCallback(
    async (attorney: IPrincipal, notes?: string): Promise<void> => {
      if (!itemId) {
        throw new Error('Cannot assign attorney - no request ID');
      }

      setIsProcessing(true);
      setError(undefined);

      try {
        await storeAssignAttorney(attorney, notes);
        SPContext.logger.success('Attorney assigned', {
          attorneyId: attorney.id,
          requestId: itemId,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        SPContext.logger.error('Failed to assign attorney', err, { itemId });
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [itemId, storeAssignAttorney]
  );

  /**
   * Send to committee for attorney assignment
   */
  const sendToCommittee = React.useCallback(
    async (notes?: string): Promise<void> => {
      if (!itemId) {
        throw new Error('Cannot send to committee - no request ID');
      }

      setIsProcessing(true);
      setError(undefined);

      try {
        await storeSendToCommittee(notes);
        SPContext.logger.success('Sent to committee', { requestId: itemId });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        SPContext.logger.error('Failed to send to committee', err, { itemId });
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [itemId, storeSendToCommittee]
  );

  /**
   * Submit legal review
   */
  const submitLegalReview = React.useCallback(
    async (outcome: string, notes: string): Promise<void> => {
      if (!itemId) {
        throw new Error('Cannot submit legal review - no request ID');
      }

      setIsProcessing(true);
      setError(undefined);

      try {
        await storeSubmitLegalReview(outcome, notes);
        SPContext.logger.success('Legal review submitted', {
          outcome,
          requestId: itemId,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        SPContext.logger.error('Failed to submit legal review', err, { itemId });
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [itemId, storeSubmitLegalReview]
  );

  /**
   * Submit compliance review
   */
  const submitComplianceReview = React.useCallback(
    async (
      outcome: string,
      notes: string,
      flags?: { isForesideReviewRequired?: boolean; isRetailUse?: boolean }
    ): Promise<void> => {
      if (!itemId) {
        throw new Error('Cannot submit compliance review - no request ID');
      }

      setIsProcessing(true);
      setError(undefined);

      try {
        await storeSubmitComplianceReview(outcome, notes, flags);
        SPContext.logger.success('Compliance review submitted', {
          outcome,
          requestId: itemId,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        SPContext.logger.error('Failed to submit compliance review', err, { itemId });
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [itemId, storeSubmitComplianceReview]
  );

  /**
   * Close out request
   */
  const closeoutRequest = React.useCallback(
    async (options?: ICloseoutOptions): Promise<void> => {
      if (!itemId) {
        throw new Error('Cannot closeout request - no request ID');
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
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        SPContext.logger.error('Failed to closeout request', err, { itemId });
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [itemId, storeCloseoutRequest]
  );

  /**
   * Cancel request
   */
  const cancelRequest = React.useCallback(
    async (reason: string): Promise<void> => {
      if (!itemId) {
        throw new Error('Cannot cancel request - no request ID');
      }

      setIsProcessing(true);
      setError(undefined);

      try {
        await storeCancelRequest(reason);
        SPContext.logger.success('Request cancelled', { requestId: itemId });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        SPContext.logger.error('Failed to cancel request', err, { itemId });
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [itemId, storeCancelRequest]
  );

  /**
   * Hold request
   */
  const holdRequest = React.useCallback(
    async (reason: string): Promise<void> => {
      if (!itemId) {
        throw new Error('Cannot hold request - no request ID');
      }

      setIsProcessing(true);
      setError(undefined);

      try {
        await storeHoldRequest(reason);
        SPContext.logger.success('Request put on hold', { requestId: itemId });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        SPContext.logger.error('Failed to hold request', err, { itemId });
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [itemId, storeHoldRequest]
  );

  /**
   * Resume request from hold
   */
  const resumeRequest = React.useCallback(async (): Promise<void> => {
    if (!itemId) {
      throw new Error('Cannot resume request - no request ID');
    }

    setIsProcessing(true);
    setError(undefined);

    try {
      await storeResumeRequest();
      SPContext.logger.success('Request resumed', { requestId: itemId });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      SPContext.logger.error('Failed to resume request', err, { itemId });
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [itemId, storeResumeRequest]);

  return {
    assignAttorney,
    sendToCommittee,
    submitLegalReview,
    submitComplianceReview,
    closeoutRequest,
    cancelRequest,
    holdRequest,
    resumeRequest,
    isProcessing,
    error,
  };
}

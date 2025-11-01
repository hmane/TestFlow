/**
 * Custom hook for workflow action handlers
 * Provides type-safe methods for all workflow transitions
 */

import * as React from 'react';
import { SPContext } from 'spfx-toolkit';
import { useRequestStore } from '../stores';
import type { IPrincipal } from '../types';

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
  closeoutRequest: (trackingId?: string) => Promise<void>;

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

  const store = useRequestStore();

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
        await store.assignAttorney(attorney, notes);
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
    [itemId, store]
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
        await store.sendToCommittee(notes);
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
    [itemId, store]
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
        await store.submitLegalReview(outcome, notes);
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
    [itemId, store]
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
        await store.submitComplianceReview(outcome, notes, flags);
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
    [itemId, store]
  );

  /**
   * Close out request
   */
  const closeoutRequest = React.useCallback(
    async (trackingId?: string): Promise<void> => {
      if (!itemId) {
        throw new Error('Cannot closeout request - no request ID');
      }

      setIsProcessing(true);
      setError(undefined);

      try {
        await store.closeoutRequest(trackingId);
        SPContext.logger.success('Request closed out', {
          trackingId,
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
    [itemId, store]
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
        await store.cancelRequest(reason);
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
    [itemId, store]
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
        await store.holdRequest(reason);
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
    [itemId, store]
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
      await store.resumeRequest();
      SPContext.logger.success('Request resumed', { requestId: itemId });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      SPContext.logger.error('Failed to resume request', err, { itemId });
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [itemId, store]);

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

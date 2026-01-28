/**
 * Request Store Selectors
 *
 * Optimized selectors for the request store to prevent unnecessary re-renders.
 */

import { useShallow } from 'zustand/react/shallow';

import type { IStagedFile, IFileToDelete } from '@services/approvalFileService';
import type {
  Approval,
  IComplianceReview,
  ILegalRequest,
  ILegalReview,
  IPrincipal,
  RequestStatus,
  ReviewAudience,
} from '@appTypes/index';

import { useRequestStore } from './store';

// ============================================
// ZUSTAND SELECTORS FOR OPTIMIZED RE-RENDERS
// ============================================

/**
 * Selector for current request status only
 * Components that only need status won't re-render when other fields change
 */
export const useRequestStatus = (): RequestStatus | undefined =>
  useRequestStore(state => state.currentRequest?.status);

/**
 * Selector for loading state only
 */
export const useRequestLoading = (): boolean =>
  useRequestStore(state => state.isLoading);

/**
 * Selector for saving state only
 */
export const useRequestSaving = (): boolean =>
  useRequestStore(state => state.isSaving);

/**
 * Selector for dirty state only
 */
export const useRequestDirty = (): boolean =>
  useRequestStore(state => state.isDirty);

/**
 * Selector for error state only
 */
export const useRequestError = (): string | undefined =>
  useRequestStore(state => state.error);

/**
 * Selector for item ID only
 */
export const useRequestItemId = (): number | undefined =>
  useRequestStore(state => state.itemId);

/**
 * Selector for request ID only
 */
export const useRequestId = (): string | undefined =>
  useRequestStore(state => state.currentRequest?.requestId);

/**
 * Selector for legal review data only
 */
export const useLegalReviewData = (): ILegalReview | undefined =>
  useRequestStore(state => state.currentRequest?.legalReview);

/**
 * Selector for compliance review data only
 */
export const useComplianceReviewData = (): IComplianceReview | undefined =>
  useRequestStore(state => state.currentRequest?.complianceReview);

/**
 * Stable empty array to avoid creating a new reference on every render
 * when no approvals exist
 */
const EMPTY_APPROVALS: Approval[] = [];

/**
 * Selector for approvals array only
 */
export const useApprovalsData = (): Approval[] =>
  useRequestStore(state => state.currentRequest?.approvals ?? EMPTY_APPROVALS);

/**
 * Selector for review audience only
 */
export const useReviewAudience = (): ReviewAudience | undefined =>
  useRequestStore(state => state.currentRequest?.reviewAudience);

/**
 * Selector for attorney data only
 */
export const useAttorneyData = (): IPrincipal | undefined =>
  useRequestStore(state => state.currentRequest?.attorney);

/**
 * Selector for file operations state
 * Uses shallow comparison to prevent re-renders when values haven't changed
 */
export const useFileOperationsState = (): {
  stagedFiles: IStagedFile[];
  filesToDelete: IFileToDelete[];
  hasPending: boolean;
} =>
  useRequestStore(
    useShallow((state) => ({
      stagedFiles: state.stagedFiles,
      filesToDelete: state.filesToDelete,
      hasPending: state.stagedFiles.length > 0 || state.filesToDelete.length > 0,
    }))
  );

/**
 * Selector for store actions only (stable reference)
 * Use this when you only need actions without subscribing to state changes
 * Uses shallow comparison to prevent re-renders - action functions should be stable
 */
export const useRequestActions = (): {
  loadRequest: (itemId: number) => Promise<void>;
  initializeNewRequest: () => void;
  updateField: <K extends keyof ILegalRequest>(field: K, value: ILegalRequest[K]) => void;
  updateMultipleFields: (fields: Partial<ILegalRequest>) => void;
  saveAsDraft: () => Promise<number>;
  submitRequest: () => Promise<number>;
  updateRequest: (updates: Partial<ILegalRequest>) => Promise<void>;
  assignAttorney: (attorney: IPrincipal, notes?: string) => Promise<void>;
  sendToCommittee: (notes?: string) => Promise<void>;
  submitLegalReview: (outcome: string, notes: string) => Promise<void>;
  submitComplianceReview: (outcome: string, notes: string, flags?: { isForesideReviewRequired?: boolean; isRetailUse?: boolean }) => Promise<void>;
  closeoutRequest: (options?: { trackingId?: string; commentsAcknowledged?: boolean; closeoutNotes?: string }) => Promise<void>;
  completeFINRADocuments: (notes?: string) => Promise<void>;
  cancelRequest: (reason: string) => Promise<void>;
  holdRequest: (reason: string) => Promise<void>;
  resumeRequest: () => Promise<void>;
  reset: () => void;
  revertChanges: () => void;
} =>
  useRequestStore(
    useShallow((state) => ({
      loadRequest: state.loadRequest,
      initializeNewRequest: state.initializeNewRequest,
      updateField: state.updateField,
      updateMultipleFields: state.updateMultipleFields,
      saveAsDraft: state.saveAsDraft,
      submitRequest: state.submitRequest,
      updateRequest: state.updateRequest,
      assignAttorney: state.assignAttorney,
      sendToCommittee: state.sendToCommittee,
      submitLegalReview: state.submitLegalReview,
      submitComplianceReview: state.submitComplianceReview,
      closeoutRequest: state.closeoutRequest,
      completeFINRADocuments: state.completeFINRADocuments,
      cancelRequest: state.cancelRequest,
      holdRequest: state.holdRequest,
      resumeRequest: state.resumeRequest,
      reset: state.reset,
      revertChanges: state.revertChanges,
    }))
  );

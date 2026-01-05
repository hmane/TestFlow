/**
 * Request Store
 *
 * Barrel export for the request store module.
 *
 * This module provides state management for legal review requests using Zustand.
 * It handles loading, saving, and workflow actions for requests.
 */

// Main store
export { useRequestStore } from './store';

// Types
export type { IRequestState } from './types';
export { initialState } from './types';

// Selectors
export {
  useRequestStatus,
  useRequestLoading,
  useRequestSaving,
  useRequestDirty,
  useRequestError,
  useRequestItemId,
  useRequestId,
  useLegalReviewData,
  useComplianceReviewData,
  useApprovalsData,
  useReviewAudience,
  useAttorneyData,
  useFileOperationsState,
  useRequestActions,
} from './selectors';

// Hooks
export { useRequest } from './hooks';

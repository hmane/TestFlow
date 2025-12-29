/**
 * Central export point for all Zustand stores and hooks
 */

// Submission Items Store
export {
  useSubmissionItemsStore,
  useSubmissionItems,
  useSubmissionItem,
} from './submissionItemsStore';

// Configuration Store
export {
  useConfigStore,
  useConfig,
  useConfigValue,
  useConfigBoolean,
  useConfigNumber,
} from './configStore';

// Request Store - main exports
export {
  useRequestStore,
  useRequest,
} from './requestStore';

// Request Store - optimized selectors
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
} from './requestStore';

// Legal Intake Store - main exports
export {
  useLegalIntakeStore,
} from './legalIntakeStore';

// Legal Intake Store - optimized selectors
export {
  useSelectedAttorney,
  useAssignmentNotes,
  useLegalIntakeReviewAudience,
  useLegalIntakeDirty,
  useLegalIntakeActions,
} from './legalIntakeStore';

// Documents Store - optimized selectors
export {
  useDocumentsStore,
  useDocumentLibraryId,
  useDocumentsLoading,
  useDocumentsUploading,
  useDocumentsError,
  useStagedFilesCount,
  useFilesToDeleteCount,
  useHasPendingDocumentOperations,
  useUploadProgress,
  useDocumentsActions,
} from './documentsStore';

// Permissions Store - centralized permission management
export {
  usePermissionsStore,
  usePermissionsLoading,
  usePermissionsLoaded,
  usePermissionsError,
  useUserRoles,
  useUserCapabilities,
  usePermissionsActions,
  useHasRole,
  useHasAnyRole,
} from './permissionsStore';

// Re-export permission types
export type { IItemPermissions } from './permissionsStore';

// Closeout Store - main exports
export {
  useCloseoutStore,
} from './closeoutStore';

// Closeout Store - optimized selectors
export {
  useTrackingId,
  useCloseoutNotes,
  useCloseoutDirty,
  useCloseoutActions,
} from './closeoutStore';

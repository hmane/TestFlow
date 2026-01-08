/**
 * Request Store Types
 *
 * Type definitions for the request store.
 */

import type { IExistingFile } from '@stores/documentsStore';
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

/**
 * Request store state interface
 */
export interface IRequestState {
  // Current request data
  currentRequest?: ILegalRequest;
  originalRequest?: ILegalRequest;
  isDirty: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error?: string;
  itemId?: number;

  // File staging for approval documents
  stagedFiles: IStagedFile[];
  filesToDelete: IFileToDelete[];
  existingFiles: Map<string, IExistingFile[]>; // Key: approvalType-approvalIndex

  // Actions - Load & Initialize
  loadRequest: (itemId: number) => Promise<void>;
  initializeNewRequest: () => void;

  // Actions - Update
  updateField: <K extends keyof ILegalRequest>(field: K, value: ILegalRequest[K]) => void;
  updateMultipleFields: (fields: Partial<ILegalRequest>) => void;
  setApprovals: (approvals: Approval[]) => void;
  updateLegalReview: (review: Partial<ILegalReview>) => void;
  updateComplianceReview: (review: Partial<IComplianceReview>) => void;

  // Actions - File Management
  stageFiles: (files: File[], approvalType: string, approvalIndex: number) => void;
  removeStagedFile: (fileId: string) => void;
  markFileForDeletion: (file: IExistingFile, approvalType: string, approvalIndex: number) => void;
  unmarkFileForDeletion: (fileId: string) => void;
  clearStagedFiles: () => void;
  getStagedFilesForApproval: (approvalType: string, approvalIndex: number) => IStagedFile[];
  getExistingFilesForApproval: (approvalType: string, approvalIndex: number) => IExistingFile[];
  hasPendingFileOperations: () => boolean;

  // Actions - Save
  saveAsDraft: () => Promise<number>;
  submitRequest: () => Promise<number>;
  updateRequest: (updates: Partial<ILegalRequest>) => Promise<void>;

  // Actions - Workflow
  assignAttorney: (attorney: IPrincipal, notes?: string, reviewAudience?: ReviewAudience) => Promise<void>;
  sendToCommittee: (notes?: string, reviewAudience?: ReviewAudience) => Promise<void>;
  submitLegalReview: (outcome: string, notes: string) => Promise<void>;
  submitComplianceReview: (
    outcome: string,
    notes: string,
    flags?: { isForesideReviewRequired?: boolean; isRetailUse?: boolean }
  ) => Promise<void>;
  closeoutRequest: (options?: { trackingId?: string; commentsAcknowledged?: boolean; closeoutNotes?: string }) => Promise<void>;
  completeFINRADocuments: (notes?: string) => Promise<void>;
  cancelRequest: (reason: string) => Promise<void>;
  holdRequest: (reason: string) => Promise<void>;
  resumeRequest: () => Promise<void>;

  // Actions - Admin Override (Super Admin Mode)
  adminOverrideStatus: (status: RequestStatus, reason: string) => Promise<void>;
  adminClearAttorney: (reason: string) => Promise<void>;
  adminOverrideReviewAudience: (audience: ReviewAudience, reason: string) => Promise<void>;
  adminOverrideLegalReview: (outcome?: string, status?: string, reason?: string) => Promise<void>;
  adminOverrideComplianceReview: (outcome?: string, status?: string, reason?: string) => Promise<void>;
  adminOverrideComplianceFlags: (isForesideRequired?: boolean, isRetailUse?: boolean, reason?: string) => Promise<void>;
  adminReopenRequest: (reason: string) => Promise<void>;

  // Actions - Utility
  reset: () => void;
  revertChanges: () => void;
  hasUnsavedChanges: () => boolean;
}

/**
 * Initial state for the request store
 */
export const initialState = {
  currentRequest: undefined,
  originalRequest: undefined,
  isDirty: false,
  isLoading: false,
  isSaving: false,
  error: undefined,
  itemId: undefined,
  stagedFiles: [],
  filesToDelete: [],
  existingFiles: new Map(),
};

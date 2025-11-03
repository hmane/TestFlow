/**
 * Request Store
 * Store for managing legal review request data
 * Handles both loading existing requests and creating new ones
 */

import * as React from 'react';
import { SPContext } from 'spfx-toolkit';
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import type { IExistingFile } from './documentsStore';
import { useDocumentsStore } from './documentsStore';
import type {
  IStagedFile,
  IFileToDelete,
} from '../services/approvalFileService';
import { loadRequestById } from '../services/requestLoadService';
import { saveDraft, saveRequest, processPendingDocuments } from '../services/requestSaveService';
import type {
  Approval,
  IComplianceReview,
  ILegalRequest,
  ILegalReview,
  IPrincipal,
  RequestStatus,
  RequestType,
  ReviewAudience,
  SubmissionType,
} from '../types';
import { ApprovalType } from '../types/approvalTypes';

/**
 * Request store state interface
 */
interface IRequestState {
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
  stageFiles: (files: File[], approvalType: ApprovalType, approvalIndex: number) => void;
  removeStagedFile: (fileId: string) => void;
  markFileForDeletion: (file: IExistingFile, approvalType: ApprovalType, approvalIndex: number) => void;
  unmarkFileForDeletion: (fileId: string) => void;
  clearStagedFiles: () => void;
  getStagedFilesForApproval: (approvalType: ApprovalType, approvalIndex: number) => IStagedFile[];
  getExistingFilesForApproval: (approvalType: ApprovalType, approvalIndex: number) => IExistingFile[];
  hasPendingFileOperations: () => boolean;

  // Actions - Save
  saveAsDraft: () => Promise<number>;
  submitRequest: () => Promise<number>;
  updateRequest: (updates: Partial<ILegalRequest>) => Promise<void>;

  // Actions - Workflow
  assignAttorney: (attorney: IPrincipal, notes?: string) => Promise<void>;
  sendToCommittee: (notes?: string) => Promise<void>;
  submitLegalReview: (outcome: string, notes: string) => Promise<void>;
  submitComplianceReview: (
    outcome: string,
    notes: string,
    flags?: { isForesideReviewRequired?: boolean; isRetailUse?: boolean }
  ) => Promise<void>;
  closeoutRequest: (trackingId?: string) => Promise<void>;
  cancelRequest: (reason: string) => Promise<void>;
  holdRequest: (reason: string) => Promise<void>;
  resumeRequest: () => Promise<void>;

  // Actions - Utility
  reset: () => void;
  revertChanges: () => void;
  hasUnsavedChanges: () => boolean;
}

/**
 * Initial state
 */
const initialState = {
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

/**
 * Request store
 */
export const useRequestStore = create<IRequestState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      /**
       * Load existing request from SharePoint
       */
      loadRequest: async (itemId: number): Promise<void> => {
        set({ isLoading: true, error: undefined, itemId });

        try {
          SPContext.logger.info('Loading request', { itemId });

          // Load request data using service layer
          // Service handles CAML queries, field expansion, and data mapping
          const request = await loadRequestById(itemId);

          // Load existing approval files for each approval
          if (request.approvals && request.approvals.length > 0) {
            SPContext.logger.info('Loading existing approval files', {
              requestId: request.requestId,
              approvalCount: request.approvals.length,
            });

            const { loadAllApprovalFiles } = await import('../services/approvalFileService');
            const approvalTypes = request.approvals.map(a => a.type);

            try {
              const filesMap = await loadAllApprovalFiles(request.requestId, approvalTypes);

              // Populate existingFiles for each approval
              for (let i = 0; i < request.approvals.length; i++) {
                const approval = request.approvals[i];
                const files = filesMap.get(approval.type) || [];
                approval.existingFiles = files;

                SPContext.logger.info('Loaded files for approval', {
                  type: approval.type,
                  fileCount: files.length,
                });
              }
            } catch (fileError) {
              SPContext.logger.warn('Failed to load approval files (continuing anyway)', {
                requestId: request.requestId,
                error: fileError instanceof Error ? fileError.message : String(fileError),
              });
              // Don't fail the entire load if files can't be loaded
            }
          }

          set({
            currentRequest: request,
            originalRequest: structuredClone(request),
            isDirty: false,
            isLoading: false,
            itemId,
          });

          SPContext.logger.info('Request loaded successfully', {
            itemId,
            requestId: request.requestId,
            status: request.status,
            approvalsLoaded: request.approvals?.length || 0,
          });
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);

          SPContext.logger.error('Failed to load request', error, {
            itemId,
            context: 'requestStore.loadRequest',
          });

          set({
            isLoading: false,
            error: message,
          });

          throw error; // Re-throw without wrapping to avoid nested error messages
        }
      },

      /**
       * Initialize new request with default values
       */
      initializeNewRequest: (): void => {
        SPContext.logger.info('Initializing new request');

        const newRequest: ILegalRequest = {
          requestId: '', // Will be generated on submit
          status: 'Draft' as RequestStatus,
          requestType: 'Communication' as RequestType,
          requestTitle: '',
          purpose: '',
          submissionType: 'New' as SubmissionType,
          submissionItem: '', // Changed from lookup object to empty string
          submissionItemOther: undefined,
          targetReturnDate: undefined,
          isRushRequest: false,
          reviewAudience: 'Legal' as ReviewAudience,
          requiresCommunicationsApproval: false,
          hasPortfolioManagerApproval: false,
          hasResearchAnalystApproval: false,
          hasSMEApproval: false,
          hasPerformanceApproval: false,
          hasOtherApproval: false,
          approvals: [],
          distributionMethod: [],
          priorSubmissions: [],
          additionalParty: [],
        };

        set({
          currentRequest: newRequest,
          originalRequest: structuredClone(newRequest),
          isDirty: false,
          itemId: undefined,
        });
      },

      /**
       * Update single field
       */
      updateField: <K extends keyof ILegalRequest>(field: K, value: ILegalRequest[K]): void => {
        const state = get();

        if (!state.currentRequest) {
          SPContext.logger.warn('Cannot update field - no current request');
          return;
        }

        set({
          currentRequest: {
            ...state.currentRequest,
            [field]: value,
          },
          isDirty: true,
        });
      },

      /**
       * Update multiple fields at once
       */
      updateMultipleFields: (fields: Partial<ILegalRequest>): void => {
        const state = get();

        if (!state.currentRequest) {
          SPContext.logger.warn('Cannot update fields - no current request');
          return;
        }

        set({
          currentRequest: {
            ...state.currentRequest,
            ...fields,
          },
          isDirty: true,
        });
      },

      /**
       * Set approvals array
       */
      setApprovals: (approvals: Approval[]): void => {
        get().updateField('approvals', approvals);
      },

      /**
       * Update legal review data
       */
      updateLegalReview: (review: Partial<ILegalReview>): void => {
        const state = get();

        if (!state.currentRequest) {
          return;
        }

        set({
          currentRequest: {
            ...state.currentRequest,
            legalReview: {
              ...state.currentRequest.legalReview,
              ...review,
            } as ILegalReview,
          },
          isDirty: true,
        });
      },

      /**
       * Update compliance review data
       */
      updateComplianceReview: (review: Partial<IComplianceReview>): void => {
        const state = get();

        if (!state.currentRequest) {
          return;
        }

        set({
          currentRequest: {
            ...state.currentRequest,
            complianceReview: {
              ...state.currentRequest.complianceReview,
              ...review,
            } as IComplianceReview,
          },
          isDirty: true,
        });
      },

      /**
       * Save as draft (create or update)
       */
      saveAsDraft: async (): Promise<number> => {
        const state = get();

        if (!state.currentRequest) {
          throw new Error('No request to save');
        }

        set({ isSaving: true, error: undefined });

        try {
          // Call service to save draft (handles both create and update)
          const result = await saveDraft(
            state.itemId,
            state.currentRequest,
            state.originalRequest
          );

          // Update store state with result
          if (result.updatedRequest) {
            set({
              itemId: result.itemId,
              currentRequest: result.updatedRequest,
              originalRequest: structuredClone(result.updatedRequest),
              isDirty: false,
              isSaving: false,
            });
          } else {
            // No changes were made (update skipped)
            set({
              isDirty: false,
              isSaving: false,
            });
          }

          // Process pending document operations after successful save
          const documentsStore = useDocumentsStore.getState();
          if (documentsStore.hasPendingOperations()) {
            SPContext.logger.info('Processing pending document operations', {
              itemId: result.itemId,
            });

            try {
              // 1. Upload staged files using documentsStore (with progress tracking)
              if (documentsStore.stagedFiles.length > 0) {
                await documentsStore.uploadPendingFiles(
                  result.itemId,
                  (fileId, progress, status) => {
                    SPContext.logger.info('Upload progress', { fileId, progress, status });
                  }
                );
              }

              // 2. Process deletes and renames
              const filesToDelete = documentsStore.filesToDelete;
              const filesToRename = documentsStore.filesToRename.map(rename => ({
                file: rename.file,
                newName: rename.newName,
              }));

              if (filesToDelete.length > 0 || filesToRename.length > 0) {
                const docResults = await processPendingDocuments(
                  result.itemId,
                  [], // Empty array - uploads already handled
                  filesToDelete,
                  filesToRename
                );

                SPContext.logger.success('Document operations completed', docResults);
              }

              // Clear pending operations after successful processing
              documentsStore.clearPendingOperations();

              // Reload documents from SharePoint to display uploaded files
              await documentsStore.loadAllDocuments(result.itemId);
              SPContext.logger.info('Documents reloaded after upload', { itemId: result.itemId });
            } catch (docError) {
              // Log error but don't fail the entire save
              SPContext.logger.error('Document processing failed (request was saved)', docError, {
                itemId: result.itemId,
              });
              // Note: We don't throw here because the request was successfully saved
            }
          }

          return result.itemId;

        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);

          SPContext.logger.error('Failed to save draft', error, {
            context: 'requestStore.saveAsDraft',
          });

          set({
            isSaving: false,
            error: message,
          });

          throw new Error(`Failed to save draft: ${message}`);
        }
      },

      /**
       * Submit request (validate and change status)
       */
      submitRequest: async (): Promise<number> => {
        const state = get();

        if (!state.currentRequest) {
          throw new Error('No request to submit');
        }

        // Save first
        const itemId = await get().saveAsDraft();

        // Then update status to Legal Intake using service
        const result = await saveRequest(
          itemId,
          {
            ...state.currentRequest,
            status: 'Legal Intake' as RequestStatus,
            submittedBy: {
              id: SPContext.currentUser.id.toString(),
              email: SPContext.currentUser.email,
              title: SPContext.currentUser.title,
            } as IPrincipal,
            submittedOn: new Date(),
          },
          state.currentRequest
        );

        // Update store state
        if (result.updatedRequest) {
          set({
            currentRequest: result.updatedRequest,
            originalRequest: structuredClone(result.updatedRequest),
            isDirty: false,
          });
        }

        SPContext.logger.info('Request submitted successfully', {
          itemId,
          requestId: state.currentRequest.requestId,
        });

        return itemId;
      },

      /**
       * Update existing request
       */
      updateRequest: async (updates: Partial<ILegalRequest>): Promise<void> => {
        const state = get();

        if (!state.itemId) {
          throw new Error('Cannot update - no item ID');
        }

        set({ isSaving: true, error: undefined });

        try {
          // Merge updates with current request
          const mergedRequest = { ...state.currentRequest!, ...updates };

          // Call service to save (with change detection and reload)
          const result = await saveRequest(
            state.itemId,
            mergedRequest,
            state.originalRequest
          );

          // Update store state with result
          if (result.saved && result.updatedRequest) {
            set({
              currentRequest: result.updatedRequest,
              originalRequest: structuredClone(result.updatedRequest),
              isDirty: false,
              isSaving: false,
            });
          } else {
            // No changes were made
            set({
              isDirty: false,
              isSaving: false,
            });
          }

          // Process pending document operations after successful save
          const documentsStore = useDocumentsStore.getState();
          if (documentsStore.hasPendingOperations()) {
            SPContext.logger.info('Processing pending document operations', {
              itemId: state.itemId,
            });

            try {
              // 1. Upload staged files using documentsStore (with progress tracking)
              if (documentsStore.stagedFiles.length > 0) {
                await documentsStore.uploadPendingFiles(
                  state.itemId,
                  (fileId, progress, status) => {
                    SPContext.logger.info('Upload progress', { fileId, progress, status });
                  }
                );
              }

              // 2. Process deletes and renames
              const filesToDelete = documentsStore.filesToDelete;
              const filesToRename = documentsStore.filesToRename.map(rename => ({
                file: rename.file,
                newName: rename.newName,
              }));

              if (filesToDelete.length > 0 || filesToRename.length > 0) {
                const docResults = await processPendingDocuments(
                  state.itemId,
                  [], // Empty array - uploads already handled
                  filesToDelete,
                  filesToRename
                );

                SPContext.logger.success('Document operations completed', docResults);
              }

              // Clear pending operations after successful processing
              documentsStore.clearPendingOperations();

              // Reload documents from SharePoint to display uploaded files
              await documentsStore.loadAllDocuments(state.itemId);
              SPContext.logger.info('Documents reloaded after upload', { itemId: state.itemId });
            } catch (docError) {
              // Log error but don't fail the entire save
              SPContext.logger.error('Document processing failed (request was saved)', docError, {
                itemId: state.itemId,
              });
              // Note: We don't throw here because the request was successfully saved
            }
          }

        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);

          SPContext.logger.error('Failed to update request', error, {
            itemId: state.itemId,
            context: 'requestStore.updateRequest',
          });

          set({
            isSaving: false,
            error: message,
          });

          throw new Error(`Failed to update request: ${message}`);
        }
      },

      /**
       * Assign attorney (direct assignment)
       */
      assignAttorney: async (attorney: IPrincipal, notes?: string): Promise<void> => {
        await get().updateRequest({
          legalReview: {
            assignedAttorney: attorney,
            assignedOn: new Date(),
          } as ILegalReview,
          status: 'In Review' as RequestStatus,
        });
      },

      /**
       * Send to committee for attorney assignment
       */
      sendToCommittee: async (notes?: string): Promise<void> => {
        await get().updateRequest({
          status: 'Assign Attorney' as RequestStatus,
        });
      },

      /**
       * Submit legal review
       */
      submitLegalReview: async (outcome: string, notes: string): Promise<void> => {
        await get().updateLegalReview({
          outcome: outcome as any,
          reviewNotes: notes,
          status: 'Completed' as any,
        });

        await get().saveAsDraft();
      },

      /**
       * Submit compliance review
       */
      submitComplianceReview: async (
        outcome: string,
        notes: string,
        flags?: { isForesideReviewRequired?: boolean; isRetailUse?: boolean }
      ): Promise<void> => {
        await get().updateComplianceReview({
          outcome: outcome as any,
          reviewNotes: notes,
          status: 'Completed' as any,
          ...flags,
        });

        await get().saveAsDraft();
      },

      /**
       * Close out request
       */
      closeoutRequest: async (trackingId?: string): Promise<void> => {
        await get().updateRequest({
          trackingId,
          status: 'Completed' as RequestStatus,
          closeoutBy: SPContext.currentUser as IPrincipal,
          closeoutOn: new Date(),
        });
      },

      /**
       * Cancel request
       */
      cancelRequest: async (reason: string): Promise<void> => {
        await get().updateRequest({
          status: 'Cancelled' as RequestStatus,
          cancelReason: reason,
          cancelledBy: SPContext.currentUser as IPrincipal,
          cancelledOn: new Date(),
        });
      },

      /**
       * Hold request
       */
      holdRequest: async (reason: string): Promise<void> => {
        const state = get();
        await get().updateRequest({
          previousStatus: state.currentRequest?.status,
          status: 'On Hold' as RequestStatus,
          onHoldReason: reason,
          onHoldBy: SPContext.currentUser as IPrincipal,
          onHoldSince: new Date(),
        });
      },

      /**
       * Resume request from hold
       */
      resumeRequest: async (): Promise<void> => {
        const state = get();

        if (!state.currentRequest?.previousStatus) {
          throw new Error('Cannot resume - no previous status');
        }

        await get().updateRequest({
          status: state.currentRequest.previousStatus as RequestStatus,
          onHoldReason: undefined,
          onHoldBy: undefined,
          onHoldSince: undefined,
          previousStatus: undefined,
        });
      },

      /**
       * Stage files for upload (approval documents)
       */
      stageFiles: (files: File[], approvalType: ApprovalType, approvalIndex: number): void => {
        const state = get();
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { FileOperationStatus } = require('../services/approvalFileService');

        const newStagedFiles: IStagedFile[] = files.map(file => ({
          id: `${Date.now()}-${Math.random()}`,
          file,
          approvalType,
          approvalIndex,
          status: FileOperationStatus.Pending,
          progress: 0,
          documentType: `Approval-${approvalType}-${approvalIndex}`,
        }));

        set({
          stagedFiles: [...state.stagedFiles, ...newStagedFiles],
        });

        SPContext.logger.info('Files staged for upload', {
          count: newStagedFiles.length,
          approvalType,
          approvalIndex,
        });
      },

      /**
       * Remove a staged file
       */
      removeStagedFile: (fileId: string): void => {
        const state = get();
        const filtered: IStagedFile[] = [];

        for (let i = 0; i < state.stagedFiles.length; i++) {
          if (state.stagedFiles[i].id !== fileId) {
            filtered.push(state.stagedFiles[i]);
          }
        }

        set({ stagedFiles: filtered });
        SPContext.logger.info('Staged file removed', { fileId });
      },

      /**
       * Mark an existing file for deletion
       */
      markFileForDeletion: (
        file: IExistingFile,
        approvalType: ApprovalType,
        approvalIndex: number
      ): void => {
        const state = get();
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { FileOperationStatus } = require('../services/approvalFileService');

        const fileToDelete: IFileToDelete = {
          id: file.uniqueId,
          fileUrl: file.url,
          fileName: file.name,
          status: FileOperationStatus.Pending,
        };

        set({ filesToDelete: [...state.filesToDelete, fileToDelete] });

        SPContext.logger.info('File marked for deletion', {
          fileName: file.name,
          approvalType,
          approvalIndex,
        });
      },

      /**
       * Unmark a file for deletion
       */
      unmarkFileForDeletion: (fileId: string): void => {
        const state = get();
        const filtered: IFileToDelete[] = [];

        for (let i = 0; i < state.filesToDelete.length; i++) {
          if (state.filesToDelete[i].id !== fileId) {
            filtered.push(state.filesToDelete[i]);
          }
        }

        set({ filesToDelete: filtered });
        SPContext.logger.info('File unmarked for deletion', { fileId });
      },

      /**
       * Clear all staged files
       */
      clearStagedFiles: (): void => {
        set({ stagedFiles: [], filesToDelete: [] });
        SPContext.logger.info('Staged files cleared');
      },

      /**
       * Get staged files for a specific approval
       */
      getStagedFilesForApproval: (
        approvalType: ApprovalType,
        approvalIndex: number
      ): IStagedFile[] => {
        const state = get();
        const files: IStagedFile[] = [];

        for (let i = 0; i < state.stagedFiles.length; i++) {
          const file = state.stagedFiles[i];
          if (file.approvalType === approvalType && file.approvalIndex === approvalIndex) {
            files.push(file);
          }
        }

        return files;
      },

      /**
       * Get existing files for a specific approval
       */
      getExistingFilesForApproval: (
        approvalType: ApprovalType,
        approvalIndex: number
      ): IExistingFile[] => {
        const state = get();
        const key = `${approvalType}-${approvalIndex}`;
        return state.existingFiles.get(key) || [];
      },

      /**
       * Check if there are pending file operations
       */
      hasPendingFileOperations: (): boolean => {
        const state = get();
        return state.stagedFiles.length > 0 || state.filesToDelete.length > 0;
      },

      /**
       * Reset store to initial state
       */
      reset: (): void => {
        SPContext.logger.info('Resetting request store');
        set(initialState);
      },

      /**
       * Revert changes to original
       */
      revertChanges: (): void => {
        const state = get();

        if (state.originalRequest) {
          set({
            currentRequest: structuredClone(state.originalRequest),
            isDirty: false,
          });
        }
      },

      /**
       * Check if there are unsaved changes
       */
      hasUnsavedChanges: (): boolean => {
        return get().isDirty;
      },
    }),
    {
      name: 'RequestStore',
      // Disable devtools initially to avoid SPContext access at module load
      // Will be enabled after SPContext initializes
      enabled: false,
    }
  )
);

/**
 * Custom hook to use request store
 * Automatically initializes based on itemId parameter
 */
export function useRequest(itemId?: number): {
  currentRequest?: ILegalRequest;
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  error?: string;
  updateField: <K extends keyof ILegalRequest>(field: K, value: ILegalRequest[K]) => void;
  updateMultipleFields: (fields: Partial<ILegalRequest>) => void;
  saveAsDraft: () => Promise<number>;
  submitRequest: () => Promise<number>;
  revertChanges: () => void;
  hasUnsavedChanges: () => boolean;
} {
  const {
    currentRequest,
    isLoading,
    isSaving,
    isDirty,
    error,
    loadRequest,
    initializeNewRequest,
    updateField,
    updateMultipleFields,
    saveAsDraft,
    submitRequest,
    revertChanges,
    hasUnsavedChanges,
  } = useRequestStore();

  // Auto-initialize on mount
  React.useEffect(() => {
    if (itemId) {
      loadRequest(itemId).catch(err => {
        SPContext.logger.error('Auto-load request failed', err);
      });
    } else {
      initializeNewRequest();
    }

    // Cleanup on unmount
    return () => {
      useRequestStore.getState().reset();
    };
  }, [itemId, loadRequest, initializeNewRequest]);

  return {
    currentRequest,
    isLoading,
    isSaving,
    isDirty,
    error,
    updateField,
    updateMultipleFields,
    saveAsDraft,
    submitRequest,
    revertChanges,
    hasUnsavedChanges,
  };
}

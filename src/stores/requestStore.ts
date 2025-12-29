/**
 * Request Store
 * Store for managing legal review request data
 * Handles both loading existing requests and creating new ones
 */

import * as React from 'react';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

import type { IExistingFile } from '@stores/documentsStore';
import { useDocumentsStore } from '@stores/documentsStore';
import type {
  IStagedFile,
  IFileToDelete,
} from '@services/approvalFileService';
import { loadRequestById } from '@services/requestLoadService';
import { saveDraft, saveRequest, processPendingDocuments } from '@services/requestSaveService';
import { requestCache, createRequestKey } from '../utils/requestCache';
import {
  submitRequest as submitRequestAction,
  assignAttorney as assignAttorneyAction,
  sendToCommittee as sendToCommitteeAction,
  submitLegalReview as submitLegalReviewAction,
  submitComplianceReview as submitComplianceReviewAction,
  closeoutRequest as closeoutRequestAction,
  cancelRequest as cancelRequestAction,
  holdRequest as holdRequestAction,
  resumeRequest as resumeRequestAction,
} from '@services/workflowActionService';
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
} from '@appTypes/index';
import { ApprovalType } from '@appTypes/approvalTypes';

/**
 * Process pending document operations after a successful save
 * Handles uploads, deletes, and renames, then reloads documents
 * @param itemId - The request item ID
 */
async function processDocumentOperationsAfterSave(itemId: number): Promise<void> {
  const documentsStore = useDocumentsStore.getState();

  if (!documentsStore.hasPendingOperations()) {
    return;
  }

  SPContext.logger.info('Processing pending document operations', { itemId });

  try {
    // 1. Upload staged files using documentsStore (with progress tracking)
    if (documentsStore.stagedFiles.length > 0) {
      await documentsStore.uploadPendingFiles(
        itemId,
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
        itemId,
        [], // Empty array - uploads already handled
        filesToDelete,
        filesToRename
      );

      SPContext.logger.success('Document operations completed', docResults);
    }

    // Clear pending operations after successful processing
    documentsStore.clearPendingOperations();

    // Reload documents from SharePoint to display uploaded files
    await documentsStore.loadAllDocuments(itemId);
    SPContext.logger.info('Documents reloaded after upload', { itemId });
  } catch (docError) {
    // Log error but don't fail the entire save
    SPContext.logger.error('Document processing failed (request was saved)', docError, { itemId });
    // Note: We don't throw here because the request was successfully saved
  }
}

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

  // Actions - Admin Override (Super Admin Mode)
  adminOverrideStatus: (status: RequestStatus, reason: string) => Promise<void>;
  adminClearAttorney: (reason: string) => Promise<void>;
  adminOverrideReviewAudience: (audience: ReviewAudience, reason: string) => Promise<void>;
  adminOverrideLegalReview: (outcome?: string, status?: string, reason?: string) => Promise<void>;
  adminOverrideComplianceReview: (outcome?: string, status?: string, reason?: string) => Promise<void>;
  adminReopenRequest: (reason: string) => Promise<void>;

  // Actions - Utility
  reset: () => void;
  revertChanges: () => void;
  hasUnsavedChanges: () => boolean;
}

/**
 * Format admin override audit entry
 * Creates a timestamped, formatted entry for the AdminOverrideNotes field
 */
function formatAdminAuditEntry(
  action: string,
  details: string,
  reason: string,
  existingNotes?: string
): string {
  const timestamp = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const adminEmail = SPContext.currentUser?.email || 'Unknown';

  const newEntry = `[${timestamp}] ${action} by ${adminEmail}\n${details}\nReason: ${reason}`;

  // Prepend new entry to existing notes (most recent first)
  if (existingNotes) {
    return `${newEntry}\n\n---\n\n${existingNotes}`;
  }
  return newEntry;
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
       *
       * Uses request cache for deduplication - if multiple components request the same
       * data simultaneously, only one API call is made.
       *
       * @param itemId - SharePoint item ID of the request to load
       */
      loadRequest: async (itemId: number): Promise<void> => {
        const cacheKey = createRequestKey('loadRequest', itemId);

        // Check if request is already being loaded (deduplication)
        if (requestCache.isCancelled(cacheKey)) {
          SPContext.logger.info('Request load was cancelled, skipping', { itemId });
          return;
        }

        set({ isLoading: true, error: undefined, itemId });

        try {
          SPContext.logger.info('Loading request', { itemId, cacheKey });

          // Use request cache for deduplication
          // If this request is already in-flight, we'll get the same promise back
          const request = await requestCache.execute(
            cacheKey,
            () => loadRequestById(itemId),
            'requestStore.loadRequest'
          );

          // Check if request was cancelled while loading
          if (requestCache.isCancelled(cacheKey)) {
            SPContext.logger.info('Request load cancelled after fetch, discarding result', { itemId });
            return;
          }

          // Load existing approval files for each approval
          if (request.approvals && request.approvals.length > 0) {
            SPContext.logger.info('Loading existing approval files', {
              itemId,
              requestId: request.requestId,
              approvalCount: request.approvals.length,
            });

            const { loadAllApprovalFiles } = await import('../services/approvalFileService');
            const approvalTypes = request.approvals.map(a => a.type);

            try {
              // Use itemId (numeric) instead of requestId (string) to match upload folder structure
              // Files are uploaded to: RequestDocuments/{itemId}/{ApprovalType}/
              const filesMap = await loadAllApprovalFiles(String(itemId), approvalTypes);

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
          // Don't update state if request was cancelled
          if (requestCache.isCancelled(cacheKey)) {
            SPContext.logger.info('Request load error ignored (cancelled)', { itemId });
            return;
          }

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
          // FINRA Audience & Product Fields
          finraAudienceCategory: [],
          audience: [],
          usFunds: [],
          ucits: [],
          separateAcctStrategies: [],
          separateAcctStrategiesIncl: [],
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
          await processDocumentOperationsAfterSave(result.itemId);

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
       * Uses dedicated workflow action - only updates status and submission fields
       *
       * IMPORTANT: This function works even when no form changes have been made.
       * The saveAsDraft() call handles any pending form changes, then the
       * submitRequestAction() always executes to update status fields.
       */
      submitRequest: async (): Promise<number> => {
        const initialState = get();

        if (!initialState.currentRequest) {
          throw new Error('No request to submit');
        }

        // Get the itemId from state - for existing drafts, this is already set
        // For new requests, saveAsDraft will create the item and return the new ID
        let itemId = initialState.itemId;

        SPContext.logger.info('RequestStore: submitRequest starting', {
          hasItemId: !!itemId,
          currentStatus: initialState.currentRequest.status,
          isDirty: initialState.isDirty,
        });

        // Save draft first if needed (this creates new items or saves pending changes)
        // Note: saveAsDraft() may skip the actual save if no changes detected,
        // but it will always return a valid itemId
        try {
          itemId = await get().saveAsDraft();
          SPContext.logger.info('RequestStore: saveAsDraft completed', { itemId });
        } catch (saveError) {
          SPContext.logger.error('RequestStore: saveAsDraft failed', saveError);
          throw saveError;
        }

        if (!itemId) {
          throw new Error('Failed to get item ID after save');
        }

        // Use dedicated workflow action - ALWAYS updates status, submittedBy, submittedOn
        // This runs regardless of whether saveAsDraft made any changes
        SPContext.logger.info('RequestStore: calling submitRequestAction', { itemId });

        const result = await submitRequestAction(itemId);

        SPContext.logger.info('RequestStore: submitRequestAction completed', {
          itemId,
          newStatus: result.updatedRequest?.status,
          success: result.success,
        });

        // Update store state with result
        set({
          itemId: result.itemId,
          currentRequest: result.updatedRequest,
          originalRequest: structuredClone(result.updatedRequest),
          isDirty: false,
          isSaving: false,
        });

        SPContext.logger.success('RequestStore: Request submitted successfully', {
          itemId,
          requestId: result.updatedRequest.requestId,
          newStatus: result.updatedRequest.status,
          fieldsUpdated: result.fieldsUpdated,
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
          await processDocumentOperationsAfterSave(state.itemId);

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
       * Uses dedicated workflow action - only updates attorney and status fields
       */
      assignAttorney: async (attorney: IPrincipal, notes?: string): Promise<void> => {
        const state = get();

        if (!state.itemId) {
          throw new Error('Cannot assign attorney - no item ID');
        }

        const result = await assignAttorneyAction(state.itemId, {
          attorney,
          notes,
        });

        set({
          currentRequest: result.updatedRequest,
          originalRequest: structuredClone(result.updatedRequest),
          isDirty: false,
        });

        SPContext.logger.info('Attorney assigned', {
          itemId: state.itemId,
          attorney: attorney.title,
          fieldsUpdated: result.fieldsUpdated,
        });
      },

      /**
       * Send to committee for attorney assignment
       * Uses dedicated workflow action - only updates status and committee fields
       */
      sendToCommittee: async (notes?: string): Promise<void> => {
        const state = get();

        if (!state.itemId) {
          throw new Error('Cannot send to committee - no item ID');
        }

        const result = await sendToCommitteeAction(state.itemId, { notes });

        set({
          currentRequest: result.updatedRequest,
          originalRequest: structuredClone(result.updatedRequest),
          isDirty: false,
        });

        SPContext.logger.info('Sent to committee', {
          itemId: state.itemId,
          fieldsUpdated: result.fieldsUpdated,
        });
      },

      /**
       * Submit legal review
       * Uses dedicated workflow action - only updates legal review fields
       */
      submitLegalReview: async (outcome: string, notes: string): Promise<void> => {
        const state = get();

        if (!state.itemId) {
          throw new Error('Cannot submit legal review - no item ID');
        }

        const result = await submitLegalReviewAction(state.itemId, {
          outcome: outcome as any,
          notes,
        });

        set({
          currentRequest: result.updatedRequest,
          originalRequest: structuredClone(result.updatedRequest),
          isDirty: false,
        });

        SPContext.logger.info('Legal review submitted', {
          itemId: state.itemId,
          outcome,
          fieldsUpdated: result.fieldsUpdated,
        });
      },

      /**
       * Submit compliance review
       * Uses dedicated workflow action - only updates compliance review fields
       */
      submitComplianceReview: async (
        outcome: string,
        notes: string,
        flags?: { isForesideReviewRequired?: boolean; isRetailUse?: boolean }
      ): Promise<void> => {
        const state = get();

        if (!state.itemId) {
          throw new Error('Cannot submit compliance review - no item ID');
        }

        const result = await submitComplianceReviewAction(state.itemId, {
          outcome: outcome as any,
          notes,
          isForesideReviewRequired: flags?.isForesideReviewRequired,
          isRetailUse: flags?.isRetailUse,
        });

        set({
          currentRequest: result.updatedRequest,
          originalRequest: structuredClone(result.updatedRequest),
          isDirty: false,
        });

        SPContext.logger.info('Compliance review submitted', {
          itemId: state.itemId,
          outcome,
          fieldsUpdated: result.fieldsUpdated,
        });
      },

      /**
       * Close out request
       * Uses dedicated workflow action - only updates closeout fields
       */
      closeoutRequest: async (trackingId?: string): Promise<void> => {
        const state = get();

        if (!state.itemId) {
          throw new Error('Cannot close out - no item ID');
        }

        const result = await closeoutRequestAction(state.itemId, { trackingId });

        set({
          currentRequest: result.updatedRequest,
          originalRequest: structuredClone(result.updatedRequest),
          isDirty: false,
        });

        SPContext.logger.info('Request closed out', {
          itemId: state.itemId,
          trackingId,
          fieldsUpdated: result.fieldsUpdated,
        });
      },

      /**
       * Cancel request
       * Uses dedicated workflow action - only updates cancellation fields
       */
      cancelRequest: async (reason: string): Promise<void> => {
        const state = get();

        if (!state.itemId || !state.currentRequest) {
          throw new Error('Cannot cancel - no request loaded');
        }

        const result = await cancelRequestAction(
          state.itemId,
          { reason },
          state.currentRequest.status
        );

        set({
          currentRequest: result.updatedRequest,
          originalRequest: structuredClone(result.updatedRequest),
          isDirty: false,
        });

        SPContext.logger.info('Request cancelled', {
          itemId: state.itemId,
          reason,
          fieldsUpdated: result.fieldsUpdated,
        });
      },

      /**
       * Hold request
       * Uses dedicated workflow action - only updates hold fields
       */
      holdRequest: async (reason: string): Promise<void> => {
        const state = get();

        if (!state.itemId || !state.currentRequest) {
          throw new Error('Cannot hold - no request loaded');
        }

        const result = await holdRequestAction(
          state.itemId,
          { reason },
          state.currentRequest.status
        );

        set({
          currentRequest: result.updatedRequest,
          originalRequest: structuredClone(result.updatedRequest),
          isDirty: false,
        });

        SPContext.logger.info('Request put on hold', {
          itemId: state.itemId,
          reason,
          fieldsUpdated: result.fieldsUpdated,
        });
      },

      /**
       * Resume request from hold
       * Uses dedicated workflow action - only updates resume fields
       */
      resumeRequest: async (): Promise<void> => {
        const state = get();

        if (!state.itemId || !state.currentRequest) {
          throw new Error('Cannot resume - no request loaded');
        }

        if (!state.currentRequest.previousStatus) {
          throw new Error('Cannot resume - no previous status');
        }

        const result = await resumeRequestAction(
          state.itemId,
          state.currentRequest.previousStatus
        );

        set({
          currentRequest: result.updatedRequest,
          originalRequest: structuredClone(result.updatedRequest),
          isDirty: false,
        });

        SPContext.logger.info('Request resumed', {
          itemId: state.itemId,
          newStatus: result.newStatus,
          fieldsUpdated: result.fieldsUpdated,
        });
      },

      // ============================================
      // ADMIN OVERRIDE METHODS (Super Admin Mode)
      // ============================================

      /**
       * Admin override: Force status change
       * Bypasses normal workflow transition rules
       */
      adminOverrideStatus: async (status: RequestStatus, reason: string): Promise<void> => {
        const state = get();

        if (!state.itemId || !state.currentRequest) {
          throw new Error('No request loaded');
        }

        SPContext.logger.warn('ADMIN OVERRIDE: Status change initiated', {
          requestId: state.currentRequest.requestId,
          fromStatus: state.currentRequest.status,
          toStatus: status,
          reason,
          adminUser: SPContext.currentUser?.email,
        });

        // Build admin override audit entry
        const adminOverrideNotes = formatAdminAuditEntry(
          'STATUS OVERRIDE',
          `Changed status from "${state.currentRequest.status}" to "${status}"`,
          reason,
          state.currentRequest.adminOverrideNotes
        );

        // Build update with audit trail
        const updates: Partial<ILegalRequest> = {
          status: status,
          previousStatus: state.currentRequest.status,
          adminOverrideNotes,
        };

        await get().updateRequest(updates);

        SPContext.logger.success('Admin status override completed', {
          requestId: state.currentRequest.requestId,
          newStatus: status,
        });
      },

      /**
       * Admin override: Clear assigned attorney
       * Allows reassignment even after review started
       */
      adminClearAttorney: async (reason: string): Promise<void> => {
        const state = get();

        if (!state.itemId || !state.currentRequest) {
          throw new Error('No request loaded');
        }

        const previousAttorney = state.currentRequest.attorney || state.currentRequest.legalReview?.assignedAttorney;

        SPContext.logger.warn('ADMIN OVERRIDE: Clearing attorney assignment', {
          requestId: state.currentRequest.requestId,
          previousAttorney: previousAttorney?.title,
          reason,
          adminUser: SPContext.currentUser?.email,
        });

        // Build admin override audit entry
        const adminOverrideNotes = formatAdminAuditEntry(
          'ATTORNEY CLEARED',
          `Removed attorney "${previousAttorney?.title || 'Unknown'}" from assignment`,
          reason,
          state.currentRequest.adminOverrideNotes
        );

        await get().updateRequest({
          attorney: undefined,
          legalReview: {
            ...state.currentRequest.legalReview,
            assignedAttorney: undefined,
            assignedOn: undefined,
          } as ILegalReview,
          adminOverrideNotes,
        });

        SPContext.logger.success('Admin attorney clear completed', {
          requestId: state.currentRequest.requestId,
        });
      },

      /**
       * Admin override: Change review audience
       * Changes which review teams are required (Legal, Compliance, or Both)
       */
      adminOverrideReviewAudience: async (audience: ReviewAudience, reason: string): Promise<void> => {
        const state = get();

        if (!state.itemId || !state.currentRequest) {
          throw new Error('No request loaded');
        }

        const previousAudience = state.currentRequest.reviewAudience;

        SPContext.logger.warn('ADMIN OVERRIDE: Changing review audience', {
          requestId: state.currentRequest.requestId,
          previousAudience,
          newAudience: audience,
          reason,
          adminUser: SPContext.currentUser?.email,
        });

        // Build admin override audit entry
        const adminOverrideNotes = formatAdminAuditEntry(
          'REVIEW AUDIENCE CHANGED',
          `Changed review audience from "${previousAudience || 'Not set'}" to "${audience}"`,
          reason,
          state.currentRequest.adminOverrideNotes
        );

        await get().updateRequest({
          reviewAudience: audience,
          adminOverrideNotes,
        });

        SPContext.logger.success('Admin review audience change completed', {
          requestId: state.currentRequest.requestId,
          previousAudience,
          newAudience: audience,
        });
      },

      /**
       * Admin override: Modify legal review outcome/status
       */
      adminOverrideLegalReview: async (
        outcome?: string,
        status?: string,
        reason?: string
      ): Promise<void> => {
        const state = get();

        if (!state.itemId || !state.currentRequest) {
          throw new Error('No request loaded');
        }

        const currentLegalReview: Partial<ILegalReview> = state.currentRequest.legalReview || {};

        SPContext.logger.warn('ADMIN OVERRIDE: Modifying legal review', {
          requestId: state.currentRequest.requestId,
          previousOutcome: currentLegalReview.outcome,
          previousStatus: currentLegalReview.status,
          newOutcome: outcome,
          newStatus: status,
          reason,
          adminUser: SPContext.currentUser?.email,
        });

        // Build admin override audit entry
        const changes: string[] = [];
        if (outcome !== undefined) {
          changes.push(`Outcome: "${currentLegalReview.outcome || 'Not set'}" → "${outcome || 'Cleared'}"`);
        }
        if (status !== undefined) {
          changes.push(`Status: "${currentLegalReview.status || 'Not set'}" → "${status || 'Cleared'}"`);
        }
        const adminOverrideNotes = formatAdminAuditEntry(
          'LEGAL REVIEW OVERRIDE',
          changes.join(', '),
          reason || 'No reason provided',
          state.currentRequest.adminOverrideNotes
        );

        const updatedReview: Partial<ILegalReview> = { ...currentLegalReview };

        if (outcome !== undefined) {
          updatedReview.outcome = outcome === '' ? undefined : (outcome as any);
        }

        if (status !== undefined) {
          updatedReview.status = status === '' ? undefined : (status as any);
        }

        await get().updateRequest({
          legalReview: updatedReview as ILegalReview,
          // Also update flat fields for backwards compatibility
          legalReviewOutcome: outcome === '' ? undefined : outcome,
          legalReviewStatus: status === '' ? undefined : status,
          adminOverrideNotes,
        });

        SPContext.logger.success('Admin legal review override completed', {
          requestId: state.currentRequest.requestId,
        });
      },

      /**
       * Admin override: Modify compliance review outcome/status
       */
      adminOverrideComplianceReview: async (
        outcome?: string,
        status?: string,
        reason?: string
      ): Promise<void> => {
        const state = get();

        if (!state.itemId || !state.currentRequest) {
          throw new Error('No request loaded');
        }

        const currentComplianceReview: Partial<IComplianceReview> = state.currentRequest.complianceReview || {};

        SPContext.logger.warn('ADMIN OVERRIDE: Modifying compliance review', {
          requestId: state.currentRequest.requestId,
          previousOutcome: currentComplianceReview.outcome,
          previousStatus: currentComplianceReview.status,
          newOutcome: outcome,
          newStatus: status,
          reason,
          adminUser: SPContext.currentUser?.email,
        });

        // Build admin override audit entry
        const changes: string[] = [];
        if (outcome !== undefined) {
          changes.push(`Outcome: "${currentComplianceReview.outcome || 'Not set'}" → "${outcome || 'Cleared'}"`);
        }
        if (status !== undefined) {
          changes.push(`Status: "${currentComplianceReview.status || 'Not set'}" → "${status || 'Cleared'}"`);
        }
        const adminOverrideNotes = formatAdminAuditEntry(
          'COMPLIANCE REVIEW OVERRIDE',
          changes.join(', '),
          reason || 'No reason provided',
          state.currentRequest.adminOverrideNotes
        );

        const updatedReview: Partial<IComplianceReview> = { ...currentComplianceReview };

        if (outcome !== undefined) {
          updatedReview.outcome = outcome === '' ? undefined : (outcome as any);
        }

        if (status !== undefined) {
          updatedReview.status = status === '' ? undefined : (status as any);
        }

        await get().updateRequest({
          complianceReview: updatedReview as IComplianceReview,
          // Also update flat fields for backwards compatibility
          complianceReviewOutcome: outcome === '' ? undefined : outcome,
          complianceReviewStatus: status === '' ? undefined : status,
          adminOverrideNotes,
        });

        SPContext.logger.success('Admin compliance review override completed', {
          requestId: state.currentRequest.requestId,
        });
      },

      /**
       * Admin override: Reopen completed/cancelled request
       * Restores request to an active workflow state
       */
      adminReopenRequest: async (reason: string): Promise<void> => {
        const state = get();

        if (!state.itemId || !state.currentRequest) {
          throw new Error('No request loaded');
        }

        const currentStatus = state.currentRequest.status;

        if (currentStatus !== 'Completed' && currentStatus !== 'Cancelled') {
          throw new Error('Can only reopen Completed or Cancelled requests');
        }

        SPContext.logger.warn('ADMIN OVERRIDE: Reopening request', {
          requestId: state.currentRequest.requestId,
          previousStatus: currentStatus,
          reason,
          adminUser: SPContext.currentUser?.email,
        });

        // Determine appropriate status to reopen to
        let reopenStatus: RequestStatus;

        if (currentStatus === 'Cancelled') {
          // Cancelled requests reopen to Draft
          reopenStatus = 'Draft' as RequestStatus;
        } else {
          // Completed requests reopen to Closeout (allowing re-closeout with different data)
          reopenStatus = 'Closeout' as RequestStatus;
        }

        // Build admin override audit entry
        const adminOverrideNotes = formatAdminAuditEntry(
          'REQUEST REOPENED',
          `Reopened from "${currentStatus}" to "${reopenStatus}"`,
          reason,
          state.currentRequest.adminOverrideNotes
        );

        await get().updateRequest({
          status: reopenStatus,
          previousStatus: currentStatus,
          // Clear closeout/cancel data
          closeoutBy: undefined,
          closeoutOn: undefined,
          cancelledBy: undefined,
          cancelledOn: undefined,
          cancelReason: undefined,
          adminOverrideNotes,
        });

        SPContext.logger.success('Admin request reopen completed', {
          requestId: state.currentRequest.requestId,
          newStatus: reopenStatus,
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
 * Selector for approvals array only
 */
export const useApprovalsData = (): Approval[] =>
  useRequestStore(state => state.currentRequest?.approvals || []);

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
  closeoutRequest: (trackingId?: string) => Promise<void>;
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
      cancelRequest: state.cancelRequest,
      holdRequest: state.holdRequest,
      resumeRequest: state.resumeRequest,
      reset: state.reset,
      revertChanges: state.revertChanges,
    }))
  );

/**
 * Custom hook to use request store
 * Automatically initializes based on itemId parameter
 *
 * NOTE: This hook subscribes to the entire store state.
 * For optimized re-renders, use the individual selector hooks above.
 *
 * IMPORTANT: This hook does NOT reset the store on unmount to prevent data loss
 * when components remount. The store should be explicitly reset when navigating
 * away from the form (e.g., via onClose handler).
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
    updateField,
    updateMultipleFields,
    saveAsDraft,
    submitRequest,
    revertChanges,
    hasUnsavedChanges,
  } = useRequestStore();

  // Track if this effect has already run for this itemId to prevent duplicate loads
  const hasInitializedRef = React.useRef<number | undefined>(undefined);

  // Auto-initialize on mount or when itemId changes
  // Uses a ref to track initialization state and prevent duplicate API calls
  React.useEffect(() => {
    // Skip if already initialized for this itemId
    if (hasInitializedRef.current === itemId) {
      return;
    }

    // Mark as initialized for this itemId
    hasInitializedRef.current = itemId;

    // Access store methods directly to avoid dependency issues
    const store = useRequestStore.getState();

    if (itemId) {
      SPContext.logger.info('useRequest: Loading request', { itemId });
      store.loadRequest(itemId).catch((err: unknown) => {
        SPContext.logger.error('useRequest: Auto-load request failed', err, { itemId });
      });
    } else {
      SPContext.logger.info('useRequest: Initializing new request');
      store.initializeNewRequest();
    }

    // No cleanup - store reset should be handled explicitly by the form's onClose handler
    // This prevents data loss when components temporarily unmount during React reconciliation
  }, [itemId]);

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

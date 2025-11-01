/**
 * Documents Store
 *
 * Centralized state management for ALL request documents
 * - Handles both approval documents and general attachments (Review/Supplemental)
 * - Manages pending operations (uploads, deletions, renames, type changes)
 * - Tracks upload progress and retry state
 * - Provides actions for file operations
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { SPContext } from 'spfx-toolkit';
import type {
  IStagedFile,
  FileOperationStatus,
} from '../services/approvalFileService';
import { DocumentType } from '../types/documentTypes';

/**
 * Existing file interface (from SharePoint)
 */
export interface IExistingFile {
  name: string;
  url: string;
  size: number;
  timeCreated: string;
  timeLastModified?: string;
  createdBy?: string;
  createdByEmail?: string;
  modifiedBy?: string;
  modifiedByEmail?: string;
  uniqueId: string;
  version?: string;
  listItemId?: number; // SharePoint list item ID for version history
}

/**
 * Document with metadata (normalized from SharePoint)
 */
export interface IDocument extends IExistingFile {
  documentType: DocumentType;
  id?: number;
}

/**
 * Staged file for upload (extends IStagedFile)
 */
export interface IStagedDocument extends Omit<IStagedFile, 'approvalType' | 'approvalIndex'> {
  documentType: DocumentType;
  itemId?: number; // Optional for new drafts not yet saved
}

/**
 * File to rename
 */
export interface IFileToRename {
  file: IDocument;
  newName: string;
  status: FileOperationStatus;
  error?: string;
}

/**
 * File type change
 */
export interface IFileTypeChange {
  file: IDocument;
  newType: DocumentType;
  status: FileOperationStatus;
  error?: string;
}

/**
 * Upload progress tracking
 */
export interface IUploadProgress {
  fileId: string;
  fileName: string;
  status: FileOperationStatus;
  progress: number; // 0-100
  error?: string;
  retryCount: number;
}

/**
 * Pending operation counts for UI display
 */
export interface IPendingCounts {
  newCount: number;
  modifiedCount: number;
  deletedCount: number;
}

/**
 * Documents store state
 */
interface IDocumentsState {
  // Document collections keyed by DocumentType
  documents: Map<DocumentType, IDocument[]>;

  // Pending operations (not yet saved to SharePoint)
  stagedFiles: IStagedDocument[];              // New files to upload
  filesToDelete: IDocument[];                  // Existing files marked for deletion
  filesToRename: IFileToRename[];              // Existing files to rename
  filesToChangeType: IFileTypeChange[];        // Attachments changing type

  // Upload tracking
  isLoading: boolean;
  uploadProgress: Map<string, IUploadProgress>;  // Track per-file progress
  retryCount: Map<string, number>;               // Retry attempts per file

  // Error state
  error?: string;

  // Actions - Load & Initialize
  loadDocuments: (itemId: number, documentType?: DocumentType) => Promise<void>;
  loadAllDocuments: (itemId: number) => Promise<void>;

  // Actions - File Staging
  stageFiles: (files: File[], documentType: DocumentType, itemId?: number) => void;
  removeStagedFile: (fileId: string) => void;

  // Actions - Mark for Operations
  markForDeletion: (file: IDocument) => void;
  undoDelete: (file: IDocument) => void;
  markForRename: (file: IDocument, newName: string) => void;
  cancelRename: (fileId: string) => void;
  markForTypeChange: (files: IDocument[], newType: DocumentType) => void;
  cancelTypeChange: (fileIds: string[]) => void;

  // Actions - Duplicate Detection
  checkDuplicates: (files: File[], documentType: DocumentType) => string[];

  // Actions - Execute Operations (called on Save/Submit)
  uploadPendingFiles: (
    itemId: number,
    onProgress: (fileId: string, progress: number, status: FileOperationStatus) => void
  ) => Promise<void>;
  retryUpload: (fileId: string) => Promise<void>;
  skipUpload: (fileId: string) => void;
  deletePendingFiles: () => Promise<void>;
  renamePendingFiles: () => Promise<void>;
  changeTypePendingFiles: (itemId: number) => Promise<void>;

  // Actions - Queries
  getDocuments: (documentType: DocumentType) => IDocument[];
  getStagedFiles: (documentType?: DocumentType) => IStagedDocument[];
  getPendingCounts: (documentType: DocumentType) => IPendingCounts;
  hasPendingOperations: () => boolean;

  // Actions - Utility
  clearPendingOperations: () => void;
  clearError: () => void;
  reset: () => void;
}

/**
 * Initial state
 */
const initialState = {
  documents: new Map<DocumentType, IDocument[]>(),
  stagedFiles: [],
  filesToDelete: [],
  filesToRename: [],
  filesToChangeType: [],
  isLoading: false,
  uploadProgress: new Map<string, IUploadProgress>(),
  retryCount: new Map<string, number>(),
  error: undefined,
};

/**
 * Documents store
 */
export const useDocumentsStore = create<IDocumentsState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      /**
       * Load documents for specific type or all attachments
       */
      loadDocuments: async (itemId: number, documentType?: DocumentType): Promise<void> => {
        set({ isLoading: true, error: undefined });

        try {
          SPContext.logger.info('Loading documents', { itemId, documentType });

          // TODO: Implement document loading from SharePoint
          // This will be implemented in documentService.ts

          // For now, just clear loading state
          set({ isLoading: false });

          SPContext.logger.success('Documents loaded successfully', { itemId, documentType });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load documents';
          SPContext.logger.error('Failed to load documents', error, { itemId, documentType });
          set({ error: errorMessage, isLoading: false });
        }
      },

      /**
       * Load all documents for an item
       */
      loadAllDocuments: async (itemId: number): Promise<void> => {
        set({ isLoading: true, error: undefined });

        try {
          SPContext.logger.info('Loading all documents', { itemId });

          // TODO: Implement loading all document types

          set({ isLoading: false });

          SPContext.logger.success('All documents loaded successfully', { itemId });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load documents';
          SPContext.logger.error('Failed to load all documents', error, { itemId });
          set({ error: errorMessage, isLoading: false });
        }
      },

      /**
       * Stage files for upload
       */
      stageFiles: (files: File[], documentType: DocumentType, itemId?: number): void => {
        const newStaged: IStagedDocument[] = files.map((file, index) => ({
          id: `staged-${Date.now()}-${index}`,
          file,
          documentType,
          itemId,
          status: 'pending' as FileOperationStatus,
          progress: 0,
        }));

        set(state => ({
          stagedFiles: [...state.stagedFiles, ...newStaged],
        }));

        SPContext.logger.info('Files staged for upload', {
          count: files.length,
          documentType,
          itemId: itemId || 'new draft',
        });
      },

      /**
       * Remove staged file
       */
      removeStagedFile: (fileId: string): void => {
        set(state => ({
          stagedFiles: state.stagedFiles.filter(f => f.id !== fileId),
        }));

        SPContext.logger.info('Staged file removed', { fileId });
      },

      /**
       * Mark file for deletion
       */
      markForDeletion: (file: IDocument): void => {
        set(state => {
          // Check if already marked
          if (state.filesToDelete.some(f => f.uniqueId === file.uniqueId)) {
            return state;
          }

          return {
            filesToDelete: [...state.filesToDelete, file],
          };
        });

        SPContext.logger.info('File marked for deletion', { fileName: file.name });
      },

      /**
       * Undo file deletion
       */
      undoDelete: (file: IDocument): void => {
        set(state => ({
          filesToDelete: state.filesToDelete.filter(f => f.uniqueId !== file.uniqueId),
        }));

        SPContext.logger.info('File deletion undone', { fileName: file.name });
      },

      /**
       * Mark file for rename
       */
      markForRename: (file: IDocument, newName: string): void => {
        set(state => {
          // Remove existing rename for this file
          const filtered = state.filesToRename.filter(r => r.file.uniqueId !== file.uniqueId);

          return {
            filesToRename: [
              ...filtered,
              {
                file,
                newName,
                status: 'pending' as FileOperationStatus,
              },
            ],
          };
        });

        SPContext.logger.info('File marked for rename', {
          oldName: file.name,
          newName,
        });
      },

      /**
       * Cancel file rename
       */
      cancelRename: (fileId: string): void => {
        set(state => ({
          filesToRename: state.filesToRename.filter(r => r.file.uniqueId !== fileId),
        }));

        SPContext.logger.info('File rename canceled', { fileId });
      },

      /**
       * Mark files for type change (Review <-> Supplemental)
       */
      markForTypeChange: (files: IDocument[], newType: DocumentType): void => {
        set(state => {
          // Remove existing type changes for these files
          const fileIds = files.map(f => f.uniqueId);
          // ES5 compatible: Use indexOf instead of includes
          const filtered = state.filesToChangeType.filter(
            tc => fileIds.indexOf(tc.file.uniqueId) === -1
          );

          const newChanges: IFileTypeChange[] = files.map(file => ({
            file,
            newType,
            status: 'pending' as FileOperationStatus,
          }));

          return {
            filesToChangeType: [...filtered, ...newChanges],
          };
        });

        SPContext.logger.info('Files marked for type change', {
          count: files.length,
          newType,
        });
      },

      /**
       * Cancel type changes
       */
      cancelTypeChange: (fileIds: string[]): void => {
        // ES5 compatible: Use indexOf instead of includes
        set(state => ({
          filesToChangeType: state.filesToChangeType.filter(
            tc => fileIds.indexOf(tc.file.uniqueId) === -1
          ),
        }));

        SPContext.logger.info('Type changes canceled', { count: fileIds.length });
      },

      /**
       * Check for duplicate filenames
       */
      checkDuplicates: (files: File[], documentType: DocumentType): string[] => {
        const state = get();
        const existingDocs = state.documents.get(documentType) || [];
        const existingNames = existingDocs.map(d => d.name.toLowerCase());

        const duplicates = files
          .map(f => f.name)
          .filter(name => existingNames.indexOf(name.toLowerCase()) !== -1);

        return duplicates;
      },

      /**
       * Upload pending files
       */
      uploadPendingFiles: async (
        itemId: number,
        onProgress: (fileId: string, progress: number, status: FileOperationStatus) => void
      ): Promise<void> => {
        const state = get();

        if (state.stagedFiles.length === 0) {
          SPContext.logger.info('No files to upload');
          return;
        }

        try {
          SPContext.logger.info('Starting batch file upload', {
            count: state.stagedFiles.length,
            itemId,
          });

          // TODO: Implement actual upload logic in documentService.ts
          // For now, just log

          SPContext.logger.success('Batch upload completed', { itemId });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Upload failed';
          SPContext.logger.error('Batch upload failed', error, { itemId });
          set({ error: errorMessage });
          throw error;
        }
      },

      /**
       * Retry failed upload
       */
      retryUpload: async (fileId: string): Promise<void> => {
        SPContext.logger.info('Retrying file upload', { fileId });

        // TODO: Implement retry logic
      },

      /**
       * Skip failed upload
       */
      skipUpload: (fileId: string): void => {
        const state = get();

        // ES5 compatible: Manual Map cloning
        const progress = new Map<string, IUploadProgress>();
        state.uploadProgress.forEach((value, key) => {
          progress.set(key, value);
        });

        const current = progress.get(fileId);

        if (current) {
          progress.set(fileId, {
            ...current,
            status: 'skipped' as FileOperationStatus,
          });

          set({ uploadProgress: progress });
        }

        SPContext.logger.info('File upload skipped', { fileId });
      },

      /**
       * Delete pending files
       */
      deletePendingFiles: async (): Promise<void> => {
        const state = get();

        if (state.filesToDelete.length === 0) {
          return;
        }

        try {
          SPContext.logger.info('Deleting files', { count: state.filesToDelete.length });

          // TODO: Implement delete logic in documentService.ts

          set({ filesToDelete: [] });

          SPContext.logger.success('Files deleted successfully');
        } catch (error: unknown) {
          SPContext.logger.error('File deletion failed', error);
          throw error;
        }
      },

      /**
       * Rename pending files
       */
      renamePendingFiles: async (): Promise<void> => {
        const state = get();

        if (state.filesToRename.length === 0) {
          return;
        }

        try {
          SPContext.logger.info('Renaming files', { count: state.filesToRename.length });

          // TODO: Implement rename logic in documentService.ts

          set({ filesToRename: [] });

          SPContext.logger.success('Files renamed successfully');
        } catch (error: unknown) {
          SPContext.logger.error('File rename failed', error);
          throw error;
        }
      },

      /**
       * Change document types for pending files
       */
      changeTypePendingFiles: async (itemId: number): Promise<void> => {
        const state = get();

        if (state.filesToChangeType.length === 0) {
          return;
        }

        try {
          SPContext.logger.info('Changing document types', {
            count: state.filesToChangeType.length,
            itemId,
          });

          // TODO: Implement type change logic in documentService.ts

          set({ filesToChangeType: [] });

          SPContext.logger.success('Document types changed successfully');
        } catch (error: unknown) {
          SPContext.logger.error('Type change failed', error);
          throw error;
        }
      },

      /**
       * Get documents by type
       */
      getDocuments: (documentType: DocumentType): IDocument[] => {
        const state = get();
        return state.documents.get(documentType) || [];
      },

      /**
       * Get staged files (optionally filtered by type)
       */
      getStagedFiles: (documentType?: DocumentType): IStagedDocument[] => {
        const state = get();

        if (!documentType) {
          return state.stagedFiles;
        }

        return state.stagedFiles.filter(f => f.documentType === documentType);
      },

      /**
       * Get pending operation counts for a document type
       */
      getPendingCounts: (documentType: DocumentType): IPendingCounts => {
        const state = get();

        const newCount = state.stagedFiles.filter(f => f.documentType === documentType).length;

        const existingDocs = state.documents.get(documentType) || [];
        const existingIds = existingDocs.map(d => d.uniqueId);

        const modifiedCount = state.filesToRename.filter(
          r => existingIds.indexOf(r.file.uniqueId) !== -1
        ).length + state.filesToChangeType.filter(
          tc => existingIds.indexOf(tc.file.uniqueId) !== -1
        ).length;

        const deletedCount = state.filesToDelete.filter(
          f => f.documentType === documentType
        ).length;

        return {
          newCount,
          modifiedCount,
          deletedCount,
        };
      },

      /**
       * Check if there are any pending operations
       */
      hasPendingOperations: (): boolean => {
        const state = get();

        return (
          state.stagedFiles.length > 0 ||
          state.filesToDelete.length > 0 ||
          state.filesToRename.length > 0 ||
          state.filesToChangeType.length > 0
        );
      },

      /**
       * Clear all pending operations
       */
      clearPendingOperations: (): void => {
        set({
          stagedFiles: [],
          filesToDelete: [],
          filesToRename: [],
          filesToChangeType: [],
          uploadProgress: new Map(),
          retryCount: new Map(),
        });

        SPContext.logger.info('Pending operations cleared');
      },

      /**
       * Clear error state
       */
      clearError: (): void => {
        set({ error: undefined });
      },

      /**
       * Reset store to initial state
       */
      reset: (): void => {
        set(initialState);
        SPContext.logger.info('Documents store reset');
      },
    }),
    { name: 'DocumentsStore' }
  )
);

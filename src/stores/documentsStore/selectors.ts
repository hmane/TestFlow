/**
 * Documents Store Selectors
 *
 * Optimized selectors for the documents store to prevent unnecessary re-renders.
 */

import type { FileOperationStatus } from '@services/approvalFileService';
import { DocumentType } from '@appTypes/documentTypes';
import { useDocumentsStore } from './store';
import type { IDocument, IUploadProgress } from './types';

/**
 * Selector for library ID only
 * Use this in components that need the RequestDocuments library ID
 */
export const useDocumentLibraryId = (): string | undefined =>
  useDocumentsStore(state => state.libraryId);

/**
 * Selector for loading state only
 */
export const useDocumentsLoading = (): boolean =>
  useDocumentsStore(state => state.isLoading);

/**
 * Selector for uploading state only
 */
export const useDocumentsUploading = (): boolean =>
  useDocumentsStore(state => state.isUploading);

/**
 * Selector for error state only
 */
export const useDocumentsError = (): string | undefined =>
  useDocumentsStore(state => state.error);

/**
 * Selector for staged files count (for badge display)
 */
export const useStagedFilesCount = (): number =>
  useDocumentsStore(state => state.stagedFiles.length);

/**
 * Selector for files to delete count (for badge display)
 */
export const useFilesToDeleteCount = (): number =>
  useDocumentsStore(state => state.filesToDelete.length);

/**
 * Selector for pending operations check
 */
export const useHasPendingDocumentOperations = (): boolean =>
  useDocumentsStore(state =>
    state.stagedFiles.length > 0 ||
    state.filesToDelete.length > 0 ||
    state.filesToRename.length > 0 ||
    state.filesToChangeType.length > 0
  );

/**
 * Selector for upload progress (returns entire Map)
 */
export const useUploadProgress = (): Map<string, IUploadProgress> =>
  useDocumentsStore(state => state.uploadProgress);

/**
 * Selector for documents store actions only (stable reference)
 * Use this when you only need actions without subscribing to state changes
 */
export const useDocumentsActions = (): {
  loadDocuments: (itemId: number, forceReload?: boolean) => Promise<void>;
  loadAllDocuments: (itemId: number) => Promise<void>;
  stageFiles: (files: File[], documentType: DocumentType, itemId?: number) => void;
  removeStagedFile: (fileId: string) => void;
  markForDeletion: (file: IDocument) => void;
  undoDelete: (file: IDocument) => void;
  markForRename: (file: IDocument, newName: string) => void;
  cancelRename: (fileId: string) => void;
  uploadPendingFiles: (itemId: number, onProgress: (fileId: string, progress: number, status: FileOperationStatus) => void) => Promise<void>;
  retryUpload: (fileId: string) => Promise<void>;
  skipUpload: (fileId: string) => void;
  clearPendingOperations: () => void;
  clearError: () => void;
  reset: () => void;
} =>
  useDocumentsStore(state => ({
    loadDocuments: state.loadDocuments,
    loadAllDocuments: state.loadAllDocuments,
    stageFiles: state.stageFiles,
    removeStagedFile: state.removeStagedFile,
    markForDeletion: state.markForDeletion,
    undoDelete: state.undoDelete,
    markForRename: state.markForRename,
    cancelRename: state.cancelRename,
    uploadPendingFiles: state.uploadPendingFiles,
    retryUpload: state.retryUpload,
    skipUpload: state.skipUpload,
    clearPendingOperations: state.clearPendingOperations,
    clearError: state.clearError,
    reset: state.reset,
  }));

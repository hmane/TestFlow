/**
 * Documents Store
 *
 * Barrel export for the documents store module.
 *
 * This module provides state management for request documents using Zustand.
 * It handles loading, staging, and file operations for documents.
 */

// Main store
export { useDocumentsStore } from './store';

// Types
export type {
  IExistingFile,
  IDocument,
  IStagedDocument,
  IFileUploadCompleteResult,
  IFileToRename,
  IFileTypeChange,
  IUploadProgress,
  IPendingCounts,
  IDocumentsState,
} from './types';

// Selectors
export {
  useDocumentLibraryId,
  useDocumentsLoading,
  useDocumentsUploading,
  useDocumentsError,
  useStagedFilesCount,
  useFilesToDeleteCount,
  useHasPendingDocumentOperations,
  useUploadProgress,
  useDocumentsActions,
} from './selectors';

/**
 * Documents Store Types
 *
 * Type definitions for the documents store.
 */

import type { FileOperationStatus, IStagedFile } from '@services/approvalFileService';
import { DocumentType } from '@appTypes/documentTypes';

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
 * Result from file upload completion callback
 */
export interface IFileUploadCompleteResult {
  success: boolean;
  fileName?: string;
  error?: string;
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
  maxRetries: number;
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
 * Documents store state interface
 */
export interface IDocumentsState {
  // RequestDocuments library ID (loaded once, used for file operations)
  libraryId: string | undefined;

  // Document collections keyed by DocumentType
  documents: Map<DocumentType, IDocument[]>;

  // Pending operations (not yet saved to SharePoint)
  stagedFiles: IStagedDocument[];              // New files to upload
  filesToDelete: IDocument[];                  // Existing files marked for deletion
  filesToRename: IFileToRename[];              // Existing files to rename
  filesToChangeType: IFileTypeChange[];        // Attachments changing type

  // Upload tracking
  isLoading: boolean;
  isUploading: boolean;                          // Track if uploads are currently in progress
  uploadProgress: Map<string, IUploadProgress>;  // Track per-file progress
  retryCount: Map<string, number>;               // Retry attempts per file

  // Error state
  error?: string;

  // Actions - Load & Initialize
  loadDocuments: (itemId: number, forceReload?: boolean) => Promise<void>;
  loadAllDocuments: (itemId: number, forceReload?: boolean) => Promise<void>;

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

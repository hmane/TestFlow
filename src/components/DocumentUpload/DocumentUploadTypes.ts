/**
 * Document Upload Component Types
 *
 * Type definitions for the unified DocumentUpload component
 */

import type { DocumentType } from '../../types/documentTypes';
import type { IDocument } from '../../stores/documentsStore';
import type { FileOperationStatus } from '../../services/approvalFileService';

/**
 * Props for DocumentUpload component
 */
export interface IDocumentUploadProps {
  // Core
  itemId?: number;                     // SharePoint list item ID (optional for new drafts)
  documentType?: DocumentType | string; // If set: Approval mode (accepts string for dynamic approval types), else: Attachment mode

  // Configuration
  isReadOnly?: boolean;                // Disable all editing
  maxFiles?: number;                   // Max number of files (default: 50)
  maxFileSize?: number;                // Max file size in bytes (default: 250MB)
  allowedExtensions?: string[];        // Allowed file extensions
  required?: boolean;                  // Is at least one file required?

  // Labels
  label?: string;                      // Section label
  description?: string;                // Help text

  // Callbacks
  onFilesChange?: () => void;          // Called when files change
  onError?: (error: string) => void;   // Called on error

  // SharePoint
  siteUrl: string;                     // SharePoint site URL
  documentLibraryTitle?: string;       // Document library name (default: 'RequestDocuments')
}

/**
 * Props for DocumentCard component
 */
export interface IDocumentCardProps {
  document: IDocument;                 // Document to display
  isNew?: boolean;                     // Is this a new (not yet uploaded) file?
  isPending?: boolean;                 // Has pending changes (rename/type change)?
  isDeleted?: boolean;                 // Marked for deletion?
  isDragging?: boolean;                // Currently being dragged?
  pendingName?: string;                // New name (if rename pending)
  pendingType?: DocumentType;          // New type (if type change pending)

  // Callbacks
  onRename?: (newName: string) => void;
  onDelete?: () => void;
  onDownload?: () => void;
  onChangeType?: (newType: DocumentType) => void;
  onUndoDelete?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;

  // Config
  showTypeChange?: boolean;            // Show "Change Type" in menu (Attachment mode only)
  isReadOnly?: boolean;
}

/**
 * Props for DocumentGroup component (Attachment mode)
 */
export interface IDocumentGroupProps {
  title: string;                       // Section title (e.g., "Review Documents")
  documentType: DocumentType;          // Type of documents in this group
  documents: IDocument[];              // Documents to display
  stagedFiles: File[];                 // New files staged for upload
  pendingCounts: {                     // Counts for section header
    newCount: number;
    modifiedCount: number;
    deletedCount: number;
  };

  // Drag and drop
  isDropTarget?: boolean;              // Is this section a drop target?
  onDrop?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;

  // Callbacks
  onDocumentAction?: (action: DocumentAction) => void;

  // Config
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  isReadOnly?: boolean;
}

/**
 * Document action types
 */
export interface DocumentAction {
  type: 'rename' | 'delete' | 'download' | 'changeType' | 'undoDelete';
  documentId: string;
  data?: unknown;                      // Action-specific data
}

/**
 * Props for DocumentTypeDialog
 */
export interface IDocumentTypeDialogProps {
  isOpen: boolean;
  files: Array<{ name: string; size: number }>;  // Files to set type for
  currentType?: DocumentType;          // Current type (if changing existing files)
  onSave: (selectedType: DocumentType) => void;
  onCancel: () => void;
  mode: 'upload' | 'change';           // Upload new files or change existing
}

/**
 * Props for DuplicateFileDialog
 */
export interface IDuplicateFileDialogProps {
  isOpen: boolean;
  duplicateFiles: Array<{ name: string; size: number }>;
  onOverwrite: () => void;
  onSkip: () => void;
}

/**
 * Props for UploadProgressDialog
 */
export interface IUploadProgressDialogProps {
  isOpen: boolean;
  uploadProgress: Map<string, IFileUploadProgress>;
  onRetry: (fileId: string) => void;
  onSkip: (fileId: string) => void;
  onClose: () => void;
  canClose: boolean;                   // Disable close while uploads in progress
}

/**
 * File upload progress tracking
 */
export interface IFileUploadProgress {
  fileId: string;
  fileName: string;
  status: FileOperationStatus;
  progress: number;                    // 0-100
  error?: string;
  retryCount: number;
  maxRetries: number;
}

/**
 * Upload mode for DocumentUpload
 */
export enum UploadMode {
  Approval = 'approval',               // documentType prop is set (approval mode)
  Attachment = 'attachment',           // documentType prop is undefined (attachment mode)
}

/**
 * Document state for UI display
 */
export interface IDocumentState {
  document: IDocument;
  isNew: boolean;
  isPending: boolean;
  isDeleted: boolean;
  pendingName?: string;
  pendingType?: DocumentType;
}

/**
 * File validation result
 */
export interface IFileValidationResult {
  isValid: boolean;
  fileName: string;
  errors: string[];
  warnings: string[];
}

/**
 * Drag and drop data
 */
export interface IDragDropData {
  documentId: string;
  fromType: DocumentType;
  toType?: DocumentType;
}

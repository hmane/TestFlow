/**
 * DocumentUpload Component
 *
 * Unified component for document management
 * - Approval Mode: When documentType prop is set (e.g., CommunicationApproval)
 * - Attachment Mode: When documentType prop is undefined (Review/Supplemental grouping)
 *
 * Features:
 * - Drag-and-drop file upload
 * - Duplicate detection and confirmation
 * - Document type selection (Attachment mode)
 * - Drag documents between groups to change type (Attachment mode)
 * - Upload progress with retry/skip
 * - Validation: At least 1 document required on submit
 */

import * as React from 'react';
import {
  Stack,
  Text,
  PrimaryButton,
  IconButton,
  Icon,
  MessageBar,
  MessageBarType,
} from '@fluentui/react';

import { Lists } from '@sp/Lists';
import { SPContext } from 'spfx-toolkit';

import { useDocumentsStore, type IDocument, type IStagedDocument } from '../../stores/documentsStore';
import { DocumentType } from '../../types/documentTypes';
import { DocumentCard } from './DocumentCard';
import { DropZoneCard } from './DropZoneCard';
import { DocumentTypeDialog } from './DocumentTypeDialog';
import { DuplicateFileDialog } from './DuplicateFileDialog';
import { UploadProgressDialog } from './UploadProgressDialog';
import { checkDuplicateFiles } from '../../services/documentService';
import type { IDocumentUploadProps, DocumentAction } from './DocumentUploadTypes';
import { UploadMode } from './DocumentUploadTypes';
import './DocumentUpload.scss';

/**
 * Default configuration
 */
const DEFAULT_MAX_FILES = 50;
const DEFAULT_MAX_FILE_SIZE = 250 * 1024 * 1024; // 250MB
const DEFAULT_LIBRARY_TITLE = Lists.RequestDocuments.Title;

const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.zip',
];

/**
 * DocumentUpload Component
 */
export const DocumentUpload: React.FC<IDocumentUploadProps> = ({
  itemId,
  documentType,
  isReadOnly = false,
  maxFiles = DEFAULT_MAX_FILES,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  allowedExtensions = ALLOWED_EXTENSIONS,
  required = false,
  label,
  description,
  onFilesChange,
  onError,
  siteUrl,
  documentLibraryTitle = DEFAULT_LIBRARY_TITLE,
}) => {
  // Determine mode
  const mode: UploadMode = documentType ? UploadMode.Approval : UploadMode.Attachment;

  // Store state
  const {
    documents,
    stagedFiles,
    filesToDelete,
    filesToRename,
    isUploading,
    uploadProgress,
    loadDocuments,
    stageFiles,
    removeStagedFile,
    markForDeletion,
    undoDelete,
    markForRename,
    cancelRename,
    markForTypeChange,
    getPendingCounts,
    retryUpload,
    skipUpload,
  } = useDocumentsStore();

  // Local state
  const [isTypeDialogOpen, setIsTypeDialogOpen] = React.useState(false);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = React.useState(false);
  const [pendingFiles, setPendingFiles] = React.useState<File[]>([]);
  const [pendingTargetType, setPendingTargetType] = React.useState<DocumentType | undefined>();
  const [duplicateFiles, setDuplicateFiles] = React.useState<string[]>([]);
  const [isDragging, setIsDragging] = React.useState(false);
  const [validationError, setValidationError] = React.useState<string | undefined>();

  // Document card drag-and-drop state (for moving between sections)
  const [draggedDocId, setDraggedDocId] = React.useState<string | null>(null);
  const [dragSourceType, setDragSourceType] = React.useState<DocumentType | null>(null);
  const [dropTargetType, setDropTargetType] = React.useState<DocumentType | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const dragCounter = React.useRef(0); // Track nested drag enter/leave events
  const dragResetTimerRef = React.useRef<number | null>(null);

  /**
   * Load documents on mount
   */
  React.useEffect(() => {
    if (!itemId) {
      return; // Don't load for new requests
    }

    if (mode === UploadMode.Approval && documentType) {
      void loadDocuments(itemId, documentType as any);
    } else if (mode === UploadMode.Attachment) {
      // Load both Review and Supplemental
      void loadDocuments(itemId, DocumentType.Review);
      void loadDocuments(itemId, DocumentType.Supplemental);
    }
  }, [itemId, documentType, mode, loadDocuments]);

  /**
   * Cleanup timer on unmount
   */
  React.useEffect(() => {
    return () => {
      if (dragResetTimerRef.current) {
        window.clearTimeout(dragResetTimerRef.current);
      }
    };
  }, []);

  /**
   * Get documents for specific type
   */
  const getDocumentsByType = React.useCallback(
    (type: DocumentType) => {
      return documents.get(type) || [];
    },
    [documents]
  );

  /**
   * Get staged files for specific type
   */
  const getStagedByType = React.useCallback(
    (type: DocumentType) => {
      return stagedFiles
        .filter(sf => sf.documentType === type)
        .map(sf => sf.file);
    },
    [stagedFiles]
  );

  /**
   * Validate file
   */
  const validateFile = React.useCallback(
    (file: File): { isValid: boolean; error?: string } => {
      // Check file size
      if (file.size > maxFileSize) {
        return {
          isValid: false,
          error: `File "${file.name}" exceeds maximum size of ${Math.round(maxFileSize / 1024 / 1024)}MB`,
        };
      }

      // Check extension (support both 'png' and '.png' formats in allowedExtensions)
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      const extWithDot = `.${fileExt}`;
      const extWithoutDot = fileExt;

      // Check if extension matches (with or without dot)
      const isAllowed = allowedExtensions.indexOf(extWithDot) !== -1 ||
                        allowedExtensions.indexOf(extWithoutDot) !== -1;

      if (!isAllowed) {
        // Normalize extensions for display (remove dots if present) - ES5 compatible
        const displayExts = allowedExtensions.map(function(ext) {
          return ext.charAt(0) === '.' ? ext.substring(1) : ext;
        });
        return {
          isValid: false,
          error: `File "${file.name}" has an unsupported file type. Allowed types: ${displayExts.join(', ')}`,
        };
      }

      // Check file count
      let docsCount = 0;
      documents.forEach((docs) => {
        docsCount += docs.length;
      });
      const currentCount = stagedFiles.length + docsCount;
      if (currentCount >= maxFiles) {
        return {
          isValid: false,
          error: `Maximum number of files (${maxFiles}) reached`,
        };
      }

      return { isValid: true };
    },
    [maxFileSize, maxFiles, allowedExtensions, stagedFiles.length, documents]
  );

  /**
   * Handle file selection
   */
  const handleFilesSelected = React.useCallback(
    async (files: FileList | File[], targetType?: DocumentType) => {
      // Check if type dialog is already open in attachment mode
      // If so, accumulate files instead of overwriting
      if (mode === UploadMode.Attachment && isTypeDialogOpen) {
        // Show error: Complete current upload first
        const errorMsg = 'Please complete the current file upload selection before adding more files.';
        if (onError) {
          onError(errorMsg);
        }
        setValidationError(errorMsg);

        // Force reset drag state
        if (dragResetTimerRef.current) {
          window.clearTimeout(dragResetTimerRef.current);
        }
        dragCounter.current = 0;
        setIsDragging(false);
        return;
      }

      // Check if duplicate dialog is open
      if (isDuplicateDialogOpen) {
        const errorMsg = 'Please complete the current duplicate file handling before adding more files.';
        if (onError) {
          onError(errorMsg);
        }
        setValidationError(errorMsg);

        // Force reset drag state
        if (dragResetTimerRef.current) {
          window.clearTimeout(dragResetTimerRef.current);
        }
        dragCounter.current = 0;
        setIsDragging(false);
        return;
      }

      // ES5 compatible: Manual conversion instead of Array.from()
      const fileArray: File[] = [];
      if (files instanceof FileList) {
        for (let i = 0; i < files.length; i++) {
          fileArray.push(files[i]);
        }
      } else {
        for (let i = 0; i < files.length; i++) {
          fileArray.push(files[i]);
        }
      }

      // Validate files
      const validFiles: File[] = [];
      for (const file of fileArray) {
        const validation = validateFile(file);
        if (!validation.isValid) {
          if (onError) {
            onError(validation.error!);
          }
          setValidationError(validation.error);
          continue;
        }
        validFiles.push(file);
      }

      if (validFiles.length === 0) {
        // Force reset drag state even if no valid files
        if (dragResetTimerRef.current) {
          window.clearTimeout(dragResetTimerRef.current);
        }
        dragCounter.current = 0;
        setIsDragging(false);
        return;
      }

      // Set pending files and target type
      setPendingFiles(validFiles);
      setPendingTargetType(targetType); // Remember target type for duplicate dialog flow

      // Schedule a forced reset after a short delay to handle any edge cases
      if (dragResetTimerRef.current) {
        window.clearTimeout(dragResetTimerRef.current);
      }
      dragResetTimerRef.current = window.setTimeout(() => {
        dragCounter.current = 0;
        setIsDragging(false);
        dragResetTimerRef.current = null;
      }, 200);

      // Determine which document type to check for duplicates
      const typeToCheck = targetType || documentType || DocumentType.Review;

      // Check for duplicates in staged files (local, not yet uploaded)
      const stagedDuplicates: string[] = [];
      const stagedFilesForType = stagedFiles.filter(function(sf) {
        return sf.documentType === typeToCheck;
      });
      const stagedFileNames = new Set(stagedFilesForType.map(sf => sf.file.name.toLowerCase()));

      for (const file of validFiles) {
        if (stagedFileNames.has(file.name.toLowerCase())) {
          stagedDuplicates.push(file.name);
        }
      }

      // Check for duplicates in existing documents (SharePoint)
      let existingDuplicates: string[] = [];
      if (itemId) {
        existingDuplicates = await checkDuplicateFiles(validFiles, itemId, typeToCheck as any, documentLibraryTitle);
      }

      // Combine all duplicates (ES5 compatible: manual deduplication)
      const allDuplicates: string[] = [];
      const seen = new Set<string>();

      for (const dup of stagedDuplicates) {
        if (!seen.has(dup)) {
          seen.add(dup);
          allDuplicates.push(dup);
        }
      }

      for (const dup of existingDuplicates) {
        if (!seen.has(dup)) {
          seen.add(dup);
          allDuplicates.push(dup);
        }
      }

      if (allDuplicates.length > 0) {
        // Store duplicate info for dialog
        setDuplicateFiles(allDuplicates);
        setIsDuplicateDialogOpen(true);
      } else {
        // No duplicates, proceed based on mode
        if (mode === UploadMode.Approval && documentType) {
          // Approval mode: Stage files directly
          stageFiles(validFiles, documentType as any, itemId);
          setPendingFiles([]); // Clear pending files after staging
          if (onFilesChange) {
            onFilesChange();
          }
        } else if (targetType) {
          // Attachment mode with specific target type (dropped on a section)
          // Stage files directly without showing dialog
          stageFiles(validFiles, targetType, itemId);
          setPendingFiles([]); // Clear pending files after staging
          if (onFilesChange) {
            onFilesChange();
          }
        } else {
          // Attachment mode without target type: Show type selection dialog
          if (validFiles.length > 0) {
            setIsTypeDialogOpen(true);
          }
        }
      }
    },
    [validateFile, itemId, documentType, documentLibraryTitle, mode, stageFiles, stagedFiles, onFilesChange, onError, isTypeDialogOpen, isDuplicateDialogOpen]
  );

  /**
   * Handle file input change
   */
  const handleFileInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const filesArray: File[] = [];
        for (let i = 0; i < e.target.files.length; i++) {
          filesArray.push(e.target.files[i]);
        }
        void handleFilesSelected(filesArray, pendingTargetType);
        e.target.value = ''; // Reset input
      }
    },
    [handleFilesSelected, pendingTargetType]
  );

  /**
   * Force reset drag state (helper)
   */
  const forceResetDragState = React.useCallback(() => {
    if (dragResetTimerRef.current) {
      window.clearTimeout(dragResetTimerRef.current);
    }
    dragCounter.current = 0;
    setIsDragging(false);
  }, []);

  /**
   * Handle drag-and-drop upload
   */
  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Force reset immediately
      forceResetDragState();

      if (isReadOnly) return;

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        void handleFilesSelected(files);
      }
    },
    [isReadOnly, handleFilesSelected, forceResetDragState]
  );

  /**
   * Handle drag over
   */
  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  /**
   * Handle drag enter
   */
  const handleDragEnter = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Only track file drags, not document card drags
      if (!draggedDocId && e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        dragCounter.current++;
        setIsDragging(true);
      }
    },
    [draggedDocId]
  );

  /**
   * Handle drag leave
   */
  const handleDragLeave = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Only process if we were tracking file drags
      if (!draggedDocId) {
        dragCounter.current--;
        if (dragCounter.current <= 0) {
          dragCounter.current = 0;
          setIsDragging(false);
        }
      }
    },
    [draggedDocId]
  );

  /**
   * Handle document type dialog save
   */
  const handleTypeDialogSave = React.useCallback(
    (selectedType: DocumentType) => {
      setIsTypeDialogOpen(false);
      setValidationError(undefined); // Clear any validation errors

      if (pendingFiles.length > 0) {
        stageFiles(pendingFiles, selectedType as any, itemId);
        if (onFilesChange) {
          onFilesChange();
        }
      }

      setPendingFiles([]);
      setPendingTargetType(undefined);
    },
    [pendingFiles, stageFiles, itemId, onFilesChange]
  );

  /**
   * Handle duplicate dialog - Overwrite
   */
  const handleDuplicateOverwrite = React.useCallback(() => {
    setIsDuplicateDialogOpen(false);
    setValidationError(undefined); // Clear any validation errors

    // Remove duplicate staged files before staging new files
    // Note: We DON'T mark existing SharePoint documents for deletion
    // Instead, the new staged file will "replace" the existing one (shown with UPDATED badge)
    const duplicateFileNamesLower = new Set(duplicateFiles.map(name => name.toLowerCase()));
    const typeToCheck = pendingTargetType || documentType || DocumentType.Review;

    // Find and remove staged files with duplicate names in the same document type
    for (let i = 0; i < stagedFiles.length; i++) {
      const stagedFile = stagedFiles[i];
      if (
        stagedFile.documentType === typeToCheck &&
        duplicateFileNamesLower.has(stagedFile.file.name.toLowerCase())
      ) {
        removeStagedFile(stagedFile.id);
      }
    }

    // Proceed with upload
    if (mode === UploadMode.Approval && documentType) {
      stageFiles(pendingFiles, documentType as any, itemId);
      if (onFilesChange) {
        onFilesChange();
      }
      setPendingFiles([]);
      setPendingTargetType(undefined);
    } else if (pendingTargetType) {
      // Attachment mode with specific target type (dropped on a section)
      stageFiles(pendingFiles, pendingTargetType, itemId);
      if (onFilesChange) {
        onFilesChange();
      }
      setPendingFiles([]);
      setPendingTargetType(undefined);
    } else {
      // Show type dialog
      setIsTypeDialogOpen(true);
    }
  }, [mode, documentType, pendingFiles, pendingTargetType, duplicateFiles, stagedFiles, removeStagedFile, stageFiles, itemId, onFilesChange]);

  /**
   * Handle duplicate dialog - Skip
   */
  const handleDuplicateSkip = React.useCallback(() => {
    setIsDuplicateDialogOpen(false);
    setValidationError(undefined); // Clear any validation errors

    // ES5 compatible: Use indexOf instead of includes
    const nonDuplicates = pendingFiles.filter(f => duplicateFiles.indexOf(f.name) === -1);

    if (nonDuplicates.length > 0) {
      setPendingFiles(nonDuplicates);

      if (mode === UploadMode.Approval && documentType) {
        stageFiles(nonDuplicates, documentType as any, itemId);
        if (onFilesChange) {
          onFilesChange();
        }
        setPendingFiles([]);
        setPendingTargetType(undefined);
      } else if (pendingTargetType) {
        // Attachment mode with specific target type (dropped on a section)
        stageFiles(nonDuplicates, pendingTargetType, itemId);
        if (onFilesChange) {
          onFilesChange();
        }
        setPendingFiles([]);
        setPendingTargetType(undefined);
      } else {
        setIsTypeDialogOpen(true);
      }
    } else {
      setPendingFiles([]);
      setPendingTargetType(undefined);
    }
  }, [pendingFiles, duplicateFiles, mode, documentType, pendingTargetType, stageFiles, itemId, onFilesChange]);

  /**
   * Handle document action (from card/group)
   */
  const handleDocumentAction = React.useCallback(
    (action: DocumentAction) => {
      // Find the document
      let allDocs: any[] = [];
      documents.forEach((docs) => {
        allDocs = allDocs.concat(docs);
      });

      let doc: any = null;
      for (let i = 0; i < allDocs.length; i++) {
        if (allDocs[i].uniqueId === action.documentId) {
          doc = allDocs[i];
          break;
        }
      }

      if (!doc) return;

      switch (action.type) {
        case 'rename':
          if (typeof action.data === 'string') {
            markForRename(doc, action.data);
            if (onFilesChange) {
              onFilesChange();
            }
          }
          break;

        case 'delete':
          markForDeletion(doc);
          if (onFilesChange) {
            onFilesChange();
          }
          break;

        case 'undoDelete':
          undoDelete(doc);
          if (onFilesChange) {
            onFilesChange();
          }
          break;

        case 'cancelRename':
          cancelRename(doc.uniqueId);
          if (onFilesChange) {
            onFilesChange();
          }
          break;

        case 'changeType':
          if (action.data && typeof action.data === 'string') {
            markForTypeChange([doc], action.data as DocumentType);
            if (onFilesChange) {
              onFilesChange();
            }
          }
          break;

        case 'download':
          if (action.documentId === 'all' && Array.isArray(action.data)) {
            // TODO: Implement download all
          } else {
            // Download single file
            window.open(doc.url, '_blank');
          }
          break;
      }
    },
    [documents, markForRename, cancelRename, markForDeletion, undoDelete, markForTypeChange, onFilesChange]
  );

  /**
   * Document card drag handlers (for moving between sections)
   */
  const handleCardDragStart = React.useCallback((docId: string, sourceType: DocumentType) => {
    setDraggedDocId(docId);
    setDragSourceType(sourceType);
  }, []);

  const handleCardDragEnd = React.useCallback(() => {
    setDraggedDocId(null);
    setDragSourceType(null);
    setDropTargetType(null);
  }, []);

  const handleSectionDragOver = React.useCallback(
    (e: React.DragEvent, targetType: DocumentType) => {
      e.preventDefault();
      e.stopPropagation();

      // Only set drop target if dragging from a different section
      if (draggedDocId && dragSourceType && dragSourceType !== targetType) {
        setDropTargetType(targetType);
      }
    },
    [draggedDocId, dragSourceType]
  );

  const handleSectionDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Only clear if leaving the section container (not child elements)
    const relatedTarget = e.relatedTarget as HTMLElement;
    const currentTarget = e.currentTarget as HTMLElement;

    if (!currentTarget.contains(relatedTarget)) {
      setDropTargetType(null);
    }
  }, []);

  const handleSectionDrop = React.useCallback(
    (e: React.DragEvent, targetType: DocumentType) => {
      e.preventDefault();
      e.stopPropagation();

      // Check if it's a file drop (from outside) vs document card drop (from inside)
      const hasFiles = e.dataTransfer.files && e.dataTransfer.files.length > 0;

      if (hasFiles) {
        // It's a file drop from outside the app
        // Force reset drag state immediately
        forceResetDragState();
        setDropTargetType(null);

        if (isReadOnly) return;

        // Process file upload with the target type
        const files = e.dataTransfer.files;
        void handleFilesSelected(files, targetType);
        return;
      }

      // It's a document card drop (moving between sections)
      if (!draggedDocId || !dragSourceType || dragSourceType === targetType) {
        setDropTargetType(null);
        return;
      }

      // Check if it's a staged file (not yet uploaded)
      let isStagedFile = false;
      let stagedFile: IStagedDocument | null = null;

      for (let i = 0; i < stagedFiles.length; i++) {
        if (stagedFiles[i].id === draggedDocId) {
          isStagedFile = true;
          stagedFile = stagedFiles[i];
          break;
        }
      }

      if (isStagedFile && stagedFile) {
        // For staged files, remove and re-add with new type
        removeStagedFile(stagedFile.id);
        stageFiles([stagedFile.file], targetType, itemId);
        if (onFilesChange) {
          onFilesChange();
        }
      } else {
        // For existing documents, use the action handler
        handleDocumentAction({
          type: 'changeType',
          documentId: draggedDocId,
          data: targetType,
        });
      }

      // Reset drag state
      setDraggedDocId(null);
      setDragSourceType(null);
      setDropTargetType(null);
    },
    [draggedDocId, dragSourceType, stagedFiles, removeStagedFile, stageFiles, itemId, onFilesChange, handleDocumentAction, forceResetDragState, isReadOnly, handleFilesSelected]
  );

  /**
   * Validate has at least one document (for submit)
   */
  const hasAtLeastOneDocument = React.useCallback((): boolean => {
    if (mode === UploadMode.Approval && documentType) {
      const docs = getDocumentsByType(documentType as any);
      const staged = getStagedByType(documentType as any);
      const deleted = filesToDelete.filter(f => f.documentType === documentType).length;

      return (docs.length + staged.length - deleted) > 0;
    } else {
      // Attachment mode: Check both Review and Supplemental
      const reviewDocs = getDocumentsByType(DocumentType.Review);
      const reviewStaged = stagedFiles.filter(function(sf) { return sf.documentType === DocumentType.Review; });
      const reviewDeleted = filesToDelete.filter(f => f.documentType === DocumentType.Review).length;

      const suppDocs = getDocumentsByType(DocumentType.Supplemental);
      const suppStaged = stagedFiles.filter(function(sf) { return sf.documentType === DocumentType.Supplemental; });
      const suppDeleted = filesToDelete.filter(f => f.documentType === DocumentType.Supplemental).length;

      return (reviewDocs.length + reviewStaged.length - reviewDeleted + suppDocs.length + suppStaged.length - suppDeleted) > 0;
    }
  }, [mode, documentType, getDocumentsByType, stagedFiles, filesToDelete]);

  /**
   * Render Approval Mode
   */
  const renderApprovalMode = () => {
    if (!documentType) return null;

    const docs = getDocumentsByType(documentType as any);
    const staged = stagedFiles.filter(function(sf) { return sf.documentType === documentType; });

    // Build set of staged file names (for detecting replacements)
    const stagedFileNames = new Set<string>();
    for (let i = 0; i < staged.length; i++) {
      stagedFileNames.add(staged[i].file.name.toLowerCase());
    }

    // Build set of existing file names (for detecting replacements)
    const existingFileNames = new Set<string>();
    for (let i = 0; i < docs.length; i++) {
      if (docs[i] && docs[i].name) {
        existingFileNames.add(docs[i].name.toLowerCase());
      }
    }

    // Sort existing documents by modified date (newest first)
    // Filter out documents that will be replaced by staged files
    const sortedDocs = docs
      .filter(function(doc) {
        // Skip documents with no name
        if (!doc || !doc.name) return false;
        // Hide existing doc if there's a staged file with same name (will be replaced)
        return !stagedFileNames.has(doc.name.toLowerCase());
      })
      .sort(function(a, b) {
        const dateA = typeof a.timeLastModified === 'string' ? new Date(a.timeLastModified) : a.timeLastModified || new Date(0);
        const dateB = typeof b.timeLastModified === 'string' ? new Date(b.timeLastModified) : b.timeLastModified || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

    const hasDocuments = docs.length > 0 || staged.length > 0;

    // CRITICAL DEBUG: Log approval mode rendering
    SPContext.logger.info('🔍 renderApprovalMode', {
      documentType,
      documentTypeValue: String(documentType),
      docsCount: docs.length,
      stagedCount: staged.length,
      allStagedFilesCount: stagedFiles.length,
      stagedFilesForThisType: staged.map(sf => ({
        fileName: sf.file.name,
        documentType: sf.documentType,
      })),
    });

    return (
      <div className="document-upload document-upload--approval-mode">
        {label && (
          <Text variant="large" styles={{ root: { fontWeight: 600, marginBottom: '8px' } }}>
            {label}
          </Text>
        )}
        {/* Description only (no button in approval mode) */}
        {description && (
          <Text variant="small" styles={{ root: { color: '#605e5c', marginBottom: '16px' } }}>
            {description}
          </Text>
        )}

        {/* Documents Grid (includes DropZoneCard) */}
        <div
          className="cards-container"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
        >
          {/* Drop Zone Card - always shown when not read-only */}
          {!isReadOnly && (
            <DropZoneCard
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={
                isDragging
                  ? 'drop-zone-card--active'
                  : hasDocuments
                  ? 'drop-zone-card--compact'
                  : 'drop-zone-card--full-width'
              }
            />
          )}

          {/* Staged files (NEW) - shown first */}
          {staged.map((stagedFile) => {
              const tempDoc = {
                name: stagedFile.file.name,
                url: '',
                size: stagedFile.file.size,
                timeCreated: new Date().toISOString(),
                timeLastModified: new Date().toISOString(),
                uniqueId: stagedFile.id,
                modifiedBy: 'Current User',
                documentType: stagedFile.documentType,
              };

              // Check if this staged file is replacing an existing file (overwrite)
              const isReplacingExisting = existingFileNames.has(stagedFile.file.name.toLowerCase());

              return (
                <DocumentCard
                  key={stagedFile.id}
                  document={tempDoc as any}
                  isNew={true}
                  isUpdating={isReplacingExisting}
                  isReadOnly={isReadOnly}
                  onDelete={() => {
                    removeStagedFile(stagedFile.id);
                    if (onFilesChange) {
                      onFilesChange();
                    }
                  }}
                  onChangeType={
                    documentType
                      ? undefined
                      : (newType) => {
                          removeStagedFile(stagedFile.id);
                          stageFiles([stagedFile.file], newType, itemId);
                          if (onFilesChange) {
                            onFilesChange();
                          }
                        }
                  }
                />
              );
            })}

          {/* Existing documents - sorted by modified date (newest first) */}
          {sortedDocs.map(doc => {
              const isDeleted = filesToDelete.some(fd => fd.uniqueId === doc.uniqueId);

              // ES5 compatible: Manual loop instead of .find()
              let renameInfo: any = null;
              for (let i = 0; i < filesToRename.length; i++) {
                if (filesToRename[i].file.uniqueId === doc.uniqueId) {
                  renameInfo = filesToRename[i];
                  break;
                }
              }

              return (
                <DocumentCard
                  key={doc.uniqueId}
                  document={doc}
                  isDeleted={isDeleted}
                  isPending={!!renameInfo}
                  pendingName={renameInfo ? renameInfo.newName : undefined}
                  showTypeChange={false}
                  isReadOnly={isReadOnly}
                  allDocuments={sortedDocs}
                  stagedFiles={stagedFiles.map(sf => ({ name: sf.file.name, documentType: sf.documentType, uniqueId: sf.id }))}
                  onRename={(newName) => handleDocumentAction({ type: 'rename', documentId: doc.uniqueId, data: newName })}
                  onCancelRename={() => handleDocumentAction({ type: 'cancelRename', documentId: doc.uniqueId })}
                  onDelete={() => handleDocumentAction({ type: 'delete', documentId: doc.uniqueId })}
                  onDownload={() => handleDocumentAction({ type: 'download', documentId: doc.uniqueId })}
                  onUndoDelete={isDeleted ? () => handleDocumentAction({ type: 'undoDelete', documentId: doc.uniqueId }) : undefined}
                />
              );
            })}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allowedExtensions.join(',')}
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
        />
      </div>
    );
  };

  /**
   * Check if document type is an approval type (defensive filter)
   */
  const isApprovalDocumentType = React.useCallback((docType: DocumentType): boolean => {
    return (
      docType === DocumentType.CommunicationApproval ||
      docType === DocumentType.PortfolioManagerApproval ||
      docType === DocumentType.ResearchAnalystApproval ||
      docType === DocumentType.SubjectMatterExpertApproval ||
      docType === DocumentType.PerformanceApproval ||
      docType === DocumentType.OtherApproval
    );
  }, []);

  /**
   * Render Attachment Mode
   */
  const renderAttachmentMode = () => {
    // CRITICAL DEBUG: Log all staged files to see what's in the store
    SPContext.logger.info('🔍 renderAttachmentMode - ALL STAGED FILES', {
      totalStagedCount: stagedFiles.length,
      allStagedFiles: stagedFiles.map(sf => ({
        id: sf.id,
        fileName: sf.file.name,
        documentType: sf.documentType,
        documentTypeValue: String(sf.documentType),
      })),
    });

    // Get documents and apply defensive filtering to exclude approval documents
    // This ensures approval docs never appear in attachment sections even if data store has them
    const allReviewDocs = getDocumentsByType(DocumentType.Review);
    const reviewDocs = allReviewDocs.filter(function(doc) {
      // Explicitly exclude approval document types (defensive)
      return !isApprovalDocumentType(doc.documentType);
    });

    // Also filter staged files to exclude approval documents (defensive)
    const allReviewStaged = stagedFiles.filter(function(sf) { return sf.documentType === DocumentType.Review; });

    SPContext.logger.info('🔍 Review section filtering', {
      allStagedFilesCount: stagedFiles.length,
      matchingReviewTypeCount: allReviewStaged.length,
      matchingReviewFiles: allReviewStaged.map(sf => ({
        fileName: sf.file.name,
        documentType: sf.documentType,
      })),
    });

    const reviewStaged = allReviewStaged.filter(function(sf) {
      return !isApprovalDocumentType(sf.documentType);
    });
    const reviewPending = getPendingCounts(DocumentType.Review);

    const allSuppDocs = getDocumentsByType(DocumentType.Supplemental);
    const suppDocs = allSuppDocs.filter(function(doc) {
      // Explicitly exclude approval document types (defensive)
      return !isApprovalDocumentType(doc.documentType);
    });
    // Also filter staged files to exclude approval documents (defensive)
    const allSuppStaged = stagedFiles.filter(function(sf) { return sf.documentType === DocumentType.Supplemental; });
    const suppStaged = allSuppStaged.filter(function(sf) {
      return !isApprovalDocumentType(sf.documentType);
    });
    const suppPending = getPendingCounts(DocumentType.Supplemental);

    // Calculate total document count
    const totalCount = reviewDocs.length + reviewStaged.length + suppDocs.length + suppStaged.length;
    const hasDocuments = totalCount > 0;

    /**
     * Render empty state (no documents)
     */
    const renderEmptyState = () => {
      if (isReadOnly) {
        // Read-only empty state - no interaction
        return (
          <div className="empty-upload-zone empty-upload-zone--readonly">
            <Stack horizontalAlign="center" tokens={{ childrenGap: 12 }}>
              <IconButton
                iconProps={{ iconName: 'DocumentSet' }}
                styles={{ root: { fontSize: '48px', color: '#a19f9d', pointerEvents: 'none' } }}
              />
              <Text variant="xLarge" styles={{ root: { fontWeight: 600, color: '#605e5c' } }}>
                No Documents
              </Text>
              <Text variant="medium" styles={{ root: { color: '#a19f9d' } }}>
                No documents have been uploaded yet
              </Text>
            </Stack>
          </div>
        );
      }

      // Interactive empty state - use DropZoneCard in a container (full width)
      return (
        <div className="cards-container">
          <DropZoneCard
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={isDragging ? 'drop-zone-card--active drop-zone-card--full-width' : 'drop-zone-card--full-width'}
          />
        </div>
      );
    };

    /**
     * Render document section
     */
    const renderDocumentSection = (
      title: string,
      documentType: DocumentType,
      docs: IDocument[],
      staged: IStagedDocument[],
      pending: { newCount: number; modifiedCount: number; deletedCount: number },
      allDocs: IDocument[],
      allStaged: IStagedDocument[]
    ) => {
      const sectionTotal = docs.length + staged.length;
      if (sectionTotal === 0) return null;

      // Build pending counts text
      const pendingParts: string[] = [];
      if (pending.newCount > 0) pendingParts.push(`${pending.newCount} new`);
      if (pending.modifiedCount > 0) pendingParts.push(`${pending.modifiedCount} modified`);
      if (pending.deletedCount > 0) pendingParts.push(`${pending.deletedCount} pending deletion`);
      const pendingText = pendingParts.length > 0 ? ` • ${pendingParts.join(', ')}` : '';

      // Check if this section is a drop target
      const isDropTarget =
        !isReadOnly &&
        draggedDocId !== null &&
        dragSourceType !== null &&
        dragSourceType !== documentType &&
        dropTargetType === documentType;

      return (
        <div
          key={documentType}
          className={`document-section ${isDropTarget ? 'document-section--drop-target' : ''}`}
          onDragOver={(e) => handleSectionDragOver(e, documentType)}
          onDragLeave={handleSectionDragLeave}
          onDrop={(e) => handleSectionDrop(e, documentType)}
        >
          {/* Section Heading */}
          <div className="section-header">
            <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
              {isDropTarget && (
                <Icon iconName="Add" styles={{ root: { fontSize: '16px', color: '#0078d4', fontWeight: 600 } }} />
              )}
              <Text variant="large" styles={{ root: { fontWeight: 600, color: isDropTarget ? '#0078d4' : '#323130' } }}>
                {title} ({sectionTotal}){pendingText}
              </Text>
            </Stack>
          </div>

          {/* Documents Grid */}
          <div className="cards-container">
            {/* Drop Zone Card - shown when dragging files */}
            {!isReadOnly && isDragging && (
              <DropZoneCard
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Handle drop with type selection for this section
                  handleDrop(e);
                  // Show type dialog to select which type
                  setPendingTargetType(documentType);
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => {
                  // Set the target type and open file browser
                  setPendingTargetType(documentType);
                  fileInputRef.current?.click();
                }}
                className={isDropTarget ? 'drop-zone-card--active' : ''}
              />
            )}

            {/* Existing documents */}
            {docs.map(doc => {
              const isDeleted = filesToDelete.some(fd => fd.uniqueId === doc.uniqueId);

              // ES5 compatible: Manual loop instead of .find()
              let renameInfo: any = null;
              for (let i = 0; i < filesToRename.length; i++) {
                if (filesToRename[i].file.uniqueId === doc.uniqueId) {
                  renameInfo = filesToRename[i];
                  break;
                }
              }

              return (
                <DocumentCard
                  key={doc.uniqueId}
                  document={doc}
                  isDeleted={isDeleted}
                  isPending={!!renameInfo}
                  pendingName={renameInfo ? renameInfo.newName : undefined}
                  showTypeChange={true}
                  isReadOnly={isReadOnly}
                  isDragging={draggedDocId === doc.uniqueId}
                  allDocuments={allDocs}
                  stagedFiles={allStaged.map(sf => ({ name: sf.file.name, documentType: sf.documentType, uniqueId: sf.id }))}
                  onRename={(newName) => handleDocumentAction({ type: 'rename', documentId: doc.uniqueId, data: newName })}
                  onCancelRename={() => handleDocumentAction({ type: 'cancelRename', documentId: doc.uniqueId })}
                  onDelete={() => handleDocumentAction({ type: 'delete', documentId: doc.uniqueId })}
                  onDownload={() => handleDocumentAction({ type: 'download', documentId: doc.uniqueId })}
                  onChangeType={(newType) => handleDocumentAction({ type: 'changeType', documentId: doc.uniqueId, data: newType })}
                  onUndoDelete={isDeleted ? () => handleDocumentAction({ type: 'undoDelete', documentId: doc.uniqueId }) : undefined}
                  onDragStart={() => handleCardDragStart(doc.uniqueId, documentType)}
                  onDragEnd={handleCardDragEnd}
                />
              );
            })}

            {/* Staged files */}
            {staged.map((stagedFile) => {
              const tempDoc = {
                name: stagedFile.file.name,
                url: '',
                size: stagedFile.file.size,
                timeCreated: new Date().toISOString(),
                timeLastModified: new Date().toISOString(),
                uniqueId: stagedFile.id,
                modifiedBy: 'Current User',
                documentType: stagedFile.documentType,
              };

              return (
                <DocumentCard
                  key={stagedFile.id}
                  document={tempDoc as any}
                  isNew={true}
                  isReadOnly={isReadOnly}
                  isDragging={draggedDocId === stagedFile.id}
                  onDelete={() => {
                    removeStagedFile(stagedFile.id);
                    if (onFilesChange) {
                      onFilesChange();
                    }
                  }}
                  onChangeType={(newType) => {
                    // For staged files, we need to update the documentType in the staged file
                    // This requires updating the store's staged file
                    // For now, let's just remove and re-add with new type
                    removeStagedFile(stagedFile.id);
                    stageFiles([stagedFile.file], newType, itemId);
                    if (onFilesChange) {
                      onFilesChange();
                    }
                  }}
                  onDragStart={() => handleCardDragStart(stagedFile.id, documentType)}
                  onDragEnd={handleCardDragEnd}
                />
              );
            })}
          </div>
        </div>
      );
    };

    return (
      <div className="document-upload document-upload--attachment-mode">
        {label && (
          <Text variant="large" styles={{ root: { fontWeight: 600, marginBottom: '8px' } }}>
            {label}
          </Text>
        )}
        {description && (
          <Text variant="small" styles={{ root: { color: '#605e5c', marginBottom: '16px' } }}>
            {description}
          </Text>
        )}

        {/* Empty state OR Document sections */}
        {!hasDocuments ? (
          renderEmptyState()
        ) : (
          <div
            className={`attachments-container ${isDragging ? 'drop-active' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
          >
            {/* Upload Button (top) */}
            {!isReadOnly && (
              <Stack horizontal horizontalAlign="space-between" verticalAlign="center" styles={{ root: { marginBottom: '16px' } }}>
                <PrimaryButton
                  text="Upload Documents"
                  iconProps={{ iconName: 'CloudUpload' }}
                  onClick={() => fileInputRef.current?.click()}
                />
                <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
                  You can also drag and drop files anywhere in this section
                </Text>
              </Stack>
            )}

            {/* Review Documents Section */}
            {renderDocumentSection(
              'Review Documents',
              DocumentType.Review,
              reviewDocs,
              reviewStaged,
              reviewPending,
              reviewDocs.concat(suppDocs),
              reviewStaged.concat(suppStaged)
            )}

            {/* Divider */}
            {reviewDocs.length + reviewStaged.length > 0 && suppDocs.length + suppStaged.length > 0 && (
              <div className="section-divider" />
            )}

            {/* Supplemental Documents Section */}
            {renderDocumentSection(
              'Supplemental Documents',
              DocumentType.Supplemental,
              suppDocs,
              suppStaged,
              suppPending,
              reviewDocs.concat(suppDocs),
              reviewStaged.concat(suppStaged)
            )}

            {/* Drop hint overlay - subtle border highlight only */}
            {isDragging && (
              <div className="drop-hint-overlay" />
            )}
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allowedExtensions.join(',')}
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
        />
      </div>
    );
  };

  return (
    <>
      {/* Validation Error */}
      {validationError && (
        <MessageBar
          messageBarType={MessageBarType.error}
          onDismiss={() => setValidationError(undefined)}
          styles={{ root: { marginBottom: '16px' } }}
        >
          {validationError}
        </MessageBar>
      )}

      {/* Required indicator */}
      {required && !hasAtLeastOneDocument() && (
        <MessageBar
          messageBarType={MessageBarType.warning}
          styles={{ root: { marginBottom: '16px' } }}
        >
          At least one document is required before submission.
        </MessageBar>
      )}

      {/* Render based on mode */}
      {mode === UploadMode.Approval ? renderApprovalMode() : renderAttachmentMode()}

      {/* Dialogs */}
      <DocumentTypeDialog
        isOpen={isTypeDialogOpen}
        files={pendingFiles.map(f => ({ name: f.name, size: f.size }))}
        onSave={handleTypeDialogSave}
        onCancel={() => {
          setIsTypeDialogOpen(false);
          setPendingFiles([]);
          setPendingTargetType(undefined);
          setValidationError(undefined); // Clear validation errors on cancel
        }}
        mode="upload"
      />

      <DuplicateFileDialog
        isOpen={isDuplicateDialogOpen}
        duplicateFiles={duplicateFiles.map(name => {
          // ES5 compatible: Manual loop instead of .find()
          let file: File | null = null;
          for (let i = 0; i < pendingFiles.length; i++) {
            if (pendingFiles[i].name === name) {
              file = pendingFiles[i];
              break;
            }
          }
          return { name, size: file ? file.size : 0 };
        })}
        onOverwrite={handleDuplicateOverwrite}
        onSkip={handleDuplicateSkip}
      />

      <UploadProgressDialog
        isOpen={isUploading}
        uploadProgress={uploadProgress}
        onRetry={(fileId) => {
          void retryUpload(fileId);
        }}
        onSkip={(fileId) => {
          skipUpload(fileId);
        }}
        onClose={() => {
          // Progress dialog can only be closed when all uploads are complete
          // isUploading will be automatically set to false by the store
        }}
        canClose={!isUploading}
      />
    </>
  );
};

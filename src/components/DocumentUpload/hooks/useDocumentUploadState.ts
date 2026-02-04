/**
 * Document Upload State Hook
 *
 * Manages all state and callbacks for the DocumentUpload component.
 * Extracted to reduce component complexity and improve testability.
 */

import * as React from 'react';

import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import {
  getFileUploadConfig,
  DEFAULT_ALLOWED_EXTENSIONS,
  type IFileUploadConfig,
} from '@services/configurationService';

import { useDocumentsStore, type IStagedDocument } from '@stores/documentsStore';
import { DocumentType } from '@appTypes/documentTypes';
import { checkDuplicateFiles } from '@services/documentService';
import { UploadMode } from '../DocumentUploadTypes';

/**
 * Default configuration values
 */
export const DEFAULT_MAX_FILES = 50;
export const DEFAULT_MAX_FILE_SIZE = 250 * 1024 * 1024; // 250MB

/**
 * Props for the useDocumentUploadState hook
 */
export interface IUseDocumentUploadStateProps {
  itemId?: number;
  documentType?: DocumentType | string;
  isReadOnly?: boolean;
  maxFiles?: number;
  maxFileSize?: number;
  allowedExtensions?: string[];
  documentLibraryTitle: string;
  onFilesChange?: () => void;
  onError?: (error: string) => void;
}

/**
 * Return type for the useDocumentUploadState hook
 */
export interface IUseDocumentUploadStateReturn {
  // Mode
  mode: UploadMode;

  // Configuration
  allowedExtensions: string[];
  maxFileSize: number;

  // Store state
  documents: Map<DocumentType, any[]>;
  stagedFiles: IStagedDocument[];
  filesToDelete: any[];
  filesToRename: any[];
  filesToChangeType: any[];
  isUploading: boolean;
  uploadProgress: any;

  // Local state
  isTypeDialogOpen: boolean;
  setIsTypeDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isDuplicateDialogOpen: boolean;
  setIsDuplicateDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  pendingFiles: File[];
  setPendingFiles: React.Dispatch<React.SetStateAction<File[]>>;
  pendingTargetType: DocumentType | undefined;
  setPendingTargetType: React.Dispatch<React.SetStateAction<DocumentType | undefined>>;
  duplicateFiles: string[];
  setDuplicateFiles: React.Dispatch<React.SetStateAction<string[]>>;
  isDragging: boolean;
  setIsDragging: React.Dispatch<React.SetStateAction<boolean>>;
  validationError: string | undefined;
  setValidationError: React.Dispatch<React.SetStateAction<string | undefined>>;

  // Document card drag state
  draggedDocId: string | undefined;
  setDraggedDocId: React.Dispatch<React.SetStateAction<string | undefined>>;
  dragSourceType: DocumentType | undefined;
  setDragSourceType: React.Dispatch<React.SetStateAction<DocumentType | undefined>>;
  dropTargetType: DocumentType | undefined;
  setDropTargetType: React.Dispatch<React.SetStateAction<DocumentType | undefined>>;

  // Refs
  fileInputRef: React.RefObject<HTMLInputElement>;
  dragCounter: React.MutableRefObject<number>;
  dragResetTimerRef: React.MutableRefObject<number | undefined>;

  // Store actions
  loadDocuments: (itemId: number) => Promise<void>;
  stageFiles: (files: File[], documentType: DocumentType, itemId?: number) => void;
  removeStagedFile: (id: string) => void;
  markForDeletion: (doc: any) => void;
  undoDelete: (doc: any) => void;
  markForRename: (doc: any, newName: string) => void;
  cancelRename: (uniqueId: string) => void;
  markForTypeChange: (docs: any[], newType: DocumentType) => void;
  cancelTypeChange: (fileIds: string[]) => void;
  getPendingCounts: (documentType: DocumentType) => { newCount: number; modifiedCount: number; deletedCount: number };
  retryUpload: (fileId: string) => Promise<void>;
  skipUpload: (fileId: string) => void;

  // Callbacks
  getDocumentsByType: (type: DocumentType) => any[];
  getStagedByType: (type: DocumentType) => File[];
  validateFile: (file: File) => { isValid: boolean; error?: string };
  handleFilesSelected: (files: FileList | File[], targetType?: DocumentType) => Promise<void>;
  handleFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  forceResetDragState: () => void;
  handleDrop: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragEnter: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleTypeDialogSave: (selectedType: DocumentType) => void;
  handleDuplicateOverwrite: () => void;
  handleDuplicateSkip: () => void;
  handleDocumentAction: (action: { type: string; documentId: string; data?: any }) => void;
  handleCardDragStart: (docId: string, sourceType: DocumentType) => void;
  handleCardDragEnd: () => void;
  handleSectionDragOver: (e: React.DragEvent, targetType: DocumentType) => void;
  handleSectionDragLeave: (e: React.DragEvent) => void;
  handleSectionDrop: (e: React.DragEvent, targetType: DocumentType) => void;
  hasAtLeastOneDocument: () => boolean;
  isApprovalDocumentType: (docType: DocumentType) => boolean;
}

/**
 * Custom hook for DocumentUpload state management
 */
export function useDocumentUploadState(props: IUseDocumentUploadStateProps): IUseDocumentUploadStateReturn {
  const {
    itemId,
    documentType,
    isReadOnly = false,
    maxFiles = DEFAULT_MAX_FILES,
    maxFileSize: maxFileSizeProp,
    allowedExtensions: allowedExtensionsProp,
    documentLibraryTitle,
    onFilesChange,
    onError,
  } = props;

  // Determine mode
  const mode: UploadMode = documentType ? UploadMode.Approval : UploadMode.Attachment;

  // File upload configuration from SharePoint (loaded once)
  const [fileUploadConfig, setFileUploadConfig] = React.useState<IFileUploadConfig | undefined>(undefined);

  // Load file upload configuration on mount
  React.useEffect(() => {
    let isMounted = true;

    const loadConfig = async (): Promise<void> => {
      try {
        const config = await getFileUploadConfig();
        if (isMounted) {
          setFileUploadConfig(config);
        }
      } catch (error) {
        SPContext.logger.error('Failed to load file upload config, using defaults', error);
        if (isMounted) {
          setFileUploadConfig({
            allowedExtensions: DEFAULT_ALLOWED_EXTENSIONS,
            maxFileSizeMB: 250,
          });
        }
      }
    };

    void loadConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  // Use prop values if provided, otherwise use config values (with fallback to defaults)
  const allowedExtensions = allowedExtensionsProp ?? fileUploadConfig?.allowedExtensions ?? DEFAULT_ALLOWED_EXTENSIONS;
  const maxFileSize = maxFileSizeProp ?? (fileUploadConfig ? fileUploadConfig.maxFileSizeMB * 1024 * 1024 : DEFAULT_MAX_FILE_SIZE);

  // Store state
  const {
    documents,
    stagedFiles,
    filesToDelete,
    filesToRename,
    filesToChangeType,
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
    cancelTypeChange,
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
  const [draggedDocId, setDraggedDocId] = React.useState<string | undefined>(undefined);
  const [dragSourceType, setDragSourceType] = React.useState<DocumentType | undefined>(undefined);
  const [dropTargetType, setDropTargetType] = React.useState<DocumentType | undefined>(undefined);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const dragCounter = React.useRef(0);
  const dragResetTimerRef = React.useRef<number | undefined>(undefined);

  /**
   * Load documents on mount
   */
  React.useEffect(() => {
    if (!itemId) {
      return;
    }
    void loadDocuments(itemId);
  }, [itemId, loadDocuments]);

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

      // Check extension
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      const extWithDot = `.${fileExt}`;
      const extWithoutDot = fileExt;

      const isAllowed = allowedExtensions.indexOf(extWithDot) !== -1 ||
                        allowedExtensions.indexOf(extWithoutDot) !== -1;

      if (!isAllowed) {
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
   * Force reset drag state
   */
  const forceResetDragState = React.useCallback(() => {
    if (dragResetTimerRef.current) {
      window.clearTimeout(dragResetTimerRef.current);
    }
    dragCounter.current = 0;
    setIsDragging(false);
  }, []);

  /**
   * Handle file selection
   */
  const handleFilesSelected = React.useCallback(
    async (files: FileList | File[], targetType?: DocumentType) => {
      // Check if type dialog is already open in attachment mode
      if (mode === UploadMode.Attachment && isTypeDialogOpen) {
        const errorMsg = 'Please complete the current file upload selection before adding more files.';
        if (onError) {
          onError(errorMsg);
        }
        setValidationError(errorMsg);
        forceResetDragState();
        return;
      }

      // Check if duplicate dialog is open
      if (isDuplicateDialogOpen) {
        const errorMsg = 'Please complete the current duplicate file handling before adding more files.';
        if (onError) {
          onError(errorMsg);
        }
        setValidationError(errorMsg);
        forceResetDragState();
        return;
      }

      // Convert to array
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
        forceResetDragState();
        return;
      }

      // Set pending files and target type
      setPendingFiles(validFiles);
      setPendingTargetType(targetType);

      // Schedule forced reset
      if (dragResetTimerRef.current) {
        window.clearTimeout(dragResetTimerRef.current);
      }
      dragResetTimerRef.current = window.setTimeout(() => {
        dragCounter.current = 0;
        setIsDragging(false);
        dragResetTimerRef.current = undefined;
      }, 200);

      // Determine which document type to check for duplicates
      const typeToCheck = targetType || documentType || DocumentType.Review;

      // Check for duplicates in staged files
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

      // Check for duplicates in existing documents
      let existingDuplicates: string[] = [];
      if (itemId) {
        existingDuplicates = await checkDuplicateFiles(validFiles, itemId, typeToCheck as any, documentLibraryTitle);
      }

      // Combine all duplicates
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
        setDuplicateFiles(allDuplicates);
        setIsDuplicateDialogOpen(true);
      } else {
        // No duplicates, proceed based on mode
        if (mode === UploadMode.Approval && documentType) {
          stageFiles(validFiles, documentType as any, itemId);
          setPendingFiles([]);
          if (onFilesChange) {
            onFilesChange();
          }
        } else if (targetType) {
          stageFiles(validFiles, targetType, itemId);
          setPendingFiles([]);
          if (onFilesChange) {
            onFilesChange();
          }
        } else {
          if (validFiles.length > 0) {
            setIsTypeDialogOpen(true);
          }
        }
      }
    },
    [validateFile, itemId, documentType, documentLibraryTitle, mode, stageFiles, stagedFiles, onFilesChange, onError, isTypeDialogOpen, isDuplicateDialogOpen, forceResetDragState]
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
        e.target.value = '';
      }
    },
    [handleFilesSelected, pendingTargetType]
  );

  /**
   * Handle drag-and-drop upload
   */
  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
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
      setValidationError(undefined);

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
    setValidationError(undefined);

    const duplicateFileNamesLower = new Set(duplicateFiles.map(name => name.toLowerCase()));
    const typeToCheck = pendingTargetType || documentType || DocumentType.Review;

    // Remove staged files with duplicate names
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
      stageFiles(pendingFiles, pendingTargetType, itemId);
      if (onFilesChange) {
        onFilesChange();
      }
      setPendingFiles([]);
      setPendingTargetType(undefined);
    } else {
      setIsTypeDialogOpen(true);
    }
  }, [mode, documentType, pendingFiles, pendingTargetType, duplicateFiles, stagedFiles, removeStagedFile, stageFiles, itemId, onFilesChange]);

  /**
   * Handle duplicate dialog - Skip
   */
  const handleDuplicateSkip = React.useCallback(() => {
    setIsDuplicateDialogOpen(false);
    setValidationError(undefined);

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
    (action: { type: string; documentId: string; data?: any }) => {
      // Find the document
      let allDocs: any[] = [];
      documents.forEach((docs) => {
        allDocs = allDocs.concat(docs);
      });

      let doc: any = undefined;
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
            const newType = action.data as DocumentType;
            if (newType === doc.documentType) {
              cancelTypeChange([doc.uniqueId]);
            } else {
              markForTypeChange([doc], newType);
            }
            if (onFilesChange) {
              onFilesChange();
            }
          }
          break;

        case 'download':
          if (action.documentId === 'all' && Array.isArray(action.data)) {
            // TODO: Implement download all
          } else {
            window.open(doc.url, '_blank');
          }
          break;
      }
    },
    [documents, markForRename, cancelRename, markForDeletion, undoDelete, markForTypeChange, onFilesChange]
  );

  /**
   * Document card drag handlers
   */
  const handleCardDragStart = React.useCallback((docId: string, sourceType: DocumentType) => {
    setDraggedDocId(docId);
    setDragSourceType(sourceType);
  }, []);

  const handleCardDragEnd = React.useCallback(() => {
    setDraggedDocId(undefined);
    setDragSourceType(undefined);
    setDropTargetType(undefined);
  }, []);

  const handleSectionDragOver = React.useCallback(
    (e: React.DragEvent, targetType: DocumentType) => {
      e.preventDefault();
      e.stopPropagation();

      if (draggedDocId && dragSourceType && dragSourceType !== targetType) {
        setDropTargetType(targetType);
      }
    },
    [draggedDocId, dragSourceType]
  );

  const handleSectionDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const relatedTarget = e.relatedTarget as HTMLElement;
    const currentTarget = e.currentTarget as HTMLElement;

    if (!currentTarget.contains(relatedTarget)) {
      setDropTargetType(undefined);
    }
  }, []);

  const handleSectionDrop = React.useCallback(
    (e: React.DragEvent, targetType: DocumentType) => {
      e.preventDefault();
      e.stopPropagation();

      const hasFiles = e.dataTransfer.files && e.dataTransfer.files.length > 0;

      if (hasFiles) {
        forceResetDragState();
        setDropTargetType(undefined);

        if (isReadOnly) return;

        const files = e.dataTransfer.files;
        void handleFilesSelected(files, targetType);
        return;
      }

      if (!draggedDocId || !dragSourceType || dragSourceType === targetType) {
        setDropTargetType(undefined);
        return;
      }

      // Check if it's a staged file
      let isStagedFile = false;
      let stagedFile: IStagedDocument | undefined = undefined;

      for (let i = 0; i < stagedFiles.length; i++) {
        if (stagedFiles[i].id === draggedDocId) {
          isStagedFile = true;
          stagedFile = stagedFiles[i];
          break;
        }
      }

      if (isStagedFile && stagedFile) {
        removeStagedFile(stagedFile.id);
        stageFiles([stagedFile.file], targetType, itemId);
        if (onFilesChange) {
          onFilesChange();
        }
      } else {
        handleDocumentAction({
          type: 'changeType',
          documentId: draggedDocId,
          data: targetType,
        });
      }

      setDraggedDocId(undefined);
      setDragSourceType(undefined);
      setDropTargetType(undefined);
    },
    [draggedDocId, dragSourceType, stagedFiles, removeStagedFile, stageFiles, itemId, onFilesChange, handleDocumentAction, forceResetDragState, isReadOnly, handleFilesSelected]
  );

  /**
   * Validate has at least one document
   */
  const hasAtLeastOneDocument = React.useCallback((): boolean => {
    if (mode === UploadMode.Approval && documentType) {
      const docs = getDocumentsByType(documentType as any);
      const staged = getStagedByType(documentType as any);
      const deleted = filesToDelete.filter(f => f.documentType === documentType).length;

      return (docs.length + staged.length - deleted) > 0;
    } else {
      const reviewDocs = getDocumentsByType(DocumentType.Review);
      const reviewStaged = stagedFiles.filter(function(sf) { return sf.documentType === DocumentType.Review; });
      const reviewDeleted = filesToDelete.filter(f => f.documentType === DocumentType.Review).length;

      const suppDocs = getDocumentsByType(DocumentType.Supplemental);
      const suppStaged = stagedFiles.filter(function(sf) { return sf.documentType === DocumentType.Supplemental; });
      const suppDeleted = filesToDelete.filter(f => f.documentType === DocumentType.Supplemental).length;

      return (reviewDocs.length + reviewStaged.length - reviewDeleted + suppDocs.length + suppStaged.length - suppDeleted) > 0;
    }
  }, [mode, documentType, getDocumentsByType, getStagedByType, stagedFiles, filesToDelete]);

  /**
   * Check if document type is an approval type
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

  return {
    // Mode
    mode,

    // Configuration
    allowedExtensions,
    maxFileSize,

    // Store state
    documents,
    stagedFiles,
    filesToDelete,
    filesToRename,
    filesToChangeType,
    isUploading,
    uploadProgress,

    // Local state
    isTypeDialogOpen,
    setIsTypeDialogOpen,
    isDuplicateDialogOpen,
    setIsDuplicateDialogOpen,
    pendingFiles,
    setPendingFiles,
    pendingTargetType,
    setPendingTargetType,
    duplicateFiles,
    setDuplicateFiles,
    isDragging,
    setIsDragging,
    validationError,
    setValidationError,

    // Document card drag state
    draggedDocId,
    setDraggedDocId,
    dragSourceType,
    setDragSourceType,
    dropTargetType,
    setDropTargetType,

    // Refs
    fileInputRef,
    dragCounter,
    dragResetTimerRef,

    // Store actions
    loadDocuments,
    stageFiles,
    removeStagedFile,
    markForDeletion,
    undoDelete,
    markForRename,
    cancelRename,
    markForTypeChange,
    cancelTypeChange,
    getPendingCounts,
    retryUpload,
    skipUpload,

    // Callbacks
    getDocumentsByType,
    getStagedByType,
    validateFile,
    handleFilesSelected,
    handleFileInputChange,
    forceResetDragState,
    handleDrop,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleTypeDialogSave,
    handleDuplicateOverwrite,
    handleDuplicateSkip,
    handleDocumentAction,
    handleCardDragStart,
    handleCardDragEnd,
    handleSectionDragOver,
    handleSectionDragLeave,
    handleSectionDrop,
    hasAtLeastOneDocument,
    isApprovalDocumentType,
  };
}

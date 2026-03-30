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
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { PrimaryButton, IconButton } from '@fluentui/react/lib/Button';
import { Icon } from '@fluentui/react/lib/Icon';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';

import { Lists } from '@sp/Lists';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import type { IDocumentInfo } from 'spfx-toolkit/lib/components/DocumentLink/DocumentLink.types';
import { openPreviewModal } from 'spfx-toolkit/lib/components/DocumentLink/components/DocumentActions';

import type { IStagedDocument } from '@stores/documentsStore';
import { useDocumentsStore } from '@stores/documentsStore';
import { useConfigStore } from '@stores/configStore';
import { DocumentType } from '@appTypes/documentTypes';
import {
  isDocumentCheckoutEnabled,
  getDocumentCheckoutStatus,
  supportsReviewTracking,
  startReviewing,
  doneReviewing,
  stopReviewing,
  type IDocumentCheckoutStatus,
} from '@services/documentCheckoutService';
import { useNotification } from '@contexts/NotificationContext';
import { DocumentCard } from './DocumentCard';
import { DropZoneCard } from './DropZoneCard';
import { DocumentTypeDialog } from './DocumentTypeDialog';
import { DuplicateFileDialog } from './DuplicateFileDialog';
import { UploadProgressDialog } from './UploadProgressDialog';
import type { IDocumentUploadProps } from './DocumentUploadTypes';
import { UploadMode } from './DocumentUploadTypes';
import { useDocumentUploadState, DEFAULT_MAX_FILES } from './hooks';
import './DocumentUpload.scss';

/**
 * Default library title
 */
const DEFAULT_LIBRARY_TITLE = Lists.RequestDocuments.Title;

function buildPreviewDocument(doc: any, documentLibraryTitle: string): IDocumentInfo | undefined {
  if (!doc?.url || !doc?.name) {
    return undefined;
  }

  try {
    const serverRelativeUrl = new URL(doc.url).pathname;
    return {
      id: doc.listItemId ?? 0,
      uniqueId: doc.uniqueId ?? '',
      name: doc.name,
      title: doc.name,
      url: doc.url,
      serverRelativeUrl,
      size: doc.size ?? 0,
      fileType: doc.name.split('.').pop()?.toLowerCase() ?? '',
      created: new Date(doc.timeCreated ?? doc.timeLastModified ?? Date.now()),
      createdBy: {
        id: 0,
        email: doc.createdByEmail ?? '',
        title: typeof doc.createdBy === 'string' ? doc.createdBy : 'Unknown',
        loginName: '',
      },
      modified: new Date(doc.timeLastModified ?? doc.timeCreated ?? Date.now()),
      modifiedBy: {
        id: 0,
        email: doc.modifiedByEmail ?? '',
        title: typeof doc.modifiedBy === 'string' ? doc.modifiedBy : 'Unknown',
        loginName: '',
      },
      libraryName: documentLibraryTitle,
      listId: '',
      version: doc.version ?? '',
    };
  } catch (error) {
    SPContext.logger.warn('DocumentUpload: Failed to build preview metadata, falling back to new tab', {
      fileName: doc?.name,
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}

/**
 * DocumentUpload Component
 */
export const DocumentUpload: React.FC<IDocumentUploadProps> = ({
  itemId,
  documentType,
  isReadOnly = false,
  maxFiles = DEFAULT_MAX_FILES,
  maxFileSize: maxFileSizeProp,
  allowedExtensions: allowedExtensionsProp,
  required = false,
  label,
  description,
  hasError = false,
  onFilesChange,
  onError,
  siteUrl,
  documentLibraryTitle = DEFAULT_LIBRARY_TITLE,
}) => {
  // Use the extracted state hook
  const state = useDocumentUploadState({
    itemId,
    documentType,
    isReadOnly,
    maxFiles,
    maxFileSize: maxFileSizeProp,
    allowedExtensions: allowedExtensionsProp,
    documentLibraryTitle,
    onFilesChange,
    onError,
  });

  const {
    mode,
    allowedExtensions,
    stagedFiles,
    filesToDelete,
    filesToRename,
    filesToChangeType,
    isUploading,
    uploadProgress,
    isTypeDialogOpen,
    setIsTypeDialogOpen,
    pendingFiles,
    setPendingFiles,
    setPendingTargetType,
    duplicateFiles,
    isDuplicateDialogOpen,
    isDragging,
    validationError,
    setValidationError,
    draggedDocId,
    dragSourceType,
    dropTargetType,
    fileInputRef,
    removeStagedFile,
    stageFiles,
    getPendingCounts,
    retryUpload,
    skipUpload,
    getDocumentsByType,
    handleFileInputChange,
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
  } = state;

  // Notifications
  const { showSuccess } = useNotification();

  // Review tracking: checkout status per document
  const configLoaded = useConfigStore((s) => s.isLoaded);
  const checkoutEnabled = React.useMemo(() => isDocumentCheckoutEnabled(), [configLoaded]);
  const loadDocumentsFromStore = useDocumentsStore((s) => s.loadDocuments);

  /**
   * Get checkout status for an existing document.
   * Returns undefined if checkout tracking is disabled or not applicable.
   */
  const getCheckoutStatusForDoc = React.useCallback(
    (doc: any): IDocumentCheckoutStatus | undefined => {
      if (!doc || !doc.url) return undefined;
      if (!supportsReviewTracking(doc.name)) return undefined;
      // When the feature is disabled, still surface status for documents that are
      // currently checked out so "Done" and "Stop" buttons remain visible — otherwise
      // existing SP locks become unreleasable through the UI.
      const status = getDocumentCheckoutStatus(doc);
      if (!checkoutEnabled && !status.isCheckedOut) return undefined;
      return status;
    },
    [checkoutEnabled]
  );

  /**
   * Handle start reviewing: checkout file + open in new tab
   */
  const handleStartReviewing = React.useCallback(
    async (doc: any): Promise<void> => {
      const result = await startReviewing(doc);
      if (result.success) {
        showSuccess(`Started reviewing "${doc.name}"`);
        const previewDocument = buildPreviewDocument(doc, documentLibraryTitle);
        if (previewDocument) {
          openPreviewModal(previewDocument, 'edit');
        } else if (doc.url) {
          window.open(doc.url, '_blank');
        }
        if (itemId) {
          await loadDocumentsFromStore(itemId, true);
        }
      } else {
        const errorMsg = result.error || 'Failed to start reviewing';
        setValidationError(`Could not start reviewing "${doc.name}": ${errorMsg}`);
        SPContext.logger.error('DocumentUpload: Failed to start reviewing', undefined, {
          fileName: doc.name,
          error: result.error,
        });
        // Reload so the card reflects the actual checkout state (e.g. another user got there first)
        if (itemId) {
          await loadDocumentsFromStore(itemId, true);
        }
      }
    },
    [documentLibraryTitle, itemId, loadDocumentsFromStore, showSuccess]
  );

  /**
   * Handle done reviewing: checkin file + reload documents
   */
  const handleDoneReviewing = React.useCallback(
    async (doc: any): Promise<void> => {
      const result = await doneReviewing(doc);
      if (result.success) {
        showSuccess(`Done reviewing "${doc.name}"`);
        if (itemId) {
          await loadDocumentsFromStore(itemId, true);
        }
      } else {
        const errorMsg = result.error || 'Failed to complete review';
        setValidationError(`Could not complete review for "${doc.name}": ${errorMsg}`);
        SPContext.logger.error('DocumentUpload: Failed to complete review', undefined, {
          fileName: doc.name,
          error: result.error,
        });
      }
    },
    [itemId, loadDocumentsFromStore, showSuccess]
  );

  /**
   * Handle stop reviewing: undo checkout + reload documents
   */
  const handleStopReviewing = React.useCallback(
    async (doc: any): Promise<void> => {
      const result = await stopReviewing(doc);
      if (result.success) {
        showSuccess(`Stopped reviewing "${doc.name}"`);
        if (itemId) {
          await loadDocumentsFromStore(itemId, true);
        }
      } else {
        const errorMsg = result.error || 'Failed to stop reviewing';
        setValidationError(`Could not stop reviewing "${doc.name}": ${errorMsg}`);
        SPContext.logger.error('DocumentUpload: Failed to stop reviewing', undefined, {
          fileName: doc.name,
          error: result.error,
        });
      }
    },
    [itemId, loadDocumentsFromStore, showSuccess]
  );

  /**
   * Handle open view only: open file without checkout
   */
  const handleOpenViewOnly = React.useCallback(
    (doc: any): void => {
      const previewDocument = buildPreviewDocument(doc, documentLibraryTitle);
      if (previewDocument) {
        openPreviewModal(previewDocument, 'view');
      } else if (doc.url) {
        window.open(doc.url, '_blank');
      }
    },
    [documentLibraryTitle]
  );

  /**
   * Render Approval Mode
   */
  const renderApprovalMode = (): React.ReactNode => {
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
        if (!doc || !doc.name) return false;
        return !stagedFileNames.has(doc.name.toLowerCase());
      })
      .sort(function(a, b) {
        const dateA = typeof a.timeLastModified === 'string' ? new Date(a.timeLastModified) : a.timeLastModified || new Date(0);
        const dateB = typeof b.timeLastModified === 'string' ? new Date(b.timeLastModified) : b.timeLastModified || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

    const hasDocuments = docs.length > 0 || staged.length > 0;

    return (
      <div className="document-upload document-upload--approval-mode">
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
              onClick={() => { fileInputRef.current?.click(); }}
              className={
                isDragging
                  ? 'drop-zone-card--active'
                  : hasDocuments
                  ? 'drop-zone-card--compact'
                  : 'drop-zone-card--full-width'
              }
              isError={hasError && !hasDocuments}
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

            let renameInfo: any = undefined;
            for (let i = 0; i < filesToRename.length; i++) {
              if (filesToRename[i].file.uniqueId === doc.uniqueId) {
                renameInfo = filesToRename[i];
                break;
              }
            }

            const docCheckoutStatus = getCheckoutStatusForDoc(doc);
            const isLockedByCheckout = docCheckoutStatus?.isCheckedOut ?? false;

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
                checkoutStatus={docCheckoutStatus}
                onStartReviewing={docCheckoutStatus ? () => { void handleStartReviewing(doc); } : undefined}
                onDoneReviewing={docCheckoutStatus ? () => { void handleDoneReviewing(doc); } : undefined}
                onStopReviewing={docCheckoutStatus ? () => { void handleStopReviewing(doc); } : undefined}
                onOpenViewOnly={() => { handleOpenViewOnly(doc); }}
                onRename={isLockedByCheckout ? undefined : (newName) => handleDocumentAction({ type: 'rename', documentId: doc.uniqueId, data: newName })}
                onCancelRename={isLockedByCheckout ? undefined : () => handleDocumentAction({ type: 'cancelRename', documentId: doc.uniqueId })}
                onDelete={isLockedByCheckout ? undefined : () => handleDocumentAction({ type: 'delete', documentId: doc.uniqueId })}
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
          accept={allowedExtensions.map(function(ext) { return ext.charAt(0) === '.' ? ext : '.' + ext; }).join(',')}
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
        />
      </div>
    );
  };

  /**
   * Render Attachment Mode
   */
  const renderAttachmentMode = (): React.ReactNode => {
    // Get documents and apply defensive filtering (including pending type changes)
    const pendingTypeById = new Map<string, DocumentType>();
    for (let i = 0; i < filesToChangeType.length; i++) {
      const change = filesToChangeType[i];
      if (change && change.file && change.file.uniqueId) {
        pendingTypeById.set(change.file.uniqueId, change.newType);
      }
    }

    const allReviewDocs = getDocumentsByType(DocumentType.Review);
    const allSuppDocs = getDocumentsByType(DocumentType.Supplemental);
    const attachmentDocs = allReviewDocs.concat(allSuppDocs).filter(function(doc) {
      return !isApprovalDocumentType(doc.documentType);
    });

    const docsWithPending = attachmentDocs.map(function(doc) {
      const pendingType = pendingTypeById.get(doc.uniqueId);
      const displayType = pendingType || doc.documentType;
      return { doc, pendingType, displayType };
    });

    const reviewDocs = docsWithPending.filter(function(item) {
      return item.displayType === DocumentType.Review;
    });

    const suppDocs = docsWithPending.filter(function(item) {
      return item.displayType === DocumentType.Supplemental;
    });

    const allReviewStaged = stagedFiles.filter(function(sf) { return sf.documentType === DocumentType.Review; });

    const reviewStaged = allReviewStaged.filter(function(sf) {
      return !isApprovalDocumentType(sf.documentType);
    });
    const reviewPending = getPendingCounts(DocumentType.Review);

    const allSuppStaged = stagedFiles.filter(function(sf) { return sf.documentType === DocumentType.Supplemental; });
    const suppStaged = allSuppStaged.filter(function(sf) {
      return !isApprovalDocumentType(sf.documentType);
    });
    const suppPending = getPendingCounts(DocumentType.Supplemental);

    const allDocs = attachmentDocs;
    const allStaged = reviewStaged.concat(suppStaged);

    const totalCount = reviewDocs.length + reviewStaged.length + suppDocs.length + suppStaged.length;
    const hasDocuments = totalCount > 0;

    /**
     * Render empty state (no documents)
     */
    const renderEmptyState = (): React.ReactNode => {
      if (isReadOnly) {
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

      return (
        <div className="cards-container">
          <DropZoneCard
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={isDragging ? 'drop-zone-card--active drop-zone-card--full-width' : 'drop-zone-card--full-width'}
            isError={hasError}
          />
        </div>
      );
    };

    /**
     * Render document section
     */
    const renderDocumentSection = (
      title: string,
      sectionDocumentType: DocumentType,
      docs: Array<{ doc: any; pendingType?: DocumentType }>,
      staged: IStagedDocument[],
      pending: { newCount: number; modifiedCount: number; deletedCount: number },
      allDocs: any[],
      allStaged: IStagedDocument[]
    ): React.ReactNode => {
      const sectionTotal = docs.length + staged.length;
      if (sectionTotal === 0) return null;

      const pendingParts: string[] = [];
      if (pending.newCount > 0) pendingParts.push(`${pending.newCount} new`);
      if (pending.modifiedCount > 0) pendingParts.push(`${pending.modifiedCount} modified`);
      if (pending.deletedCount > 0) pendingParts.push(`${pending.deletedCount} pending deletion`);
      const pendingText = pendingParts.length > 0 ? ` • ${pendingParts.join(', ')}` : '';

      const isDropTarget =
        !isReadOnly &&
        draggedDocId !== undefined &&
        dragSourceType !== undefined &&
        dragSourceType !== sectionDocumentType &&
        dropTargetType === sectionDocumentType;

      return (
        <div
          key={sectionDocumentType}
          className={`document-section ${isDropTarget ? 'document-section--drop-target' : ''}`}
          onDragOver={(e) => handleSectionDragOver(e, sectionDocumentType)}
          onDragLeave={handleSectionDragLeave}
          onDrop={(e) => handleSectionDrop(e, sectionDocumentType)}
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
                  handleDrop(e);
                  setPendingTargetType(sectionDocumentType);
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => {
                  setPendingTargetType(sectionDocumentType);
                  fileInputRef.current?.click();
                }}
                className={isDropTarget ? 'drop-zone-card--active' : ''}
              />
            )}

            {/* Existing documents */}
            {docs.map(item => {
              const doc = item.doc;
              const pendingType = item.pendingType;
              const isDeleted = filesToDelete.some(fd => fd.uniqueId === doc.uniqueId);

              let renameInfo: any = undefined;
              for (let i = 0; i < filesToRename.length; i++) {
                if (filesToRename[i].file.uniqueId === doc.uniqueId) {
                  renameInfo = filesToRename[i];
                  break;
                }
              }
              const isPending = !!renameInfo || !!pendingType;

              const docCheckoutStatus = getCheckoutStatusForDoc(doc);
              const isLockedByCheckout = docCheckoutStatus?.isCheckedOut ?? false;

              return (
                <DocumentCard
                  key={doc.uniqueId}
                  document={doc}
                  isDeleted={isDeleted}
                  isPending={isPending}
                  pendingName={renameInfo ? renameInfo.newName : undefined}
                  pendingType={pendingType}
                  showTypeChange={!isLockedByCheckout}
                  isReadOnly={isReadOnly}
                  isDragging={draggedDocId === doc.uniqueId}
                  allDocuments={allDocs}
                  stagedFiles={allStaged.map(sf => ({ name: sf.file.name, documentType: sf.documentType, uniqueId: sf.id }))}
                  checkoutStatus={docCheckoutStatus}
                  onStartReviewing={docCheckoutStatus ? () => { void handleStartReviewing(doc); } : undefined}
                  onDoneReviewing={docCheckoutStatus ? () => { void handleDoneReviewing(doc); } : undefined}
                  onStopReviewing={docCheckoutStatus ? () => { void handleStopReviewing(doc); } : undefined}
                  onOpenViewOnly={() => { handleOpenViewOnly(doc); }}
                  onRename={isLockedByCheckout ? undefined : (newName) => handleDocumentAction({ type: 'rename', documentId: doc.uniqueId, data: newName })}
                  onCancelRename={isLockedByCheckout ? undefined : () => handleDocumentAction({ type: 'cancelRename', documentId: doc.uniqueId })}
                  onDelete={isLockedByCheckout ? undefined : () => handleDocumentAction({ type: 'delete', documentId: doc.uniqueId })}
                  onDownload={() => handleDocumentAction({ type: 'download', documentId: doc.uniqueId })}
                  onChangeType={isLockedByCheckout ? undefined : (newType) => handleDocumentAction({ type: 'changeType', documentId: doc.uniqueId, data: newType })}
                  onUndoDelete={isDeleted ? () => handleDocumentAction({ type: 'undoDelete', documentId: doc.uniqueId }) : undefined}
                  onDragStart={isLockedByCheckout ? undefined : () => handleCardDragStart(doc.uniqueId, sectionDocumentType)}
                  onDragEnd={isLockedByCheckout ? undefined : handleCardDragEnd}
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
                    removeStagedFile(stagedFile.id);
                    stageFiles([stagedFile.file], newType, itemId);
                    if (onFilesChange) {
                      onFilesChange();
                    }
                  }}
                  onDragStart={() => handleCardDragStart(stagedFile.id, sectionDocumentType)}
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
            className={`attachments-container ${isDragging ? 'drop-active' : ''} ${hasError ? 'attachments-container--error' : ''}`}
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
              allDocs,
              allStaged
            )}

            {/* Divider */}
            {reviewDocs.length + reviewStaged.length > 0 && suppDocs.length + suppStaged.length > 0 && (
              <div className="section-divider" />
            )}

            {/* Supporting Documents Section */}
            {renderDocumentSection(
              'Supporting Documents',
              DocumentType.Supplemental,
              suppDocs,
              suppStaged,
              suppPending,
              allDocs,
              allStaged
            )}

            {/* Drop hint overlay */}
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
          accept={allowedExtensions.map(function(ext) { return ext.charAt(0) === '.' ? ext : '.' + ext; }).join(',')}
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
          setValidationError(undefined);
        }}
        mode="upload"
      />

      <DuplicateFileDialog
        isOpen={isDuplicateDialogOpen}
        duplicateFiles={duplicateFiles.map(name => {
          let file: File | undefined = undefined;
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
        }}
        canClose={!isUploading}
      />
    </>
  );
};

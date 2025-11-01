/**
 * DocumentGroup Component
 *
 * Collapsible section for grouping documents by type (Attachment mode)
 * - Shows document type header with counts
 * - Displays documents in responsive grid
 * - Supports drag-and-drop zone highlighting for type changes
 * - Shows pending operation counts in header
 */

import * as React from 'react';
import { Icon, IconButton, Text } from '@fluentui/react';
import { DocumentCard } from './DocumentCard';
import type { IDocumentGroupProps } from './DocumentUploadTypes';

/**
 * DocumentGroup Component
 */
export const DocumentGroup: React.FC<IDocumentGroupProps> = ({
  title,
  documentType,
  documents,
  stagedFiles,
  pendingCounts,
  isDropTarget = false,
  onDrop,
  onDragOver,
  onDragLeave,
  onDocumentAction,
  collapsible = true,
  defaultCollapsed = false,
  isReadOnly = false,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

  // Calculate total count
  const totalCount = documents.length + stagedFiles.length;

  /**
   * Build pending counts text for header
   */
  const pendingText = React.useMemo(() => {
    const parts: string[] = [];

    if (pendingCounts.newCount > 0) {
      parts.push(`${pendingCounts.newCount} new`);
    }

    if (pendingCounts.modifiedCount > 0) {
      parts.push(`${pendingCounts.modifiedCount} pending`);
    }

    if (pendingCounts.deletedCount > 0) {
      parts.push(`${pendingCounts.deletedCount} pending deletion`);
    }

    return parts.length > 0 ? ` • ${parts.join(', ')}` : '';
  }, [pendingCounts]);

  /**
   * Handle toggle collapse
   */
  const handleToggle = React.useCallback(() => {
    if (collapsible) {
      setIsCollapsed(!isCollapsed);
    }
  }, [collapsible, isCollapsed]);

  /**
   * Handle drag over
   */
  const handleDragOver = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (onDragOver) {
        onDragOver(e);
      }
    },
    [onDragOver]
  );

  /**
   * Handle drop
   */
  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (onDrop) {
        onDrop(e);
      }
    },
    [onDrop]
  );

  // Group class names
  const groupClasses = React.useMemo(() => {
    const classes = ['document-group'];

    if (isDropTarget) {
      classes.push('drop-target');
    }

    return classes.join(' ');
  }, [isDropTarget]);

  // Content class names
  const contentClasses = React.useMemo(() => {
    const classes = ['group-content'];

    if (isCollapsed) {
      classes.push('collapsed');
    }

    if (totalCount === 0) {
      classes.push('empty');
    }

    return classes.join(' ');
  }, [isCollapsed, totalCount]);

  return (
    <div
      className={groupClasses}
      onDragOver={handleDragOver}
      onDragLeave={onDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="group-header">
        <div
          className={`header-left ${isCollapsed ? 'collapsed' : ''}`}
          onClick={handleToggle}
          style={{ flex: 1, cursor: collapsible ? 'pointer' : 'default' }}
        >
          {collapsible && (
            <Icon
              iconName="ChevronDown"
              className="toggle-icon"
            />
          )}

          <Text className="group-title">{title}</Text>

          <Text className="group-count">({totalCount})</Text>

          {pendingText && (
            <Text className="pending-counts">{pendingText}</Text>
          )}
        </div>

        {/* Download All button */}
        {!isReadOnly && documents.length > 0 && (
          <IconButton
            iconProps={{ iconName: 'Download' }}
            title="Download all documents"
            ariaLabel={`Download all ${title.toLowerCase()}`}
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Implement download all functionality
              if (onDocumentAction) {
                onDocumentAction({
                  type: 'download',
                  documentId: 'all',
                  data: documents.map(d => d.uniqueId),
                });
              }
            }}
            styles={{
              root: {
                marginLeft: '8px',
              },
            }}
          />
        )}
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className={contentClasses}>
          {/* Drop zone hint (when highlighted) */}
          {isDropTarget && (
            <div className="drop-hint">
              Drop here to move to {title}
            </div>
          )}

          {/* Documents */}
          {totalCount === 0 ? (
            <Text className="empty-message">
              No {title.toLowerCase()} uploaded yet
            </Text>
          ) : (
            <>
              {documents.map(doc => (
                <DocumentCard
                  key={doc.uniqueId}
                  document={doc}
                  showTypeChange={true} // Allow type change in attachment mode
                  isReadOnly={isReadOnly}
                  onRename={(newName) => {
                    if (onDocumentAction) {
                      onDocumentAction({
                        type: 'rename',
                        documentId: doc.uniqueId,
                        data: newName,
                      });
                    }
                  }}
                  onDelete={() => {
                    if (onDocumentAction) {
                      onDocumentAction({
                        type: 'delete',
                        documentId: doc.uniqueId,
                      });
                    }
                  }}
                  onDownload={() => {
                    if (onDocumentAction) {
                      onDocumentAction({
                        type: 'download',
                        documentId: doc.uniqueId,
                      });
                    }
                  }}
                  onChangeType={(newType) => {
                    if (onDocumentAction) {
                      onDocumentAction({
                        type: 'changeType',
                        documentId: doc.uniqueId,
                        data: newType,
                      });
                    }
                  }}
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', doc.uniqueId);
                    e.dataTransfer.setData('application/json', JSON.stringify({
                      documentId: doc.uniqueId,
                      fromType: documentType,
                    }));
                  }}
                />
              ))}

              {/* Staged files (new uploads) */}
              {stagedFiles.map((file, index) => {
                // Create temporary document object for card
                const tempDoc = {
                  name: file.name,
                  url: '',
                  size: file.size,
                  timeCreated: new Date().toISOString(),
                  timeLastModified: new Date().toISOString(),
                  uniqueId: `staged-${index}`,
                  modifiedBy: 'Current User',
                  documentType,
                };

                return (
                  <DocumentCard
                    key={`staged-${index}`}
                    document={tempDoc as any}
                    isNew={true}
                    isReadOnly={isReadOnly}
                    onDelete={() => {
                      // TODO: Remove staged file
                    }}
                  />
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
};

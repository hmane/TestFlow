/**
 * DocumentCard Component
 *
 * Enhanced card displaying a single document with three sections:
 * - Header: Large file icon (32px) + document name
 * - Center: User persona (32px) + timestamp (stacked)
 * - Footer: File size + inline badges + quick action icons + ECB menu
 *
 * Uses DocumentLink from spfx-toolkit for existing files
 * Custom rendering for new (not yet uploaded) files
 */

import * as React from 'react';
import {
  IconButton,
  Text,
  IContextualMenuProps,
  TooltipHost,
  DirectionalHint,
} from '@fluentui/react';
import { FileTypeIcon, IconType, ImageSize } from '@pnp/spfx-controls-react/lib/FileTypeIcon';
import { UserPersona } from 'spfx-toolkit/lib/components/UserPersona';
import { DocumentLink } from 'spfx-toolkit/lib/components/DocumentLink';
import { formatRelativeTime } from '../../services/documentService';
import { DocumentType } from '../../types/documentTypes';
import type { IDocumentCardProps } from './DocumentUploadTypes';

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);

  // Show 1 decimal for KB, MB, GB; no decimals for bytes
  return i === 0
    ? `${Math.round(value)} ${sizes[i]}`
    : `${value.toFixed(1)} ${sizes[i]}`;
}

/**
 * DocumentCard Component
 */
export const DocumentCard: React.FC<IDocumentCardProps> = ({
  document,
  isNew = false,
  isPending = false,
  isDeleted = false,
  isDragging = false,
  pendingName,
  pendingType,
  onRename,
  onDelete,
  onDownload,
  onChangeType,
  onUndoDelete,
  onDragStart,
  onDragEnd,
  showTypeChange = false,
  isReadOnly = false,
}) => {
  const displayName = pendingName || document.name;
  const displayType = pendingType || document.documentType;

  // Calculate relative time
  const { text: relativeTime, tooltip: fullDatetime } = React.useMemo(() => {
    const date = typeof document.timeLastModified === 'string'
      ? new Date(document.timeLastModified)
      : document.timeLastModified || new Date();

    return formatRelativeTime(date);
  }, [document.timeLastModified]);

  /**
   * Build ECB context menu (only for less common actions)
   * Quick actions (Delete, Change Type) are rendered as icons in footer
   */
  const contextMenuProps: IContextualMenuProps = React.useMemo(() => {
    const menuItems: IContextualMenuProps['items'] = [];

    if (isDeleted) {
      // Only show undo for deleted files
      if (onUndoDelete) {
        menuItems.push({
          key: 'undo',
          text: 'Undo Delete',
          iconProps: { iconName: 'Undo' },
          onClick: onUndoDelete,
        });
      }
    } else {
      // ECB menu: Rename and Download only
      // Delete and Change Type are quick action icons in footer
      if (onRename && !isReadOnly) {
        menuItems.push({
          key: 'rename',
          text: 'Rename',
          iconProps: { iconName: 'Rename' },
          onClick: () => {
            const newName = window.prompt('Enter new name:', displayName);
            if (newName && newName !== displayName) {
              onRename(newName);
            }
          },
        });
      }

      if (onDownload && !isNew) {
        menuItems.push({
          key: 'download',
          text: 'Download',
          iconProps: { iconName: 'Download' },
          onClick: onDownload,
        });
      }
    }

    return {
      items: menuItems,
      directionalHint: DirectionalHint.bottomLeftEdge,
    };
  }, [
    isDeleted,
    isReadOnly,
    isNew,
    displayName,
    onRename,
    onDownload,
    onUndoDelete,
  ]);

  // Card class names
  const cardClasses = React.useMemo(() => {
    const classes = ['document-card'];

    if (isNew) classes.push('card--new');
    if (isPending) classes.push('card--modified');
    if (isDeleted) classes.push('card--deleted');
    if (isDragging) classes.push('card--dragging');

    return classes.join(' ');
  }, [isNew, isPending, isDeleted, isDragging]);

  // Badge components (rendered inline in footer)
  const badges = React.useMemo(() => {
    const badgeElements: JSX.Element[] = [];

    if (!isDeleted) {
      if (isNew) {
        badgeElements.push(
          <span key="new" className="card-badge badge-new">NEW</span>
        );
      }
      if (isPending) {
        badgeElements.push(
          <span key="pending" className="card-badge badge-pending">PENDING</span>
        );
      }
    }

    return badgeElements;
  }, [isNew, isPending, isDeleted]);

  // Quick action: Change Type
  const changeTypeAction = React.useMemo(() => {
    if (isDeleted || isReadOnly || !onChangeType) return null;
    if (!isNew && !showTypeChange) return null;

    const newType = displayType === DocumentType.Review
      ? DocumentType.Supplemental
      : DocumentType.Review;
    const newTypeName = displayType === DocumentType.Review ? 'Supplemental' : 'Review';

    return (
      <TooltipHost content={`Change to ${newTypeName}`} directionalHint={DirectionalHint.topCenter}>
        <IconButton
          className="quick-action-btn"
          iconProps={{ iconName: 'Switch' }}
          title={`Change to ${newTypeName}`}
          ariaLabel={`Change document type to ${newTypeName}`}
          onClick={() => onChangeType(newType)}
        />
      </TooltipHost>
    );
  }, [isDeleted, isReadOnly, isNew, showTypeChange, displayType, onChangeType]);

  return (
    <div
      className={cardClasses}
      draggable={!isReadOnly && !isDeleted}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      data-document-id={document.uniqueId}
    >
      {/* HEADER: Large Icon + Document Name */}
      <div className="card-header">
        <div className="file-icon">
          <FileTypeIcon
            type={IconType.image}
            path={displayName}
            size={ImageSize.medium}
          />
        </div>

        <div className="file-name-wrapper">
          {isNew ? (
            // New file: Not clickable, plain text
            <Text
              className={`file-name ${isDeleted ? 'deleted' : ''}`}
              title={displayName}
            >
              {displayName}
            </Text>
          ) : (
            // Existing file: Use DocumentLink with hover card
            <DocumentLink
              documentUrl={document.url}
              layout="linkWithIcon"
              enableHoverCard={!isDeleted}
              showVersionHistory={!isDeleted}
              showDownloadInCard={true}
              onClick="preview"
              className="file-name-link"
              linkClassName={isDeleted ? 'deleted' : ''}
            />
          )}
        </div>
      </div>

      {/* CENTER: User Persona + Timestamp (stacked vertically, only for existing docs) */}
      {!isNew && (
        <div className="card-center">
          <div className="persona-container">
            <UserPersona
              userIdentifier={
                typeof document.modifiedBy === 'string'
                  ? (document.modifiedByEmail || document.modifiedBy)
                  : ((document.modifiedBy as any)?.id || (document.modifiedBy as any)?.email || document.modifiedByEmail || 'Unknown')
              }
              displayName={typeof document.modifiedBy === 'string' ? document.modifiedBy : (document.modifiedBy as any)?.title}
              email={document.modifiedByEmail}
              size={32}
              displayMode="avatarAndName"
            />
          </div>

          <div className="timestamp-container">
            <TooltipHost content={fullDatetime} directionalHint={DirectionalHint.topCenter}>
              <Text className="relative-time">{relativeTime}</Text>
            </TooltipHost>
          </div>

          {/* Show pending type change */}
          {isPending && pendingType && pendingType !== document.documentType && (
            <div className="type-change-container">
              <Text className="type-change">
                {document.documentType} → {pendingType}
              </Text>
            </div>
          )}
        </div>
      )}

      {/* FOOTER: File Size + Badges + Quick Actions + ECB Menu */}
      <div className="card-footer" role="group" aria-label="Document metadata and actions">
        <div className="footer-left">
          <Text className="file-size">{formatFileSize(document.size)}</Text>
          {badges.length > 0 && badges}
        </div>

        <div className="footer-right">
          {/* Quick Actions */}
          {!isReadOnly && !isDeleted && (
            <div className="quick-actions">
              {/* Change Type Quick Action */}
              {changeTypeAction}

              {/* Delete Quick Action */}
              {onDelete && (
                <TooltipHost content="Delete" directionalHint={DirectionalHint.topCenter}>
                  <IconButton
                    className="quick-action-btn"
                    iconProps={{ iconName: 'Delete' }}
                    title="Delete document"
                    ariaLabel="Delete document"
                    onClick={onDelete}
                  />
                </TooltipHost>
              )}
            </div>
          )}

          {/* ECB Menu (Rename, Download, Undo) */}
          {!isReadOnly && contextMenuProps.items.length > 0 && (
            <IconButton
              className="ecb-menu"
              menuProps={contextMenuProps}
              iconProps={{ iconName: 'MoreVertical' }}
              title="More actions"
              ariaLabel="More actions"
            />
          )}
        </div>
      </div>
    </div>
  );
};

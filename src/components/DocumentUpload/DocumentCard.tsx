/**
 * DocumentCard Component
 *
 * Enhanced card displaying a single document with three sections:
 * - Header: File icon (40px) + document name with inline file size
 * - Center: User persona (40px) left + user name and timestamp stacked right (horizontal layout)
 * - Footer: Inline badges + quick action icons + ECB menu
 *
 * Uses DocumentLink from spfx-toolkit for existing files
 * Custom rendering for new (not yet uploaded) files
 */

import * as React from 'react';
import { IconButton, DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { Text } from '@fluentui/react/lib/Text';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
import { DirectionalHint } from 'spfx-toolkit/lib/types/fluentui-types';
import { Stack } from '@fluentui/react/lib/Stack';
import { HoverCard, HoverCardType } from '@fluentui/react/lib/HoverCard';
import { Separator } from '@fluentui/react/lib/Separator';
import { Link } from '@fluentui/react/lib/Link';
import { Icon } from '@fluentui/react/lib/Icon';
import { useTheme } from '@fluentui/react/lib/Theme';
// ContextualMenu removed — review actions now show all buttons inline
// Import FileTypeIcon directly - lazy loading causes chunk load errors in SPFx
import { FileTypeIcon, IconType, ImageSize } from '@pnp/spfx-controls-react/lib/FileTypeIcon';
import { UserPersona } from 'spfx-toolkit/lib/components/UserPersona';
import { DocumentLink } from 'spfx-toolkit/lib/components/DocumentLink';
import { LazyVersionHistory } from 'spfx-toolkit/lib/components/lazy';
import { formatRelativeTime } from '@services/documentService';
import { formatCheckoutDuration, supportsReviewTracking } from '@services/documentCheckoutService';
import { DocumentType } from '@appTypes/documentTypes';
import { useDocumentLibraryId } from '@stores/documentsStore';
import type { IDocumentCardProps } from './DocumentUploadTypes';
import { RenameDialog } from './RenameDialog';

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
 *
 * Wrapped with React.memo for performance optimization when rendering in lists.
 * Prevents unnecessary re-renders when other documents in the list change.
 */
export const DocumentCard: React.FC<IDocumentCardProps> = React.memo(({
  document,
  isNew = false,
  isUpdating = false,
  isPending = false,
  isDeleted = false,
  isDragging = false,
  pendingName,
  pendingType,
  onRename,
  onCancelRename,
  onDelete,
  onDownload,
  onChangeType,
  onUndoDelete,
  onDragStart,
  onDragEnd,
  checkoutStatus,
  onStartReviewing,
  onDoneReviewing,
  onStopReviewing,
  onOpenViewOnly,
  allDocuments = [],
  stagedFiles = [],
  showTypeChange = false,
  isReadOnly = false,
}) => {
  const displayName = pendingName || document.name;
  const displayType = pendingType || document.documentType;
  const theme = useTheme();

  // Get library ID from store (loaded once during ApplicationProvider initialization)
  // This eliminates the per-card API calls that were causing throttling
  const documentLibraryId = useDocumentLibraryId();

  // Dialog states
  const [showVersionHistory, setShowVersionHistory] = React.useState(false);
  const [showRenameDialog, setShowRenameDialog] = React.useState(false);
  const [showStopConfirm, setShowStopConfirm] = React.useState(false);

  // Calculate relative time
  const { text: relativeTime, tooltip: fullDatetime } = React.useMemo(() => {
    const date = typeof document.timeLastModified === 'string'
      ? new Date(document.timeLastModified)
      : document.timeLastModified || new Date();

    return formatRelativeTime(date);
  }, [document.timeLastModified]);

  // Format created time
  const createdDatetime = React.useMemo(() => {
    const date = typeof document.timeCreated === 'string'
      ? new Date(document.timeCreated)
      : document.timeCreated || new Date();

    return date.toLocaleString();
  }, [document.timeCreated]);

  /**
   * Handle download button click in hover card
   */
  const handleDownload = React.useCallback(() => {
    if (document.url) {
      window.open(document.url, '_blank');
    }
  }, [document.url]);

  /**
   * Handle version history link click
   */
  const handleVersionHistoryClick = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowVersionHistory(true);
  }, []);

  /**
   * Render custom hover card content
   */
  const renderHoverCardContent = React.useCallback((): JSX.Element => {
    return (
      <div style={{ padding: '16px', minWidth: '320px', maxWidth: '400px' }}>
        {/* Header: File Icon + Document Name + Download Button */}
        <Stack horizontal horizontalAlign="space-between" verticalAlign="start" tokens={{ childrenGap: 12 }}>
          <Stack horizontal tokens={{ childrenGap: 12 }} verticalAlign="start" styles={{ root: { flex: 1 } }}>
            <FileTypeIcon
              type={IconType.image}
              path={displayName}
              size={ImageSize.small}
            />
            <Text
              variant="mediumPlus"
              styles={{
                root: {
                  fontWeight: 600,
                  wordBreak: 'break-word',
                  flex: 1,
                },
              }}
            >
              {displayName}
            </Text>
          </Stack>
          <IconButton
            iconProps={{ iconName: 'Download' }}
            title="Download"
            ariaLabel="Download document"
            onClick={handleDownload}
            styles={{
              root: {
                height: 24,
                width: 24,
              },
              icon: {
                fontSize: 14,
              },
            }}
          />
        </Stack>

        {/* Metadata Section */}
        {document.documentType && (
          <Stack tokens={{ childrenGap: 4 }} styles={{ root: { marginTop: '12px' } }}>
            <Stack
              horizontal
              tokens={{ childrenGap: 4 }}
              verticalAlign="center"
            >
              <Text variant="small" styles={{ root: { fontWeight: 600 } }}>
                Type:
              </Text>
              <Text
                variant="small"
                styles={{
                  root: {
                    padding: '2px 8px',
                    borderRadius: '2px',
                    backgroundColor: theme.palette.neutralLighter,
                    color: theme.palette.neutralPrimary,
                    fontWeight: 500,
                  },
                }}
              >
                {document.documentType}
              </Text>
            </Stack>
          </Stack>
        )}

        <Separator styles={{ root: { margin: '12px 0' } }} />

        {/* Created By */}
        <Stack horizontal tokens={{ childrenGap: 12 }} verticalAlign="center" styles={{ root: { marginBottom: '12px' } }}>
          <UserPersona
            userIdentifier={document.createdByEmail || (typeof document.createdBy === 'string' ? document.createdBy : 'Unknown')}
            displayName={typeof document.createdBy === 'string' ? document.createdBy : undefined}
            email={document.createdByEmail}
            size={40}
            displayMode="avatar"
          />
          <Stack tokens={{ childrenGap: 2 }}>
            <Text variant="small" styles={{ root: { fontWeight: 600 } }}>
              {typeof document.createdBy === 'string' ? document.createdBy : 'Unknown'}
            </Text>
            <Text variant="xSmall" styles={{ root: { color: theme.palette.neutralSecondary } }}>
              Created {createdDatetime}
            </Text>
          </Stack>
        </Stack>

        {/* Modified By */}
        <Stack horizontal tokens={{ childrenGap: 12 }} verticalAlign="center">
          <UserPersona
            userIdentifier={document.modifiedByEmail || (typeof document.modifiedBy === 'string' ? document.modifiedBy : 'Unknown')}
            displayName={typeof document.modifiedBy === 'string' ? document.modifiedBy : undefined}
            email={document.modifiedByEmail}
            size={40}
            displayMode="avatar"
          />
          <Stack tokens={{ childrenGap: 2 }}>
            <Text variant="small" styles={{ root: { fontWeight: 600 } }}>
              {typeof document.modifiedBy === 'string' ? document.modifiedBy : 'Unknown'}
            </Text>
            <Text variant="xSmall" styles={{ root: { color: theme.palette.neutralSecondary } }}>
              Modified {fullDatetime}
            </Text>
          </Stack>
        </Stack>

        {/* Footer: File Size (left) + Version History Link (right) */}
        <Separator styles={{ root: { margin: '12px 0' } }} />
        <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
          <Text variant="small" styles={{ root: { color: theme.palette.neutralSecondary } }}>
            {formatFileSize(document.size)}
          </Text>
          {document.listItemId && (
            <Link
              onClick={handleVersionHistoryClick}
              styles={{
                root: {
                  fontSize: '12px',
                  fontWeight: 600,
                },
              }}
            >
              View history
            </Link>
          )}
        </Stack>
      </div>
    );
  }, [
    displayName,
    document.size,
    document.documentType,
    document.createdBy,
    document.createdByEmail,
    document.modifiedBy,
    document.modifiedByEmail,
    document.listItemId,
    document.version,
    createdDatetime,
    fullDatetime,
    theme,
    handleDownload,
    handleVersionHistoryClick,
  ]);

  /**
   * Handle rename click - opens dialog
   */
  const handleRenameClick = React.useCallback(() => {
    setShowRenameDialog(true);
  }, []);

  /**
   * Handle rename dialog submit
   */
  const handleRenameDialogSubmit = React.useCallback(
    (newName: string) => {
      if (onRename) {
        onRename(newName);
      }
      setShowRenameDialog(false);
    },
    [onRename]
  );

  /**
   * Handle cancel rename dialog
   */
  const handleCancelRenameDialog = React.useCallback(() => {
    setShowRenameDialog(false);
  }, []);

  // Review tracking state
  const isCheckedOut = checkoutStatus?.isCheckedOut ?? false;
  const isCheckedOutByMe = checkoutStatus?.isCheckedOutByMe ?? false;
  const staleLevel = checkoutStatus?.staleLevel ?? 'normal';
  const hasReviewTracking = !!checkoutStatus && !isNew && !isDeleted;

  // Card class names
  const cardClasses = React.useMemo(() => {
    const classes = ['document-card'];

    if (isNew) classes.push('card--new');
    if (isPending) classes.push('card--modified');
    if (isDeleted) classes.push('card--deleted');
    if (isDragging) classes.push('card--dragging');
    if (hasReviewTracking && isCheckedOut) {
      classes.push(isCheckedOutByMe ? 'card--reviewing-mine' : 'card--reviewing-other');
    }

    return classes.join(' ');
  }, [isNew, isPending, isDeleted, isDragging, hasReviewTracking, isCheckedOut, isCheckedOutByMe]);

  // Badge components (rendered inline in footer)
  const badges = React.useMemo(() => {
    const badgeElements: JSX.Element[] = [];

    if (!isDeleted) {
      if (isUpdating) {
        // Show UPDATED badge for files replacing existing documents
        badgeElements.push(
          <span key="updated" className="card-badge badge-updated">UPDATED</span>
        );
      } else if (isNew) {
        // Show NEW badge only if not updating
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
  }, [isNew, isUpdating, isPending, isDeleted]);

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

  /**
   * Render review status badge (shown in card-center for existing files with review tracking)
   */
  const reviewBadge = React.useMemo((): React.ReactNode => {
    if (!hasReviewTracking || !isCheckedOut) return null;

    const staleLevelClass = staleLevel !== 'normal' ? `review-badge--${staleLevel}` : '';

    if (isCheckedOutByMe) {
      return (
        <div
          className={`review-badge review-badge--mine ${staleLevelClass}`}
          role="status"
          aria-label={`You're reviewing ${document.name}`}
        >
          <Icon iconName="Lock" className="review-badge-icon" />
          <span className="review-badge-text">You&apos;re reviewing</span>
        </div>
      );
    }

    const reviewerName = checkoutStatus?.checkedOutByName ?? 'Someone';
    const duration = formatCheckoutDuration(checkoutStatus?.checkedOutDate);
    const ariaLabel = `Being reviewed by ${reviewerName}${duration ? ` since ${duration}` : ''}`;

    return (
      <div
        className={`review-badge review-badge--other ${staleLevelClass}`}
        role="status"
        aria-label={ariaLabel}
      >
        <Icon iconName="Lock" className="review-badge-icon" />
        <div className="review-badge-details">
          <span className="review-badge-text">Being reviewed by {reviewerName}</span>
          {duration && <span className="review-badge-time">{duration}</span>}
        </div>
      </div>
    );
  }, [hasReviewTracking, isCheckedOut, isCheckedOutByMe, staleLevel, checkoutStatus, document.name]);

  /**
   * Render review action icon buttons (compact, tooltip on hover)
   */
  const reviewActions = React.useMemo((): React.ReactNode => {
    if (!hasReviewTracking || isDeleted || isReadOnly) return null;

    const iconBtnStyles = { root: { width: 28, height: 28, minWidth: 28 } };

    // Being reviewed by me: Done Reviewing + Open + Stop Reviewing
    if (isCheckedOutByMe) {
      return (
        <div className="review-actions">
          <TooltipHost content="Done Reviewing" directionalHint={DirectionalHint.topCenter}>
            <IconButton
              iconProps={{ iconName: 'CheckMark' }}
              onClick={() => onDoneReviewing?.()}
              className="review-icon-btn review-icon-btn--done"
              ariaLabel={`Done reviewing ${document.name}`}
              styles={iconBtnStyles}
            />
          </TooltipHost>
          <TooltipHost content="Open" directionalHint={DirectionalHint.topCenter}>
            <IconButton
              iconProps={{ iconName: 'OpenFile' }}
              onClick={() => onOpenViewOnly?.()}
              className="review-icon-btn"
              ariaLabel={`Open ${document.name}`}
              styles={iconBtnStyles}
            />
          </TooltipHost>
          <TooltipHost content="Stop Reviewing" directionalHint={DirectionalHint.topCenter}>
            <IconButton
              iconProps={{ iconName: 'Cancel' }}
              onClick={() => { setShowStopConfirm(true); }}
              className="review-icon-btn review-icon-btn--stop"
              ariaLabel={`Stop reviewing ${document.name}`}
              styles={iconBtnStyles}
            />
          </TooltipHost>
        </div>
      );
    }

    // Being reviewed by someone else: only Open View Only
    if (isCheckedOut) {
      const reviewerName = checkoutStatus?.checkedOutByName || 'another user';
      const duration = formatCheckoutDuration(checkoutStatus?.checkedOutDate);
      const lockTooltip = duration
        ? `Checked out by ${reviewerName} (${duration})`
        : `Checked out by ${reviewerName}`;

      return (
        <div className="review-actions">
          <TooltipHost content={lockTooltip} directionalHint={DirectionalHint.topCenter}>
            <IconButton
              iconProps={{ iconName: 'Lock' }}
              disabled={true}
              className="review-icon-btn"
              ariaLabel={lockTooltip}
              styles={iconBtnStyles}
            />
          </TooltipHost>
          <TooltipHost content="Open View Only" directionalHint={DirectionalHint.topCenter}>
            <IconButton
              iconProps={{ iconName: 'View' }}
              onClick={() => onOpenViewOnly?.()}
              className="review-icon-btn"
              ariaLabel={`Open ${document.name} in view-only mode`}
              styles={iconBtnStyles}
            />
          </TooltipHost>
        </div>
      );
    }

    // Available: Review & Open + Open View Only
    return (
      <div className="review-actions">
        <TooltipHost content="Review & Open" directionalHint={DirectionalHint.topCenter}>
          <IconButton
            iconProps={{ iconName: 'Edit' }}
            onClick={() => onStartReviewing?.()}
            className="review-icon-btn review-icon-btn--start"
            ariaLabel={`Review ${document.name} and open it`}
            styles={iconBtnStyles}
          />
        </TooltipHost>
        <TooltipHost content="Open View Only" directionalHint={DirectionalHint.topCenter}>
          <IconButton
            iconProps={{ iconName: 'View' }}
            onClick={() => onOpenViewOnly?.()}
            className="review-icon-btn"
            ariaLabel={`Open ${document.name} without marking as reviewing`}
            styles={iconBtnStyles}
          />
        </TooltipHost>
      </div>
    );
  }, [hasReviewTracking, isDeleted, isReadOnly, isCheckedOut, isCheckedOutByMe,
      onStartReviewing, onDoneReviewing, onStopReviewing, onOpenViewOnly, document.name]);

  return (
    <div
      className={cardClasses}
      draggable={!isReadOnly && !isDeleted}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      data-document-id={document.uniqueId}
    >
      {/* HEADER: File Icon + Document Name + Size */}
      <div className="card-header">
        <div className="file-icon">
          <FileTypeIcon
            type={IconType.image}
            path={displayName}
            size={ImageSize.medium}
          />
        </div>

        {/* File name with interactive hover card for existing files */}
        {!isNew && !isDeleted ? (
          <HoverCard
            type={HoverCardType.plain}
            plainCardProps={{
              onRenderPlainCard: renderHoverCardContent,
            }}
            instantOpenOnClick={false}
          >
            <div className="file-name-wrapper">
              {pendingName ? (
                // Show pending name as plain text (not clickable during rename)
                <Text
                  className="file-name"
                  title={displayName}
                  styles={{
                    root: {
                      color: theme.palette.themePrimary,
                      fontStyle: 'italic',
                    },
                  }}
                >
                  {displayName}
                </Text>
              ) : hasReviewTracking && supportsReviewTracking(document.name) ? (
                isReadOnly && onOpenViewOnly ? (
                  // Read-only tracked files should still be previewable from the filename.
                  <Link
                    className="file-name-link"
                    onClick={(event) => {
                      event.preventDefault();
                      onOpenViewOnly();
                    }}
                    styles={{
                      root: {
                        fontWeight: 600,
                      },
                    }}
                  >
                    {displayName}
                  </Link>
                ) : (
                  // Non-Office file with review tracking: render as plain text
                  // Users must use review action buttons to open, preventing bypass
                  <Text
                    className="file-name"
                    title={displayName}
                    styles={{ root: { fontWeight: 600 } }}
                  >
                    {displayName}
                  </Text>
                )
              ) : (
                // Office file or no review tracking: show as clickable DocumentLink
                // Prefer uniqueId over URL to avoid URL encoding issues
                <DocumentLink
                  {...(document.url
                    ? { documentUrl: document.url }
                    : { documentUniqueId: document.uniqueId })}
                  layout="linkOnly"
                  enableHoverCard={false}
                  showVersionHistory={false}
                  showDownloadInCard={false}
                  onClick="preview"
                  previewMode="edit"
                  className="file-name-link"
                  linkClassName={isDeleted ? 'deleted' : ''}
                  enableCache={false}
                />
              )}
              <Text className="file-size-inline">{formatFileSize(document.size)}</Text>
            </div>
          </HoverCard>
        ) : (
          // New or deleted file: Not clickable, plain text without hover card
          <div className="file-name-wrapper">
            <Text
              className={`file-name ${isDeleted ? 'deleted' : ''}`}
              title={displayName}
            >
              {displayName}
            </Text>
            <Text className="file-size-inline">{formatFileSize(document.size)}</Text>
          </div>
        )}
      </div>

      {/* CENTER: User Persona + User Info (horizontal layout) OR spacer for new docs */}
      {!isNew ? (
        <div className="card-center">
          {/* Left: Persona avatar only */}
          <div className="persona-avatar">
            <UserPersona
              userIdentifier={
                typeof document.modifiedBy === 'string'
                  ? (document.modifiedByEmail || document.modifiedBy)
                  : ((document.modifiedBy as any)?.id || (document.modifiedBy as any)?.email || document.modifiedByEmail || 'Unknown')
              }
              displayName={typeof document.modifiedBy === 'string' ? document.modifiedBy : (document.modifiedBy as any)?.title}
              email={document.modifiedByEmail}
              size={28}
              displayMode="avatar"
            />
          </div>

          {/* Right: User name and timestamp stacked */}
          <div className="user-info">
            <Text className="user-name">
              {typeof document.modifiedBy === 'string' ? document.modifiedBy : (document.modifiedBy as any)?.title || 'Unknown'}
            </Text>
            <TooltipHost content={fullDatetime} directionalHint={DirectionalHint.topCenter}>
              <Text className="relative-time">Modified {relativeTime}</Text>
            </TooltipHost>

            {/* Show pending type change */}
            {isPending && pendingType && pendingType !== document.documentType && (
              <Text className="type-change">
                {document.documentType} → {pendingType}
              </Text>
            )}
          </div>
        </div>
      ) : (
        <div className="card-center-spacer" />
      )}

      {/* REVIEW STATUS BADGE (shown for non-Office files with review tracking) */}
      {reviewBadge}

      {/* FOOTER: Review Actions (left) + Badges + Quick Actions (right) */}
      <div className="card-footer" role="group" aria-label="Document actions">
        <div className="footer-left">
          {reviewActions}
          {badges.length > 0 && badges}
        </div>

        <div className="footer-right">
          {/* Quick Actions */}
          {!isReadOnly && (
            <div className="quick-actions">
              {isDeleted ? (
                // Undo Delete for deleted files
                onUndoDelete && (
                  <TooltipHost content="Undo Delete" directionalHint={DirectionalHint.topCenter}>
                    <IconButton
                      className="quick-action-btn"
                      iconProps={{ iconName: 'Undo' }}
                      title="Undo Delete"
                      ariaLabel="Undo delete document"
                      onClick={onUndoDelete}
                    />
                  </TooltipHost>
                )
              ) : (
                <>
                  {/* Change Type Quick Action */}
                  {changeTypeAction}

                  {/* Rename Quick Action */}
                  {onRename && !pendingName && (
                    <TooltipHost content="Rename" directionalHint={DirectionalHint.topCenter}>
                      <IconButton
                        className="quick-action-btn"
                        iconProps={{ iconName: 'Rename' }}
                        title="Rename document"
                        ariaLabel="Rename document"
                        onClick={handleRenameClick}
                      />
                    </TooltipHost>
                  )}

                  {/* Undo Rename Quick Action (only shown if rename pending) */}
                  {onCancelRename && pendingName && (
                    <TooltipHost content="Undo rename" directionalHint={DirectionalHint.topCenter}>
                      <IconButton
                        className="quick-action-btn"
                        iconProps={{ iconName: 'Undo' }}
                        title="Undo rename"
                        ariaLabel="Undo pending rename"
                        onClick={onCancelRename}
                      />
                    </TooltipHost>
                  )}

                  {/* Download Quick Action */}
                  {onDownload && !isNew && (
                    <TooltipHost content="Download" directionalHint={DirectionalHint.topCenter}>
                      <IconButton
                        className="quick-action-btn"
                        iconProps={{ iconName: 'Download' }}
                        title="Download document"
                        ariaLabel="Download document"
                        onClick={onDownload}
                      />
                    </TooltipHost>
                  )}

                  {/* Delete Quick Action - Red Color */}
                  {onDelete && (
                    <TooltipHost content="Delete" directionalHint={DirectionalHint.topCenter}>
                      <IconButton
                        className="quick-action-btn"
                        iconProps={{ iconName: 'Delete' }}
                        title="Delete document"
                        ariaLabel="Delete document"
                        onClick={onDelete}
                        styles={{
                          root: {
                            color: theme.palette.redDark,
                          },
                          rootHovered: {
                            color: theme.palette.red,
                            backgroundColor: 'transparent',
                          },
                          icon: {
                            color: theme.palette.redDark,
                          },
                          iconHovered: {
                            color: theme.palette.red,
                          },
                        }}
                      />
                    </TooltipHost>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stop Reviewing Confirmation */}
      {showStopConfirm && (
        <div className="stop-review-confirm" role="alertdialog" aria-describedby="stop-review-desc">
          <Text id="stop-review-desc" variant="small" styles={{ root: { color: '#605e5c' } }}>
            This will release the file without saving. Others will be able to start reviewing.
          </Text>
          <Stack horizontal tokens={{ childrenGap: 8 }} styles={{ root: { marginTop: 8 } }}>
            <PrimaryButton
              text="Stop Reviewing"
              onClick={() => {
                setShowStopConfirm(false);
                onStopReviewing?.();
              }}
              styles={{ root: { minWidth: 0, padding: '0 8px', height: 28, fontSize: 11 } }}
            />
            <DefaultButton
              text="Cancel"
              onClick={() => setShowStopConfirm(false)}
              styles={{ root: { minWidth: 0, padding: '0 8px', height: 28, fontSize: 11 } }}
            />
          </Stack>
        </div>
      )}

      {/* Version History Modal */}
      {showVersionHistory && document.listItemId && documentLibraryId && (
        <LazyVersionHistory
          listId={documentLibraryId}
          itemId={document.listItemId}
          onClose={() => setShowVersionHistory(false)}
          allowCopyLink={true}
          onDownload={(version) => {
            // Handle version download
            if (version.fileUrl) {
              window.open(version.fileUrl, '_blank');
            }
          }}
        />
      )}

      {/* Rename Dialog */}
      {showRenameDialog && (
        <RenameDialog
          document={document}
          documentType={displayType}
          allDocuments={allDocuments}
          stagedFiles={stagedFiles}
          isOpen={showRenameDialog}
          onRename={handleRenameDialogSubmit}
          onCancel={handleCancelRenameDialog}
        />
      )}
    </div>
  );
});

// Set display name for React DevTools
DocumentCard.displayName = 'DocumentCard';

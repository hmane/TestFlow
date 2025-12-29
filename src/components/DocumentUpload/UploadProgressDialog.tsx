/**
 * UploadProgressDialog Component
 *
 * Shows upload progress for all files being uploaded
 * - Displays individual file progress bars
 * - Shows status icons (success, error, uploading, pending, skipped)
 * - Retry logic: 2 auto-retries, then manual retry, then skip option
 * - Cannot close until all uploads complete or are skipped
 */

import * as React from 'react';

// Fluent UI - tree-shaken imports
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { Dialog, DialogType, DialogFooter } from '@fluentui/react/lib/Dialog';
import { Icon } from '@fluentui/react/lib/Icon';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { ProgressIndicator } from '@fluentui/react/lib/ProgressIndicator';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';

import type { IUploadProgressDialogProps, IFileUploadProgress } from './DocumentUploadTypes';
import { FileOperationStatus } from '@services/approvalFileService';

/**
 * Get status icon name and color
 */
function getStatusIcon(status: FileOperationStatus): { iconName: string; color: string } {
  switch (status) {
    case 'success':
      return { iconName: 'Completed', color: '#107c10' };
    case 'error':
      return { iconName: 'StatusErrorFull', color: '#a4262c' };
    case 'uploading':
      return { iconName: 'ProgressRingDots', color: '#0078d4' };
    case 'skipped':
      return { iconName: 'SkypeCircleMinus', color: '#a19f9d' };
    case 'pending':
    default:
      return { iconName: 'CircleRing', color: '#a19f9d' };
  }
}

/**
 * UploadProgressDialog Component
 */
export const UploadProgressDialog: React.FC<IUploadProgressDialogProps> = ({
  isOpen,
  uploadProgress,
  onRetry,
  onSkip,
  onClose,
  canClose,
}) => {
  /**
   * Calculate overall progress
   */
  const overallProgress = React.useMemo(() => {
    // ES5 compatible: Manual iteration instead of Array.from()
    const progressArray: IFileUploadProgress[] = [];
    uploadProgress.forEach((value) => {
      progressArray.push(value);
    });

    if (progressArray.length === 0) {
      return { completed: 0, total: 0, inProgress: 0, failed: 0 };
    }

    const completed = progressArray.filter(p => p.status === 'success' || p.status === 'skipped').length;
    const inProgress = progressArray.filter(p => p.status === 'uploading').length;
    const failed = progressArray.filter(p => p.status === 'error').length;
    const total = progressArray.length;

    return { completed, total, inProgress, failed };
  }, [uploadProgress]);

  /**
   * Has any errors
   */
  const hasErrors = overallProgress.failed > 0;

  /**
   * All complete or skipped
   */
  const allDone = overallProgress.completed === overallProgress.total;

  /**
   * Dialog content props
   */
  const dialogContentProps = React.useMemo(() => ({
    type: DialogType.normal,
    title: 'Uploading Documents...',
    subText: allDone
      ? 'All uploads completed'
      : `Uploading ${overallProgress.inProgress} of ${overallProgress.total} files... ${overallProgress.completed} completed`,
  }), [allDone, overallProgress]);

  /**
   * Auto-close after completion
   */
  React.useEffect(() => {
    if (allDone && !hasErrors && canClose) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [allDone, hasErrors, canClose, onClose]);

  return (
    <Dialog
      hidden={!isOpen}
      onDismiss={canClose ? onClose : undefined}
      dialogContentProps={dialogContentProps}
      minWidth={600}
      maxWidth={700}
      modalProps={{
        isBlocking: !canClose,
        styles: { main: { maxWidth: 700 } },
      }}
    >
      <Stack tokens={{ childrenGap: 16 }}>
        {/* Success message */}
        {allDone && !hasErrors && (
          <MessageBar messageBarType={MessageBarType.success}>
            All files uploaded successfully!
          </MessageBar>
        )}

        {/* Error message */}
        {hasErrors && (
          <MessageBar messageBarType={MessageBarType.error}>
            {overallProgress.failed} file{overallProgress.failed !== 1 ? 's' : ''} failed to upload.
            You can retry or skip them.
          </MessageBar>
        )}

        {/* File progress list */}
        <Stack
          tokens={{ childrenGap: 8 }}
          styles={{
            root: {
              maxHeight: '400px',
              overflowY: 'auto',
              border: '1px solid #edebe9',
              borderRadius: '4px',
              padding: '12px',
            },
          }}
        >
          {/* ES5 compatible: Build array first, then map */}
          {(() => {
            const progressArray: IFileUploadProgress[] = [];
            uploadProgress.forEach((value) => {
              progressArray.push(value);
            });
            return progressArray;
          })().map((fileProgress) => {
            const { iconName, color } = getStatusIcon(fileProgress.status);
            const canRetry = fileProgress.status === 'error' && fileProgress.retryCount < fileProgress.maxRetries;
            const canSkip = fileProgress.status === 'error' && fileProgress.retryCount >= fileProgress.maxRetries;

            return (
              <Stack
                key={fileProgress.fileId}
                tokens={{ childrenGap: 4 }}
                styles={{
                  root: {
                    padding: '8px',
                    borderRadius: '4px',
                    background: fileProgress.status === 'error' ? '#fef0f1' : 'white',
                    border: `1px solid ${fileProgress.status === 'error' ? '#fde7e9' : '#edebe9'}`,
                  },
                }}
              >
                {/* File name and status icon */}
                <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
                  <Icon iconName={iconName} styles={{ root: { color, fontSize: '16px' } }} />
                  <Text
                    styles={{
                      root: {
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontWeight: 500,
                      },
                    }}
                  >
                    {fileProgress.fileName}
                  </Text>
                  {fileProgress.status === 'error' && fileProgress.retryCount > 0 && (
                    <Text variant="small" styles={{ root: { color: '#a4262c' } }}>
                      (Retry {fileProgress.retryCount}/{fileProgress.maxRetries})
                    </Text>
                  )}
                  {fileProgress.status === 'success' && (
                    <Text variant="small" styles={{ root: { color: '#107c10' } }}>
                      100%
                    </Text>
                  )}
                </Stack>

                {/* Progress bar */}
                {fileProgress.status === 'uploading' && (
                  <ProgressIndicator
                    percentComplete={fileProgress.progress / 100}
                    styles={{
                      root: { width: '100%' },
                      progressBar: { background: '#0078d4' },
                    }}
                  />
                )}

                {/* Error message */}
                {fileProgress.error && (
                  <Text
                    variant="small"
                    styles={{
                      root: {
                        color: '#a4262c',
                        fontStyle: 'italic',
                        marginTop: '4px',
                      },
                    }}
                  >
                    Error: {fileProgress.error}
                  </Text>
                )}

                {/* Retry/Skip buttons */}
                {(canRetry || canSkip) && (
                  <Stack horizontal tokens={{ childrenGap: 8 }} styles={{ root: { marginTop: '4px' } }}>
                    {canRetry && (
                      <PrimaryButton
                        text="Retry Now"
                        iconProps={{ iconName: 'Refresh' }}
                        onClick={() => onRetry(fileProgress.fileId)}
                        styles={{ root: { minWidth: '100px', height: '28px' } }}
                      />
                    )}
                    {canSkip && (
                      <DefaultButton
                        text="Skip This File"
                        iconProps={{ iconName: 'Cancel' }}
                        onClick={() => onSkip(fileProgress.fileId)}
                        styles={{ root: { minWidth: '100px', height: '28px' } }}
                      />
                    )}
                  </Stack>
                )}
              </Stack>
            );
          })}
        </Stack>

        {/* Overall summary */}
        <Stack
          horizontal
          horizontalAlign="space-between"
          styles={{
            root: {
              padding: '8px 12px',
              background: '#f3f2f1',
              borderRadius: '4px',
            },
          }}
        >
          <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
            Progress:
          </Text>
          <Text variant="medium">
            {overallProgress.completed} of {overallProgress.total} files completed
          </Text>
        </Stack>
      </Stack>

      <DialogFooter>
        <DefaultButton
          text={allDone ? 'Close' : 'Cancel'}
          onClick={onClose}
          disabled={!canClose}
          iconProps={{ iconName: allDone ? 'Completed' : 'Cancel' }}
        />
      </DialogFooter>
    </Dialog>
  );
};

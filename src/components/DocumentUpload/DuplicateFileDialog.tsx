/**
 * DuplicateFileDialog Component
 *
 * Warning dialog shown when uploading files with duplicate names
 * - Lists all duplicate files
 * - User can choose to Overwrite or Skip upload
 */

import * as React from 'react';
import {
  Dialog,
  DialogType,
  DialogFooter,
  PrimaryButton,
  DefaultButton,
  Stack,
  Text,
  Icon,
  MessageBar,
  MessageBarType,
} from '@fluentui/react';
import type { IDuplicateFileDialogProps } from './DocumentUploadTypes';

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Math.round(bytes / Math.pow(k, i))} ${sizes[i]}`;
}

/**
 * DuplicateFileDialog Component
 */
export const DuplicateFileDialog: React.FC<IDuplicateFileDialogProps> = ({
  isOpen,
  duplicateFiles,
  onOverwrite,
  onSkip,
}) => {
  /**
   * Dialog content props
   */
  const dialogContentProps = React.useMemo(() => ({
    type: DialogType.normal,
    title: 'Duplicate Files Detected',
    subText: 'The following files already exist in this location. What would you like to do?',
  }), []);

  return (
    <Dialog
      hidden={!isOpen}
      onDismiss={onSkip}
      dialogContentProps={dialogContentProps}
      minWidth={500}
      maxWidth={600}
    >
      <Stack tokens={{ childrenGap: 16 }}>
        {/* Warning message */}
        <MessageBar messageBarType={MessageBarType.warning}>
          <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
            {duplicateFiles.length} file{duplicateFiles.length !== 1 ? 's' : ''} with the same
            name{duplicateFiles.length !== 1 ? 's' : ''} already exist
            {duplicateFiles.length !== 1 ? '' : 's'}.
          </Text>
        </MessageBar>

        {/* Duplicate files list */}
        <Stack tokens={{ childrenGap: 8 }}>
          <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
            Duplicate files:
          </Text>

          <Stack
            tokens={{ childrenGap: 4 }}
            styles={{
              root: {
                maxHeight: '250px',
                overflowY: 'auto',
                border: '1px solid #edebe9',
                borderRadius: '4px',
                padding: '8px',
                background: '#faf9f8',
              },
            }}
          >
            {duplicateFiles.map((file, index) => (
              <Stack
                key={index}
                horizontal
                verticalAlign="center"
                tokens={{ childrenGap: 8 }}
                styles={{
                  root: {
                    padding: '6px 8px',
                    borderRadius: '2px',
                    background: 'white',
                    border: '1px solid #edebe9',
                  },
                }}
              >
                <Icon
                  iconName="Warning"
                  styles={{ root: { color: '#ff8c00', fontSize: '16px' } }}
                />
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
                  {file.name}
                </Text>
                <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
                  {formatFileSize(file.size)}
                </Text>
              </Stack>
            ))}
          </Stack>
        </Stack>

        {/* Options explanation */}
        <Stack tokens={{ childrenGap: 12 }}>
          <Stack
            horizontal
            tokens={{ childrenGap: 8 }}
            styles={{ root: { padding: '8px' } }}
          >
            <Icon
              iconName="DocumentReply"
              styles={{ root: { color: '#0078d4', fontSize: '16px' } }}
            />
            <Stack tokens={{ childrenGap: 4 }}>
              <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
                Overwrite
              </Text>
              <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
                Replace the existing files with the new ones. The old files will be lost.
              </Text>
            </Stack>
          </Stack>

          <Stack
            horizontal
            tokens={{ childrenGap: 8 }}
            styles={{ root: { padding: '8px' } }}
          >
            <Icon
              iconName="Cancel"
              styles={{ root: { color: '#a19f9d', fontSize: '16px' } }}
            />
            <Stack tokens={{ childrenGap: 4 }}>
              <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
                Skip Upload
              </Text>
              <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
                Keep the existing files and do not upload these duplicates. Other files (if any)
                will still be uploaded.
              </Text>
            </Stack>
          </Stack>
        </Stack>
      </Stack>

      <DialogFooter>
        <PrimaryButton
          text="Overwrite"
          onClick={onOverwrite}
          iconProps={{ iconName: 'DocumentReply' }}
        />
        <DefaultButton
          text="Skip Upload"
          onClick={onSkip}
          iconProps={{ iconName: 'Cancel' }}
        />
      </DialogFooter>
    </Dialog>
  );
};

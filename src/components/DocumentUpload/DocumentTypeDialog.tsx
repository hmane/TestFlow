/**
 * DocumentTypeDialog Component
 *
 * Modal dialog for selecting document type
 * - Used when uploading new files (batch type selection)
 * - Used when changing type of existing files
 * - Shows list of files with sizes
 * - Single dropdown for document type (Review or Supplemental)
 */

import * as React from 'react';

// Fluent UI - tree-shaken imports
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { Dialog, DialogType, DialogFooter } from '@fluentui/react/lib/Dialog';
import { Dropdown, type IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { Icon } from '@fluentui/react/lib/Icon';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';

// App imports using path aliases
import { DocumentType } from '@appTypes/documentTypes';
import type { IDocumentTypeDialogProps } from './DocumentUploadTypes';

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
 * DocumentTypeDialog Component
 */
export const DocumentTypeDialog: React.FC<IDocumentTypeDialogProps> = ({
  isOpen,
  files,
  currentType,
  onSave,
  onCancel,
  mode,
}) => {
  const [selectedType, setSelectedType] = React.useState<DocumentType | undefined>(
    currentType || DocumentType.Review
  );

  // Reset selected type when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedType(currentType || DocumentType.Review);
    }
  }, [isOpen, currentType]);

  /**
   * Document type options (only Review and Supplemental for attachments)
   */
  const typeOptions: IDropdownOption[] = React.useMemo(() => [
    { key: DocumentType.Review, text: 'Review' },
    { key: DocumentType.Supplemental, text: 'Supplemental' },
  ], []);

  /**
   * Handle save
   */
  const handleSave = React.useCallback(() => {
    if (selectedType) {
      onSave(selectedType);
    }
  }, [selectedType, onSave]);

  /**
   * Dialog content props
   */
  const dialogContentProps = React.useMemo(() => ({
    type: DialogType.normal,
    title: mode === 'upload' ? 'Set Document Type' : 'Change Document Type',
    subText: mode === 'upload'
      ? 'Select the document type for the files you are uploading.'
      : 'Select the new document type for the selected files.',
  }), [mode]);

  return (
    <Dialog
      hidden={!isOpen}
      onDismiss={onCancel}
      dialogContentProps={dialogContentProps}
      minWidth={500}
      maxWidth={600}
    >
      <Stack tokens={{ childrenGap: 16 }}>
        {/* Files list */}
        <Stack tokens={{ childrenGap: 8 }}>
          <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
            {mode === 'upload' ? 'Files to upload:' : 'Selected files:'}
          </Text>

          <Stack
            tokens={{ childrenGap: 4 }}
            styles={{
              root: {
                maxHeight: '200px',
                overflowY: 'auto',
                border: '1px solid #edebe9',
                borderRadius: '4px',
                padding: '8px',
              },
            }}
          >
            {files.map((file, index) => (
              <Stack
                key={index}
                horizontal
                verticalAlign="center"
                tokens={{ childrenGap: 8 }}
                styles={{
                  root: {
                    padding: '4px 8px',
                    borderRadius: '2px',
                    '&:hover': {
                      background: '#f3f2f1',
                    },
                  },
                }}
              >
                <Icon iconName="Page" styles={{ root: { color: '#605e5c' } }} />
                <Text
                  styles={{
                    root: {
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
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

        {/* Document Type dropdown */}
        <Dropdown
          label="Document Type"
          selectedKey={selectedType}
          options={typeOptions}
          onChange={(_, option) => {
            if (option) {
              setSelectedType(option.key as DocumentType);
            }
          }}
          required
          styles={{
            dropdown: { width: '100%' },
          }}
        />

        {/* Info message */}
        {mode === 'upload' && (
          <Stack
            horizontal
            tokens={{ childrenGap: 8 }}
            styles={{
              root: {
                padding: '8px 12px',
                background: '#eff6fc',
                border: '1px solid #0078d4',
                borderRadius: '4px',
              },
            }}
          >
            <Icon iconName="Info" styles={{ root: { color: '#0078d4' } }} />
            <Text variant="small" styles={{ root: { color: '#323130' } }}>
              All selected files will be assigned the same document type. You can change the type
              of individual files later if needed.
            </Text>
          </Stack>
        )}
      </Stack>

      <DialogFooter>
        <PrimaryButton
          text="Save"
          onClick={handleSave}
          disabled={!selectedType}
        />
        <DefaultButton text="Cancel" onClick={onCancel} />
      </DialogFooter>
    </Dialog>
  );
};

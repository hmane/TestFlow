/**
 * RenameDialog Component
 * Dialog for renaming documents with validation
 */

import * as React from 'react';
import {
  Dialog,
  DialogType,
  DialogFooter,
  PrimaryButton,
  DefaultButton,
  TextField,
  Stack,
  Text,
  Spinner,
  SpinnerSize,
  MessageBar,
  MessageBarType,
} from '@fluentui/react';
import type { IDocument, IStagedDocument } from '../../stores/documentsStore';
import type { DocumentType } from '../../types/documentTypes';
import {
  parseFilename,
  validateRename,
  type IParsedFilename,
} from '../../utils/filenameValidation';

/**
 * Props for RenameDialog component
 */
export interface IRenameDialogProps {
  document: IDocument | IStagedDocument;
  documentType: DocumentType;
  allDocuments: IDocument[];
  stagedFiles: Array<{ name: string; documentType: DocumentType; uniqueId?: string }>;
  isOpen: boolean;
  onRename: (newName: string) => void;
  onCancel: () => void;
}

/**
 * RenameDialog Component
 */
export const RenameDialog: React.FC<IRenameDialogProps> = ({
  document,
  documentType,
  allDocuments,
  stagedFiles,
  isOpen,
  onRename,
  onCancel,
}) => {
  // Get document name (handle both IDocument and IStagedDocument)
  const documentName = React.useMemo(() => {
    if ('name' in document) {
      return document.name;
    } else if ('file' in document) {
      return document.file.name;
    }
    return '';
  }, [document]);

  // Get document uniqueId (handle both types)
  const documentId = React.useMemo(() => {
    if ('uniqueId' in document) {
      return document.uniqueId;
    } else if ('id' in document) {
      return document.id;
    }
    return '';
  }, [document]);

  // Parse current filename
  const parsed: IParsedFilename = React.useMemo(
    () => parseFilename(documentName),
    [documentName]
  );

  // State
  const [newName, setNewName] = React.useState(parsed.name);
  const [validationError, setValidationError] = React.useState<string | undefined>(undefined);
  const [isValidating, setIsValidating] = React.useState(false);

  // Reset state when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setNewName(parsed.name);
      setValidationError(undefined);
      setIsValidating(false);
    }
  }, [isOpen, parsed.name]);

  // Validate on name change (debounced)
  React.useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      setIsValidating(true);

      // Perform validation synchronously
      const validation = validateRename(
        newName.trim(),
        parsed.extension,
        documentType,
        allDocuments,
        stagedFiles,
        documentId
      );

      setValidationError(validation.error);
      setIsValidating(false);
    }, 200); // Debounce for 200ms - responsive but not too fast

    return () => clearTimeout(timer);
  }, [newName, isOpen, parsed.extension, documentType, allDocuments, stagedFiles, documentId]);

  /**
   * Handle rename button click
   */
  const handleRename = React.useCallback(() => {
    const trimmedName = newName.trim();

    // Final validation before rename
    const validation = validateRename(
      trimmedName,
      parsed.extension,
      documentType,
      allDocuments,
      stagedFiles,
      documentId
    );

    if (!validation.isValid) {
      setValidationError(validation.error);
      return;
    }

    // Call parent callback with full filename
    onRename(`${trimmedName}${parsed.extension}`);
  }, [newName, parsed.extension, documentType, allDocuments, stagedFiles, documentId, onRename]);

  /**
   * Handle Enter key press
   */
  const handleKeyPress = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !validationError && !isValidating && newName.trim().length > 0) {
        handleRename();
      }
    },
    [handleRename, validationError, isValidating, newName]
  );

  // Check if rename button should be disabled
  const isRenameDisabled =
    !newName.trim() ||
    !!validationError ||
    isValidating ||
    newName.trim() === parsed.name;

  return (
    <Dialog
      hidden={!isOpen}
      onDismiss={onCancel}
      dialogContentProps={{
        type: DialogType.normal,
        title: 'Rename Document',
        subText: 'Enter a new name for the document. The file extension cannot be changed.',
      }}
      modalProps={{
        isBlocking: true,
        styles: {
          main: {
            width: 540,
            minHeight: 320,
          },
        },
      }}
    >
      <Stack tokens={{ childrenGap: 16 }}>
        {/* Original filename info */}
        <Stack tokens={{ childrenGap: 4 }}>
          <Text variant="small" styles={{ root: { fontWeight: 600 } }}>
            Current name:
          </Text>
          <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
            {documentName}
          </Text>
        </Stack>

        {/* New name input with extension suffix */}
        <Stack tokens={{ childrenGap: 8 }}>
          <TextField
            label="New name"
            value={newName}
            onChange={(_, value) => setNewName(value || '')}
            onKeyPress={handleKeyPress}
            suffix={parsed.extension}
            errorMessage={validationError}
            description="File extension is preserved automatically"
            autoComplete="off"
            autoFocus
            styles={{
              suffix: {
                backgroundColor: '#f3f2f1',
                padding: '0 8px',
                fontFamily: 'monospace',
                fontSize: '14px',
                color: '#605e5c',
              },
              field: {
                paddingRight: 0,
              },
            }}
          />

          {/* Validation spinner - always reserve space to prevent layout shift */}
          <Stack
            horizontal
            tokens={{ childrenGap: 8 }}
            verticalAlign="center"
            styles={{
              root: {
                minHeight: 24,
                visibility: isValidating ? 'visible' : 'hidden',
              },
            }}
          >
            <Spinner size={SpinnerSize.xSmall} />
            <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
              Checking for duplicates...
            </Text>
          </Stack>
        </Stack>

        {/* Info message about duplicate checking */}
        <MessageBar messageBarType={MessageBarType.info}>
          The filename will be checked against existing documents of type: <strong>{documentType}</strong>
        </MessageBar>
      </Stack>

      <DialogFooter>
        <PrimaryButton
          text="Rename"
          onClick={handleRename}
          disabled={isRenameDisabled}
        />
        <DefaultButton text="Cancel" onClick={onCancel} />
      </DialogFooter>
    </Dialog>
  );
};

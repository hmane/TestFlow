/**
 * ReasonDialog Component
 * Dialog for capturing reason when canceling or putting requests on hold
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
  MessageBar,
  MessageBarType,
} from '@fluentui/react';

/**
 * Action type for the dialog
 */
export type ReasonDialogAction = 'cancel' | 'hold';

/**
 * Props for ReasonDialog component
 */
export interface IReasonDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;

  /** Action type - determines title and button text */
  action: ReasonDialogAction;

  /** Callback when user confirms the action */
  onConfirm: (reason: string) => void;

  /** Callback when user cancels */
  onCancel: () => void;

  /** Whether the action is in progress */
  isProcessing?: boolean;
}

/**
 * Get dialog configuration based on action type
 */
const getDialogConfig = (action: ReasonDialogAction) => {
  switch (action) {
    case 'cancel':
      return {
        title: 'Cancel Request',
        subText: 'Please provide a reason for canceling this request.',
        confirmButtonText: 'Cancel Request',
        messageText: 'This action will cancel the request. The request status will be updated to "Cancelled".',
      };
    case 'hold':
      return {
        title: 'Put Request On Hold',
        subText: 'Please provide a reason for putting this request on hold.',
        confirmButtonText: 'Put On Hold',
        messageText: 'This action will put the request on hold. You can resume it later by changing the status.',
      };
    default:
      return {
        title: '',
        subText: '',
        confirmButtonText: '',
        messageText: '',
      };
  }
};

/**
 * ReasonDialog Component
 */
export const ReasonDialog: React.FC<IReasonDialogProps> = ({
  isOpen,
  action,
  onConfirm,
  onCancel,
  isProcessing = false,
}) => {
  // State
  const [reason, setReason] = React.useState('');
  const [validationError, setValidationError] = React.useState<string | undefined>(undefined);

  // Get dialog configuration
  const config = getDialogConfig(action);

  // Reset state when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setReason('');
      setValidationError(undefined);
    }
  }, [isOpen]);

  /**
   * Validate reason input
   */
  const validateReason = React.useCallback((value: string): boolean => {
    const trimmed = value.trim();

    if (!trimmed) {
      setValidationError('Reason is required');
      return false;
    }

    if (trimmed.length < 10) {
      setValidationError('Reason must be at least 10 characters');
      return false;
    }

    if (trimmed.length > 500) {
      setValidationError('Reason must not exceed 500 characters');
      return false;
    }

    setValidationError(undefined);
    return true;
  }, []);

  /**
   * Handle reason input change
   */
  const handleReasonChange = React.useCallback(
    (_: unknown, value?: string) => {
      const newValue = value || '';
      setReason(newValue);

      // Validate on change only if there's already an error
      if (validationError && newValue.trim()) {
        validateReason(newValue);
      }
    },
    [validateReason, validationError]
  );

  /**
   * Handle confirm button click
   */
  const handleConfirm = React.useCallback(() => {
    if (!validateReason(reason)) {
      return;
    }

    onConfirm(reason.trim());
  }, [reason, validateReason, onConfirm]);

  /**
   * Handle Enter key press (Shift+Enter for new line)
   */
  const handleKeyPress = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (reason.trim() && !validationError && !isProcessing) {
          handleConfirm();
        }
      }
    },
    [handleConfirm, validationError, isProcessing, reason]
  );

  // Check if confirm button should be disabled
  const isConfirmDisabled = !reason.trim() || !!validationError || isProcessing;

  return (
    <Dialog
      hidden={!isOpen}
      onDismiss={onCancel}
      dialogContentProps={{
        type: DialogType.normal,
        title: config.title,
        subText: config.subText,
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
        {/* Info message about the action */}
        <MessageBar messageBarType={MessageBarType.warning}>
          {config.messageText}
        </MessageBar>

        {/* Reason input */}
        <TextField
          label="Reason"
          placeholder="Enter the reason for this action..."
          value={reason}
          onChange={handleReasonChange}
          onKeyPress={handleKeyPress}
          multiline
          rows={6}
          errorMessage={validationError}
          required
          autoFocus
          disabled={isProcessing}
          description={`${reason.length}/500 characters`}
          styles={{
            field: {
              resize: 'vertical',
              minHeight: '120px',
              maxHeight: '240px',
            },
          }}
        />
      </Stack>

      <DialogFooter>
        <PrimaryButton
          text={config.confirmButtonText}
          onClick={handleConfirm}
          disabled={isConfirmDisabled}
          styles={{
            root: {
              backgroundColor: action === 'cancel' ? '#a80000' : undefined,
              borderColor: action === 'cancel' ? '#a80000' : undefined,
            },
            rootHovered: {
              backgroundColor: action === 'cancel' ? '#8a0000' : undefined,
              borderColor: action === 'cancel' ? '#8a0000' : undefined,
            },
          }}
        />
        <DefaultButton text="Cancel" onClick={onCancel} disabled={isProcessing} />
      </DialogFooter>
    </Dialog>
  );
};

export default ReasonDialog;

/**
 * RequestActions Component
 *
 * Simple action buttons container at the bottom of forms.
 * Displays Submit Request, Save as Draft, and Close buttons aligned to the right.
 *
 * Features:
 * - Primary actions (Submit, Save as Draft)
 * - Navigation (Close)
 * - Context-aware based on request status
 */

import {
  DefaultButton,
  Dialog,
  DialogFooter,
  DialogType,
  PrimaryButton,
  Stack,
} from '@fluentui/react';
import * as React from 'react';
import { SPContext } from 'spfx-toolkit';
import { useRequestFormContext } from '../../../../contexts/RequestFormContext';
import { RequestStatus } from '../../../../types/workflowTypes';
import './RequestActions.scss';

/**
 * Props for RequestActions component
 */
export interface IRequestActionsProps {
  submitButtonText?: string;
  submitButtonIcon?: string;
  hideSubmit?: boolean;
  hideSaveDraft?: boolean;
}

/**
 * RequestActions Component
 */
export const RequestActions: React.FC<IRequestActionsProps> = ({
  submitButtonText = 'Submit Request',
  submitButtonIcon = 'Send',
  hideSubmit = false,
  hideSaveDraft = false,
}) => {
  const {
    handleSubmit,
    onSubmit: onSubmitFromContext,
    onSaveDraft,
    onPutOnHold,
    onCancelRequest,
    onClose,
    isDirty,
    isLoading,
    status,
    itemId,
  } = useRequestFormContext();

  // Unsaved changes dialog state
  const [showUnsavedDialog, setShowUnsavedDialog] = React.useState<boolean>(false);
  const [pendingNavigation, setPendingNavigation] = React.useState<(() => void) | null>(null);

  /**
   * Handle submit action
   */
  const handleSubmitClick = React.useCallback(async (): Promise<void> => {
    if (onSubmitFromContext) {
      try {
        SPContext.logger.info('RequestActions: Submitting request');
        await handleSubmit(onSubmitFromContext)();
        SPContext.logger.success('RequestActions: Request submitted successfully');
      } catch (error: unknown) {
        SPContext.logger.error('RequestActions: Submit failed', error);
      }
    }
  }, [handleSubmit, onSubmitFromContext]);

  /**
   * Handle save as draft
   */
  const handleSaveDraft = React.useCallback(async (): Promise<void> => {
    if (onSaveDraft) {
      try {
        SPContext.logger.info('RequestActions: Saving draft');
        await onSaveDraft();
        SPContext.logger.success('RequestActions: Draft saved successfully');
      } catch (error: unknown) {
        SPContext.logger.error('RequestActions: Save draft failed', error);
      }
    }
  }, [onSaveDraft]);

  /**
   * Handle close - with unsaved changes check
   */
  const handleClose = React.useCallback((): void => {
    const navigationAction = () => {
      if (onClose) {
        onClose();
      } else {
        // Default close behavior
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.close();
        }
      }
    };

    // Check for unsaved changes
    if (isDirty) {
      setPendingNavigation(() => navigationAction);
      setShowUnsavedDialog(true);
    } else {
      navigationAction();
    }
  }, [onClose, isDirty]);

  /**
   * Handle unsaved dialog confirmation
   */
  const handleUnsavedConfirm = React.useCallback((): void => {
    setShowUnsavedDialog(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  }, [pendingNavigation]);

  /**
   * Handle unsaved dialog cancel
   */
  const handleUnsavedCancel = React.useCallback((): void => {
    setShowUnsavedDialog(false);
    setPendingNavigation(null);
  }, []);

  /**
   * Handle cancel request
   */
  const handleCancelRequest = React.useCallback(async (): Promise<void> => {
    if (onCancelRequest) {
      try {
        SPContext.logger.info('RequestActions: Cancelling request');
        await onCancelRequest();
        SPContext.logger.success('RequestActions: Request cancelled successfully');
      } catch (error: unknown) {
        SPContext.logger.error('RequestActions: Cancel request failed', error);
      }
    }
  }, [onCancelRequest]);

  /**
   * Handle put on hold
   */
  const handlePutOnHold = React.useCallback(async (): Promise<void> => {
    if (onPutOnHold) {
      try {
        SPContext.logger.info('RequestActions: Putting request on hold');
        await onPutOnHold();
        SPContext.logger.success('RequestActions: Request put on hold successfully');
      } catch (error: unknown) {
        SPContext.logger.error('RequestActions: Put on hold failed', error);
      }
    }
  }, [onPutOnHold]);

  /**
   * Determine button visibility based on status
   */
  const showSubmit = React.useMemo(() => {
    if (hideSubmit) return false;
    // Submit only available for Draft status or new requests
    return !status || status === RequestStatus.Draft;
  }, [hideSubmit, status]);

  const showSave = React.useMemo(() => {
    if (hideSaveDraft) return false;
    // Save always available
    return true;
  }, [hideSaveDraft]);

  const showCancel = React.useMemo(() => {
    // Cancel available when status >= Draft and < Closeout
    if (!status || !itemId) return false;
    const statusOrder = [
      RequestStatus.Draft,
      RequestStatus.LegalIntake,
      RequestStatus.InReview,
      RequestStatus.Closeout,
      RequestStatus.Completed,
      RequestStatus.Cancelled,
      RequestStatus.OnHold,
    ];
    const currentIndex = statusOrder.indexOf(status);
    const closeoutIndex = statusOrder.indexOf(RequestStatus.Closeout);
    return currentIndex >= 0 && currentIndex < closeoutIndex;
  }, [status, itemId]);

  const showOnHold = React.useMemo(() => {
    // On Hold available when status >= Draft and < Closeout
    return showCancel && status !== RequestStatus.OnHold;
  }, [showCancel, status]);

  return (
    <Stack tokens={{ childrenGap: 24 }} styles={{ root: { padding: '24px', width: '100%', margin: '0' } }}>
      <div className='request-actions__container' style={{ padding: '24px' }}>
        <Stack horizontal tokens={{ childrenGap: 12 }} horizontalAlign='end' wrap>
          {showSubmit && (
            <PrimaryButton
              text={submitButtonText}
              iconProps={{ iconName: submitButtonIcon }}
              onClick={handleSubmitClick}
              disabled={isLoading}
              ariaLabel={submitButtonText}
              styles={{
                root: {
                  minWidth: '160px',
                  height: '44px',
                  borderRadius: '4px',
                },
              }}
            />
          )}
          {showSave && (
            <DefaultButton
              text='Save as Draft'
              iconProps={{ iconName: 'Save' }}
              onClick={handleSaveDraft}
              disabled={isLoading}
              ariaLabel='Save request as draft'
              styles={{
                root: {
                  minWidth: '140px',
                  height: '44px',
                  borderRadius: '4px',
                },
              }}
            />
          )}
          {showOnHold && (
            <DefaultButton
              text='Put On Hold'
              iconProps={{ iconName: 'Pause' }}
              onClick={handlePutOnHold}
              disabled={isLoading}
              ariaLabel='Put request on hold'
              styles={{
                root: {
                  minWidth: '140px',
                  height: '44px',
                  borderRadius: '4px',
                },
              }}
            />
          )}
          {showCancel && (
            <DefaultButton
              text='Cancel Request'
              iconProps={{ iconName: 'StatusErrorFull' }}
              onClick={handleCancelRequest}
              disabled={isLoading}
              ariaLabel='Cancel this request'
              styles={{
                root: {
                  minWidth: '140px',
                  height: '44px',
                  borderRadius: '4px',
                  color: '#a80000',
                },
              }}
            />
          )}
          <DefaultButton
            text='Close'
            iconProps={{ iconName: 'ChromeClose' }}
            onClick={handleClose}
            disabled={isLoading}
            ariaLabel='Close form and return'
            styles={{
              root: {
                minWidth: '120px',
                height: '44px',
                borderRadius: '4px',
              },
            }}
          />
        </Stack>

        {/* Unsaved Changes Dialog */}
        <Dialog
          hidden={!showUnsavedDialog}
          onDismiss={handleUnsavedCancel}
          dialogContentProps={{
            type: DialogType.normal,
            title: 'Unsaved Changes',
            subText: 'You have unsaved changes. Are you sure you want to leave without saving?',
          }}
          modalProps={{
            isBlocking: true,
            styles: { main: { maxWidth: 450 } },
          }}
        >
          <DialogFooter>
            <PrimaryButton onClick={handleUnsavedConfirm} text='Leave without saving' />
            <DefaultButton onClick={handleUnsavedCancel} text='Stay on page' />
          </DialogFooter>
        </Dialog>
      </div>
    </Stack>
  );
};

export default RequestActions;

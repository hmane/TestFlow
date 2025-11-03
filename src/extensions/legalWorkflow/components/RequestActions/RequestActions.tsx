/**
 * RequestActions Component
 *
 * Action buttons container at the bottom of forms with enhanced UX.
 * Features left/right button grouping, per-action loading states, and confirmation dialogs.
 *
 * Features:
 * - Primary actions (Submit, Save as Draft) on the right
 * - Less frequent actions (Cancel, Put On Hold) on the left
 * - Visual progress indicators during actions
 * - Confirmation dialogs with reason capture
 * - All buttons disabled during any action
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
import { ReasonDialog, type ReasonDialogAction } from '../../../../components/ReasonDialog/ReasonDialog';
import { LoadingOverlay } from '../../../../components/LoadingOverlay/LoadingOverlay';
import './RequestActions.scss';

/**
 * Active action type
 */
type ActiveAction = 'submit' | 'save' | 'cancel' | 'hold' | null;

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

  // Action state management
  const [activeAction, setActiveAction] = React.useState<ActiveAction>(null);
  const [showReasonDialog, setShowReasonDialog] = React.useState<boolean>(false);
  const [reasonDialogAction, setReasonDialogAction] = React.useState<ReasonDialogAction>('cancel');

  // Unsaved changes dialog state
  const [showUnsavedDialog, setShowUnsavedDialog] = React.useState<boolean>(false);
  const [pendingNavigation, setPendingNavigation] = React.useState<(() => void) | null>(null);

  // Check if any action is in progress
  const isAnyActionInProgress = React.useMemo(() => {
    return activeAction !== null || isLoading;
  }, [activeAction, isLoading]);

  /**
   * Handle submit action
   */
  const handleSubmitClick = React.useCallback(async (): Promise<void> => {
    if (onSubmitFromContext) {
      try {
        setActiveAction('submit');
        SPContext.logger.info('RequestActions: Submitting request');
        await handleSubmit(onSubmitFromContext)();
        SPContext.logger.success('RequestActions: Request submitted successfully');
      } catch (error: unknown) {
        SPContext.logger.error('RequestActions: Submit failed', error);
      } finally {
        setActiveAction(null);
      }
    }
  }, [handleSubmit, onSubmitFromContext]);

  /**
   * Handle save as draft
   */
  const handleSaveDraft = React.useCallback(async (): Promise<void> => {
    if (onSaveDraft) {
      try {
        setActiveAction('save');
        SPContext.logger.info('RequestActions: Saving draft');
        await onSaveDraft();
        SPContext.logger.success('RequestActions: Draft saved successfully');
      } catch (error: unknown) {
        SPContext.logger.error('RequestActions: Save draft failed', error);
      } finally {
        setActiveAction(null);
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
   * Show cancel request dialog
   */
  const handleCancelRequestClick = React.useCallback((): void => {
    setReasonDialogAction('cancel');
    setShowReasonDialog(true);
  }, []);

  /**
   * Show put on hold dialog
   */
  const handlePutOnHoldClick = React.useCallback((): void => {
    setReasonDialogAction('hold');
    setShowReasonDialog(true);
  }, []);

  /**
   * Handle reason dialog confirmation
   */
  const handleReasonConfirm = React.useCallback(
    async (reason: string): Promise<void> => {
      setShowReasonDialog(false);

      if (reasonDialogAction === 'cancel' && onCancelRequest) {
        try {
          setActiveAction('cancel');
          SPContext.logger.info('RequestActions: Cancelling request', { reason });
          await onCancelRequest(reason);
          SPContext.logger.success('RequestActions: Request cancelled successfully');
        } catch (error: unknown) {
          SPContext.logger.error('RequestActions: Cancel request failed', error);
        } finally {
          setActiveAction(null);
        }
      } else if (reasonDialogAction === 'hold' && onPutOnHold) {
        try {
          setActiveAction('hold');
          SPContext.logger.info('RequestActions: Putting request on hold', { reason });
          await onPutOnHold(reason);
          SPContext.logger.success('RequestActions: Request put on hold successfully');
        } catch (error: unknown) {
          SPContext.logger.error('RequestActions: Put on hold failed', error);
        } finally {
          setActiveAction(null);
        }
      }
    },
    [reasonDialogAction, onCancelRequest, onPutOnHold]
  );

  /**
   * Handle reason dialog cancel
   */
  const handleReasonCancel = React.useCallback((): void => {
    setShowReasonDialog(false);
  }, []);

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

  // Get loading message based on active action
  const loadingMessage = React.useMemo(() => {
    switch (activeAction) {
      case 'submit':
        return 'Submitting request...';
      case 'save':
        return 'Saving as draft...';
      case 'cancel':
        return 'Canceling request...';
      case 'hold':
        return 'Putting request on hold...';
      default:
        return 'Processing...';
    }
  }, [activeAction]);

  return (
    <Stack tokens={{ childrenGap: 24 }} styles={{ root: { padding: '24px', width: '100%', margin: '0' } }}>
      <div className='request-actions__container' style={{ padding: '24px' }}>
        {/* Two-section layout: Left (less frequent) and Right (primary actions) */}
        <Stack horizontal horizontalAlign='space-between' wrap styles={{ root: { width: '100%' } }}>
          {/* Left Section: Less frequent actions */}
          <Stack horizontal tokens={{ childrenGap: 12 }} wrap>
            {showCancel && (
              <DefaultButton
                text='Cancel Request'
                iconProps={{ iconName: 'StatusErrorFull' }}
                onClick={handleCancelRequestClick}
                disabled={isAnyActionInProgress}
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
            {showOnHold && (
              <DefaultButton
                text='Put On Hold'
                iconProps={{ iconName: 'Pause' }}
                onClick={handlePutOnHoldClick}
                disabled={isAnyActionInProgress}
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
          </Stack>

          {/* Right Section: Primary actions */}
          <Stack horizontal tokens={{ childrenGap: 12 }} wrap>
            {showSubmit && (
              <PrimaryButton
                text={submitButtonText}
                iconProps={{ iconName: submitButtonIcon }}
                onClick={handleSubmitClick}
                disabled={isAnyActionInProgress}
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
                disabled={isAnyActionInProgress}
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
            <DefaultButton
              text='Close'
              iconProps={{ iconName: 'ChromeClose' }}
              onClick={handleClose}
              disabled={isAnyActionInProgress}
              ariaLabel='Close form and return'
              styles={{
                root: {
                  minWidth: '120px',
                  height: '44px',
                  borderRadius: '4px',
                  marginLeft: '24px', // Extra spacing before Close button
                },
              }}
            />
          </Stack>
        </Stack>

        {/* Loading Overlay - shown during any action */}
        {isAnyActionInProgress && (
          <LoadingOverlay
            message={loadingMessage}
            fullPage={true}
            blurBackdrop={true}
            spinnerSize={2} // SpinnerSize.large
          />
        )}

        {/* Reason Dialog - for Cancel and Put On Hold */}
        <ReasonDialog
          isOpen={showReasonDialog}
          action={reasonDialogAction}
          onConfirm={handleReasonConfirm}
          onCancel={handleReasonCancel}
          isProcessing={isAnyActionInProgress}
        />

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

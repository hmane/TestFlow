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
 * - Permission-based button visibility (only shows actions user can perform)
 */

import * as React from 'react';

// Fluent UI - tree-shaken imports
import { DefaultButton, IconButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { Dialog, DialogFooter, DialogType } from '@fluentui/react/lib/Dialog';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Stack } from '@fluentui/react/lib/Stack';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';

// spfx-toolkit - tree-shaken imports
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

// App imports using path aliases
import { LoadingOverlay } from '@components/LoadingOverlay/LoadingOverlay';
import { ReasonDialog } from '@components/ReasonDialog/ReasonDialog';
import { LoadingFallback } from '@components/LoadingFallback/LoadingFallback';
import { RequestStatus } from '@appTypes/workflowTypes';

import type { IRequestActionsProps } from './types';
import { useRequestActionsState } from './hooks';
import './RequestActions.scss';

// Lazy load SuperAdminPanel - only used by admins and shown on button click
const SuperAdminPanel = React.lazy(
  () => import('@components/SuperAdminPanel').then(m => ({ default: m.SuperAdminPanel }))
);

/**
 * RequestActions Component
 */
export const RequestActions: React.FC<IRequestActionsProps> = ({
  submitButtonText = 'Submit Request',
  submitButtonIcon = 'Send',
  hideSubmit = false,
  hideSaveDraft = false,
}) => {
  const state = useRequestActionsState({
    hideSubmit,
    hideSaveDraft,
  });

  const {
    // Context values
    status,
    isNewRequest,
    permissions,

    // State
    showReasonDialog,
    reasonDialogAction,
    showUnsavedDialog,
    showSuperAdminPanel,
    setShowSuperAdminPanel,

    // Refs
    errorContainerRef,

    // Derived values
    sortedValidationErrors,
    isAnyActionInProgress,
    loadingMessage,

    // Button visibility
    showSubmitRequest,
    showSaveAsDraft,
    showSave,
    showCancel,
    showOnHold,
    showResume,
    showAssignAttorney,
    showSendToCommittee,
    showCloseoutSubmit,
    showCompleteForesideDocuments,

    // Handlers
    getFieldLabel,
    scrollToField,
    handleSubmitClick,
    handleSaveDraft,
    handleClose,
    handleUnsavedConfirm,
    handleUnsavedCancel,
    handleCancelRequestClick,
    handlePutOnHoldClick,
    handleResumeClick,
    handleSendToCommitteeClick,
    handleAssignAttorneyClick,
    handleCloseoutClick,
    handleCompleteForesideDocumentsClick,
    handleReasonConfirm,
    handleReasonCancel,
  } = state;

  return (
    <Stack
      tokens={{ childrenGap: 16 }}
      styles={{ root: { padding: '24px', width: '100%', margin: '0' } }}
    >
      {/* Validation Errors Summary - displayed above action buttons (no dismiss button) */}
      {sortedValidationErrors && sortedValidationErrors.length > 0 && (
        <div
          ref={errorContainerRef}
          tabIndex={-1}
          role='alert'
          aria-live='assertive'
          style={{ outline: 'none' }}
        >
          <MessageBar
            messageBarType={MessageBarType.error}
            isMultiline={true}
            styles={{
              root: {
                marginBottom: '8px',
                borderRadius: '4px',
              },
            }}
          >
            <Stack tokens={{ childrenGap: 4 }}>
              <span style={{ fontWeight: 600 }}>
                Please fix the following errors before continuing:
              </span>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                {sortedValidationErrors.map((error, index) => (
                  <li key={`error-${index}`} style={{ marginBottom: '4px' }}>
                    <button
                      type='button'
                      onClick={() => scrollToField(error.field)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        margin: 0,
                        font: 'inherit',
                        fontWeight: 600,
                        color: '#0078d4',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                      aria-label={`Go to ${getFieldLabel(error.field)} field`}
                    >
                      {getFieldLabel(error.field)}
                    </button>
                    : {error.message}
                  </li>
                ))}
              </ul>
            </Stack>
          </MessageBar>
        </div>
      )}

      <div className='request-actions__container'>
        {/* Two-section layout: Left (less frequent) and Right (primary actions) */}
        <div className='request-actions__button-groups'>
          {/* Left Section: Less frequent actions */}
          <div className='request-actions__button-group request-actions__button-group--left'>
            {/* Super Admin Mode Button - Only visible to admins, not on new/draft requests */}
            {permissions.isAdmin && !isNewRequest && status !== RequestStatus.Draft && (
              <TooltipHost content="Administrative Override Mode">
                <IconButton
                  iconProps={{ iconName: 'Settings' }}
                  onClick={() => setShowSuperAdminPanel(true)}
                  disabled={isAnyActionInProgress}
                  ariaLabel="Open Admin Override Panel"
                  className="super-admin-trigger"
                />
              </TooltipHost>
            )}
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
            {showResume && (
              <DefaultButton
                text='Resume'
                iconProps={{ iconName: 'Play' }}
                onClick={handleResumeClick}
                disabled={isAnyActionInProgress}
                ariaLabel='Resume request from hold'
                styles={{
                  root: {
                    minWidth: '140px',
                    height: '44px',
                    borderRadius: '4px',
                    color: '#107c10',
                  },
                }}
              />
            )}
          </div>

          {/* Right Section: Primary actions */}
          <div className='request-actions__button-group request-actions__button-group--right'>
            {/* Save button - for submitted requests with changes */}
            {showSave && (
              <DefaultButton
                text='Save'
                iconProps={{ iconName: 'Save' }}
                onClick={handleSaveDraft}
                disabled={isAnyActionInProgress}
                ariaLabel='Save changes'
                styles={{
                  root: {
                    minWidth: '120px',
                    height: '44px',
                    borderRadius: '4px',
                  },
                }}
              />
            )}

            {/* Submit to Assign Attorney button - Legal Intake only */}
            {showSendToCommittee && (
              <DefaultButton
                text='Submit to Assign Attorney'
                iconProps={{ iconName: 'Group' }}
                onClick={handleSendToCommitteeClick}
                disabled={isAnyActionInProgress}
                ariaLabel='Submit to committee for attorney assignment'
                styles={{
                  root: {
                    minWidth: '180px',
                    height: '44px',
                    borderRadius: '4px',
                  },
                }}
              />
            )}

            {/* Assign Attorney button - Legal Intake and Assign Attorney status */}
            {showAssignAttorney && (
              <PrimaryButton
                text='Assign Attorney'
                iconProps={{ iconName: 'UserFollowed' }}
                onClick={handleAssignAttorneyClick}
                disabled={isAnyActionInProgress}
                ariaLabel='Assign attorney to this request'
                styles={{
                  root: {
                    minWidth: '160px',
                    height: '44px',
                    borderRadius: '4px',
                  },
                }}
              />
            )}

            {/* Closeout Submit button - Closeout status only */}
            {showCloseoutSubmit && (
              <PrimaryButton
                text='Complete Closeout'
                iconProps={{ iconName: 'Completed' }}
                onClick={handleCloseoutClick}
                disabled={isAnyActionInProgress}
                ariaLabel='Complete the closeout process'
                styles={{
                  root: {
                    minWidth: '160px',
                    height: '44px',
                    borderRadius: '4px',
                  },
                }}
              />
            )}

            {/* Complete Request button - AwaitingForesideDocuments status only */}
            {showCompleteForesideDocuments && (
              <PrimaryButton
                text='Complete Request'
                iconProps={{ iconName: 'Completed' }}
                onClick={handleCompleteForesideDocumentsClick}
                disabled={isAnyActionInProgress}
                ariaLabel='Complete the request after Foreside documents are uploaded'
                styles={{
                  root: {
                    minWidth: '160px',
                    height: '44px',
                    borderRadius: '4px',
                  },
                }}
              />
            )}

            {/* Submit Request button - Draft/New only */}
            {showSubmitRequest && (
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

            {/* Save as Draft button - Draft/New only */}
            {showSaveAsDraft && (
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

            {/* Close button - Always visible */}
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
                  marginLeft: '12px',
                },
              }}
            />
          </div>
        </div>

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

        {/* Super Admin Panel - Administrative Override Mode (not on new/draft requests) */}
        {permissions.isAdmin && !isNewRequest && status !== RequestStatus.Draft && showSuperAdminPanel && (
          <React.Suspense fallback={<LoadingFallback />}>
            <SuperAdminPanel
              isOpen={showSuperAdminPanel}
              onDismiss={() => setShowSuperAdminPanel(false)}
              onActionComplete={(action, success) => {
                if (success) {
                  SPContext.logger.info('Super Admin action completed', { action });
                }
              }}
            />
          </React.Suspense>
        )}

      </div>
    </Stack>
  );
};

export default RequestActions;

// Re-export types for convenience
export type { IRequestActionsProps } from './types';

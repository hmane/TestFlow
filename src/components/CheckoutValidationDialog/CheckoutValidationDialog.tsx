/**
 * CheckoutValidationDialog
 *
 * Safety-net dialog shown when a reviewer attempts to submit a review
 * while documents are still marked as "reviewing" (checked out).
 *
 * Two modes:
 * - Mid-workflow: blocks for current user's files (with "Done Reviewing & Complete" CTA),
 *   info-only for others' files (non-blocking, user can proceed)
 * - Final transition: blocks for ANY checked-out files. Current user can resolve their own;
 *   others' files show contact info. Admin can force-resolve all.
 */

import * as React from 'react';
import { Dialog, DialogType, DialogFooter } from '@fluentui/react/lib/Dialog';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { Icon } from '@fluentui/react/lib/Icon';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';

import type { ICheckoutValidationResult, IDocumentCheckoutStatus } from '@services/documentCheckoutService';

/**
 * Props for CheckoutValidationDialog
 */
export interface ICheckoutValidationDialogProps {
  /** Whether the dialog is visible */
  isOpen: boolean;
  /** Validation result from validateCheckoutForTransition */
  validation: ICheckoutValidationResult;
  /** Whether the current user is an admin (can force-resolve others' files) */
  isAdmin?: boolean;
  /** Callback to resolve current user's files and submit */
  onDoneReviewingAndSubmit: () => void;
  /** Callback to force-resolve all files and submit (admin only) */
  onForceResolveAndSubmit?: () => void;
  /** Callback to proceed without resolving (mid-workflow, others' files only) */
  onProceed?: () => void;
  /** Callback to close dialog without action */
  onGoBack: () => void;
  /** Whether an action is in progress */
  isProcessing?: boolean;
}

/**
 * Render a file list item for the dialog
 */
function FileListItem({ file }: { file: IDocumentCheckoutStatus }): React.ReactElement {
  return (
    <Stack
      horizontal
      verticalAlign="center"
      tokens={{ childrenGap: 8 }}
      styles={{
        root: {
          padding: '6px 8px',
          borderRadius: '3px',
          backgroundColor: '#faf9f8',
        },
      }}
    >
      <Icon iconName="Lock" styles={{ root: { color: '#0078d4', fontSize: 14 } }} />
      <Text styles={{ root: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }}>
        {file.document.name}
      </Text>
      {file.checkedOutByName && !file.isCheckedOutByMe && (
        <Text variant="small" styles={{ root: { color: '#605e5c', flexShrink: 0 } }}>
          &mdash; {file.checkedOutByName}
        </Text>
      )}
    </Stack>
  );
}

export const CheckoutValidationDialog: React.FC<ICheckoutValidationDialogProps> = ({
  isOpen,
  validation,
  isAdmin,
  onDoneReviewingAndSubmit,
  onForceResolveAndSubmit,
  onProceed,
  onGoBack,
  isProcessing,
}) => {
  const {
    isFinalTransition,
    currentUserBlocked,
    othersHaveCheckouts,
    myFiles,
    othersFiles,
  } = validation;

  // Deduplicate other users' names for the info display
  const otherUserNames = React.useMemo(() => {
    const names: string[] = [];
    for (let i = 0; i < othersFiles.length; i++) {
      const name = othersFiles[i].checkedOutByName || 'another user';
      if (names.indexOf(name) === -1) {
        names.push(name);
      }
    }
    return names;
  }, [othersFiles]);

  // Determine dialog title
  const title = 'Complete Review';

  // Mid-workflow: current user blocked → show files + "Done Reviewing & Complete"
  // Mid-workflow: only others → info bar + "Complete Review" proceed
  // Final: any checkout → blocking, show sections
  const showMyFilesSection = currentUserBlocked && myFiles.length > 0;
  const showOthersSection = othersHaveCheckouts && othersFiles.length > 0;

  // Can the user proceed? (mid-workflow with only others' files)
  const canProceedWithOthers = !isFinalTransition && !currentUserBlocked && othersHaveCheckouts;

  return (
    <Dialog
      hidden={!isOpen}
      onDismiss={onGoBack}
      dialogContentProps={{
        type: DialogType.normal,
        title,
        showCloseButton: true,
      }}
      modalProps={{
        isBlocking: true,
        styles: { main: { maxWidth: 520 } },
      }}
    >
      <Stack tokens={{ childrenGap: 16 }}>
        {/* Final transition header message */}
        {isFinalTransition && (
          <MessageBar messageBarType={MessageBarType.blocked} isMultiline={false}>
            All files must be done reviewing before closing this request.
          </MessageBar>
        )}

        {/* Current user's files section */}
        {showMyFilesSection && (
          <Stack tokens={{ childrenGap: 8 }}>
            <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
              {isFinalTransition ? 'Your files:' : "You're still reviewing these files:"}
            </Text>
            <Stack tokens={{ childrenGap: 4 }}>
              {myFiles.map((file) => (
                <FileListItem key={file.document.uniqueId || file.document.name} file={file} />
              ))}
            </Stack>
          </Stack>
        )}

        {/* Others' files section */}
        {showOthersSection && (
          <Stack tokens={{ childrenGap: 8 }}>
            {isFinalTransition ? (
              <>
                <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
                  Other reviewers:
                </Text>
                <Stack tokens={{ childrenGap: 4 }}>
                  {othersFiles.map((file) => (
                    <Stack
                      key={file.document.uniqueId || file.document.name}
                      tokens={{ childrenGap: 4 }}
                      styles={{
                        root: {
                          padding: '6px 8px',
                          borderRadius: '3px',
                          backgroundColor: '#fff4ce',
                        },
                      }}
                    >
                      <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
                        <Icon iconName="Lock" styles={{ root: { color: '#ffaa44', fontSize: 14 } }} />
                        <Text>{file.document.name}</Text>
                        <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
                          &mdash; {file.checkedOutByName || 'another user'}
                        </Text>
                      </Stack>
                      {file.checkedOutByEmail && (
                        <Text variant="small" styles={{ root: { color: '#605e5c', paddingLeft: 22 } }}>
                          Contact {file.checkedOutByEmail}
                        </Text>
                      )}
                    </Stack>
                  ))}
                </Stack>
              </>
            ) : (
              <MessageBar messageBarType={MessageBarType.info} isMultiline={false}>
                {othersFiles.length} file{othersFiles.length !== 1 ? 's are' : ' is'} being reviewed by {otherUserNames.join(', ')}.
              </MessageBar>
            )}
          </Stack>
        )}
      </Stack>

      <DialogFooter>
        <Stack horizontal tokens={{ childrenGap: 8 }} horizontalAlign="end">
          {/* Mid-workflow: current user blocked → "Done Reviewing & Complete" */}
          {currentUserBlocked && !isFinalTransition && (
            <PrimaryButton
              text={isProcessing ? 'Completing...' : 'Done Reviewing & Complete'}
              onClick={onDoneReviewingAndSubmit}
              disabled={isProcessing}
            >
              {isProcessing && (
                <Spinner size={SpinnerSize.xSmall} styles={{ root: { marginRight: 8 } }} />
              )}
            </PrimaryButton>
          )}

          {/* Final transition: current user has files → "Done Reviewing All Mine" + submit if no others */}
          {currentUserBlocked && isFinalTransition && (
            <PrimaryButton
              text={isProcessing ? 'Completing...' : (othersHaveCheckouts ? 'Done Reviewing All Mine' : 'Done Reviewing & Complete')}
              onClick={onDoneReviewingAndSubmit}
              disabled={isProcessing}
            >
              {isProcessing && (
                <Spinner size={SpinnerSize.xSmall} styles={{ root: { marginRight: 8 } }} />
              )}
            </PrimaryButton>
          )}

          {/* Final transition: admin force resolve all */}
          {isFinalTransition && othersHaveCheckouts && isAdmin && onForceResolveAndSubmit && (
            <PrimaryButton
              text={isProcessing ? 'Forcing...' : 'Force Done Reviewing All'}
              onClick={onForceResolveAndSubmit}
              disabled={isProcessing}
              styles={{
                root: { backgroundColor: '#d83b01', borderColor: '#d83b01' },
                rootHovered: { backgroundColor: '#c43501' },
              }}
            >
              {isProcessing && (
                <Spinner size={SpinnerSize.xSmall} styles={{ root: { marginRight: 8 } }} />
              )}
            </PrimaryButton>
          )}

          {/* Mid-workflow: only others → "Complete Review" proceed */}
          {canProceedWithOthers && onProceed && (
            <PrimaryButton
              text="Complete Review"
              onClick={onProceed}
              disabled={isProcessing}
            />
          )}

          <DefaultButton
            text="Go Back"
            onClick={onGoBack}
            disabled={isProcessing}
          />
        </Stack>
      </DialogFooter>
    </Dialog>
  );
};

export default CheckoutValidationDialog;

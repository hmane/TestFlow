/**
 * CloseoutForm Component
 *
 * Simple card for entering closeout information (Tracking ID and Final Notes).
 * Used when request status is "Closeout".
 *
 * When a review outcome is "Approved with Comments", displays the review comments
 * and requires the user to acknowledge them before completing closeout.
 *
 * Note: Request Summary and Review Results are shown in separate cards.
 * The Complete Closeout action is handled by RequestActions component.
 */

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';

// Fluent UI - tree-shaken imports
import { Stack } from '@fluentui/react/lib/Stack';
import { Checkbox } from '@fluentui/react/lib/Checkbox';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Text } from '@fluentui/react/lib/Text';
import { Icon } from '@fluentui/react/lib/Icon';
import { Separator } from '@fluentui/react/lib/Separator';

// spfx-toolkit - tree-shaken imports
import { Card, Header, Content } from 'spfx-toolkit/lib/components/Card';
import {
  FormContainer,
  FormItem,
  FormLabel,
  FormProvider,
} from 'spfx-toolkit/lib/components/spForm';
import {
  SPTextField,
  SPTextFieldMode,
} from 'spfx-toolkit/lib/components/spFields';

// App imports using path aliases
import { WorkflowCardHeader } from '@components/WorkflowCardHeader';
import { useRequestStore } from '@stores/requestStore';
import { useCloseoutStore } from '@stores/closeoutStore';
import { ReviewAudience, ReviewOutcome } from '@appTypes/index';

/**
 * CloseoutForm props
 */
interface ICloseoutFormProps {
  /** Make the entire form collapsible */
  collapsible?: boolean;
  /** Start collapsed (only applies if collapsible is true) */
  defaultCollapsed?: boolean;
  /** Read-only mode (for Completed status) */
  readOnly?: boolean;
}

/**
 * Closeout form data
 */
interface ICloseoutFormData {
  trackingId?: string;
  closeoutNotes?: string;
}

/**
 * Review comments info for acknowledgment
 */
interface IReviewCommentsInfo {
  hasCommentsToAcknowledge: boolean;
  legalHasComments: boolean;
  legalNotes?: string;
  legalCompletedBy?: string;
  complianceHasComments: boolean;
  complianceNotes?: string;
  complianceCompletedBy?: string;
}

/**
 * CloseoutForm Component
 */
export const CloseoutForm: React.FC<ICloseoutFormProps> = ({
  defaultCollapsed = false,
  readOnly = false,
}) => {
  const { currentRequest, itemId } = useRequestStore();
  const { setCloseoutValues, commentsAcknowledged, setCommentsAcknowledged } = useCloseoutStore();

  // React Hook Form setup
  const { control, watch } = useForm<ICloseoutFormData>({
    defaultValues: {
      trackingId: currentRequest?.trackingId || '',
      closeoutNotes: '',
    },
    mode: 'onChange',
  });

  // Watch form values and sync to store
  const trackingIdValue = watch('trackingId');
  const closeoutNotesValue = watch('closeoutNotes');

  // Sync form values to closeout store
  React.useEffect(() => {
    setCloseoutValues({
      trackingId: trackingIdValue,
      closeoutNotes: closeoutNotesValue,
      commentsAcknowledged,
    });
  }, [trackingIdValue, closeoutNotesValue, commentsAcknowledged, setCloseoutValues]);

  if (!currentRequest) {
    return null;
  }

  // Determine if there are "Approved with Comments" outcomes that need acknowledgment
  const getReviewCommentsInfo = (): IReviewCommentsInfo => {
    const legalHasComments = currentRequest.legalReviewOutcome === ReviewOutcome.ApprovedWithComments;
    const complianceHasComments = currentRequest.complianceReviewOutcome === ReviewOutcome.ApprovedWithComments;

    return {
      hasCommentsToAcknowledge: legalHasComments || complianceHasComments,
      legalHasComments,
      legalNotes: legalHasComments ? currentRequest.legalReviewNotes : undefined,
      legalCompletedBy: legalHasComments ? currentRequest.legalReviewCompletedBy?.title : undefined,
      complianceHasComments,
      complianceNotes: complianceHasComments ? currentRequest.complianceReviewNotes : undefined,
      complianceCompletedBy: complianceHasComments ? currentRequest.complianceReviewCompletedBy?.title : undefined,
    };
  };

  const reviewCommentsInfo = getReviewCommentsInfo();

  // Determine if tracking ID is required based on compliance review flags
  const isTrackingIdRequired =
    currentRequest.reviewAudience !== ReviewAudience.Legal &&
    (currentRequest.complianceReview?.isForesideReviewRequired ||
      currentRequest.complianceReview?.isRetailUse);

  // Determine the last review completion date based on review audience
  // This represents when reviews were approved and closeout started
  const getLastReviewCompletedDate = (): Date | undefined => {
    const reviewAudience = currentRequest.reviewAudience;

    if (reviewAudience === ReviewAudience.Both) {
      // Both reviews required - return the later completion date
      const legalDate = currentRequest.legalReviewCompletedOn;
      const complianceDate = currentRequest.complianceReviewCompletedOn;

      if (legalDate && complianceDate) {
        const legalTime = legalDate instanceof Date ? legalDate.getTime() : new Date(legalDate).getTime();
        const complianceTime = complianceDate instanceof Date ? complianceDate.getTime() : new Date(complianceDate).getTime();
        return legalTime > complianceTime ? legalDate : complianceDate;
      }
      return legalDate || complianceDate;
    } else if (reviewAudience === ReviewAudience.Legal) {
      return currentRequest.legalReviewCompletedOn;
    } else if (reviewAudience === ReviewAudience.Compliance) {
      return currentRequest.complianceReviewCompletedOn;
    }
    return undefined;
  };

  // Start date is when the closeout stage began (last review was approved)
  const startedOn = currentRequest.closeoutOn || getLastReviewCompletedDate();

  // Calculate duration for closeout
  const calculateCloseoutDuration = (): number | undefined => {
    const reviewerHours = currentRequest.closeoutReviewerHours || 0;
    const submitterHours = currentRequest.closeoutSubmitterHours || 0;
    const total = reviewerHours + submitterHours;
    if (total === 0) return undefined;
    return Math.round(total * 60);
  };

  const durationMinutes = calculateCloseoutDuration();

  // Get completed by info for header
  const completedBy = currentRequest.closeoutBy ? {
    title: currentRequest.closeoutBy.title || '',
    email: currentRequest.closeoutBy.email,
  } : undefined;

  // Determine header status
  const headerStatus = readOnly ? 'completed' : 'in-progress';

  return (
    <Card
      id='closeout-card'
      className={`closeout-form ${readOnly ? 'closeout-form--completed' : ''}`}
      allowExpand={true}
      defaultExpanded={!defaultCollapsed && !readOnly}
    >
      <Header size='regular'>
        <WorkflowCardHeader
          title='Closeout'
          status={headerStatus}
          startedOn={startedOn}
          completedOn={readOnly ? currentRequest.closeoutOn : undefined}
          completedBy={readOnly ? completedBy : undefined}
          durationMinutes={durationMinutes}
          trackingId={readOnly ? currentRequest.trackingId : undefined}
        />
      </Header>

      <Content padding='comfortable'>
        <FormProvider control={control as any} autoShowErrors={true}>
          <Stack tokens={{ childrenGap: 20 }}>
            {/* Tracking ID */}
            <FormContainer labelWidth='150px'>
              <FormItem fieldName='trackingId'>
                <FormLabel
                  isRequired={!readOnly && isTrackingIdRequired}
                  infoText={
                    readOnly
                      ? undefined
                      : isTrackingIdRequired
                        ? 'Tracking ID is required because Foreside Review or Retail Use was indicated during compliance review'
                        : 'Enter the tracking ID assigned to this request (optional)'
                  }
                >
                  Tracking ID
                </FormLabel>
                {readOnly ? (
                  <span>{currentRequest.trackingId || '—'}</span>
                ) : (
                  <Controller
                    name='trackingId'
                    control={control}
                    render={({ field }) => (
                      <SPTextField
                        {...field}
                        name='trackingId'
                        placeholder='Enter tracking ID'
                        mode={SPTextFieldMode.SingleLine}
                        maxLength={50}
                        showCharacterCount
                        stylingMode='outlined'
                      />
                    )}
                  />
                )}
              </FormItem>
            </FormContainer>

            {/* Review Comments Acknowledgment Section - show only if there are "Approved with Comments" reviews */}
            {reviewCommentsInfo.hasCommentsToAcknowledge && !readOnly && (
              <>
                <Separator />
                <Stack tokens={{ childrenGap: 16 }}>
                  <MessageBar
                    messageBarType={MessageBarType.warning}
                    isMultiline
                    styles={{
                      root: { marginBottom: 8 },
                      icon: { color: '#d83b01' },
                    }}
                  >
                    <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
                      <Icon iconName="Warning" styles={{ root: { marginRight: 8 } }} />
                      Review Comments Require Acknowledgment
                    </Text>
                    <Text block styles={{ root: { marginTop: 8 } }}>
                      One or more reviews were approved with comments. Please review the comments below
                      and confirm that you have addressed or acknowledged them before completing closeout.
                    </Text>
                  </MessageBar>

                  {/* Legal Review Comments */}
                  {reviewCommentsInfo.legalHasComments && reviewCommentsInfo.legalNotes && (
                    <Stack
                      styles={{
                        root: {
                          backgroundColor: '#f3f2f1',
                          padding: 16,
                          borderRadius: 4,
                          borderLeft: '4px solid #0078d4',
                        },
                      }}
                    >
                      <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
                        <Text variant="mediumPlus" styles={{ root: { fontWeight: 600, color: '#0078d4' } }}>
                          <Icon iconName="Scale" styles={{ root: { marginRight: 8 } }} />
                          Legal Review Comments
                        </Text>
                        {reviewCommentsInfo.legalCompletedBy && (
                          <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
                            by {reviewCommentsInfo.legalCompletedBy}
                          </Text>
                        )}
                      </Stack>
                      <Text
                        block
                        styles={{
                          root: {
                            marginTop: 12,
                            whiteSpace: 'pre-wrap',
                            lineHeight: '1.5',
                          },
                        }}
                      >
                        {reviewCommentsInfo.legalNotes}
                      </Text>
                    </Stack>
                  )}

                  {/* Compliance Review Comments */}
                  {reviewCommentsInfo.complianceHasComments && reviewCommentsInfo.complianceNotes && (
                    <Stack
                      styles={{
                        root: {
                          backgroundColor: '#f3f2f1',
                          padding: 16,
                          borderRadius: 4,
                          borderLeft: '4px solid #107c10',
                        },
                      }}
                    >
                      <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
                        <Text variant="mediumPlus" styles={{ root: { fontWeight: 600, color: '#107c10' } }}>
                          <Icon iconName="Shield" styles={{ root: { marginRight: 8 } }} />
                          Compliance Review Comments
                        </Text>
                        {reviewCommentsInfo.complianceCompletedBy && (
                          <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
                            by {reviewCommentsInfo.complianceCompletedBy}
                          </Text>
                        )}
                      </Stack>
                      <Text
                        block
                        styles={{
                          root: {
                            marginTop: 12,
                            whiteSpace: 'pre-wrap',
                            lineHeight: '1.5',
                          },
                        }}
                      >
                        {reviewCommentsInfo.complianceNotes}
                      </Text>
                    </Stack>
                  )}

                  {/* Acknowledgment Checkbox */}
                  <Stack
                    styles={{
                      root: {
                        backgroundColor: commentsAcknowledged ? '#dff6dd' : '#fff4ce',
                        padding: 16,
                        borderRadius: 4,
                        border: commentsAcknowledged ? '1px solid #107c10' : '1px solid #d83b01',
                      },
                    }}
                  >
                    <Checkbox
                      label="I have reviewed and addressed the comments above, or acknowledge that I have read and understand them."
                      checked={commentsAcknowledged}
                      onChange={(_, checked) => setCommentsAcknowledged(checked ?? false)}
                      styles={{
                        root: { fontWeight: 500 },
                        checkbox: {
                          borderColor: commentsAcknowledged ? '#107c10' : '#d83b01',
                        },
                        checkmark: {
                          color: '#107c10',
                        },
                      }}
                      ariaLabel="Acknowledge review comments"
                    />
                  </Stack>
                </Stack>
              </>
            )}

            {/* Show acknowledgment status in read-only mode if comments were acknowledged */}
            {readOnly && currentRequest.commentsAcknowledged && (
              <>
                <Separator />
                <Stack
                  horizontal
                  verticalAlign="center"
                  tokens={{ childrenGap: 8 }}
                  styles={{
                    root: {
                      backgroundColor: '#dff6dd',
                      padding: 12,
                      borderRadius: 4,
                      border: '1px solid #107c10',
                    },
                  }}
                >
                  <Icon iconName="CheckMark" styles={{ root: { color: '#107c10', fontSize: 16 } }} />
                  <Text styles={{ root: { color: '#107c10', fontWeight: 500 } }}>
                    Review comments were acknowledged
                    {currentRequest.commentsAcknowledgedOn && (
                      <> on {currentRequest.commentsAcknowledgedOn instanceof Date
                        ? currentRequest.commentsAcknowledgedOn.toLocaleDateString()
                        : new Date(currentRequest.commentsAcknowledgedOn).toLocaleDateString()}</>
                    )}
                  </Text>
                </Stack>
              </>
            )}

            {/* Final Notes - only show in edit mode (field may be added later) */}
            {!readOnly && (
              <FormContainer labelWidth='150px'>
                <FormItem fieldName='closeoutNotes'>
                  <FormLabel infoText='Add any final notes or comments about this request'>
                    Closeout Notes
                  </FormLabel>
                  <SPTextField
                    name='closeoutNotes'
                    placeholder='Add any final notes or comments'
                    mode={SPTextFieldMode.MultiLine}
                    rows={3}
                    maxLength={2000}
                    showCharacterCount
                    stylingMode='outlined'
                    spellCheck
                    appendOnly
                    itemId={itemId}
                    listNameOrId='Requests'
                    fieldInternalName='CloseoutNotes'
                  />
                </FormItem>
              </FormContainer>
            )}
          </Stack>
        </FormProvider>
      </Content>
    </Card>
  );
};

export default CloseoutForm;

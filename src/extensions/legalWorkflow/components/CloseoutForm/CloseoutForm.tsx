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
import { useForm, FormProvider as RHFFormProvider } from 'react-hook-form';

// Fluent UI - tree-shaken imports
import { PrimaryButton } from '@fluentui/react/lib/Button';
import { Checkbox } from '@fluentui/react/lib/Checkbox';
import { Icon } from '@fluentui/react/lib/Icon';
import { Link } from '@fluentui/react/lib/Link';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Separator } from '@fluentui/react/lib/Separator';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';

// spfx-toolkit - tree-shaken imports
import { Card, Content, Footer, Header, useCardController } from 'spfx-toolkit/lib/components/Card';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';
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
import { ValidationErrorContainer } from '@components/ValidationErrorContainer';
import { WorkflowCardHeader } from '@components/WorkflowCardHeader';
import { useRequestFormContext } from '@contexts/RequestFormContext';
import { useRequestStore } from '@stores/requestStore';
import { useShallow } from 'zustand/react/shallow';
import { useCloseoutStore } from '@stores/closeoutStore';
import { ReviewAudience, ReviewOutcome } from '@appTypes/index';
import { TRACKING_ID_MAX_LENGTH, CLOSEOUT_NOTES_MAX_LENGTH } from '@constants/fieldLimits';

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
  const { currentRequest, closeoutRequest } = useRequestStore(
    useShallow((s) => ({
      currentRequest: s.currentRequest,
      closeoutRequest: s.closeoutRequest,
    }))
  );
  const { setCloseoutValues, commentsAcknowledged, setCommentsAcknowledged } = useCloseoutStore();
  const { validationErrors, setValidationErrors } = useRequestFormContext();

  // Card controller for programmatic expand/scroll
  const { expandAndScrollTo } = useCardController();

  // State for completing closeout
  const [isCompleting, setIsCompleting] = React.useState<boolean>(false);
  const [closeoutError, setCloseoutError] = React.useState<string | undefined>(undefined);

  // Check if there's a validation error for tracking ID
  const trackingIdError = React.useMemo(() => {
    if (!validationErrors) return undefined;
    for (let i = 0; i < validationErrors.length; i++) {
      if (validationErrors[i].field === 'trackingId') {
        return validationErrors[i];
      }
    }
    return undefined;
  }, [validationErrors]);

  // Check if there's a validation error for comments acknowledgment
  const commentsAcknowledgedError = React.useMemo(() => {
    if (!validationErrors) return undefined;
    for (let i = 0; i < validationErrors.length; i++) {
      if (validationErrors[i].field === 'commentsAcknowledged') {
        return validationErrors[i];
      }
    }
    return undefined;
  }, [validationErrors]);

  // Filter validation errors to only show Closeout related fields
  const closeoutFields = ['trackingId', 'commentsAcknowledged', 'closeoutNotes'];
  const closeoutValidationErrors = React.useMemo(() => {
    if (!validationErrors) return [];
    return validationErrors.filter(err => closeoutFields.includes(err.field));
  }, [validationErrors]);

  // Scroll to field handler for validation errors
  const handleScrollToField = React.useCallback((fieldName: string) => {
    const element = document.querySelector(`[data-field-name="${fieldName}"]`) ||
      document.getElementById(`closeout-${fieldName}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const focusable = element.querySelector('input, textarea, select, [tabindex]:not([tabindex="-1"])') as HTMLElement;
      if (focusable) {
        focusable.focus();
      }
    }
  }, []);

  // React Hook Form setup
  const formMethods = useForm<ICloseoutFormData>({
    defaultValues: {
      trackingId: currentRequest?.trackingId || '',
      closeoutNotes: currentRequest?.closeoutNotes || '',
    },
    mode: 'onChange',
  });
  const { control, watch, setError, clearErrors, reset } = formMethods;

  // Watch form values and sync to store
  const trackingIdValue = watch('trackingId');
  const closeoutNotesValue = watch('closeoutNotes');

  // Sync form with store when currentRequest changes
  React.useEffect(() => {
    if (currentRequest) {
      reset({
        trackingId: currentRequest.trackingId || '',
        closeoutNotes: currentRequest.closeoutNotes || '',
      });
    }
  }, [currentRequest?.trackingId, currentRequest?.closeoutNotes, reset]);

  // Sync form values to closeout store
  React.useEffect(() => {
    setCloseoutValues({
      trackingId: trackingIdValue,
      closeoutNotes: closeoutNotesValue,
      commentsAcknowledged,
    });
  }, [trackingIdValue, closeoutNotesValue, commentsAcknowledged, setCloseoutValues]);

  // Clear trackingId validation error when user provides a value
  React.useEffect(() => {
    if (trackingIdValue && trackingIdValue.trim() !== '' && validationErrors) {
      // Check if there's a trackingId error in the context
      const hasTrackingIdError = validationErrors.some((err: { field: string }) => err.field === 'trackingId');
      if (hasTrackingIdError) {
        // Remove trackingId error from the list
        const filteredErrors = validationErrors.filter((err: { field: string }) => err.field !== 'trackingId');
        setValidationErrors(filteredErrors);
      }
    }
  }, [trackingIdValue, validationErrors, setValidationErrors]);

  // Clear commentsAcknowledged validation error when user acknowledges comments
  React.useEffect(() => {
    if (commentsAcknowledged && validationErrors) {
      // Check if there's a commentsAcknowledged error in the context
      const hasCommentsError = validationErrors.some((err: { field: string }) => err.field === 'commentsAcknowledged');
      if (hasCommentsError) {
        // Remove commentsAcknowledged error from the list
        const filteredErrors = validationErrors.filter((err: { field: string }) => err.field !== 'commentsAcknowledged');
        setValidationErrors(filteredErrors);
      }
    }
  }, [commentsAcknowledged, validationErrors, setValidationErrors]);

  // Propagate external validation errors to react-hook-form
  React.useEffect(() => {
    if (trackingIdError) {
      setError('trackingId', { type: 'manual', message: trackingIdError.message });
    } else {
      clearErrors('trackingId');
    }
  }, [trackingIdError, setError, clearErrors]);

  /**
   * Handle Complete Request button click
   */
  const handleCompleteRequest = React.useCallback(async (): Promise<void> => {
    setIsCompleting(true);
    setCloseoutError(undefined);
    setValidationErrors([]);

    try {
      // Validate tracking ID if required
      const isTrackingIdRequired =
        currentRequest?.reviewAudience !== ReviewAudience.Legal &&
        currentRequest?.complianceReview?.isForesideReviewRequired === true &&
        currentRequest?.complianceReview?.isRetailUse === true;

      const errors: { field: string; message: string }[] = [];

      if (isTrackingIdRequired && (!trackingIdValue || trackingIdValue.trim() === '')) {
        errors.push({
          field: 'trackingId',
          message: 'Tracking ID is required because both Foreside Review Required and Retail Use were indicated during compliance review.',
        });
      }

      // Check if "Approved with Comments" needs acknowledgment
      const hasApprovedWithComments =
        currentRequest?.legalReviewOutcome === ReviewOutcome.ApprovedWithComments ||
        currentRequest?.complianceReviewOutcome === ReviewOutcome.ApprovedWithComments;

      if (hasApprovedWithComments && !commentsAcknowledged) {
        errors.push({
          field: 'commentsAcknowledged',
          message: 'You must acknowledge the review comments before completing closeout.',
        });
      }

      if (errors.length > 0) {
        setValidationErrors(errors);
        SPContext.logger.warn('CloseoutForm: Validation failed', { errors: errors.map(e => e.field) });
        return;
      }

      await closeoutRequest({
        trackingId: trackingIdValue,
        commentsAcknowledged,
        closeoutNotes: closeoutNotesValue,
      });

      SPContext.logger.success('CloseoutForm: Request completed successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete request';
      setCloseoutError(errorMessage);
      SPContext.logger.error('CloseoutForm: Complete request failed', error);
    } finally {
      setIsCompleting(false);
    }
  }, [currentRequest, trackingIdValue, closeoutNotesValue, commentsAcknowledged, closeoutRequest, setValidationErrors]);

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
    currentRequest.complianceReview?.isForesideReviewRequired === true &&
    currentRequest.complianceReview?.isRetailUse === true;

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
        <RHFFormProvider {...formMethods}>
          <FormProvider control={control as any} autoShowErrors={true}>
            <Stack tokens={{ childrenGap: 20 }}>
            {/* Review Comments Acknowledgment Section - FIRST, show only if there are "Approved with Comments" reviews */}
            {reviewCommentsInfo.hasCommentsToAcknowledge && !readOnly && (
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
                    One or more reviews were approved with comments. Please review the comments and
                    confirm that you have addressed or acknowledged them before completing closeout.
                  </Text>
                </MessageBar>

                {/* Legal Review Comments - with link to view */}
                {reviewCommentsInfo.legalHasComments && (
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
                    <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }} styles={{ root: { marginTop: 12 } }}>
                      <Link
                        onClick={() => {
                          // Use card controller to expand and scroll to Legal Review card
                          void expandAndScrollTo('legal-review-card', { smooth: true, block: 'start', highlight: true });
                        }}
                        styles={{ root: { fontWeight: 500 } }}
                      >
                        <Icon iconName="OpenInNewTab" styles={{ root: { marginRight: 6, fontSize: 12 } }} />
                        View comments in Legal Review section
                      </Link>
                    </Stack>
                  </Stack>
                )}

                {/* Compliance Review Comments - with link to view */}
                {reviewCommentsInfo.complianceHasComments && (
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
                    <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }} styles={{ root: { marginTop: 12 } }}>
                      <Link
                        onClick={() => {
                          // Use card controller to expand and scroll to Compliance Review card
                          void expandAndScrollTo('compliance-review-card', { smooth: true, block: 'start', highlight: true });
                        }}
                        styles={{ root: { fontWeight: 500 } }}
                      >
                        <Icon iconName="OpenInNewTab" styles={{ root: { marginRight: 6, fontSize: 12 } }} />
                        View comments in Compliance Review section
                      </Link>
                    </Stack>
                  </Stack>
                )}

                {/* Acknowledgment Checkbox */}
                <Stack
                  styles={{
                    root: {
                      backgroundColor: commentsAcknowledged ? '#dff6dd' : commentsAcknowledgedError ? '#fde7e9' : '#fff4ce',
                      padding: 16,
                      borderRadius: 4,
                      border: commentsAcknowledged ? '1px solid #107c10' : commentsAcknowledgedError ? '2px solid #a80000' : '1px solid #d83b01',
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
                        borderColor: commentsAcknowledged ? '#107c10' : commentsAcknowledgedError ? '#a80000' : '#d83b01',
                        borderWidth: commentsAcknowledgedError ? 2 : 1,
                        backgroundColor: commentsAcknowledged ? '#107c10' : 'transparent',
                      },
                      checkmark: {
                        color: '#ffffff',
                        fontWeight: 'bold',
                      },
                    }}
                    ariaLabel="Acknowledge review comments"
                  />
                  {commentsAcknowledgedError && (
                    <Text
                      variant="small"
                      styles={{
                        root: {
                          color: '#a80000',
                          marginTop: 8,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        },
                      }}
                    >
                      <Icon iconName="ErrorBadge" styles={{ root: { fontSize: 12 } }} />
                      {commentsAcknowledgedError.message}
                    </Text>
                  )}
                </Stack>

                <Separator />
              </Stack>
            )}

            {/* Tracking ID - moved after Review Comments section */}
            <FormContainer labelWidth='150px'>
              <FormItem fieldName='trackingId'>
                <FormLabel
                  isRequired={!readOnly && isTrackingIdRequired}
                  infoText={
                    readOnly
                      ? undefined
                      : isTrackingIdRequired
                        ? 'Tracking ID is required because both Foreside Review Required and Retail Use were indicated during compliance review'
                        : 'Enter the tracking ID assigned to this request (optional)'
                  }
                >
                  Tracking ID
                </FormLabel>
                {readOnly ? (
                  <span>{currentRequest.trackingId || '—'}</span>
                ) : (
                  <SPTextField
                    name='trackingId'
                    placeholder='Enter tracking ID'
                    mode={SPTextFieldMode.SingleLine}
                    maxLength={TRACKING_ID_MAX_LENGTH}
                    showCharacterCount
                    stylingMode='outlined'
                  />
                )}
              </FormItem>
            </FormContainer>

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

            {/* Final Notes - show in both edit and read-only mode */}
            {(!readOnly || currentRequest.closeoutNotes) && (
              <FormContainer labelWidth='150px'>
                <FormItem fieldName='closeoutNotes'>
                  <FormLabel infoText={readOnly ? undefined : 'Add any final notes or comments about this request'}>
                    Closeout Notes
                  </FormLabel>
                  {readOnly ? (
                    <Text
                      styles={{
                        root: {
                          whiteSpace: 'pre-wrap',
                          lineHeight: '1.5',
                          color: currentRequest.closeoutNotes ? '#323130' : '#8a8886',
                        },
                      }}
                    >
                      {currentRequest.closeoutNotes || '—'}
                    </Text>
                  ) : (
                    <SPTextField
                      name='closeoutNotes'
                      placeholder='Add any final notes or comments'
                      mode={SPTextFieldMode.MultiLine}
                      rows={3}
                      maxLength={CLOSEOUT_NOTES_MAX_LENGTH}
                      showCharacterCount
                      stylingMode='outlined'
                      spellCheck
                    />
                  )}
                </FormItem>
              </FormContainer>
            )}

            {/* Validation errors - at the end of content (only in edit mode) */}
            {!readOnly && (
              <ValidationErrorContainer
                errors={closeoutValidationErrors}
                onScrollToField={handleScrollToField}
                filterFields={closeoutFields}
              />
            )}
            </Stack>
          </FormProvider>
        </RHFFormProvider>
      </Content>

      {/* Footer with Complete Request button - only show in edit mode */}
      {!readOnly && (
        <Footer>
          <Stack tokens={{ childrenGap: 8 }}>
            {closeoutError && (
              <MessageBar messageBarType={MessageBarType.error} onDismiss={() => setCloseoutError(undefined)}>
                {closeoutError}
              </MessageBar>
            )}
            <Stack horizontal horizontalAlign='end' tokens={{ childrenGap: 8 }}>
              <PrimaryButton
                onClick={handleCompleteRequest}
                disabled={isCompleting}
                iconProps={{ iconName: 'Completed' }}
              >
                {isCompleting && <Spinner size={SpinnerSize.xSmall} styles={{ root: { marginRight: 8 } }} />}
                {isCompleting ? 'Completing...' : 'Complete Request'}
              </PrimaryButton>
            </Stack>
          </Stack>
        </Footer>
      )}
    </Card>
  );
};

export default CloseoutForm;

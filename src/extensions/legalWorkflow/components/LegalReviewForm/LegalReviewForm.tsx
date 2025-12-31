/**
 * LegalReviewForm Component
 *
 * Collapsible form for attorney to conduct legal review.
 * Used when request status is "In Review" and review audience includes Legal.
 *
 * Simplified structure:
 * - Collapsible card with review notes and action buttons
 * - No duplicate request summary (shown in main RequestSummary)
 * - No duplicate documents section (shown in RequestDocuments)
 */

import * as React from 'react';
import { useForm } from 'react-hook-form';

// Fluent UI - tree-shaken imports
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { Icon } from '@fluentui/react/lib/Icon';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Separator } from '@fluentui/react/lib/Separator';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';

// spfx-toolkit - tree-shaken imports
import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import { Card, Header, Content } from 'spfx-toolkit/lib/components/Card';
import {
  FormContainer,
  FormItem,
  FormLabel,
  FormProvider,
  useScrollToError,
} from 'spfx-toolkit/lib/components/spForm';
import { SPTextField, SPTextFieldMode, SPChoiceField } from 'spfx-toolkit/lib/components/spFields';

// App imports using path aliases
import {
  WorkflowCardHeader,
  type ReviewOutcome as HeaderReviewOutcome,
} from '@components/WorkflowCardHeader';
import { useRequestStore, useRequestActions } from '@stores/requestStore';
import {
  saveLegalReviewProgress,
  resubmitForLegalReview,
} from '@services/workflowActionService';
import { LegalReviewStatus, ReviewOutcome } from '@appTypes/index';
import { calculateBusinessHours } from '@utils/businessHoursCalculator';

import './LegalReviewForm.scss';

/**
 * Review outcome choices for SPChoiceField
 */
const REVIEW_OUTCOME_CHOICES = [
  ReviewOutcome.Approved,
  ReviewOutcome.ApprovedWithComments,
  ReviewOutcome.RespondToCommentsAndResubmit,
  ReviewOutcome.NotApproved,
];

/**
 * Convert ReviewOutcome enum to header string type
 */
function toHeaderOutcome(outcome: ReviewOutcome | undefined): HeaderReviewOutcome | undefined {
  if (!outcome) return undefined;
  switch (outcome) {
    case ReviewOutcome.Approved:
      return 'Approved';
    case ReviewOutcome.ApprovedWithComments:
      return 'Approved With Comments';
    case ReviewOutcome.RespondToCommentsAndResubmit:
      return 'Respond To Comments And Resubmit';
    case ReviewOutcome.NotApproved:
      return 'Not Approved';
    default:
      return undefined;
  }
}

/**
 * Calculate duration in business minutes from start and end dates
 * Falls back to calendar time if business hours is 0 (e.g., completed on weekend)
 */
function calculateDurationMinutes(
  startDate?: Date,
  endDate?: Date
): number | undefined {
  if (!startDate || !endDate) return undefined;

  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const end = endDate instanceof Date ? endDate : new Date(endDate);

  // Calculate business hours and convert to minutes
  const businessHours = calculateBusinessHours(start, end);
  const businessMinutes = Math.round(businessHours * 60);

  // If business hours is 0 (e.g., completed entirely on weekend/after hours),
  // fall back to actual elapsed time so user sees some duration
  if (businessMinutes === 0) {
    const elapsedMs = end.getTime() - start.getTime();
    return Math.max(1, Math.round(elapsedMs / (1000 * 60))); // At least 1 minute
  }

  return businessMinutes;
}

/**
 * Legal Review form data
 */
interface ILegalReviewFormData {
  legalReviewStatus: LegalReviewStatus;
  legalReviewOutcome?: ReviewOutcome;
  legalReviewNotes?: string;
  submitterRequestNotes?: string;
}

/**
 * LegalReviewForm props
 */
interface ILegalReviewFormProps {
  /** Make the entire form collapsible */
  collapsible?: boolean;
  /** Start collapsed (only applies if collapsible is true) */
  defaultCollapsed?: boolean;
}

/**
 * LegalReviewForm Component
 */
export const LegalReviewForm: React.FC<ILegalReviewFormProps> = ({ defaultCollapsed = false }) => {
  const { currentRequest, isLoading, itemId } = useRequestStore();
  const { submitLegalReview: submitLegalReviewAction, loadRequest } = useRequestActions();
  const [showSuccess, setShowSuccess] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = React.useState<boolean>(false);
  // Key to force NoteHistory refresh after save
  const [historyRefreshKey, setHistoryRefreshKey] = React.useState<number>(0);
  // State for resubmit action
  const [isResubmitting, setIsResubmitting] = React.useState<boolean>(false);

  // React Hook Form setup
  const { control, handleSubmit, watch, reset, formState, getValues } =
    useForm<ILegalReviewFormData>({
      defaultValues: {
        legalReviewStatus: currentRequest?.legalReview?.status || LegalReviewStatus.NotStarted,
        legalReviewOutcome: currentRequest?.legalReview?.outcome,
        legalReviewNotes: currentRequest?.legalReview?.reviewNotes,
      },
      mode: 'onSubmit',
      reValidateMode: 'onChange',
    });

  // Use scroll to error hook
  const { scrollToFirstError } = useScrollToError(formState as any);

  const reviewStatus = watch('legalReviewStatus');
  const selectedOutcome = watch('legalReviewOutcome');

  // Sync form with store when currentRequest changes
  React.useEffect(() => {
    if (currentRequest?.legalReview) {
      reset({
        legalReviewStatus: currentRequest.legalReview.status || LegalReviewStatus.NotStarted,
        legalReviewOutcome: currentRequest.legalReview.outcome,
        legalReviewNotes: currentRequest.legalReview.reviewNotes,
      });
    }
  }, [currentRequest?.legalReview, reset]);

  /**
   * Handle submit review with selected outcome
   */
  const onSubmit = React.useCallback(
    async (data: ILegalReviewFormData): Promise<void> => {
      if (!itemId) return;

      try {
        if (!data.legalReviewOutcome) {
          setError('Please select a review outcome before submitting.');
          return;
        }

        setIsSaving(true);
        setError(undefined);

        SPContext.logger.info('LegalReviewForm: Submitting review', {
          outcome: data.legalReviewOutcome,
          notes: data.legalReviewNotes ? 'provided' : 'none',
        });

        // Use store action to submit - this updates the store automatically
        await submitLegalReviewAction(
          data.legalReviewOutcome,
          data.legalReviewNotes || ''
        );

        // Reset form with cleared notes for append-only field
        reset({
          legalReviewStatus: LegalReviewStatus.Completed,
          legalReviewOutcome: data.legalReviewOutcome,
          legalReviewNotes: undefined, // Clear for append-only
        });

        // Increment key to force NoteHistory refresh
        setHistoryRefreshKey((prev) => prev + 1);

        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 5000);
        SPContext.logger.success('LegalReviewForm: Review submitted successfully');
      } catch (submitError: unknown) {
        const errorMessage =
          submitError instanceof Error ? submitError.message : 'Failed to submit review';
        setError(errorMessage);
        scrollToFirstError();
        SPContext.logger.error('LegalReviewForm: Review submission failed', submitError);
      } finally {
        setIsSaving(false);
      }
    },
    [itemId, scrollToFirstError, reset]
  );

  /**
   * Handle save progress (save without submitting)
   */
  const handleSaveProgress = React.useCallback(async (): Promise<void> => {
    if (!itemId) return;

    try {
      setIsSaving(true);
      setError(undefined);

      const formData = getValues();

      SPContext.logger.info('LegalReviewForm: Saving progress', {
        notes: formData.legalReviewNotes ? 'provided' : 'none',
        outcome: formData.legalReviewOutcome || 'none',
      });

      // Use dedicated workflow action for save progress
      await saveLegalReviewProgress(itemId, {
        outcome: formData.legalReviewOutcome,
        notes: formData.legalReviewNotes,
      });

      // Reload request to update store with server data
      await loadRequest(itemId);

      // Reset form notes for append-only field
      reset({
        legalReviewStatus: LegalReviewStatus.InProgress,
        legalReviewOutcome: formData.legalReviewOutcome,
        legalReviewNotes: undefined, // Clear for append-only
      });

      // Increment key to force NoteHistory refresh
      setHistoryRefreshKey((prev) => prev + 1);

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      SPContext.logger.success('LegalReviewForm: Progress saved');
    } catch (saveError: unknown) {
      const errorMessage =
        saveError instanceof Error ? saveError.message : 'Failed to save progress';
      setError(errorMessage);
      SPContext.logger.error('LegalReviewForm: Save progress failed', saveError);
    } finally {
      setIsSaving(false);
    }
  }, [itemId, getValues, reset]);

  /**
   * Handle resubmit for review (submitter action)
   *
   * Called when the submitter has addressed the reviewer's comments and is ready
   * for the attorney to review again. This is part of the "Respond To Comments And Resubmit"
   * workflow where:
   * 1. Attorney sets outcome to "Respond To Comments And Resubmit"
   * 2. Review status changes to "Waiting On Submitter"
   * 3. Submitter addresses comments, updates request/documents/approvals
   * 4. Submitter clicks "Resubmit for Review" (this handler)
   * 5. Review status changes to "Waiting On Attorney"
   * 6. Attorney reviews again and can repeat or set final outcome
   */
  const handleResubmitForReview = React.useCallback(async (): Promise<void> => {
    if (!itemId) return;

    try {
      setIsResubmitting(true);
      setError(undefined);

      const formData = getValues();

      SPContext.logger.info('LegalReviewForm: Resubmitting for review', {
        itemId,
        notes: formData.legalReviewNotes ? 'provided' : 'none',
      });

      // Use dedicated resubmit action - changes status from WaitingOnSubmitter to WaitingOnAttorney
      // and calculates time tracking for submitter's work
      await resubmitForLegalReview(itemId, {
        notes: formData.legalReviewNotes,
      });

      // Reload request to update store with server data
      await loadRequest(itemId);

      // Reset form notes for append-only field
      reset({
        legalReviewStatus: LegalReviewStatus.WaitingOnAttorney,
        legalReviewOutcome: ReviewOutcome.RespondToCommentsAndResubmit, // Outcome stays the same
        legalReviewNotes: undefined, // Clear for append-only
      });

      // Increment key to force NoteHistory refresh
      setHistoryRefreshKey((prev) => prev + 1);

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
      SPContext.logger.success('LegalReviewForm: Request resubmitted for review');
    } catch (resubmitError: unknown) {
      const errorMessage =
        resubmitError instanceof Error ? resubmitError.message : 'Failed to resubmit for review';
      setError(errorMessage);
      SPContext.logger.error('LegalReviewForm: Resubmit failed', resubmitError);
    } finally {
      setIsResubmitting(false);
    }
  }, [itemId, getValues, reset, loadRequest]);

  if (!currentRequest) {
    return null;
  }

  // Check if legal review is applicable based on review audience
  const reviewAudience = currentRequest.reviewAudience;
  const isLegalReviewRequired = reviewAudience === 'Legal' || reviewAudience === 'Both';

  if (!isLegalReviewRequired) {
    return null;
  }

  // Check if review is completed
  const isReviewCompleted = currentRequest.legalReview?.status === LegalReviewStatus.Completed;
  const completedOutcome = currentRequest.legalReview?.outcome;

  // When completed, collapse by default and show green header
  const shouldDefaultCollapse = isReviewCompleted || defaultCollapsed;

  // Get start date (when legal review started - use legalStatusUpdatedOn or submittedForReviewOn)
  const startedOn = currentRequest.legalStatusUpdatedOn || currentRequest.submittedForReviewOn;

  // Calculate duration for header using business hours
  const durationMinutes = calculateDurationMinutes(
    startedOn,
    currentRequest.legalReviewCompletedOn
  );

  // If completed, show read-only summary view
  if (isReviewCompleted) {
    return (
      <Card
        id='legal-review-card'
        className='legal-review-form legal-review-form--completed'
        allowExpand={true}
        defaultExpanded={false}
      >
        <Header size='regular'>
          <WorkflowCardHeader
            title='Legal Review'
            status='completed'
            outcome={toHeaderOutcome(completedOutcome)}
            startedOn={startedOn}
            completedOn={currentRequest.legalReviewCompletedOn}
            completedBy={
              currentRequest.legalReviewCompletedBy?.title
                ? { title: currentRequest.legalReviewCompletedBy.title, email: currentRequest.legalReviewCompletedBy.email }
                : undefined
            }
            attorney={
              currentRequest.attorney?.title
                ? { title: currentRequest.attorney.title, email: currentRequest.attorney.email }
                : undefined
            }
            durationMinutes={durationMinutes}
          />
        </Header>

        <Content padding='comfortable'>
          <Stack tokens={{ childrenGap: 16 }}>
            {/* Show note history read-only */}
            <FormContainer labelWidth='150px'>
              <FormItem fieldName='reviewNotes'>
                <FormLabel>Review Notes</FormLabel>
                <SPTextField
                  key={`legal-review-notes-readonly-${historyRefreshKey}`}
                  name='legalReviewNotes'
                  mode={SPTextFieldMode.MultiLine}
                  rows={2}
                  readOnly
                  disabled
                  appendOnly
                  itemId={itemId}
                  listNameOrId='Requests'
                  fieldInternalName='LegalReviewNotes'
                />
              </FormItem>
            </FormContainer>
          </Stack>
        </Content>
      </Card>
    );
  }

  return (
    <Card
      id='legal-review-card'
      className='legal-review-form'
      allowExpand={true}
      defaultExpanded={!shouldDefaultCollapse}
    >
      <Header size='regular'>
        <WorkflowCardHeader
          title='Legal Review'
          status='in-progress'
          startedOn={startedOn}
          attorney={
            currentRequest.attorney?.title
              ? { title: currentRequest.attorney.title, email: currentRequest.attorney.email }
              : undefined
          }
          durationMinutes={durationMinutes}
          // Pass waiting status for resubmit workflow display
          // Shows "Waiting on Submitter" or "Waiting on Attorney" badge with timestamp
          waitingStatus={
            reviewStatus === LegalReviewStatus.WaitingOnSubmitter
              ? 'waiting-on-submitter'
              : reviewStatus === LegalReviewStatus.WaitingOnAttorney
                ? 'waiting-on-reviewer'
                : undefined
          }
          waitingSince={
            (reviewStatus === LegalReviewStatus.WaitingOnSubmitter ||
              reviewStatus === LegalReviewStatus.WaitingOnAttorney)
              ? currentRequest.legalStatusUpdatedOn
              : undefined
          }
        />
      </Header>

      <Content padding='comfortable'>
        <FormProvider control={control as any} autoShowErrors={true}>
          {/* Success message */}
          {showSuccess && (
            <MessageBar
              messageBarType={MessageBarType.success}
              isMultiline={false}
              onDismiss={() => setShowSuccess(false)}
              styles={{ root: { borderRadius: '4px', marginBottom: '16px' } }}
            >
              <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 8 }}>
                <Icon iconName='Completed' />
                <Text>Changes saved successfully!</Text>
              </Stack>
            </MessageBar>
          )}

          {/* Error message */}
          {error && (
            <MessageBar
              messageBarType={MessageBarType.error}
              isMultiline={true}
              onDismiss={() => setError(undefined)}
              styles={{ root: { borderRadius: '4px', marginBottom: '16px' } }}
            >
              {error}
            </MessageBar>
          )}

          {/* Waiting on submitter - show resubmit UI for submitter */}
          {reviewStatus === LegalReviewStatus.WaitingOnSubmitter ? (
            <Stack tokens={{ childrenGap: 16 }}>
              {/* Warning banner explaining what needs to be done */}
              <MessageBar
                messageBarType={MessageBarType.warning}
                isMultiline
                styles={{
                  root: { borderRadius: '4px' },
                  icon: { color: '#d83b01' },
                }}
              >
                <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
                  <Icon iconName="Warning" styles={{ root: { marginRight: 8 } }} />
                  Action Required: Respond to Attorney Comments
                </Text>
                <Text block styles={{ root: { marginTop: 8 } }}>
                  The attorney has requested changes or additional information. Please review the comments below,
                  address the issues by updating the request or adding documents/approvals as needed,
                  then click &quot;Resubmit for Review&quot; when ready.
                </Text>
              </MessageBar>

              {/* Show attorney's review comments if available */}
              {currentRequest.legalReview?.reviewNotes && (
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
                      Attorney Comments
                    </Text>
                    {currentRequest.attorney?.title && (
                      <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
                        by {currentRequest.attorney.title}
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
                    {currentRequest.legalReview.reviewNotes}
                  </Text>
                </Stack>
              )}

              {/* Response notes field - submitter can add notes when resubmitting */}
              <FormContainer labelWidth='150px'>
                <FormItem fieldName='legalReviewNotes'>
                  <FormLabel infoText='Add notes explaining what changes you made to address the comments'>
                    Response Notes
                  </FormLabel>
                  <SPTextField
                    key={`legal-review-notes-resubmit-${historyRefreshKey}`}
                    name='legalReviewNotes'
                    placeholder='Describe the changes made to address the reviewer comments'
                    mode={SPTextFieldMode.MultiLine}
                    rows={3}
                    maxLength={4000}
                    showCharacterCount
                    stylingMode='outlined'
                    spellCheck
                    appendOnly
                    itemId={itemId}
                    listNameOrId='Requests'
                    fieldInternalName='LegalReviewNotes'
                  />
                </FormItem>
              </FormContainer>

              <Separator />

              {/* Resubmit button */}
              <Stack horizontal tokens={{ childrenGap: 12 }} horizontalAlign='start'>
                <PrimaryButton
                  text={isResubmitting ? 'Resubmitting...' : 'Resubmit for Review'}
                  iconProps={{ iconName: isResubmitting ? undefined : 'Send' }}
                  onClick={handleResubmitForReview}
                  disabled={isLoading || isSaving || isResubmitting}
                  styles={{
                    root: { minWidth: '180px', height: '40px', borderRadius: '4px' },
                  }}
                >
                  {isResubmitting && (
                    <Spinner size={SpinnerSize.xSmall} styles={{ root: { marginRight: 8 } }} />
                  )}
                </PrimaryButton>
              </Stack>
            </Stack>
          ) : reviewStatus === LegalReviewStatus.WaitingOnAttorney ? (
            // Waiting on Attorney - show message to reviewers that submitter has resubmitted
            <Stack tokens={{ childrenGap: 16 }}>
              <MessageBar
                messageBarType={MessageBarType.info}
                isMultiline={false}
                styles={{ root: { borderRadius: '4px' } }}
              >
                <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 8 }}>
                  <Icon iconName='AwayStatus' />
                  <Text>
                    The submitter has resubmitted for review. Please review the changes and provide your decision.
                  </Text>
                </Stack>
              </MessageBar>

              {/* Standard review form for attorney */}
              <form onSubmit={handleSubmit(onSubmit)}>
                <Stack tokens={{ childrenGap: 20 }}>
                  {/* Review Outcome Selection */}
                  <FormContainer labelWidth='150px'>
                    <FormItem fieldName='legalReviewOutcome'>
                      <FormLabel isRequired infoText='Select your review decision'>
                        Review Outcome
                      </FormLabel>
                      <SPChoiceField
                        name='legalReviewOutcome'
                        choices={REVIEW_OUTCOME_CHOICES}
                        placeholder='Select an outcome...'
                      />
                    </FormItem>
                  </FormContainer>

                  {/* Review Notes */}
                  <FormContainer labelWidth='150px'>
                    <FormItem fieldName='legalReviewNotes'>
                      <FormLabel infoText='Detailed review notes, comments, and recommendations'>
                        Review Notes
                      </FormLabel>
                      <SPTextField
                        key={`legal-review-notes-waiting-${historyRefreshKey}`}
                        name='legalReviewNotes'
                        placeholder='Provide detailed review notes, comments, and recommendations'
                        mode={SPTextFieldMode.MultiLine}
                        rows={4}
                        maxLength={4000}
                        showCharacterCount
                        stylingMode='outlined'
                        spellCheck
                        appendOnly
                        itemId={itemId}
                        listNameOrId='Requests'
                        fieldInternalName='LegalReviewNotes'
                      />
                    </FormItem>
                  </FormContainer>

                  <Separator />

                  {/* Action Buttons */}
                  <Stack horizontal tokens={{ childrenGap: 12 }} horizontalAlign='start'>
                    <PrimaryButton
                      type='submit'
                      text='Submit Review'
                      iconProps={{ iconName: 'Send' }}
                      disabled={isLoading || isSaving || !selectedOutcome}
                      styles={{
                        root: { minWidth: '140px', height: '40px', borderRadius: '4px' },
                      }}
                    />
                    <DefaultButton
                      text={isSaving ? 'Saving...' : 'Save'}
                      iconProps={{ iconName: isSaving ? undefined : 'Save' }}
                      onClick={handleSaveProgress}
                      disabled={isLoading || isSaving}
                      styles={{
                        root: { minWidth: '100px', height: '40px', borderRadius: '4px' },
                      }}
                    >
                      {isSaving && (
                        <Spinner size={SpinnerSize.xSmall} styles={{ root: { marginRight: 8 } }} />
                      )}
                    </DefaultButton>
                  </Stack>
                </Stack>
              </form>
            </Stack>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              <Stack tokens={{ childrenGap: 20 }}>
                {/* Review Outcome Selection */}
                <FormContainer labelWidth='150px'>
                  <FormItem fieldName='legalReviewOutcome'>
                    <FormLabel isRequired infoText='Select your review decision'>
                      Review Outcome
                    </FormLabel>
                    <SPChoiceField
                      name='legalReviewOutcome'
                      choices={REVIEW_OUTCOME_CHOICES}
                      placeholder='Select an outcome...'
                    />
                  </FormItem>
                </FormContainer>

                {/* Review Notes */}
                <FormContainer labelWidth='150px'>
                  <FormItem fieldName='legalReviewNotes'>
                    <FormLabel infoText='Detailed review notes, comments, and recommendations'>
                      Review Notes
                    </FormLabel>
                    <SPTextField
                      key={`legal-review-notes-${historyRefreshKey}`}
                      name='legalReviewNotes'
                      placeholder='Provide detailed review notes, comments, and recommendations'
                      mode={SPTextFieldMode.MultiLine}
                      rows={4}
                      maxLength={4000}
                      showCharacterCount
                      stylingMode='outlined'
                      spellCheck
                      appendOnly
                      itemId={itemId}
                      listNameOrId='Requests'
                      fieldInternalName='LegalReviewNotes'
                    />
                  </FormItem>
                </FormContainer>

                <Separator />

                {/* Action Buttons */}
                <Stack horizontal tokens={{ childrenGap: 12 }} horizontalAlign='start'>
                  <PrimaryButton
                    type='submit'
                    text='Submit Review'
                    iconProps={{ iconName: 'Send' }}
                    disabled={isLoading || isSaving || !selectedOutcome}
                    styles={{
                      root: { minWidth: '140px', height: '40px', borderRadius: '4px' },
                    }}
                  />
                  <DefaultButton
                    text={isSaving ? 'Saving...' : 'Save'}
                    iconProps={{ iconName: isSaving ? undefined : 'Save' }}
                    onClick={handleSaveProgress}
                    disabled={isLoading || isSaving}
                    styles={{
                      root: { minWidth: '100px', height: '40px', borderRadius: '4px' },
                    }}
                  >
                    {isSaving && (
                      <Spinner size={SpinnerSize.xSmall} styles={{ root: { marginRight: 8 } }} />
                    )}
                  </DefaultButton>
                </Stack>
              </Stack>
            </form>
          )}
        </FormProvider>
      </Content>
    </Card>
  );
};

export default LegalReviewForm;

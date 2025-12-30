/**
 * ComplianceReviewForm Component
 *
 * Collapsible form for compliance team to conduct compliance review.
 * Used when request status is "In Review" and review audience includes Compliance.
 *
 * Simplified structure:
 * - Collapsible card with outcome selection, notes, and compliance-specific fields
 * - Single Submit button with outcome selected via radio buttons
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
import {
  SPTextField,
  SPTextFieldMode,
  SPBooleanField,
  SPBooleanDisplayType,
  SPChoiceField,
} from 'spfx-toolkit/lib/components/spFields';

// App imports using path aliases
import { WorkflowCardHeader, type ReviewOutcome as HeaderReviewOutcome } from '@components/WorkflowCardHeader';
import { useRequestStore, useRequestActions } from '@stores/requestStore';
import { saveComplianceReviewProgress } from '@services/workflowActionService';
import { ComplianceReviewStatus, ReviewOutcome } from '@appTypes/index';
import { calculateBusinessHours } from '@utils/businessHoursCalculator';

import './ComplianceReviewForm.scss';

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
 * Compliance Review form data
 */
interface IComplianceReviewFormData {
  complianceReviewStatus: ComplianceReviewStatus;
  complianceReviewOutcome?: ReviewOutcome;
  complianceReviewNotes?: string;
  isForesideReviewRequired: boolean;
  isRetailUse: boolean;
}

/**
 * ComplianceReviewForm props
 */
interface IComplianceReviewFormProps {
  /** Make the entire form collapsible */
  collapsible?: boolean;
  /** Start collapsed (only applies if collapsible is true) */
  defaultCollapsed?: boolean;
}

/**
 * ComplianceReviewForm Component
 */
export const ComplianceReviewForm: React.FC<IComplianceReviewFormProps> = ({
  defaultCollapsed = false,
}) => {
  const { currentRequest, isLoading, itemId } = useRequestStore();
  const { submitComplianceReview: submitComplianceReviewAction, loadRequest } = useRequestActions();
  const [showSuccess, setShowSuccess] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = React.useState<boolean>(false);
  // Key to force NoteHistory refresh after save
  const [historyRefreshKey, setHistoryRefreshKey] = React.useState<number>(0);

  // React Hook Form setup
  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState,
    getValues,
  } = useForm<IComplianceReviewFormData>({
    defaultValues: {
      complianceReviewStatus: currentRequest?.complianceReview?.status || ComplianceReviewStatus.NotStarted,
      complianceReviewOutcome: currentRequest?.complianceReview?.outcome,
      complianceReviewNotes: currentRequest?.complianceReview?.reviewNotes,
      isForesideReviewRequired: currentRequest?.complianceReview?.isForesideReviewRequired || false,
      isRetailUse: currentRequest?.complianceReview?.isRetailUse || false,
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  // Use scroll to error hook
  const { scrollToFirstError } = useScrollToError(formState as any);

  const reviewStatus = watch('complianceReviewStatus');
  const selectedOutcome = watch('complianceReviewOutcome');

  // Sync form with store when currentRequest changes
  React.useEffect(() => {
    if (currentRequest?.complianceReview) {
      reset({
        complianceReviewStatus: currentRequest.complianceReview.status || ComplianceReviewStatus.NotStarted,
        complianceReviewOutcome: currentRequest.complianceReview.outcome,
        complianceReviewNotes: currentRequest.complianceReview.reviewNotes,
        isForesideReviewRequired: currentRequest.complianceReview.isForesideReviewRequired || false,
        isRetailUse: currentRequest.complianceReview.isRetailUse || false,
      });
    }
  }, [currentRequest?.complianceReview, reset]);

  /**
   * Handle submit review with selected outcome
   */
  const onSubmit = React.useCallback(async (data: IComplianceReviewFormData): Promise<void> => {
    if (!itemId) return;

    try {
      if (!data.complianceReviewOutcome) {
        setError('Please select a review outcome before submitting.');
        return;
      }

      setIsSaving(true);
      setError(undefined);

      SPContext.logger.info('ComplianceReviewForm: Submitting review', {
        outcome: data.complianceReviewOutcome,
        isForesideReviewRequired: data.isForesideReviewRequired,
        isRetailUse: data.isRetailUse,
        notes: data.complianceReviewNotes ? 'provided' : 'none',
      });

      // Use store action to submit - this updates the store automatically
      await submitComplianceReviewAction(
        data.complianceReviewOutcome,
        data.complianceReviewNotes || '',
        {
          isForesideReviewRequired: data.isForesideReviewRequired,
          isRetailUse: data.isRetailUse,
        }
      );

      // Reset form with cleared notes for append-only field
      reset({
        complianceReviewStatus: ComplianceReviewStatus.Completed,
        complianceReviewOutcome: data.complianceReviewOutcome,
        complianceReviewNotes: undefined, // Clear for append-only
        isForesideReviewRequired: data.isForesideReviewRequired,
        isRetailUse: data.isRetailUse,
      });

      // Increment key to force NoteHistory refresh
      setHistoryRefreshKey((prev) => prev + 1);

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
      SPContext.logger.success('ComplianceReviewForm: Review submitted successfully');
    } catch (submitError: unknown) {
      const errorMessage = submitError instanceof Error ? submitError.message : 'Failed to submit review';
      setError(errorMessage);
      scrollToFirstError();
      SPContext.logger.error('ComplianceReviewForm: Review submission failed', submitError);
    } finally {
      setIsSaving(false);
    }
  }, [itemId, scrollToFirstError, reset]);

  /**
   * Handle save progress (save without submitting)
   */
  const handleSaveProgress = React.useCallback(async (): Promise<void> => {
    if (!itemId) return;

    try {
      setIsSaving(true);
      setError(undefined);

      const formData = getValues();

      SPContext.logger.info('ComplianceReviewForm: Saving progress', {
        notes: formData.complianceReviewNotes ? 'provided' : 'none',
        outcome: formData.complianceReviewOutcome || 'none',
        isForesideReviewRequired: formData.isForesideReviewRequired,
        isRetailUse: formData.isRetailUse,
      });

      // Use dedicated workflow action for save progress
      await saveComplianceReviewProgress(itemId, {
        outcome: formData.complianceReviewOutcome,
        notes: formData.complianceReviewNotes,
        isForesideReviewRequired: formData.isForesideReviewRequired,
        isRetailUse: formData.isRetailUse,
      });

      // Reload request to update store with server data
      await loadRequest(itemId);

      // Reset form notes for append-only field
      reset({
        complianceReviewStatus: ComplianceReviewStatus.InProgress,
        complianceReviewOutcome: formData.complianceReviewOutcome,
        complianceReviewNotes: undefined, // Clear for append-only
        isForesideReviewRequired: formData.isForesideReviewRequired,
        isRetailUse: formData.isRetailUse,
      });

      // Increment key to force NoteHistory refresh
      setHistoryRefreshKey((prev) => prev + 1);

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      SPContext.logger.success('ComplianceReviewForm: Progress saved');
    } catch (saveError: unknown) {
      const errorMessage = saveError instanceof Error ? saveError.message : 'Failed to save progress';
      setError(errorMessage);
      SPContext.logger.error('ComplianceReviewForm: Save progress failed', saveError);
    } finally {
      setIsSaving(false);
    }
  }, [itemId, getValues, reset, loadRequest]);

  if (!currentRequest) {
    return null;
  }

  // Check if compliance review is applicable based on review audience
  const reviewAudience = currentRequest.reviewAudience;
  const isComplianceReviewRequired = reviewAudience === 'Compliance' || reviewAudience === 'Both';

  if (!isComplianceReviewRequired) {
    return null;
  }

  // Check if review is completed
  const isReviewCompleted = currentRequest.complianceReview?.status === ComplianceReviewStatus.Completed;
  const completedOutcome = currentRequest.complianceReview?.outcome;

  // When completed, collapse by default and show green header
  const shouldDefaultCollapse = isReviewCompleted || defaultCollapsed;

  // Get start date (when compliance review started - use complianceStatusUpdatedOn or submittedForReviewOn)
  const startedOn = currentRequest.complianceStatusUpdatedOn || currentRequest.submittedForReviewOn;

  // Calculate duration for header using business hours
  const durationMinutes = calculateDurationMinutes(
    startedOn,
    currentRequest.complianceReviewCompletedOn
  );

  // If completed, show read-only summary view
  if (isReviewCompleted) {
    return (
      <Card
        id='compliance-review-card'
        className='compliance-review-form compliance-review-form--completed'
        allowExpand={true}
        defaultExpanded={false}
      >
        <Header size='regular'>
          <WorkflowCardHeader
            title='Compliance Review'
            status='completed'
            outcome={toHeaderOutcome(completedOutcome)}
            startedOn={startedOn}
            completedOn={currentRequest.complianceReviewCompletedOn}
            completedBy={
              currentRequest.complianceReviewCompletedBy?.title
                ? { title: currentRequest.complianceReviewCompletedBy.title, email: currentRequest.complianceReviewCompletedBy.email }
                : undefined
            }
            durationMinutes={durationMinutes}
          />
        </Header>

        <Content padding='comfortable'>
          <Stack tokens={{ childrenGap: 16 }}>
            {/* Show note history read-only */}
            <FormContainer labelWidth='200px'>
              <FormItem fieldName='reviewNotes'>
                <FormLabel>Review Notes</FormLabel>
                <SPTextField
                  key={`compliance-review-notes-readonly-${historyRefreshKey}`}
                  name='complianceReviewNotes'
                  mode={SPTextFieldMode.MultiLine}
                  rows={2}
                  readOnly
                  disabled
                  appendOnly
                  itemId={itemId}
                  listNameOrId='Requests'
                  fieldInternalName='ComplianceReviewNotes'
                />
              </FormItem>
            </FormContainer>

            <Separator />

            {/* Compliance-specific fields - After Review Notes */}
            <FormContainer labelWidth='200px'>
              <FormItem fieldName='isForesideReviewRequired'>
                <FormLabel>Foreside Review Required</FormLabel>
                <Text>{currentRequest.complianceReview?.isForesideReviewRequired ? 'Yes' : 'No'}</Text>
              </FormItem>

              <FormItem fieldName='isRetailUse'>
                <FormLabel>Retail Use</FormLabel>
                <Text>{currentRequest.complianceReview?.isRetailUse ? 'Yes' : 'No'}</Text>
              </FormItem>
            </FormContainer>
          </Stack>
        </Content>
      </Card>
    );
  }

  return (
    <Card
      id='compliance-review-card'
      className='compliance-review-form'
      allowExpand={true}
      defaultExpanded={!shouldDefaultCollapse}
    >
      <Header size='regular'>
        <WorkflowCardHeader
          title='Compliance Review'
          status='in-progress'
          startedOn={startedOn}
          durationMinutes={durationMinutes}
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

          {/* Waiting on submitter message */}
          {reviewStatus === ComplianceReviewStatus.WaitingOnSubmitter ? (
            <MessageBar messageBarType={MessageBarType.info} isMultiline={false}>
              <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 8 }}>
                <Icon iconName='UserFollowed' />
                <Text>
                  Waiting for submitter to provide additional information.
                </Text>
              </Stack>
            </MessageBar>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              <Stack tokens={{ childrenGap: 20 }}>
                {/* Review Outcome Selection */}
                <FormContainer labelWidth='200px'>
                  <FormItem fieldName='complianceReviewOutcome'>
                    <FormLabel isRequired infoText='Select your review decision'>
                      Review Outcome
                    </FormLabel>
                    <SPChoiceField
                      name='complianceReviewOutcome'
                      choices={REVIEW_OUTCOME_CHOICES}
                      placeholder='Select an outcome...'
                    />
                  </FormItem>
                </FormContainer>

                {/* Review Notes */}
                <FormContainer labelWidth='200px'>
                  <FormItem fieldName='complianceReviewNotes'>
                    <FormLabel infoText='Detailed compliance review notes, comments, and recommendations'>
                      Review Notes
                    </FormLabel>
                    <SPTextField
                      key={`compliance-review-notes-${historyRefreshKey}`}
                      name='complianceReviewNotes'
                      placeholder='Provide detailed compliance review notes, comments, and recommendations'
                      mode={SPTextFieldMode.MultiLine}
                      rows={4}
                      maxLength={4000}
                      showCharacterCount
                      stylingMode='outlined'
                      spellCheck
                      appendOnly
                      itemId={itemId}
                      listNameOrId='Requests'
                      fieldInternalName='ComplianceReviewNotes'
                    />
                  </FormItem>
                </FormContainer>

                <Separator />

                {/* Compliance-specific fields - After Review Notes */}
                <FormContainer labelWidth='200px'>
                  <FormItem fieldName='isForesideReviewRequired'>
                    <FormLabel infoText='Indicate if Foreside review is required for this request'>
                      Foreside Review Required
                    </FormLabel>
                    <SPBooleanField
                      name='isForesideReviewRequired'
                      displayType={SPBooleanDisplayType.Toggle}
                      checkedText='Yes'
                      uncheckedText='No'
                      showText
                    />
                  </FormItem>

                  <FormItem fieldName='isRetailUse'>
                    <FormLabel infoText='Indicate if this will be used for retail purposes'>
                      Retail Use
                    </FormLabel>
                    <SPBooleanField
                      name='isRetailUse'
                      displayType={SPBooleanDisplayType.Toggle}
                      checkedText='Yes'
                      uncheckedText='No'
                      showText
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
                    {isSaving && <Spinner size={SpinnerSize.xSmall} styles={{ root: { marginRight: 8 } }} />}
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

export default ComplianceReviewForm;

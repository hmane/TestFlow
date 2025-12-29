/**
 * CloseoutForm Component
 *
 * Simple card for entering closeout information (Tracking ID and Final Notes).
 * Used when request status is "Closeout".
 *
 * Note: Request Summary and Review Results are shown in separate cards.
 * The Complete Closeout action is handled by RequestActions component.
 */

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';

// Fluent UI - tree-shaken imports
import { Stack } from '@fluentui/react/lib/Stack';

// spfx-toolkit - tree-shaken imports
import { Card, Header, Content } from 'spfx-toolkit/lib/components/Card';
import {
  FormContainer,
  FormItem,
  FormLabel,
  FormValue,
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
import { ReviewAudience } from '@appTypes/index';

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
 * CloseoutForm Component
 */
export const CloseoutForm: React.FC<ICloseoutFormProps> = ({
  defaultCollapsed = false,
  readOnly = false,
}) => {
  const { currentRequest, itemId } = useRequestStore();
  const { setCloseoutValues } = useCloseoutStore();

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
    });
  }, [trackingIdValue, closeoutNotesValue, setCloseoutValues]);

  if (!currentRequest) {
    return null;
  }

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
                <FormValue>
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
                </FormValue>
              </FormItem>
            </FormContainer>

            {/* Final Notes - only show in edit mode (field may be added later) */}
            {!readOnly && (
              <FormContainer labelWidth='150px'>
                <FormItem fieldName='closeoutNotes'>
                  <FormLabel infoText='Add any final notes or comments about this request'>
                    Closeout Notes
                  </FormLabel>
                  <FormValue>
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
                  </FormValue>
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

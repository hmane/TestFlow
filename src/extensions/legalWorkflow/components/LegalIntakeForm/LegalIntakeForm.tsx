/**
 * LegalIntakeForm Component
 *
 * Form for legal team to process intake and assign attorney
 * Used when request status is "Legal Intake"
 *
 * Features:
 * - Assign attorney (people picker)
 * - Attorney assign notes
 * - Review request details (read-only)
 * - Action buttons (Assign Attorney, Save Notes)
 */

import {
  DefaultButton,
  Icon,
  MessageBar,
  MessageBarType,
  PrimaryButton,
  Separator,
  Stack,
  Text,
} from '@fluentui/react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { Card } from 'spfx-toolkit/lib/components/Card';
import {
  FormContainer,
  FormItem,
  FormLabel,
  FormValue,
  FormProvider,
  FormErrorSummary,
  useScrollToError,
} from 'spfx-toolkit/lib/components/spForm';
import {
  SPTextField,
  SPTextFieldMode,
  SPUserField,
} from 'spfx-toolkit/lib/components/spFields';
import type { IPrincipal } from 'spfx-toolkit/lib/types';
import SPContext from 'spfx-toolkit/lib/utilities/context';
import { useRequestStore } from '../../../../stores/requestStore';
import '../RequestForm/RequestInfo.scss';
import './LegalIntakeForm.scss';

/**
 * Legal Intake form data
 */
interface ILegalIntakeFormData {
  attorney?: IPrincipal;
  attorneyAssignNotes?: string;
}

/**
 * LegalIntakeForm Component
 */
export const LegalIntakeForm: React.FC = () => {
  const { currentRequest, isLoading } = useRequestStore();
  const [showSuccess, setShowSuccess] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>(undefined);

  // React Hook Form setup
  const {
    control,
    handleSubmit,
    formState,
    watch,
  } = useForm<ILegalIntakeFormData>({
    defaultValues: {
      attorney: currentRequest?.legalReview?.assignedAttorney,
      attorneyAssignNotes: undefined, // This is not stored in ILegalReview, will be saved separately
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  // Access errors from formState directly (ensures proper subscription)
  // Note: isDirty removed - not needed as Save Notes is always enabled

  // Use scroll to error hook
  const { scrollToFirstError } = useScrollToError(formState as any);

  // Watch attorney field to enable/disable buttons
  const attorneyValue = watch('attorney');

  /**
   * Handle submit with attorney assigned (direct assignment)
   */
  const handleSubmitWithAttorney = React.useCallback(
    async (data: ILegalIntakeFormData): Promise<void> => {
      try {
        SPContext.logger.info('LegalIntakeForm: Submitting with attorney assigned', data);
        // TODO: Implement direct attorney assignment in store
        // This should move status to "In Review" with the assigned attorney
        setShowSuccess(true);

        setTimeout(() => {
          setShowSuccess(false);
        }, 5000);

        SPContext.logger.success('LegalIntakeForm: Submitted with attorney successfully');
      } catch (submitError: unknown) {
        const errorMessage =
          submitError instanceof Error ? submitError.message : 'Failed to submit';
        setError(errorMessage);
        scrollToFirstError();
        SPContext.logger.error('LegalIntakeForm: Submit failed', submitError);
      }
    },
    [scrollToFirstError]
  );

  /**
   * Handle submit to committee (for attorney assignment)
   */
  const handleSubmitToCommittee = React.useCallback(async (): Promise<void> => {
    try {
      SPContext.logger.info('LegalIntakeForm: Submitting to committee for attorney assignment');
      // TODO: Implement submit to committee in store
      // This should move status to "Assign Attorney" sub-status or similar
      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
      }, 5000);

      SPContext.logger.success('LegalIntakeForm: Submitted to committee successfully');
    } catch (submitError: unknown) {
      const errorMessage =
        submitError instanceof Error ? submitError.message : 'Failed to submit to committee';
      setError(errorMessage);
      SPContext.logger.error('LegalIntakeForm: Submit to committee failed', submitError);
    }
  }, []);

  /**
   * Handle save notes
   */
  const handleSaveNotes = React.useCallback(async (): Promise<void> => {
    try {
      SPContext.logger.info('LegalIntakeForm: Saving notes');
      // TODO: Implement save notes in store
      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);

      SPContext.logger.success('LegalIntakeForm: Notes saved');
    } catch (saveError: unknown) {
      const errorMessage = saveError instanceof Error ? saveError.message : 'Failed to save notes';
      setError(errorMessage);
      SPContext.logger.error('LegalIntakeForm: Save notes failed', saveError);
    }
  }, []);

  if (!currentRequest) {
    return null;
  }

  return (
    <FormProvider control={control as any} autoShowErrors={true}>
      <div className='legal-intake-form request-info'>
        <Stack
          tokens={{ childrenGap: 24 }}
          styles={{ root: { padding: '24px', maxWidth: '1200px', margin: '0 auto' } }}
        >
          {/* Header */}
          <Stack tokens={{ childrenGap: 8 }}>
            <Text variant='xxLarge' styles={{ root: { fontWeight: 600, color: '#323130' } }}>
              Legal Intake - Assign Attorney
            </Text>
            <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 8 }}>
              <Icon iconName='Tag' styles={{ root: { color: '#0078d4' } }} />
              <Text variant='large' styles={{ root: { color: '#605e5c' } }}>
                Request ID: {currentRequest.requestId}
              </Text>
            </Stack>
          </Stack>

        {/* Success message */}
        {showSuccess && (
          <MessageBar
            messageBarType={MessageBarType.success}
            isMultiline={false}
            onDismiss={() => setShowSuccess(false)}
            styles={{ root: { borderRadius: '4px' } }}
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
            styles={{ root: { borderRadius: '4px' } }}
          >
            {error}
          </MessageBar>
        )}

        {/* Form Error Summary */}
        <FormErrorSummary
          position='sticky'
          clickToScroll
          showFieldLabels
          maxErrors={10}
        />

        {/* Request Summary (Read-Only) */}
        <Card id='request-summary-card' className='form-section-card'>
          <Stack tokens={{ childrenGap: 16 }} styles={{ root: { padding: '24px' } }}>
            <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 12 }}>
              <div className='section-icon'>
                <Icon iconName='Info' styles={{ root: { fontSize: '20px', color: '#0078d4' } }} />
              </div>
              <Text variant='xLarge' styles={{ root: { fontWeight: 600 } }}>
                Request Summary
              </Text>
            </Stack>

            <Separator />

            <FormContainer labelWidth='200px'>
              <FormItem>
                <FormLabel>Request Type</FormLabel>
                <FormValue>{currentRequest.requestType}</FormValue>
              </FormItem>

              <FormItem>
                <FormLabel>Request Title</FormLabel>
                <FormValue>{currentRequest.requestTitle}</FormValue>
              </FormItem>

              <FormItem>
                <FormLabel>Purpose</FormLabel>
                <FormValue>{currentRequest.purpose}</FormValue>
              </FormItem>

              <FormItem>
                <FormLabel>Submission Type</FormLabel>
                <FormValue>{currentRequest.submissionType}</FormValue>
              </FormItem>

              <FormItem>
                <FormLabel>Target Return Date</FormLabel>
                <FormValue>
                  {currentRequest.targetReturnDate
                    ? typeof currentRequest.targetReturnDate === 'string'
                      ? new Date(currentRequest.targetReturnDate).toLocaleDateString()
                      : currentRequest.targetReturnDate.toLocaleDateString()
                    : 'N/A'}
                </FormValue>
              </FormItem>

              <FormItem>
                <FormLabel>Rush Request</FormLabel>
                <FormValue>
                  {currentRequest.isRushRequest ? (
                    <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 4 }}>
                      <Icon iconName='Warning' styles={{ root: { color: '#d13438' } }} />
                      <Text styles={{ root: { color: '#d13438', fontWeight: 600 } }}>Yes</Text>
                    </Stack>
                  ) : (
                    'No'
                  )}
                </FormValue>
              </FormItem>

              {currentRequest.isRushRequest && currentRequest.rushRationale && (
                <FormItem>
                  <FormLabel>Rush Rationale</FormLabel>
                  <FormValue>{currentRequest.rushRationale}</FormValue>
                </FormItem>
              )}

              <FormItem>
                <FormLabel>Submitted By</FormLabel>
                <FormValue>{currentRequest.submittedBy?.title || 'N/A'}</FormValue>
              </FormItem>

              <FormItem>
                <FormLabel>Submitted On</FormLabel>
                <FormValue>
                  {currentRequest.submittedOn
                    ? typeof currentRequest.submittedOn === 'string'
                      ? new Date(currentRequest.submittedOn).toLocaleString()
                      : currentRequest.submittedOn.toLocaleString()
                    : 'N/A'}
                </FormValue>
              </FormItem>
            </FormContainer>
          </Stack>
        </Card>

        {/* Attorney Assignment Form */}
        <Stack tokens={{ childrenGap: 20 }}>
          <Card id='attorney-assignment-card' className='form-section-card'>
            <Stack tokens={{ childrenGap: 16 }} styles={{ root: { padding: '24px' } }}>
              <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 12 }}>
                <div className='section-icon'>
                  <Icon
                    iconName='UserFollowed'
                    styles={{ root: { fontSize: '20px', color: '#0078d4' } }}
                  />
                </div>
                <Text variant='xLarge' styles={{ root: { fontWeight: 600 } }}>
                  Attorney Assignment
                </Text>
              </Stack>

              <Separator />

              <FormContainer labelWidth='200px'>
                {/* Assign Attorney */}
                <FormItem fieldName='attorney'>
                  <FormLabel infoText='Select an attorney to assign to this request'>
                    Assign Attorney
                  </FormLabel>
                  <FormValue>
                    <SPUserField
                      name='attorney'
                      placeholder='Search for attorney to assign (optional)'
                      allowMultiple={false}
                      showPhoto
                      showEmail
                      showJobTitle
                    />
                  </FormValue>
                </FormItem>

                {/* Attorney Assign Notes */}
                <FormItem fieldName='attorneyAssignNotes'>
                  <FormLabel infoText='Add any notes or instructions for the assigned attorney'>
                    Assignment Notes
                  </FormLabel>
                  <FormValue>
                    <SPTextField
                      name='attorneyAssignNotes'
                      placeholder='Add any notes or instructions'
                      mode={SPTextFieldMode.MultiLine}
                      rows={4}
                      maxLength={2000}
                      showCharacterCount
                      stylingMode='outlined'
                      spellCheck
                    />
                  </FormValue>
                </FormItem>
              </FormContainer>
            </Stack>
          </Card>

          {/* Action Buttons */}
          <Card id='action-buttons-card' className='action-buttons-card'>
            <Stack tokens={{ childrenGap: 16 }} styles={{ root: { padding: '24px' } }}>
              <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 12 }}>
                <Icon
                  iconName='Lightbulb'
                  styles={{ root: { fontSize: '20px', color: '#0078d4' } }}
                />
                <Text variant='xLarge' styles={{ root: { fontWeight: 600 } }}>
                  Actions
                </Text>
              </Stack>

              <Separator />

              <Text variant='medium' styles={{ root: { marginBottom: '12px', color: '#605e5c' } }}>
                {attorneyValue && attorneyValue.id
                  ? 'Attorney selected - Submit to proceed with review'
                  : 'No attorney selected - Submit to committee for assignment'}
              </Text>

              <Stack horizontal tokens={{ childrenGap: 12 }} wrap>
                {/* Conditional buttons based on attorney selection */}
                {attorneyValue && attorneyValue.id ? (
                  <PrimaryButton
                    text='Submit'
                    iconProps={{ iconName: 'Send' }}
                    onClick={handleSubmit(handleSubmitWithAttorney)}
                    disabled={isLoading}
                    styles={{
                      root: {
                        minWidth: '160px',
                        height: '44px',
                        borderRadius: '4px',
                      },
                    }}
                    ariaLabel='Submit with assigned attorney'
                  />
                ) : (
                  <PrimaryButton
                    text='Submit to Assign Attorney'
                    iconProps={{ iconName: 'ContactCardSettings' }}
                    onClick={handleSubmitToCommittee}
                    disabled={isLoading}
                    styles={{
                      root: {
                        minWidth: '200px',
                        height: '44px',
                        borderRadius: '4px',
                      },
                    }}
                    ariaLabel='Submit to committee for attorney assignment'
                  />
                )}

                <DefaultButton
                  text='Save Notes'
                  iconProps={{ iconName: 'Save' }}
                  onClick={handleSaveNotes}
                  disabled={isLoading}
                  styles={{
                    root: {
                      minWidth: '140px',
                      height: '44px',
                      borderRadius: '4px',
                    },
                  }}
                  ariaLabel='Save assignment notes'
                />

                <DefaultButton
                  text='Cancel'
                  iconProps={{ iconName: 'Cancel' }}
                  onClick={() => window.history.back()}
                  disabled={isLoading}
                  styles={{
                    root: {
                      minWidth: '120px',
                      height: '44px',
                      borderRadius: '4px',
                    },
                  }}
                  ariaLabel='Cancel and return'
                />
              </Stack>
            </Stack>
          </Card>
        </Stack>
        </Stack>
      </div>
    </FormProvider>
  );
};

export default LegalIntakeForm;

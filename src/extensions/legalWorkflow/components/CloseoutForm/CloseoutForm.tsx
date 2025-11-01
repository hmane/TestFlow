/**
 * CloseoutForm Component
 *
 * Form for closing out a request after reviews are complete
 * Used when request status is "Closeout"
 *
 * Features:
 * - Enter tracking ID (required)
 * - View review outcomes (read-only)
 * - Add final notes
 * - Complete closeout
 */

import {
  DefaultButton,
  Icon,
  IconButton,
  MessageBar,
  MessageBarType,
  PrimaryButton,
  Separator,
  Stack,
  Text,
} from '@fluentui/react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { SPContext } from 'spfx-toolkit';
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
} from 'spfx-toolkit/lib/components/spFields';
import { useRequestStore } from '../../../../stores/requestStore';
import { ReviewAudience } from '../../../../types';
import '../RequestForm/RequestInfo.scss';
import './CloseoutForm.scss';

/**
 * Closeout form data
 */
interface ICloseoutFormData {
  trackingId: string;
  finalNotes?: string;
}

/**
 * Form section component
 */
interface IFormSectionProps {
  title: string;
  description?: string;
  icon?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

const FormSection: React.FC<IFormSectionProps> = ({
  title,
  description,
  icon,
  children,
  collapsible = false,
  defaultCollapsed = false,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

  return (
    <Card id={`section-${title.toLowerCase().replace(/\s+/g, '-')}`} className='form-section-card'>
      <Stack tokens={{ childrenGap: 16 }} styles={{ root: { padding: '24px' } }}>
        <Stack
          horizontal
          verticalAlign='center'
          horizontalAlign='space-between'
          onClick={collapsible ? () => setIsCollapsed(!isCollapsed) : undefined}
          styles={{ root: { cursor: collapsible ? 'pointer' : 'default' } }}
        >
          <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 12 }}>
            {icon && (
              <div className='section-icon'>
                <Icon iconName={icon} styles={{ root: { fontSize: '20px', color: '#107c10' } }} />
              </div>
            )}
            <Stack tokens={{ childrenGap: 4 }}>
              <Text variant='xLarge' styles={{ root: { fontWeight: 600 } }}>
                {title}
              </Text>
              {description && (
                <Text variant='small' styles={{ root: { color: '#605e5c' } }}>
                  {description}
                </Text>
              )}
            </Stack>
          </Stack>
          {collapsible && (
            <IconButton
              iconProps={{ iconName: isCollapsed ? 'ChevronDown' : 'ChevronUp' }}
              title={isCollapsed ? 'Expand' : 'Collapse'}
            />
          )}
        </Stack>
        {!isCollapsed && (
          <>
            <Separator />
            {children}
          </>
        )}
      </Stack>
    </Card>
  );
};

/**
 * CloseoutForm Component
 */
export const CloseoutForm: React.FC = () => {
  const { currentRequest, isLoading } = useRequestStore();
  const [showSuccess, setShowSuccess] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>(undefined);

  // React Hook Form setup
  const {
    control,
    handleSubmit,
    formState,
  } = useForm<ICloseoutFormData>({
    defaultValues: {
      trackingId: currentRequest?.trackingId || '',
      finalNotes: '',
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  // Access errors from formState directly (ensures proper subscription)
  // Note: isDirty removed - not needed as Save Draft is always enabled

  // Use scroll to error hook
  const { scrollToFirstError } = useScrollToError(formState as any);

  /**
   * Get outcome badge
   */
  const getOutcomeBadge = (outcome?: string): React.ReactElement => {
    if (!outcome) {
      return <Text>Not Available</Text>;
    }

    let color = '#605e5c';
    let iconName = 'Unknown';

    if (outcome.toLowerCase().indexOf('approved') !== -1) {
      color = '#107c10';
      iconName = 'Completed';
    } else if (outcome.toLowerCase().indexOf('not approved') !== -1) {
      color = '#d13438';
      iconName = 'StatusErrorFull';
    } else {
      color = '#ff8c00';
      iconName = 'Warning';
    }

    return (
      <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 4 }}>
        <Icon iconName={iconName} styles={{ root: { color } }} />
        <Text styles={{ root: { color, fontWeight: 600 } }}>{outcome}</Text>
      </Stack>
    );
  };

  /**
   * Handle complete closeout
   */
  const onSubmit = React.useCallback(async (data: ICloseoutFormData): Promise<void> => {
    try {
      SPContext.logger.info('CloseoutForm: Completing closeout', data);
      // TODO: Implement closeout completion in store
      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
      }, 5000);

      SPContext.logger.success('CloseoutForm: Closeout completed successfully');
    } catch (submitError: unknown) {
      const errorMessage =
        submitError instanceof Error ? submitError.message : 'Failed to complete closeout';
      setError(errorMessage);
      scrollToFirstError();
      SPContext.logger.error('CloseoutForm: Closeout completion failed', submitError);
    }
  }, [scrollToFirstError]);

  /**
   * Handle save draft
   */
  const handleSaveDraft = React.useCallback(async (): Promise<void> => {
    try {
      SPContext.logger.info('CloseoutForm: Saving draft');
      // TODO: Implement save draft in store
      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);

      SPContext.logger.success('CloseoutForm: Draft saved');
    } catch (saveError: unknown) {
      const errorMessage = saveError instanceof Error ? saveError.message : 'Failed to save draft';
      setError(errorMessage);
      SPContext.logger.error('CloseoutForm: Save draft failed', saveError);
    }
  }, []);

  if (!currentRequest) {
    return null;
  }

  const showLegalReview =
    currentRequest.reviewAudience === ReviewAudience.Legal ||
    currentRequest.reviewAudience === ReviewAudience.Both;
  const showComplianceReview =
    currentRequest.reviewAudience === ReviewAudience.Compliance ||
    currentRequest.reviewAudience === ReviewAudience.Both;

  return (
    <FormProvider control={control as any} autoShowErrors={true}>
      <div className='closeout-form request-info'>
        <Stack
          tokens={{ childrenGap: 24 }}
          styles={{ root: { padding: '24px', maxWidth: '1200px', margin: '0 auto' } }}
        >
          {/* Header */}
          <Stack tokens={{ childrenGap: 8 }}>
            <Text variant='xxLarge' styles={{ root: { fontWeight: 600, color: '#323130' } }}>
              Request Closeout
            </Text>
            <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 8 }}>
              <Icon iconName='Tag' styles={{ root: { color: '#107c10' } }} />
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
              <Text>Closeout completed successfully!</Text>
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

        {/* Request Summary */}
        <FormSection
          title='Request Summary'
          description='Review the request details'
          icon='Info'
          collapsible={true}
        >
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
        </FormSection>

        {/* Review Results */}
        <FormSection
          title='Review Results'
          description='Summary of all reviews'
          icon='DocumentApproval'
        >
          <FormContainer labelWidth='200px'>
            {showLegalReview && (
              <>
                <FormItem>
                  <FormLabel>Legal Review Status</FormLabel>
                  <FormValue>{currentRequest.legalReview?.status || 'Not Available'}</FormValue>
                </FormItem>

                <FormItem>
                  <FormLabel>Legal Review Outcome</FormLabel>
                  <FormValue>{getOutcomeBadge(currentRequest.legalReview?.outcome)}</FormValue>
                </FormItem>

                {currentRequest.legalReview?.reviewNotes && (
                  <FormItem>
                    <FormLabel>Legal Review Notes</FormLabel>
                    <FormValue>{currentRequest.legalReview.reviewNotes}</FormValue>
                  </FormItem>
                )}
              </>
            )}

            {showComplianceReview && (
              <>
                <FormItem>
                  <FormLabel>Compliance Review Status</FormLabel>
                  <FormValue>
                    {currentRequest.complianceReview?.status || 'Not Available'}
                  </FormValue>
                </FormItem>

                <FormItem>
                  <FormLabel>Compliance Review Outcome</FormLabel>
                  <FormValue>{getOutcomeBadge(currentRequest.complianceReview?.outcome)}</FormValue>
                </FormItem>

                {currentRequest.complianceReview?.reviewNotes && (
                  <FormItem>
                    <FormLabel>Compliance Review Notes</FormLabel>
                    <FormValue>{currentRequest.complianceReview.reviewNotes}</FormValue>
                  </FormItem>
                )}
              </>
            )}
          </FormContainer>
        </FormSection>

        {/* Closeout Form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack tokens={{ childrenGap: 20 }}>
            <FormSection
              title='Closeout Information'
              description='Complete the request closeout'
              icon='Completed'
            >
              <FormContainer labelWidth='200px'>
                {/* Tracking ID */}
                <FormItem fieldName='trackingId'>
                  <FormLabel isRequired infoText='Enter the tracking ID assigned to this request'>
                    Tracking ID
                  </FormLabel>
                  <FormValue>
                    <SPTextField
                      name='trackingId'
                      placeholder='Enter tracking ID for this request'
                      mode={SPTextFieldMode.SingleLine}
                      maxLength={50}
                      showCharacterCount
                      stylingMode='outlined'
                    />
                  </FormValue>
                </FormItem>

                {/* Final Notes */}
                <FormItem fieldName='finalNotes'>
                  <FormLabel infoText='Add any final notes or comments about this request'>
                    Final Notes
                  </FormLabel>
                  <FormValue>
                    <SPTextField
                      name='finalNotes'
                      placeholder='Add any final notes or comments about this request'
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
            </FormSection>

            {/* Action Buttons */}
            <Card id='action-buttons-card' className='action-buttons-card'>
              <Stack
                horizontal
                tokens={{ childrenGap: 12 }}
                horizontalAlign='start'
                styles={{ root: { padding: '20px' } }}
              >
                <PrimaryButton
                  text='Complete Closeout'
                  iconProps={{ iconName: 'CompletedSolid' }}
                  type='submit'
                  disabled={isLoading}
                  styles={{
                    root: {
                      minWidth: '180px',
                      height: '40px',
                      borderRadius: '4px',
                      backgroundColor: '#107c10',
                      borderColor: '#107c10',
                    },
                    rootHovered: {
                      backgroundColor: '#0e6b0e',
                      borderColor: '#0e6b0e',
                    },
                  }}
                />
                <DefaultButton
                  text='Save Draft'
                  iconProps={{ iconName: 'Save' }}
                  onClick={handleSaveDraft}
                  disabled={isLoading}
                  styles={{
                    root: {
                      minWidth: '140px',
                      height: '40px',
                      borderRadius: '4px',
                    },
                  }}
                />
                <DefaultButton
                  text='Cancel'
                  iconProps={{ iconName: 'Cancel' }}
                  onClick={() => window.history.back()}
                  disabled={isLoading}
                  styles={{
                    root: {
                      minWidth: '120px',
                      height: '40px',
                      borderRadius: '4px',
                    },
                  }}
                />
              </Stack>
            </Card>
          </Stack>
        </form>
      </Stack>
      </div>
    </FormProvider>
  );
};

export default CloseoutForm;

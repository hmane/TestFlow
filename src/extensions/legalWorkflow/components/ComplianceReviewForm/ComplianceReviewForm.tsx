/**
 * ComplianceReviewForm Component
 *
 * Form for compliance team to conduct compliance review
 * Used when request status is "In Review" and review audience includes Compliance
 *
 * Features:
 * - Update compliance review status
 * - Provide review outcome
 * - Add review notes
 * - Compliance-specific fields (Foreside, Retail Use)
 * - View request details
 * - Document management
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
  SPBooleanField,
  SPBooleanDisplayType,
} from 'spfx-toolkit/lib/components/spFields';
import { useRequestStore } from '../../../../stores/requestStore';
import { ComplianceReviewStatus, ReviewOutcome } from '../../../../types';
import '../RequestForm/RequestInfo.scss';
import './ComplianceReviewForm.scss';

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
                <Icon iconName={icon} styles={{ root: { fontSize: '20px', color: '#ff8c00' } }} />
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
 * ComplianceReviewForm Component
 */
export const ComplianceReviewForm: React.FC = () => {
  const { currentRequest, isLoading } = useRequestStore();
  const [showSuccess, setShowSuccess] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>(undefined);

  // React Hook Form setup
  const {
    control,
    handleSubmit,
    watch,
    formState,
  } = useForm<IComplianceReviewFormData>({
    defaultValues: {
      complianceReviewStatus:
        currentRequest?.complianceReview?.status || ComplianceReviewStatus.NotStarted,
      complianceReviewOutcome: currentRequest?.complianceReview?.outcome,
      complianceReviewNotes: currentRequest?.complianceReview?.reviewNotes,
      isForesideReviewRequired: currentRequest?.complianceReview?.isForesideReviewRequired || false,
      isRetailUse: currentRequest?.complianceReview?.isRetailUse || false,
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  // Access errors from formState directly (ensures proper subscription)
  // Note: isDirty removed - not needed as Save Progress is always enabled

  // Use scroll to error hook
  const { scrollToFirstError } = useScrollToError(formState as any);

  const reviewStatus = watch('complianceReviewStatus');
  const reviewNotes = watch('complianceReviewNotes');

  /**
   * Handle complete review
   */
  const onSubmit = React.useCallback(async (data: IComplianceReviewFormData): Promise<void> => {
    try {
      SPContext.logger.info('ComplianceReviewForm: Completing review', data);
      // TODO: Implement review completion in store
      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
      }, 5000);

      SPContext.logger.success('ComplianceReviewForm: Review completed successfully');
    } catch (submitError: unknown) {
      const errorMessage =
        submitError instanceof Error ? submitError.message : 'Failed to complete review';
      setError(errorMessage);
      scrollToFirstError();
      SPContext.logger.error('ComplianceReviewForm: Review completion failed', submitError);
    }
  }, [scrollToFirstError]);

  /**
   * Handle save progress
   */
  const handleSaveProgress = React.useCallback(async (): Promise<void> => {
    try {
      SPContext.logger.info('ComplianceReviewForm: Saving progress');
      // TODO: Implement save progress in store
      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);

      SPContext.logger.success('ComplianceReviewForm: Progress saved');
    } catch (saveError: unknown) {
      const errorMessage =
        saveError instanceof Error ? saveError.message : 'Failed to save progress';
      setError(errorMessage);
      SPContext.logger.error('ComplianceReviewForm: Save progress failed', saveError);
    }
  }, []);

  /**
   * Handle Approve
   */
  const handleApprove = React.useCallback(async (): Promise<void> => {
    try {
      SPContext.logger.info('ComplianceReviewForm: Approving request');
      // TODO: Update status to Completed, outcome to Approved
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      SPContext.logger.success('ComplianceReviewForm: Request approved');
    } catch (approveError: unknown) {
      const errorMessage = approveError instanceof Error ? approveError.message : 'Failed to approve';
      setError(errorMessage);
      SPContext.logger.error('ComplianceReviewForm: Approve failed', approveError);
    }
  }, [reviewNotes]);

  /**
   * Handle Approve with Comments
   */
  const handleApproveWithComments = React.useCallback(async (): Promise<void> => {
    try {
      SPContext.logger.info('ComplianceReviewForm: Approving with comments');
      // TODO: Update status to Completed, outcome to ApprovedWithComments
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      SPContext.logger.success('ComplianceReviewForm: Request approved with comments');
    } catch (approveError: unknown) {
      const errorMessage = approveError instanceof Error ? approveError.message : 'Failed to approve with comments';
      setError(errorMessage);
      SPContext.logger.error('ComplianceReviewForm: Approve with comments failed', approveError);
    }
  }, [reviewNotes]);

  /**
   * Handle Not Approved
   */
  const handleNotApproved = React.useCallback(async (): Promise<void> => {
    try {
      SPContext.logger.info('ComplianceReviewForm: Not approving request');
      // TODO: Update status to Completed, outcome to NotApproved
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      SPContext.logger.success('ComplianceReviewForm: Request not approved');
    } catch (notApprovedError: unknown) {
      const errorMessage = notApprovedError instanceof Error ? notApprovedError.message : 'Failed to mark not approved';
      setError(errorMessage);
      SPContext.logger.error('ComplianceReviewForm: Not approved failed', notApprovedError);
    }
  }, [reviewNotes]);

  /**
   * Handle Send to Submitter
   */
  const handleSendToSubmitter = React.useCallback(async (): Promise<void> => {
    try {
      SPContext.logger.info('ComplianceReviewForm: Sending to submitter');
      // TODO: Update status to WaitingOnSubmitter
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      SPContext.logger.success('ComplianceReviewForm: Sent to submitter');
    } catch (sendError: unknown) {
      const errorMessage = sendError instanceof Error ? sendError.message : 'Failed to send to submitter';
      setError(errorMessage);
      SPContext.logger.error('ComplianceReviewForm: Send to submitter failed', sendError);
    }
  }, [reviewNotes]);

  if (!currentRequest) {
    return null;
  }

  return (
    <FormProvider control={control as any} autoShowErrors={true}>
      <div className='compliance-review-form request-info'>
        <Stack
          tokens={{ childrenGap: 24 }}
          styles={{ root: { padding: '24px', maxWidth: '1200px', margin: '0 auto' } }}
        >
          {/* Header */}
          <Stack tokens={{ childrenGap: 8 }}>
            <Text variant='xxLarge' styles={{ root: { fontWeight: 600, color: '#323130' } }}>
              Compliance Review
            </Text>
            <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 8 }}>
              <Icon iconName='Tag' styles={{ root: { color: '#ff8c00' } }} />
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
              <FormLabel>Purpose</FormLabel>
              <FormValue>{currentRequest.purpose}</FormValue>
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

            {currentRequest.isRushRequest && (
              <FormItem>
                <FormLabel>Rush Request</FormLabel>
                <FormValue>
                  π
                  <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 4 }}>
                    <Icon iconName='Warning' styles={{ root: { color: '#d13438' } }} />
                    <Text styles={{ root: { color: '#d13438', fontWeight: 600 } }}>
                      Yes - {currentRequest.rushRationale}
                    </Text>
                  </Stack>
                </FormValue>
              </FormItem>
            )}
          </FormContainer>
        </FormSection>

        {/* Compliance Review Form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack tokens={{ childrenGap: 20 }}>
            <FormSection
              title='Compliance Review'
              description='Provide your compliance review and recommendations'
              icon='ComplianceAudit'
            >
              {/* Show waiting message if status is WaitingOnSubmitter */}
              {reviewStatus === ComplianceReviewStatus.WaitingOnSubmitter ? (
                <MessageBar
                  messageBarType={MessageBarType.info}
                  isMultiline={false}
                >
                  <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 8 }}>
                    <Icon iconName='UserFollowed' />
                    <Text>
                      Waiting for submitter to provide additional information. You will be notified when
                      they respond.
                    </Text>
                  </Stack>
                </MessageBar>
              ) : (
                <FormContainer labelWidth='220px'>
                  {/* Foreside Review Required */}
                  <FormItem fieldName='isForesideReviewRequired'>
                    <FormLabel infoText='Indicate if Foreside review is required for this request'>
                      Foreside Review Required
                    </FormLabel>
                    <FormValue>
                      <SPBooleanField
                        name='isForesideReviewRequired'
                        displayType={SPBooleanDisplayType.Toggle}
                        checkedText='Yes'
                        uncheckedText='No'
                        showText
                      />
                    </FormValue>
                  </FormItem>

                  {/* Retail Use */}
                  <FormItem fieldName='isRetailUse'>
                    <FormLabel infoText='Indicate if this will be used for retail purposes'>
                      Retail Use
                    </FormLabel>
                    <FormValue>
                      <SPBooleanField
                        name='isRetailUse'
                        displayType={SPBooleanDisplayType.Toggle}
                        checkedText='Yes'
                        uncheckedText='No'
                        showText
                      />
                    </FormValue>
                  </FormItem>

                  {/* Review Notes */}
                  <FormItem fieldName='complianceReviewNotes'>
                    <FormLabel infoText='Detailed compliance review notes, comments, and recommendations'>
                      Review Notes
                    </FormLabel>
                    <FormValue>
                      <SPTextField
                        name='complianceReviewNotes'
                        placeholder='Provide detailed compliance review notes, comments, and recommendations'
                        mode={SPTextFieldMode.MultiLine}
                        rows={6}
                        maxLength={4000}
                        showCharacterCount
                        stylingMode='outlined'
                        spellCheck
                      />
                    </FormValue>
                  </FormItem>
                </FormContainer>
              )}
            </FormSection>

            {/* Documents Section - Reference to attachments */}
            <FormSection
              title='Documents'
              description='Request documents are available in the Attachments section below'
              icon='PageList'
              collapsible={true}
            >
              <FormContainer labelWidth='200px'>
                <FormItem>
                  <div style={{ padding: '16px', background: '#f3f2f1', borderRadius: '4px', border: '1px solid #edebe9' }}>
                    <Text variant='medium' styles={{ root: { color: '#605e5c' } }}>
                      All request documents (Review and Supplemental) are available in the <strong>Attachments</strong> section.
                      Scroll down to view and download the documents submitted with this request.
                    </Text>
                  </div>
                </FormItem>
              </FormContainer>
            </FormSection>

            {/* Action Buttons - Status-based */}
            <Card id='action-buttons-card' className='action-buttons-card'>
              <Stack tokens={{ childrenGap: 12 }} styles={{ root: { padding: '20px' } }}>
                {/* If WaitingOnSubmitter: Show only Save Progress */}
                {reviewStatus === ComplianceReviewStatus.WaitingOnSubmitter ? (
                  <Stack horizontal tokens={{ childrenGap: 12 }} horizontalAlign='start'>
                    <DefaultButton
                      text='Save Progress'
                      iconProps={{ iconName: 'Save' }}
                      onClick={handleSaveProgress}
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
                      text='Back'
                      iconProps={{ iconName: 'Back' }}
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
                ) : (
                  /* If WaitingOnCompliance: Show review action buttons */
                  <>
                    <Stack horizontal tokens={{ childrenGap: 12 }} horizontalAlign='start' wrap>
                      <PrimaryButton
                        text='Approve'
                        iconProps={{ iconName: 'Completed' }}
                        onClick={handleApprove}
                        disabled={isLoading}
                        styles={{
                          root: {
                            minWidth: '140px',
                            height: '40px',
                            borderRadius: '4px',
                            backgroundColor: '#107c10',
                            borderColor: '#107c10',
                          },
                          rootHovered: {
                            backgroundColor: '#0b5a0b',
                            borderColor: '#0b5a0b',
                          },
                        }}
                      />
                      <PrimaryButton
                        text='Approve with Comments'
                        iconProps={{ iconName: 'CompletedSolid' }}
                        onClick={handleApproveWithComments}
                        disabled={isLoading}
                        styles={{
                          root: {
                            minWidth: '180px',
                            height: '40px',
                            borderRadius: '4px',
                          },
                        }}
                      />
                      <DefaultButton
                        text='Not Approved'
                        iconProps={{ iconName: 'Cancel' }}
                        onClick={handleNotApproved}
                        disabled={isLoading}
                        styles={{
                          root: {
                            minWidth: '140px',
                            height: '40px',
                            borderRadius: '4px',
                            color: '#a4262c',
                            borderColor: '#a4262c',
                          },
                          rootHovered: {
                            color: '#8b1f28',
                            borderColor: '#8b1f28',
                          },
                        }}
                      />
                      <DefaultButton
                        text='Send to Submitter'
                        iconProps={{ iconName: 'Reply' }}
                        onClick={handleSendToSubmitter}
                        disabled={isLoading}
                        styles={{
                          root: {
                            minWidth: '160px',
                            height: '40px',
                            borderRadius: '4px',
                            color: '#d83b01',
                            borderColor: '#d83b01',
                          },
                          rootHovered: {
                            color: '#b22e00',
                            borderColor: '#b22e00',
                          },
                        }}
                      />
                    </Stack>

                    <Stack horizontal tokens={{ childrenGap: 12 }} horizontalAlign='start'>
                      <DefaultButton
                        text='Save Progress'
                        iconProps={{ iconName: 'Save' }}
                        onClick={handleSaveProgress}
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
                        text='Back'
                        iconProps={{ iconName: 'Back' }}
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
                  </>
                )}
              </Stack>
            </Card>
          </Stack>
        </form>
      </Stack>
      </div>
    </FormProvider>
  );
};

export default ComplianceReviewForm;

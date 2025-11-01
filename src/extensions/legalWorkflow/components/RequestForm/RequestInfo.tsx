/**
 * RequestInfo Component
 *
 * Enhanced request form using spfx-toolkit SPForm components
 * Modern UX with SharePoint-aware SPField controls
 *
 * Features:
 * - SPForm components for consistent styling
 * - SPField controls for SharePoint data integration
 * - Sectioned layout with cards
 * - Auto-save functionality
 * - Approval integration
 * - Document upload
 */

import {
  ILegalRequest,
  IPrincipal,
  RequestType,
} from '@appTypes/index';
import { useWorkflowStepper } from '@components/WorkflowStepper/useWorkflowStepper';
import { RequestFormProvider } from '@contexts/RequestFormContext';
import { useNotification } from '@contexts/NotificationContext';
import {
  Icon,
  MessageBar,
  MessageBarType,
  Stack,
  Text,
} from '@fluentui/react';
import { useRequestStore } from '@stores/requestStore';
import { useSubmissionItemsStore } from '@stores/submissionItemsStore';
import * as React from 'react';
import { useForm, FormProvider as RHFFormProvider, FieldError } from 'react-hook-form';
import { SPContext } from 'spfx-toolkit';
import { Card } from 'spfx-toolkit/lib/components/Card';
import { FormProvider as SPFormProvider, FormErrorSummary } from 'spfx-toolkit/lib/components/spForm';
import type { IRequestFormProps } from '../RequestContainer';
import { useRequestInfoActions } from './useRequestInfoActions';
import {
  AdditionalPartiesSection,
  BasicInfoSection,
  DistributionAudienceSection,
  PriorSubmissionsSection,
} from './RequestInfoSections';
import './RequestInfo.scss';

/**
 * Shared style constants to prevent recreation on every render
 */
const FORM_CONTAINER_STYLES = { root: { padding: '24px', width: '100%', margin: '0' } };
const FORM_CONTAINER_TOKENS = { childrenGap: 24 };
const HEADER_TOKENS = { childrenGap: 8 };
const TAG_ICON_STYLES = { root: { color: '#0078d4' } };
const MESSAGE_BAR_STYLES = { root: { borderRadius: '4px' } };
const PAGE_TITLE_STYLES = { root: { fontWeight: 600 as const, color: '#323130' } };
const REQUEST_ID_TEXT_STYLES = { root: { color: '#605e5c' } };
const FORM_SECTIONS_TOKENS = { childrenGap: 20 };

const mapPrincipalToControllerValue = (principal: IPrincipal): any => {
  if (!principal) {
    return undefined;
  }

  const numericId = Number(principal.id);
  const hasNumericId = !isNaN(numericId);
  const titleFallback = principal.title ?? principal.email ?? principal.loginName ?? principal.value;
  const loginFallback = principal.loginName ?? principal.value ?? principal.email ?? principal.title;
  const safeTitle = titleFallback || (principal.id ? `User ${principal.id}` : undefined);
  const safeLogin = loginFallback || (principal.id ? String(principal.id) : undefined);

  if (!safeTitle && !safeLogin) {
    return undefined;
  }

  return {
    ...principal,
    title: safeTitle ?? '',
    loginName: safeLogin,
    value: principal.value ?? safeLogin ?? safeTitle ?? '',
    id: principal.id,
    Id: hasNumericId ? numericId : undefined,
    Title: safeTitle ?? '',
    EMail: principal.email,
    Email: principal.email,
    Name: safeLogin ?? safeTitle ?? '',
    LoginName: safeLogin ?? safeTitle ?? '',
    key: safeLogin ?? safeTitle ?? '',
    text: safeTitle ?? safeLogin ?? '',
  };
};

/**
 * RequestInfo Component
 */
export const RequestInfo: React.FC<IRequestFormProps> = ({ itemId, renderApprovalsAndActions = true, children }) => {
  const {
    currentRequest,
    saveAsDraft,
    updateMultipleFields,
    isLoading,
    error,
  } = useRequestStore();
  const { items: submissionItems } = useSubmissionItemsStore();
  const { showSuccess: showSuccessNotification, showError: showErrorNotification } = useNotification();

  // React Hook Form setup
  const formMethods = useForm<ILegalRequest>({
    // Don't use resolver for now - will validate on save/submit action
    // resolver: zodResolver(requestInformationSchema),
    defaultValues: currentRequest || ({
      additionalParty: [],
      requestTitle: '',
      purpose: '',
      submissionType: '',
      submissionItem: '',
      targetReturnDate: undefined,
      reviewAudience: '',
      distributionMethod: [],
      dateOfFirstUse: undefined,
      priorSubmissionNotes: '',
    } as unknown as ILegalRequest),
    mode: 'onSubmit', // Validate on submit, then revalidate on change
    reValidateMode: 'onChange', // After first submit, revalidate on every change
  });

  const {
    control,
    handleSubmit,
    formState: { isDirty, errors, isSubmitted },
    watch,
    setValue,
    setError,
    clearErrors,
  } = formMethods;

  React.useEffect(() => {
    if (!currentRequest) {
      return;
    }
    if (process.env.NODE_ENV !== 'production') {
      SPContext.logger.info('RequestInfo: currentRequest.additionalParty (raw)', currentRequest.additionalParty);
    }

    // submissionItem is now a text field, no lookup mapping needed
    if (currentRequest.submissionItem) {
      setValue('submissionItem', currentRequest.submissionItem, {
        shouldDirty: false,
      });
    }

    if (currentRequest.submissionItemOther) {
      setValue('submissionItemOther', currentRequest.submissionItemOther, {
        shouldDirty: false,
      });
    }

    // Always ensure additionalParty is an array (even if empty)
    if (Array.isArray(currentRequest.additionalParty)) {
      if (currentRequest.additionalParty.length > 0) {
        const enriched = currentRequest.additionalParty
          .map(mapPrincipalToControllerValue)
          .filter(Boolean);

        if (enriched.length > 0) {
          if (process.env.NODE_ENV !== 'production') {
            SPContext.logger.info('RequestInfo: Setting additionalParty form value', enriched);
          }
          setValue('additionalParty', enriched as ILegalRequest['additionalParty'], {
            shouldDirty: false,
          });
        } else {
          setValue('additionalParty', [], { shouldDirty: false });
        }
      } else {
        setValue('additionalParty', [], { shouldDirty: false });
      }
    } else {
      // If undefined, set to empty array
      setValue('additionalParty', [], { shouldDirty: false });
    }
  }, [currentRequest, setValue]);

  const readFormValues = React.useCallback(() => watch(), [watch]);

  const {
    onSubmit,
    handleSaveDraft,
    handleClose,
    handleCancelRequest,
    handlePutOnHold,
  } = useRequestInfoActions({
    itemId,
    watch: readFormValues,
    updateMultipleFields,
    saveAsDraft,
    setError,
    clearErrors,
    showSuccessNotification,
    showErrorNotification,
  });

  const shouldRenderChildren = renderApprovalsAndActions || !!children;

  /**
   * Get submission items for dropdown
   */
  /**
   * Handle step click - memoized to prevent recreation
   */
  const handleStepClick = React.useCallback((step: any) => {
    SPContext.logger.info('RequestInfo: Step clicked', { stepId: step.id || step });
  }, []);

  /**
   * Render workflow stepper in progress mode (not informational)
   * Shows actual progress with completed, current, and pending steps
   */
  const { renderStepper } = useWorkflowStepper({
    requestType: currentRequest?.requestType || RequestType.Communication,
    currentStatus: currentRequest?.status,
    mode: 'progress', // Show progress, not full step details
    onStepClick: handleStepClick,
  });

  /**
   * Watch for request type and other fields to show conditional fields
   */
  const requestType = watch('requestType');
  const isRushRequest = watch('isRushRequest');
  const targetReturnDate = watch('targetReturnDate');
  const submissionItemSelection = watch('submissionItem'); // Now a string (title)
  const priorSubmissions = watch('priorSubmissions');
  const hasSubmissionItemSelection = !!submissionItemSelection;

  const handlePriorSubmissionsChange = React.useCallback(
    (value: ILegalRequest['priorSubmissions']) => {
      setValue('priorSubmissions', value, { shouldDirty: true });
    },
    [setValue]
  );

  /**
   * Calculate business days between two dates (excluding weekends)
   */
  const calculateBusinessDays = React.useCallback((start: Date, end: Date): number => {
    let count = 0;
    const currentDate = new Date(start.getTime());

    while (currentDate < end) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
        count++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return count;
  }, []);

  /**
   * Calculate if request is rush based on target return date and submission item turnaround time
   */
  const calculatedIsRush = React.useMemo((): boolean => {
    if (!targetReturnDate || !submissionItemSelection) {
      return false;
    }

    // Find submission item by title (submissionItemSelection is now a string)
    const filteredItems = submissionItems.filter((item: any) => item.title === submissionItemSelection);
    const selectedSubmissionItem = filteredItems.length > 0 ? filteredItems[0] : undefined;

    if (!selectedSubmissionItem || !selectedSubmissionItem.turnAroundTimeInDays) {
      return false;
    }

    // Create new Date objects to avoid mutating
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Always create a new Date object to avoid mutations
    const targetDate = new Date(typeof targetReturnDate === 'string' ? targetReturnDate : targetReturnDate.getTime());
    targetDate.setHours(0, 0, 0, 0);

    const businessDaysAvailable = calculateBusinessDays(today, targetDate);
    const requiredBusinessDays = selectedSubmissionItem.turnAroundTimeInDays;

    // Rush if available time is less than required turnaround time
    return businessDaysAvailable < requiredBusinessDays;
  }, [targetReturnDate, submissionItemSelection, submissionItems, calculateBusinessDays]);

  /**
   * Update isRushRequest field when calculated value changes
   */
  React.useEffect(() => {
    if (targetReturnDate && submissionItemSelection && calculatedIsRush !== isRushRequest) {
      setValue('isRushRequest', calculatedIsRush, { shouldDirty: true });
    }
  }, [calculatedIsRush, isRushRequest, targetReturnDate, submissionItemSelection, setValue]);

  /**
   * Scroll to first error field when errors change
   */
  React.useEffect(() => {
    if (isSubmitted && Object.keys(errors).length > 0) {
      // Get first error field name
      const firstErrorField = Object.keys(errors)[0];

      SPContext.logger.info('Scrolling to first error field:', firstErrorField);

      // Try multiple selectors to find the field (handles DevExtreme/SPField wrappers)
      let fieldElement: Element | null = null;
      let focusElement: HTMLElement | null = null;

      // Strategy 1: Find by name attribute (direct input)
      fieldElement = document.querySelector(`[name="${firstErrorField}"]`);

      // Strategy 2: Find DevExtreme component container, then find input inside
      if (!fieldElement) {
        const dxContainer = document.querySelector(`[data-field="${firstErrorField}"]`);
        if (dxContainer) {
          fieldElement = dxContainer;
          focusElement = dxContainer.querySelector('input, textarea, select') as HTMLElement;
        }
      }

      // Strategy 3: Find by aria-label or aria-labelledby
      if (!fieldElement) {
        fieldElement = document.querySelector(`[aria-label*="${firstErrorField}"]`);
      }

      // Strategy 4: Search for input within FormItem containers
      if (!fieldElement) {
        // Get all form items
        const formItems = document.querySelectorAll('.form-item, [class*="FormItem"]');
        for (let i = 0; i < formItems.length; i++) {
          const item = formItems[i];
          // Check if this form item contains an element with our field name
          const input = item.querySelector(`[name="${firstErrorField}"]`);
          if (input) {
            fieldElement = item; // Scroll to the form item container
            focusElement = input as HTMLElement;
            break;
          }

          // Also check for DevExtreme inputs inside
          const dxInput = item.querySelector('input, textarea, select, .dx-texteditor-input');
          if (dxInput) {
            const nameAttr = dxInput.getAttribute('name');
            if (nameAttr === firstErrorField) {
              fieldElement = item;
              focusElement = dxInput as HTMLElement;
              break;
            }
          }
        }
      }

      if (fieldElement) {
        SPContext.logger.info('Found field element:', fieldElement);

        // Expand the form card if it's collapsed
        const formCard = document.getElementById('request-form-card');
        if (formCard) {
          const cardHeader = formCard.querySelector('.card-header');
          const cardBody = formCard.querySelector('.card-body');

          if (cardBody && cardHeader) {
            const isCollapsed = window.getComputedStyle(cardBody).display === 'none';
            if (isCollapsed) {
              SPContext.logger.info('Expanding collapsed card');
              (cardHeader as HTMLElement).click();
            }
          }
        }

        // Wait for card expansion animation, then scroll
        setTimeout(() => {
          fieldElement!.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });

          SPContext.logger.info('Scrolled to element');

          // Focus the actual input element
          setTimeout(() => {
            const elementToFocus = focusElement || fieldElement;
            if (elementToFocus instanceof HTMLElement) {
              // For DevExtreme components, find the actual input
              let actualInput = elementToFocus;
              if (!elementToFocus.matches('input, textarea, select')) {
                const foundInput = elementToFocus.querySelector('input, textarea, select, .dx-texteditor-input');
                if (foundInput) {
                  actualInput = foundInput as HTMLElement;
                }
              }

              actualInput.focus();
              SPContext.logger.info('Focused element:', actualInput);
            }
          }, 100);
        }, 300);
      } else {
        SPContext.logger.warn('Could not find element for field:', firstErrorField);
      }
    }
  }, [errors, isSubmitted]);

  /**
   * Convert React Hook Form errors to validation errors array
   */
  const validationErrorsFromForm = React.useMemo(() => {
    if (!isSubmitted || Object.keys(errors).length === 0) {
      return [];
    }

    return Object.keys(errors).map((fieldName) => {
      const error = errors[fieldName as keyof typeof errors] as FieldError | undefined;
      if (!error || !error.message) {
        return null;
      }

      // Format field name for display
      const displayName = fieldName
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str: string) => str.toUpperCase())
        .trim();

      return {
        field: fieldName,
        message: `${displayName}: ${error.message}`,
      };
    }).filter((item): item is { field: string; message: string } => item !== null);
  }, [errors, isSubmitted]);

  /**
   * Prepare context value
   */
  const contextValue = React.useMemo(
    () => ({
      control,
      isDirty,
      isLoading,
      itemId,
      status: currentRequest?.status,
      validationErrors: validationErrorsFromForm,
      handleSubmit,
      onSubmit,
      onSaveDraft: handleSaveDraft,
      onPutOnHold: handlePutOnHold,
      onCancelRequest: handleCancelRequest,
      onClose: handleClose,
      setValidationErrors: () => {}, // No-op function for compatibility
    }),
    [
      control,
      isDirty,
      isLoading,
      itemId,
      currentRequest?.status,
      validationErrorsFromForm,
      handleSubmit,
      onSubmit,
      handleSaveDraft,
      handlePutOnHold,
      handleCancelRequest,
      handleClose,
    ]
  );

  return (
    <RHFFormProvider {...formMethods}>
      <RequestFormProvider value={contextValue}>
        <SPFormProvider control={control as any} autoShowErrors={true}>
          <div className='request-info'>
          <Stack tokens={FORM_CONTAINER_TOKENS} styles={FORM_CONTAINER_STYLES}>
          {/* Header */}
          <Stack tokens={HEADER_TOKENS}>
            <Text variant='xxLarge' styles={PAGE_TITLE_STYLES}>
              {itemId ? 'Edit Request' : 'New Legal Review Request'}
            </Text>
            {currentRequest?.requestId && (
              <Stack horizontal verticalAlign='center' tokens={HEADER_TOKENS}>
                <Icon iconName='Tag' styles={TAG_ICON_STYLES} />
                <Text variant='large' styles={REQUEST_ID_TEXT_STYLES}>
                  Request ID: {currentRequest.requestId}
                </Text>
              </Stack>
            )}
          </Stack>

          {/* Error message */}
          {error && (
            <MessageBar
              messageBarType={MessageBarType.error}
              isMultiline={true}
              styles={MESSAGE_BAR_STYLES}
            >
              {error}
            </MessageBar>
          )}

          {/* Workflow Stepper */}
          {currentRequest?.requestType && (
            <Card id='workflow-card' className='workflow-stepper-card'>
              {renderStepper()}
            </Card>
          )}

          {/* Form Error Summary */}
          <FormErrorSummary
            position='sticky'
            clickToScroll
            showFieldLabels
            maxErrors={10}
          />

          {/* Form - Single Card with Multiple Sections */}
          <form onSubmit={handleSubmit(onSubmit)}>
            <Card id='request-form-card' className='request-form-card'>
              <Stack tokens={FORM_SECTIONS_TOKENS} styles={{ root: { padding: '24px' } }}>
                <BasicInfoSection
                  errors={errors}
                  hasSubmissionItemSelection={hasSubmissionItemSelection}
                  calculatedIsRush={calculatedIsRush}
                />
                <DistributionAudienceSection
                  errors={errors}
                  requestType={requestType}
                />
                <PriorSubmissionsSection
                  errors={errors}
                  priorSubmissions={priorSubmissions}
                  onPriorSubmissionsChange={handlePriorSubmissionsChange}
                  isLoading={isLoading}
                  currentUserDepartment={SPContext.currentUser?.department}
                />
                <AdditionalPartiesSection errors={errors} />
              </Stack>
            </Card>
          </form>
        </Stack>
        </div>

        {/* Render children (RequestApprovals, RequestActions) within context */}
        {shouldRenderChildren && children}
        </SPFormProvider>
      </RequestFormProvider>
    </RHFFormProvider>
  );
};

export default RequestInfo;

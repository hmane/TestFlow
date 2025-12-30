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
} from '@appTypes/index';
import { useNotification } from '@contexts/NotificationContext';
import { RequestFormProvider } from '@contexts/RequestFormContext';
import { Icon } from '@fluentui/react/lib/Icon';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { saveRequestSchema } from '@schemas/requestSchema';
import { useRequestStore } from '@stores/requestStore';
import { useSubmissionItemsStore } from '@stores/submissionItemsStore';
import * as React from 'react';
import { FieldError, FormProvider as RHFFormProvider, useForm } from 'react-hook-form';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import { Card, Header, Content } from 'spfx-toolkit/lib/components/Card';
import { FormProvider as SPFormProvider } from 'spfx-toolkit/lib/components/spForm';
import type { IRequestFormProps } from '../RequestContainer';
import './RequestInfo.scss';
import {
  AdditionalPartiesSection,
  BasicInfoSection,
  DistributionAudienceSection,
  PriorSubmissionsSection,
  ProductAudienceSection,
} from './RequestInfoSections';
import { useRequestInfoActions } from './useRequestInfoActions';

/**
 * Shared style constants to prevent recreation on every render
 */
const FORM_CONTAINER_STYLES = { root: { width: '100%', margin: '0' } };
const FORM_CONTAINER_TOKENS = { childrenGap: 24 };
const MESSAGE_BAR_STYLES = { root: { borderRadius: '4px' } };
const FORM_SECTIONS_TOKENS = { childrenGap: 20 };

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
      approvals: [],
      requiresCommunicationsApproval: false,
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
    reset,
  } = formMethods;

  // Ref to track debug timeout for cleanup
  const debugTimeoutRef = React.useRef<number | undefined>(undefined);

  // Cleanup debug timeout on unmount
  React.useEffect(() => {
    return () => {
      if (debugTimeoutRef.current) {
        window.clearTimeout(debugTimeoutRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    if (!currentRequest) {
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      SPContext.logger.info('RequestInfo: Resetting form with currentRequest data', {
        hasApprovals: Array.isArray(currentRequest.approvals),
        approvalsCount: currentRequest.approvals?.length || 0,
        approvals: currentRequest.approvals,
      });
    }

    // Use reset() to update the entire form including field arrays
    // This properly syncs useFieldArray state
    reset(currentRequest, {
      keepDirtyValues: false, // Don't keep dirty values, use loaded data
      keepErrors: false, // Clear any errors
    });

    if (process.env.NODE_ENV !== 'production') {
      // Verify the form was reset by reading values back
      // Clear any pending debug timeout
      if (debugTimeoutRef.current) {
        window.clearTimeout(debugTimeoutRef.current);
      }
      debugTimeoutRef.current = window.setTimeout(() => {
        const currentFormValues = watch();
        SPContext.logger.info('RequestInfo: Form values after reset', {
          approvals: currentFormValues.approvals,
          requiresCommunicationsApproval: currentFormValues.requiresCommunicationsApproval,
        });
        debugTimeoutRef.current = undefined;
      }, 100);
    }
    // Note: 'watch' intentionally excluded from deps - it's stable but returns new objects
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRequest, reset]);

  // Watch all form values for revalidation on change
  const watchedValues = watch();
  const previousValuesRef = React.useRef<Partial<ILegalRequest>>({});

  // Track if validation has been triggered (set to true after first validation attempt)
  const hasBeenValidatedRef = React.useRef(false);

  // Track fields that should be excluded from revalidation (programmatically set fields)
  // These are fields that get set by calculations/effects, not direct user interaction
  const programmaticFieldsRef = React.useRef<Set<keyof ILegalRequest>>(new Set<keyof ILegalRequest>(['isRushRequest']));

  // Update hasBeenValidatedRef when errors appear (indicates validation was triggered)
  React.useEffect(() => {
    if (Object.keys(errors).length > 0) {
      hasBeenValidatedRef.current = true;
    }
  }, [errors]);

  React.useEffect(() => {
    // Only re-validate if validation has been triggered before
    if (!hasBeenValidatedRef.current) {
      previousValuesRef.current = watchedValues;
      return;
    }

    // Find which fields have changed
    const changedFields: (keyof ILegalRequest)[] = [];
    const allFields = Object.keys(watchedValues) as (keyof ILegalRequest)[];

    allFields.forEach((fieldName) => {
      const currentValue = watchedValues[fieldName];
      const previousValue = previousValuesRef.current[fieldName];

      if (currentValue !== previousValue) {
        changedFields.push(fieldName);
      }
    });

    // If any fields changed, re-validate them
    if (changedFields.length > 0) {
      // Re-validate the entire form with save schema to get current errors
      const validation = saveRequestSchema.safeParse(watchedValues);

      changedFields.forEach((fieldName) => {
        // Skip validation for fields that depend on programmatic changes
        // (e.g., rushRationale depends on isRushRequest which is calculated)
        if (programmaticFieldsRef.current.has(fieldName)) {
          // If isRushRequest changed, don't validate rushRationale immediately
          // It will be validated on submit or when user interacts with it
          return;
        }

        // Skip rushRationale if isRushRequest just changed (not user interaction)
        if (fieldName === 'rushRationale' && changedFields.includes('isRushRequest')) {
          return;
        }

        if (!validation.success) {
          // Check if this field has an error (ES5 compatible)
          let fieldError: { message: string } | undefined;
          const issues = validation.error.issues;
          for (let i = 0; i < issues.length; i++) {
            const issue = issues[i];
            if (issue.path.length > 0 && issue.path[0] === fieldName) {
              fieldError = { message: issue.message };
              break;
            }
          }

          if (fieldError) {
            // Set the error for this field
            setError(fieldName as keyof ILegalRequest, {
              type: 'manual',
              message: fieldError.message,
            });
          } else {
            // No error for this field, clear it
            clearErrors(fieldName);
          }
        } else {
          // Validation passed, clear errors for changed fields
          clearErrors(fieldName);
        }
      });
    }

    previousValuesRef.current = watchedValues;
  }, [watchedValues, setError, clearErrors]);

  const readFormValues = React.useCallback(() => watch(), [watch]);

  const {
    onSubmit,
    handleSubmitDirect,
    handleSaveDraft,
    handleClose,
    handleCancelRequest,
    handlePutOnHold,
    validationErrors: actionValidationErrors,
    setValidationErrors: setActionValidationErrors,
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
   * Also clear rushRationale when request is no longer a rush to avoid saving stale data
   */
  React.useEffect(() => {
    if (targetReturnDate && submissionItemSelection && calculatedIsRush !== isRushRequest) {
      setValue('isRushRequest', calculatedIsRush, { shouldDirty: true });

      // Clear rushRationale when transitioning from rush to non-rush
      if (!calculatedIsRush) {
        setValue('rushRationale', '', { shouldDirty: true });
        // Also clear any validation errors for this field
        clearErrors('rushRationale');
      }
    }
  }, [calculatedIsRush, isRushRequest, targetReturnDate, submissionItemSelection, setValue, clearErrors]);

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
   * Combine validation errors from both sources:
   * - actionValidationErrors: from Zod validation in useRequestInfoActions (Save/Submit)
   * - validationErrorsFromForm: from React Hook Form errors (for form-level validation)
   * Priority: actionValidationErrors takes precedence when present
   */
  const combinedValidationErrors = React.useMemo(() => {
    if (actionValidationErrors.length > 0) {
      return actionValidationErrors;
    }
    return validationErrorsFromForm;
  }, [actionValidationErrors, validationErrorsFromForm]);

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
      validationErrors: combinedValidationErrors,
      handleSubmit,
      onSubmit,
      onSubmitDirect: handleSubmitDirect,
      onSaveDraft: handleSaveDraft,
      onPutOnHold: handlePutOnHold,
      onCancelRequest: handleCancelRequest,
      onClose: handleClose,
      setValidationErrors: setActionValidationErrors,
    }),
    [
      control,
      isDirty,
      isLoading,
      itemId,
      currentRequest?.status,
      combinedValidationErrors,
      handleSubmit,
      onSubmit,
      handleSubmitDirect,
      handleSaveDraft,
      handlePutOnHold,
      handleCancelRequest,
      handleClose,
      setActionValidationErrors,
    ]
  );

  return (
    <RHFFormProvider {...formMethods}>
      <RequestFormProvider value={contextValue}>
        <SPFormProvider control={control as any} autoShowErrors={true}>
          <div className='request-info'>
          <Stack tokens={FORM_CONTAINER_TOKENS} styles={FORM_CONTAINER_STYLES}>
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

          {/* Form - Single Card with Header and Content */}
          <form onSubmit={handleSubmit(onSubmit)} style={{ width: '100%' }}>
            <Card
              id='request-form-card'
              className='request-form-card'
              allowExpand={!!itemId}
              defaultExpanded={true}
            >
              <Header size='regular'>
                <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 12 }}>
                  <Icon iconName='EditNote' styles={{ root: { fontSize: '20px', color: '#0078d4' } }} />
                  <Text variant='large' styles={{ root: { fontWeight: 600 } }}>
                    Request Information
                  </Text>
                  {calculatedIsRush && (
                    <span
                      style={{
                        backgroundColor: '#fde7e9',
                        color: '#d13438',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      RUSH
                    </span>
                  )}
                </Stack>
              </Header>

              <Content padding='comfortable'>
                <Stack tokens={FORM_SECTIONS_TOKENS}>
                  <BasicInfoSection
                    errors={errors}
                    hasSubmissionItemSelection={hasSubmissionItemSelection}
                    calculatedIsRush={calculatedIsRush}
                  />
                  <ProductAudienceSection
                    errors={errors}
                    requestType={requestType}
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
              </Content>
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

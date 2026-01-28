/**
 * LegalIntakeForm Component
 *
 * Collapsible card for legal intake - attorney assignment
 * Uses spfx-toolkit Card with Header/Content for consistent styling.
 *
 * Features:
 * - Collapsible card showing assigned attorney in header when set
 * - GroupUsersPicker for attorney selection from LW - Attorneys group
 * - Review Audience field (editable by Legal Admin only)
 * - Assignment notes field
 *
 * Note: Action buttons (Assign Attorney, Submit to Assign Attorney, Save)
 * are now handled by the RequestActions component at the bottom of the form.
 */

import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';

// Context imports for validation error syncing
import { useRequestFormContextSafe } from '@contexts/RequestFormContext';

// Import the read-only summary component (extracted to avoid hook issues)
import { LegalIntakeSummary } from './LegalIntakeSummary';

// Fluent UI - tree-shaken imports
import { DefaultButton, IconButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { ChoiceGroup, type IChoiceGroupOption } from '@fluentui/react/lib/ChoiceGroup';
import { Icon } from '@fluentui/react/lib/Icon';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';

// spfx-toolkit - tree-shaken imports
import { Card, Content, Footer, Header } from 'spfx-toolkit/lib/components/Card';
import { SPTextField, SPTextFieldMode } from 'spfx-toolkit/lib/components/spFields';
import {
  FormContainer,
  FormItem,
  FormLabel,
  FormProvider,
  FormValue,
} from 'spfx-toolkit/lib/components/spForm';
import { GroupUsersPicker } from 'spfx-toolkit/lib/components/spForm/customComponents';
import { UserPersona } from 'spfx-toolkit/lib/components/UserPersona';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

// App imports using path aliases
import { ValidationErrorContainer } from '@components/ValidationErrorContainer';
import { WorkflowCardHeader } from '@components/WorkflowCardHeader';
import { usePermissions } from '@hooks/usePermissions';
import { saveRequest } from '@services/requestSaveService';
import { useLegalIntakeStore } from '@stores/legalIntakeStore';
import { useRequestStore } from '@stores/requestStore';
import { useShallow } from 'zustand/react/shallow';
import type { IPrincipal } from '@appTypes/index';
import { RequestStatus, ReviewAudience } from '@appTypes/workflowTypes';
import { calculateBusinessHours } from '@utils/businessHoursCalculator';
import { NOTES_MAX_LENGTH } from '@constants/fieldLimits';

import './LegalIntakeForm.scss';

/**
 * Review Audience options for ChoiceGroup
 */
const reviewAudienceOptions: IChoiceGroupOption[] = [
  { key: ReviewAudience.Legal, text: 'Legal Only' },
  { key: ReviewAudience.Compliance, text: 'Compliance Only' },
  { key: ReviewAudience.Both, text: 'Both Legal & Compliance' },
];

/**
 * Legal Intake form data
 * Note: GroupUsersPicker now returns IPrincipal[] directly, so no conversion is needed
 */
interface ILegalIntakeFormData {
  attorney?: IPrincipal[];
  attorneyAssignNotes?: string;
  reviewAudience?: ReviewAudience;
}

/**
 * Props for LegalIntakeForm component
 */
export interface ILegalIntakeFormProps {
  /** Whether card is expanded by default */
  defaultExpanded?: boolean;
  /** Read-only mode - shows completed summary with green styling */
  readOnly?: boolean;
}

/**
 * LegalIntakeFormEditable - Internal component with all form hooks
 * Separated to allow conditional rendering without violating React hook rules
 * Defined BEFORE LegalIntakeForm to satisfy ESLint's define-before-use rule
 */
interface ILegalIntakeFormEditableProps {
  defaultExpanded: boolean;
  readOnly: boolean;
  isEditMode: boolean;
  setIsEditMode: React.Dispatch<React.SetStateAction<boolean>>;
}

const LegalIntakeFormEditable: React.FC<ILegalIntakeFormEditableProps> = ({
  defaultExpanded,
  readOnly,
  isEditMode,
  setIsEditMode,
}) => {
  const {
    currentRequest,
    isLoading,
    assignAttorney: storeAssignAttorney,
    sendToCommittee: storeSendToCommittee,
  } = useRequestStore(
    useShallow((s) => ({
      currentRequest: s.currentRequest,
      isLoading: s.isLoading,
      assignAttorney: s.assignAttorney,
      sendToCommittee: s.sendToCommittee,
    }))
  );

  const permissions = usePermissions();

  const [showSuccess, setShowSuccess] = React.useState<boolean>(false);
  const [messageBarError, setMessageBarError] = React.useState<string | undefined>(undefined);

  // Saving state for edit mode
  const [isSaving, setIsSaving] = React.useState<boolean>(false);

  // Action button states
  const [isAssigning, setIsAssigning] = React.useState<boolean>(false);
  const [isSendingToCommittee, setIsSendingToCommittee] = React.useState<boolean>(false);

  // Track mounted state and success toast timer for cleanup
  const mountedRef = React.useRef(true);
  const successTimerRef = React.useRef<ReturnType<typeof setTimeout>>();
  React.useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  // Check if user can edit review audience (Legal Admin or Admin only)
  // Disable editing after reviews are completed (Closeout, Completed, or AwaitingFINRADocuments)
  const isAfterReviewsCompleted =
    currentRequest?.status === RequestStatus.Closeout ||
    currentRequest?.status === RequestStatus.Completed ||
    currentRequest?.status === RequestStatus.AwaitingFINRADocuments;
  const canEditReviewAudience =
    (permissions.isLegalAdmin || permissions.isAdmin) && !isAfterReviewsCompleted;

  /**
   * Convert attorney IPrincipal to have numeric ID for GroupUsersPicker compatibility
   * The GroupUsersPicker component uses useGroupUsers which returns numeric IDs,
   * but SPExtractor returns string IDs. This helper ensures ID type consistency.
   */
  const normalizeAttorneyForPicker = React.useCallback(
    (attorney: IPrincipal | undefined): IPrincipal[] => {
      if (!attorney) return [];
      // Convert ID to number if it's a numeric string
      const numericId = typeof attorney.id === 'string' ? parseInt(attorney.id, 10) : attorney.id;
      return [
        {
          ...attorney,
          id: isNaN(numericId as number) ? attorney.id : String(numericId),
        },
      ];
    },
    []
  );

  // React Hook Form setup
  // Note: GroupUsersPicker now works with IPrincipal[] directly
  const {
    control,
    watch,
    reset,
    setError: setFormError,
    clearErrors,
  } = useForm<ILegalIntakeFormData>({
    defaultValues: {
      // Use attorney from currentRequest (assigned attorney for completed intake)
      // or from legalReview for in-progress intake
      attorney: normalizeAttorneyForPicker(
        currentRequest?.attorney || currentRequest?.legalReview?.assignedAttorney
      ),
      attorneyAssignNotes: undefined,
      reviewAudience: currentRequest?.reviewAudience || ReviewAudience.Both,
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  // Track if we've done initial reset for edit mode
  const hasInitializedRef = React.useRef(false);

  // Reset form values when in edit mode - handles both initial mount and transitions
  React.useEffect(() => {
    SPContext.logger.info('LegalIntakeForm: Edit mode effect running', {
      isEditMode,
      hasCurrentRequest: !!currentRequest,
      hasInitialized: hasInitializedRef.current,
      attorneyFromRequest: currentRequest?.attorney,
    });

    // When in edit mode and we haven't initialized yet, reset the form with current values
    if (isEditMode && currentRequest && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      // Reset form with current request values, normalizing attorney ID for picker
      const normalizedAttorney = normalizeAttorneyForPicker(currentRequest.attorney);
      SPContext.logger.info('LegalIntakeForm: Resetting form with attorney', {
        originalAttorney: currentRequest.attorney,
        normalizedAttorney,
      });
      reset({
        attorney: normalizedAttorney,
        attorneyAssignNotes: undefined, // Start fresh for new notes
        reviewAudience: currentRequest.reviewAudience || ReviewAudience.Both,
      });
    }
    // Reset the flag when exiting edit mode so it can initialize again next time
    if (!isEditMode) {
      hasInitializedRef.current = false;
    }
  }, [isEditMode, currentRequest, reset, normalizeAttorneyForPicker]);

  // Get validation errors from RequestFormContext (set by RequestActions during Zod validation)
  // Use the safe version that returns undefined if context is not available
  // This avoids React Error #300 when rendered in read-only mode outside of RequestFormProvider
  const formContext = useRequestFormContextSafe();
  const contextValidationErrors = formContext?.validationErrors ?? [];

  // Sync validation errors from RequestFormContext to React Hook Form
  // This allows FormItem components to display field-level errors via autoShowErrors
  // The RequestActions component also shows a summary list with navigation links
  // Skip in read-only mode - no validation needed for display-only
  React.useEffect(() => {
    // Skip in read-only mode
    if (readOnly) return;

    // Clear previous errors for Legal Intake fields
    clearErrors(['attorney', 'attorneyAssignNotes', 'reviewAudience']);

    // Sync any errors for Legal Intake fields from context to React Hook Form
    if (contextValidationErrors && contextValidationErrors.length > 0) {
      contextValidationErrors.forEach(validationError => {
        const fieldName = validationError.field as keyof ILegalIntakeFormData;
        // Only sync errors for fields in this form
        if (fieldName === 'attorney' || fieldName === 'attorneyAssignNotes' || fieldName === 'reviewAudience') {
          setFormError(fieldName, { type: 'manual', message: validationError.message });
        }
      });
    }
  }, [contextValidationErrors, setFormError, clearErrors, readOnly]);

  // Filter validation errors to only show Legal Intake related fields
  const legalIntakeFields = ['attorney', 'attorneyAssignNotes', 'reviewAudience'];
  const legalIntakeValidationErrors = React.useMemo(() => {
    return contextValidationErrors.filter(error => legalIntakeFields.includes(error.field));
  }, [contextValidationErrors]);

  // Scroll to field handler for validation errors
  const handleScrollToField = React.useCallback((fieldName: string) => {
    const element = document.querySelector(`[data-field-name="${fieldName}"]`) ||
      document.getElementById(`legal-intake-${fieldName}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Try to focus the input
      const focusable = element.querySelector('input, textarea, select, [tabindex]:not([tabindex="-1"])') as HTMLElement;
      if (focusable) {
        focusable.focus();
      }
    }
  }, []);

  // Watch all fields for sync with store
  const attorneyValue = watch('attorney');
  const notesValue = watch('attorneyAssignNotes');

  // Local state for review audience to ensure immediate UI updates when ChoiceGroup changes
  // This is needed because the UI conditionally shows/hides the attorney field based on this value
  const [localReviewAudience, setLocalReviewAudience] = React.useState<ReviewAudience>(
    currentRequest?.reviewAudience || ReviewAudience.Both
  );

  // Resync localReviewAudience when the underlying request changes (e.g., after loadRequest
  // refreshes data, or when component is reused for a different request)
  const currentRequestId = currentRequest?.id;
  const currentRequestReviewAudience = currentRequest?.reviewAudience;
  React.useEffect(() => {
    setLocalReviewAudience(currentRequestReviewAudience || ReviewAudience.Both);
  }, [currentRequestId, currentRequestReviewAudience]);

  const selectedAttorney = attorneyValue && attorneyValue.length > 0 ? attorneyValue[0] : undefined;

  // Determine if attorney field should be shown based on review audience
  // Hide attorney field when ReviewAudience = Compliance Only (no attorney needed)
  const showAttorneyField = localReviewAudience !== ReviewAudience.Compliance;

  // Get legal intake store setters - use a single batch update function
  const { setLegalIntakeValues } = useLegalIntakeStore();

  // Sync form changes to the legal intake store in a single batch update
  // Debounced to avoid excessive store updates on every notes keystroke
  // Skip in read-only mode - store sync is only needed for editable forms
  const storeSyncTimerRef = React.useRef<ReturnType<typeof setTimeout>>();
  React.useEffect(() => {
    // Skip in read-only mode - the summary view doesn't need store sync
    if (readOnly) return;

    // Clear any pending debounce
    if (storeSyncTimerRef.current) {
      clearTimeout(storeSyncTimerRef.current);
    }

    storeSyncTimerRef.current = setTimeout(() => {
      setLegalIntakeValues({
        selectedAttorney,
        assignmentNotes: notesValue,
        reviewAudience: localReviewAudience,
      });
    }, 300);

    return () => {
      if (storeSyncTimerRef.current) {
        clearTimeout(storeSyncTimerRef.current);
      }
    };
  }, [selectedAttorney, notesValue, localReviewAudience, setLegalIntakeValues, readOnly]);

  // Get the loadRequest function from the store to refresh data after save
  const loadRequest = useRequestStore((s) => s.loadRequest);

  /**
   * Handle saving Legal Intake changes in edit mode
   */
  const handleSaveChanges = async (): Promise<void> => {
    if (!currentRequest || !currentRequest.id) return;

    setIsSaving(true);
    setMessageBarError(undefined);

    try {
      // Build the update payload from form values
      const updatePayload: Record<string, any> = {};

      // Update review audience if changed
      if (localReviewAudience && localReviewAudience !== currentRequest.reviewAudience) {
        updatePayload.reviewAudience = localReviewAudience;
      }

      // Update attorney based on review audience:
      // - Compliance Only: explicitly clear attorney (no attorney needed)
      // - Legal/Both: include selected attorney if present
      if (showAttorneyField) {
        if (selectedAttorney) {
          updatePayload.attorney = selectedAttorney;
        }
      } else {
        // Compliance Only - clear attorney if one was previously assigned
        if (currentRequest.attorney) {
          updatePayload.attorney = null;
        }
      }

      // Update assignment notes if provided
      if (notesValue) {
        updatePayload.attorneyAssignNotes = notesValue;
      }

      // Only save if there are changes
      if (Object.keys(updatePayload).length > 0) {
        await saveRequest(currentRequest.id, updatePayload);

        // Reload the request to get fresh data
        await loadRequest(currentRequest.id);

        setShowSuccess(true);
        successTimerRef.current = setTimeout(() => {
          if (mountedRef.current) setShowSuccess(false);
        }, 3000);
      }

      // Exit edit mode
      setIsEditMode(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save changes';
      setMessageBarError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle canceling edit mode
   */
  const handleCancelEdit = (): void => {
    // Reset form to original values, normalizing attorney ID for picker compatibility
    if (currentRequest) {
      reset({
        attorney: normalizeAttorneyForPicker(currentRequest.attorney),
        attorneyAssignNotes: undefined,
        reviewAudience: currentRequest.reviewAudience || ReviewAudience.Both,
      });
      // Resync local review audience state to match original request
      setLocalReviewAudience(currentRequest.reviewAudience || ReviewAudience.Both);
    }
    setIsEditMode(false);
  };

  /**
   * Handle Assign Attorney button click (or Send to Compliance for Compliance Only)
   */
  const handleAssignAttorney = React.useCallback(async (): Promise<void> => {
    // For Legal or Both: require attorney selection
    // For Compliance Only: no attorney needed, proceed directly to compliance review
    if (showAttorneyField && !selectedAttorney) {
      setMessageBarError('Please select an attorney to assign');
      return;
    }

    setIsAssigning(true);
    setMessageBarError(undefined);

    try {
      // Pass review audience to save Legal Admin's override
      // For Compliance Only, selectedAttorney will be undefined which is correct
      await storeAssignAttorney(selectedAttorney, notesValue, localReviewAudience);
      setShowSuccess(true);
      successTimerRef.current = setTimeout(() => {
        if (mountedRef.current) setShowSuccess(false);
      }, 3000);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : showAttorneyField ? 'Failed to assign attorney' : 'Failed to send to compliance';
      setMessageBarError(errorMessage);
    } finally {
      setIsAssigning(false);
    }
  }, [selectedAttorney, notesValue, localReviewAudience, storeAssignAttorney, showAttorneyField]);

  /**
   * Handle Send to Committee button click
   */
  const handleSendToCommittee = React.useCallback(async (): Promise<void> => {
    setIsSendingToCommittee(true);
    setMessageBarError(undefined);

    try {
      // Pass review audience to save Legal Admin's override
      await storeSendToCommittee(notesValue, localReviewAudience);
      setShowSuccess(true);
      successTimerRef.current = setTimeout(() => {
        if (mountedRef.current) setShowSuccess(false);
      }, 3000);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send to committee';
      setMessageBarError(errorMessage);
    } finally {
      setIsSendingToCommittee(false);
    }
  }, [notesValue, localReviewAudience, storeSendToCommittee]);

  /**
   * Check if current user can perform legal intake actions
   */
  const canPerformLegalIntakeActions = React.useMemo(() => {
    // Only show action buttons in Legal Intake status
    if (currentRequest?.status !== RequestStatus.LegalIntake) {
      return false;
    }
    // Legal Admin or Admin can perform actions
    return permissions.isLegalAdmin || permissions.isAdmin;
  }, [currentRequest?.status, permissions.isLegalAdmin, permissions.isAdmin]);

  if (!currentRequest) {
    return null;
  }

  // Read-only mode: Show completed summary card
  // Admin/Legal Admin can toggle edit mode to modify attorney, review audience, or add notes
  if (readOnly) {
    const assignedAttorney = currentRequest.attorney;
    const completedDate = currentRequest.submittedForReviewOn;

    // In edit mode, show editable fields; otherwise show read-only summary
    if (isEditMode && canEditReviewAudience) {
      return (
        <FormProvider control={control as any} autoShowErrors={true}>
          <Card
            id='legal-intake-edit-card'
            className='legal-intake-card legal-intake-card--editing'
            allowExpand={true}
            defaultExpanded={true}
          >
            <Header size='regular'>
              <Stack
                horizontal
                verticalAlign='center'
                horizontalAlign='space-between'
                styles={{ root: { width: '100%' } }}
              >
                <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 12 }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      backgroundColor: '#fff4ce',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon
                      iconName='Edit'
                      styles={{ root: { fontSize: '18px', color: '#797673' } }}
                    />
                  </div>
                  <Stack tokens={{ childrenGap: 2 }}>
                    <Text variant='large' styles={{ root: { fontWeight: 600, color: '#323130' } }}>
                      Edit Legal Intake
                    </Text>
                    <Text variant='small' styles={{ root: { color: '#605e5c' } }}>
                      Modify attorney assignment, review audience, or add notes
                    </Text>
                  </Stack>
                </Stack>
                <IconButton
                  iconProps={{ iconName: 'Cancel' }}
                  title='Cancel editing'
                  ariaLabel='Cancel editing'
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  styles={{ root: { color: '#605e5c' } }}
                />
              </Stack>
            </Header>

            <Content padding='comfortable'>
              <Stack tokens={{ childrenGap: 20 }}>
                <FormContainer labelWidth='200px'>
                  {/* Review Audience */}
                  <FormItem fieldName='reviewAudience'>
                    <FormLabel infoText='Select which reviews are required for this request.'>
                      Review Audience
                    </FormLabel>
                    <FormValue>
                      <Controller
                        name='reviewAudience'
                        control={control}
                        render={({ field }) => (
                          <ChoiceGroup
                            selectedKey={field.value}
                            options={reviewAudienceOptions}
                            onChange={(_, option) => {
                              if (option) {
                                const newValue = option.key as ReviewAudience;
                                field.onChange(newValue);
                                setLocalReviewAudience(newValue);
                              }
                            }}
                            disabled={isLoading}
                            styles={{
                              flexContainer: {
                                display: 'flex',
                                flexDirection: 'row',
                                gap: '16px',
                              },
                            }}
                          />
                        )}
                      />
                    </FormValue>
                  </FormItem>

                  {/* Assign Attorney - hidden when ReviewAudience = Compliance Only */}
                  {showAttorneyField && (
                    <FormItem fieldName='attorney'>
                      <FormLabel infoText='Select an attorney from the LW - Attorneys group'>
                        Assign Attorney
                      </FormLabel>
                      <FormValue>
                        <GroupUsersPicker
                          name='attorney'
                          control={control as any}
                          groupName='LW - Attorneys'
                          maxUserCount={1}
                          placeholder='Search for attorney to assign...'
                          disabled={isLoading}
                          showClearButton
                          ensureUser
                        />
                      </FormValue>
                    </FormItem>
                  )}

                  {/* Notes - label changes based on review audience */}
                  <FormItem fieldName='attorneyAssignNotes'>
                    <FormLabel infoText={showAttorneyField ? 'Add any notes or instructions for the assigned attorney' : 'Add any notes for the compliance team'}>
                      {showAttorneyField ? 'Assignment Notes' : 'Notes'}
                    </FormLabel>
                    <SPTextField
                      name='attorneyAssignNotes'
                      control={control as any}
                      placeholder='Add any notes or instructions'
                      mode={SPTextFieldMode.MultiLine}
                      rows={4}
                      maxLength={NOTES_MAX_LENGTH}
                      showCharacterCount
                      stylingMode='outlined'
                      spellCheck
                      disabled={isLoading}
                      appendOnly
                      itemId={currentRequest.id}
                      listNameOrId='Requests'
                      fieldInternalName='AttorneyAssignNotes'
                      historyConfig={{
                        initialDisplayCount: 5,
                        showUserPhoto: true,
                        timeFormat: 'relative',
                        showLoadMore: true,
                        enableCopyPrevious: false,
                        historyTitle: 'Previous Notes',
                        emptyHistoryMessage: 'No previous notes',
                      }}
                    />
                  </FormItem>
                </FormContainer>

                {/* Error message for edit mode */}
                {messageBarError && (
                  <MessageBar
                    messageBarType={MessageBarType.error}
                    isMultiline={true}
                    onDismiss={() => setMessageBarError(undefined)}
                    styles={{ root: { borderRadius: '4px' } }}
                  >
                    {messageBarError}
                  </MessageBar>
                )}

                {/* Save/Cancel buttons */}
                <Stack horizontal tokens={{ childrenGap: 12 }} horizontalAlign='end'>
                  <DefaultButton
                    text='Cancel'
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    styles={{ root: { minWidth: '80px' } }}
                  />
                  <PrimaryButton
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                    styles={{ root: { minWidth: '100px' } }}
                  >
                    {isSaving ? (
                      <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 8 }}>
                        <Spinner size={SpinnerSize.xSmall} />
                        <span>Saving...</span>
                      </Stack>
                    ) : (
                      'Save Changes'
                    )}
                  </PrimaryButton>
                </Stack>
              </Stack>
            </Content>
          </Card>
        </FormProvider>
      );
    }

    // Default read-only view
    // Get the user who completed intake (submittedForReviewBy or attorney)
    const completedBy = currentRequest.submittedForReviewBy || assignedAttorney;

    // Calculate duration in business minutes (excludes weekends and non-working hours)
    // Uses businessHoursCalculator to get accurate business hours (8 AM - 5 PM, Mon-Fri PST)
    // Falls back to calendar time if business hours is 0 (e.g., completed on weekend)
    const durationMinutes = React.useMemo(() => {
      if (!currentRequest.submittedOn || !completedDate) return undefined;
      const startDate =
        currentRequest.submittedOn instanceof Date
          ? currentRequest.submittedOn
          : new Date(currentRequest.submittedOn);
      const endDate = completedDate instanceof Date ? completedDate : new Date(completedDate);

      // Calculate business hours and convert to minutes for WorkflowCardHeader
      const businessHours = calculateBusinessHours(startDate, endDate);
      const businessMinutes = Math.round(businessHours * 60);

      // If business hours is 0 (e.g., completed entirely on weekend/after hours),
      // fall back to actual elapsed time so user sees some duration
      if (businessMinutes === 0) {
        const elapsedMs = endDate.getTime() - startDate.getTime();
        return Math.max(1, Math.round(elapsedMs / (1000 * 60))); // At least 1 minute
      }

      return businessMinutes;
    }, [currentRequest.submittedOn, completedDate]);

    return (
      <FormProvider control={control as any} autoShowErrors={false}>
        <Card
          id='legal-intake-summary-card'
          className='legal-intake-card legal-intake-card--completed'
          allowExpand={true}
          defaultExpanded={defaultExpanded}
        >
          <Header size='regular'>
            <WorkflowCardHeader
              title='Legal Intake'
              status='completed'
              startedOn={currentRequest.submittedOn}
              completedOn={completedDate}
              completedBy={
                completedBy?.title
                  ? { title: completedBy.title, email: completedBy.email }
                  : undefined
              }
              attorney={
                assignedAttorney?.title
                  ? { title: assignedAttorney.title, email: assignedAttorney.email }
                  : undefined
              }
              durationMinutes={durationMinutes}
              actions={
                canEditReviewAudience ? (
                  <IconButton
                    iconProps={{ iconName: 'Edit' }}
                    title='Edit Legal Intake'
                    ariaLabel='Edit Legal Intake'
                    onClick={() => setIsEditMode(true)}
                    styles={{
                      root: {
                        color: '#0078d4',
                        backgroundColor: 'transparent',
                        ':hover': {
                          backgroundColor: '#f3f2f1',
                        },
                      },
                    }}
                  />
                ) : undefined
              }
            />
          </Header>

          <Content padding='comfortable'>
            <Stack tokens={{ childrenGap: 16 }}>
              <FormContainer labelWidth='180px'>
                <FormItem>
                  <FormLabel>Assigned Attorney</FormLabel>
                  <FormValue>
                    {assignedAttorney?.email ? (
                      <UserPersona
                        userIdentifier={assignedAttorney.email}
                        displayName={assignedAttorney.title}
                        email={assignedAttorney.email}
                        size={32}
                        displayMode='avatarAndName'
                        showSecondaryText={false}
                      />
                    ) : (
                      <Text styles={{ root: { color: '#605e5c', fontStyle: 'italic' } }}>
                        Not assigned
                      </Text>
                    )}
                  </FormValue>
                </FormItem>

                <FormItem>
                  <FormLabel>Review Audience</FormLabel>
                  <FormValue>
                    <Text>{currentRequest.reviewAudience || 'Both'}</Text>
                  </FormValue>
                </FormItem>

                <FormItem>
                  <FormLabel>Assignment Notes</FormLabel>
                  <SPTextField
                    mode={SPTextFieldMode.MultiLine}
                    rows={3}
                    appendOnly
                    itemId={currentRequest.id}
                    listNameOrId='Requests'
                    fieldInternalName='AttorneyAssignNotes'
                    readOnly={true}
                    stylingMode='outlined'
                    historyConfig={{
                      initialDisplayCount: 10,
                      showUserPhoto: true,
                      timeFormat: 'both',
                      showLoadMore: true,
                      historyTitle: 'Notes History',
                      emptyHistoryMessage: 'No notes have been added yet',
                    }}
                  />
                </FormItem>
              </FormContainer>
            </Stack>
          </Content>
        </Card>
      </FormProvider>
    );
  }

  return (
    <FormProvider control={control as any} autoShowErrors={true}>
      <Card
        id='legal-intake-card'
        className='legal-intake-card'
        allowExpand={true}
        defaultExpanded={defaultExpanded}
      >
        <Header size='regular'>
          <WorkflowCardHeader
            title='Legal Intake'
            status='in-progress'
            startedOn={currentRequest.submittedOn}
            attorney={
              selectedAttorney?.title
                ? { title: selectedAttorney.title, email: selectedAttorney.email }
                : undefined
            }
          />
        </Header>

        <Content padding='comfortable'>
          <Stack tokens={{ childrenGap: 20 }}>
            {/* Attorney Assignment Form */}
            <FormContainer labelWidth='200px'>
              {/* Review Audience - editable by Legal Admin only */}
              <FormItem fieldName='reviewAudience'>
                <FormLabel infoText='Select which reviews are required for this request. Legal Admin can override the submitter selection.'>
                  Review Audience
                </FormLabel>
                <FormValue>
                  <Controller
                    name='reviewAudience'
                    control={control}
                    render={({ field }) => (
                      <ChoiceGroup
                        selectedKey={field.value}
                        options={reviewAudienceOptions}
                        onChange={(_, option) => {
                          if (option) {
                            const newValue = option.key as ReviewAudience;
                            field.onChange(newValue);
                            setLocalReviewAudience(newValue);
                          }
                        }}
                        disabled={isLoading || !canEditReviewAudience}
                        styles={{
                          flexContainer: {
                            display: 'flex',
                            flexDirection: 'row',
                            gap: '16px',
                          },
                        }}
                      />
                    )}
                  />
                  {!canEditReviewAudience && (
                    <Text
                      variant='small'
                      styles={{ root: { color: '#605e5c', fontStyle: 'italic', marginTop: '4px' } }}
                    >
                      Only Legal Admin can change the review audience
                    </Text>
                  )}
                </FormValue>
              </FormItem>

              {/* Assign Attorney using GroupUsersPicker - hidden when ReviewAudience = Compliance Only */}
              {showAttorneyField && (
                <FormItem fieldName='attorney'>
                  <FormLabel infoText='Select an attorney from the LW - Attorneys group to assign to this request'>
                    Assign Attorney
                  </FormLabel>
                  <FormValue>
                    <GroupUsersPicker
                      name='attorney'
                      control={control as any}
                      groupName='LW - Attorneys'
                      maxUserCount={1}
                      placeholder='Search for attorney to assign...'
                      disabled={isLoading}
                      showClearButton
                      ensureUser
                    />
                  </FormValue>
                </FormItem>
              )}

              {/* Notes - label changes based on review audience */}
              <FormItem fieldName='attorneyAssignNotes'>
                <FormLabel infoText={showAttorneyField ? 'Add any notes or instructions for the assigned attorney' : 'Add any notes for the compliance team'}>
                  {showAttorneyField ? 'Assignment Notes' : 'Notes'}
                </FormLabel>
                <SPTextField
                  name='attorneyAssignNotes'
                  control={control as any}
                  placeholder='Add any notes or instructions'
                  mode={SPTextFieldMode.MultiLine}
                  rows={4}
                  maxLength={NOTES_MAX_LENGTH}
                  showCharacterCount
                  stylingMode='outlined'
                  spellCheck
                  disabled={isLoading}
                  appendOnly
                  itemId={currentRequest.id}
                  listNameOrId='Requests'
                  fieldInternalName='AttorneyAssignNotes'
                  historyConfig={{
                    initialDisplayCount: 5,
                    showUserPhoto: true,
                    timeFormat: 'relative',
                    showLoadMore: true,
                    enableCopyPrevious: false,
                    historyTitle: 'Previous Notes',
                    emptyHistoryMessage: 'No previous notes',
                  }}
                />
              </FormItem>
            </FormContainer>

            {/* Validation errors - at the end of content */}
            <ValidationErrorContainer
              errors={legalIntakeValidationErrors}
              onScrollToField={handleScrollToField}
              filterFields={legalIntakeFields}
            />
          </Stack>
        </Content>

        {/* Action buttons in footer - only shown for Legal Admin/Admin in Legal Intake status */}
        {canPerformLegalIntakeActions && (
          <Footer>
            <Stack tokens={{ childrenGap: 12 }}>
              {/* Success message - just above buttons */}
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

              {/* Local error message - just above buttons */}
              {messageBarError && (
                <MessageBar
                  messageBarType={MessageBarType.error}
                  isMultiline={true}
                  onDismiss={() => setMessageBarError(undefined)}
                  styles={{ root: { borderRadius: '4px' } }}
                >
                  {messageBarError}
                </MessageBar>
              )}

              <Stack horizontal horizontalAlign='space-between' verticalAlign='center' styles={{ root: { width: '100%' } }}>
              <Text variant='small' styles={{ root: { color: '#605e5c', fontStyle: 'italic' } }}>
                {showAttorneyField
                  ? (selectedAttorney
                      ? 'Attorney selected. Click "Assign Attorney" to proceed.'
                      : 'Select an attorney, or click "Submit to Assign Attorney" to send to committee.')
                  : 'Compliance Only selected. Click "Send to Compliance" to proceed.'}
              </Text>
              <Stack horizontal tokens={{ childrenGap: 8 }}>
                {/* Submit to Assign Attorney - only shown when attorney field is visible */}
                {showAttorneyField && (
                  <DefaultButton
                    text={isSendingToCommittee ? 'Sending...' : 'Submit to Assign Attorney'}
                    onClick={handleSendToCommittee}
                    disabled={isAssigning || isSendingToCommittee || isLoading}
                    iconProps={{ iconName: 'Group' }}
                  />
                )}
                <PrimaryButton
                  onClick={handleAssignAttorney}
                  disabled={(showAttorneyField && !selectedAttorney) || isAssigning || isSendingToCommittee || isLoading}
                  iconProps={{ iconName: showAttorneyField ? 'AddFriend' : 'ComplianceAudit' }}
                >
                  {isAssigning && (
                    <Spinner size={SpinnerSize.xSmall} styles={{ root: { marginRight: 8 } }} />
                  )}
                  {isAssigning
                    ? (showAttorneyField ? 'Assigning...' : 'Sending...')
                    : (showAttorneyField ? 'Assign Attorney' : 'Send to Compliance')}
                </PrimaryButton>
              </Stack>
              </Stack>
            </Stack>
          </Footer>
        )}
      </Card>
    </FormProvider>
  );
};

/**
 * LegalIntakeForm Component
 *
 * Main exported component that delegates to either:
 * - LegalIntakeSummary (for read-only mode without edit)
 * - LegalIntakeFormEditable (for editable mode or edit mode within read-only)
 *
 * This separation avoids React Error #300 by not calling form hooks
 * when rendering in pure read-only mode inside WorkflowFormWrapper.
 */
export const LegalIntakeForm: React.FC<ILegalIntakeFormProps> = ({
  defaultExpanded = true,
  readOnly = false,
}) => {
  // For read-only mode, use the simplified LegalIntakeSummary component
  // This avoids React Hook issues when rendering inside WorkflowFormWrapper
  // The summary component doesn't use useForm or form-related hooks
  const [isEditMode, setIsEditMode] = React.useState<boolean>(false);

  // If read-only and NOT in edit mode, render the simplified summary component
  // This early return avoids all the form-related hooks that cause React Error #300
  if (readOnly && !isEditMode) {
    return (
      <LegalIntakeSummary
        defaultExpanded={defaultExpanded}
        onEditClick={() => setIsEditMode(true)}
      />
    );
  }

  // From here on, we're in editable mode (either !readOnly or isEditMode)
  // Safe to use all form hooks
  return (
    <LegalIntakeFormEditable
      defaultExpanded={defaultExpanded}
      readOnly={readOnly}
      isEditMode={isEditMode}
      setIsEditMode={setIsEditMode}
    />
  );
};

export default LegalIntakeForm;

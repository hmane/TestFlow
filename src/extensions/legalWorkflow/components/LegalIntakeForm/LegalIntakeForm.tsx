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
import { useRequestFormContext } from '@contexts/RequestFormContext';

// Fluent UI - tree-shaken imports
import { DefaultButton, IconButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { ChoiceGroup, type IChoiceGroupOption } from '@fluentui/react/lib/ChoiceGroup';
import { Icon } from '@fluentui/react/lib/Icon';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';

// spfx-toolkit - tree-shaken imports
import { Card, Content, Header } from 'spfx-toolkit/lib/components/Card';
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

// App imports using path aliases
import { WorkflowCardHeader } from '@components/WorkflowCardHeader';
import { usePermissions } from '@hooks/usePermissions';
import { saveRequest } from '@services/requestSaveService';
import { useLegalIntakeStore } from '@stores/legalIntakeStore';
import { useRequestStore } from '@stores/requestStore';
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
 * LegalIntakeForm Component
 */
export const LegalIntakeForm: React.FC<ILegalIntakeFormProps> = ({
  defaultExpanded = true,
  readOnly = false,
}) => {
  const { currentRequest, isLoading } = useRequestStore();
  const permissions = usePermissions();
  const [showSuccess, setShowSuccess] = React.useState<boolean>(false);
  const [messageBarError, setMessageBarError] = React.useState<string | undefined>(undefined);

  // Edit mode state - allows admin/legal admin to modify completed Legal Intake
  const [isEditMode, setIsEditMode] = React.useState<boolean>(false);
  const [isSaving, setIsSaving] = React.useState<boolean>(false);
  // Track when form is ready after reset to prevent GroupUsersPicker mounting with stale values
  const [isFormReady, setIsFormReady] = React.useState<boolean>(false);

  // Check if user can edit review audience (Legal Admin or Admin only)
  // Disable editing after reviews are completed (Closeout, Completed, or AwaitingForesideDocuments)
  const isAfterReviewsCompleted =
    currentRequest?.status === RequestStatus.Closeout ||
    currentRequest?.status === RequestStatus.Completed ||
    currentRequest?.status === RequestStatus.AwaitingForesideDocuments;
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

  // Track if we've already processed the edit mode transition to prevent re-runs
  const hasInitializedEditMode = React.useRef(false);

  // Reset form values when entering edit mode to ensure attorney is selected
  // Only run once when isEditMode transitions to true
  React.useEffect(() => {
    if (isEditMode && currentRequest && !hasInitializedEditMode.current) {
      hasInitializedEditMode.current = true;

      // Reset form with current request values, normalizing attorney ID for picker
      reset({
        attorney: normalizeAttorneyForPicker(currentRequest.attorney),
        attorneyAssignNotes: undefined, // Start fresh for new notes
        reviewAudience: currentRequest.reviewAudience || ReviewAudience.Both,
      });

      // Mark form as ready after reset
      setIsFormReady(true);
    } else if (!isEditMode) {
      // Reset the flag when exiting edit mode
      hasInitializedEditMode.current = false;
      setIsFormReady(false);
    }
  }, [isEditMode, currentRequest, reset, normalizeAttorneyForPicker]);

  // Get validation errors from RequestFormContext (set by RequestActions during Zod validation)
  const { validationErrors: contextValidationErrors } = useRequestFormContext();

  // Sync validation errors from RequestFormContext to React Hook Form
  // This allows FormItem components to display field-level errors via autoShowErrors
  // The RequestActions component also shows a summary list with navigation links
  React.useEffect(() => {
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
  }, [contextValidationErrors, setFormError, clearErrors]);

  // Watch all fields for sync with store
  const attorneyValue = watch('attorney');
  const notesValue = watch('attorneyAssignNotes');
  const reviewAudienceValue = watch('reviewAudience');

  const selectedAttorney = attorneyValue && attorneyValue.length > 0 ? attorneyValue[0] : undefined;

  // Get legal intake store setters - use a single batch update function
  const { setLegalIntakeValues } = useLegalIntakeStore();

  // Sync form changes to the legal intake store in a single batch update
  // This prevents multiple re-renders from separate store updates
  React.useEffect(() => {
    setLegalIntakeValues({
      selectedAttorney,
      assignmentNotes: notesValue,
      reviewAudience: reviewAudienceValue,
    });
  }, [selectedAttorney, notesValue, reviewAudienceValue, setLegalIntakeValues]);

  // Get the loadRequest function from the store to refresh data after save
  const { loadRequest } = useRequestStore();

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

      // Update attorney if changed
      if (selectedAttorney) {
        updatePayload.attorney = selectedAttorney;
      }

      // Update review audience if changed
      if (reviewAudienceValue && reviewAudienceValue !== currentRequest.reviewAudience) {
        updatePayload.reviewAudience = reviewAudienceValue;
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
        setTimeout(() => setShowSuccess(false), 3000);
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
    // Reset form to original values
    if (currentRequest) {
      reset({
        attorney: currentRequest.attorney ? [currentRequest.attorney] : [],
        attorneyAssignNotes: undefined,
        reviewAudience: currentRequest.reviewAudience || ReviewAudience.Both,
      });
    }
    setIsEditMode(false);
  };

  if (!currentRequest) {
    return null;
  }

  // Read-only mode: Show completed summary card
  // Admin/Legal Admin can toggle edit mode to modify attorney, review audience, or add notes
  if (readOnly) {
    const assignedAttorney = currentRequest.attorney;
    const completedDate = currentRequest.submittedForReviewOn;

    // In edit mode, show editable fields; otherwise show read-only summary
    // Wait for form to be ready before rendering GroupUsersPicker to ensure it gets correct values
    if (isEditMode && canEditReviewAudience) {
      if (!isFormReady) {
        return (
          <Card
            id='legal-intake-loading-card'
            className='legal-intake-card legal-intake-card--loading'
            allowExpand={false}
            defaultExpanded={true}
          >
            <Header size='regular'>
              <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 12 }}>
                <Spinner size={SpinnerSize.small} />
                <Text variant='large' styles={{ root: { fontWeight: 600, color: '#323130' } }}>
                  Loading Edit Form...
                </Text>
              </Stack>
            </Header>
          </Card>
        );
      }

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
                                field.onChange(option.key as ReviewAudience);
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

                  {/* Assign Attorney */}
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

                  {/* Assignment Notes */}
                  <FormItem fieldName='attorneyAssignNotes'>
                    <FormLabel infoText='Add any notes or instructions for the assigned attorney'>
                      Assignment Notes
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
                            field.onChange(option.key as ReviewAudience);
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

              {/* Assign Attorney using GroupUsersPicker */}
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

              {/* Attorney Assign Notes */}
              <FormItem fieldName='attorneyAssignNotes'>
                <FormLabel infoText='Add any notes or instructions for the assigned attorney'>
                  Assignment Notes
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

            {/* Guidance text */}
            <Text variant='small' styles={{ root: { color: '#605e5c', fontStyle: 'italic' } }}>
              {selectedAttorney
                ? 'Attorney selected. Use the action buttons below to proceed.'
                : 'Select an attorney above, or use "Submit to Assign Attorney" below to send to committee.'}
            </Text>
          </Stack>
        </Content>
      </Card>
    </FormProvider>
  );
};

export default LegalIntakeForm;

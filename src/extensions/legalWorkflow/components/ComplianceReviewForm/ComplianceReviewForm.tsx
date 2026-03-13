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
import { Checkbox } from '@fluentui/react/lib/Checkbox';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { Icon } from '@fluentui/react/lib/Icon';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Separator } from '@fluentui/react/lib/Separator';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';

// spfx-toolkit - tree-shaken imports
import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import { Card, Header, Content, Footer } from 'spfx-toolkit/lib/components/Card';
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
  SPChoiceField,
} from 'spfx-toolkit/lib/components/spFields';

// App imports using path aliases
import { ValidationErrorContainer } from '@components/ValidationErrorContainer';
import {
  WorkflowCardHeader,
  type ReviewOutcome as HeaderReviewOutcome,
} from '@components/WorkflowCardHeader';
import { useRequestFormContextSafe } from '@contexts/RequestFormContext';
import { useUIVisibility } from '@hooks/useUIVisibility';
import { usePermissions } from '@hooks/usePermissions';
import { useRequestStore, useRequestActions } from '@stores/requestStore';
import { useDocumentsStore } from '@stores/documentsStore';
import type { IDocument } from '@stores/documentsStore';
import { useConfigStore } from '@stores/configStore';
import { useShallow } from 'zustand/react/shallow';
import {
  saveComplianceReviewProgress,
  resubmitForComplianceReview,
} from '@services/workflowActionService';
import { CheckoutValidationDialog } from '@components/CheckoutValidationDialog';
import {
  isDocumentCheckoutEnabled,
  getRequestCheckoutStatus,
  doneReviewingAll,
  forceDoneReviewingAll,
  validateCheckoutForTransition,
  type ICheckoutValidationResult,
} from '@services/documentCheckoutService';
import { LegalReviewStatus, ComplianceReviewStatus, ReviewOutcome } from '@appTypes/index';
import { calculateBusinessHours } from '@utils/businessHoursCalculator';
import { RESUBMIT_NOTES_MAX_LENGTH } from '@constants/fieldLimits';

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
 * Styled boolean callout — matches the FINRADocuments "Comments Received" pattern
 */
interface IStyledBooleanCalloutProps {
  label: string;
  helpText: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

const StyledBooleanCallout: React.FC<IStyledBooleanCalloutProps> = ({
  label,
  helpText,
  checked,
  disabled,
  onChange,
}) => (
  <Stack
    horizontal
    verticalAlign='center'
    tokens={{ childrenGap: 12 }}
    styles={{
      root: {
        padding: '12px 16px',
        backgroundColor: checked ? '#dff6dd' : '#f4f4f4',
        borderRadius: '6px',
        border: checked ? '1px solid #107c10' : '1px solid #e1dfdd',
        transition: 'all 0.2s ease',
      },
    }}
  >
    <Stack tokens={{ childrenGap: 2 }} styles={{ root: { flex: 1 } }}>
      <Checkbox
        label={label}
        checked={checked}
        onChange={(_ev?, val?) => onChange(val ?? false)}
        disabled={disabled}
        styles={{ label: { fontWeight: 600 } }}
      />
      <Text variant='small' styles={{ root: { color: '#605e5c', paddingLeft: '26px' } }}>
        {helpText}
      </Text>
    </Stack>
  </Stack>
);

/**
 * Compliance Review form data
 */
interface IComplianceReviewFormData {
  complianceReviewStatus: ComplianceReviewStatus;
  complianceReviewOutcome?: ReviewOutcome;
  complianceReviewNotes?: string;
  isForesideReviewRequired: boolean;
  recordRetentionOnly: boolean;
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
  const { currentRequest, isLoading, itemId } = useRequestStore(
    useShallow((s) => ({
      currentRequest: s.currentRequest,
      isLoading: s.isLoading,
      itemId: s.itemId,
    }))
  );
  const { submitComplianceReview: submitComplianceReviewAction, loadRequest } = useRequestActions();

  const [showSuccess, setShowSuccess] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = React.useState<boolean>(false);
  // Key to force NoteHistory refresh after save
  const [historyRefreshKey, setHistoryRefreshKey] = React.useState<number>(0);
  // State for resubmit action
  const [isResubmitting, setIsResubmitting] = React.useState<boolean>(false);
  // Refs for tracking setTimeout IDs to prevent memory leaks
  const timeoutRefs = React.useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // Document checkout status for review form warnings
  const documents = useDocumentsStore((s) => s.documents);
  const loadDocuments = useDocumentsStore((s) => s.loadDocuments);
  const allDocumentsFlat = React.useMemo((): IDocument[] => {
    const result: IDocument[] = [];
    documents.forEach((docs) => {
      for (let i = 0; i < docs.length; i++) {
        result.push(docs[i]);
      }
    });
    return result;
  }, [documents]);

  const configLoaded = useConfigStore((s) => s.isLoaded);
  const checkoutEnabled = React.useMemo(() => isDocumentCheckoutEnabled(), [configLoaded]);
  const requestCheckoutStatus = React.useMemo(() => {
    if (!checkoutEnabled || allDocumentsFlat.length === 0) return undefined;
    return getRequestCheckoutStatus(allDocumentsFlat);
  }, [checkoutEnabled, allDocumentsFlat]);

  const currentUserHasCheckouts = requestCheckoutStatus?.currentUserHasCheckouts ?? false;
  const othersHaveCheckouts = (requestCheckoutStatus?.checkedOutByOthers?.length ?? 0) > 0;

  const [isDoneReviewingAll, setIsDoneReviewingAll] = React.useState(false);

  const handleDoneReviewingAll = React.useCallback(async (): Promise<void> => {
    if (!itemId || !requestCheckoutStatus?.currentUserHasCheckouts) return;
    try {
      setIsDoneReviewingAll(true);
      const results = await doneReviewingAll(allDocumentsFlat);
      const failCount = results.filter(function(r) { return !r.success; }).length;

      if (failCount > 0) {
        setError(failCount + ' file(s) could not be checked in. Please try again.');
      } else {
        SPContext.logger.success('ComplianceReviewForm: All reviews marked as done');
      }

      await loadDocuments(itemId, true);
    } catch (doneError: unknown) {
      const msg = doneError instanceof Error ? doneError.message : 'Failed to complete reviews';
      setError(msg);
      SPContext.logger.error('ComplianceReviewForm: Done reviewing all failed', doneError);
    }
    setIsDoneReviewingAll(false);
  }, [itemId, requestCheckoutStatus, allDocumentsFlat, loadDocuments]);

  // Checkout validation dialog state
  const [checkoutValidation, setCheckoutValidation] = React.useState<ICheckoutValidationResult | undefined>(undefined);
  const [pendingFormData, setPendingFormData] = React.useState<IComplianceReviewFormData | undefined>(undefined);
  const [isDialogProcessing, setIsDialogProcessing] = React.useState(false);

  // Determine if completing this review would trigger a final transition (all reviews done → Closeout)
  const isFinalTransition = React.useMemo((): boolean => {
    if (!currentRequest) return false;
    const audience = currentRequest.reviewAudience;
    if (audience === 'Compliance') return true; // Only compliance needed, completing it is final
    if (audience === 'Both') {
      // Final if legal is already completed
      return currentRequest.legalReview?.status === LegalReviewStatus.Completed;
    }
    return false;
  }, [currentRequest]);

  // Get validation errors from RequestFormContext
  const formContext = useRequestFormContextSafe();
  const contextValidationErrors = formContext?.validationErrors ?? [];

  // Filter validation errors to only show Compliance Review related fields
  const complianceReviewFields = ['complianceReviewOutcome', 'complianceReviewNotes', 'isForesideReviewRequired', 'isRetailUse'];
  const complianceReviewValidationErrors = React.useMemo(() => {
    return contextValidationErrors.filter(err => complianceReviewFields.includes(err.field));
  }, [contextValidationErrors]);

  // Scroll to field handler for validation errors
  const handleScrollToField = React.useCallback((fieldName: string) => {
    const element = document.querySelector(`[data-field-name="${fieldName}"]`) ||
      document.getElementById(`compliance-review-${fieldName}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const focusable = element.querySelector('input, textarea, select, [tabindex]:not([tabindex="-1"])') as HTMLElement;
      if (focusable) {
        focusable.focus();
      }
    }
  }, []);

  // Cleanup all pending timeouts on unmount
  React.useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((id) => clearTimeout(id));
      timeoutRefs.current.clear();
    };
  }, []);

  // React Hook Form setup
  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState,
    getValues,
    setValue,
  } = useForm<IComplianceReviewFormData>({
    defaultValues: {
      complianceReviewStatus: currentRequest?.complianceReview?.status || ComplianceReviewStatus.NotStarted,
      complianceReviewOutcome: currentRequest?.complianceReview?.outcome,
      complianceReviewNotes: currentRequest?.complianceReview?.reviewNotes,
      isForesideReviewRequired: currentRequest?.complianceReview?.isForesideReviewRequired || false,
      recordRetentionOnly: currentRequest?.complianceReview?.recordRetentionOnly || false,
      isRetailUse: currentRequest?.complianceReview?.isRetailUse || false,
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  // Use scroll to error hook
  const { scrollToFirstError } = useScrollToError(formState as any);

  const reviewStatus = watch('complianceReviewStatus');
  const selectedOutcome = watch('complianceReviewOutcome');
  const isForesideReviewRequired = watch('isForesideReviewRequired');
  const recordRetentionOnly = watch('recordRetentionOnly');
  const isRetailUse = watch('isRetailUse');
  const { buttons, fields } = useUIVisibility();
  const { isAdmin } = usePermissions();
  const canReview = fields.complianceReview.canEdit;
  const canResubmit = reviewStatus === ComplianceReviewStatus.WaitingOnSubmitter && buttons.resubmitForReview.visible;
  const canEditSubmitterNotes = canReview || canResubmit;

  /**
   * Handle Foreside checkbox change with cascading behavior.
   * When unchecked, automatically uncheck dependent fields (RecordRetentionOnly, RetailUse).
   */
  const handleForesideChange = React.useCallback((val: boolean) => {
    setValue('isForesideReviewRequired', val, { shouldDirty: true });
    if (!val) {
      setValue('recordRetentionOnly', false, { shouldDirty: true });
      setValue('isRetailUse', false, { shouldDirty: true });
    }
  }, [setValue]);

  // Sync form with store when currentRequest changes
  React.useEffect(() => {
    if (currentRequest?.complianceReview) {
      reset({
        complianceReviewStatus: currentRequest.complianceReview.status || ComplianceReviewStatus.NotStarted,
        complianceReviewOutcome: currentRequest.complianceReview.outcome,
        complianceReviewNotes: currentRequest.complianceReview.reviewNotes,
        isForesideReviewRequired: currentRequest.complianceReview.isForesideReviewRequired || false,
        recordRetentionOnly: currentRequest.complianceReview.recordRetentionOnly || false,
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
          recordRetentionOnly: data.recordRetentionOnly,
          isRetailUse: data.isRetailUse,
        }
      );

      // Reload request to ensure store has latest data including review notes
      if (itemId) {
        await loadRequest(itemId);
      }

      // Reset form with cleared notes for append-only field
      reset({
        complianceReviewStatus: ComplianceReviewStatus.Completed,
        complianceReviewOutcome: data.complianceReviewOutcome,
        complianceReviewNotes: undefined, // Clear for append-only
        isForesideReviewRequired: data.isForesideReviewRequired,
        recordRetentionOnly: data.recordRetentionOnly,
        isRetailUse: data.isRetailUse,
      });

      // Increment key to force NoteHistory refresh after a short delay
      // Delay allows SharePoint to create the version before we fetch it
      const refreshTimeoutId = setTimeout(() => {
        timeoutRefs.current.delete(refreshTimeoutId);
        setHistoryRefreshKey((prev) => prev + 1);
      }, 500);
      timeoutRefs.current.add(refreshTimeoutId);

      setShowSuccess(true);
      const successTimeoutId = setTimeout(() => {
        timeoutRefs.current.delete(successTimeoutId);
        setShowSuccess(false);
      }, 5000);
      timeoutRefs.current.add(successTimeoutId);
      SPContext.logger.success('ComplianceReviewForm: Review submitted successfully');
    } catch (submitError: unknown) {
      const errorMessage = submitError instanceof Error ? submitError.message : 'Failed to submit review';
      setError(errorMessage);
      scrollToFirstError();
      SPContext.logger.error('ComplianceReviewForm: Review submission failed', submitError);
    } finally {
      setIsSaving(false);
    }
  }, [itemId, scrollToFirstError, reset, loadRequest]);

  /**
   * Pre-submit checkout validation.
   * For resubmit outcomes, skip checkout validation (no transition).
   */
  const handlePreSubmit = React.useCallback(
    (data: IComplianceReviewFormData): void => {
      const isResubmit = data.complianceReviewOutcome === ReviewOutcome.RespondToCommentsAndResubmit;
      if (!isResubmit && checkoutEnabled) {
        const validation = validateCheckoutForTransition(allDocumentsFlat, isFinalTransition);
        if (!validation.canProceed || validation.othersHaveCheckouts) {
          setPendingFormData(data);
          setCheckoutValidation(validation);
          return;
        }
      }
      onSubmit(data);
    },
    [checkoutEnabled, allDocumentsFlat, isFinalTransition, onSubmit]
  );

  const handleDoneReviewingAndSubmit = React.useCallback(async (): Promise<void> => {
    if (!itemId || !pendingFormData) return;
    try {
      setIsDialogProcessing(true);
      const results = await doneReviewingAll(allDocumentsFlat);
      const failCount = results.filter(function(r) { return !r.success; }).length;

      if (failCount > 0) {
        setError(failCount + ' file(s) could not be checked in. Please try again.');
        setCheckoutValidation(undefined);
        setPendingFormData(undefined);
        setIsDialogProcessing(false);
        return;
      }

      await loadDocuments(itemId, true);
      setIsDialogProcessing(false);

      const freshDocs = useDocumentsStore.getState().documents;
      const freshFlat: IDocument[] = [];
      freshDocs.forEach(function(docs) {
        for (let i = 0; i < docs.length; i++) { freshFlat.push(docs[i]); }
      });
      const recheck = validateCheckoutForTransition(freshFlat, isFinalTransition);

      if (!recheck.canProceed) {
        setCheckoutValidation(recheck);
        return;
      }

      const formData = pendingFormData;
      setCheckoutValidation(undefined);
      setPendingFormData(undefined);
      await onSubmit(formData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to complete reviews';
      setError(msg);
      setCheckoutValidation(undefined);
      setPendingFormData(undefined);
      setIsDialogProcessing(false);
    }
  }, [itemId, pendingFormData, allDocumentsFlat, loadDocuments, onSubmit, isFinalTransition]);

  const handleForceResolveAndSubmit = React.useCallback(async (): Promise<void> => {
    if (!itemId || !pendingFormData) return;
    try {
      setIsDialogProcessing(true);
      const results = await forceDoneReviewingAll(allDocumentsFlat);
      const failCount = results.filter(function(r) { return !r.success; }).length;

      if (failCount > 0) {
        setError(failCount + ' file(s) could not be force-checked in.');
        setCheckoutValidation(undefined);
        setPendingFormData(undefined);
        setIsDialogProcessing(false);
        return;
      }

      await loadDocuments(itemId, true);
      const formData = pendingFormData;
      setCheckoutValidation(undefined);
      setPendingFormData(undefined);
      setIsDialogProcessing(false);
      await onSubmit(formData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to force-complete reviews';
      setError(msg);
      setCheckoutValidation(undefined);
      setPendingFormData(undefined);
      setIsDialogProcessing(false);
    }
  }, [itemId, pendingFormData, allDocumentsFlat, loadDocuments, onSubmit]);

  const handleProceedWithOthers = React.useCallback(async (): Promise<void> => {
    if (!pendingFormData) return;
    const formData = pendingFormData;
    setCheckoutValidation(undefined);
    setPendingFormData(undefined);
    await onSubmit(formData);
  }, [pendingFormData, onSubmit]);

  const handleDialogGoBack = React.useCallback((): void => {
    setCheckoutValidation(undefined);
    setPendingFormData(undefined);
    setIsDialogProcessing(false);
  }, []);

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
        recordRetentionOnly: formData.recordRetentionOnly,
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
        recordRetentionOnly: formData.recordRetentionOnly,
        isRetailUse: formData.isRetailUse,
      });

      // Increment key to force NoteHistory refresh after a short delay
      // Delay allows SharePoint to create the version before we fetch it
      const refreshTimeoutId2 = setTimeout(() => {
        timeoutRefs.current.delete(refreshTimeoutId2);
        setHistoryRefreshKey((prev) => prev + 1);
      }, 500);
      timeoutRefs.current.add(refreshTimeoutId2);

      setShowSuccess(true);
      const successTimeoutId2 = setTimeout(() => {
        timeoutRefs.current.delete(successTimeoutId2);
        setShowSuccess(false);
      }, 3000);
      timeoutRefs.current.add(successTimeoutId2);
      SPContext.logger.success('ComplianceReviewForm: Progress saved');
    } catch (saveError: unknown) {
      const errorMessage = saveError instanceof Error ? saveError.message : 'Failed to save progress';
      setError(errorMessage);
      SPContext.logger.error('ComplianceReviewForm: Save progress failed', saveError);
    } finally {
      setIsSaving(false);
    }
  }, [itemId, getValues, reset, loadRequest]);

  /**
   * Handle resubmit for review (submitter action)
   *
   * Called when the submitter has addressed the reviewer's comments and is ready
   * for the compliance reviewer to review again. This is part of the "Respond To Comments And Resubmit"
   * workflow where:
   * 1. Compliance reviewer sets outcome to "Respond To Comments And Resubmit"
   * 2. Review status changes to "Waiting On Submitter"
   * 3. Submitter addresses comments, updates request/documents/approvals
   * 4. Submitter clicks "Resubmit for Review" (this handler)
   * 5. Review status changes to "Waiting On Compliance"
   * 6. Compliance reviewer reviews again and can repeat or set final outcome
   */
  const handleResubmitForReview = React.useCallback(async (): Promise<void> => {
    if (!itemId) return;

    try {
      setIsResubmitting(true);
      setError(undefined);

      const formData = getValues();

      SPContext.logger.info('ComplianceReviewForm: Resubmitting for review', {
        itemId,
        notes: formData.complianceReviewNotes ? 'provided' : 'none',
      });

      // Use dedicated resubmit action - changes status from WaitingOnSubmitter to WaitingOnCompliance
      // and calculates time tracking for submitter's work
      await resubmitForComplianceReview(itemId, {
        notes: formData.complianceReviewNotes,
      });

      // Reload request to update store with server data
      await loadRequest(itemId);

      // Reset form notes for append-only field
      reset({
        complianceReviewStatus: ComplianceReviewStatus.WaitingOnCompliance,
        complianceReviewOutcome: ReviewOutcome.RespondToCommentsAndResubmit, // Outcome stays the same
        complianceReviewNotes: undefined, // Clear for append-only
        isForesideReviewRequired: formData.isForesideReviewRequired,
        recordRetentionOnly: formData.recordRetentionOnly,
        isRetailUse: formData.isRetailUse,
      });

      // Increment key to force NoteHistory refresh after a short delay
      // Delay allows SharePoint to create the version before we fetch it
      const refreshTimeoutId3 = setTimeout(() => {
        timeoutRefs.current.delete(refreshTimeoutId3);
        setHistoryRefreshKey((prev) => prev + 1);
      }, 500);
      timeoutRefs.current.add(refreshTimeoutId3);

      setShowSuccess(true);
      const successTimeoutId3 = setTimeout(() => {
        timeoutRefs.current.delete(successTimeoutId3);
        setShowSuccess(false);
      }, 5000);
      timeoutRefs.current.add(successTimeoutId3);
      SPContext.logger.success('ComplianceReviewForm: Request resubmitted for review');
    } catch (resubmitError: unknown) {
      const errorMessage =
        resubmitError instanceof Error ? resubmitError.message : 'Failed to resubmit for review';
      setError(errorMessage);
      SPContext.logger.error('ComplianceReviewForm: Resubmit failed', resubmitError);
    } finally {
      setIsResubmitting(false);
    }
  }, [itemId, getValues, reset, loadRequest]);

  if (!currentRequest) {
    return null;
  }

  // Check if review is completed (has outcome or completed status)
  const isReviewCompleted = currentRequest.complianceReview?.status === ComplianceReviewStatus.Completed;
  const completedOutcome = currentRequest.complianceReview?.outcome;
  const hasComplianceReviewData = isReviewCompleted || completedOutcome;

  // Check if compliance review is applicable based on review audience
  const reviewAudience = currentRequest.reviewAudience;
  const isComplianceReviewRequired = reviewAudience === 'Compliance' || reviewAudience === 'Both';

  // Don't show if compliance review is not required AND there's no completed review data
  // (If there's completed review data, always show it regardless of reviewAudience)
  if (!isComplianceReviewRequired && !hasComplianceReviewData) {
    return null;
  }

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
            completedOn={currentRequest.complianceReviewCompletedOn || currentRequest.complianceStatusUpdatedOn}
            completedBy={
              currentRequest.complianceReviewCompletedBy?.title
                ? { title: currentRequest.complianceReviewCompletedBy.title, email: currentRequest.complianceReviewCompletedBy.email }
                : currentRequest.complianceStatusUpdatedBy?.title
                  ? { title: currentRequest.complianceStatusUpdatedBy.title, email: currentRequest.complianceStatusUpdatedBy.email }
                  : undefined
            }
            durationMinutes={durationMinutes}
          />
        </Header>

        <Content padding='comfortable'>
          <Stack tokens={{ childrenGap: 16 }}>
            {/* Show note history read-only using append-only SPTextField */}
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
                  historyConfig={{
                    initialDisplayCount: 10,
                    showUserPhoto: true,
                  }}
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

              {currentRequest.complianceReview?.isForesideReviewRequired && (
                <>
                  <FormItem fieldName='recordRetentionOnly'>
                    <FormLabel>For Record Retention Purpose Only</FormLabel>
                    <Text>{currentRequest.complianceReview?.recordRetentionOnly ? 'Yes' : 'No'}</Text>
                  </FormItem>

                  <FormItem fieldName='isRetailUse'>
                    <FormLabel>Retail Use</FormLabel>
                    <Text>{currentRequest.complianceReview?.isRetailUse ? 'Yes' : 'No'}</Text>
                  </FormItem>
                </>
              )}
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
          // Pass waiting status for resubmit workflow display
          // Shows "Waiting on Submitter" or "Waiting on Compliance" badge with timestamp
          waitingStatus={
            reviewStatus === ComplianceReviewStatus.WaitingOnSubmitter
              ? 'waiting-on-submitter'
              : reviewStatus === ComplianceReviewStatus.WaitingOnCompliance
                ? 'waiting-on-reviewer'
                : undefined
          }
          waitingSince={
            (reviewStatus === ComplianceReviewStatus.WaitingOnSubmitter ||
              reviewStatus === ComplianceReviewStatus.WaitingOnCompliance)
              ? currentRequest.complianceStatusUpdatedOn
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

          {/* Waiting on submitter - unified form for both submitter and reviewer
              Review Outcome is disabled for submitter but enabled for reviewer
              Action buttons shown in Card Footer based on user permissions */}
          {reviewStatus === ComplianceReviewStatus.WaitingOnSubmitter ? (
            <form onSubmit={handleSubmit(handlePreSubmit)}>
              <Stack tokens={{ childrenGap: 20 }}>
                {/* Review Outcome Selection - disabled for submitter, enabled for reviewer */}
                <FormContainer labelWidth='200px'>
                  <FormItem fieldName='complianceReviewOutcome'>
                    <FormLabel isRequired={canReview} infoText='Select your review decision'>
                      Review Outcome
                    </FormLabel>
                    <SPChoiceField
                      name='complianceReviewOutcome'
                      choices={REVIEW_OUTCOME_CHOICES}
                      placeholder='Select an outcome...'
                      disabled={!canReview}
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
                      key={`compliance-review-notes-resubmit-${historyRefreshKey}`}
                      name='complianceReviewNotes'
                      placeholder='Provide detailed compliance review notes, comments, and recommendations'
                      mode={SPTextFieldMode.MultiLine}
                      rows={4}
                      maxLength={RESUBMIT_NOTES_MAX_LENGTH}
                      showCharacterCount
                      stylingMode='outlined'
                      spellCheck
                      disabled={!canEditSubmitterNotes}
                      appendOnly
                      itemId={itemId}
                      listNameOrId='Requests'
                      fieldInternalName='ComplianceReviewNotes'
                    />
                  </FormItem>
                </FormContainer>

                {/* Compliance-specific fields - only editable by reviewer */}
                <Separator />
                <Stack tokens={{ childrenGap: 12 }}>
                  <StyledBooleanCallout
                    label='Foreside Review Required'
                    helpText='Indicate if Foreside review is required for this request.'
                    checked={isForesideReviewRequired}
                    disabled={!canReview}
                    onChange={handleForesideChange}
                  />
                  {isForesideReviewRequired && (
                    <>
                      <StyledBooleanCallout
                        label='For Record Retention Purpose Only'
                        helpText='Indicate if this is for record retention purposes only.'
                        checked={recordRetentionOnly}
                        disabled={!canReview}
                        onChange={(val) => setValue('recordRetentionOnly', val, { shouldDirty: true })}
                      />
                      <StyledBooleanCallout
                        label='Retail Use'
                        helpText='Indicate if this will be used for retail purposes.'
                        checked={isRetailUse}
                        disabled={!canReview}
                        onChange={(val) => setValue('isRetailUse', val, { shouldDirty: true })}
                      />
                    </>
                  )}
                </Stack>
              </Stack>
            </form>
          ) : reviewStatus === ComplianceReviewStatus.WaitingOnCompliance ? (
            // Waiting on Compliance - show message to reviewers that submitter has resubmitted
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

              {/* Standard review form for compliance reviewer - actions in Footer */}
              <form onSubmit={handleSubmit(handlePreSubmit)}>
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
                        disabled={!canReview}
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
                        key={`compliance-review-notes-waiting-${historyRefreshKey}`}
                        name='complianceReviewNotes'
                        placeholder='Provide detailed compliance review notes, comments, and recommendations'
                        mode={SPTextFieldMode.MultiLine}
                        rows={4}
                        maxLength={RESUBMIT_NOTES_MAX_LENGTH}
                        showCharacterCount
                        stylingMode='outlined'
                        spellCheck
                        disabled={!canReview}
                        appendOnly
                        itemId={itemId}
                        listNameOrId='Requests'
                        fieldInternalName='ComplianceReviewNotes'
                      />
                    </FormItem>
                  </FormContainer>

                  <Separator />

                  {/* Compliance-specific fields - After Review Notes */}
                  <Stack tokens={{ childrenGap: 12 }}>
                    <StyledBooleanCallout
                      label='Foreside Review Required'
                      helpText='Indicate if Foreside review is required for this request.'
                      checked={isForesideReviewRequired}
                      disabled={!canReview}
                      onChange={handleForesideChange}
                    />
                    {isForesideReviewRequired && (
                      <>
                        <StyledBooleanCallout
                          label='For Record Retention Purpose Only'
                          helpText='Indicate if this is for record retention purposes only.'
                          checked={recordRetentionOnly}
                          disabled={!canReview}
                          onChange={(val) => setValue('recordRetentionOnly', val, { shouldDirty: true })}
                        />
                        <StyledBooleanCallout
                          label='Retail Use'
                          helpText='Indicate if this will be used for retail purposes.'
                          checked={isRetailUse}
                          disabled={!canReview}
                          onChange={(val) => setValue('isRetailUse', val, { shouldDirty: true })}
                        />
                      </>
                    )}
                  </Stack>
                </Stack>
              </form>
            </Stack>
          ) : (
            // Normal review form - actions in Footer
            <form onSubmit={handleSubmit(handlePreSubmit)}>
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
                      disabled={!canReview}
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
                      maxLength={RESUBMIT_NOTES_MAX_LENGTH}
                      showCharacterCount
                      stylingMode='outlined'
                      spellCheck
                      disabled={!canReview}
                      appendOnly
                      itemId={itemId}
                      listNameOrId='Requests'
                      fieldInternalName='ComplianceReviewNotes'
                    />
                  </FormItem>
                </FormContainer>

                <Separator />

                {/* Compliance-specific fields - After Review Notes */}
                <Stack tokens={{ childrenGap: 12 }}>
                  <StyledBooleanCallout
                    label='Foreside Review Required'
                    helpText='Indicate if Foreside review is required for this request.'
                    checked={isForesideReviewRequired}
                    disabled={!canReview}
                    onChange={handleForesideChange}
                  />
                  {isForesideReviewRequired && (
                    <>
                      <StyledBooleanCallout
                        label='For Record Retention Purpose Only'
                        helpText='Indicate if this is for record retention purposes only.'
                        checked={recordRetentionOnly}
                        disabled={!canReview}
                        onChange={(val) => setValue('recordRetentionOnly', val, { shouldDirty: true })}
                      />
                      <StyledBooleanCallout
                        label='Retail Use'
                        helpText='Indicate if this will be used for retail purposes.'
                        checked={isRetailUse}
                        disabled={!canReview}
                        onChange={(val) => setValue('isRetailUse', val, { shouldDirty: true })}
                      />
                    </>
                  )}
                </Stack>
              {/* Validation errors - at the end of content */}
              <ValidationErrorContainer
                errors={complianceReviewValidationErrors}
                onScrollToField={handleScrollToField}
                filterFields={complianceReviewFields}
              />
              </Stack>
            </form>
          )}
        </FormProvider>
      </Content>

      {/* Card Footer with action buttons for all in-progress states */}
      <Footer borderTop padding='comfortable'>
          <Stack tokens={{ childrenGap: 12 }}>
            {/* Checkout warnings */}
            {checkoutEnabled && currentUserHasCheckouts && (
              <MessageBar
                messageBarType={MessageBarType.warning}
                isMultiline={false}
                styles={{ root: { borderRadius: '4px' } }}
                actions={
                  <DefaultButton
                    text={isDoneReviewingAll ? 'Completing...' : 'Mark All as Done'}
                    onClick={handleDoneReviewingAll}
                    disabled={isDoneReviewingAll}
                    styles={{ root: { minHeight: '32px' } }}
                  />
                }
              >
                <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 6 }}>
                  <Icon iconName='Lock' />
                  <Text>
                    You&apos;re reviewing {requestCheckoutStatus!.checkedOutByCurrentUser.length} file{requestCheckoutStatus!.checkedOutByCurrentUser.length !== 1 ? 's' : ''}. Finish reviewing before submitting.
                  </Text>
                </Stack>
              </MessageBar>
            )}

            {checkoutEnabled && othersHaveCheckouts && (
              <MessageBar
                messageBarType={MessageBarType.info}
                isMultiline={false}
                styles={{ root: { borderRadius: '4px' } }}
              >
                <Text>
                  {requestCheckoutStatus!.checkedOutByOthers.length} file{requestCheckoutStatus!.checkedOutByOthers.length !== 1 ? 's are' : ' is'} being reviewed by {requestCheckoutStatus!.checkedOutByOthers.map((c) => c.checkedOutByName || 'another user').filter((v, i, a) => a.indexOf(v) === i).join(', ')}.
                </Text>
              </MessageBar>
            )}

            <Stack
              horizontal
              tokens={{ childrenGap: 12 }}
              horizontalAlign={reviewStatus === ComplianceReviewStatus.WaitingOnSubmitter ? 'space-between' : 'end'}
              verticalAlign='center'
              wrap
            >
            {/* Submitter actions - only for WaitingOnSubmitter state AND only for the request owner/admin */}
            {canResubmit && (
              <Stack horizontal tokens={{ childrenGap: 12 }}>
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
            )}

            {/* Reviewer actions - visible to reviewers in all in-progress states */}
            {canReview && (
              <Stack horizontal tokens={{ childrenGap: 12 }}>
                <DefaultButton
                  text={isSaving ? 'Saving...' : 'Save Progress'}
                  iconProps={{ iconName: isSaving ? undefined : 'Save' }}
                  onClick={handleSaveProgress}
                  disabled={isLoading || isSaving}
                  styles={{
                    root: { minWidth: '120px', height: '40px', borderRadius: '4px' },
                  }}
                >
                  {isSaving && (
                    <Spinner size={SpinnerSize.xSmall} styles={{ root: { marginRight: 8 } }} />
                  )}
                </DefaultButton>
                <PrimaryButton
                  text='Submit Review'
                  iconProps={{ iconName: 'CheckMark' }}
                  onClick={handleSubmit(handlePreSubmit)}
                  disabled={isLoading || isSaving || !selectedOutcome || !canReview || currentUserHasCheckouts}
                  styles={{
                    root: { minWidth: '140px', height: '40px', borderRadius: '4px' },
                  }}
                />
              </Stack>
            )}
            </Stack>
          </Stack>
      </Footer>

      {/* Checkout validation dialog (safety net for transition blocking) */}
      {checkoutValidation && (
        <CheckoutValidationDialog
          isOpen={!!checkoutValidation}
          validation={checkoutValidation}
          isAdmin={isAdmin}
          onDoneReviewingAndSubmit={handleDoneReviewingAndSubmit}
          onForceResolveAndSubmit={isAdmin ? handleForceResolveAndSubmit : undefined}
          onProceed={handleProceedWithOthers}
          onGoBack={handleDialogGoBack}
          isProcessing={isDialogProcessing}
        />
      )}
    </Card>
  );
};

export default ComplianceReviewForm;

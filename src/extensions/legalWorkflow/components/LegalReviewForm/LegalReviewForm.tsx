/**
 * LegalReviewForm Component
 *
 * Collapsible form for attorney to conduct legal review.
 * Used when request status is "In Review" and review audience includes Legal.
 *
 * Simplified structure:
 * - Collapsible card with review notes and action buttons
 * - No duplicate request summary (shown in main RequestSummary)
 * - No duplicate documents section (shown in RequestDocuments)
 */

import * as React from 'react';
import { useForm } from 'react-hook-form';

// Fluent UI - tree-shaken imports
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { Checkbox } from '@fluentui/react/lib/Checkbox';
import { Icon } from '@fluentui/react/lib/Icon';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
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
import { SPTextField, SPTextFieldMode, SPChoiceField } from 'spfx-toolkit/lib/components/spFields';

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
  saveLegalReviewProgress,
  resubmitForLegalReview,
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

import './LegalReviewForm.scss';

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
 * Legal Review form data
 */
interface ILegalReviewFormData {
  legalReviewStatus: LegalReviewStatus;
  legalReviewOutcome?: ReviewOutcome;
  legalReviewNotes?: string;
  submitterRequestNotes?: string;
}

/**
 * LegalReviewForm props
 */
interface ILegalReviewFormProps {
  /** Make the entire form collapsible */
  collapsible?: boolean;
  /** Start collapsed (only applies if collapsible is true) */
  defaultCollapsed?: boolean;
}

/**
 * LegalReviewForm Component
 */
export const LegalReviewForm: React.FC<ILegalReviewFormProps> = ({ defaultCollapsed = false }) => {
  const { currentRequest, isLoading, itemId } = useRequestStore(
    useShallow((s) => ({
      currentRequest: s.currentRequest,
      isLoading: s.isLoading,
      itemId: s.itemId,
    }))
  );
  const { submitLegalReview: submitLegalReviewAction, loadRequest } = useRequestActions();

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
  const [autoReleaseOnSubmit, setAutoReleaseOnSubmit] = React.useState(true);

  const handleDoneReviewingAll = React.useCallback(async (): Promise<void> => {
    if (!itemId || !requestCheckoutStatus?.currentUserHasCheckouts) return;
    try {
      setIsDoneReviewingAll(true);
      const results = await doneReviewingAll(allDocumentsFlat);
      const failCount = results.filter(function(r) { return !r.success; }).length;

      if (failCount > 0) {
        setError(failCount + ' file(s) could not be checked in. Please try again.');
      } else {
        SPContext.logger.success('LegalReviewForm: All reviews marked as done');
      }

      // Reload documents to refresh checkout state so submit gating updates
      await loadDocuments(itemId, true);
    } catch (doneError: unknown) {
      const msg = doneError instanceof Error ? doneError.message : 'Failed to complete reviews';
      setError(msg);
      SPContext.logger.error('LegalReviewForm: Done reviewing all failed', doneError);
    }
    setIsDoneReviewingAll(false);
  }, [itemId, requestCheckoutStatus, allDocumentsFlat, loadDocuments]);

  // Checkout validation dialog state
  const [checkoutValidation, setCheckoutValidation] = React.useState<ICheckoutValidationResult | undefined>(undefined);
  const [pendingFormData, setPendingFormData] = React.useState<ILegalReviewFormData | undefined>(undefined);
  const [isDialogProcessing, setIsDialogProcessing] = React.useState(false);

  // Determine if completing this review would trigger a final transition (all reviews done → Closeout)
  const isFinalTransition = React.useMemo((): boolean => {
    if (!currentRequest) return false;
    const audience = currentRequest.reviewAudience;
    if (audience === 'Legal') return true; // Only legal needed, completing it is final
    if (audience === 'Both') {
      // Final if compliance is already completed
      return currentRequest.complianceReview?.status === ComplianceReviewStatus.Completed;
    }
    return false;
  }, [currentRequest]);

  // Get validation errors from RequestFormContext
  const formContext = useRequestFormContextSafe();
  const contextValidationErrors = formContext?.validationErrors ?? [];

  // Filter validation errors to only show Legal Review related fields
  const legalReviewFields = ['legalReviewOutcome', 'legalReviewNotes'];
  const legalReviewValidationErrors = React.useMemo(() => {
    return contextValidationErrors.filter(err => legalReviewFields.includes(err.field));
  }, [contextValidationErrors]);

  // Scroll to field handler for validation errors
  const handleScrollToField = React.useCallback((fieldName: string) => {
    const element = document.querySelector(`[data-field-name="${fieldName}"]`) ||
      document.getElementById(`legal-review-${fieldName}`);
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
  const { control, handleSubmit, watch, reset, formState, getValues } =
    useForm<ILegalReviewFormData>({
      defaultValues: {
        legalReviewStatus: currentRequest?.legalReview?.status || LegalReviewStatus.NotStarted,
        legalReviewOutcome: currentRequest?.legalReview?.outcome,
        legalReviewNotes: currentRequest?.legalReview?.reviewNotes,
      },
      mode: 'onSubmit',
      reValidateMode: 'onChange',
    });

  // Use scroll to error hook
  const { scrollToFirstError } = useScrollToError(formState as any);

  const reviewStatus = watch('legalReviewStatus');
  const selectedOutcome = watch('legalReviewOutcome');
  const { fields, context: visibilityContext } = useUIVisibility();
  const { isAdmin } = usePermissions();
  const canReview = fields.legalReview.canEdit;
  const canResubmit =
    reviewStatus === LegalReviewStatus.WaitingOnSubmitter &&
    (visibilityContext.isOwner || isAdmin);
  const canEditSubmitterNotes = canReview || canResubmit;

  // Sync form with store when currentRequest changes
  React.useEffect(() => {
    if (currentRequest?.legalReview) {
      reset({
        legalReviewStatus: currentRequest.legalReview.status || LegalReviewStatus.NotStarted,
        legalReviewOutcome: currentRequest.legalReview.outcome,
        legalReviewNotes: currentRequest.legalReview.reviewNotes,
      });
    }
  }, [currentRequest?.legalReview, reset]);

  /**
   * Handle submit review with selected outcome
   */
  const onSubmit = React.useCallback(
    async (data: ILegalReviewFormData): Promise<void> => {
      if (!itemId) return;

      try {
        if (!data.legalReviewOutcome) {
          setError('Please select a review outcome before submitting.');
          return;
        }

        setIsSaving(true);
        setError(undefined);

        // Auto-release checked-out documents before submitting if checkbox is checked
        if (autoReleaseOnSubmit && currentUserHasCheckouts) {
          SPContext.logger.info('LegalReviewForm: Auto-releasing checked-out documents before submit');
          try {
            const releaseResults = await doneReviewingAll(allDocumentsFlat);
            const failCount = releaseResults.filter(function(r) { return !r.success; }).length;
            if (failCount > 0) {
              setError(failCount + ' file(s) could not be released. Please release them manually before submitting.');
              setIsSaving(false);
              return;
            }
            // Reload documents to refresh checkout state
            if (itemId) {
              await loadDocuments(itemId, true);
            }
          } catch (releaseError: unknown) {
            const msg = releaseError instanceof Error ? releaseError.message : 'Failed to release documents';
            setError('Could not release documents: ' + msg);
            setIsSaving(false);
            return;
          }
        }

        SPContext.logger.info('LegalReviewForm: Submitting review', {
          outcome: data.legalReviewOutcome,
          notes: data.legalReviewNotes ? 'provided' : 'none',
        });

        // Use store action to submit - this updates the store automatically
        await submitLegalReviewAction(
          data.legalReviewOutcome,
          data.legalReviewNotes || ''
        );

        // Reload request to ensure store has latest data including review notes
        if (itemId) {
          await loadRequest(itemId);
        }

        // Reset form with cleared notes for append-only field
        reset({
          legalReviewStatus: LegalReviewStatus.Completed,
          legalReviewOutcome: data.legalReviewOutcome,
          legalReviewNotes: undefined, // Clear for append-only
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
        SPContext.logger.success('LegalReviewForm: Review submitted successfully');
      } catch (submitError: unknown) {
        const errorMessage =
          submitError instanceof Error ? submitError.message : 'Failed to submit review';
        setError(errorMessage);
        scrollToFirstError();
        SPContext.logger.error('LegalReviewForm: Review submission failed', submitError);
      } finally {
        setIsSaving(false);
      }
    },
    [itemId, scrollToFirstError, reset, loadRequest, autoReleaseOnSubmit, currentUserHasCheckouts, allDocumentsFlat, loadDocuments]
  );

  /**
   * Pre-submit checkout validation.
   * If checkout validation fails, show dialog instead of proceeding.
   * For resubmit outcomes, skip checkout validation (no transition).
   */
  const handlePreSubmit = React.useCallback(
    async (data: ILegalReviewFormData): Promise<void> => {
      const isResubmit = data.legalReviewOutcome === ReviewOutcome.RespondToCommentsAndResubmit;
      if (!isResubmit && checkoutEnabled) {
        let documentsToValidate = allDocumentsFlat;

        if (itemId) {
          try {
            await loadDocuments(itemId, true);
            const freshDocs = useDocumentsStore.getState().documents;
            const freshFlat: IDocument[] = [];
            freshDocs.forEach(function(docs) {
              for (let i = 0; i < docs.length; i++) {
                freshFlat.push(docs[i]);
              }
            });
            documentsToValidate = freshFlat;
          } catch (loadError: unknown) {
            const message = loadError instanceof Error ? loadError.message : 'Failed to refresh document checkout status';
            setError(message);
            SPContext.logger.error('LegalReviewForm: Failed to refresh checkout state before submit', loadError);
            return;
          }
        }

        const validation = validateCheckoutForTransition(documentsToValidate, isFinalTransition);
        if (!validation.canProceed || validation.othersHaveCheckouts) {
          setPendingFormData(data);
          setCheckoutValidation(validation);
          return;
        }
      }
      await onSubmit(data);
    },
    [checkoutEnabled, allDocumentsFlat, isFinalTransition, itemId, loadDocuments, onSubmit]
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

      SPContext.logger.info('LegalReviewForm: Saving progress', {
        notes: formData.legalReviewNotes ? 'provided' : 'none',
        outcome: formData.legalReviewOutcome || 'none',
      });

      // Use dedicated workflow action for save progress
      await saveLegalReviewProgress(itemId, {
        outcome: formData.legalReviewOutcome,
        notes: formData.legalReviewNotes,
      });

      // Reload request to update store with server data
      await loadRequest(itemId);

      // Reset form notes for append-only field
      reset({
        legalReviewStatus: LegalReviewStatus.InProgress,
        legalReviewOutcome: formData.legalReviewOutcome,
        legalReviewNotes: undefined, // Clear for append-only
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
      SPContext.logger.success('LegalReviewForm: Progress saved');
    } catch (saveError: unknown) {
      const errorMessage =
        saveError instanceof Error ? saveError.message : 'Failed to save progress';
      setError(errorMessage);
      SPContext.logger.error('LegalReviewForm: Save progress failed', saveError);
    } finally {
      setIsSaving(false);
    }
  }, [itemId, getValues, reset]);

  /**
   * Handle resubmit for review (submitter action)
   *
   * Called when the submitter has addressed the reviewer's comments and is ready
   * for the attorney to review again. This is part of the "Respond To Comments And Resubmit"
   * workflow where:
   * 1. Attorney sets outcome to "Respond To Comments And Resubmit"
   * 2. Review status changes to "Waiting On Submitter"
   * 3. Submitter addresses comments, updates request/documents/approvals
   * 4. Submitter clicks "Resubmit for Review" (this handler)
   * 5. Review status changes to "Waiting On Attorney"
   * 6. Attorney reviews again and can repeat or set final outcome
   */
  const handleResubmitForReview = React.useCallback(async (): Promise<void> => {
    if (!itemId) return;

    try {
      setIsResubmitting(true);
      setError(undefined);

      const formData = getValues();

      SPContext.logger.info('LegalReviewForm: Resubmitting for review', {
        itemId,
        notes: formData.legalReviewNotes ? 'provided' : 'none',
      });

      // Use dedicated resubmit action - changes status from WaitingOnSubmitter to WaitingOnAttorney
      // and calculates time tracking for submitter's work
      await resubmitForLegalReview(itemId, {
        notes: formData.legalReviewNotes,
      });

      // Reload request to update store with server data
      await loadRequest(itemId);

      // Reset form notes for append-only field
      reset({
        legalReviewStatus: LegalReviewStatus.WaitingOnAttorney,
        legalReviewOutcome: ReviewOutcome.RespondToCommentsAndResubmit, // Outcome stays the same
        legalReviewNotes: undefined, // Clear for append-only
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
      SPContext.logger.success('LegalReviewForm: Request resubmitted for review');
    } catch (resubmitError: unknown) {
      const errorMessage =
        resubmitError instanceof Error ? resubmitError.message : 'Failed to resubmit for review';
      setError(errorMessage);
      SPContext.logger.error('LegalReviewForm: Resubmit failed', resubmitError);
    } finally {
      setIsResubmitting(false);
    }
  }, [itemId, getValues, reset, loadRequest]);

  if (!currentRequest) {
    return null;
  }

  // Check if review is completed (has outcome or completed status)
  const isReviewCompleted = currentRequest.legalReview?.status === LegalReviewStatus.Completed;
  const completedOutcome = currentRequest.legalReview?.outcome;
  const hasLegalReviewData = isReviewCompleted || completedOutcome;

  // Check if legal review is applicable based on review audience
  const reviewAudience = currentRequest.reviewAudience;
  const isLegalReviewRequired = reviewAudience === 'Legal' || reviewAudience === 'Both';

  // Don't show if legal review is not required AND there's no completed review data
  // (If there's completed review data, always show it regardless of reviewAudience)
  if (!isLegalReviewRequired && !hasLegalReviewData) {
    return null;
  }

  // When completed, collapse by default and show green header
  const shouldDefaultCollapse = isReviewCompleted || defaultCollapsed;

  // Get start date (when legal review started - use legalStatusUpdatedOn or submittedForReviewOn)
  const startedOn = currentRequest.legalStatusUpdatedOn || currentRequest.submittedForReviewOn;

  // Calculate duration for header using business hours
  const durationMinutes = calculateDurationMinutes(
    startedOn,
    currentRequest.legalReviewCompletedOn
  );

  // If completed, show read-only summary view
  if (isReviewCompleted) {
    return (
      <Card
        id='legal-review-card'
        className='legal-review-form legal-review-form--completed'
        allowExpand={true}
        defaultExpanded={false}
      >
        <Header size='regular'>
          <WorkflowCardHeader
            title='Legal Review'
            status='completed'
            outcome={toHeaderOutcome(completedOutcome)}
            startedOn={startedOn}
            completedOn={currentRequest.legalReviewCompletedOn || currentRequest.legalStatusUpdatedOn}
            completedBy={
              currentRequest.legalReviewCompletedBy?.title
                ? { title: currentRequest.legalReviewCompletedBy.title, email: currentRequest.legalReviewCompletedBy.email }
                : currentRequest.legalStatusUpdatedBy?.title
                  ? { title: currentRequest.legalStatusUpdatedBy.title, email: currentRequest.legalStatusUpdatedBy.email }
                  : undefined
            }
            attorney={currentRequest.attorney
              ?.filter((a): a is typeof a & { title: string } => !!a.title)
              .map(a => ({ title: a.title, email: a.email }))
            }
            durationMinutes={durationMinutes}
          />
        </Header>

        <Content padding='comfortable'>
          <Stack tokens={{ childrenGap: 16 }}>
            {/* Show note history read-only using append-only SPTextField */}
            <FormContainer labelWidth='150px'>
              <FormItem fieldName='reviewNotes'>
                <FormLabel>Review Notes</FormLabel>
                <SPTextField
                  key={`legal-review-notes-readonly-${historyRefreshKey}`}
                  name='legalReviewNotes'
                  mode={SPTextFieldMode.MultiLine}
                  rows={2}
                  readOnly
                  disabled
                  appendOnly
                  itemId={itemId}
                  listNameOrId='Requests'
                  fieldInternalName='LegalReviewNotes'
                  historyConfig={{
                    initialDisplayCount: 10,
                    showUserPhoto: true,
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
    <Card
      id='legal-review-card'
      className='legal-review-form'
      allowExpand={true}
      defaultExpanded={!shouldDefaultCollapse}
    >
      <Header size='regular'>
        <WorkflowCardHeader
          title='Legal Review'
          status='in-progress'
          startedOn={startedOn}
          attorney={currentRequest.attorney
            ?.filter((a): a is typeof a & { title: string } => !!a.title)
            .map(a => ({ title: a.title, email: a.email }))
          }
          durationMinutes={durationMinutes}
          // Pass waiting status for resubmit workflow display
          // Shows "Waiting on Submitter" or "Waiting on Attorney" badge with timestamp
          waitingStatus={
            reviewStatus === LegalReviewStatus.WaitingOnSubmitter
              ? 'waiting-on-submitter'
              : reviewStatus === LegalReviewStatus.WaitingOnAttorney
                ? 'waiting-on-reviewer'
                : undefined
          }
          waitingSince={
            (reviewStatus === LegalReviewStatus.WaitingOnSubmitter ||
              reviewStatus === LegalReviewStatus.WaitingOnAttorney)
              ? currentRequest.legalStatusUpdatedOn
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
          {reviewStatus === LegalReviewStatus.WaitingOnSubmitter ? (
            <form onSubmit={handleSubmit(handlePreSubmit)}>
              <Stack tokens={{ childrenGap: 20 }}>
                {/* Review Outcome Selection - disabled for submitter, enabled for reviewer */}
                <FormContainer labelWidth='150px'>
                  <FormItem fieldName='legalReviewOutcome'>
                    <FormLabel isRequired={canReview} infoText='Select your review decision'>
                      Review Outcome
                    </FormLabel>
                    <SPChoiceField
                      name='legalReviewOutcome'
                      choices={REVIEW_OUTCOME_CHOICES}
                      placeholder='Select an outcome...'
                      disabled={!canReview}
                    />
                  </FormItem>
                </FormContainer>

                {/* Review Notes */}
                <FormContainer labelWidth='150px'>
                  <FormItem fieldName='legalReviewNotes'>
                    <FormLabel infoText='Detailed review notes, comments, and recommendations'>
                      Review Notes
                    </FormLabel>
                    <SPTextField
                      key={`legal-review-notes-resubmit-${historyRefreshKey}`}
                      name='legalReviewNotes'
                      placeholder='Provide detailed review notes, comments, and recommendations'
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
                      fieldInternalName='LegalReviewNotes'
                    />
                  </FormItem>
                </FormContainer>
              </Stack>
            </form>
          ) : reviewStatus === LegalReviewStatus.WaitingOnAttorney ? (
            // Waiting on Attorney - show message to reviewers that submitter has resubmitted
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

              {/* Standard review form for attorney - actions in Footer */}
              <form onSubmit={handleSubmit(handlePreSubmit)}>
                <Stack tokens={{ childrenGap: 20 }}>
                  {/* Review Outcome Selection */}
                  <FormContainer labelWidth='150px'>
                    <FormItem fieldName='legalReviewOutcome'>
                      <FormLabel isRequired infoText='Select your review decision'>
                        Review Outcome
                      </FormLabel>
                      <SPChoiceField
                        name='legalReviewOutcome'
                        choices={REVIEW_OUTCOME_CHOICES}
                        placeholder='Select an outcome...'
                        disabled={!canReview}
                      />
                    </FormItem>
                  </FormContainer>

                  {/* Review Notes */}
                  <FormContainer labelWidth='150px'>
                    <FormItem fieldName='legalReviewNotes'>
                      <FormLabel infoText='Detailed review notes, comments, and recommendations'>
                        Review Notes
                      </FormLabel>
                      <SPTextField
                        key={`legal-review-notes-waiting-${historyRefreshKey}`}
                        name='legalReviewNotes'
                        placeholder='Provide detailed review notes, comments, and recommendations'
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
                        fieldInternalName='LegalReviewNotes'
                      />
                    </FormItem>
                  </FormContainer>
                </Stack>
              </form>
            </Stack>
          ) : (
            // Normal review form - actions in Footer
            <form onSubmit={handleSubmit(handlePreSubmit)}>
              <Stack tokens={{ childrenGap: 20 }}>
                {/* Review Outcome Selection */}
                <FormContainer labelWidth='150px'>
                  <FormItem fieldName='legalReviewOutcome'>
                    <FormLabel isRequired infoText='Select your review decision'>
                      Review Outcome
                    </FormLabel>
                    <SPChoiceField
                      name='legalReviewOutcome'
                      choices={REVIEW_OUTCOME_CHOICES}
                      placeholder='Select an outcome...'
                      disabled={!canReview}
                    />
                  </FormItem>
                </FormContainer>

                {/* Review Notes */}
                <FormContainer labelWidth='150px'>
                  <FormItem fieldName='legalReviewNotes'>
                    <FormLabel infoText='Detailed review notes, comments, and recommendations'>
                      Review Notes
                    </FormLabel>
                    <SPTextField
                      key={`legal-review-notes-${historyRefreshKey}`}
                      name='legalReviewNotes'
                      placeholder='Provide detailed review notes, comments, and recommendations'
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
                      fieldInternalName='LegalReviewNotes'
                    />
                  </FormItem>
                </FormContainer>
              {/* Validation errors - at the end of content */}
              <ValidationErrorContainer
                errors={legalReviewValidationErrors}
                onScrollToField={handleScrollToField}
                filterFields={legalReviewFields}
              />
              </Stack>
            </form>
          )}
        </FormProvider>
      </Content>

      {/* Card Footer with action buttons for all in-progress states */}
      <Footer borderTop padding='comfortable'>
          <Stack tokens={{ childrenGap: 12 }}>
            {/* Checkout: auto-release checkbox + manual release option */}
            {checkoutEnabled && currentUserHasCheckouts && (
              <MessageBar
                messageBarType={MessageBarType.info}
                isMultiline
                styles={{ root: { borderRadius: '4px' } }}
              >
                <Stack tokens={{ childrenGap: 8 }}>
                  <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 6 }}>
                    <Icon iconName='Lock' />
                    <Text>
                      You have {requestCheckoutStatus!.checkedOutByCurrentUser.length} file{requestCheckoutStatus!.checkedOutByCurrentUser.length !== 1 ? 's' : ''} checked out for review.
                    </Text>
                  </Stack>
                  <Checkbox
                    label='Release all my checked-out documents when I submit my review decision'
                    checked={autoReleaseOnSubmit}
                    onChange={(_, checked) => setAutoReleaseOnSubmit(!!checked)}
                    styles={{ root: { marginLeft: 4 }, label: { fontWeight: 400 } }}
                  />
                  {!autoReleaseOnSubmit && (
                    <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 8 }}>
                      <DefaultButton
                        text={isDoneReviewingAll ? 'Releasing...' : 'Release Files Now'}
                        iconProps={{ iconName: 'Unlock' }}
                        onClick={handleDoneReviewingAll}
                        disabled={isDoneReviewingAll}
                        styles={{ root: { minHeight: '32px' } }}
                      />
                      <Text variant='small' styles={{ root: { color: '#605e5c' } }}>
                        You must release files before submitting if the checkbox above is unchecked.
                      </Text>
                    </Stack>
                  )}
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
              horizontalAlign={reviewStatus === LegalReviewStatus.WaitingOnSubmitter ? 'space-between' : 'end'}
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
                  disabled={isLoading || isSaving || !selectedOutcome || !canReview || (currentUserHasCheckouts && !autoReleaseOnSubmit)}
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

export default LegalReviewForm;

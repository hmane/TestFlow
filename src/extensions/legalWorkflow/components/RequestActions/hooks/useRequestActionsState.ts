/**
 * RequestActions State Hook
 *
 * Manages state, handlers, and button visibility logic for RequestActions.
 */

import * as React from 'react';

import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import { useFormContext } from 'spfx-toolkit/lib/components/spForm';

import type { ReasonDialogAction } from '@components/ReasonDialog/ReasonDialog';
import { useRequestFormContext } from '@contexts/RequestFormContext';
import { usePermissions } from '@hooks/usePermissions';
import { useWorkflowPermissions } from '@hooks/useWorkflowPermissions';
import { useRequestStore } from '@stores/requestStore';
import { useLegalIntakeStore } from '@stores/legalIntakeStore';
import { useCloseoutStore } from '@stores/closeoutStore';
import { useDocumentsStore } from '@stores/documentsStore';
import { RequestStatus, ReviewOutcome } from '@appTypes/workflowTypes';
import { DocumentType } from '@appTypes/documentTypes';
import {
  assignAttorneySchema,
  committeeAssignAttorneySchema,
  sendToCommitteeSchema,
} from '@schemas/workflowSchema';
import type { IValidationError } from '@contexts/RequestFormContext';

import { FIELD_LABELS, FIELD_ORDER, CUSTOM_SECTION_MAP, type ActiveAction } from '../constants';

/**
 * Return type for the useRequestActionsState hook
 */
export interface IUseRequestActionsStateReturn {
  // Context values
  isDirty: boolean;
  isLoading: boolean;
  validationErrors: IValidationError[];
  status: RequestStatus | undefined;
  itemId: number | undefined;
  isNewRequest: boolean;
  isOwner: boolean;
  permissions: ReturnType<typeof usePermissions>;
  permissionsLoading: boolean;

  // State
  activeAction: ActiveAction;
  showReasonDialog: boolean;
  reasonDialogAction: ReasonDialogAction;
  showUnsavedDialog: boolean;
  showSuperAdminPanel: boolean;
  setShowSuperAdminPanel: React.Dispatch<React.SetStateAction<boolean>>;

  // Refs
  errorContainerRef: React.RefObject<HTMLDivElement>;

  // Derived values
  sortedValidationErrors: IValidationError[];
  isAnyActionInProgress: boolean;
  loadingMessage: string;
  hasApprovedWithComments: boolean;
  isTrackingIdRequired: boolean;
  hasForesideDocuments: boolean;

  // Button visibility
  showSubmitRequest: boolean;
  showSaveAsDraft: boolean;
  showSave: boolean;
  showCancel: boolean;
  showOnHold: boolean;
  showResume: boolean;
  showAssignAttorney: boolean;
  showSendToCommittee: boolean;
  showCloseoutSubmit: boolean;
  showCompleteForesideDocuments: boolean;

  // Handlers
  getFieldLabel: (fieldName: string) => string;
  scrollToField: (fieldName: string) => void;
  handleSubmitClick: () => Promise<void>;
  handleSaveDraft: () => Promise<void>;
  handleClose: () => void;
  handleUnsavedConfirm: () => void;
  handleUnsavedCancel: () => void;
  handleCancelRequestClick: () => void;
  handlePutOnHoldClick: () => void;
  handleResumeClick: () => Promise<void>;
  handleSendToCommitteeClick: () => Promise<void>;
  handleAssignAttorneyClick: () => Promise<void>;
  handleCloseoutClick: () => Promise<void>;
  handleCompleteForesideDocumentsClick: () => Promise<void>;
  handleReasonConfirm: (reason: string) => Promise<void>;
  handleReasonCancel: () => void;
}

/**
 * Custom hook for RequestActions state management
 */
export function useRequestActionsState(props: {
  hideSubmit?: boolean;
  hideSaveDraft?: boolean;
}): IUseRequestActionsStateReturn {
  const { hideSubmit = false, hideSaveDraft = false } = props;

  const {
    onSubmitDirect,
    onSaveDraft,
    onPutOnHold,
    onCancelRequest,
    onClose,
    isDirty,
    isLoading,
    validationErrors,
    setValidationErrors,
    status,
    itemId,
  } = useRequestFormContext();

  // Get permission-based available actions and handlers
  const {
    availableActions,
    isLoading: permissionsLoading,
    sendToCommittee: workflowSendToCommittee,
    closeoutRequest: workflowCloseout,
    completeForesideDocuments: workflowCompleteForesideDocuments,
  } = useWorkflowPermissions();

  // Get user permissions for role checks
  const permissions = usePermissions();

  // Get current request for owner check
  const { currentRequest, assignAttorney: storeAssignAttorney } = useRequestStore();

  // Get legal intake form data
  const legalIntakeStore = useLegalIntakeStore();

  // Get closeout form data
  const closeoutStore = useCloseoutStore();

  // Get documents store for Foreside document validation
  const { documents, stagedFiles } = useDocumentsStore();

  // Get spfx-toolkit form context for scroll/focus functionality
  const spFormContext = useFormContext();

  // Super Admin Panel state
  const [showSuperAdminPanel, setShowSuperAdminPanel] = React.useState<boolean>(false);

  // Determine if this is a new request
  const isNewRequest = !itemId;

  // Check if current user is the owner
  const isOwner = React.useMemo((): boolean => {
    if (!currentRequest) return false;
    const currentUserId = SPContext.currentUser?.id?.toString() ?? '';
    return (
      currentRequest.submittedBy?.id === currentUserId ||
      currentRequest.author?.id === currentUserId
    );
  }, [currentRequest]);

  // Action state management
  const [activeAction, setActiveAction] = React.useState<ActiveAction>(undefined);
  const [showReasonDialog, setShowReasonDialog] = React.useState<boolean>(false);
  const [reasonDialogAction, setReasonDialogAction] = React.useState<ReasonDialogAction>('cancel');

  // Unsaved changes dialog state
  const [showUnsavedDialog, setShowUnsavedDialog] = React.useState<boolean>(false);
  const [pendingNavigation, setPendingNavigation] = React.useState<(() => void) | undefined>(undefined);

  // Ref for error container
  const errorContainerRef = React.useRef<HTMLDivElement>(null);

  /**
   * Get field order for sorting
   */
  const getFieldOrder = React.useCallback((fieldName: string): number => {
    const baseName = fieldName.split('.')[0];
    return FIELD_ORDER[baseName] ?? 999;
  }, []);

  /**
   * Sort validation errors to match form field order
   */
  const sortedValidationErrors = React.useMemo(() => {
    if (!validationErrors || validationErrors.length === 0) {
      return [];
    }
    return [...validationErrors].sort((a, b) => {
      const orderA = getFieldOrder(a.field);
      const orderB = getFieldOrder(b.field);
      return orderA - orderB;
    });
  }, [validationErrors, getFieldOrder]);

  // Track previous error count
  const prevErrorCountRef = React.useRef(0);

  // Auto-focus error container when errors first appear
  React.useEffect(() => {
    const currentCount = validationErrors?.length ?? 0;
    const prevCount = prevErrorCountRef.current;

    if (prevCount === 0 && currentCount > 0 && errorContainerRef.current) {
      setTimeout(() => {
        if (errorContainerRef.current) {
          errorContainerRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
          errorContainerRef.current.focus();
        }
      }, 100);
    }

    prevErrorCountRef.current = currentCount;
  }, [validationErrors]);

  /**
   * Get friendly field label from field name
   */
  const getFieldLabel = React.useCallback((fieldName: string): string => {
    const baseName = fieldName.split('.')[0];
    return (
      FIELD_LABELS[baseName] ||
      fieldName
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim()
    );
  }, []);

  /**
   * Scroll to a field when its error is clicked
   */
  const scrollToField = React.useCallback(
    (fieldName: string): void => {
      const baseName = fieldName.split('.')[0];
      const customSectionId = CUSTOM_SECTION_MAP[baseName];

      if (customSectionId) {
        const sectionElement = document.querySelector(`[data-card-id="${customSectionId}"]`);
        if (sectionElement) {
          sectionElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });

          setTimeout(() => {
            const firstInput = sectionElement.querySelector(
              'input, textarea, select, .dx-texteditor-input'
            ) as HTMLElement;
            if (firstInput) {
              firstInput.focus();
            }
            SPContext.logger.info('RequestActions: Scrolled to custom section', {
              fieldName,
              sectionId: customSectionId,
            });
          }, 300);
          return;
        }
      }

      // Use spfx-toolkit FormContext if available
      if (spFormContext) {
        const registeredField = spFormContext.registry.get(fieldName);
        if (registeredField?.ref?.current) {
          spFormContext.scrollToField(fieldName, { behavior: 'smooth', block: 'center' });
          setTimeout(() => {
            spFormContext.focusField(fieldName);
            SPContext.logger.info('RequestActions: Field scrolled/focused via FormContext', {
              fieldName,
            });
          }, 300);
          return;
        }
      }

      // DOM-based fallback
      let fieldElement: Element | null = null;
      let focusElement: HTMLElement | null = null;

      fieldElement = document.querySelector(`[data-field-name="${fieldName}"]`);
      if (fieldElement) {
        focusElement = fieldElement.querySelector(
          'input, textarea, select, .dx-texteditor-input'
        ) as HTMLElement;
      }

      if (!fieldElement) {
        fieldElement = document.querySelector(`[name="${fieldName}"]`);
      }

      if (!fieldElement) {
        const dxContainer = document.querySelector(`[data-field="${fieldName}"]`);
        if (dxContainer) {
          fieldElement = dxContainer;
          focusElement = dxContainer.querySelector(
            'input, textarea, select, .dx-texteditor-input'
          ) as HTMLElement;
        }
      }

      if (!fieldElement) {
        const formItems = document.querySelectorAll('.sp-form-item, [class*="FormItem"]');
        for (let i = 0; i < formItems.length; i++) {
          const item = formItems[i];
          const dataFieldName = item.getAttribute('data-field-name');
          if (dataFieldName === fieldName) {
            fieldElement = item;
            focusElement = item.querySelector(
              'input, textarea, select, .dx-texteditor-input'
            ) as HTMLElement;
            break;
          }
        }
      }

      if (!fieldElement && fieldName.indexOf('.') !== -1) {
        fieldElement =
          document.querySelector(`[data-field-name="${baseName}"]`) ||
          document.querySelector(`[name="${baseName}"]`) ||
          document.querySelector(`[data-field="${baseName}"]`);
        if (fieldElement) {
          focusElement = fieldElement.querySelector(
            'input, textarea, select, .dx-texteditor-input'
          ) as HTMLElement;
        }
      }

      if (fieldElement) {
        fieldElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        });

        setTimeout(() => {
          const elementToFocus = focusElement || fieldElement;
          if (elementToFocus instanceof HTMLElement) {
            let actualInput = elementToFocus;
            if (!elementToFocus.matches('input, textarea, select')) {
              const foundInput = elementToFocus.querySelector(
                'input, textarea, select, .dx-texteditor-input'
              );
              if (foundInput) {
                actualInput = foundInput as HTMLElement;
              }
            }
            actualInput.focus();
            SPContext.logger.info('RequestActions: Field scrolled/focused via DOM', { fieldName });
          }
        }, 300);
      } else {
        SPContext.logger.warn('RequestActions: Could not find field element', { fieldName });
      }
    },
    [spFormContext]
  );

  // Check if any action is in progress
  const isAnyActionInProgress = React.useMemo(() => {
    return activeAction !== undefined || isLoading;
  }, [activeAction, isLoading]);

  /**
   * Handle submit action
   */
  const handleSubmitClick = React.useCallback(async (): Promise<void> => {
    if (onSubmitDirect) {
      try {
        setValidationErrors([]);
        setActiveAction('submit');
        SPContext.logger.info('RequestActions: Submitting request');
        await onSubmitDirect();
        SPContext.logger.success('RequestActions: Request submitted successfully');
      } catch (error: unknown) {
        SPContext.logger.error('RequestActions: Submit failed', error);
      } finally {
        setActiveAction(undefined);
      }
    }
  }, [onSubmitDirect, setValidationErrors]);

  /**
   * Handle save as draft
   */
  const handleSaveDraft = React.useCallback(async (): Promise<void> => {
    if (onSaveDraft) {
      try {
        setValidationErrors([]);
        setActiveAction('save');
        SPContext.logger.info('RequestActions: Saving draft');
        await onSaveDraft();
        SPContext.logger.success('RequestActions: Draft saved successfully');
      } catch (error: unknown) {
        SPContext.logger.error('RequestActions: Save draft failed', error);
      } finally {
        setActiveAction(undefined);
      }
    }
  }, [onSaveDraft, setValidationErrors]);

  /**
   * Handle close - with unsaved changes check
   */
  const handleClose = React.useCallback((): void => {
    const navigationAction = () => {
      if (onClose) {
        onClose();
      } else {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.close();
        }
      }
    };

    if (isDirty) {
      setPendingNavigation(() => navigationAction);
      setShowUnsavedDialog(true);
    } else {
      navigationAction();
    }
  }, [onClose, isDirty]);

  /**
   * Handle unsaved dialog confirmation
   */
  const handleUnsavedConfirm = React.useCallback((): void => {
    setShowUnsavedDialog(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(undefined);
    }
  }, [pendingNavigation]);

  /**
   * Handle unsaved dialog cancel
   */
  const handleUnsavedCancel = React.useCallback((): void => {
    setShowUnsavedDialog(false);
    setPendingNavigation(undefined);
  }, []);

  /**
   * Show cancel request dialog
   */
  const handleCancelRequestClick = React.useCallback((): void => {
    setReasonDialogAction('cancel');
    setShowReasonDialog(true);
  }, []);

  /**
   * Show put on hold dialog
   */
  const handlePutOnHoldClick = React.useCallback((): void => {
    setReasonDialogAction('hold');
    setShowReasonDialog(true);
  }, []);

  /**
   * Handle resume from hold
   */
  const handleResumeClick = React.useCallback(async (): Promise<void> => {
    try {
      setActiveAction('resume');
      SPContext.logger.info('RequestActions: Resuming request from hold');
      await useRequestStore.getState().resumeRequest();
      SPContext.logger.success('RequestActions: Request resumed successfully');
    } catch (error: unknown) {
      SPContext.logger.error('RequestActions: Resume failed', error);
    } finally {
      setActiveAction(undefined);
    }
  }, []);

  /**
   * Handle Send to Committee
   */
  const handleSendToCommitteeClick = React.useCallback(async (): Promise<void> => {
    try {
      const { notes } = legalIntakeStore.getFormData();

      const validationData = {
        notes: notes,
        currentStatus: status,
      };

      const result = sendToCommitteeSchema.safeParse(validationData);

      if (!result.success) {
        const errors = result.error.issues.map(issue => ({
          field: issue.path.join('.') || 'notes',
          message: issue.message,
        }));

        SPContext.logger.warn('RequestActions: Send to committee validation failed', { errors });
        setValidationErrors(errors);
        return;
      }

      setActiveAction('sendToCommittee');

      SPContext.logger.info('RequestActions: Sending to committee for attorney assignment', {
        notes: notes ? 'provided' : 'none',
      });

      const sendResult = await workflowSendToCommittee(notes);
      if (sendResult.allowed) {
        SPContext.logger.success('RequestActions: Sent to committee successfully');
        legalIntakeStore.reset();
      } else {
        SPContext.logger.warn('RequestActions: Send to committee denied', { reason: sendResult.reason });
      }
    } catch (error: unknown) {
      SPContext.logger.error('RequestActions: Send to committee failed', error);
    } finally {
      setActiveAction(undefined);
    }
  }, [workflowSendToCommittee, legalIntakeStore, status, setValidationErrors]);

  /**
   * Handle Assign Attorney button click
   */
  const handleAssignAttorneyClick = React.useCallback(async (): Promise<void> => {
    try {
      setValidationErrors([]);

      const formData = legalIntakeStore.getFormData();
      const { attorney, notes } = formData;

      SPContext.logger.info('RequestActions: handleAssignAttorneyClick - form data from store', {
        formData,
        attorney,
        attorneyId: attorney?.id,
        attorneyTitle: attorney?.title,
        notes,
      });

      const isCommitteeAssignment = status === RequestStatus.AssignAttorney;
      const schema = isCommitteeAssignment ? committeeAssignAttorneySchema : assignAttorneySchema;

      const validationData = {
        attorney: attorney ? {
          id: attorney.id,
          email: attorney.email,
          title: attorney.title,
          loginName: attorney.loginName,
        } : { id: '' },
        assignmentNotes: notes,
        currentStatus: status,
      };

      const result = schema.safeParse(validationData);

      if (!result.success) {
        const errors = result.error.issues.map(issue => {
          const path = issue.path.join('.');
          let fieldName = path;

          if (path === 'attorney' || path.indexOf('attorney.') === 0) {
            fieldName = 'attorney';
          }

          return {
            field: fieldName,
            message: issue.message,
          };
        });

        SPContext.logger.warn('RequestActions: Assign attorney validation failed', { errors });
        setValidationErrors(errors);
        return;
      }

      setActiveAction('assignAttorney');

      SPContext.logger.info('RequestActions: Assigning attorney', {
        attorneyId: attorney?.id,
        attorneyName: attorney?.title,
        notes: notes ? 'provided' : 'none',
      });

      await storeAssignAttorney(attorney!, notes);

      SPContext.logger.success('RequestActions: Attorney assigned successfully');
      legalIntakeStore.reset();
    } catch (error: unknown) {
      SPContext.logger.error('RequestActions: Assign attorney failed', error);
    } finally {
      setActiveAction(undefined);
    }
  }, [legalIntakeStore, storeAssignAttorney, status, setValidationErrors]);

  /**
   * Check if review has "Approved with Comments" outcome
   */
  const hasApprovedWithComments = React.useMemo((): boolean => {
    if (!currentRequest) return false;
    return (
      currentRequest.legalReviewOutcome === ReviewOutcome.ApprovedWithComments ||
      currentRequest.complianceReviewOutcome === ReviewOutcome.ApprovedWithComments
    );
  }, [currentRequest]);

  /**
   * Check if tracking ID is required
   */
  const isTrackingIdRequired = React.useMemo((): boolean => {
    if (!currentRequest) return false;
    if (currentRequest.reviewAudience === 'Legal') return false;
    return (
      currentRequest.complianceReview?.isForesideReviewRequired === true ||
      currentRequest.complianceReview?.isRetailUse === true
    );
  }, [currentRequest]);

  /**
   * Handle Closeout Submit
   */
  const handleCloseoutClick = React.useCallback(async (): Promise<void> => {
    try {
      setActiveAction('closeout');

      const { trackingId, closeoutNotes, commentsAcknowledged } = closeoutStore.getFormData();

      const errors: IValidationError[] = [];

      if (isTrackingIdRequired && (!trackingId || trackingId.trim() === '')) {
        errors.push({
          field: 'trackingId',
          message: 'Tracking ID is required because Foreside Review or Retail Use was indicated during compliance review.',
        });
      }

      if (hasApprovedWithComments && !commentsAcknowledged) {
        errors.push({
          field: 'commentsAcknowledged',
          message: 'You must acknowledge the review comments before completing closeout.',
        });
      }

      if (errors.length > 0) {
        setValidationErrors(errors);
        SPContext.logger.warn('RequestActions: Closeout validation failed', {
          errors: errors.map(e => e.field),
          trackingIdRequired: isTrackingIdRequired,
          trackingIdProvided: !!trackingId,
          commentsRequired: hasApprovedWithComments,
          commentsAcknowledged,
        });
        setActiveAction(undefined);
        return;
      }

      setValidationErrors([]);

      SPContext.logger.info('RequestActions: Submitting closeout', {
        trackingId: trackingId || 'none',
        commentsAcknowledged: commentsAcknowledged || false,
      });

      const result = await workflowCloseout({
        trackingId,
        closeoutNotes,
        commentsAcknowledged: hasApprovedWithComments ? commentsAcknowledged : undefined,
      });
      if (result.allowed) {
        SPContext.logger.success('RequestActions: Closeout submitted successfully');
        closeoutStore.reset();
      } else {
        SPContext.logger.warn('RequestActions: Closeout denied', { reason: result.reason });
      }
    } catch (error: unknown) {
      SPContext.logger.error('RequestActions: Closeout failed', error);
    } finally {
      setActiveAction(undefined);
    }
  }, [workflowCloseout, closeoutStore, hasApprovedWithComments, isTrackingIdRequired, setValidationErrors]);

  /**
   * Check if Foreside documents exist
   */
  const hasForesideDocuments = React.useMemo((): boolean => {
    const existingCount = documents.get(DocumentType.Foreside)?.length || 0;
    const stagedCount = stagedFiles.filter(f => f.documentType === DocumentType.Foreside).length;
    return (existingCount + stagedCount) > 0;
  }, [documents, stagedFiles]);

  /**
   * Handle complete Foreside documents
   */
  const handleCompleteForesideDocumentsClick = React.useCallback(async (): Promise<void> => {
    try {
      setActiveAction('completeForesideDocuments');

      if (!hasForesideDocuments) {
        const errors: IValidationError[] = [{
          field: 'foresideDocuments',
          message: 'Please upload at least one Foreside document before completing the request.',
        }];
        setValidationErrors(errors);
        SPContext.logger.warn('RequestActions: No Foreside documents uploaded');
        setActiveAction(undefined);
        return;
      }

      setValidationErrors([]);

      SPContext.logger.info('RequestActions: Completing Foreside documents');

      const hasStagedFiles = stagedFiles.length > 0;
      if (hasStagedFiles && itemId) {
        SPContext.logger.info('RequestActions: Uploading staged Foreside documents before completing', {
          stagedCount: stagedFiles.length,
          itemId,
        });

        const { uploadPendingFiles, loadAllDocuments } = useDocumentsStore.getState();
        await uploadPendingFiles(itemId, (fileId, progress, status) => {
          SPContext.logger.info('RequestActions: Foreside upload progress', { fileId, progress, status });
        });

        await loadAllDocuments(itemId, true);

        SPContext.logger.success('RequestActions: Staged Foreside documents uploaded successfully');
      }

      const result = await workflowCompleteForesideDocuments();
      if (result.allowed) {
        SPContext.logger.success('RequestActions: Foreside documents completed, request is now Completed');
      } else {
        SPContext.logger.warn('RequestActions: Complete Foreside documents denied', { reason: result.reason });
      }
    } catch (error: unknown) {
      SPContext.logger.error('RequestActions: Complete Foreside documents failed', error);
    } finally {
      setActiveAction(undefined);
    }
  }, [workflowCompleteForesideDocuments, hasForesideDocuments, setValidationErrors, stagedFiles, itemId]);

  /**
   * Handle reason dialog confirmation
   */
  const handleReasonConfirm = React.useCallback(
    async (reason: string): Promise<void> => {
      setShowReasonDialog(false);

      if (reasonDialogAction === 'cancel' && onCancelRequest) {
        try {
          setActiveAction('cancel');
          SPContext.logger.info('RequestActions: Cancelling request', { reason });
          await onCancelRequest(reason);
          SPContext.logger.success('RequestActions: Request cancelled successfully');
        } catch (error: unknown) {
          SPContext.logger.error('RequestActions: Cancel request failed', error);
        } finally {
          setActiveAction(undefined);
        }
      } else if (reasonDialogAction === 'hold' && onPutOnHold) {
        try {
          setActiveAction('hold');
          SPContext.logger.info('RequestActions: Putting request on hold', { reason });
          await onPutOnHold(reason);
          SPContext.logger.success('RequestActions: Request put on hold successfully');
        } catch (error: unknown) {
          SPContext.logger.error('RequestActions: Put on hold failed', error);
        } finally {
          setActiveAction(undefined);
        }
      }
    },
    [reasonDialogAction, onCancelRequest, onPutOnHold]
  );

  /**
   * Handle reason dialog cancel
   */
  const handleReasonCancel = React.useCallback((): void => {
    setShowReasonDialog(false);
  }, []);

  // Button visibility logic

  const showSubmitRequest = React.useMemo(() => {
    if (hideSubmit) return false;
    if (permissionsLoading) return false;
    if (isNewRequest || status === RequestStatus.Draft) {
      return availableActions.canSubmit;
    }
    return false;
  }, [hideSubmit, permissionsLoading, isNewRequest, status, availableActions.canSubmit]);

  const showSaveAsDraft = React.useMemo(() => {
    if (hideSaveDraft) return false;
    if (permissionsLoading) return false;
    if (isNewRequest || status === RequestStatus.Draft) {
      return availableActions.canSaveDraft;
    }
    return false;
  }, [hideSaveDraft, permissionsLoading, isNewRequest, status, availableActions.canSaveDraft]);

  const showSave = React.useMemo(() => {
    if (permissionsLoading) return false;
    if (isNewRequest || status === RequestStatus.Draft) return false;
    if (
      status === RequestStatus.Completed ||
      status === RequestStatus.Cancelled ||
      status === RequestStatus.Closeout ||
      status === RequestStatus.AwaitingForesideDocuments
    ) return false;
    if (!isDirty) return false;
    return permissions.isAdmin || isOwner;
  }, [permissionsLoading, isNewRequest, status, isDirty, permissions.isAdmin, isOwner]);

  const showCancel = React.useMemo(() => {
    if (permissionsLoading) return false;
    if (isNewRequest) return false;
    if (
      status === RequestStatus.Completed ||
      status === RequestStatus.Cancelled ||
      status === RequestStatus.Closeout ||
      status === RequestStatus.AwaitingForesideDocuments
    ) return false;
    return permissions.isAdmin || permissions.isLegalAdmin || isOwner;
  }, [permissionsLoading, isNewRequest, status, permissions.isAdmin, permissions.isLegalAdmin, isOwner]);

  const showOnHold = React.useMemo(() => {
    if (permissionsLoading) return false;
    if (isNewRequest) return false;
    if (
      status === RequestStatus.Completed ||
      status === RequestStatus.Cancelled ||
      status === RequestStatus.Closeout ||
      status === RequestStatus.OnHold ||
      status === RequestStatus.AwaitingForesideDocuments
    ) return false;
    return permissions.isAdmin || permissions.isLegalAdmin || isOwner;
  }, [permissionsLoading, isNewRequest, status, permissions.isAdmin, permissions.isLegalAdmin, isOwner]);

  const showResume = React.useMemo(() => {
    if (permissionsLoading) return false;
    if (status !== RequestStatus.OnHold) return false;
    return availableActions.canResume;
  }, [permissionsLoading, status, availableActions.canResume]);

  const showAssignAttorney = React.useMemo(() => {
    if (permissionsLoading) return false;
    if (status === RequestStatus.LegalIntake) {
      return permissions.isAdmin || permissions.isLegalAdmin;
    }
    if (status === RequestStatus.AssignAttorney) {
      return permissions.isAdmin || permissions.isAttorneyAssigner;
    }
    return false;
  }, [permissionsLoading, status, permissions.isAdmin, permissions.isLegalAdmin, permissions.isAttorneyAssigner]);

  const showSendToCommittee = React.useMemo(() => {
    if (permissionsLoading) return false;
    if (status !== RequestStatus.LegalIntake) return false;
    return permissions.isAdmin || permissions.isLegalAdmin;
  }, [permissionsLoading, status, permissions.isAdmin, permissions.isLegalAdmin]);

  const showCloseoutSubmit = React.useMemo(() => {
    if (permissionsLoading) return false;
    if (status !== RequestStatus.Closeout) return false;
    return permissions.isAdmin || isOwner;
  }, [permissionsLoading, status, permissions.isAdmin, isOwner]);

  const showCompleteForesideDocuments = React.useMemo(() => {
    if (permissionsLoading) return false;
    if (status !== RequestStatus.AwaitingForesideDocuments) return false;
    return permissions.isAdmin || isOwner;
  }, [permissionsLoading, status, permissions.isAdmin, isOwner]);

  // Get loading message based on active action
  const loadingMessage = React.useMemo(() => {
    switch (activeAction) {
      case 'submit':
        return 'Submitting request...';
      case 'save':
        return 'Saving...';
      case 'cancel':
        return 'Canceling request...';
      case 'hold':
        return 'Putting request on hold...';
      case 'resume':
        return 'Resuming request...';
      case 'assignAttorney':
        return 'Assigning attorney...';
      case 'sendToCommittee':
        return 'Sending to committee...';
      case 'closeout':
        return 'Completing closeout...';
      case 'completeForesideDocuments':
        return 'Completing request...';
      default:
        return 'Processing...';
    }
  }, [activeAction]);

  return {
    // Context values
    isDirty,
    isLoading,
    validationErrors,
    status,
    itemId,
    isNewRequest,
    isOwner,
    permissions,
    permissionsLoading,

    // State
    activeAction,
    showReasonDialog,
    reasonDialogAction,
    showUnsavedDialog,
    showSuperAdminPanel,
    setShowSuperAdminPanel,

    // Refs
    errorContainerRef,

    // Derived values
    sortedValidationErrors,
    isAnyActionInProgress,
    loadingMessage,
    hasApprovedWithComments,
    isTrackingIdRequired,
    hasForesideDocuments,

    // Button visibility
    showSubmitRequest,
    showSaveAsDraft,
    showSave,
    showCancel,
    showOnHold,
    showResume,
    showAssignAttorney,
    showSendToCommittee,
    showCloseoutSubmit,
    showCompleteForesideDocuments,

    // Handlers
    getFieldLabel,
    scrollToField,
    handleSubmitClick,
    handleSaveDraft,
    handleClose,
    handleUnsavedConfirm,
    handleUnsavedCancel,
    handleCancelRequestClick,
    handlePutOnHoldClick,
    handleResumeClick,
    handleSendToCommitteeClick,
    handleAssignAttorneyClick,
    handleCloseoutClick,
    handleCompleteForesideDocumentsClick,
    handleReasonConfirm,
    handleReasonCancel,
  };
}

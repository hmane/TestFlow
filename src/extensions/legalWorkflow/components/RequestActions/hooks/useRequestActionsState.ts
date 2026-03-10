/**
 * RequestActions State Hook
 *
 * Manages state, handlers, and button visibility logic for RequestActions.
 */

import * as React from 'react';

import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import { useFormContext } from 'spfx-toolkit/lib/components/spForm';
import { confirm } from 'spfx-toolkit/lib/utilities/dialogService';

import type { ReasonDialogAction } from '@components/ReasonDialog/ReasonDialog';
import { useRequestFormContext } from '@contexts/RequestFormContext';
import { usePermissions } from '@hooks/usePermissions';
import { useUIVisibility } from '@hooks/useUIVisibility';
import { useWorkflowPermissions } from '@hooks/useWorkflowPermissions';
import { useRequestStore } from '@stores/requestStore';
import { useDocumentsStore } from '@stores/documentsStore';
import type { IButtonVisibility } from '@services/uiVisibilityService';
import { RequestStatus } from '@appTypes/workflowTypes';
import { DocumentType } from '@appTypes/documentTypes';
import type { IValidationError } from '@contexts/RequestFormContext';

import { FIELD_LABELS, FIELD_ORDER, CUSTOM_SECTION_MAP, SECTION_HANDLED_FIELDS, type ActiveAction } from '../constants';

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
  hasFINRADocuments: boolean;
  buttonVisibility: IButtonVisibility;

  // Button visibility
  showSubmitRequest: boolean;
  showSaveAsDraft: boolean;
  showSave: boolean;
  showCancel: boolean;
  showOnHold: boolean;
  showResume: boolean;
  showCompleteFINRADocuments: boolean;

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
  handleCompleteFINRADocumentsClick: () => Promise<void>;
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
    isLoading: permissionsLoading,
    completeFINRADocuments: workflowCompleteFINRADocuments,
  } = useWorkflowPermissions();

  // Get user permissions for role checks
  const permissions = usePermissions();

  // Get documents store for FINRA document validation
  const { documents, stagedFiles } = useDocumentsStore();

  // Get spfx-toolkit form context for scroll/focus functionality
  const spFormContext = useFormContext();

  // Super Admin Panel state
  const [showSuperAdminPanel, setShowSuperAdminPanel] = React.useState<boolean>(false);

  // Determine if this is a new request
  const isNewRequest = !itemId;

  const { buttons: buttonVisibility, context: visibilityContext } = useUIVisibility({
    status,
    isDirty,
    itemId,
  });
  const isOwner = visibilityContext.isOwner;

  // Action state management
  const [activeAction, setActiveAction] = React.useState<ActiveAction>(undefined);
  const [showReasonDialog, setShowReasonDialog] = React.useState<boolean>(false);
  const [reasonDialogAction, setReasonDialogAction] = React.useState<ReasonDialogAction>('cancel');

  // Unsaved changes dialog state
  const [showUnsavedDialog, setShowUnsavedDialog] = React.useState<boolean>(false);
  const [pendingNavigation, setPendingNavigation] = React.useState<(() => void) | undefined>(undefined);

  // Ref for error container
  const errorContainerRef = React.useRef<HTMLDivElement>(null);

  // Refs for tracking setTimeout IDs to prevent memory leaks
  const timeoutRefs = React.useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // Cleanup all pending timeouts on unmount
  React.useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((id) => clearTimeout(id));
      timeoutRefs.current.clear();
    };
  }, []);

  /**
   * Get field order for sorting
   */
  const getFieldOrder = React.useCallback((fieldName: string): number => {
    const baseName = fieldName.split('.')[0];
    return FIELD_ORDER[baseName] ?? 999;
  }, []);

  /**
   * Sort and filter validation errors to match form field order.
   * Excludes fields that have their own ValidationErrorContainer in section cards
   * to avoid duplicate error messages.
   */
  const sortedValidationErrors = React.useMemo(() => {
    if (!validationErrors || validationErrors.length === 0) {
      return [];
    }
    return [...validationErrors]
      .filter(error => !SECTION_HANDLED_FIELDS.includes(error.field))
      .sort((a, b) => {
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
      const timeoutId = setTimeout(() => {
        timeoutRefs.current.delete(timeoutId);
        if (errorContainerRef.current) {
          errorContainerRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
          errorContainerRef.current.focus();
        }
      }, 100);
      timeoutRefs.current.add(timeoutId);
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

          const sectionTimeoutId = setTimeout(() => {
            timeoutRefs.current.delete(sectionTimeoutId);
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
          timeoutRefs.current.add(sectionTimeoutId);
          return;
        }
      }

      // Use spfx-toolkit FormContext if available
      if (spFormContext) {
        const registeredField = spFormContext.registry.get(fieldName);
        if (registeredField?.ref?.current) {
          spFormContext.scrollToField(fieldName, { behavior: 'smooth', block: 'center' });
          const formContextTimeoutId = setTimeout(() => {
            timeoutRefs.current.delete(formContextTimeoutId);
            spFormContext.focusField(fieldName);
            SPContext.logger.info('RequestActions: Field scrolled/focused via FormContext', {
              fieldName,
            });
          }, 300);
          timeoutRefs.current.add(formContextTimeoutId);
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

        const domTimeoutId = setTimeout(() => {
          timeoutRefs.current.delete(domTimeoutId);
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
        timeoutRefs.current.add(domTimeoutId);
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
   * Check if FINRA documents exist
   */
  const hasFINRADocuments = React.useMemo((): boolean => {
    const existingCount = documents.get(DocumentType.FINRA)?.length || 0;
    const stagedCount = stagedFiles.filter(f => f.documentType === DocumentType.FINRA).length;
    return (existingCount + stagedCount) > 0;
  }, [documents, stagedFiles]);

  /**
   * Handle complete FINRA documents
   * Shows confirmation dialog if no documents are uploaded
   */
  const handleCompleteFINRADocumentsClick = React.useCallback(async (): Promise<void> => {
    // Show appropriate confirmation dialog based on document status
    if (!hasFINRADocuments) {
      SPContext.logger.info('RequestActions: No FINRA documents uploaded, showing confirmation dialog');

      const confirmed = await confirm(
        'You have not attached the FINRA document. Do you want to complete the request anyway?',
        {
          title: 'No FINRA Document',
          buttons: [
            { text: 'Yes, Complete Request', primary: true, value: true },
            { text: 'Cancel', value: false },
          ],
        }
      );

      if (!confirmed) {
        SPContext.logger.info('RequestActions: User cancelled completing without FINRA documents');
        return;
      }

      SPContext.logger.info('RequestActions: User confirmed completing without FINRA documents');
    } else {
      // FINRA documents are present — confirm before completing
      const confirmed = await confirm(
        'Are you sure you want to complete this request? This action cannot be undone.',
        {
          title: 'Complete Request',
          buttons: [
            { text: 'Yes, Complete Request', primary: true, value: true },
            { text: 'Cancel', value: false },
          ],
        }
      );

      if (!confirmed) {
        SPContext.logger.info('RequestActions: User cancelled completing request');
        return;
      }
    }

    // Proceed with completion
    try {
      setActiveAction('completeFINRADocuments');
      setValidationErrors([]);

      SPContext.logger.info('RequestActions: Completing FINRA documents');

      const hasStagedFiles = stagedFiles.length > 0;
      if (hasStagedFiles && itemId) {
        SPContext.logger.info('RequestActions: Uploading staged FINRA documents before completing', {
          stagedCount: stagedFiles.length,
          itemId,
        });

        const { uploadPendingFiles, loadAllDocuments } = useDocumentsStore.getState();
        await uploadPendingFiles(itemId, (fileId, progress, status) => {
          SPContext.logger.info('RequestActions: FINRA upload progress', { fileId, progress, status });
        });

        await loadAllDocuments(itemId, true);

        SPContext.logger.success('RequestActions: Staged FINRA documents uploaded successfully');
      }

      const result = await workflowCompleteFINRADocuments();
      if (result.allowed) {
        SPContext.logger.success('RequestActions: FINRA documents completed, request is now Completed');
      } else {
        SPContext.logger.warn('RequestActions: Complete FINRA documents denied', { reason: result.reason });
        setValidationErrors([
          {
            field: 'finraDocuments',
            message: result.reason || 'Failed to complete the request. Please try again.',
          },
        ]);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      SPContext.logger.error('RequestActions: Complete FINRA documents failed', error);
      setValidationErrors([
        {
          field: 'finraDocuments',
          message: `Failed to complete the request: ${message}`,
        },
      ]);
    } finally {
      setActiveAction(undefined);
    }
  }, [workflowCompleteFINRADocuments, hasFINRADocuments, setValidationErrors, stagedFiles, itemId]);

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
    return buttonVisibility.submitRequest.visible;
  }, [hideSubmit, permissionsLoading, buttonVisibility.submitRequest.visible]);

  const showSaveAsDraft = React.useMemo(() => {
    if (hideSaveDraft) return false;
    if (permissionsLoading) return false;
    return buttonVisibility.saveAsDraft.visible;
  }, [hideSaveDraft, permissionsLoading, buttonVisibility.saveAsDraft.visible]);

  const showSave = React.useMemo(() => {
    if (permissionsLoading) return false;
    return buttonVisibility.save.visible;
  }, [permissionsLoading, buttonVisibility.save.visible]);

  const showCancel = React.useMemo(() => {
    if (permissionsLoading) return false;
    return buttonVisibility.cancelRequest.visible;
  }, [permissionsLoading, buttonVisibility.cancelRequest.visible]);

  const showOnHold = React.useMemo(() => {
    if (permissionsLoading) return false;
    return buttonVisibility.onHold.visible;
  }, [permissionsLoading, buttonVisibility.onHold.visible]);

  const showResume = React.useMemo(() => {
    if (permissionsLoading) return false;
    return buttonVisibility.resume.visible;
  }, [permissionsLoading, buttonVisibility.resume.visible]);

  const showCompleteFINRADocuments = React.useMemo(() => {
    if (permissionsLoading) return false;
    return buttonVisibility.completeFINRADocuments.visible;
  }, [permissionsLoading, buttonVisibility.completeFINRADocuments.visible]);

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
      case 'completeFINRADocuments':
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
    hasFINRADocuments,
    buttonVisibility,

    // Button visibility
    showSubmitRequest,
    showSaveAsDraft,
    showSave,
    showCancel,
    showOnHold,
    showResume,
    showCompleteFINRADocuments,

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
    handleCompleteFINRADocumentsClick,
    handleReasonConfirm,
    handleReasonCancel,
  };
}

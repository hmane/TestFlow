/**
 * RequestActions Component
 *
 * Action buttons container at the bottom of forms with enhanced UX.
 * Features left/right button grouping, per-action loading states, and confirmation dialogs.
 *
 * Features:
 * - Primary actions (Submit, Save as Draft) on the right
 * - Less frequent actions (Cancel, Put On Hold) on the left
 * - Visual progress indicators during actions
 * - Confirmation dialogs with reason capture
 * - All buttons disabled during any action
 * - Permission-based button visibility (only shows actions user can perform)
 */

import { DefaultButton, IconButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { Dialog, DialogFooter, DialogType } from '@fluentui/react/lib/Dialog';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Stack } from '@fluentui/react/lib/Stack';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
import * as React from 'react';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import { useFormContext } from 'spfx-toolkit/lib/components/spForm';
import { LoadingOverlay } from '../../../../components/LoadingOverlay/LoadingOverlay';
import {
  ReasonDialog,
  type ReasonDialogAction,
} from '../../../../components/ReasonDialog/ReasonDialog';
import { SuperAdminPanel } from '../../../../components/SuperAdminPanel';
import { useRequestFormContext } from '../../../../contexts/RequestFormContext';
import { usePermissions } from '../../../../hooks/usePermissions';
import { useWorkflowPermissions } from '../../../../hooks/useWorkflowPermissions';
import { useRequestStore, useLegalIntakeStore, useCloseoutStore } from '../../../../stores';
import { RequestStatus } from '../../../../types/workflowTypes';
import {
  assignAttorneySchema,
  committeeAssignAttorneySchema,
  sendToCommitteeSchema,
} from '../../../../schemas/workflowSchema';
import './RequestActions.scss';

/**
 * Active action type
 */
type ActiveAction =
  | 'submit'
  | 'save'
  | 'cancel'
  | 'hold'
  | 'resume'
  | 'assignAttorney'
  | 'sendToCommittee'
  | 'closeout'
  | undefined;

/**
 * Field label mapping for friendly display names
 */
const FIELD_LABELS: Record<string, string> = {
  requestTitle: 'Request Title',
  requestType: 'Request Type',
  purpose: 'Purpose',
  submissionType: 'Submission Type',
  submissionItem: 'Submission Item',
  submissionItemOther: 'Submission Item (Other)',
  targetReturnDate: 'Target Return Date',
  reviewAudience: 'Review Audience',
  requiresCommunicationsApproval: 'Communications Approval Required',
  distributionMethod: 'Distribution Method',
  dateOfFirstUse: 'Date of First Use',
  priorSubmissions: 'Prior Submissions',
  priorSubmissionNotes: 'Prior Submission Notes',
  additionalParty: 'Additional Parties',
  rushRationale: 'Rush Rationale',
  approvals: 'Approvals',
  finraAudienceCategory: 'FINRA Audience Category',
  audience: 'Audience',
  usFunds: 'US Funds',
  ucits: 'UCITS',
  separateAcctStrategies: 'Separate Account Strategies',
  separateAcctStrategiesIncl: 'Separate Account Strategies Includes',
  department: 'Department',
  attachments: 'Attachments',
  // Legal Intake fields
  attorney: 'Assign Attorney',
  attorneyAssignNotes: 'Assignment Notes',
};

/**
 * Field order for sorting validation errors to match form layout
 * Lower index = higher priority (appears first in error list)
 */
const FIELD_ORDER: Record<string, number> = {
  // Basic Information section
  requestType: 1,
  requestTitle: 2,
  purpose: 3,
  submissionType: 4,
  submissionItem: 5,
  submissionItemOther: 6,
  targetReturnDate: 7,
  rushRationale: 8,
  // Distribution & Audience section
  reviewAudience: 10,
  distributionMethod: 11,
  dateOfFirstUse: 12,
  // Product & Audience section
  finraAudienceCategory: 20,
  audience: 21,
  usFunds: 22,
  ucits: 23,
  separateAcctStrategies: 24,
  separateAcctStrategiesIncl: 25,
  // Prior Submissions section
  priorSubmissions: 30,
  priorSubmissionNotes: 31,
  // Additional Parties section
  additionalParty: 40,
  // Approvals section
  approvals: 50,
  // Attachments section
  attachments: 60,
  // Legal Intake section (appears after main form sections)
  attorney: 70,
  attorneyAssignNotes: 71,
};

/**
 * Props for RequestActions component
 */
export interface IRequestActionsProps {
  submitButtonText?: string;
  submitButtonIcon?: string;
  hideSubmit?: boolean;
  hideSaveDraft?: boolean;
}

/**
 * RequestActions Component
 */
export const RequestActions: React.FC<IRequestActionsProps> = ({
  submitButtonText = 'Submit Request',
  submitButtonIcon = 'Send',
  hideSubmit = false,
  hideSaveDraft = false,
}) => {
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
  } = useWorkflowPermissions();

  // Get user permissions for role checks
  const permissions = usePermissions();

  // Get current request for owner check
  const { currentRequest, assignAttorney: storeAssignAttorney } = useRequestStore();

  // Get legal intake form data (attorney, notes, reviewAudience)
  const legalIntakeStore = useLegalIntakeStore();

  // Get closeout form data (trackingId)
  const closeoutStore = useCloseoutStore();

  // Get spfx-toolkit form context for scroll/focus functionality
  const spFormContext = useFormContext();

  // Super Admin Panel state
  const [showSuperAdminPanel, setShowSuperAdminPanel] = React.useState<boolean>(false);

  /**
   * Check if current user is the owner (submitter/author)
   */
  const isOwner = React.useMemo((): boolean => {
    if (!currentRequest) return false;
    const currentUserId = SPContext.currentUser?.id?.toString() ?? '';
    return (
      currentRequest.submittedBy?.id === currentUserId ||
      currentRequest.author?.id === currentUserId
    );
  }, [currentRequest]);

  /**
   * Determine if this is a new request (no itemId)
   */
  const isNewRequest = !itemId;

  // Action state management
  const [activeAction, setActiveAction] = React.useState<ActiveAction>(undefined);
  const [showReasonDialog, setShowReasonDialog] = React.useState<boolean>(false);
  const [reasonDialogAction, setReasonDialogAction] = React.useState<ReasonDialogAction>('cancel');

  // Unsaved changes dialog state
  const [showUnsavedDialog, setShowUnsavedDialog] = React.useState<boolean>(false);
  const [pendingNavigation, setPendingNavigation] = React.useState<(() => void) | undefined>(undefined);

  // Ref for error container to enable auto-focus
  const errorContainerRef = React.useRef<HTMLDivElement>(null);

  /**
   * Get field order for sorting - handles nested paths like "approvals.0.approver"
   */
  const getFieldOrder = React.useCallback((fieldName: string): number => {
    // Extract base field name (first part before any dot)
    const baseName = fieldName.split('.')[0];
    // Return order if defined, otherwise use high number to sort to end
    return FIELD_ORDER[baseName] ?? 999;
  }, []);

  /**
   * Sort validation errors to match form field order
   */
  const sortedValidationErrors = React.useMemo(() => {
    if (!validationErrors || validationErrors.length === 0) {
      return [];
    }
    // Create a copy and sort by field order
    return [...validationErrors].sort((a, b) => {
      const orderA = getFieldOrder(a.field);
      const orderB = getFieldOrder(b.field);
      return orderA - orderB;
    });
  }, [validationErrors, getFieldOrder]);

  // Auto-focus and scroll to error container when errors appear
  React.useEffect(() => {
    if (validationErrors && validationErrors.length > 0 && errorContainerRef.current) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        if (errorContainerRef.current) {
          // Scroll error container into view
          errorContainerRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });

          // Focus the error container for accessibility
          errorContainerRef.current.focus();
        }
      }, 100);
    }
  }, [validationErrors]);

  /**
   * Get friendly field label from field name
   */
  const getFieldLabel = React.useCallback((fieldName: string): string => {
    // Handle nested field paths like "approvals.0.approver"
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
   * Uses spfx-toolkit FormContext methods with DOM fallback
   */
  const scrollToField = React.useCallback(
    (fieldName: string): void => {
      // Special handling for custom sections (not registered in FormContext)
      const customSectionMap: Record<string, string> = {
        approvals: 'approvals-card',
        attorney: 'legal-intake-card',
        attorneyAssignNotes: 'legal-intake-card',
        reviewAudience: 'legal-intake-card',
      };

      // Check if this is a custom section field (e.g., "approvals" or "approvals.0.type")
      const baseName = fieldName.split('.')[0];
      const customSectionId = customSectionMap[baseName];

      if (customSectionId) {
        // Card component uses data-card-id attribute, not id
        const sectionElement = document.querySelector(`[data-card-id="${customSectionId}"]`);
        if (sectionElement) {
          sectionElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });

          // Try to focus the first input in the section
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

      // Strategy 1: Use spfx-toolkit FormContext (preferred - uses registered field refs)
      if (spFormContext) {
        // Check if field is registered in the context
        const registeredField = spFormContext.registry.get(fieldName);
        if (registeredField?.ref?.current) {
          // Field is registered, use FormContext methods
          spFormContext.scrollToField(fieldName, { behavior: 'smooth', block: 'center' });

          // Focus the field after scroll
          setTimeout(() => {
            spFormContext.focusField(fieldName);
            SPContext.logger.info('RequestActions: Field scrolled/focused via FormContext', {
              fieldName,
            });
          }, 300);
          return;
        }
      }

      // Strategy 2: DOM-based fallback for fields not in registry
      let fieldElement: Element | null = null;
      let focusElement: HTMLElement | null = null;

      // Find by data-field-name attribute (FormItem wrapper)
      fieldElement = document.querySelector(`[data-field-name="${fieldName}"]`);
      if (fieldElement) {
        focusElement = fieldElement.querySelector(
          'input, textarea, select, .dx-texteditor-input'
        ) as HTMLElement;
      }

      // Find by name attribute (direct input)
      if (!fieldElement) {
        fieldElement = document.querySelector(`[name="${fieldName}"]`);
      }

      // Find by data-field attribute (DevExtreme/custom components)
      if (!fieldElement) {
        const dxContainer = document.querySelector(`[data-field="${fieldName}"]`);
        if (dxContainer) {
          fieldElement = dxContainer;
          focusElement = dxContainer.querySelector(
            'input, textarea, select, .dx-texteditor-input'
          ) as HTMLElement;
        }
      }

      // Find FormItem containers with data-field-name attribute
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

      // For nested fields like "approvals.0.type", try the base field
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
        // Scroll the field into view
        fieldElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        });

        // Focus the input element after scroll completes
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
        // Clear previous validation errors before new validation
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
        // Clear previous validation errors before new validation
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
        // Default close behavior
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.close();
        }
      }
    };

    // Check for unsaved changes
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
   * Handle Send to Committee (Submit to Assign Attorney)
   * Validates with Zod schema before sending to committee
   */
  const handleSendToCommitteeClick = React.useCallback(async (): Promise<void> => {
    try {
      // Get form data from legal intake store
      const { notes } = legalIntakeStore.getFormData();

      // Validate with Zod schema
      const validationData = {
        notes: notes,
        currentStatus: status,
      };

      const result = sendToCommitteeSchema.safeParse(validationData);

      if (!result.success) {
        // Extract validation errors
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

      // Send to committee with notes
      const sendResult = await workflowSendToCommittee(notes);
      if (sendResult.allowed) {
        SPContext.logger.success('RequestActions: Sent to committee successfully');
        // Reset the legal intake store after successful action
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
   * Uses attorney selected in Legal Intake form, validates with Zod schema
   */
  const handleAssignAttorneyClick = React.useCallback(async (): Promise<void> => {
    try {
      // Clear previous validation errors
      setValidationErrors([]);

      // Get form data from legal intake store
      const formData = legalIntakeStore.getFormData();
      const { attorney, notes } = formData;

      SPContext.logger.info('RequestActions: handleAssignAttorneyClick - form data from store', {
        formData,
        attorney,
        attorneyId: attorney?.id,
        attorneyTitle: attorney?.title,
        notes,
      });

      // Determine which schema to use based on current status
      const isCommitteeAssignment = status === RequestStatus.AssignAttorney;
      const schema = isCommitteeAssignment ? committeeAssignAttorneySchema : assignAttorneySchema;

      // Validate with Zod schema
      const validationData = {
        attorney: attorney ? {
          id: attorney.id,
          email: attorney.email,
          title: attorney.title,
          loginName: attorney.loginName,
        } : { id: '' }, // Empty id will fail validation
        assignmentNotes: notes,
        currentStatus: status,
      };

      const result = schema.safeParse(validationData);

      if (!result.success) {
        // Extract validation errors and map field names to form field names
        const errors = result.error.issues.map(issue => {
          // Map schema field path to actual form field name
          const path = issue.path.join('.');
          let fieldName = path;

          // Map 'attorney' path to the form field name used in Legal Intake form
          if (path === 'attorney' || path.indexOf('attorney.') === 0) {
            fieldName = 'attorney'; // This matches the fieldName in LegalIntakeForm
          }

          return {
            field: fieldName,
            message: issue.message,
          };
        });

        SPContext.logger.warn('RequestActions: Assign attorney validation failed', { errors });

        // Show validation errors to user
        setValidationErrors(errors);
        return;
      }

      setActiveAction('assignAttorney');

      SPContext.logger.info('RequestActions: Assigning attorney', {
        attorneyId: attorney?.id,
        attorneyName: attorney?.title,
        notes: notes ? 'provided' : 'none',
      });

      // Assign attorney using store method
      await storeAssignAttorney(attorney!, notes);

      SPContext.logger.success('RequestActions: Attorney assigned successfully');
      // Reset the legal intake store after successful action
      legalIntakeStore.reset();
    } catch (error: unknown) {
      SPContext.logger.error('RequestActions: Assign attorney failed', error);
    } finally {
      setActiveAction(undefined);
    }
  }, [legalIntakeStore, storeAssignAttorney, status, setValidationErrors]);

  /**
   * Handle Closeout Submit
   */
  const handleCloseoutClick = React.useCallback(async (): Promise<void> => {
    try {
      setActiveAction('closeout');

      // Get tracking ID from closeout store
      const { trackingId } = closeoutStore.getFormData();

      SPContext.logger.info('RequestActions: Submitting closeout', {
        trackingId: trackingId || 'none',
      });

      // Call closeout with tracking ID
      const result = await workflowCloseout(trackingId);
      if (result.allowed) {
        SPContext.logger.success('RequestActions: Closeout submitted successfully');
        // Reset the closeout store after successful action
        closeoutStore.reset();
      } else {
        SPContext.logger.warn('RequestActions: Closeout denied', { reason: result.reason });
      }
    } catch (error: unknown) {
      SPContext.logger.error('RequestActions: Closeout failed', error);
    } finally {
      setActiveAction(undefined);
    }
  }, [workflowCloseout, closeoutStore]);

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

  /**
   * Button visibility logic based on status and permissions
   *
   * Layout by Status:
   * - New Request: [right] Save as Draft, Submit Request, Close
   * - Draft: [left] On Hold, Cancel | [right] Save as Draft, Submit Request, Close
   * - Legal Intake: [left] On Hold, Cancel (Admin/Creator/LegalAdmin) | [right] Save (Admin/Author on changes), Assign Attorney (LegalAdmin/Admin), Submit to Assign Attorney (LegalAdmin/Admin), Close
   * - Assign Attorney: [left] On Hold, Cancel (Admin/Creator/LegalAdmin) | [right] Save (Admin/Creator), Assign Attorney (AttorneyAssigner/Admin), Close
   * - In Review: [left] On Hold, Cancel (Admin/Creator/LegalAdmin) | [right] Save (Admin/Creator), Close
   * - Closeout: [right] Submit (Admin/Creator), Close
   * - Completed/Cancelled: [right] Close only
   */

  // Submit Request button - New Request and Draft only
  const showSubmitRequest = React.useMemo(() => {
    if (hideSubmit) return false;
    if (permissionsLoading) return false;
    // Only in Draft or new request
    if (isNewRequest || status === RequestStatus.Draft) {
      return availableActions.canSubmit;
    }
    return false;
  }, [hideSubmit, permissionsLoading, isNewRequest, status, availableActions.canSubmit]);

  // Save as Draft button - New Request and Draft only
  const showSaveAsDraft = React.useMemo(() => {
    if (hideSaveDraft) return false;
    if (permissionsLoading) return false;
    // Only in Draft or new request
    if (isNewRequest || status === RequestStatus.Draft) {
      return availableActions.canSaveDraft;
    }
    return false;
  }, [hideSaveDraft, permissionsLoading, isNewRequest, status, availableActions.canSaveDraft]);

  // Save button (for submitted requests) - Admin/Author when there are changes
  const showSave = React.useMemo(() => {
    if (permissionsLoading) return false;
    // Not for new requests or draft (they use Save as Draft)
    if (isNewRequest || status === RequestStatus.Draft) return false;
    // Not for Completed, Cancelled, or Closeout
    if (status === RequestStatus.Completed || status === RequestStatus.Cancelled || status === RequestStatus.Closeout) return false;
    // Only show when there are changes
    if (!isDirty) return false;
    // Admin or Owner can save
    return permissions.isAdmin || isOwner;
  }, [permissionsLoading, isNewRequest, status, isDirty, permissions.isAdmin, isOwner]);

  // Cancel Request button - Admin, Creator, or Legal Admin (not in Closeout, Completed, Cancelled)
  const showCancel = React.useMemo(() => {
    if (permissionsLoading) return false;
    // Not for new requests
    if (isNewRequest) return false;
    // Not for Completed, Cancelled, or Closeout
    if (status === RequestStatus.Completed || status === RequestStatus.Cancelled || status === RequestStatus.Closeout) return false;
    // Admin, Legal Admin, or Owner can cancel
    return permissions.isAdmin || permissions.isLegalAdmin || isOwner;
  }, [permissionsLoading, isNewRequest, status, permissions.isAdmin, permissions.isLegalAdmin, isOwner]);

  // On Hold button - Admin, Creator, or Legal Admin (not in Closeout, Completed, Cancelled, OnHold)
  const showOnHold = React.useMemo(() => {
    if (permissionsLoading) return false;
    // Not for new requests
    if (isNewRequest) return false;
    // Not for Completed, Cancelled, Closeout, or already OnHold
    if (status === RequestStatus.Completed || status === RequestStatus.Cancelled || status === RequestStatus.Closeout || status === RequestStatus.OnHold) return false;
    // Admin, Legal Admin, or Owner can put on hold
    return permissions.isAdmin || permissions.isLegalAdmin || isOwner;
  }, [permissionsLoading, isNewRequest, status, permissions.isAdmin, permissions.isLegalAdmin, isOwner]);

  // Resume button - Only when On Hold
  const showResume = React.useMemo(() => {
    if (permissionsLoading) return false;
    if (status !== RequestStatus.OnHold) return false;
    // Use permission check
    return availableActions.canResume;
  }, [permissionsLoading, status, availableActions.canResume]);

  // Assign Attorney button - Legal Intake (LegalAdmin/Admin) or Assign Attorney status (AttorneyAssigner/Admin)
  const showAssignAttorney = React.useMemo(() => {
    if (permissionsLoading) return false;
    if (status === RequestStatus.LegalIntake) {
      // Legal Admin or Admin can directly assign
      return permissions.isAdmin || permissions.isLegalAdmin;
    }
    if (status === RequestStatus.AssignAttorney) {
      // Attorney Assigner group or Admin
      return permissions.isAdmin || permissions.isAttorneyAssigner;
    }
    return false;
  }, [permissionsLoading, status, permissions.isAdmin, permissions.isLegalAdmin, permissions.isAttorneyAssigner]);

  // Submit to Assign Attorney button - Legal Intake only (LegalAdmin/Admin)
  const showSendToCommittee = React.useMemo(() => {
    if (permissionsLoading) return false;
    if (status !== RequestStatus.LegalIntake) return false;
    // Legal Admin or Admin can send to committee
    return permissions.isAdmin || permissions.isLegalAdmin;
  }, [permissionsLoading, status, permissions.isAdmin, permissions.isLegalAdmin]);

  // Closeout Submit button - Closeout status (Admin/Creator)
  const showCloseoutSubmit = React.useMemo(() => {
    if (permissionsLoading) return false;
    if (status !== RequestStatus.Closeout) return false;
    // Admin or Owner can submit closeout
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
      default:
        return 'Processing...';
    }
  }, [activeAction]);

  return (
    <Stack
      tokens={{ childrenGap: 16 }}
      styles={{ root: { padding: '24px', width: '100%', margin: '0' } }}
    >
      {/* Validation Errors Summary - displayed above action buttons (no dismiss button) */}
      {validationErrors && validationErrors.length > 0 && (
        <div
          ref={errorContainerRef}
          tabIndex={-1}
          role='alert'
          aria-live='assertive'
          style={{ outline: 'none' }}
        >
          <MessageBar
            messageBarType={MessageBarType.error}
            isMultiline={true}
            styles={{
              root: {
                marginBottom: '8px',
                borderRadius: '4px',
              },
            }}
          >
            <Stack tokens={{ childrenGap: 4 }}>
              <span style={{ fontWeight: 600 }}>
                Please fix the following errors before continuing:
              </span>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                {sortedValidationErrors.map((error, index) => (
                  <li key={`error-${index}`} style={{ marginBottom: '4px' }}>
                    <button
                      type='button'
                      onClick={() => scrollToField(error.field)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        margin: 0,
                        font: 'inherit',
                        fontWeight: 600,
                        color: '#0078d4',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                      aria-label={`Go to ${getFieldLabel(error.field)} field`}
                    >
                      {getFieldLabel(error.field)}
                    </button>
                    : {error.message}
                  </li>
                ))}
              </ul>
            </Stack>
          </MessageBar>
        </div>
      )}

      <div className='request-actions__container'>
        {/* Two-section layout: Left (less frequent) and Right (primary actions) */}
        <Stack horizontal horizontalAlign='space-between' wrap styles={{ root: { width: '100%', gap: '16px' } }}>
          {/* Left Section: Less frequent actions */}
          <Stack horizontal tokens={{ childrenGap: 12 }} wrap>
            {/* Super Admin Mode Button - Only visible to admins, not on new/draft requests */}
            {permissions.isAdmin && !isNewRequest && status !== RequestStatus.Draft && (
              <TooltipHost content="Administrative Override Mode">
                <IconButton
                  iconProps={{ iconName: 'Settings' }}
                  onClick={() => setShowSuperAdminPanel(true)}
                  disabled={isAnyActionInProgress}
                  ariaLabel="Open Admin Override Panel"
                  className="super-admin-trigger"
                />
              </TooltipHost>
            )}
            {showCancel && (
              <DefaultButton
                text='Cancel Request'
                iconProps={{ iconName: 'StatusErrorFull' }}
                onClick={handleCancelRequestClick}
                disabled={isAnyActionInProgress}
                ariaLabel='Cancel this request'
                styles={{
                  root: {
                    minWidth: '140px',
                    height: '44px',
                    borderRadius: '4px',
                    color: '#a80000',
                  },
                }}
              />
            )}
            {showOnHold && (
              <DefaultButton
                text='Put On Hold'
                iconProps={{ iconName: 'Pause' }}
                onClick={handlePutOnHoldClick}
                disabled={isAnyActionInProgress}
                ariaLabel='Put request on hold'
                styles={{
                  root: {
                    minWidth: '140px',
                    height: '44px',
                    borderRadius: '4px',
                  },
                }}
              />
            )}
            {showResume && (
              <DefaultButton
                text='Resume'
                iconProps={{ iconName: 'Play' }}
                onClick={handleResumeClick}
                disabled={isAnyActionInProgress}
                ariaLabel='Resume request from hold'
                styles={{
                  root: {
                    minWidth: '140px',
                    height: '44px',
                    borderRadius: '4px',
                    color: '#107c10',
                  },
                }}
              />
            )}
          </Stack>

          {/* Right Section: Primary actions */}
          <Stack horizontal tokens={{ childrenGap: 12 }} wrap>
            {/* Save button - for submitted requests with changes */}
            {showSave && (
              <DefaultButton
                text='Save'
                iconProps={{ iconName: 'Save' }}
                onClick={handleSaveDraft}
                disabled={isAnyActionInProgress}
                ariaLabel='Save changes'
                styles={{
                  root: {
                    minWidth: '120px',
                    height: '44px',
                    borderRadius: '4px',
                  },
                }}
              />
            )}

            {/* Submit to Assign Attorney button - Legal Intake only */}
            {showSendToCommittee && (
              <DefaultButton
                text='Submit to Assign Attorney'
                iconProps={{ iconName: 'Group' }}
                onClick={handleSendToCommitteeClick}
                disabled={isAnyActionInProgress}
                ariaLabel='Submit to committee for attorney assignment'
                styles={{
                  root: {
                    minWidth: '180px',
                    height: '44px',
                    borderRadius: '4px',
                  },
                }}
              />
            )}

            {/* Assign Attorney button - Legal Intake and Assign Attorney status */}
            {showAssignAttorney && (
              <PrimaryButton
                text='Assign Attorney'
                iconProps={{ iconName: 'UserFollowed' }}
                onClick={handleAssignAttorneyClick}
                disabled={isAnyActionInProgress}
                ariaLabel='Assign attorney to this request'
                styles={{
                  root: {
                    minWidth: '160px',
                    height: '44px',
                    borderRadius: '4px',
                  },
                }}
              />
            )}

            {/* Closeout Submit button - Closeout status only */}
            {showCloseoutSubmit && (
              <PrimaryButton
                text='Complete Closeout'
                iconProps={{ iconName: 'Completed' }}
                onClick={handleCloseoutClick}
                disabled={isAnyActionInProgress}
                ariaLabel='Complete the closeout process'
                styles={{
                  root: {
                    minWidth: '160px',
                    height: '44px',
                    borderRadius: '4px',
                  },
                }}
              />
            )}

            {/* Submit Request button - Draft/New only */}
            {showSubmitRequest && (
              <PrimaryButton
                text={submitButtonText}
                iconProps={{ iconName: submitButtonIcon }}
                onClick={handleSubmitClick}
                disabled={isAnyActionInProgress}
                ariaLabel={submitButtonText}
                styles={{
                  root: {
                    minWidth: '160px',
                    height: '44px',
                    borderRadius: '4px',
                  },
                }}
              />
            )}

            {/* Save as Draft button - Draft/New only */}
            {showSaveAsDraft && (
              <DefaultButton
                text='Save as Draft'
                iconProps={{ iconName: 'Save' }}
                onClick={handleSaveDraft}
                disabled={isAnyActionInProgress}
                ariaLabel='Save request as draft'
                styles={{
                  root: {
                    minWidth: '140px',
                    height: '44px',
                    borderRadius: '4px',
                  },
                }}
              />
            )}

            {/* Close button - Always visible */}
            <DefaultButton
              text='Close'
              iconProps={{ iconName: 'ChromeClose' }}
              onClick={handleClose}
              disabled={isAnyActionInProgress}
              ariaLabel='Close form and return'
              styles={{
                root: {
                  minWidth: '120px',
                  height: '44px',
                  borderRadius: '4px',
                  marginLeft: '24px', // Extra spacing before Close button
                },
              }}
            />
          </Stack>
        </Stack>

        {/* Loading Overlay - shown during any action */}
        {isAnyActionInProgress && (
          <LoadingOverlay
            message={loadingMessage}
            fullPage={true}
            blurBackdrop={true}
            spinnerSize={2} // SpinnerSize.large
          />
        )}

        {/* Reason Dialog - for Cancel and Put On Hold */}
        <ReasonDialog
          isOpen={showReasonDialog}
          action={reasonDialogAction}
          onConfirm={handleReasonConfirm}
          onCancel={handleReasonCancel}
          isProcessing={isAnyActionInProgress}
        />

        {/* Unsaved Changes Dialog */}
        <Dialog
          hidden={!showUnsavedDialog}
          onDismiss={handleUnsavedCancel}
          dialogContentProps={{
            type: DialogType.normal,
            title: 'Unsaved Changes',
            subText: 'You have unsaved changes. Are you sure you want to leave without saving?',
          }}
          modalProps={{
            isBlocking: true,
            styles: { main: { maxWidth: 450 } },
          }}
        >
          <DialogFooter>
            <PrimaryButton onClick={handleUnsavedConfirm} text='Leave without saving' />
            <DefaultButton onClick={handleUnsavedCancel} text='Stay on page' />
          </DialogFooter>
        </Dialog>

        {/* Super Admin Panel - Administrative Override Mode (not on new/draft requests) */}
        {permissions.isAdmin && !isNewRequest && status !== RequestStatus.Draft && (
          <SuperAdminPanel
            isOpen={showSuperAdminPanel}
            onDismiss={() => setShowSuperAdminPanel(false)}
            onActionComplete={(action, success) => {
              if (success) {
                SPContext.logger.info('Super Admin action completed', { action });
                // Optionally reload the request to reflect changes
                // The store's updateRequest already handles this
              }
            }}
          />
        )}

      </div>
    </Stack>
  );
};

export default RequestActions;

/**
 * RequestContainer Component
 *
 * Main container for the request form with new layout:
 * - Workflow Stepper at the very top (full width)
 * - Header row with Request ID + Manage Access + Comments toggle
 * - 70/30 split: Left = Form cards, Right = Collapsible Comments Panel
 *
 * Features:
 * - Collapsible cards for Request Summary (includes approvals), Stage forms
 * - Stage cards collapse when moving to next workflow stage
 * - Attachments always above action buttons
 * - Comments panel collapsible on the right (toggle in header)
 */

import * as React from 'react';

// Fluent UI - tree-shaken imports
import { IconButton } from '@fluentui/react/lib/Button';
import { Icon } from '@fluentui/react/lib/Icon';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';

// PnP Controls - SharePoint Comments
import { ListItemComments } from '@pnp/spfx-controls-react/lib/controls/listItemComments';
import type { ServiceScope } from '@microsoft/sp-core-library';

// spfx-toolkit - tree-shaken imports
import { ErrorBoundary } from 'spfx-toolkit/lib/components/ErrorBoundary';
import { LazyManageAccessComponent } from 'spfx-toolkit/lib/components/lazy';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

// App imports using path aliases
import { RequestType } from '@appTypes/requestTypes';
import { RequestStatus } from '@appTypes/workflowTypes';
import { LoadingFallback } from '@components/LoadingFallback';
import { StatusBanner } from '@components/StatusBanner';
import { useWorkflowStepper } from '@components/WorkflowStepper/useWorkflowStepper';
import { useRequestStore } from '@stores/requestStore';
import { handleManageAccessChange, type IPermissionPrincipal } from '@services/azureFunctionService';
import { RequestActions } from '../RequestActions';
import { RequestApprovals } from '../RequestApprovals';
import { RequestDocuments } from '../RequestDocuments';
import { RequestSummary } from '../RequestSummary';
import { RequestTypeSelector } from '../RequestTypeSelector';
import { WorkflowFormWrapper } from '../WorkflowFormWrapper';
import { FINRADocuments } from '../FINRADocuments';
import './RequestContainer.scss';

// Lazy load workflow stage forms - these are only loaded when needed
const LegalIntakeForm = React.lazy(
  () => import(/* webpackChunkName: "legal-intake-form" */ '../LegalIntakeForm/LegalIntakeForm')
);
const LegalReviewForm = React.lazy(
  () => import(/* webpackChunkName: "legal-review-form" */ '../LegalReviewForm/LegalReviewForm')
);
const ComplianceReviewForm = React.lazy(
  () =>
    import(
      /* webpackChunkName: "compliance-review-form" */ '../ComplianceReviewForm/ComplianceReviewForm'
    )
);
const CloseoutForm = React.lazy(
  () => import(/* webpackChunkName: "closeout-form" */ '../CloseoutForm/CloseoutForm')
);

/**
 * Error handler for lazy loaded form errors
 * Logs the error with context about which form failed
 */
const handleFormError = (formName: string) => (error: Error): void => {
  SPContext.logger.error(`RequestContainer: ${formName} error`, error, {
    formName,
    context: 'LazyFormLoad',
  });
};

/**
 * Wrapper component for lazy-loaded forms with error boundary
 * Provides consistent error handling and recovery for all stage forms
 */
interface ILazyFormWrapperProps {
  children: React.ReactNode;
  formName: string;
  fallbackMessage?: string;
}

const LazyFormWrapper: React.FC<ILazyFormWrapperProps> = ({
  children,
  formName,
  fallbackMessage = 'Loading form...',
}) => {
  return (
    <ErrorBoundary
      enableRetry={true}
      maxRetries={2}
      showDetailsButton={process.env.NODE_ENV === 'development'}
      onError={handleFormError(formName)}
      userFriendlyMessages={{
        title: `Unable to load ${formName}`,
        description: 'An error occurred while loading this section. Please try again.',
        retryButtonText: 'Retry',
        detailsButtonText: 'Show Details',
        closeButtonText: 'Close',
        recoveringText: 'Recovering...',
        dismissButtonText: 'Dismiss',
        maxRetriesReached: 'Maximum retry attempts reached. Please refresh the page.',
      }}
    >
      <React.Suspense fallback={<LoadingFallback message={fallbackMessage} />}>
        {children}
      </React.Suspense>
    </ErrorBoundary>
  );
};

/**
 * RequestContainer props
 */
export interface IRequestContainerProps {
  /** Item ID for existing request (undefined for new request) */
  itemId?: number;

  /** List ID for comments */
  listId: string;

  /** Custom CSS class */
  className?: string;

  /** Callback when request type is selected (new requests) */
  onRequestTypeSelected?: (requestType: RequestType) => void;

  /** Request form component to render */
  requestFormComponent?: React.ComponentType<IRequestFormProps>;
}

/**
 * Request form component props
 */
export interface IRequestFormProps {
  itemId?: number;
  renderApprovalsAndActions?: boolean;
  children?: React.ReactNode;
  /** Callback when save completes successfully (for edit mode) */
  onSaveComplete?: () => void;
  /** If true, enables edit mode with integrated save button */
  isEditMode?: boolean;
}

/**
 * RequestContainer Component
 */
export const RequestContainer: React.FC<IRequestContainerProps> = ({
  itemId,
  listId,
  className,
  onRequestTypeSelected,
  requestFormComponent: RequestFormComponent,
}) => {
  const currentRequest = useRequestStore((s) => s.currentRequest);
  const [isCommentsOpen, setIsCommentsOpen] = React.useState<boolean>(true);
  const [showTypeSelector, setShowTypeSelector] = React.useState<boolean>(false);
  const [isTypeLocked, setIsTypeLocked] = React.useState<boolean>(false);
  const [isEditingRequestInfo, setIsEditingRequestInfo] = React.useState<boolean>(false);

  // Determine if current user is the submitter (for contextual stepper coloring)
  const isCurrentUserSubmitter = React.useMemo((): boolean => {
    if (!currentRequest) return false;
    const currentUserId = SPContext.currentUser?.id?.toString() ?? '';
    return (
      String(currentRequest.submittedBy?.id ?? '') === currentUserId ||
      String(currentRequest.author?.id ?? '') === currentUserId
    );
  }, [currentRequest?.submittedBy?.id, currentRequest?.author?.id]);

  // Get the workflow stepper with enhanced metadata for contextual step info
  const requestMetadata = React.useMemo(
    () => ({
      // Draft step info
      createdOn: currentRequest?.created,
      createdBy: currentRequest?.author?.title,
      createdByLogin: currentRequest?.author?.loginName,
      // Submitted info
      submittedOn: currentRequest?.submittedOn,
      submittedBy: currentRequest?.submittedBy?.title,
      submittedByLogin: currentRequest?.submittedBy?.loginName,
      // Legal Intake step info (combined with Assign Attorney)
      legalIntakeCompletedOn: currentRequest?.submittedForReviewOn,
      legalIntakeCompletedBy: currentRequest?.submittedForReviewBy?.title,
      legalIntakeCompletedByLogin: currentRequest?.submittedForReviewBy?.loginName,
      assignedAttorney: currentRequest?.attorney?.title,
      assignedAttorneyLogin: currentRequest?.attorney?.loginName,
      // Review step info
      reviewStartedOn: currentRequest?.submittedForReviewOn,
      reviewAudience: currentRequest?.reviewAudience,
      // Legal review completion info
      legalReviewCompleted: currentRequest?.legalReview?.status === 'Completed',
      legalReviewOutcome: currentRequest?.legalReview?.outcome,
      legalReviewCompletedOn: currentRequest?.legalReviewCompletedOn,
      legalReviewCompletedBy: currentRequest?.legalReviewCompletedBy?.title,
      legalReviewCompletedByLogin: currentRequest?.legalReviewCompletedBy?.loginName,
      // Compliance review completion info
      complianceReviewCompleted: currentRequest?.complianceReview?.status === 'Completed',
      complianceReviewOutcome: currentRequest?.complianceReview?.outcome,
      complianceReviewCompletedOn: currentRequest?.complianceReviewCompletedOn,
      complianceReviewCompletedBy: currentRequest?.complianceReviewCompletedBy?.title,
      complianceReviewCompletedByLogin: currentRequest?.complianceReviewCompletedBy?.loginName,
      // Closeout step info
      closeoutStartedOn: currentRequest?.closeoutOn ? undefined : currentRequest?.legalReviewCompletedOn || currentRequest?.complianceReviewCompletedOn,
      completedOn: currentRequest?.closeoutOn,
      closeoutCompletedBy: currentRequest?.closeoutBy?.title,
      closeoutCompletedByLogin: currentRequest?.closeoutBy?.loginName,
      trackingId: currentRequest?.trackingId,
      // Contextual coloring fields for "In Review" step
      legalReviewStatus: currentRequest?.legalReview?.status,
      complianceReviewStatus: currentRequest?.complianceReview?.status,
      isCurrentUserSubmitter,
      // FINRA Documents step fields
      isForesideReviewRequired:
        (currentRequest?.complianceReview?.isForesideReviewRequired === true &&
          currentRequest?.complianceReview?.isRetailUse === true) ||
        (currentRequest?.isForesideReviewRequired === true && currentRequest?.isRetailUse === true),
      finraCompletedOn: currentRequest?.finraCompletedOn,
      finraCompletedBy: currentRequest?.finraCompletedBy?.title,
      // Terminal state fields (Cancelled/OnHold)
      previousStatus: currentRequest?.previousStatus,
      cancelledOn: currentRequest?.cancelledOn,
      cancelledBy: currentRequest?.cancelledBy?.title,
      cancelledByLogin: currentRequest?.cancelledBy?.loginName,
      cancelReason: currentRequest?.cancelReason,
      onHoldSince: currentRequest?.onHoldSince,
      onHoldBy: currentRequest?.onHoldBy?.title,
      onHoldByLogin: currentRequest?.onHoldBy?.loginName,
      onHoldReason: currentRequest?.onHoldReason,
    }),
    [
      currentRequest?.status, // Include status to ensure metadata updates when status changes
      currentRequest?.created,
      currentRequest?.author,
      currentRequest?.submittedOn,
      currentRequest?.submittedBy,
      currentRequest?.submittedForReviewOn,
      currentRequest?.submittedForReviewBy,
      currentRequest?.attorney,
      currentRequest?.reviewAudience,
      currentRequest?.legalReview?.status,
      currentRequest?.legalReview?.outcome,
      currentRequest?.legalReviewCompletedBy,
      currentRequest?.legalReviewCompletedOn,
      currentRequest?.complianceReview?.status,
      currentRequest?.complianceReview?.outcome,
      currentRequest?.complianceReview?.isForesideReviewRequired,
      currentRequest?.complianceReview?.isRetailUse,
      currentRequest?.complianceReviewCompletedBy,
      currentRequest?.complianceReviewCompletedOn,
      currentRequest?.closeoutOn,
      currentRequest?.closeoutBy,
      currentRequest?.trackingId,
      currentRequest?.isForesideReviewRequired,
      currentRequest?.isRetailUse,
      currentRequest?.finraCompletedOn,
      currentRequest?.finraCompletedBy,
      currentRequest?.previousStatus,
      currentRequest?.cancelledOn,
      currentRequest?.cancelledBy,
      currentRequest?.cancelReason,
      currentRequest?.onHoldSince,
      currentRequest?.onHoldBy,
      currentRequest?.onHoldReason,
      isCurrentUserSubmitter,
    ]
  );

  const { renderStepper } = useWorkflowStepper({
    requestType: currentRequest?.requestType || RequestType.Communication,
    currentStatus: currentRequest?.status,
    mode: 'progress',
    requestMetadata,
  });

  /**
   * Determine if we should show comments panel
   * Comments are hidden for Draft status only
   */
  const shouldShowComments = React.useMemo((): boolean => {
    if (!itemId) return false;
    if (!currentRequest) return false;
    if (currentRequest.status === RequestStatus.Draft) return false;
    return true;
  }, [itemId, currentRequest]);

  /**
   * Determine if we should show the request type selector
   */
  React.useEffect(() => {
    if (!itemId && !isTypeLocked) {
      setShowTypeSelector(true);
    } else {
      setShowTypeSelector(false);
    }
  }, [itemId, isTypeLocked]);

  // Ref for comments area to enable auto-scroll on mobile
  const commentsAreaRef = React.useRef<HTMLDivElement>(null);

  // Ref to track and cleanup setTimeout calls to prevent memory leaks
  const scrollTimeoutRef = React.useRef<number | undefined>(undefined);

  // Cleanup timeout on unmount to prevent memory leaks
  React.useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Handle comments toggle with auto-scroll on mobile
   */
  const handleToggleComments = React.useCallback((): void => {
    setIsCommentsOpen((prev) => {
      const newState = !prev;

      // Auto-scroll to comments on mobile when opening
      if (newState && window.innerWidth <= 1200) {
        // Clear any pending scroll timeout
        if (scrollTimeoutRef.current) {
          window.clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = window.setTimeout(() => {
          commentsAreaRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
          scrollTimeoutRef.current = undefined;
        }, 100); // Small delay to allow render
      }

      return newState;
    });
  }, []);

  /**
   * Handle edit request info click
   */
  const handleEditRequestInfo = React.useCallback((): void => {
    setIsEditingRequestInfo(true);
    // Clear any pending scroll timeout
    if (scrollTimeoutRef.current) {
      window.clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      scrollTimeoutRef.current = undefined;
    }, 100);
  }, []);

  /**
   * Handle close edit mode
   */
  const handleCloseEditRequestInfo = React.useCallback((): void => {
    setIsEditingRequestInfo(false);
  }, []);

  /**
   * Handle request type selection
   */
  const handleRequestTypeSelected = React.useCallback(
    (requestType: RequestType): void => {
      setIsTypeLocked(true);
      setShowTypeSelector(false);
      // Clear any pending scroll timeout
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = window.setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        scrollTimeoutRef.current = undefined;
      }, 100);
      if (onRequestTypeSelected) {
        onRequestTypeSelected(requestType);
      }
    },
    [onRequestTypeSelected]
  );

  /**
   * Handle cancel from type selector
   */
  const handleCancelTypeSelector = React.useCallback((): void => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.close();
    }
  }, []);

  /**
   * Handle ManageAccess permission changed
   * Calls Azure Function via APIM to add/remove user permissions
   */
  const handlePermissionChanged = React.useCallback(
    async (
      operation: 'add' | 'remove',
      principals: IPermissionPrincipal[]
    ): Promise<boolean> => {
      if (!itemId || !currentRequest?.requestId) {
        SPContext.logger.warn('RequestContainer: Cannot change permissions - missing itemId or requestId');
        return false;
      }

      try {
        SPContext.logger.info('RequestContainer: Permission change requested', {
          operation,
          itemId,
          requestId: currentRequest.requestId,
          principalCount: principals.length,
        });

        // Call Azure Function via APIM
        const success = await handleManageAccessChange(
          operation,
          itemId,
          currentRequest.requestId,
          principals
        );

        if (success) {
          SPContext.logger.success('RequestContainer: Permission change completed', {
            operation,
            itemId,
          });
        } else {
          SPContext.logger.warn('RequestContainer: Permission change failed', {
            operation,
            itemId,
          });
        }

        return success;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        SPContext.logger.error('RequestContainer: Permission change error', error, {
          operation,
          itemId,
          error: message,
        });
        return false;
      }
    },
    [itemId, currentRequest?.requestId]
  );

  /**
   * Get request type display info
   */
  const getRequestTypeInfo = (type: RequestType | undefined): { label: string; color: string; backgroundColor: string } => {
    switch (type) {
      case RequestType.Communication:
        return { label: 'Communication', color: '#005a9e', backgroundColor: '#deecf9' };
      case RequestType.GeneralReview:
        return { label: 'General Review', color: '#8764b8', backgroundColor: '#f3edf7' };
      case RequestType.IMAReview:
        return { label: 'IMA Review', color: '#498205', backgroundColor: '#dff6dd' };
      default:
        return { label: 'Request', color: '#605e5c', backgroundColor: '#edebe9' };
    }
  };

  /**
   * Render the request header with ID, Request Type, Manage Access, and Comments toggle
   * Shows for all views (draft/new/submitted) - request type is always visible
   */
  const renderRequestHeader = (): React.ReactElement | null => {
    // Don't show header during type selection
    if (showTypeSelector) return null;

    const typeInfo = getRequestTypeInfo(currentRequest?.requestType);
    const isDraft = !currentRequest?.status || currentRequest.status === RequestStatus.Draft;
    const isNewRequest = !itemId;

    return (
      <div className='request-container__header'>
        <Stack horizontal verticalAlign='center' horizontalAlign='space-between'>
          <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 12 }}>
            {/* Show Request ID for existing requests, or "New Request" / "Draft" label */}
            <Text variant='xLarge' styles={{ root: { fontWeight: 600 } }}>
              {isNewRequest ? 'New Request' : (currentRequest?.requestId || 'Draft')}
            </Text>
            {/* Always show request type token */}
            <div
              className='request-container__type-token'
              style={{
                backgroundColor: typeInfo.backgroundColor,
                color: typeInfo.color,
              }}
            >
              {typeInfo.label}
            </div>
          </Stack>
          <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 16 }}>
            {/* Manage Access Component - only for existing non-draft requests */}
            {itemId && !isDraft && (
              <div className='request-container__manage-access'>
                <LazyManageAccessComponent
                  itemId={itemId}
                  listId={listId}
                  permissionTypes='both'
                  maxAvatars={5}
                  enabled={true}
                  onPermissionChanged={handlePermissionChanged}
                />
              </div>
            )}
            {/* Comments Toggle Button */}
            {shouldShowComments && (
              <TooltipHost content={isCommentsOpen ? 'Hide comments' : 'Show comments'}>
                <IconButton
                  iconProps={{ iconName: isCommentsOpen ? 'CommentActive' : 'Comment' }}
                  onClick={handleToggleComments}
                  ariaLabel={isCommentsOpen ? 'Hide comments' : 'Show comments'}
                  className={`request-container__comments-toggle ${isCommentsOpen ? 'active' : ''}`}
                />
              </TooltipHost>
            )}
          </Stack>
        </Stack>
      </div>
    );
  };

  /**
   * Render comments panel using PnP ListItemComments control
   */
  const renderCommentsPanel = (): React.ReactElement => {
    if (!itemId) return <div />;


    // Get serviceScope from SPFx context for ListItemComments
    // SPContext.spfxContext returns SPFxContextInput which extends BaseComponentContext
    // Cast through unknown to avoid type mismatch between spfx-toolkit's and local node_modules
    const serviceScope = SPContext.spfxContext.serviceScope as unknown as ServiceScope;

    if (!serviceScope) {
      // Fallback if serviceScope is not available
      return (
        <div className='request-container__comments-panel'>
          <div className='request-container__comments-header'>
            <Text variant='large' styles={{ root: { fontWeight: 600 } }}>
              Comments
            </Text>
          </div>
          <div className='request-container__comments-content'>
            <div style={{ padding: '16px', color: '#605e5c', textAlign: 'center' }}>
              <Icon iconName='Comment' style={{ fontSize: '24px', marginBottom: '8px', display: 'block' }} />
              <Text variant='small' style={{ color: '#8a8886' }}>
                Comments are not available
              </Text>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className='request-container__comments-panel'>
        <div className='request-container__comments-header'>
          <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 8 }}>
            <Icon iconName='Comment' styles={{ root: { fontSize: '18px', color: '#0078d4' } }} />
            <Text variant='large' styles={{ root: { fontWeight: 600 } }}>
              Comments
            </Text>
          </Stack>
        </div>

        {/* Warning banner for special characters */}
        <div className='request-container__comments-warning'>
          <Icon iconName='Warning' styles={{ root: { fontSize: '14px', color: '#797673' } }} />
          <Text variant='small' styles={{ root: { color: '#605e5c' } }}>
            Avoid special characters: &lt; &gt; &amp; &quot; &#39; * : ? / \ |
          </Text>
        </div>

        <div className='request-container__comments-content'>
          <ListItemComments
            listId={listId}
            itemId={String(itemId)}
            serviceScope={serviceScope}
            webUrl={SPContext.webAbsoluteUrl}
            numberCommentsPerPage={10}
            label=''
          />
        </div>
      </div>
    );
  };

  /**
   * Render the form content (left side in 70/30 layout)
   */
  const renderFormContent = (): React.ReactElement => {
    const status = currentRequest?.status;
    const previousStatus = currentRequest?.previousStatus;

    // Check if request is in terminal state (Cancelled or On Hold)
    const isTerminalState = status === RequestStatus.Cancelled || status === RequestStatus.OnHold;

    /**
     * Workflow stage order for determining form visibility
     * Higher number = later in workflow
     */
    const STAGE_ORDER: Record<string, number> = {
      [RequestStatus.Draft]: 1,
      [RequestStatus.LegalIntake]: 2,
      [RequestStatus.AssignAttorney]: 2,
      [RequestStatus.InReview]: 3,
      [RequestStatus.Closeout]: 4,
      [RequestStatus.AwaitingFINRADocuments]: 5,
      [RequestStatus.Completed]: 6,
    };

    /**
     * Check if a form section should be shown based on workflow progress
     * For terminal states: show if previousStatus reached or passed the required stage
     * For normal flow: show if current status is at or past the required stage
     */
    const shouldShowForm = (requiredStage: RequestStatus): boolean => {
      if (isTerminalState) {
        // For Cancelled/OnHold: show forms for stages that were reached before terminal state
        if (!previousStatus) return false;
        return (STAGE_ORDER[previousStatus] || 0) >= (STAGE_ORDER[requiredStage] || 0);
      }
      // Normal flow: show if current status is at or past required stage
      return (STAGE_ORDER[status || ''] || 0) >= (STAGE_ORDER[requiredStage] || 0);
    };

    // Draft status: Full form with approvals and attachments
    if (!status || status === RequestStatus.Draft) {
      if (RequestFormComponent) {
        return (
          <RequestFormComponent itemId={itemId} renderApprovalsAndActions={false}>
            <RequestApprovals />
            <RequestDocuments itemId={itemId} />
            <RequestActions />
          </RequestFormComponent>
        );
      }
      return <div />;
    }

    // Editing request info - show the full form with approvals (no documents - managed separately)
    // Pass isEditMode=true and onSaveComplete callback so RequestInfo handles the save
    if (isEditingRequestInfo && RequestFormComponent) {
      return (
        <WorkflowFormWrapper itemId={itemId}>
          <RequestFormComponent
            itemId={itemId}
            renderApprovalsAndActions={false}
            isEditMode={true}
            onSaveComplete={handleCloseEditRequestInfo}
          >
            <RequestApprovals forceShow defaultExpanded />
          </RequestFormComponent>
        </WorkflowFormWrapper>
      );
    }

    // Submitted requests: Show collapsible cards based on status
    // Note: Approvals are now shown within RequestSummary with DocumentLink for attachments
    return (
      <WorkflowFormWrapper itemId={itemId}>
        <Stack tokens={{ childrenGap: 16 }}>
          {/* Status Banner for Cancelled/OnHold - shown above Request Summary */}
          {isTerminalState && (
            <StatusBanner
              status={status}
              cancelMetadata={status === RequestStatus.Cancelled ? {
                cancelledBy: currentRequest?.cancelledBy?.title || '',
                cancelledOn: currentRequest?.cancelledOn || new Date(),
                cancelReason: currentRequest?.cancelReason || '',
                previousStatus: previousStatus || RequestStatus.Draft,
              } : undefined}
              holdMetadata={status === RequestStatus.OnHold ? {
                onHoldBy: currentRequest?.onHoldBy?.title || '',
                onHoldSince: currentRequest?.onHoldSince || new Date(),
                onHoldReason: currentRequest?.onHoldReason || '',
                previousStatus: previousStatus || RequestStatus.Draft,
              } : undefined}
            />
          )}

          {/* Request Summary Card - includes approvals with DocumentLink */}
          <RequestSummary onEditClick={isTerminalState ? undefined : handleEditRequestInfo} />

          {/* Legal Intake form - shows when workflow reached Legal Intake stage */}
          {/* Editable only during LegalIntake/AssignAttorney, read-only after that (InReview, Closeout, etc.) */}
          {shouldShowForm(RequestStatus.LegalIntake) && (
            <LazyFormWrapper formName="Legal Intake Form" fallbackMessage="Loading Legal Intake Form...">
              <LegalIntakeForm
                defaultExpanded={status === RequestStatus.LegalIntake || status === RequestStatus.AssignAttorney}
                readOnly={status !== RequestStatus.LegalIntake && status !== RequestStatus.AssignAttorney}
              />
            </LazyFormWrapper>
          )}

          {/* Review forms - shows when workflow reached In Review stage */}
          {shouldShowForm(RequestStatus.InReview) && (
            <>
              <LazyFormWrapper formName="Legal Review Form" fallbackMessage="Loading Legal Review Form...">
                <LegalReviewForm collapsible defaultCollapsed={isTerminalState} />
              </LazyFormWrapper>
              <LazyFormWrapper formName="Compliance Review Form" fallbackMessage="Loading Compliance Review Form...">
                <ComplianceReviewForm collapsible defaultCollapsed={isTerminalState} />
              </LazyFormWrapper>
            </>
          )}

          {/* Closeout form - shows when workflow reached Closeout stage */}
          {shouldShowForm(RequestStatus.Closeout) && (
            <>
              <LazyFormWrapper formName="Closeout Form" fallbackMessage="Loading Closeout Form...">
                <CloseoutForm readOnly={shouldShowForm(RequestStatus.AwaitingFINRADocuments) || isTerminalState} />
              </LazyFormWrapper>
            </>
          )}

          {/* Attachments - always above action buttons (read-only when AwaitingFINRADocuments or terminal) */}
          <ErrorBoundary
            enableRetry={true}
            maxRetries={2}
            onError={handleFormError('Request Documents')}
            userFriendlyMessages={{
              title: 'Unable to load Documents',
              description: 'An error occurred while loading documents. Please try again.',
              retryButtonText: 'Retry',
              detailsButtonText: 'Show Details',
              closeButtonText: 'Close',
              recoveringText: 'Recovering...',
              dismissButtonText: 'Dismiss',
              maxRetriesReached: 'Maximum retry attempts reached. Please refresh the page.',
            }}
          >
            <RequestDocuments itemId={itemId} />
          </ErrorBoundary>

          {/* FINRA Documents - shows when workflow reached Awaiting FINRA Documents stage */}
          {shouldShowForm(RequestStatus.AwaitingFINRADocuments) && (
            <ErrorBoundary
              enableRetry={true}
              maxRetries={2}
              onError={handleFormError('FINRA Documents')}
              userFriendlyMessages={{
                title: 'Unable to load FINRA Documents',
                description: 'An error occurred while loading FINRA documents. Please try again.',
                retryButtonText: 'Retry',
                detailsButtonText: 'Show Details',
                closeButtonText: 'Close',
                recoveringText: 'Recovering...',
                dismissButtonText: 'Dismiss',
                maxRetriesReached: 'Maximum retry attempts reached. Please refresh the page.',
              }}
            >
              <FINRADocuments itemId={itemId} readOnly={status === RequestStatus.Completed || isTerminalState} />
            </ErrorBoundary>
          )}

          {/* Action buttons at the bottom - always show for Close button */}
          <ErrorBoundary
            enableRetry={true}
            maxRetries={2}
            onError={handleFormError('Request Actions')}
            userFriendlyMessages={{
              title: 'Unable to load Actions',
              description: 'An error occurred while loading the action buttons. Please try again.',
              retryButtonText: 'Retry',
              detailsButtonText: 'Show Details',
              closeButtonText: 'Close',
              recoveringText: 'Recovering...',
              dismissButtonText: 'Dismiss',
              maxRetriesReached: 'Maximum retry attempts reached. Please refresh the page.',
            }}
          >
            <RequestActions />
          </ErrorBoundary>
        </Stack>
      </WorkflowFormWrapper>
    );
  };

  /**
   * Render main content based on request state
   */
  const renderMainContent = (): React.ReactElement => {
    // Show request type selector for new requests
    if (showTypeSelector) {
      return (
        <RequestTypeSelector
          onContinue={handleRequestTypeSelected}
          onCancel={handleCancelTypeSelector}
          showCancel={true}
        />
      );
    }

    // For Draft status, show without 70/30 split
    if (!currentRequest?.status || currentRequest.status === RequestStatus.Draft) {
      return (
        <div className='request-container__draft-layout'>
          {renderFormContent()}
        </div>
      );
    }

    // For submitted requests, show layout based on comments visibility
    if (shouldShowComments && isCommentsOpen) {
      return (
        <div className='request-container__split-layout'>
          <div className='request-container__form-area'>
            {renderFormContent()}
          </div>
          <div ref={commentsAreaRef} className='request-container__comments-area'>
            {renderCommentsPanel()}
          </div>
        </div>
      );
    }

    // Comments collapsed - full width form
    return (
      <div className='request-container__full-layout'>
        {renderFormContent()}
      </div>
    );
  };

  return (
    <div className={`request-container ${className || ''}`}>
      {/* Workflow Stepper - Full width at top for all views (including draft/new) */}
      {!showTypeSelector && (
        <div className='request-container__stepper'>
          {renderStepper()}
        </div>
      )}

      {/* Request Header - ID, Request Type, Manage Access, and Comments toggle */}
      {renderRequestHeader()}

      {/* Main Content Area */}
      <div className='request-container__main'>
        {renderMainContent()}
      </div>
    </div>
  );
};

export default RequestContainer;

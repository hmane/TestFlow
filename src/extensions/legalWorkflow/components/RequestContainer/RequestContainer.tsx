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
import { DefaultButton, IconButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { Icon } from '@fluentui/react/lib/Icon';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';

// PnP Controls - SharePoint Comments
import { ListItemComments } from '@pnp/spfx-controls-react/lib/controls/listItemComments';

// spfx-toolkit - tree-shaken imports
import { ErrorBoundary } from 'spfx-toolkit/lib/components/ErrorBoundary';
import { LazyManageAccessComponent } from 'spfx-toolkit/lib/components/lazy';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

// App imports using path aliases
import { RequestType } from '@appTypes/requestTypes';
import { RequestStatus } from '@appTypes/workflowTypes';
import { LoadingFallback } from '@components/LoadingFallback';
import { useWorkflowStepper } from '@components/WorkflowStepper/useWorkflowStepper';
import { useRequestStore } from '@stores/requestStore';
import { RequestActions } from '../RequestActions';
import { RequestApprovals } from '../RequestApprovals';
import { RequestDocuments } from '../RequestDocuments';
import { RequestSummary } from '../RequestSummary';
import { RequestTypeSelector } from '../RequestTypeSelector';
import { WorkflowFormWrapper } from '../WorkflowFormWrapper';
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
  const { currentRequest } = useRequestStore();
  const [isCommentsOpen, setIsCommentsOpen] = React.useState<boolean>(true);
  const [showTypeSelector, setShowTypeSelector] = React.useState<boolean>(false);
  const [isTypeLocked, setIsTypeLocked] = React.useState<boolean>(false);
  const [isEditingRequestInfo, setIsEditingRequestInfo] = React.useState<boolean>(false);

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
    }),
    [
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
      currentRequest?.complianceReviewCompletedBy,
      currentRequest?.complianceReviewCompletedOn,
      currentRequest?.closeoutOn,
      currentRequest?.closeoutBy,
      currentRequest?.trackingId,
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
   * Handle ManageAccess permission changed (read-only mode)
   */
  const handlePermissionChanged = React.useCallback(
    async (): Promise<boolean> => {
      // Read-only mode - no changes allowed from here
      return false;
    },
    []
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
                  permissionTypes='view'
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
    const spfxContext = SPContext.spfxContext as { serviceScope?: import('@microsoft/sp-core-library').ServiceScope };
    const serviceScope = spfxContext?.serviceScope;

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

    // Editing request info - show the full form with approvals
    if (isEditingRequestInfo && RequestFormComponent) {
      return (
        <WorkflowFormWrapper itemId={itemId}>
          <RequestFormComponent itemId={itemId} renderApprovalsAndActions={false}>
            <RequestApprovals />
            <RequestDocuments itemId={itemId} />
            <Stack horizontal horizontalAlign='end' tokens={{ childrenGap: 8 }} styles={{ root: { marginTop: 16 } }}>
              <DefaultButton text='Cancel' onClick={handleCloseEditRequestInfo} />
              <PrimaryButton text='Save Changes' onClick={handleCloseEditRequestInfo} />
            </Stack>
          </RequestFormComponent>
        </WorkflowFormWrapper>
      );
    }

    // Submitted requests: Show collapsible cards based on status
    // Note: Approvals are now shown within RequestSummary with DocumentLink for attachments
    return (
      <WorkflowFormWrapper itemId={itemId}>
        <Stack tokens={{ childrenGap: 16 }}>
          {/* Request Summary Card - includes approvals with DocumentLink */}
          <RequestSummary onEditClick={handleEditRequestInfo} />

          {/* Stage-specific forms */}
          {/* Legal Intake form shows for both LegalIntake and AssignAttorney status */}
          {/* AssignAttorney is a sub-state where Legal Admin/Attorney Assigner group assigns the attorney */}
          {(status === RequestStatus.LegalIntake || status === RequestStatus.AssignAttorney) && (
            <LazyFormWrapper formName="Legal Intake Form" fallbackMessage="Loading Legal Intake Form...">
              <LegalIntakeForm />
            </LazyFormWrapper>
          )}

          {status === RequestStatus.InReview && (
            <>
              {/* Legal Intake summary - collapsed, shows attorney info */}
              <LazyFormWrapper formName="Legal Intake Summary" fallbackMessage="Loading intake summary...">
                <LegalIntakeForm defaultExpanded={false} readOnly />
              </LazyFormWrapper>
              {/* Legal Review form with its own error boundary */}
              <LazyFormWrapper formName="Legal Review Form" fallbackMessage="Loading Legal Review Form...">
                <LegalReviewForm collapsible defaultCollapsed={false} />
              </LazyFormWrapper>
              {/* Compliance Review form with its own error boundary */}
              <LazyFormWrapper formName="Compliance Review Form" fallbackMessage="Loading Compliance Review Form...">
                <ComplianceReviewForm collapsible defaultCollapsed={false} />
              </LazyFormWrapper>
            </>
          )}

          {(status === RequestStatus.Closeout || status === RequestStatus.Completed) && (
            <>
              {/* Legal Intake summary - collapsed, shows attorney info */}
              <LazyFormWrapper formName="Legal Intake Summary" fallbackMessage="Loading intake summary...">
                <LegalIntakeForm defaultExpanded={false} readOnly />
              </LazyFormWrapper>
              {/* Completed review forms - will show in collapsed/completed state */}
              <LazyFormWrapper formName="Legal Review Summary" fallbackMessage="Loading review summary...">
                <LegalReviewForm collapsible defaultCollapsed />
              </LazyFormWrapper>
              <LazyFormWrapper formName="Compliance Review Summary" fallbackMessage="Loading review summary...">
                <ComplianceReviewForm collapsible defaultCollapsed />
              </LazyFormWrapper>
              {/* Closeout form - show for both Closeout and Completed status */}
              <LazyFormWrapper formName="Closeout Form" fallbackMessage="Loading Closeout Form...">
                <CloseoutForm readOnly={status === RequestStatus.Completed} />
              </LazyFormWrapper>
            </>
          )}

          {/* Attachments - always above action buttons */}
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

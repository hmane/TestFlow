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
import { RequestType } from '@appTypes/requestTypes';
import { RequestStatus } from '@appTypes/workflowTypes';
import { LoadingFallback } from '@components/LoadingFallback';
import { DefaultButton, IconButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { Icon } from '@fluentui/react/lib/Icon';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
import { useRequestStore } from '@stores/requestStore';
import { LazyManageAccessComponent } from 'spfx-toolkit/lib/components/lazy';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import { useWorkflowStepper } from '../../../../components/WorkflowStepper/useWorkflowStepper';
import { RequestActions } from '../RequestActions';
import { RequestApprovals } from '../RequestApprovals';
import { RequestDocuments } from '../RequestDocuments';
import { RequestSummary } from '../RequestSummary';
import { RequestTypeSelector } from '../RequestTypeSelector';
import { WorkflowFormWrapper } from '../WorkflowFormWrapper';
import './RequestContainer.scss';

// Lazy load ListItemComments to prevent PnP controls CSS from being bundled when not used
const ListItemComments = React.lazy(() =>
  import('@pnp/spfx-controls-react/lib/controls/listItemComments').then((module) => ({
    default: module.ListItemComments,
  }))
);

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
      // In Review step info
      reviewStartedOn: currentRequest?.submittedForReviewOn,
      reviewAudience: currentRequest?.reviewAudience,
      // Legal review completion info
      legalReviewCompleted: currentRequest?.legalReview?.status === 'Completed',
      legalReviewOutcome: currentRequest?.legalReview?.outcome,
      legalReviewCompletedOn: currentRequest?.legalReviewCompletedOn,
      // Compliance review completion info
      complianceReviewCompleted: currentRequest?.complianceReview?.status === 'Completed',
      complianceReviewOutcome: currentRequest?.complianceReview?.outcome,
      complianceReviewCompletedOn: currentRequest?.complianceReviewCompletedOn,
      // Closeout step info
      closeoutStartedOn: currentRequest?.closeoutOn ? undefined : currentRequest?.legalReviewCompletedOn || currentRequest?.complianceReviewCompletedOn,
      completedOn: currentRequest?.closeoutOn,
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
      currentRequest?.legalReviewCompletedOn,
      currentRequest?.complianceReview?.status,
      currentRequest?.complianceReview?.outcome,
      currentRequest?.complianceReviewCompletedOn,
      currentRequest?.closeoutOn,
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

  /**
   * Handle comments toggle with auto-scroll on mobile
   */
  const handleToggleComments = React.useCallback((): void => {
    setIsCommentsOpen((prev) => {
      const newState = !prev;

      // Auto-scroll to comments on mobile when opening
      if (newState && window.innerWidth <= 1200) {
        setTimeout(() => {
          commentsAreaRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
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
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
                  enabled={false}
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
   * Render comments panel
   */
  const renderCommentsPanel = (): React.ReactElement => {
    if (!itemId) return <div />;

    return (
      <div className='request-container__comments-panel'>
        <div className='request-container__comments-header'>
          <Text variant='large' styles={{ root: { fontWeight: 600 } }}>
            Comments
          </Text>
        </div>

        {/* Warning about special characters */}
        <div className='request-container__comments-warning'>
          <Icon iconName='Warning' />
          <span>Avoid using backslash (\) and double quotes (&quot;) in comments</span>
        </div>

        <div className='request-container__comments-content'>
          <React.Suspense fallback={<Spinner size={SpinnerSize.small} label='Loading comments...' />}>
            <ListItemComments
              listId={listId}
              itemId={String(itemId)}
              serviceScope={SPContext.context.context.serviceScope as any}
              numberCommentsPerPage={10}
              label='Request Comments'
            />
          </React.Suspense>
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
          {status === RequestStatus.LegalIntake && (
            <React.Suspense fallback={<LoadingFallback message='Loading Legal Intake Form...' />}>
              <LegalIntakeForm />
            </React.Suspense>
          )}

          {status === RequestStatus.InReview && (
            <React.Suspense fallback={<LoadingFallback message='Loading Review Forms...' />}>
              {/* Legal Intake summary - collapsed, shows attorney info */}
              <LegalIntakeForm defaultExpanded={false} readOnly />
              {/* Review forms */}
              <LegalReviewForm collapsible defaultCollapsed={false} />
              <ComplianceReviewForm collapsible defaultCollapsed={false} />
            </React.Suspense>
          )}

          {status === RequestStatus.Closeout && (
            <React.Suspense fallback={<LoadingFallback message='Loading Closeout Form...' />}>
              {/* Legal Intake summary - collapsed, shows attorney info */}
              <LegalIntakeForm defaultExpanded={false} readOnly />
              {/* Completed review forms - will show in collapsed/completed state */}
              <LegalReviewForm collapsible defaultCollapsed />
              <ComplianceReviewForm collapsible defaultCollapsed />
              {/* Closeout form */}
              <CloseoutForm />
            </React.Suspense>
          )}

          {/* Attachments - always above action buttons */}
          <RequestDocuments itemId={itemId} />

          {/* Action buttons at the bottom */}
          {status !== RequestStatus.Completed && status !== RequestStatus.Cancelled && (
            <RequestActions />
          )}
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

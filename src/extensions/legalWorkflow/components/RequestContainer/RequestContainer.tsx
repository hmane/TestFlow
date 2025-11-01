/**
 * RequestContainer Component
 *
 * Main container for the request form with DevExtreme Drawer layout.
 * - Left side: Request form or RequestTypeSelector (for new requests)
 * - Right side: PnP ListItemComments (hidden if status is Draft)
 *
 * Features:
 * - DevExtreme Drawer for collapsible comments panel
 * - Conditional rendering based on request state
 * - Integration with ApplicationProvider
 * - Responsive layout
 */

import { RequestType } from '@appTypes/requestTypes';
import { RequestStatus } from '@appTypes/workflowTypes';
import { LoadingFallback } from '@components/LoadingFallback';
import { IconButton, Stack, Text } from '@fluentui/react';
import { ListItemComments } from '@pnp/spfx-controls-react/lib/controls/listItemComments';
import { useRequestStore } from '@stores/requestStore';
import Drawer from 'devextreme-react/drawer';
import * as React from 'react';
import { SPContext } from 'spfx-toolkit';
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
  renderApprovalsAndActions?: boolean; // If false, component should not render approvals/actions (RequestContainer will handle)
  children?: React.ReactNode; // Children to render inside the form's context provider
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
  const [isDrawerOpen, setIsDrawerOpen] = React.useState<boolean>(true);
  const [showTypeSelector, setShowTypeSelector] = React.useState<boolean>(false);
  const [isTypeLocked, setIsTypeLocked] = React.useState<boolean>(false);
  const [viewMode, setViewMode] = React.useState<'view' | 'edit'>('edit');

  // Note: handleDraftSubmit and handleSaveDraft were removed
  // Draft status now uses RequestInfo's own handlers via its context

  /**
   * Determine if we should show comments
   * - Don't show for Draft status
   * - Don't show for new requests (no itemId)
   */
  const shouldShowComments = React.useMemo((): boolean => {
    if (!itemId) {
      return false;
    }

    if (!currentRequest) {
      return false;
    }

    // Hide comments if status is Draft
    if (currentRequest.status === RequestStatus.Draft) {
      return false;
    }

    return true;
  }, [itemId, currentRequest]);

  /**
   * Determine if we should show the request type selector
   * - Show for new requests (no itemId)
   * - Hide once type is locked (Continue clicked)
   */
  React.useEffect(() => {
    // For new requests (no itemId), show selector until type is locked
    if (!itemId && !isTypeLocked) {
      setShowTypeSelector(true);
    } else {
      setShowTypeSelector(false);
    }
  }, [itemId, isTypeLocked]);

  /**
   * Determine default view mode based on request status
   * - Draft: Always edit mode (no summary view)
   * - Submitted requests (status > Draft): Default to view mode (summary), can toggle to edit (workflow form)
   */
  React.useEffect(() => {
    if (currentRequest && currentRequest.status) {
      // Draft: always edit mode
      if (!currentRequest.status || currentRequest.status === RequestStatus.Draft) {
        setViewMode('edit');
      } else {
        // Submitted requests: default to view mode (can toggle to workflow form)
        setViewMode('view');
      }
    }
  }, [currentRequest]);

  /**
   * Handle drawer toggle
   */
  const handleToggleDrawer = React.useCallback((): void => {
    setIsDrawerOpen(prev => !prev);
  }, []);

  /**
   * Handle switch to edit mode
   */
  const handleSwitchToEdit = React.useCallback((): void => {
    setViewMode('edit');
    // Scroll to top when switching to edit
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  }, []);

  /**
   * Handle request type selection (Continue button clicked)
   * This locks the request type and shows the form
   */
  const handleRequestTypeSelected = React.useCallback(
    (requestType: RequestType): void => {
      // Lock the request type (user cannot go back to selector)
      setIsTypeLocked(true);
      setShowTypeSelector(false);

      // Scroll to top when form is shown
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
    // Navigate back or close form
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.close();
    }
  }, []);

  /**
   * Render comments panel
   */
  const renderCommentsPanel = (): React.ReactElement => {
    if (!itemId) {
      return <div />;
    }

    return (
      <div className='request-container__comments-panel'>
        <Stack
          horizontal
          verticalAlign='center'
          horizontalAlign='space-between'
          styles={{
            root: {
              padding: '16px',
              borderBottom: '1px solid #edebe9',
              backgroundColor: '#faf9f8',
            },
          }}
        >
          <Text variant='large' styles={{ root: { fontWeight: 600 } }}>
            Comments
          </Text>
          <IconButton
            iconProps={{ iconName: 'ChromeClose' }}
            title='Close comments panel'
            ariaLabel='Close comments panel'
            onClick={handleToggleDrawer}
          />
        </Stack>

        <div className='request-container__comments-content'>
          <ListItemComments
            listId={listId}
            itemId={String(itemId)}
            serviceScope={SPContext.context.context.serviceScope as any}
            numberCommentsPerPage={10}
            label='Request Comments'
          />
        </div>
      </div>
    );
  };

  /**
   * Render main content based on request status and view mode
   * New layout order:
   * 1. Request Form/Summary (top)
   * 2. Approvals card (second)
   * 3. Workflow-specific cards (conditional)
   * 4. Form Actions (bottom)
   */
  const renderMainContent = (): React.ReactElement => {
    // Show request type selector for new requests (until type is locked via Continue)
    if (showTypeSelector) {
      return (
        <RequestTypeSelector
          onContinue={handleRequestTypeSelected}
          onCancel={handleCancelTypeSelector}
          showCancel={true}
        />
      );
    }

    // Determine what to render based on workflow status
    const status = currentRequest?.status;

    // Draft status: RequestForm + Approvals + Attachments + Actions
    // Note: RequestFormComponent (RequestInfo) provides its own context,
    // so we don't need WorkflowFormWrapper here. Children are rendered inside the form's context.
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
    }

    // For all other statuses (submitted requests):
    // - View mode: Show RequestSummary
    // - Edit mode: Show workflow stage form

    // View mode: RequestSummary + Approvals + Attachments + Actions
    if (viewMode === 'view') {
      return (
        <WorkflowFormWrapper itemId={itemId}>
          <RequestSummary onEditClick={handleSwitchToEdit} />
          <RequestApprovals hideForStatuses={[RequestStatus.InReview, RequestStatus.Closeout, RequestStatus.Completed, RequestStatus.Cancelled, RequestStatus.OnHold]} />
          <RequestDocuments itemId={itemId} />
          <RequestActions />
        </WorkflowFormWrapper>
      );
    }

    // Edit mode: Show appropriate workflow stage form
    // Legal Intake status: Summary + Approvals + Legal Intake Form + Attachments + Actions
    if (status === RequestStatus.LegalIntake) {
      return (
        <WorkflowFormWrapper itemId={itemId}>
          <React.Suspense fallback={<LoadingFallback message='Loading Legal Intake Form...' />}>
            <RequestSummary />
            <RequestApprovals />
            <LegalIntakeForm />
            <RequestDocuments itemId={itemId} />
            <RequestActions />
          </React.Suspense>
        </WorkflowFormWrapper>
      );
    }

    // In Review status: Summary + Approvals + Review Forms + Attachments + Actions
    if (status === RequestStatus.InReview) {
      return (
        <WorkflowFormWrapper itemId={itemId}>
          <React.Suspense fallback={<LoadingFallback message='Loading Review Forms...' />}>
            <RequestSummary />
            <RequestApprovals hideForStatuses={[RequestStatus.InReview]} />
            <LegalReviewForm />
            <ComplianceReviewForm />
            <RequestDocuments itemId={itemId} />
            <RequestActions />
          </React.Suspense>
        </WorkflowFormWrapper>
      );
    }

    // Closeout status: Summary + Approvals + Closeout Form + Attachments + Actions
    if (status === RequestStatus.Closeout) {
      return (
        <WorkflowFormWrapper itemId={itemId}>
          <React.Suspense fallback={<LoadingFallback message='Loading Closeout Form...' />}>
            <RequestSummary />
            <RequestApprovals hideForStatuses={[RequestStatus.Closeout]} />
            <CloseoutForm />
            <RequestDocuments itemId={itemId} />
            <RequestActions />
          </React.Suspense>
        </WorkflowFormWrapper>
      );
    }

    // Completed/Cancelled status: Summary + Approvals + Attachments (read-only, no actions)
    if (status === RequestStatus.Completed || status === RequestStatus.Cancelled) {
      return (
        <WorkflowFormWrapper itemId={itemId}>
          <RequestSummary />
          <RequestApprovals hideForStatuses={[RequestStatus.Completed, RequestStatus.Cancelled]} />
          <RequestDocuments itemId={itemId} />
        </WorkflowFormWrapper>
      );
    }

    // On Hold status: Summary + Approvals + Attachments + Actions
    if (status === RequestStatus.OnHold) {
      return (
        <WorkflowFormWrapper itemId={itemId}>
          <RequestSummary onEditClick={handleSwitchToEdit} />
          <RequestApprovals hideForStatuses={[RequestStatus.OnHold]} />
          <RequestDocuments itemId={itemId} />
          <RequestActions />
        </WorkflowFormWrapper>
      );
    }

    // Fallback: Show placeholder
    return (
      <div className='request-container__placeholder'>
        <Stack
          verticalAlign='center'
          horizontalAlign='center'
          styles={{ root: { minHeight: '400px' } }}
        >
          <Text variant='xLarge'>Unknown Request Status</Text>
          <Text variant='medium' styles={{ root: { color: '#605e5c', marginTop: '8px' } }}>
            Status: {status || 'N/A'}
          </Text>
        </Stack>
      </div>
    );
  };

  /**
   * Render with Drawer if comments should be shown
   */
  if (shouldShowComments) {
    return (
      <div className={`request-container request-container--with-drawer ${className || ''}`}>
        <Drawer
          opened={isDrawerOpen}
          openedStateMode='overlap'
          position='right'
          revealMode='slide'
          component={renderCommentsPanel}
          width={400}
          minSize={0}
        >
          <div className='request-container__main-content'>
            {/* Toggle button for closed drawer */}
            {!isDrawerOpen && (
              <div className='request-container__drawer-toggle'>
                <IconButton
                  iconProps={{ iconName: 'Comment' }}
                  title='Show comments'
                  ariaLabel='Show comments'
                  onClick={handleToggleDrawer}
                  styles={{
                    root: {
                      position: 'fixed',
                      right: '16px',
                      top: '16px',
                      zIndex: 100,
                      backgroundColor: '#0078d4',
                      color: '#ffffff',
                      borderRadius: '50%',
                      width: '48px',
                      height: '48px',
                    },
                    icon: {
                      color: '#ffffff',
                      fontSize: '20px',
                    },
                  }}
                />
              </div>
            )}

            {renderMainContent()}
          </div>
        </Drawer>
      </div>
    );
  }

  /**
   * Render without Drawer if comments should not be shown
   */
  return (
    <div className={`request-container ${className || ''}`}>
      <div className='request-container__main-content'>{renderMainContent()}</div>
    </div>
  );
};

export default RequestContainer;

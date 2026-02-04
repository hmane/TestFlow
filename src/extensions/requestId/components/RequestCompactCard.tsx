/**
 * RequestCompactCard Component
 *
 * Displays request information in hover card with status-specific content
 * - Shows basic info immediately from list view data
 * - Loads full data with user emails on mount
 * - Displays different information based on request status
 */

import * as React from 'react';

// Fluent UI - tree-shaken imports
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Icon } from '@fluentui/react/lib/Icon';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
import { DirectionalHint } from '@fluentui/react/lib/Callout';

// spfx-toolkit - tree-shaken imports
import { UserPersona } from 'spfx-toolkit/lib/components/UserPersona';
import { LazyManageAccessComponent } from 'spfx-toolkit/lib/components/lazy';

// App imports using path aliases
import type { IRequestCompactCardProps, IRequestFullData } from '../types';
import {
  RequestStatus,
  ReviewAudience,
  LegalReviewStatus,
  ComplianceReviewStatus,
  ReviewOutcome,
} from '@appTypes/workflowTypes';
import { RequestType } from '@appTypes/requestTypes';
import type { IPrincipal } from '@appTypes/index';
import { loadRequestFullData } from '../services/requestDataService';

import styles from './RequestIdHoverCard.module.scss';

/**
 * Format date for display
 */
const formatDate = (date: Date | undefined | null): string => {
  if (!date) return 'Not set';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Check for invalid date
  if (isNaN(dateObj.getTime())) return 'Not set';

  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Get relative time string
 */
const getRelativeTime = (date: Date | undefined | null): string => {
  if (!date) return '';

  const now = new Date();
  const created = typeof date === 'string' ? new Date(date) : date;

  // Check for invalid date
  if (isNaN(created.getTime())) return '';

  const diffMs = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
};

/**
 * Format date and time for tooltip display
 */
const formatDateTime = (date: Date | undefined | null): string => {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Check for invalid date
  if (isNaN(dateObj.getTime())) return '';

  return dateObj.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Get status badge color and text
 */
const getStatusBadge = (status: RequestStatus): { color: string; backgroundColor: string; text: string } => {
  switch (status) {
    case RequestStatus.Draft:
      return { color: '#605e5c', backgroundColor: '#edebe9', text: 'Draft' };
    case RequestStatus.LegalIntake:
      return { color: '#0078d4', backgroundColor: '#deecf9', text: 'Legal Intake' };
    case RequestStatus.AssignAttorney:
      return { color: '#8764b8', backgroundColor: '#f3edf7', text: 'Assign Attorney' };
    case RequestStatus.InReview:
      return { color: '#0078d4', backgroundColor: '#deecf9', text: 'In Review' };
    case RequestStatus.Closeout:
      return { color: '#8764b8', backgroundColor: '#f3edf7', text: 'Closeout' };
    case RequestStatus.Completed:
      return { color: '#107c10', backgroundColor: '#dff6dd', text: 'Completed' };
    case RequestStatus.Cancelled:
      return { color: '#a4262c', backgroundColor: '#fde7e9', text: 'Cancelled' };
    case RequestStatus.OnHold:
      return { color: '#ca5010', backgroundColor: '#fed9cc', text: 'On Hold' };
    default:
      return { color: '#605e5c', backgroundColor: '#edebe9', text: String(status) };
  }
};

/**
 * Get request type token - label and color for header display
 */
const getRequestTypeToken = (type: RequestType | undefined): { label: string; color: string; backgroundColor: string } => {
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
 * Format enum values for display
 */
const formatRequestType = (type: RequestType | undefined): string => {
  if (!type) return 'N/A';
  switch (type) {
    case RequestType.Communication:
      return 'Communication';
    case RequestType.GeneralReview:
      return 'General Review';
    case RequestType.IMAReview:
      return 'IMA Review';
    default:
      return String(type);
  }
};

const formatReviewAudience = (audience: ReviewAudience | undefined): string => {
  if (!audience) return 'N/A';
  switch (audience) {
    case ReviewAudience.Legal:
      return 'Legal';
    case ReviewAudience.Compliance:
      return 'Compliance';
    case ReviewAudience.Both:
      return 'Legal & Compliance';
    default:
      return String(audience);
  }
};

const formatReviewOutcome = (outcome: ReviewOutcome | undefined): string => {
  if (!outcome) return 'Pending';
  switch (outcome) {
    case ReviewOutcome.Approved:
      return 'Approved';
    case ReviewOutcome.ApprovedWithComments:
      return 'Approved with Comments';
    case ReviewOutcome.RespondToCommentsAndResubmit:
      return 'Changes Requested';
    case ReviewOutcome.NotApproved:
      return 'Not Approved';
    default:
      return String(outcome);
  }
};

const formatLegalReviewStatus = (status: LegalReviewStatus | undefined): string => {
  if (!status) return 'Not Started';
  return status;
};

const formatComplianceReviewStatus = (status: ComplianceReviewStatus | undefined): string => {
  if (!status) return 'Not Started';
  return status;
};

/**
 * Truncate text with ellipsis
 */
const truncateText = (text: string | undefined, maxLength: number): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Render user with persona
 */
const renderUser = (user: IPrincipal | undefined, label: string): React.ReactNode => {
  if (!user) return null;

  return (
    <div className={styles.fieldRow}>
      <Text variant="small" className={styles.fieldLabel}>
        {label}:
      </Text>
      <div className={styles.fieldValue}>
        <UserPersona
          userIdentifier={user.email || user.loginName || ''}
          displayName={user.title}
          email={user.email}
          size={24}
          displayMode="avatarAndName"
        />
      </div>
    </div>
  );
};

/**
 * Status-specific content components
 */
const DraftContent: React.FC<{ data: IRequestFullData }> = ({ data }) => (
  <>
    <div className={styles.fieldRow}>
      <Text variant="small" className={styles.fieldLabel}>
        Status:
      </Text>
      <Text variant="small" className={styles.fieldValue}>
        Draft - Not yet submitted
      </Text>
    </div>
    {data.purpose && (
      <div className={styles.fieldRow}>
        <Text variant="small" className={styles.fieldLabel}>
          Purpose:
        </Text>
        <Text variant="small" className={`${styles.fieldValue} ${styles.truncate}`} title={data.purpose}>
          {data.purpose}
        </Text>
      </div>
    )}
  </>
);

const LegalIntakeContent: React.FC<{ data: IRequestFullData }> = ({ data }) => (
  <>
    {renderUser(data.submittedBy || data.createdBy, 'Submitted by')}
    <div className={styles.fieldRow}>
      <Text variant="small" className={styles.fieldLabel}>
        Submitted:
      </Text>
      <Text variant="small" className={styles.fieldValue}>
        {formatDate(data.submittedOn || data.created)}
      </Text>
    </div>
    <div className={styles.fieldRow}>
      <Text variant="small" className={styles.fieldLabel}>
        Awaiting:
      </Text>
      <Text variant="small" className={styles.fieldValue}>
        Legal Admin to process intake
      </Text>
    </div>
  </>
);

const AssignAttorneyContent: React.FC<{ data: IRequestFullData }> = ({ data }) => (
  <>
    {renderUser(data.submittedBy || data.createdBy, 'Submitted by')}
    <div className={styles.fieldRow}>
      <Text variant="small" className={styles.fieldLabel}>
        Awaiting:
      </Text>
      <Text variant="small" className={styles.fieldValue}>
        <Icon iconName="People" styles={{ root: { marginRight: 4, color: '#0078d4' } }} />
        Committee to assign attorney
      </Text>
    </div>
  </>
);

const InReviewContent: React.FC<{ data: IRequestFullData }> = ({ data }) => (
  <>
    {data.attorney && renderUser(data.attorney, 'Attorney')}
    {data.reviewAudience !== ReviewAudience.Compliance && (
      <div className={styles.fieldRow}>
        <Text variant="small" className={styles.fieldLabel}>
          Legal:
        </Text>
        <Text variant="small" className={styles.fieldValue}>
          {formatLegalReviewStatus(data.legalReviewStatus)}
        </Text>
      </div>
    )}
    {data.reviewAudience !== ReviewAudience.Legal && (
      <div className={styles.fieldRow}>
        <Text variant="small" className={styles.fieldLabel}>
          Compliance:
        </Text>
        <Text variant="small" className={styles.fieldValue}>
          {formatComplianceReviewStatus(data.complianceReviewStatus)}
        </Text>
      </div>
    )}
  </>
);

const CloseoutContent: React.FC<{ data: IRequestFullData }> = ({ data }) => (
  <>
    {data.reviewAudience !== ReviewAudience.Compliance && (
      <div className={styles.fieldRow}>
        <Text variant="small" className={styles.fieldLabel}>
          Legal:
        </Text>
        <Text variant="small" className={styles.fieldValue}>
          {formatReviewOutcome(data.legalReviewOutcome)}
        </Text>
      </div>
    )}
    {data.reviewAudience !== ReviewAudience.Legal && (
      <div className={styles.fieldRow}>
        <Text variant="small" className={styles.fieldLabel}>
          Compliance:
        </Text>
        <Text variant="small" className={styles.fieldValue}>
          {formatReviewOutcome(data.complianceReviewOutcome)}
        </Text>
      </div>
    )}
    <div className={styles.fieldRow}>
      <Text variant="small" className={styles.fieldLabel}>
        Awaiting:
      </Text>
      <Text variant="small" className={styles.fieldValue}>
        Closeout by submitter
      </Text>
    </div>
  </>
);

const CompletedContent: React.FC<{ data: IRequestFullData }> = ({ data }) => (
  <>
    <div className={styles.fieldRow}>
      <Text variant="small" className={styles.fieldLabel}>
        Completed:
      </Text>
      <Text variant="small" className={styles.fieldValue}>
        {formatDate(data.completedOn || data.closeoutOn)}
      </Text>
    </div>
    {data.reviewAudience !== ReviewAudience.Compliance && (
      <div className={styles.fieldRow}>
        <Text variant="small" className={styles.fieldLabel}>
          Legal:
        </Text>
        <Text variant="small" className={styles.fieldValue}>
          {formatReviewOutcome(data.legalReviewOutcome)}
        </Text>
      </div>
    )}
    {data.reviewAudience !== ReviewAudience.Legal && (
      <div className={styles.fieldRow}>
        <Text variant="small" className={styles.fieldLabel}>
          Compliance:
        </Text>
        <Text variant="small" className={styles.fieldValue}>
          {formatReviewOutcome(data.complianceReviewOutcome)}
        </Text>
      </div>
    )}
    {data.trackingId && (
      <div className={styles.fieldRow}>
        <Text variant="small" className={styles.fieldLabel}>
          Tracking ID:
        </Text>
        <Text variant="small" className={styles.fieldValue}>
          {data.trackingId}
        </Text>
      </div>
    )}
  </>
);

const CancelledContent: React.FC<{ data: IRequestFullData }> = ({ data }) => (
  <>
    {renderUser(data.cancelledBy, 'Cancelled by')}
    <div className={styles.fieldRow}>
      <Text variant="small" className={styles.fieldLabel}>
        Cancelled:
      </Text>
      <Text variant="small" className={styles.fieldValue}>
        {formatDate(data.cancelledOn)}
      </Text>
    </div>
    {data.cancelReason && (
      <div className={styles.fieldRow}>
        <Text variant="small" className={styles.fieldLabel}>
          Reason:
        </Text>
        <Text variant="small" className={styles.fieldValue} title={data.cancelReason}>
          {truncateText(data.cancelReason, 80)}
        </Text>
      </div>
    )}
  </>
);

const OnHoldContent: React.FC<{ data: IRequestFullData }> = ({ data }) => (
  <>
    {renderUser(data.onHoldBy, 'On hold by')}
    <div className={styles.fieldRow}>
      <Text variant="small" className={styles.fieldLabel}>
        On hold since:
      </Text>
      <Text variant="small" className={styles.fieldValue}>
        {formatDate(data.onHoldSince)}
      </Text>
    </div>
    {data.onHoldReason && (
      <div className={styles.fieldRow}>
        <Text variant="small" className={styles.fieldLabel}>
          Reason:
        </Text>
        <Text variant="small" className={styles.fieldValue} title={data.onHoldReason}>
          {truncateText(data.onHoldReason, 80)}
        </Text>
      </div>
    )}
    {data.previousStatus && (
      <div className={styles.fieldRow}>
        <Text variant="small" className={styles.fieldLabel}>
          Previous:
        </Text>
        <Text variant="small" className={styles.fieldValue}>
          {data.previousStatus}
        </Text>
      </div>
    )}
  </>
);

/**
 * Render status-specific content
 */
const renderStatusContent = (data: IRequestFullData): React.ReactNode => {
  switch (data.status) {
    case RequestStatus.Draft:
      return <DraftContent data={data} />;
    case RequestStatus.LegalIntake:
      return <LegalIntakeContent data={data} />;
    case RequestStatus.AssignAttorney:
      return <AssignAttorneyContent data={data} />;
    case RequestStatus.InReview:
      return <InReviewContent data={data} />;
    case RequestStatus.Closeout:
      return <CloseoutContent data={data} />;
    case RequestStatus.Completed:
      return <CompletedContent data={data} />;
    case RequestStatus.Cancelled:
      return <CancelledContent data={data} />;
    case RequestStatus.OnHold:
      return <OnHoldContent data={data} />;
    default:
      return null;
  }
};

/**
 * RequestCompactCard Component
 */
export const RequestCompactCard: React.FC<IRequestCompactCardProps> = ({
  itemData,
  listId,
}) => {
  const [fullData, setFullData] = React.useState<IRequestFullData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const statusBadge = getStatusBadge(itemData.status);
  const typeToken = getRequestTypeToken(itemData.requestType);

  // Load full data on mount
  React.useEffect(() => {
    let isMounted = true;

    const loadData = async (): Promise<void> => {
      try {
        const data = await loadRequestFullData(itemData.id);
        if (isMounted) {
          setFullData(data);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError('Failed to load details');
          setIsLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [itemData.id]);

  // Dummy handler for ManageAccess (read-only mode)
  const handlePermissionChanged = React.useCallback(
    async (): Promise<boolean> => {
      return false;
    },
    []
  );

  // Get the user to show in footer (from loaded data if available)
  const footerUser = fullData?.createdBy || itemData.createdBy;
  const relativeTime = getRelativeTime(itemData.created);

  return (
    <div className={styles.compactCard}>
      {/* Header: Request ID + Type Token + Status Badge */}
      <div className={styles.cardHeader}>
        <div className={styles.headerLeft}>
          <Text variant="medium" styles={{ root: { fontWeight: 600, color: '#201f1e' } }}>
            {itemData.requestId}
          </Text>
          <div
            className={styles.typeToken}
            style={{
              backgroundColor: typeToken.backgroundColor,
              color: typeToken.color,
            }}
            title={formatRequestType(itemData.requestType)}
          >
            {typeToken.label}
          </div>
        </div>
        <div
          className={styles.statusBadge}
          style={{
            backgroundColor: statusBadge.backgroundColor,
            color: statusBadge.color,
          }}
        >
          {statusBadge.text}
        </div>
      </div>

      {/* Content: Basic Info (always shown) */}
      <Stack tokens={{ childrenGap: 6 }} className={styles.cardContent}>
        {/* Request Title */}
        <div className={styles.fieldRow}>
          <Text variant="small" className={styles.fieldLabel}>
            Title:
          </Text>
          <Text variant="small" className={styles.fieldValue} title={itemData.requestTitle}>
            {truncateText(itemData.requestTitle, 60)}
          </Text>
        </div>

        {/* Review Audience */}
        <div className={styles.fieldRow}>
          <Text variant="small" className={styles.fieldLabel}>
            Review:
          </Text>
          <Text variant="small" className={styles.fieldValue}>
            {formatReviewAudience(itemData.reviewAudience)}
          </Text>
        </div>

        {/* Target Date */}
        {itemData.targetReturnDate && (
          <div className={styles.fieldRow}>
            <Text variant="small" className={styles.fieldLabel}>
              Target:
            </Text>
            <Text variant="small" className={styles.fieldValue}>
              {formatDate(itemData.targetReturnDate)}
            </Text>
          </div>
        )}
      </Stack>

      {/* Divider */}
      <div className={styles.divider} />

      {/* Status-specific content */}
      <Stack tokens={{ childrenGap: 6 }} className={styles.cardContent}>
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <Spinner size={SpinnerSize.small} label="Loading details..." />
          </div>
        ) : error ? (
          <Text variant="small" styles={{ root: { color: '#a4262c' } }}>
            {error}
          </Text>
        ) : fullData ? (
          renderStatusContent(fullData)
        ) : null}
      </Stack>

      {/* Footer */}
      <div className={styles.cardFooter}>
        {/* Left side: Created By */}
        <div className={styles.createdBySection}>
          <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
            <UserPersona
              userIdentifier={footerUser.email || footerUser.loginName || ''}
              displayName={footerUser.title}
              email={footerUser.email}
              size={24}
              displayMode="avatarAndName"
            />
            {itemData.created && (
              <TooltipHost
                content={formatDateTime(itemData.created)}
                directionalHint={DirectionalHint.topCenter}
              >
                <Text
                  variant="tiny"
                  styles={{ root: { color: '#8a8886', cursor: 'default' } }}
                >
                  {relativeTime || formatDate(itemData.created)}
                </Text>
              </TooltipHost>
            )}
          </Stack>
        </div>

        {/* Right side: ManageAccess (read-only) - Lazy loaded */}
        {listId && (
          <div className={styles.manageAccessSection}>
            <LazyManageAccessComponent
              itemId={itemData.id}
              listId={listId}
              permissionTypes="view"
              maxAvatars={5}
              enabled={false}
              onPermissionChanged={handlePermissionChanged}
            />
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * RequestHoverCard Component
 *
 * Reusable hover card that displays request details on hover.
 * Loads full request data on hover and displays status-specific content.
 *
 * Features:
 * - Lazy loads request data on hover
 * - Shows status badge, request type, and key fields
 * - Status-specific content (attorney, review status, etc.)
 * - Cached data to avoid duplicate API calls
 */

import * as React from 'react';

// Fluent UI - tree-shaken imports
import { HoverCard, HoverCardType, type IPlainCardProps } from '@fluentui/react/lib/HoverCard';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Icon } from '@fluentui/react/lib/Icon';
import { DirectionalHint } from '@fluentui/react/lib/Callout';

// spfx-toolkit imports
import { UserPersona } from 'spfx-toolkit/lib/components/UserPersona';

// App imports
import type { IRequestHoverCardProps, IRequestHoverCardData } from './RequestHoverCard.types';
import {
  RequestStatus,
  ReviewAudience,
  ReviewOutcome,
} from '@appTypes/workflowTypes';
import { RequestType } from '@appTypes/requestTypes';
import type { IPrincipal } from '@appTypes/index';
import { loadRequestFullData } from '@extensions/requestId/services/requestDataService';

import './RequestHoverCard.scss';

// Cache for loaded request data
const requestDataCache = new Map<number, IRequestHoverCardData>();

/**
 * Format date for display
 */
const formatDate = (date: Date | string | undefined): string => {
  if (!date) return 'Not set';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Get relative time string
 */
const getRelativeTime = (date: Date | string): string => {
  const now = new Date();
  const created = typeof date === 'string' ? new Date(date) : date;
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
 * Get request type token
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
 * Format review audience
 */
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

/**
 * Format review outcome
 */
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
    <div className="rhc-field-row">
      <Text variant="small" className="rhc-field-label">
        {label}:
      </Text>
      <div className="rhc-field-value">
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
 * HoverCardContent - The content displayed in the hover card
 */
interface IHoverCardContentProps {
  requestId: number;
  initialData?: Partial<IRequestHoverCardData>;
  listId?: string;
}

const HoverCardContent: React.FC<IHoverCardContentProps> = ({
  requestId,
  initialData,
  listId,
}) => {
  const [data, setData] = React.useState<IRequestHoverCardData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Load full data on mount
  React.useEffect(() => {
    let isMounted = true;

    const loadData = async (): Promise<void> => {
      // Check cache first
      const cached = requestDataCache.get(requestId);
      if (cached) {
        if (isMounted) {
          setData(cached);
          setIsLoading(false);
        }
        return;
      }

      try {
        const fullData = await loadRequestFullData(requestId);
        if (isMounted && fullData) {
          // Merge with initial data and cache
          const mergedData: IRequestHoverCardData = {
            id: requestId,
            requestId: fullData.requestId,
            requestTitle: fullData.requestTitle,
            status: fullData.status,
            requestType: fullData.requestType,
            reviewAudience: fullData.reviewAudience,
            purpose: fullData.purpose,
            targetReturnDate: fullData.targetReturnDate,
            created: fullData.created,
            createdBy: fullData.createdBy,
            submittedBy: fullData.submittedBy,
            submittedOn: fullData.submittedOn,
            attorney: fullData.attorney,
            legalReviewStatus: fullData.legalReviewStatus,
            legalReviewOutcome: fullData.legalReviewOutcome,
            complianceReviewStatus: fullData.complianceReviewStatus,
            complianceReviewOutcome: fullData.complianceReviewOutcome,
            trackingId: fullData.trackingId,
            completedOn: fullData.completedOn,
            ...initialData,
          };
          requestDataCache.set(requestId, mergedData);
          setData(mergedData);
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
  }, [requestId, initialData]);

  if (isLoading) {
    return (
      <div className="rhc-card rhc-loading">
        <Spinner size={SpinnerSize.small} label="Loading details..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rhc-card rhc-error">
        <Icon iconName="Warning" className="rhc-error-icon" />
        <Text variant="small">{error || 'Unable to load request details'}</Text>
      </div>
    );
  }

  const statusBadge = getStatusBadge(data.status);
  const typeToken = getRequestTypeToken(data.requestType);
  const relativeTime = getRelativeTime(data.created);

  return (
    <div className="rhc-card">
      {/* Header: Request ID + Type Token + Status Badge */}
      <div className="rhc-header">
        <div className="rhc-header-left">
          <Text variant="medium" className="rhc-request-id">
            {data.requestId}
          </Text>
          <div
            className="rhc-type-token"
            style={{
              backgroundColor: typeToken.backgroundColor,
              color: typeToken.color,
            }}
          >
            {typeToken.label}
          </div>
        </div>
        <div
          className="rhc-status-badge"
          style={{
            backgroundColor: statusBadge.backgroundColor,
            color: statusBadge.color,
          }}
        >
          {statusBadge.text}
        </div>
      </div>

      {/* Content */}
      <Stack tokens={{ childrenGap: 6 }} className="rhc-content">
        {/* Request Title */}
        <div className="rhc-field-row">
          <Text variant="small" className="rhc-field-label">
            Title:
          </Text>
          <Text variant="small" className="rhc-field-value rhc-truncate" title={data.requestTitle}>
            {truncateText(data.requestTitle, 60)}
          </Text>
        </div>

        {/* Review Audience */}
        {data.reviewAudience && (
          <div className="rhc-field-row">
            <Text variant="small" className="rhc-field-label">
              Review:
            </Text>
            <Text variant="small" className="rhc-field-value">
              {formatReviewAudience(data.reviewAudience)}
            </Text>
          </div>
        )}

        {/* Target Date */}
        {data.targetReturnDate && (
          <div className="rhc-field-row">
            <Text variant="small" className="rhc-field-label">
              Target:
            </Text>
            <Text variant="small" className="rhc-field-value">
              {formatDate(data.targetReturnDate)}
            </Text>
          </div>
        )}

        {/* Submission Item */}
        {data.submissionItem && (
          <div className="rhc-field-row">
            <Text variant="small" className="rhc-field-label">
              Type:
            </Text>
            <Text variant="small" className="rhc-field-value">
              {data.submissionItem}
            </Text>
          </div>
        )}
      </Stack>

      {/* Divider */}
      <div className="rhc-divider" />

      {/* Status-specific content */}
      <Stack tokens={{ childrenGap: 6 }} className="rhc-content">
        {/* Attorney (for In Review, Closeout, Completed) */}
        {data.attorney && renderUser(data.attorney, 'Attorney')}

        {/* Legal Review Status/Outcome */}
        {data.reviewAudience !== ReviewAudience.Compliance && data.legalReviewOutcome && (
          <div className="rhc-field-row">
            <Text variant="small" className="rhc-field-label">
              Legal:
            </Text>
            <Text variant="small" className="rhc-field-value">
              {formatReviewOutcome(data.legalReviewOutcome)}
            </Text>
          </div>
        )}

        {/* Compliance Review Status/Outcome */}
        {data.reviewAudience !== ReviewAudience.Legal && data.complianceReviewOutcome && (
          <div className="rhc-field-row">
            <Text variant="small" className="rhc-field-label">
              Compliance:
            </Text>
            <Text variant="small" className="rhc-field-value">
              {formatReviewOutcome(data.complianceReviewOutcome)}
            </Text>
          </div>
        )}

        {/* Tracking ID (for Completed) */}
        {data.trackingId && (
          <div className="rhc-field-row">
            <Text variant="small" className="rhc-field-label">
              Tracking ID:
            </Text>
            <Text variant="small" className="rhc-field-value">
              {data.trackingId}
            </Text>
          </div>
        )}

        {/* Completed Date */}
        {data.status === RequestStatus.Completed && data.completedOn && (
          <div className="rhc-field-row">
            <Text variant="small" className="rhc-field-label">
              Completed:
            </Text>
            <Text variant="small" className="rhc-field-value">
              {formatDate(data.completedOn)}
            </Text>
          </div>
        )}
      </Stack>

      {/* Footer: Created by */}
      {data.createdBy && (
        <div className="rhc-footer">
          <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
            <UserPersona
              userIdentifier={data.createdBy.email || data.createdBy.loginName || ''}
              displayName={data.createdBy.title}
              email={data.createdBy.email}
              size={24}
              displayMode="avatarAndName"
            />
            <Text variant="tiny" className="rhc-relative-time">
              {relativeTime}
            </Text>
          </Stack>
        </div>
      )}
    </div>
  );
};

/**
 * RequestHoverCard Component
 */
export const RequestHoverCard: React.FC<IRequestHoverCardProps> = ({
  requestId,
  data,
  children,
  disabled = false,
  listId,
  openDelay = 300,
  dismissDelay = 200,
}) => {
  /**
   * Render plain card content
   */
  const onRenderPlainCard = React.useCallback(
    (): JSX.Element => {
      return (
        <HoverCardContent
          requestId={requestId}
          initialData={data}
          listId={listId}
        />
      );
    },
    [requestId, data, listId]
  );

  /**
   * Plain card props configuration
   */
  const plainCardProps: IPlainCardProps = React.useMemo(
    () => ({
      onRenderPlainCard,
      directionalHint: DirectionalHint.bottomLeftEdge,
      directionalHintFixed: false,
      calloutProps: {
        isBeakVisible: true,
        gapSpace: 8,
        preventDismissOnScroll: false,
        setInitialFocus: false,
      },
    }),
    [onRenderPlainCard]
  );

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <HoverCard
      type={HoverCardType.plain}
      plainCardProps={plainCardProps}
      instantOpenOnClick={false}
      cardOpenDelay={openDelay}
      cardDismissDelay={dismissDelay}
      styles={{
        host: {
          display: 'inline-block',
        },
      }}
    >
      {children}
    </HoverCard>
  );
};

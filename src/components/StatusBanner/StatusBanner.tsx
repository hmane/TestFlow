/**
 * StatusBanner Component
 *
 * Displays a banner for terminal request states (Cancelled, OnHold)
 * Shows the reason, who performed the action, and when.
 *
 * Features:
 * - Orange banner for On Hold status
 * - Red banner for Cancelled status
 * - Shows reason, by whom, and date
 * - Positioned above Request Summary
 */

import * as React from 'react';

// Fluent UI - tree-shaken imports
import { Icon } from '@fluentui/react/lib/Icon';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';

// spfx-toolkit - tree-shaken imports
import { UserPersona } from 'spfx-toolkit/lib/components/UserPersona';

// App imports using path aliases
import { RequestStatus } from '@appTypes/workflowTypes';
import type { ICancelMetadata, IHoldMetadata } from '@appTypes/workflowTypes';

import './StatusBanner.scss';

/**
 * StatusBanner Component Props
 */
export interface IStatusBannerProps {
  /** Current request status */
  status: RequestStatus;
  /** Cancel metadata (when status is Cancelled) */
  cancelMetadata?: ICancelMetadata;
  /** Hold metadata (when status is OnHold) */
  holdMetadata?: IHoldMetadata;
  /** Additional CSS class */
  className?: string;
}

/**
 * Format date for display
 */
function formatDate(date: Date | string | undefined): string {
  if (!date) return '';

  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * StatusBanner Component
 */
export const StatusBanner: React.FC<IStatusBannerProps> = ({
  status,
  cancelMetadata,
  holdMetadata,
  className,
}) => {
  // Only show for Cancelled or OnHold status
  if (status !== RequestStatus.Cancelled && status !== RequestStatus.OnHold) {
    return null;
  }

  const isCancelled = status === RequestStatus.Cancelled;

  // Get the appropriate metadata
  const reason = isCancelled ? cancelMetadata?.cancelReason : holdMetadata?.onHoldReason;
  const actionDate = isCancelled ? cancelMetadata?.cancelledOn : holdMetadata?.onHoldSince;
  const actionBy = isCancelled ? cancelMetadata?.cancelledBy : holdMetadata?.onHoldBy;

  // Determine banner style
  const bannerClass = isCancelled ? 'status-banner--cancelled' : 'status-banner--on-hold';
  const iconName = isCancelled ? 'StatusErrorFull' : 'Clock';
  const title = isCancelled ? 'Request Cancelled' : 'Request On Hold';

  return (
    <div className={`status-banner ${bannerClass} ${className || ''}`} role="alert">
      <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 12 }}>
        <Icon
          iconName={iconName}
          className="status-banner__icon"
          aria-hidden="true"
        />
        <Stack tokens={{ childrenGap: 4 }} className="status-banner__content">
          <Text variant="mediumPlus" className="status-banner__title">
            {title}
          </Text>
          <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }} wrap>
            {reason && (
              <Text variant="small" className="status-banner__reason">
                <strong>Reason:</strong> {reason}
              </Text>
            )}
            {actionBy && (
              <Text variant="small" className="status-banner__by">
                <strong>By:</strong>{' '}
                <UserPersona
                  userIdentifier={actionBy}
                  displayName={actionBy}
                  size={24}
                  displayMode="avatarAndName"
                  showLivePersona={false}
                  showSecondaryText={false}
                />
              </Text>
            )}
            {actionDate && (
              <Text variant="small" className="status-banner__date">
                <strong>Date:</strong> {formatDate(actionDate)}
              </Text>
            )}
          </Stack>
        </Stack>
      </Stack>
    </div>
  );
};

export default StatusBanner;

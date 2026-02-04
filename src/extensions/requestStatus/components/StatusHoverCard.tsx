/**
 * StatusHoverCard Component
 *
 * Displays detailed information about current workflow stage in a hover card:
 * - Current status with badge
 * - Progress percentage
 * - Who/what it's waiting on
 * - Days in current stage
 * - Target date information
 * - Review status details (legal/compliance)
 *
 * Loads full data on mount to get proper user field information.
 */

import * as React from 'react';

// Fluent UI - tree-shaken imports
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { Icon } from '@fluentui/react/lib/Icon';
import { Separator } from '@fluentui/react/lib/Separator';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { HoverCard, HoverCardType, type IPlainCardProps } from '@fluentui/react/lib/HoverCard';

// App imports using path aliases
import { WaitingOnDisplay } from './WaitingOnDisplay';
import type { IStatusHoverCardProps, IStatusListItemData } from '../types';
import {
  RequestStatus,
  ReviewAudience,
  LegalReviewStatus,
  ComplianceReviewStatus,
} from '@appTypes/workflowTypes';
import {
  formatStageDurationText,
  formatDaysRemainingText,
  formatDate,
  getStageTimingInfo,
} from '../utils/stageTimingHelper';
import { getActionText, determineWaitingOn } from '../utils/waitingOnHelper';
import { calculateProgress } from '../utils/progressCalculator';
import { loadStatusFullData } from '../services/statusDataService';
import styles from './RequestStatusProgress.module.scss';

/**
 * Get status badge color
 */
function getStatusBadgeColor(status: RequestStatus): { color: string; backgroundColor: string } {
  switch (status) {
    case RequestStatus.Draft:
      return { color: '#605e5c', backgroundColor: '#edebe9' };
    case RequestStatus.LegalIntake:
      return { color: '#0078d4', backgroundColor: '#deecf9' };
    case RequestStatus.AssignAttorney:
      return { color: '#8764b8', backgroundColor: '#f3edf7' };
    case RequestStatus.InReview:
      return { color: '#0078d4', backgroundColor: '#deecf9' };
    case RequestStatus.Closeout:
      return { color: '#8764b8', backgroundColor: '#f3edf7' };
    case RequestStatus.Completed:
      return { color: '#107c10', backgroundColor: '#dff6dd' };
    case RequestStatus.Cancelled:
      return { color: '#a4262c', backgroundColor: '#fde7e9' };
    case RequestStatus.OnHold:
      return { color: '#ca5010', backgroundColor: '#fed9cc' };
    default:
      return { color: '#605e5c', backgroundColor: '#edebe9' };
  }
}

/**
 * Format review status for display
 */
function formatReviewStatus(
  status: LegalReviewStatus | ComplianceReviewStatus | undefined
): string {
  if (!status) return 'Not Started';
  return status;
}

/**
 * StatusHoverCard Component
 */
export const StatusHoverCard: React.FC<
  IStatusHoverCardProps & { children: React.ReactNode }
> = ({
  itemData,
  progressData,
  waitingOn,
  timingInfo,
  webUrl,
  children,
}) => {
  // State for loaded data
  const [fullData, setFullData] = React.useState<IStatusListItemData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Load full data on mount
  React.useEffect(() => {
    let isMounted = true;

    const loadData = async (): Promise<void> => {
      try {
        const data = await loadStatusFullData(itemData.id);
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

  // Use loaded data or fall back to initial data
  const displayData = fullData || itemData;

  // Recalculate progress/waitingOn/timing with loaded data
  const displayProgressData = React.useMemo(
    () => (fullData ? calculateProgress(fullData) : progressData),
    [fullData, progressData]
  );
  const displayWaitingOn = React.useMemo(
    () => (fullData ? determineWaitingOn(fullData) : waitingOn),
    [fullData, waitingOn]
  );
  const displayTimingInfo = React.useMemo(
    () => (fullData ? getStageTimingInfo(fullData) : timingInfo),
    [fullData, timingInfo]
  );

  /**
   * Render hover card content
   */
  const onRenderPlainCard = React.useCallback((): JSX.Element => {
    const statusBadge = getStatusBadgeColor(displayData.status);

    // Loading state
    if (isLoading) {
      return (
        <div className={styles.statusHoverCard}>
          <div className={styles.cardHeader}>
            <div
              className={styles.statusBadge}
              style={{
                backgroundColor: statusBadge.backgroundColor,
                color: statusBadge.color,
              }}
            >
              {displayData.status}
            </div>
          </div>
          <div className={styles.loadingContainer}>
            <Spinner size={SpinnerSize.small} label="Loading details..." />
          </div>
        </div>
      );
    }

    // Error state
    if (error) {
      return (
        <div className={styles.statusHoverCard}>
          <div className={styles.cardHeader}>
            <div
              className={styles.statusBadge}
              style={{
                backgroundColor: statusBadge.backgroundColor,
                color: statusBadge.color,
              }}
            >
              {displayData.status}
            </div>
          </div>
          <div className={styles.cardContent}>
            <Text variant="small" styles={{ root: { color: '#a4262c' } }}>
              {error}
            </Text>
          </div>
        </div>
      );
    }

    // Check if status is terminal (Completed or Cancelled)
    const isTerminalStatus = displayData.status === RequestStatus.Completed ||
      displayData.status === RequestStatus.Cancelled;

    return (
      <div className={styles.statusHoverCard}>
        {/* Header: Status Badge */}
        <div className={styles.cardHeader}>
          <div
            className={styles.statusBadge}
            style={{
              backgroundColor: statusBadge.backgroundColor,
              color: statusBadge.color,
            }}
          >
            {displayData.status}
          </div>
          {displayData.isRushRequest && !isTerminalStatus && (
            <div className={styles.rushBadge}>
              <Icon iconName="StatusCircleErrorX" styles={{ root: { marginRight: 4 } }} />
              Rush
            </div>
          )}
        </div>

        <Separator styles={{ root: { padding: 0, height: 1, margin: '8px 0' } }} />

        {/* Progress Info */}
        <Stack tokens={{ childrenGap: 12 }} className={styles.cardContent}>
          {/* Progress percentage */}
          <div className={styles.fieldRow}>
            <Text variant="small" className={styles.fieldLabel}>
              Progress:
            </Text>
            <Text variant="small" className={styles.fieldValue}>
              {Math.round(displayProgressData.progress)}%
            </Text>
          </div>

          {/* Only show active workflow info for non-terminal statuses */}
          {!isTerminalStatus && (
            <>
              {/* Waiting on */}
              <WaitingOnDisplay waitingOn={displayWaitingOn} webUrl={webUrl} />

              {/* Days in current stage */}
              {displayTimingInfo.stageStartDate && (
                <div className={styles.fieldRow}>
                  <Text variant="small" className={styles.fieldLabel}>
                    In this stage:
                  </Text>
                  <Text variant="small" className={styles.fieldValue}>
                    {formatStageDurationText(displayTimingInfo.daysInStage)}
                  </Text>
                </div>
              )}

              {/* Target date information */}
              {displayTimingInfo.targetReturnDate && (
                <>
                  <div className={styles.fieldRow}>
                    <Text variant="small" className={styles.fieldLabel}>
                      Target date:
                    </Text>
                    <Text variant="small" className={styles.fieldValue}>
                      {formatDate(displayTimingInfo.targetReturnDate)}
                    </Text>
                  </div>

                  <div className={styles.fieldRow}>
                    <Text variant="small" className={styles.fieldLabel}>
                      {displayTimingInfo.isOverdue ? 'Overdue by:' : 'Days remaining:'}
                    </Text>
                    <Text
                      variant="small"
                      className={styles.fieldValue}
                      styles={{
                        root: {
                          color: displayTimingInfo.isOverdue ? '#a4262c' : displayTimingInfo.daysRemaining === 0 || displayTimingInfo.daysRemaining === 1 ? '#ca5010' : '#107c10',
                          fontWeight: displayTimingInfo.isOverdue || displayTimingInfo.daysRemaining! <= 1 ? 600 : 400,
                        },
                      }}
                    >
                      {formatDaysRemainingText(displayTimingInfo.daysRemaining!)}
                    </Text>
                  </div>
                </>
              )}

              {/* Action text */}
              <div className={styles.fieldRow}>
                <Text variant="small" className={styles.fieldLabel}>
                  Action needed:
                </Text>
                <Text variant="small" className={styles.fieldValue}>
                  {getActionText(displayWaitingOn, displayData.status)}
                </Text>
              </div>
            </>
          )}
        </Stack>

        <Separator styles={{ root: { padding: 0, height: 1, margin: '12px 0' } }} />

        {/* Review Status Section */}
        <div className={styles.reviewStatusSection}>
          <Text variant="smallPlus" styles={{ root: { fontWeight: 600, marginBottom: 8 } }}>
            Review Status
          </Text>

          <Stack tokens={{ childrenGap: 8 }}>
            {/* Legal Review */}
            {(displayData.reviewAudience === ReviewAudience.Legal ||
              displayData.reviewAudience === ReviewAudience.Both) && (
              <div className={styles.reviewRow}>
                <Icon iconName="CheckboxComposite" className={styles.reviewIcon} />
                <Stack horizontal tokens={{ childrenGap: 8 }}>
                  <Text variant="small" styles={{ root: { fontWeight: 600 } }}>
                    Legal:
                  </Text>
                  <Text variant="small">
                    {formatReviewStatus(displayData.legalReviewStatus)}
                  </Text>
                </Stack>
              </div>
            )}

            {/* Compliance Review */}
            {(displayData.reviewAudience === ReviewAudience.Compliance ||
              displayData.reviewAudience === ReviewAudience.Both) && (
              <div className={styles.reviewRow}>
                <Icon iconName="CheckboxComposite" className={styles.reviewIcon} />
                <Stack horizontal tokens={{ childrenGap: 8 }}>
                  <Text variant="small" styles={{ root: { fontWeight: 600 } }}>
                    Compliance:
                  </Text>
                  <Text variant="small">
                    {formatReviewStatus(displayData.complianceReviewStatus)}
                  </Text>
                </Stack>
              </div>
            )}

            {/* No reviews required */}
            {!displayData.reviewAudience ||
              (displayData.reviewAudience !== ReviewAudience.Legal &&
                displayData.reviewAudience !== ReviewAudience.Compliance &&
                displayData.reviewAudience !== ReviewAudience.Both && (
                  <Text variant="small" styles={{ root: { color: '#8a8886', fontStyle: 'italic' } }}>
                    No reviews required
                  </Text>
                ))}
          </Stack>
        </div>
      </div>
    );
  }, [displayData, displayProgressData, displayWaitingOn, displayTimingInfo, webUrl, isLoading, error]);

  const plainCardProps: IPlainCardProps = React.useMemo(
    () => ({
      onRenderPlainCard,
    }),
    [onRenderPlainCard]
  );

  return (
    <HoverCard
      type={HoverCardType.plain}
      plainCardProps={plainCardProps}
      instantOpenOnClick={false}
      cardOpenDelay={300}
      cardDismissDelay={100}
      styles={{
        host: {
          display: 'flex',
          width: '100%',
          cursor: 'pointer',
        },
      }}
    >
      {children}
    </HoverCard>
  );
};

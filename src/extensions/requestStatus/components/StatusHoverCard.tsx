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
 */

import * as React from 'react';
import { Stack, Text, Icon, Separator } from '@fluentui/react';
import { HoverCard, HoverCardType, type IPlainCardProps } from '@fluentui/react';
import { WaitingOnDisplay } from './WaitingOnDisplay';
import type { IStatusHoverCardProps } from '../types';
import {
  RequestStatus,
  ReviewAudience,
  LegalReviewStatus,
  ComplianceReviewStatus,
} from '../../../types/workflowTypes';
import {
  formatStageDurationText,
  formatDaysRemainingText,
  formatDate,
} from '../utils/stageTimingHelper';
import { getActionText } from '../utils/waitingOnHelper';
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
  /**
   * Render hover card content
   */
  const onRenderPlainCard = React.useCallback((): JSX.Element => {
    const statusBadge = getStatusBadgeColor(itemData.status);

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
            {itemData.status}
          </div>
          {itemData.isRushRequest && (
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
              {Math.round(progressData.progress)}%
            </Text>
          </div>

          {/* Waiting on */}
          <WaitingOnDisplay waitingOn={waitingOn} webUrl={webUrl} />

          {/* Days in current stage */}
          {timingInfo.stageStartDate && (
            <div className={styles.fieldRow}>
              <Text variant="small" className={styles.fieldLabel}>
                In this stage:
              </Text>
              <Text variant="small" className={styles.fieldValue}>
                {formatStageDurationText(timingInfo.daysInStage)}
              </Text>
            </div>
          )}

          {/* Target date information */}
          {timingInfo.targetReturnDate && (
            <>
              <div className={styles.fieldRow}>
                <Text variant="small" className={styles.fieldLabel}>
                  Target date:
                </Text>
                <Text variant="small" className={styles.fieldValue}>
                  {formatDate(timingInfo.targetReturnDate)}
                </Text>
              </div>

              <div className={styles.fieldRow}>
                <Text variant="small" className={styles.fieldLabel}>
                  {timingInfo.isOverdue ? 'Overdue by:' : 'Days remaining:'}
                </Text>
                <Text
                  variant="small"
                  className={styles.fieldValue}
                  styles={{
                    root: {
                      color: timingInfo.isOverdue ? '#a4262c' : timingInfo.daysRemaining === 0 || timingInfo.daysRemaining === 1 ? '#ca5010' : '#107c10',
                      fontWeight: timingInfo.isOverdue || timingInfo.daysRemaining! <= 1 ? 600 : 400,
                    },
                  }}
                >
                  {formatDaysRemainingText(timingInfo.daysRemaining!)}
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
              {getActionText(waitingOn, itemData.status)}
            </Text>
          </div>
        </Stack>

        <Separator styles={{ root: { padding: 0, height: 1, margin: '12px 0' } }} />

        {/* Review Status Section */}
        <div className={styles.reviewStatusSection}>
          <Text variant="smallPlus" styles={{ root: { fontWeight: 600, marginBottom: 8 } }}>
            Review Status
          </Text>

          <Stack tokens={{ childrenGap: 8 }}>
            {/* Legal Review */}
            {(itemData.reviewAudience === ReviewAudience.Legal ||
              itemData.reviewAudience === ReviewAudience.Both) && (
              <div className={styles.reviewRow}>
                <Icon iconName="CheckboxComposite" className={styles.reviewIcon} />
                <Stack horizontal tokens={{ childrenGap: 8 }}>
                  <Text variant="small" styles={{ root: { fontWeight: 600 } }}>
                    Legal:
                  </Text>
                  <Text variant="small">
                    {formatReviewStatus(itemData.legalReviewStatus)}
                  </Text>
                </Stack>
              </div>
            )}

            {/* Compliance Review */}
            {(itemData.reviewAudience === ReviewAudience.Compliance ||
              itemData.reviewAudience === ReviewAudience.Both) && (
              <div className={styles.reviewRow}>
                <Icon iconName="CheckboxComposite" className={styles.reviewIcon} />
                <Stack horizontal tokens={{ childrenGap: 8 }}>
                  <Text variant="small" styles={{ root: { fontWeight: 600 } }}>
                    Compliance:
                  </Text>
                  <Text variant="small">
                    {formatReviewStatus(itemData.complianceReviewStatus)}
                  </Text>
                </Stack>
              </div>
            )}

            {/* No reviews required */}
            {!itemData.reviewAudience ||
              (itemData.reviewAudience !== ReviewAudience.Legal &&
                itemData.reviewAudience !== ReviewAudience.Compliance &&
                itemData.reviewAudience !== ReviewAudience.Both && (
                  <Text variant="small" styles={{ root: { color: '#8a8886', fontStyle: 'italic' } }}>
                    No reviews required
                  </Text>
                ))}
          </Stack>
        </div>
      </div>
    );
  }, [itemData, progressData, waitingOn, timingInfo, webUrl]);

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
          display: 'block',
          cursor: 'pointer',
        },
      }}
    >
      {children}
    </HoverCard>
  );
};

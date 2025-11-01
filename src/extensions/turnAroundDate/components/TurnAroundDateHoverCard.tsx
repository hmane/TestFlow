/**
 * TurnAroundDateHoverCard Component
 *
 * Displays detailed information about the target return date in a hover card:
 * - Target return date with color badge
 * - Days remaining/overdue
 * - Rush request indicator (if applicable)
 * - Expected turnaround time
 * - Date submitted and elapsed time
 */

import * as React from 'react';
import { Stack, Text, Icon, Separator } from '@fluentui/react';
import { HoverCard, HoverCardType, type IPlainCardProps } from '@fluentui/react';
import type { ITurnAroundDateHoverCardProps } from '../types';
import {
  formatDate,
  formatDaysRemainingText,
  formatStageDurationText,
} from '../../requestStatus/utils/stageTimingHelper';
import styles from './TurnAroundDate.module.scss';

/**
 * Get color badge styles for target date
 */
function getDateBadgeColor(color: string): { color: string; backgroundColor: string } {
  switch (color) {
    case 'green':
      return { color: '#107c10', backgroundColor: '#dff6dd' };
    case 'yellow':
      return { color: '#ca5010', backgroundColor: '#fed9cc' };
    case 'red':
      return { color: '#a4262c', backgroundColor: '#fde7e9' };
    case 'gray':
      return { color: '#605e5c', backgroundColor: '#edebe9' };
    default:
      return { color: '#605e5c', backgroundColor: '#edebe9' };
  }
}

/**
 * TurnAroundDateHoverCard Component
 */
export const TurnAroundDateHoverCard: React.FC<ITurnAroundDateHoverCardProps> = ({
  dateData,
  dateInfo,
  children,
}) => {
  /**
   * Render hover card content
   */
  const onRenderPlainCard = React.useCallback((): JSX.Element => {
    const dateBadge = getDateBadgeColor(dateInfo.color);

    return (
      <div className={styles.hoverCard}>
        {/* Header: Target Date Badge */}
        <div className={styles.cardHeader}>
          <Text variant="small" styles={{ root: { fontWeight: 600, color: '#605e5c' } }}>
            Target Return Date
          </Text>
          <div
            className={styles.dateBadge}
            style={{
              backgroundColor: dateBadge.backgroundColor,
              color: dateBadge.color,
            }}
          >
            {dateInfo.targetDate ? formatDate(dateInfo.targetDate) : 'Not Set'}
          </div>
        </div>

        <Separator styles={{ root: { padding: 0, height: 1, margin: '8px 0' } }} />

        {/* Content: Date Details */}
        <Stack tokens={{ childrenGap: 12 }} className={styles.cardContent}>
          {/* Days Remaining/Overdue */}
          {dateInfo.daysRemaining !== undefined && (
            <div className={styles.fieldRow}>
              <Text variant="small" className={styles.fieldLabel}>
                Status:
              </Text>
              <Text
                variant="small"
                className={styles.fieldValue}
                styles={{
                  root: {
                    color: dateInfo.isOverdue
                      ? '#a4262c'
                      : dateInfo.daysRemaining <= 1
                      ? '#ca5010'
                      : '#107c10',
                    fontWeight: dateInfo.isOverdue || dateInfo.daysRemaining <= 1 ? 600 : 400,
                  },
                }}
              >
                {formatDaysRemainingText(dateInfo.daysRemaining)}
              </Text>
            </div>
          )}

          {/* Rush Request Indicator */}
          {dateData.isRushRequest && (
            <div className={styles.rushSection}>
              <div className={styles.rushHeader}>
                <Icon iconName="StatusCircleErrorX" styles={{ root: { color: '#d13438', marginRight: 6 } }} />
                <Text variant="small" styles={{ root: { fontWeight: 600, color: '#d13438' } }}>
                  Rush Request
                </Text>
              </div>
              {dateData.rushRationale && (
                <Text variant="small" styles={{ root: { color: '#605e5c', marginTop: 4, fontStyle: 'italic' } }}>
                  {dateData.rushRationale}
                </Text>
              )}
            </div>
          )}

          {/* Expected Turnaround Time */}
          {dateData.turnAroundTimeInDays !== undefined && (
            <div className={styles.fieldRow}>
              <Text variant="small" className={styles.fieldLabel}>
                Expected Turnaround:
              </Text>
              <Text variant="small" className={styles.fieldValue}>
                {dateData.turnAroundTimeInDays} business {dateData.turnAroundTimeInDays === 1 ? 'day' : 'days'}
                {dateData.submissionItemTitle && (
                  <Text variant="xSmall" styles={{ root: { color: '#8a8886', display: 'block', marginTop: 2 } }}>
                    ({dateData.submissionItemTitle})
                  </Text>
                )}
              </Text>
            </div>
          )}

          {/* Date Submitted */}
          {dateData.submittedOn && (
            <div className={styles.fieldRow}>
              <Text variant="small" className={styles.fieldLabel}>
                Date Submitted:
              </Text>
              <Text variant="small" className={styles.fieldValue}>
                {formatDate(dateData.submittedOn)}
              </Text>
            </div>
          )}

          {/* Time Elapsed Since Submission */}
          {dateInfo.daysElapsedSinceSubmission !== undefined && (
            <div className={styles.fieldRow}>
              <Text variant="small" className={styles.fieldLabel}>
                Time Elapsed:
              </Text>
              <Text variant="small" className={styles.fieldValue}>
                {formatStageDurationText(dateInfo.daysElapsedSinceSubmission)}
              </Text>
            </div>
          )}

          {/* No target date message */}
          {!dateInfo.targetDate && (
            <Text variant="small" styles={{ root: { color: '#8a8886', fontStyle: 'italic', textAlign: 'center' } }}>
              No target return date has been set for this request
            </Text>
          )}
        </Stack>
      </div>
    );
  }, [dateData, dateInfo]);

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

/**
 * TimeTrackingSummary Component
 *
 * Displays a visual summary of time spent on a request across workflow stages.
 * Shows breakdown by stage and role (reviewer vs submitter).
 *
 * Features:
 * - Horizontal bar chart showing time per stage
 * - Pie-style breakdown of reviewer vs submitter hours
 * - Total hours summary
 * - Color-coded stages for easy identification
 */

import * as React from 'react';

// Fluent UI - tree-shaken imports
import { Icon } from '@fluentui/react/lib/Icon';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';

// App imports using path aliases
import type { ILegalRequest } from '@appTypes/requestTypes';

import styles from './TimeTrackingSummary.module.scss';

/**
 * Props for TimeTrackingSummary component
 */
export interface ITimeTrackingSummaryProps {
  request: ILegalRequest;
  /** Compact mode for inline display */
  compact?: boolean;
}

/**
 * Time data for a single stage
 */
interface IStageTimeData {
  stage: string;
  label: string;
  reviewerHours: number;
  submitterHours: number;
  totalHours: number;
  color: string;
  icon: string;
}

/**
 * Format hours for display
 */
const formatHours = (hours: number): string => {
  if (hours === 0) return '0h';
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes}m`;
  }
  if (hours % 1 === 0) {
    return `${hours}h`;
  }
  return `${hours.toFixed(1)}h`;
};

/**
 * TimeTrackingSummary Component
 */
export const TimeTrackingSummary: React.FC<ITimeTrackingSummaryProps> = ({ request, compact = false }) => {
  // Extract time tracking data from request
  const stageData: IStageTimeData[] = React.useMemo(() => {
    const stages: IStageTimeData[] = [
      {
        stage: 'legalIntake',
        label: 'Legal Intake',
        reviewerHours: request.legalIntakeLegalAdminHours || 0,
        submitterHours: request.legalIntakeSubmitterHours || 0,
        totalHours: (request.legalIntakeLegalAdminHours || 0) + (request.legalIntakeSubmitterHours || 0),
        color: '#0078d4', // Blue
        icon: 'InboxCheck',
      },
      {
        stage: 'legalReview',
        label: 'Legal Review',
        reviewerHours: request.legalReviewAttorneyHours || 0,
        submitterHours: request.legalReviewSubmitterHours || 0,
        totalHours: (request.legalReviewAttorneyHours || 0) + (request.legalReviewSubmitterHours || 0),
        color: '#8764b8', // Purple
        icon: 'KnowledgeArticle',
      },
      {
        stage: 'complianceReview',
        label: 'Compliance Review',
        reviewerHours: request.complianceReviewReviewerHours || 0,
        submitterHours: request.complianceReviewSubmitterHours || 0,
        totalHours: (request.complianceReviewReviewerHours || 0) + (request.complianceReviewSubmitterHours || 0),
        color: '#107c10', // Green
        icon: 'Shield',
      },
      {
        stage: 'closeout',
        label: 'Closeout',
        reviewerHours: request.closeoutReviewerHours || 0,
        submitterHours: request.closeoutSubmitterHours || 0,
        totalHours: (request.closeoutReviewerHours || 0) + (request.closeoutSubmitterHours || 0),
        color: '#ffaa44', // Orange
        icon: 'CompletedSolid',
      },
    ];

    // Filter out stages with no time tracked
    return stages.filter(s => s.totalHours > 0);
  }, [request]);

  // Calculate totals
  const totalReviewerHours = request.totalReviewerHours || 0;
  const totalSubmitterHours = request.totalSubmitterHours || 0;
  const grandTotal = totalReviewerHours + totalSubmitterHours;

  // Calculate max hours for bar scaling
  const maxStageHours = Math.max(...stageData.map(s => s.totalHours), 1);

  // If no time tracking data, show empty state
  if (grandTotal === 0 && stageData.length === 0) {
    if (compact) {
      return null;
    }
    return (
      <div className={styles.emptyState}>
        <Icon iconName="Clock" className={styles.emptyIcon} />
        <Text variant="small" className={styles.emptyText}>
          No time tracking data available
        </Text>
      </div>
    );
  }

  // Compact mode - just show totals inline
  if (compact) {
    return (
      <div className={styles.compactContainer}>
        <TooltipHost content={`Reviewer: ${formatHours(totalReviewerHours)} | Submitter: ${formatHours(totalSubmitterHours)}`}>
          <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 6 }}>
            <Icon iconName="Clock" className={styles.compactIcon} />
            <Text variant="small" className={styles.compactText}>
              {formatHours(grandTotal)}
            </Text>
          </Stack>
        </TooltipHost>
      </div>
    );
  }

  // Calculate percentages for the donut segments
  const reviewerPercent = grandTotal > 0 ? (totalReviewerHours / grandTotal) * 100 : 0;

  return (
    <div className={styles.container}>
      {/* Header */}
      <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }} className={styles.header}>
        <Icon iconName="Clock" className={styles.headerIcon} />
        <Text variant="large" className={styles.headerText}>
          Time Tracking
        </Text>
        <Text variant="small" className={styles.totalBadge}>
          {formatHours(grandTotal)} total
        </Text>
      </Stack>

      {/* Summary Row - Reviewer vs Submitter */}
      <div className={styles.summaryRow}>
        <div className={styles.summaryItem}>
          <div className={styles.summaryDot} style={{ backgroundColor: '#0078d4' }} />
          <div className={styles.summaryContent}>
            <Text variant="small" className={styles.summaryLabel}>Reviewer</Text>
            <Text variant="mediumPlus" className={styles.summaryValue}>{formatHours(totalReviewerHours)}</Text>
          </div>
          <Text variant="small" className={styles.summaryPercent}>
            {reviewerPercent.toFixed(0)}%
          </Text>
        </div>
        <div className={styles.summaryItem}>
          <div className={styles.summaryDot} style={{ backgroundColor: '#107c10' }} />
          <div className={styles.summaryContent}>
            <Text variant="small" className={styles.summaryLabel}>Submitter</Text>
            <Text variant="mediumPlus" className={styles.summaryValue}>{formatHours(totalSubmitterHours)}</Text>
          </div>
          <Text variant="small" className={styles.summaryPercent}>
            {(100 - reviewerPercent).toFixed(0)}%
          </Text>
        </div>
      </div>

      {/* Progress Bar showing Reviewer vs Submitter split */}
      <div className={styles.splitBar}>
        <div
          className={styles.splitBarReviewer}
          style={{ width: `${reviewerPercent}%` }}
        />
        <div
          className={styles.splitBarSubmitter}
          style={{ width: `${100 - reviewerPercent}%` }}
        />
      </div>

      {/* Stage Breakdown */}
      {stageData.length > 0 && (
        <div className={styles.stageBreakdown}>
          <Text variant="small" className={styles.breakdownTitle}>
            By Stage
          </Text>
          <div className={styles.stageList}>
            {stageData.map((stage) => {
              const barWidth = (stage.totalHours / maxStageHours) * 100;
              const reviewerWidth = stage.totalHours > 0
                ? (stage.reviewerHours / stage.totalHours) * 100
                : 0;

              return (
                <div key={stage.stage} className={styles.stageItem}>
                  <div className={styles.stageHeader}>
                    <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 6 }}>
                      <Icon iconName={stage.icon} style={{ color: stage.color, fontSize: '14px' }} />
                      <Text variant="small" className={styles.stageLabel}>{stage.label}</Text>
                    </Stack>
                    <Text variant="small" className={styles.stageHours}>
                      {formatHours(stage.totalHours)}
                    </Text>
                  </div>
                  <TooltipHost
                    content={`Reviewer: ${formatHours(stage.reviewerHours)} | Submitter: ${formatHours(stage.submitterHours)}`}
                  >
                    <div className={styles.stageBar}>
                      <div
                        className={styles.stageBarFill}
                        style={{ width: `${barWidth}%`, backgroundColor: stage.color }}
                      >
                        {/* Inner split showing reviewer vs submitter */}
                        <div
                          className={styles.stageBarReviewer}
                          style={{ width: `${reviewerWidth}%` }}
                        />
                      </div>
                    </div>
                  </TooltipHost>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <div className={styles.legendDot} style={{ backgroundColor: '#0078d4' }} />
          <Text variant="tiny" className={styles.legendText}>Reviewer time</Text>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendDot} style={{ backgroundColor: '#107c10' }} />
          <Text variant="tiny" className={styles.legendText}>Submitter time</Text>
        </div>
      </div>
    </div>
  );
};

export default TimeTrackingSummary;

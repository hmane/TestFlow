/**
 * WorkflowCardHeader Component
 *
 * A clean, consistent header component for workflow stage cards.
 * Displays status, timing, and contextual information efficiently.
 *
 * Design principles:
 * - Clean flat design without fading underlines or nested card appearance
 * - Consolidate redundant info (e.g., attorney = completedBy shows once)
 * - Show duration prominently for completed reviews
 * - Consistent structure across all review cards
 */

import { Icon } from '@fluentui/react/lib/Icon';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { TooltipHost, TooltipDelay } from '@fluentui/react/lib/Tooltip';
import { DirectionalHint } from '@fluentui/react/lib/Callout';
import * as React from 'react';
import './WorkflowCardHeader.scss';

/**
 * Review outcome types
 */
export type ReviewOutcome =
  | 'Approved'
  | 'Approved With Comments'
  | 'Respond To Comments And Resubmit'
  | 'Not Approved';

/**
 * Person reference for display
 */
export interface IPersonRef {
  title: string;
  email?: string;
}

/**
 * WorkflowCardHeader props
 */
export interface IWorkflowCardHeaderProps {
  /** Card title (e.g., "Legal Intake", "Legal Review") */
  title: string;
  /** Current status of this workflow stage */
  status: 'in-progress' | 'completed';
  /** Review outcome (for review cards only) */
  outcome?: ReviewOutcome;
  /** When this stage started */
  startedOn?: Date;
  /** When this stage was completed */
  completedOn?: Date;
  /** Person who completed this stage */
  completedBy?: IPersonRef;
  /** Assigned attorney (for legal review) */
  attorney?: IPersonRef;
  /** Duration in minutes (business hours) */
  durationMinutes?: number;
  /** Tracking ID (for closeout) */
  trackingId?: string;
  /** Optional action buttons to render at the end of the header */
  actions?: React.ReactNode;
  /** Custom class name */
  className?: string;
}

/**
 * Format a date for display
 */
function formatDate(date: Date | undefined): string {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date with time for tooltip
 */
function formatDateTime(date: Date | undefined): string {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format duration in minutes to human readable string
 */
function formatDuration(minutes: number | undefined): string {
  if (minutes === undefined || minutes === null) return '';

  // Show "< 1m" for very short durations (0 or negative after rounding)
  if (minutes <= 0) return '< 1m';

  const days = Math.floor(minutes / (8 * 60)); // 8-hour business day
  const hours = Math.floor((minutes % (8 * 60)) / 60);
  const mins = minutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0 && days === 0) parts.push(`${mins}m`); // Only show minutes if less than a day

  return parts.join(' ') || '< 1m';
}

/**
 * Get outcome badge styling
 * Returns simple background and color - no border for cleaner look
 */
function getOutcomeStyle(outcome: ReviewOutcome): {
  backgroundColor: string;
  color: string;
} {
  switch (outcome) {
    case 'Approved':
      return {
        backgroundColor: 'rgba(16, 124, 16, 0.1)',
        color: '#107c10',
      };
    case 'Approved With Comments':
      return {
        backgroundColor: 'rgba(255, 140, 0, 0.1)',
        color: '#d83b01',
      };
    case 'Respond To Comments And Resubmit':
      return {
        backgroundColor: 'rgba(255, 140, 0, 0.1)',
        color: '#d83b01',
      };
    case 'Not Approved':
      return {
        backgroundColor: 'rgba(164, 38, 44, 0.1)',
        color: '#a4262c',
      };
    default:
      return {
        backgroundColor: 'rgba(96, 94, 92, 0.1)',
        color: '#605e5c',
      };
  }
}

/**
 * WorkflowCardHeader Component
 */
export const WorkflowCardHeader: React.FC<IWorkflowCardHeaderProps> = ({
  title,
  status,
  outcome,
  startedOn,
  completedOn,
  completedBy,
  attorney,
  durationMinutes,
  trackingId,
  actions,
  className,
}) => {
  const isCompleted = status === 'completed';

  // Build duration tooltip content
  const durationTooltip = React.useMemo(() => {
    if (!startedOn && !completedOn) return '';

    const lines: string[] = [];
    if (startedOn) lines.push(`Started: ${formatDateTime(startedOn)}`);
    if (completedOn) lines.push(`Completed: ${formatDateTime(completedOn)}`);

    return lines.join('\n');
  }, [startedOn, completedOn]);

  // Render the status icon
  const renderStatusIcon = (): React.ReactElement => {
    const iconName = isCompleted ? 'CompletedSolid' : 'ProgressRingDots';
    const iconClass = isCompleted ? 'workflow-header__icon--completed' : 'workflow-header__icon--progress';

    return (
      <div className={`workflow-header__icon ${iconClass}`}>
        <Icon iconName={iconName} />
      </div>
    );
  };

  // Render the status badge
  const renderStatusBadge = (): React.ReactElement => {
    const badgeClass = isCompleted ? 'workflow-header__badge--completed' : 'workflow-header__badge--progress';
    return (
      <span className={`workflow-header__badge ${badgeClass}`}>
        {isCompleted ? 'Completed' : 'In Progress'}
      </span>
    );
  };

  // Render outcome badge (for review cards)
  const renderOutcomeBadge = (): React.ReactElement | null => {
    if (!outcome) return null;

    const style = getOutcomeStyle(outcome);

    // Shorten display text for long outcomes
    let displayText: string = outcome;
    if (outcome === 'Approved With Comments') displayText = 'Approved w/ Comments';
    if (outcome === 'Respond To Comments And Resubmit') displayText = 'Resubmit Required';

    return (
      <span
        className='workflow-header__outcome'
        style={{
          backgroundColor: style.backgroundColor,
          color: style.color,
        }}
      >
        {displayText}
      </span>
    );
  };

  // Render contextual info (attorney, completed by, date, etc.)
  // Consolidates attorney and completedBy when they are the same person
  const renderContextInfo = (): React.ReactElement | null => {
    const parts: React.ReactNode[] = [];

    // Determine if attorney and completedBy are the same person
    const isSamePerson =
      attorney?.title &&
      completedBy?.title &&
      (attorney.title === completedBy.title ||
        (attorney.email && completedBy.email && attorney.email.toLowerCase() === completedBy.email.toLowerCase()));

    // For completed reviews: show consolidated reviewer info
    if (isCompleted) {
      if (isSamePerson) {
        // Attorney completed the review - show single entry with completion context
        parts.push(
          <span key="reviewer" className='workflow-header__context-item'>
            <Icon iconName="Contact" className='workflow-header__context-icon' />
            <span className='workflow-header__context-value'>{attorney!.title}</span>
          </span>
        );
      } else if (attorney?.title) {
        // Different people - show attorney
        parts.push(
          <span key="attorney" className='workflow-header__context-item'>
            <Icon iconName="Contact" className='workflow-header__context-icon' />
            <span className='workflow-header__context-value'>{attorney.title}</span>
          </span>
        );
        // And show who completed if different
        if (completedBy?.title) {
          parts.push(
            <span key="completedBy" className='workflow-header__context-item'>
              <span className='workflow-header__context-sep'>·</span>
              <span className='workflow-header__context-label'>Reviewed by</span>
              <span className='workflow-header__context-value'>{completedBy.title}</span>
            </span>
          );
        }
      } else if (completedBy?.title) {
        // No attorney, just show who completed
        parts.push(
          <span key="completedBy" className='workflow-header__context-item'>
            <Icon iconName="Contact" className='workflow-header__context-icon' />
            <span className='workflow-header__context-value'>{completedBy.title}</span>
          </span>
        );
      }

      // Completed date
      if (completedOn) {
        parts.push(
          <span key="completedOn" className='workflow-header__context-item'>
            <span className='workflow-header__context-sep'>·</span>
            <span className='workflow-header__context-date'>{formatDate(completedOn)}</span>
          </span>
        );
      }
    } else {
      // In progress: show attorney and start date
      if (attorney?.title) {
        parts.push(
          <span key="attorney" className='workflow-header__context-item'>
            <Icon iconName="Contact" className='workflow-header__context-icon' />
            <span className='workflow-header__context-value'>{attorney.title}</span>
          </span>
        );
      }

      // Started date for in-progress
      if (startedOn) {
        parts.push(
          <span key="startedOn" className='workflow-header__context-item'>
            {attorney?.title && <span className='workflow-header__context-sep'>·</span>}
            <span className='workflow-header__context-label'>since</span>
            <span className='workflow-header__context-date'>{formatDate(startedOn)}</span>
          </span>
        );
      }
    }

    // Tracking ID (for closeout)
    if (trackingId) {
      parts.push(
        <span key="trackingId" className='workflow-header__context-item'>
          <span className='workflow-header__context-sep'>·</span>
          <span className='workflow-header__context-label'>ID:</span>
          <span className='workflow-header__context-value'>{trackingId}</span>
        </span>
      );
    }

    if (parts.length === 0) return null;

    return <div className='workflow-header__context'>{parts}</div>;
  };

  // Render duration badge
  const renderDurationBadge = (): React.ReactElement | null => {
    if (!durationMinutes && durationMinutes !== 0) return null;

    const durationText = formatDuration(durationMinutes);
    if (!durationText) return null;

    const durationClass = isCompleted ? 'workflow-header__duration--completed' : 'workflow-header__duration--progress';

    const badge = (
      <span className={`workflow-header__duration ${durationClass}`}>
        <Icon iconName="Clock" className='workflow-header__duration-icon' />
        <span className='workflow-header__duration-text'>{durationText}</span>
      </span>
    );

    if (durationTooltip) {
      return (
        <TooltipHost
          content={
            <div className='workflow-header__tooltip'>
              {durationTooltip.split('\n').map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          }
          delay={TooltipDelay.zero}
          directionalHint={DirectionalHint.bottomCenter}
        >
          {badge}
        </TooltipHost>
      );
    }

    return badge;
  };

  const containerClass = isCompleted ? 'workflow-header--completed' : 'workflow-header--progress';

  return (
    <div className={`workflow-header ${containerClass} ${className || ''}`}>
      <Stack
        horizontal
        verticalAlign="center"
        tokens={{ childrenGap: 12 }}
        className='workflow-header__content'
      >
        {/* Status Icon */}
        {renderStatusIcon()}

        {/* Title */}
        <Text className={`workflow-header__title ${isCompleted ? 'workflow-header__title--completed' : ''}`}>
          {title}
        </Text>

        {/* Status Badge */}
        {renderStatusBadge()}

        {/* Outcome Badge (reviews only) */}
        {renderOutcomeBadge()}

        {/* Flexible spacer */}
        <div className='workflow-header__spacer' />

        {/* Duration Badge - shown prominently for timing visibility */}
        {renderDurationBadge()}

        {/* Context Info (reviewer, date) */}
        {renderContextInfo()}

        {/* Optional action buttons */}
        {actions && <div className='workflow-header__actions'>{actions}</div>}
      </Stack>
      {/* Removed: accent line (fading underline) for cleaner flat design */}
    </div>
  );
};

export default WorkflowCardHeader;

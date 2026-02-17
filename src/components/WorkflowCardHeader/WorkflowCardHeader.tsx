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
 * Waiting status types for resubmit workflow
 * Used when review is in "Respond To Comments And Resubmit" workflow
 */
export type WaitingStatus =
  | 'waiting-on-submitter'
  | 'waiting-on-reviewer';

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
  /** Assigned attorney(s) (for legal review) — pass single or multiple */
  attorney?: IPersonRef | IPersonRef[];
  /** Label shown before attorney names (e.g., "Assigned to"). If omitted, names are shown with icon only. */
  attorneyLabel?: string;
  /** Label for the completedBy person when different from attorney. Defaults to "Reviewed by". */
  completedByLabel?: string;
  /** Duration in minutes (business hours) */
  durationMinutes?: number;
  /** Tracking ID (for closeout) */
  trackingId?: string;
  /**
   * Waiting status for resubmit workflow
   * When set, shows "Waiting on Submitter" or "Waiting on Reviewer" badge
   * instead of "In Progress"
   */
  waitingStatus?: WaitingStatus;
  /**
   * Date since which we're waiting (typically the status updated timestamp)
   * Shown as "since [date]" when waitingStatus is set
   */
  waitingSince?: Date;
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
  attorneyLabel,
  completedByLabel = 'Reviewed by',
  durationMinutes,
  trackingId,
  waitingStatus,
  waitingSince,
  actions,
  className,
}) => {
  const isCompleted = status === 'completed';
  const isWaiting = !!waitingStatus;

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
    let iconName: string;
    let iconClass: string;

    if (isCompleted) {
      iconName = 'CompletedSolid';
      iconClass = 'workflow-header__icon--completed';
    } else if (isWaiting) {
      // Use a clock/waiting icon for waiting states
      iconName = 'AwayStatus';
      iconClass = 'workflow-header__icon--waiting';
    } else {
      iconName = 'ProgressRingDots';
      iconClass = 'workflow-header__icon--progress';
    }

    return (
      <div className={`workflow-header__icon ${iconClass}`}>
        <Icon iconName={iconName} />
      </div>
    );
  };

  // Render the status badge
  // Shows "Completed", "In Progress", "Waiting on Submitter", or "Waiting on Reviewer"
  const renderStatusBadge = (): React.ReactElement => {
    let badgeClass: string;
    let badgeText: string;

    if (isCompleted) {
      badgeClass = 'workflow-header__badge--completed';
      badgeText = 'Completed';
    } else if (waitingStatus === 'waiting-on-submitter') {
      badgeClass = 'workflow-header__badge--waiting-submitter';
      badgeText = 'Waiting on Submitter';
    } else if (waitingStatus === 'waiting-on-reviewer') {
      badgeClass = 'workflow-header__badge--waiting-reviewer';
      badgeText = 'Waiting on Reviewer';
    } else {
      badgeClass = 'workflow-header__badge--progress';
      badgeText = 'In Progress';
    }

    return (
      <span className={`workflow-header__badge ${badgeClass}`}>
        {badgeText}
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

    // Normalize attorney prop to array
    const attorneys: IPersonRef[] = attorney
      ? (Array.isArray(attorney) ? attorney : [attorney])
      : [];
    const primaryAttorney = attorneys[0];
    const hasAttorneys = attorneys.length > 0;

    // Build attorney display text: "Name" for 1, "Name, Name" for 2, "Name +N" for 3+
    const attorneyDisplayText = attorneys.length <= 2
      ? attorneys.map(a => a.title).join(', ')
      : `${primaryAttorney!.title} +${attorneys.length - 1}`;

    // Build full tooltip listing all attorneys
    const attorneyTooltip = attorneys.length > 1
      ? attorneys.map(a => a.title).join('\n')
      : undefined;

    // Determine if primary attorney and completedBy are the same person
    const isSamePerson =
      primaryAttorney?.title &&
      completedBy?.title &&
      (primaryAttorney.title === completedBy.title ||
        (primaryAttorney.email && completedBy.email && primaryAttorney.email.toLowerCase() === completedBy.email.toLowerCase()));

    // Helper to render attorney names (with tooltip when multiple)
    const renderAttorneyNames = (key: string): React.ReactNode => {
      const nameSpan = (
        <span key={key} className='workflow-header__context-item'>
          {attorneyLabel
            ? <span className='workflow-header__context-label'>{attorneyLabel}</span>
            : <Icon iconName="Contact" className='workflow-header__context-icon' />
          }
          <span className='workflow-header__context-value'>{attorneyDisplayText}</span>
        </span>
      );
      if (attorneyTooltip) {
        return (
          <TooltipHost
            key={key}
            content={
              <div className='workflow-header__tooltip'>
                {attorneyTooltip.split('\n').map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            }
            delay={TooltipDelay.zero}
            directionalHint={DirectionalHint.bottomCenter}
          >
            {nameSpan}
          </TooltipHost>
        );
      }
      return nameSpan;
    };

    // For completed reviews: show consolidated reviewer info
    if (isCompleted) {
      if (isSamePerson && attorneys.length === 1) {
        // Single attorney completed the review - show single entry
        parts.push(renderAttorneyNames('reviewer'));
      } else if (hasAttorneys) {
        // Show attorney(s)
        parts.push(renderAttorneyNames('attorney'));
        // And show who completed if different
        if (completedBy?.title && !isSamePerson) {
          parts.push(
            <span key="completedBy" className='workflow-header__context-item'>
              <span className='workflow-header__context-sep'>·</span>
              <span className='workflow-header__context-label'>{completedByLabel}</span>
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
            <TooltipHost
              content={formatDateTime(completedOn)}
              delay={TooltipDelay.zero}
              directionalHint={DirectionalHint.bottomCenter}
            >
              <span className='workflow-header__context-date workflow-header__context-date--hoverable'>
                {formatDate(completedOn)}
              </span>
            </TooltipHost>
          </span>
        );
      }
    } else if (isWaiting) {
      // Waiting status: show who we're waiting on and since when
      if (hasAttorneys) {
        parts.push(renderAttorneyNames('attorney'));
      }

      // Show "since" date from waitingSince prop (status updated timestamp)
      if (waitingSince) {
        parts.push(
          <span key="waitingSince" className='workflow-header__context-item'>
            {hasAttorneys && <span className='workflow-header__context-sep'>·</span>}
            <span className='workflow-header__context-label'>since</span>
            <TooltipHost
              content={formatDateTime(waitingSince)}
              delay={TooltipDelay.zero}
              directionalHint={DirectionalHint.bottomCenter}
            >
              <span className='workflow-header__context-date workflow-header__context-date--hoverable'>
                {formatDate(waitingSince)}
              </span>
            </TooltipHost>
          </span>
        );
      }
    } else {
      // In progress: show attorney(s) and start date
      if (hasAttorneys) {
        parts.push(renderAttorneyNames('attorney'));
      }

      // Started date for in-progress
      if (startedOn) {
        parts.push(
          <span key="startedOn" className='workflow-header__context-item'>
            {hasAttorneys && <span className='workflow-header__context-sep'>·</span>}
            <span className='workflow-header__context-label'>since</span>
            <TooltipHost
              content={formatDateTime(startedOn)}
              delay={TooltipDelay.zero}
              directionalHint={DirectionalHint.bottomCenter}
            >
              <span className='workflow-header__context-date workflow-header__context-date--hoverable'>
                {formatDate(startedOn)}
              </span>
            </TooltipHost>
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

  // Determine container class based on status
  // Waiting states get special styling to draw attention
  let containerClass: string;
  if (isCompleted) {
    containerClass = 'workflow-header--completed';
  } else if (waitingStatus === 'waiting-on-submitter') {
    containerClass = 'workflow-header--waiting-submitter';
  } else if (waitingStatus === 'waiting-on-reviewer') {
    containerClass = 'workflow-header--waiting-reviewer';
  } else {
    containerClass = 'workflow-header--progress';
  }

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

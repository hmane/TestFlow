/**
 * Types for TurnAroundDate Field Customizer
 */

import type { RequestStatus } from '../../types/workflowTypes';

/**
 * Turn around date color options
 */
export type TurnAroundDateColor = 'green' | 'yellow' | 'red' | 'gray';

/**
 * Urgency level for date
 */
export type UrgencyLevel = 'high' | 'medium' | 'low' | 'none';

/**
 * Data extracted from list item for turnaround date display
 */
export interface ITurnAroundDateData {
  /** Target return date */
  targetReturnDate?: Date;
  /** When request was submitted */
  submittedOn?: Date;
  /** Is this a rush request */
  isRushRequest: boolean;
  /** Rush request rationale */
  rushRationale?: string;
  /** Current request status */
  status: RequestStatus;
  /** Expected turnaround time in business days (from SubmissionItem) */
  turnAroundTimeInDays?: number;
  /** Submission item title */
  submissionItemTitle?: string;
}

/**
 * Calculated timing information for turnaround date
 */
export interface ITurnAroundDateInfo {
  /** Target return date */
  targetDate?: Date;
  /** Days remaining until target date (negative if overdue) */
  daysRemaining?: number;
  /** Is the date overdue */
  isOverdue: boolean;
  /** Urgency level */
  urgencyLevel: UrgencyLevel;
  /** Color for display */
  color: TurnAroundDateColor;
  /** Formatted display text */
  displayText: string;
  /** Days elapsed since submission */
  daysElapsedSinceSubmission?: number;
}

/**
 * Props for TurnAroundDateDisplay component
 */
export interface ITurnAroundDateDisplayProps {
  /** Target return date */
  targetDate?: Date;
  /** Color for background */
  color: TurnAroundDateColor;
  /** Display text */
  displayText: string;
}

/**
 * Props for TurnAroundDateHoverCard component
 */
export interface ITurnAroundDateHoverCardProps {
  /** All turnaround date data */
  dateData: ITurnAroundDateData;
  /** Calculated date info */
  dateInfo: ITurnAroundDateInfo;
  /** Child element (the date display) */
  children: React.ReactNode;
}

/**
 * Props for TurnAroundDateWrapper component
 */
export interface ITurnAroundDateWrapperProps {
  /** All turnaround date data */
  itemData: ITurnAroundDateData;
}

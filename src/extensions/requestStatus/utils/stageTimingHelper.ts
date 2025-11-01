/**
 * Stage Timing Helper Utility
 *
 * Calculates timing information for the current workflow stage:
 * - Date entered current stage
 * - Days in current stage
 * - Days remaining until target date
 * - Overdue status
 */

import { RequestStatus } from '../../../types/workflowTypes';
import type { IStatusListItemData, IStageTimingInfo } from '../types';

/**
 * Get timing information for current stage
 * @param itemData - Request list item data
 * @returns Stage timing information
 */
export function getStageTimingInfo(itemData: IStatusListItemData): IStageTimingInfo {
  const { status, targetReturnDate, isRushRequest } = itemData;

  // Get the date when current stage was entered
  const stageStartDate = getStageStartDate(status, itemData);

  // Calculate days in current stage
  const daysInStage = stageStartDate ? calculateDaysSince(stageStartDate) : 0;

  // Calculate days remaining until target date
  let daysRemaining: number | undefined;
  let isOverdue = false;

  if (targetReturnDate) {
    daysRemaining = calculateDaysUntil(targetReturnDate);
    isOverdue = daysRemaining < 0;
  }

  return {
    stageStartDate,
    daysInStage,
    daysRemaining,
    targetReturnDate,
    isRush: isRushRequest,
    isOverdue,
  };
}

/**
 * Get the date when the current stage was entered
 * @param status - Current status
 * @param itemData - Request list item data
 * @returns Date stage was entered
 */
function getStageStartDate(status: RequestStatus, itemData: IStatusListItemData): Date | undefined {
  switch (status) {
    case RequestStatus.Draft:
      return itemData.created;

    case RequestStatus.LegalIntake:
      return itemData.submittedOn;

    case RequestStatus.AssignAttorney:
      return itemData.submittedToAssignAttorneyOn;

    case RequestStatus.InReview:
      return itemData.submittedForReviewOn || itemData.legalReviewAssignedOn;

    case RequestStatus.Closeout:
      // Closeout starts when reviews are completed
      // Use the later of legal or compliance completion dates
      const legalCompleted = itemData.legalReviewCompletedOn;
      const complianceCompleted = itemData.complianceReviewCompletedOn;

      if (legalCompleted && complianceCompleted) {
        return legalCompleted > complianceCompleted ? legalCompleted : complianceCompleted;
      }
      return legalCompleted || complianceCompleted;

    case RequestStatus.Completed:
      return itemData.closeoutOn;

    case RequestStatus.Cancelled:
      return itemData.cancelledOn;

    case RequestStatus.OnHold:
      return itemData.onHoldSince;

    default:
      return itemData.created;
  }
}

/**
 * Calculate days since a given date
 * @param date - Start date
 * @returns Number of days since the date
 */
export function calculateDaysSince(date: Date | string | number): number {
  const now = new Date();
  const start = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

  // Normalize times to start of day for accurate day count
  now.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);

  const diffTime = now.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Calculate days until a given date
 * @param date - Target date
 * @returns Number of days until the date (negative if past)
 */
export function calculateDaysUntil(date: Date | string | number): number {
  const now = new Date();
  const target = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

  // Normalize times to start of day for accurate day count
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Format days into friendly text
 * @param days - Number of days
 * @returns Formatted text (e.g., "2 days", "1 day", "today")
 */
export function formatDaysText(days: number): string {
  if (days === 0) {
    return 'today';
  }

  if (days === 1) {
    return '1 day';
  }

  return `${days} days`;
}

/**
 * Format days remaining text
 * @param daysRemaining - Days until target date (can be negative)
 * @returns Formatted text with urgency indicator
 */
export function formatDaysRemainingText(daysRemaining: number): string {
  if (daysRemaining < 0) {
    return `${Math.abs(daysRemaining)} days overdue`;
  }

  if (daysRemaining === 0) {
    return 'Due today';
  }

  if (daysRemaining === 1) {
    return 'Due tomorrow';
  }

  return `${daysRemaining} days remaining`;
}

/**
 * Format stage duration text
 * @param days - Number of days in stage
 * @returns Formatted text
 */
export function formatStageDurationText(days: number): string {
  if (days === 0) {
    return 'Less than 1 day';
  }

  if (days === 1) {
    return '1 day';
  }

  if (days < 7) {
    return `${days} days`;
  }

  const weeks = Math.floor(days / 7);
  const remainingDays = days % 7;

  if (weeks === 1) {
    if (remainingDays === 0) {
      return '1 week';
    }
    return `1 week, ${remainingDays} ${remainingDays === 1 ? 'day' : 'days'}`;
  }

  if (remainingDays === 0) {
    return `${weeks} weeks`;
  }

  return `${weeks} weeks, ${remainingDays} ${remainingDays === 1 ? 'day' : 'days'}`;
}

/**
 * Format date for display
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date | string | number): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Get urgency level based on days remaining
 * @param daysRemaining - Days until target date
 * @returns Urgency level
 */
export function getUrgencyLevel(daysRemaining: number): 'high' | 'medium' | 'low' | 'overdue' {
  if (daysRemaining < 0) {
    return 'overdue';
  }

  if (daysRemaining <= 1) {
    return 'high';
  }

  if (daysRemaining <= 3) {
    return 'medium';
  }

  return 'low';
}

/**
 * Date Calculation Utility for TurnAroundDate Field Customizer
 *
 * Calculates timing information and determines color coding for target return dates
 * - Simple color logic: Green (2+ days), Yellow (today/tomorrow), Red (overdue)
 * - Reuses utilities from requestStatus for date calculations
 */

import {
  calculateDaysUntil,
  calculateDaysSince,
  formatDate,
  formatDaysRemainingText,
  getUrgencyLevel as getStatusUrgencyLevel,
} from '../../requestStatus/utils/stageTimingHelper';
import type {
  ITurnAroundDateData,
  ITurnAroundDateInfo,
  TurnAroundDateColor,
  UrgencyLevel,
} from '../types';

/**
 * Calculate all timing information for a turnaround date
 * @param data - Turnaround date data from list item
 * @returns Complete timing information with color and display text
 */
export function calculateDateInfo(data: ITurnAroundDateData): ITurnAroundDateInfo {
  // Handle no target date
  if (!data.targetReturnDate) {
    return {
      color: 'gray',
      displayText: 'No target date',
      isOverdue: false,
      urgencyLevel: 'none',
    };
  }

  // Calculate days remaining
  const daysRemaining = calculateDaysUntil(data.targetReturnDate);

  // Determine color based on urgency
  const color = determineDateColor(daysRemaining);

  // Check if overdue
  const isOverdue = daysRemaining < 0;

  // Get urgency level
  const urgencyLevel = mapUrgencyLevel(daysRemaining);

  // Format display text
  const displayText = formatDate(data.targetReturnDate);

  // Calculate days elapsed since submission
  let daysElapsedSinceSubmission: number | undefined;
  if (data.submittedOn) {
    daysElapsedSinceSubmission = calculateDaysSince(data.submittedOn);
  }

  return {
    targetDate: data.targetReturnDate,
    daysRemaining,
    isOverdue,
    urgencyLevel,
    color,
    displayText,
    daysElapsedSinceSubmission,
  };
}

/**
 * Determine color based on days remaining
 * Simple logic: Green (2+ days), Yellow (0-1 days), Red (overdue)
 * @param daysRemaining - Days until target date (negative if overdue)
 * @returns Color code for display
 */
export function determineDateColor(daysRemaining: number): TurnAroundDateColor {
  if (daysRemaining < 0) {
    return 'red'; // Overdue
  }

  if (daysRemaining <= 1) {
    return 'yellow'; // Due today or tomorrow
  }

  return 'green'; // 2+ days remaining (on track)
}

/**
 * Map urgency level from requestStatus helper to our type
 * @param daysRemaining - Days until target date
 * @returns Urgency level
 */
function mapUrgencyLevel(daysRemaining: number): UrgencyLevel {
  const statusUrgency = getStatusUrgencyLevel(daysRemaining);
  return statusUrgency as UrgencyLevel;
}

/**
 * Get friendly description of urgency
 * @param urgencyLevel - Urgency level
 * @returns Human-readable description
 */
export function getUrgencyDescription(urgencyLevel: UrgencyLevel): string {
  switch (urgencyLevel) {
    case 'high':
      return 'Urgent - Due very soon';
    case 'medium':
      return 'Moderate urgency';
    case 'low':
      return 'On track';
    case 'none':
      return 'No deadline set';
    default:
      return '';
  }
}

/**
 * Format days remaining text with appropriate styling info
 * @param daysRemaining - Days until target (negative if overdue)
 * @returns Formatted text
 */
export function formatDaysRemainingForDisplay(daysRemaining: number | undefined): string {
  if (daysRemaining === undefined) {
    return 'No target date set';
  }

  return formatDaysRemainingText(daysRemaining);
}

/**
 * Check if date is within a certain threshold
 * @param daysRemaining - Days until target
 * @param threshold - Threshold in days
 * @returns True if within threshold
 */
export function isWithinThreshold(
  daysRemaining: number | undefined,
  threshold: number
): boolean {
  if (daysRemaining === undefined) return false;
  return daysRemaining >= 0 && daysRemaining <= threshold;
}

/**
 * Get color for inline display (text color, not background)
 * @param color - Background color
 * @returns Text color for high contrast
 */
export function getTextColorForBackground(color: TurnAroundDateColor): string {
  // All colored backgrounds use white text for readability
  return '#ffffff';
}

/**
 * Get CSS class suffix for color
 * @param color - Color type
 * @returns Class name suffix
 */
export function getColorClassName(color: TurnAroundDateColor): string {
  return color;
}

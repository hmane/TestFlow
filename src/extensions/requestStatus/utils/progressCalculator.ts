/**
 * Progress Calculation Utility
 *
 * Calculates workflow progress dynamically based on actual workflow path
 * - Adjusts calculation if Assign Attorney step is skipped
 * - Determines color based on target return date
 */

// App imports using path aliases
import { RequestStatus } from '@appTypes/workflowTypes';
import type { IStatusListItemData, IStatusProgressData, ProgressBarColor } from '../types';

/**
 * Status order mapping (linear workflow)
 */
const STATUS_ORDER: Record<RequestStatus, number> = {
  [RequestStatus.Draft]: 1,
  [RequestStatus.LegalIntake]: 2,
  [RequestStatus.AssignAttorney]: 3,
  [RequestStatus.InReview]: 4,
  [RequestStatus.Closeout]: 5,
  [RequestStatus.AwaitingForesideDocuments]: 6, // After Closeout, before Completed
  [RequestStatus.Completed]: 7,
  [RequestStatus.Cancelled]: 0, // Special
  [RequestStatus.OnHold]: 0, // Special
};

/**
 * Calculate progress percentage dynamically
 * @param itemData - Request list item data
 * @returns Progress data with percentage, color, and step info
 */
export function calculateProgress(itemData: IStatusListItemData): IStatusProgressData {
  const { status, submittedToAssignAttorneyOn, previousStatus } = itemData;

  // Determine if Assign Attorney step was actually used
  const usedAssignAttorneyStep = !!submittedToAssignAttorneyOn;

  // For special statuses, use previous status or fallback
  let effectiveStatus = status;
  if (status === RequestStatus.Cancelled || status === RequestStatus.OnHold) {
    effectiveStatus = previousStatus || RequestStatus.Draft;
  }

  // Calculate progress based on whether Assign Attorney was used
  let progress: number;
  let currentStep: number;
  let totalSteps: number;

  if (usedAssignAttorneyStep) {
    // All 6 steps: Draft, Legal Intake, Assign Attorney, In Review, Closeout, Completed
    totalSteps = 6;
    currentStep = STATUS_ORDER[effectiveStatus] || 1;
    progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
  } else {
    // 5 steps: Draft, Legal Intake, In Review, Closeout, Completed (skip Assign Attorney)
    totalSteps = 5;

    // Adjust step numbers when Assign Attorney is skipped
    const stepMapping: Record<RequestStatus, number> = {
      [RequestStatus.Draft]: 1,
      [RequestStatus.LegalIntake]: 2,
      [RequestStatus.AssignAttorney]: 3, // Shouldn't happen, but fallback
      [RequestStatus.InReview]: 3,
      [RequestStatus.Closeout]: 4,
      [RequestStatus.AwaitingForesideDocuments]: 5, // After Closeout
      [RequestStatus.Completed]: 6,
      [RequestStatus.Cancelled]: 1,
      [RequestStatus.OnHold]: 1,
    };

    currentStep = stepMapping[effectiveStatus] || 1;
    progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
  }

  // Ensure progress is within 0-100 range
  progress = Math.max(0, Math.min(100, progress));

  // Determine color
  const color = determineProgressColor(status, itemData.targetReturnDate, previousStatus);

  return {
    progress,
    currentStep,
    totalSteps,
    usedAssignAttorneyStep,
    color,
  };
}

/**
 * Determine progress bar color based on target date and status
 * @param status - Current request status
 * @param targetReturnDate - Target return date (if exists)
 * @param previousStatus - Previous status (for On Hold)
 * @returns Color code for progress bar
 */
export function determineProgressColor(
  status: RequestStatus,
  targetReturnDate?: Date | string | number,
  previousStatus?: RequestStatus
): ProgressBarColor {
  // Special status colors
  if (status === RequestStatus.Cancelled) {
    return 'gray';
  }

  if (status === RequestStatus.OnHold) {
    return 'blue';
  }

  // Completed is always green (success)
  if (status === RequestStatus.Completed) {
    return 'green';
  }

  // Awaiting Foreside Documents is near completion (green)
  if (status === RequestStatus.AwaitingForesideDocuments) {
    return 'green';
  }

  // If no target date, use gray (neutral)
  if (!targetReturnDate) {
    return 'gray';
  }

  // Calculate days remaining
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day

  const target = typeof targetReturnDate === 'string' || typeof targetReturnDate === 'number'
    ? new Date(targetReturnDate)
    : targetReturnDate;
  target.setHours(0, 0, 0, 0); // Normalize to start of day

  const diffTime = target.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Color logic based on days remaining
  if (daysRemaining < 0) {
    return 'red'; // Overdue
  }

  if (daysRemaining <= 1) {
    return 'yellow'; // Due today or tomorrow
  }

  return 'green'; // On track
}

/**
 * Get friendly status display name
 * @param status - Request status
 * @returns Display name
 */
export function getStatusDisplayName(status: RequestStatus): string {
  // Return the enum value directly (they're already display-friendly)
  return status;
}

/**
 * Get step label for progress display
 * @param currentStep - Current step number
 * @param totalSteps - Total steps
 * @returns Step label (e.g., "Step 2 of 5")
 */
export function getStepLabel(currentStep: number, totalSteps: number): string {
  return `Step ${currentStep} of ${totalSteps}`;
}

/**
 * Calculate progress for a given status (utility for testing)
 * @param status - Request status
 * @param usedAssignAttorneyStep - Whether Assign Attorney was used
 * @returns Progress percentage
 */
export function calculateProgressForStatus(
  status: RequestStatus,
  usedAssignAttorneyStep: boolean
): number {
  if (usedAssignAttorneyStep) {
    const stepOrder = STATUS_ORDER[status] || 1;
    return ((stepOrder - 1) / 6) * 100;
  } else {
    const stepMapping: Record<RequestStatus, number> = {
      [RequestStatus.Draft]: 1,
      [RequestStatus.LegalIntake]: 2,
      [RequestStatus.AssignAttorney]: 3,
      [RequestStatus.InReview]: 3,
      [RequestStatus.Closeout]: 4,
      [RequestStatus.AwaitingForesideDocuments]: 5,
      [RequestStatus.Completed]: 6,
      [RequestStatus.Cancelled]: 1,
      [RequestStatus.OnHold]: 1,
    };
    const stepOrder = stepMapping[status] || 1;
    return ((stepOrder - 1) / 5) * 100;
  }
}

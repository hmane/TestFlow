/**
 * Types for RequestStatus Field Customizer Progress Bar
 */

import type {
  RequestStatus,
  ReviewAudience,
  LegalReviewStatus,
  ComplianceReviewStatus,
  ReviewOutcome,
} from '../../types/workflowTypes';
import type { IPrincipal } from '../../types';

/**
 * Progress bar color options
 */
export type ProgressBarColor = 'green' | 'yellow' | 'red' | 'blue' | 'gray';

/**
 * Type of entity being waited on
 */
export type WaitingOnType = 'user' | 'group' | 'none';

/**
 * Request data available from list view for status display
 */
export interface IStatusListItemData {
  id: number;
  requestId: string;
  status: RequestStatus;
  targetReturnDate?: Date;
  isRushRequest: boolean;
  rushRationale?: string;
  reviewAudience: ReviewAudience;

  // Date tracking fields
  created: Date;
  submittedOn?: Date;
  submittedToAssignAttorneyOn?: Date;
  submittedForReviewOn?: Date;
  closeoutOn?: Date;
  cancelledOn?: Date;
  onHoldSince?: Date;

  // Principals
  createdBy: IPrincipal;
  submittedBy?: IPrincipal;
  onHoldBy?: IPrincipal;
  cancelledBy?: IPrincipal;

  // Review information
  legalReviewStatus?: LegalReviewStatus;
  legalReviewOutcome?: ReviewOutcome;
  legalReviewAssignedAttorney?: IPrincipal;
  legalReviewAssignedOn?: Date;
  legalReviewCompletedOn?: Date;

  complianceReviewStatus?: ComplianceReviewStatus;
  complianceReviewOutcome?: ReviewOutcome;
  complianceReviewCompletedOn?: Date;

  // Special status tracking
  previousStatus?: RequestStatus;
  onHoldReason?: string;
  cancelReason?: string;
}

/**
 * Progress calculation result
 */
export interface IStatusProgressData {
  /** Progress percentage (0-100) */
  progress: number;
  /** Current step number */
  currentStep: number;
  /** Total steps in workflow */
  totalSteps: number;
  /** Whether Assign Attorney step was used */
  usedAssignAttorneyStep: boolean;
  /** Color for progress bar */
  color: ProgressBarColor;
}

/**
 * Information about who/what is being waited on
 */
export interface IWaitingOnInfo {
  /** Type of entity */
  type: WaitingOnType;
  /** User ID, email, or group name */
  identifier: string;
  /** Display name */
  displayName: string;
  /** SharePoint group name (if type === 'group') */
  groupName?: string;
  /** Member count (if type === 'group') */
  memberCount?: number;
  /** IPrincipal object (if type === 'user') */
  principal?: IPrincipal;
}

/**
 * Timing information for current stage
 */
export interface IStageTimingInfo {
  /** Date entered current stage */
  stageStartDate?: Date;
  /** Days in current stage */
  daysInStage: number;
  /** Days remaining until target date */
  daysRemaining?: number;
  /** Target return date */
  targetReturnDate?: Date;
  /** Is rush request */
  isRush: boolean;
  /** Is overdue */
  isOverdue: boolean;
}

/**
 * Props for StatusProgressBar component
 */
export interface IStatusProgressBarProps {
  status: RequestStatus;
  progress: number;
  color: ProgressBarColor;
}

/**
 * Props for WaitingOnDisplay component
 */
export interface IWaitingOnDisplayProps {
  waitingOn: IWaitingOnInfo;
  webUrl: string;
}

/**
 * Props for StatusHoverCard component
 */
export interface IStatusHoverCardProps {
  itemData: IStatusListItemData;
  progressData: IStatusProgressData;
  waitingOn: IWaitingOnInfo;
  timingInfo: IStageTimingInfo;
  webUrl: string;
}

/**
 * Props for RequestStatusProgress wrapper
 */
export interface IRequestStatusProgressProps {
  itemData: IStatusListItemData;
  webUrl: string;
  listTitle: string;
}

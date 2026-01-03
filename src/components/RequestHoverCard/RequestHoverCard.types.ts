/**
 * Types for RequestHoverCard Component
 */

import type {
  RequestStatus,
  ReviewAudience,
  LegalReviewStatus,
  ComplianceReviewStatus,
  ReviewOutcome,
} from '@appTypes/workflowTypes';
import type { RequestType } from '@appTypes/requestTypes';
import type { IPrincipal } from '@appTypes/index';

/**
 * Basic request data for hover card display
 * This is the minimum data needed to show the hover card
 */
export interface IRequestHoverCardData {
  id: number;
  requestId: string;
  requestTitle: string;
  status: RequestStatus;
  requestType?: RequestType;
  reviewAudience?: ReviewAudience;
  purpose?: string;
  targetReturnDate?: Date;
  created: Date;
  createdBy?: IPrincipal;
  submissionItem?: string;

  // Optional detailed data (loaded asynchronously or provided)
  submittedBy?: IPrincipal;
  submittedOn?: Date;
  attorney?: IPrincipal;
  legalReviewStatus?: LegalReviewStatus;
  legalReviewOutcome?: ReviewOutcome;
  complianceReviewStatus?: ComplianceReviewStatus;
  complianceReviewOutcome?: ReviewOutcome;
  trackingId?: string;
  completedOn?: Date;
}

/**
 * Props for RequestHoverCard component
 */
export interface IRequestHoverCardProps {
  /** The request ID to fetch data for (if data not provided) */
  requestId: number;

  /** Optional pre-loaded data (if available, skips API call) */
  data?: Partial<IRequestHoverCardData>;

  /** Children to wrap with hover card */
  children: React.ReactNode;

  /** Whether the hover card is disabled */
  disabled?: boolean;

  /** Optional list ID for ManageAccess component */
  listId?: string;

  /** Delay before showing hover card (ms) */
  openDelay?: number;

  /** Delay before hiding hover card (ms) */
  dismissDelay?: number;
}

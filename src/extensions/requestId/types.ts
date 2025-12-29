/**
 * Types for RequestId Field Customizer Hover Card
 */

import type {
  RequestStatus,
  ReviewAudience,
  LegalReviewStatus,
  ComplianceReviewStatus,
  ReviewOutcome,
} from '../../types/workflowTypes';
import type { RequestType } from '../../types/requestTypes';
import type { IPrincipal } from '../../types';

/**
 * Request data available from list view (basic info only)
 */
export interface IRequestListItemData {
  id: number;
  requestId: string;
  status: RequestStatus;
  requestType: RequestType;
  requestTitle: string;
  purpose?: string;
  reviewAudience: ReviewAudience;
  targetReturnDate?: Date;
  created: Date;
  createdBy: IPrincipal;
  modified?: Date;
  modifiedBy?: IPrincipal;
}

/**
 * Full request data loaded on hover card expand
 * Contains status-specific information with proper user data
 */
export interface IRequestFullData extends IRequestListItemData {
  // Submission info
  submittedBy?: IPrincipal;
  submittedOn?: Date;

  // Legal review
  attorney?: IPrincipal;
  legalReviewStatus?: LegalReviewStatus;
  legalReviewOutcome?: ReviewOutcome;
  legalReviewCompletedOn?: Date;

  // Compliance review
  complianceReviewStatus?: ComplianceReviewStatus;
  complianceReviewOutcome?: ReviewOutcome;
  complianceReviewCompletedOn?: Date;

  // On Hold
  onHoldBy?: IPrincipal;
  onHoldSince?: Date;
  onHoldReason?: string;
  previousStatus?: RequestStatus;

  // Cancelled
  cancelledBy?: IPrincipal;
  cancelledOn?: Date;
  cancelReason?: string;

  // Closeout
  trackingId?: string;
  closeoutOn?: Date;

  // Completed
  completedOn?: Date;
}

/**
 * Props for Compact Card
 */
export interface IRequestCompactCardProps {
  itemData: IRequestListItemData;
  listId: string;
}

/**
 * Props for Expanded Card
 */
export interface IRequestExpandedCardProps {
  itemId: number;
  itemData: IRequestListItemData;
  webUrl: string;
  listTitle: string;
}

/**
 * Props for Hover Card wrapper
 */
export interface IRequestIdHoverCardProps {
  requestId: string;
  itemData: IRequestListItemData;
  editFormUrl: string;
  listId: string;
}

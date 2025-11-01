/**
 * Types for RequestId Field Customizer Hover Card
 */

import type { RequestStatus, ReviewAudience } from '../../types/workflowTypes';
import type { RequestType } from '../../types/requestTypes';
import type { IPrincipal } from '../../types';

/**
 * Request data available from list view
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
 * Props for Compact Card
 */
export interface IRequestCompactCardProps {
  itemData: IRequestListItemData;
  editFormUrl: string;
  webUrl: string;
  listTitle: string;
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
  webUrl: string;
  listTitle: string;
}

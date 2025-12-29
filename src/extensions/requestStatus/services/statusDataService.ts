/**
 * Status Data Service
 *
 * Loads full request data for status hover card display using CAML queries.
 * Uses renderListDataAsStream which automatically expands user/lookup fields.
 */

// spfx-toolkit - tree-shaken imports
import { createSPExtractor } from 'spfx-toolkit/lib/utilities/listItemHelper';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

// App imports using path aliases
import { renderListData } from '@services/camlQueryService';
import { Lists } from '@sp/Lists';
import { RequestsFields } from '@sp/listFields/RequestsFields';
import type { IStatusListItemData } from '../types';
import {
  RequestStatus,
  ReviewAudience,
  LegalReviewStatus,
  ComplianceReviewStatus,
  ReviewOutcome,
} from '@appTypes/workflowTypes';

/**
 * Fields to load for status hover card display
 */
const STATUS_HOVER_CARD_FIELDS = [
  // System ID fields
  RequestsFields.ID,
  RequestsFields.Created,

  // Request basic info
  RequestsFields.RequestId,
  RequestsFields.Status,
  RequestsFields.TargetReturnDate,
  RequestsFields.IsRushRequest,
  RequestsFields.RushRationale,
  RequestsFields.ReviewAudience,

  // Date tracking fields
  RequestsFields.SubmittedOn,
  RequestsFields.SubmittedToAssignAttorneyOn,
  RequestsFields.SubmittedForReviewOn,
  RequestsFields.CloseoutOn,
  RequestsFields.CancelledOn,
  RequestsFields.OnHoldSince,

  // User fields
  RequestsFields.Author,
  RequestsFields.SubmittedBy,
  RequestsFields.OnHoldBy,
  RequestsFields.CancelledBy,
  RequestsFields.Attorney,

  // Legal Review
  RequestsFields.LegalReviewStatus,
  RequestsFields.LegalReviewOutcome,
  RequestsFields.SubmittedForReviewOn,
  RequestsFields.LegalReviewCompletedOn,

  // Compliance Review
  RequestsFields.ComplianceReviewStatus,
  RequestsFields.ComplianceReviewOutcome,
  RequestsFields.ComplianceReviewCompletedOn,

  // Special status tracking
  RequestsFields.PreviousStatus,
  RequestsFields.OnHoldReason,
  RequestsFields.CancelReason,
];

/**
 * Load full status data from SharePoint using CAML query
 * renderListDataAsStream automatically expands all user/lookup fields
 */
export async function loadStatusFullData(
  itemId: number,
  listTitle: string = Lists.Requests.Title
): Promise<IStatusListItemData> {
  try {
    SPContext.logger.info('StatusHoverCard: Loading status data', { itemId });

    const item = await renderListData({
      listTitle,
      fields: STATUS_HOVER_CARD_FIELDS,
      itemId,
    });

    if (!item) {
      throw new Error(`Request with ID ${itemId} not found`);
    }

    // Map to IStatusListItemData using extractor
    const result = mapItemToStatusData(item);

    SPContext.logger.success('StatusHoverCard: Status data loaded successfully', { itemId });

    return result;
  } catch (error: unknown) {
    SPContext.logger.error('StatusHoverCard: Failed to load status data', error, { itemId, listTitle });
    throw error;
  }
}

/**
 * Map SharePoint item to IStatusListItemData using SPExtractor
 */
function mapItemToStatusData(item: Record<string, unknown>): IStatusListItemData {
  const extractor = createSPExtractor(item);

  return {
    // System fields
    id: extractor.number(RequestsFields.ID),
    requestId: extractor.string(RequestsFields.RequestId, ''),
    created: extractor.date(RequestsFields.Created) || new Date(),

    // Request basic info
    status: extractor.string(RequestsFields.Status) as RequestStatus,
    targetReturnDate: extractor.date(RequestsFields.TargetReturnDate),
    isRushRequest: extractor.boolean(RequestsFields.IsRushRequest, false),
    rushRationale: extractor.string(RequestsFields.RushRationale),
    reviewAudience: extractor.string(RequestsFields.ReviewAudience) as ReviewAudience,

    // Date tracking fields
    submittedOn: extractor.date(RequestsFields.SubmittedOn),
    submittedToAssignAttorneyOn: extractor.date(RequestsFields.SubmittedToAssignAttorneyOn),
    submittedForReviewOn: extractor.date(RequestsFields.SubmittedForReviewOn),
    closeoutOn: extractor.date(RequestsFields.CloseoutOn),
    cancelledOn: extractor.date(RequestsFields.CancelledOn),
    onHoldSince: extractor.date(RequestsFields.OnHoldSince),

    // User fields - using extractor.user() for proper extraction
    createdBy: extractor.user(RequestsFields.Author) || {
      id: '0',
      title: 'Unknown',
      email: '',
      loginName: '',
    },
    submittedBy: extractor.user(RequestsFields.SubmittedBy),
    onHoldBy: extractor.user(RequestsFields.OnHoldBy),
    cancelledBy: extractor.user(RequestsFields.CancelledBy),

    // Legal Review
    legalReviewStatus: extractor.string(RequestsFields.LegalReviewStatus) as LegalReviewStatus | undefined,
    legalReviewOutcome: extractor.string(RequestsFields.LegalReviewOutcome) as ReviewOutcome | undefined,
    legalReviewAssignedAttorney: extractor.user(RequestsFields.Attorney),
    legalReviewAssignedOn: extractor.date(RequestsFields.SubmittedForReviewOn),
    legalReviewCompletedOn: extractor.date(RequestsFields.LegalReviewCompletedOn),

    // Compliance Review
    complianceReviewStatus: extractor.string(RequestsFields.ComplianceReviewStatus) as ComplianceReviewStatus | undefined,
    complianceReviewOutcome: extractor.string(RequestsFields.ComplianceReviewOutcome) as ReviewOutcome | undefined,
    complianceReviewCompletedOn: extractor.date(RequestsFields.ComplianceReviewCompletedOn),

    // Special status tracking
    previousStatus: extractor.string(RequestsFields.PreviousStatus) as RequestStatus | undefined,
    onHoldReason: extractor.string(RequestsFields.OnHoldReason),
    cancelReason: extractor.string(RequestsFields.CancelReason),
  };
}

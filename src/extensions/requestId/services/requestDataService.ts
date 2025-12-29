/**
 * Request Data Service
 *
 * Loads full request data for hover card display using CAML queries.
 * Uses renderListDataAsStream which automatically expands user/lookup fields.
 */

// spfx-toolkit - tree-shaken imports
import { createSPExtractor } from 'spfx-toolkit/lib/utilities/listItemHelper';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

// App imports using path aliases
import { renderListData } from '@services/camlQueryService';
import { Lists } from '@sp/Lists';
import { RequestsFields } from '@sp/listFields/RequestsFields';
import type { IRequestFullData } from '../types';
import {
  RequestStatus,
  ReviewAudience,
  LegalReviewStatus,
  ComplianceReviewStatus,
  ReviewOutcome,
} from '@appTypes/workflowTypes';
import { RequestType } from '@appTypes/requestTypes';

/**
 * Fields to load for hover card display
 * Uses a single query with fields needed for status-specific content
 */
const HOVER_CARD_FIELDS = [
  // System ID fields
  RequestsFields.ID,
  RequestsFields.Created,
  RequestsFields.Modified,

  // Request basic info
  RequestsFields.RequestId,
  RequestsFields.Status,
  RequestsFields.RequestType,
  RequestsFields.RequestTitle,
  RequestsFields.Purpose,
  RequestsFields.ReviewAudience,
  RequestsFields.TargetReturnDate,

  // Submission tracking
  RequestsFields.SubmittedBy,
  RequestsFields.SubmittedOn,

  // Legal Review
  RequestsFields.Attorney,
  RequestsFields.LegalReviewStatus,
  RequestsFields.LegalReviewOutcome,
  RequestsFields.LegalReviewCompletedOn,

  // Compliance Review
  RequestsFields.ComplianceReviewStatus,
  RequestsFields.ComplianceReviewOutcome,
  RequestsFields.ComplianceReviewCompletedOn,

  // On Hold
  RequestsFields.OnHoldBy,
  RequestsFields.OnHoldSince,
  RequestsFields.OnHoldReason,
  RequestsFields.PreviousStatus,

  // Cancellation
  RequestsFields.CancelledBy,
  RequestsFields.CancelledOn,
  RequestsFields.CancelReason,

  // Closeout
  RequestsFields.TrackingId,
  RequestsFields.CloseoutOn,

  // System user fields
  RequestsFields.Author,
  RequestsFields.Editor,
];

/**
 * Load full request data from SharePoint using CAML query
 * renderListDataAsStream automatically expands all user/lookup fields
 */
export async function loadRequestFullData(
  itemId: number,
  listTitle: string = Lists.Requests.Title
): Promise<IRequestFullData> {
  try {
    SPContext.logger.info('HoverCard: Loading request data', { itemId });

    const item = await renderListData({
      listTitle,
      fields: HOVER_CARD_FIELDS,
      itemId,
    });

    if (!item) {
      throw new Error(`Request with ID ${itemId} not found`);
    }

    // Map to IRequestFullData using extractor
    const result = mapItemToRequestFullData(item);

    SPContext.logger.success('HoverCard: Request loaded successfully', { itemId });

    return result;
  } catch (error: unknown) {
    SPContext.logger.error('HoverCard: Failed to load request data', error, { itemId, listTitle });
    throw error;
  }
}

/**
 * Map SharePoint item to IRequestFullData using SPExtractor
 */
function mapItemToRequestFullData(item: Record<string, unknown>): IRequestFullData {
  const extractor = createSPExtractor(item);

  return {
    // System fields
    id: extractor.number(RequestsFields.ID),
    requestId: extractor.string(RequestsFields.RequestId, ''),
    created: extractor.date(RequestsFields.Created) || new Date(),
    modified: extractor.date(RequestsFields.Modified),

    // Request basic info
    status: extractor.string(RequestsFields.Status) as RequestStatus,
    requestType: extractor.string(RequestsFields.RequestType) as RequestType,
    requestTitle: extractor.string(RequestsFields.RequestTitle) || '',
    purpose: extractor.string(RequestsFields.Purpose),
    reviewAudience: extractor.string(RequestsFields.ReviewAudience) as ReviewAudience,
    targetReturnDate: extractor.date(RequestsFields.TargetReturnDate),

    // User fields - using extractor.user() for proper extraction
    createdBy: extractor.user(RequestsFields.Author) || {
      id: '0',
      title: 'Unknown',
      email: '',
      loginName: '',
    },
    modifiedBy: extractor.user(RequestsFields.Editor),
    submittedBy: extractor.user(RequestsFields.SubmittedBy),
    attorney: extractor.user(RequestsFields.Attorney),
    onHoldBy: extractor.user(RequestsFields.OnHoldBy),
    cancelledBy: extractor.user(RequestsFields.CancelledBy),

    // Submission tracking
    submittedOn: extractor.date(RequestsFields.SubmittedOn),

    // Legal Review
    legalReviewStatus: extractor.string(RequestsFields.LegalReviewStatus) as LegalReviewStatus | undefined,
    legalReviewOutcome: extractor.string(RequestsFields.LegalReviewOutcome) as ReviewOutcome | undefined,
    legalReviewCompletedOn: extractor.date(RequestsFields.LegalReviewCompletedOn),

    // Compliance Review
    complianceReviewStatus: extractor.string(RequestsFields.ComplianceReviewStatus) as ComplianceReviewStatus | undefined,
    complianceReviewOutcome: extractor.string(RequestsFields.ComplianceReviewOutcome) as ReviewOutcome | undefined,
    complianceReviewCompletedOn: extractor.date(RequestsFields.ComplianceReviewCompletedOn),

    // On Hold
    onHoldSince: extractor.date(RequestsFields.OnHoldSince),
    onHoldReason: extractor.string(RequestsFields.OnHoldReason),
    previousStatus: extractor.string(RequestsFields.PreviousStatus) as RequestStatus | undefined,

    // Cancellation
    cancelledOn: extractor.date(RequestsFields.CancelledOn),
    cancelReason: extractor.string(RequestsFields.CancelReason),

    // Closeout
    trackingId: extractor.string(RequestsFields.TrackingId),
    closeoutOn: extractor.date(RequestsFields.CloseoutOn),
  };
}

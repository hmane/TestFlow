/**
 * Request Load Service
 *
 * Handles loading legal request data using CAML queries with renderListDataAsStream.
 * Uses 2 parallel queries to load all 74 fields efficiently.
 *
 * Query 1: Request Info + Approvals (~37 fields, 11 user/lookup fields)
 * Query 2: Reviews + System Tracking (~37 fields, 8 user/lookup fields)
 *
 * renderListDataAsStream automatically expands all user and lookup fields without
 * the 12-field expansion limit of standard REST queries.
 */

import { createSPExtractor } from 'spfx-toolkit/lib/utilities/listItemHelper';
import { SPContext } from 'spfx-toolkit';

import { Lists } from '@sp/Lists';
import { RequestsFields } from '@sp/listFields/RequestsFields';
import { renderListData } from './camlQueryService';

import type { ILegalRequest, RequestType, SubmissionType, DistributionMethod } from '@appTypes/requestTypes';
import {
  RequestStatus,
  ReviewAudience,
  LegalReviewStatus,
  ComplianceReviewStatus,
  ReviewOutcome,
} from '@appTypes/workflowTypes';

// Type aliases for review outcomes
type LegalReviewOutcome = ReviewOutcome;
type ComplianceReviewOutcome = ReviewOutcome;

/**
 * Fields for Query 1: Request Info + Approvals
 * Includes 11 user/lookup fields (within 12 limit):
 * - Author, Editor, SubmittedBy (system)
 * - CommunicationsApprover, PortfolioManager, ResearchAnalyst, SubjectMatterExpert, PerformanceApprover, OtherApproval (approvals)
 * - PriorSubmissions (lookup multi), AdditionalParty (user multi)
 */
const QUERY1_FIELDS = [
  // System ID fields
  RequestsFields.ID,
  RequestsFields.ContentType,
  RequestsFields.Created,
  RequestsFields.Modified,

  // Request basic info
  RequestsFields.RequestId,
  RequestsFields.Status,
  RequestsFields.RequestType,
  RequestsFields.RequestTitle,
  RequestsFields.Purpose,
  RequestsFields.Department,
  RequestsFields.SubmissionType,
  RequestsFields.SubmissionItem,
  RequestsFields.TargetReturnDate,
  RequestsFields.ReviewAudience,
  RequestsFields.IsRushRequest,
  RequestsFields.RushRationale,
  RequestsFields.DistributionMethod,
  RequestsFields.DateOfFirstUse,
  RequestsFields.PriorSubmissionNotes,
  RequestsFields.TotalTurnaroundDays,
  RequestsFields.ExpectedTurnaroundDate,

  // Submission tracking
  RequestsFields.SubmittedBy,
  RequestsFields.SubmittedOn,

  // Approval fields - boolean flags
  RequestsFields.RequiresCommunicationsApproval,
  RequestsFields.HasPortfolioManagerApproval,
  RequestsFields.HasResearchAnalystApproval,
  RequestsFields.HasSMEApproval,
  RequestsFields.HasPerformanceApproval,
  RequestsFields.HasOtherApproval,

  // Approval fields - dates
  RequestsFields.CommunicationsApprovalDate,
  RequestsFields.PortfolioManagerApprovalDate,
  RequestsFields.ResearchAnalystApprovalDate,
  RequestsFields.SMEApprovalDate,
  RequestsFields.PerformanceApprovalDate,
  RequestsFields.OtherApprovalDate,

  // Approval fields - approvers (user fields)
  RequestsFields.CommunicationsApprover,
  RequestsFields.PortfolioManager,
  RequestsFields.ResearchAnalyst,
  RequestsFields.SubjectMatterExpert,
  RequestsFields.PerformanceApprover,
  RequestsFields.OtherApproval,
  RequestsFields.OtherApprovalTitle,

  // Lookups
  RequestsFields.PriorSubmissions,
  RequestsFields.AdditionalParty,

  // System user fields
  RequestsFields.Author,
  RequestsFields.Editor,
];

/**
 * Fields for Query 2: Reviews + System Tracking
 * Includes 8 user/lookup fields (within 12 limit):
 * - Attorney, LegalStatusUpdatedBy, ComplianceStatusUpdatedBy
 * - SubmittedForReviewBy, SubmittedToAssignAttorneyBy, CloseoutBy, CancelledBy, OnHoldBy
 */
const QUERY2_FIELDS = [
  // System ID (needed for merge)
  RequestsFields.ID,

  // Legal Review
  RequestsFields.Attorney,
  RequestsFields.AttorneyAssignNotes,
  RequestsFields.LegalReviewStatus,
  RequestsFields.LegalReviewOutcome,
  RequestsFields.LegalReviewNotes,
  RequestsFields.LegalStatusUpdatedBy,
  RequestsFields.LegalStatusUpdatedOn,

  // Compliance Review
  RequestsFields.ComplianceReviewStatus,
  RequestsFields.ComplianceReviewOutcome,
  RequestsFields.ComplianceReviewNotes,
  RequestsFields.IsForesideReviewRequired,
  RequestsFields.IsRetailUse,
  RequestsFields.ComplianceStatusUpdatedBy,
  RequestsFields.ComplianceStatusUpdatedOn,

  // Closeout
  RequestsFields.TrackingId,
  RequestsFields.CloseoutBy,
  RequestsFields.CloseoutOn,

  // Cancellation
  RequestsFields.CancelledBy,
  RequestsFields.CancelledOn,
  RequestsFields.CancelReason,

  // On Hold
  RequestsFields.OnHoldBy,
  RequestsFields.OnHoldSince,
  RequestsFields.OnHoldReason,

  // System tracking
  RequestsFields.PreviousStatus,
  RequestsFields.SubmittedForReviewBy,
  RequestsFields.SubmittedForReviewOn,
  RequestsFields.SubmittedToAssignAttorneyBy,
  RequestsFields.SubmittedToAssignAttorneyOn,
];

/**
 * Load a request by ID using 2 parallel CAML queries
 *
 * Executes 2 renderListDataAsStream queries in parallel to load all 74 fields.
 * renderListDataAsStream automatically expands ALL user and lookup fields without
 * the 12-field expansion limit of standard REST queries.
 *
 * @param itemId - Request list item ID
 * @returns Promise resolving to complete ILegalRequest object
 * @throws Error if item not found or access denied
 */
export async function loadRequestById(itemId: number): Promise<ILegalRequest> {
  try {
    SPContext.logger.info('RequestLoadService: Loading request via renderListDataAsStream', { itemId });

    // Execute both queries in parallel using renderListDataAsStream
    const [query1Result, query2Result] = await Promise.all([
      renderListData({
        listTitle: Lists.Requests.Title,
        fields: QUERY1_FIELDS,
        itemId,
      }),
      renderListData({
        listTitle: Lists.Requests.Title,
        fields: QUERY2_FIELDS,
        itemId,
      }),
    ]);

    // Check if both queries returned data
    if (!query1Result || !query2Result) {
      throw new Error(`Request with ID ${itemId} not found`);
    }

    // Merge the two responses
    const mergedItem = {
      ...query1Result,
      ...query2Result,
    };

    // Map to ILegalRequest using extractor
    const request = mapRequestListItemToRequest(mergedItem);

    SPContext.logger.success('RequestLoadService: Request loaded successfully', { itemId });

    return request;

  } catch (error: unknown) {
    SPContext.logger.error('RequestLoadService: Failed to load request', error, { itemId });
    throw error; // Re-throw without wrapping to avoid nested error messages
  }
}

/**
 * Maps SharePoint list item (from PnP query) to ILegalRequest object
 *
 * Uses spfx-toolkit's createSPExtractor for type-safe field extraction.
 * renderListDataAsStream returns fully expanded user and lookup fields.
 *
 * @param item - Raw item from renderListDataAsStream (merged from both queries)
 * @returns Mapped ILegalRequest object
 */
export function mapRequestListItemToRequest(item: any): ILegalRequest {
  const extractor = createSPExtractor(item);

  return {
    // System fields
    id: extractor.number(RequestsFields.ID),
    requestId: extractor.string(RequestsFields.RequestId, ''),
    created: extractor.date(RequestsFields.Created),
    modified: extractor.date(RequestsFields.Modified),
    author: extractor.user(RequestsFields.Author),
    editor: extractor.user(RequestsFields.Editor),

    // Request basic info
    status: extractor.string(RequestsFields.Status) as RequestStatus,
    requestType: extractor.string(RequestsFields.RequestType) as RequestType,
    requestTitle: extractor.string(RequestsFields.RequestTitle),
    purpose: extractor.string(RequestsFields.Purpose),
    department: extractor.string(RequestsFields.Department),
    submissionType: extractor.string(RequestsFields.SubmissionType) as SubmissionType,
    submissionItem: extractor.string(RequestsFields.SubmissionItem),
    targetReturnDate: extractor.date(RequestsFields.TargetReturnDate),
    reviewAudience: extractor.string(RequestsFields.ReviewAudience) as ReviewAudience,
    isRushRequest: extractor.boolean(RequestsFields.IsRushRequest, false),
    rushRationale: extractor.string(RequestsFields.RushRationale),

    // Distribution info
    distributionMethod: extractor.multiChoice(RequestsFields.DistributionMethod) as DistributionMethod[],
    dateOfFirstUse: extractor.date(RequestsFields.DateOfFirstUse),

    // Prior submissions
    priorSubmissions: extractor.lookupMulti(RequestsFields.PriorSubmissions),
    priorSubmissionNotes: extractor.string(RequestsFields.PriorSubmissionNotes),

    // Additional parties
    additionalParty: extractor.userMulti(RequestsFields.AdditionalParty) || [],

    // Submission tracking
    submittedBy: extractor.user(RequestsFields.SubmittedBy),
    submittedOn: extractor.date(RequestsFields.SubmittedOn),

    // Turnaround time
    totalTurnaroundDays: extractor.number(RequestsFields.TotalTurnaroundDays),
    expectedTurnaroundDate: extractor.date(RequestsFields.ExpectedTurnaroundDate),

    // Approvals - Communications
    requiresCommunicationsApproval: extractor.boolean(RequestsFields.RequiresCommunicationsApproval, false),
    communicationsApprovalDate: extractor.date(RequestsFields.CommunicationsApprovalDate),
    communicationsApprover: extractor.user(RequestsFields.CommunicationsApprover),

    // Approvals - Portfolio Manager
    hasPortfolioManagerApproval: extractor.boolean(RequestsFields.HasPortfolioManagerApproval, false),
    portfolioManagerApprovalDate: extractor.date(RequestsFields.PortfolioManagerApprovalDate),
    portfolioManager: extractor.user(RequestsFields.PortfolioManager),

    // Approvals - Research Analyst
    hasResearchAnalystApproval: extractor.boolean(RequestsFields.HasResearchAnalystApproval, false),
    researchAnalystApprovalDate: extractor.date(RequestsFields.ResearchAnalystApprovalDate),
    researchAnalyst: extractor.user(RequestsFields.ResearchAnalyst),

    // Approvals - SME
    hasSMEApproval: extractor.boolean(RequestsFields.HasSMEApproval, false),
    smeApprovalDate: extractor.date(RequestsFields.SMEApprovalDate),
    subjectMatterExpert: extractor.user(RequestsFields.SubjectMatterExpert),

    // Approvals - Performance
    hasPerformanceApproval: extractor.boolean(RequestsFields.HasPerformanceApproval, false),
    performanceApprovalDate: extractor.date(RequestsFields.PerformanceApprovalDate),
    performanceApprover: extractor.user(RequestsFields.PerformanceApprover),

    // Approvals - Other
    hasOtherApproval: extractor.boolean(RequestsFields.HasOtherApproval, false),
    otherApprovalDate: extractor.date(RequestsFields.OtherApprovalDate),
    otherApproval: extractor.user(RequestsFields.OtherApproval),
    otherApprovalTitle: extractor.string(RequestsFields.OtherApprovalTitle),

    // Legal Review
    attorney: extractor.user(RequestsFields.Attorney),
    attorneyAssignNotes: extractor.string(RequestsFields.AttorneyAssignNotes),
    legalReviewStatus: extractor.string(RequestsFields.LegalReviewStatus) as LegalReviewStatus,
    legalReviewOutcome: extractor.string(RequestsFields.LegalReviewOutcome) as LegalReviewOutcome,
    legalReviewNotes: extractor.string(RequestsFields.LegalReviewNotes),
    legalStatusUpdatedBy: extractor.user(RequestsFields.LegalStatusUpdatedBy),
    legalStatusUpdatedOn: extractor.date(RequestsFields.LegalStatusUpdatedOn),

    // Compliance Review
    complianceReviewStatus: extractor.string(RequestsFields.ComplianceReviewStatus) as ComplianceReviewStatus,
    complianceReviewOutcome: extractor.string(RequestsFields.ComplianceReviewOutcome) as ComplianceReviewOutcome,
    complianceReviewNotes: extractor.string(RequestsFields.ComplianceReviewNotes),
    isForesideReviewRequired: extractor.boolean(RequestsFields.IsForesideReviewRequired, false),
    isRetailUse: extractor.boolean(RequestsFields.IsRetailUse, false),
    complianceStatusUpdatedBy: extractor.user(RequestsFields.ComplianceStatusUpdatedBy),
    complianceStatusUpdatedOn: extractor.date(RequestsFields.ComplianceStatusUpdatedOn),

    // Closeout
    trackingId: extractor.string(RequestsFields.TrackingId),
    closeoutBy: extractor.user(RequestsFields.CloseoutBy),
    closeoutOn: extractor.date(RequestsFields.CloseoutOn),

    // Cancellation
    cancelledBy: extractor.user(RequestsFields.CancelledBy),
    cancelledOn: extractor.date(RequestsFields.CancelledOn),
    cancelReason: extractor.string(RequestsFields.CancelReason),

    // On Hold
    onHoldBy: extractor.user(RequestsFields.OnHoldBy),
    onHoldSince: extractor.date(RequestsFields.OnHoldSince),
    onHoldReason: extractor.string(RequestsFields.OnHoldReason),

    // System tracking
    previousStatus: extractor.string(RequestsFields.PreviousStatus) as RequestStatus,
    submittedForReviewBy: extractor.user(RequestsFields.SubmittedForReviewBy),
    submittedForReviewOn: extractor.date(RequestsFields.SubmittedForReviewOn),
    submittedToAssignAttorneyBy: extractor.user(RequestsFields.SubmittedToAssignAttorneyBy),
    submittedToAssignAttorneyOn: extractor.date(RequestsFields.SubmittedToAssignAttorneyOn),
  };
}

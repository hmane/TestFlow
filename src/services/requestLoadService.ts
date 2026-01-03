/**
 * Request Load Service
 *
 * Handles loading legal request data using CAML queries with renderListDataAsStream.
 * Uses 2 parallel queries to load all 82 fields efficiently.
 *
 * Query 1: Request Info + Approvals (~37 fields, 11 user/lookup fields)
 * Query 2: Reviews + System Tracking + Time Tracking (~45 fields, 10 user/lookup fields)
 *
 * renderListDataAsStream automatically expands all user and lookup fields without
 * the 12-field expansion limit of standard REST queries.
 */

import { createSPExtractor } from 'spfx-toolkit/lib/utilities/listItemHelper';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

import { Lists } from '@sp/Lists';
import { RequestsFields } from '@sp/listFields/RequestsFields';
import { renderListData } from './camlQueryService';

import type { ILegalRequest, RequestType, SubmissionType, DistributionMethod } from '@appTypes/requestTypes';
import {
  FINRAAudienceCategory,
  Audience,
  USFunds,
  UCITS,
  SeparateAcctStrategies,
  SeparateAcctStrategiesIncl,
} from '@appTypes/requestTypes';
import {
  RequestStatus,
  ReviewAudience,
  LegalReviewStatus,
  ComplianceReviewStatus,
  ReviewOutcome,
} from '@appTypes/workflowTypes';
import { ApprovalType, type Approval } from '@appTypes/approvalTypes';

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

  // FINRA Audience & Product Fields
  RequestsFields.FINRAAudienceCategory,
  RequestsFields.Audience,
  RequestsFields.USFunds,
  RequestsFields.UCITS,
  RequestsFields.SeparateAcctStrategies,
  RequestsFields.SeparateAcctStrategiesIncl,

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

  // Approval fields - notes
  RequestsFields.CommunicationsApprovalNotes,
  RequestsFields.PortfolioMgrApprovalNotes,
  RequestsFields.ResearchAnalystApprovalNotes,
  RequestsFields.SMEApprovalNotes,
  RequestsFields.PerformanceApprovalNotes,
  RequestsFields.OtherApprovalNotes,

  // Lookups
  RequestsFields.PriorSubmissions,
  RequestsFields.AdditionalParty,

  // System user fields
  RequestsFields.Author,
  RequestsFields.Editor,
];

/**
 * Fields for Query 2: Reviews + System Tracking + Time Tracking
 * Includes 10 user/lookup fields (within 12 limit):
 * - Attorney, LegalStatusUpdatedBy, LegalReviewCompletedBy, ComplianceStatusUpdatedBy, ComplianceReviewCompletedBy
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
  RequestsFields.LegalReviewCompletedOn,
  RequestsFields.LegalReviewCompletedBy,

  // Compliance Review
  RequestsFields.ComplianceReviewStatus,
  RequestsFields.ComplianceReviewOutcome,
  RequestsFields.ComplianceReviewNotes,
  RequestsFields.IsForesideReviewRequired,
  RequestsFields.IsRetailUse,
  RequestsFields.ComplianceStatusUpdatedBy,
  RequestsFields.ComplianceStatusUpdatedOn,
  RequestsFields.ComplianceReviewCompletedOn,
  RequestsFields.ComplianceReviewCompletedBy,

  // Closeout
  RequestsFields.TrackingId,
  RequestsFields.CloseoutNotes,
  RequestsFields.CloseoutBy,
  RequestsFields.CloseoutOn,
  RequestsFields.CommentsAcknowledged,
  RequestsFields.CommentsAcknowledgedOn,

  // Foreside Documents
  RequestsFields.ForesideCompletedBy,
  RequestsFields.ForesideCompletedOn,
  RequestsFields.ForesideNotes,
  RequestsFields.AwaitingForesideSince,

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

  // Time Tracking - Legal Intake (2 fields)
  RequestsFields.LegalIntakeLegalAdminHours,
  RequestsFields.LegalIntakeSubmitterHours,

  // Time Tracking - Legal Review (2 fields)
  RequestsFields.LegalReviewAttorneyHours,
  RequestsFields.LegalReviewSubmitterHours,

  // Time Tracking - Compliance Review (2 fields)
  RequestsFields.ComplianceReviewReviewerHours,
  RequestsFields.ComplianceReviewSubmitterHours,

  // Time Tracking - Closeout (2 fields)
  RequestsFields.CloseoutReviewerHours,
  RequestsFields.CloseoutSubmitterHours,

  // Time Tracking - Totals (2 fields)
  RequestsFields.TotalReviewerHours,
  RequestsFields.TotalSubmitterHours,
];

/**
 * Load a request by ID using 2 parallel CAML queries
 *
 * Executes 2 renderListDataAsStream queries in parallel to load all 82 fields.
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
 * Build approvals array from individual SharePoint approval fields
 *
 * Each approval type is stored as separate fields in SharePoint.
 * This function reconstructs the approvals array from those individual fields.
 *
 * IMPORTANT: Adds approval to array if boolean flag is true, regardless of data completeness.
 * - If approver is null/empty, uses empty approver object (for draft mode)
 * - This allows the approval section to render even if not fully filled in
 * - Matches the save behavior which saves partial approval data
 *
 * @param extractor - SPExtractor for the SharePoint item
 * @returns Array of Approval objects
 */
function buildApprovalsArrayFromFields(extractor: ReturnType<typeof createSPExtractor>): Approval[] {
  const approvals: Approval[] = [];

  // Communications approval
  const requiresCommApproval = extractor.boolean(RequestsFields.RequiresCommunicationsApproval, false);
  if (requiresCommApproval) {
    const commApprover = extractor.user(RequestsFields.CommunicationsApprover);
    const commDate = extractor.date(RequestsFields.CommunicationsApprovalDate);
    const commNotes = extractor.string(RequestsFields.CommunicationsApprovalNotes);
    // Add approval to array if boolean is true (even if approver is empty - draft mode)
    approvals.push({
      type: ApprovalType.Communications,
      approver: commApprover || { id: '', email: '', title: '' },
      approvalDate: commDate,
      documentId: '', // Documents are loaded separately
      notes: commNotes || '',
    } as any);
  }

  // Portfolio Manager approval
  const hasPortfolioMgrApproval = extractor.boolean(RequestsFields.HasPortfolioManagerApproval, false);
  if (hasPortfolioMgrApproval) {
    const pmApprover = extractor.user(RequestsFields.PortfolioManager);
    const pmDate = extractor.date(RequestsFields.PortfolioManagerApprovalDate);
    const pmNotes = extractor.string(RequestsFields.PortfolioMgrApprovalNotes);

    approvals.push({
      type: ApprovalType.PortfolioManager,
      approver: pmApprover || { id: '', email: '', title: '' },
      approvalDate: pmDate,
      documentId: '',
      notes: pmNotes || '',
    } as any);
  }

  // Research Analyst approval
  const hasResearchAnalystApproval = extractor.boolean(RequestsFields.HasResearchAnalystApproval, false);
  if (hasResearchAnalystApproval) {
    const raApprover = extractor.user(RequestsFields.ResearchAnalyst);
    const raDate = extractor.date(RequestsFields.ResearchAnalystApprovalDate);
    const raNotes = extractor.string(RequestsFields.ResearchAnalystApprovalNotes);

    approvals.push({
      type: ApprovalType.ResearchAnalyst,
      approver: raApprover || { id: '', email: '', title: '' },
      approvalDate: raDate,
      documentId: '',
      notes: raNotes || '',
    } as any);
  }

  // SME approval
  const hasSMEApproval = extractor.boolean(RequestsFields.HasSMEApproval, false);
  if (hasSMEApproval) {
    const smeApprover = extractor.user(RequestsFields.SubjectMatterExpert);
    const smeDate = extractor.date(RequestsFields.SMEApprovalDate);
    const smeNotes = extractor.string(RequestsFields.SMEApprovalNotes);

    approvals.push({
      type: ApprovalType.SubjectMatterExpert,
      approver: smeApprover || { id: '', email: '', title: '' },
      approvalDate: smeDate,
      documentId: '',
      notes: smeNotes || '',
    } as any);
  }

  // Performance approval
  const hasPerformanceApproval = extractor.boolean(RequestsFields.HasPerformanceApproval, false);
  if (hasPerformanceApproval) {
    const perfApprover = extractor.user(RequestsFields.PerformanceApprover);
    const perfDate = extractor.date(RequestsFields.PerformanceApprovalDate);
    const perfNotes = extractor.string(RequestsFields.PerformanceApprovalNotes);

    approvals.push({
      type: ApprovalType.Performance,
      approver: perfApprover || { id: '', email: '', title: '' },
      approvalDate: perfDate,
      documentId: '',
      notes: perfNotes || '',
    } as any);
  }

  // Other approval
  const hasOtherApproval = extractor.boolean(RequestsFields.HasOtherApproval, false);
  if (hasOtherApproval) {
    const otherApprover = extractor.user(RequestsFields.OtherApproval);
    const otherDate = extractor.date(RequestsFields.OtherApprovalDate);
    const otherTitle = extractor.string(RequestsFields.OtherApprovalTitle);
    const otherNotes = extractor.string(RequestsFields.OtherApprovalNotes);

    approvals.push({
      type: ApprovalType.Other,
      approver: otherApprover || { id: '', email: '', title: '' },
      approvalDate: otherDate,
      documentId: '',
      notes: otherNotes || '',
      approvalTitle: otherTitle || '',
    } as any);
  }

  return approvals;
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

    // Prior submissions - renderListDataAsStream returns lookupId/lookupValue format
    priorSubmissions: (() => {
      const raw = extractor.raw[RequestsFields.PriorSubmissions];
      if (!Array.isArray(raw) || raw.length === 0) return [];

      // renderListDataAsStream returns: { lookupId: number, lookupValue: string, ... }
      // Map to SPLookup format: { id: number, title: string }
      return raw
        .map((item: any) => ({
          id: item.lookupId || item.ID || item.id,
          title: item.lookupValue || item.Title || item.title || '',
        }))
        .filter((lookup: any) => lookup.id !== undefined);
    })(),
    priorSubmissionNotes: extractor.string(RequestsFields.PriorSubmissionNotes),

    // Additional parties
    additionalParty: extractor.userMulti(RequestsFields.AdditionalParty) || [],

    // FINRA Audience & Product Fields
    finraAudienceCategory: (extractor.multiChoice(RequestsFields.FINRAAudienceCategory) || []) as FINRAAudienceCategory[],
    audience: (extractor.multiChoice(RequestsFields.Audience) || []) as Audience[],
    usFunds: (extractor.multiChoice(RequestsFields.USFunds) || []) as USFunds[],
    ucits: (extractor.multiChoice(RequestsFields.UCITS) || []) as UCITS[],
    separateAcctStrategies: (extractor.multiChoice(RequestsFields.SeparateAcctStrategies) || []) as SeparateAcctStrategies[],
    separateAcctStrategiesIncl: (extractor.multiChoice(RequestsFields.SeparateAcctStrategiesIncl) || []) as SeparateAcctStrategiesIncl[],

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
    legalReviewCompletedOn: extractor.date(RequestsFields.LegalReviewCompletedOn),
    legalReviewCompletedBy: extractor.user(RequestsFields.LegalReviewCompletedBy),

    // Compliance Review
    complianceReviewStatus: extractor.string(RequestsFields.ComplianceReviewStatus) as ComplianceReviewStatus,
    complianceReviewOutcome: extractor.string(RequestsFields.ComplianceReviewOutcome) as ComplianceReviewOutcome,
    complianceReviewNotes: extractor.string(RequestsFields.ComplianceReviewNotes),
    isForesideReviewRequired: extractor.boolean(RequestsFields.IsForesideReviewRequired, false),
    isRetailUse: extractor.boolean(RequestsFields.IsRetailUse, false),
    complianceStatusUpdatedBy: extractor.user(RequestsFields.ComplianceStatusUpdatedBy),
    complianceStatusUpdatedOn: extractor.date(RequestsFields.ComplianceStatusUpdatedOn),
    complianceReviewCompletedOn: extractor.date(RequestsFields.ComplianceReviewCompletedOn),
    complianceReviewCompletedBy: extractor.user(RequestsFields.ComplianceReviewCompletedBy),

    // Closeout
    trackingId: extractor.string(RequestsFields.TrackingId),
    closeoutNotes: extractor.string(RequestsFields.CloseoutNotes),
    closeoutBy: extractor.user(RequestsFields.CloseoutBy),
    closeoutOn: extractor.date(RequestsFields.CloseoutOn),
    commentsAcknowledged: extractor.boolean(RequestsFields.CommentsAcknowledged, false),
    commentsAcknowledgedOn: extractor.date(RequestsFields.CommentsAcknowledgedOn),

    // Foreside Documents
    foresideCompletedBy: extractor.user(RequestsFields.ForesideCompletedBy),
    foresideCompletedOn: extractor.date(RequestsFields.ForesideCompletedOn),
    foresideNotes: extractor.string(RequestsFields.ForesideNotes),
    awaitingForesideSince: extractor.date(RequestsFields.AwaitingForesideSince),

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

    // Time Tracking - Legal Intake
    legalIntakeLegalAdminHours: extractor.number(RequestsFields.LegalIntakeLegalAdminHours),
    legalIntakeSubmitterHours: extractor.number(RequestsFields.LegalIntakeSubmitterHours),

    // Time Tracking - Legal Review
    legalReviewAttorneyHours: extractor.number(RequestsFields.LegalReviewAttorneyHours),
    legalReviewSubmitterHours: extractor.number(RequestsFields.LegalReviewSubmitterHours),

    // Time Tracking - Compliance Review
    complianceReviewReviewerHours: extractor.number(RequestsFields.ComplianceReviewReviewerHours),
    complianceReviewSubmitterHours: extractor.number(RequestsFields.ComplianceReviewSubmitterHours),

    // Time Tracking - Closeout
    closeoutReviewerHours: extractor.number(RequestsFields.CloseoutReviewerHours),
    closeoutSubmitterHours: extractor.number(RequestsFields.CloseoutSubmitterHours),

    // Time Tracking - Totals
    totalReviewerHours: extractor.number(RequestsFields.TotalReviewerHours),
    totalSubmitterHours: extractor.number(RequestsFields.TotalSubmitterHours),

    // Approvals array - build from individual SharePoint fields
    approvals: buildApprovalsArrayFromFields(extractor),

    // Nested review objects (for component compatibility)
    legalReview: {
      status: extractor.string(RequestsFields.LegalReviewStatus) as LegalReviewStatus || LegalReviewStatus.NotStarted,
      outcome: extractor.string(RequestsFields.LegalReviewOutcome) as ReviewOutcome,
      reviewNotes: extractor.string(RequestsFields.LegalReviewNotes),
      statusUpdatedBy: extractor.user(RequestsFields.LegalStatusUpdatedBy),
      statusUpdatedOn: extractor.date(RequestsFields.LegalStatusUpdatedOn),
      assignedAttorney: extractor.user(RequestsFields.Attorney),
      assignedOn: extractor.date(RequestsFields.SubmittedForReviewOn),
      completedOn: extractor.date(RequestsFields.LegalReviewCompletedOn),
    },
    complianceReview: {
      status: extractor.string(RequestsFields.ComplianceReviewStatus) as ComplianceReviewStatus || ComplianceReviewStatus.NotStarted,
      outcome: extractor.string(RequestsFields.ComplianceReviewOutcome) as ReviewOutcome,
      reviewNotes: extractor.string(RequestsFields.ComplianceReviewNotes),
      statusUpdatedBy: extractor.user(RequestsFields.ComplianceStatusUpdatedBy),
      statusUpdatedOn: extractor.date(RequestsFields.ComplianceStatusUpdatedOn),
      isForesideReviewRequired: extractor.boolean(RequestsFields.IsForesideReviewRequired, false),
      isRetailUse: extractor.boolean(RequestsFields.IsRetailUse, false),
      completedOn: extractor.date(RequestsFields.ComplianceReviewCompletedOn),
    },
  };
}

/**
 * Core request types for legal review requests
 */

import type { IPrincipal, SPLookup } from 'spfx-toolkit/lib/types';
import type { Approval } from './approvalTypes';
import type { IRequestDocument } from './documentTypes';
import type { IComplianceReview, ILegalReview } from './reviewTypes';
import type { RequestStatus, ReviewAudience } from './workflowTypes';

/**
 * Time tracking owner types
 * Represents who currently owns the request at a given stage
 */
export type TimeTrackingOwner = 'Attorney' | 'Reviewer' | 'Submitter';

/**
 * Time tracking stage types
 * Represents the workflow stages where time is tracked separately
 */
export type TimeTrackingStage = 'LegalIntake' | 'LegalReview' | 'ComplianceReview' | 'Closeout';

/**
 * Request type options
 */
export enum RequestType {
  Communication = 'Communication',
  GeneralReview = 'General Review',
  IMAReview = 'IMA Review',
}

/**
 * Submission type options
 */
export enum SubmissionType {
  New = 'New',
  MaterialUpdates = 'Material Updates',
}

/**
 * Distribution methods for communications
 */
export enum DistributionMethod {
  DodgeCoxWebsiteUS = 'Dodge & Cox Website - U.S.',
  DodgeCoxWebsiteNonUS = 'Dodge & Cox Website - Non-U.S.',
  ThirdPartyWebsite = 'Third Party Website',
  EmailMail = 'Email / Mail',
  MobileApp = 'Mobile App',
  DisplayCardSignage = 'Display Card / Signage',
  Hangout = 'Hangout',
  LiveTalkingPoints = 'Live - Talking Points',
  SocialMedia = 'Social Media',
}

/**
 * FINRA Audience Category options
 */
export enum FINRAAudienceCategory {
  Institutional = 'Institutional',
  RetailPublic = 'Retail / Public',
}

/**
 * Audience options
 */
export enum Audience {
  ProspectiveSeparateAcctClient = 'Prospective Separate Acct Client',
  ExistingSeparateAcctClient = 'Existing Separate Acct Client',
  ProspectiveFundShareholder = 'Prospective Fund Shareholder',
  ExistingFundShareholder = 'Existing Fund Shareholder',
  Consultant = 'Consultant',
  Other = 'Other',
}

/**
 * U.S. Funds options
 */
export enum USFunds {
  AllFunds = 'All Funds',
  BalancedFund = 'Balanced Fund',
  EMStockFund = 'EM Stock Fund',
  GlobalStockFund = 'Global Stock Fund',
  IncomeFund = 'Income Fund',
  InternationalStockFund = 'International Stock Fund',
  StockFund = 'Stock Fund',
  GlobalBondFundIShares = 'Global Bond Fund (I Shares)',
  GlobalBondFundXShares = 'Global Bond Fund (X Shares)',
}

/**
 * UCITS options
 */
export enum UCITS {
  AllUCITSFunds = 'All UCITS Funds',
  EMStockFund = 'EM Stock Fund',
  GlobalBondFund = 'Global Bond Fund',
  GlobalStockFund = 'Global Stock Fund',
  USStockFund = 'U.S. Stock Fund',
}

/**
 * Separate Account Strategies options
 * SharePoint field name: SeparateAcctStrategies (32 char limit)
 */
export enum SeparateAcctStrategies {
  AllSeparateAccountStrategies = 'All Separate Account Strategies',
  Equity = 'Equity',
  FixedIncome = 'Fixed Income',
  Balanced = 'Balanced',
}

/**
 * Separate Account Strategies Includes options
 * SharePoint field name: SeparateAcctStrategiesIncl (32 char limit)
 */
export enum SeparateAcctStrategiesIncl {
  ClientRelatedDataOnly = 'Client-related data only',
  RepresentativeAccount = 'Representative account',
  CompositeData = 'Composite data',
}

/**
 * Main request interface - represents a legal review request
 */
export interface ILegalRequest {
  // System fields
  id?: number;
  requestId: string; // CRR-YYYY-### format
  status: RequestStatus;
  created?: Date;
  modified?: Date;
  author?: IPrincipal;
  editor?: IPrincipal;

  // Request information
  department?: string;
  requestType: RequestType;
  requestTitle: string;
  purpose: string;
  submissionType: SubmissionType;
  submissionItem: string; // Changed from SPLookup to string
  submissionItemOther?: string; // Custom value when "Other" is selected
  distributionMethod?: DistributionMethod[];
  targetReturnDate?: Date;
  isRushRequest: boolean;
  rushRationale?: string;
  reviewAudience: ReviewAudience;
  priorSubmissions?: SPLookup[];
  priorSubmissionNotes?: string;
  dateOfFirstUse?: Date;
additionalParty?: IPrincipal[];
  totalTurnaroundDays?: number;
  expectedTurnaroundDate?: Date;

  // FINRA Audience & Product Fields
  finraAudienceCategory?: FINRAAudienceCategory[];
  audience?: Audience[];
  usFunds?: USFunds[];
  ucits?: UCITS[];
  separateAcctStrategies?: SeparateAcctStrategies[];
  separateAcctStrategiesIncl?: SeparateAcctStrategiesIncl[];

  // Approvals - Communications
  requiresCommunicationsApproval: boolean;
  communicationsApprovalDate?: Date;
communicationsApprover?: IPrincipal;

  // Approvals - Portfolio Manager
  hasPortfolioManagerApproval: boolean;
  portfolioManagerApprovalDate?: Date;
  portfolioManager?: IPrincipal;

  // Approvals - Research Analyst
  hasResearchAnalystApproval: boolean;
  researchAnalystApprovalDate?: Date;
  researchAnalyst?: IPrincipal;

  // Approvals - SME
  hasSMEApproval: boolean;
  smeApprovalDate?: Date;
  subjectMatterExpert?: IPrincipal;

  // Approvals - Performance
  hasPerformanceApproval: boolean;
  performanceApprovalDate?: Date;
  performanceApprover?: IPrincipal;

  // Approvals - Other
  hasOtherApproval: boolean;
  otherApprovalDate?: Date;
  otherApproval?: IPrincipal;
  otherApprovalTitle?: string;

  // Legacy approval array (for backwards compatibility)
  approvals?: Approval[];

  // Legal review
  attorney?: IPrincipal;
  attorneyAssignNotes?: string;
  legalReviewStatus?: string;
  legalReviewOutcome?: string;
  legalReviewNotes?: string;
  legalStatusUpdatedBy?: IPrincipal;
  legalStatusUpdatedOn?: Date;
  legalReviewCompletedOn?: Date;
  legalReviewCompletedBy?: IPrincipal;

  // Legacy legal review object (for backwards compatibility)
  legalReview?: ILegalReview;

  // Compliance review
  complianceReviewStatus?: string;
  complianceReviewOutcome?: string;
  complianceReviewNotes?: string;
  isForesideReviewRequired?: boolean;
  isRetailUse?: boolean;
  complianceStatusUpdatedBy?: IPrincipal;
  complianceStatusUpdatedOn?: Date;
  complianceReviewCompletedOn?: Date;
  complianceReviewCompletedBy?: IPrincipal;

  // Legacy compliance review object (for backwards compatibility)
  complianceReview?: IComplianceReview;

  // Closeout
  trackingId?: string;
  closeoutNotes?: string;
  closeoutBy?: IPrincipal;
  closeoutOn?: Date;
  /** Whether review comments have been acknowledged by the submitter at closeout */
  commentsAcknowledged?: boolean;
  /** When review comments were acknowledged */
  commentsAcknowledgedOn?: Date;

  // FINRA Documents
  /** User who completed the FINRA document upload phase */
  finraCompletedBy?: IPrincipal;
  /** When the FINRA document upload phase was completed */
  finraCompletedOn?: Date;
  /** Notes about FINRA document uploads */
  finraNotes?: string;
  /** When the request entered Awaiting FINRA Documents status */
  awaitingFINRASince?: Date;

  // Cancellation
  cancelledBy?: IPrincipal;
  cancelledOn?: Date;
  cancelReason?: string;

  // On Hold
  onHoldBy?: IPrincipal;
  onHoldSince?: Date;
  onHoldReason?: string;

  // System tracking
  previousStatus?: RequestStatus;
  submittedBy?: IPrincipal;
  submittedOn?: Date;
  submittedToAssignAttorneyBy?: IPrincipal;
  submittedToAssignAttorneyOn?: Date;
  submittedForReviewBy?: IPrincipal;
  submittedForReviewOn?: Date;

  // Time Tracking - Legal Intake
  /** Business hours spent by legal admin during legal intake stage */
  legalIntakeLegalAdminHours?: number;
  /** Business hours spent by submitter during legal intake stage */
  legalIntakeSubmitterHours?: number;

  // Time Tracking - Legal Review
  /** Business hours spent by attorney during legal review stage */
  legalReviewAttorneyHours?: number;
  /** Business hours spent by submitter during legal review stage */
  legalReviewSubmitterHours?: number;

  // Time Tracking - Compliance Review
  /** Business hours spent by compliance reviewer during compliance review stage */
  complianceReviewReviewerHours?: number;
  /** Business hours spent by submitter during compliance review stage */
  complianceReviewSubmitterHours?: number;

  // Time Tracking - Closeout
  /** Business hours spent by closeout reviewer during closeout stage */
  closeoutReviewerHours?: number;
  /** Business hours spent by submitter during closeout stage */
  closeoutSubmitterHours?: number;

  // Time Tracking - Totals
  /** Total business hours spent by all reviewers (attorney + compliance + closeout) */
  totalReviewerHours?: number;
  /** Total business hours spent by submitter across all stages */
  totalSubmitterHours?: number;

  // Admin Override Audit Trail
  /** Multi-line notes field tracking all admin override actions with timestamps */
  adminOverrideNotes?: string;

  // Documents
  documents?: IRequestDocument[];
}

/**
 * Request creation payload - required fields for new request
 */
export interface ICreateRequestPayload {
  requestType: RequestType;
  requestTitle: string;
  purpose: string;
  submissionType: SubmissionType;
  submissionItem: SPLookup;
  targetReturnDate: Date;
  reviewAudience: ReviewAudience;
  requiresCommunicationsApproval: boolean;
  approvals: Approval[];
  distributionMethod?: DistributionMethod[];
  priorSubmissions?: SPLookup[];
  priorSubmissionNotes?: string;
  dateOfFirstUse?: Date;
  additionalParty?: IPrincipal[];
  rushRationale?: string;
}

/**
 * Request update payload - partial update
 */
export interface IUpdateRequestPayload {
  id: number;
  fields: Partial<ILegalRequest>;
}

/**
 * Request list item - SharePoint list item representation
 */
export interface IRequestListItem {
  Id: number;
  Title: string; // Request ID
  Status: string;
  Department?: string;
  RequestType: string;
  RequestTitle: string;
  Purpose: string;
  SubmissionType: string;
  SubmissionItem?: string; // Text field - stores both predefined items and custom "Other" values
  DistributionMethod?: string[];
  TargetReturnDate: string;
  IsRushRequest: boolean;
  RushRationale?: string;
  ReviewAudience: string;
  PriorSubmissionsId?: number[];
  PriorSubmissionNotes?: string;
  DateOfFirstUse?: string;
  AdditionalPartyId?: number[];
  AdditionalParty?: Array<{
    Id: number;
    Title: string;
    EMail?: string;
    UserPrincipalName?: string;
    LoginName?: string;
    Department?: string;
    JobTitle?: string;
  }>;

  // FINRA Audience & Product Fields
  FINRAAudienceCategory?: string[];
  Audience?: string[];
  USFunds?: string[];
  UCITS?: string[];
  SeparateAcctStrategies?: string[];
  SeparateAcctStrategiesIncl?: string[];

  // Approvals (flattened)
  RequiresCommunicationsApproval: boolean;
  CommunicationsApprovalDate?: string;
  CommunicationsApproverId?: number;
  HasPortfolioManagerApproval: boolean;
  PortfolioManagerApprovalDate?: string;
  PortfolioManagerId?: number;
  HasResearchAnalystApproval: boolean;
  ResearchAnalystApprovalDate?: string;
  ResearchAnalystId?: number;
  HasSMEApproval: boolean;
  SMEApprovalDate?: string;
  SubjectMatterExpertId?: number;
  HasPerformanceApproval: boolean;
  PerformanceApprovalDate?: string;
  PerformanceApproverId?: number;
  HasOtherApproval: boolean;
  OtherApprovalTitle?: string;
  OtherApprovalDate?: string;
  OtherApprovalId?: number;

  // Legal review
  AttorneyId?: number;
  AttorneyAssignNotes?: string;
  LegalReviewStatus?: string;
  LegalStatusUpdatedOn?: string;
  LegalStatusUpdatedById?: number;
  LegalReviewOutcome?: string;
  LegalReviewNotes?: string;
  LegalReviewCompletedOn?: string;
  LegalReviewCompletedById?: number;
  LegalReviewCompletedBy?: { Id: number; Title: string; EMail?: string };

  // Compliance review
  ComplianceReviewStatus?: string;
  ComplianceStatusUpdatedOn?: string;
  ComplianceStatusUpdatedById?: number;
  ComplianceReviewOutcome?: string;
  ComplianceReviewNotes?: string;
  IsForesideReviewRequired?: boolean;
  IsRetailUse?: boolean;
  ComplianceReviewCompletedOn?: string;
  ComplianceReviewCompletedById?: number;
  ComplianceReviewCompletedBy?: { Id: number; Title: string; EMail?: string };

  // Closeout
  TrackingId?: string;
  CloseoutNotes?: string;

  // FINRA Documents
  FINRACompletedById?: number;
  FINRACompletedOn?: string;
  FINRANotes?: string;
  AwaitingFINRASince?: string;

  // System tracking
  SubmittedById?: number;
  SubmittedOn?: string;
  SubmittedToAssignAttorneyById?: number;
  SubmittedToAssignAttorneyOn?: string;
  SubmittedForReviewById?: number;
  SubmittedForReviewOn?: string;
  CloseoutById?: number;
  CloseoutOn?: string;
  CancelledById?: number;
  CancelledOn?: string;
  CancelReason?: string;
  OnHoldById?: number;
  OnHoldSince?: string;
  OnHoldReason?: string;
  PreviousStatus?: string;

  // Standard SharePoint fields
  Created: string;
  AuthorId: number;
  Modified: string;
  EditorId: number;
}

/**
 * Request query options
 */
export interface IRequestQueryOptions {
  status?: RequestStatus[];
  requestType?: RequestType[];
  assignedToCurrentUser?: boolean;
  createdByCurrentUser?: boolean;
  top?: number;
  skip?: number;
  orderBy?: string;
  orderByDescending?: boolean;
  includeDocuments?: boolean;
}

/**
 * Request statistics
 */
export interface IRequestStatistics {
  totalRequests: number;
  byStatus: Record<RequestStatus, number>;
  byType: Record<RequestType, number>;
  averageTurnaroundDays: number;
  rushRequestPercentage: number;
  approvalRate: number;
  rejectionRate: number;
}

/**
 * Data required for submitting a request for review
 */
export interface ISubmitForReviewData {
  purpose: string;
  targetReturnDate: Date;
  requestTitle: string;
  submissionType: SubmissionType;
  submissionItem: string;
  reviewAudience: ReviewAudience;
  // Additional fields as needed
}

/**
 * Data for updating legal review
 */
export interface ILegalReviewUpdate {
  outcome: string;
  notes: string;
}

/**
 * Data for updating compliance review
 */
export interface IComplianceReviewUpdate {
  outcome: string;
  notes: string;
  isForesideReviewRequired?: boolean;
  isRetailUse?: boolean;
}

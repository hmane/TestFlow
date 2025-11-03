/**
 * Core request types for legal review requests
 */

import type { IPrincipal, SPLookup } from 'spfx-toolkit/lib/types';
import type { Approval } from './approvalTypes';
import type { IRequestDocument } from './documentTypes';
import type { IComplianceReview, ILegalReview } from './reviewTypes';
import type { RequestStatus, ReviewAudience } from './workflowTypes';

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

  // Legacy compliance review object (for backwards compatibility)
  complianceReview?: IComplianceReview;

  // Closeout
  trackingId?: string;
  closeoutBy?: IPrincipal;
  closeoutOn?: Date;

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

  // Compliance review
  ComplianceReviewStatus?: string;
  ComplianceStatusUpdatedOn?: string;
  ComplianceStatusUpdatedById?: number;
  ComplianceReviewOutcome?: string;
  ComplianceReviewNotes?: string;
  IsForesideReviewRequired?: boolean;
  IsRetailUse?: boolean;

  // Closeout
  TrackingId?: string;

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

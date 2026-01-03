/**
 * Approval-related types for pre-submission approvals
 */

import type { IPrincipal } from 'spfx-toolkit/lib/types';

/**
 * Types of approvals that can be provided
 */
export enum ApprovalType {
  Communications = 'Communications',
  PortfolioManager = 'Portfolio Manager',
  ResearchAnalyst = 'Research Analyst',
  SubjectMatterExpert = 'Subject Matter Expert',
  Performance = 'Performance',
  Other = 'Other',
}

/**
 * Existing file metadata for approvals
 */
export interface IApprovalExistingFile {
  name: string;
  url: string;
  size: number;
  timeCreated: string;
  timeLastModified?: string;
  createdBy?: string;
  modifiedBy?: string;
  uniqueId: string;
  version?: string;
}

/**
 * Base approval interface - common fields for all approval types
 *
 * Note: approvalDate and approver are optional to support draft mode
 * where approvals may be partially filled in. When loading a draft,
 * the boolean flags (e.g., hasPortfolioManagerApproval) indicate
 * that an approval exists, but the details may be incomplete.
 */
export interface IBaseApproval {
  approvalDate?: Date;
  approver?: IPrincipal;
  documentId?: string;
  existingFiles?: IApprovalExistingFile[]; // Files already saved to SharePoint
  notes?: string;
}

/**
 * Communications approval
 */
export interface ICommunicationsApproval extends IBaseApproval {
  type: ApprovalType.Communications;
}

/**
 * Portfolio Manager approval
 */
export interface IPortfolioManagerApproval extends IBaseApproval {
  type: ApprovalType.PortfolioManager;
}

/**
 * Research Analyst approval
 */
export interface IResearchAnalystApproval extends IBaseApproval {
  type: ApprovalType.ResearchAnalyst;
}

/**
 * Subject Matter Expert approval
 */
export interface ISMEApproval extends IBaseApproval {
  type: ApprovalType.SubjectMatterExpert;
}

/**
 * Performance approval
 */
export interface IPerformanceApproval extends IBaseApproval {
  type: ApprovalType.Performance;
}

/**
 * Other/custom approval with title
 */
export interface IOtherApproval extends IBaseApproval {
  type: ApprovalType.Other;
  approvalTitle: string;
}

/**
 * Union type for all approval types
 */
export type Approval =
  | ICommunicationsApproval
  | IPortfolioManagerApproval
  | IResearchAnalystApproval
  | ISMEApproval
  | IPerformanceApproval
  | IOtherApproval;

/**
 * Approval validation result
 */
export interface IApprovalValidation {
  isValid: boolean;
  hasMinimumApprovals: boolean;
  hasRequiredDocuments: boolean;
  missingFields: string[];
  errors: string[];
}

/**
 * Approval summary for display
 */
export interface IApprovalSummary {
  totalApprovals: number;
  approvalTypes: ApprovalType[];
  approvers: IPrincipal[];
  earliestApprovalDate?: Date;
  latestApprovalDate?: Date;
}

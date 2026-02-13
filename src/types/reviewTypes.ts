/**
 * Legal and Compliance review-related types
 */

import type { IPrincipal } from 'spfx-toolkit/lib/types';
import type { LegalReviewStatus, ComplianceReviewStatus, ReviewOutcome } from './workflowTypes';

/**
 * Legal review data
 */
export interface ILegalReview {
  status: LegalReviewStatus;
  statusUpdatedOn?: Date;
  statusUpdatedBy?: IPrincipal;
  outcome?: ReviewOutcome;
  reviewNotes?: string;
  assignedAttorney?: IPrincipal[];
  assignedOn?: Date;
  completedOn?: Date;
}

/**
 * Compliance review data
 */
export interface IComplianceReview {
  status: ComplianceReviewStatus;
  statusUpdatedOn?: Date;
  statusUpdatedBy?: IPrincipal;
  outcome?: ReviewOutcome;
  reviewNotes?: string;
  isForesideReviewRequired: boolean;
  isRetailUse: boolean;
  completedOn?: Date;
}

/**
 * Attorney assignment metadata
 */
export interface IAttorneyAssignment {
  attorney: IPrincipal;
  assignedBy: IPrincipal;
  assignedOn: Date;
  assignmentNotes?: string;
  assignmentMethod: AssignmentMethod;
}

/**
 * How attorney was assigned
 */
export enum AssignmentMethod {
  Direct = 'Direct',
  Committee = 'Committee',
  Reassignment = 'Reassignment',
}

/**
 * Review status update payload
 */
export interface IReviewStatusUpdate {
  status: LegalReviewStatus | ComplianceReviewStatus;
  updatedBy: IPrincipal;
  notes?: string;
}

/**
 * Review completion payload
 */
export interface IReviewCompletion {
  outcome: ReviewOutcome;
  reviewNotes: string;
  completedBy: IPrincipal;
  completedOn: Date;
  isForesideReviewRequired?: boolean;
  isRetailUse?: boolean;
}

/**
 * Review summary for display
 */
export interface IReviewSummary {
  legalReviewRequired: boolean;
  legalReviewComplete: boolean;
  complianceReviewRequired: boolean;
  complianceReviewComplete: boolean;
  allReviewsComplete: boolean;
  anyRejected: boolean;
  readyForCloseout: boolean;
}

/**
 * Reviewer information
 */
export interface IReviewer {
  user: IPrincipal;
  role: ReviewerRole;
  assignedOn?: Date;
  completedOn?: Date;
}

/**
 * Reviewer role types
 */
export enum ReviewerRole {
  Attorney = 'Attorney',
  ComplianceUser = 'Compliance User',
  LegalAdmin = 'Legal Admin',
}

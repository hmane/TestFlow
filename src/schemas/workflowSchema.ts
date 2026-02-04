/**
 * Zod validation schemas for workflow actions
 * Each schema validates the data AND permission requirements for workflow transitions
 */

import { z } from 'zod';
import { RequestStatus, ReviewOutcome, LegalReviewStatus, ComplianceReviewStatus, ReviewAudience } from '@appTypes/workflowTypes';
import { NOTES_MAX_LENGTH, REASON_MAX_LENGTH, REVIEW_NOTES_MAX_LENGTH, STATUS_NOTES_MAX_LENGTH, FIELD_LIMIT_MESSAGES } from '@constants/fieldLimits';

/**
 * IPrincipal schema for workflow actions
 * Accepts id as string or number (coerced to string) since PeoplePicker may return either
 * Note: This is a lenient schema - individual action schemas add required validation
 */
const principalSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(val => String(val)),
  email: z.string().email().optional(),
  title: z.string().optional(),
  value: z.string().optional(),
  loginName: z.string().optional(),
});

/**
 * Attorney schema with required validation
 * Single clear error message when attorney is not selected
 */
const requiredAttorneySchema = principalSchema.refine(
  val => val.id && val.id.length > 0 && val.id !== '0',
  { message: 'Please select an attorney to assign' }
);

// ============================================
// ATTORNEY ASSIGNMENT SCHEMAS
// ============================================

/**
 * Schema for direct attorney assignment (or send to compliance for Compliance Only)
 * Who can perform: LegalAdmin, Admin
 * Valid from status: Legal Intake
 * Note: Attorney is optional when ReviewAudience = Compliance (no attorney needed)
 */
export const assignAttorneySchema = z.object({
  attorney: principalSchema.optional(),
  assignmentNotes: z.string().max(NOTES_MAX_LENGTH, FIELD_LIMIT_MESSAGES.assignmentNotes).optional(),
  // Context fields for validation
  currentStatus: z.enum([RequestStatus.LegalIntake], {
    message: 'Attorney can only be assigned when request is in Legal Intake status',
  }),
  reviewAudience: z.enum([ReviewAudience.Legal, ReviewAudience.Compliance, ReviewAudience.Both]).optional(),
}).superRefine((data, ctx) => {
  // Attorney is required only when ReviewAudience is Legal or Both
  const requiresAttorney = data.reviewAudience !== ReviewAudience.Compliance;

  if (requiresAttorney && (!data.attorney || !data.attorney.id || data.attorney.id === '0')) {
    ctx.addIssue({
      code: 'custom',
      message: 'Please select an attorney to assign',
      path: ['attorney'],
    });
  }
});

/**
 * Schema for sending to attorney assignment committee
 * Who can perform: LegalAdmin, Admin
 * Valid from status: Legal Intake
 */
export const sendToCommitteeSchema = z.object({
  notes: z.string().max(NOTES_MAX_LENGTH, FIELD_LIMIT_MESSAGES.notes).optional(),
  // Context fields for validation
  currentStatus: z.enum([RequestStatus.LegalIntake], {
    message: 'Can only send to committee when request is in Legal Intake status',
  }),
});

/**
 * Schema for committee attorney assignment
 * Who can perform: AttorneyAssigner, Admin
 * Valid from status: Assign Attorney
 */
export const committeeAssignAttorneySchema = z.object({
  attorney: requiredAttorneySchema,
  assignmentNotes: z.string().max(NOTES_MAX_LENGTH, FIELD_LIMIT_MESSAGES.assignmentNotes).optional(),
  // Context fields for validation
  currentStatus: z.enum([RequestStatus.AssignAttorney], {
    message: 'Committee can only assign attorney when request is in Assign Attorney status',
  }),
});

// ============================================
// REVIEW SUBMISSION SCHEMAS
// ============================================

/**
 * Schema for legal review submission
 * Who can perform: Assigned Attorney, LegalAdmin (override), Admin
 * Valid from status: In Review
 * Additional check: User must be the assigned attorney (unless Admin/LegalAdmin)
 */
export const submitLegalReviewSchema = z.object({
  outcome: z.enum(
    [
      ReviewOutcome.Approved,
      ReviewOutcome.ApprovedWithComments,
      ReviewOutcome.RespondToCommentsAndResubmit,
      ReviewOutcome.NotApproved,
    ],
    {
      message: 'Review outcome is required',
    }
  ),
  reviewNotes: z
    .string()
    .min(10, 'Review notes must be at least 10 characters')
    .max(REVIEW_NOTES_MAX_LENGTH, FIELD_LIMIT_MESSAGES.reviewNotes),
  // Context fields for validation
  currentStatus: z.enum([RequestStatus.InReview], {
    message: 'Legal review can only be submitted when request is In Review status',
  }),
  assignedAttorneyId: z.string().optional(),
  currentUserId: z.string(),
  isAdmin: z.boolean(),
  isLegalAdmin: z.boolean(),
}).superRefine((data, ctx) => {
  // Validate that current user is the assigned attorney OR has override permission
  const canOverride = data.isAdmin || data.isLegalAdmin;
  const isAssignedAttorney = data.assignedAttorneyId && data.currentUserId === data.assignedAttorneyId;

  if (!canOverride && !isAssignedAttorney) {
    ctx.addIssue({
      code: 'custom',
      message: 'Only the assigned attorney can submit the legal review',
      path: ['outcome'],
    });
  }
});

/**
 * Schema for compliance review submission
 * Who can perform: ComplianceUser, Admin
 * Valid from status: In Review
 */
export const submitComplianceReviewSchema = z.object({
  outcome: z.enum(
    [
      ReviewOutcome.Approved,
      ReviewOutcome.ApprovedWithComments,
      ReviewOutcome.RespondToCommentsAndResubmit,
      ReviewOutcome.NotApproved,
    ],
    {
      message: 'Review outcome is required',
    }
  ),
  reviewNotes: z
    .string()
    .min(10, 'Review notes must be at least 10 characters')
    .max(REVIEW_NOTES_MAX_LENGTH, FIELD_LIMIT_MESSAGES.reviewNotes),
  isForesideReviewRequired: z.boolean({
    message: 'Foreside review flag is required',
  }),
  isRetailUse: z.boolean({
    message: 'Retail use flag is required',
  }),
  // Context fields for validation
  currentStatus: z.enum([RequestStatus.InReview], {
    message: 'Compliance review can only be submitted when request is In Review status',
  }),
});

// ============================================
// CLOSEOUT SCHEMA
// ============================================

/**
 * Schema for request closeout
 * Who can perform: LegalAdmin, Admin
 * Valid from status: Closeout
 * Tracking ID required if: Compliance reviewed AND (isForesideReviewRequired AND isRetailUse)
 */
export const closeoutRequestSchema = z.object({
  trackingId: z.string().optional(),
  // Context fields for conditional validation
  currentStatus: z.enum([RequestStatus.Closeout], {
    message: 'Request can only be closed out when in Closeout status',
  }),
  complianceReviewed: z.boolean(),
  isForesideReviewRequired: z.boolean(),
  isRetailUse: z.boolean(),
}).superRefine((data, ctx) => {
  // Tracking ID required if compliance reviewed AND (foreside AND retail)
  const requiresTrackingId = data.complianceReviewed && data.isForesideReviewRequired && data.isRetailUse;

  if (requiresTrackingId && (!data.trackingId || data.trackingId.trim().length === 0)) {
    ctx.addIssue({
      code: 'custom',
      message: 'Tracking ID is required when Compliance reviewed and both Foreside Review Required and Retail Use are true',
      path: ['trackingId'],
    });
  }
});

// ============================================
// STATE CHANGE SCHEMAS
// ============================================

/**
 * Schema for canceling a request
 * Who can perform: LegalAdmin, Admin, OR Owner if status is Draft
 * Valid from status: Any except Completed
 */
export const cancelRequestSchema = z.object({
  cancelReason: z
    .string()
    .min(10, 'Cancel reason must be at least 10 characters')
    .max(REASON_MAX_LENGTH, FIELD_LIMIT_MESSAGES.cancelReason),
  // Context fields for validation
  currentStatus: z.string(),
  isOwner: z.boolean(),
  isAdmin: z.boolean(),
  isLegalAdmin: z.boolean(),
}).superRefine((data, ctx) => {
  // Cannot cancel completed requests
  if (data.currentStatus === RequestStatus.Completed) {
    ctx.addIssue({
      code: 'custom',
      message: 'Completed requests cannot be cancelled',
      path: ['cancelReason'],
    });
    return;
  }

  // Check permissions
  const canCancel = data.isAdmin || data.isLegalAdmin || (data.isOwner && data.currentStatus === RequestStatus.Draft);

  if (!canCancel) {
    ctx.addIssue({
      code: 'custom',
      message: 'You do not have permission to cancel this request',
      path: ['cancelReason'],
    });
  }
});

/**
 * Schema for putting a request on hold
 * Who can perform: LegalAdmin, Admin
 * Valid from status: Any except Draft, Completed, Cancelled, On Hold
 */
export const holdRequestSchema = z.object({
  onHoldReason: z
    .string()
    .min(10, 'Hold reason must be at least 10 characters')
    .max(REASON_MAX_LENGTH, FIELD_LIMIT_MESSAGES.holdReason),
  // Context fields for validation
  currentStatus: z.string(),
}).superRefine((data, ctx) => {
  const invalidStatuses = [
    RequestStatus.Draft,
    RequestStatus.Completed,
    RequestStatus.Cancelled,
    RequestStatus.OnHold,
  ];

  if (invalidStatuses.indexOf(data.currentStatus as RequestStatus) !== -1) {
    ctx.addIssue({
      code: 'custom',
      message: `Cannot put request on hold when status is ${data.currentStatus}`,
      path: ['onHoldReason'],
    });
  }
});

/**
 * Schema for resuming a request from hold
 * Who can perform: LegalAdmin, Admin
 * Valid from status: On Hold only
 */
export const resumeRequestSchema = z.object({
  // Context fields for validation
  currentStatus: z.enum([RequestStatus.OnHold], {
    message: 'Can only resume requests that are On Hold',
  }),
  previousStatus: z.string().min(1, 'Previous status is required to resume'),
});

// ============================================
// STATUS UPDATE SCHEMAS (for legal/compliance review status changes)
// ============================================

/**
 * Schema for updating legal review status (intermediate statuses)
 * Who can perform: Assigned Attorney, LegalAdmin, Admin
 */
export const updateLegalReviewStatusSchema = z.object({
  status: z.enum([
    LegalReviewStatus.InProgress,
    LegalReviewStatus.WaitingOnSubmitter,
    LegalReviewStatus.WaitingOnAttorney,
  ], {
    message: 'Invalid legal review status',
  }),
  notes: z.string().max(STATUS_NOTES_MAX_LENGTH, FIELD_LIMIT_MESSAGES.statusNotes).optional(),
  // Context
  currentStatus: z.enum([RequestStatus.InReview], {
    message: 'Can only update legal review status when request is In Review',
  }),
});

/**
 * Schema for updating compliance review status (intermediate statuses)
 * Who can perform: ComplianceUser, Admin
 */
export const updateComplianceReviewStatusSchema = z.object({
  status: z.enum([
    ComplianceReviewStatus.InProgress,
    ComplianceReviewStatus.WaitingOnSubmitter,
    ComplianceReviewStatus.WaitingOnCompliance,
  ], {
    message: 'Invalid compliance review status',
  }),
  notes: z.string().max(STATUS_NOTES_MAX_LENGTH, FIELD_LIMIT_MESSAGES.statusNotes).optional(),
  // Context
  currentStatus: z.enum([RequestStatus.InReview], {
    message: 'Can only update compliance review status when request is In Review',
  }),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type AssignAttorneyType = z.infer<typeof assignAttorneySchema>;
export type SendToCommitteeType = z.infer<typeof sendToCommitteeSchema>;
export type CommitteeAssignAttorneyType = z.infer<typeof committeeAssignAttorneySchema>;
export type SubmitLegalReviewType = z.infer<typeof submitLegalReviewSchema>;
export type SubmitComplianceReviewType = z.infer<typeof submitComplianceReviewSchema>;
export type CloseoutRequestType = z.infer<typeof closeoutRequestSchema>;
export type CancelRequestType = z.infer<typeof cancelRequestSchema>;
export type HoldRequestType = z.infer<typeof holdRequestSchema>;
export type ResumeRequestType = z.infer<typeof resumeRequestSchema>;
export type UpdateLegalReviewStatusType = z.infer<typeof updateLegalReviewStatusSchema>;
export type UpdateComplianceReviewStatusType = z.infer<typeof updateComplianceReviewStatusSchema>;

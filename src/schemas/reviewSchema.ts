/**
 * Zod validation schemas for legal and compliance reviews
 */

import { z } from 'zod';
import { ComplianceReviewStatus, LegalReviewStatus, ReviewOutcome } from '@appTypes/workflowTypes';

/**
 * IPrincipal schema (shared)
 */
const principalSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
  email: z.string().email('Invalid email').optional(),
  title: z.string().optional(),
  value: z.string().optional(),
  loginName: z.string().optional(),
});

/**
 * Legal review status update schema
 */
export const legalReviewStatusUpdateSchema = z.object({
  status: z.enum(
    [
      LegalReviewStatus.NotRequired,
      LegalReviewStatus.NotStarted,
      LegalReviewStatus.InProgress,
      LegalReviewStatus.WaitingOnSubmitter,
      LegalReviewStatus.WaitingOnAttorney,
      LegalReviewStatus.Completed,
    ],
    {
      message: 'Legal review status is required',
    }
  ),
  statusUpdatedBy: principalSchema.optional(),
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
});

/**
 * Compliance review status update schema
 */
export const complianceReviewStatusUpdateSchema = z.object({
  status: z.enum(
    [
      ComplianceReviewStatus.NotRequired,
      ComplianceReviewStatus.NotStarted,
      ComplianceReviewStatus.InProgress,
      ComplianceReviewStatus.WaitingOnSubmitter,
      ComplianceReviewStatus.WaitingOnCompliance,
      ComplianceReviewStatus.Completed,
    ],
    {
      message: 'Compliance review status is required',
    }
  ),
  statusUpdatedBy: principalSchema.optional(),
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
});

/**
 * Legal review completion schema
 */
export const legalReviewCompletionSchema = z.object({
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
    .max(2000, 'Review notes cannot exceed 2000 characters'),
  completedBy: principalSchema,
  completedOn: z.date({
    message: 'Completion date is required and must be a valid date',
  }),
});

/**
 * Compliance review completion schema
 */
export const complianceReviewCompletionSchema = z.object({
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
    .max(2000, 'Review notes cannot exceed 2000 characters'),
  isForesideReviewRequired: z.boolean({
    message: 'Foreside review flag is required',
  }),
  isRetailUse: z.boolean({
    message: 'Retail use flag is required',
  }),
  completedBy: principalSchema,
  completedOn: z.date({
    message: 'Completion date is required and must be a valid date',
  }),
});

/**
 * Attorney assignment schema
 */
export const attorneyAssignmentSchema = z.object({
  attorney: principalSchema.refine(val => val.id && val.id.length > 0, {
    message: 'Attorney is required',
  }),
  assignedBy: principalSchema,
  assignedOn: z.date({
    message: 'Assignment date is required and must be a valid date',
  }),
  assignmentNotes: z.string().max(500, 'Assignment notes cannot exceed 500 characters').optional(),
  assignmentMethod: z.enum(['Direct', 'Committee', 'Reassignment'] as const, {
    message: 'Assignment method is required',
  }),
});

/**
 * Full legal review schema
 */
export const legalReviewSchema = z.object({
  status: z.enum([
    LegalReviewStatus.NotRequired,
    LegalReviewStatus.NotStarted,
    LegalReviewStatus.InProgress,
    LegalReviewStatus.WaitingOnSubmitter,
    LegalReviewStatus.WaitingOnAttorney,
    LegalReviewStatus.Completed,
  ]),
  statusUpdatedOn: z.date().optional(),
  statusUpdatedBy: principalSchema.optional(),
  outcome: z
    .enum([
      ReviewOutcome.Approved,
      ReviewOutcome.ApprovedWithComments,
      ReviewOutcome.RespondToCommentsAndResubmit,
      ReviewOutcome.NotApproved,
    ])
    .optional(),
  reviewNotes: z.string().max(2000).optional(),
  assignedAttorney: principalSchema.optional(),
  assignedOn: z.date().optional(),
  completedOn: z.date().optional(),
});

/**
 * Full compliance review schema
 */
export const complianceReviewSchema = z.object({
  status: z.enum([
    ComplianceReviewStatus.NotRequired,
    ComplianceReviewStatus.NotStarted,
    ComplianceReviewStatus.InProgress,
    ComplianceReviewStatus.WaitingOnSubmitter,
    ComplianceReviewStatus.WaitingOnCompliance,
    ComplianceReviewStatus.Completed,
  ]),
  statusUpdatedOn: z.date().optional(),
  statusUpdatedBy: principalSchema.optional(),
  outcome: z
    .enum([
      ReviewOutcome.Approved,
      ReviewOutcome.ApprovedWithComments,
      ReviewOutcome.RespondToCommentsAndResubmit,
      ReviewOutcome.NotApproved,
    ])
    .optional(),
  reviewNotes: z.string().max(2000).optional(),
  isForesideReviewRequired: z.boolean(),
  isRetailUse: z.boolean(),
  completedOn: z.date().optional(),
});

/**
 * Type exports
 */
export type LegalReviewStatusUpdateType = z.infer<typeof legalReviewStatusUpdateSchema>;
export type ComplianceReviewStatusUpdateType = z.infer<typeof complianceReviewStatusUpdateSchema>;
export type LegalReviewCompletionType = z.infer<typeof legalReviewCompletionSchema>;
export type ComplianceReviewCompletionType = z.infer<typeof complianceReviewCompletionSchema>;
export type AttorneyAssignmentType = z.infer<typeof attorneyAssignmentSchema>;

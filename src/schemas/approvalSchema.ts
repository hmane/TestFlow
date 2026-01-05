/**
 * Zod validation schemas for approvals
 */

import { z } from 'zod';
import { ApprovalType } from '@appTypes/approvalTypes';
import { NOTES_MAX_LENGTH, APPROVAL_TITLE_MAX_LENGTH, FIELD_LIMIT_MESSAGES } from '@constants/fieldLimits';

/**
 * IPrincipal validation schema
 * Accepts id as string or number (coerced to string) since PeoplePicker may return either
 */
const principalSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(val => String(val)).pipe(z.string().min(1, 'User ID is required')),
  email: z.string().email('Invalid email').optional(),
  title: z.string().optional(),
  value: z.string().optional(),
  loginName: z.string().optional(),
  department: z.string().optional(),
  jobTitle: z.string().optional(),
  sip: z.string().optional(),
  picture: z.string().optional(),
});

/**
 * Base approval schema - common fields for all approval types
 */
const baseApprovalSchema = z.object({
  approvalDate: z.date({
    message: 'Approval date is required and must be a valid date',
  }),
  approver: principalSchema.refine(val => val.id && val.id.length > 0, {
    message: 'Approver is required',
  }),
  documentId: z.string().optional(),
  notes: z.string().max(NOTES_MAX_LENGTH, FIELD_LIMIT_MESSAGES.notes).optional(),
});

/**
 * Communications approval schema
 */
export const communicationsApprovalSchema = baseApprovalSchema.extend({
  type: z.literal(ApprovalType.Communications),
});

/**
 * Portfolio Manager approval schema
 */
export const portfolioManagerApprovalSchema = baseApprovalSchema.extend({
  type: z.literal(ApprovalType.PortfolioManager),
});

/**
 * Research Analyst approval schema
 */
export const researchAnalystApprovalSchema = baseApprovalSchema.extend({
  type: z.literal(ApprovalType.ResearchAnalyst),
});

/**
 * Subject Matter Expert approval schema
 */
export const smeApprovalSchema = baseApprovalSchema.extend({
  type: z.literal(ApprovalType.SubjectMatterExpert),
});

/**
 * Performance approval schema
 */
export const performanceApprovalSchema = baseApprovalSchema.extend({
  type: z.literal(ApprovalType.Performance),
});

/**
 * Other/custom approval schema with title
 */
export const otherApprovalSchema = baseApprovalSchema.extend({
  type: z.literal(ApprovalType.Other),
  approvalTitle: z
    .string()
    .min(1, 'Approval title is required for Other approval type')
    .max(APPROVAL_TITLE_MAX_LENGTH, FIELD_LIMIT_MESSAGES.approvalTitle),
});

/**
 * Union schema for all approval types
 */
export const approvalSchema = z.discriminatedUnion('type', [
  communicationsApprovalSchema,
  portfolioManagerApprovalSchema,
  researchAnalystApprovalSchema,
  smeApprovalSchema,
  performanceApprovalSchema,
  otherApprovalSchema,
]);

/**
 * Array of approvals with minimum requirement validation for SUBMISSION.
 * Note: This schema enforces stricter requirements than individual approvalSchema
 * because documentId is required at submission time but optional during draft editing.
 * - Base approvalSchema: documentId is optional (allows building approvals in draft)
 * - approvalsArraySchema: documentId is required (enforced at submission)
 */
export const approvalsArraySchema = z
  .array(approvalSchema)
  .min(1, 'At least one approval is required')
  .refine(
    approvals => {
      // At submission, each approval must have an associated document
      return approvals.every(approval => approval.documentId && approval.documentId.length > 0);
    },
    {
      message: 'Each approval must have an associated document',
    }
  );

/**
 * Validation for adding a new approval
 */
export const addApprovalSchema = z.object({
  type: z.enum(
    [
      ApprovalType.Communications,
      ApprovalType.PortfolioManager,
      ApprovalType.ResearchAnalyst,
      ApprovalType.SubjectMatterExpert,
      ApprovalType.Performance,
      ApprovalType.Other,
    ],
    {
      message: 'Approval type is required',
    }
  ),
  approvalDate: z.date({
    message: 'Approval date is required',
  }),
  approver: principalSchema,
  documentId: z.string().min(1, 'Approval document is required'),
  notes: z.string().max(NOTES_MAX_LENGTH, FIELD_LIMIT_MESSAGES.notes).optional(),
  approvalTitle: z.string().optional(), // Required only for 'Other' type
});

/**
 * Type exports for TypeScript inference
 */
export type ApprovalSchemaType = z.infer<typeof approvalSchema>;
export type ApprovalsArraySchemaType = z.infer<typeof approvalsArraySchema>;
export type AddApprovalSchemaType = z.infer<typeof addApprovalSchema>;

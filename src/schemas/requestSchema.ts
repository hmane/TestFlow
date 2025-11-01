/**
 * Zod validation schemas for legal review requests
 */

import { z } from 'zod';
import { ApprovalType } from '../types/approvalTypes';
import { DistributionMethod, RequestType, SubmissionType } from '../types/requestTypes';
import { RequestStatus, ReviewAudience } from '../types/workflowTypes';
import { approvalsArraySchema } from './approvalSchema';
import { complianceReviewSchema, legalReviewSchema } from './reviewSchema';

/**
 * SPLookup schema
 */
const lookupSchema = z.object({
  id: z.number().optional(),
  title: z.string().optional(),
});

/**
 * IPrincipal schema
 */
const principalSchema = z.object({
  id: z.string().min(1),
  email: z.string().email().optional(),
  title: z.string().optional(),
  value: z.string().optional(),
  loginName: z.string().optional(),
});

/**
 * Request information section schema (Draft stage)
 */
export const requestInformationSchema = z.object({
  requestType: z.enum(
    [RequestType.Communication, RequestType.GeneralReview, RequestType.IMAReview],
    {
      message: 'Request type is required',
    }
  ),
  requestTitle: z
    .string()
    .min(3, 'Request title must be at least 3 characters')
    .max(255, 'Request title cannot exceed 255 characters'),
  purpose: z
    .string()
    .min(10, 'Purpose must be at least 10 characters')
    .max(1000, 'Purpose cannot exceed 1000 characters'),
  submissionType: z.enum([SubmissionType.New, SubmissionType.MaterialUpdates], {
    message: 'Submission type is required',
  }),
  submissionItem: z.string().min(1, 'Submission item is required'), // Changed from lookup to text
  submissionItemOther: z.string().optional(),
  targetReturnDate: z
    .date({
      message: 'Target return date is required and must be a valid date',
    })
    .refine(date => date > new Date(), {
      message: 'Target return date must be in the future',
    }),
  reviewAudience: z.enum([ReviewAudience.Legal, ReviewAudience.Compliance, ReviewAudience.Both], {
    message: 'Review audience is required',
  }),
  requiresCommunicationsApproval: z.boolean(),
  department: z.string().max(100).optional(),
  distributionMethod: z
    .array(
      z.enum([
        DistributionMethod.DodgeCoxWebsiteUS,
        DistributionMethod.DodgeCoxWebsiteNonUS,
        DistributionMethod.ThirdPartyWebsite,
        DistributionMethod.EmailMail,
        DistributionMethod.MobileApp,
        DistributionMethod.DisplayCardSignage,
        DistributionMethod.Hangout,
        DistributionMethod.LiveTalkingPoints,
        DistributionMethod.SocialMedia,
      ])
    )
    .optional(),
  priorSubmissions: z.array(lookupSchema).optional(),
  priorSubmissionNotes: z.string().max(1000).optional(),
  dateOfFirstUse: z.date().optional(),
  additionalParty: z.array(principalSchema).optional(),
  rushRationale: z.string().max(500).optional(),
});

/**
 * Approvals section schema
 * Validates that at least one approval is provided with proper documentation
 */
export const approvalsSchema = z.object({
  requiresCommunicationsApproval: z.boolean(),
  approvals: approvalsArraySchema,
});

/**
 * Full request creation schema (for submission)
 */
/**
 * Full request creation schema (for submission)
 */
export const createRequestSchema = requestInformationSchema.merge(approvalsSchema).refine(
  data => {
    // If communications approval is required, at least one approval must be communications type
    if (data.requiresCommunicationsApproval) {
      return data.approvals.some(approval => approval.type === ApprovalType.Communications);
    }
    return true;
  },
  {
    message: 'Communications approval is required',
    path: ['requiresCommunicationsApproval'],
  }
);

/**
 * Save (Draft) request schema - minimal required fields
 * Required for Save: requestTitle only (minimum to save a draft)
 */
export const saveRequestSchema = z.object({
  requestTitle: z
    .string()
    .min(1, 'Request title is required')
    .max(255, 'Request title cannot exceed 255 characters'),
  // All other fields are optional for Save
  submissionType: z.enum([SubmissionType.New, SubmissionType.MaterialUpdates]).optional(),
  submissionItem: z.string().optional(),
  submissionItemOther: z.string().optional(),
  requestType: z
    .enum([RequestType.Communication, RequestType.GeneralReview, RequestType.IMAReview])
    .optional(),
  purpose: z.string().max(1000).optional(),
  targetReturnDate: z.date().optional(),
  reviewAudience: z
    .enum([ReviewAudience.Legal, ReviewAudience.Compliance, ReviewAudience.Both])
    .optional(),
  requiresCommunicationsApproval: z.boolean().optional(),
  approvals: z.array(z.any()).optional(),
  department: z.string().max(100).optional(),
  distributionMethod: z.array(z.any()).optional(),
  priorSubmissions: z.array(lookupSchema).optional(),
  priorSubmissionNotes: z.string().max(1000).optional(),
  dateOfFirstUse: z.date().optional(),
  additionalParty: z.array(principalSchema).optional(),
  rushRationale: z.string().max(500).optional(),
  isRushRequest: z.boolean().optional(),
});

/**
 * Submit request schema - all required fields except prior submissions
 * Required: everything from request form EXCEPT priorSubmissions and priorSubmissionNotes
 * Approvals: If requiresCommunicationsApproval, then Communications approval with all fields required
 *           At least 1 additional approval required with all fields
 */
export const submitRequestSchema = z
  .object({
    requestType: z.enum(
      [RequestType.Communication, RequestType.GeneralReview, RequestType.IMAReview],
      {
        message: 'Request type is required',
      }
    ),
    requestTitle: z
      .string()
      .min(3, 'Request title must be at least 3 characters')
      .max(255, 'Request title cannot exceed 255 characters'),
    purpose: z
      .string()
      .min(10, 'Purpose must be at least 10 characters')
      .max(1000, 'Purpose cannot exceed 1000 characters'),
    submissionType: z.enum([SubmissionType.New, SubmissionType.MaterialUpdates], {
      message: 'Submission type is required',
    }),
    submissionItem: z.string().min(1, 'Submission item is required'), // Changed from lookup to text
    submissionItemOther: z.string().optional(),
    targetReturnDate: z
      .date({
        message: 'Target return date is required and must be a valid date',
      })
      .refine(date => date > new Date(), {
        message: 'Target return date must be in the future',
      }),
    reviewAudience: z.enum([ReviewAudience.Legal, ReviewAudience.Compliance, ReviewAudience.Both], {
      message: 'Review audience is required',
    }),
    requiresCommunicationsApproval: z.boolean(),
    approvals: z
      .array(
        z.object({
          type: z.enum([
            ApprovalType.Communications,
            ApprovalType.PortfolioManager,
            ApprovalType.ResearchAnalyst,
            ApprovalType.SubjectMatterExpert,
            ApprovalType.Performance,
            ApprovalType.Other,
          ]),
          approvalDate: z.date({ message: 'Approval date is required' }),
          approver: principalSchema,
          documentId: z.string().optional(),
          existingFiles: z.array(z.any()).optional(),
          notes: z.string().optional(),
          approvalTitle: z.string().optional(),
        })
      )
      .min(1, 'At least one approval is required'),
    // Required fields for Communication requests
    distributionMethod: z
      .array(z.any())
      .min(1, 'At least one distribution method is required'),
    dateOfFirstUse: z.date({
      message: 'Date of first use is required',
    }),
    // Optional fields
    department: z.string().max(100).optional(),
    priorSubmissions: z.array(lookupSchema).optional(), // NOT REQUIRED
    priorSubmissionNotes: z.string().max(1000).optional(), // NOT REQUIRED
    additionalParty: z.array(principalSchema).optional(),
    rushRationale: z.string().max(500).optional(),
    isRushRequest: z.boolean().optional(),
  })
  .refine(
    data => {
      // At least 1 additional approval required (non-Communications) - ES5 compatible
      let additionalCount = 0;
      for (let i = 0; i < data.approvals.length; i++) {
        if (data.approvals[i].type !== ApprovalType.Communications) {
          additionalCount++;
        }
      }
      return additionalCount >= 1;
    },
    {
      message: 'At least one additional approval is required',
      path: ['approvals'],
    }
  )
  .refine(
    data => {
      // If communications approval is required, validate it exists and has all required fields
      if (data.requiresCommunicationsApproval) {
        // Find communications approval (ES5 compatible)
        let commApproval: any = null;
        for (let i = 0; i < data.approvals.length; i++) {
          if (data.approvals[i].type === ApprovalType.Communications) {
            commApproval = data.approvals[i];
            break;
          }
        }
        if (!commApproval) {
          return false;
        }
        // Check that approver, approvalDate, and files exist
        const hasApprover = commApproval.approver && commApproval.approver.id;
        const hasDate = commApproval.approvalDate;
        const hasFiles =
          (commApproval.existingFiles && commApproval.existingFiles.length > 0) ||
          commApproval.documentId;
        return hasApprover && hasDate && hasFiles;
      }
      return true;
    },
    {
      message:
        'Communications approval requires approver, approval date, and approval document',
      path: ['approvals'],
    }
  )
  .refine(
    data => {
      // Validate all additional approvals have required fields (ES5 compatible)
      const additionalApprovals: any[] = [];
      for (let i = 0; i < data.approvals.length; i++) {
        if (data.approvals[i].type !== ApprovalType.Communications) {
          additionalApprovals.push(data.approvals[i]);
        }
      }

      for (let i = 0; i < additionalApprovals.length; i++) {
        const approval = additionalApprovals[i];
        const hasApprover = approval.approver && approval.approver.id;
        const hasDate = approval.approvalDate;
        const hasFiles =
          (approval.existingFiles && approval.existingFiles.length > 0) ||
          approval.documentId;
        if (!hasApprover || !hasDate || !hasFiles) {
          return false;
        }
      }
      return true;
    },
    {
      message:
        'All approvals must have approver, approval date, and approval document',
      path: ['approvals'],
    }
  );

/**
 * Legacy: Draft request schema (alias for saveRequestSchema)
 */
export const draftRequestSchema = saveRequestSchema;

/**
 * Request update schema (for editing existing requests)
 */
export const updateRequestSchema = z.object({
  id: z.number().min(1, 'Request ID is required'),
  requestTitle: z.string().min(3).max(255).optional(),
  purpose: z.string().min(10).max(1000).optional(),
  targetReturnDate: z.date().optional(),
  reviewAudience: z
    .enum([ReviewAudience.Legal, ReviewAudience.Compliance, ReviewAudience.Both])
    .optional(),
  distributionMethod: z
    .array(
      z.enum([
        DistributionMethod.DodgeCoxWebsiteUS,
        DistributionMethod.DodgeCoxWebsiteNonUS,
        DistributionMethod.ThirdPartyWebsite,
        DistributionMethod.EmailMail,
        DistributionMethod.MobileApp,
        DistributionMethod.DisplayCardSignage,
        DistributionMethod.Hangout,
        DistributionMethod.LiveTalkingPoints,
        DistributionMethod.SocialMedia,
      ])
    )
    .optional(),
  priorSubmissionNotes: z.string().max(1000).optional(),
  dateOfFirstUse: z.date().optional(),
  additionalParty: z.array(principalSchema).optional(),
});

/**
 * Closeout schema
 */
export const closeoutRequestSchema = z.object({
  trackingId: z.string().optional(),
});

/**
 * Closeout schema with conditional tracking ID validation
 */
export const closeoutWithTrackingIdSchema = z
  .object({
    trackingId: z.string().min(1, 'Tracking ID is required'),
    isForesideReviewRequired: z.boolean(),
    isRetailUse: z.boolean(),
    complianceReviewed: z.boolean(),
  })
  .refine(
    data => {
      // Tracking ID required if compliance reviewed AND (foreside OR retail)
      if (data.complianceReviewed && (data.isForesideReviewRequired || data.isRetailUse)) {
        return data.trackingId && data.trackingId.length > 0;
      }
      return true;
    },
    {
      message: 'Tracking ID is required when Compliance reviewed and (Foreside or Retail Use)',
      path: ['trackingId'],
    }
  );

/**
 * Cancel request schema
 */
export const cancelRequestSchema = z.object({
  cancelReason: z
    .string()
    .min(10, 'Cancel reason must be at least 10 characters')
    .max(500, 'Cancel reason cannot exceed 500 characters'),
});

/**
 * Hold request schema
 */
export const holdRequestSchema = z.object({
  onHoldReason: z
    .string()
    .min(10, 'Hold reason must be at least 10 characters')
    .max(500, 'Hold reason cannot exceed 500 characters'),
});

/**
 * Rush request calculation schema
 */
export const rushRequestCalculationSchema = z
  .object({
    targetReturnDate: z.date(),
    requestedDate: z.date(),
    turnAroundTimeInDays: z.number().min(1),
  })
  .refine(
    data => {
      // Target return date should be after the requested date
      return data.targetReturnDate > data.requestedDate;
    },
    {
      message: 'Target return date must be after the requested date',
      path: ['targetReturnDate'],
    }
  )
  .refine(
    data => {
      // Calculate the actual days between dates and verify it matches turnAroundTimeInDays
      const timeDiff = data.targetReturnDate.getTime() - data.requestedDate.getTime();
      const actualDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
      return Math.abs(actualDays - data.turnAroundTimeInDays) <= 1; // Allow 1 day tolerance for rounding
    },
    {
      message: 'Turnaround time in days does not match the difference between dates',
      path: ['turnAroundTimeInDays'],
    }
  );

/**
 * Full request schema (for complete validation)
 */
export const fullRequestSchema = z.object({
  id: z.number().optional(),
  requestId: z.string(),
  status: z.enum([
    RequestStatus.Draft,
    RequestStatus.LegalIntake,
    RequestStatus.AssignAttorney,
    RequestStatus.InReview,
    RequestStatus.Closeout,
    RequestStatus.Completed,
    RequestStatus.Cancelled,
    RequestStatus.OnHold,
  ]),
  requestType: z.enum([RequestType.Communication, RequestType.GeneralReview, RequestType.IMAReview]),
  requestTitle: z.string().min(3).max(255),
  purpose: z.string().min(10).max(1000),
  submissionType: z.enum([SubmissionType.New, SubmissionType.MaterialUpdates]),
  submissionItem: z.string(), // Changed from lookup to text
  submissionItemOther: z.string().optional(),
  targetReturnDate: z.date().optional(),
  isRushRequest: z.boolean(),
  rushRationale: z.string().max(500).optional(),
  reviewAudience: z.enum([ReviewAudience.Legal, ReviewAudience.Compliance, ReviewAudience.Both]),
  requiresCommunicationsApproval: z.boolean(),
  hasPortfolioManagerApproval: z.boolean().optional(),
  hasResearchAnalystApproval: z.boolean().optional(),
  hasSMEApproval: z.boolean().optional(),
  hasPerformanceApproval: z.boolean().optional(),
  hasOtherApproval: z.boolean().optional(),
  approvals: approvalsArraySchema.optional(),
  legalReview: legalReviewSchema.optional(),
  complianceReview: complianceReviewSchema.optional(),
  trackingId: z.string().optional(),
  department: z.string().optional(),
  distributionMethod: z
    .array(
      z.enum([
        DistributionMethod.DodgeCoxWebsiteUS,
        DistributionMethod.DodgeCoxWebsiteNonUS,
        DistributionMethod.ThirdPartyWebsite,
        DistributionMethod.EmailMail,
        DistributionMethod.MobileApp,
        DistributionMethod.DisplayCardSignage,
        DistributionMethod.Hangout,
        DistributionMethod.LiveTalkingPoints,
        DistributionMethod.SocialMedia,
      ])
    )
    .optional(),
  priorSubmissions: z.array(lookupSchema).optional(),
  priorSubmissionNotes: z.string().optional(),
  dateOfFirstUse: z.date().optional(),
  additionalParty: z.array(principalSchema).optional(),
});

/**
 * Type exports
 */
export type RequestInformationType = z.infer<typeof requestInformationSchema>;
export type ApprovalsType = z.infer<typeof approvalsSchema>;
export type CreateRequestType = z.infer<typeof createRequestSchema>;
export type SaveRequestType = z.infer<typeof saveRequestSchema>;
export type SubmitRequestType = z.infer<typeof submitRequestSchema>;
export type DraftRequestType = z.infer<typeof draftRequestSchema>;
export type UpdateRequestType = z.infer<typeof updateRequestSchema>;
export type CloseoutRequestType = z.infer<typeof closeoutRequestSchema>;
export type CancelRequestType = z.infer<typeof cancelRequestSchema>;
export type HoldRequestType = z.infer<typeof holdRequestSchema>;

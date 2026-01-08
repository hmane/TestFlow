/**
 * Zod validation schemas for legal review requests
 */

import { z } from 'zod';
import { ApprovalType } from '@appTypes/approvalTypes';
import {
  TITLE_MAX_LENGTH,
  PURPOSE_MAX_LENGTH,
  RUSH_RATIONALE_MAX_LENGTH,
  REASON_MAX_LENGTH,
  DEPARTMENT_MAX_LENGTH,
  FIELD_LIMIT_MESSAGES,
} from '@constants/fieldLimits';
import {
  Audience,
  DistributionMethod,
  FINRAAudienceCategory,
  RequestType,
  SeparateAcctStrategies,
  SeparateAcctStrategiesIncl,
  SubmissionType,
  UCITS,
  USFunds,
} from '@appTypes/requestTypes';
import { RequestStatus, ReviewAudience } from '@appTypes/workflowTypes';
import { approvalsArraySchema } from '@schemas/approvalSchema';
import { complianceReviewSchema, legalReviewSchema } from '@schemas/reviewSchema';

/**
 * SPLookup schema
 */
const lookupSchema = z.object({
  id: z.number().optional(),
  title: z.string().optional(),
});

/**
 * IPrincipal schema (strict - for required user fields)
 * Accepts id as string or number (coerced to string) since PeoplePicker may return either
 */
const principalSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(val => String(val)).pipe(z.string().min(1, 'User is required')),
  email: z.string().email().optional(),
  title: z.string().optional(),
  value: z.string().optional(),
  loginName: z.string().optional(),
});

/**
 * IPrincipal schema (lenient - for validation in superRefine)
 * Allows empty id so we can provide custom error messages
 * Accepts id as string or number since PeoplePicker may return either
 */
const lenientPrincipalSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(val => val !== undefined && val !== null ? String(val) : undefined).optional(),
  email: z.string().optional(),
  title: z.string().optional(),
  value: z.string().optional(),
  loginName: z.string().optional(),
}).optional();

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
    .max(TITLE_MAX_LENGTH, FIELD_LIMIT_MESSAGES.title),
  purpose: z
    .string()
    .min(10, 'Purpose must be at least 10 characters')
    .max(PURPOSE_MAX_LENGTH, FIELD_LIMIT_MESSAGES.purpose),
  submissionType: z.enum([SubmissionType.New, SubmissionType.MaterialUpdates], {
    message: 'Submission type is required',
  }),
  submissionItem: z.string().min(1, 'Submission item is required'), // Changed from lookup to text
  submissionItemOther: z.string().optional(),
  targetReturnDate: z
    .date({
      message: 'Target return date is required and must be a valid date',
    })
    .refine(date => {
      // Compare dates only (ignore time) - target date should be today or later
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const targetDate = new Date(date.getTime());
      targetDate.setHours(0, 0, 0, 0);
      return targetDate >= today;
    }, {
      message: 'Target return date must be today or in the future',
    }),
  reviewAudience: z.enum([ReviewAudience.Legal, ReviewAudience.Compliance, ReviewAudience.Both], {
    message: 'Review audience is required',
  }),
  requiresCommunicationsApproval: z.boolean(),
  department: z.string().max(DEPARTMENT_MAX_LENGTH).optional(),
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
  priorSubmissionNotes: z.string().max(PURPOSE_MAX_LENGTH).optional(),
  dateOfFirstUse: z.date().optional(),
  additionalParty: z.array(principalSchema).optional(),
  rushRationale: z.string().max(RUSH_RATIONALE_MAX_LENGTH).optional(),
  // FINRA Audience & Product Fields
  finraAudienceCategory: z
    .array(z.enum([FINRAAudienceCategory.Institutional, FINRAAudienceCategory.RetailPublic]))
    .optional(),
  audience: z
    .array(
      z.enum([
        Audience.ProspectiveSeparateAcctClient,
        Audience.ExistingSeparateAcctClient,
        Audience.ProspectiveFundShareholder,
        Audience.ExistingFundShareholder,
        Audience.Consultant,
        Audience.Other,
      ])
    )
    .optional(),
  usFunds: z
    .array(
      z.enum([
        USFunds.AllFunds,
        USFunds.BalancedFund,
        USFunds.EMStockFund,
        USFunds.GlobalStockFund,
        USFunds.IncomeFund,
        USFunds.InternationalStockFund,
        USFunds.StockFund,
        USFunds.GlobalBondFundIShares,
        USFunds.GlobalBondFundXShares,
      ])
    )
    .optional(),
  ucits: z
    .array(
      z.enum([
        UCITS.AllUCITSFunds,
        UCITS.EMStockFund,
        UCITS.GlobalBondFund,
        UCITS.GlobalStockFund,
        UCITS.USStockFund,
      ])
    )
    .optional(),
  separateAcctStrategies: z
    .array(
      z.enum([
        SeparateAcctStrategies.AllSeparateAccountStrategies,
        SeparateAcctStrategies.Equity,
        SeparateAcctStrategies.FixedIncome,
        SeparateAcctStrategies.Balanced,
      ])
    )
    .optional(),
  separateAcctStrategiesIncl: z
    .array(
      z.enum([
        SeparateAcctStrategiesIncl.ClientRelatedDataOnly,
        SeparateAcctStrategiesIncl.RepresentativeAccount,
        SeparateAcctStrategiesIncl.CompositeData,
      ])
    )
    .optional(),
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
export const saveRequestSchema = z
  .object({
    requestTitle: z
      .string()
      .min(1, 'Request title is required')
      .max(TITLE_MAX_LENGTH, FIELD_LIMIT_MESSAGES.title),
    // All other fields are optional for Save
    submissionType: z.enum([SubmissionType.New, SubmissionType.MaterialUpdates]).optional(),
    submissionItem: z.string().optional(),
    submissionItemOther: z.string().optional(),
    requestType: z
      .enum([RequestType.Communication, RequestType.GeneralReview, RequestType.IMAReview])
      .optional(),
    purpose: z.string().max(PURPOSE_MAX_LENGTH).optional(),
    targetReturnDate: z.date().optional(),
    reviewAudience: z
      .enum([ReviewAudience.Legal, ReviewAudience.Compliance, ReviewAudience.Both])
      .optional(),
    requiresCommunicationsApproval: z.boolean().optional(),
    approvals: z.array(z.any()).optional(),
    department: z.string().max(DEPARTMENT_MAX_LENGTH).optional(),
    distributionMethod: z.array(z.any()).optional(),
    priorSubmissions: z.array(lookupSchema).optional(),
    priorSubmissionNotes: z.string().max(PURPOSE_MAX_LENGTH).optional(),
    dateOfFirstUse: z.date().optional(),
    additionalParty: z.array(principalSchema).optional(),
    rushRationale: z.string().max(RUSH_RATIONALE_MAX_LENGTH).optional(),
    isRushRequest: z.boolean().optional(),
    // FINRA Audience & Product Fields
    finraAudienceCategory: z.array(z.any()).optional(),
    audience: z.array(z.any()).optional(),
    usFunds: z.array(z.any()).optional(),
    ucits: z.array(z.any()).optional(),
    separateAcctStrategies: z.array(z.any()).optional(),
    separateAcctStrategiesIncl: z.array(z.any()).optional(),
  })
  .superRefine((data, ctx) => {
    // Rush rationale is required when isRushRequest is true
    if (data.isRushRequest && (!data.rushRationale || data.rushRationale.trim().length === 0)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Rush rationale is required for rush requests',
        path: ['rushRationale'],
      });
    }
  });

/**
 * Submit request schema - all required fields except prior submissions
 * Required: everything from request form EXCEPT priorSubmissions and priorSubmissionNotes
 * Approvals: If requiresCommunicationsApproval, then Communications approval with all fields required
 *           At least 1 additional approval required with all fields
 */
export const submitRequestSchema = z
  .object({
    // All fields use lenient types - actual validation happens in superRefine
    // This ensures ALL errors are collected and shown at once
    requestType: z.any(),
    requestTitle: z.any(),
    purpose: z.any(),
    submissionType: z.any(),
    submissionItem: z.any(),
    submissionItemOther: z.string().optional(),
    targetReturnDate: z.any(),
    reviewAudience: z.any(),
    requiresCommunicationsApproval: z.boolean().optional(),
    approvals: z.array(
      z.object({
        type: z.enum([
          ApprovalType.Communications,
          ApprovalType.PortfolioManager,
          ApprovalType.ResearchAnalyst,
          ApprovalType.SubjectMatterExpert,
          ApprovalType.Performance,
          ApprovalType.Other,
        ]),
        approvalDate: z.any().optional(),
        approver: lenientPrincipalSchema,
        documentId: z.string().optional(),
        existingFiles: z.array(z.any()).optional(),
        notes: z.string().optional(),
        approvalTitle: z.string().optional(),
        _hasDocumentInStore: z.boolean().optional(),
      })
    ).optional(),
    distributionMethod: z.array(z.any()).optional(),
    dateOfFirstUse: z.any().optional(),
    // Optional fields
    department: z.string().max(DEPARTMENT_MAX_LENGTH).optional(),
    priorSubmissions: z.array(lookupSchema).optional(),
    priorSubmissionNotes: z.string().max(PURPOSE_MAX_LENGTH).optional(),
    additionalParty: z.array(principalSchema).optional(),
    rushRationale: z.string().max(RUSH_RATIONALE_MAX_LENGTH).optional(),
    isRushRequest: z.boolean().optional(),
    // FINRA Audience & Product Fields
    finraAudienceCategory: z.array(z.any()).optional(),
    audience: z.array(z.any()).optional(),
    usFunds: z.array(z.any()).optional(),
    ucits: z.array(z.any()).optional(),
    separateAcctStrategies: z.array(z.any()).optional(),
    separateAcctStrategiesIncl: z.array(z.any()).optional(),
    // Marker for attachments validation - injected by validation hook
    _hasAttachments: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    // Helper function to check if an approval has a document
    const hasDocument = (approval: any): boolean => {
      if (approval._hasDocumentInStore === true) return true;
      if (approval.existingFiles && Array.isArray(approval.existingFiles) && approval.existingFiles.length > 0) return true;
      if (approval.documentId && approval.documentId.trim().length > 0) return true;
      if (approval.files && Array.isArray(approval.files) && approval.files.length > 0) return true;
      return false;
    };

    // Helper function to check if an approver has a valid id
    // Handles both string and number ids (PeoplePicker may return either)
    const hasValidApproverId = (approver: any): boolean => {
      if (!approver) return false;
      const id = approver.id;
      if (id === undefined || id === null) return false;
      // Convert to string and check for non-empty
      const idStr = String(id).trim();
      return idStr.length > 0 && idStr !== '0';
    };

    const getApprovalTypeName = (type: string): string => type;

    // Safe approvals array (default to empty if undefined)
    const approvals = data.approvals || [];

    // ========================================
    // BASE FIELD VALIDATIONS (previously in schema definition)
    // All validations run together so ALL errors show at once
    // ========================================

    // Request Type validation
    const validRequestTypes = [RequestType.Communication, RequestType.GeneralReview, RequestType.IMAReview];
    if (!data.requestType || validRequestTypes.indexOf(data.requestType) === -1) {
      ctx.addIssue({
        code: 'custom',
        message: 'Request type is required',
        path: ['requestType'],
      });
    }

    // Request Title validation
    if (!data.requestTitle || typeof data.requestTitle !== 'string') {
      ctx.addIssue({
        code: 'custom',
        message: 'Request title is required',
        path: ['requestTitle'],
      });
    } else if (data.requestTitle.length < 3) {
      ctx.addIssue({
        code: 'custom',
        message: 'Request title must be at least 3 characters',
        path: ['requestTitle'],
      });
    } else if (data.requestTitle.length > 255) {
      ctx.addIssue({
        code: 'custom',
        message: 'Request title cannot exceed 255 characters',
        path: ['requestTitle'],
      });
    }

    // Purpose validation
    if (!data.purpose || typeof data.purpose !== 'string') {
      ctx.addIssue({
        code: 'custom',
        message: 'Purpose is required',
        path: ['purpose'],
      });
    } else if (data.purpose.length < 10) {
      ctx.addIssue({
        code: 'custom',
        message: 'Purpose must be at least 10 characters',
        path: ['purpose'],
      });
    } else if (data.purpose.length > 1000) {
      ctx.addIssue({
        code: 'custom',
        message: 'Purpose cannot exceed 1000 characters',
        path: ['purpose'],
      });
    }

    // Submission Type validation
    const validSubmissionTypes = [SubmissionType.New, SubmissionType.MaterialUpdates];
    if (!data.submissionType || validSubmissionTypes.indexOf(data.submissionType) === -1) {
      ctx.addIssue({
        code: 'custom',
        message: 'Submission type is required',
        path: ['submissionType'],
      });
    }

    // Submission Item validation
    if (!data.submissionItem || typeof data.submissionItem !== 'string' || data.submissionItem.trim().length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'Submission item is required',
        path: ['submissionItem'],
      });
    }

    // Submission Item Other validation - required when submissionItem is "Other"
    if (data.submissionItem === 'Other' && (!data.submissionItemOther || data.submissionItemOther.trim().length === 0)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Please specify the submission item type',
        path: ['submissionItemOther'],
      });
    }

    // Target Return Date validation
    if (!data.targetReturnDate || !(data.targetReturnDate instanceof Date) || isNaN(data.targetReturnDate.getTime())) {
      ctx.addIssue({
        code: 'custom',
        message: 'Target return date is required and must be a valid date',
        path: ['targetReturnDate'],
      });
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const targetDate = new Date(data.targetReturnDate.getTime());
      targetDate.setHours(0, 0, 0, 0);
      if (targetDate < today) {
        ctx.addIssue({
          code: 'custom',
          message: 'Target return date must be today or in the future',
          path: ['targetReturnDate'],
        });
      }
    }

    // Review Audience validation
    const validReviewAudiences = [ReviewAudience.Legal, ReviewAudience.Compliance, ReviewAudience.Both];
    if (!data.reviewAudience || validReviewAudiences.indexOf(data.reviewAudience) === -1) {
      ctx.addIssue({
        code: 'custom',
        message: 'Review audience is required',
        path: ['reviewAudience'],
      });
    }

    // Distribution Method validation
    if (!data.distributionMethod || !Array.isArray(data.distributionMethod) || data.distributionMethod.length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'At least one distribution method is required',
        path: ['distributionMethod'],
      });
    }

    // Date of First Use validation
    if (!data.dateOfFirstUse || !(data.dateOfFirstUse instanceof Date) || isNaN(data.dateOfFirstUse.getTime())) {
      ctx.addIssue({
        code: 'custom',
        message: 'Date of first use is required',
        path: ['dateOfFirstUse'],
      });
    }

    // ========================================
    // APPROVAL VALIDATIONS
    // ========================================

    // At least one approval is required
    if (approvals.length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'At least one approval is required',
        path: ['approvals'],
      });
    }

    // Rush rationale validation
    if (data.isRushRequest && (!data.rushRationale || data.rushRationale.trim().length === 0)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Rush rationale is required for rush requests',
        path: ['rushRationale'],
      });
    }

    // At least 1 additional (non-Communications) approval required
    let additionalCount = 0;
    for (let i = 0; i < approvals.length; i++) {
      if (approvals[i].type !== ApprovalType.Communications) {
        additionalCount++;
      }
    }
    if (additionalCount < 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'At least one additional approval (non-Communications) is required',
        path: ['approvals'],
      });
    }

    // Communications approval validation (if required)
    if (data.requiresCommunicationsApproval) {
      let commApproval: any = undefined;
      let commApprovalIndex = -1;
      for (let i = 0; i < approvals.length; i++) {
        if (approvals[i].type === ApprovalType.Communications) {
          commApproval = approvals[i];
          commApprovalIndex = i;
          break;
        }
      }

      if (!commApproval) {
        ctx.addIssue({
          code: 'custom',
          message: 'Communications approval is required but not provided',
          path: ['approvals'],
        });
      } else {
        if (!hasValidApproverId(commApproval.approver)) {
          ctx.addIssue({
            code: 'custom',
            message: 'Approver is required for Communications approval',
            path: ['approvals', commApprovalIndex, 'approver'],
          });
        }
        if (!commApproval.approvalDate) {
          ctx.addIssue({
            code: 'custom',
            message: 'Approval date is required for Communications approval',
            path: ['approvals', commApprovalIndex, 'approvalDate'],
          });
        }
        if (!hasDocument(commApproval)) {
          ctx.addIssue({
            code: 'custom',
            message: 'Approval document is required for Communications approval',
            path: ['approvals', commApprovalIndex, '_document'],
          });
        }
      }
    }

    // Validate each additional approval has all required fields
    for (let i = 0; i < approvals.length; i++) {
      const approval = approvals[i];
      if (approval.type === ApprovalType.Communications) {
        continue;
      }

      const approvalName = getApprovalTypeName(approval.type);

      if (!hasValidApproverId(approval.approver)) {
        ctx.addIssue({
          code: 'custom',
          message: `Approver is required for ${approvalName} approval`,
          path: ['approvals', i, 'approver'],
        });
      }
      if (!approval.approvalDate) {
        ctx.addIssue({
          code: 'custom',
          message: `Approval date is required for ${approvalName} approval`,
          path: ['approvals', i, 'approvalDate'],
        });
      }
      if (!hasDocument(approval)) {
        ctx.addIssue({
          code: 'custom',
          message: `Approval document is required for ${approvalName} approval`,
          path: ['approvals', i, '_document'],
        });
      }
    }

    // At least 1 approval document is required for the entire request
    let totalApprovalDocuments = 0;
    for (let i = 0; i < approvals.length; i++) {
      if (hasDocument(approvals[i])) {
        totalApprovalDocuments++;
      }
    }
    if (totalApprovalDocuments < 1 && approvals.length > 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'At least one approval document is required',
        path: ['approvals'],
      });
    }

    // At least 1 attachment (Review or Supplemental) is required
    if (data._hasAttachments !== true) {
      ctx.addIssue({
        code: 'custom',
        message: 'At least one attachment (Review or Supplemental document) is required',
        path: ['attachments'],
      });
    }
  });

/**
 * Legacy: Draft request schema (alias for saveRequestSchema)
 */
export const draftRequestSchema = saveRequestSchema;

/**
 * Request update schema (for editing existing requests)
 */
export const updateRequestSchema = z.object({
  id: z.number().min(1, 'Request ID is required'),
  requestTitle: z.string().min(3).max(TITLE_MAX_LENGTH).optional(),
  purpose: z.string().min(10).max(PURPOSE_MAX_LENGTH).optional(),
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
  priorSubmissionNotes: z.string().max(PURPOSE_MAX_LENGTH).optional(),
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
    .max(REASON_MAX_LENGTH, FIELD_LIMIT_MESSAGES.cancelReason),
});

/**
 * Hold request schema
 */
export const holdRequestSchema = z.object({
  onHoldReason: z
    .string()
    .min(10, 'Hold reason must be at least 10 characters')
    .max(REASON_MAX_LENGTH, FIELD_LIMIT_MESSAGES.holdReason),
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
    RequestStatus.AwaitingFINRADocuments,
    RequestStatus.Completed,
    RequestStatus.Cancelled,
    RequestStatus.OnHold,
  ]),
  requestType: z.enum([RequestType.Communication, RequestType.GeneralReview, RequestType.IMAReview]),
  requestTitle: z.string().min(3).max(TITLE_MAX_LENGTH),
  purpose: z.string().min(10).max(PURPOSE_MAX_LENGTH),
  submissionType: z.enum([SubmissionType.New, SubmissionType.MaterialUpdates]),
  submissionItem: z.string(), // Changed from lookup to text
  submissionItemOther: z.string().optional(),
  targetReturnDate: z.date().optional(),
  isRushRequest: z.boolean(),
  rushRationale: z.string().max(RUSH_RATIONALE_MAX_LENGTH).optional(),
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
  // FINRA Audience & Product Fields
  finraAudienceCategory: z
    .array(z.enum([FINRAAudienceCategory.Institutional, FINRAAudienceCategory.RetailPublic]))
    .optional(),
  audience: z
    .array(
      z.enum([
        Audience.ProspectiveSeparateAcctClient,
        Audience.ExistingSeparateAcctClient,
        Audience.ProspectiveFundShareholder,
        Audience.ExistingFundShareholder,
        Audience.Consultant,
        Audience.Other,
      ])
    )
    .optional(),
  usFunds: z
    .array(
      z.enum([
        USFunds.AllFunds,
        USFunds.BalancedFund,
        USFunds.EMStockFund,
        USFunds.GlobalStockFund,
        USFunds.IncomeFund,
        USFunds.InternationalStockFund,
        USFunds.StockFund,
        USFunds.GlobalBondFundIShares,
        USFunds.GlobalBondFundXShares,
      ])
    )
    .optional(),
  ucits: z
    .array(
      z.enum([
        UCITS.AllUCITSFunds,
        UCITS.EMStockFund,
        UCITS.GlobalBondFund,
        UCITS.GlobalStockFund,
        UCITS.USStockFund,
      ])
    )
    .optional(),
  separateAcctStrategies: z
    .array(
      z.enum([
        SeparateAcctStrategies.AllSeparateAccountStrategies,
        SeparateAcctStrategies.Equity,
        SeparateAcctStrategies.FixedIncome,
        SeparateAcctStrategies.Balanced,
      ])
    )
    .optional(),
  separateAcctStrategiesIncl: z
    .array(
      z.enum([
        SeparateAcctStrategiesIncl.ClientRelatedDataOnly,
        SeparateAcctStrategiesIncl.RepresentativeAccount,
        SeparateAcctStrategiesIncl.CompositeData,
      ])
    )
    .optional(),
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

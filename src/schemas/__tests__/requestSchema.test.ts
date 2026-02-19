/**
 * Request Schema Tests
 * Tests for Zod validation schemas
 */

import {
  saveRequestSchema,
  submitRequestSchema,
  cancelRequestSchema,
  holdRequestSchema,
  closeoutRequestSchema,
  closeoutWithTrackingIdSchema,
} from '../requestSchema';
import { RequestType, SubmissionType, DistributionMethod } from '../../types/requestTypes';
import { ReviewAudience } from '../../types/workflowTypes';
import { ApprovalType } from '../../types/approvalTypes';

describe('Request Schema Validation', () => {
  describe('saveRequestSchema', () => {
    it('should validate a minimal draft request', () => {
      const data = {
        requestTitle: 'Test Request',
      };

      const result = saveRequestSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject empty request title', () => {
      const data = {
        requestTitle: '',
      };

      const result = saveRequestSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Request title is required');
      }
    });

    it('should reject request title exceeding 255 characters', () => {
      const data = {
        requestTitle: 'x'.repeat(256),
      };

      const result = saveRequestSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('cannot exceed 255 characters');
      }
    });

    it('should require rush rationale when isRushRequest is true', () => {
      const data = {
        requestTitle: 'Test Rush Request',
        isRushRequest: true,
        rushRationale: '',
      };

      const result = saveRequestSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const rushError = result.error.issues.find(
          issue => issue.path.includes('rushRationale')
        );
        expect(rushError).toBeDefined();
      }
    });

    it('should accept complete draft data', () => {
      const data = {
        requestTitle: 'Complete Draft Request',
        requestType: RequestType.Communication,
        purpose: 'This is the purpose of the request',
        submissionType: SubmissionType.New,
        submissionItem: 'Test Item',
        reviewAudience: ReviewAudience.Legal,
        requiresCommunicationsApproval: false,
      };

      const result = saveRequestSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('submitRequestSchema', () => {
    const createValidSubmitData = () => ({
      requestType: RequestType.Communication,
      requestTitle: 'Valid Request Title',
      purpose: 'This is a valid purpose that is at least 10 characters long',
      submissionType: SubmissionType.New,
      submissionItem: 'Advertisement',
      targetReturnDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      reviewAudience: ReviewAudience.Legal,
      requiresCommunicationsApproval: false,
      distributionMethod: [DistributionMethod.EmailMail],
      dateOfFirstUse: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      approvals: [
        {
          type: ApprovalType.PortfolioManager,
          approver: { id: '1', email: 'pm@test.com', title: 'Portfolio Manager' },
          approvalDate: new Date(),
          _hasDocumentInStore: true,
        },
      ],
      _hasAttachments: true,
    });

    it('should validate a complete submission', () => {
      const data = createValidSubmitData();
      const result = submitRequestSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should show all validation errors at once', () => {
      const data = {
        requestType: null,
        requestTitle: '',
        purpose: '',
        submissionType: null,
        submissionItem: '',
        targetReturnDate: null,
        reviewAudience: null,
        distributionMethod: [],
        dateOfFirstUse: null,
        approvals: [],
        _hasAttachments: false,
      };

      const result = submitRequestSchema.safeParse(data);
      expect(result.success).toBe(false);

      if (!result.success) {
        // Should have multiple errors, not just one
        expect(result.error.issues.length).toBeGreaterThan(5);

        // Check for specific errors
        const errorPaths = result.error.issues.map(issue => issue.path[0]);
        expect(errorPaths).toContain('requestType');
        expect(errorPaths).toContain('requestTitle');
        expect(errorPaths).toContain('purpose');
        expect(errorPaths).toContain('submissionType');
        expect(errorPaths).toContain('submissionItem');
        expect(errorPaths).toContain('targetReturnDate');
        expect(errorPaths).toContain('reviewAudience');
        expect(errorPaths).toContain('distributionMethod');
        expect(errorPaths).toContain('dateOfFirstUse');
        expect(errorPaths).toContain('approvals');
        expect(errorPaths).toContain('attachments');
      }
    });

    it('should require at least one non-Communications approval', () => {
      const data = {
        ...createValidSubmitData(),
        approvals: [
          {
            type: ApprovalType.Communications,
            approver: { id: '1', email: 'comm@test.com', title: 'Comm Approver' },
            approvalDate: new Date(),
            _hasDocumentInStore: true,
          },
        ],
        requiresCommunicationsApproval: true,
      };

      const result = submitRequestSchema.safeParse(data);
      expect(result.success).toBe(false);

      if (!result.success) {
        const additionalApprovalError = result.error.issues.find(
          issue => issue.message.includes('additional approval')
        );
        expect(additionalApprovalError).toBeDefined();
      }
    });

    it('should require Communications approval when flag is set', () => {
      const data = {
        ...createValidSubmitData(),
        requiresCommunicationsApproval: true,
        approvals: [
          {
            type: ApprovalType.PortfolioManager,
            approver: { id: '1', email: 'pm@test.com', title: 'PM' },
            approvalDate: new Date(),
            _hasDocumentInStore: true,
          },
        ],
      };

      const result = submitRequestSchema.safeParse(data);
      expect(result.success).toBe(false);

      if (!result.success) {
        const commError = result.error.issues.find(
          issue => issue.message.includes('Communications approval is required')
        );
        expect(commError).toBeDefined();
      }
    });

    it('should validate approval fields - approver required', () => {
      const data = {
        ...createValidSubmitData(),
        approvals: [
          {
            type: ApprovalType.PortfolioManager,
            approver: { id: '' }, // Missing id
            approvalDate: new Date(),
            _hasDocumentInStore: true,
          },
        ],
      };

      const result = submitRequestSchema.safeParse(data);
      expect(result.success).toBe(false);

      if (!result.success) {
        const approverError = result.error.issues.find(
          issue => issue.path.includes('approver')
        );
        expect(approverError).toBeDefined();
      }
    });

    it('should validate approval fields - document required', () => {
      const data = {
        ...createValidSubmitData(),
        approvals: [
          {
            type: ApprovalType.PortfolioManager,
            approver: { id: '1', email: 'pm@test.com', title: 'PM' },
            approvalDate: new Date(),
            _hasDocumentInStore: false, // No document
          },
        ],
      };

      const result = submitRequestSchema.safeParse(data);
      expect(result.success).toBe(false);

      if (!result.success) {
        const documentError = result.error.issues.find(
          issue => issue.message.includes('document is required')
        );
        expect(documentError).toBeDefined();
      }
    });

    it('should require attachments for submission', () => {
      const data = {
        ...createValidSubmitData(),
        _hasAttachments: false,
      };

      const result = submitRequestSchema.safeParse(data);
      expect(result.success).toBe(false);

      if (!result.success) {
        const attachmentError = result.error.issues.find(
          issue => issue.path[0] === 'attachments'
        );
        expect(attachmentError).toBeDefined();
      }
    });

    it('should reject past target return date', () => {
      const data = {
        ...createValidSubmitData(),
        targetReturnDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      };

      const result = submitRequestSchema.safeParse(data);
      expect(result.success).toBe(false);

      if (!result.success) {
        const dateError = result.error.issues.find(
          issue => issue.path[0] === 'targetReturnDate'
        );
        expect(dateError).toBeDefined();
        expect(dateError?.message).toContain('today or in the future');
      }
    });

    it('should validate request title length', () => {
      const data = {
        ...createValidSubmitData(),
        requestTitle: 'AB', // Too short
      };

      const result = submitRequestSchema.safeParse(data);
      expect(result.success).toBe(false);

      if (!result.success) {
        const titleError = result.error.issues.find(
          issue => issue.path[0] === 'requestTitle'
        );
        expect(titleError).toBeDefined();
        expect(titleError?.message).toContain('at least 3 characters');
      }
    });

    it('should validate purpose length', () => {
      const data = {
        ...createValidSubmitData(),
        purpose: 'Short', // Too short (less than 10 chars)
      };

      const result = submitRequestSchema.safeParse(data);
      expect(result.success).toBe(false);

      if (!result.success) {
        const purposeError = result.error.issues.find(
          issue => issue.path[0] === 'purpose'
        );
        expect(purposeError).toBeDefined();
        expect(purposeError?.message).toContain('at least 10 characters');
      }
    });
  });

  describe('cancelRequestSchema', () => {
    it('should validate a valid cancel reason', () => {
      const data = {
        cancelReason: 'This request is no longer needed because the project was cancelled',
      };

      const result = cancelRequestSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject short cancel reason', () => {
      const data = {
        cancelReason: 'Too short',
      };

      const result = cancelRequestSchema.safeParse(data);
      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 10 characters');
      }
    });

    it('should reject cancel reason exceeding 1000 characters', () => {
      const data = {
        cancelReason: 'x'.repeat(1001),
      };

      const result = cancelRequestSchema.safeParse(data);
      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues[0].message).toContain('cannot exceed 1000 characters');
      }
    });
  });

  describe('holdRequestSchema', () => {
    it('should validate a valid hold reason', () => {
      const data = {
        onHoldReason: 'Waiting for additional information from the submitter',
      };

      const result = holdRequestSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject short hold reason', () => {
      const data = {
        onHoldReason: 'Waiting',
      };

      const result = holdRequestSchema.safeParse(data);
      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 10 characters');
      }
    });
  });

  describe('closeoutRequestSchema', () => {
    it('should accept empty tracking ID', () => {
      const data = {
        trackingId: '',
      };

      const result = closeoutRequestSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept tracking ID', () => {
      const data = {
        trackingId: 'TRK-2024-001',
      };

      const result = closeoutRequestSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('closeoutWithTrackingIdSchema', () => {
    it('should require tracking ID when foreside review required', () => {
      const data = {
        trackingId: '',
        isForesideReviewRequired: true,
      };

      const result = closeoutWithTrackingIdSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require tracking ID when foreside required and tracking ID is whitespace', () => {
      const data = {
        trackingId: '   ',
        isForesideReviewRequired: true,
      };

      const result = closeoutWithTrackingIdSchema.safeParse(data);
      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Tracking ID is required');
      }
    });

    it('should not require tracking ID when foreside not required', () => {
      const data = {
        trackingId: '',
        isForesideReviewRequired: false,
      };

      const result = closeoutWithTrackingIdSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept valid tracking ID when foreside required', () => {
      const data = {
        trackingId: 'TRK-2024-001',
        isForesideReviewRequired: true,
      };

      const result = closeoutWithTrackingIdSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept missing tracking ID when foreside not required', () => {
      const data = {
        isForesideReviewRequired: false,
      };

      const result = closeoutWithTrackingIdSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
});

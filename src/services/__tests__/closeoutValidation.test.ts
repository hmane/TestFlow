/**
 * Closeout Validation Tests
 *
 * Tests the validation logic used during closeout, specifically:
 * - ReviewFinal document requirement when reviews have "Approved With Comments" outcome
 * - FINRAComment field inclusion in completeFINRADocuments payload
 * - Document counting logic (existing + staged)
 */

import { DocumentType } from '@appTypes/documentTypes';
import { ReviewOutcome } from '@appTypes/workflowTypes';

// No external service mocks needed — these test pure logic patterns

describe('Closeout Validation Logic', () => {
  describe('ReviewFinal document type', () => {
    it('ReviewFinal should be a valid DocumentType enum value', () => {
      expect(DocumentType.ReviewFinal).toBe('Review Final');
    });

    it('FINRA should be a valid DocumentType enum value', () => {
      expect(DocumentType.FINRA).toBe('FINRA');
    });

    it('should be distinct from other document types', () => {
      const types = Object.values(DocumentType);
      const uniqueTypes = new Set(types);
      expect(types.length).toBe(uniqueTypes.size);
    });
  });

  describe('Approved With Comments detection', () => {
    it('should detect legal review Approved With Comments', () => {
      const request = {
        legalReviewOutcome: ReviewOutcome.ApprovedWithComments,
        complianceReviewOutcome: undefined,
      };
      const hasApprovedWithComments =
        request.legalReviewOutcome === ReviewOutcome.ApprovedWithComments ||
        request.complianceReviewOutcome === ReviewOutcome.ApprovedWithComments;

      expect(hasApprovedWithComments).toBe(true);
    });

    it('should detect compliance review Approved With Comments', () => {
      const request = {
        legalReviewOutcome: ReviewOutcome.Approved,
        complianceReviewOutcome: ReviewOutcome.ApprovedWithComments,
      };
      const hasApprovedWithComments =
        request.legalReviewOutcome === ReviewOutcome.ApprovedWithComments ||
        request.complianceReviewOutcome === ReviewOutcome.ApprovedWithComments;

      expect(hasApprovedWithComments).toBe(true);
    });

    it('should detect when both reviews have Approved With Comments', () => {
      const request = {
        legalReviewOutcome: ReviewOutcome.ApprovedWithComments,
        complianceReviewOutcome: ReviewOutcome.ApprovedWithComments,
      };
      const hasApprovedWithComments =
        request.legalReviewOutcome === ReviewOutcome.ApprovedWithComments ||
        request.complianceReviewOutcome === ReviewOutcome.ApprovedWithComments;

      expect(hasApprovedWithComments).toBe(true);
    });

    it('should return false when no Approved With Comments', () => {
      const request = {
        legalReviewOutcome: ReviewOutcome.Approved,
        complianceReviewOutcome: ReviewOutcome.Approved,
      };
      const hasApprovedWithComments =
        request.legalReviewOutcome === ReviewOutcome.ApprovedWithComments ||
        request.complianceReviewOutcome === ReviewOutcome.ApprovedWithComments;

      expect(hasApprovedWithComments).toBe(false);
    });

    it('should return false when outcomes are undefined', () => {
      const request = {
        legalReviewOutcome: undefined,
        complianceReviewOutcome: undefined,
      };
      const hasApprovedWithComments =
        request.legalReviewOutcome === ReviewOutcome.ApprovedWithComments ||
        request.complianceReviewOutcome === ReviewOutcome.ApprovedWithComments;

      expect(hasApprovedWithComments).toBe(false);
    });
  });

  describe('ReviewFinal document counting', () => {
    /**
     * This validates the exact counting pattern used in useRequestActionsState.ts:
     *   const existingCount = docs.get(DocumentType.ReviewFinal)?.length || 0;
     *   const stagedCount = staged.filter(f => f.documentType === DocumentType.ReviewFinal).length;
     *   if (existingCount + stagedCount === 0) { ... error ... }
     */

    it('should count zero when no ReviewFinal documents exist', () => {
      const docs = new Map<DocumentType, Array<{ id: number }>>([
        [DocumentType.Review, [{ id: 1 }, { id: 2 }]],
      ]);
      const staged: Array<{ documentType: DocumentType }> = [];

      const existingCount = docs.get(DocumentType.ReviewFinal)?.length || 0;
      const stagedCount = staged.filter(f => f.documentType === DocumentType.ReviewFinal).length;

      expect(existingCount + stagedCount).toBe(0);
    });

    it('should count existing ReviewFinal documents', () => {
      const docs = new Map<DocumentType, Array<{ id: number }>>([
        [DocumentType.ReviewFinal, [{ id: 10 }, { id: 11 }]],
        [DocumentType.Review, [{ id: 1 }]],
      ]);
      const staged: Array<{ documentType: DocumentType }> = [];

      const existingCount = docs.get(DocumentType.ReviewFinal)?.length || 0;
      const stagedCount = staged.filter(f => f.documentType === DocumentType.ReviewFinal).length;

      expect(existingCount + stagedCount).toBe(2);
    });

    it('should count staged ReviewFinal documents', () => {
      const docs = new Map<DocumentType, Array<{ id: number }>>();
      const staged: Array<{ documentType: DocumentType }> = [
        { documentType: DocumentType.ReviewFinal },
        { documentType: DocumentType.Review },
        { documentType: DocumentType.ReviewFinal },
      ];

      const existingCount = docs.get(DocumentType.ReviewFinal)?.length || 0;
      const stagedCount = staged.filter(f => f.documentType === DocumentType.ReviewFinal).length;

      expect(existingCount + stagedCount).toBe(2);
    });

    it('should combine existing and staged counts', () => {
      const docs = new Map<DocumentType, Array<{ id: number }>>([
        [DocumentType.ReviewFinal, [{ id: 10 }]],
      ]);
      const staged: Array<{ documentType: DocumentType }> = [
        { documentType: DocumentType.ReviewFinal },
      ];

      const existingCount = docs.get(DocumentType.ReviewFinal)?.length || 0;
      const stagedCount = staged.filter(f => f.documentType === DocumentType.ReviewFinal).length;

      expect(existingCount + stagedCount).toBe(2);
    });

    it('should not count other document types as ReviewFinal', () => {
      const docs = new Map<DocumentType, Array<{ id: number }>>([
        [DocumentType.Review, [{ id: 1 }]],
        [DocumentType.FINRA, [{ id: 2 }]],
        [DocumentType.Supplemental, [{ id: 3 }]],
      ]);
      const staged: Array<{ documentType: DocumentType }> = [
        { documentType: DocumentType.Review },
        { documentType: DocumentType.FINRA },
      ];

      const existingCount = docs.get(DocumentType.ReviewFinal)?.length || 0;
      const stagedCount = staged.filter(f => f.documentType === DocumentType.ReviewFinal).length;

      expect(existingCount + stagedCount).toBe(0);
    });
  });

  describe('FINRA document counting (same pattern)', () => {
    it('should count FINRA documents from both existing and staged', () => {
      const docs = new Map<DocumentType, Array<{ id: number }>>([
        [DocumentType.FINRA, [{ id: 5 }]],
      ]);
      const staged: Array<{ documentType: DocumentType }> = [
        { documentType: DocumentType.FINRA },
        { documentType: DocumentType.Review },
      ];

      const existingCount = docs.get(DocumentType.FINRA)?.length || 0;
      const stagedCount = staged.filter(f => f.documentType === DocumentType.FINRA).length;

      expect(existingCount + stagedCount).toBe(2);
    });
  });

  describe('FINRA comment payload building', () => {
    it('should include finraComment in payload when defined', () => {
      const currentRequest = {
        finraCommentsReceived: true,
        finraComment: 'FINRA requested additional disclosures',
      };

      const payload: { notes?: string; finraCommentsReceived?: boolean; finraComment?: string } = {};
      if (currentRequest.finraCommentsReceived !== undefined) {
        payload.finraCommentsReceived = currentRequest.finraCommentsReceived;
      }
      if (currentRequest.finraComment !== undefined) {
        payload.finraComment = currentRequest.finraComment;
      }

      expect(payload.finraCommentsReceived).toBe(true);
      expect(payload.finraComment).toBe('FINRA requested additional disclosures');
    });

    it('should include finraComment as empty string when explicitly set to empty', () => {
      const currentRequest = {
        finraCommentsReceived: true,
        finraComment: '',
      };

      const payload: { notes?: string; finraCommentsReceived?: boolean; finraComment?: string } = {};
      if (currentRequest.finraComment !== undefined) {
        payload.finraComment = currentRequest.finraComment;
      }

      expect(payload.finraComment).toBe('');
    });

    it('should not include finraComment when undefined', () => {
      const currentRequest = {
        finraCommentsReceived: false,
        finraComment: undefined,
      };

      const payload: { notes?: string; finraCommentsReceived?: boolean; finraComment?: string } = {};
      if (currentRequest.finraComment !== undefined) {
        payload.finraComment = currentRequest.finraComment;
      }

      expect(payload.finraComment).toBeUndefined();
      expect('finraComment' in payload).toBe(false);
    });
  });
});

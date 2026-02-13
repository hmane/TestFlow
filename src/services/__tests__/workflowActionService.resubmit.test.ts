/**
 * Workflow Action Service - Resubmit Workflow Tests
 *
 * Tests for the "Respond To Comments And Resubmit" workflow:
 * - resubmitForLegalReview - Submitter resubmits after addressing attorney comments
 * - resubmitForComplianceReview - Submitter resubmits after addressing compliance comments
 * - requestLegalReviewChanges - Attorney requests changes from submitter
 * - requestComplianceReviewChanges - Compliance reviewer requests changes from submitter
 *
 * Workflow summary:
 * 1. Reviewer sets outcome to "Respond To Comments And Resubmit"
 * 2. Review status changes to "Waiting On Submitter"
 * 3. Submitter addresses comments and clicks resubmit
 * 4. Review status changes to "Waiting On Attorney/Compliance"
 * 5. Reviewer reviews again (can repeat or set final outcome)
 */

import type { ILegalRequest } from '@appTypes/requestTypes';
import { ReviewOutcome, LegalReviewStatus, ComplianceReviewStatus } from '@appTypes/workflowTypes';

// Mock all external dependencies
jest.mock('spfx-toolkit/lib/utilities/context', () => ({
  SPContext: {
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      success: jest.fn(),
    },
    currentUser: {
      id: 1,
      email: 'submitter@example.com',
      title: 'Test Submitter',
      loginName: 'i:0#.f|membership|submitter@example.com',
    },
    sp: {
      web: {
        lists: {
          getByTitle: jest.fn().mockReturnValue({
            items: {
              getById: jest.fn().mockReturnValue({
                update: jest.fn().mockResolvedValue({}),
              }),
            },
          }),
        },
      },
    },
  },
}));

jest.mock('spfx-toolkit/lib/utilities/context/pnpImports/lists', () => ({}));

jest.mock('spfx-toolkit/lib/utilities/listItemHelper', () => ({
  createSPUpdater: () => {
    const updates: Record<string, unknown> = {};
    return {
      set: (field: string, value: unknown) => {
        updates[field] = value;
      },
      setChoice: (field: string, value: unknown) => {
        updates[field] = value;
      },
      setUser: (field: string, value: unknown) => {
        if (value && typeof value === 'object' && 'id' in value) {
          updates[`${field}Id`] = (value as { id: string | number }).id;
        }
      },
      setDate: (field: string, value: unknown) => {
        updates[field] = value instanceof Date ? value.toISOString() : value;
      },
      setText: (field: string, value: unknown) => {
        updates[field] = value;
      },
      getUpdates: () => updates,
    };
  },
}));

// Mock timeTrackingService
const mockCalculateAndUpdateStageTime = jest.fn();

jest.mock('../timeTrackingService', () => ({
  calculateAndUpdateStageTime: (...args: unknown[]) => mockCalculateAndUpdateStageTime(...args),
  pauseTimeTracking: jest.fn().mockResolvedValue({}),
  resumeTimeTracking: jest.fn().mockResolvedValue({}),
}));

// Mock other services
jest.mock('../azureFunctionService', () => ({
  manageRequestPermissions: jest.fn().mockResolvedValue({}),
}));

// Track the mock implementation for loadRequestById
const mockLoadRequestById = jest.fn();

jest.mock('../requestLoadService', () => ({
  loadRequestById: (id: number) => mockLoadRequestById(id),
}));

jest.mock('../../utils/correlationId', () => ({
  generateCorrelationId: jest.fn().mockReturnValue('test-correlation-id'),
}));

// Import after mocks are set up
import {
  resubmitForLegalReview,
  resubmitForComplianceReview,
  requestLegalReviewChanges,
  requestComplianceReviewChanges,
} from '../workflowActionService';

describe('Workflow Action Service - Resubmit Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockCalculateAndUpdateStageTime.mockResolvedValue({
      legalReviewSubmitterHours: 1.5,
      totalSubmitterHours: 1.5,
      totalReviewerHours: 4.0,
    });
  });

  describe('resubmitForLegalReview', () => {
    beforeEach(() => {
      // Set up request in WaitingOnSubmitter state
      // The mock returns updated data after reload
      mockLoadRequestById.mockResolvedValue({
        id: 1,
        requestId: 'CRR-2025-001',
        requestTitle: 'Test Request',
        status: 'In Review',
        reviewAudience: 'Legal',
        legalReviewStatus: LegalReviewStatus.WaitingOnSubmitter,
        legalReviewOutcome: ReviewOutcome.RespondToCommentsAndResubmit,
        legalReviewNotes: 'Please update the disclosures',
        legalStatusUpdatedOn: new Date('2025-12-29T10:00:00Z'),
        attorney: [{ id: 2, title: 'Test Attorney', email: 'attorney@example.com' }],
      } as Partial<ILegalRequest>);
    });

    it('should succeed when request is in WaitingOnSubmitter state', async () => {
      const result = await resubmitForLegalReview(1, {
        notes: 'Updated the disclosures as requested',
      });

      expect(result.success).toBe(true);
    });

    it('should update LegalReviewStatus field', async () => {
      const result = await resubmitForLegalReview(1, {
        notes: 'Changes made',
      });

      expect(result.success).toBe(true);
      expect(result.fieldsUpdated).toContain('LegalReviewStatus');
    });

    it('should calculate submitter time tracking during resubmit', async () => {
      await resubmitForLegalReview(1, {
        notes: 'Changes made',
      });

      expect(mockCalculateAndUpdateStageTime).toHaveBeenCalledTimes(1);
      expect(mockCalculateAndUpdateStageTime).toHaveBeenCalledWith(
        expect.any(Object), // request
        'LegalReview',
        'Attorney' // Handoff is to attorney
      );
    });

    it('should update LegalStatusUpdatedOn timestamp', async () => {
      const result = await resubmitForLegalReview(1, {
        notes: 'Updated',
      });

      expect(result.fieldsUpdated).toContain('LegalStatusUpdatedOn');
    });

    it('should include submitter notes in update if provided', async () => {
      const result = await resubmitForLegalReview(1, {
        notes: 'I updated the disclosures section as requested',
      });

      expect(result.fieldsUpdated).toContain('LegalReviewNotes');
    });

    it('should fail if request is not in WaitingOnSubmitter state', async () => {
      mockLoadRequestById.mockResolvedValue({
        id: 1,
        requestId: 'CRR-2025-001',
        status: 'In Review',
        legalReviewStatus: LegalReviewStatus.InProgress, // Wrong state
        legalReviewOutcome: undefined,
      });

      await expect(resubmitForLegalReview(1, {})).rejects.toThrow();
    });

    it('should fail if outcome is not RespondToCommentsAndResubmit', async () => {
      mockLoadRequestById.mockResolvedValue({
        id: 1,
        requestId: 'CRR-2025-001',
        status: 'In Review',
        legalReviewStatus: LegalReviewStatus.WaitingOnSubmitter,
        legalReviewOutcome: ReviewOutcome.Approved, // Wrong outcome
      });

      await expect(resubmitForLegalReview(1, {})).rejects.toThrow();
    });

    it('should work without notes', async () => {
      const result = await resubmitForLegalReview(1, {});

      expect(result.success).toBe(true);
      expect(result.fieldsUpdated).toContain('LegalReviewStatus');
    });
  });

  describe('resubmitForComplianceReview', () => {
    beforeEach(() => {
      // Set up request in WaitingOnSubmitter state for compliance
      mockLoadRequestById.mockResolvedValue({
        id: 1,
        requestId: 'CRR-2025-001',
        requestTitle: 'Test Request',
        status: 'In Review',
        reviewAudience: 'Compliance',
        complianceReviewStatus: ComplianceReviewStatus.WaitingOnSubmitter,
        complianceReviewOutcome: ReviewOutcome.RespondToCommentsAndResubmit,
        complianceReviewNotes: 'Please provide additional disclaimers',
        complianceStatusUpdatedOn: new Date('2025-12-29T10:00:00Z'),
      } as Partial<ILegalRequest>);

      mockCalculateAndUpdateStageTime.mockResolvedValue({
        complianceReviewSubmitterHours: 2.0,
        totalSubmitterHours: 2.0,
        totalReviewerHours: 3.0,
      });
    });

    it('should succeed and update ComplianceReviewStatus', async () => {
      const result = await resubmitForComplianceReview(1, {
        notes: 'Added the disclaimers',
      });

      expect(result.success).toBe(true);
      expect(result.fieldsUpdated).toContain('ComplianceReviewStatus');
    });

    it('should calculate submitter time tracking during resubmit', async () => {
      await resubmitForComplianceReview(1, {
        notes: 'Changes made',
      });

      expect(mockCalculateAndUpdateStageTime).toHaveBeenCalledTimes(1);
      expect(mockCalculateAndUpdateStageTime).toHaveBeenCalledWith(
        expect.any(Object),
        'ComplianceReview',
        'Reviewer' // Handoff is to reviewer (generic term for compliance)
      );
    });

    it('should fail if request is not in WaitingOnSubmitter state', async () => {
      mockLoadRequestById.mockResolvedValue({
        id: 1,
        status: 'In Review',
        complianceReviewStatus: ComplianceReviewStatus.InProgress, // Wrong state
      });

      await expect(resubmitForComplianceReview(1, {})).rejects.toThrow();
    });
  });

  describe('requestLegalReviewChanges', () => {
    beforeEach(() => {
      // Set up request in InProgress state
      mockLoadRequestById.mockResolvedValue({
        id: 1,
        requestId: 'CRR-2025-001',
        status: 'In Review',
        reviewAudience: 'Legal',
        legalReviewStatus: LegalReviewStatus.InProgress,
        legalStatusUpdatedOn: new Date('2025-12-28T10:00:00Z'),
        attorney: [{ id: 2, title: 'Test Attorney', email: 'attorney@example.com' }],
      } as Partial<ILegalRequest>);

      mockCalculateAndUpdateStageTime.mockResolvedValue({
        legalReviewAttorneyHours: 2.5,
        totalReviewerHours: 2.5,
        totalSubmitterHours: 0,
      });
    });

    it('should succeed and update LegalReviewStatus', async () => {
      const result = await requestLegalReviewChanges(1, 'Please update disclosures');

      expect(result.success).toBe(true);
      expect(result.fieldsUpdated).toContain('LegalReviewStatus');
    });

    it('should set LegalReviewOutcome field', async () => {
      const result = await requestLegalReviewChanges(1, 'Please update disclosures');

      expect(result.success).toBe(true);
      expect(result.fieldsUpdated).toContain('LegalReviewOutcome');
    });

    it('should calculate attorney time tracking when requesting changes', async () => {
      await requestLegalReviewChanges(1, 'Please update');

      expect(mockCalculateAndUpdateStageTime).toHaveBeenCalledTimes(1);
      expect(mockCalculateAndUpdateStageTime).toHaveBeenCalledWith(
        expect.any(Object),
        'LegalReview',
        'Submitter' // Handoff is to submitter
      );
    });

    it('should include notes in update', async () => {
      const result = await requestLegalReviewChanges(1, 'Please fix the fund list disclosures');

      expect(result.fieldsUpdated).toContain('LegalReviewNotes');
    });

    it('should update LegalStatusUpdatedOn timestamp', async () => {
      const result = await requestLegalReviewChanges(1, 'Changes needed');

      expect(result.fieldsUpdated).toContain('LegalStatusUpdatedOn');
    });

    it('should log warning if legal review is in unexpected state', async () => {
      // Note: The service currently allows the action but logs a warning
      // State validation is primarily enforced by the UI
      mockLoadRequestById.mockResolvedValue({
        id: 1,
        status: 'In Review',
        legalReviewStatus: LegalReviewStatus.Completed, // Unexpected state
      });

      const result = await requestLegalReviewChanges(1, 'Notes');
      // Service still succeeds but this is an edge case
      // In production, the UI prevents this from happening
      expect(result.success).toBe(true);
    });
  });

  describe('requestComplianceReviewChanges', () => {
    beforeEach(() => {
      // Set up request in InProgress state for compliance
      mockLoadRequestById.mockResolvedValue({
        id: 1,
        requestId: 'CRR-2025-001',
        status: 'In Review',
        reviewAudience: 'Compliance',
        complianceReviewStatus: ComplianceReviewStatus.InProgress,
        complianceStatusUpdatedOn: new Date('2025-12-28T10:00:00Z'),
      } as Partial<ILegalRequest>);

      mockCalculateAndUpdateStageTime.mockResolvedValue({
        complianceReviewReviewerHours: 1.5,
        totalReviewerHours: 1.5,
        totalSubmitterHours: 0,
      });
    });

    it('should succeed and update ComplianceReviewStatus', async () => {
      const result = await requestComplianceReviewChanges(1, 'Add disclaimers');

      expect(result.success).toBe(true);
      expect(result.fieldsUpdated).toContain('ComplianceReviewStatus');
    });

    it('should set ComplianceReviewOutcome field', async () => {
      const result = await requestComplianceReviewChanges(1, 'Add disclaimers');

      expect(result.success).toBe(true);
      expect(result.fieldsUpdated).toContain('ComplianceReviewOutcome');
    });

    it('should preserve Foreside and Retail flags if provided', async () => {
      const result = await requestComplianceReviewChanges(
        1,
        'Add disclaimers',
        true, // isForesideReviewRequired
        false // isRetailUse
      );

      expect(result.success).toBe(true);
      expect(result.fieldsUpdated).toContain('IsForesideReviewRequired');
      expect(result.fieldsUpdated).toContain('IsRetailUse');
    });

    it('should log warning if compliance review is in unexpected state', async () => {
      // Note: The service currently allows the action but logs a warning
      // State validation is primarily enforced by the UI
      mockLoadRequestById.mockResolvedValue({
        id: 1,
        status: 'In Review',
        complianceReviewStatus: ComplianceReviewStatus.Completed, // Unexpected state
      });

      const result = await requestComplianceReviewChanges(1, 'Notes');
      // Service still succeeds but this is an edge case
      expect(result.success).toBe(true);
    });
  });

  describe('Full resubmit cycle', () => {
    it('should support attorney requesting changes followed by submitter resubmit', async () => {
      // First: Attorney requests changes
      mockLoadRequestById.mockResolvedValue({
        id: 1,
        status: 'In Review',
        legalReviewStatus: LegalReviewStatus.InProgress,
      });

      const requestResult = await requestLegalReviewChanges(1, 'First round of changes');
      expect(requestResult.success).toBe(true);
      expect(requestResult.fieldsUpdated).toContain('LegalReviewStatus');
      expect(requestResult.fieldsUpdated).toContain('LegalReviewOutcome');

      // Second: Submitter resubmits
      mockLoadRequestById.mockResolvedValue({
        id: 1,
        status: 'In Review',
        legalReviewStatus: LegalReviewStatus.WaitingOnSubmitter,
        legalReviewOutcome: ReviewOutcome.RespondToCommentsAndResubmit,
      });

      const resubmitResult = await resubmitForLegalReview(1, { notes: 'Made changes' });
      expect(resubmitResult.success).toBe(true);
      expect(resubmitResult.fieldsUpdated).toContain('LegalReviewStatus');
    });
  });

  describe('Time tracking accuracy', () => {
    it('should track submitter hours during resubmit correctly', async () => {
      mockLoadRequestById.mockResolvedValue({
        id: 1,
        status: 'In Review',
        legalReviewStatus: LegalReviewStatus.WaitingOnSubmitter,
        legalReviewOutcome: ReviewOutcome.RespondToCommentsAndResubmit,
        legalStatusUpdatedOn: new Date('2025-12-29T08:00:00Z'),
        legalReviewSubmitterHours: 1.0, // Already has 1 hour logged
      });

      mockCalculateAndUpdateStageTime.mockResolvedValue({
        legalReviewSubmitterHours: 2.5, // 1 existing + 1.5 new
        totalSubmitterHours: 2.5,
        totalReviewerHours: 4.0,
      });

      const result = await resubmitForLegalReview(1, { notes: 'Done' });

      expect(result.success).toBe(true);
      expect(result.fieldsUpdated).toContain('LegalReviewSubmitterHours');
      expect(result.fieldsUpdated).toContain('TotalSubmitterHours');
    });

    it('should track attorney hours during request changes correctly', async () => {
      mockLoadRequestById.mockResolvedValue({
        id: 1,
        status: 'In Review',
        legalReviewStatus: LegalReviewStatus.InProgress,
        legalReviewAttorneyHours: 2.0, // Already has 2 hours
      });

      mockCalculateAndUpdateStageTime.mockResolvedValue({
        legalReviewAttorneyHours: 3.5, // 2 existing + 1.5 new
        totalReviewerHours: 3.5,
        totalSubmitterHours: 1.0,
      });

      const result = await requestLegalReviewChanges(1, 'Need changes');

      expect(result.success).toBe(true);
      expect(result.fieldsUpdated).toContain('LegalReviewAttorneyHours');
      expect(result.fieldsUpdated).toContain('TotalReviewerHours');
    });
  });

  describe('Error handling', () => {
    it('should handle time tracking errors gracefully during resubmit', async () => {
      mockLoadRequestById.mockResolvedValue({
        id: 1,
        status: 'In Review',
        legalReviewStatus: LegalReviewStatus.WaitingOnSubmitter,
        legalReviewOutcome: ReviewOutcome.RespondToCommentsAndResubmit,
      });

      mockCalculateAndUpdateStageTime.mockRejectedValue(new Error('Time tracking failed'));

      // Should not throw - time tracking is secondary
      const result = await resubmitForLegalReview(1, { notes: 'Done' });

      expect(result.success).toBe(true);
      expect(result.fieldsUpdated).toContain('LegalReviewStatus');
    });

    it('should handle time tracking errors gracefully during request changes', async () => {
      mockLoadRequestById.mockResolvedValue({
        id: 1,
        status: 'In Review',
        legalReviewStatus: LegalReviewStatus.InProgress,
      });

      mockCalculateAndUpdateStageTime.mockRejectedValue(new Error('Time tracking failed'));

      // Should not throw
      const result = await requestLegalReviewChanges(1, 'Need changes');

      expect(result.success).toBe(true);
      expect(result.fieldsUpdated).toContain('LegalReviewStatus');
    });
  });
});

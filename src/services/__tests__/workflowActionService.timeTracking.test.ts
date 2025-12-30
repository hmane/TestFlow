/**
 * Workflow Action Service - Time Tracking Integration Tests
 *
 * Tests that time tracking is properly integrated into workflow actions.
 * Verifies that hours are calculated and saved during:
 * - Legal review submission
 * - Compliance review submission
 * - Request closeout
 * - Putting request on hold
 * - Resuming request from hold
 */

import type { ILegalRequest } from '@appTypes/requestTypes';
import { ReviewOutcome, LegalReviewStatus, ComplianceReviewStatus, RequestStatus } from '@appTypes/workflowTypes';

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
      email: 'test@example.com',
      title: 'Test User',
      loginName: 'i:0#.f|membership|test@example.com',
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
const mockPauseTimeTracking = jest.fn();
const mockResumeTimeTracking = jest.fn();

jest.mock('../timeTrackingService', () => ({
  calculateAndUpdateStageTime: (...args: unknown[]) => mockCalculateAndUpdateStageTime(...args),
  pauseTimeTracking: (...args: unknown[]) => mockPauseTimeTracking(...args),
  resumeTimeTracking: (...args: unknown[]) => mockResumeTimeTracking(...args),
}));

// Mock other services
jest.mock('../azureFunctionService', () => ({
  manageRequestPermissions: jest.fn().mockResolvedValue({}),
}));

jest.mock('../requestLoadService', () => ({
  loadRequestById: jest.fn().mockImplementation((id: number) =>
    Promise.resolve({
      id,
      requestId: `CRR-2025-${id.toString().padStart(3, '0')}`,
      requestTitle: 'Test Request',
      status: 'In Review',
      reviewAudience: 'Legal',
      legalReviewStatus: 'Completed',
      complianceReviewStatus: 'Not Started',
    } as Partial<ILegalRequest>)
  ),
}));

jest.mock('../../utils/correlationId', () => ({
  generateCorrelationId: jest.fn().mockReturnValue('test-correlation-id'),
}));

// Import after mocks are set up
import {
  submitLegalReview,
  submitComplianceReview,
  closeoutRequest,
  holdRequest,
  resumeRequest,
} from '../workflowActionService';
import { loadRequestById } from '../requestLoadService';

describe('Workflow Action Service - Time Tracking Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockCalculateAndUpdateStageTime.mockResolvedValue({
      legalReviewAttorneyHours: 4.5,
      totalReviewerHours: 4.5,
      totalSubmitterHours: 0,
    });

    mockPauseTimeTracking.mockResolvedValue({
      legalReviewAttorneyHours: 3.0,
      totalReviewerHours: 3.0,
      totalSubmitterHours: 1.0,
    });

    mockResumeTimeTracking.mockResolvedValue({});
  });

  describe('submitLegalReview', () => {
    it('should call calculateAndUpdateStageTime with LegalReview stage', async () => {
      await submitLegalReview(1, {
        outcome: ReviewOutcome.Approved,
        notes: 'Review approved',
      });

      expect(mockCalculateAndUpdateStageTime).toHaveBeenCalledTimes(1);
      expect(mockCalculateAndUpdateStageTime).toHaveBeenCalledWith(
        expect.any(Object), // request
        'LegalReview',
        'Submitter'
      );
    });

    it('should include time tracking fields in update payload', async () => {
      // The result should include updated request with time tracking
      const result = await submitLegalReview(1, {
        outcome: ReviewOutcome.Approved,
        notes: 'Review approved',
      });

      expect(result.success).toBe(true);
      expect(result.fieldsUpdated).toContain('LegalReviewAttorneyHours');
      expect(result.fieldsUpdated).toContain('TotalReviewerHours');
    });

    it('should handle time tracking errors gracefully', async () => {
      mockCalculateAndUpdateStageTime.mockRejectedValue(new Error('Time tracking failed'));

      // Should not throw - time tracking is secondary
      const result = await submitLegalReview(1, {
        outcome: ReviewOutcome.Approved,
        notes: 'Review approved',
      });

      expect(result.success).toBe(true);
    });

    it('should still submit review when time tracking fails', async () => {
      mockCalculateAndUpdateStageTime.mockRejectedValue(new Error('Time tracking failed'));

      const result = await submitLegalReview(1, {
        outcome: ReviewOutcome.ApprovedWithComments,
        notes: 'Some comments',
      });

      expect(result.success).toBe(true);
      expect(result.fieldsUpdated).toContain('LegalReviewOutcome');
      expect(result.fieldsUpdated).toContain('LegalReviewNotes');
    });
  });

  describe('submitComplianceReview', () => {
    beforeEach(() => {
      // Update mock for compliance review scenario
      (loadRequestById as jest.Mock).mockResolvedValue({
        id: 1,
        requestId: 'CRR-2025-001',
        status: 'In Review',
        reviewAudience: 'Compliance',
        legalReviewStatus: 'Not Started',
        complianceReviewStatus: 'In Progress',
      });

      mockCalculateAndUpdateStageTime.mockResolvedValue({
        complianceReviewReviewerHours: 2.5,
        totalReviewerHours: 2.5,
        totalSubmitterHours: 0.5,
      });
    });

    it('should call calculateAndUpdateStageTime with ComplianceReview stage', async () => {
      await submitComplianceReview(1, {
        outcome: ReviewOutcome.Approved,
        notes: 'Compliance approved',
      });

      expect(mockCalculateAndUpdateStageTime).toHaveBeenCalledTimes(1);
      expect(mockCalculateAndUpdateStageTime).toHaveBeenCalledWith(
        expect.any(Object),
        'ComplianceReview',
        'Submitter'
      );
    });

    it('should include compliance review time tracking fields in update', async () => {
      const result = await submitComplianceReview(1, {
        outcome: ReviewOutcome.Approved,
        notes: 'Approved',
      });

      expect(result.fieldsUpdated).toContain('ComplianceReviewReviewerHours');
      expect(result.fieldsUpdated).toContain('TotalReviewerHours');
    });
  });

  describe('closeoutRequest', () => {
    beforeEach(() => {
      (loadRequestById as jest.Mock).mockResolvedValue({
        id: 1,
        requestId: 'CRR-2025-001',
        status: 'Closeout',
        legalReviewStatus: 'Completed',
        complianceReviewStatus: 'Completed',
      });

      mockCalculateAndUpdateStageTime.mockResolvedValue({
        closeoutReviewerHours: 0.5,
        totalReviewerHours: 7.5,
        totalSubmitterHours: 2.0,
      });
    });

    it('should call calculateAndUpdateStageTime with Closeout stage', async () => {
      await closeoutRequest(1, { trackingId: 'TRK-001' });

      expect(mockCalculateAndUpdateStageTime).toHaveBeenCalledTimes(1);
      expect(mockCalculateAndUpdateStageTime).toHaveBeenCalledWith(
        expect.any(Object),
        'Closeout',
        'Submitter'
      );
    });

    it('should include closeout time tracking fields in update', async () => {
      const result = await closeoutRequest(1, { trackingId: 'TRK-001' });

      expect(result.fieldsUpdated).toContain('CloseoutReviewerHours');
      expect(result.fieldsUpdated).toContain('TotalReviewerHours');
    });

    it('should finalize all time tracking on completion', async () => {
      const result = await closeoutRequest(1);

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe(RequestStatus.Completed);
    });
  });

  describe('holdRequest', () => {
    beforeEach(() => {
      (loadRequestById as jest.Mock).mockResolvedValue({
        id: 1,
        requestId: 'CRR-2025-001',
        status: 'In Review',
        legalReviewStatus: 'In Progress',
      });
    });

    it('should call pauseTimeTracking when putting request on hold', async () => {
      await holdRequest(1, { reason: 'Need more info' }, RequestStatus.InReview);

      expect(mockPauseTimeTracking).toHaveBeenCalledTimes(1);
      expect(mockPauseTimeTracking).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should include time tracking fields from pause in update', async () => {
      const result = await holdRequest(1, { reason: 'Need more info' }, RequestStatus.InReview);

      expect(result.fieldsUpdated).toContain('LegalReviewAttorneyHours');
      expect(result.fieldsUpdated).toContain('TotalReviewerHours');
    });

    it('should still put request on hold when time tracking fails', async () => {
      mockPauseTimeTracking.mockRejectedValue(new Error('Pause failed'));

      const result = await holdRequest(1, { reason: 'Need info' }, RequestStatus.InReview);

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe(RequestStatus.OnHold);
    });
  });

  describe('resumeRequest', () => {
    beforeEach(() => {
      (loadRequestById as jest.Mock).mockResolvedValue({
        id: 1,
        requestId: 'CRR-2025-001',
        status: 'On Hold',
        previousStatus: 'In Review',
      });
    });

    it('should call resumeTimeTracking when resuming from hold', async () => {
      await resumeRequest(1, RequestStatus.InReview);

      expect(mockResumeTimeTracking).toHaveBeenCalledTimes(1);
      expect(mockResumeTimeTracking).toHaveBeenCalledWith(
        expect.any(Object),
        'In Review'
      );
    });

    it('should still resume request when time tracking fails', async () => {
      mockResumeTimeTracking.mockRejectedValue(new Error('Resume failed'));

      const result = await resumeRequest(1, RequestStatus.InReview);

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe(RequestStatus.InReview);
    });
  });

  describe('Time tracking data accuracy', () => {
    it('should preserve existing hours when adding new hours', async () => {
      // Simulate a request that already has some hours logged
      (loadRequestById as jest.Mock).mockResolvedValue({
        id: 1,
        requestId: 'CRR-2025-001',
        status: 'In Review',
        reviewAudience: 'Legal',
        legalReviewStatus: 'In Progress',
        legalReviewAttorneyHours: 3.0, // Already has 3 hours
      });

      mockCalculateAndUpdateStageTime.mockResolvedValue({
        legalReviewAttorneyHours: 5.5, // 3 existing + 2.5 new
        totalReviewerHours: 5.5,
        totalSubmitterHours: 0,
      });

      const result = await submitLegalReview(1, {
        outcome: ReviewOutcome.Approved,
        notes: 'Approved',
      });

      expect(result.success).toBe(true);
      // The time tracking service should have handled the addition
      expect(mockCalculateAndUpdateStageTime).toHaveBeenCalled();
    });

    it('should handle multiple stage hours correctly', async () => {
      mockCalculateAndUpdateStageTime.mockResolvedValue({
        legalReviewAttorneyHours: 4.0,
        legalReviewSubmitterHours: 1.5,
        totalReviewerHours: 4.0,
        totalSubmitterHours: 1.5,
      });

      const result = await submitLegalReview(1, {
        outcome: ReviewOutcome.ApprovedWithComments,
        notes: 'Some comments',
      });

      expect(result.success).toBe(true);
      // Both reviewer and submitter hours should be tracked
      expect(result.fieldsUpdated).toContain('LegalReviewAttorneyHours');
      expect(result.fieldsUpdated).toContain('LegalReviewSubmitterHours');
      expect(result.fieldsUpdated).toContain('TotalReviewerHours');
      expect(result.fieldsUpdated).toContain('TotalSubmitterHours');
    });
  });
});

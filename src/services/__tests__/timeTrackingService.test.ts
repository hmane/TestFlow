/**
 * Time Tracking Service Tests
 *
 * Tests the business hours calculation and time tracking updates for workflow stages.
 * These tests verify that time is accurately tracked for analytics reporting.
 */

import {
  calculateAndUpdateStageTime,
  pauseTimeTracking,
  resumeTimeTracking,
  getStageCurrentOwner,
  getStageLastHandoffDate,
} from '../timeTrackingService';
import type { ILegalRequest, TimeTrackingStage } from '@appTypes/requestTypes';
import { LegalReviewStatus, ComplianceReviewStatus } from '@appTypes/workflowTypes';

// Mock SPContext
jest.mock('spfx-toolkit/lib/utilities/context', () => ({
  SPContext: {
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      success: jest.fn(),
    },
  },
}));

// Mock configurationService
jest.mock('../configurationService', () => ({
  getWorkingHoursConfig: jest.fn().mockResolvedValue({
    startHour: 8,
    endHour: 17,
    workingDays: [1, 2, 3, 4, 5],
  }),
}));

describe('Time Tracking Service', () => {
  // Helper to create a base request for testing
  const createBaseRequest = (overrides: Partial<ILegalRequest> = {}): ILegalRequest => ({
    id: 1,
    requestId: 'CRR-2025-001',
    requestType: 'Communication',
    requestTitle: 'Test Request',
    status: 'In Review',
    legalReviewAttorneyHours: 0,
    legalReviewSubmitterHours: 0,
    complianceReviewReviewerHours: 0,
    complianceReviewSubmitterHours: 0,
    closeoutReviewerHours: 0,
    closeoutSubmitterHours: 0,
    legalIntakeLegalAdminHours: 0,
    legalIntakeSubmitterHours: 0,
    totalReviewerHours: 0,
    totalSubmitterHours: 0,
    ...overrides,
  } as ILegalRequest);

  describe('getStageCurrentOwner', () => {
    it('should return undefined for LegalIntake stage (not status-based yet)', () => {
      const request = createBaseRequest();
      const owner = getStageCurrentOwner(request, 'LegalIntake');
      expect(owner).toBeUndefined();
    });

    it('should return Attorney when legal review is In Progress', () => {
      const request = createBaseRequest({
        legalReviewStatus: LegalReviewStatus.InProgress,
      });
      const owner = getStageCurrentOwner(request, 'LegalReview');
      expect(owner).toBe('Attorney');
    });

    it('should return Attorney when legal review is Waiting On Attorney', () => {
      const request = createBaseRequest({
        legalReviewStatus: LegalReviewStatus.WaitingOnAttorney,
      });
      const owner = getStageCurrentOwner(request, 'LegalReview');
      expect(owner).toBe('Attorney');
    });

    it('should return Submitter when legal review is Waiting On Submitter', () => {
      const request = createBaseRequest({
        legalReviewStatus: LegalReviewStatus.WaitingOnSubmitter,
      });
      const owner = getStageCurrentOwner(request, 'LegalReview');
      expect(owner).toBe('Submitter');
    });

    it('should return undefined when legal review status is unknown', () => {
      const request = createBaseRequest({
        legalReviewStatus: LegalReviewStatus.Completed,
      });
      const owner = getStageCurrentOwner(request, 'LegalReview');
      expect(owner).toBeUndefined();
    });

    it('should return Reviewer when compliance review is In Progress', () => {
      const request = createBaseRequest({
        complianceReviewStatus: ComplianceReviewStatus.InProgress,
      });
      const owner = getStageCurrentOwner(request, 'ComplianceReview');
      expect(owner).toBe('Reviewer');
    });

    it('should return Reviewer when compliance review is Waiting On Compliance', () => {
      const request = createBaseRequest({
        complianceReviewStatus: ComplianceReviewStatus.WaitingOnCompliance,
      });
      const owner = getStageCurrentOwner(request, 'ComplianceReview');
      expect(owner).toBe('Reviewer');
    });

    it('should return Submitter when compliance review is Waiting On Submitter', () => {
      const request = createBaseRequest({
        complianceReviewStatus: ComplianceReviewStatus.WaitingOnSubmitter,
      });
      const owner = getStageCurrentOwner(request, 'ComplianceReview');
      expect(owner).toBe('Submitter');
    });

    it('should return Reviewer for Closeout stage (always reviewer owned)', () => {
      const request = createBaseRequest();
      const owner = getStageCurrentOwner(request, 'Closeout');
      expect(owner).toBe('Reviewer');
    });
  });

  describe('getStageLastHandoffDate', () => {
    it('should return submittedOn for LegalIntake stage', () => {
      const submittedOn = new Date('2025-01-15T10:00:00Z');
      const request = createBaseRequest({ submittedOn });

      const date = getStageLastHandoffDate(request, 'LegalIntake');
      expect(date).toEqual(submittedOn);
    });

    it('should return legalStatusUpdatedOn for LegalReview stage', () => {
      const legalStatusUpdatedOn = new Date('2025-01-16T14:30:00Z');
      const request = createBaseRequest({ legalStatusUpdatedOn });

      const date = getStageLastHandoffDate(request, 'LegalReview');
      expect(date).toEqual(legalStatusUpdatedOn);
    });

    it('should return complianceStatusUpdatedOn for ComplianceReview stage', () => {
      const complianceStatusUpdatedOn = new Date('2025-01-17T09:00:00Z');
      const request = createBaseRequest({ complianceStatusUpdatedOn });

      const date = getStageLastHandoffDate(request, 'ComplianceReview');
      expect(date).toEqual(complianceStatusUpdatedOn);
    });

    it('should return closeoutOn for Closeout stage when available', () => {
      const closeoutOn = new Date('2025-01-18T11:00:00Z');
      const request = createBaseRequest({ closeoutOn });

      const date = getStageLastHandoffDate(request, 'Closeout');
      expect(date).toEqual(closeoutOn);
    });

    it('should fall back to complianceReviewCompletedOn for Closeout when closeoutOn is not set', () => {
      const complianceReviewCompletedOn = new Date('2025-01-17T16:00:00Z');
      const request = createBaseRequest({
        closeoutOn: undefined,
        complianceReviewCompletedOn,
      });

      const date = getStageLastHandoffDate(request, 'Closeout');
      expect(date).toEqual(complianceReviewCompletedOn);
    });

    it('should fall back to legalReviewCompletedOn for Closeout when no other dates available', () => {
      const legalReviewCompletedOn = new Date('2025-01-16T15:00:00Z');
      const request = createBaseRequest({
        closeoutOn: undefined,
        complianceReviewCompletedOn: undefined,
        legalReviewCompletedOn,
      });

      const date = getStageLastHandoffDate(request, 'Closeout');
      expect(date).toEqual(legalReviewCompletedOn);
    });

    it('should return undefined when no date is available', () => {
      const request = createBaseRequest();
      const date = getStageLastHandoffDate(request, 'LegalReview');
      expect(date).toBeUndefined();
    });
  });

  describe('calculateAndUpdateStageTime', () => {
    it('should return empty updates when no previous handoff exists', async () => {
      const request = createBaseRequest({
        legalReviewStatus: LegalReviewStatus.InProgress,
        legalStatusUpdatedOn: undefined, // No previous handoff
      });

      const updates = await calculateAndUpdateStageTime(request, 'LegalReview', 'Submitter');

      // Should still have totals calculated (even if 0)
      expect(updates.totalReviewerHours).toBeDefined();
      expect(updates.totalSubmitterHours).toBeDefined();
    });

    it('should calculate attorney hours for legal review stage', async () => {
      // Attorney worked on this request from 10 AM to 2 PM on a Monday
      const lastHandoff = new Date('2025-02-03T10:00:00'); // Monday 10 AM PST
      const request = createBaseRequest({
        legalReviewStatus: LegalReviewStatus.InProgress,
        legalStatusUpdatedOn: lastHandoff,
        legalReviewAttorneyHours: 2, // Already has 2 hours logged
      });

      // Mock Date.now to return 2 PM same day (4 hours later)
      const now = new Date('2025-02-03T14:00:00');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      const updates = await calculateAndUpdateStageTime(request, 'LegalReview', 'Submitter');

      // Should have 2 (existing) + 4 (new) = 6 hours
      expect(updates.legalReviewAttorneyHours).toBe(6);
      expect(updates.totalReviewerHours).toBe(6);

      jest.useRealTimers();
    });

    it('should calculate compliance reviewer hours', async () => {
      const lastHandoff = new Date('2025-02-03T09:00:00'); // Monday 9 AM PST
      const request = createBaseRequest({
        complianceReviewStatus: ComplianceReviewStatus.InProgress,
        complianceStatusUpdatedOn: lastHandoff,
        complianceReviewReviewerHours: 1,
      });

      const now = new Date('2025-02-03T12:00:00'); // 3 hours later
      jest.useFakeTimers();
      jest.setSystemTime(now);

      const updates = await calculateAndUpdateStageTime(request, 'ComplianceReview', 'Submitter');

      // Should have 1 (existing) + 3 (new) = 4 hours
      expect(updates.complianceReviewReviewerHours).toBe(4);
      expect(updates.totalReviewerHours).toBe(4);

      jest.useRealTimers();
    });

    it('should calculate submitter hours when current owner is Submitter', async () => {
      const lastHandoff = new Date('2025-02-03T10:00:00');
      const request = createBaseRequest({
        legalReviewStatus: LegalReviewStatus.WaitingOnSubmitter,
        legalStatusUpdatedOn: lastHandoff,
        legalReviewSubmitterHours: 0.5,
      });

      const now = new Date('2025-02-03T12:30:00'); // 2.5 hours later
      jest.useFakeTimers();
      jest.setSystemTime(now);

      const updates = await calculateAndUpdateStageTime(request, 'LegalReview', 'Attorney');

      // Should have 0.5 (existing) + 2.5 (new) = 3 hours
      expect(updates.legalReviewSubmitterHours).toBe(3);
      expect(updates.totalSubmitterHours).toBe(3);

      jest.useRealTimers();
    });

    it('should aggregate totals correctly across stages', async () => {
      const lastHandoff = new Date('2025-02-03T10:00:00');
      const request = createBaseRequest({
        legalReviewStatus: LegalReviewStatus.InProgress,
        legalStatusUpdatedOn: lastHandoff,
        legalReviewAttorneyHours: 3,
        legalReviewSubmitterHours: 1,
        complianceReviewReviewerHours: 2,
        complianceReviewSubmitterHours: 0.5,
        legalIntakeLegalAdminHours: 1,
        legalIntakeSubmitterHours: 0,
        closeoutReviewerHours: 0,
        closeoutSubmitterHours: 0,
      });

      const now = new Date('2025-02-03T12:00:00'); // 2 hours later
      jest.useFakeTimers();
      jest.setSystemTime(now);

      const updates = await calculateAndUpdateStageTime(request, 'LegalReview', 'Submitter');

      // Attorney hours: 3 (existing) + 2 (new) = 5
      expect(updates.legalReviewAttorneyHours).toBe(5);

      // Total reviewer: 1 (legal admin) + 5 (attorney) + 2 (compliance) + 0 (closeout) = 8
      expect(updates.totalReviewerHours).toBe(8);

      // Total submitter: 0 (legal intake) + 1 (legal review) + 0.5 (compliance) + 0 (closeout) = 1.5
      expect(updates.totalSubmitterHours).toBe(1.5);

      jest.useRealTimers();
    });
  });

  describe('pauseTimeTracking', () => {
    it('should finalize hours for all active stages when put on hold', async () => {
      const legalHandoff = new Date('2025-02-03T10:00:00');
      const request = createBaseRequest({
        legalReviewStatus: LegalReviewStatus.InProgress,
        legalStatusUpdatedOn: legalHandoff,
        legalReviewAttorneyHours: 2,
      });

      const now = new Date('2025-02-03T14:00:00'); // 4 hours later
      jest.useFakeTimers();
      jest.setSystemTime(now);

      const updates = await pauseTimeTracking(request);

      // Should have 2 (existing) + 4 (new) = 6 hours
      expect(updates.legalReviewAttorneyHours).toBe(6);
      expect(updates.totalReviewerHours).toBe(6);

      jest.useRealTimers();
    });

    it('should return updates with totals even if no active tracking', async () => {
      const request = createBaseRequest({
        legalReviewStatus: LegalReviewStatus.Completed,
        legalReviewAttorneyHours: 5,
        totalReviewerHours: 5,
      });

      const updates = await pauseTimeTracking(request);

      // Totals should be recalculated
      expect(updates.totalReviewerHours).toBeDefined();
      expect(updates.totalSubmitterHours).toBeDefined();
    });
  });

  describe('resumeTimeTracking', () => {
    it('should return empty updates (time tracking resumes via status fields)', async () => {
      const request = createBaseRequest({
        legalReviewStatus: LegalReviewStatus.InProgress,
      });

      const updates = await resumeTimeTracking(request, 'In Review');

      // Function returns empty updates since status fields handle resume
      expect(Object.keys(updates).length).toBe(0);
    });
  });

  describe('Integration: Complete workflow time tracking', () => {
    it('should track time through legal review workflow correctly', async () => {
      // Simulate a request going through legal review

      // Step 1: Attorney starts work (10 AM Monday)
      const startTime = new Date('2025-02-03T10:00:00');
      jest.useFakeTimers();
      jest.setSystemTime(startTime);

      let request = createBaseRequest({
        legalReviewStatus: LegalReviewStatus.InProgress,
        legalStatusUpdatedOn: startTime,
        legalReviewAttorneyHours: 0,
      });

      // Step 2: Attorney works for 3 hours, then sends to submitter (1 PM)
      const handoffTime = new Date('2025-02-03T13:00:00');
      jest.setSystemTime(handoffTime);

      let updates = await calculateAndUpdateStageTime(request, 'LegalReview', 'Submitter');

      expect(updates.legalReviewAttorneyHours).toBe(3);

      // Update request with new values
      request = {
        ...request,
        legalReviewStatus: LegalReviewStatus.WaitingOnSubmitter,
        legalStatusUpdatedOn: handoffTime,
        legalReviewAttorneyHours: updates.legalReviewAttorneyHours || 0,
      };

      // Step 3: Submitter responds after 2 hours (3 PM)
      const submitterResponseTime = new Date('2025-02-03T15:00:00');
      jest.setSystemTime(submitterResponseTime);

      updates = await calculateAndUpdateStageTime(request, 'LegalReview', 'Attorney');

      expect(updates.legalReviewSubmitterHours).toBe(2);

      // Update request
      request = {
        ...request,
        legalReviewStatus: LegalReviewStatus.InProgress,
        legalStatusUpdatedOn: submitterResponseTime,
        legalReviewSubmitterHours: updates.legalReviewSubmitterHours || 0,
      };

      // Step 4: Attorney finalizes review after 1 hour (4 PM)
      const completionTime = new Date('2025-02-03T16:00:00');
      jest.setSystemTime(completionTime);

      updates = await calculateAndUpdateStageTime(request, 'LegalReview', 'Submitter');

      // Attorney hours: 3 (first session) + 1 (final session) = 4
      expect(updates.legalReviewAttorneyHours).toBe(4);
      // Total reviewer: 4 attorney hours
      expect(updates.totalReviewerHours).toBe(4);
      // Total submitter: 2 hours
      expect(updates.totalSubmitterHours).toBe(2);

      jest.useRealTimers();
    });
  });
});

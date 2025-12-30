/**
 * Stage Timing Helper Tests
 *
 * Tests for calculating workflow stage timing information including:
 * - Days in current stage (business days)
 * - Days remaining until target date
 * - Stage start date determination
 * - Overdue status
 */

import {
  getStageTimingInfo,
  calculateDaysSince,
  calculateDaysUntil,
  formatDaysText,
  formatDaysRemainingText,
  formatStageDurationText,
  formatDate,
  getUrgencyLevel,
} from '../stageTimingHelper';
import { RequestStatus } from '@appTypes/workflowTypes';
import type { IStatusListItemData } from '../../types';

// Mock the business hours calculator
jest.mock('@utils/businessHoursCalculator', () => ({
  calculateBusinessHours: jest.fn((start: Date, end: Date) => {
    // Simple mock: calculate hours difference and return it
    const diffMs = end.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    // Assume all hours are business hours for simplicity in tests
    return Math.max(0, diffHours);
  }),
}));

describe('Stage Timing Helper', () => {
  // Helper to create mock item data
  const createMockItemData = (overrides: Partial<IStatusListItemData> = {}): IStatusListItemData => ({
    id: 1,
    requestId: 'CRR-25-001',
    status: RequestStatus.Draft,
    isRushRequest: false,
    reviewAudience: 'Both' as any,
    created: new Date('2025-01-01T10:00:00'),
    createdBy: { id: 1, email: 'user@test.com', title: 'Test User' },
    ...overrides,
  });

  describe('getStageTimingInfo', () => {
    it('should return timing info for Draft status using created date', () => {
      const itemData = createMockItemData({
        status: RequestStatus.Draft,
        created: new Date('2025-01-15T10:00:00'),
      });

      const result = getStageTimingInfo(itemData);

      expect(result.stageStartDate).toEqual(itemData.created);
      expect(result.isRush).toBe(false);
      expect(result.isOverdue).toBe(false);
    });

    it('should return timing info for Legal Intake status using submittedOn date', () => {
      const submittedDate = new Date('2025-01-20T10:00:00');
      const itemData = createMockItemData({
        status: RequestStatus.LegalIntake,
        submittedOn: submittedDate,
      });

      const result = getStageTimingInfo(itemData);

      expect(result.stageStartDate).toEqual(submittedDate);
    });

    it('should return timing info for Assign Attorney status', () => {
      const assignDate = new Date('2025-01-21T10:00:00');
      const itemData = createMockItemData({
        status: RequestStatus.AssignAttorney,
        submittedToAssignAttorneyOn: assignDate,
      });

      const result = getStageTimingInfo(itemData);

      expect(result.stageStartDate).toEqual(assignDate);
    });

    it('should return timing info for In Review status using submittedForReviewOn', () => {
      const reviewDate = new Date('2025-01-22T10:00:00');
      const itemData = createMockItemData({
        status: RequestStatus.InReview,
        submittedForReviewOn: reviewDate,
      });

      const result = getStageTimingInfo(itemData);

      expect(result.stageStartDate).toEqual(reviewDate);
    });

    it('should return timing info for In Review status using legalReviewAssignedOn as fallback', () => {
      const assignedDate = new Date('2025-01-22T14:00:00');
      const itemData = createMockItemData({
        status: RequestStatus.InReview,
        legalReviewAssignedOn: assignedDate,
      });

      const result = getStageTimingInfo(itemData);

      expect(result.stageStartDate).toEqual(assignedDate);
    });

    it('should return timing info for Closeout status using later of legal/compliance completion', () => {
      const legalComplete = new Date('2025-01-25T10:00:00');
      const complianceComplete = new Date('2025-01-26T10:00:00');
      const itemData = createMockItemData({
        status: RequestStatus.Closeout,
        legalReviewCompletedOn: legalComplete,
        complianceReviewCompletedOn: complianceComplete,
      });

      const result = getStageTimingInfo(itemData);

      expect(result.stageStartDate).toEqual(complianceComplete); // Later date
    });

    it('should return timing info for Completed status using closeoutOn date', () => {
      const closeoutDate = new Date('2025-01-28T10:00:00');
      const itemData = createMockItemData({
        status: RequestStatus.Completed,
        closeoutOn: closeoutDate,
      });

      const result = getStageTimingInfo(itemData);

      expect(result.stageStartDate).toEqual(closeoutDate);
    });

    it('should return timing info for Cancelled status using cancelledOn date', () => {
      const cancelDate = new Date('2025-01-15T10:00:00');
      const itemData = createMockItemData({
        status: RequestStatus.Cancelled,
        cancelledOn: cancelDate,
      });

      const result = getStageTimingInfo(itemData);

      expect(result.stageStartDate).toEqual(cancelDate);
    });

    it('should return timing info for On Hold status using onHoldSince date', () => {
      const holdDate = new Date('2025-01-18T10:00:00');
      const itemData = createMockItemData({
        status: RequestStatus.OnHold,
        onHoldSince: holdDate,
      });

      const result = getStageTimingInfo(itemData);

      expect(result.stageStartDate).toEqual(holdDate);
    });

    it('should set isRush flag for rush requests', () => {
      const itemData = createMockItemData({
        isRushRequest: true,
      });

      const result = getStageTimingInfo(itemData);

      expect(result.isRush).toBe(true);
    });

    it('should calculate days remaining when target date is set', () => {
      // Set target date to 5 days from now
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      futureDate.setHours(0, 0, 0, 0);

      const itemData = createMockItemData({
        targetReturnDate: futureDate,
      });

      const result = getStageTimingInfo(itemData);

      expect(result.daysRemaining).toBeDefined();
      expect(result.daysRemaining).toBeGreaterThan(0);
      expect(result.isOverdue).toBe(false);
    });

    it('should set isOverdue when target date has passed', () => {
      // Set target date to 5 days ago
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const itemData = createMockItemData({
        targetReturnDate: pastDate,
      });

      const result = getStageTimingInfo(itemData);

      expect(result.daysRemaining).toBeLessThan(0);
      expect(result.isOverdue).toBe(true);
    });
  });

  describe('calculateDaysSince', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return 0 for dates in the future', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      // Mock returns negative hours, but function should return 0
      const { calculateBusinessHours } = require('@utils/businessHoursCalculator');
      calculateBusinessHours.mockReturnValue(-40);

      const result = calculateDaysSince(futureDate);

      expect(result).toBe(0);
    });

    it('should calculate business days correctly', () => {
      const { calculateBusinessHours } = require('@utils/businessHoursCalculator');
      calculateBusinessHours.mockReturnValue(24); // 3 business days (24/8)

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const result = calculateDaysSince(pastDate);

      expect(result).toBe(3);
    });

    it('should accept string date input', () => {
      const { calculateBusinessHours } = require('@utils/businessHoursCalculator');
      calculateBusinessHours.mockReturnValue(16); // 2 business days

      const result = calculateDaysSince('2025-01-01T10:00:00');

      expect(result).toBe(2);
    });

    it('should accept number (timestamp) date input', () => {
      const { calculateBusinessHours } = require('@utils/businessHoursCalculator');
      calculateBusinessHours.mockReturnValue(8); // 1 business day

      const timestamp = new Date('2025-01-01T10:00:00').getTime();
      const result = calculateDaysSince(timestamp);

      expect(result).toBe(1);
    });
  });

  describe('calculateDaysUntil', () => {
    it('should return positive days for future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      const result = calculateDaysUntil(futureDate);

      expect(result).toBeGreaterThanOrEqual(4); // Account for time normalization
    });

    it('should return negative days for past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const result = calculateDaysUntil(pastDate);

      expect(result).toBeLessThanOrEqual(-4);
    });

    it('should return 0 for today', () => {
      const today = new Date();
      today.setHours(12, 0, 0, 0); // Set to noon to avoid edge cases

      const result = calculateDaysUntil(today);

      expect(result).toBe(0);
    });

    it('should accept string date input', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);

      const result = calculateDaysUntil(futureDate.toISOString());

      expect(result).toBeGreaterThanOrEqual(2);
    });
  });

  describe('formatDaysText', () => {
    it('should return "today" for 0 days', () => {
      expect(formatDaysText(0)).toBe('today');
    });

    it('should return "1 day" for 1 day', () => {
      expect(formatDaysText(1)).toBe('1 day');
    });

    it('should return plural format for multiple days', () => {
      expect(formatDaysText(2)).toBe('2 days');
      expect(formatDaysText(10)).toBe('10 days');
    });
  });

  describe('formatDaysRemainingText', () => {
    it('should return overdue text for negative days', () => {
      expect(formatDaysRemainingText(-3)).toBe('3 days overdue');
      expect(formatDaysRemainingText(-1)).toBe('1 days overdue');
    });

    it('should return "Due today" for 0 days', () => {
      expect(formatDaysRemainingText(0)).toBe('Due today');
    });

    it('should return "Due tomorrow" for 1 day', () => {
      expect(formatDaysRemainingText(1)).toBe('Due tomorrow');
    });

    it('should return days remaining text for multiple days', () => {
      expect(formatDaysRemainingText(5)).toBe('5 days remaining');
    });
  });

  describe('formatStageDurationText', () => {
    it('should return "Less than 1 day" for 0 days', () => {
      expect(formatStageDurationText(0)).toBe('Less than 1 day');
    });

    it('should return "1 day" for 1 day', () => {
      expect(formatStageDurationText(1)).toBe('1 day');
    });

    it('should return days for less than a week', () => {
      expect(formatStageDurationText(5)).toBe('5 days');
    });

    it('should return "1 week" for exactly 7 days', () => {
      expect(formatStageDurationText(7)).toBe('1 week');
    });

    it('should return weeks and days for more than a week', () => {
      expect(formatStageDurationText(8)).toBe('1 week, 1 day');
      expect(formatStageDurationText(10)).toBe('1 week, 3 days');
    });

    it('should return multiple weeks correctly', () => {
      expect(formatStageDurationText(14)).toBe('2 weeks');
      expect(formatStageDurationText(16)).toBe('2 weeks, 2 days');
    });
  });

  describe('formatDate', () => {
    it('should format Date object correctly', () => {
      const date = new Date('2025-02-15T10:00:00');
      const result = formatDate(date);

      expect(result).toContain('Feb');
      expect(result).toContain('15');
      expect(result).toContain('2025');
    });

    it('should format string date correctly', () => {
      const result = formatDate('2025-03-20T10:00:00');

      expect(result).toContain('Mar');
      expect(result).toContain('20');
      expect(result).toContain('2025');
    });

    it('should format timestamp correctly', () => {
      const timestamp = new Date('2025-04-10T10:00:00').getTime();
      const result = formatDate(timestamp);

      expect(result).toContain('Apr');
      expect(result).toContain('10');
      expect(result).toContain('2025');
    });
  });

  describe('getUrgencyLevel', () => {
    it('should return "overdue" for negative days', () => {
      expect(getUrgencyLevel(-1)).toBe('overdue');
      expect(getUrgencyLevel(-10)).toBe('overdue');
    });

    it('should return "high" for 0 or 1 days', () => {
      expect(getUrgencyLevel(0)).toBe('high');
      expect(getUrgencyLevel(1)).toBe('high');
    });

    it('should return "medium" for 2-3 days', () => {
      expect(getUrgencyLevel(2)).toBe('medium');
      expect(getUrgencyLevel(3)).toBe('medium');
    });

    it('should return "low" for 4+ days', () => {
      expect(getUrgencyLevel(4)).toBe('low');
      expect(getUrgencyLevel(10)).toBe('low');
    });
  });
});

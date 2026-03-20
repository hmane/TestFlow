import { calculateBusinessDays, calculateIsRushRequest } from '../requestInfoUtils';

describe('requestInfoUtils', () => {
  describe('calculateBusinessDays', () => {
    it('counts weekdays and excludes weekends', () => {
      const start = new Date('2026-03-06T00:00:00Z'); // Friday
      const end = new Date('2026-03-11T00:00:00Z'); // Wednesday

      expect(calculateBusinessDays(start, end)).toBe(4);
    });
  });

  describe('calculateIsRushRequest', () => {
    const submissionItems = [
      { title: 'Advertisement', turnAroundTimeInDays: 6 },
      { title: 'Factsheet', turnAroundTimeInDays: 2 },
    ];

    it('uses the original request created date for existing requests', () => {
      const result = calculateIsRushRequest({
        submissionItemSelection: 'Advertisement',
        submissionItems,
        requestCreated: new Date('2026-03-03T12:00:00Z'),
        targetReturnDate: new Date('2026-03-11T12:00:00Z'),
        today: new Date('2026-03-10T12:00:00Z'),
      });

      expect(result).toBe(false);
    });

    it('uses today when no existing request created date is available', () => {
      const result = calculateIsRushRequest({
        submissionItemSelection: 'Advertisement',
        submissionItems,
        targetReturnDate: new Date('2026-03-11T12:00:00Z'),
        today: new Date('2026-03-10T12:00:00Z'),
      });

      expect(result).toBe(true);
    });

    it('falls back to today when the existing request created date is invalid', () => {
      const result = calculateIsRushRequest({
        submissionItemSelection: 'Advertisement',
        submissionItems,
        requestCreated: 'not-a-date',
        targetReturnDate: new Date('2026-03-11T12:00:00Z'),
        today: new Date('2026-03-10T12:00:00Z'),
      });

      expect(result).toBe(true);
    });

    it('returns false when the submission item is not found', () => {
      const result = calculateIsRushRequest({
        submissionItemSelection: 'Unknown',
        submissionItems,
        targetReturnDate: new Date('2026-03-11T12:00:00Z'),
        today: new Date('2026-03-10T12:00:00Z'),
      });

      expect(result).toBe(false);
    });
  });
});

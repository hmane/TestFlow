/**
 * Business Hours Calculator Tests
 */

import {
  calculateBusinessHours,
  convertToPST,
  isWeekend,
  isWithinWorkingHours,
  isWorkingDay,
  parseWorkingHoursConfig,
  formatBusinessHours,
  DEFAULT_WORKING_HOURS,
} from '../businessHoursCalculator';

describe('Business Hours Calculator', () => {
  describe('calculateBusinessHours', () => {
    it('should return 0 when start equals end', () => {
      const date = new Date('2025-02-03T10:00:00');
      expect(calculateBusinessHours(date, date)).toBe(0);
    });

    it('should return 0 when start is after end', () => {
      const start = new Date('2025-02-03T14:00:00');
      const end = new Date('2025-02-03T10:00:00');
      expect(calculateBusinessHours(start, end)).toBe(0);
    });

    it('should calculate hours within a single working day', () => {
      // Monday 10 AM to 2 PM = 4 hours
      const start = new Date('2025-02-03T10:00:00');
      const end = new Date('2025-02-03T14:00:00');
      expect(calculateBusinessHours(start, end)).toBe(4);
    });

    it('should calculate full working day (8 AM to 5 PM = 9 hours)', () => {
      // Monday 8 AM to 5 PM
      const start = new Date('2025-02-03T08:00:00');
      const end = new Date('2025-02-03T17:00:00');
      expect(calculateBusinessHours(start, end)).toBe(9);
    });

    it('should not count hours before working hours start', () => {
      // Monday 6 AM to 10 AM = should count only 8-10 AM = 2 hours
      const start = new Date('2025-02-03T06:00:00');
      const end = new Date('2025-02-03T10:00:00');
      expect(calculateBusinessHours(start, end)).toBe(2);
    });

    it('should not count hours after working hours end', () => {
      // Monday 4 PM to 8 PM = should count only 4-5 PM = 1 hour
      const start = new Date('2025-02-03T16:00:00');
      const end = new Date('2025-02-03T20:00:00');
      expect(calculateBusinessHours(start, end)).toBe(1);
    });

    it('should not count weekend days', () => {
      // Saturday 10 AM to Monday 10 AM = should count only Monday 8-10 AM = 2 hours
      const start = new Date('2025-02-08T10:00:00'); // Saturday
      const end = new Date('2025-02-10T10:00:00'); // Monday
      expect(calculateBusinessHours(start, end)).toBe(2);
    });

    it('should calculate hours spanning multiple working days', () => {
      // Monday 4 PM to Tuesday 10 AM
      // Monday 4-5 PM = 1 hour
      // Tuesday 8-10 AM = 2 hours
      // Total = 3 hours
      const start = new Date('2025-02-03T16:00:00'); // Monday 4 PM
      const end = new Date('2025-02-04T10:00:00'); // Tuesday 10 AM
      expect(calculateBusinessHours(start, end)).toBe(3);
    });

    it('should handle weekend spanning correctly', () => {
      // Friday 4 PM to Monday 10 AM
      // Friday 4-5 PM = 1 hour
      // Saturday/Sunday = 0 hours
      // Monday 8-10 AM = 2 hours
      // Total = 3 hours
      const start = new Date('2025-02-07T16:00:00'); // Friday 4 PM
      const end = new Date('2025-02-10T10:00:00'); // Monday 10 AM
      expect(calculateBusinessHours(start, end)).toBe(3);
    });

    it('should throw error for missing dates', () => {
      expect(() => calculateBusinessHours(null as any, new Date())).toThrow(
        'Both startDate and endDate are required'
      );
      expect(() => calculateBusinessHours(new Date(), null as any)).toThrow(
        'Both startDate and endDate are required'
      );
    });

    it('should throw error for invalid working hours config', () => {
      const start = new Date('2025-02-03T10:00:00');
      const end = new Date('2025-02-03T14:00:00');

      expect(() =>
        calculateBusinessHours(start, end, { startHour: 25, endHour: 17, workingDays: [1, 2, 3, 4, 5] })
      ).toThrow('Working hours must be between 0 and 23');

      expect(() =>
        calculateBusinessHours(start, end, { startHour: 17, endHour: 8, workingDays: [1, 2, 3, 4, 5] })
      ).toThrow('Start hour must be before end hour');

      expect(() =>
        calculateBusinessHours(start, end, { startHour: 8, endHour: 17, workingDays: [] })
      ).toThrow('At least one working day must be specified');
    });

    it('should work with custom working hours', () => {
      const start = new Date('2025-02-03T09:00:00');
      const end = new Date('2025-02-03T15:00:00');

      // Custom: 9 AM to 6 PM
      const result = calculateBusinessHours(start, end, {
        startHour: 9,
        endHour: 18,
        workingDays: [1, 2, 3, 4, 5],
      });

      expect(result).toBe(6);
    });
  });

  describe('convertToPST', () => {
    it('should convert date to PST timezone', () => {
      const date = new Date('2025-02-03T18:00:00Z'); // UTC
      const pstDate = convertToPST(date);

      // The PST date should have a different time representation
      expect(pstDate).toBeInstanceOf(Date);
    });
  });

  describe('isWeekend', () => {
    it('should return true for Saturday', () => {
      const saturday = new Date('2025-02-08T12:00:00'); // Saturday noon (avoid timezone issues)
      expect(isWeekend(saturday)).toBe(true);
    });

    it('should return true for Sunday', () => {
      const sunday = new Date('2025-02-09T12:00:00'); // Sunday noon
      expect(isWeekend(sunday)).toBe(true);
    });

    it('should return false for Monday', () => {
      const monday = new Date('2025-02-03T12:00:00'); // Monday noon
      expect(isWeekend(monday)).toBe(false);
    });

    it('should return false for Friday', () => {
      const friday = new Date('2025-02-07T12:00:00'); // Friday noon
      expect(isWeekend(friday)).toBe(false);
    });
  });

  describe('isWithinWorkingHours', () => {
    it('should return true for 9 AM', () => {
      const date = new Date('2025-02-03T09:00:00');
      expect(isWithinWorkingHours(date)).toBe(true);
    });

    it('should return true for 4:59 PM', () => {
      const date = new Date('2025-02-03T16:59:00');
      expect(isWithinWorkingHours(date)).toBe(true);
    });

    it('should return false for 7 AM (before start)', () => {
      const date = new Date('2025-02-03T07:00:00');
      expect(isWithinWorkingHours(date)).toBe(false);
    });

    it('should return false for 5 PM (at end)', () => {
      const date = new Date('2025-02-03T17:00:00');
      expect(isWithinWorkingHours(date)).toBe(false);
    });

    it('should return false for 8 PM (after end)', () => {
      const date = new Date('2025-02-03T20:00:00');
      expect(isWithinWorkingHours(date)).toBe(false);
    });

    it('should work with custom config', () => {
      const date = new Date('2025-02-03T19:00:00'); // 7 PM
      const customConfig = { startHour: 10, endHour: 20, workingDays: [1, 2, 3, 4, 5] };
      expect(isWithinWorkingHours(date, customConfig)).toBe(true);
    });
  });

  describe('isWorkingDay', () => {
    it('should return true for Monday', () => {
      const monday = new Date('2025-02-03T12:00:00'); // Monday noon
      expect(isWorkingDay(monday)).toBe(true);
    });

    it('should return true for Friday', () => {
      const friday = new Date('2025-02-07T12:00:00'); // Friday noon
      expect(isWorkingDay(friday)).toBe(true);
    });

    it('should return false for Saturday', () => {
      const saturday = new Date('2025-02-08T12:00:00'); // Saturday noon
      expect(isWorkingDay(saturday)).toBe(false);
    });

    it('should return false for Sunday', () => {
      const sunday = new Date('2025-02-09T12:00:00'); // Sunday noon
      expect(isWorkingDay(sunday)).toBe(false);
    });

    it('should work with custom working days', () => {
      const saturday = new Date('2025-02-08T12:00:00'); // Saturday noon
      const customConfig = { startHour: 8, endHour: 17, workingDays: [1, 2, 3, 4, 5, 6] }; // Includes Saturday
      expect(isWorkingDay(saturday, customConfig)).toBe(true);
    });
  });

  describe('parseWorkingHoursConfig', () => {
    it('should parse valid config strings', () => {
      const config = parseWorkingHoursConfig('8', '17', '1,2,3,4,5');

      expect(config.startHour).toBe(8);
      expect(config.endHour).toBe(17);
      expect(config.workingDays).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle spaces in working days string', () => {
      const config = parseWorkingHoursConfig('9', '18', '1, 2, 3, 4, 5');

      expect(config.workingDays).toEqual([1, 2, 3, 4, 5]);
    });

    it('should throw for invalid hour values', () => {
      expect(() => parseWorkingHoursConfig('abc', '17', '1,2,3,4,5')).toThrow(
        'Invalid working hours: start and end hours must be numbers'
      );
    });

    it('should throw for hours out of range', () => {
      expect(() => parseWorkingHoursConfig('25', '17', '1,2,3,4,5')).toThrow(
        'Invalid working hours: hours must be between 0 and 23'
      );
    });

    it('should throw when start >= end', () => {
      expect(() => parseWorkingHoursConfig('17', '8', '1,2,3,4,5')).toThrow(
        'Invalid working hours: start hour must be before end hour'
      );
    });

    it('should throw for no valid working days', () => {
      expect(() => parseWorkingHoursConfig('8', '17', 'abc')).toThrow(
        'Invalid working days: at least one valid day (1-7) must be specified'
      );
    });

    it('should filter out invalid day values', () => {
      const config = parseWorkingHoursConfig('8', '17', '1,2,8,9,10'); // 8, 9, 10 are invalid

      expect(config.workingDays).toEqual([1, 2]);
    });
  });

  describe('formatBusinessHours', () => {
    it('should format hours with 1 decimal place', () => {
      expect(formatBusinessHours(7.5)).toBe('7.5');
      expect(formatBusinessHours(4)).toBe('4.0');
      expect(formatBusinessHours(0)).toBe('0.0');
    });

    it('should include hours label when specified', () => {
      expect(formatBusinessHours(7.5, true)).toBe('7.5 hours');
      expect(formatBusinessHours(0, true)).toBe('0.0 hours');
    });

    it('should use singular "hour" for 1.0', () => {
      expect(formatBusinessHours(1, true)).toBe('1.0 hour');
    });
  });

  describe('DEFAULT_WORKING_HOURS', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_WORKING_HOURS.startHour).toBe(8);
      expect(DEFAULT_WORKING_HOURS.endHour).toBe(17);
      expect(DEFAULT_WORKING_HOURS.workingDays).toEqual([1, 2, 3, 4, 5]);
    });
  });
});

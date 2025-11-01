/**
 * Custom hook for rush request calculation
 * Determines if a request is "rush" based on business day calculation
 */

import * as React from 'react';
import { SPContext } from 'spfx-toolkit';
import type { IRushRequestCalculation, ISubmissionItem } from '../types';

/**
 * Business days calculation options
 */
export interface IBusinessDaysOptions {
  excludeWeekends?: boolean;
  excludeHolidays?: Date[];
}

/**
 * Calculate business days between two dates
 */
function calculateBusinessDays(
  startDate: Date,
  endDate: Date,
  options: IBusinessDaysOptions = {}
): number {
  const { excludeWeekends = true, excludeHolidays = [] } = options;

  let count = 0;
  const current = new Date(startDate.getTime());

  while (current.getTime() <= endDate.getTime()) {
    const dayOfWeek = current.getDay();

    // Check if weekend
    const isWeekend = excludeWeekends && (dayOfWeek === 0 || dayOfWeek === 6);

    // Check if holiday
    const isHoliday = excludeHolidays.some(
      holiday =>
        holiday.getFullYear() === current.getFullYear() &&
        holiday.getMonth() === current.getMonth() &&
        holiday.getDate() === current.getDate()
    );

    if (!isWeekend && !isHoliday) {
      count++;
    }

    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Add business days to a date
 */
function addBusinessDays(startDate: Date, days: number, options: IBusinessDaysOptions = {}): Date {
  const { excludeWeekends = true, excludeHolidays = [] } = options;

  let count = 0;
  const current = new Date(startDate.getTime());

  while (count < days) {
    current.setDate(current.getDate() + 1);

    const dayOfWeek = current.getDay();
    const isWeekend = excludeWeekends && (dayOfWeek === 0 || dayOfWeek === 6);

    const isHoliday = excludeHolidays.some(
      holiday =>
        holiday.getFullYear() === current.getFullYear() &&
        holiday.getMonth() === current.getMonth() &&
        holiday.getDate() === current.getDate()
    );

    if (!isWeekend && !isHoliday) {
      count++;
    }
  }

  return current;
}

/**
 * Custom hook for rush request calculation
 */
export function useRushRequestCalculation(
  submissionItem: ISubmissionItem | undefined,
  targetReturnDate: Date | undefined,
  requestedDate: Date = new Date(),
  holidays: Date[] = []
): IRushRequestCalculation | undefined {
  return React.useMemo(() => {
    if (!submissionItem || !targetReturnDate) {
      return undefined;
    }

    try {
      const turnAroundDays = submissionItem.turnAroundTimeInDays;

      // Calculate expected completion date (requested date + turnaround days)
      const expectedCompletionDate = addBusinessDays(requestedDate, turnAroundDays, {
        excludeWeekends: true,
        excludeHolidays: holidays,
      });

      // Calculate actual business days available
      const actualDaysAvailable = calculateBusinessDays(requestedDate, targetReturnDate, {
        excludeWeekends: true,
        excludeHolidays: holidays,
      });

      // Rush if target date is before expected completion date
      const isRush = targetReturnDate < expectedCompletionDate;

      const businessDaysShort = isRush ? turnAroundDays - actualDaysAvailable : 0;

      SPContext.logger.info('Rush request calculation', {
        turnAroundDays,
        actualDaysAvailable,
        isRush,
        businessDaysShort,
      });

      return {
        isRush,
        requestedDate,
        targetReturnDate,
        expectedCompletionDate,
        turnAroundDays,
        actualDaysAvailable,
        businessDaysShort,
      };
    } catch (error: unknown) {
      SPContext.logger.error('Rush calculation failed', error);
      return undefined;
    }
  }, [submissionItem, targetReturnDate, requestedDate, holidays]);
}

/**
 * Hook to check if request is rush
 */
export function useIsRushRequest(
  submissionItem: ISubmissionItem | undefined,
  targetReturnDate: Date | undefined,
  requestedDate: Date = new Date(),
  holidays: Date[] = []
): boolean {
  const calculation = useRushRequestCalculation(
    submissionItem,
    targetReturnDate,
    requestedDate,
    holidays
  );

  return calculation?.isRush || false;
}

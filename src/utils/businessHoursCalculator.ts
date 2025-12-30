/**
 * Business Hours Calculator
 *
 * Calculates business hours between two dates, excluding weekends and non-working hours.
 * All calculations are performed in PST/PDT timezone (America/Los_Angeles).
 *
 * @module utils/businessHoursCalculator
 */

/**
 * Working hours configuration
 */
export interface IWorkingHoursConfig {
  /** Business day start hour (0-23), e.g., 8 for 8 AM */
  startHour: number;
  /** Business day end hour (0-23), e.g., 17 for 5 PM */
  endHour: number;
  /** Working days of week (1=Monday, 2=Tuesday, ..., 7=Sunday) */
  workingDays: number[];
}

/**
 * Default working hours configuration
 * 8 AM - 5 PM, Monday-Friday, PST/PDT timezone
 */
export const DEFAULT_WORKING_HOURS: IWorkingHoursConfig = {
  startHour: 8,
  endHour: 17,
  workingDays: [1, 2, 3, 4, 5], // Monday-Friday
};

/**
 * PST/PDT timezone identifier
 */
const TIMEZONE = 'America/Los_Angeles';

/**
 * Calculates business hours between two dates
 *
 * @param startDate - Start date/time (inclusive)
 * @param endDate - End date/time (exclusive)
 * @param config - Working hours configuration (defaults to 8 AM - 5 PM, Mon-Fri)
 * @returns Number of business hours between the two dates, rounded to 1 decimal place
 *
 * @example
 * ```typescript
 * // Monday 10 AM to Monday 2 PM = 4 hours
 * const hours = calculateBusinessHours(
 *   new Date('2025-02-03 10:00:00'),
 *   new Date('2025-02-03 14:00:00')
 * );
 * console.log(hours); // 4.0
 *
 * // Friday 4 PM to Monday 10 AM = 3 hours (Fri 4-5pm = 1hr, Mon 8-10am = 2hrs)
 * const weekendHours = calculateBusinessHours(
 *   new Date('2025-02-07 16:00:00'), // Friday 4 PM
 *   new Date('2025-02-10 10:00:00')  // Monday 10 AM
 * );
 * console.log(weekendHours); // 3.0
 *
 * // Same start and end = 0 hours
 * const zero = calculateBusinessHours(
 *   new Date('2025-02-03 10:00:00'),
 *   new Date('2025-02-03 10:00:00')
 * );
 * console.log(zero); // 0.0
 * ```
 */
export function calculateBusinessHours(
  startDate: Date,
  endDate: Date,
  config: IWorkingHoursConfig = DEFAULT_WORKING_HOURS
): number {
  // Validation
  if (!startDate || !endDate) {
    throw new Error('Both startDate and endDate are required');
  }

  if (startDate >= endDate) {
    return 0;
  }

  // Validate config
  if (config.startHour < 0 || config.startHour > 23 || config.endHour < 0 || config.endHour > 23) {
    throw new Error('Working hours must be between 0 and 23');
  }

  if (config.startHour >= config.endHour) {
    throw new Error('Start hour must be before end hour');
  }

  if (config.workingDays.length === 0) {
    throw new Error('At least one working day must be specified');
  }

  let totalHours = 0;

  // Convert to PST/PDT timezone for consistent calculation
  let currentDate = convertToPST(startDate);
  const endDatePST = convertToPST(endDate);

  // Safety limit: Maximum 365 days to prevent infinite loops
  const MAX_ITERATIONS = 365;
  let iterations = 0;

  // Iterate through each day
  while (currentDate < endDatePST && iterations < MAX_ITERATIONS) {
    iterations++;
    // Get day of week (JavaScript: 0=Sun, 1=Mon, ..., 6=Sat)
    // Convert to ISO (1=Mon, 2=Tue, ..., 7=Sun) for comparison
    const dayOfWeek = currentDate.getDay();
    const isoDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

    // Check if this is a working day
    if (config.workingDays.includes(isoDayOfWeek)) {
      // Calculate business hours for this day
      const dayStart = new Date(currentDate.getTime());
      dayStart.setHours(config.startHour, 0, 0, 0);

      const dayEnd = new Date(currentDate.getTime());
      dayEnd.setHours(config.endHour, 0, 0, 0);

      // Determine effective start and end for this day
      const effectiveStart = currentDate > dayStart ? currentDate : dayStart;
      const effectiveEnd = endDatePST < dayEnd ? endDatePST : dayEnd;

      // Only count hours if there's overlap with working hours
      if (effectiveStart < effectiveEnd) {
        const millisecondsThisDay = effectiveEnd.getTime() - effectiveStart.getTime();
        const hoursThisDay = millisecondsThisDay / (1000 * 60 * 60);
        totalHours += hoursThisDay;
      }
    }

    // Move to next day at start hour
    currentDate.setDate(currentDate.getDate() + 1);
    currentDate.setHours(config.startHour, 0, 0, 0);
  }

  // Round to 1 decimal place
  return Math.round(totalHours * 10) / 10;
}

/**
 * Converts a date to PST/PDT timezone
 *
 * @param date - Date to convert
 * @returns New Date object in PST/PDT timezone
 *
 * @remarks
 * This function creates a new Date object that represents the same moment in time
 * but adjusted to the PST/PDT timezone. This ensures consistent calculations
 * regardless of the user's local timezone or the server timezone.
 */
export function convertToPST(date: Date): Date {
  // Format date in PST/PDT timezone and parse back to Date object
  const pstString = date.toLocaleString('en-US', { timeZone: TIMEZONE });
  return new Date(pstString);
}

/**
 * Checks if a date falls on a weekend
 *
 * @param date - Date to check
 * @returns True if the date is Saturday or Sunday, false otherwise
 *
 * @example
 * ```typescript
 * const saturday = new Date('2025-02-08'); // Saturday
 * console.log(isWeekend(saturday)); // true
 *
 * const monday = new Date('2025-02-03'); // Monday
 * console.log(isWeekend(monday)); // false
 * ```
 */
export function isWeekend(date: Date): boolean {
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
}

/**
 * Checks if a time falls within working hours
 *
 * @param date - Date/time to check
 * @param config - Working hours configuration
 * @returns True if the time is within working hours, false otherwise
 *
 * @example
 * ```typescript
 * const morningTime = new Date('2025-02-03 09:00:00'); // Monday 9 AM
 * console.log(isWithinWorkingHours(morningTime)); // true
 *
 * const eveningTime = new Date('2025-02-03 18:00:00'); // Monday 6 PM
 * console.log(isWithinWorkingHours(eveningTime)); // false
 * ```
 */
export function isWithinWorkingHours(
  date: Date,
  config: IWorkingHoursConfig = DEFAULT_WORKING_HOURS
): boolean {
  const hour = date.getHours();
  return hour >= config.startHour && hour < config.endHour;
}

/**
 * Checks if a date is a working day
 *
 * @param date - Date to check
 * @param config - Working hours configuration
 * @returns True if the date is a working day, false otherwise
 *
 * @example
 * ```typescript
 * const monday = new Date('2025-02-03'); // Monday
 * console.log(isWorkingDay(monday)); // true
 *
 * const saturday = new Date('2025-02-08'); // Saturday
 * console.log(isWorkingDay(saturday)); // false
 * ```
 */
export function isWorkingDay(date: Date, config: IWorkingHoursConfig = DEFAULT_WORKING_HOURS): boolean {
  const dayOfWeek = date.getDay();
  const isoDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
  return config.workingDays.includes(isoDayOfWeek);
}

/**
 * Parses working hours configuration from string values
 *
 * @param startHourStr - Start hour as string (e.g., "8")
 * @param endHourStr - End hour as string (e.g., "17")
 * @param workingDaysStr - Working days as comma-separated string (e.g., "1,2,3,4,5")
 * @returns Parsed working hours configuration
 *
 * @throws Error if parsing fails or values are invalid
 *
 * @example
 * ```typescript
 * const config = parseWorkingHoursConfig("8", "17", "1,2,3,4,5");
 * console.log(config);
 * // { startHour: 8, endHour: 17, workingDays: [1, 2, 3, 4, 5] }
 * ```
 */
export function parseWorkingHoursConfig(
  startHourStr: string,
  endHourStr: string,
  workingDaysStr: string
): IWorkingHoursConfig {
  const startHour = parseInt(startHourStr, 10);
  const endHour = parseInt(endHourStr, 10);

  if (isNaN(startHour) || isNaN(endHour)) {
    throw new Error('Invalid working hours: start and end hours must be numbers');
  }

  if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23) {
    throw new Error('Invalid working hours: hours must be between 0 and 23');
  }

  if (startHour >= endHour) {
    throw new Error('Invalid working hours: start hour must be before end hour');
  }

  const workingDays = workingDaysStr
    .split(',')
    .map((d) => parseInt(d.trim(), 10))
    .filter((d) => !isNaN(d) && d >= 1 && d <= 7);

  if (workingDays.length === 0) {
    throw new Error('Invalid working days: at least one valid day (1-7) must be specified');
  }

  return { startHour, endHour, workingDays };
}

/**
 * Formats business hours for display
 *
 * @param hours - Number of hours
 * @param includeLabel - Whether to include the "hours" label
 * @returns Formatted string
 *
 * @example
 * ```typescript
 * console.log(formatBusinessHours(7.5)); // "7.5"
 * console.log(formatBusinessHours(7.5, true)); // "7.5 hours"
 * console.log(formatBusinessHours(1, true)); // "1.0 hour"
 * console.log(formatBusinessHours(0)); // "0.0"
 * ```
 */
export function formatBusinessHours(hours: number, includeLabel = false): string {
  const formatted = hours.toFixed(1);

  if (!includeLabel) {
    return formatted;
  }

  const label = hours === 1.0 ? 'hour' : 'hours';
  return `${formatted} ${label}`;
}

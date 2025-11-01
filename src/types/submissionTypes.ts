/**
 * Submission item and configuration types
 */

/**
 * Submission item - configuration for different submission types
 */
export interface ISubmissionItem {
  id?: number;
  title: string;
  turnAroundTimeInDays: number;
  description?: string;
  displayOrder?: number;
}

/**
 * Submission item list item from SharePoint
 */
export interface ISubmissionItemListItem {
  Id: number;
  Title: string;
  TurnAroundTimeInDays: number;
  Description?: string;
  DisplayOrder?: number;
}

/**
 * Submission item with request count
 */
export interface ISubmissionItemWithStats extends ISubmissionItem {
  requestCount: number;
  averageDaysToComplete: number;
  rushRequestPercentage: number;
}

/**
 * Rush request calculation result
 */
export interface IRushRequestCalculation {
  isRush: boolean;
  requestedDate: Date;
  targetReturnDate: Date;
  expectedCompletionDate: Date;
  turnAroundDays: number;
  actualDaysAvailable: number;
  businessDaysShort: number;
}

/**
 * Business days calculation options
 */
export interface IBusinessDaysOptions {
  startDate: Date;
  days: number;
  excludeWeekends: boolean;
  excludeHolidays?: Date[];
  workingDays?: number[]; // Day of week: 0=Sunday, 6=Saturday
}

/**
 * Date range type
 */
export interface IDateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Business day calculation result
 */
export interface IBusinessDayResult {
  resultDate: Date;
  totalDays: number;
  businessDays: number;
  weekendDays: number;
  holidayDays: number;
}

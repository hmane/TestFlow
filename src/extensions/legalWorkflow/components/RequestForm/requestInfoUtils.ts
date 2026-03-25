export interface IRequestInfoSubmissionItem {
  title: string;
  turnAroundTimeInDays?: number;
}

export interface ICalculateIsRushRequestParams {
  targetReturnDate?: Date | string;
  submissionItemSelection?: string;
  submissionItems: IRequestInfoSubmissionItem[];
  requestCreated?: Date | string;
  today?: Date;
}

function isValidDate(date: Date): boolean {
  return !isNaN(date.getTime());
}

function normalizeDate(date: Date | string | undefined): Date | undefined {
  if (!date) {
    return undefined;
  }

  const normalized = date instanceof Date ? new Date(date.getTime()) : new Date(date);
  return isValidDate(normalized) ? normalized : undefined;
}

export function calculateBusinessDays(start: Date, end: Date): number {
  let count = 0;
  const currentDate = new Date(start.getTime());

  while (currentDate < end) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return count;
}

export function addBusinessDays(startDate: Date, days: number): Date {
  const result = new Date(startDate.getTime());
  let count = 0;
  while (count < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) {
      count++;
    }
  }
  return result;
}

export function calculateIsRushRequest(params: ICalculateIsRushRequestParams): boolean {
  const {
    targetReturnDate,
    submissionItemSelection,
    submissionItems,
    requestCreated,
    today = new Date(),
  } = params;

  if (!targetReturnDate || !submissionItemSelection) {
    return false;
  }

  let selectedSubmissionItem: IRequestInfoSubmissionItem | undefined;
  for (let i = 0; i < submissionItems.length; i++) {
    if (submissionItems[i].title === submissionItemSelection) {
      selectedSubmissionItem = submissionItems[i];
      break;
    }
  }
  if (!selectedSubmissionItem || !selectedSubmissionItem.turnAroundTimeInDays) {
    return false;
  }

  const normalizedTargetDate = normalizeDate(targetReturnDate);
  if (!normalizedTargetDate) {
    return false;
  }

  const baseDate = normalizeDate(requestCreated) ?? new Date(today.getTime());
  baseDate.setHours(0, 0, 0, 0);

  normalizedTargetDate.setHours(0, 0, 0, 0);

  const businessDaysAvailable = calculateBusinessDays(baseDate, normalizedTargetDate);
  return businessDaysAvailable < selectedSubmissionItem.turnAroundTimeInDays;
}

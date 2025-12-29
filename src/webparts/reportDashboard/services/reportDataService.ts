/**
 * Report Data Service
 *
 * Handles data fetching, aggregation, and calculations for the Reports Dashboard.
 * Provides metrics for volume, time tracking, SLA performance, and status analytics.
 */

// spfx-toolkit - tree-shaken imports
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

// App imports using path aliases
import { ILegalRequest } from '@appTypes/requestTypes';
import { RequestsFields } from '@sp/listFields/RequestsFields';

/**
 * Date range for filtering requests
 */
export interface IDateRange {
  startDate: Date | null;
  endDate: Date | null;
}

/**
 * Summary statistics for dashboard tiles
 */
export interface ISummaryMetrics {
  totalRequests: number;
  avgTurnaroundDays: number;
  pendingReviews: number;
  rushRequestsPercentage: number;
}

/**
 * Request volume data for charts (grouped by time period)
 */
export interface IVolumeData {
  date: Date;
  submitted: number;
  completed: number;
  cancelled: number;
}

/**
 * Status distribution for pie charts
 */
export interface IStatusData {
  status: string;
  count: number;
  percentage: number;
}

/**
 * Time tracking metrics by stage
 */
export interface ITimeMetrics {
  stage: string;
  avgReviewerHours: number;
  avgSubmitterHours: number;
  totalHours: number;
}

/**
 * Outcome distribution data
 */
export interface IOutcomeData {
  outcome: string;
  count: number;
  percentage: number;
}

/**
 * Comprehensive dashboard data
 */
export interface IDashboardData {
  summary: ISummaryMetrics;
  volumeByDate: IVolumeData[];
  statusDistribution: IStatusData[];
  requestTypeDistribution: IStatusData[];
  timeMetricsByStage: ITimeMetrics[];
  legalReviewOutcomes: IOutcomeData[];
  complianceReviewOutcomes: IOutcomeData[];
  allRequests: ILegalRequest[];
}

/**
 * Fetch all requests with filtering by date range
 * @param dateRange Optional date range filter (filters by submittedOn date)
 * @returns Array of legal requests
 */
export async function fetchRequests(dateRange?: IDateRange): Promise<ILegalRequest[]> {
  try {
    SPContext.logger.info('ReportDataService: Fetching requests', { dateRange });

    // Build filter
    let filter = '';
    if (dateRange?.startDate && dateRange?.endDate) {
      const startISO = dateRange.startDate.toISOString();
      const endISO = dateRange.endDate.toISOString();
      filter = `${RequestsFields.SubmittedOn} ge datetime'${startISO}' and ${RequestsFields.SubmittedOn} le datetime'${endISO}'`;
    } else if (dateRange?.startDate) {
      const startISO = dateRange.startDate.toISOString();
      filter = `${RequestsFields.SubmittedOn} ge datetime'${startISO}'`;
    } else if (dateRange?.endDate) {
      const endISO = dateRange.endDate.toISOString();
      filter = `${RequestsFields.SubmittedOn} le datetime'${endISO}'`;
    }

    // Fetch data using SPContext
    const items = await SPContext.sp.web.lists
      .getByTitle('Requests')
      .items
      .select(
        RequestsFields.ID,
        RequestsFields.RequestId,
        RequestsFields.RequestTitle,
        RequestsFields.RequestType,
        RequestsFields.Status,
        RequestsFields.SubmittedOn,
        RequestsFields.SubmittedBy,
        RequestsFields.Attorney,
        RequestsFields.IsRushRequest,
        RequestsFields.TargetReturnDate,
        RequestsFields.TotalTurnaroundDays,
        RequestsFields.LegalReviewStatus,
        RequestsFields.LegalReviewOutcome,
        RequestsFields.LegalReviewCompletedOn,
        RequestsFields.ComplianceReviewStatus,
        RequestsFields.ComplianceReviewOutcome,
        RequestsFields.ComplianceReviewCompletedOn,
        RequestsFields.CloseoutOn,
        RequestsFields.CancelledOn,
        RequestsFields.TotalReviewerHours,
        RequestsFields.TotalSubmitterHours,
        RequestsFields.LegalReviewAttorneyHours,
        RequestsFields.LegalReviewSubmitterHours,
        RequestsFields.ComplianceReviewReviewerHours,
        RequestsFields.ComplianceReviewSubmitterHours,
        RequestsFields.CloseoutReviewerHours,
        RequestsFields.CloseoutSubmitterHours
      )
      .filter(filter)
      .orderBy(RequestsFields.SubmittedOn, false)
      .top(5000)(); // Fetch up to 5000 requests for reporting

    // Transform to ILegalRequest (simplified mapping for reports)
    const requests: ILegalRequest[] = items.map((item: any) => ({
      id: item[RequestsFields.ID],
      requestId: item[RequestsFields.RequestId] || '',
      requestTitle: item[RequestsFields.RequestTitle] || '',
      requestType: item[RequestsFields.RequestType],
      status: item[RequestsFields.Status],
      submittedOn: item[RequestsFields.SubmittedOn] ? new Date(item[RequestsFields.SubmittedOn]) : undefined,
      submittedBy: item[RequestsFields.SubmittedBy] ? {
        id: item[RequestsFields.SubmittedBy].Id?.toString() || '',
        email: item[RequestsFields.SubmittedBy].EMail || '',
        title: item[RequestsFields.SubmittedBy].Title || '',
      } : undefined,
      attorney: item[RequestsFields.Attorney] ? {
        id: item[RequestsFields.Attorney].Id?.toString() || '',
        email: item[RequestsFields.Attorney].EMail || '',
        title: item[RequestsFields.Attorney].Title || '',
      } : undefined,
      isRushRequest: item[RequestsFields.IsRushRequest] || false,
      targetReturnDate: item[RequestsFields.TargetReturnDate] ? new Date(item[RequestsFields.TargetReturnDate]) : undefined,
      totalTurnaroundDays: item[RequestsFields.TotalTurnaroundDays],
      legalReviewStatus: item[RequestsFields.LegalReviewStatus],
      legalReviewOutcome: item[RequestsFields.LegalReviewOutcome],
      legalReviewCompletedOn: item[RequestsFields.LegalReviewCompletedOn] ? new Date(item[RequestsFields.LegalReviewCompletedOn]) : undefined,
      complianceReviewStatus: item[RequestsFields.ComplianceReviewStatus],
      complianceReviewOutcome: item[RequestsFields.ComplianceReviewOutcome],
      complianceReviewCompletedOn: item[RequestsFields.ComplianceReviewCompletedOn] ? new Date(item[RequestsFields.ComplianceReviewCompletedOn]) : undefined,
      closeoutOn: item[RequestsFields.CloseoutOn] ? new Date(item[RequestsFields.CloseoutOn]) : undefined,
      cancelledOn: item[RequestsFields.CancelledOn] ? new Date(item[RequestsFields.CancelledOn]) : undefined,
      totalReviewerHours: item[RequestsFields.TotalReviewerHours] || 0,
      totalSubmitterHours: item[RequestsFields.TotalSubmitterHours] || 0,
      legalReviewAttorneyHours: item[RequestsFields.LegalReviewAttorneyHours] || 0,
      legalReviewSubmitterHours: item[RequestsFields.LegalReviewSubmitterHours] || 0,
      complianceReviewReviewerHours: item[RequestsFields.ComplianceReviewReviewerHours] || 0,
      complianceReviewSubmitterHours: item[RequestsFields.ComplianceReviewSubmitterHours] || 0,
      closeoutReviewerHours: item[RequestsFields.CloseoutReviewerHours] || 0,
      closeoutSubmitterHours: item[RequestsFields.CloseoutSubmitterHours] || 0,
    } as ILegalRequest));

    SPContext.logger.success('ReportDataService: Fetched requests', { count: requests.length });

    return requests;

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    SPContext.logger.error('ReportDataService: Failed to fetch requests', error);
    throw new Error(`Failed to fetch requests: ${message}`);
  }
}

/**
 * Calculate summary metrics
 */
export function calculateSummaryMetrics(requests: ILegalRequest[]): ISummaryMetrics {
  const totalRequests = requests.length;

  // Average turnaround (only completed requests)
  const completedRequests = requests.filter(r => r.status === 'Completed' && r.totalTurnaroundDays);
  const avgTurnaroundDays = completedRequests.length > 0
    ? completedRequests.reduce((sum, r) => sum + (r.totalTurnaroundDays || 0), 0) / completedRequests.length
    : 0;

  // Pending reviews (In Review, Assign Attorney, Closeout statuses)
  const pendingReviews = requests.filter(r =>
    r.status === 'In Review' || r.status === 'Assign Attorney' || r.status === 'Closeout'
  ).length;

  // Rush requests percentage
  const rushRequests = requests.filter(r => r.isRushRequest).length;
  const rushRequestsPercentage = totalRequests > 0 ? (rushRequests / totalRequests) * 100 : 0;

  return {
    totalRequests,
    avgTurnaroundDays: Math.round(avgTurnaroundDays * 10) / 10,
    pendingReviews,
    rushRequestsPercentage: Math.round(rushRequestsPercentage * 10) / 10,
  };
}

/**
 * Group requests by date for volume charts
 * @param requests All requests
 * @param groupBy Group by 'day', 'week', or 'month'
 */
export function calculateVolumeByDate(
  requests: ILegalRequest[],
  groupBy: 'day' | 'week' | 'month' = 'day'
): IVolumeData[] {
  const volumeMap = new Map<string, IVolumeData>();

  requests.forEach(request => {
    if (!request.submittedOn) return;

    const date = request.submittedOn instanceof Date ? request.submittedOn : new Date(request.submittedOn as string | number);
    let key: string;

    if (groupBy === 'day') {
      key = date.toISOString().split('T')[0]; // YYYY-MM-DD
    } else if (groupBy === 'week') {
      const weekStart = new Date(date.getTime());
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
      key = weekStart.toISOString().split('T')[0];
    } else {
      const month = date.getMonth() + 1;
      const monthStr = month < 10 ? `0${month}` : `${month}`;
      key = `${date.getFullYear()}-${monthStr}`; // YYYY-MM
    }

    if (!volumeMap.has(key)) {
      volumeMap.set(key, {
        date: new Date(key),
        submitted: 0,
        completed: 0,
        cancelled: 0,
      });
    }

    const data = volumeMap.get(key)!;

    // Count submissions
    data.submitted++;

    // Count completions
    if (request.status === 'Completed' && request.closeoutOn) {
      const completionKey = groupBy === 'day'
        ? request.closeoutOn.toISOString().split('T')[0]
        : key; // Simplified for now
      if (completionKey === key) {
        data.completed++;
      }
    }

    // Count cancellations
    if (request.status === 'Cancelled' && request.cancelledOn) {
      const cancellationKey = groupBy === 'day'
        ? request.cancelledOn.toISOString().split('T')[0]
        : key;
      if (cancellationKey === key) {
        data.cancelled++;
      }
    }
  });

  return Array.from(volumeMap.values()).sort((a: IVolumeData, b: IVolumeData) => a.date.getTime() - b.date.getTime());
}

/**
 * Calculate status distribution
 */
export function calculateStatusDistribution(requests: ILegalRequest[]): IStatusData[] {
  const statusMap = new Map<string, number>();
  const total = requests.length;

  requests.forEach(request => {
    const status = request.status || 'Unknown';
    statusMap.set(status, (statusMap.get(status) || 0) + 1);
  });

  return Array.from(statusMap.entries())
    .map(([status, count]: [string, number]) => ({
      status,
      count,
      percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .sort((a: IStatusData, b: IStatusData) => b.count - a.count);
}

/**
 * Calculate request type distribution
 */
export function calculateRequestTypeDistribution(requests: ILegalRequest[]): IStatusData[] {
  const typeMap = new Map<string, number>();
  const total = requests.length;

  requests.forEach(request => {
    const type = request.requestType || 'Unknown';
    typeMap.set(type, (typeMap.get(type) || 0) + 1);
  });

  return Array.from(typeMap.entries())
    .map(([status, count]: [string, number]) => ({
      status,
      count,
      percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .sort((a: IStatusData, b: IStatusData) => b.count - a.count);
}

/**
 * Calculate time metrics by stage
 */
export function calculateTimeMetricsByStage(requests: ILegalRequest[]): ITimeMetrics[] {
  const stages = [
    { name: 'Legal Review', reviewerField: 'legalReviewAttorneyHours', submitterField: 'legalReviewSubmitterHours' },
    { name: 'Compliance Review', reviewerField: 'complianceReviewReviewerHours', submitterField: 'complianceReviewSubmitterHours' },
    { name: 'Closeout', reviewerField: 'closeoutReviewerHours', submitterField: 'closeoutSubmitterHours' },
  ];

  return stages.map(stage => {
    const relevantRequests = requests.filter(r =>
      r[stage.reviewerField as keyof ILegalRequest] || r[stage.submitterField as keyof ILegalRequest]
    );

    if (relevantRequests.length === 0) {
      return {
        stage: stage.name,
        avgReviewerHours: 0,
        avgSubmitterHours: 0,
        totalHours: 0,
      };
    }

    const totalReviewerHours = relevantRequests.reduce((sum, r) => sum + (r[stage.reviewerField as keyof ILegalRequest] as number || 0), 0);
    const totalSubmitterHours = relevantRequests.reduce((sum, r) => sum + (r[stage.submitterField as keyof ILegalRequest] as number || 0), 0);

    return {
      stage: stage.name,
      avgReviewerHours: Math.round((totalReviewerHours / relevantRequests.length) * 10) / 10,
      avgSubmitterHours: Math.round((totalSubmitterHours / relevantRequests.length) * 10) / 10,
      totalHours: Math.round((totalReviewerHours + totalSubmitterHours) / relevantRequests.length * 10) / 10,
    };
  });
}

/**
 * Calculate outcome distribution for legal reviews
 */
export function calculateLegalReviewOutcomes(requests: ILegalRequest[]): IOutcomeData[] {
  const reviewedRequests = requests.filter(r => r.legalReviewOutcome);
  const total = reviewedRequests.length;

  const outcomeMap = new Map<string, number>();

  reviewedRequests.forEach(request => {
    const outcome = request.legalReviewOutcome || 'Unknown';
    outcomeMap.set(outcome, (outcomeMap.get(outcome) || 0) + 1);
  });

  return Array.from(outcomeMap.entries())
    .map(([outcome, count]: [string, number]) => ({
      outcome,
      count,
      percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .sort((a: IOutcomeData, b: IOutcomeData) => b.count - a.count);
}

/**
 * Calculate outcome distribution for compliance reviews
 */
export function calculateComplianceReviewOutcomes(requests: ILegalRequest[]): IOutcomeData[] {
  const reviewedRequests = requests.filter(r => r.complianceReviewOutcome);
  const total = reviewedRequests.length;

  const outcomeMap = new Map<string, number>();

  reviewedRequests.forEach(request => {
    const outcome = request.complianceReviewOutcome || 'Unknown';
    outcomeMap.set(outcome, (outcomeMap.get(outcome) || 0) + 1);
  });

  return Array.from(outcomeMap.entries())
    .map(([outcome, count]: [string, number]) => ({
      outcome,
      count,
      percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .sort((a: IOutcomeData, b: IOutcomeData) => b.count - a.count);
}

/**
 * Fetch and calculate all dashboard data
 * @param dateRange Optional date range filter
 * @returns Complete dashboard data
 */
export async function fetchDashboardData(dateRange?: IDateRange): Promise<IDashboardData> {
  try {
    SPContext.logger.info('ReportDataService: Fetching dashboard data', { dateRange });

    // Fetch all requests
    const allRequests = await fetchRequests(dateRange);

    // Calculate all metrics
    const summary = calculateSummaryMetrics(allRequests);
    const volumeByDate = calculateVolumeByDate(allRequests, 'day');
    const statusDistribution = calculateStatusDistribution(allRequests);
    const requestTypeDistribution = calculateRequestTypeDistribution(allRequests);
    const timeMetricsByStage = calculateTimeMetricsByStage(allRequests);
    const legalReviewOutcomes = calculateLegalReviewOutcomes(allRequests);
    const complianceReviewOutcomes = calculateComplianceReviewOutcomes(allRequests);

    SPContext.logger.success('ReportDataService: Dashboard data calculated', {
      requestCount: allRequests.length,
      summary,
    });

    return {
      summary,
      volumeByDate,
      statusDistribution,
      requestTypeDistribution,
      timeMetricsByStage,
      legalReviewOutcomes,
      complianceReviewOutcomes,
      allRequests,
    };

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    SPContext.logger.error('ReportDataService: Failed to fetch dashboard data', error);
    throw new Error(`Failed to fetch dashboard data: ${message}`);
  }
}

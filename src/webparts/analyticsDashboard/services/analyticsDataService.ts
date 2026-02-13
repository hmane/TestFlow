/**
 * Analytics Data Service
 * Provides real and mock data for the Analytics Dashboard
 */

import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists';
import { checkDashboardAccess } from '@services/userGroupsService';
import { Lists } from '@sp/Lists';
import { RequestsFields } from '@sp/listFields';
import type {
  IDashboardData,
  IDashboardFilters,
  IDashboardFilterOptions,
  IKPIMetrics,
  IStatusData,
  IVolumeData,
  IAttorneyWorkload,
  IRequestAtRisk,
  ITimeByStage,
  IReviewOutcome,
  ICommunicationsOnlyData,
  IUserAccess,
  DateRangeOption,
} from '../components/IAnalyticsDashboardProps';

// Status colors matching SharePoint theme
const STATUS_COLORS: Record<string, string> = {
  'Draft': '#8a8886',
  'Legal Intake': '#0078d4',
  'Assign Attorney': '#8764b8',
  'In Review': '#ffaa44',
  'Closeout': '#107c10',
  'Completed': '#107c10',
  'Cancelled': '#a4262c',
  'On Hold': '#797775',
};

// Stage colors
const STAGE_COLORS: Record<string, string> = {
  'Legal Intake': '#0078d4',
  'Legal Review': '#8764b8',
  'Compliance Review': '#107c10',
  'Closeout': '#ffaa44',
};

// Outcome colors
const OUTCOME_COLORS: Record<string, string> = {
  'Approved': '#107c10',
  'Approved With Comments': '#ffaa44',
  'Respond To Comments': '#0078d4',
  'Not Approved': '#a4262c',
};

/**
 * Calculate date range based on option
 */
const getDateRange = (option: DateRangeOption, customStart?: Date, customEnd?: Date): { startDate: Date; endDate: Date } => {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  let startDate = new Date();

  switch (option) {
    case '7':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90':
      startDate.setDate(startDate.getDate() - 90);
      break;
    case 'custom':
      if (customStart && customEnd) {
        return { startDate: customStart, endDate: customEnd };
      }
      startDate.setDate(startDate.getDate() - 30);
      break;
  }

  startDate.setHours(0, 0, 0, 0);
  return { startDate, endDate };
};

/**
 * Generate mock attorney names
 */
const MOCK_ATTORNEYS = [
  'Sarah Johnson',
  'Michael Chen',
  'Emily Rodriguez',
  'David Kim',
  'Jennifer Martinez',
  'Robert Taylor',
  'Amanda Wilson',
  'Christopher Lee',
];

/**
 * Generate mock data for demo mode
 */
export const generateMockData = (dateRange: DateRangeOption): IDashboardData => {
  const { startDate, endDate } = getDateRange(dateRange);
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // Generate KPI metrics
  const totalHoursLogged = Math.floor(Math.random() * 500) + 100;
  const reviewerShare = Math.round(totalHoursLogged * (0.55 + Math.random() * 0.15));
  const kpiMetrics: IKPIMetrics = {
    totalRequests: Math.floor(Math.random() * 150) + 50,
    totalRequestsTrend: Math.floor(Math.random() * 30) - 10,
    avgTurnaroundDays: Math.floor(Math.random() * 10) + 3,
    avgTurnaroundTrend: Math.floor(Math.random() * 20) - 10,
    pendingReviews: Math.floor(Math.random() * 30) + 5,
    rushRequestPercentage: Math.floor(Math.random() * 25) + 5,
    slaCompliancePercentage: Math.floor(Math.random() * 20) + 75,
    totalHoursLogged,
    totalReviewerHours: reviewerShare,
    totalSubmitterHours: totalHoursLogged - reviewerShare,
    awaitingFINRADocuments: Math.floor(Math.random() * 8) + 2,
    finraCommentsReceived: Math.floor(Math.random() * 5) + 1,
    finraWithCommentText: Math.floor(Math.random() * 3),
  };

  // Generate status distribution
  const statusDistribution: IStatusData[] = [
    { status: 'Draft', count: Math.floor(Math.random() * 15) + 5, color: STATUS_COLORS['Draft'] },
    { status: 'Legal Intake', count: Math.floor(Math.random() * 20) + 8, color: STATUS_COLORS['Legal Intake'] },
    { status: 'Assign Attorney', count: Math.floor(Math.random() * 10) + 3, color: STATUS_COLORS['Assign Attorney'] },
    { status: 'In Review', count: Math.floor(Math.random() * 25) + 10, color: STATUS_COLORS['In Review'] },
    { status: 'Closeout', count: Math.floor(Math.random() * 8) + 2, color: STATUS_COLORS['Closeout'] },
    { status: 'Completed', count: Math.floor(Math.random() * 40) + 20, color: STATUS_COLORS['Completed'] },
    { status: 'Cancelled', count: Math.floor(Math.random() * 8) + 1, color: STATUS_COLORS['Cancelled'] },
    { status: 'On Hold', count: Math.floor(Math.random() * 5) + 1, color: STATUS_COLORS['On Hold'] },
  ];

  // Generate volume trends
  const volumeTrends: IVolumeData[] = [];
  for (let i = 0; i < daysDiff; i += Math.ceil(daysDiff / 15)) {
    const date = new Date(startDate.getTime());
    date.setDate(date.getDate() + i);
    volumeTrends.push({
      date,
      submitted: Math.floor(Math.random() * 8) + 1,
      completed: Math.floor(Math.random() * 6) + 1,
      cancelled: Math.floor(Math.random() * 2),
    });
  }

  // Generate attorney workload
  const attorneyWorkload: IAttorneyWorkload[] = MOCK_ATTORNEYS.slice(0, 6).map((name, index) => ({
    attorneyId: index + 1,
    attorneyName: name,
    assignedCount: Math.floor(Math.random() * 15) + 3,
    inProgressCount: Math.floor(Math.random() * 8) + 1,
    completedCount: Math.floor(Math.random() * 20) + 5,
    avgHours: Math.floor(Math.random() * 30) + 5,
  }));

  // Generate requests at risk
  const requestsAtRisk: IRequestAtRisk[] = [];
  for (let i = 0; i < 5; i++) {
    const daysOverdue = Math.floor(Math.random() * 10) - 3;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - daysOverdue);

    let riskCategory: 'Overdue' | 'Due Today' | 'Due This Week';
    if (daysOverdue > 0) {
      riskCategory = 'Overdue';
    } else if (daysOverdue === 0) {
      riskCategory = 'Due Today';
    } else {
      riskCategory = 'Due This Week';
    }

    const idNum = 100 + i;
    const idStr = idNum < 10 ? `00${idNum}` : idNum < 100 ? `0${idNum}` : `${idNum}`;
    requestsAtRisk.push({
      id: 1000 + i,
      requestId: `CRR-2024-${idStr}`,
      requestTitle: `Marketing Communication ${i + 1}`,
      status: ['Legal Intake', 'In Review', 'Assign Attorney'][Math.floor(Math.random() * 3)],
      targetReturnDate: targetDate,
      daysOverdue: Math.max(0, daysOverdue),
      attorney: MOCK_ATTORNEYS[Math.floor(Math.random() * MOCK_ATTORNEYS.length)],
      riskCategory,
    });
  }

  // Generate time by stage
  const timeByStage: ITimeByStage[] = [
    {
      stage: 'Legal Intake',
      avgReviewerHours: Math.floor(Math.random() * 5) + 1,
      avgSubmitterHours: Math.floor(Math.random() * 3) + 0.5,
      totalHours: 0,
      color: STAGE_COLORS['Legal Intake'],
    },
    {
      stage: 'Legal Review',
      avgReviewerHours: Math.floor(Math.random() * 15) + 5,
      avgSubmitterHours: Math.floor(Math.random() * 5) + 1,
      totalHours: 0,
      color: STAGE_COLORS['Legal Review'],
    },
    {
      stage: 'Compliance Review',
      avgReviewerHours: Math.floor(Math.random() * 10) + 3,
      avgSubmitterHours: Math.floor(Math.random() * 4) + 1,
      totalHours: 0,
      color: STAGE_COLORS['Compliance Review'],
    },
    {
      stage: 'Closeout',
      avgReviewerHours: Math.floor(Math.random() * 3) + 0.5,
      avgSubmitterHours: Math.floor(Math.random() * 2) + 0.5,
      totalHours: 0,
      color: STAGE_COLORS['Closeout'],
    },
  ];

  timeByStage.forEach(stage => {
    stage.totalHours = stage.avgReviewerHours + stage.avgSubmitterHours;
  });

  // Generate review outcomes
  const reviewOutcomes: IReviewOutcome[] = [
    {
      outcome: 'Approved',
      legalCount: Math.floor(Math.random() * 40) + 20,
      complianceCount: Math.floor(Math.random() * 35) + 15,
      color: OUTCOME_COLORS['Approved'],
    },
    {
      outcome: 'Approved With Comments',
      legalCount: Math.floor(Math.random() * 20) + 10,
      complianceCount: Math.floor(Math.random() * 15) + 5,
      color: OUTCOME_COLORS['Approved With Comments'],
    },
    {
      outcome: 'Respond To Comments',
      legalCount: Math.floor(Math.random() * 10) + 3,
      complianceCount: Math.floor(Math.random() * 8) + 2,
      color: OUTCOME_COLORS['Respond To Comments'],
    },
    {
      outcome: 'Not Approved',
      legalCount: Math.floor(Math.random() * 5) + 1,
      complianceCount: Math.floor(Math.random() * 4) + 1,
      color: OUTCOME_COLORS['Not Approved'],
    },
  ];

  // Generate Communications Only distribution
  const commOnlyCount = Math.floor(Math.random() * 30) + 10;
  const nonCommOnlyCount = kpiMetrics.totalRequests - commOnlyCount;
  const communicationsOnlyDistribution: ICommunicationsOnlyData[] = [
    {
      category: 'Communications Only',
      count: commOnlyCount,
      color: '#0078d4',
    },
    {
      category: 'With Additional Approvals',
      count: nonCommOnlyCount,
      color: '#8764b8',
    },
  ];

  return {
    kpiMetrics,
    statusDistribution,
    volumeTrends,
    attorneyWorkload,
    requestsAtRisk,
    timeByStage,
    reviewOutcomes,
    communicationsOnlyDistribution,
    filterOptions: {
      reviewAudience: ['Legal', 'Compliance', 'Both'],
      requestType: ['Communication', 'General Review'],
      department: ['Marketing', 'Product', 'Distribution', 'Institutional Sales', 'Compliance'],
    },
    lastUpdated: new Date(),
  };
};

/**
 * Check user access for dashboard
 * Uses centralized userGroupsService with caching and deduplication
 */
export const checkUserAccess = async (): Promise<IUserAccess> => {
  try {
    SPContext.logger.info('AnalyticsDataService: Checking user access...');
    const access = await checkDashboardAccess();
    SPContext.logger.info('AnalyticsDataService: Access check complete', access);
    return access;
  } catch (error: unknown) {
    // Log the actual error for debugging
    SPContext.logger.error('AnalyticsDataService: Access check failed', error);

    // Return access denied on error
    return {
      isAdmin: false,
      isLegalAdmin: false,
      hasAccess: false,
    };
  }
};

/**
 * Fetch real dashboard data from SharePoint
 */
export const fetchDashboardData = async (
  dateRange: DateRangeOption,
  customStartDate?: Date,
  customEndDate?: Date,
  filters?: IDashboardFilters
): Promise<IDashboardData> => {
  const { startDate, endDate } = getDateRange(dateRange, customStartDate, customEndDate);

  try {
    // Escape OData string values (single quotes → doubled)
    const escapeOData = (value: string): string => value.replace(/'/g, "''");

    // Build segmentation filter clauses (applied to all three queries for consistency)
    let segmentationFilter = '';
    if (filters?.reviewAudience) {
      segmentationFilter += ` and ${RequestsFields.ReviewAudience} eq '${escapeOData(filters.reviewAudience)}'`;
    }
    if (filters?.requestType) {
      segmentationFilter += ` and ${RequestsFields.RequestType} eq '${escapeOData(filters.requestType)}'`;
    }
    if (filters?.department) {
      segmentationFilter += ` and ${RequestsFields.Department} eq '${escapeOData(filters.department)}'`;
    }

    // Build query filters
    const dateFilter = `${RequestsFields.Created} ge datetime'${startDate.toISOString()}' and ${RequestsFields.Created} le datetime'${endDate.toISOString()}'${segmentationFilter}`;

    // Previous period for trend comparison (same segmentation filters)
    const periodMs = endDate.getTime() - startDate.getTime();
    const prevEndDate = new Date(startDate.getTime() - 1);
    const prevStartDate = new Date(prevEndDate.getTime() - periodMs);
    prevStartDate.setHours(0, 0, 0, 0);
    const prevDateFilter = `${RequestsFields.Created} ge datetime'${prevStartDate.toISOString()}' and ${RequestsFields.Created} le datetime'${prevEndDate.toISOString()}'${segmentationFilter}`;

    // Snapshot filter — active items only (no date range), excludes On Hold
    const snapshotFilter = `${RequestsFields.Status} ne 'Draft' and ${RequestsFields.Status} ne 'Completed' and ${RequestsFields.Status} ne 'Cancelled' and ${RequestsFields.Status} ne 'On Hold'${segmentationFilter}`;

    // Run all three queries in parallel
    const [items, snapshotItems, prevItems] = await Promise.all([
      // 1. Period query — items created within date range
      SPContext.sp.web.lists
        .getByTitle(Lists.Requests.Title)
        .items
        .select(
          RequestsFields.ID,
          RequestsFields.RequestId,
          RequestsFields.RequestTitle,
          RequestsFields.Status,
          RequestsFields.TargetReturnDate,
          RequestsFields.Created,
          RequestsFields.IsRushRequest,
          RequestsFields.CommunicationsOnly,
          `${RequestsFields.Attorney}/ID`,
          `${RequestsFields.Attorney}/Title`,
          RequestsFields.LegalReviewOutcome,
          RequestsFields.ComplianceReviewOutcome,
          RequestsFields.LegalIntakeLegalAdminHours,
          RequestsFields.LegalIntakeSubmitterHours,
          RequestsFields.LegalReviewAttorneyHours,
          RequestsFields.LegalReviewSubmitterHours,
          RequestsFields.ComplianceReviewReviewerHours,
          RequestsFields.ComplianceReviewSubmitterHours,
          RequestsFields.CloseoutReviewerHours,
          RequestsFields.CloseoutSubmitterHours,
          RequestsFields.TotalReviewerHours,
          RequestsFields.TotalSubmitterHours,
          RequestsFields.CloseoutOn,
          RequestsFields.SubmittedOn,
          RequestsFields.FINRACommentsReceived,
          RequestsFields.FINRACompletedOn,
          RequestsFields.ReviewAudience,
          RequestsFields.RequestType,
          RequestsFields.Department
        )
        .expand(RequestsFields.Attorney)
        .filter(dateFilter)
        .top(5000)(),

      // 2. Snapshot query — current state (no date filter)
      SPContext.sp.web.lists
        .getByTitle(Lists.Requests.Title)
        .items
        .select(
          RequestsFields.ID,
          RequestsFields.RequestId,
          RequestsFields.RequestTitle,
          RequestsFields.Status,
          RequestsFields.TargetReturnDate,
          `${RequestsFields.Attorney}/ID`,
          `${RequestsFields.Attorney}/Title`,
          RequestsFields.FINRACommentsReceived,
          RequestsFields.FINRAComment
        )
        .expand(RequestsFields.Attorney)
        .filter(snapshotFilter)
        .top(5000)(),

      // 3. Previous period query — for trend comparison
      SPContext.sp.web.lists
        .getByTitle(Lists.Requests.Title)
        .items
        .select(
          RequestsFields.ID,
          RequestsFields.Status,
          RequestsFields.SubmittedOn,
          RequestsFields.CloseoutOn,
          RequestsFields.FINRACompletedOn
        )
        .filter(prevDateFilter)
        .top(5000)(),
    ]);

    // Calculate KPI metrics
    const totalRequests = items.length;
    const completedRequests = items.filter((i: { Status: string }) => i.Status === 'Completed');
    const rushRequests = items.filter((i: { IsRushRequest: boolean }) => i.IsRushRequest);

    // Calculate average turnaround for completed requests
    let avgTurnaroundDays = 0;
    if (completedRequests.length > 0) {
      const turnaroundDays = completedRequests.map((r: { SubmittedOn?: string; CloseoutOn?: string; FINRACompletedOn?: string }) => {
        const completionDateStr = r.FINRACompletedOn || r.CloseoutOn;
        if (r.SubmittedOn && completionDateStr) {
          const submitted = new Date(r.SubmittedOn);
          const completion = new Date(completionDateStr);
          return Math.ceil((completion.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24));
        }
        return 0;
      }).filter((d: number) => d > 0);

      if (turnaroundDays.length > 0) {
        avgTurnaroundDays = Math.round(turnaroundDays.reduce((a: number, b: number) => a + b, 0) / turnaroundDays.length);
      }
    }

    // Calculate SLA compliance
    let slaCompliance = 100;
    const completedWithDates = completedRequests.filter((r: { TargetReturnDate?: string; CloseoutOn?: string; FINRACompletedOn?: string }) =>
      r.TargetReturnDate && (r.FINRACompletedOn || r.CloseoutOn)
    );
    if (completedWithDates.length > 0) {
      const onTime = completedWithDates.filter((r: { TargetReturnDate: string; CloseoutOn?: string; FINRACompletedOn?: string }) => {
        const completionDate = new Date((r.FINRACompletedOn || r.CloseoutOn) as string);
        return completionDate <= new Date(r.TargetReturnDate);
      });
      slaCompliance = Math.round((onTime.length / completedWithDates.length) * 100);
    }

    // Calculate total hours
    const totalHours = items.reduce((sum: number, item: { TotalReviewerHours?: number; TotalSubmitterHours?: number }) => {
      return sum + (item.TotalReviewerHours || 0) + (item.TotalSubmitterHours || 0);
    }, 0);

    // Snapshot metrics (from unfiltered active items query)
    const snapshotPendingReviews = snapshotItems.filter((i: { Status: string }) =>
      ['Legal Intake', 'Assign Attorney', 'In Review', 'Closeout'].includes(i.Status)
    );
    const snapshotAwaitingFINRA = snapshotItems.filter((i: { Status: string }) => i.Status === 'Awaiting FINRA Documents');
    const snapshotFINRAComments = snapshotAwaitingFINRA.filter(
      (i: { FINRACommentsReceived?: boolean }) => i.FINRACommentsReceived === true
    ).length;
    const snapshotFINRAWithComment = snapshotAwaitingFINRA.filter(
      (i: { FINRAComment?: string }) => !!i.FINRAComment
    ).length;

    // Calculate trends from previous period
    const prevTotalRequests = prevItems.length;
    const totalRequestsTrend = prevTotalRequests > 0
      ? Math.round(((totalRequests - prevTotalRequests) / prevTotalRequests) * 100)
      : 0;

    let prevAvgTurnaround = 0;
    const prevCompleted = prevItems.filter((i: { Status: string }) => i.Status === 'Completed');
    if (prevCompleted.length > 0) {
      const prevDays = prevCompleted.map((r: { SubmittedOn?: string; CloseoutOn?: string; FINRACompletedOn?: string }) => {
        const completionDateStr = r.FINRACompletedOn || r.CloseoutOn;
        if (r.SubmittedOn && completionDateStr) {
          return Math.ceil((new Date(completionDateStr).getTime() - new Date(r.SubmittedOn).getTime()) / (1000 * 60 * 60 * 24));
        }
        return 0;
      }).filter((d: number) => d > 0);
      if (prevDays.length > 0) {
        prevAvgTurnaround = Math.round(prevDays.reduce((a: number, b: number) => a + b, 0) / prevDays.length);
      }
    }
    const avgTurnaroundTrend = prevAvgTurnaround > 0
      ? Math.round(((avgTurnaroundDays - prevAvgTurnaround) / prevAvgTurnaround) * 100)
      : 0;

    // Split hours into reviewer and submitter
    const totalReviewerHrs = items.reduce((sum: number, item: { TotalReviewerHours?: number }) => {
      return sum + (item.TotalReviewerHours || 0);
    }, 0);
    const totalSubmitterHrs = items.reduce((sum: number, item: { TotalSubmitterHours?: number }) => {
      return sum + (item.TotalSubmitterHours || 0);
    }, 0);

    const kpiMetrics: IKPIMetrics = {
      totalRequests,
      totalRequestsTrend,
      avgTurnaroundDays,
      avgTurnaroundTrend,
      pendingReviews: snapshotPendingReviews.length,
      rushRequestPercentage: totalRequests > 0 ? Math.round((rushRequests.length / totalRequests) * 100) : 0,
      slaCompliancePercentage: slaCompliance,
      totalHoursLogged: Math.round(totalHours * 10) / 10,
      totalReviewerHours: Math.round(totalReviewerHrs * 10) / 10,
      totalSubmitterHours: Math.round(totalSubmitterHrs * 10) / 10,
      awaitingFINRADocuments: snapshotAwaitingFINRA.length,
      finraCommentsReceived: snapshotFINRAComments,
      finraWithCommentText: snapshotFINRAWithComment,
    };

    // Calculate status distribution
    const statusCounts: Record<string, number> = {};
    items.forEach((item: { Status: string }) => {
      statusCounts[item.Status] = (statusCounts[item.Status] || 0) + 1;
    });

    const statusEntries: Array<[string, number]> = [];
    for (const key in statusCounts) {
      if (Object.prototype.hasOwnProperty.call(statusCounts, key)) {
        statusEntries.push([key, statusCounts[key]]);
      }
    }
    const statusDistribution: IStatusData[] = statusEntries.map(([status, count]: [string, number]) => ({
      status,
      count,
      color: STATUS_COLORS[status] || '#8a8886',
    }));

    // Calculate volume trends (group by date)
    const volumeByDate: Record<string, IVolumeData> = {};
    items.forEach((item: { Created: string; Status: string }) => {
      const dateKey = new Date(item.Created).toISOString().split('T')[0];
      if (!volumeByDate[dateKey]) {
        volumeByDate[dateKey] = {
          date: new Date(dateKey),
          submitted: 0,
          completed: 0,
          cancelled: 0,
        };
      }
      volumeByDate[dateKey].submitted++;
      if (item.Status === 'Completed') volumeByDate[dateKey].completed++;
      if (item.Status === 'Cancelled') volumeByDate[dateKey].cancelled++;
    });

    const volumeValues: IVolumeData[] = [];
    for (const key in volumeByDate) {
      if (Object.prototype.hasOwnProperty.call(volumeByDate, key)) {
        volumeValues.push(volumeByDate[key]);
      }
    }
    const volumeTrends = volumeValues.sort((a: IVolumeData, b: IVolumeData) =>
      a.date.getTime() - b.date.getTime()
    );

    // Calculate attorney workload (supports multi-attorney assignments)
    const attorneyData: Record<number, IAttorneyWorkload> = {};
    items.forEach((item: { Attorney?: Array<{ Id: number; Title: string }> | { Id: number; Title: string }; Status: string; TotalReviewerHours?: number }) => {
      // Normalize to array (handles both single and multi-value field formats)
      const attorneys = Array.isArray(item.Attorney) ? item.Attorney : (item.Attorney ? [item.Attorney] : []);
      attorneys.forEach((attorney) => {
        if (attorney && attorney.Id) {
          if (!attorneyData[attorney.Id]) {
            attorneyData[attorney.Id] = {
              attorneyId: attorney.Id,
              attorneyName: attorney.Title,
              assignedCount: 0,
              inProgressCount: 0,
              completedCount: 0,
              avgHours: 0,
            };
          }
          attorneyData[attorney.Id].assignedCount++;
          if (item.Status === 'In Review') {
            attorneyData[attorney.Id].inProgressCount++;
          }
          if (item.Status === 'Completed') {
            attorneyData[attorney.Id].completedCount++;
          }
          attorneyData[attorney.Id].avgHours += (item.TotalReviewerHours || 0);
        }
      });
    });

    const attorneyValues: IAttorneyWorkload[] = [];
    for (const key in attorneyData) {
      if (Object.prototype.hasOwnProperty.call(attorneyData, key)) {
        const entry = attorneyData[parseInt(key, 10)];
        if (entry) {
          attorneyValues.push(entry);
        }
      }
    }
    const attorneyWorkload = attorneyValues
      .map((a: IAttorneyWorkload) => ({
        ...a,
        avgHours: a.assignedCount > 0 ? Math.round((a.avgHours / a.assignedCount) * 10) / 10 : 0,
      }))
      .sort((a, b) => b.inProgressCount - a.inProgressCount);

    // Calculate requests at risk (from snapshot — all active items, not period-filtered)
    const today = new Date();
    const requestsAtRisk: IRequestAtRisk[] = snapshotItems
      .filter((item: { Status: string; TargetReturnDate?: string }) => {
        if (!item.TargetReturnDate) return false;
        const target = new Date(item.TargetReturnDate);
        const daysLeft = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysLeft <= 5; // Within 5 days or overdue
      })
      .map((item: { Id: number; Title: string; RequestTitle: string; Status: string; TargetReturnDate: string; Attorney?: { Title: string } }) => {
        const target = new Date(item.TargetReturnDate);
        const daysLeft = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const daysOverdue = Math.max(0, -daysLeft);
        let riskCategory: 'Overdue' | 'Due Today' | 'Due This Week';
        if (daysLeft < 0) {
          riskCategory = 'Overdue';
        } else if (daysLeft === 0) {
          riskCategory = 'Due Today';
        } else {
          riskCategory = 'Due This Week';
        }
        return {
          id: item.Id,
          requestId: item.Title,
          requestTitle: item.RequestTitle,
          status: item.Status,
          targetReturnDate: target,
          daysOverdue,
          attorney: item.Attorney?.Title || 'Unassigned',
          riskCategory,
        };
      })
      .sort((a, b) => {
        const order: Record<string, number> = { 'Overdue': 0, 'Due Today': 1, 'Due This Week': 2 };
        return (order[a.riskCategory] - order[b.riskCategory]) || (b.daysOverdue - a.daysOverdue);
      })
      .slice(0, 15);

    // Calculate time by stage
    const stageHours: Record<string, { reviewer: number; submitter: number; count: number }> = {
      'Legal Intake': { reviewer: 0, submitter: 0, count: 0 },
      'Legal Review': { reviewer: 0, submitter: 0, count: 0 },
      'Compliance Review': { reviewer: 0, submitter: 0, count: 0 },
      'Closeout': { reviewer: 0, submitter: 0, count: 0 },
    };

    items.forEach((item: {
      LegalIntakeLegalAdminHours?: number;
      LegalIntakeSubmitterHours?: number;
      LegalReviewAttorneyHours?: number;
      LegalReviewSubmitterHours?: number;
      ComplianceReviewReviewerHours?: number;
      ComplianceReviewSubmitterHours?: number;
      CloseoutReviewerHours?: number;
      CloseoutSubmitterHours?: number;
    }) => {
      if (item.LegalIntakeLegalAdminHours || item.LegalIntakeSubmitterHours) {
        stageHours['Legal Intake'].reviewer += item.LegalIntakeLegalAdminHours || 0;
        stageHours['Legal Intake'].submitter += item.LegalIntakeSubmitterHours || 0;
        stageHours['Legal Intake'].count++;
      }
      if (item.LegalReviewAttorneyHours || item.LegalReviewSubmitterHours) {
        stageHours['Legal Review'].reviewer += item.LegalReviewAttorneyHours || 0;
        stageHours['Legal Review'].submitter += item.LegalReviewSubmitterHours || 0;
        stageHours['Legal Review'].count++;
      }
      if (item.ComplianceReviewReviewerHours || item.ComplianceReviewSubmitterHours) {
        stageHours['Compliance Review'].reviewer += item.ComplianceReviewReviewerHours || 0;
        stageHours['Compliance Review'].submitter += item.ComplianceReviewSubmitterHours || 0;
        stageHours['Compliance Review'].count++;
      }
      if (item.CloseoutReviewerHours || item.CloseoutSubmitterHours) {
        stageHours['Closeout'].reviewer += item.CloseoutReviewerHours || 0;
        stageHours['Closeout'].submitter += item.CloseoutSubmitterHours || 0;
        stageHours['Closeout'].count++;
      }
    });

    // Build timeByStage in consistent order
    const stageOrder = ['Legal Intake', 'Legal Review', 'Compliance Review', 'Closeout'];
    const timeByStage: ITimeByStage[] = stageOrder.map(stage => {
      const data = stageHours[stage];
      return {
        stage,
        avgReviewerHours: data.count > 0 ? Math.round((data.reviewer / data.count) * 10) / 10 : 0,
        avgSubmitterHours: data.count > 0 ? Math.round((data.submitter / data.count) * 10) / 10 : 0,
        totalHours: data.count > 0 ? Math.round(((data.reviewer + data.submitter) / data.count) * 10) / 10 : 0,
        color: STAGE_COLORS[stage] || '#8a8886',
      };
    });

    // Calculate review outcomes
    const legalOutcomes: Record<string, number> = {};
    const complianceOutcomes: Record<string, number> = {};

    items.forEach((item: { LegalReviewOutcome?: string; ComplianceReviewOutcome?: string }) => {
      if (item.LegalReviewOutcome) {
        legalOutcomes[item.LegalReviewOutcome] = (legalOutcomes[item.LegalReviewOutcome] || 0) + 1;
      }
      if (item.ComplianceReviewOutcome) {
        complianceOutcomes[item.ComplianceReviewOutcome] = (complianceOutcomes[item.ComplianceReviewOutcome] || 0) + 1;
      }
    });

    const allOutcomes = new Set([...Object.keys(legalOutcomes), ...Object.keys(complianceOutcomes)]);
    const reviewOutcomes: IReviewOutcome[] = Array.from(allOutcomes).map(outcome => ({
      outcome,
      legalCount: legalOutcomes[outcome] || 0,
      complianceCount: complianceOutcomes[outcome] || 0,
      color: OUTCOME_COLORS[outcome] || '#8a8886',
    }));

    // Calculate Communications Only distribution
    const commOnlyCount = items.filter((item: { CommunicationsOnly?: boolean }) => item.CommunicationsOnly === true).length;
    const nonCommOnlyCount = totalRequests - commOnlyCount;
    const communicationsOnlyDistribution: ICommunicationsOnlyData[] = [
      {
        category: 'Communications Only',
        count: commOnlyCount,
        color: '#0078d4',
      },
      {
        category: 'With Additional Approvals',
        count: nonCommOnlyCount,
        color: '#8764b8',
      },
    ];

    // Extract unique filter options for segmentation dropdowns
    const filterOptions: IDashboardFilterOptions = {
      reviewAudience: Array.from(new Set(
        items.map((i: { ReviewAudience?: string }) => i.ReviewAudience).filter((v): v is string => !!v)
      )).sort(),
      requestType: Array.from(new Set(
        items.map((i: { RequestType?: string }) => i.RequestType).filter((v): v is string => !!v)
      )).sort(),
      department: Array.from(new Set(
        items.map((i: { Department?: string }) => i.Department).filter((v): v is string => !!v)
      )).sort(),
    };

    return {
      kpiMetrics,
      statusDistribution,
      volumeTrends,
      attorneyWorkload,
      requestsAtRisk,
      timeByStage,
      reviewOutcomes,
      communicationsOnlyDistribution,
      filterOptions,
      lastUpdated: new Date(),
    };
  } catch (error) {
    SPContext.logger.error('Failed to fetch dashboard data', error);
    throw error;
  }
};

/**
 * Analytics Data Service
 * Provides real and mock data for the Analytics Dashboard
 */

import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists';
import { checkDashboardAccess } from '@services/userGroupsService';
import type {
  IDashboardData,
  IKPIMetrics,
  IStatusData,
  IVolumeData,
  IAttorneyWorkload,
  IRequestAtRisk,
  ITimeByStage,
  IReviewOutcome,
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
  const kpiMetrics: IKPIMetrics = {
    totalRequests: Math.floor(Math.random() * 150) + 50,
    totalRequestsTrend: Math.floor(Math.random() * 30) - 10,
    avgTurnaroundDays: Math.floor(Math.random() * 10) + 3,
    avgTurnaroundTrend: Math.floor(Math.random() * 20) - 10,
    pendingReviews: Math.floor(Math.random() * 30) + 5,
    rushRequestPercentage: Math.floor(Math.random() * 25) + 5,
    slaCompliancePercentage: Math.floor(Math.random() * 20) + 75,
    totalHoursLogged: Math.floor(Math.random() * 500) + 100,
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

  return {
    kpiMetrics,
    statusDistribution,
    volumeTrends,
    attorneyWorkload,
    requestsAtRisk,
    timeByStage,
    reviewOutcomes,
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
  customEndDate?: Date
): Promise<IDashboardData> => {
  const { startDate, endDate } = getDateRange(dateRange, customStartDate, customEndDate);

  try {
    // Fetch all requests within date range
    const dateFilter = `Created ge datetime'${startDate.toISOString()}' and Created le datetime'${endDate.toISOString()}'`;

    const items = await SPContext.sp.web.lists
      .getByTitle('Requests')
      .items
      .select(
        'Id',
        'Title',
        'RequestTitle',
        'Status',
        'TargetReturnDate',
        'Created',
        'IsRushRequest',
        'Attorney/Id',
        'Attorney/Title',
        'LegalReviewOutcome',
        'ComplianceReviewOutcome',
        'LegalIntakeLegalAdminHours',
        'LegalIntakeSubmitterHours',
        'LegalReviewAttorneyHours',
        'LegalReviewSubmitterHours',
        'ComplianceReviewReviewerHours',
        'ComplianceReviewSubmitterHours',
        'CloseoutReviewerHours',
        'CloseoutSubmitterHours',
        'TotalReviewerHours',
        'TotalSubmitterHours',
        'CloseoutOn',
        'SubmittedOn'
      )
      .expand('Attorney')
      .filter(dateFilter)
      .top(5000)();

    // Calculate KPI metrics
    const totalRequests = items.length;
    const completedRequests = items.filter((i: { Status: string }) => i.Status === 'Completed');
    const pendingRequests = items.filter((i: { Status: string }) =>
      ['Legal Intake', 'Assign Attorney', 'In Review', 'Closeout'].includes(i.Status)
    );
    const rushRequests = items.filter((i: { IsRushRequest: boolean }) => i.IsRushRequest);

    // Calculate average turnaround for completed requests
    let avgTurnaroundDays = 0;
    if (completedRequests.length > 0) {
      const turnaroundDays = completedRequests.map((r: { SubmittedOn: string; CloseoutOn: string }) => {
        if (r.SubmittedOn && r.CloseoutOn) {
          const submitted = new Date(r.SubmittedOn);
          const closeout = new Date(r.CloseoutOn);
          return Math.ceil((closeout.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24));
        }
        return 0;
      }).filter((d: number) => d > 0);

      if (turnaroundDays.length > 0) {
        avgTurnaroundDays = Math.round(turnaroundDays.reduce((a: number, b: number) => a + b, 0) / turnaroundDays.length);
      }
    }

    // Calculate SLA compliance
    let slaCompliance = 100;
    const completedWithDates = completedRequests.filter((r: { TargetReturnDate: string; CloseoutOn: string }) =>
      r.TargetReturnDate && r.CloseoutOn
    );
    if (completedWithDates.length > 0) {
      const onTime = completedWithDates.filter((r: { TargetReturnDate: string; CloseoutOn: string }) =>
        new Date(r.CloseoutOn) <= new Date(r.TargetReturnDate)
      );
      slaCompliance = Math.round((onTime.length / completedWithDates.length) * 100);
    }

    // Calculate total hours
    const totalHours = items.reduce((sum: number, item: { TotalReviewerHours?: number; TotalSubmitterHours?: number }) => {
      return sum + (item.TotalReviewerHours || 0) + (item.TotalSubmitterHours || 0);
    }, 0);

    const kpiMetrics: IKPIMetrics = {
      totalRequests,
      totalRequestsTrend: 0, // Would need previous period data
      avgTurnaroundDays,
      avgTurnaroundTrend: 0,
      pendingReviews: pendingRequests.length,
      rushRequestPercentage: totalRequests > 0 ? Math.round((rushRequests.length / totalRequests) * 100) : 0,
      slaCompliancePercentage: slaCompliance,
      totalHoursLogged: Math.round(totalHours * 10) / 10,
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

    // Calculate attorney workload
    const attorneyData: Record<number, IAttorneyWorkload> = {};
    items.forEach((item: { Attorney?: { Id: number; Title: string }; Status: string; TotalReviewerHours?: number }) => {
      if (item.Attorney) {
        if (!attorneyData[item.Attorney.Id]) {
          attorneyData[item.Attorney.Id] = {
            attorneyId: item.Attorney.Id,
            attorneyName: item.Attorney.Title,
            assignedCount: 0,
            inProgressCount: 0,
            completedCount: 0,
            avgHours: 0,
          };
        }
        attorneyData[item.Attorney.Id].assignedCount++;
        if (item.Status === 'In Review') {
          attorneyData[item.Attorney.Id].inProgressCount++;
        }
        if (item.Status === 'Completed') {
          attorneyData[item.Attorney.Id].completedCount++;
        }
        attorneyData[item.Attorney.Id].avgHours += (item.TotalReviewerHours || 0);
      }
    });

    const attorneyValues: IAttorneyWorkload[] = [];
    for (const key in attorneyData) {
      if (Object.prototype.hasOwnProperty.call(attorneyData, key)) {
        attorneyValues.push(attorneyData[parseInt(key, 10)]);
      }
    }
    const attorneyWorkload = attorneyValues.map((a: IAttorneyWorkload) => ({
      ...a,
      avgHours: a.assignedCount > 0 ? Math.round((a.avgHours / a.assignedCount) * 10) / 10 : 0,
    }));

    // Calculate requests at risk
    const today = new Date();
    const requestsAtRisk: IRequestAtRisk[] = items
      .filter((item: { Status: string; TargetReturnDate?: string }) => {
        if (!item.TargetReturnDate) return false;
        if (['Completed', 'Cancelled'].includes(item.Status)) return false;
        const target = new Date(item.TargetReturnDate);
        const daysLeft = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysLeft <= 3; // Within 3 days or overdue
      })
      .map((item: { Id: number; Title: string; RequestTitle: string; Status: string; TargetReturnDate: string; Attorney?: { Title: string } }) => {
        const target = new Date(item.TargetReturnDate);
        const daysOverdue = Math.ceil((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: item.Id,
          requestId: item.Title,
          requestTitle: item.RequestTitle,
          status: item.Status,
          targetReturnDate: target,
          daysOverdue: Math.max(0, daysOverdue),
          attorney: item.Attorney?.Title || 'Unassigned',
        };
      })
      .slice(0, 10);

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

    const timeByStage: ITimeByStage[] = [];
    for (const stage in stageHours) {
      if (Object.prototype.hasOwnProperty.call(stageHours, stage)) {
        const data = stageHours[stage];
        timeByStage.push({
          stage,
          avgReviewerHours: data.count > 0 ? Math.round((data.reviewer / data.count) * 10) / 10 : 0,
          avgSubmitterHours: data.count > 0 ? Math.round((data.submitter / data.count) * 10) / 10 : 0,
          totalHours: data.count > 0 ? Math.round(((data.reviewer + data.submitter) / data.count) * 10) / 10 : 0,
          color: STAGE_COLORS[stage] || '#8a8886',
        });
      }
    }

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

    return {
      kpiMetrics,
      statusDistribution,
      volumeTrends,
      attorneyWorkload,
      requestsAtRisk,
      timeByStage,
      reviewOutcomes,
      lastUpdated: new Date(),
    };
  } catch (error) {
    SPContext.logger.error('Failed to fetch dashboard data', error);
    throw error;
  }
};

import { WebPartContext } from '@microsoft/sp-webpart-base';

/**
 * Date range options for filtering
 */
export type DateRangeOption = '7' | '30' | '90' | 'custom';

/**
 * KPI Summary Metrics
 */
export interface IKPIMetrics {
  // Period metrics (filtered by date range)
  totalRequests: number;
  totalRequestsTrend: number; // percentage change from previous period
  avgTurnaroundDays: number;
  avgTurnaroundTrend: number;
  rushRequestPercentage: number;
  slaCompliancePercentage: number;
  totalHoursLogged: number;
  totalReviewerHours: number;
  totalSubmitterHours: number;
  // Snapshot metrics (current state, not period-filtered)
  pendingReviews: number;
  /** Requests awaiting FINRA documents where FINRA comments have been received */
  finraCommentsReceived: number;
  /** Total requests currently awaiting FINRA documents */
  awaitingFINRADocuments: number;
  /** Awaiting FINRA requests that have comment text entered */
  finraWithCommentText: number;
}

/**
 * Status distribution data point
 */
export interface IStatusData {
  status: string;
  count: number;
  color: string;
}

/**
 * Volume trend data point
 */
export interface IVolumeData {
  date: Date;
  submitted: number;
  completed: number;
  cancelled: number;
}

/**
 * Attorney workload data
 */
export interface IAttorneyWorkload {
  attorneyId: number;
  attorneyName: string;
  assignedCount: number;
  inProgressCount: number;
  completedCount: number;
  avgHours: number;
}

/**
 * Request at risk data
 */
export interface IRequestAtRisk {
  id: number;
  requestId: string;
  requestTitle: string;
  status: string;
  targetReturnDate: Date;
  daysOverdue: number;
  attorney: string;
  riskCategory: 'Overdue' | 'Due Today' | 'Due This Week';
}

/**
 * Time by stage metrics
 */
export interface ITimeByStage {
  stage: string;
  avgReviewerHours: number;
  avgSubmitterHours: number;
  totalHours: number;
  color: string;
}

/**
 * Review outcome data
 */
export interface IReviewOutcome {
  outcome: string;
  legalCount: number;
  complianceCount: number;
  color: string;
}

/**
 * Communications Only distribution data
 */
export interface ICommunicationsOnlyData {
  category: string;
  count: number;
  color: string;
}

/**
 * Filter options for segmentation
 */
export interface IDashboardFilterOptions {
  reviewAudience: string[];
  requestType: string[];
  department: string[];
}

/**
 * Active filter selections
 */
export interface IDashboardFilters {
  reviewAudience?: string;
  requestType?: string;
  department?: string;
}

/**
 * Complete dashboard data
 */
export interface IDashboardData {
  kpiMetrics: IKPIMetrics;
  statusDistribution: IStatusData[];
  volumeTrends: IVolumeData[];
  attorneyWorkload: IAttorneyWorkload[];
  requestsAtRisk: IRequestAtRisk[];
  timeByStage: ITimeByStage[];
  reviewOutcomes: IReviewOutcome[];
  communicationsOnlyDistribution: ICommunicationsOnlyData[];
  filterOptions: IDashboardFilterOptions;
  lastUpdated: Date;
}

/**
 * User access level
 */
export interface IUserAccess {
  isAdmin: boolean;
  isLegalAdmin: boolean;
  hasAccess: boolean;
}

/**
 * Analytics Dashboard Props
 */
export interface IAnalyticsDashboardProps {
  title: string;
  useMockData: boolean;
  defaultDateRange: DateRangeOption;
  context: WebPartContext;
  isDarkTheme: boolean;
  hasTeamsContext: boolean;
}

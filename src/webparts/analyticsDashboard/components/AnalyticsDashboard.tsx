/**
 * Analytics Dashboard Component
 *
 * Full-width admin analytics dashboard for Legal Review System.
 * Shows KPIs, charts, and tables for system-wide metrics.
 * Uses DevExtreme charts and Fluent UI components.
 */

import * as React from 'react';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { Icon } from '@fluentui/react/lib/Icon';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { Toggle } from '@fluentui/react/lib/Toggle';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
import { DetailsList, DetailsListLayoutMode, SelectionMode, IColumn } from '@fluentui/react/lib/DetailsList';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists';

// DevExtreme imports
import PieChart, { Series, Label, Connector, Legend, Tooltip } from 'devextreme-react/pie-chart';
import Chart, {
  ArgumentAxis,
  CommonSeriesSettings,
  Series as ChartSeries,
  Legend as ChartLegend,
  Tooltip as ChartTooltip,
  ValueAxis,
} from 'devextreme-react/chart';

import type {
  IAnalyticsDashboardProps,
  IDashboardData,
  IUserAccess,
  DateRangeOption,
  IAttorneyWorkload,
  IRequestAtRisk,
} from './IAnalyticsDashboardProps';
import {
  generateMockData,
  fetchDashboardData,
  checkUserAccess,
} from '../services/analyticsDataService';
import styles from './AnalyticsDashboard.module.scss';

/**
 * Format number with K/M suffix
 */
const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

/**
 * Format hours for display
 */
const formatHours = (hours: number): string => {
  if (hours === 0) return '0h';
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes}m`;
  }
  return `${hours.toFixed(1)}h`;
};

/**
 * KPI Card Component
 */
interface IKPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  icon: string;
  iconColor: string;
}

const KPICard: React.FC<IKPICardProps> = ({ title, value, subtitle, trend, icon, iconColor }) => {
  const trendColor = trend !== undefined ? (trend >= 0 ? '#107c10' : '#a4262c') : undefined;
  const trendIcon = trend !== undefined ? (trend >= 0 ? 'CaretSolidUp' : 'CaretSolidDown') : undefined;

  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiIcon} style={{ backgroundColor: `${iconColor}15` }}>
        <Icon iconName={icon} style={{ color: iconColor, fontSize: '24px' }} />
      </div>
      <div className={styles.kpiContent}>
        <Text variant="small" className={styles.kpiTitle}>{title}</Text>
        <div className={styles.kpiValueRow}>
          <Text variant="xxLarge" className={styles.kpiValue}>{value}</Text>
          {trend !== undefined && (
            <div className={styles.kpiTrend} style={{ color: trendColor }}>
              <Icon iconName={trendIcon} style={{ fontSize: '12px' }} />
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
        {subtitle && (
          <Text variant="tiny" className={styles.kpiSubtitle}>{subtitle}</Text>
        )}
      </div>
    </div>
  );
};

/**
 * Section Header Component
 */
interface ISectionHeaderProps {
  title: string;
  icon: string;
  action?: React.ReactNode;
}

const SectionHeader: React.FC<ISectionHeaderProps> = ({ title, icon, action }) => (
  <div className={styles.sectionHeader}>
    <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
      <Icon iconName={icon} className={styles.sectionIcon} />
      <Text variant="large" className={styles.sectionTitle}>{title}</Text>
    </Stack>
    {action && <div className={styles.sectionAction}>{action}</div>}
  </div>
);

/**
 * Main Analytics Dashboard Component
 */
const AnalyticsDashboard: React.FC<IAnalyticsDashboardProps> = (props) => {
  const { title, useMockData, defaultDateRange } = props;

  // State
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | undefined>();
  const [, setUserAccess] = React.useState<IUserAccess | undefined>();
  const [dashboardData, setDashboardData] = React.useState<IDashboardData | undefined>();
  const [dateRange, setDateRange] = React.useState<DateRangeOption>(defaultDateRange || '30');
  const [isMockMode, setIsMockMode] = React.useState(useMockData);

  // Date range options
  const dateRangeOptions: IDropdownOption[] = [
    { key: '7', text: 'Last 7 Days' },
    { key: '30', text: 'Last 30 Days' },
    { key: '90', text: 'Last 90 Days' },
  ];

  // Load data effect
  React.useEffect(() => {
    const loadData = async (): Promise<void> => {
      setIsLoading(true);
      setError(undefined);

      try {
        // Check user access first
        console.log('AnalyticsDashboard: Starting access check...');
        const access = await checkUserAccess();
        console.log('AnalyticsDashboard: Access result:', access);
        setUserAccess(access);

        if (!access.hasAccess && !isMockMode) {
          console.error('AnalyticsDashboard: Access denied', access);
          // Include debug info to help troubleshoot
          const debugInfo = `isAdmin: ${access.isAdmin}, isLegalAdmin: ${access.isLegalAdmin}`;
          setError(`You do not have permission to view this dashboard. Access is restricted to Admin and Legal Admin users. Debug: ${debugInfo}. Check browser console (F12) for group details.`);
          setIsLoading(false);
          return;
        }

        // Load dashboard data
        let data: IDashboardData;
        if (isMockMode) {
          data = generateMockData(dateRange);
        } else {
          data = await fetchDashboardData(dateRange);
        }

        setDashboardData(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load dashboard data';
        setError(message);
        SPContext.logger.error('Dashboard load failed', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData().catch(console.error);
  }, [dateRange, isMockMode]);

  // Attorney workload columns
  const attorneyColumns: IColumn[] = [
    {
      key: 'attorneyName',
      name: 'Attorney',
      fieldName: 'attorneyName',
      minWidth: 120,
      maxWidth: 180,
      isResizable: true,
    },
    {
      key: 'assignedCount',
      name: 'Assigned',
      fieldName: 'assignedCount',
      minWidth: 70,
      maxWidth: 90,
      isResizable: true,
      onRender: (item: IAttorneyWorkload) => (
        <span className={styles.tableBadge}>{item.assignedCount}</span>
      ),
    },
    {
      key: 'inProgressCount',
      name: 'In Progress',
      fieldName: 'inProgressCount',
      minWidth: 80,
      maxWidth: 100,
      isResizable: true,
      onRender: (item: IAttorneyWorkload) => (
        <span className={`${styles.tableBadge} ${styles.badgeWarning}`}>{item.inProgressCount}</span>
      ),
    },
    {
      key: 'completedCount',
      name: 'Completed',
      fieldName: 'completedCount',
      minWidth: 80,
      maxWidth: 100,
      isResizable: true,
      onRender: (item: IAttorneyWorkload) => (
        <span className={`${styles.tableBadge} ${styles.badgeSuccess}`}>{item.completedCount}</span>
      ),
    },
    {
      key: 'avgHours',
      name: 'Avg Hours',
      fieldName: 'avgHours',
      minWidth: 80,
      maxWidth: 100,
      isResizable: true,
      onRender: (item: IAttorneyWorkload) => formatHours(item.avgHours),
    },
  ];

  // Requests at risk columns
  const riskColumns: IColumn[] = [
    {
      key: 'requestId',
      name: 'Request ID',
      fieldName: 'requestId',
      minWidth: 100,
      maxWidth: 120,
      isResizable: true,
      onRender: (item: IRequestAtRisk) => (
        <a href={`/Lists/Requests/DispForm.aspx?ID=${item.id}`} className={styles.requestLink}>
          {item.requestId}
        </a>
      ),
    },
    {
      key: 'requestTitle',
      name: 'Title',
      fieldName: 'requestTitle',
      minWidth: 150,
      maxWidth: 200,
      isResizable: true,
    },
    {
      key: 'status',
      name: 'Status',
      fieldName: 'status',
      minWidth: 90,
      maxWidth: 110,
      isResizable: true,
      onRender: (item: IRequestAtRisk) => {
        const statusKey = `status${item.status.replace(/\s/g, '')}` as keyof typeof styles;
        return (
          <span className={`${styles.statusBadge} ${styles[statusKey] || ''}`}>
            {item.status}
          </span>
        );
      },
    },
    {
      key: 'daysOverdue',
      name: 'Days Overdue',
      fieldName: 'daysOverdue',
      minWidth: 90,
      maxWidth: 110,
      isResizable: true,
      onRender: (item: IRequestAtRisk) => (
        <span className={item.daysOverdue > 0 ? styles.overdue : styles.dueSoon}>
          {item.daysOverdue > 0 ? `${item.daysOverdue} days overdue` : 'Due soon'}
        </span>
      ),
    },
    {
      key: 'attorney',
      name: 'Attorney',
      fieldName: 'attorney',
      minWidth: 100,
      maxWidth: 140,
      isResizable: true,
    },
  ];

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <Spinner size={SpinnerSize.large} label="Loading analytics..." />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.container}>
        <MessageBar messageBarType={MessageBarType.error} isMultiline>
          {error}
        </MessageBar>
      </div>
    );
  }

  // No data state
  if (!dashboardData) {
    return (
      <div className={styles.container}>
        <MessageBar messageBarType={MessageBarType.warning}>
          No data available for the selected date range.
        </MessageBar>
      </div>
    );
  }

  const { kpiMetrics, statusDistribution, volumeTrends, attorneyWorkload, requestsAtRisk, timeByStage, reviewOutcomes } = dashboardData;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Icon iconName="AnalyticsReport" className={styles.headerIcon} />
          <div className={styles.headerText}>
            <Text variant="xxLarge" className={styles.headerTitle}>{title || 'Analytics Dashboard'}</Text>
            <Text variant="small" className={styles.headerSubtitle}>
              Legal Review System Metrics & Reporting
            </Text>
          </div>
        </div>
        <div className={styles.headerRight}>
          <Stack horizontal tokens={{ childrenGap: 16 }} verticalAlign="center">
            {isMockMode && (
              <div className={styles.mockBadge}>
                <Icon iconName="TestBeakerSolid" />
                <span>Demo Mode</span>
              </div>
            )}
            <Dropdown
              selectedKey={dateRange}
              options={dateRangeOptions}
              onChange={(_, option) => option && setDateRange(option.key as DateRangeOption)}
              styles={{ dropdown: { width: 140 } }}
            />
            <TooltipHost content="Toggle demo mode with sample data">
              <Toggle
                checked={isMockMode}
                onChange={(_, checked) => setIsMockMode(checked || false)}
                onText="Demo"
                offText="Live"
              />
            </TooltipHost>
          </Stack>
        </div>
      </div>

      {/* Last Updated */}
      <div className={styles.lastUpdated}>
        <Icon iconName="Sync" />
        <Text variant="tiny">
          Last updated: {dashboardData.lastUpdated.toLocaleString()}
        </Text>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <KPICard
          title="Total Requests"
          value={formatNumber(kpiMetrics.totalRequests)}
          trend={kpiMetrics.totalRequestsTrend}
          icon="DocumentSet"
          iconColor="#0078d4"
          subtitle="in selected period"
        />
        <KPICard
          title="Avg Turnaround"
          value={`${kpiMetrics.avgTurnaroundDays} days`}
          trend={kpiMetrics.avgTurnaroundTrend !== 0 ? -kpiMetrics.avgTurnaroundTrend : undefined}
          icon="Timer"
          iconColor="#8764b8"
          subtitle="from submission to close"
        />
        <KPICard
          title="Pending Reviews"
          value={kpiMetrics.pendingReviews}
          icon="TaskList"
          iconColor="#ffaa44"
          subtitle="awaiting action"
        />
        <KPICard
          title="Rush Requests"
          value={`${kpiMetrics.rushRequestPercentage}%`}
          icon="ReminderTime"
          iconColor="#d13438"
          subtitle="of total requests"
        />
        <KPICard
          title="SLA Compliance"
          value={`${kpiMetrics.slaCompliancePercentage}%`}
          icon="CheckMark"
          iconColor="#107c10"
          subtitle="completed on time"
        />
        <KPICard
          title="Total Hours"
          value={formatHours(kpiMetrics.totalHoursLogged)}
          icon="Clock"
          iconColor="#0078d4"
          subtitle="logged in period"
        />
      </div>

      {/* Main Content Grid */}
      <div className={styles.mainGrid}>
        {/* Left Column - Charts */}
        <div className={styles.leftColumn}>
          {/* Status Distribution */}
          <div className={styles.chartCard}>
            <SectionHeader title="Status Distribution" icon="DonutChart" />
            <div className={styles.chartContainer}>
              <PieChart
                id="statusPieChart"
                dataSource={statusDistribution}
                palette="Soft"
                resolveLabelOverlapping="shift"
              >
                <Series argumentField="status" valueField="count">
                  <Label visible={true} format="fixedPoint">
                    <Connector visible={true} width={1} />
                  </Label>
                </Series>
                <Legend
                  orientation="horizontal"
                  itemTextPosition="right"
                  horizontalAlignment="center"
                  verticalAlignment="bottom"
                />
                <Tooltip enabled={true} customizeTooltip={(arg: { valueText: string; argument: string; percent: number }) => ({
                  text: `${arg.argument}: ${arg.valueText} (${(arg.percent * 100).toFixed(1)}%)`,
                })} />
              </PieChart>
            </div>
          </div>

          {/* Volume Trends */}
          <div className={styles.chartCard}>
            <SectionHeader title="Request Volume Over Time" icon="BarChartVertical" />
            <div className={styles.chartContainer}>
              <Chart
                id="volumeChart"
                dataSource={volumeTrends}
              >
                <CommonSeriesSettings argumentField="date" type="bar" />
                <ChartSeries
                  valueField="submitted"
                  name="Submitted"
                  color="#0078d4"
                />
                <ChartSeries
                  valueField="completed"
                  name="Completed"
                  color="#107c10"
                />
                <ChartSeries
                  valueField="cancelled"
                  name="Cancelled"
                  color="#a4262c"
                />
                <ArgumentAxis
                  argumentType="datetime"
                  tickInterval="day"
                />
                <ValueAxis />
                <ChartLegend
                  verticalAlignment="bottom"
                  horizontalAlignment="center"
                />
                <ChartTooltip enabled={true} />
              </Chart>
            </div>
          </div>

          {/* Time by Stage */}
          <div className={styles.chartCard}>
            <SectionHeader title="Average Time by Stage" icon="TimelineProgress" />
            <div className={styles.chartContainer}>
              <Chart
                id="timeByStageChart"
                dataSource={timeByStage}
                rotated={true}
              >
                <CommonSeriesSettings argumentField="stage" type="stackedBar" />
                <ChartSeries
                  valueField="avgReviewerHours"
                  name="Reviewer Hours"
                  color="#0078d4"
                />
                <ChartSeries
                  valueField="avgSubmitterHours"
                  name="Submitter Hours"
                  color="#107c10"
                />
                <ArgumentAxis />
                <ValueAxis title="Hours" />
                <ChartLegend
                  verticalAlignment="bottom"
                  horizontalAlignment="center"
                />
                <ChartTooltip enabled={true} />
              </Chart>
            </div>
          </div>
        </div>

        {/* Right Column - Tables */}
        <div className={styles.rightColumn}>
          {/* Attorney Workload */}
          <div className={styles.tableCard}>
            <SectionHeader title="Attorney Workload" icon="People" />
            <div className={styles.tableContainer}>
              {attorneyWorkload.length > 0 ? (
                <DetailsList
                  items={attorneyWorkload}
                  columns={attorneyColumns}
                  layoutMode={DetailsListLayoutMode.justified}
                  selectionMode={SelectionMode.none}
                  isHeaderVisible={true}
                  compact={true}
                />
              ) : (
                <div className={styles.emptyState}>
                  <Icon iconName="People" className={styles.emptyIcon} />
                  <Text>No attorney data available</Text>
                </div>
              )}
            </div>
          </div>

          {/* Requests At Risk */}
          <div className={styles.tableCard}>
            <SectionHeader
              title="Requests At Risk"
              icon="Warning"
              action={
                <span className={styles.riskCount}>
                  {requestsAtRisk.length} items
                </span>
              }
            />
            <div className={styles.tableContainer}>
              {requestsAtRisk.length > 0 ? (
                <DetailsList
                  items={requestsAtRisk}
                  columns={riskColumns}
                  layoutMode={DetailsListLayoutMode.justified}
                  selectionMode={SelectionMode.none}
                  isHeaderVisible={true}
                  compact={true}
                />
              ) : (
                <div className={styles.emptyState}>
                  <Icon iconName="CheckMark" className={styles.emptyIconSuccess} />
                  <Text>No requests at risk</Text>
                </div>
              )}
            </div>
          </div>

          {/* Review Outcomes */}
          <div className={styles.chartCard}>
            <SectionHeader title="Review Outcomes" icon="CheckList" />
            <div className={styles.chartContainerSmall}>
              <Chart
                id="outcomesChart"
                dataSource={reviewOutcomes}
              >
                <CommonSeriesSettings argumentField="outcome" type="bar" />
                <ChartSeries
                  valueField="legalCount"
                  name="Legal Review"
                  color="#8764b8"
                />
                <ChartSeries
                  valueField="complianceCount"
                  name="Compliance Review"
                  color="#107c10"
                />
                <ArgumentAxis />
                <ValueAxis />
                <ChartLegend
                  verticalAlignment="bottom"
                  horizontalAlignment="center"
                />
                <ChartTooltip enabled={true} />
              </Chart>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <Text variant="tiny" className={styles.footerText}>
          Analytics Dashboard - Legal Review System v1.0
        </Text>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;

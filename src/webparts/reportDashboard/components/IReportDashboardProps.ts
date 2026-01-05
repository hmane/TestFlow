import { WebPartContext } from '@microsoft/sp-webpart-base';

/**
 * User's role-based groups
 */
export interface IUserGroups {
  isSubmitter: boolean;
  isLegalAdmin: boolean;
  isAttorneyAssigner: boolean;
  isAttorney: boolean;
  isComplianceUser: boolean;
  isAdmin: boolean;
}

/**
 * Search configuration from Configuration list
 */
export interface ISearchConfig {
  searchResultLimit: number;
  recentSearchesLimit: number;
}

/**
 * Progress bar color type
 */
export type ProgressBarColor = 'green' | 'yellow' | 'red' | 'blue' | 'gray';

/**
 * Review audience type
 */
export type ReviewAudienceType = 'Legal' | 'Compliance' | 'Both';

/**
 * Search result item with progress data
 */
export interface ISearchResult {
  id: number;
  requestId: string;
  requestTitle: string;
  status: string;
  submittedBy: string;
  attorney: string;
  targetReturnDate: Date | null;
  created: Date;
  // Progress-related fields
  submittedToAssignAttorneyOn: Date | null;
  previousStatus: string | null;
  isRushRequest: boolean;
  // Calculated progress
  progress: number;
  progressColor: ProgressBarColor;
  currentStep: number;
  totalSteps: number;
  // Time tracking
  totalReviewerHours: number;
  totalSubmitterHours: number;
  // Review status fields for enhanced display
  reviewAudience: ReviewAudienceType | null;
  legalReviewStatus: string | null;
  complianceReviewStatus: string | null;
  legalReviewOutcome: string | null;
  complianceReviewOutcome: string | null;
}

/**
 * ReportDashboard component props
 */
export interface IReportDashboardProps {
  description: string;
  isDarkTheme: boolean;
  environmentMessage: string;
  hasTeamsContext: boolean;
  userDisplayName: string;
  context: WebPartContext;
}

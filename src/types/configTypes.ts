/**
 * Configuration and settings types
 */

/**
 * Application configuration from SharePoint Configuration list
 */
export interface IAppConfiguration {
  id?: number;
  configKey: string;
  configValue: string;
  description?: string;
  isActive?: boolean;
  category?: string;
}

/**
 * Configuration list item from SharePoint
 */
export interface IConfigurationListItem {
  Id: number;
  Title: string; // Config Key
  ConfigValue: string;
  Description?: string;
  IsActive?: boolean;
  Category?: string;
}

/**
 * SharePoint group mapping for roles
 */
export interface IGroupMapping {
  roleKey: string;
  groupName: string;
  description: string;
}

/**
 * Application groups/roles
 *
 * NOTE: These values MUST match the group titles in @sp/Groups (auto-generated from SharePoint)
 * - Submitters = Groups.LwSubmitters.Title ('LW - Submitters')
 * - LegalAdmin = Groups.LwLegalAdmin.Title ('LW - Legal Admin')
 * - AttorneyAssigner = Groups.LwAttorneyAssigner.Title ('LW - Attorney Assigner')
 * - Attorneys = Groups.LwAttorneys.Title ('LW - Attorneys')
 * - ComplianceUsers = Groups.LwComplianceUsers.Title ('LW - Compliance Users')
 * - Admin = Groups.LwAdmin.Title ('LW - Admin')
 *
 * If group names change in SharePoint, regenerate constants with Generate-SPConstants.ps1
 */
export enum AppRole {
  Submitters = 'LW - Submitters',
  LegalAdmin = 'LW - Legal Admin',
  AttorneyAssigner = 'LW - Attorney Assigner',
  Attorneys = 'LW - Attorneys',
  ComplianceUsers = 'LW - Compliance Users',
  Admin = 'LW - Admin',
}

/**
 * User role information
 */
export interface IUserRoleInfo {
  userId: number;
  email: string;
  displayName: string;
  roles: AppRole[];
  isSubmitter: boolean;
  isLegalAdmin: boolean;
  isAttorneyAssigner: boolean;
  isAttorney: boolean;
  isComplianceUser: boolean;
  isAdmin: boolean;
}

/**
 * List configuration
 */
export interface IListConfig {
  requestsListTitle: string;
  submissionItemsListTitle: string;
  configurationListTitle: string;
  requestDocumentsLibraryTitle: string;
}

/**
 * Environment configuration
 */
export interface IEnvironmentConfig {
  environment: 'dev' | 'uat' | 'prod';
  siteUrl: string;
  tenantUrl: string;
  debugMode: boolean;
  enableCaching: boolean;
  cacheTimeout: number;
  azureFunctionUrl?: string;
  powerAutomateFlowUrl?: string;
}

/**
 * Feature flags
 */
export interface IFeatureFlags {
  enablePhase2RequestTypes: boolean;
  enableSeismicIntegration: boolean;
  enableAdvancedReporting: boolean;
  enableMobileNotifications: boolean;
  enableHolidayCalendar: boolean;
  enableAttorneyWorkloadBalancing: boolean;
}

/**
 * Dashboard configuration
 */
export interface IDashboardConfig {
  defaultView: 'grid' | 'list';
  itemsPerPage: number;
  showFilters: boolean;
  showSearch: boolean;
  refreshInterval?: number;
  enableAutoRefresh: boolean;
}

/**
 * Email template configuration
 */
export interface IEmailTemplate {
  templateKey: string;
  subject: string;
  body: string;
  placeholders: string[];
  isActive: boolean;
}

/**
 * Holiday calendar entry
 */
export interface IHoliday {
  id?: number;
  holidayDate: Date;
  holidayName: string;
  isCompanyHoliday: boolean;
  isObserved: boolean;
  year: number;
}

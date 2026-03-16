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
 * Application groups/roles
 *
 * NOTE: These values MUST match the group titles in @sp/Groups (auto-generated from SharePoint)
 * - Submitters = Groups.LwSubmitters.Title ('LW - Submitters')
 * - LegalAdmin = Groups.LwLegalAdmins.Title ('LW - Legal Admins')
 * - AttorneyAssigner = Groups.LwAttorneyAssigners.Title ('LW - Attorney Assigners')
 * - Attorneys = Groups.LwAttorneys.Title ('LW - Attorneys')
 * - ComplianceUsers = Groups.LwComplianceReviewers.Title ('LW - Compliance Reviewers')
 * - Admin = Groups.LwAdmins.Title ('LW - Admins')
 *
 * If group names change in SharePoint, regenerate constants with Generate-SPConstants.ps1
 */
export enum AppRole {
  Submitters = 'LW - Submitters',
  LegalAdmin = 'LW - Legal Admins',
  AttorneyAssigner = 'LW - Attorney Assigners',
  Attorneys = 'LW - Attorneys',
  ComplianceUsers = 'LW - Compliance Reviewers',
  Admin = 'LW - Admins',
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


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


/**
 * User Groups Service
 *
 * Centralizes user group loading with browser-level caching via SPContext.spPessimistic
 * and pending promise deduplication to prevent duplicate API calls.
 *
 * This service should be used instead of direct SPContext.sp.web.currentUser.groups() calls
 * to ensure consistent caching behavior across the application.
 */

import { SPContext } from 'spfx-toolkit/lib/utilities/context';

/**
 * SharePoint group names used in the Legal Workflow application
 */
export const LW_GROUPS = {
  SUBMITTERS: 'LW - Submitters',
  LEGAL_ADMIN: 'LW - Legal Admin',
  ATTORNEY_ASSIGNER: 'LW - Attorney Assigner',
  ATTORNEYS: 'LW - Attorneys',
  COMPLIANCE: 'LW - Compliance Users',
  ADMIN: 'LW - Admin',
} as const;

/**
 * User group membership flags
 */
export interface IUserGroupMembership {
  isSubmitter: boolean;
  isLegalAdmin: boolean;
  isAttorneyAssigner: boolean;
  isAttorney: boolean;
  isComplianceUser: boolean;
  isAdmin: boolean;
  /** Raw group titles for custom checks */
  groupTitles: string[];
}

/**
 * User access for dashboards
 */
export interface IUserAccess {
  isAdmin: boolean;
  isLegalAdmin: boolean;
  hasAccess: boolean;
}

// Module-level variables for pending promise deduplication
let pendingGroupsPromise: Promise<string[]> | null = null;
let cachedGroupTitles: string[] | null = null;
let cacheTimestamp: number | null = null;

// Cache duration: 5 minutes (same as PermissionHelper)
const CACHE_DURATION_MS = 5 * 60 * 1000;

/**
 * Check if the cache is still valid
 */
function isCacheValid(): boolean {
  if (!cacheTimestamp || !cachedGroupTitles) {
    return false;
  }
  return Date.now() - cacheTimestamp < CACHE_DURATION_MS;
}

/**
 * Get current user's group titles with caching and deduplication
 *
 * Uses SPContext.spPessimistic for browser-level HTTP caching
 * and implements pending promise deduplication to prevent
 * multiple concurrent API calls.
 */
export async function getCurrentUserGroupTitles(): Promise<string[]> {
  // Return cached data if valid
  if (isCacheValid() && cachedGroupTitles) {
    SPContext.logger.info('UserGroupsService: Returning cached group titles');
    return cachedGroupTitles;
  }

  // Return pending promise if a load is already in progress
  if (pendingGroupsPromise) {
    SPContext.logger.info('UserGroupsService: Load already in progress, waiting...');
    return pendingGroupsPromise;
  }

  // Create the load promise
  pendingGroupsPromise = (async (): Promise<string[]> => {
    try {
      SPContext.logger.info('UserGroupsService: Loading current user groups');

      // Use spPessimistic for browser-level HTTP caching
      const groups = await SPContext.spPessimistic.web.currentUser.groups();
      const titles = groups.map((g: { Title: string }) => g.Title);

      // Update cache
      cachedGroupTitles = titles;
      cacheTimestamp = Date.now();

      SPContext.logger.success('UserGroupsService: Loaded groups', { count: titles.length });
      return titles;
    } catch (error: unknown) {
      SPContext.logger.error('UserGroupsService: Failed to load groups', error);
      throw error;
    } finally {
      pendingGroupsPromise = null;
    }
  })();

  return pendingGroupsPromise;
}

/**
 * Get user group membership flags
 *
 * Returns boolean flags for each LW group membership.
 * Admins are automatically considered members of all role groups.
 */
export async function getUserGroupMembership(): Promise<IUserGroupMembership> {
  const groupTitles = await getCurrentUserGroupTitles();

  const isAdmin = groupTitles.includes(LW_GROUPS.ADMIN);

  return {
    isSubmitter: groupTitles.includes(LW_GROUPS.SUBMITTERS) || isAdmin,
    isLegalAdmin: groupTitles.includes(LW_GROUPS.LEGAL_ADMIN) || isAdmin,
    isAttorneyAssigner: groupTitles.includes(LW_GROUPS.ATTORNEY_ASSIGNER) || isAdmin,
    isAttorney: groupTitles.includes(LW_GROUPS.ATTORNEYS) || isAdmin,
    isComplianceUser: groupTitles.includes(LW_GROUPS.COMPLIANCE) || isAdmin,
    isAdmin,
    groupTitles,
  };
}

/**
 * Check user access for analytics/report dashboards
 *
 * Only Legal Admins and Admins have access to dashboards.
 */
export async function checkDashboardAccess(): Promise<IUserAccess> {
  try {
    const groupTitles = await getCurrentUserGroupTitles();

    const isAdmin = groupTitles.includes(LW_GROUPS.ADMIN);
    const isLegalAdmin = groupTitles.includes(LW_GROUPS.LEGAL_ADMIN);

    return {
      isAdmin,
      isLegalAdmin,
      hasAccess: isAdmin || isLegalAdmin,
    };
  } catch (error: unknown) {
    SPContext.logger.error('UserGroupsService: Failed to check dashboard access', error);
    return {
      isAdmin: false,
      isLegalAdmin: false,
      hasAccess: false,
    };
  }
}

/**
 * Check if current user is a member of a specific group
 */
export async function isUserInGroup(groupName: string): Promise<boolean> {
  const groupTitles = await getCurrentUserGroupTitles();
  return groupTitles.includes(groupName);
}

/**
 * Check if current user is a member of any of the specified groups
 */
export async function isUserInAnyGroup(groupNames: string[]): Promise<boolean> {
  const groupTitles = await getCurrentUserGroupTitles();
  return groupNames.some((name) => groupTitles.includes(name));
}

/**
 * Clear the cached group data
 *
 * Use this when you know the user's group membership may have changed.
 */
export function clearGroupCache(): void {
  cachedGroupTitles = null;
  cacheTimestamp = null;
  pendingGroupsPromise = null;
  SPContext.logger.info('UserGroupsService: Cache cleared');
}

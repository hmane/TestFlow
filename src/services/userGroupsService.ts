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
import { Groups } from '@sp/Groups';

/**
 * SharePoint group names used in the Legal Workflow application
 * Re-exported from centralized sp/Groups for backward compatibility
 */
export const LW_GROUPS = {
  SUBMITTERS: Groups.LwSubmitters.Title,
  LEGAL_ADMIN: Groups.LwLegalAdmin.Title,
  ATTORNEY_ASSIGNER: Groups.LwAttorneyAssigner.Title,
  ATTORNEYS: Groups.LwAttorneys.Title,
  COMPLIANCE: Groups.LwComplianceUsers.Title,
  ADMIN: Groups.LwAdmin.Title,
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
let pendingGroupsPromise: Promise<string[]> | undefined = undefined;
let cachedGroupTitles: string[] | undefined = undefined;
let cacheTimestamp: number | undefined = undefined;

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
      console.log('UserGroupsService: Loading current user groups...');

      // Check if SPContext is properly initialized
      if (!SPContext.sp || !SPContext.sp.web) {
        console.error('UserGroupsService: SPContext not initialized. Ensure SPContext.smart() was called in webpart onInit().');
        return [];
      }

      // Try spPessimistic first, fall back to sp if not available
      let groups: { Title: string }[];
      try {
        console.log('UserGroupsService: Trying spPessimistic...');
        if (!SPContext.spPessimistic || !SPContext.spPessimistic.web) {
          throw new Error('spPessimistic not available');
        }
        groups = await SPContext.spPessimistic.web.currentUser.groups();
        console.log('UserGroupsService: spPessimistic succeeded, groups:', groups);
      } catch (pessimisticError) {
        console.warn('UserGroupsService: spPessimistic failed, trying sp...', pessimisticError);
        groups = await SPContext.sp.web.currentUser.groups();
        console.log('UserGroupsService: sp succeeded, groups:', groups);
      }

      const titles = groups.map((g: { Title: string }) => g.Title);
      console.log('UserGroupsService: Group titles:', titles);

      // Update cache
      cachedGroupTitles = titles;
      cacheTimestamp = Date.now();

      return titles;
    } catch (error: unknown) {
      console.error('UserGroupsService: Failed to load groups:', error);
      // Return empty array instead of throwing - this allows the site admin check to still work
      return [];
    } finally {
      pendingGroupsPromise = undefined;
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

    // Log group titles for debugging - use console.log for visibility
    console.log('=== Dashboard Access Check ===');
    console.log('User groups found:', groupTitles);
    console.log('Looking for Admin:', LW_GROUPS.ADMIN);
    console.log('Looking for Legal Admin:', LW_GROUPS.LEGAL_ADMIN);

    SPContext.logger.info('UserGroupsService: Checking dashboard access', {
      userGroups: groupTitles,
      expectedAdmin: LW_GROUPS.ADMIN,
      expectedLegalAdmin: LW_GROUPS.LEGAL_ADMIN,
    });

    const isAdmin = groupTitles.includes(LW_GROUPS.ADMIN);
    const isLegalAdmin = groupTitles.includes(LW_GROUPS.LEGAL_ADMIN);

    console.log('isAdmin check result:', isAdmin);
    console.log('isLegalAdmin check result:', isLegalAdmin);

    // Also check if user is a Site Collection Admin (has full control)
    let isSiteAdmin = false;
    try {
      // Try spPessimistic first, fall back to sp
      let currentUser: { IsSiteAdmin?: boolean };
      try {
        currentUser = await SPContext.spPessimistic.web.currentUser();
      } catch {
        currentUser = await SPContext.sp.web.currentUser();
      }
      isSiteAdmin = currentUser.IsSiteAdmin === true;
      SPContext.logger.info('UserGroupsService: Site admin check', { isSiteAdmin });
    } catch (siteAdminError) {
      SPContext.logger.warn('UserGroupsService: Failed to check site admin status', siteAdminError);
      console.error('Failed to check site admin status:', siteAdminError);
    }

    const hasAccess = isAdmin || isLegalAdmin || isSiteAdmin;

    console.log('isSiteAdmin check result:', isSiteAdmin);
    console.log('Final hasAccess:', hasAccess);
    console.log('=== End Access Check ===');

    SPContext.logger.info('UserGroupsService: Access check result', {
      isAdmin,
      isLegalAdmin,
      isSiteAdmin,
      hasAccess,
    });

    return {
      isAdmin: isAdmin || isSiteAdmin,
      isLegalAdmin,
      hasAccess,
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
  cachedGroupTitles = undefined;
  cacheTimestamp = undefined;
  pendingGroupsPromise = undefined;
  SPContext.logger.info('UserGroupsService: Cache cleared');
}

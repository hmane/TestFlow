/**
 * Permissions Store
 *
 * Centralized state management for user permissions.
 * Replaces PermissionsContext to follow the store-first architecture.
 *
 * Features:
 * - Loads user role permissions ONCE at application startup
 * - Caches item-level permissions when checked
 * - Provides selectors for optimized re-renders
 * - Single source of truth for all permission checks
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import 'spfx-toolkit/lib/utilities/context/pnpImports/security';
import { createPermissionHelper, PermissionHelper } from 'spfx-toolkit/lib/utilities/permissionHelper';
import { AppRole } from '@appTypes/configTypes';

/**
 * Item permissions result
 */
export interface IItemPermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  hasFullControl: boolean;
}

/**
 * SharePoint permission levels
 */
enum SPPermissionLevel {
  Read = 'Read',
  Edit = 'Edit',
  FullControl = 'Full Control',
}

/**
 * Permissions store state interface
 */
interface IPermissionsState {
  // User role flags (loaded once at startup)
  isSubmitter: boolean;
  isLegalAdmin: boolean;
  isAttorneyAssigner: boolean;
  isAttorney: boolean;
  isComplianceUser: boolean;
  isAdmin: boolean;
  roles: AppRole[];

  // Derived permissions
  canCreateRequest: boolean;
  canViewAllRequests: boolean;
  canAssignAttorney: boolean;
  canReviewLegal: boolean;
  canReviewCompliance: boolean;

  // Item permissions cache (key: "listName_itemId")
  itemPermissions: Map<string, IItemPermissions>;

  // Loading state
  isLoading: boolean;
  isLoaded: boolean;
  error?: string;

  // Actions
  loadPermissions: () => Promise<void>;
  checkItemPermissions: (listName: string, itemId: number) => Promise<IItemPermissions>;
  refreshPermissions: () => Promise<void>;
  reset: () => void;
}

/**
 * Initial state - no permissions
 */
const initialState = {
  isSubmitter: false,
  isLegalAdmin: false,
  isAttorneyAssigner: false,
  isAttorney: false,
  isComplianceUser: false,
  isAdmin: false,
  roles: [] as AppRole[],
  canCreateRequest: false,
  canViewAllRequests: false,
  canAssignAttorney: false,
  canReviewLegal: false,
  canReviewCompliance: false,
  itemPermissions: new Map<string, IItemPermissions>(),
  isLoading: false,
  isLoaded: false,
  error: undefined,
};

// Module-level PermissionHelper instance (shared across all calls)
let permissionHelper: PermissionHelper | null = null;

// Pending load promise for deduplication
let pendingLoadPromise: Promise<void> | null = null;

/**
 * Get or create the PermissionHelper instance
 */
function getPermissionHelper(): PermissionHelper {
  if (!permissionHelper) {
    permissionHelper = createPermissionHelper(SPContext.spPessimistic, {
      enableCaching: true,
      cacheTimeout: 300000, // 5 minutes
      cacheSize: 100,
    });
  }
  return permissionHelper;
}

/**
 * Permissions Store
 */
export const usePermissionsStore = create<IPermissionsState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      /**
       * Load user permissions from SharePoint
       * Called once during ApplicationProvider initialization
       */
      loadPermissions: async (): Promise<void> => {
        const state = get();

        // If already loaded, skip
        if (state.isLoaded && !state.error) {
          SPContext.logger.info('PermissionsStore: Permissions already loaded');
          return;
        }

        // If load is already in progress, wait for it
        if (pendingLoadPromise) {
          SPContext.logger.info('PermissionsStore: Load already in progress, waiting...');
          return pendingLoadPromise;
        }

        set({ isLoading: true, error: undefined });

        pendingLoadPromise = (async (): Promise<void> => {
          try {
            SPContext.logger.info('PermissionsStore: Loading user permissions');

            const helper = getPermissionHelper();

            // Check all role memberships in parallel - SINGLE set of API calls
            const [submitter, legalAdmin, attorneyAssigner, attorneys, complianceUsers, admin] =
              await Promise.all([
                helper.userHasRole(AppRole.Submitters),
                helper.userHasRole(AppRole.LegalAdmin),
                helper.userHasRole(AppRole.AttorneyAssigner),
                helper.userHasRole(AppRole.Attorneys),
                helper.userHasRole(AppRole.ComplianceUsers),
                helper.userHasRole(AppRole.Admin),
              ]);

            // Build roles array
            const roles: AppRole[] = [];
            if (submitter.hasPermission) roles.push(AppRole.Submitters);
            if (legalAdmin.hasPermission) roles.push(AppRole.LegalAdmin);
            if (attorneyAssigner.hasPermission) roles.push(AppRole.AttorneyAssigner);
            if (attorneys.hasPermission) roles.push(AppRole.Attorneys);
            if (complianceUsers.hasPermission) roles.push(AppRole.ComplianceUsers);
            if (admin.hasPermission) roles.push(AppRole.Admin);

            // Update store with permissions
            set({
              isSubmitter: submitter.hasPermission,
              isLegalAdmin: legalAdmin.hasPermission,
              isAttorneyAssigner: attorneyAssigner.hasPermission,
              isAttorney: attorneys.hasPermission,
              isComplianceUser: complianceUsers.hasPermission,
              isAdmin: admin.hasPermission,
              roles,
              // Derived permissions
              canCreateRequest: submitter.hasPermission || admin.hasPermission,
              canViewAllRequests:
                legalAdmin.hasPermission ||
                attorneyAssigner.hasPermission ||
                attorneys.hasPermission ||
                complianceUsers.hasPermission ||
                admin.hasPermission,
              canAssignAttorney:
                legalAdmin.hasPermission || attorneyAssigner.hasPermission || admin.hasPermission,
              canReviewLegal:
                attorneys.hasPermission || legalAdmin.hasPermission || admin.hasPermission,
              canReviewCompliance: complianceUsers.hasPermission || admin.hasPermission,
              isLoading: false,
              isLoaded: true,
              error: undefined,
            });

            SPContext.logger.success('PermissionsStore: Permissions loaded', {
              userId: SPContext.currentUser.id,
              rolesCount: roles.length,
              roles: roles.join(', '),
            });
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            SPContext.logger.error('PermissionsStore: Failed to load permissions', err);
            set({ isLoading: false, error: message });
            throw err;
          } finally {
            pendingLoadPromise = null;
          }
        })();

        return pendingLoadPromise;
      },

      /**
       * Check item-level permissions (cached)
       * @param listName - SharePoint list name
       * @param itemId - Item ID to check permissions for
       */
      checkItemPermissions: async (
        listName: string,
        itemId: number
      ): Promise<IItemPermissions> => {
        const cacheKey = `${listName}_${itemId}`;
        const state = get();

        // Check cache first
        const cached = state.itemPermissions.get(cacheKey);
        if (cached) {
          return cached;
        }

        try {
          const helper = getPermissionHelper();

          // Check permissions in parallel
          const [viewPerm, editPerm, fullControlPerm] = await Promise.all([
            helper.userHasPermissionOnItem(listName, itemId, SPPermissionLevel.Read),
            helper.userHasPermissionOnItem(listName, itemId, SPPermissionLevel.Edit),
            helper.userHasPermissionOnItem(listName, itemId, SPPermissionLevel.FullControl),
          ]);

          const permissions: IItemPermissions = {
            canView: viewPerm.hasPermission,
            canEdit: editPerm.hasPermission,
            canDelete: editPerm.hasPermission, // Delete requires Edit in SharePoint
            hasFullControl: fullControlPerm.hasPermission,
          };

          // Cache the result
          set((s) => {
            const newCache = new Map(s.itemPermissions);
            newCache.set(cacheKey, permissions);
            return { itemPermissions: newCache };
          });

          SPContext.logger.info('PermissionsStore: Item permissions checked', {
            listName,
            itemId,
            canEdit: permissions.canEdit,
          });

          return permissions;
        } catch (err: unknown) {
          SPContext.logger.error('PermissionsStore: Failed to check item permissions', err, {
            listName,
            itemId,
          });

          // Return no-access on error
          return {
            canView: false,
            canEdit: false,
            canDelete: false,
            hasFullControl: false,
          };
        }
      },

      /**
       * Refresh permissions (clears cache and reloads)
       */
      refreshPermissions: async (): Promise<void> => {
        if (permissionHelper) {
          permissionHelper.clearCache();
        }
        set({
          ...initialState,
          itemPermissions: new Map(),
        });
        await get().loadPermissions();
      },

      /**
       * Reset store to initial state
       */
      reset: (): void => {
        set({
          ...initialState,
          itemPermissions: new Map(),
        });
        permissionHelper = null;
        pendingLoadPromise = null;
        SPContext.logger.info('PermissionsStore: Reset');
      },
    }),
    { name: 'PermissionsStore' }
  )
);

// ============================================
// ZUSTAND SELECTORS FOR OPTIMIZED RE-RENDERS
// ============================================

/**
 * Selector for loading state only
 */
export const usePermissionsLoading = (): boolean =>
  usePermissionsStore((state) => state.isLoading);

/**
 * Selector for loaded state only
 */
export const usePermissionsLoaded = (): boolean =>
  usePermissionsStore((state) => state.isLoaded);

/**
 * Selector for error state only
 */
export const usePermissionsError = (): string | undefined =>
  usePermissionsStore((state) => state.error);

/**
 * Selector for role flags only
 */
export const useUserRoles = (): {
  isSubmitter: boolean;
  isLegalAdmin: boolean;
  isAttorneyAssigner: boolean;
  isAttorney: boolean;
  isComplianceUser: boolean;
  isAdmin: boolean;
  roles: AppRole[];
} =>
  usePermissionsStore((state) => ({
    isSubmitter: state.isSubmitter,
    isLegalAdmin: state.isLegalAdmin,
    isAttorneyAssigner: state.isAttorneyAssigner,
    isAttorney: state.isAttorney,
    isComplianceUser: state.isComplianceUser,
    isAdmin: state.isAdmin,
    roles: state.roles,
  }));

/**
 * Selector for derived permissions only
 */
export const useUserCapabilities = (): {
  canCreateRequest: boolean;
  canViewAllRequests: boolean;
  canAssignAttorney: boolean;
  canReviewLegal: boolean;
  canReviewCompliance: boolean;
} =>
  usePermissionsStore((state) => ({
    canCreateRequest: state.canCreateRequest,
    canViewAllRequests: state.canViewAllRequests,
    canAssignAttorney: state.canAssignAttorney,
    canReviewLegal: state.canReviewLegal,
    canReviewCompliance: state.canReviewCompliance,
  }));

/**
 * Selector for actions only (stable reference)
 */
export const usePermissionsActions = (): {
  loadPermissions: () => Promise<void>;
  checkItemPermissions: (listName: string, itemId: number) => Promise<IItemPermissions>;
  refreshPermissions: () => Promise<void>;
  reset: () => void;
} =>
  usePermissionsStore((state) => ({
    loadPermissions: state.loadPermissions,
    checkItemPermissions: state.checkItemPermissions,
    refreshPermissions: state.refreshPermissions,
    reset: state.reset,
  }));

/**
 * Hook to check if user has a specific role
 */
export function useHasRole(role: AppRole): boolean {
  const roles = usePermissionsStore((state) => state.roles);
  return roles.indexOf(role) !== -1;
}

/**
 * Hook to check if user has any of the specified roles
 */
export function useHasAnyRole(rolesToCheck: AppRole[]): boolean {
  const roles = usePermissionsStore((state) => state.roles);
  return rolesToCheck.some((role) => roles.indexOf(role) !== -1);
}

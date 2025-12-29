/**
 * PermissionsContext
 *
 * Provides centralized permission management to prevent duplicate API calls.
 * Loads user permissions ONCE and shares them across all components.
 *
 * Problem Solved:
 * Previously, each component calling usePermissions() created a new PermissionHelper
 * instance with its own cache, causing 100s of duplicate API calls to
 * siteUsers/getById(X)/groups endpoint, leading to throttling and "page unavailable" errors.
 *
 * Solution:
 * - Load permissions once at application startup
 * - Share permissions via React Context
 * - All components consume the same permission data
 */

import * as React from 'react';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import 'spfx-toolkit/lib/utilities/context/pnpImports/security';
import { createPermissionHelper, PermissionHelper } from 'spfx-toolkit/lib/utilities/permissionHelper';
import { AppRole } from '@appTypes/configTypes';

/**
 * User permissions interface
 */
export interface IUserPermissions {
  isSubmitter: boolean;
  isLegalAdmin: boolean;
  isAttorneyAssigner: boolean;
  isAttorney: boolean;
  isComplianceUser: boolean;
  isAdmin: boolean;
  roles: AppRole[];
  canCreateRequest: boolean;
  canViewAllRequests: boolean;
  canAssignAttorney: boolean;
  canReviewLegal: boolean;
  canReviewCompliance: boolean;
}

/**
 * Permissions context state
 */
interface IPermissionsContextState {
  permissions: IUserPermissions;
  isLoading: boolean;
  error: string | undefined;
  permissionHelper: PermissionHelper | undefined;
  refreshPermissions: () => Promise<void>;
}

/**
 * Default permissions (no access)
 */
const defaultPermissions: IUserPermissions = {
  isSubmitter: false,
  isLegalAdmin: false,
  isAttorneyAssigner: false,
  isAttorney: false,
  isComplianceUser: false,
  isAdmin: false,
  roles: [],
  canCreateRequest: false,
  canViewAllRequests: false,
  canAssignAttorney: false,
  canReviewLegal: false,
  canReviewCompliance: false,
};

/**
 * Default context state
 */
const defaultContextState: IPermissionsContextState = {
  permissions: defaultPermissions,
  isLoading: true,
  error: undefined,
  permissionHelper: undefined,
  refreshPermissions: async () => {
    // No-op default
  },
};

/**
 * Permissions Context
 */
export const PermissionsContext = React.createContext<IPermissionsContextState>(defaultContextState);

/**
 * Permissions Provider Props
 */
interface IPermissionsProviderProps {
  children: React.ReactNode;
}

/**
 * PermissionsProvider Component
 *
 * Wraps the application and provides permissions to all child components.
 * Should be placed inside ApplicationProvider after SPContext is initialized.
 */
export const PermissionsProvider: React.FC<IPermissionsProviderProps> = ({ children }) => {
  const [permissions, setPermissions] = React.useState<IUserPermissions>(defaultPermissions);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | undefined>(undefined);

  // Create a single PermissionHelper instance that persists across renders
  // Use ref to avoid recreating on every render
  const permissionHelperRef = React.useRef<PermissionHelper | undefined>(undefined);

  /**
   * Load permissions from SharePoint
   */
  const loadPermissions = React.useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(undefined);

      // Create permission helper if not already created
      // Use spPessimistic which has browser-level caching to prevent duplicate API calls
      // to siteUsers/getById/groups endpoint
      if (!permissionHelperRef.current) {
        permissionHelperRef.current = createPermissionHelper(SPContext.spPessimistic, {
          enableCaching: true,
          cacheTimeout: 300000, // 5 minutes
          cacheSize: 100,
        });
      }

      const helper = permissionHelperRef.current;

      SPContext.logger.info('PermissionsContext: Loading user permissions');

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

      const roles: AppRole[] = [];
      if (submitter.hasPermission) roles.push(AppRole.Submitters);
      if (legalAdmin.hasPermission) roles.push(AppRole.LegalAdmin);
      if (attorneyAssigner.hasPermission) roles.push(AppRole.AttorneyAssigner);
      if (attorneys.hasPermission) roles.push(AppRole.Attorneys);
      if (complianceUsers.hasPermission) roles.push(AppRole.ComplianceUsers);
      if (admin.hasPermission) roles.push(AppRole.Admin);

      const newPermissions: IUserPermissions = {
        isSubmitter: submitter.hasPermission,
        isLegalAdmin: legalAdmin.hasPermission,
        isAttorneyAssigner: attorneyAssigner.hasPermission,
        isAttorney: attorneys.hasPermission,
        isComplianceUser: complianceUsers.hasPermission,
        isAdmin: admin.hasPermission,
        roles,
        canCreateRequest: submitter.hasPermission || admin.hasPermission,
        canViewAllRequests:
          legalAdmin.hasPermission ||
          attorneyAssigner.hasPermission ||
          attorneys.hasPermission ||
          complianceUsers.hasPermission ||
          admin.hasPermission,
        canAssignAttorney:
          legalAdmin.hasPermission || attorneyAssigner.hasPermission || admin.hasPermission,
        canReviewLegal: attorneys.hasPermission || legalAdmin.hasPermission || admin.hasPermission,
        canReviewCompliance: complianceUsers.hasPermission || admin.hasPermission,
      };

      setPermissions(newPermissions);

      SPContext.logger.success('PermissionsContext: Permissions loaded', {
        userId: SPContext.currentUser.id,
        roles: roles.length,
        rolesFound: roles.join(', '),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      SPContext.logger.error('PermissionsContext: Failed to load permissions', err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh permissions (clears cache and reloads)
   */
  const refreshPermissions = React.useCallback(async (): Promise<void> => {
    if (permissionHelperRef.current) {
      permissionHelperRef.current.clearCache();
    }
    await loadPermissions();
  }, [loadPermissions]);

  // Load permissions on mount
  React.useEffect(() => {
    loadPermissions().catch((err: unknown) => {
      SPContext.logger.error('PermissionsContext: Initial load failed', err);
    });
  }, [loadPermissions]);

  // Context value - memoized to prevent unnecessary re-renders
  const contextValue = React.useMemo<IPermissionsContextState>(
    () => ({
      permissions,
      isLoading,
      error,
      permissionHelper: permissionHelperRef.current,
      refreshPermissions,
    }),
    [permissions, isLoading, error, refreshPermissions]
  );

  return (
    <PermissionsContext.Provider value={contextValue}>
      {children}
    </PermissionsContext.Provider>
  );
};

/**
 * Hook to access permissions from context
 *
 * This replaces the old usePermissions() hook that created duplicate API calls.
 * All components now share the same permission data loaded once at startup.
 */
export function usePermissionsContext(): IUserPermissions & {
  isLoading: boolean;
  error: string | undefined;
  refreshPermissions: () => Promise<void>;
} {
  const context = React.useContext(PermissionsContext);

  if (!context) {
    throw new Error('usePermissionsContext must be used within a PermissionsProvider');
  }

  return {
    ...context.permissions,
    isLoading: context.isLoading,
    error: context.error,
    refreshPermissions: context.refreshPermissions,
  };
}

/**
 * Hook to access the PermissionHelper instance for item-level checks
 */
export function usePermissionHelper(): PermissionHelper | undefined {
  const context = React.useContext(PermissionsContext);
  return context?.permissionHelper;
}

export default PermissionsProvider;

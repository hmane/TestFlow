/**
 * Custom hook for permission checking and role-based access control
 *
 * ARCHITECTURE UPDATE: This hook now uses permissionsStore (Zustand) instead of PermissionsContext.
 * Permissions are loaded ONCE during ApplicationProvider initialization and stored in the
 * global permissionsStore. This eliminates duplicate API calls across components.
 *
 * Components can use either:
 * 1. This hook (usePermissions) for backward compatibility
 * 2. Direct store selectors (useUserRoles, useUserCapabilities) for optimized re-renders
 */

import * as React from 'react';
import { usePermissionsStore } from '@stores/permissionsStore';
import type { IItemPermissions } from '@stores/permissionsStore';
import { AppRole } from '@appTypes/configTypes';

/**
 * User permissions result (backward compatible interface)
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
 * Item permissions result with loading state
 */
export interface IItemPermissionsResult extends IItemPermissions {
  isLoading: boolean;
  error?: string;
}

/**
 * Custom hook for checking user permissions
 * Reads from permissionsStore (loaded during ApplicationProvider initialization)
 *
 * This is a backward-compatible wrapper. For optimized re-renders, consider using:
 * - useUserRoles() - for role flags only
 * - useUserCapabilities() - for derived permissions only
 */
export function usePermissions(): IUserPermissions & { isLoading: boolean; error?: string } {
  // Read directly from the store (no API calls - data already loaded)
  return usePermissionsStore((state) => ({
    isSubmitter: state.isSubmitter,
    isLegalAdmin: state.isLegalAdmin,
    isAttorneyAssigner: state.isAttorneyAssigner,
    isAttorney: state.isAttorney,
    isComplianceUser: state.isComplianceUser,
    isAdmin: state.isAdmin,
    roles: state.roles,
    canCreateRequest: state.canCreateRequest,
    canViewAllRequests: state.canViewAllRequests,
    canAssignAttorney: state.canAssignAttorney,
    canReviewLegal: state.canReviewLegal,
    canReviewCompliance: state.canReviewCompliance,
    isLoading: state.isLoading,
    error: state.error,
  }));
}

/**
 * Custom hook for checking item-level permissions
 * Uses permissionsStore.checkItemPermissions() which caches results
 */
export function useItemPermissions(listName: string, itemId: number | undefined): IItemPermissionsResult {
  const checkItemPermissions = usePermissionsStore((state) => state.checkItemPermissions);
  const cachedPermissions = usePermissionsStore((state) =>
    itemId ? state.itemPermissions.get(`${listName}_${itemId}`) : undefined
  );

  const [permissions, setPermissions] = React.useState<IItemPermissionsResult>({
    canView: false,
    canEdit: false,
    canDelete: false,
    hasFullControl: false,
    isLoading: true,
    error: undefined,
  });

  // Track if check is in progress to prevent duplicate calls
  const isCheckingRef = React.useRef<boolean>(false);

  React.useEffect(() => {
    if (!itemId) {
      setPermissions({
        canView: false,
        canEdit: false,
        canDelete: false,
        hasFullControl: false,
        isLoading: false,
        error: undefined,
      });
      return;
    }

    // If we have cached permissions, use them immediately
    if (cachedPermissions) {
      setPermissions({
        ...cachedPermissions,
        isLoading: false,
        error: undefined,
      });
      return;
    }

    // Prevent duplicate checks
    if (isCheckingRef.current) {
      return;
    }

    let isMounted = true;
    isCheckingRef.current = true;

    async function loadItemPermissions(): Promise<void> {
      try {
        if (isMounted) {
          setPermissions((prev) => ({ ...prev, isLoading: true }));
        }

        // Use the store's checkItemPermissions which handles caching
        const result = await checkItemPermissions(listName, itemId as number);

        if (!isMounted) return;

        setPermissions({
          ...result,
          isLoading: false,
          error: undefined,
        });
      } catch (err: unknown) {
        if (!isMounted) return;

        const message = err instanceof Error ? err.message : String(err);
        setPermissions({
          canView: false,
          canEdit: false,
          canDelete: false,
          hasFullControl: false,
          isLoading: false,
          error: message,
        });
      } finally {
        isCheckingRef.current = false;
      }
    }

    loadItemPermissions().catch(() => {
      // Error already handled in the async function
    });

    return () => {
      isMounted = false;
    };
  }, [listName, itemId, cachedPermissions, checkItemPermissions]);

  return permissions;
}

/**
 * Hook to check if current user has specific role
 */
export function useHasRole(role: AppRole): boolean {
  const roles = usePermissionsStore((state) => state.roles);
  return roles.indexOf(role) !== -1;
}

/**
 * Hook to check if current user has any of the specified roles
 */
export function useHasAnyRole(rolesToCheck: AppRole[]): boolean {
  const roles = usePermissionsStore((state) => state.roles);
  return rolesToCheck.some((role) => roles.indexOf(role) !== -1);
}

/**
 * Hook to check if current user has all of the specified roles
 */
export function useHasAllRoles(rolesToCheck: AppRole[]): boolean {
  const roles = usePermissionsStore((state) => state.roles);
  return rolesToCheck.every((role) => roles.indexOf(role) !== -1);
}

/**
 * Custom hook for permission checking and role-based access control
 */

import * as React from 'react';
import { SPContext } from 'spfx-toolkit';
import 'spfx-toolkit/lib/utilities/context/pnpImports/security';
import { createPermissionHelper } from 'spfx-toolkit/lib/utilities/permissionHelper';
import { AppRole } from '../types/configTypes';

/**
 * SharePoint permission levels
 */
enum SPPermissionLevel {
  Read = 'Read',
  Edit = 'Edit',
  FullControl = 'Full Control',
}

/**
 * User permissions result
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
 * Item permissions result
 */
export interface IItemPermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  hasFullControl: boolean;
  isLoading: boolean;
  error?: string;
}

/**
 * Custom hook for checking user permissions
 * Determines user roles and capabilities
 */
export function usePermissions(): IUserPermissions & { isLoading: boolean; error?: string } {
  const [permissions, setPermissions] = React.useState<IUserPermissions>({
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
  });
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    async function checkPermissions(): Promise<void> {
      try {
        setIsLoading(true);
        const permissionHelper = createPermissionHelper(SPContext.sp);

        // Check all role memberships in parallel
        const [submitter, legalAdmin, attorneyAssigner, attorneys, complianceUsers, admin] =
          await Promise.all([
            permissionHelper.userHasRole(AppRole.Submitters),
            permissionHelper.userHasRole(AppRole.LegalAdmin),
            permissionHelper.userHasRole(AppRole.AttorneyAssigner),
            permissionHelper.userHasRole(AppRole.Attorneys),
            permissionHelper.userHasRole(AppRole.ComplianceUsers),
            permissionHelper.userHasRole(AppRole.Admin),
          ]);

        const roles: AppRole[] = [];
        if (submitter.hasPermission) roles.push(AppRole.Submitters);
        if (legalAdmin.hasPermission) roles.push(AppRole.LegalAdmin);
        if (attorneyAssigner.hasPermission) roles.push(AppRole.AttorneyAssigner);
        if (attorneys.hasPermission) roles.push(AppRole.Attorneys);
        if (complianceUsers.hasPermission) roles.push(AppRole.ComplianceUsers);
        if (admin.hasPermission) roles.push(AppRole.Admin);

        setPermissions({
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
          canReviewLegal:
            attorneys.hasPermission || legalAdmin.hasPermission || admin.hasPermission,
          canReviewCompliance: complianceUsers.hasPermission || admin.hasPermission,
        });

        SPContext.logger.success('User permissions loaded', {
          userId: SPContext.currentUser.id,
          roles: roles.length,
        });

        setError(undefined);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        SPContext.logger.error('Failed to load user permissions', err);
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    checkPermissions().catch((error: unknown) => {
      SPContext.logger.error('Failed to initialize permissions', error);
    });
  }, []);

  return {
    ...permissions,
    isLoading,
    error,
  };
}

/**
 * Custom hook for checking item-level permissions
 */
export function useItemPermissions(listName: string, itemId: number | undefined): IItemPermissions {
  const [permissions, setPermissions] = React.useState<IItemPermissions>({
    canView: false,
    canEdit: false,
    canDelete: false,
    hasFullControl: false,
    isLoading: true,
    error: undefined,
  });

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

    async function checkItemPermissions(): Promise<void> {
      try {
        setPermissions(prev => ({ ...prev, isLoading: true }));

        const permissionHelper = createPermissionHelper(SPContext.sp);

        // Ensure itemId is defined before checking permissions
        if (itemId === undefined) {
          throw new Error('Item ID is required for permission checks');
        }

        // Check permissions in parallel
        const [viewPerm, editPerm, deletePerm, fullControlPerm] = await Promise.all([
          permissionHelper.userHasPermissionOnItem(listName, itemId, SPPermissionLevel.Read),
          permissionHelper.userHasPermissionOnItem(listName, itemId, SPPermissionLevel.Edit),
          permissionHelper.userHasPermissionOnItem(listName, itemId, SPPermissionLevel.Edit),
          permissionHelper.userHasPermissionOnItem(listName, itemId, SPPermissionLevel.FullControl),
        ]);

        setPermissions({
          canView: viewPerm.hasPermission,
          canEdit: editPerm.hasPermission,
          canDelete: deletePerm.hasPermission,
          hasFullControl: fullControlPerm.hasPermission,
          isLoading: false,
          error: undefined,
        });

        SPContext.logger.info('Item permissions checked', {
          listName,
          itemId,
          canView: viewPerm.hasPermission,
          canEdit: editPerm.hasPermission,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        SPContext.logger.error('Failed to check item permissions', err, {
          listName,
          itemId,
        });

        setPermissions({
          canView: false,
          canEdit: false,
          canDelete: false,
          hasFullControl: false,
          isLoading: false,
          error: message,
        });
      }
    }

    checkItemPermissions().catch((error: unknown) => {
      SPContext.logger.error('Failed to check item permissions', error);
    });
  }, [listName, itemId]);

  return permissions;
}

/**
 * Hook to check if current user has specific role
 */
export function useHasRole(role: AppRole): boolean {
  const { roles } = usePermissions();
  return roles.indexOf(role) !== -1;
}

/**
 * Hook to check if current user has any of the specified roles
 */
export function useHasAnyRole(roles: AppRole[]): boolean {
  const { roles: userRoles } = usePermissions();
  return roles.some(role => userRoles.indexOf(role) !== -1);
}

/**
 * Hook to check if current user has all of the specified roles
 */
export function useHasAllRoles(roles: AppRole[]): boolean {
  const { roles: userRoles } = usePermissions();
  return roles.every(role => userRoles.indexOf(role) !== -1);
}

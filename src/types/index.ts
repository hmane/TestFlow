/**
 * Central export point for all application types
 * Re-exports common types from spfx-toolkit and application-specific types
 */

// Re-export common types from spfx-toolkit
export type {
  IPrincipal,
  SPLookup,
  SPTaxonomy,
  SPUrl,
  SPLocation,
  SPImage,
  IListItemFormUpdateValue,
} from 'spfx-toolkit/lib/types';

export type {
  SPPermissionLevel,
  IPermissionResult,
  IUserPermissions,
  IItemPermissions,
  PermissionErrorCode,
} from 'spfx-toolkit/lib/types';

// Export application-specific types
export * from './requestTypes';
export * from './approvalTypes';
export * from './reviewTypes';
export * from './workflowTypes';
export * from './formTypes';
export * from './documentTypes';
export * from './configTypes';
export * from './submissionTypes';

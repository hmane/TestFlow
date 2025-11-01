/**
 * Central export point for all custom React hooks
 */

// Form validation hooks
export { useFormValidation } from './useFormValidation';
export type { IUseFormValidationOptions, IUseFormValidationResult } from './useFormValidation';

// Request form hook
export { useRequestForm } from './useRequestForm';
export type { IUseRequestFormOptions, IUseRequestFormResult } from './useRequestForm';

// Rush request calculation
export { useRushRequestCalculation, useIsRushRequest } from './useRushRequestCalculation';
export type { IBusinessDaysOptions } from './useRushRequestCalculation';

// Permissions
export {
  usePermissions,
  useItemPermissions,
  useHasRole,
  useHasAnyRole,
  useHasAllRoles,
} from './usePermissions';
export type { IUserPermissions, IItemPermissions } from './usePermissions';

// Document upload
export { useDocumentUpload } from './useDocumentUpload';
export type {
  IUseDocumentUploadOptions,
  IUseDocumentUploadResult,
  IUploadProgress,
  IDocumentUploadResult,
} from './useDocumentUpload';

// Workflow actions
export { useWorkflowActions } from './useWorkflowActions';
export type { IWorkflowActionsResult } from './useWorkflowActions';

// Utility hooks
export { useLocalStorage } from './useLocalStorage';

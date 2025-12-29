/**
 * Services Barrel Export
 * Central export point for all service modules
 *
 * Note: approvalFileService and documentService have overlapping function names
 * (uploadFile, deleteFile, batchUploadFiles). Import them directly from their
 * respective modules when needed to avoid ambiguity.
 */

// Approval File Service
export * as ApprovalFileService from './approvalFileService';

// Azure Function Service
export * from './azureFunctionService';

// CAML Query Service
export * from './camlQueryService';

// Configuration Service
export * from './configurationService';

// Document Service
export * as DocumentService from './documentService';

// Request Load Service
export * from './requestLoadService';

// Request Save Service
export * from './requestSaveService';

// Time Tracking Service
export * from './timeTrackingService';

// Workflow Action Service (namespaced to avoid conflicts with requestSaveService)
export * as WorkflowActions from './workflowActionService';

// Workflow Permission Service
export * from './workflowPermissionService';

// UI Visibility Service
export * from './uiVisibilityService';

// User Groups Service
export * from './userGroupsService';

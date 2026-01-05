/**
 * Request Save Service
 *
 * Handles all request save/update operations with hybrid permission management:
 * - Generic saveRequest() for flexible updates
 * - saveDraft() for draft operations
 * - Stage-specific functions that call Azure Functions synchronously for permissions
 *
 * This prevents "item not found" errors by ensuring permissions are set BEFORE
 * users continue (vs. async Flow that breaks inheritance later).
 *
 * @module requestSaveService
 * @see requestSave/index.ts for modular implementation
 */

// Re-export all public API from modular files
export {
  // Payload building
  buildRequestUpdatePayload,
  buildPartialUpdatePayload,
  hasRequestChanges,
  getChangedFields,
  // Request ID generation
  generateRequestId,
  // Save operations
  processPendingDocuments,
  saveRequest,
  saveDraft,
  // Internal utilities (exported for testing or advanced usage)
  mapApprovalsToSharePointFields,
} from './requestSave';

// ============================================
// LEGACY WORKFLOW FUNCTIONS REMOVED
// ============================================
//
// The following functions have been removed as they are now handled by
// workflowActionService.ts which includes proper time tracking:
//
// - submitForReview() → use workflowActionService.submitRequest()
// - assignAttorney() → use workflowActionService.assignAttorney()
// - submitLegalReview() → use workflowActionService.submitLegalReview()
// - submitComplianceReview() → use workflowActionService.submitComplianceReview()
// - closeoutRequest() → use workflowActionService.closeoutRequest()
// - cancelRequest() → use workflowActionService.cancelRequest()
// - holdRequest() → use workflowActionService.holdRequest()
// - resumeRequest() → use workflowActionService.resumeRequest()
//
// All workflow actions should go through requestStore which routes to
// workflowActionService for proper time tracking and single-save operations.

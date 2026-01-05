/**
 * Request Save Service
 *
 * Barrel export for request save operations.
 *
 * Handles all request save/update operations with hybrid permission management:
 * - Generic saveRequest() for flexible updates
 * - saveDraft() for draft operations
 * - Stage-specific functions that call Azure Functions synchronously for permissions
 */

// Payload building
export {
  buildRequestUpdatePayload,
  buildPartialUpdatePayload,
  hasRequestChanges,
  getChangedFields,
} from './payloadBuilder';

// Request ID generation
export { generateRequestId } from './requestIdGenerator';

// Save operations
export {
  processPendingDocuments,
  saveRequest,
  saveDraft,
} from './saveOperations';

// Internal utilities (exported for testing or advanced usage)
export { mapApprovalsToSharePointFields } from './approvalMapper';

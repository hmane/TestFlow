/**
 * Workflow Action Service
 *
 * Barrel export for all workflow actions.
 *
 * This module provides dedicated functions for each workflow action.
 * Each action only updates the specific fields relevant to that action,
 * ensuring clean data updates and proper audit trails.
 *
 * Actions:
 * - submitRequest: Submit a draft for review (Draft → Legal Intake)
 * - assignAttorney: Directly assign an attorney (Legal Intake → In Review)
 * - sendToCommittee: Send to committee for attorney assignment (Legal Intake → Assign Attorney)
 * - assignFromCommittee: Committee assigns attorney (Assign Attorney → In Review)
 * - submitLegalReview: Submit legal review outcome
 * - submitComplianceReview: Submit compliance review outcome
 * - closeoutRequest: Complete the request (In Review/Closeout → Completed)
 * - cancelRequest: Cancel a request
 * - holdRequest: Put request on hold
 * - resumeRequest: Resume from hold
 */

// ============================================
// TYPES
// ============================================
export type {
  IWorkflowActionResult,
  ISubmitRequestPayload,
  IAssignAttorneyPayload,
  ISendToCommitteePayload,
  ILegalReviewPayload,
  IComplianceReviewPayload,
  ICloseoutPayload,
  ICancelPayload,
  IHoldPayload,
  ICompleteFINRADocumentsPayload,
  ILegalReviewSavePayload,
  IComplianceReviewSavePayload,
  IResubmitLegalReviewPayload,
  IResubmitComplianceReviewPayload,
} from './workflowTypes';

// ============================================
// STATUS TRANSITION ACTIONS
// ============================================
export {
  submitRequest,
  assignAttorney,
  sendToCommittee,
  assignFromCommittee,
  moveToCloseout,
  closeoutRequest,
} from './statusTransitionActions';

// ============================================
// REVIEW ACTIONS
// ============================================
export {
  submitLegalReview,
  submitComplianceReview,
  updateLegalReviewStatus,
  updateComplianceReviewStatus,
} from './reviewActions';

// ============================================
// SAVE PROGRESS ACTIONS
// ============================================
export {
  saveLegalReviewProgress,
  saveComplianceReviewProgress,
} from './saveProgressActions';

// ============================================
// RESUBMIT ACTIONS
// ============================================
export {
  resubmitForLegalReview,
  resubmitForComplianceReview,
  requestLegalReviewChanges,
  requestComplianceReviewChanges,
} from './resubmitActions';

// ============================================
// HOLD/RESUME ACTIONS
// ============================================
export {
  cancelRequest,
  holdRequest,
  resumeRequest,
} from './holdResumeActions';

// ============================================
// FINRA ACTIONS
// ============================================
export {
  completeFINRADocuments,
} from './finraActions';

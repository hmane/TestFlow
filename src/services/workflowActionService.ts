/**
 * Workflow Action Service
 *
 * This file re-exports all workflow actions from the modular structure
 * for backward compatibility. New code should import directly from
 * '@services/workflow' or the specific action file.
 *
 * @deprecated Import from '@services/workflow' instead
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

// Re-export everything from the workflow module
export * from './workflow';

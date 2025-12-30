/**
 * Workflow Action Service
 *
 * Provides dedicated functions for each workflow action.
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

import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists';
import type { IPrincipal } from 'spfx-toolkit/lib/types';
import { createSPUpdater } from 'spfx-toolkit/lib/utilities/listItemHelper';

import { Lists } from '@sp/Lists';
import { RequestsFields } from '@sp/listFields/RequestsFields';
import { manageRequestPermissions } from './azureFunctionService';
import { loadRequestById } from './requestLoadService';
import { generateCorrelationId } from '../utils/correlationId';
import {
  calculateAndUpdateStageTime,
  pauseTimeTracking,
  resumeTimeTracking,
} from './timeTrackingService';

import type { ILegalRequest } from '@appTypes/requestTypes';
import { RequestStatus, ReviewOutcome, LegalReviewStatus, ComplianceReviewStatus, ReviewAudience } from '@appTypes/workflowTypes';

// ============================================
// TYPES & INTERFACES
// ============================================

/**
 * Result of a workflow action
 */
export interface IWorkflowActionResult {
  success: boolean;
  itemId: number;
  newStatus: RequestStatus;
  updatedRequest: ILegalRequest;
  fieldsUpdated: string[];
  /** Correlation ID for tracking this action across logs */
  correlationId: string;
}

/**
 * Submit request payload - only fields relevant to submission
 */
export interface ISubmitRequestPayload {
  /** Notes to include with submission (optional) */
  submissionNotes?: string;
}

/**
 * Assign attorney payload
 */
export interface IAssignAttorneyPayload {
  /** Attorney to assign */
  attorney: IPrincipal;
  /** Assignment notes (optional) */
  notes?: string;
}

/**
 * Send to committee payload
 */
export interface ISendToCommitteePayload {
  /** Notes for the committee (optional) */
  notes?: string;
}

/**
 * Legal review payload
 */
export interface ILegalReviewPayload {
  /** Review outcome */
  outcome: ReviewOutcome;
  /** Review notes (required) */
  notes: string;
}

/**
 * Compliance review payload
 */
export interface IComplianceReviewPayload {
  /** Review outcome */
  outcome: ReviewOutcome;
  /** Review notes (required) */
  notes: string;
  /** Foreside review required flag */
  isForesideReviewRequired?: boolean;
  /** Retail use flag */
  isRetailUse?: boolean;
}

/**
 * Closeout payload
 */
export interface ICloseoutPayload {
  /** Tracking ID (required if compliance reviewed with retail/foreside flags) */
  trackingId?: string;
}

/**
 * Cancel request payload
 */
export interface ICancelPayload {
  /** Cancellation reason (required) */
  reason: string;
}

/**
 * Hold request payload
 */
export interface IHoldPayload {
  /** Hold reason (required) */
  reason: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get current user as IPrincipal
 */
function getCurrentUserPrincipal(): IPrincipal {
  return {
    id: SPContext.currentUser.id.toString(),
    email: SPContext.currentUser.email,
    title: SPContext.currentUser.title,
    loginName: SPContext.currentUser.loginName,
  } as IPrincipal;
}

/**
 * Check if all required reviews are complete based on review audience
 * Returns true if the request should progress to Closeout
 *
 * @param request - Current request state
 * @param newLegalStatus - New legal review status (if being updated)
 * @param newComplianceStatus - New compliance review status (if being updated)
 */
function areAllReviewsComplete(
  request: ILegalRequest,
  newLegalStatus?: LegalReviewStatus,
  newComplianceStatus?: ComplianceReviewStatus
): boolean {
  const reviewAudience = request.reviewAudience;

  // Use new status if provided, otherwise use current status
  const legalStatus = newLegalStatus || request.legalReview?.status;
  const complianceStatus = newComplianceStatus || request.complianceReview?.status;

  SPContext.logger.info('WorkflowActionService: Checking if all reviews complete', {
    reviewAudience,
    legalStatus,
    complianceStatus,
  });

  switch (reviewAudience) {
    case ReviewAudience.Legal:
      // Only legal review required
      return legalStatus === LegalReviewStatus.Completed;

    case ReviewAudience.Compliance:
      // Only compliance review required
      return complianceStatus === ComplianceReviewStatus.Completed;

    case ReviewAudience.Both:
      // Both reviews required
      return (
        legalStatus === LegalReviewStatus.Completed &&
        complianceStatus === ComplianceReviewStatus.Completed
      );

    default:
      return false;
  }
}

/**
 * Update SharePoint item with specific fields only
 */
async function updateItem(
  itemId: number,
  payload: Record<string, any>,
  context: string,
  correlationId: string
): Promise<void> {
  try {
    SPContext.logger.info(`WorkflowActionService: ${context} - Updating item`, {
      correlationId,
      itemId,
      listTitle: Lists.Requests.Title,
      payload: JSON.stringify(payload),
      fieldsToUpdate: Object.keys(payload),
    });

    await SPContext.sp.web.lists
      .getByTitle(Lists.Requests.Title)
      .items.getById(itemId)
      .update(payload);

    SPContext.logger.success(`WorkflowActionService: ${context} - Item updated successfully`, {
      correlationId,
      itemId,
      fieldsUpdated: Object.keys(payload),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    SPContext.logger.error(`WorkflowActionService: ${context} - Update FAILED`, error, {
      correlationId,
      itemId,
      payload: JSON.stringify(payload),
    });
    throw new Error(`Failed to update item: ${message}`);
  }
}

// ============================================
// WORKFLOW ACTIONS
// ============================================

/**
 * Submit request for review
 *
 * Transitions: Draft → Legal Intake
 *
 * Fields updated:
 * - Status → Legal Intake
 * - SubmittedBy → Current user
 * - SubmittedOn → Current timestamp
 *
 * @param itemId - Request item ID
 * @param _payload - Optional submission payload (currently unused)
 * @returns Workflow action result
 */
export async function submitRequest(
  itemId: number,
  _payload?: ISubmitRequestPayload
): Promise<IWorkflowActionResult> {
  const correlationId = generateCorrelationId('submitRequest');

  SPContext.logger.info('WorkflowActionService: submitRequest STARTED', {
    correlationId,
    itemId,
    timestamp: new Date().toISOString(),
  });

  try {
    const currentUser = getCurrentUserPrincipal();
    const now = new Date();

    SPContext.logger.info('WorkflowActionService: Current user retrieved', {
      correlationId,
      userId: currentUser.id,
      userEmail: currentUser.email,
    });

    // Build update payload directly - ONLY status and submission tracking fields
    // Using direct payload instead of SPUpdater to ensure correct field names
    const userId = typeof currentUser.id === 'string' ? parseInt(currentUser.id, 10) : currentUser.id;

    // Use hardcoded field names to ensure correct update
    const newStatus = 'Legal Intake'; // RequestStatus.LegalIntake value

    const payload: Record<string, any> = {
      Status: newStatus,
      SubmittedById: userId,
      SubmittedOn: now.toISOString(),
    };

    const fieldsUpdated = Object.keys(payload);

    SPContext.logger.info('WorkflowActionService: submitRequest payload built', {
      correlationId,
      itemId,
      payload: JSON.stringify(payload),
      fieldsUpdated,
      userId,
      newStatus,
      listTitle: Lists.Requests.Title,
    });

    // Update SharePoint - this is the critical call
    SPContext.logger.info('WorkflowActionService: Calling updateItem...', { correlationId, itemId });
    await updateItem(itemId, payload, 'submitRequest', correlationId);
    SPContext.logger.info('WorkflowActionService: updateItem completed successfully', { correlationId, itemId });

    // Manage permissions for Legal Intake status
    try {
      await manageRequestPermissions(itemId, RequestStatus.LegalIntake);
      SPContext.logger.info('WorkflowActionService: Permission management completed', { correlationId, itemId });
    } catch (permError) {
      SPContext.logger.warn('WorkflowActionService: Permission management failed (request was submitted)', permError);
      // Don't fail the action - permissions will be retried by Flow
    }

    // Reload and return result
    SPContext.logger.info('WorkflowActionService: Reloading request...', { correlationId, itemId });
    const updatedRequest = await loadRequestById(itemId);
    SPContext.logger.info('WorkflowActionService: Request reloaded', {
      correlationId,
      itemId,
      loadedStatus: updatedRequest.status,
    });

    // Log the actual status returned to verify the update worked
    const statusMatches = updatedRequest.status === 'Legal Intake';
    SPContext.logger.success('WorkflowActionService: Request submitted successfully', {
      correlationId,
      itemId,
      requestId: updatedRequest.requestId,
      expectedStatus: 'Legal Intake',
      actualStatus: updatedRequest.status,
      statusMatches,
    });

    // Warn if status doesn't match expected
    if (!statusMatches) {
      SPContext.logger.error('WorkflowActionService: STATUS MISMATCH after update!', {
        correlationId,
        itemId,
        expected: 'Legal Intake',
        actual: updatedRequest.status,
        message: 'The status update may have failed or been overwritten',
      });
    }

    return {
      success: true,
      itemId,
      newStatus: RequestStatus.LegalIntake,
      updatedRequest,
      fieldsUpdated,
      correlationId,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    SPContext.logger.error('WorkflowActionService: submitRequest FAILED', error, {
      correlationId,
      itemId,
      errorMessage,
    });
    throw error;
  }
}

/**
 * Assign attorney directly
 *
 * Transitions: Legal Intake → In Review
 *
 * Fields updated:
 * - Status → In Review
 * - Attorney → Assigned attorney
 * - AttorneyAssignNotes → Notes (if provided)
 * - LegalReviewStatus → Not Started
 * - SubmittedForReviewBy → Current user
 * - SubmittedForReviewOn → Current timestamp
 *
 * @param itemId - Request item ID
 * @param payload - Attorney assignment payload
 * @returns Workflow action result
 */
export async function assignAttorney(
  itemId: number,
  payload: IAssignAttorneyPayload
): Promise<IWorkflowActionResult> {
  const correlationId = generateCorrelationId('assignAttorney');

  SPContext.logger.info('WorkflowActionService: Assigning attorney', {
    correlationId,
    itemId,
    attorneyId: payload.attorney.id,
    attorneyEmail: payload.attorney.email,
    attorneyTitle: payload.attorney.title,
    attorneyLoginName: payload.attorney.loginName,
    hasNotes: !!payload.notes,
  });

  const currentUser = getCurrentUserPrincipal();
  const now = new Date();

  SPContext.logger.info('WorkflowActionService: Current user for assignment', {
    correlationId,
    userId: currentUser.id,
    userEmail: currentUser.email,
  });

  // Build update payload - ONLY attorney assignment fields
  // Use typed setters for proper SharePoint field formatting
  const updater = createSPUpdater();
  updater.setChoice(RequestsFields.Status, RequestStatus.InReview);
  updater.setUser(RequestsFields.Attorney, payload.attorney);
  updater.setChoice(RequestsFields.LegalReviewStatus, LegalReviewStatus.NotStarted);
  updater.setUser(RequestsFields.SubmittedForReviewBy, currentUser);
  updater.setDate(RequestsFields.SubmittedForReviewOn, now);

  // Always set notes field - overwrites any previous value
  if (payload.notes) {
    updater.setText(RequestsFields.AttorneyAssignNotes, payload.notes);
  }

  const updatePayload = updater.getUpdates();
  const fieldsUpdated = Object.keys(updatePayload);

  SPContext.logger.info('WorkflowActionService: Update payload built', {
    correlationId,
    itemId,
    payload: JSON.stringify(updatePayload),
    fieldsUpdated,
  });

  // Update SharePoint
  await updateItem(itemId, updatePayload, 'assignAttorney', correlationId);

  // Manage permissions for In Review status (attorney gets access)
  try {
    await manageRequestPermissions(itemId, RequestStatus.InReview);
  } catch (permError) {
    SPContext.logger.warn('WorkflowActionService: Permission management failed (attorney was assigned)', permError);
  }

  // Reload and return result
  const updatedRequest = await loadRequestById(itemId);

  SPContext.logger.success('WorkflowActionService: Attorney assigned successfully', {
    correlationId,
    itemId,
    requestId: updatedRequest.requestId,
    attorney: payload.attorney.title,
  });

  return {
    success: true,
    itemId,
    newStatus: RequestStatus.InReview,
    updatedRequest,
    fieldsUpdated,
    correlationId,
  };
}

/**
 * Send request to committee for attorney assignment
 *
 * Transitions: Legal Intake → Assign Attorney
 *
 * Fields updated:
 * - Status → Assign Attorney
 * - AttorneyAssignNotes → Notes (if provided)
 * - SubmittedToAssignAttorneyBy → Current user
 * - SubmittedToAssignAttorneyOn → Current timestamp
 *
 * @param itemId - Request item ID
 * @param payload - Committee notes payload
 * @returns Workflow action result
 */
export async function sendToCommittee(
  itemId: number,
  payload?: ISendToCommitteePayload
): Promise<IWorkflowActionResult> {
  const correlationId = generateCorrelationId('sendToCommittee');

  SPContext.logger.info('WorkflowActionService: Sending to committee', { correlationId, itemId });

  const currentUser = getCurrentUserPrincipal();
  const now = new Date();

  // Build update payload - ONLY committee routing fields
  // Use typed setters for proper SharePoint field formatting
  const updater = createSPUpdater();
  updater.setChoice(RequestsFields.Status, RequestStatus.AssignAttorney);
  updater.setUser(RequestsFields.SubmittedToAssignAttorneyBy, currentUser);
  updater.setDate(RequestsFields.SubmittedToAssignAttorneyOn, now);

  if (payload?.notes) {
    updater.setText(RequestsFields.AttorneyAssignNotes, payload.notes);
  }

  const updatePayload = updater.getUpdates();
  const fieldsUpdated = Object.keys(updatePayload);

  // Update SharePoint
  await updateItem(itemId, updatePayload, 'sendToCommittee', correlationId);

  // Manage permissions for Assign Attorney status (committee gets access)
  try {
    await manageRequestPermissions(itemId, RequestStatus.AssignAttorney);
  } catch (permError) {
    SPContext.logger.warn('WorkflowActionService: Permission management failed', permError);
  }

  // Reload and return result
  const updatedRequest = await loadRequestById(itemId);

  SPContext.logger.success('WorkflowActionService: Sent to committee successfully', {
    correlationId,
    itemId,
    requestId: updatedRequest.requestId,
  });

  return {
    success: true,
    itemId,
    newStatus: RequestStatus.AssignAttorney,
    updatedRequest,
    fieldsUpdated,
    correlationId,
  };
}

/**
 * Committee assigns attorney
 *
 * Transitions: Assign Attorney → In Review
 *
 * Uses the same fields as assignAttorney but from a different starting status.
 *
 * @param itemId - Request item ID
 * @param payload - Attorney assignment payload
 * @returns Workflow action result
 */
export async function assignFromCommittee(
  itemId: number,
  payload: IAssignAttorneyPayload
): Promise<IWorkflowActionResult> {
  SPContext.logger.info('WorkflowActionService: Committee assigning attorney', {
    itemId,
    attorneyId: payload.attorney.id,
  });

  // Reuse assignAttorney logic - same fields updated
  return assignAttorney(itemId, payload);
}

/**
 * Submit legal review
 *
 * Fields updated:
 * - LegalReviewOutcome → Outcome
 * - LegalReviewNotes → Notes
 * - LegalReviewStatus → Completed
 * - LegalStatusUpdatedBy → Current user
 * - LegalStatusUpdatedOn → Current timestamp
 * - LegalReviewCompletedBy → Current user
 * - LegalReviewCompletedOn → Current timestamp
 * - Status → Closeout (if all required reviews are complete)
 *
 * Status automatically progresses to Closeout when:
 * - ReviewAudience is 'Legal' (only legal review required)
 * - ReviewAudience is 'Both' and compliance review is also Completed
 *
 * @param itemId - Request item ID
 * @param payload - Legal review payload
 * @returns Workflow action result
 */
export async function submitLegalReview(
  itemId: number,
  payload: ILegalReviewPayload
): Promise<IWorkflowActionResult> {
  const correlationId = generateCorrelationId('submitLegalReview');

  SPContext.logger.info('WorkflowActionService: Submitting legal review', {
    correlationId,
    itemId,
    outcome: payload.outcome,
  });

  // First, load current request to check review audience and compliance status
  const currentRequest = await loadRequestById(itemId);

  const currentUser = getCurrentUserPrincipal();
  const now = new Date();

  // Calculate time tracking for Legal Review stage completion
  // This calculates business hours spent by the attorney since last handoff
  let timeTrackingUpdates: Partial<ILegalRequest> = {};
  try {
    timeTrackingUpdates = await calculateAndUpdateStageTime(
      currentRequest,
      'LegalReview',
      'Submitter' // Review is complete, ownership conceptually transfers
    );
    SPContext.logger.info('WorkflowActionService: Time tracking calculated for legal review', {
      correlationId,
      itemId,
      timeTrackingUpdates,
    });
  } catch (timeError) {
    // Log but don't fail - time tracking is secondary to the review submission
    SPContext.logger.warn('WorkflowActionService: Time tracking calculation failed for legal review', {
      correlationId,
      itemId,
      error: timeError instanceof Error ? timeError.message : String(timeError),
    });
  }

  // Build update payload - legal review fields + time tracking
  const updater = createSPUpdater();
  updater.set(RequestsFields.LegalReviewOutcome, payload.outcome);
  updater.set(RequestsFields.LegalReviewNotes, payload.notes);
  updater.set(RequestsFields.LegalReviewStatus, LegalReviewStatus.Completed);
  updater.set(RequestsFields.LegalStatusUpdatedBy, currentUser);
  updater.set(RequestsFields.LegalStatusUpdatedOn, now.toISOString());
  updater.set(RequestsFields.LegalReviewCompletedBy, currentUser);
  updater.set(RequestsFields.LegalReviewCompletedOn, now.toISOString());

  // Add time tracking fields to update
  if (timeTrackingUpdates.legalReviewAttorneyHours !== undefined) {
    updater.set(RequestsFields.LegalReviewAttorneyHours, timeTrackingUpdates.legalReviewAttorneyHours);
  }
  if (timeTrackingUpdates.legalReviewSubmitterHours !== undefined) {
    updater.set(RequestsFields.LegalReviewSubmitterHours, timeTrackingUpdates.legalReviewSubmitterHours);
  }
  if (timeTrackingUpdates.totalReviewerHours !== undefined) {
    updater.set(RequestsFields.TotalReviewerHours, timeTrackingUpdates.totalReviewerHours);
  }
  if (timeTrackingUpdates.totalSubmitterHours !== undefined) {
    updater.set(RequestsFields.TotalSubmitterHours, timeTrackingUpdates.totalSubmitterHours);
  }

  // Check if all reviews will be complete after this submission
  // and auto-progress to Closeout if so
  const shouldProgressToCloseout = areAllReviewsComplete(
    currentRequest,
    LegalReviewStatus.Completed, // New legal status
    undefined // No change to compliance status
  );

  if (shouldProgressToCloseout) {
    updater.set(RequestsFields.Status, RequestStatus.Closeout);
    SPContext.logger.info('WorkflowActionService: All reviews complete, progressing to Closeout', {
      correlationId,
      itemId,
      reviewAudience: currentRequest.reviewAudience,
    });
  }

  const updatePayload = updater.getUpdates();
  const fieldsUpdated = Object.keys(updatePayload);

  // Update SharePoint
  await updateItem(itemId, updatePayload, 'submitLegalReview', correlationId);

  // Manage permissions if status changed to Closeout
  if (shouldProgressToCloseout) {
    try {
      await manageRequestPermissions(itemId, RequestStatus.Closeout);
    } catch (permError) {
      SPContext.logger.warn('WorkflowActionService: Permission management failed for Closeout transition', permError);
    }
  }

  // Reload to get current state
  const updatedRequest = await loadRequestById(itemId);

  SPContext.logger.success('WorkflowActionService: Legal review submitted', {
    correlationId,
    itemId,
    requestId: updatedRequest.requestId,
    outcome: payload.outcome,
    progressedToCloseout: shouldProgressToCloseout,
    timeTracked: {
      attorneyHours: timeTrackingUpdates.legalReviewAttorneyHours,
      totalReviewerHours: timeTrackingUpdates.totalReviewerHours,
    },
  });

  return {
    success: true,
    itemId,
    newStatus: updatedRequest.status,
    updatedRequest,
    fieldsUpdated,
    correlationId,
  };
}

/**
 * Submit compliance review
 *
 * Fields updated:
 * - ComplianceReviewOutcome → Outcome
 * - ComplianceReviewNotes → Notes
 * - ComplianceReviewStatus → Completed
 * - IsForesideReviewRequired → Flag (if provided)
 * - IsRetailUse → Flag (if provided)
 * - ComplianceStatusUpdatedBy → Current user
 * - ComplianceStatusUpdatedOn → Current timestamp
 * - ComplianceReviewCompletedBy → Current user
 * - ComplianceReviewCompletedOn → Current timestamp
 * - Status → Closeout (if all required reviews are complete)
 *
 * Status automatically progresses to Closeout when:
 * - ReviewAudience is 'Compliance' (only compliance review required)
 * - ReviewAudience is 'Both' and legal review is also Completed
 *
 * @param itemId - Request item ID
 * @param payload - Compliance review payload
 * @returns Workflow action result
 */
export async function submitComplianceReview(
  itemId: number,
  payload: IComplianceReviewPayload
): Promise<IWorkflowActionResult> {
  const correlationId = generateCorrelationId('submitComplianceReview');

  SPContext.logger.info('WorkflowActionService: Submitting compliance review', {
    correlationId,
    itemId,
    outcome: payload.outcome,
  });

  // First, load current request to check review audience and legal status
  const currentRequest = await loadRequestById(itemId);

  const currentUser = getCurrentUserPrincipal();
  const now = new Date();

  // Calculate time tracking for Compliance Review stage completion
  // This calculates business hours spent by the compliance reviewer since last handoff
  let timeTrackingUpdates: Partial<ILegalRequest> = {};
  try {
    timeTrackingUpdates = await calculateAndUpdateStageTime(
      currentRequest,
      'ComplianceReview',
      'Submitter' // Review is complete, ownership conceptually transfers
    );
    SPContext.logger.info('WorkflowActionService: Time tracking calculated for compliance review', {
      correlationId,
      itemId,
      timeTrackingUpdates,
    });
  } catch (timeError) {
    // Log but don't fail - time tracking is secondary to the review submission
    SPContext.logger.warn('WorkflowActionService: Time tracking calculation failed for compliance review', {
      correlationId,
      itemId,
      error: timeError instanceof Error ? timeError.message : String(timeError),
    });
  }

  // Build update payload - compliance review fields + time tracking
  const updater = createSPUpdater();
  updater.set(RequestsFields.ComplianceReviewOutcome, payload.outcome);
  updater.set(RequestsFields.ComplianceReviewNotes, payload.notes);
  updater.set(RequestsFields.ComplianceReviewStatus, ComplianceReviewStatus.Completed);
  updater.set(RequestsFields.ComplianceStatusUpdatedBy, currentUser);
  updater.set(RequestsFields.ComplianceStatusUpdatedOn, now.toISOString());
  updater.set(RequestsFields.ComplianceReviewCompletedBy, currentUser);
  updater.set(RequestsFields.ComplianceReviewCompletedOn, now.toISOString());

  // Add time tracking fields to update
  if (timeTrackingUpdates.complianceReviewReviewerHours !== undefined) {
    updater.set(RequestsFields.ComplianceReviewReviewerHours, timeTrackingUpdates.complianceReviewReviewerHours);
  }
  if (timeTrackingUpdates.complianceReviewSubmitterHours !== undefined) {
    updater.set(RequestsFields.ComplianceReviewSubmitterHours, timeTrackingUpdates.complianceReviewSubmitterHours);
  }
  if (timeTrackingUpdates.totalReviewerHours !== undefined) {
    updater.set(RequestsFields.TotalReviewerHours, timeTrackingUpdates.totalReviewerHours);
  }
  if (timeTrackingUpdates.totalSubmitterHours !== undefined) {
    updater.set(RequestsFields.TotalSubmitterHours, timeTrackingUpdates.totalSubmitterHours);
  }

  // Optional flags
  if (payload.isForesideReviewRequired !== undefined) {
    updater.set(RequestsFields.IsForesideReviewRequired, payload.isForesideReviewRequired);
  }
  if (payload.isRetailUse !== undefined) {
    updater.set(RequestsFields.IsRetailUse, payload.isRetailUse);
  }

  // Check if all reviews will be complete after this submission
  // and auto-progress to Closeout if so
  const shouldProgressToCloseout = areAllReviewsComplete(
    currentRequest,
    undefined, // No change to legal status
    ComplianceReviewStatus.Completed // New compliance status
  );

  if (shouldProgressToCloseout) {
    updater.set(RequestsFields.Status, RequestStatus.Closeout);
    SPContext.logger.info('WorkflowActionService: All reviews complete, progressing to Closeout', {
      correlationId,
      itemId,
      reviewAudience: currentRequest.reviewAudience,
    });
  }

  const updatePayload = updater.getUpdates();
  const fieldsUpdated = Object.keys(updatePayload);

  // Update SharePoint
  await updateItem(itemId, updatePayload, 'submitComplianceReview', correlationId);

  // Manage permissions if status changed to Closeout
  if (shouldProgressToCloseout) {
    try {
      await manageRequestPermissions(itemId, RequestStatus.Closeout);
    } catch (permError) {
      SPContext.logger.warn('WorkflowActionService: Permission management failed for Closeout transition', permError);
    }
  }

  // Reload to get current state
  const updatedRequest = await loadRequestById(itemId);

  SPContext.logger.success('WorkflowActionService: Compliance review submitted', {
    correlationId,
    itemId,
    requestId: updatedRequest.requestId,
    outcome: payload.outcome,
    progressedToCloseout: shouldProgressToCloseout,
    timeTracked: {
      reviewerHours: timeTrackingUpdates.complianceReviewReviewerHours,
      totalReviewerHours: timeTrackingUpdates.totalReviewerHours,
    },
  });

  return {
    success: true,
    itemId,
    newStatus: updatedRequest.status,
    updatedRequest,
    fieldsUpdated,
    correlationId,
  };
}

/**
 * Closeout request
 *
 * Transitions: In Review/Closeout → Completed
 *
 * Fields updated:
 * - Status → Completed
 * - TrackingId → Tracking ID (if provided)
 * - CloseoutBy → Current user
 * - CloseoutOn → Current timestamp
 *
 * @param itemId - Request item ID
 * @param payload - Closeout payload
 * @returns Workflow action result
 */
export async function closeoutRequest(
  itemId: number,
  payload?: ICloseoutPayload
): Promise<IWorkflowActionResult> {
  const correlationId = generateCorrelationId('closeoutRequest');

  SPContext.logger.info('WorkflowActionService: Closing out request', {
    correlationId,
    itemId,
    trackingId: payload?.trackingId,
  });

  // Load current request for time tracking
  const currentRequest = await loadRequestById(itemId);

  const currentUser = getCurrentUserPrincipal();
  const now = new Date();

  // Calculate time tracking for Closeout stage completion
  // This calculates business hours spent on closeout since reviews completed
  let timeTrackingUpdates: Partial<ILegalRequest> = {};
  try {
    timeTrackingUpdates = await calculateAndUpdateStageTime(
      currentRequest,
      'Closeout',
      'Submitter' // Closeout is complete
    );
    SPContext.logger.info('WorkflowActionService: Time tracking calculated for closeout', {
      correlationId,
      itemId,
      timeTrackingUpdates,
    });
  } catch (timeError) {
    // Log but don't fail - time tracking is secondary
    SPContext.logger.warn('WorkflowActionService: Time tracking calculation failed for closeout', {
      correlationId,
      itemId,
      error: timeError instanceof Error ? timeError.message : String(timeError),
    });
  }

  // Build update payload - closeout fields + time tracking
  const updater = createSPUpdater();
  updater.set(RequestsFields.Status, RequestStatus.Completed);
  updater.set(RequestsFields.CloseoutBy, currentUser);
  updater.set(RequestsFields.CloseoutOn, now.toISOString());

  if (payload?.trackingId) {
    updater.set(RequestsFields.TrackingId, payload.trackingId);
  }

  // Add time tracking fields to update
  if (timeTrackingUpdates.closeoutReviewerHours !== undefined) {
    updater.set(RequestsFields.CloseoutReviewerHours, timeTrackingUpdates.closeoutReviewerHours);
  }
  if (timeTrackingUpdates.closeoutSubmitterHours !== undefined) {
    updater.set(RequestsFields.CloseoutSubmitterHours, timeTrackingUpdates.closeoutSubmitterHours);
  }
  if (timeTrackingUpdates.totalReviewerHours !== undefined) {
    updater.set(RequestsFields.TotalReviewerHours, timeTrackingUpdates.totalReviewerHours);
  }
  if (timeTrackingUpdates.totalSubmitterHours !== undefined) {
    updater.set(RequestsFields.TotalSubmitterHours, timeTrackingUpdates.totalSubmitterHours);
  }

  const updatePayload = updater.getUpdates();
  const fieldsUpdated = Object.keys(updatePayload);

  // Update SharePoint
  await updateItem(itemId, updatePayload, 'closeoutRequest', correlationId);

  // Manage permissions for Completed status
  try {
    await manageRequestPermissions(itemId, RequestStatus.Completed);
  } catch (permError) {
    SPContext.logger.warn('WorkflowActionService: Permission management failed (request was closed)', permError);
  }

  // Reload and return result
  const updatedRequest = await loadRequestById(itemId);

  SPContext.logger.success('WorkflowActionService: Request closed out successfully', {
    correlationId,
    itemId,
    requestId: updatedRequest.requestId,
    timeTracked: {
      closeoutReviewerHours: timeTrackingUpdates.closeoutReviewerHours,
      totalReviewerHours: timeTrackingUpdates.totalReviewerHours,
    },
  });

  return {
    success: true,
    itemId,
    newStatus: RequestStatus.Completed,
    updatedRequest,
    fieldsUpdated,
    correlationId,
  };
}

/**
 * Cancel request
 *
 * Transitions: Any active status → Cancelled
 *
 * Fields updated:
 * - Status → Cancelled
 * - PreviousStatus → Current status (before cancel)
 * - CancelReason → Reason
 * - CancelledBy → Current user
 * - CancelledOn → Current timestamp
 *
 * @param itemId - Request item ID
 * @param payload - Cancel payload
 * @param currentStatus - Current status before cancellation
 * @returns Workflow action result
 */
export async function cancelRequest(
  itemId: number,
  payload: ICancelPayload,
  currentStatus: RequestStatus
): Promise<IWorkflowActionResult> {
  const correlationId = generateCorrelationId('cancelRequest');

  SPContext.logger.info('WorkflowActionService: Cancelling request', {
    correlationId,
    itemId,
    currentStatus,
    reason: payload.reason,
  });

  const currentUser = getCurrentUserPrincipal();
  const now = new Date();

  // Build update payload - ONLY cancellation fields
  const updater = createSPUpdater();
  updater.set(RequestsFields.Status, RequestStatus.Cancelled);
  updater.set(RequestsFields.PreviousStatus, currentStatus);
  updater.set(RequestsFields.CancelReason, payload.reason);
  updater.set(RequestsFields.CancelledBy, currentUser);
  updater.set(RequestsFields.CancelledOn, now.toISOString());

  const updatePayload = updater.getUpdates();
  const fieldsUpdated = Object.keys(updatePayload);

  // Update SharePoint
  await updateItem(itemId, updatePayload, 'cancelRequest', correlationId);

  // Manage permissions for Cancelled status
  try {
    await manageRequestPermissions(itemId, RequestStatus.Cancelled);
  } catch (permError) {
    SPContext.logger.warn('WorkflowActionService: Permission management failed', permError);
  }

  // Reload and return result
  const updatedRequest = await loadRequestById(itemId);

  SPContext.logger.success('WorkflowActionService: Request cancelled', {
    correlationId,
    itemId,
    requestId: updatedRequest.requestId,
  });

  return {
    success: true,
    itemId,
    newStatus: RequestStatus.Cancelled,
    updatedRequest,
    fieldsUpdated,
    correlationId,
  };
}

/**
 * Put request on hold
 *
 * Transitions: Any active status → On Hold
 *
 * Fields updated:
 * - Status → On Hold
 * - PreviousStatus → Current status (before hold)
 * - OnHoldReason → Reason
 * - OnHoldBy → Current user
 * - OnHoldSince → Current timestamp
 *
 * @param itemId - Request item ID
 * @param payload - Hold payload
 * @param currentStatus - Current status before hold
 * @returns Workflow action result
 */
export async function holdRequest(
  itemId: number,
  payload: IHoldPayload,
  currentStatus: RequestStatus
): Promise<IWorkflowActionResult> {
  const correlationId = generateCorrelationId('holdRequest');

  SPContext.logger.info('WorkflowActionService: Putting request on hold', {
    correlationId,
    itemId,
    currentStatus,
    reason: payload.reason,
  });

  // Load current request for time tracking
  const currentRequest = await loadRequestById(itemId);

  const currentUser = getCurrentUserPrincipal();
  const now = new Date();

  // Pause time tracking - finalize hours up to this moment
  let timeTrackingUpdates: Partial<ILegalRequest> = {};
  try {
    timeTrackingUpdates = await pauseTimeTracking(currentRequest);
    SPContext.logger.info('WorkflowActionService: Time tracking paused for hold', {
      correlationId,
      itemId,
      timeTrackingUpdates,
    });
  } catch (timeError) {
    // Log but don't fail - time tracking is secondary
    SPContext.logger.warn('WorkflowActionService: Time tracking pause failed for hold', {
      correlationId,
      itemId,
      error: timeError instanceof Error ? timeError.message : String(timeError),
    });
  }

  // Build update payload - hold fields + time tracking
  const updater = createSPUpdater();
  updater.set(RequestsFields.Status, RequestStatus.OnHold);
  updater.set(RequestsFields.PreviousStatus, currentStatus);
  updater.set(RequestsFields.OnHoldReason, payload.reason);
  updater.set(RequestsFields.OnHoldBy, currentUser);
  updater.set(RequestsFields.OnHoldSince, now.toISOString());

  // Add time tracking fields if updated
  if (timeTrackingUpdates.legalReviewAttorneyHours !== undefined) {
    updater.set(RequestsFields.LegalReviewAttorneyHours, timeTrackingUpdates.legalReviewAttorneyHours);
  }
  if (timeTrackingUpdates.legalReviewSubmitterHours !== undefined) {
    updater.set(RequestsFields.LegalReviewSubmitterHours, timeTrackingUpdates.legalReviewSubmitterHours);
  }
  if (timeTrackingUpdates.complianceReviewReviewerHours !== undefined) {
    updater.set(RequestsFields.ComplianceReviewReviewerHours, timeTrackingUpdates.complianceReviewReviewerHours);
  }
  if (timeTrackingUpdates.complianceReviewSubmitterHours !== undefined) {
    updater.set(RequestsFields.ComplianceReviewSubmitterHours, timeTrackingUpdates.complianceReviewSubmitterHours);
  }
  if (timeTrackingUpdates.closeoutReviewerHours !== undefined) {
    updater.set(RequestsFields.CloseoutReviewerHours, timeTrackingUpdates.closeoutReviewerHours);
  }
  if (timeTrackingUpdates.closeoutSubmitterHours !== undefined) {
    updater.set(RequestsFields.CloseoutSubmitterHours, timeTrackingUpdates.closeoutSubmitterHours);
  }
  if (timeTrackingUpdates.totalReviewerHours !== undefined) {
    updater.set(RequestsFields.TotalReviewerHours, timeTrackingUpdates.totalReviewerHours);
  }
  if (timeTrackingUpdates.totalSubmitterHours !== undefined) {
    updater.set(RequestsFields.TotalSubmitterHours, timeTrackingUpdates.totalSubmitterHours);
  }

  const updatePayload = updater.getUpdates();
  const fieldsUpdated = Object.keys(updatePayload);

  // Update SharePoint
  await updateItem(itemId, updatePayload, 'holdRequest', correlationId);

  // Reload and return result
  const updatedRequest = await loadRequestById(itemId);

  SPContext.logger.success('WorkflowActionService: Request put on hold', {
    correlationId,
    itemId,
    requestId: updatedRequest.requestId,
    timeTracked: {
      totalReviewerHours: timeTrackingUpdates.totalReviewerHours,
      totalSubmitterHours: timeTrackingUpdates.totalSubmitterHours,
    },
  });

  return {
    success: true,
    itemId,
    newStatus: RequestStatus.OnHold,
    updatedRequest,
    fieldsUpdated,
    correlationId,
  };
}

/**
 * Resume request from hold
 *
 * Transitions: On Hold → Previous status
 *
 * Fields updated:
 * - Status → Previous status
 * - PreviousStatus → On Hold
 * - OnHoldReason → null
 * - OnHoldBy → null
 * - OnHoldSince → null
 *
 * @param itemId - Request item ID
 * @param previousStatus - Status to resume to
 * @returns Workflow action result
 */
export async function resumeRequest(
  itemId: number,
  previousStatus: RequestStatus
): Promise<IWorkflowActionResult> {
  const correlationId = generateCorrelationId('resumeRequest');

  SPContext.logger.info('WorkflowActionService: Resuming request', {
    correlationId,
    itemId,
    previousStatus,
  });

  // Load current request for time tracking
  const currentRequest = await loadRequestById(itemId);

  // Resume time tracking - this resets the handoff timestamp to now
  // so that future calculations start from the resume point
  try {
    await resumeTimeTracking(currentRequest, previousStatus);
    SPContext.logger.info('WorkflowActionService: Time tracking resumed', {
      correlationId,
      itemId,
      previousStatus,
    });
  } catch (timeError) {
    // Log but don't fail - time tracking is secondary
    SPContext.logger.warn('WorkflowActionService: Time tracking resume failed', {
      correlationId,
      itemId,
      error: timeError instanceof Error ? timeError.message : String(timeError),
    });
  }

  // Build update payload - resume fields
  // Note: Time tracking resumes automatically when status fields are updated
  // The status timestamp updates will be used as the new handoff reference point
  const updater = createSPUpdater();
  updater.set(RequestsFields.Status, previousStatus);
  updater.set(RequestsFields.PreviousStatus, RequestStatus.OnHold);
  // Clear hold fields
  updater.set(RequestsFields.OnHoldReason, null);
  updater.set(RequestsFields.OnHoldBy, null);
  updater.set(RequestsFields.OnHoldSince, null);

  const updatePayload = updater.getUpdates();
  const fieldsUpdated = Object.keys(updatePayload);

  // Update SharePoint
  await updateItem(itemId, updatePayload, 'resumeRequest', correlationId);

  // Reload and return result
  const updatedRequest = await loadRequestById(itemId);

  SPContext.logger.success('WorkflowActionService: Request resumed', {
    correlationId,
    itemId,
    requestId: updatedRequest.requestId,
    newStatus: previousStatus,
  });

  return {
    success: true,
    itemId,
    newStatus: previousStatus,
    updatedRequest,
    fieldsUpdated,
    correlationId,
  };
}

/**
 * Move request to closeout stage
 *
 * Transitions: In Review → Closeout
 *
 * This is called when all reviews are complete and approved.
 * Actual closeout is done via closeoutRequest().
 *
 * Fields updated:
 * - Status → Closeout
 *
 * @param itemId - Request item ID
 * @returns Workflow action result
 */
export async function moveToCloseout(
  itemId: number
): Promise<IWorkflowActionResult> {
  const correlationId = generateCorrelationId('moveToCloseout');

  SPContext.logger.info('WorkflowActionService: Moving to closeout', { correlationId, itemId });

  // Build update payload - ONLY status
  const updater = createSPUpdater();
  updater.set(RequestsFields.Status, RequestStatus.Closeout);

  const updatePayload = updater.getUpdates();
  const fieldsUpdated = Object.keys(updatePayload);

  // Update SharePoint
  await updateItem(itemId, updatePayload, 'moveToCloseout', correlationId);

  // Reload and return result
  const updatedRequest = await loadRequestById(itemId);

  SPContext.logger.success('WorkflowActionService: Moved to closeout', {
    correlationId,
    itemId,
    requestId: updatedRequest.requestId,
  });

  return {
    success: true,
    itemId,
    newStatus: RequestStatus.Closeout,
    updatedRequest,
    fieldsUpdated,
    correlationId,
  };
}

/**
 * Update legal review status (in-progress tracking)
 *
 * Used to update the legal review status without completing it.
 * For example: Not Started → In Progress, In Progress → Waiting On Submitter
 *
 * Fields updated:
 * - LegalReviewStatus → New status
 * - LegalStatusUpdatedBy → Current user
 * - LegalStatusUpdatedOn → Current timestamp
 *
 * @param itemId - Request item ID
 * @param status - New legal review status
 * @returns Workflow action result
 */
export async function updateLegalReviewStatus(
  itemId: number,
  status: LegalReviewStatus
): Promise<IWorkflowActionResult> {
  const correlationId = generateCorrelationId('updateLegalReviewStatus');

  SPContext.logger.info('WorkflowActionService: Updating legal review status', {
    correlationId,
    itemId,
    newStatus: status,
  });

  const currentUser = getCurrentUserPrincipal();
  const now = new Date();

  const updater = createSPUpdater();
  updater.set(RequestsFields.LegalReviewStatus, status);
  updater.set(RequestsFields.LegalStatusUpdatedBy, currentUser);
  updater.set(RequestsFields.LegalStatusUpdatedOn, now.toISOString());

  const updatePayload = updater.getUpdates();
  const fieldsUpdated = Object.keys(updatePayload);

  await updateItem(itemId, updatePayload, 'updateLegalReviewStatus', correlationId);

  const updatedRequest = await loadRequestById(itemId);

  return {
    success: true,
    itemId,
    newStatus: updatedRequest.status,
    updatedRequest,
    fieldsUpdated,
    correlationId,
  };
}

/**
 * Update compliance review status (in-progress tracking)
 *
 * Fields updated:
 * - ComplianceReviewStatus → New status
 * - ComplianceStatusUpdatedBy → Current user
 * - ComplianceStatusUpdatedOn → Current timestamp
 *
 * @param itemId - Request item ID
 * @param status - New compliance review status
 * @returns Workflow action result
 */
export async function updateComplianceReviewStatus(
  itemId: number,
  status: ComplianceReviewStatus
): Promise<IWorkflowActionResult> {
  const correlationId = generateCorrelationId('updateComplianceReviewStatus');

  SPContext.logger.info('WorkflowActionService: Updating compliance review status', {
    correlationId,
    itemId,
    newStatus: status,
  });

  const currentUser = getCurrentUserPrincipal();
  const now = new Date();

  const updater = createSPUpdater();
  updater.set(RequestsFields.ComplianceReviewStatus, status);
  updater.set(RequestsFields.ComplianceStatusUpdatedBy, currentUser);
  updater.set(RequestsFields.ComplianceStatusUpdatedOn, now.toISOString());

  const updatePayload = updater.getUpdates();
  const fieldsUpdated = Object.keys(updatePayload);

  await updateItem(itemId, updatePayload, 'updateComplianceReviewStatus', correlationId);

  const updatedRequest = await loadRequestById(itemId);

  return {
    success: true,
    itemId,
    newStatus: updatedRequest.status,
    updatedRequest,
    fieldsUpdated,
    correlationId,
  };
}

// ============================================
// SAVE PROGRESS ACTIONS (save without completing)
// ============================================

/**
 * Legal review save progress payload
 */
export interface ILegalReviewSavePayload {
  /** Review outcome (optional - save in progress) */
  outcome?: ReviewOutcome;
  /** Review notes */
  notes?: string;
}

/**
 * Compliance review save progress payload
 */
export interface IComplianceReviewSavePayload {
  /** Review outcome (optional - save in progress) */
  outcome?: ReviewOutcome;
  /** Review notes */
  notes?: string;
  /** Foreside review required flag */
  isForesideReviewRequired?: boolean;
  /** Retail use flag */
  isRetailUse?: boolean;
}

/**
 * Save legal review progress (without completing)
 *
 * Saves the current review state without marking the review as complete.
 * Used when attorney wants to save their work-in-progress.
 *
 * Fields updated:
 * - LegalReviewOutcome → Outcome (if provided)
 * - LegalReviewNotes → Notes (if provided)
 * - LegalReviewStatus → In Progress
 * - LegalStatusUpdatedBy → Current user
 * - LegalStatusUpdatedOn → Current timestamp
 *
 * @param itemId - Request item ID
 * @param payload - Save payload
 * @returns Workflow action result
 */
export async function saveLegalReviewProgress(
  itemId: number,
  payload: ILegalReviewSavePayload
): Promise<IWorkflowActionResult> {
  const correlationId = generateCorrelationId('saveLegalReviewProgress');

  SPContext.logger.info('WorkflowActionService: Saving legal review progress', {
    correlationId,
    itemId,
    hasOutcome: !!payload.outcome,
    hasNotes: !!payload.notes,
  });

  const currentUser = getCurrentUserPrincipal();
  const now = new Date();

  // Build update payload - save progress fields
  const updater = createSPUpdater();

  // Only update outcome if provided
  if (payload.outcome !== undefined) {
    updater.set(RequestsFields.LegalReviewOutcome, payload.outcome);
  }

  // Only update notes if provided
  if (payload.notes !== undefined) {
    updater.set(RequestsFields.LegalReviewNotes, payload.notes);
  }

  // Set status to In Progress (not Completed)
  updater.set(RequestsFields.LegalReviewStatus, LegalReviewStatus.InProgress);
  updater.set(RequestsFields.LegalStatusUpdatedBy, currentUser);
  updater.set(RequestsFields.LegalStatusUpdatedOn, now.toISOString());

  const updatePayload = updater.getUpdates();
  const fieldsUpdated = Object.keys(updatePayload);

  // Update SharePoint
  await updateItem(itemId, updatePayload, 'saveLegalReviewProgress', correlationId);

  // Reload to get current state
  const updatedRequest = await loadRequestById(itemId);

  SPContext.logger.success('WorkflowActionService: Legal review progress saved', {
    correlationId,
    itemId,
    requestId: updatedRequest.requestId,
  });

  return {
    success: true,
    itemId,
    newStatus: updatedRequest.status,
    updatedRequest,
    fieldsUpdated,
    correlationId,
  };
}

/**
 * Save compliance review progress (without completing)
 *
 * Saves the current review state without marking the review as complete.
 * Used when compliance reviewer wants to save their work-in-progress.
 *
 * Fields updated:
 * - ComplianceReviewOutcome → Outcome (if provided)
 * - ComplianceReviewNotes → Notes (if provided)
 * - ComplianceReviewStatus → In Progress
 * - IsForesideReviewRequired → Flag (if provided)
 * - IsRetailUse → Flag (if provided)
 * - ComplianceStatusUpdatedBy → Current user
 * - ComplianceStatusUpdatedOn → Current timestamp
 *
 * @param itemId - Request item ID
 * @param payload - Save payload
 * @returns Workflow action result
 */
export async function saveComplianceReviewProgress(
  itemId: number,
  payload: IComplianceReviewSavePayload
): Promise<IWorkflowActionResult> {
  const correlationId = generateCorrelationId('saveComplianceReviewProgress');

  SPContext.logger.info('WorkflowActionService: Saving compliance review progress', {
    correlationId,
    itemId,
    hasOutcome: !!payload.outcome,
    hasNotes: !!payload.notes,
  });

  const currentUser = getCurrentUserPrincipal();
  const now = new Date();

  // Build update payload - save progress fields
  const updater = createSPUpdater();

  // Only update outcome if provided
  if (payload.outcome !== undefined) {
    updater.set(RequestsFields.ComplianceReviewOutcome, payload.outcome);
  }

  // Only update notes if provided
  if (payload.notes !== undefined) {
    updater.set(RequestsFields.ComplianceReviewNotes, payload.notes);
  }

  // Set status to In Progress (not Completed)
  updater.set(RequestsFields.ComplianceReviewStatus, ComplianceReviewStatus.InProgress);
  updater.set(RequestsFields.ComplianceStatusUpdatedBy, currentUser);
  updater.set(RequestsFields.ComplianceStatusUpdatedOn, now.toISOString());

  // Optional flags
  if (payload.isForesideReviewRequired !== undefined) {
    updater.set(RequestsFields.IsForesideReviewRequired, payload.isForesideReviewRequired);
  }
  if (payload.isRetailUse !== undefined) {
    updater.set(RequestsFields.IsRetailUse, payload.isRetailUse);
  }

  const updatePayload = updater.getUpdates();
  const fieldsUpdated = Object.keys(updatePayload);

  // Update SharePoint
  await updateItem(itemId, updatePayload, 'saveComplianceReviewProgress', correlationId);

  // Reload to get current state
  const updatedRequest = await loadRequestById(itemId);

  SPContext.logger.success('WorkflowActionService: Compliance review progress saved', {
    correlationId,
    itemId,
    requestId: updatedRequest.requestId,
  });

  return {
    success: true,
    itemId,
    newStatus: updatedRequest.status,
    updatedRequest,
    fieldsUpdated,
    correlationId,
  };
}

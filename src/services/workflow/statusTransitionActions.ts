/**
 * Status Transition Actions
 *
 * Workflow actions for status transitions:
 * - submitRequest: Submit a draft for review (Draft → Legal Intake)
 * - assignAttorney: Directly assign an attorney (Legal Intake → In Review)
 * - sendToCommittee: Send to committee for attorney assignment (Legal Intake → Assign Attorney)
 * - assignFromCommittee: Committee assigns attorney (Assign Attorney → In Review)
 * - moveToCloseout: Move request to closeout stage (In Review → Closeout)
 * - closeoutRequest: Complete the request (Closeout → Completed)
 */

import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists';
import { createSPUpdater } from 'spfx-toolkit/lib/utilities/listItemHelper';

import { Lists } from '@sp/Lists';
import { RequestsFields } from '@sp/listFields/RequestsFields';
import { initializePermissions, manageRequestPermissions } from '../azureFunctionService';
import { loadRequestById } from '../requestLoadService';
import { generateCorrelationId } from '../../utils/correlationId';
import { calculateAndUpdateStageTime } from '../timeTrackingService';

import type { ILegalRequest } from '@appTypes/requestTypes';
import { RequestStatus, LegalReviewStatus } from '@appTypes/workflowTypes';

import { getCurrentUserPrincipal, updateItem } from './workflowHelpers';
import type {
  IWorkflowActionResult,
  ISubmitRequestPayload,
  IAssignAttorneyPayload,
  ISendToCommitteePayload,
  ICloseoutPayload,
} from './workflowTypes';

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

    // Load current request to get title for permissions initialization
    const currentRequest = await loadRequestById(itemId);
    const requestTitle = currentRequest.requestId || `Request-${itemId}`;

    SPContext.logger.info('WorkflowActionService: Current request loaded for submission', {
      correlationId,
      itemId,
      requestTitle,
      currentStatus: currentRequest.status,
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

    // Initialize permissions via APIM (break inheritance and set initial permissions)
    // This is the first time permissions are set on submit (Draft → Legal Intake)
    try {
      await initializePermissions(itemId, requestTitle);
      SPContext.logger.info('WorkflowActionService: Permission initialization completed', { correlationId, itemId, requestTitle });
    } catch (permError) {
      SPContext.logger.warn('WorkflowActionService: Permission initialization failed (request was submitted)', permError);
      // Don't fail the action - permissions can be retried manually or by admin
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
 * Assign attorney directly or send to compliance review
 *
 * Transitions: Legal Intake → In Review
 *
 * For Legal/Both ReviewAudience:
 * - Status → In Review
 * - Attorney → Assigned attorney
 * - AttorneyAssignNotes → Notes (if provided)
 * - LegalReviewStatus → Not Started
 * - SubmittedForReviewBy → Current user
 * - SubmittedForReviewOn → Current timestamp
 *
 * For Compliance Only ReviewAudience (attorney is undefined):
 * - Status → In Review
 * - AttorneyAssignNotes → Notes (if provided)
 * - SubmittedForReviewBy → Current user
 * - SubmittedForReviewOn → Current timestamp
 * - (No attorney assigned, no legal review status)
 *
 * @param itemId - Request item ID
 * @param payload - Attorney assignment payload (attorney optional for Compliance Only)
 * @returns Workflow action result
 */
export async function assignAttorney(
  itemId: number,
  payload: IAssignAttorneyPayload
): Promise<IWorkflowActionResult> {
  const correlationId = generateCorrelationId('assignAttorney');
  const isComplianceOnly = !payload.attorney || payload.attorney.length === 0;

  SPContext.logger.info(isComplianceOnly ? 'WorkflowActionService: Sending to compliance review' : 'WorkflowActionService: Assigning attorney(s)', {
    correlationId,
    itemId,
    isComplianceOnly,
    attorneyCount: payload.attorney?.length ?? 0,
    attorneyNames: payload.attorney?.map(a => a.title).join(', '),
    hasNotes: !!payload.notes,
    reviewAudience: payload.reviewAudience,
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
  updater.setUser(RequestsFields.SubmittedForReviewBy, currentUser);
  updater.setDate(RequestsFields.SubmittedForReviewOn, now);

  // Only set attorney and legal review status if attorney(s) provided (not Compliance Only)
  if (payload.attorney && payload.attorney.length > 0) {
    updater.set(RequestsFields.Attorney, payload.attorney);
    updater.setChoice(RequestsFields.LegalReviewStatus, LegalReviewStatus.NotStarted);
  }

  // Always set notes field - overwrites any previous value
  if (payload.notes) {
    updater.setText(RequestsFields.AttorneyAssignNotes, payload.notes);
  }

  // Set review audience override if provided (Legal Admin can change from submitter's selection)
  if (payload.reviewAudience) {
    updater.setChoice(RequestsFields.ReviewAudience, payload.reviewAudience);
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
  await updateItem(itemId, updatePayload, isComplianceOnly ? 'sendToCompliance' : 'assignAttorney', correlationId);

  // Manage permissions for In Review status (attorney or compliance gets access)
  try {
    await manageRequestPermissions(itemId, RequestStatus.InReview);
  } catch (permError) {
    SPContext.logger.warn('WorkflowActionService: Permission management failed', permError);
  }

  // Reload and return result
  const updatedRequest = await loadRequestById(itemId);

  SPContext.logger.success(isComplianceOnly ? 'WorkflowActionService: Sent to compliance review successfully' : 'WorkflowActionService: Attorney assigned successfully', {
    correlationId,
    itemId,
    requestId: updatedRequest.requestId,
    attorney: payload.attorney?.map(a => a.title).join(', ') ?? 'None (Compliance Only)',
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

  SPContext.logger.info('WorkflowActionService: Sending to committee', {
    correlationId,
    itemId,
    reviewAudience: payload?.reviewAudience,
  });

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

  // Set review audience override if provided (Legal Admin can change from submitter's selection)
  if (payload?.reviewAudience) {
    updater.setChoice(RequestsFields.ReviewAudience, payload.reviewAudience);
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
 * Note: Attorney is required for committee assignment (unlike direct assignment which allows Compliance Only)
 *
 * @param itemId - Request item ID
 * @param payload - Attorney assignment payload
 * @returns Workflow action result
 */
export async function assignFromCommittee(
  itemId: number,
  payload: IAssignAttorneyPayload
): Promise<IWorkflowActionResult> {
  SPContext.logger.info('WorkflowActionService: Committee assigning attorney(s)', {
    itemId,
    attorneyCount: payload.attorney?.length ?? 0,
    attorneyNames: payload.attorney?.map(a => a.title).join(', '),
  });

  // Reuse assignAttorney logic - same fields updated
  return assignAttorney(itemId, payload);
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
 * Closeout request
 *
 * Transitions:
 * - Closeout → Awaiting Foreside Documents (if isForesideReviewRequired and isRetailUse are true)
 * - Closeout → Completed (if isForesideReviewRequired and isRetailUse are not both true)
 *
 * Fields updated:
 * - Status → Awaiting FINRA Documents OR Completed (based on isForesideReviewRequired)
 * - TrackingId → Tracking ID (if provided)
 * - CloseoutBy → Current user
 * - CloseoutOn → Current timestamp
 * - AwaitingFINRASince → Current timestamp (if routing to Awaiting FINRA Documents)
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

  // Load current request for time tracking and to check isForesideReviewRequired
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

  // Determine the next status based on isForesideReviewRequired AND isRetailUse
  // If both are required, route to Awaiting FINRA Documents
  // Otherwise, route directly to Completed
  const isForesideRequired = currentRequest.isForesideReviewRequired === true;
  const isRetailUse = currentRequest.isRetailUse === true;
  const shouldAwaitFinra = isForesideRequired && isRetailUse;
  const nextStatus = shouldAwaitFinra
    ? RequestStatus.AwaitingFINRADocuments
    : RequestStatus.Completed;

  SPContext.logger.info('WorkflowActionService: Determined next status after closeout', {
    correlationId,
    itemId,
    isForesideReviewRequired: isForesideRequired,
    isRetailUse,
    shouldAwaitFinra,
    nextStatus,
  });

  // Build update payload - closeout fields + time tracking
  const updater = createSPUpdater();
  updater.set(RequestsFields.Status, nextStatus);
  updater.set(RequestsFields.CloseoutBy, currentUser);
  updater.set(RequestsFields.CloseoutOn, now.toISOString());

  if (payload?.trackingId) {
    updater.set(RequestsFields.TrackingId, payload.trackingId);
  }

  // Add closeout notes if provided
  if (payload?.closeoutNotes) {
    updater.set(RequestsFields.CloseoutNotes, payload.closeoutNotes);
  }

  // Add comments acknowledged fields if provided (for "Approved with Comments" outcomes)
  if (payload?.commentsAcknowledged) {
    updater.set(RequestsFields.CommentsAcknowledged, true);
    updater.set(RequestsFields.CommentsAcknowledgedOn, now.toISOString());
  }

  // If routing to Awaiting FINRA Documents, set the timestamp
  if (shouldAwaitFinra) {
    updater.set(RequestsFields.AwaitingFINRASince, now.toISOString());
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

  // Manage permissions for the new status
  try {
    await manageRequestPermissions(itemId, nextStatus);
  } catch (permError) {
    SPContext.logger.warn('WorkflowActionService: Permission management failed (request was closed)', permError);
  }

  // Reload and return result
  const updatedRequest = await loadRequestById(itemId);

  SPContext.logger.success('WorkflowActionService: Request closed out successfully', {
    correlationId,
    itemId,
    requestId: updatedRequest.requestId,
    nextStatus,
    isForesideRequired,
    isRetailUse,
    shouldAwaitFinra,
    timeTracked: {
      closeoutReviewerHours: timeTrackingUpdates.closeoutReviewerHours,
      totalReviewerHours: timeTrackingUpdates.totalReviewerHours,
    },
  });

  return {
    success: true,
    itemId,
    newStatus: nextStatus,
    updatedRequest,
    fieldsUpdated,
    correlationId,
  };
}

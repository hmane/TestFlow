/**
 * Hold/Resume Actions
 *
 * Workflow actions for hold, resume, and cancel:
 * - holdRequest: Put request on hold
 * - resumeRequest: Resume from hold
 * - cancelRequest: Cancel a request
 */

import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists';
import { createSPUpdater } from 'spfx-toolkit/lib/utilities/listItemHelper';

import { RequestsFields } from '@sp/listFields/RequestsFields';
import { manageRequestPermissions } from '../azureFunctionService';
import { loadRequestById } from '../requestLoadService';
import { generateCorrelationId } from '../../utils/correlationId';
import { pauseTimeTracking, resumeTimeTracking } from '../timeTrackingService';

import type { ILegalRequest } from '@appTypes/requestTypes';
import { RequestStatus } from '@appTypes/workflowTypes';

import { getCurrentUserPrincipal, updateItem } from './workflowHelpers';
import type { IWorkflowActionResult, ICancelPayload, IHoldPayload } from './workflowTypes';

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

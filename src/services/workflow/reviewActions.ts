/**
 * Review Actions
 *
 * Workflow actions for submitting reviews:
 * - submitLegalReview: Submit legal review outcome
 * - submitComplianceReview: Submit compliance review outcome
 * - updateLegalReviewStatus: Update legal review status (in-progress tracking)
 * - updateComplianceReviewStatus: Update compliance review status (in-progress tracking)
 */

import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists';
import { createSPUpdater } from 'spfx-toolkit/lib/utilities/listItemHelper';

import { RequestsFields } from '@sp/listFields/RequestsFields';
import { manageRequestPermissions } from '../azureFunctionService';
import { loadRequestById } from '../requestLoadService';
import { generateCorrelationId } from '../../utils/correlationId';
import { calculateAndUpdateStageTime } from '../timeTrackingService';

import type { ILegalRequest } from '@appTypes/requestTypes';
import { RequestStatus, ReviewOutcome, LegalReviewStatus, ComplianceReviewStatus } from '@appTypes/workflowTypes';

import { getCurrentUserPrincipal, areAllReviewsComplete, updateItem } from './workflowHelpers';
import type { IWorkflowActionResult, ILegalReviewPayload, IComplianceReviewPayload } from './workflowTypes';

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

  // Determine the new review status based on outcome
  // RespondToCommentsAndResubmit means review is NOT complete - waiting on submitter to address comments
  const isResubmitRequired = payload.outcome === ReviewOutcome.RespondToCommentsAndResubmit;
  const newReviewStatus = isResubmitRequired
    ? LegalReviewStatus.WaitingOnSubmitter
    : LegalReviewStatus.Completed;

  updater.set(RequestsFields.LegalReviewStatus, newReviewStatus);
  updater.set(RequestsFields.LegalStatusUpdatedBy, currentUser);
  updater.set(RequestsFields.LegalStatusUpdatedOn, now.toISOString());

  // Only set completed fields when actually completing the review (not for resubmit workflow)
  if (!isResubmitRequired) {
    updater.set(RequestsFields.LegalReviewCompletedBy, currentUser);
    updater.set(RequestsFields.LegalReviewCompletedOn, now.toISOString());
  }

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
  // Only progress to Closeout when review is actually completed (not for resubmit workflow)
  const shouldProgressToCloseout = !isResubmitRequired && areAllReviewsComplete(
    currentRequest,
    newReviewStatus, // Use actual new status
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

  // Determine the new review status based on outcome
  // RespondToCommentsAndResubmit means review is NOT complete - waiting on submitter to address comments
  const isResubmitRequired = payload.outcome === ReviewOutcome.RespondToCommentsAndResubmit;
  const newReviewStatus = isResubmitRequired
    ? ComplianceReviewStatus.WaitingOnSubmitter
    : ComplianceReviewStatus.Completed;

  updater.set(RequestsFields.ComplianceReviewStatus, newReviewStatus);
  updater.set(RequestsFields.ComplianceStatusUpdatedBy, currentUser);
  updater.set(RequestsFields.ComplianceStatusUpdatedOn, now.toISOString());

  // Only set completed fields when actually completing the review (not for resubmit workflow)
  if (!isResubmitRequired) {
    updater.set(RequestsFields.ComplianceReviewCompletedBy, currentUser);
    updater.set(RequestsFields.ComplianceReviewCompletedOn, now.toISOString());
  }

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
  if (payload.recordRetentionOnly !== undefined) {
    updater.set(RequestsFields.RecordRetentionOnly, payload.recordRetentionOnly);
  }
  if (payload.isRetailUse !== undefined) {
    updater.set(RequestsFields.IsRetailUse, payload.isRetailUse);
  }

  // Check if all reviews will be complete after this submission
  // Only progress to Closeout when review is actually completed (not for resubmit workflow)
  const shouldProgressToCloseout = !isResubmitRequired && areAllReviewsComplete(
    currentRequest,
    undefined, // No change to legal status
    newReviewStatus // Use actual new status
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

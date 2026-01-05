/**
 * Resubmit Actions
 *
 * Workflow actions for the "Respond To Comments And Resubmit" workflow:
 * - resubmitForLegalReview: Submitter resubmits after addressing comments
 * - resubmitForComplianceReview: Submitter resubmits after addressing comments
 * - requestLegalReviewChanges: Attorney requests changes from submitter
 * - requestComplianceReviewChanges: Compliance reviewer requests changes from submitter
 */

import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists';
import { createSPUpdater } from 'spfx-toolkit/lib/utilities/listItemHelper';

import { RequestsFields } from '@sp/listFields/RequestsFields';
import { loadRequestById } from '../requestLoadService';
import { generateCorrelationId } from '../../utils/correlationId';
import { calculateAndUpdateStageTime } from '../timeTrackingService';

import type { ILegalRequest } from '@appTypes/requestTypes';
import { ReviewOutcome, LegalReviewStatus, ComplianceReviewStatus } from '@appTypes/workflowTypes';

import { getCurrentUserPrincipal, updateItem } from './workflowHelpers';
import type { IWorkflowActionResult, IResubmitLegalReviewPayload, IResubmitComplianceReviewPayload } from './workflowTypes';

/**
 * Resubmit request for legal review
 *
 * Called by submitter when they have addressed the reviewer's comments and are
 * ready for the attorney to review again.
 *
 * This is part of the "Respond To Comments And Resubmit" workflow where:
 * 1. Attorney sets outcome to "Respond To Comments And Resubmit"
 * 2. Review status changes to "Waiting On Submitter"
 * 3. Submitter addresses comments, updates request/documents/approvals
 * 4. Submitter clicks "Resubmit for Review" (this function)
 * 5. Review status changes to "Waiting On Attorney"
 * 6. Attorney reviews again and can repeat or set final outcome
 *
 * Fields updated:
 * - LegalReviewStatus → Waiting On Attorney
 * - LegalStatusUpdatedBy → Current user
 * - LegalStatusUpdatedOn → Current timestamp (resets time tracking for this phase)
 * - LegalReviewNotes → Notes (if provided, appended)
 *
 * Time Tracking:
 * - Calculates hours spent by submitter since status was "Waiting On Submitter"
 * - Adds to LegalReviewSubmitterHours
 * - Status timestamp update marks start of reviewer's next phase
 *
 * @param itemId - Request item ID
 * @param payload - Resubmit payload with optional notes
 * @returns Workflow action result
 */
export async function resubmitForLegalReview(
  itemId: number,
  payload?: IResubmitLegalReviewPayload
): Promise<IWorkflowActionResult> {
  const correlationId = generateCorrelationId('resubmitForLegalReview');

  SPContext.logger.info('WorkflowActionService: Resubmitting for legal review', {
    correlationId,
    itemId,
    hasNotes: !!payload?.notes,
  });

  // Load current request for time tracking calculation
  const currentRequest = await loadRequestById(itemId);

  // Validate current state - should be Waiting On Submitter with RespondToCommentsAndResubmit outcome
  if (currentRequest.legalReviewStatus !== LegalReviewStatus.WaitingOnSubmitter) {
    const errorMessage = `Cannot resubmit: Legal review status is "${currentRequest.legalReviewStatus}", expected "Waiting On Submitter"`;
    SPContext.logger.error('WorkflowActionService: Invalid state for resubmit', {
      correlationId,
      itemId,
      currentStatus: currentRequest.legalReviewStatus,
    });
    throw new Error(errorMessage);
  }

  if (currentRequest.legalReviewOutcome !== ReviewOutcome.RespondToCommentsAndResubmit) {
    const errorMessage = `Cannot resubmit: Legal review outcome is "${currentRequest.legalReviewOutcome}", expected "Respond To Comments And Resubmit"`;
    SPContext.logger.error('WorkflowActionService: Invalid outcome for resubmit', {
      correlationId,
      itemId,
      currentOutcome: currentRequest.legalReviewOutcome,
    });
    throw new Error(errorMessage);
  }

  const currentUser = getCurrentUserPrincipal();
  const now = new Date();

  // Calculate time tracking for submitter's work since "Waiting On Submitter"
  // This calculates business hours spent by submitter addressing comments
  let timeTrackingUpdates: Partial<ILegalRequest> = {};
  try {
    timeTrackingUpdates = await calculateAndUpdateStageTime(
      currentRequest,
      'LegalReview',
      'Attorney' // Handing back to attorney for re-review
    );
    SPContext.logger.info('WorkflowActionService: Time tracking calculated for legal resubmit', {
      correlationId,
      itemId,
      submitterHours: timeTrackingUpdates.legalReviewSubmitterHours,
      timeTrackingUpdates,
    });
  } catch (timeError) {
    // Log but don't fail - time tracking is secondary
    SPContext.logger.warn('WorkflowActionService: Time tracking calculation failed for legal resubmit', {
      correlationId,
      itemId,
      error: timeError instanceof Error ? timeError.message : String(timeError),
    });
  }

  // Build update payload
  const updater = createSPUpdater();

  // Change status to Waiting On Attorney - signals attorney that submitter is done
  // The outcome remains "Respond To Comments And Resubmit" until attorney sets final decision
  updater.set(RequestsFields.LegalReviewStatus, LegalReviewStatus.WaitingOnAttorney);
  updater.set(RequestsFields.LegalStatusUpdatedBy, currentUser);
  updater.set(RequestsFields.LegalStatusUpdatedOn, now.toISOString());

  // Add notes if provided (append-only field)
  if (payload?.notes) {
    updater.set(RequestsFields.LegalReviewNotes, payload.notes);
  }

  // Add time tracking fields
  if (timeTrackingUpdates.legalReviewSubmitterHours !== undefined) {
    updater.set(RequestsFields.LegalReviewSubmitterHours, timeTrackingUpdates.legalReviewSubmitterHours);
  }
  if (timeTrackingUpdates.totalSubmitterHours !== undefined) {
    updater.set(RequestsFields.TotalSubmitterHours, timeTrackingUpdates.totalSubmitterHours);
  }

  const updatePayload = updater.getUpdates();
  const fieldsUpdated = Object.keys(updatePayload);

  // Update SharePoint
  await updateItem(itemId, updatePayload, 'resubmitForLegalReview', correlationId);

  // Reload to get current state
  const updatedRequest = await loadRequestById(itemId);

  SPContext.logger.success('WorkflowActionService: Resubmitted for legal review', {
    correlationId,
    itemId,
    requestId: updatedRequest.requestId,
    newStatus: LegalReviewStatus.WaitingOnAttorney,
    submitterHours: timeTrackingUpdates.legalReviewSubmitterHours,
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
 * Resubmit request for compliance review
 *
 * Called by submitter when they have addressed the reviewer's comments and are
 * ready for the compliance reviewer to review again.
 *
 * This is part of the "Respond To Comments And Resubmit" workflow where:
 * 1. Compliance reviewer sets outcome to "Respond To Comments And Resubmit"
 * 2. Review status changes to "Waiting On Submitter"
 * 3. Submitter addresses comments, updates request/documents/approvals
 * 4. Submitter clicks "Resubmit for Review" (this function)
 * 5. Review status changes to "Waiting On Compliance"
 * 6. Compliance reviewer reviews again and can repeat or set final outcome
 *
 * Fields updated:
 * - ComplianceReviewStatus → Waiting On Compliance
 * - ComplianceStatusUpdatedBy → Current user
 * - ComplianceStatusUpdatedOn → Current timestamp (resets time tracking for this phase)
 * - ComplianceReviewNotes → Notes (if provided, appended)
 *
 * Time Tracking:
 * - Calculates hours spent by submitter since status was "Waiting On Submitter"
 * - Adds to ComplianceReviewSubmitterHours
 * - Status timestamp update marks start of reviewer's next phase
 *
 * @param itemId - Request item ID
 * @param payload - Resubmit payload with optional notes
 * @returns Workflow action result
 */
export async function resubmitForComplianceReview(
  itemId: number,
  payload?: IResubmitComplianceReviewPayload
): Promise<IWorkflowActionResult> {
  const correlationId = generateCorrelationId('resubmitForComplianceReview');

  SPContext.logger.info('WorkflowActionService: Resubmitting for compliance review', {
    correlationId,
    itemId,
    hasNotes: !!payload?.notes,
  });

  // Load current request for time tracking calculation
  const currentRequest = await loadRequestById(itemId);

  // Validate current state - should be Waiting On Submitter with RespondToCommentsAndResubmit outcome
  if (currentRequest.complianceReviewStatus !== ComplianceReviewStatus.WaitingOnSubmitter) {
    const errorMessage = `Cannot resubmit: Compliance review status is "${currentRequest.complianceReviewStatus}", expected "Waiting On Submitter"`;
    SPContext.logger.error('WorkflowActionService: Invalid state for resubmit', {
      correlationId,
      itemId,
      currentStatus: currentRequest.complianceReviewStatus,
    });
    throw new Error(errorMessage);
  }

  if (currentRequest.complianceReviewOutcome !== ReviewOutcome.RespondToCommentsAndResubmit) {
    const errorMessage = `Cannot resubmit: Compliance review outcome is "${currentRequest.complianceReviewOutcome}", expected "Respond To Comments And Resubmit"`;
    SPContext.logger.error('WorkflowActionService: Invalid outcome for resubmit', {
      correlationId,
      itemId,
      currentOutcome: currentRequest.complianceReviewOutcome,
    });
    throw new Error(errorMessage);
  }

  const currentUser = getCurrentUserPrincipal();
  const now = new Date();

  // Calculate time tracking for submitter's work since "Waiting On Submitter"
  // This calculates business hours spent by submitter addressing comments
  let timeTrackingUpdates: Partial<ILegalRequest> = {};
  try {
    timeTrackingUpdates = await calculateAndUpdateStageTime(
      currentRequest,
      'ComplianceReview',
      'Reviewer' // Handing back to compliance reviewer for re-review
    );
    SPContext.logger.info('WorkflowActionService: Time tracking calculated for compliance resubmit', {
      correlationId,
      itemId,
      submitterHours: timeTrackingUpdates.complianceReviewSubmitterHours,
      timeTrackingUpdates,
    });
  } catch (timeError) {
    // Log but don't fail - time tracking is secondary
    SPContext.logger.warn('WorkflowActionService: Time tracking calculation failed for compliance resubmit', {
      correlationId,
      itemId,
      error: timeError instanceof Error ? timeError.message : String(timeError),
    });
  }

  // Build update payload
  const updater = createSPUpdater();

  // Change status to Waiting On Compliance - signals reviewer that submitter is done
  // The outcome remains "Respond To Comments And Resubmit" until reviewer sets final decision
  updater.set(RequestsFields.ComplianceReviewStatus, ComplianceReviewStatus.WaitingOnCompliance);
  updater.set(RequestsFields.ComplianceStatusUpdatedBy, currentUser);
  updater.set(RequestsFields.ComplianceStatusUpdatedOn, now.toISOString());

  // Add notes if provided (append-only field)
  if (payload?.notes) {
    updater.set(RequestsFields.ComplianceReviewNotes, payload.notes);
  }

  // Add time tracking fields
  if (timeTrackingUpdates.complianceReviewSubmitterHours !== undefined) {
    updater.set(RequestsFields.ComplianceReviewSubmitterHours, timeTrackingUpdates.complianceReviewSubmitterHours);
  }
  if (timeTrackingUpdates.totalSubmitterHours !== undefined) {
    updater.set(RequestsFields.TotalSubmitterHours, timeTrackingUpdates.totalSubmitterHours);
  }

  const updatePayload = updater.getUpdates();
  const fieldsUpdated = Object.keys(updatePayload);

  // Update SharePoint
  await updateItem(itemId, updatePayload, 'resubmitForComplianceReview', correlationId);

  // Reload to get current state
  const updatedRequest = await loadRequestById(itemId);

  SPContext.logger.success('WorkflowActionService: Resubmitted for compliance review', {
    correlationId,
    itemId,
    requestId: updatedRequest.requestId,
    newStatus: ComplianceReviewStatus.WaitingOnCompliance,
    submitterHours: timeTrackingUpdates.complianceReviewSubmitterHours,
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
 * Set legal review to "Waiting On Submitter" (called when attorney sets RespondToCommentsAndResubmit outcome)
 *
 * This is called when the attorney submits a review with "Respond To Comments And Resubmit" outcome.
 * It handles the time tracking for the handoff from attorney to submitter.
 *
 * Note: This function is typically called internally when submitLegalReview() is invoked
 * with outcome = RespondToCommentsAndResubmit. However, it can also be called directly
 * if the attorney saves progress with this outcome.
 *
 * Fields updated:
 * - LegalReviewStatus → Waiting On Submitter
 * - LegalReviewOutcome → Respond To Comments And Resubmit
 * - LegalReviewNotes → Notes (if provided, appended)
 * - LegalStatusUpdatedBy → Current user
 * - LegalStatusUpdatedOn → Current timestamp
 *
 * Time Tracking:
 * - Calculates hours spent by attorney since last handoff
 * - Adds to LegalReviewAttorneyHours
 * - Status timestamp update marks start of submitter's response phase
 *
 * @param itemId - Request item ID
 * @param notes - Optional notes explaining what needs to be addressed
 * @returns Workflow action result
 */
export async function requestLegalReviewChanges(
  itemId: number,
  notes?: string
): Promise<IWorkflowActionResult> {
  const correlationId = generateCorrelationId('requestLegalReviewChanges');

  SPContext.logger.info('WorkflowActionService: Requesting changes for legal review', {
    correlationId,
    itemId,
    hasNotes: !!notes,
  });

  // Load current request for time tracking
  const currentRequest = await loadRequestById(itemId);

  const currentUser = getCurrentUserPrincipal();
  const now = new Date();

  // Calculate time tracking for attorney's work before handoff to submitter
  let timeTrackingUpdates: Partial<ILegalRequest> = {};
  try {
    timeTrackingUpdates = await calculateAndUpdateStageTime(
      currentRequest,
      'LegalReview',
      'Submitter' // Handing to submitter to address comments
    );
    SPContext.logger.info('WorkflowActionService: Time tracking calculated for legal review changes request', {
      correlationId,
      itemId,
      attorneyHours: timeTrackingUpdates.legalReviewAttorneyHours,
    });
  } catch (timeError) {
    SPContext.logger.warn('WorkflowActionService: Time tracking calculation failed', {
      correlationId,
      itemId,
      error: timeError instanceof Error ? timeError.message : String(timeError),
    });
  }

  // Build update payload
  const updater = createSPUpdater();

  // Set status to Waiting On Submitter and outcome to RespondToCommentsAndResubmit
  updater.set(RequestsFields.LegalReviewStatus, LegalReviewStatus.WaitingOnSubmitter);
  updater.set(RequestsFields.LegalReviewOutcome, ReviewOutcome.RespondToCommentsAndResubmit);
  updater.set(RequestsFields.LegalStatusUpdatedBy, currentUser);
  updater.set(RequestsFields.LegalStatusUpdatedOn, now.toISOString());

  // Add notes if provided
  if (notes) {
    updater.set(RequestsFields.LegalReviewNotes, notes);
  }

  // Add time tracking fields
  if (timeTrackingUpdates.legalReviewAttorneyHours !== undefined) {
    updater.set(RequestsFields.LegalReviewAttorneyHours, timeTrackingUpdates.legalReviewAttorneyHours);
  }
  if (timeTrackingUpdates.totalReviewerHours !== undefined) {
    updater.set(RequestsFields.TotalReviewerHours, timeTrackingUpdates.totalReviewerHours);
  }

  const updatePayload = updater.getUpdates();
  const fieldsUpdated = Object.keys(updatePayload);

  await updateItem(itemId, updatePayload, 'requestLegalReviewChanges', correlationId);

  const updatedRequest = await loadRequestById(itemId);

  SPContext.logger.success('WorkflowActionService: Legal review changes requested', {
    correlationId,
    itemId,
    requestId: updatedRequest.requestId,
    newStatus: LegalReviewStatus.WaitingOnSubmitter,
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
 * Set compliance review to "Waiting On Submitter" (called when reviewer sets RespondToCommentsAndResubmit outcome)
 *
 * This is called when the compliance reviewer submits a review with "Respond To Comments And Resubmit" outcome.
 * It handles the time tracking for the handoff from reviewer to submitter.
 *
 * Fields updated:
 * - ComplianceReviewStatus → Waiting On Submitter
 * - ComplianceReviewOutcome → Respond To Comments And Resubmit
 * - ComplianceReviewNotes → Notes (if provided, appended)
 * - ComplianceStatusUpdatedBy → Current user
 * - ComplianceStatusUpdatedOn → Current timestamp
 *
 * Time Tracking:
 * - Calculates hours spent by reviewer since last handoff
 * - Adds to ComplianceReviewReviewerHours
 * - Status timestamp update marks start of submitter's response phase
 *
 * @param itemId - Request item ID
 * @param notes - Optional notes explaining what needs to be addressed
 * @param isForesideReviewRequired - Optional flag
 * @param isRetailUse - Optional flag
 * @returns Workflow action result
 */
export async function requestComplianceReviewChanges(
  itemId: number,
  notes?: string,
  isForesideReviewRequired?: boolean,
  isRetailUse?: boolean
): Promise<IWorkflowActionResult> {
  const correlationId = generateCorrelationId('requestComplianceReviewChanges');

  SPContext.logger.info('WorkflowActionService: Requesting changes for compliance review', {
    correlationId,
    itemId,
    hasNotes: !!notes,
  });

  // Load current request for time tracking
  const currentRequest = await loadRequestById(itemId);

  const currentUser = getCurrentUserPrincipal();
  const now = new Date();

  // Calculate time tracking for reviewer's work before handoff to submitter
  let timeTrackingUpdates: Partial<ILegalRequest> = {};
  try {
    timeTrackingUpdates = await calculateAndUpdateStageTime(
      currentRequest,
      'ComplianceReview',
      'Submitter' // Handing to submitter to address comments
    );
    SPContext.logger.info('WorkflowActionService: Time tracking calculated for compliance review changes request', {
      correlationId,
      itemId,
      reviewerHours: timeTrackingUpdates.complianceReviewReviewerHours,
    });
  } catch (timeError) {
    SPContext.logger.warn('WorkflowActionService: Time tracking calculation failed', {
      correlationId,
      itemId,
      error: timeError instanceof Error ? timeError.message : String(timeError),
    });
  }

  // Build update payload
  const updater = createSPUpdater();

  // Set status to Waiting On Submitter and outcome to RespondToCommentsAndResubmit
  updater.set(RequestsFields.ComplianceReviewStatus, ComplianceReviewStatus.WaitingOnSubmitter);
  updater.set(RequestsFields.ComplianceReviewOutcome, ReviewOutcome.RespondToCommentsAndResubmit);
  updater.set(RequestsFields.ComplianceStatusUpdatedBy, currentUser);
  updater.set(RequestsFields.ComplianceStatusUpdatedOn, now.toISOString());

  // Add notes if provided
  if (notes) {
    updater.set(RequestsFields.ComplianceReviewNotes, notes);
  }

  // Optional flags
  if (isForesideReviewRequired !== undefined) {
    updater.set(RequestsFields.IsForesideReviewRequired, isForesideReviewRequired);
  }
  if (isRetailUse !== undefined) {
    updater.set(RequestsFields.IsRetailUse, isRetailUse);
  }

  // Add time tracking fields
  if (timeTrackingUpdates.complianceReviewReviewerHours !== undefined) {
    updater.set(RequestsFields.ComplianceReviewReviewerHours, timeTrackingUpdates.complianceReviewReviewerHours);
  }
  if (timeTrackingUpdates.totalReviewerHours !== undefined) {
    updater.set(RequestsFields.TotalReviewerHours, timeTrackingUpdates.totalReviewerHours);
  }

  const updatePayload = updater.getUpdates();
  const fieldsUpdated = Object.keys(updatePayload);

  await updateItem(itemId, updatePayload, 'requestComplianceReviewChanges', correlationId);

  const updatedRequest = await loadRequestById(itemId);

  SPContext.logger.success('WorkflowActionService: Compliance review changes requested', {
    correlationId,
    itemId,
    requestId: updatedRequest.requestId,
    newStatus: ComplianceReviewStatus.WaitingOnSubmitter,
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

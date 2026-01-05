/**
 * Save Progress Actions
 *
 * Workflow actions for saving review progress without completing:
 * - saveLegalReviewProgress: Save legal review work-in-progress
 * - saveComplianceReviewProgress: Save compliance review work-in-progress
 */

import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists';
import { createSPUpdater } from 'spfx-toolkit/lib/utilities/listItemHelper';

import { RequestsFields } from '@sp/listFields/RequestsFields';
import { loadRequestById } from '../requestLoadService';
import { generateCorrelationId } from '../../utils/correlationId';

import { LegalReviewStatus, ComplianceReviewStatus } from '@appTypes/workflowTypes';

import { getCurrentUserPrincipal, updateItem } from './workflowHelpers';
import type { IWorkflowActionResult, ILegalReviewSavePayload, IComplianceReviewSavePayload } from './workflowTypes';

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

  // Load current request to check if status is changing
  const currentRequest = await loadRequestById(itemId);
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

  // IMPORTANT: Only update timestamp if status is actually changing
  // This preserves time tracking - we track from when status first changed to "In Progress"
  const isStatusChanging = currentRequest.legalReviewStatus !== LegalReviewStatus.InProgress;
  if (isStatusChanging) {
    updater.set(RequestsFields.LegalStatusUpdatedOn, now.toISOString());
    SPContext.logger.info('WorkflowActionService: Legal review status changing to In Progress, updating timestamp', {
      correlationId,
      itemId,
      previousStatus: currentRequest.legalReviewStatus,
    });
  }

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

  // Load current request to check if status is changing
  const currentRequest = await loadRequestById(itemId);
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

  // IMPORTANT: Only update timestamp if status is actually changing
  // This preserves time tracking - we track from when status first changed to "In Progress"
  const isStatusChanging = currentRequest.complianceReviewStatus !== ComplianceReviewStatus.InProgress;
  if (isStatusChanging) {
    updater.set(RequestsFields.ComplianceStatusUpdatedOn, now.toISOString());
    SPContext.logger.info('WorkflowActionService: Compliance review status changing to In Progress, updating timestamp', {
      correlationId,
      itemId,
      previousStatus: currentRequest.complianceReviewStatus,
    });
  }

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

/**
 * FINRA Actions
 *
 * Workflow actions for FINRA document handling:
 * - completeFINRADocuments: Complete the FINRA documents phase
 */

import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists';
import { createSPUpdater } from 'spfx-toolkit/lib/utilities/listItemHelper';

import { RequestsFields } from '@sp/listFields/RequestsFields';
import { manageRequestPermissions } from '../azureFunctionService';
import { loadRequestById } from '../requestLoadService';
import { generateCorrelationId } from '../../utils/correlationId';

import { RequestStatus } from '@appTypes/workflowTypes';

import { getCurrentUserPrincipal, updateItem } from './workflowHelpers';
import type { IWorkflowActionResult, ICompleteFINRADocumentsPayload } from './workflowTypes';

/**
 * Complete FINRA documents phase
 *
 * Transitions: Awaiting FINRA Documents → Completed
 *
 * This is called by the Submitter or Super Admin when FINRA documents have been
 * uploaded and the request can be finalized. At least one FINRA document must
 * have been uploaded (validation done at the component level).
 *
 * Note: No time tracking is done for this phase as per requirements.
 *
 * Fields updated:
 * - Status → Completed
 * - FINRACompletedBy → Current user
 * - FINRACompletedOn → Current timestamp
 * - FINRANotes → Notes (if provided, appended)
 *
 * @param itemId - Request item ID
 * @param payload - Optional payload with notes
 * @returns Workflow action result
 */
export async function completeFINRADocuments(
  itemId: number,
  payload?: ICompleteFINRADocumentsPayload
): Promise<IWorkflowActionResult> {
  const correlationId = generateCorrelationId('completeFINRADocuments');

  SPContext.logger.info('WorkflowActionService: Completing FINRA documents phase', {
    correlationId,
    itemId,
    hasNotes: !!payload?.notes,
  });

  // Load current request to validate state
  const currentRequest = await loadRequestById(itemId);

  // Validate the request is in the correct state
  if (currentRequest.status !== RequestStatus.AwaitingFINRADocuments) {
    const errorMessage = `Cannot complete FINRA documents: Request status is "${currentRequest.status}", expected "Awaiting FINRA Documents"`;
    SPContext.logger.error('WorkflowActionService: Invalid state for FINRA completion', {
      correlationId,
      itemId,
      currentStatus: currentRequest.status,
    });
    throw new Error(errorMessage);
  }

  const currentUser = getCurrentUserPrincipal();
  const now = new Date();

  // Build update payload
  // Note: No time tracking for Awaiting FINRA Documents phase per requirements
  const updater = createSPUpdater();
  updater.set(RequestsFields.Status, RequestStatus.Completed);
  updater.set(RequestsFields.FINRACompletedBy, currentUser);
  updater.set(RequestsFields.FINRACompletedOn, now.toISOString());

  // Add notes if provided (append-only field)
  if (payload?.notes) {
    updater.set(RequestsFields.FINRANotes, payload.notes);
  }

  // Set comments received flag if provided
  if (payload?.finraCommentsReceived !== undefined) {
    updater.set(RequestsFields.FINRACommentsReceived, payload.finraCommentsReceived);
  }

  const updatePayload = updater.getUpdates();
  const fieldsUpdated = Object.keys(updatePayload);

  // Update SharePoint
  await updateItem(itemId, updatePayload, 'completeFINRADocuments', correlationId);

  // Manage permissions for Completed status
  try {
    await manageRequestPermissions(itemId, RequestStatus.Completed);
  } catch (permError) {
    SPContext.logger.warn('WorkflowActionService: Permission management failed for Completed status', permError);
  }

  // Reload to get current state
  const updatedRequest = await loadRequestById(itemId);

  SPContext.logger.success('WorkflowActionService: FINRA documents phase completed', {
    correlationId,
    itemId,
    requestId: updatedRequest.requestId,
    newStatus: RequestStatus.Completed,
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

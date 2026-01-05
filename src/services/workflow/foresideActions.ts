/**
 * Foreside Actions
 *
 * Workflow actions for Foreside document handling:
 * - completeForesideDocuments: Complete the Foreside documents phase
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
import type { IWorkflowActionResult, ICompleteForesideDocumentsPayload } from './workflowTypes';

/**
 * Complete Foreside documents phase
 *
 * Transitions: Awaiting Foreside Documents → Completed
 *
 * This is called by the Submitter or Super Admin when Foreside documents have been
 * uploaded and the request can be finalized. At least one Foreside document must
 * have been uploaded (validation done at the component level).
 *
 * Note: No time tracking is done for this phase as per requirements.
 *
 * Fields updated:
 * - Status → Completed
 * - ForesideCompletedBy → Current user
 * - ForesideCompletedOn → Current timestamp
 * - ForesideNotes → Notes (if provided, appended)
 *
 * @param itemId - Request item ID
 * @param payload - Optional payload with notes
 * @returns Workflow action result
 */
export async function completeForesideDocuments(
  itemId: number,
  payload?: ICompleteForesideDocumentsPayload
): Promise<IWorkflowActionResult> {
  const correlationId = generateCorrelationId('completeForesideDocuments');

  SPContext.logger.info('WorkflowActionService: Completing Foreside documents phase', {
    correlationId,
    itemId,
    hasNotes: !!payload?.notes,
  });

  // Load current request to validate state
  const currentRequest = await loadRequestById(itemId);

  // Validate the request is in the correct state
  if (currentRequest.status !== RequestStatus.AwaitingForesideDocuments) {
    const errorMessage = `Cannot complete Foreside documents: Request status is "${currentRequest.status}", expected "Awaiting Foreside Documents"`;
    SPContext.logger.error('WorkflowActionService: Invalid state for Foreside completion', {
      correlationId,
      itemId,
      currentStatus: currentRequest.status,
    });
    throw new Error(errorMessage);
  }

  const currentUser = getCurrentUserPrincipal();
  const now = new Date();

  // Build update payload
  // Note: No time tracking for Awaiting Foreside Documents phase per requirements
  const updater = createSPUpdater();
  updater.set(RequestsFields.Status, RequestStatus.Completed);
  updater.set(RequestsFields.ForesideCompletedBy, currentUser);
  updater.set(RequestsFields.ForesideCompletedOn, now.toISOString());

  // Add notes if provided (append-only field)
  if (payload?.notes) {
    updater.set(RequestsFields.ForesideNotes, payload.notes);
  }

  const updatePayload = updater.getUpdates();
  const fieldsUpdated = Object.keys(updatePayload);

  // Update SharePoint
  await updateItem(itemId, updatePayload, 'completeForesideDocuments', correlationId);

  // Manage permissions for Completed status
  try {
    await manageRequestPermissions(itemId, RequestStatus.Completed);
  } catch (permError) {
    SPContext.logger.warn('WorkflowActionService: Permission management failed for Completed status', permError);
  }

  // Reload to get current state
  const updatedRequest = await loadRequestById(itemId);

  SPContext.logger.success('WorkflowActionService: Foreside documents phase completed', {
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

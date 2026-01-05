/**
 * Workflow Helpers
 *
 * Shared utility functions for workflow actions.
 */

import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists';
import type { IPrincipal } from 'spfx-toolkit/lib/types';

import { Lists } from '@sp/Lists';
import type { ILegalRequest } from '@appTypes/requestTypes';
import { LegalReviewStatus, ComplianceReviewStatus, ReviewAudience } from '@appTypes/workflowTypes';

/**
 * Get current user as IPrincipal
 */
export function getCurrentUserPrincipal(): IPrincipal {
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
export function areAllReviewsComplete(
  request: ILegalRequest,
  newLegalStatus?: LegalReviewStatus,
  newComplianceStatus?: ComplianceReviewStatus
): boolean {
  const reviewAudience = request.reviewAudience;

  // Use new status if provided, otherwise use current status
  const legalStatus = newLegalStatus || request.legalReview?.status;
  const complianceStatus = newComplianceStatus || request.complianceReview?.status;

  SPContext.logger.info('WorkflowHelpers: Checking if all reviews complete', {
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
export async function updateItem(
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

/**
 * Request Save Service
 *
 * Handles all request save/update operations with hybrid permission management:
 * - Generic saveRequest() for flexible updates
 * - saveDraft() for draft operations
 * - Stage-specific functions that call Azure Functions synchronously for permissions
 *
 * This prevents "item not found" errors by ensuring permissions are set BEFORE
 * users continue (vs. async Flow that breaks inheritance later).
 */

import { SPContext } from 'spfx-toolkit';
import type { IPrincipal } from 'spfx-toolkit/lib/types';
import { createSPUpdater } from 'spfx-toolkit/lib/utilities/listItemHelper';

import { Lists } from '@sp/Lists';
import { RequestsFields } from '@sp/listFields/RequestsFields';
import { manageRequestPermissions } from './azureFunctionService';
import { loadRequestById } from './requestLoadService';

import type { ILegalRequest } from '@appTypes/requestTypes';
import { RequestStatus, ReviewOutcome } from '@appTypes/workflowTypes';

// Type aliases for review outcomes
type LegalReviewOutcome = ReviewOutcome;
type ComplianceReviewOutcome = ReviewOutcome;

/**
 * Check if a value is considered "empty" (null, undefined, empty string, empty array)
 */
function isEmptyValue(value: any): boolean {
  return (
    value === null ||
    value === undefined ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}

/**
 * Filter out fields from update payload where both original and new values are empty.
 * This prevents creating SharePoint versions with payloads like {TargetReturnDate: null, DateOfFirstUse: null}
 *
 * SPUpdater handles change detection, but it DOES include fields where both values are null.
 * This post-processor removes those truly empty updates.
 */
function filterEmptyUpdates(
  updates: Record<string, any>,
  newData: ILegalRequest,
  originalData: ILegalRequest
): Record<string, any> {
  const filtered: Record<string, any> = {};

  // Field name to domain model property mapping
  const fieldMapping: Record<string, keyof ILegalRequest> = {
    'TargetReturnDate': 'targetReturnDate',
    'DateOfFirstUse': 'dateOfFirstUse',
    'RushRationale': 'rushRationale',
    'Department': 'department',
    'PriorSubmissionNotes': 'priorSubmissionNotes',
    'TrackingId': 'trackingId',
    'DistributionMethod': 'distributionMethod',
    'PriorSubmissionsId': 'priorSubmissions',
    'AdditionalPartyId': 'additionalParty',
  };

  // ES5 compatible iteration
  for (const fieldName in updates) {
    if (Object.prototype.hasOwnProperty.call(updates, fieldName)) {
      const value = updates[fieldName];
      const domainProperty = fieldMapping[fieldName];

      if (domainProperty) {
        // Check if both original and new values are empty
        const newValue = newData[domainProperty];
        const oldValue = originalData[domainProperty];

        if (isEmptyValue(newValue) && isEmptyValue(oldValue)) {
          // Skip this field - both are empty
          continue;
        }
      }

      // Include this field in the update
      filtered[fieldName] = value;
    }
  }

  return filtered;
}

/**
 * Map domain model to SharePoint update payload
 * Uses SPUpdater for automatic change detection, type normalization, and SharePoint format conversion
 *
 * @param request - Current request data
 * @param originalRequest - Optional original request data for change detection
 * @returns SharePoint update payload with only changed fields
 */
export function buildRequestUpdatePayload(
  request: ILegalRequest,
  originalRequest?: ILegalRequest
): Record<string, any> {
  const updater = createSPUpdater();

  // Only include fields that have changed
  if (originalRequest) {
    // Basic request information
    updater.set('RequestTitle', request.requestTitle, originalRequest.requestTitle);
    updater.set('Purpose', request.purpose, originalRequest.purpose);
    updater.set('RequestType', request.requestType, originalRequest.requestType);
    updater.set('SubmissionType', request.submissionType, originalRequest.submissionType);
    updater.set('SubmissionItem', request.submissionItem, originalRequest.submissionItem);

    // Date fields - pass Date objects directly (not ISO strings)
    // SPUpdater handles date normalization and comparison
    updater.set('TargetReturnDate', request.targetReturnDate, originalRequest.targetReturnDate);
    updater.set('DateOfFirstUse', request.dateOfFirstUse, originalRequest.dateOfFirstUse);

    updater.set('ReviewAudience', request.reviewAudience, originalRequest.reviewAudience);
    updater.set('IsRushRequest', request.isRushRequest, originalRequest.isRushRequest);
    updater.set('RushRationale', request.rushRationale, originalRequest.rushRationale);
    updater.set(
      'RequiresCommunicationsApproval',
      request.requiresCommunicationsApproval,
      originalRequest.requiresCommunicationsApproval
    );
    updater.set('Status', request.status, originalRequest.status);
    updater.set('Department', request.department, originalRequest.department);

    // Multi-choice field - pass array directly (not wrapped with {results: []})
    // SPUpdater automatically wraps multi-value fields in SharePoint format
    updater.set('DistributionMethod', request.distributionMethod, originalRequest.distributionMethod);

    updater.set('PriorSubmissionNotes', request.priorSubmissionNotes, originalRequest.priorSubmissionNotes);
    updater.set('TrackingId', request.trackingId, originalRequest.trackingId);

    // Multi-value lookup fields - pass arrays directly
    // SPUpdater handles ID extraction and {results: []} wrapping automatically
    updater.set('PriorSubmissionsId', request.priorSubmissions, originalRequest.priorSubmissions);
    updater.set('AdditionalParty', request.additionalParty, originalRequest.additionalParty);

    // Get updates from SPUpdater (includes automatic change detection)
    const updates = updater.getUpdates();

    // Filter out fields where both original and new values are empty
    // This prevents payloads like {TargetReturnDate: null, DateOfFirstUse: null}
    return filterEmptyUpdates(updates, request, originalRequest);
  } else {
    // New request - include all fields
    // Helper to convert empty arrays to null for lookup fields
    const priorSubmissionsIds = request.priorSubmissions?.map(ps => ps.id).filter(id => id !== undefined) || [];
    const additionalPartyIds = request.additionalParty?.map(p => p.id).filter(id => id !== undefined) || [];

    // Build payload with proper null/undefined handling
    const payload: Record<string, any> = {
      Title: request.requestId,
      RequestType: request.requestType,
      RequestTitle: request.requestTitle,
      Purpose: request.purpose || '',
      SubmissionType: request.submissionType,
      ReviewAudience: request.reviewAudience,
      IsRushRequest: request.isRushRequest,
      RequiresCommunicationsApproval: request.requiresCommunicationsApproval,
      Status: request.status,
    };

    // Add optional fields only if they have values
    if (request.submissionItem) {
      payload.SubmissionItem = request.submissionItem;
    }

    if (request.targetReturnDate) {
      payload.TargetReturnDate = request.targetReturnDate.toISOString();
    }

    if (request.rushRationale) {
      payload.RushRationale = request.rushRationale;
    }

    if (request.department) {
      payload.Department = request.department;
    }

    // Multi-choice field - use SharePoint format with results array
    if (request.distributionMethod && request.distributionMethod.length > 0) {
      payload.DistributionMethod = { results: request.distributionMethod };
    }

    // Lookup fields - only add if there are actual IDs
    if (priorSubmissionsIds.length > 0) {
      payload.PriorSubmissionsId = { results: priorSubmissionsIds };
    }

    if (request.priorSubmissionNotes) {
      payload.PriorSubmissionNotes = request.priorSubmissionNotes;
    }

    if (request.dateOfFirstUse) {
      payload.DateOfFirstUse = request.dateOfFirstUse.toISOString();
    }

    // User lookup field - only add if there are actual IDs
    if (additionalPartyIds.length > 0) {
      payload.AdditionalPartyId = { results: additionalPartyIds };
    }

    if (request.trackingId) {
      payload.TrackingId = request.trackingId;
    }

    return payload;
  }
}

/**
 * Check if request has any changes compared to original
 *
 * Uses SPUpdater change detection to determine if save is needed.
 *
 * @param currentData - Current request data
 * @param originalData - Original request data to compare against
 * @returns True if there are changes, false otherwise
 */
export function hasRequestChanges(
  currentData: ILegalRequest,
  originalData: ILegalRequest
): boolean {
  const payload = buildRequestUpdatePayload(currentData, originalData);
  return Object.keys(payload).length > 0;
}

/**
 * Get list of changed fields between current and original request
 *
 * Uses SPUpdater change detection to identify modified fields.
 *
 * @param currentData - Current request data
 * @param originalData - Original request data to compare against
 * @returns Array of SharePoint field names that have changed
 */
export function getChangedFields(
  currentData: ILegalRequest,
  originalData: ILegalRequest
): string[] {
  const payload = buildRequestUpdatePayload(currentData, originalData);
  return Object.keys(payload);
}

/**
 * Pad number with leading zeros
 */
function padNumber(num: number, size: number): string {
  let s = num.toString();
  while (s.length < size) {
    s = '0' + s;
  }
  return s;
}

/**
 * Generate request ID in format CRR-YYYY-####
 *
 * Gets the last request created in current year and increments the number.
 *
 * @returns Promise resolving to new request ID
 */
export async function generateRequestId(): Promise<string> {
  const currentYear = new Date().getFullYear();

  try {
    SPContext.logger.info('RequestSaveService: Generating request ID', { year: currentYear });

    // Get the last request created this year
    const items = await SPContext.sp.web.lists
      .getByTitle(Lists.Requests.Title)
      .items.select(RequestsFields.RequestId)
      .filter(`startswith(${RequestsFields.RequestId},'CRR-${currentYear}')`)
      .orderBy(RequestsFields.Created, false)
      .top(1)();

    let nextNumber = 1;

    if (items.length > 0) {
      const lastRequestId = items[0].Title;
      const parts = lastRequestId.split('-');

      if (parts.length === 3) {
        const lastNumber = parseInt(parts[2], 10);
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }
    }

    const paddedNumber = padNumber(nextNumber, 4);
    const requestId = `CRR-${currentYear}-${paddedNumber}`;

    SPContext.logger.info('RequestSaveService: Request ID generated', { requestId });

    return requestId;

  } catch (error: unknown) {
    SPContext.logger.error('RequestSaveService: Failed to generate request ID', error);
    // Fallback to timestamp-based ID
    return `CRR-${currentYear}-${Date.now()}`;
  }
}

/**
 * Generic save request (flexible, no validation)
 *
 * Updates any fields without business logic or permission management.
 * Use for: auto-save, admin edits, single field updates.
 *
 * Includes change detection - will skip save if no changes detected (when originalData provided).
 *
 * @param itemId - SharePoint list item ID
 * @param data - Request data to update (full or partial)
 * @param originalData - Optional original data for change detection
 * @returns Promise resolving to save result with updated request data
 */
export async function saveRequest(
  itemId: number,
  data: Partial<ILegalRequest>,
  originalData?: ILegalRequest
): Promise<{ saved: boolean; updatedRequest?: ILegalRequest }> {
  try {
    SPContext.logger.info('RequestSaveService: Saving request', { itemId });

    let payload: Record<string, any>;

    if (originalData) {
      // With originalData: use change detection (merge data with originalData)
      const mergedData = { ...originalData, ...data };
      payload = buildRequestUpdatePayload(mergedData as ILegalRequest, originalData);

      // Check if there are any updates to perform
      if (Object.keys(payload).length === 0) {
        SPContext.logger.info('RequestSaveService: No changes detected - skipping save', { itemId });
        return { saved: false };
      }
    } else {
      // Without originalData: partial update without change detection
      payload = buildRequestUpdatePayload(data as ILegalRequest);
    }

    SPContext.logger.info('RequestSaveService: Saving changes', {
      itemId,
      changedFields: Object.keys(payload),
    });

    // Update SharePoint item
    await SPContext.sp.web.lists
      .getByTitle(Lists.Requests.Title)
      .items.getById(itemId)
      .update(payload);

    SPContext.logger.success('RequestSaveService: Request saved successfully', { itemId });

    // Reload request data from SharePoint
    const updatedRequest = await loadRequestById(itemId);

    return { saved: true, updatedRequest };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    SPContext.logger.error('RequestSaveService: Failed to save request', error, { itemId });
    throw new Error(`Failed to save request ${itemId}: ${errorMessage}`);
  }
}

/**
 * Save as draft (create new or update existing)
 *
 * If itemId is provided, updates existing draft.
 * If itemId is undefined, creates new draft with auto-generated RequestID.
 *
 * Includes change detection for updates - will skip save if no changes.
 *
 * @param itemId - Existing item ID (undefined for new draft)
 * @param data - Request data (will be merged with status: Draft)
 * @param originalData - Optional original data for change detection (updates only)
 * @returns Promise resolving to object with itemId, saved flag, and updated request data
 */
export async function saveDraft(
  itemId: number | undefined,
  data: ILegalRequest,
  originalData?: ILegalRequest
): Promise<{ itemId: number; saved: boolean; updatedRequest?: ILegalRequest }> {
  try {
    SPContext.logger.info('RequestSaveService: Saving draft', { itemId, isNew: !itemId });

    if (itemId) {
      // Update existing draft - use saveRequest with change detection
      const mergedData = { ...data, status: RequestStatus.Draft };
      const mergedOriginal = originalData ? { ...originalData, status: RequestStatus.Draft } : undefined;

      const result = await saveRequest(itemId, mergedData as ILegalRequest, mergedOriginal as ILegalRequest);

      if (!result.saved) {
        SPContext.logger.info('RequestSaveService: Draft not saved - no changes detected', { itemId });
      }

      return { itemId, saved: result.saved, updatedRequest: result.updatedRequest };

    } else {
      // Create new draft
      const requestId = await generateRequestId();

      // Build payload using buildRequestUpdatePayload (passing undefined for originalRequest)
      const draftData = {
        ...data,
        requestId,
        status: RequestStatus.Draft,
      } as ILegalRequest;

      const payload = buildRequestUpdatePayload(draftData);

      const result = await SPContext.sp.web.lists
        .getByTitle(Lists.Requests.Title)
        .items.add(payload);

      const newItemId = result.data.Id;

      SPContext.logger.success('RequestSaveService: Draft created', { itemId: newItemId, requestId });

      // Reload the created draft
      const updatedRequest = await loadRequestById(newItemId);

      return { itemId: newItemId, saved: true, updatedRequest };
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    SPContext.logger.error('RequestSaveService: Failed to save draft', error, { itemId });
    throw new Error(`Failed to save draft: ${errorMessage}`);
  }
}

/**
 * Submit request for review (hybrid with permission management)
 *
 * Updates status to InReview and calls Azure Function synchronously
 * to set permissions BEFORE user continues.
 *
 * Flow will trigger for notifications (async, no UX impact).
 *
 * @param itemId - Request item ID
 * @param data - Additional data to update
 * @returns Promise resolving when submit completes
 */
export async function submitForReview(
  itemId: number,
  data: Partial<ILegalRequest>
): Promise<void> {
  try {
    SPContext.logger.info('RequestSaveService: Submitting for review', { itemId });

    // 1. Update SharePoint item
    await saveRequest(itemId, {
      ...data,
      status: RequestStatus.InReview,
      submittedOn: new Date(),
      submittedBy: {
        id: SPContext.currentUser.id.toString(),
        email: SPContext.currentUser.email,
        title: SPContext.currentUser.title,
      },
    });

    // 2. Manage permissions synchronously (CRITICAL - prevents "item not found")
    await manageRequestPermissions(itemId, RequestStatus.InReview);

    SPContext.logger.success('RequestSaveService: Request submitted successfully', { itemId });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    SPContext.logger.error('RequestSaveService: Failed to submit request', error, { itemId });

    // TODO: Consider rollback logic if permission management fails
    // Could revert status back to Draft or set error state

    throw new Error(`Failed to submit request: ${errorMessage}`);
  }
}

/**
 * Assign attorney to request (hybrid with permission management)
 *
 * @param itemId - Request item ID
 * @param attorney - Attorney to assign
 * @param notes - Optional assignment notes
 * @returns Promise resolving when assignment completes
 */
export async function assignAttorney(
  itemId: number,
  attorney: IPrincipal,
  notes?: string
): Promise<void> {
  try {
    SPContext.logger.info('RequestSaveService: Assigning attorney', { itemId, attorneyId: attorney.id });

    // 1. Update SharePoint
    await saveRequest(itemId, {
      attorney,
      attorneyAssignNotes: notes,
    });

    // 2. Manage permissions (attorney now gets access)
    await manageRequestPermissions(itemId, RequestStatus.InReview);

    SPContext.logger.success('RequestSaveService: Attorney assigned successfully', { itemId });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    SPContext.logger.error('RequestSaveService: Failed to assign attorney', error, { itemId });
    throw new Error(`Failed to assign attorney: ${errorMessage}`);
  }
}

/**
 * Submit legal review
 *
 * @param itemId - Request item ID
 * @param outcome - Review outcome
 * @param notes - Review notes
 * @returns Promise resolving when review submitted
 */
export async function submitLegalReview(
  itemId: number,
  outcome: LegalReviewOutcome,
  notes: string
): Promise<void> {
  try {
    SPContext.logger.info('RequestSaveService: Submitting legal review', { itemId, outcome });

    await saveRequest(itemId, {
      legalReviewOutcome: outcome,
      legalReviewNotes: notes,
      legalStatusUpdatedOn: new Date(),
      legalStatusUpdatedBy: {
        id: SPContext.currentUser.id.toString(),
        email: SPContext.currentUser.email,
        title: SPContext.currentUser.title,
      },
    });

    SPContext.logger.success('RequestSaveService: Legal review submitted', { itemId });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    SPContext.logger.error('RequestSaveService: Failed to submit legal review', error, { itemId });
    throw new Error(`Failed to submit legal review: ${errorMessage}`);
  }
}

/**
 * Submit compliance review
 *
 * @param itemId - Request item ID
 * @param outcome - Review outcome
 * @param notes - Review notes
 * @param flags - Optional flags (foreside review, retail use)
 * @returns Promise resolving when review submitted
 */
export async function submitComplianceReview(
  itemId: number,
  outcome: ComplianceReviewOutcome,
  notes: string,
  flags?: { isForesideReviewRequired?: boolean; isRetailUse?: boolean }
): Promise<void> {
  try {
    SPContext.logger.info('RequestSaveService: Submitting compliance review', { itemId, outcome });

    await saveRequest(itemId, {
      complianceReviewOutcome: outcome,
      complianceReviewNotes: notes,
      isForesideReviewRequired: flags?.isForesideReviewRequired,
      isRetailUse: flags?.isRetailUse,
      complianceStatusUpdatedOn: new Date(),
      complianceStatusUpdatedBy: {
        id: SPContext.currentUser.id.toString(),
        email: SPContext.currentUser.email,
        title: SPContext.currentUser.title,
      },
    });

    SPContext.logger.success('RequestSaveService: Compliance review submitted', { itemId });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    SPContext.logger.error('RequestSaveService: Failed to submit compliance review', error, { itemId });
    throw new Error(`Failed to submit compliance review: ${errorMessage}`);
  }
}

/**
 * Close out request (hybrid with permission management)
 *
 * @param itemId - Request item ID
 * @param trackingId - Optional tracking ID
 * @returns Promise resolving when closeout completes
 */
export async function closeoutRequest(
  itemId: number,
  trackingId?: string
): Promise<void> {
  try {
    SPContext.logger.info('RequestSaveService: Closing out request', { itemId, trackingId });

    // 1. Update SharePoint
    await saveRequest(itemId, {
      status: RequestStatus.Completed,
      trackingId,
      closeoutOn: new Date(),
      closeoutBy: {
        id: SPContext.currentUser.id.toString(),
        email: SPContext.currentUser.email,
        title: SPContext.currentUser.title,
      },
    });

    // 2. Manage permissions (restore original permissions or set to read-only)
    await manageRequestPermissions(itemId, RequestStatus.Completed);

    SPContext.logger.success('RequestSaveService: Request closed out successfully', { itemId });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    SPContext.logger.error('RequestSaveService: Failed to close out request', error, { itemId });
    throw new Error(`Failed to close out request: ${errorMessage}`);
  }
}

/**
 * Cancel request (hybrid with permission management)
 *
 * @param itemId - Request item ID
 * @param reason - Cancellation reason
 * @returns Promise resolving when cancellation completes
 */
export async function cancelRequest(
  itemId: number,
  reason: string
): Promise<void> {
  try {
    SPContext.logger.info('RequestSaveService: Cancelling request', { itemId });

    // 1. Update SharePoint
    await saveRequest(itemId, {
      status: RequestStatus.Cancelled,
      cancelReason: reason,
      cancelledOn: new Date(),
      cancelledBy: {
        id: SPContext.currentUser.id.toString(),
        email: SPContext.currentUser.email,
        title: SPContext.currentUser.title,
      },
    });

    // 2. Manage permissions
    await manageRequestPermissions(itemId, RequestStatus.Cancelled);

    SPContext.logger.success('RequestSaveService: Request cancelled successfully', { itemId });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    SPContext.logger.error('RequestSaveService: Failed to cancel request', error, { itemId });
    throw new Error(`Failed to cancel request: ${errorMessage}`);
  }
}

/**
 * Put request on hold
 *
 * @param itemId - Request item ID
 * @param reason - Hold reason
 * @returns Promise resolving when hold completes
 */
export async function holdRequest(
  itemId: number,
  reason: string
): Promise<void> {
  try {
    SPContext.logger.info('RequestSaveService: Putting request on hold', { itemId });

    await saveRequest(itemId, {
      status: RequestStatus.OnHold,
      onHoldReason: reason,
      onHoldSince: new Date(),
      onHoldBy: {
        id: SPContext.currentUser.id.toString(),
        email: SPContext.currentUser.email,
        title: SPContext.currentUser.title,
      },
    });

    SPContext.logger.success('RequestSaveService: Request put on hold', { itemId });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    SPContext.logger.error('RequestSaveService: Failed to put request on hold', error, { itemId });
    throw new Error(`Failed to put request on hold: ${errorMessage}`);
  }
}

/**
 * Resume request from hold
 *
 * @param itemId - Request item ID
 * @param previousStatus - Status to resume to
 * @returns Promise resolving when resume completes
 */
export async function resumeRequest(
  itemId: number,
  previousStatus: RequestStatus
): Promise<void> {
  try {
    SPContext.logger.info('RequestSaveService: Resuming request', { itemId, previousStatus });

    await saveRequest(itemId, {
      status: previousStatus,
      previousStatus: RequestStatus.OnHold,
      onHoldReason: undefined,
      onHoldSince: undefined,
      onHoldBy: undefined,
    });

    SPContext.logger.success('RequestSaveService: Request resumed', { itemId });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    SPContext.logger.error('RequestSaveService: Failed to resume request', error, { itemId });
    throw new Error(`Failed to resume request: ${errorMessage}`);
  }
}

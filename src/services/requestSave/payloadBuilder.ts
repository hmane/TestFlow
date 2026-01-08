/**
 * Payload Builder
 *
 * Builds SharePoint update payloads from domain model data.
 */

import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import { createSPUpdater } from 'spfx-toolkit/lib/utilities/listItemHelper';

import { RequestsFields } from '@sp/listFields/RequestsFields';
import type { ILegalRequest } from '@appTypes/requestTypes';
import { ReviewAudience, LegalReviewStatus, ComplianceReviewStatus } from '@appTypes/workflowTypes';

import { mapApprovalsToSharePointFields } from './approvalMapper';

/**
 * Check if a value is considered "empty" (null, undefined, empty string, empty array)
 */
function isEmptyValue(value: unknown): boolean {
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
    'PriorSubmissions': 'priorSubmissions',
    'AdditionalParty': 'additionalParty',
    // Legal/Compliance status fields that may be null
    'LegalStatusUpdatedOn': 'legalStatusUpdatedOn',
    'LegalStatusUpdatedBy': 'legalStatusUpdatedBy',
    'LegalReviewCompletedOn': 'legalReviewCompletedOn',
    'LegalReviewCompletedBy': 'legalReviewCompletedBy',
    'ComplianceStatusUpdatedOn': 'complianceStatusUpdatedOn',
    'ComplianceStatusUpdatedBy': 'complianceStatusUpdatedBy',
    'ComplianceReviewCompletedOn': 'complianceReviewCompletedOn',
    'ComplianceReviewCompletedBy': 'complianceReviewCompletedBy',
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
    updater.set(RequestsFields.RequestTitle, request.requestTitle, originalRequest.requestTitle);
    updater.set(RequestsFields.Purpose, request.purpose, originalRequest.purpose);
    updater.set(RequestsFields.RequestType, request.requestType, originalRequest.requestType);
    updater.set(RequestsFields.SubmissionType, request.submissionType, originalRequest.submissionType);
    updater.set(RequestsFields.SubmissionItem, request.submissionItem, originalRequest.submissionItem);

    // Date fields - pass Date objects directly (not ISO strings)
    updater.set(RequestsFields.TargetReturnDate, request.targetReturnDate, originalRequest.targetReturnDate);
    updater.set(RequestsFields.DateOfFirstUse, request.dateOfFirstUse, originalRequest.dateOfFirstUse);

    updater.set(RequestsFields.ReviewAudience, request.reviewAudience, originalRequest.reviewAudience);

    // When review audience changes (Legal Admin override), adjust review statuses accordingly
    if (request.reviewAudience !== originalRequest.reviewAudience) {
      const requiresLegal = request.reviewAudience === ReviewAudience.Legal || request.reviewAudience === ReviewAudience.Both;
      const requiresCompliance = request.reviewAudience === ReviewAudience.Compliance || request.reviewAudience === ReviewAudience.Both;

      // Only adjust statuses if they haven't been started yet
      const legalNotStarted = !originalRequest.legalReviewStatus ||
        originalRequest.legalReviewStatus === LegalReviewStatus.NotRequired ||
        originalRequest.legalReviewStatus === LegalReviewStatus.NotStarted;
      const complianceNotStarted = !originalRequest.complianceReviewStatus ||
        originalRequest.complianceReviewStatus === ComplianceReviewStatus.NotRequired ||
        originalRequest.complianceReviewStatus === ComplianceReviewStatus.NotStarted;

      // Set Legal Review Status based on new audience
      if (legalNotStarted) {
        const newLegalStatus = requiresLegal ? LegalReviewStatus.NotStarted : LegalReviewStatus.NotRequired;
        updater.set(RequestsFields.LegalReviewStatus, newLegalStatus, originalRequest.legalReviewStatus);
      }

      // Set Compliance Review Status based on new audience
      if (complianceNotStarted) {
        const newComplianceStatus = requiresCompliance ? ComplianceReviewStatus.NotStarted : ComplianceReviewStatus.NotRequired;
        updater.set(RequestsFields.ComplianceReviewStatus, newComplianceStatus, originalRequest.complianceReviewStatus);
      }

      SPContext.logger.info('RequestSaveService: Review audience changed, adjusted review statuses', {
        oldAudience: originalRequest.reviewAudience,
        newAudience: request.reviewAudience,
        requiresLegal,
        requiresCompliance,
        legalStatusAdjusted: legalNotStarted,
        complianceStatusAdjusted: complianceNotStarted,
      });
    }

    updater.set(RequestsFields.IsRushRequest, request.isRushRequest, originalRequest.isRushRequest);
    updater.set(RequestsFields.RushRationale, request.rushRationale, originalRequest.rushRationale);
    updater.set(RequestsFields.Status, request.status, originalRequest.status);
    updater.set(RequestsFields.Department, request.department, originalRequest.department);

    // Attorney fields - validate that attorney has id before saving
    const attorneyValue = request.attorney && request.attorney.id ? request.attorney : null;
    const origAttorneyValue = originalRequest.attorney && originalRequest.attorney.id ? originalRequest.attorney : null;
    updater.set(RequestsFields.Attorney, attorneyValue, origAttorneyValue);
    updater.set(RequestsFields.AttorneyAssignNotes, request.attorneyAssignNotes, originalRequest.attorneyAssignNotes);

    // Multi-choice field - pass array directly
    updater.set(RequestsFields.DistributionMethod, request.distributionMethod, originalRequest.distributionMethod);

    updater.set(RequestsFields.PriorSubmissionNotes, request.priorSubmissionNotes, originalRequest.priorSubmissionNotes);
    updater.set(RequestsFields.TrackingId, request.trackingId, originalRequest.trackingId);

    // Multi-value lookup/user fields
    updater.set(RequestsFields.PriorSubmissions, request.priorSubmissions, originalRequest.priorSubmissions);
    updater.set(RequestsFields.AdditionalParty, request.additionalParty, originalRequest.additionalParty);

    // FINRA Audience & Product Fields
    updater.set(RequestsFields.FINRAAudienceCategory, request.finraAudienceCategory, originalRequest.finraAudienceCategory);
    updater.set(RequestsFields.Audience, request.audience, originalRequest.audience);
    updater.set(RequestsFields.USFunds, request.usFunds, originalRequest.usFunds);
    updater.set(RequestsFields.UCITS, request.ucits, originalRequest.ucits);
    updater.set(RequestsFields.SeparateAcctStrategies, request.separateAcctStrategies, originalRequest.separateAcctStrategies);
    updater.set(RequestsFields.SeparateAcctStrategiesIncl, request.separateAcctStrategiesIncl, originalRequest.separateAcctStrategiesIncl);

    // Legal Review fields
    updater.set(RequestsFields.LegalReviewStatus, request.legalReviewStatus, originalRequest.legalReviewStatus);
    updater.set(RequestsFields.LegalReviewOutcome, request.legalReviewOutcome, originalRequest.legalReviewOutcome);
    updater.set(RequestsFields.LegalReviewNotes, request.legalReviewNotes, originalRequest.legalReviewNotes);
    updater.set(RequestsFields.LegalStatusUpdatedOn, request.legalStatusUpdatedOn, originalRequest.legalStatusUpdatedOn);
    updater.set(RequestsFields.LegalStatusUpdatedBy, request.legalStatusUpdatedBy, originalRequest.legalStatusUpdatedBy);
    updater.set(RequestsFields.LegalReviewCompletedOn, request.legalReviewCompletedOn, originalRequest.legalReviewCompletedOn);
    updater.set(RequestsFields.LegalReviewCompletedBy, request.legalReviewCompletedBy, originalRequest.legalReviewCompletedBy);

    // Compliance Review fields
    updater.set(RequestsFields.ComplianceReviewStatus, request.complianceReviewStatus, originalRequest.complianceReviewStatus);
    updater.set(RequestsFields.ComplianceReviewOutcome, request.complianceReviewOutcome, originalRequest.complianceReviewOutcome);
    updater.set(RequestsFields.ComplianceReviewNotes, request.complianceReviewNotes, originalRequest.complianceReviewNotes);
    updater.set(RequestsFields.IsForesideReviewRequired, request.isForesideReviewRequired, originalRequest.isForesideReviewRequired);
    updater.set(RequestsFields.IsRetailUse, request.isRetailUse, originalRequest.isRetailUse);
    updater.set(RequestsFields.ComplianceStatusUpdatedOn, request.complianceStatusUpdatedOn, originalRequest.complianceStatusUpdatedOn);
    updater.set(RequestsFields.ComplianceStatusUpdatedBy, request.complianceStatusUpdatedBy, originalRequest.complianceStatusUpdatedBy);
    updater.set(RequestsFields.ComplianceReviewCompletedOn, request.complianceReviewCompletedOn, originalRequest.complianceReviewCompletedOn);
    updater.set(RequestsFields.ComplianceReviewCompletedBy, request.complianceReviewCompletedBy, originalRequest.complianceReviewCompletedBy);

    // Time Tracking fields
    updater.set(RequestsFields.LegalIntakeLegalAdminHours, request.legalIntakeLegalAdminHours, originalRequest.legalIntakeLegalAdminHours);
    updater.set(RequestsFields.LegalIntakeSubmitterHours, request.legalIntakeSubmitterHours, originalRequest.legalIntakeSubmitterHours);
    updater.set(RequestsFields.LegalReviewAttorneyHours, request.legalReviewAttorneyHours, originalRequest.legalReviewAttorneyHours);
    updater.set(RequestsFields.LegalReviewSubmitterHours, request.legalReviewSubmitterHours, originalRequest.legalReviewSubmitterHours);
    updater.set(RequestsFields.ComplianceReviewReviewerHours, request.complianceReviewReviewerHours, originalRequest.complianceReviewReviewerHours);
    updater.set(RequestsFields.ComplianceReviewSubmitterHours, request.complianceReviewSubmitterHours, originalRequest.complianceReviewSubmitterHours);
    updater.set(RequestsFields.CloseoutReviewerHours, request.closeoutReviewerHours, originalRequest.closeoutReviewerHours);
    updater.set(RequestsFields.CloseoutSubmitterHours, request.closeoutSubmitterHours, originalRequest.closeoutSubmitterHours);
    updater.set(RequestsFields.TotalReviewerHours, request.totalReviewerHours, originalRequest.totalReviewerHours);
    updater.set(RequestsFields.TotalSubmitterHours, request.totalSubmitterHours, originalRequest.totalSubmitterHours);

    // Map approvals array to individual SharePoint fields
    mapApprovalsToSharePointFields(updater, request.approvals, originalRequest.approvals);

    // Get updates from SPUpdater (includes automatic change detection)
    const updates = updater.getUpdates();

    // Filter out fields where both original and new values are empty
    return filterEmptyUpdates(updates, request, originalRequest);
  } else {
    // New request - use SPUpdater for consistent field formatting
    const newUpdater = createSPUpdater();

    // Required fields - always set for new request
    newUpdater.set(RequestsFields.RequestId, request.requestId, undefined);
    newUpdater.set(RequestsFields.RequestType, request.requestType, undefined);
    newUpdater.set(RequestsFields.RequestTitle, request.requestTitle, undefined);
    newUpdater.set(RequestsFields.Purpose, request.purpose || '', undefined);
    newUpdater.set(RequestsFields.SubmissionType, request.submissionType, undefined);
    newUpdater.set(RequestsFields.ReviewAudience, request.reviewAudience, undefined);
    newUpdater.set(RequestsFields.IsRushRequest, request.isRushRequest, undefined);
    newUpdater.set(RequestsFields.Status, request.status, undefined);

    // Optional fields - only set if they have values
    if (request.submissionItem) {
      newUpdater.set(RequestsFields.SubmissionItem, request.submissionItem, undefined);
    }
    if (request.targetReturnDate) {
      newUpdater.set(RequestsFields.TargetReturnDate, request.targetReturnDate, undefined);
    }
    if (request.rushRationale) {
      newUpdater.set(RequestsFields.RushRationale, request.rushRationale, undefined);
    }
    if (request.department) {
      newUpdater.set(RequestsFields.Department, request.department, undefined);
    }
    if (request.priorSubmissionNotes) {
      newUpdater.set(RequestsFields.PriorSubmissionNotes, request.priorSubmissionNotes, undefined);
    }
    if (request.dateOfFirstUse) {
      newUpdater.set(RequestsFields.DateOfFirstUse, request.dateOfFirstUse, undefined);
    }
    if (request.trackingId) {
      newUpdater.set(RequestsFields.TrackingId, request.trackingId, undefined);
    }
    if (request.attorneyAssignNotes) {
      newUpdater.set(RequestsFields.AttorneyAssignNotes, request.attorneyAssignNotes, undefined);
    }

    // Multi-choice fields
    if (request.distributionMethod && request.distributionMethod.length > 0) {
      newUpdater.set(RequestsFields.DistributionMethod, request.distributionMethod, undefined);
    }
    if (request.finraAudienceCategory && request.finraAudienceCategory.length > 0) {
      newUpdater.set(RequestsFields.FINRAAudienceCategory, request.finraAudienceCategory, undefined);
    }
    if (request.audience && request.audience.length > 0) {
      newUpdater.set(RequestsFields.Audience, request.audience, undefined);
    }
    if (request.usFunds && request.usFunds.length > 0) {
      newUpdater.set(RequestsFields.USFunds, request.usFunds, undefined);
    }
    if (request.ucits && request.ucits.length > 0) {
      newUpdater.set(RequestsFields.UCITS, request.ucits, undefined);
    }
    if (request.separateAcctStrategies && request.separateAcctStrategies.length > 0) {
      newUpdater.set(RequestsFields.SeparateAcctStrategies, request.separateAcctStrategies, undefined);
    }
    if (request.separateAcctStrategiesIncl && request.separateAcctStrategiesIncl.length > 0) {
      newUpdater.set(RequestsFields.SeparateAcctStrategiesIncl, request.separateAcctStrategiesIncl, undefined);
    }

    // User fields
    if (request.attorney && request.attorney.id) {
      newUpdater.set(RequestsFields.Attorney, request.attorney, undefined);
    }

    // Multi-user field
    if (request.additionalParty && request.additionalParty.length > 0) {
      newUpdater.set(RequestsFields.AdditionalParty, request.additionalParty, undefined);
    }

    // Multi-lookup field
    if (request.priorSubmissions && request.priorSubmissions.length > 0) {
      newUpdater.set(RequestsFields.PriorSubmissions, request.priorSubmissions, undefined);
    }

    // Map approvals
    mapApprovalsToSharePointFields(newUpdater, request.approvals);

    return newUpdater.getUpdates();
  }
}

/**
 * Check if request has any changes compared to original
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
 */
export function getChangedFields(
  currentData: ILegalRequest,
  originalData: ILegalRequest
): string[] {
  const payload = buildRequestUpdatePayload(currentData, originalData);
  return Object.keys(payload);
}

/**
 * Build a partial update payload for direct field updates
 */
export function buildPartialUpdatePayload(data: Partial<ILegalRequest>): Record<string, any> {
  const updater = createSPUpdater();

  // Helper to conditionally set a field only if it's explicitly provided
  const setIfDefined = <T>(field: string, value: T | undefined, original?: T): void => {
    if (value !== undefined) {
      updater.set(field, value, original);
    }
  };

  // Status and workflow fields
  setIfDefined(RequestsFields.Status, data.status);
  setIfDefined(RequestsFields.ReviewAudience, data.reviewAudience);
  setIfDefined(RequestsFields.PreviousStatus, data.previousStatus);

  // Attorney fields
  if (data.attorney !== undefined) {
    const attorneyValue = data.attorney && data.attorney.id ? data.attorney : null;
    updater.set(RequestsFields.Attorney, attorneyValue, undefined);
  }
  setIfDefined(RequestsFields.AttorneyAssignNotes, data.attorneyAssignNotes);

  // Legal Review fields
  setIfDefined(RequestsFields.LegalReviewStatus, data.legalReviewStatus);
  setIfDefined(RequestsFields.LegalReviewOutcome, data.legalReviewOutcome);
  setIfDefined(RequestsFields.LegalReviewNotes, data.legalReviewNotes);
  setIfDefined(RequestsFields.LegalStatusUpdatedOn, data.legalStatusUpdatedOn);
  if (data.legalStatusUpdatedBy !== undefined) {
    updater.set(RequestsFields.LegalStatusUpdatedBy, data.legalStatusUpdatedBy, undefined);
  }
  setIfDefined(RequestsFields.LegalReviewCompletedOn, data.legalReviewCompletedOn);
  if (data.legalReviewCompletedBy !== undefined) {
    updater.set(RequestsFields.LegalReviewCompletedBy, data.legalReviewCompletedBy, undefined);
  }

  // Compliance Review fields
  setIfDefined(RequestsFields.ComplianceReviewStatus, data.complianceReviewStatus);
  setIfDefined(RequestsFields.ComplianceReviewOutcome, data.complianceReviewOutcome);
  setIfDefined(RequestsFields.ComplianceReviewNotes, data.complianceReviewNotes);
  setIfDefined(RequestsFields.IsForesideReviewRequired, data.isForesideReviewRequired);
  setIfDefined(RequestsFields.IsRetailUse, data.isRetailUse);
  setIfDefined(RequestsFields.ComplianceStatusUpdatedOn, data.complianceStatusUpdatedOn);
  if (data.complianceStatusUpdatedBy !== undefined) {
    updater.set(RequestsFields.ComplianceStatusUpdatedBy, data.complianceStatusUpdatedBy, undefined);
  }
  setIfDefined(RequestsFields.ComplianceReviewCompletedOn, data.complianceReviewCompletedOn);
  if (data.complianceReviewCompletedBy !== undefined) {
    updater.set(RequestsFields.ComplianceReviewCompletedBy, data.complianceReviewCompletedBy, undefined);
  }

  // Closeout fields
  setIfDefined(RequestsFields.TrackingId, data.trackingId);
  setIfDefined(RequestsFields.CloseoutOn, data.closeoutOn);
  if (data.closeoutBy !== undefined) {
    updater.set(RequestsFields.CloseoutBy, data.closeoutBy, undefined);
  }
  setIfDefined(RequestsFields.CloseoutNotes, data.closeoutNotes);
  setIfDefined(RequestsFields.CommentsAcknowledged, data.commentsAcknowledged);
  setIfDefined(RequestsFields.CommentsAcknowledgedOn, data.commentsAcknowledgedOn);

  // Submission tracking fields
  setIfDefined(RequestsFields.SubmittedOn, data.submittedOn);
  if (data.submittedBy !== undefined) {
    updater.set(RequestsFields.SubmittedBy, data.submittedBy, undefined);
  }
  setIfDefined(RequestsFields.SubmittedForReviewOn, data.submittedForReviewOn);
  if (data.submittedForReviewBy !== undefined) {
    updater.set(RequestsFields.SubmittedForReviewBy, data.submittedForReviewBy, undefined);
  }

  // Cancel fields
  setIfDefined(RequestsFields.CancelReason, data.cancelReason);
  setIfDefined(RequestsFields.CancelledOn, data.cancelledOn);
  if (data.cancelledBy !== undefined) {
    updater.set(RequestsFields.CancelledBy, data.cancelledBy, undefined);
  }

  // On Hold fields
  setIfDefined(RequestsFields.OnHoldReason, data.onHoldReason);
  setIfDefined(RequestsFields.OnHoldSince, data.onHoldSince);
  if (data.onHoldBy !== undefined) {
    updater.set(RequestsFields.OnHoldBy, data.onHoldBy, undefined);
  }

  // FINRA Documents fields
  setIfDefined(RequestsFields.AwaitingFINRASince, data.awaitingFINRASince);
  setIfDefined(RequestsFields.FINRANotes, data.finraNotes);
  setIfDefined(RequestsFields.FINRACompletedOn, data.finraCompletedOn);
  if (data.finraCompletedBy !== undefined) {
    updater.set(RequestsFields.FINRACompletedBy, data.finraCompletedBy, undefined);
  }

  // Time tracking fields
  setIfDefined(RequestsFields.LegalIntakeLegalAdminHours, data.legalIntakeLegalAdminHours);
  setIfDefined(RequestsFields.LegalIntakeSubmitterHours, data.legalIntakeSubmitterHours);
  setIfDefined(RequestsFields.LegalReviewAttorneyHours, data.legalReviewAttorneyHours);
  setIfDefined(RequestsFields.LegalReviewSubmitterHours, data.legalReviewSubmitterHours);
  setIfDefined(RequestsFields.ComplianceReviewReviewerHours, data.complianceReviewReviewerHours);
  setIfDefined(RequestsFields.ComplianceReviewSubmitterHours, data.complianceReviewSubmitterHours);
  setIfDefined(RequestsFields.CloseoutReviewerHours, data.closeoutReviewerHours);
  setIfDefined(RequestsFields.CloseoutSubmitterHours, data.closeoutSubmitterHours);
  setIfDefined(RequestsFields.TotalReviewerHours, data.totalReviewerHours);
  setIfDefined(RequestsFields.TotalSubmitterHours, data.totalSubmitterHours);

  return updater.getUpdates();
}

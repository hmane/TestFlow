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

import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import type { IPrincipal } from 'spfx-toolkit/lib/types';
import { createSPUpdater } from 'spfx-toolkit/lib/utilities/listItemHelper';

import { Lists } from '@sp/Lists';
import { RequestsFields } from '@sp/listFields/RequestsFields';
import { manageRequestPermissions } from './azureFunctionService';
import { loadRequestById } from './requestLoadService';
import { batchUploadFiles, deleteFile, renameFile } from './documentService';

import type { ILegalRequest } from '@appTypes/requestTypes';
import { RequestStatus, ReviewOutcome } from '@appTypes/workflowTypes';
import { ApprovalType } from '@appTypes/approvalTypes';
import type { IStagedDocument, IDocument } from '@stores/documentsStore';

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
 * Map approvals array to individual SharePoint fields
 *
 * Each approval type is stored as separate fields in SharePoint:
 * - Communications: RequiresCommunicationsApproval, CommunicationsApprover, CommunicationsApprovalDate
 * - Portfolio Manager: HasPortfolioManagerApproval, PortfolioManager, PortfolioManagerApprovalDate
 * - Research Analyst: HasResearchAnalystApproval, ResearchAnalyst, ResearchAnalystApprovalDate
 * - SME: HasSMEApproval, SubjectMatterExpert, SMEApprovalDate
 * - Performance: HasPerformanceApproval, PerformanceApprover, PerformanceApprovalDate
 * - Other: HasOtherApproval, OtherApproval, OtherApprovalDate, OtherApprovalTitle
 *
 * IMPORTANT: This function does NOT validate data completeness.
 * - Boolean flag is set to true if approval exists in array (regardless of data)
 * - Approver/date fields are saved as-is, even if empty/null (for draft mode)
 * - Validation happens in the form layer before submission, not here
 * - Documents are uploaded separately via processPendingDocuments()
 */
function mapApprovalsToSharePointFields(
  updater: ReturnType<typeof createSPUpdater>,
  newApprovals: ILegalRequest['approvals'],
  originalApprovals?: ILegalRequest['approvals']
): void {
  // Create lookup maps for easy access
  const newApprovalsMap = new Map<ApprovalType, any>();
  const originalApprovalsMap = new Map<ApprovalType, any>();

  // Populate new approvals map
  if (newApprovals && Array.isArray(newApprovals)) {
    for (let i = 0; i < newApprovals.length; i++) {
      const approval = newApprovals[i];
      if (approval && approval.type) {
        newApprovalsMap.set(approval.type, approval);
      }
    }
  }

  // Populate original approvals map
  if (originalApprovals && Array.isArray(originalApprovals)) {
    for (let i = 0; i < originalApprovals.length; i++) {
      const approval = originalApprovals[i];
      if (approval && approval.type) {
        originalApprovalsMap.set(approval.type, approval);
      }
    }
  }

  // Map Communications approval
  const commApproval = newApprovalsMap.get(ApprovalType.Communications);
  const origCommApproval = originalApprovalsMap.get(ApprovalType.Communications);

  // Set boolean to true if approval exists in array (no validation)
  updater.set('RequiresCommunicationsApproval', !!commApproval, !!origCommApproval);

  if (commApproval) {
    // Validate approver has id before saving (same pattern as other approvers)
    const approverValue = commApproval.approver && commApproval.approver.id ? commApproval.approver : null;
    const origApproverValue = origCommApproval?.approver && origCommApproval.approver.id ? origCommApproval.approver : null;
    updater.set('CommunicationsApprover', approverValue, origApproverValue);
    updater.set('CommunicationsApprovalDate', commApproval.approvalDate, origCommApproval?.approvalDate);
    updater.set('CommunicationsApprovalNotes', commApproval.notes, origCommApproval?.notes);
  } else if (origCommApproval) {
    // Approval was removed - clear the fields
    const origApproverValue = origCommApproval.approver && origCommApproval.approver.id ? origCommApproval.approver : null;
    updater.set('CommunicationsApprover', null, origApproverValue);
    updater.set('CommunicationsApprovalDate', null, origCommApproval.approvalDate);
    updater.set('CommunicationsApprovalNotes', null, origCommApproval.notes);
  }

  // Map Portfolio Manager approval
  const pmApproval = newApprovalsMap.get(ApprovalType.PortfolioManager);
  const origPmApproval = originalApprovalsMap.get(ApprovalType.PortfolioManager);

  updater.set('HasPortfolioManagerApproval', !!pmApproval, !!origPmApproval);

  if (pmApproval) {
    const approverValue = pmApproval.approver && pmApproval.approver.id ? pmApproval.approver : null;
    const origApproverValue = origPmApproval?.approver && origPmApproval.approver.id ? origPmApproval.approver : null;
    updater.set('PortfolioManager', approverValue, origApproverValue);
    updater.set('PortfolioManagerApprovalDate', pmApproval.approvalDate, origPmApproval?.approvalDate);
    updater.set('PortfolioMgrApprovalNotes', pmApproval.notes, origPmApproval?.notes);
  } else if (origPmApproval) {
    updater.set('PortfolioManager', null, origPmApproval.approver);
    updater.set('PortfolioManagerApprovalDate', null, origPmApproval.approvalDate);
    updater.set('PortfolioMgrApprovalNotes', null, origPmApproval.notes);
  }

  // Map Research Analyst approval
  const raApproval = newApprovalsMap.get(ApprovalType.ResearchAnalyst);
  const origRaApproval = originalApprovalsMap.get(ApprovalType.ResearchAnalyst);

  updater.set('HasResearchAnalystApproval', !!raApproval, !!origRaApproval);

  if (raApproval) {
    const approverValue = raApproval.approver && raApproval.approver.id ? raApproval.approver : null;
    const origApproverValue = origRaApproval?.approver && origRaApproval.approver.id ? origRaApproval.approver : null;
    updater.set('ResearchAnalyst', approverValue, origApproverValue);
    updater.set('ResearchAnalystApprovalDate', raApproval.approvalDate, origRaApproval?.approvalDate);
    updater.set('ResearchAnalystApprovalNotes', raApproval.notes, origRaApproval?.notes);
  } else if (origRaApproval) {
    updater.set('ResearchAnalyst', null, origRaApproval.approver);
    updater.set('ResearchAnalystApprovalDate', null, origRaApproval.approvalDate);
    updater.set('ResearchAnalystApprovalNotes', null, origRaApproval.notes);
  }

  // Map Subject Matter Expert approval
  const smeApproval = newApprovalsMap.get(ApprovalType.SubjectMatterExpert);
  const origSmeApproval = originalApprovalsMap.get(ApprovalType.SubjectMatterExpert);

  updater.set('HasSMEApproval', !!smeApproval, !!origSmeApproval);

  if (smeApproval) {
    const approverValue = smeApproval.approver && smeApproval.approver.id ? smeApproval.approver : null;
    const origApproverValue = origSmeApproval?.approver && origSmeApproval.approver.id ? origSmeApproval.approver : null;
    updater.set('SubjectMatterExpert', approverValue, origApproverValue);
    updater.set('SMEApprovalDate', smeApproval.approvalDate, origSmeApproval?.approvalDate);
    updater.set('SMEApprovalNotes', smeApproval.notes, origSmeApproval?.notes);
  } else if (origSmeApproval) {
    updater.set('SubjectMatterExpert', null, origSmeApproval.approver);
    updater.set('SMEApprovalDate', null, origSmeApproval.approvalDate);
    updater.set('SMEApprovalNotes', null, origSmeApproval.notes);
  }

  // Map Performance approval
  const perfApproval = newApprovalsMap.get(ApprovalType.Performance);
  const origPerfApproval = originalApprovalsMap.get(ApprovalType.Performance);

  updater.set('HasPerformanceApproval', !!perfApproval, !!origPerfApproval);

  if (perfApproval) {
    const approverValue = perfApproval.approver && perfApproval.approver.id ? perfApproval.approver : null;
    const origApproverValue = origPerfApproval?.approver && origPerfApproval.approver.id ? origPerfApproval.approver : null;
    updater.set('PerformanceApprover', approverValue, origApproverValue);
    updater.set('PerformanceApprovalDate', perfApproval.approvalDate, origPerfApproval?.approvalDate);
    updater.set('PerformanceApprovalNotes', perfApproval.notes, origPerfApproval?.notes);
  } else if (origPerfApproval) {
    updater.set('PerformanceApprover', null, origPerfApproval.approver);
    updater.set('PerformanceApprovalDate', null, origPerfApproval.approvalDate);
    updater.set('PerformanceApprovalNotes', null, origPerfApproval.notes);
  }

  // Map Other approval
  const otherApproval = newApprovalsMap.get(ApprovalType.Other);
  const origOtherApproval = originalApprovalsMap.get(ApprovalType.Other);

  updater.set('HasOtherApproval', !!otherApproval, !!origOtherApproval);

  if (otherApproval) {
    const approverValue = otherApproval.approver && otherApproval.approver.id ? otherApproval.approver : null;
    const origApproverValue = origOtherApproval?.approver && origOtherApproval.approver.id ? origOtherApproval.approver : null;
    updater.set('OtherApproval', approverValue, origApproverValue);
    updater.set('OtherApprovalDate', otherApproval.approvalDate, origOtherApproval?.approvalDate);
    updater.set('OtherApprovalNotes', otherApproval.notes, origOtherApproval?.notes);
    // Other approval has a custom title field
    const otherTyped = otherApproval as any;
    const origOtherTyped = origOtherApproval as any;
    updater.set('OtherApprovalTitle', otherTyped.approvalTitle, origOtherTyped?.approvalTitle);
  } else if (origOtherApproval) {
    updater.set('OtherApproval', null, origOtherApproval.approver);
    updater.set('OtherApprovalDate', null, origOtherApproval.approvalDate);
    updater.set('OtherApprovalNotes', null, origOtherApproval.notes);
    const origOtherTyped = origOtherApproval as any;
    updater.set('OtherApprovalTitle', null, origOtherTyped?.approvalTitle);
  }
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
    updater.set(RequestsFields.RequestTitle, request.requestTitle, originalRequest.requestTitle);
    updater.set(RequestsFields.Purpose, request.purpose, originalRequest.purpose);
    updater.set(RequestsFields.RequestType, request.requestType, originalRequest.requestType);
    updater.set(RequestsFields.SubmissionType, request.submissionType, originalRequest.submissionType);
    updater.set(RequestsFields.SubmissionItem, request.submissionItem, originalRequest.submissionItem);

    // Date fields - pass Date objects directly (not ISO strings)
    // SPUpdater handles date normalization and comparison
    updater.set(RequestsFields.TargetReturnDate, request.targetReturnDate, originalRequest.targetReturnDate);
    updater.set(RequestsFields.DateOfFirstUse, request.dateOfFirstUse, originalRequest.dateOfFirstUse);

    updater.set(RequestsFields.ReviewAudience, request.reviewAudience, originalRequest.reviewAudience);
    updater.set(RequestsFields.IsRushRequest, request.isRushRequest, originalRequest.isRushRequest);
    updater.set(RequestsFields.RushRationale, request.rushRationale, originalRequest.rushRationale);
    updater.set(RequestsFields.Status, request.status, originalRequest.status);
    updater.set(RequestsFields.Department, request.department, originalRequest.department);

    // Attorney fields - validate that attorney has id before saving
    const attorneyValue = request.attorney && request.attorney.id ? request.attorney : null;
    const origAttorneyValue = originalRequest.attorney && originalRequest.attorney.id ? originalRequest.attorney : null;
    updater.set(RequestsFields.Attorney, attorneyValue, origAttorneyValue);
    updater.set(RequestsFields.AttorneyAssignNotes, request.attorneyAssignNotes, originalRequest.attorneyAssignNotes);

    // Multi-choice field - pass array directly (not wrapped with {results: []})
    // SPUpdater automatically wraps multi-value fields in SharePoint format
    updater.set(RequestsFields.DistributionMethod, request.distributionMethod, originalRequest.distributionMethod);

    updater.set(RequestsFields.PriorSubmissionNotes, request.priorSubmissionNotes, originalRequest.priorSubmissionNotes);
    updater.set(RequestsFields.TrackingId, request.trackingId, originalRequest.trackingId);

    // Multi-value lookup fields - pass arrays directly
    // SPUpdater handles ID extraction and {results: []} wrapping automatically
    updater.set(RequestsFields.PriorSubmissions + 'Id', request.priorSubmissions, originalRequest.priorSubmissions);
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
    // This handles RequiresCommunicationsApproval and all approval-specific fields
    mapApprovalsToSharePointFields(updater, request.approvals, originalRequest.approvals);

    // Get updates from SPUpdater (includes automatic change detection)
    const updates = updater.getUpdates();

    // Filter out fields where both original and new values are empty
    // This prevents payloads like {TargetReturnDate: null, DateOfFirstUse: null}
    return filterEmptyUpdates(updates, request, originalRequest);
  } else {
    // New request - include all fields
    // Helper to extract numeric IDs for multi-lookup/multi-user fields
    // SharePoint expects array of numbers, not strings or objects
    const priorSubmissionsIds = request.priorSubmissions
      ?.map(ps => typeof ps.id === 'string' ? parseInt(ps.id, 10) : ps.id)
      .filter((id): id is number => id !== undefined && !isNaN(id)) || [];
    const additionalPartyIds = request.additionalParty
      ?.map(p => typeof p.id === 'string' ? parseInt(p.id, 10) : p.id)
      .filter((id): id is number => id !== undefined && !isNaN(id)) || [];

    // Build payload with proper null/undefined handling
    const payload: Record<string, any> = {
      [RequestsFields.RequestId]: request.requestId,
      [RequestsFields.RequestType]: request.requestType,
      [RequestsFields.RequestTitle]: request.requestTitle,
      [RequestsFields.Purpose]: request.purpose || '',
      [RequestsFields.SubmissionType]: request.submissionType,
      [RequestsFields.ReviewAudience]: request.reviewAudience,
      [RequestsFields.IsRushRequest]: request.isRushRequest,
      [RequestsFields.Status]: request.status,
    };

    // Map approvals for new request
    // Use updater to ensure proper SharePoint field formatting
    const tempUpdater = createSPUpdater();
    mapApprovalsToSharePointFields(tempUpdater, request.approvals);
    const approvalFields = tempUpdater.getUpdates();

    // Merge approval fields into payload
    // SPUpdater outputs user fields with 'Id' suffix (e.g., PortfolioManagerId: 40)
    for (const key in approvalFields) {
      if (Object.prototype.hasOwnProperty.call(approvalFields, key)) {
        payload[key] = approvalFields[key];
      }
    }

    // Add optional fields only if they have values
    if (request.submissionItem) {
      payload[RequestsFields.SubmissionItem] = request.submissionItem;
    }

    if (request.targetReturnDate) {
      payload[RequestsFields.TargetReturnDate] = request.targetReturnDate.toISOString();
    }

    if (request.rushRationale) {
      payload[RequestsFields.RushRationale] = request.rushRationale;
    }

    if (request.department) {
      payload[RequestsFields.Department] = request.department;
    }

    // Multi-choice fields - PnPjs v3 items.add() expects plain arrays
    if (request.distributionMethod && request.distributionMethod.length > 0) {
      payload[RequestsFields.DistributionMethod] = request.distributionMethod;
    }

    // Multi-lookup fields - needs 'Id' suffix with array of numeric IDs
    if (priorSubmissionsIds.length > 0) {
      payload[RequestsFields.PriorSubmissions + 'Id'] = priorSubmissionsIds;
    }

    if (request.priorSubmissionNotes) {
      payload[RequestsFields.PriorSubmissionNotes] = request.priorSubmissionNotes;
    }

    if (request.dateOfFirstUse) {
      payload[RequestsFields.DateOfFirstUse] = request.dateOfFirstUse.toISOString();
    }

    // Multi-user field - needs 'Id' suffix with array of numeric IDs
    if (additionalPartyIds.length > 0) {
      payload[RequestsFields.AdditionalParty + 'Id'] = additionalPartyIds;
    }

    if (request.trackingId) {
      payload[RequestsFields.TrackingId] = request.trackingId;
    }

    // Attorney fields - validate that attorney has id before saving
    if (request.attorney) {
      const attorneyValue = request.attorney && request.attorney.id ? request.attorney : null;
      if (attorneyValue) {
        payload[RequestsFields.Attorney] = attorneyValue;
      }
    }

    if (request.attorneyAssignNotes) {
      payload[RequestsFields.AttorneyAssignNotes] = request.attorneyAssignNotes;
    }

    // FINRA Audience & Product Fields - multi-choice fields use plain arrays
    if (request.finraAudienceCategory && request.finraAudienceCategory.length > 0) {
      payload[RequestsFields.FINRAAudienceCategory] = request.finraAudienceCategory;
    }
    if (request.audience && request.audience.length > 0) {
      payload[RequestsFields.Audience] = request.audience;
    }
    if (request.usFunds && request.usFunds.length > 0) {
      payload[RequestsFields.USFunds] = request.usFunds;
    }
    if (request.ucits && request.ucits.length > 0) {
      payload[RequestsFields.UCITS] = request.ucits;
    }
    if (request.separateAcctStrategies && request.separateAcctStrategies.length > 0) {
      payload[RequestsFields.SeparateAcctStrategies] = request.separateAcctStrategies;
    }
    if (request.separateAcctStrategiesIncl && request.separateAcctStrategiesIncl.length > 0) {
      payload[RequestsFields.SeparateAcctStrategiesIncl] = request.separateAcctStrategiesIncl;
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
 * Build a partial update payload for direct field updates
 *
 * This is used when updating specific fields without full change detection.
 * Maps domain model property names to SharePoint field names.
 *
 * @param data - Partial request data with fields to update
 * @returns SharePoint update payload
 */
function buildPartialUpdatePayload(data: Partial<ILegalRequest>): Record<string, any> {
  const payload: Record<string, any> = {};

  // Helper to merge updater results into payload (ES5 compatible)
  const mergeUpdates = (updates: Record<string, any>): void => {
    for (const key in updates) {
      if (Object.prototype.hasOwnProperty.call(updates, key)) {
        payload[key] = updates[key];
      }
    }
  };

  // Map domain properties to SharePoint field names
  // Only include fields that are explicitly provided (not undefined)

  if (data.reviewAudience !== undefined) {
    payload[RequestsFields.ReviewAudience] = data.reviewAudience;
  }

  if (data.attorney !== undefined) {
    // User field - use SPUpdater pattern for proper formatting
    const updater = createSPUpdater();
    const attorneyValue = data.attorney && data.attorney.id ? data.attorney : null;
    updater.set(RequestsFields.Attorney, attorneyValue, null);
    mergeUpdates(updater.getUpdates());
  }

  if (data.attorneyAssignNotes !== undefined) {
    payload[RequestsFields.AttorneyAssignNotes] = data.attorneyAssignNotes;
  }

  if (data.status !== undefined) {
    payload[RequestsFields.Status] = data.status;
  }

  if (data.legalReviewStatus !== undefined) {
    payload[RequestsFields.LegalReviewStatus] = data.legalReviewStatus;
  }

  if (data.legalReviewOutcome !== undefined) {
    payload[RequestsFields.LegalReviewOutcome] = data.legalReviewOutcome;
  }

  if (data.legalReviewNotes !== undefined) {
    payload[RequestsFields.LegalReviewNotes] = data.legalReviewNotes;
  }

  if (data.legalStatusUpdatedOn !== undefined) {
    payload[RequestsFields.LegalStatusUpdatedOn] = data.legalStatusUpdatedOn;
  }

  if (data.legalStatusUpdatedBy !== undefined) {
    const updater = createSPUpdater();
    updater.set(RequestsFields.LegalStatusUpdatedBy, data.legalStatusUpdatedBy, null);
    mergeUpdates(updater.getUpdates());
  }

  if (data.legalReviewCompletedOn !== undefined) {
    payload[RequestsFields.LegalReviewCompletedOn] = data.legalReviewCompletedOn;
  }

  if (data.legalReviewCompletedBy !== undefined) {
    const updater = createSPUpdater();
    updater.set(RequestsFields.LegalReviewCompletedBy, data.legalReviewCompletedBy, null);
    mergeUpdates(updater.getUpdates());
  }

  if (data.complianceReviewStatus !== undefined) {
    payload[RequestsFields.ComplianceReviewStatus] = data.complianceReviewStatus;
  }

  if (data.complianceReviewOutcome !== undefined) {
    payload[RequestsFields.ComplianceReviewOutcome] = data.complianceReviewOutcome;
  }

  if (data.complianceReviewNotes !== undefined) {
    payload[RequestsFields.ComplianceReviewNotes] = data.complianceReviewNotes;
  }

  if (data.isForesideReviewRequired !== undefined) {
    payload[RequestsFields.IsForesideReviewRequired] = data.isForesideReviewRequired;
  }

  if (data.isRetailUse !== undefined) {
    payload[RequestsFields.IsRetailUse] = data.isRetailUse;
  }

  if (data.complianceStatusUpdatedOn !== undefined) {
    payload[RequestsFields.ComplianceStatusUpdatedOn] = data.complianceStatusUpdatedOn;
  }

  if (data.complianceStatusUpdatedBy !== undefined) {
    const updater = createSPUpdater();
    updater.set(RequestsFields.ComplianceStatusUpdatedBy, data.complianceStatusUpdatedBy, null);
    mergeUpdates(updater.getUpdates());
  }

  if (data.complianceReviewCompletedOn !== undefined) {
    payload[RequestsFields.ComplianceReviewCompletedOn] = data.complianceReviewCompletedOn;
  }

  if (data.complianceReviewCompletedBy !== undefined) {
    const updater = createSPUpdater();
    updater.set(RequestsFields.ComplianceReviewCompletedBy, data.complianceReviewCompletedBy, null);
    mergeUpdates(updater.getUpdates());
  }

  if (data.trackingId !== undefined) {
    payload[RequestsFields.TrackingId] = data.trackingId;
  }

  if (data.closeoutOn !== undefined) {
    payload[RequestsFields.CloseoutOn] = data.closeoutOn;
  }

  if (data.closeoutBy !== undefined) {
    const updater = createSPUpdater();
    updater.set(RequestsFields.CloseoutBy, data.closeoutBy, null);
    mergeUpdates(updater.getUpdates());
  }

  // Comments acknowledged (for closeout when review outcome is "Approved with Comments")
  if (data.commentsAcknowledged !== undefined) {
    payload[RequestsFields.CommentsAcknowledged] = data.commentsAcknowledged;
  }
  if (data.commentsAcknowledgedOn !== undefined) {
    payload[RequestsFields.CommentsAcknowledgedOn] = data.commentsAcknowledgedOn;
  }

  // Time tracking fields
  if (data.legalIntakeLegalAdminHours !== undefined) {
    payload[RequestsFields.LegalIntakeLegalAdminHours] = data.legalIntakeLegalAdminHours;
  }
  if (data.legalReviewAttorneyHours !== undefined) {
    payload[RequestsFields.LegalReviewAttorneyHours] = data.legalReviewAttorneyHours;
  }
  if (data.complianceReviewReviewerHours !== undefined) {
    payload[RequestsFields.ComplianceReviewReviewerHours] = data.complianceReviewReviewerHours;
  }
  if (data.closeoutReviewerHours !== undefined) {
    payload[RequestsFields.CloseoutReviewerHours] = data.closeoutReviewerHours;
  }

  return payload;
}

/**
 * Request ID prefix mapping based on request type
 *
 * Format: {PREFIX}-{YY}-{N}
 * - CRR = Communication Review Request
 * - GRR = General Review Request (Phase 2)
 * - IMA = IMA Review Request (Phase 2)
 */
const REQUEST_ID_PREFIXES: Record<string, string> = {
  'Communication': 'CRR',
  'General Review': 'GRR',
  'IMA Review': 'IMA',
};

/**
 * Get 2-digit year from current date
 */
function getTwoDigitYear(): string {
  return new Date().getFullYear().toString().slice(-2);
}

/**
 * Get the next sequence number from RequestIds list
 *
 * Queries the hidden RequestIds list to find the last sequence number
 * for the given prefix and year, then returns the next number.
 *
 * @param prefix - Request type prefix (CRR, GRR, IMA)
 * @param year - 4-digit year
 * @returns Promise resolving to next sequence number
 */
async function getNextSequenceNumber(prefix: string, year: number): Promise<number> {
  try {
    // Query RequestIds list for the last sequence number for this prefix/year
    const items = await SPContext.sp.web.lists
      .getByTitle(Lists.RequestIds.Title)
      .items.select('Sequence')
      .filter(`Prefix eq '${prefix}' and Year eq ${year}`)
      .orderBy('Sequence', false)
      .top(1)();

    if (items.length > 0) {
      // Ensure we get a number - SharePoint may return string for Number fields
      const lastSequence = Number(items[0].Sequence);
      if (!isNaN(lastSequence)) {
        return lastSequence + 1;
      }
      SPContext.logger.warn('RequestSaveService: Invalid sequence value, starting at 1', { sequence: items[0].Sequence });
    }

    return 1;
  } catch (error: unknown) {
    SPContext.logger.warn('RequestSaveService: Failed to query RequestIds list, starting at 1', error);
    return 1;
  }
}

/**
 * Register a new request ID in the RequestIds list
 *
 * Adds an entry to the hidden RequestIds list to track the sequence.
 * This ensures unique IDs even when users can't see all requests.
 *
 * @param requestId - The full request ID (e.g., CRR-25-1)
 * @param prefix - Request type prefix
 * @param year - 4-digit year
 * @param sequence - Sequence number
 */
async function registerRequestId(
  requestId: string,
  prefix: string,
  year: number,
  sequence: number
): Promise<void> {
  try {
    await SPContext.sp.web.lists
      .getByTitle(Lists.RequestIds.Title)
      .items.add({
        Title: requestId,
        Prefix: prefix,
        Year: year,
        Sequence: sequence,
      });

    SPContext.logger.info('RequestSaveService: Request ID registered', { requestId, prefix, year, sequence });
  } catch (error: unknown) {
    SPContext.logger.error('RequestSaveService: Failed to register request ID', error, { requestId });
    // Don't throw - the request ID is still valid, just not tracked
    // This could cause duplicate IDs in edge cases, but better than failing the save
  }
}

/**
 * Generate request ID in format {PREFIX}-{YY}-{N}
 *
 * Uses the hidden RequestIds list to ensure unique sequential numbering
 * regardless of item-level permissions on the Requests list.
 *
 * Format examples:
 * - CRR-25-1 (Communication Review Request, year 2025, first request)
 * - CRR-25-42 (Communication Review Request, year 2025, 42nd request)
 * - GRR-25-1 (General Review Request - Phase 2)
 * - IMA-25-1 (IMA Review Request - Phase 2)
 *
 * @param requestType - Optional request type (defaults to Communication)
 * @returns Promise resolving to new request ID
 */
export async function generateRequestId(requestType?: string): Promise<string> {
  const currentYear = new Date().getFullYear();
  const twoDigitYear = getTwoDigitYear();
  const prefix = REQUEST_ID_PREFIXES[requestType || 'Communication'] || 'CRR';

  try {
    SPContext.logger.info('RequestSaveService: Generating request ID', {
      requestType,
      prefix,
      year: currentYear,
    });

    // Get next sequence number from RequestIds list
    const nextNumber = await getNextSequenceNumber(prefix, currentYear);

    // Build request ID: PREFIX-YY-N (no zero-padding)
    const requestId = `${prefix}-${twoDigitYear}-${nextNumber}`;

    // Register the ID in the RequestIds list
    await registerRequestId(requestId, prefix, currentYear, nextNumber);

    SPContext.logger.info('RequestSaveService: Request ID generated', { requestId });

    return requestId;

  } catch (error: unknown) {
    SPContext.logger.error('RequestSaveService: Failed to generate request ID', error);
    // Fallback to timestamp-based ID
    return `${prefix}-${twoDigitYear}-${Date.now()}`;
  }
}

/**
 * Process pending document operations (uploads, deletes, renames)
 *
 * This function should be called after the request is successfully saved.
 * It processes all pending document operations from documentsStore.
 *
 * @param itemId - Request item ID
 * @param stagedFiles - Staged files to upload (from documentsStore)
 * @param filesToDelete - Files to delete (from documentsStore)
 * @param filesToRename - Files to rename (from documentsStore)
 * @returns Promise resolving to processing results
 */
export async function processPendingDocuments(
  itemId: number,
  stagedFiles: IStagedDocument[] = [],
  filesToDelete: IDocument[] = [],
  filesToRename: Array<{ file: IDocument; newName: string }> = []
): Promise<{
  uploadSuccess: number;
  uploadErrors: number;
  deleteSuccess: number;
  deleteErrors: number;
  renameSuccess: number;
  renameErrors: number;
}> {
  const results = {
    uploadSuccess: 0,
    uploadErrors: 0,
    deleteSuccess: 0,
    deleteErrors: 0,
    renameSuccess: 0,
    renameErrors: 0,
  };

  try {
    // 1. Upload staged files
    if (stagedFiles.length > 0) {
      SPContext.logger.info('Processing pending file uploads', {
        itemId,
        count: stagedFiles.length,
      });

      const filesForUpload = stagedFiles.map(staged => ({
        file: staged.file,
        documentType: staged.documentType,
      }));

      const uploadResult = await batchUploadFiles(
        filesForUpload,
        itemId,
        (fileId, progress, status) => {
          SPContext.logger.info('Upload progress', { fileId, progress, status });
        },
        (fileId, result) => {
          SPContext.logger.info('Upload complete', { fileId, success: result.success });
        }
      );

      results.uploadSuccess = uploadResult.successCount;
      results.uploadErrors = uploadResult.errorCount;
    }

    // 2. Delete files
    if (filesToDelete.length > 0) {
      SPContext.logger.info('Processing pending file deletions', {
        itemId,
        count: filesToDelete.length,
      });

      for (const file of filesToDelete) {
        try {
          await deleteFile(file);
          results.deleteSuccess++;
        } catch (error) {
          SPContext.logger.error('Failed to delete file', error, { fileName: file.name });
          results.deleteErrors++;
        }
      }
    }

    // 3. Rename files
    if (filesToRename.length > 0) {
      SPContext.logger.info('Processing pending file renames', {
        itemId,
        count: filesToRename.length,
      });

      for (const { file, newName } of filesToRename) {
        try {
          await renameFile(file, newName);
          results.renameSuccess++;
        } catch (error) {
          SPContext.logger.error('Failed to rename file', error, {
            oldName: file.name,
            newName,
          });
          results.renameErrors++;
        }
      }
    }

    SPContext.logger.success('Pending document operations completed', results);

    return results;
  } catch (error) {
    SPContext.logger.error('Failed to process pending documents', error, { itemId });
    throw error;
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
 * @param processDocuments - Optional: process pending document operations after save
 * @param stagedFiles - Optional: staged files to upload
 * @param filesToDelete - Optional: files to delete
 * @param filesToRename - Optional: files to rename
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
      // Without originalData: build a direct partial update payload
      // This is used for stage-specific updates (Legal Intake, Reviews, etc.)
      // where we only have a few fields to update
      payload = buildPartialUpdatePayload(data);

      // Check if there's anything to save
      if (Object.keys(payload).length === 0) {
        SPContext.logger.info('RequestSaveService: No fields to update', { itemId });
        return { saved: false };
      }
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
      // Create new draft - pass request type for proper prefix
      const requestId = await generateRequestId(data.requestType);

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
      legalReviewCompletedOn: new Date(),
      legalReviewCompletedBy: {
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
      complianceReviewCompletedOn: new Date(),
      complianceReviewCompletedBy: {
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
 * Closeout options
 */
export interface ICloseoutOptions {
  /** Optional tracking ID */
  trackingId?: string;
  /** Whether review comments have been acknowledged (required if outcome was Approved with Comments) */
  commentsAcknowledged?: boolean;
}

/**
 * Close out request (hybrid with permission management)
 *
 * @param itemId - Request item ID
 * @param options - Closeout options including tracking ID and comments acknowledgment
 * @returns Promise resolving when closeout completes
 */
export async function closeoutRequest(
  itemId: number,
  options?: ICloseoutOptions
): Promise<void> {
  try {
    const { trackingId, commentsAcknowledged } = options || {};
    SPContext.logger.info('RequestSaveService: Closing out request', { itemId, trackingId, commentsAcknowledged });

    // Build update payload
    const updateData: Partial<ILegalRequest> = {
      status: RequestStatus.Completed,
      trackingId,
      closeoutOn: new Date(),
      closeoutBy: {
        id: SPContext.currentUser.id.toString(),
        email: SPContext.currentUser.email,
        title: SPContext.currentUser.title,
      },
    };

    // Add comments acknowledged fields if provided
    if (commentsAcknowledged) {
      updateData.commentsAcknowledged = true;
      updateData.commentsAcknowledgedOn = new Date();
    }

    // 1. Update SharePoint
    await saveRequest(itemId, updateData);

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

/**
 * Waiting On Helper Utility
 *
 * Determines who or what group a request is waiting on based on:
 * - Current status
 * - Review statuses (legal/compliance)
 * - Review audience
 * - Assigned attorney
 */

// App imports using path aliases
import {
  RequestStatus,
  ReviewAudience,
  LegalReviewStatus,
  ComplianceReviewStatus,
} from '@appTypes/workflowTypes';
import { AppRole } from '@appTypes/configTypes';
import type { IStatusListItemData, IWaitingOnInfo } from '../types';

/**
 * Determine who/what the request is waiting on
 * @param itemData - Request list item data
 * @returns Waiting on information (user, group, or none)
 */
export function determineWaitingOn(itemData: IStatusListItemData): IWaitingOnInfo {
  const {
    status,
    submittedBy,
    createdBy,
    onHoldBy,
    legalReviewStatus,
    legalReviewAssignedAttorney,
    complianceReviewStatus,
    reviewAudience,
  } = itemData;

  // Handle special statuses first
  if (status === RequestStatus.Cancelled) {
    return {
      type: 'none',
      identifier: '',
      displayName: 'Request cancelled',
    };
  }

  if (status === RequestStatus.OnHold) {
    if (onHoldBy) {
      return {
        type: 'user',
        identifier: onHoldBy.email || onHoldBy.loginName || onHoldBy.id || '',
        displayName: onHoldBy.title || 'Unknown',
        principal: onHoldBy,
      };
    }
    return {
      type: 'none',
      identifier: '',
      displayName: 'On hold',
    };
  }

  // Handle completed
  if (status === RequestStatus.Completed) {
    return {
      type: 'none',
      identifier: '',
      displayName: 'Request completed',
    };
  }

  // Status-specific logic
  switch (status) {
    case RequestStatus.Draft:
      // Waiting on submitter to complete and submit
      const submitter = submittedBy || createdBy;
      return {
        type: 'user',
        identifier: submitter?.email || submitter?.loginName || submitter?.id || '',
        displayName: submitter?.title || 'Unknown',
        principal: submitter,
      };

    case RequestStatus.LegalIntake:
      // Waiting on Legal Admin group
      return {
        type: 'group',
        identifier: AppRole.LegalAdmin,
        displayName: 'Legal Admin',
        groupName: AppRole.LegalAdmin,
        memberCount: undefined, // Will be populated by GroupViewer
      };

    case RequestStatus.AssignAttorney:
      // Waiting on Attorney Assigner committee
      return {
        type: 'group',
        identifier: AppRole.AttorneyAssigner,
        displayName: 'Attorney Assignment Committee',
        groupName: AppRole.AttorneyAssigner,
        memberCount: undefined,
      };

    case RequestStatus.InReview:
      // Complex logic based on review audience and statuses
      return determineWaitingOnInReview(
        reviewAudience,
        legalReviewStatus,
        complianceReviewStatus,
        legalReviewAssignedAttorney,
        submittedBy || createdBy
      );

    case RequestStatus.Closeout:
      // Waiting on submitter or Legal Admin for closeout
      const closeoutUser = submittedBy || createdBy;
      return {
        type: 'user',
        identifier: closeoutUser?.email || closeoutUser?.loginName || closeoutUser?.id || '',
        displayName: closeoutUser?.title || 'Unknown',
        principal: closeoutUser,
      };

    default:
      return {
        type: 'none',
        identifier: '',
        displayName: 'Unknown',
      };
  }
}

/**
 * Determine waiting on during In Review status (complex logic)
 * @param reviewAudience - Which reviews are required
 * @param legalReviewStatus - Legal review status
 * @param complianceReviewStatus - Compliance review status
 * @param assignedAttorney - Assigned attorney (if any)
 * @param submitter - Request submitter
 * @returns Waiting on information
 */
function determineWaitingOnInReview(
  reviewAudience: ReviewAudience,
  legalReviewStatus: LegalReviewStatus | undefined,
  complianceReviewStatus: ComplianceReviewStatus | undefined,
  assignedAttorney: { id?: string; title?: string; email?: string; loginName?: string } | undefined,
  submitter: { id?: string; title?: string; email?: string; loginName?: string } | undefined
): IWaitingOnInfo {
  // Priority 1: Check if waiting on submitter (either review)
  if (
    legalReviewStatus === LegalReviewStatus.WaitingOnSubmitter ||
    complianceReviewStatus === ComplianceReviewStatus.WaitingOnSubmitter
  ) {
    if (submitter) {
      return {
        type: 'user',
        identifier: submitter.email || submitter.loginName || submitter.id || '',
        displayName: submitter.title || 'Unknown',
        principal: submitter as any,
      };
    }
  }

  // Priority 2: Check legal review status
  if (reviewAudience === ReviewAudience.Legal || reviewAudience === ReviewAudience.Both) {
    if (legalReviewStatus === LegalReviewStatus.WaitingOnAttorney && assignedAttorney) {
      return {
        type: 'user',
        identifier: assignedAttorney.email || assignedAttorney.loginName || assignedAttorney.id || '',
        displayName: assignedAttorney.title || 'Unknown',
        principal: assignedAttorney as any,
      };
    }

    if (
      legalReviewStatus === LegalReviewStatus.InProgress ||
      legalReviewStatus === LegalReviewStatus.NotStarted
    ) {
      if (assignedAttorney) {
        return {
          type: 'user',
          identifier: assignedAttorney.email || assignedAttorney.loginName || assignedAttorney.id || '',
          displayName: assignedAttorney.title || 'Unknown',
          principal: assignedAttorney as any,
        };
      } else {
        // No attorney assigned yet
        return {
          type: 'group',
          identifier: AppRole.LegalAdmin,
          displayName: 'Legal Admin (to assign attorney)',
          groupName: AppRole.LegalAdmin,
        };
      }
    }
  }

  // Priority 3: Check compliance review status
  if (reviewAudience === ReviewAudience.Compliance || reviewAudience === ReviewAudience.Both) {
    if (
      complianceReviewStatus === ComplianceReviewStatus.WaitingOnCompliance ||
      complianceReviewStatus === ComplianceReviewStatus.InProgress ||
      complianceReviewStatus === ComplianceReviewStatus.NotStarted
    ) {
      return {
        type: 'group',
        identifier: AppRole.ComplianceUsers,
        displayName: 'Compliance Users',
        groupName: AppRole.ComplianceUsers,
      };
    }
  }

  // Fallback: Unknown state
  return {
    type: 'none',
    identifier: '',
    displayName: 'In Review',
  };
}

/**
 * Get formatted "waiting on" display text
 * @param waitingOn - Waiting on information
 * @returns Formatted text for display
 */
export function getWaitingOnDisplayText(waitingOn: IWaitingOnInfo): string {
  if (waitingOn.type === 'none') {
    return waitingOn.displayName;
  }

  if (waitingOn.type === 'user') {
    return `Waiting on: ${waitingOn.displayName}`;
  }

  if (waitingOn.type === 'group') {
    if (waitingOn.memberCount !== undefined) {
      return `Waiting on: ${waitingOn.displayName} (${waitingOn.memberCount})`;
    }
    return `Waiting on: ${waitingOn.displayName}`;
  }

  return 'Unknown';
}

/**
 * Get action text for current waiting state
 * @param waitingOn - Waiting on information
 * @param status - Current status
 * @returns Action text describing what needs to happen
 */
export function getActionText(waitingOn: IWaitingOnInfo, status: RequestStatus): string {
  if (waitingOn.type === 'none') {
    if (status === RequestStatus.Completed) {
      return 'Request has been completed';
    }
    if (status === RequestStatus.Cancelled) {
      return 'Request has been cancelled';
    }
    return 'No action required';
  }

  switch (status) {
    case RequestStatus.Draft:
      return 'Complete form and submit request';
    case RequestStatus.LegalIntake:
      return 'Review request and assign attorney or send to committee';
    case RequestStatus.AssignAttorney:
      return 'Assign attorney to request';
    case RequestStatus.InReview:
      return 'Complete review and provide feedback';
    case RequestStatus.Closeout:
      return 'Enter tracking ID and close out request';
    case RequestStatus.OnHold:
      return 'Resume request when ready';
    default:
      return 'Action required';
  }
}

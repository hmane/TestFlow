/**
 * Workflow step configurations for different request types
 */

import * as React from 'react';
import { UserPersona } from 'spfx-toolkit/lib/components/UserPersona';
import { RequestStatus, RequestType } from '@appTypes/index';
import type { IWorkflowStep, IStepContent, StepData, AppStepperMode, IRequestMetadata } from './WorkflowStepperTypes';

/**
 * Status order for workflow progression
 * Used to determine which form sections to show based on previousStatus
 * Terminal statuses (Cancelled, OnHold) have high order to not affect section visibility
 */
const STATUS_ORDER: Record<RequestStatus, number> = {
  [RequestStatus.Draft]: 1,
  [RequestStatus.LegalIntake]: 2,
  [RequestStatus.AssignAttorney]: 2, // Same as LegalIntake (merged visually)
  [RequestStatus.InReview]: 3,
  [RequestStatus.Closeout]: 4,
  [RequestStatus.AwaitingFINRADocuments]: 5,
  [RequestStatus.Completed]: 6,
  [RequestStatus.Cancelled]: 99, // Terminal - doesn't affect section visibility
  [RequestStatus.OnHold]: 99, // Terminal - doesn't affect section visibility
};

/**
 * Get the workflow order for a given status
 * Higher numbers = later in workflow
 */
export function getStatusOrder(status: RequestStatus): number {
  return STATUS_ORDER[status] || 0;
}

/**
 * Determine if a form section should be shown based on previousStatus
 * When request is Cancelled or OnHold, only show sections up to and including previousStatus
 *
 * @param sectionStatus - The status that corresponds to the form section
 * @param currentStatus - The current request status
 * @param previousStatus - The status before Cancelled/OnHold (optional)
 * @returns true if the section should be rendered
 */
export function shouldShowFormSection(
  sectionStatus: RequestStatus,
  currentStatus: RequestStatus,
  previousStatus?: RequestStatus
): boolean {
  // Normal flow - not cancelled or on hold
  if (currentStatus !== RequestStatus.Cancelled && currentStatus !== RequestStatus.OnHold) {
    return true;
  }

  // For Cancelled/OnHold, if no previousStatus, show nothing beyond Draft
  if (!previousStatus) {
    return getStatusOrder(sectionStatus) <= getStatusOrder(RequestStatus.Draft);
  }

  // Show sections up to and including previousStatus
  return getStatusOrder(sectionStatus) <= getStatusOrder(previousStatus);
}

/**
 * Get the step key that corresponds to a status for stepper positioning
 * Used to determine where to insert Cancelled/OnHold steps
 */
export function getStepKeyForStatus(status: RequestStatus): string {
  switch (status) {
    case RequestStatus.Draft:
      return 'draft';
    case RequestStatus.LegalIntake:
    case RequestStatus.AssignAttorney:
      return 'legalIntake';
    case RequestStatus.InReview:
      return 'inReview';
    case RequestStatus.Closeout:
      return 'closeout';
    case RequestStatus.AwaitingFINRADocuments:
      return 'finraDocuments';
    case RequestStatus.Completed:
      return 'closeout'; // Completed shows on closeout step
    default:
      return 'draft';
  }
}

/**
 * Format date for display in stepper (full format for tooltip)
 */
function formatFullDate(date: Date | undefined): string {
  if (!date) {
    return '';
  }
  // Handle both Date objects and date strings
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format date in friendly relative format (today, yesterday, etc.)
 */
function formatFriendlyDate(date: Date | undefined): string {
  if (!date) {
    return '';
  }
  // Handle both Date objects and date strings
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffTime = today.getTime() - dateOnly.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'today';
  }
  if (diffDays === 1) {
    return 'yesterday';
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  if (diffDays < 14) {
    return 'last week';
  }
  if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)} weeks ago`;
  }
  if (diffDays < 60) {
    return 'last month';
  }
  // Fall back to short date for older dates
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Step content definitions
 */
const stepContents: Record<string, IStepContent> = {
  draft: {
    title: 'Draft Request',
    description: 'Create and prepare your legal review request',
    details: [
      'Fill in basic request information including title, purpose, and submission type',
      'Select the appropriate submission item and target return date',
      'Choose whether legal, compliance, or both reviews are required',
      'Add pre-submission approvals with supporting documents',
    ],
    tips: [
      'Save your work frequently as a draft',
      'Gather all necessary approvals before submission',
      'Be clear and specific in your purpose statement',
    ],
    estimatedDuration: '30-60 minutes',
    requiredFields: [
      'Request Title',
      'Purpose',
      'Submission Type',
      'Submission Item',
      'Target Return Date',
      'Review Audience',
      'At least one approval',
    ],
    whoIsInvolved: ['Submitter', 'Approvers (Communications, Portfolio Manager, etc.)'],
  },
  legalIntake: {
    title: 'Legal Intake',
    description: 'Request is reviewed and triaged by Legal Admin',
    details: [
      'Legal Admin reviews the request details and all submitted materials',
      'Verifies that all required approvals are in place',
      'Confirms the review audience (Legal, Compliance, or Both)',
      'May override review audience based on content assessment',
      'Determines attorney assignment method (direct or committee)',
    ],
    tips: [
      'Ensure your request details are complete and accurate',
      'All supporting documents should be uploaded',
      'Respond promptly to any questions from Legal Admin',
    ],
    estimatedDuration: '1-2 business days',
    whoIsInvolved: ['Legal Admin'],
  },
  assignAttorney: {
    title: 'Assign Attorney',
    description: 'Attorney assignment through committee review (Optional)',
    details: [
      'Request is sent to the Attorney Assignment Committee',
      'Committee reviews the request and assigns an appropriate attorney',
      'Assignment is based on expertise, workload, and availability',
      'This step is skipped if attorney is directly assigned at Legal Intake',
    ],
    tips: [
      'This step is optional and depends on the complexity of the request',
      'Committee meetings are held regularly (check schedule)',
      'Direct assignment bypasses this step entirely',
    ],
    estimatedDuration: '2-5 business days (if required)',
    whoIsInvolved: ['Attorney Assignment Committee'],
  },
  inReview: {
    title: 'In Review',
    description: 'Legal and/or Compliance review in progress',
    details: [
      'Assigned attorney conducts legal review of materials',
      'Compliance team conducts compliance review (if required)',
      'Reviewers may request additional information or clarifications',
      'Status updates are provided as review progresses',
      'Review continues until outcome is determined',
    ],
    tips: [
      'Respond quickly to reviewer questions',
      'Check status updates regularly',
      'Provide any additional materials promptly',
    ],
    estimatedDuration: 'Varies by submission type (see turnaround time)',
    whoIsInvolved: ['Assigned Attorney', 'Compliance Reviewers'],
  },
  closeout: {
    title: 'Closeout',
    description: 'Final steps and request completion',
    details: [
      'All required reviews have been completed',
      'Tracking ID is assigned if required (Compliance + FINRA/Retail)',
      'Final documentation is prepared',
      'Request is marked as complete',
    ],
    tips: [
      'Review the final outcomes from all reviewers',
      'Tracking ID is only required for specific compliance scenarios',
      'Save all final documentation for your records',
      'Materials can now be used per review outcomes',
    ],
    estimatedDuration: '1 business day',
    whoIsInvolved: ['Submitter', 'Legal Admin'],
  },
  finraDocuments: {
    title: 'FINRA Documents',
    description: 'Awaiting FINRA documentation completion',
    details: [
      'Request requires FINRA review documentation',
      'FINRA team processes the documentation',
      'Final compliance documentation is prepared',
      'Request is marked as complete once FINRA documents are finalized',
    ],
    tips: [
      'Monitor for updates from the FINRA team',
      'Ensure all required documentation is available',
      'Request will complete automatically when FINRA processing is done',
    ],
    estimatedDuration: 'Varies (typically 1-3 business days)',
    whoIsInvolved: ['FINRA Team', 'Compliance'],
  },
  cancelled: {
    title: 'Request Cancelled',
    description: 'This request has been cancelled',
    details: [
      'The request was cancelled before completion',
      'No further action is required',
      'The request can be viewed for reference only',
    ],
    tips: [
      'Review the cancellation reason for context',
      'If needed, create a new request to restart the process',
    ],
    estimatedDuration: 'N/A',
    whoIsInvolved: ['N/A'],
  },
  onHold: {
    title: 'Request On Hold',
    description: 'This request is currently on hold',
    details: [
      'The request has been placed on hold',
      'Review progress is paused until the hold is lifted',
      'The request will resume from where it was paused',
    ],
    tips: [
      'Review the hold reason for context',
      'Contact the person who placed the hold for updates',
      'The request can be resumed by authorized personnel',
    ],
    estimatedDuration: 'Varies',
    whoIsInvolved: ['Legal Admin', 'Admin'],
  },
};

/**
 * Get step configuration for Communication request type
 *
 * Note: Assign Attorney is merged into Legal Intake for a cleaner 4-step workflow:
 * Draft → Legal Intake (includes attorney assignment) → Review → Closeout
 * Closeout and Completed are merged - Closeout shows as completed when request is done.
 */
function getCommunicationSteps(): IWorkflowStep[] {
  return [
    {
      key: 'draft',
      label: 'Draft',
      description: 'Create request',
      requestStatus: RequestStatus.Draft,
      isOptional: false,
      content: stepContents.draft,
      order: 1,
    },
    {
      key: 'legalIntake',
      label: 'Legal Intake',
      description: 'Triage & assign',
      requestStatus: RequestStatus.LegalIntake,
      isOptional: false,
      content: stepContents.legalIntake,
      order: 2,
    },
    {
      key: 'inReview',
      label: 'Review',
      description: 'Legal/Compliance review',
      requestStatus: RequestStatus.InReview,
      isOptional: false,
      content: stepContents.inReview,
      order: 3,
    },
    {
      key: 'closeout',
      label: 'Closeout',
      description: 'Final steps',
      requestStatus: RequestStatus.Closeout,
      isOptional: false,
      content: stepContents.closeout,
      order: 4,
    },
  ];
}

/**
 * Get step configuration for General Review request type (Phase 2)
 */
function getGeneralReviewSteps(): IWorkflowStep[] {
  // Similar structure but may have different content
  return getCommunicationSteps();
}

/**
 * Get step configuration for IMA Review request type (Phase 2)
 */
function getIMAReviewSteps(): IWorkflowStep[] {
  // Similar structure but may have different content
  return getCommunicationSteps();
}

/**
 * Get workflow steps for a given request type
 */
export function getWorkflowSteps(requestType: RequestType): IWorkflowStep[] {
  switch (requestType) {
    case RequestType.Communication:
      return getCommunicationSteps();
    case RequestType.GeneralReview:
      return getGeneralReviewSteps();
    case RequestType.IMAReview:
      return getIMAReviewSteps();
    default:
      return getCommunicationSteps();
  }
}

/**
 * Review status values for contextual coloring
 */
const WAITING_ON_SUBMITTER = 'Waiting On Submitter';

/**
 * Determine toolkit step status based on current request status
 *
 * Note: Since Assign Attorney is now merged into Legal Intake visually,
 * we treat AssignAttorney status as part of Legal Intake step (still current).
 * Completed status is now merged with Closeout - shows Closeout as completed.
 *
 * Contextual coloring for "In Review" step:
 * - Shows 'warning' (orange) when current user IS the submitter AND review is waiting on them
 * - Shows 'current' (blue) in all other cases when step is current
 *
 * FINRA Documents step:
 * - Only shown when isForesideReviewRequired is true
 * - Appears after Closeout step
 * - Current when status is AwaitingFINRADocuments
 * - Completed when status is Completed (and FINRA was required)
 */
function determineStepStatus(
  step: IWorkflowStep,
  currentStatus: RequestStatus,
  requestMetadata?: IRequestMetadata
): 'completed' | 'current' | 'pending' | 'warning' | 'error' | 'blocked' {
  // Handle special statuses first
  if (currentStatus === RequestStatus.Cancelled) {
    return 'error';
  }

  if (currentStatus === RequestStatus.OnHold) {
    return 'warning';
  }

  // Determine if FINRA Documents step is in the workflow
  const hasFINRAStep = requestMetadata?.isForesideReviewRequired === true;

  // Map statuses to visual step order
  // Without FINRA: Draft=1, LegalIntake/AssignAttorney=2, InReview=3, Closeout/Completed=4
  // With FINRA: Draft=1, LegalIntake/AssignAttorney=2, InReview=3, Closeout=4, FINRADocuments/Completed=5
  const getVisualOrder = (status: RequestStatus): number => {
    switch (status) {
      case RequestStatus.Draft:
        return 1;
      case RequestStatus.LegalIntake:
      case RequestStatus.AssignAttorney:
        return 2; // Merged into same visual step
      case RequestStatus.InReview:
        return 3;
      case RequestStatus.Closeout:
        return 4;
      case RequestStatus.AwaitingFINRADocuments:
        return 5; // After Closeout
      case RequestStatus.Completed:
        // Completed order depends on whether FINRA step exists
        return hasFINRAStep ? 5 : 4;
      default:
        return 0;
    }
  };

  const currentOrder = getVisualOrder(currentStatus);
  const stepOrder = getVisualOrder(step.requestStatus);

  // Special handling: When status is Completed
  if (currentStatus === RequestStatus.Completed) {
    // If FINRA step exists and this is the FINRA step, show as completed
    if (step.key === 'finraDocuments') {
      return 'completed';
    }
    // Closeout step should show as completed
    if (step.key === 'closeout') {
      return 'completed';
    }
  }

  // Special handling: When status is AwaitingFINRADocuments
  if (currentStatus === RequestStatus.AwaitingFINRADocuments) {
    // Closeout step should show as completed
    if (step.key === 'closeout') {
      return 'completed';
    }
    // FINRA Documents step is current
    if (step.key === 'finraDocuments') {
      return 'current';
    }
  }

  // Completed steps
  if (stepOrder < currentOrder) {
    return 'completed';
  }

  // Current step
  if (stepOrder === currentOrder) {
    // Contextual coloring for "In Review" step
    // Show 'warning' (orange) when current user IS the submitter AND review is waiting on them
    if (step.key === 'inReview' && requestMetadata?.isCurrentUserSubmitter) {
      const legalWaiting = requestMetadata.legalReviewStatus === WAITING_ON_SUBMITTER;
      const complianceWaiting = requestMetadata.complianceReviewStatus === WAITING_ON_SUBMITTER;

      if (legalWaiting || complianceWaiting) {
        return 'warning';
      }
    }

    return 'current';
  }

  // Future steps
  return 'pending';
}

/**
 * Render step content as React node
 */
function renderStepContent(content: IStepContent): React.ReactNode {
  // Build tips array with the required fields note
  const allTips = [
    ...(content.tips || []),
    // Add required fields tip at the end
  ];

  return React.createElement(
    'div',
    { style: { padding: '16px' } },
    React.createElement('h3', { style: { marginTop: 0 } }, content.title),
    React.createElement('p', { style: { marginBottom: '16px' } }, content.description),

    // Details section
    content.details.length > 0 &&
      React.createElement(
        'div',
        { style: { marginBottom: '16px' } },
        React.createElement('h4', null, 'What Happens:'),
        React.createElement(
          'ul',
          null,
          content.details.map((detail, index) =>
            React.createElement('li', { key: `detail-${index}` }, detail)
          )
        )
      ),

    // Tips section
    allTips.length > 0 &&
      React.createElement(
        'div',
        { style: { marginBottom: '16px' } },
        React.createElement('h4', null, 'Tips:'),
        React.createElement(
          'ul',
          null,
          allTips.map((tip, index) => React.createElement('li', { key: `tip-${index}` }, tip))
        ),
        // Required fields note with red asterisk
        React.createElement(
          'p',
          { style: { marginTop: '12px', fontSize: '13px', color: '#605e5c' } },
          React.createElement('span', { style: { color: '#a4262c', fontWeight: 600 } }, '* '),
          'Required fields are marked with an asterisk'
        )
      )
  );
}

/**
 * Create a date element with friendly text and full date tooltip
 */
function createDateElement(prefix: string, date: Date | undefined): React.ReactNode {
  if (!date) {
    return prefix;
  }
  const friendlyDate = formatFriendlyDate(date);
  const fullDate = formatFullDate(date);

  return React.createElement(
    'span',
    { title: fullDate, style: { cursor: 'help' } },
    `${prefix} ${friendlyDate}`
  );
}

/**
 * Create a user element with UserPersona component
 * UserPersona inherits font and color from parent container
 */
function createUserElement(userLogin: string | undefined, userName: string | undefined): React.ReactNode {
  if (!userLogin) {
    // Fall back to just the name if no login
    return userName ? `by ${userName}` : undefined;
  }

  return React.createElement(
    'span',
    { style: { display: 'inline-flex', alignItems: 'center', gap: '4px' } },
    'by ',
    React.createElement(UserPersona, {
      userIdentifier: userLogin,
      displayName: userName,
      size: 24,
      displayMode: 'avatarAndName',
      showLivePersona: false, // Disabled due to PnP LivePersona memory leak
      showSecondaryText: false,
    })
  );
}

/**
 * Get step description based on request metadata and step status
 * Provides contextual information for each step based on current workflow state
 */
function getStepDescriptions(
  step: IWorkflowStep,
  status: 'completed' | 'current' | 'pending' | 'warning' | 'error' | 'blocked',
  requestMetadata?: IRequestMetadata
): { description1: string | React.ReactNode; description2?: string | React.ReactNode } {
  // Draft step - show created/submitted info
  if (step.key === 'draft' && requestMetadata) {
    // If submitted (Draft step is completed)
    if (status === 'completed' && requestMetadata.submittedOn) {
      return {
        description1: createDateElement('Submitted', requestMetadata.submittedOn),
        description2: createUserElement(requestMetadata.submittedByLogin, requestMetadata.submittedBy),
      };
    }
    // If saved but not submitted (Draft is current)
    if (status === 'current' && requestMetadata.createdOn) {
      return {
        description1: createDateElement('Created', requestMetadata.createdOn),
        description2: createUserElement(requestMetadata.createdByLogin, requestMetadata.createdBy),
      };
    }
  }

  // Legal Intake step (combined with Assign Attorney)
  if (step.key === 'legalIntake' && requestMetadata) {
    // If completed - show who completed it
    if (status === 'completed' && requestMetadata.legalIntakeCompletedOn) {
      return {
        description1: createDateElement('Completed', requestMetadata.legalIntakeCompletedOn),
        description2: requestMetadata.assignedAttorney
          ? createUserElement(requestMetadata.assignedAttorneyLogin, requestMetadata.assignedAttorney)
          : createUserElement(requestMetadata.legalIntakeCompletedByLogin, requestMetadata.legalIntakeCompletedBy),
      };
    }
    // If current - show waiting since submitted or pending assignment
    if (status === 'current' && requestMetadata.submittedOn) {
      // If attorney is assigned, show assignment info
      if (requestMetadata.assignedAttorney) {
        return {
          description1: 'Pending committee',
          description2: createUserElement(requestMetadata.assignedAttorneyLogin, requestMetadata.assignedAttorney),
        };
      }
      // Otherwise show waiting for triage
      return {
        description1: createDateElement('Waiting since', requestMetadata.submittedOn),
        description2: 'Pending triage',
      };
    }
  }

  // Review step (formerly In Review)
  if (step.key === 'inReview' && requestMetadata) {
    // If completed - show when review was completed and by whom
    if (status === 'completed') {
      // Determine the last reviewer based on review audience and completion dates
      let lastReviewDate: Date | undefined;
      let lastReviewerLogin: string | undefined;
      let lastReviewerName: string | undefined;

      if (requestMetadata.reviewAudience === 'Both') {
        // Both reviews - find the later completion date
        const legalDate = requestMetadata.legalReviewCompletedOn;
        const complianceDate = requestMetadata.complianceReviewCompletedOn;

        if (legalDate && complianceDate) {
          const legalTime = legalDate instanceof Date ? legalDate.getTime() : new Date(legalDate).getTime();
          const complianceTime = complianceDate instanceof Date ? complianceDate.getTime() : new Date(complianceDate).getTime();

          if (legalTime > complianceTime) {
            lastReviewDate = legalDate;
            lastReviewerLogin = requestMetadata.legalReviewCompletedByLogin;
            lastReviewerName = requestMetadata.legalReviewCompletedBy;
          } else {
            lastReviewDate = complianceDate;
            lastReviewerLogin = requestMetadata.complianceReviewCompletedByLogin;
            lastReviewerName = requestMetadata.complianceReviewCompletedBy;
          }
        } else {
          lastReviewDate = legalDate || complianceDate;
          if (legalDate) {
            lastReviewerLogin = requestMetadata.legalReviewCompletedByLogin;
            lastReviewerName = requestMetadata.legalReviewCompletedBy;
          } else {
            lastReviewerLogin = requestMetadata.complianceReviewCompletedByLogin;
            lastReviewerName = requestMetadata.complianceReviewCompletedBy;
          }
        }
      } else if (requestMetadata.reviewAudience === 'Legal') {
        lastReviewDate = requestMetadata.legalReviewCompletedOn;
        lastReviewerLogin = requestMetadata.legalReviewCompletedByLogin;
        lastReviewerName = requestMetadata.legalReviewCompletedBy;
      } else if (requestMetadata.reviewAudience === 'Compliance') {
        lastReviewDate = requestMetadata.complianceReviewCompletedOn;
        lastReviewerLogin = requestMetadata.complianceReviewCompletedByLogin;
        lastReviewerName = requestMetadata.complianceReviewCompletedBy;
      }

      // Fall back to closeoutStartedOn if no specific review date
      const completedDate = lastReviewDate || requestMetadata.closeoutStartedOn;

      return {
        description1: createDateElement('Completed', completedDate),
        description2: lastReviewerLogin
          ? createUserElement(lastReviewerLogin, lastReviewerName)
          : (requestMetadata.reviewAudience ? `${requestMetadata.reviewAudience} review` : undefined),
      };
    }
    // If current - show review completion status
    if (status === 'current') {
      // Build review status description
      const reviewParts: string[] = [];

      // Check legal review status
      if (requestMetadata.reviewAudience === 'Legal' || requestMetadata.reviewAudience === 'Both') {
        if (requestMetadata.legalReviewCompleted) {
          reviewParts.push(`Legal: ${requestMetadata.legalReviewOutcome || 'Completed'}`);
        } else {
          reviewParts.push('Legal: In Progress');
        }
      }

      // Check compliance review status
      if (requestMetadata.reviewAudience === 'Compliance' || requestMetadata.reviewAudience === 'Both') {
        if (requestMetadata.complianceReviewCompleted) {
          reviewParts.push(`Compliance: ${requestMetadata.complianceReviewOutcome || 'Completed'}`);
        } else {
          reviewParts.push('Compliance: In Progress');
        }
      }

      // If we have review parts, show them
      if (reviewParts.length > 0) {
        return {
          description1: createDateElement('In review since', requestMetadata.reviewStartedOn),
          description2: reviewParts.join(' | '),
        };
      }

      // Fallback to simple audience display
      return {
        description1: createDateElement('In review since', requestMetadata.reviewStartedOn),
        description2: requestMetadata.reviewAudience ? `${requestMetadata.reviewAudience} review` : undefined,
      };
    }
  }

  // Closeout step (merged with Completed status)
  if (step.key === 'closeout' && requestMetadata) {
    // If completed - show when completed and by whom
    if (status === 'completed' && requestMetadata.completedOn) {
      return {
        description1: createDateElement('Completed', requestMetadata.completedOn),
        description2: requestMetadata.closeoutCompletedByLogin
          ? createUserElement(requestMetadata.closeoutCompletedByLogin, requestMetadata.closeoutCompletedBy)
          : (requestMetadata.trackingId ? `ID: ${requestMetadata.trackingId}` : undefined),
      };
    }
    // If current - show closeout started
    if (status === 'current' && requestMetadata.closeoutStartedOn) {
      return {
        description1: createDateElement('Started', requestMetadata.closeoutStartedOn),
        description2: requestMetadata.trackingId ? `ID: ${requestMetadata.trackingId}` : 'Pending completion',
      };
    }
  }

  // FINRA Documents step
  if (step.key === 'finraDocuments' && requestMetadata) {
    // Completed - show when FINRA was completed and by whom
    if (status === 'completed' && requestMetadata.finraCompletedOn) {
      return {
        description1: createDateElement('Completed', requestMetadata.finraCompletedOn),
        description2: requestMetadata.finraCompletedByLogin
          ? createUserElement(requestMetadata.finraCompletedByLogin, requestMetadata.finraCompletedBy)
          : (requestMetadata.finraCompletedBy ? `by ${requestMetadata.finraCompletedBy}` : undefined),
      };
    }
    // Current - awaiting documents
    if (status === 'current') {
      return {
        description1: 'Awaiting FINRA documents',
        description2: 'Upload documents to complete',
      };
    }
  }

  // Default descriptions
  return {
    description1: step.description,
    description2: step.isOptional ? 'Optional' : undefined,
  };
}

/**
 * Convert application workflow step to toolkit StepData format
 */
function convertToStepData(
  step: IWorkflowStep,
  currentStatus: RequestStatus | undefined,
  mode: AppStepperMode,
  requestMetadata?: IRequestMetadata
): StepData {
  // In informational mode, all steps are pending and clickable
  const status =
    mode === 'informational' ? 'pending' : currentStatus ? determineStepStatus(step, currentStatus, requestMetadata) : 'pending';

  // In informational mode: all steps clickable (for preview)
  // In progress mode: only completed or current steps clickable (not pending/future steps)
  const isClickable = mode === 'informational' ? true : (status === 'completed' || status === 'current');

  // Get descriptions based on metadata and status
  const { description1, description2 } = getStepDescriptions(step, status, requestMetadata);

  // For the Draft step, show "Request" instead of "Draft" once submitted (step is completed)
  let title = step.label;
  if (step.key === 'draft' && status === 'completed') {
    title = 'Request';
  }

  return {
    id: step.key,
    title,
    description1,
    description2,
    status,
    content: step.content ? renderStepContent(step.content) : undefined,
    isClickable,
  };
}

/**
 * FINRA Documents step definition
 * This step is conditionally added when isForesideReviewRequired is true
 */
const finraDocumentsStep: IWorkflowStep = {
  key: 'finraDocuments',
  label: 'FINRA',
  description: 'Awaiting documents',
  requestStatus: RequestStatus.AwaitingFINRADocuments,
  isOptional: true, // Only shown when Foreside review is required
  content: stepContents.finraDocuments,
  order: 5,
};

/**
 * Cancelled step definition
 * This step is added when status is Cancelled, shown after previousStatus step
 */
const cancelledStep: IWorkflowStep = {
  key: 'cancelled',
  label: 'Cancelled',
  description: 'Request cancelled',
  requestStatus: RequestStatus.Cancelled,
  isOptional: false,
  content: stepContents.cancelled,
  order: 99, // Always at end
};

/**
 * On Hold step definition
 * This step is added when status is OnHold, shown after previousStatus step
 */
const onHoldStep: IWorkflowStep = {
  key: 'onHold',
  label: 'On Hold',
  description: 'Request paused',
  requestStatus: RequestStatus.OnHold,
  isOptional: false,
  content: stepContents.onHold,
  order: 99, // Always at end
};

/**
 * Get step descriptions for terminal states (Cancelled/OnHold)
 */
function getTerminalStepDescriptions(
  stepKey: string,
  requestMetadata?: IRequestMetadata
): { description1: string | React.ReactNode; description2?: string | React.ReactNode } {
  if (stepKey === 'cancelled' && requestMetadata) {
    const cancelledOn = requestMetadata.cancelledOn;
    const cancelledBy = requestMetadata.cancelledBy;
    const cancelledByLogin = requestMetadata.cancelledByLogin;

    return {
      description1: cancelledOn ? createDateElement('Cancelled', cancelledOn) : 'Cancelled',
      description2: cancelledByLogin
        ? createUserElement(cancelledByLogin, cancelledBy)
        : (cancelledBy ? `by ${cancelledBy}` : undefined),
    };
  }

  if (stepKey === 'onHold' && requestMetadata) {
    const onHoldSince = requestMetadata.onHoldSince;
    const onHoldBy = requestMetadata.onHoldBy;
    const onHoldByLogin = requestMetadata.onHoldByLogin;

    return {
      description1: onHoldSince ? createDateElement('On hold since', onHoldSince) : 'On Hold',
      description2: onHoldByLogin
        ? createUserElement(onHoldByLogin, onHoldBy)
        : (onHoldBy ? `by ${onHoldBy}` : undefined),
    };
  }

  return { description1: 'Terminal state' };
}

/**
 * Convert terminal step to StepData format
 */
function convertTerminalStepToStepData(
  step: IWorkflowStep,
  status: 'error' | 'blocked',
  requestMetadata?: IRequestMetadata
): StepData {
  const { description1, description2 } = getTerminalStepDescriptions(step.key, requestMetadata);

  return {
    id: step.key,
    title: step.label,
    description1,
    description2,
    status,
    content: step.content ? renderStepContent(step.content) : undefined,
    isClickable: true, // Allow clicking to see details
  };
}

/**
 * Get steps as StepData array for use with toolkit WorkflowStepper
 *
 * Conditionally includes:
 * - FINRA Documents step when isForesideReviewRequired is true
 * - Cancelled step when status is Cancelled (shown after previousStatus)
 * - OnHold step when status is OnHold (shown after previousStatus)
 */
export function getStepsForStepper(
  requestType: RequestType,
  currentStatus: RequestStatus | undefined,
  mode: AppStepperMode,
  requestMetadata?: IRequestMetadata
): StepData[] {
  const steps = getWorkflowSteps(requestType);

  // Determine if FINRA Documents step should be included
  // Show it if: isForesideReviewRequired is true OR current status is AwaitingFINRADocuments
  const shouldIncludeFINRAStep =
    requestMetadata?.isForesideReviewRequired === true ||
    currentStatus === RequestStatus.AwaitingFINRADocuments;

  // Build the base steps array
  let finalSteps = [...steps];
  if (shouldIncludeFINRAStep) {
    finalSteps.push(finraDocumentsStep);
  }

  // Convert base steps to StepData
  const stepDataArray = finalSteps.map((step) => convertToStepData(step, currentStatus, mode, requestMetadata));

  // For Cancelled status: Show only completed steps + Cancelled step
  if (currentStatus === RequestStatus.Cancelled) {
    const previousStatus = requestMetadata?.previousStatus;
    const previousStepKey = previousStatus ? getStepKeyForStatus(previousStatus) : 'draft';

    // Filter to only keep steps up to and including previousStatus, mark them as completed
    let foundPreviousStep = false;
    const filteredSteps: StepData[] = [];

    for (let i = 0; i < stepDataArray.length; i++) {
      const step = stepDataArray[i];
      if (step.id === previousStepKey) {
        // This is the step where cancellation happened - mark as completed
        step.status = 'completed';
        filteredSteps.push(step);
        foundPreviousStep = true;
      } else if (!foundPreviousStep) {
        // Steps before previousStatus - mark as completed
        step.status = 'completed';
        filteredSteps.push(step);
      }
      // Steps after previousStatus are excluded (not added to filteredSteps)
    }

    // Add the Cancelled step at the end
    filteredSteps.push(convertTerminalStepToStepData(cancelledStep, 'error', requestMetadata));

    return filteredSteps;
  }

  // For OnHold status: Show only completed steps + current step + OnHold step
  if (currentStatus === RequestStatus.OnHold) {
    const previousStatus = requestMetadata?.previousStatus;
    const previousStepKey = previousStatus ? getStepKeyForStatus(previousStatus) : 'draft';

    // Filter to only keep steps up to and including previousStatus
    let foundPreviousStep = false;
    const filteredSteps: StepData[] = [];

    for (let i = 0; i < stepDataArray.length; i++) {
      const step = stepDataArray[i];
      if (step.id === previousStepKey) {
        // This is the step where hold happened - mark as current (paused)
        step.status = 'warning';
        filteredSteps.push(step);
        foundPreviousStep = true;
      } else if (!foundPreviousStep) {
        // Steps before previousStatus - mark as completed
        step.status = 'completed';
        filteredSteps.push(step);
      }
      // Steps after previousStatus are excluded (not added to filteredSteps)
    }

    // Add the OnHold step at the end
    filteredSteps.push(convertTerminalStepToStepData(onHoldStep, 'blocked', requestMetadata));

    return filteredSteps;
  }

  return stepDataArray;
}

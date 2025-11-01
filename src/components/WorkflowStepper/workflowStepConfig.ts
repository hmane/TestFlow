/**
 * Workflow step configurations for different request types
 */

import * as React from 'react';
import { RequestStatus, RequestType } from '../../types';
import type { IWorkflowStep, IStepContent, StepData, AppStepperMode } from './WorkflowStepperTypes';

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
    description: 'Final review and tracking ID assignment',
    details: [
      'All required reviews have been completed',
      'Tracking ID is assigned if required (Compliance + Foreside/Retail)',
      'Final documentation is prepared',
      'Request is prepared for completion',
    ],
    tips: [
      'Review the final outcomes from all reviewers',
      'Tracking ID is only required for specific compliance scenarios',
      'Save all final documentation for your records',
    ],
    estimatedDuration: '1 business day',
    whoIsInvolved: ['Submitter', 'Legal Admin'],
  },
  completed: {
    title: 'Completed',
    description: 'Request has been fully processed',
    details: [
      'All reviews are complete and documented',
      'Final outcome has been communicated',
      'Tracking ID has been assigned (if applicable)',
      'All documentation is archived',
      'Request is closed',
    ],
    tips: [
      'Download and save all final documentation',
      'Note the tracking ID for future reference',
      'Materials can now be used per review outcomes',
    ],
    estimatedDuration: 'N/A',
    whoIsInvolved: ['All parties'],
  },
};

/**
 * Get step configuration for Communication request type
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
      description: 'Initial review',
      requestStatus: RequestStatus.LegalIntake,
      isOptional: false,
      content: stepContents.legalIntake,
      order: 2,
    },
    {
      key: 'assignAttorney',
      label: 'Assign Attorney',
      description: 'Committee review',
      requestStatus: RequestStatus.AssignAttorney,
      isOptional: true,
      content: stepContents.assignAttorney,
      order: 3,
    },
    {
      key: 'inReview',
      label: 'In Review',
      description: 'Legal/Compliance review',
      requestStatus: RequestStatus.InReview,
      isOptional: false,
      content: stepContents.inReview,
      order: 4,
    },
    {
      key: 'closeout',
      label: 'Closeout',
      description: 'Final steps',
      requestStatus: RequestStatus.Closeout,
      isOptional: false,
      content: stepContents.closeout,
      order: 5,
    },
    {
      key: 'completed',
      label: 'Completed',
      description: 'Request closed',
      requestStatus: RequestStatus.Completed,
      isOptional: false,
      content: stepContents.completed,
      order: 6,
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
 * Determine toolkit step status based on current request status
 */
function determineStepStatus(
  step: IWorkflowStep,
  currentStatus: RequestStatus
): 'completed' | 'current' | 'pending' | 'warning' | 'error' | 'blocked' {
  const statusOrder: Record<RequestStatus, number> = {
    [RequestStatus.Draft]: 1,
    [RequestStatus.LegalIntake]: 2,
    [RequestStatus.AssignAttorney]: 3,
    [RequestStatus.InReview]: 4,
    [RequestStatus.Closeout]: 5,
    [RequestStatus.Completed]: 6,
    [RequestStatus.Cancelled]: 0,
    [RequestStatus.OnHold]: 0,
  };

  const currentOrder = statusOrder[currentStatus];
  const stepOrder = statusOrder[step.requestStatus];

  // Handle special statuses
  if (currentStatus === RequestStatus.Cancelled) {
    return 'error';
  }

  if (currentStatus === RequestStatus.OnHold) {
    return 'warning';
  }

  // Completed steps
  if (stepOrder < currentOrder) {
    return 'completed';
  }

  // Current step
  if (stepOrder === currentOrder) {
    return 'current';
  }

  // Future steps
  return 'pending';
}

/**
 * Render step content as React node
 */
function renderStepContent(content: IStepContent): React.ReactNode {
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
    content.tips &&
      content.tips.length > 0 &&
      React.createElement(
        'div',
        { style: { marginBottom: '16px' } },
        React.createElement('h4', null, 'Tips:'),
        React.createElement(
          'ul',
          null,
          content.tips.map((tip, index) => React.createElement('li', { key: `tip-${index}` }, tip))
        )
      ),

    // Metadata section
    React.createElement(
      'div',
      { style: { marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #ddd' } },
      content.estimatedDuration &&
        React.createElement(
          'p',
          null,
          React.createElement('strong', null, 'Estimated Duration: '),
          content.estimatedDuration
        ),
      content.whoIsInvolved &&
        content.whoIsInvolved.length > 0 &&
        React.createElement(
          'p',
          null,
          React.createElement('strong', null, 'Who Is Involved: '),
          content.whoIsInvolved.join(', ')
        ),
      content.requiredFields &&
        content.requiredFields.length > 0 &&
        React.createElement(
          'div',
          null,
          React.createElement('strong', null, 'Required Fields:'),
          React.createElement(
            'ul',
            { style: { marginTop: '8px' } },
            content.requiredFields.map((field, index) =>
              React.createElement('li', { key: `field-${index}` }, field)
            )
          )
        )
    )
  );
}

/**
 * Convert application workflow step to toolkit StepData format
 */
function convertToStepData(
  step: IWorkflowStep,
  currentStatus: RequestStatus | undefined,
  mode: AppStepperMode
): StepData {
  // In informational mode, all steps are pending and clickable
  const status =
    mode === 'informational' ? 'pending' : currentStatus ? determineStepStatus(step, currentStatus) : 'pending';

  // In informational mode: all steps clickable (for preview)
  // In progress mode: only completed or current steps clickable (not pending/future steps)
  const isClickable = mode === 'informational' ? true : (status === 'completed' || status === 'current');

  return {
    id: step.key,
    title: step.label,
    description1: step.description,
    description2: step.isOptional ? 'Optional' : undefined,
    status,
    content: step.content ? renderStepContent(step.content) : undefined,
    isClickable,
  };
}

/**
 * Get steps as StepData array for use with toolkit WorkflowStepper
 */
export function getStepsForStepper(
  requestType: RequestType,
  currentStatus: RequestStatus | undefined,
  mode: AppStepperMode
): StepData[] {
  const steps = getWorkflowSteps(requestType);
  return steps.map((step) => convertToStepData(step, currentStatus, mode));
}

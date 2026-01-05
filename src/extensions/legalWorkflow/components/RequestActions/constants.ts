/**
 * RequestActions Constants
 *
 * Field labels and ordering for validation error display.
 */

/**
 * Active action type
 */
export type ActiveAction =
  | 'submit'
  | 'save'
  | 'cancel'
  | 'hold'
  | 'resume'
  | 'assignAttorney'
  | 'sendToCommittee'
  | 'closeout'
  | 'completeForesideDocuments'
  | undefined;

/**
 * Field label mapping for friendly display names
 */
export const FIELD_LABELS: Record<string, string> = {
  requestTitle: 'Request Title',
  requestType: 'Request Type',
  purpose: 'Purpose',
  submissionType: 'Submission Type',
  submissionItem: 'Submission Item',
  submissionItemOther: 'Submission Item (Other)',
  targetReturnDate: 'Target Return Date',
  reviewAudience: 'Review Audience',
  requiresCommunicationsApproval: 'Communications Approval Required',
  distributionMethod: 'Distribution Method',
  dateOfFirstUse: 'Date of First Use',
  priorSubmissions: 'Prior Submissions',
  priorSubmissionNotes: 'Prior Submission Notes',
  additionalParty: 'Additional Parties',
  rushRationale: 'Rush Rationale',
  approvals: 'Approvals',
  finraAudienceCategory: 'FINRA Audience Category',
  audience: 'Audience',
  usFunds: 'US Funds',
  ucits: 'UCITS',
  separateAcctStrategies: 'Separate Account Strategies',
  separateAcctStrategiesIncl: 'Separate Account Strategies Includes',
  department: 'Department',
  attachments: 'Attachments',
  // Legal Intake fields
  attorney: 'Assign Attorney',
  attorneyAssignNotes: 'Assignment Notes',
  // Closeout fields
  trackingId: 'Tracking ID',
  commentsAcknowledged: 'Comments Acknowledgment',
};

/**
 * Field order for sorting validation errors to match form layout
 * Lower index = higher priority (appears first in error list)
 */
export const FIELD_ORDER: Record<string, number> = {
  // Basic Information section
  requestType: 1,
  requestTitle: 2,
  purpose: 3,
  submissionType: 4,
  submissionItem: 5,
  submissionItemOther: 6,
  targetReturnDate: 7,
  rushRationale: 8,
  // Distribution & Audience section
  reviewAudience: 10,
  distributionMethod: 11,
  dateOfFirstUse: 12,
  // Product & Audience section
  finraAudienceCategory: 20,
  audience: 21,
  usFunds: 22,
  ucits: 23,
  separateAcctStrategies: 24,
  separateAcctStrategiesIncl: 25,
  // Prior Submissions section
  priorSubmissions: 30,
  priorSubmissionNotes: 31,
  // Additional Parties section
  additionalParty: 40,
  // Approvals section
  approvals: 50,
  // Attachments section
  attachments: 60,
  // Legal Intake section (appears after main form sections)
  attorney: 70,
  attorneyAssignNotes: 71,
  // Closeout section
  trackingId: 80,
  commentsAcknowledged: 81,
};

/**
 * Custom section mapping for scroll-to-field functionality
 */
export const CUSTOM_SECTION_MAP: Record<string, string> = {
  approvals: 'approvals-card',
  attorney: 'legal-intake-card',
  attorneyAssignNotes: 'legal-intake-card',
  reviewAudience: 'legal-intake-card',
  // Closeout fields
  trackingId: 'closeout-card',
  commentsAcknowledged: 'closeout-card',
};

/**
 * Fields that have their own ValidationErrorContainer in section cards.
 * These should be excluded from the global RequestActions error display
 * to avoid duplicate error messages.
 */
export const SECTION_HANDLED_FIELDS: string[] = [
  // Legal Intake fields - shown in LegalIntakeForm
  'attorney',
  'attorneyAssignNotes',
  'reviewAudience',
  // Legal Review fields - shown in LegalReviewForm
  'legalReviewOutcome',
  'legalReviewNotes',
  // Compliance Review fields - shown in ComplianceReviewForm
  'complianceReviewOutcome',
  'complianceReviewNotes',
  // Closeout fields - shown in CloseoutForm
  'trackingId',
  'commentsAcknowledged',
  'closeoutNotes',
];

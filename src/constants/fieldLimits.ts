/**
 * Field Length Limits
 *
 * Centralized constants for field character limits.
 * Used in both Zod schemas for validation and form components for maxLength/charCount.
 *
 * Changing a value here will update both validation and UI consistently.
 */

/**
 * Notes and text area field limits
 */
export const NOTES_MAX_LENGTH = 1000;
export const DESCRIPTION_MAX_LENGTH = 1000;
export const REASON_MAX_LENGTH = 1000;
export const RUSH_RATIONALE_MAX_LENGTH = 1000;

/**
 * Purpose and longer text area field limits
 */
export const PURPOSE_MAX_LENGTH = 1000;
export const STATUS_NOTES_MAX_LENGTH = 1000;

/**
 * Review notes field limits
 */
export const REVIEW_NOTES_MAX_LENGTH = 2000;
export const CLOSEOUT_NOTES_MAX_LENGTH = 2000;

/**
 * Resubmit notes field limits (longer to allow detailed responses)
 */
export const RESUBMIT_NOTES_MAX_LENGTH = 4000;

/**
 * Title and single-line text field limits
 */
export const TITLE_MAX_LENGTH = 255;
export const TRACKING_ID_MAX_LENGTH = 50;
export const APPROVAL_TITLE_MAX_LENGTH = 100;
export const DEPARTMENT_MAX_LENGTH = 100;

/**
 * Error messages for field limits
 * These can be used in Zod schemas for consistent messaging
 */
export const FIELD_LIMIT_MESSAGES = {
  notes: `Notes cannot exceed ${NOTES_MAX_LENGTH} characters`,
  description: `Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters`,
  cancelReason: `Cancel reason cannot exceed ${REASON_MAX_LENGTH} characters`,
  holdReason: `Hold reason cannot exceed ${REASON_MAX_LENGTH} characters`,
  rushRationale: `Rush rationale cannot exceed ${RUSH_RATIONALE_MAX_LENGTH} characters`,
  assignmentNotes: `Assignment notes cannot exceed ${NOTES_MAX_LENGTH} characters`,
  title: `Title cannot exceed ${TITLE_MAX_LENGTH} characters`,
  trackingId: `Tracking ID cannot exceed ${TRACKING_ID_MAX_LENGTH} characters`,
  purpose: `Purpose cannot exceed ${PURPOSE_MAX_LENGTH} characters`,
  statusNotes: `Status notes cannot exceed ${STATUS_NOTES_MAX_LENGTH} characters`,
  reviewNotes: `Review notes cannot exceed ${REVIEW_NOTES_MAX_LENGTH} characters`,
  closeoutNotes: `Closeout notes cannot exceed ${CLOSEOUT_NOTES_MAX_LENGTH} characters`,
  resubmitNotes: `Resubmit notes cannot exceed ${RESUBMIT_NOTES_MAX_LENGTH} characters`,
  approvalTitle: `Approval title cannot exceed ${APPROVAL_TITLE_MAX_LENGTH} characters`,
  department: `Department cannot exceed ${DEPARTMENT_MAX_LENGTH} characters`,
} as const;

/**
 * ValidationErrorContainer Component
 *
 * Reusable component for displaying validation errors above action buttons.
 * Shows a summary of field-level validation errors with clickable links
 * to navigate to the problematic fields.
 *
 * Usage:
 * - Place this component just above action buttons in form footers
 * - Pass validation errors from RequestFormContext or local form state
 * - Optionally filter errors to only show relevant fields for that section
 */

import * as React from 'react';

// Fluent UI - tree-shaken imports
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Stack } from '@fluentui/react/lib/Stack';

// Types
import type { IValidationError } from '@contexts/RequestFormContext';

/**
 * Props for ValidationErrorContainer
 */
export interface IValidationErrorContainerProps {
  /** Array of validation errors to display */
  errors: IValidationError[];
  /** Callback to scroll/focus a field when user clicks an error link */
  onScrollToField?: (fieldName: string) => void;
  /** Optional function to get human-readable label for a field */
  getFieldLabel?: (fieldName: string) => string;
  /** Optional filter function to show only specific errors */
  filterFields?: string[];
  /** Optional styles override for the container */
  styles?: {
    root?: React.CSSProperties;
  };
}

/**
 * Default field labels for common fields
 */
const DEFAULT_FIELD_LABELS: Record<string, string> = {
  // Request Info fields
  title: 'Request Title',
  requestType: 'Request Type',
  purpose: 'Purpose',
  targetReturnDate: 'Target Return Date',
  submissionItem: 'Submission Type',
  foresideReviewRequired: 'Foreside Review Required',
  retailUse: 'Retail Use',
  foresideFilingDeadline: 'Foreside Filing Deadline',
  finraAudienceCategory: 'FINRA Audience Category',
  audience: 'Audience',
  usFunds: 'US Funds',
  ucits: 'UCITS',
  separateAccountStrategies: 'Separate Account Strategies',
  separateAccountStrategiesIncludes: 'Separate Account Strategies Includes',
  // Legal Intake fields
  attorney: 'Assigned Attorney',
  attorneyAssignNotes: 'Assignment Notes',
  reviewAudience: 'Review Audience',
  // Review fields
  legalReviewOutcome: 'Legal Review Outcome',
  legalReviewNotes: 'Legal Review Notes',
  complianceReviewOutcome: 'Compliance Review Outcome',
  complianceReviewNotes: 'Compliance Review Notes',
  // Closeout fields
  trackingId: 'Tracking ID',
  finraDocuments: 'FINRA Documents',
  // Approval fields
  approvals: 'Approvals',
};

/**
 * Get human-readable label for a field
 */
function getDefaultFieldLabel(fieldName: string): string {
  return DEFAULT_FIELD_LABELS[fieldName] || fieldName;
}

/**
 * ValidationErrorContainer Component
 * Supports ref forwarding for scroll-to-error functionality
 */
export const ValidationErrorContainer = React.forwardRef<HTMLDivElement, IValidationErrorContainerProps>(
  ({ errors, onScrollToField, getFieldLabel = getDefaultFieldLabel, filterFields, styles }, ref) => {
    // Filter errors if filterFields is provided
    const filteredErrors = React.useMemo(() => {
      if (!errors || errors.length === 0) return [];
      if (!filterFields || filterFields.length === 0) return errors;
      return errors.filter(error => filterFields.includes(error.field));
    }, [errors, filterFields]);

    // Don't render if no errors
    if (filteredErrors.length === 0) {
      return null;
    }

    return (
      <div
        ref={ref}
        role='alert'
        aria-live='assertive'
        tabIndex={-1}
        style={{ outline: 'none', ...styles?.root }}
      >
      <MessageBar
        messageBarType={MessageBarType.error}
        isMultiline={true}
        styles={{
          root: {
            borderRadius: '4px',
          },
        }}
      >
        <Stack tokens={{ childrenGap: 4 }}>
          <span style={{ fontWeight: 600 }}>
            Please fix the following errors before continuing:
          </span>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            {filteredErrors.map((error, index) => (
              <li key={`error-${index}`} style={{ marginBottom: '4px' }}>
                {onScrollToField ? (
                  <button
                    type='button'
                    onClick={() => onScrollToField(error.field)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      margin: 0,
                      font: 'inherit',
                      fontWeight: 600,
                      color: '#0078d4',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                    aria-label={`Go to ${getFieldLabel(error.field)} field`}
                  >
                    {getFieldLabel(error.field)}
                  </button>
                ) : (
                  <span style={{ fontWeight: 600 }}>{getFieldLabel(error.field)}</span>
                )}
                : {error.message}
              </li>
            ))}
          </ul>
        </Stack>
      </MessageBar>
      </div>
    );
  }
);

ValidationErrorContainer.displayName = 'ValidationErrorContainer';

export default ValidationErrorContainer;

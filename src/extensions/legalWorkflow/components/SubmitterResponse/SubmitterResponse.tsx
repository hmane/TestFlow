/**
 * SubmitterResponse Component
 *
 * Shown to submitters when Legal or Compliance sends the request back
 * for additional information or document updates.
 *
 * Features:
 * - Displays notes from reviewer explaining what's needed
 * - Shows "Send to Attorney" / "Send to Compliance" buttons
 * - Enables document upload/editing while with submitter
 */

import * as React from 'react';

// Fluent UI - tree-shaken imports
import { PrimaryButton } from '@fluentui/react/lib/Button';
import { Icon } from '@fluentui/react/lib/Icon';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { TextField } from '@fluentui/react/lib/TextField';

// spfx-toolkit - tree-shaken imports
import { Card } from 'spfx-toolkit/lib/components/Card';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

// App imports using path aliases
import { useRequestFormContext } from '@contexts/RequestFormContext';
import { usePermissions } from '@hooks/usePermissions';
import { LegalReviewStatus, ComplianceReviewStatus } from '@appTypes/workflowTypes';

/**
 * SubmitterResponse Component Props
 */
export interface ISubmitterResponseProps {
  itemId: number;
  legalReviewStatus?: LegalReviewStatus;
  complianceReviewStatus?: ComplianceReviewStatus;
  legalReviewNotes?: string;
  complianceReviewNotes?: string;
  onSendToAttorney: () => Promise<void>;
  onSendToCompliance: () => Promise<void>;
}

/**
 * SubmitterResponse Component
 */
export const SubmitterResponse: React.FC<ISubmitterResponseProps> = ({
  itemId,
  legalReviewStatus,
  complianceReviewStatus,
  legalReviewNotes,
  complianceReviewNotes,
  onSendToAttorney,
  onSendToCompliance,
}) => {
  const { isLoading } = useRequestFormContext();
  const { isSubmitter } = usePermissions();

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitterNotes, setSubmitterNotes] = React.useState('');

  // Check if waiting on submitter for either review
  const waitingOnLegal = legalReviewStatus === LegalReviewStatus.WaitingOnSubmitter;
  const waitingOnCompliance = complianceReviewStatus === ComplianceReviewStatus.WaitingOnSubmitter;

  // Don't show if not waiting on submitter
  if (!waitingOnLegal && !waitingOnCompliance) {
    return null;
  }

  // Don't show if not submitter
  if (!isSubmitter) {
    return null;
  }

  /**
   * Handle send to attorney
   */
  const handleSendToAttorney = React.useCallback(async () => {
    setIsSubmitting(true);
    try {
      await onSendToAttorney();
      SPContext.logger.success('Request sent back to attorney', { itemId });
      setSubmitterNotes('');
    } catch (error) {
      SPContext.logger.error('Failed to send to attorney', error, { itemId });
    } finally {
      setIsSubmitting(false);
    }
  }, [itemId, onSendToAttorney]);

  /**
   * Handle send to compliance
   */
  const handleSendToCompliance = React.useCallback(async () => {
    setIsSubmitting(true);
    try {
      await onSendToCompliance();
      SPContext.logger.success('Request sent back to compliance', { itemId });
      setSubmitterNotes('');
    } catch (error) {
      SPContext.logger.error('Failed to send to compliance', error, { itemId });
    } finally {
      setIsSubmitting(false);
    }
  }, [itemId, onSendToCompliance]);

  return (
    <Stack
      tokens={{ childrenGap: 24 }}
      styles={{
        root: {
          padding: '24px',
          width: '100%',
        },
      }}
    >
      <Card id="submitter-response-card">
        <Stack
          tokens={{ childrenGap: 16 }}
          styles={{
            root: {
              padding: '24px',
            },
          }}
        >
          {/* Header */}
          <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 12 }}>
            <Icon
              iconName="Reply"
              styles={{
                root: {
                  fontSize: '24px',
                  color: '#d83b01', // Orange for attention
                },
              }}
            />
            <Text variant="xLarge" styles={{ root: { fontWeight: 600 } }}>
              Additional Information Requested
            </Text>
          </Stack>

          {/* Message bar */}
          <MessageBar messageBarType={MessageBarType.warning}>
            The reviewer has requested additional information or changes. Please review the
            comments below, make necessary updates, and send the request back when ready.
          </MessageBar>

          {/* Legal review comments */}
          {waitingOnLegal && legalReviewNotes && (
            <Stack tokens={{ childrenGap: 8 }}>
              <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
                Legal Review Comments
              </Text>
              <Stack
                styles={{
                  root: {
                    padding: '12px',
                    background: '#fef6f6',
                    border: '1px solid #fde7e9',
                    borderRadius: '4px',
                  },
                }}
              >
                <Text styles={{ root: { whiteSpace: 'pre-wrap' } }}>
                  {legalReviewNotes}
                </Text>
              </Stack>
            </Stack>
          )}

          {/* Compliance review comments */}
          {waitingOnCompliance && complianceReviewNotes && (
            <Stack tokens={{ childrenGap: 8 }}>
              <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
                Compliance Review Comments
              </Text>
              <Stack
                styles={{
                  root: {
                    padding: '12px',
                    background: '#fef6f6',
                    border: '1px solid #fde7e9',
                    borderRadius: '4px',
                  },
                }}
              >
                <Text styles={{ root: { whiteSpace: 'pre-wrap' } }}>
                  {complianceReviewNotes}
                </Text>
              </Stack>
            </Stack>
          )}

          {/* Submitter notes */}
          <TextField
            label="Your Response (Optional)"
            placeholder="Add notes about the changes you made..."
            multiline
            rows={4}
            value={submitterNotes}
            onChange={(e, value) => setSubmitterNotes(value || '')}
            disabled={isLoading || isSubmitting}
          />

          {/* Action buttons */}
          <Stack
            horizontal
            tokens={{ childrenGap: 12 }}
            styles={{
              root: {
                marginTop: '8px',
              },
            }}
          >
            {waitingOnLegal && (
              <PrimaryButton
                text="Send to Attorney"
                iconProps={{ iconName: 'Send' }}
                onClick={handleSendToAttorney}
                disabled={isLoading || isSubmitting}
                styles={{
                  root: {
                    minWidth: '140px',
                  },
                }}
              />
            )}

            {waitingOnCompliance && (
              <PrimaryButton
                text="Send to Compliance"
                iconProps={{ iconName: 'Send' }}
                onClick={handleSendToCompliance}
                disabled={isLoading || isSubmitting}
                styles={{
                  root: {
                    minWidth: '140px',
                  },
                }}
              />
            )}
          </Stack>

          {/* Helper text */}
          <Text
            variant="small"
            styles={{
              root: {
                color: '#605e5c',
                fontStyle: 'italic',
              },
            }}
          >
            {waitingOnLegal && waitingOnCompliance
              ? 'You can address both reviews and send back separately, or make all changes and send to both.'
              : 'After making the requested changes, click the button above to send the request back for review.'}
          </Text>
        </Stack>
      </Card>
    </Stack>
  );
};

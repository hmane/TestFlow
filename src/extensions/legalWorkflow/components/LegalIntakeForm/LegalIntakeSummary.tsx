/**
 * LegalIntakeSummary Component
 *
 * Read-only summary view of completed Legal Intake.
 * Extracted from LegalIntakeForm to avoid React Hook issues when
 * rendering in read-only mode inside WorkflowFormWrapper.
 *
 * This component does NOT use useForm or any form-related hooks,
 * which prevents React Error #300 ("Cannot update a component while
 * rendering a different component").
 */

import * as React from 'react';

// Fluent UI - tree-shaken imports
import { IconButton } from '@fluentui/react/lib/Button';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';

// spfx-toolkit - tree-shaken imports
import { Card, Content, Header } from 'spfx-toolkit/lib/components/Card';
import { SPTextField, SPTextFieldMode } from 'spfx-toolkit/lib/components/spFields';
import { FormContainer, FormItem, FormLabel, FormValue } from 'spfx-toolkit/lib/components/spForm';
import { UserPersona } from 'spfx-toolkit/lib/components/UserPersona';

// App imports using path aliases
import { WorkflowCardHeader } from '@components/WorkflowCardHeader';
import { usePermissions } from '@hooks/usePermissions';
import { useRequestStore } from '@stores/requestStore';
import { RequestStatus, ReviewAudience } from '@appTypes/workflowTypes';
import { calculateBusinessHours } from '@utils/businessHoursCalculator';

import './LegalIntakeForm.scss';

/**
 * Props for LegalIntakeSummary component
 */
export interface ILegalIntakeSummaryProps {
  /** Whether card is expanded by default */
  defaultExpanded?: boolean;
  /** Callback when edit mode is requested */
  onEditClick?: () => void;
}

/**
 * LegalIntakeSummary Component - Read-only display of completed Legal Intake
 */
export const LegalIntakeSummary: React.FC<ILegalIntakeSummaryProps> = ({
  defaultExpanded = false,
  onEditClick,
}) => {
  const currentRequest = useRequestStore((s) => s.currentRequest);
  const permissions = usePermissions();

  // Check if user can edit review audience (Legal Admin or Admin only)
  // Disable editing after reviews are completed (Closeout, Completed, or AwaitingFINRADocuments)
  const isAfterReviewsCompleted =
    currentRequest?.status === RequestStatus.Closeout ||
    currentRequest?.status === RequestStatus.Completed ||
    currentRequest?.status === RequestStatus.AwaitingFINRADocuments;
  const canEditReviewAudience =
    (permissions.isLegalAdmin || permissions.isAdmin) && !isAfterReviewsCompleted;

  if (!currentRequest) {
    return null;
  }

  const assignedAttorneys = currentRequest.attorney;
  const completedDate = currentRequest.submittedForReviewOn;

  // Determine if attorney field should be shown based on review audience
  // Hide attorney field when ReviewAudience = Compliance Only (no attorney needed)
  const showAttorneyField = currentRequest.reviewAudience !== ReviewAudience.Compliance;

  // Get the Legal Admin who completed intake (not the assigned attorneys)
  const completedBy = currentRequest.submittedForReviewBy;

  // Calculate duration in business minutes (excludes weekends and non-working hours)
  // Uses businessHoursCalculator to get accurate business hours (8 AM - 5 PM, Mon-Fri PST)
  // Falls back to calendar time if business hours is 0 (e.g., completed on weekend)
  const durationMinutes = React.useMemo(() => {
    if (!currentRequest.submittedOn || !completedDate) return undefined;
    const startDate =
      currentRequest.submittedOn instanceof Date
        ? currentRequest.submittedOn
        : new Date(currentRequest.submittedOn);
    const endDate = completedDate instanceof Date ? completedDate : new Date(completedDate);

    // Calculate business hours and convert to minutes for WorkflowCardHeader
    const businessHours = calculateBusinessHours(startDate, endDate);
    const businessMinutes = Math.round(businessHours * 60);

    // If business hours is 0 (e.g., completed entirely on weekend/after hours),
    // fall back to actual elapsed time so user sees some duration
    if (businessMinutes === 0) {
      const elapsedMs = endDate.getTime() - startDate.getTime();
      return Math.max(1, Math.round(elapsedMs / (1000 * 60))); // At least 1 minute
    }

    return businessMinutes;
  }, [currentRequest.submittedOn, completedDate]);

  return (
    <Card
      id='legal-intake-summary-card'
      className='legal-intake-card legal-intake-card--completed'
      allowExpand={true}
      defaultExpanded={defaultExpanded}
    >
      <Header size='regular'>
        <WorkflowCardHeader
          title='Legal Intake'
          status='completed'
          startedOn={currentRequest.submittedOn}
          completedOn={completedDate}
          completedBy={
            completedBy?.title
              ? { title: completedBy.title, email: completedBy.email }
              : undefined
          }
          attorney={assignedAttorneys
            ?.filter((a): a is typeof a & { title: string } => !!a.title)
            .map(a => ({ title: a.title, email: a.email }))
          }
          attorneyLabel='Assigned to'
          completedByLabel='By'
          durationMinutes={durationMinutes}
          actions={
            canEditReviewAudience && onEditClick ? (
              <IconButton
                iconProps={{ iconName: 'Edit' }}
                title='Edit Legal Intake'
                ariaLabel='Edit Legal Intake'
                onClick={onEditClick}
                styles={{
                  root: {
                    color: '#0078d4',
                    backgroundColor: 'transparent',
                    ':hover': {
                      backgroundColor: '#f3f2f1',
                    },
                  },
                }}
              />
            ) : undefined
          }
        />
      </Header>

      <Content padding='comfortable'>
        <Stack tokens={{ childrenGap: 16 }}>
          <FormContainer labelWidth='180px'>
            {/* Assigned Attorney(s) - hidden when ReviewAudience = Compliance Only */}
            {showAttorneyField && (
              <FormItem>
                <FormLabel>Assigned Attorney{assignedAttorneys && assignedAttorneys.length > 1 ? 's' : ''}</FormLabel>
                <FormValue>
                  {assignedAttorneys && assignedAttorneys.length > 0 ? (
                    <Stack tokens={{ childrenGap: 8 }}>
                      {assignedAttorneys.map((attorney) => (
                        <UserPersona
                          key={String(attorney.id)}
                          userIdentifier={attorney.email || ''}
                          displayName={attorney.title}
                          email={attorney.email}
                          size={32}
                          displayMode='avatarAndName'
                          showSecondaryText={false}
                        />
                      ))}
                    </Stack>
                  ) : (
                    <Text styles={{ root: { color: '#605e5c', fontStyle: 'italic' } }}>
                      Not assigned
                    </Text>
                  )}
                </FormValue>
              </FormItem>
            )}

            <FormItem>
              <FormLabel>Review Audience</FormLabel>
              <FormValue>
                <Text>{currentRequest.reviewAudience || 'Both'}</Text>
              </FormValue>
            </FormItem>

            <FormItem>
              <FormLabel>{showAttorneyField ? 'Assignment Notes' : 'Notes'}</FormLabel>
              <SPTextField
                mode={SPTextFieldMode.MultiLine}
                rows={3}
                appendOnly
                itemId={currentRequest.id}
                listNameOrId='Requests'
                fieldInternalName='AttorneyAssignNotes'
                readOnly={true}
                stylingMode='outlined'
                historyConfig={{
                  initialDisplayCount: 10,
                  showUserPhoto: true,
                  timeFormat: 'both',
                  showLoadMore: true,
                  historyTitle: 'Notes History',
                  emptyHistoryMessage: 'No notes have been added yet',
                }}
              />
            </FormItem>
          </FormContainer>
        </Stack>
      </Content>
    </Card>
  );
};

export default LegalIntakeSummary;

/**
 * RequestApprovals Component
 *
 * Standalone component for request approvals management.
 * Displayed after the form in RequestContainer across all workflow stages.
 *
 * Features:
 * - Wraps ApprovalSection component
 * - Provides consistent card styling
 * - Shows/hides based on request status
 * - Integrates with React Hook Form
 */

import * as React from 'react';
import { Stack, Text, Icon, Separator } from '@fluentui/react';
import { Card } from 'spfx-toolkit/lib/components/Card';
import { ApprovalSection } from '../ApprovalSection';
import { useRequestFormContext } from '../../../../contexts/RequestFormContext';
import { RequestStatus } from '../../../../types/workflowTypes';
import './RequestApprovals.scss';

/**
 * Props for RequestApprovals component
 */
export interface IRequestApprovalsProps {
  hideForStatuses?: RequestStatus[];
}

/**
 * RequestApprovals Component
 */
export const RequestApprovals: React.FC<IRequestApprovalsProps> = ({ hideForStatuses = [] }) => {
  const { control, isLoading, itemId, status } = useRequestFormContext();

  const isNewRequest = !itemId;
  const requestId = itemId?.toString();
  /**
   * Determine if approvals should be shown based on status
   */
  const shouldShow = React.useMemo(() => {
    // Hide if status is in the hideForStatuses array
    if (status && hideForStatuses.indexOf(status) !== -1) {
      return false;
    }

    // Always show for Draft and new requests
    if (!status || status === RequestStatus.Draft || isNewRequest) {
      return true;
    }

    // Show for Legal Intake (approvals can be viewed but not edited)
    if (status === RequestStatus.LegalIntake) {
      return true;
    }

    // Hide for later stages (In Review, Closeout, Completed, Cancelled, On Hold)
    return false;
  }, [status, hideForStatuses, isNewRequest]);

  if (!shouldShow) {
    return null;
  }

  return (
    <Stack tokens={{ childrenGap: 24 }} styles={{ root: { padding: '24px', width: '100%', margin: '0' } }}>
      <Card id='approvals-card' >
        <Stack tokens={{ childrenGap: 16 }} styles={{ root: { padding: '24px' } }}>
          {/* Header */}
          <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 12 }}>
            <Icon iconName='CheckMark' styles={{ root: { fontSize: '20px', color: '#0078d4' } }} />
            <Text variant='xLarge' styles={{ root: { fontWeight: 600 } }}>
              Approvals
            </Text>
          </Stack>

          <Separator />

          {/* Dynamic Approval Section */}
          <ApprovalSection
            control={control}
            disabled={isLoading}
            isNewRequest={isNewRequest}
            requestId={requestId}
          />
        </Stack>
      </Card>
    </Stack>
  );
};

export default RequestApprovals;

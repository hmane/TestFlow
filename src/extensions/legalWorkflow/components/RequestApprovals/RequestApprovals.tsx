/**
 * RequestApprovals Component
 *
 * Collapsible card for request approvals management with summary in header.
 * Uses spfx-toolkit Card with Header/Content for consistent styling.
 *
 * Features:
 * - Collapsible card with summary info in header
 * - Shows approval count and types in collapsed state
 * - Wraps ApprovalSection component for full edit functionality
 * - Shows/hides based on request status
 * - Integrates with React Hook Form
 */

import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { Card, Header, Content } from 'spfx-toolkit/lib/components/Card';
import { ApprovalSection } from '../ApprovalSection';
import { useRequestFormContext } from '../../../../contexts/RequestFormContext';
import { useRequestStore } from '../../../../stores/requestStore';
import { RequestStatus } from '../../../../types/workflowTypes';
import { ApprovalType } from '../../../../types/approvalTypes';
import './RequestApprovals.scss';

/**
 * Props for RequestApprovals component
 */
export interface IRequestApprovalsProps {
  hideForStatuses?: RequestStatus[];
  /** Whether card is expanded by default */
  defaultExpanded?: boolean;
}

/**
 * Get readable label for approval type
 */
const getApprovalTypeLabel = (type: ApprovalType): string => {
  switch (type) {
    case ApprovalType.Communications:
      return 'Communications';
    case ApprovalType.PortfolioManager:
      return 'Portfolio Manager';
    case ApprovalType.ResearchAnalyst:
      return 'Research Analyst';
    case ApprovalType.SubjectMatterExpert:
      return 'SME';
    case ApprovalType.Performance:
      return 'Performance';
    case ApprovalType.Other:
      return 'Other';
    default:
      return type;
  }
};

/**
 * Badge component for approval types
 */
interface IApprovalBadgeProps {
  text: string;
  variant?: 'default' | 'success' | 'info';
}

const ApprovalBadge: React.FC<IApprovalBadgeProps> = ({ text, variant = 'default' }) => {
  const colorMap = {
    default: { bg: '#e1dfdd', color: '#323130' },
    success: { bg: '#dff6dd', color: '#107c10' },
    info: { bg: '#e6f2ff', color: '#0078d4' },
  };
  const colors = colorMap[variant];

  return (
    <span
      className='approval-badge'
      style={{ backgroundColor: colors.bg, color: colors.color }}
    >
      {text}
    </span>
  );
};

/**
 * RequestApprovals Component
 */
export const RequestApprovals: React.FC<IRequestApprovalsProps> = ({
  hideForStatuses = [],
  defaultExpanded,
}) => {
  const { control, isLoading, itemId, status } = useRequestFormContext();
  const { currentRequest } = useRequestStore();

  const isNewRequest = !itemId;

  // For new requests and draft status, default to expanded
  const shouldBeExpanded = defaultExpanded ?? (isNewRequest || !status || status === RequestStatus.Draft);
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

  /**
   * Get approval summary for header
   */
  const approvalSummary = React.useMemo(() => {
    const approvals = currentRequest?.approvals || [];
    const count = approvals.length;
    const types = approvals.map(a => getApprovalTypeLabel(a.type));
    const uniqueTypes = Array.from(new Set(types));

    return {
      count,
      types: uniqueTypes,
      hasApprovals: count > 0,
    };
  }, [currentRequest?.approvals]);

  if (!shouldShow) {
    return null;
  }

  return (
    <Card
      id='approvals-card'
      className='request-approvals-card'
      allowExpand={!isNewRequest && status !== RequestStatus.Draft}
      defaultExpanded={shouldBeExpanded}
    >
      <Header size='regular'>
        <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 12 }}>
          <Icon iconName='CheckMark' styles={{ root: { fontSize: '20px', color: '#0078d4' } }} />
          <Text variant='large' styles={{ root: { fontWeight: 600 } }}>
            Approvals
          </Text>
          {approvalSummary.hasApprovals && (
            <>
              <Text variant='small' styles={{ root: { color: '#605e5c' } }}>
                ({approvalSummary.count})
              </Text>
              <div className='approval-badges-container'>
                {approvalSummary.types.slice(0, 3).map((type, idx) => (
                  <ApprovalBadge key={idx} text={type} variant='info' />
                ))}
                {approvalSummary.types.length > 3 && (
                  <ApprovalBadge text={`+${approvalSummary.types.length - 3} more`} variant='default' />
                )}
              </div>
            </>
          )}
          {!approvalSummary.hasApprovals && (
            <Text variant='small' styles={{ root: { color: '#a19f9d', fontStyle: 'italic' } }}>
              No approvals added
            </Text>
          )}
        </Stack>
      </Header>

      <Content padding='comfortable'>
        <ApprovalSection
          control={control}
          disabled={isLoading}
          isNewRequest={isNewRequest}
          requestId={requestId}
        />
      </Content>
    </Card>
  );
};

export default RequestApprovals;

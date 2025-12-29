/**
 * RequestSummary Component
 *
 * Displays a compact, read-only summary of the request in a collapsible Card.
 * Uses multi-column layout for efficient space usage.
 *
 * Features:
 * - Single collapsible card containing all request information
 * - Card headerActions for collapse/expand and Edit button
 * - Multi-column compact layout
 * - Organized sections: Basic Info, Product & Audience, Distribution, Prior Submissions, Additional Parties
 * - Badge indicators for status and flags
 */

import * as React from 'react';

// Fluent UI - tree-shaken imports
import { Icon } from '@fluentui/react/lib/Icon';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';

// spfx-toolkit - tree-shaken imports
import { Card, Content, Header } from 'spfx-toolkit/lib/components/Card';
import type { CardAction } from 'spfx-toolkit/lib/components/Card/Card.types';
import { DocumentLink } from 'spfx-toolkit/lib/components/DocumentLink';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

// App imports using path aliases
import {
  ApprovalType,
  DistributionMethod,
  RequestStatus,
  RequestType,
  ReviewAudience,
  SubmissionType,
} from '@appTypes/index';
import { usePermissions } from '@hooks/usePermissions';
import { useRequestStore } from '@stores/requestStore';

import { UserPersona } from 'spfx-toolkit';
import './RequestSummary.scss';

/**
 * Props for RequestSummary component
 */
export interface IRequestSummaryProps {
  /** Callback when Edit button is clicked */
  onEditClick?: () => void;
  /** Whether card is expanded by default */
  defaultExpanded?: boolean;
}

/**
 * Compact field display for multi-column layout
 */
interface ICompactFieldProps {
  label: string;
  value?: string | React.ReactNode;
  icon?: string;
}

const CompactField: React.FC<ICompactFieldProps> = ({ label, value, icon }) => {
  if (!value) return null;

  return (
    <div className='summary-field'>
      <div className='summary-field__label'>
        {icon && <Icon iconName={icon} className='summary-field__icon' />}
        <span>{label}</span>
      </div>
      <div className='summary-field__value'>{value}</div>
    </div>
  );
};

/**
 * Badge component for status and tags
 */
interface IBadgeProps {
  text: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

const Badge: React.FC<IBadgeProps> = ({ text, variant = 'default' }) => {
  const colorMap = {
    default: { bg: '#e1dfdd', color: '#323130' },
    success: { bg: '#dff6dd', color: '#107c10' },
    warning: { bg: '#fff4ce', color: '#797673' },
    danger: { bg: '#fde7e9', color: '#d13438' },
    info: { bg: '#e6f2ff', color: '#0078d4' },
  };
  const colors = colorMap[variant];

  return (
    <span className='summary-badge' style={{ backgroundColor: colors.bg, color: colors.color }}>
      {text}
    </span>
  );
};

/**
 * Section header within the summary
 */
interface ISectionHeaderProps {
  title: string;
  icon: string;
}

const SectionHeader: React.FC<ISectionHeaderProps> = ({ title, icon }) => (
  <div className='summary-section__header'>
    <Icon iconName={icon} className='summary-section__icon' />
    <span className='summary-section__title'>{title}</span>
  </div>
);

/**
 * RequestSummary Component
 */
export const RequestSummary: React.FC<IRequestSummaryProps> = ({
  onEditClick,
  defaultExpanded = true,
}) => {
  const { currentRequest } = useRequestStore();
  const permissions = usePermissions();

  /**
   * Check if user can edit request information
   * Only submitter (author) or admin can edit request info
   * Editing is disabled after Closeout or Completed status
   */
  const canEditRequestInfo = React.useMemo((): boolean => {
    if (!currentRequest) return false;

    // No editing allowed after Closeout or Completed
    if (
      currentRequest.status === RequestStatus.Closeout ||
      currentRequest.status === RequestStatus.Completed
    ) {
      return false;
    }

    // Admin can edit (if not closed out)
    if (permissions.isAdmin) return true;

    // Check if current user is the submitter/author
    const currentUserId = SPContext.currentUser?.id?.toString() ?? '';
    const isOwner =
      currentRequest.submittedBy?.id === currentUserId ||
      currentRequest.author?.id === currentUserId;

    return isOwner;
  }, [currentRequest, permissions.isAdmin]);

  /**
   * Format date for display
   */
  const formatDate = (date?: Date | string): string => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  /**
   * Get readable enum values
   */
  const getRequestTypeLabel = (type?: RequestType): string => {
    switch (type) {
      case RequestType.Communication:
        return 'Communication';
      case RequestType.GeneralReview:
        return 'General Review';
      case RequestType.IMAReview:
        return 'IMA Review';
      default:
        return '';
    }
  };

  const getSubmissionTypeLabel = (type?: SubmissionType): string => {
    switch (type) {
      case SubmissionType.New:
        return 'New';
      case SubmissionType.MaterialUpdates:
        return 'Material Updates';
      default:
        return '';
    }
  };

  const getReviewAudienceLabel = (audience?: ReviewAudience): string => {
    switch (audience) {
      case ReviewAudience.Legal:
        return 'Legal';
      case ReviewAudience.Compliance:
        return 'Compliance';
      case ReviewAudience.Both:
        return 'Both';
      default:
        return '';
    }
  };

  const getDistributionMethodLabel = (method: DistributionMethod): string => {
    const labels: Record<DistributionMethod, string> = {
      [DistributionMethod.DodgeCoxWebsiteUS]: 'D&C Website (US)',
      [DistributionMethod.DodgeCoxWebsiteNonUS]: 'D&C Website (Non-US)',
      [DistributionMethod.ThirdPartyWebsite]: 'Third Party Website',
      [DistributionMethod.EmailMail]: 'Email/Mail',
      [DistributionMethod.MobileApp]: 'Mobile App',
      [DistributionMethod.DisplayCardSignage]: 'Display/Signage',
      [DistributionMethod.Hangout]: 'Hangout',
      [DistributionMethod.LiveTalkingPoints]: 'Live Talking Points',
      [DistributionMethod.SocialMedia]: 'Social Media',
    };
    return labels[method] || method;
  };

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

  // Build header actions for the Card
  // Edit button only shown if user can edit request info (submitter/author or admin)
  const headerActions: CardAction[] = React.useMemo(() => {
    const actions: CardAction[] = [];

    // Only show Edit button if callback provided AND user has permission
    if (onEditClick && canEditRequestInfo) {
      actions.push({
        id: 'edit-request',
        label: 'Edit',
        icon: 'Edit',
        onClick: onEditClick,
        tooltip: 'Edit request information',
        ariaLabel: 'Edit request information',
      });
    }

    return actions;
  }, [onEditClick, canEditRequestInfo]);

  if (!currentRequest) {
    return null;
  }

  // Calculate approval summary for header
  const approvalCount = currentRequest.approvals?.length || 0;

  return (
    <Card
      id='request-summary'
      className='request-summary-card'
      allowExpand={true}
      defaultExpanded={defaultExpanded}
    >
      <Header actions={headerActions} size='regular'>
        <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 12 }}>
          <Icon
            iconName='ClipboardList'
            styles={{ root: { fontSize: '20px', color: '#0078d4' } }}
          />
          <Text variant='large' styles={{ root: { fontWeight: 600 } }}>
            Request Summary
          </Text>
          {currentRequest.isRushRequest && <Badge text='RUSH' variant='danger' />}
          {approvalCount > 0 && (
            <Text variant='small' styles={{ root: { color: '#605e5c' } }}>
              ({approvalCount} approval{approvalCount !== 1 ? 's' : ''})
            </Text>
          )}
        </Stack>
      </Header>

      <Content padding='comfortable'>
        <div className='request-summary'>
          {/* Basic Information Section */}
          <div className='summary-section'>
            <SectionHeader title='Basic Information' icon='Info' />
            <div className='summary-grid summary-grid--3col'>
              <CompactField
                label='Request Type'
                value={getRequestTypeLabel(currentRequest.requestType)}
                icon='DocumentSearch'
              />
              <CompactField
                label='Submission Type'
                value={getSubmissionTypeLabel(currentRequest.submissionType)}
                icon='CloudUpload'
              />
              <CompactField
                label='Review Audience'
                value={getReviewAudienceLabel(currentRequest.reviewAudience)}
                icon='People'
              />
              <CompactField
                label='Request Title'
                value={currentRequest.requestTitle}
                icon='Title'
              />
              <CompactField
                label='Submission Item'
                value={currentRequest.submissionItem}
                icon='BulletedList'
              />
              <CompactField
                label='Target Return Date'
                value={formatDate(currentRequest.targetReturnDate)}
                icon='Calendar'
              />
            </div>
            {currentRequest.purpose && (
              <div className='summary-full-width'>
                <CompactField label='Purpose' value={currentRequest.purpose} icon='TextDocument' />
              </div>
            )}
            {currentRequest.isRushRequest && currentRequest.rushRationale && (
              <div className='summary-full-width summary-highlight--danger'>
                <CompactField
                  label='Rush Rationale'
                  value={currentRequest.rushRationale}
                  icon='Warning'
                />
              </div>
            )}
          </div>

          {/* FINRA Product & Audience Section */}
          {(currentRequest.finraAudienceCategory ||
            currentRequest.audience ||
            currentRequest.usFunds ||
            currentRequest.ucits ||
            currentRequest.separateAcctStrategies) && (
            <div className='summary-section'>
              <SectionHeader title='Product & Audience' icon='ProductRelease' />
              <div className='summary-grid summary-grid--3col'>
                <CompactField
                  label='FINRA Audience'
                  value={currentRequest.finraAudienceCategory}
                  icon='Group'
                />
                <CompactField label='Audience' value={currentRequest.audience} icon='People' />
                {currentRequest.usFunds && currentRequest.usFunds.length > 0 && (
                  <CompactField
                    label='US Funds'
                    value={currentRequest.usFunds.join(', ')}
                    icon='Money'
                  />
                )}
                {currentRequest.ucits && currentRequest.ucits.length > 0 && (
                  <CompactField
                    label='UCITS'
                    value={currentRequest.ucits.join(', ')}
                    icon='Globe'
                  />
                )}
                {currentRequest.separateAcctStrategies &&
                  currentRequest.separateAcctStrategies.length > 0 && (
                    <CompactField
                      label='Separate Account Strategies'
                      value={currentRequest.separateAcctStrategies.join(', ')}
                      icon='AccountManagement'
                    />
                  )}
              </div>
            </div>
          )}

          {/* Distribution Section */}
          {currentRequest.requestType === RequestType.Communication &&
            (currentRequest.distributionMethod?.length || currentRequest.dateOfFirstUse) && (
              <div className='summary-section'>
                <SectionHeader title='Distribution' icon='Megaphone' />
                <div className='summary-grid summary-grid--2col'>
                  {currentRequest.distributionMethod &&
                    currentRequest.distributionMethod.length > 0 && (
                      <div className='summary-field summary-field--badges'>
                        <div className='summary-field__label'>
                          <Icon iconName='Send' className='summary-field__icon' />
                          <span>Distribution Methods</span>
                        </div>
                        <div className='summary-field__value summary-badges'>
                          {currentRequest.distributionMethod.map(method => (
                            <Badge
                              key={method}
                              text={getDistributionMethodLabel(method)}
                              variant='info'
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  <CompactField
                    label='Date of First Use'
                    value={formatDate(currentRequest.dateOfFirstUse)}
                    icon='Calendar'
                  />
                </div>
              </div>
            )}

          {/* Prior Submissions Section */}
          {(currentRequest.priorSubmissions?.length || currentRequest.priorSubmissionNotes) && (
            <div className='summary-section'>
              <SectionHeader title='Prior Submissions' icon='History' />
              <div className='summary-grid summary-grid--2col'>
                {currentRequest.priorSubmissions && currentRequest.priorSubmissions.length > 0 && (
                  <div className='summary-field'>
                    <div className='summary-field__label'>
                      <Icon iconName='Link' className='summary-field__icon' />
                      <span>Related Requests</span>
                    </div>
                    <div className='summary-field__value'>
                      {currentRequest.priorSubmissions.map((sub, idx) => (
                        <span key={idx} className='summary-link'>
                          {sub.title}
                          {idx < currentRequest.priorSubmissions!.length - 1 && ', '}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {currentRequest.priorSubmissionNotes && (
                  <CompactField
                    label='Notes'
                    value={currentRequest.priorSubmissionNotes}
                    icon='StickyNotes'
                  />
                )}
              </div>
            </div>
          )}

          {/* Additional Parties Section */}
          {currentRequest.additionalParty && currentRequest.additionalParty.length > 0 && (
            <div className='summary-section'>
              <SectionHeader title='Additional Parties' icon='People' />
              <div className='summary-badges'>
                {currentRequest.additionalParty.map((person, idx) => (
                  <Badge
                    key={idx}
                    text={person.title || person.email || 'Unknown'}
                    variant='default'
                  />
                ))}
              </div>
            </div>
          )}

          {/* Approvals Section with DocumentLink for attachments */}
          {currentRequest.approvals && currentRequest.approvals.length > 0 && (
            <div className='summary-section'>
              <SectionHeader title={`Approvals (${approvalCount})`} icon='CheckMark' />
              <div className='summary-approvals-list'>
                {currentRequest.approvals.map((approval, idx) => (
                  <div key={idx} className='summary-approval-card'>
                    <div className='summary-approval-card__header'>
                      <div className='summary-approval-card__type'>
                        <Icon iconName='Completed' className='summary-approval-card__icon' />
                        <span className='summary-approval-card__type-label'>
                          {getApprovalTypeLabel(approval.type)}
                        </span>
                      </div>
                      <span className='summary-approval-card__date'>
                        {formatDate(approval.approvalDate)}
                      </span>
                    </div>
                    <div className='summary-approval-card__approver'>
                      <UserPersona
                        userIdentifier={approval.approver.id || approval.approver?.email || ''}
                        displayName={approval.approver?.title || 'Unknown'}
                        email={approval.approver?.email || ''}
                        size={24}
                        displayMode='avatarAndName'
                        showLivePersona
                      />
                    </div>
                    {/* Approval Attachments with DocumentLink */}
                    {approval.existingFiles && approval.existingFiles.length > 0 ? (
                      <div className='summary-approval-card__attachment'>
                        {approval.existingFiles.map((file, fileIdx) => (
                          <DocumentLink
                            key={fileIdx}
                            documentUrl={file.url}
                            layout='linkWithIcon'
                            enableHoverCard={true}
                            showVersionHistory={false}
                            showDownloadInCard={true}
                            onClick='preview'
                            previewMode='view'
                            previewTarget='modal'
                          />
                        ))}
                      </div>
                    ) : (
                      <div className='summary-approval-card__no-attachment'>
                        <Icon iconName='Attach' />
                        <span>No document attached</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submission Footer */}
          {(currentRequest.submittedBy || currentRequest.submittedOn) && (
            <div className='summary-footer'>
              {currentRequest.submittedBy && (
                <span className='summary-footer__item'>
                  <Icon iconName='Contact' className='summary-footer__icon' />
                  <strong>Submitted by:</strong> {currentRequest.submittedBy.title}
                </span>
              )}
              {currentRequest.submittedOn && (
                <span className='summary-footer__item'>
                  <Icon iconName='Clock' className='summary-footer__icon' />
                  <strong>Submitted:</strong> {formatDate(currentRequest.submittedOn)}
                </span>
              )}
            </div>
          )}
        </div>
      </Content>
    </Card>
  );
};

export default RequestSummary;

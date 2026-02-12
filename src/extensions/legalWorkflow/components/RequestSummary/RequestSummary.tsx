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
import { Text } from '@fluentui/react/lib/Text';

// spfx-toolkit - tree-shaken imports
import { Card, Content, Header, Footer } from 'spfx-toolkit/lib/components/Card';
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
import { RequestHoverCard } from '@components/RequestHoverCard/RequestHoverCard';

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
  const currentRequest = useRequestStore((s) => s.currentRequest);
  const permissions = usePermissions();

  /**
   * Check if user can edit request information
   * Only submitter (author) or admin can edit request info
   * Editing is disabled after Closeout, Completed, or AwaitingFINRADocuments status
   */
  const canEditRequestInfo = React.useMemo((): boolean => {
    if (!currentRequest) return false;

    // No editing allowed after Closeout, Completed, or AwaitingFINRADocuments
    if (
      currentRequest.status === RequestStatus.Closeout ||
      currentRequest.status === RequestStatus.Completed ||
      currentRequest.status === RequestStatus.AwaitingFINRADocuments
    ) {
      return false;
    }

    // Admin can edit (if not closed out)
    if (permissions.isAdmin) return true;

    // Check if current user is the submitter/author
    const currentUserId = SPContext.currentUser?.id?.toString() ?? '';
    const isOwner =
      String(currentRequest.submittedBy?.id ?? '') === currentUserId ||
      String(currentRequest.author?.id ?? '') === currentUserId;

    return isOwner;
  }, [currentRequest, permissions.isAdmin]);

  /**
   * Format date for display (short form)
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
   * Format date with time for display (for footer)
   */
  const formatDateTime = (date?: Date | string): string => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
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

  /**
   * Calculate days until target return date
   * Returns negative number if overdue, positive if upcoming
   */
  const daysUntilDue = React.useMemo((): number | undefined => {
    if (!currentRequest.targetReturnDate) return undefined;
    const targetDate = typeof currentRequest.targetReturnDate === 'string'
      ? new Date(currentRequest.targetReturnDate)
      : currentRequest.targetReturnDate;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetCopy = new Date(targetDate.getTime());
    targetCopy.setHours(0, 0, 0, 0);
    const diffTime = targetCopy.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [currentRequest.targetReturnDate]);

  /**
   * Get due date display text and variant
   */
  const dueDateInfo = React.useMemo(() => {
    if (daysUntilDue === undefined) return null;

    if (daysUntilDue < 0) {
      const daysPast = Math.abs(daysUntilDue);
      return {
        text: `${daysPast}d overdue`,
        variant: 'danger' as const,
        icon: 'Warning',
      };
    } else if (daysUntilDue === 0) {
      return {
        text: 'Due today',
        variant: 'warning' as const,
        icon: 'Clock',
      };
    } else if (daysUntilDue <= 2) {
      return {
        text: `${daysUntilDue}d left`,
        variant: 'warning' as const,
        icon: 'Clock',
      };
    } else {
      return {
        text: `${daysUntilDue}d left`,
        variant: 'info' as const,
        icon: 'Calendar',
      };
    }
  }, [daysUntilDue]);

  return (
    <Card
      id='request-summary'
      className='request-summary-card'
      allowExpand={true}
      defaultExpanded={defaultExpanded}
    >
      <Header actions={headerActions} size='regular' allowWrap={true}>
        <div className='request-summary-header'>
          {/* Title */}
          <div className='request-summary-header__main'>
            <Icon
              iconName='ClipboardList'
              styles={{ root: { fontSize: '20px', color: '#0078d4' } }}
            />
            <Text variant='large' styles={{ root: { fontWeight: 600 } }}>
              {currentRequest.requestTitle || 'Request Summary'}
            </Text>
          </div>

          {/* Key metrics row */}
          <div className='request-summary-header__metrics'>
            {/* Rush indicator - shown first if rush request */}
            {currentRequest.isRushRequest && <Badge text='RUSH' variant='danger' />}

            {/* Target Return Date with countdown */}
            {currentRequest.targetReturnDate && dueDateInfo && (
              <div className={`request-summary-header__metric request-summary-header__metric--${dueDateInfo.variant}`}>
                <Icon iconName={dueDateInfo.icon} />
                <span className='request-summary-header__metric-label'>
                  {formatDate(currentRequest.targetReturnDate)}
                </span>
                <span className='request-summary-header__metric-badge'>
                  {dueDateInfo.text}
                </span>
              </div>
            )}

            {/* Review Audience */}
            {currentRequest.reviewAudience && (
              <div className='request-summary-header__metric request-summary-header__metric--default'>
                <Icon iconName='Shield' />
                <span className='request-summary-header__metric-value'>
                  {getReviewAudienceLabel(currentRequest.reviewAudience)}
                </span>
              </div>
            )}

            {/* Submission Item */}
            {currentRequest.submissionItem && (
              <div className='request-summary-header__metric request-summary-header__metric--subtle'>
                <Icon iconName='Documentation' />
                <span className='request-summary-header__metric-value'>
                  {currentRequest.submissionItem}
                </span>
              </div>
            )}

            {/* Approval Count */}
            {approvalCount > 0 && (
              <div className='request-summary-header__metric request-summary-header__metric--success'>
                <Icon iconName='CheckMark' />
                <span className='request-summary-header__metric-value'>
                  {approvalCount} approval{approvalCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>
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
                  value={Array.isArray(currentRequest.finraAudienceCategory)
                    ? currentRequest.finraAudienceCategory.join(', ')
                    : currentRequest.finraAudienceCategory}
                  icon='Group'
                />
                <CompactField
                  label='Audience'
                  value={Array.isArray(currentRequest.audience)
                    ? currentRequest.audience.join(', ')
                    : currentRequest.audience}
                  icon='People'
                />
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
          {(currentRequest.contentId || currentRequest.priorSubmissions?.length || currentRequest.priorSubmissionNotes) && (
            <div className='summary-section'>
              <SectionHeader title='Prior Submissions' icon='History' />
              <div className='summary-grid summary-grid--2col'>
                {currentRequest.contentId && (
                  <CompactField
                    label='Business Tracking/Content Id'
                    value={currentRequest.contentId}
                    icon='DocumentSet'
                  />
                )}
                {currentRequest.priorSubmissions && currentRequest.priorSubmissions.length > 0 && (
                  <div className='summary-field'>
                    <div className='summary-field__label'>
                      <Icon iconName='Link' className='summary-field__icon' />
                      <span>Related Requests</span>
                    </div>
                    <div className='summary-field__value summary-prior-submissions'>
                      {currentRequest.priorSubmissions.map((sub, idx) => (
                        <React.Fragment key={idx}>
                          {sub.id ? (
                            <RequestHoverCard
                              requestId={sub.id}
                              openDelay={400}
                              dismissDelay={200}
                            >
                              <a
                                href={`${SPContext.webAbsoluteUrl}/Lists/Requests/DispForm.aspx?ID=${sub.id}`}
                                className='summary-prior-link'
                                target='_blank'
                                rel='noopener noreferrer'
                                aria-label={`Open request ${sub.title} in new tab`}
                              >
                                {sub.title}
                              </a>
                            </RequestHoverCard>
                          ) : (
                            <span className='summary-link'>{sub.title}</span>
                          )}
{/* Gap spacing handles separation */}
                        </React.Fragment>
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
              <div className='summary-additional-parties'>
                {currentRequest.additionalParty.map((person, idx) => (
                  <UserPersona
                    key={idx}
                    userIdentifier={person.id || person.email || ''}
                    displayName={person.title || 'Unknown'}
                    email={person.email || ''}
                    size={28}
                    displayMode='avatarAndName'
                    showLivePersona={false}
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
                        userIdentifier={approval.approver?.id || approval.approver?.email || ''}
                        displayName={approval.approver?.title || 'Unknown'}
                        email={approval.approver?.email || ''}
                        size={24}
                        displayMode='avatarAndName'
                        showLivePersona={false}  // Disabled due to PnP LivePersona memory leak
                      />
                    </div>
                    {/* Approval Notes */}
                    {approval.notes && (
                      <div className='summary-approval-card__notes'>
                        <Icon iconName='EditNote' className='summary-approval-card__notes-icon' />
                        <span className='summary-approval-card__notes-text'>{approval.notes}</span>
                      </div>
                    )}
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

        </div>
      </Content>

      {/* Card Footer with submission metadata */}
      {(currentRequest.submittedBy || currentRequest.submittedOn) && (
        <Footer borderTop padding='comfortable'>
          <div className='summary-footer'>
            {currentRequest.submittedBy && (
              <span className='summary-footer__item'>
                <span className='summary-footer__label'>Submitted by:</span>
                <UserPersona
                  userIdentifier={currentRequest.submittedBy.id || currentRequest.submittedBy.email || ''}
                  displayName={currentRequest.submittedBy.title || 'Unknown'}
                  email={currentRequest.submittedBy.email || ''}
                  size={24}
                  displayMode='avatarAndName'
                  showLivePersona={false}
                />
              </span>
            )}
            {currentRequest.submittedOn && (
              <span className='summary-footer__item'>
                <Icon iconName='Clock' className='summary-footer__icon' />
                <span className='summary-footer__label'>Submitted:</span>
                <span className='summary-footer__value'>{formatDateTime(currentRequest.submittedOn)}</span>
              </span>
            )}
          </div>
        </Footer>
      )}
    </Card>
  );
};

export default RequestSummary;

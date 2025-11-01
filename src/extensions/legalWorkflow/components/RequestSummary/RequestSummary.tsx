/**
 * RequestSummary Component
 *
 * Displays a read-only summary of the request with all submitted information.
 * Provides an "Edit" button to switch back to edit mode.
 *
 * Features:
 * - Read-only display of all form data
 * - Organized into sections matching the form
 * - User-friendly formatting (dates, enums, etc.)
 * - Edit button to return to form view
 * - Badge indicators for status and flags
 */

import {
  DefaultButton,
  DirectionalHint,
  Icon,
  Label,
  Separator,
  Stack,
  Text,
  TooltipHost,
} from '@fluentui/react';
import * as React from 'react';
import { Card } from 'spfx-toolkit/lib/components/Card';
import { useRequestStore } from '../../../../stores/requestStore';
import {
  ApprovalType,
  DistributionMethod,
  RequestType,
  ReviewAudience,
  SubmissionType,
} from '../../../../types';
import './RequestSummary.scss';

/**
 * Props for RequestSummary component
 */
export interface IRequestSummaryProps {
  onEditClick?: () => void;
}

/**
 * Helper component to display a field value
 */
interface IFieldDisplayProps {
  label: string;
  value?: string | React.ReactNode;
  icon?: string;
  isEmpty?: boolean;
}

const FieldDisplay: React.FC<IFieldDisplayProps> = ({ label, value, icon, isEmpty = false }) => {
  if (isEmpty) {
    return null;
  }

  return (
    <Stack tokens={{ childrenGap: 4 }} styles={{ root: { marginBottom: '16px' } }}>
      <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 8 }}>
        {icon && <Icon iconName={icon} styles={{ root: { fontSize: '14px', color: '#605e5c' } }} />}
        <Label styles={{ root: { fontWeight: 600, color: '#323130', margin: 0 } }}>{label}</Label>
      </Stack>
      <Text
        variant='medium'
        styles={{ root: { color: '#323130', paddingLeft: icon ? '22px' : '0' } }}
      >
        {value || <span style={{ color: '#a19f9d', fontStyle: 'italic' }}>Not provided</span>}
      </Text>
    </Stack>
  );
};

/**
 * Helper component to display a badge
 */
interface IBadgeProps {
  text: string;
  color?: string;
  backgroundColor?: string;
}

const Badge: React.FC<IBadgeProps> = ({ text, color = '#ffffff', backgroundColor = '#0078d4' }) => {
  return (
    <div
      style={{
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: '12px',
        backgroundColor,
        color,
        fontSize: '12px',
        fontWeight: 600,
        marginRight: '8px',
        marginBottom: '8px',
      }}
    >
      {text}
    </div>
  );
};

/**
 * RequestSummary Component
 */
export const RequestSummary: React.FC<IRequestSummaryProps> = ({ onEditClick }) => {
  const { currentRequest } = useRequestStore();

  /**
   * Format date for display
   */
  const formatDate = (date?: Date | string): string => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  /**
   * Get readable enum value
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
        return 'Both Legal and Compliance';
      default:
        return '';
    }
  };

  const getDistributionMethodLabel = (method: DistributionMethod): string => {
    const labels: Record<DistributionMethod, string> = {
      [DistributionMethod.DodgeCoxWebsiteUS]: 'Dodge & Cox Website - U.S.',
      [DistributionMethod.DodgeCoxWebsiteNonUS]: 'Dodge & Cox Website - Non-U.S.',
      [DistributionMethod.ThirdPartyWebsite]: 'Third Party Website',
      [DistributionMethod.EmailMail]: 'Email / Mail',
      [DistributionMethod.MobileApp]: 'Mobile App',
      [DistributionMethod.DisplayCardSignage]: 'Display Card / Signage',
      [DistributionMethod.Hangout]: 'Hangout',
      [DistributionMethod.LiveTalkingPoints]: 'Live - Talking Points',
      [DistributionMethod.SocialMedia]: 'Social Media',
    };
    return labels[method] || method;
  };

  const getApprovalTypeLabel = (type: ApprovalType): string => {
    return type;
  };

  if (!currentRequest) {
    return null;
  }

  return (
    <div className='request-summary'>
      {/* Header Card */}
      <Card id='summary-header' className='summary-header-card'>
        <Stack
          horizontal
          verticalAlign='center'
          horizontalAlign='space-between'
          styles={{ root: { padding: '24px' } }}
        >
          <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 16 }}>
            <div className='summary-icon'>
              <Icon iconName='ViewAll' styles={{ root: { fontSize: '32px', color: '#0078d4' } }} />
            </div>
            <Stack tokens={{ childrenGap: 4 }}>
              <Text variant='xxLarge' styles={{ root: { fontWeight: 600, color: '#323130' } }}>
                Request Summary
              </Text>
              <Text variant='medium' styles={{ root: { color: '#605e5c' } }}>
                Review your submitted request details
              </Text>
            </Stack>
          </Stack>

          {onEditClick && (
            <TooltipHost content='Edit this request' directionalHint={DirectionalHint.bottomCenter}>
              <DefaultButton
                text='Edit Request'
                iconProps={{ iconName: 'Edit' }}
                onClick={onEditClick}
                styles={{
                  root: {
                    minWidth: '140px',
                    height: '44px',
                    borderRadius: '4px',
                    borderColor: '#0078d4',
                    color: '#0078d4',
                  },
                  rootHovered: {
                    backgroundColor: '#f3f9fd',
                    borderColor: '#106ebe',
                    color: '#106ebe',
                  },
                }}
              />
            </TooltipHost>
          )}
        </Stack>
      </Card>

      {/* Request ID and Status */}
      {currentRequest.requestId && (
        <Card id='summary-id' className='summary-section-card'>
          <Stack tokens={{ childrenGap: 16 }} styles={{ root: { padding: '24px' } }}>
            <Stack horizontal tokens={{ childrenGap: 16 }} wrap>
              <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 8 }}>
                <Icon iconName='Tag' styles={{ root: { fontSize: '16px', color: '#0078d4' } }} />
                <Text variant='large' styles={{ root: { fontWeight: 600 } }}>
                  Request ID: {currentRequest.requestId}
                </Text>
              </Stack>
              {currentRequest.status && (
                <Badge text={currentRequest.status} backgroundColor='#107c10' />
              )}
              {currentRequest.isRushRequest && (
                <Badge text='RUSH REQUEST' backgroundColor='#d13438' />
              )}
            </Stack>
          </Stack>
        </Card>
      )}

      {/* Basic Information Section */}
      <Card id='summary-basic-info' className='summary-section-card'>
        <Stack tokens={{ childrenGap: 20 }} styles={{ root: { padding: '24px' } }}>
          <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 12 }}>
            <Icon iconName='Info' styles={{ root: { fontSize: '20px', color: '#0078d4' } }} />
            <Text variant='xLarge' styles={{ root: { fontWeight: 600, color: '#323130' } }}>
              Basic Information
            </Text>
          </Stack>

          <Separator />

          <Stack tokens={{ childrenGap: 8 }}>
            <FieldDisplay
              label='Request Type'
              value={getRequestTypeLabel(currentRequest.requestType)}
              icon='DocumentSearch'
            />

            <FieldDisplay label='Request Title' value={currentRequest.requestTitle} icon='Title' />

            <FieldDisplay label='Purpose' value={currentRequest.purpose} icon='TextDocument' />

            <FieldDisplay
              label='Submission Type'
              value={getSubmissionTypeLabel(currentRequest.submissionType)}
              icon='CloudUpload'
            />

            <FieldDisplay
              label='Submission Item'
              value={currentRequest.submissionItem}
              icon='BulletedList'
            />

            <FieldDisplay
              label='Review Audience'
              value={getReviewAudienceLabel(currentRequest.reviewAudience)}
              icon='People'
            />

            <FieldDisplay
              label='Target Return Date'
              value={formatDate(currentRequest.targetReturnDate)}
              icon='Calendar'
            />

            {currentRequest.isRushRequest && (
              <FieldDisplay
                label='Rush Rationale'
                value={currentRequest.rushRationale}
                icon='Warning'
              />
            )}

            {currentRequest.department && (
              <FieldDisplay
                label='Department'
                value={currentRequest.department}
                icon='OfficeLogo'
              />
            )}
          </Stack>
        </Stack>
      </Card>

      {/* Distribution & Audience Section (for Communication requests) */}
      {currentRequest.requestType === RequestType.Communication &&
        (currentRequest.distributionMethod?.length || currentRequest.dateOfFirstUse) && (
          <Card id='summary-distribution' className='summary-section-card'>
            <Stack tokens={{ childrenGap: 20 }} styles={{ root: { padding: '24px' } }}>
              <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 12 }}>
                <Icon
                  iconName='Megaphone'
                  styles={{ root: { fontSize: '20px', color: '#0078d4' } }}
                />
                <Text variant='xLarge' styles={{ root: { fontWeight: 600, color: '#323130' } }}>
                  Distribution & Audience
                </Text>
              </Stack>

              <Separator />

              <Stack tokens={{ childrenGap: 8 }}>
                {currentRequest.distributionMethod &&
                  currentRequest.distributionMethod.length > 0 && (
                    <Stack tokens={{ childrenGap: 4 }}>
                      <Label styles={{ root: { fontWeight: 600, color: '#323130', margin: 0 } }}>
                        Distribution Methods
                      </Label>
                      <Stack horizontal tokens={{ childrenGap: 8 }} wrap>
                        {currentRequest.distributionMethod.map(method => (
                          <Badge
                            key={method}
                            text={getDistributionMethodLabel(method)}
                            backgroundColor='#e6f2ff'
                            color='#0078d4'
                          />
                        ))}
                      </Stack>
                    </Stack>
                  )}

                {currentRequest.dateOfFirstUse && (
                  <FieldDisplay
                    label='Date of First Use'
                    value={formatDate(currentRequest.dateOfFirstUse)}
                    icon='Calendar'
                  />
                )}
              </Stack>
            </Stack>
          </Card>
        )}

      {/* Approvals Section */}
      {currentRequest.approvals && currentRequest.approvals.length > 0 && (
        <Card id='summary-approvals' className='summary-section-card'>
          <Stack tokens={{ childrenGap: 20 }} styles={{ root: { padding: '24px' } }}>
            <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 12 }}>
              <Icon
                iconName='CheckMark'
                styles={{ root: { fontSize: '20px', color: '#0078d4' } }}
              />
              <Text variant='xLarge' styles={{ root: { fontWeight: 600, color: '#323130' } }}>
                Approvals ({currentRequest.approvals.length})
              </Text>
            </Stack>

            <Separator />

            <Stack tokens={{ childrenGap: 16 }}>
              {currentRequest.approvals.map((approval, index) => (
                <Card
                  key={index}
                  id={`approval-${index}`}
                  style={{
                    padding: '16px',
                    backgroundColor: '#f3f2f1',
                    border: '1px solid #edebe9',
                    borderRadius: '4px',
                  }}
                >
                  <Stack tokens={{ childrenGap: 12 }}>
                    <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 8 }}>
                      <Icon iconName='Completed' styles={{ root: { color: '#107c10' } }} />
                      <Text variant='mediumPlus' styles={{ root: { fontWeight: 600 } }}>
                        {getApprovalTypeLabel(approval.type)}
                        {approval.type === ApprovalType.Other && approval.approvalTitle
                          ? ` - ${approval.approvalTitle}`
                          : ''}
                      </Text>
                    </Stack>

                    <Stack tokens={{ childrenGap: 8 }}>
                      <Stack horizontal tokens={{ childrenGap: 16 }}>
                        <Stack tokens={{ childrenGap: 4 }}>
                          <Label styles={{ root: { fontSize: '12px', margin: 0 } }}>Approver</Label>
                          <Text variant='small'>{approval.approver?.title || 'Unknown'}</Text>
                        </Stack>
                        <Stack tokens={{ childrenGap: 4 }}>
                          <Label styles={{ root: { fontSize: '12px', margin: 0 } }}>Date</Label>
                          <Text variant='small'>{formatDate(approval.approvalDate)}</Text>
                        </Stack>
                      </Stack>

                      {approval.notes && (
                        <Stack tokens={{ childrenGap: 4 }}>
                          <Label styles={{ root: { fontSize: '12px', margin: 0 } }}>Notes</Label>
                          <Text variant='small' styles={{ root: { fontStyle: 'italic' } }}>
                            {approval.notes}
                          </Text>
                        </Stack>
                      )}
                    </Stack>
                  </Stack>
                </Card>
              ))}
            </Stack>

            {currentRequest.requiresCommunicationsApproval && (
              <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 8 }}>
                <Icon iconName='Info' styles={{ root: { fontSize: '14px', color: '#0078d4' } }} />
                <Text variant='small' styles={{ root: { color: '#605e5c' } }}>
                  Communications approval was required for this request
                </Text>
              </Stack>
            )}
          </Stack>
        </Card>
      )}

      {/* Prior Submissions Section */}
      {(currentRequest.priorSubmissions?.length || currentRequest.priorSubmissionNotes) && (
        <Card id='summary-prior-submissions' className='summary-section-card'>
          <Stack tokens={{ childrenGap: 20 }} styles={{ root: { padding: '24px' } }}>
            <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 12 }}>
              <Icon iconName='History' styles={{ root: { fontSize: '20px', color: '#0078d4' } }} />
              <Text variant='xLarge' styles={{ root: { fontWeight: 600, color: '#323130' } }}>
                Prior Submissions
              </Text>
            </Stack>

            <Separator />

            <Stack tokens={{ childrenGap: 8 }}>
              {currentRequest.priorSubmissions && currentRequest.priorSubmissions.length > 0 && (
                <Stack tokens={{ childrenGap: 4 }}>
                  <Label styles={{ root: { fontWeight: 600, margin: 0 } }}>Related Requests</Label>
                  <Stack tokens={{ childrenGap: 4 }}>
                    {currentRequest.priorSubmissions.map((submission, index) => (
                      <Text key={index} variant='medium'>
                        • {submission.title}
                      </Text>
                    ))}
                  </Stack>
                </Stack>
              )}

              {currentRequest.priorSubmissionNotes && (
                <FieldDisplay
                  label='Notes'
                  value={currentRequest.priorSubmissionNotes}
                  icon='StickyNotes'
                />
              )}
            </Stack>
          </Stack>
        </Card>
      )}

      {/* Additional Parties Section */}
      {currentRequest.additionalParty && currentRequest.additionalParty.length > 0 && (
        <Card id='summary-additional-parties' className='summary-section-card'>
          <Stack tokens={{ childrenGap: 20 }} styles={{ root: { padding: '24px' } }}>
            <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 12 }}>
              <Icon iconName='People' styles={{ root: { fontSize: '20px', color: '#0078d4' } }} />
              <Text variant='xLarge' styles={{ root: { fontWeight: 600, color: '#323130' } }}>
                Additional Parties
              </Text>
            </Stack>

            <Separator />

            <Stack tokens={{ childrenGap: 8 }}>
              {currentRequest.additionalParty.map((person, index) => (
                <Stack
                  key={index}
                  horizontal
                  verticalAlign='center'
                  tokens={{ childrenGap: 8 }}
                  styles={{ root: { padding: '8px 0' } }}
                >
                  <Icon
                    iconName='Contact'
                    styles={{ root: { fontSize: '16px', color: '#605e5c' } }}
                  />
                  <Text variant='medium'>{person.title || person.email}</Text>
                </Stack>
              ))}
            </Stack>
          </Stack>
        </Card>
      )}

      {/* Submission Info */}
      {(currentRequest.submittedBy || currentRequest.submittedOn) && (
        <Card id='summary-submission-info' className='summary-info-card'>
          <Stack
            horizontal
            tokens={{ childrenGap: 24 }}
            wrap
            styles={{ root: { padding: '16px 24px', backgroundColor: '#f3f9fd' } }}
          >
            {currentRequest.submittedBy && (
              <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 8 }}>
                <Icon iconName='People' styles={{ root: { fontSize: '14px', color: '#0078d4' } }} />
                <Text variant='small' styles={{ root: { color: '#323130' } }}>
                  <strong>Submitted by:</strong> {currentRequest.submittedBy.title}
                </Text>
              </Stack>
            )}
            {currentRequest.submittedOn && (
              <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 8 }}>
                <Icon iconName='Clock' styles={{ root: { fontSize: '14px', color: '#0078d4' } }} />
                <Text variant='small' styles={{ root: { color: '#323130' } }}>
                  <strong>Submitted on:</strong> {formatDate(currentRequest.submittedOn)}
                </Text>
              </Stack>
            )}
          </Stack>
        </Card>
      )}
    </div>
  );
};

export default RequestSummary;

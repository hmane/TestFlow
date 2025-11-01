/**
 * RequestExpandedCard Component
 *
 * Displays expanded request information in hover card
 * Loads full request details dynamically when card expands
 * Shows additional fields: Submission Type, Assigned Attorney, Approvals, etc.
 */

import * as React from 'react';
import {
  Stack,
  Text,
  Spinner,
  SpinnerSize,
  MessageBar,
  MessageBarType,
} from '@fluentui/react';
import { UserPersona } from 'spfx-toolkit/lib/components/UserPersona';
import { SPContext } from 'spfx-toolkit';
import type { IRequestExpandedCardProps } from '../types';
import type { ILegalRequest } from '../../../types';
import { SubmissionType } from '../../../types/requestTypes';
import styles from './RequestIdHoverCard.module.scss';

/**
 * Format enum values for display
 */
const formatSubmissionType = (type: SubmissionType | undefined): string => {
  if (!type) return 'N/A';
  switch (type) {
    case SubmissionType.New:
      return 'New';
    case SubmissionType.MaterialUpdates:
      return 'Material Updates';
    default:
      return String(type);
  }
};

/**
 * RequestExpandedCard Component
 */
export const RequestExpandedCard: React.FC<IRequestExpandedCardProps> = ({
  itemId,
  itemData,
  webUrl,
  listTitle,
}) => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | undefined>();
  const [fullRequest, setFullRequest] = React.useState<ILegalRequest | undefined>();

  /**
   * Load full request details
   */
  React.useEffect(() => {
    const loadRequestDetails = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setError(undefined);

        // Use SPContext to load the full request item
        const sp = SPContext.sp;
        const item = await sp.web.lists
          .getByTitle(listTitle)
          .items.getById(itemId)
          .select(
            'ID',
            'Title',
            'RequestType',
            'RequestTitle',
            'Purpose',
            'SubmissionType',
            'SubmissionItem',
            'ReviewAudience',
            'TargetReturnDate',
            'IsRushRequest',
            'RushRationale',
            'Attorney/Title',
            'Attorney/EMail',
            'Attorney/Id',
            'SubmittedBy/Title',
            'SubmittedBy/EMail',
            'SubmittedBy/Id',
            'SubmittedOn',
            'RequiresCommunicationsApproval'
          )
          .expand('Attorney', 'SubmittedBy')();

        // Map attorney to legalReview object
        const legalReview = item.Attorney ? {
          assignedAttorney: {
            id: String(item.Attorney.Id || item.Attorney.ID || 0),
            title: item.Attorney.Title || 'Unknown',
            email: item.Attorney.EMail || '',
            loginName: '',
          },
          status: undefined as any,
        } : undefined;

        // Map to ILegalRequest (simplified for display)
        const request: Partial<ILegalRequest> = {
          id: item.ID,
          requestId: item.Title,
          submissionType: item.SubmissionType,
          submissionItem: item.SubmissionItem,
          isRushRequest: item.IsRushRequest,
          rushRationale: item.RushRationale,
          legalReview,
          submittedBy: item.SubmittedBy
            ? {
                id: String(item.SubmittedBy.Id || item.SubmittedBy.ID || 0),
                title: item.SubmittedBy.Title || 'Unknown',
                email: item.SubmittedBy.EMail || '',
                loginName: '',
              }
            : undefined,
          submittedOn: item.SubmittedOn ? new Date(item.SubmittedOn) : undefined,
          requiresCommunicationsApproval: item.RequiresCommunicationsApproval || false,
        } as Partial<ILegalRequest>;

        setFullRequest(request as ILegalRequest);
        setIsLoading(false);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        SPContext.logger.error('Failed to load request details', err, { itemId, listTitle });
        setError(`Failed to load details: ${errorMessage}`);
        setIsLoading(false);
      }
    };

    void loadRequestDetails();
  }, [itemId, listTitle]);

  if (isLoading) {
    return (
      <div className={styles.expandedCard}>
        <Stack
          horizontalAlign="center"
          verticalAlign="center"
          styles={{ root: { padding: 40 } }}
        >
          <Spinner size={SpinnerSize.medium} label="Loading request details..." />
        </Stack>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.expandedCard}>
        <MessageBar messageBarType={MessageBarType.error} isMultiline={false}>
          {error}
        </MessageBar>
      </div>
    );
  }

  if (!fullRequest) {
    return (
      <div className={styles.expandedCard}>
        <MessageBar messageBarType={MessageBarType.warning}>
          No additional details available
        </MessageBar>
      </div>
    );
  }

  return (
    <div className={styles.expandedCard}>
      <Stack tokens={{ childrenGap: 12 }}>
        <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
          Additional Details
        </Text>

        {/* Submission Type */}
        <div className={styles.fieldRow}>
          <Text variant="small" className={styles.fieldLabel}>
            Submission Type:
          </Text>
          <Text variant="small" className={styles.fieldValue}>
            {formatSubmissionType(fullRequest.submissionType)}
          </Text>
        </div>

        {/* Submission Item */}
        {fullRequest.submissionItem && (
          <div className={styles.fieldRow}>
            <Text variant="small" className={styles.fieldLabel}>
              Submission Item:
            </Text>
            <Text variant="small" className={styles.fieldValue}>
              {fullRequest.submissionItem}
            </Text>
          </div>
        )}

        {/* Rush Request */}
        {fullRequest.isRushRequest && (
          <div className={styles.fieldRow}>
            <Text variant="small" className={styles.fieldLabel}>
              Rush Request:
            </Text>
            <Text variant="small" className={styles.fieldValue} styles={{ root: { color: '#d13438' } }}>
              Yes {fullRequest.rushRationale && `- ${fullRequest.rushRationale}`}
            </Text>
          </div>
        )}

        {/* Assigned Attorney */}
        {fullRequest.legalReview?.assignedAttorney && (
          <div className={styles.fieldRow}>
            <Text variant="small" className={styles.fieldLabel}>
              Assigned Attorney:
            </Text>
            <div className={styles.fieldValue}>
              <UserPersona
                userIdentifier={fullRequest.legalReview.assignedAttorney.email || fullRequest.legalReview.assignedAttorney.loginName || fullRequest.legalReview.assignedAttorney.id}
                displayName={fullRequest.legalReview.assignedAttorney.title}
                email={fullRequest.legalReview.assignedAttorney.email}
                size={24}
                displayMode="avatarAndName"
              />
            </div>
          </div>
        )}

        {/* Submitted By/On */}
        {fullRequest.submittedBy && (
          <div className={styles.fieldRow}>
            <Text variant="small" className={styles.fieldLabel}>
              Submitted By:
            </Text>
            <div className={styles.fieldValue}>
              <UserPersona
                userIdentifier={fullRequest.submittedBy.email || fullRequest.submittedBy.loginName || fullRequest.submittedBy.id}
                displayName={fullRequest.submittedBy.title}
                email={fullRequest.submittedBy.email}
                size={24}
                displayMode="avatarAndName"
              />
              {fullRequest.submittedOn && (
                <Text variant="xSmall" styles={{ root: { color: '#8a8886', marginTop: 4 } }}>
                  on {fullRequest.submittedOn.toLocaleDateString()}
                </Text>
              )}
            </div>
          </div>
        )}

        {/* Approvals Required */}
        <div className={styles.fieldRow}>
          <Text variant="small" className={styles.fieldLabel}>
            Approvals Required:
          </Text>
          <div className={styles.fieldValue}>
            <Stack tokens={{ childrenGap: 4 }}>
              {fullRequest.requiresCommunicationsApproval && (
                <Text variant="small">• Communications</Text>
              )}
              {!fullRequest.requiresCommunicationsApproval && (
                <Text variant="small" styles={{ root: { color: '#8a8886' } }}>
                  None
                </Text>
              )}
            </Stack>
          </div>
        </div>

        {/* Full Purpose */}
        {itemData.purpose && (
          <div className={styles.fieldRow}>
            <Text variant="small" className={styles.fieldLabel}>
              Full Purpose:
            </Text>
            <Text variant="small" className={styles.fieldValue} styles={{ root: { whiteSpace: 'pre-wrap' } }}>
              {itemData.purpose}
            </Text>
          </div>
        )}
      </Stack>
    </div>
  );
};

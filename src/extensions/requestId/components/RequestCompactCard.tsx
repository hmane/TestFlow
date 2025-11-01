/**
 * RequestCompactCard Component
 *
 * Displays compact request information in hover card
 * Shows: Status, Request Type, Title, Purpose, Review Audience, Target Date
 * Footer: Created By + Manage Access (8-10 personas)
 */

import * as React from 'react';
import {
  Stack,
  Text,
  Link,
  Icon,
  Separator,
} from '@fluentui/react';
import { UserPersona } from 'spfx-toolkit/lib/components/UserPersona';
import type { IRequestCompactCardProps } from '../types';
import { RequestStatus, ReviewAudience } from '../../../types/workflowTypes';
import { RequestType } from '../../../types/requestTypes';
import styles from './RequestIdHoverCard.module.scss';

/**
 * Format date for display
 */
const formatDate = (date: Date | undefined): string => {
  if (!date) return 'N/A';

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Get relative time string
 */
const getRelativeTime = (date: Date): string => {
  const now = new Date();
  const created = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
};

/**
 * Get status badge color and text
 */
const getStatusBadge = (status: RequestStatus): { color: string; backgroundColor: string; text: string } => {
  switch (status) {
    case RequestStatus.Draft:
      return { color: '#605e5c', backgroundColor: '#edebe9', text: 'Draft' };
    case RequestStatus.LegalIntake:
      return { color: '#0078d4', backgroundColor: '#deecf9', text: 'Legal Intake' };
    case RequestStatus.InReview:
      return { color: '#0078d4', backgroundColor: '#deecf9', text: 'In Review' };
    case RequestStatus.Closeout:
      return { color: '#8764b8', backgroundColor: '#f3edf7', text: 'Closeout' };
    case RequestStatus.Completed:
      return { color: '#107c10', backgroundColor: '#dff6dd', text: 'Completed' };
    case RequestStatus.Cancelled:
      return { color: '#a4262c', backgroundColor: '#fde7e9', text: 'Cancelled' };
    case RequestStatus.OnHold:
      return { color: '#ca5010', backgroundColor: '#fed9cc', text: 'On Hold' };
    default:
      return { color: '#605e5c', backgroundColor: '#edebe9', text: String(status) };
  }
};

/**
 * Format enum values for display
 */
const formatRequestType = (type: RequestType): string => {
  switch (type) {
    case RequestType.Communication:
      return 'Communication';
    case RequestType.GeneralReview:
      return 'General Review';
    case RequestType.IMAReview:
      return 'IMA Review';
    default:
      return String(type);
  }
};

const formatReviewAudience = (audience: ReviewAudience): string => {
  switch (audience) {
    case ReviewAudience.Legal:
      return 'Legal';
    case ReviewAudience.Compliance:
      return 'Compliance';
    case ReviewAudience.Both:
      return 'Legal & Compliance';
    default:
      return String(audience);
  }
};

/**
 * RequestCompactCard Component
 */
export const RequestCompactCard: React.FC<IRequestCompactCardProps> = ({
  itemData,
  editFormUrl,
  webUrl,
  listTitle,
}) => {
  const statusBadge = getStatusBadge(itemData.status);
  const relativeTime = getRelativeTime(itemData.created);

  return (
    <div className={styles.compactCard}>
      {/* Header: Request ID + Status Badge */}
      <div className={styles.cardHeader}>
        <Text variant="medium" styles={{ root: { fontWeight: 600, color: '#201f1e' } }}>
          {itemData.requestId}
        </Text>
        <div
          className={styles.statusBadge}
          style={{
            backgroundColor: statusBadge.backgroundColor,
            color: statusBadge.color,
          }}
        >
          {statusBadge.text}
        </div>
      </div>

      <Separator styles={{ root: { padding: 0, height: 1 } }} />

      {/* Content: Request Details */}
      <Stack tokens={{ childrenGap: 8 }} className={styles.cardContent}>
        {/* Request Type */}
        <div className={styles.fieldRow}>
          <Text variant="small" className={styles.fieldLabel}>
            Request Type:
          </Text>
          <Text variant="small" className={styles.fieldValue}>
            {formatRequestType(itemData.requestType)}
          </Text>
        </div>

        {/* Title */}
        <div className={styles.fieldRow}>
          <Text variant="small" className={styles.fieldLabel}>
            Title:
          </Text>
          <Text variant="small" className={styles.fieldValue} title={itemData.requestTitle}>
            {itemData.requestTitle}
          </Text>
        </div>

        {/* Purpose */}
        {itemData.purpose && (
          <div className={styles.fieldRow}>
            <Text variant="small" className={styles.fieldLabel}>
              Purpose:
            </Text>
            <Text variant="small" className={styles.fieldValue} title={itemData.purpose}>
              {itemData.purpose}
            </Text>
          </div>
        )}

        {/* Review Audience */}
        <div className={styles.fieldRow}>
          <Text variant="small" className={styles.fieldLabel}>
            Review Audience:
          </Text>
          <Text variant="small" className={styles.fieldValue}>
            {formatReviewAudience(itemData.reviewAudience)}
          </Text>
        </div>

        {/* Target Date */}
        {itemData.targetReturnDate && (
          <div className={styles.fieldRow}>
            <Text variant="small" className={styles.fieldLabel}>
              Target Date:
            </Text>
            <Text variant="small" className={styles.fieldValue}>
              {formatDate(itemData.targetReturnDate)}
            </Text>
          </div>
        )}
      </Stack>

      <Separator styles={{ root: { padding: 0, height: 1, marginTop: 12, marginBottom: 12 } }} />

      {/* Footer: Created By */}
      <div className={styles.cardFooter}>
        <div className={styles.createdBySection}>
          <Text variant="xSmall" styles={{ root: { color: '#605e5c', marginBottom: 6 } }}>
            Created by
          </Text>
          <UserPersona
            userIdentifier={itemData.createdBy.email || itemData.createdBy.loginName || itemData.createdBy.id}
            displayName={itemData.createdBy.title}
            email={itemData.createdBy.email}
            size={24}
            displayMode="avatarAndName"
          />
          <Text variant="xSmall" styles={{ root: { color: '#8a8886', marginTop: 4 } }}>
            {relativeTime}
          </Text>
        </div>

        {/* TODO: Add ManageAccess component when available */}
        {/* For now, showing placeholder */}
        <div className={styles.manageAccessSection}>
          <Text variant="xSmall" styles={{ root: { color: '#605e5c', marginBottom: 6 } }}>
            Has access (view only)
          </Text>
          <Text variant="xSmall" styles={{ root: { color: '#8a8886' } }}>
            Permissions managed by system
          </Text>
        </div>

        {/* Edit Link */}
        <Link href={editFormUrl} className={styles.editLink} target="_blank">
          <Icon iconName="Edit" styles={{ root: { marginRight: 6, fontSize: 12 } }} />
          Click to edit request
        </Link>
      </div>
    </div>
  );
};

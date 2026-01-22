/**
 * RequestIdHoverCard Component
 *
 * Wrapper component that provides hover card functionality for RequestId field
 * Uses Fluent UI HoverCard with plain card type (no expansion)
 * Shows all request details in a single card view
 * Displays a "NEW" indicator for recently created items (within 2 days)
 */

import * as React from 'react';
import { HoverCard, HoverCardType, type IPlainCardProps } from '@fluentui/react/lib/HoverCard';
import { DirectionalHint } from 'spfx-toolkit/lib/types/fluentui-types';
import { RequestCompactCard } from './RequestCompactCard';
import type { IRequestIdHoverCardProps } from '../types';
import styles from './RequestIdHoverCard.module.scss';

/** Number of hours within which an item is considered "new" (SharePoint uses ~48 hours) */
const NEW_ITEM_THRESHOLD_HOURS = 48;

/**
 * Check if an item is considered "new" based on its creation date
 * SharePoint typically shows "NEW" indicator for items created within the last 2 days
 */
function isNewItem(created: Date): boolean {
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours <= NEW_ITEM_THRESHOLD_HOURS;
}

/**
 * RequestIdHoverCard Component
 */
export const RequestIdHoverCard: React.FC<IRequestIdHoverCardProps> = ({
  requestId,
  itemData,
  editFormUrl,
  listId,
}) => {
  // Determine if the item should show "NEW" indicator
  const showNewIndicator = React.useMemo(
    () => itemData.created && isNewItem(itemData.created),
    [itemData.created]
  );

  /**
   * Render plain card content
   */
  const onRenderPlainCard = React.useCallback(
    (): JSX.Element => {
      return (
        <RequestCompactCard
          itemData={itemData}
          listId={listId}
        />
      );
    },
    [itemData, listId]
  );

  /**
   * Plain card props configuration
   */
  const plainCardProps: IPlainCardProps = React.useMemo(
    () => ({
      onRenderPlainCard,
      renderData: itemData,
      directionalHint: DirectionalHint.bottomLeftEdge,
      directionalHintFixed: false,
      calloutProps: {
        isBeakVisible: true,
        gapSpace: 8,
        preventDismissOnScroll: false,
        setInitialFocus: false,
      },
    }),
    [onRenderPlainCard, itemData]
  );

  return (
    <HoverCard
      type={HoverCardType.plain}
      plainCardProps={plainCardProps}
      instantOpenOnClick={false}
      cardOpenDelay={300}
      cardDismissDelay={200}
      styles={{
        host: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
        },
      }}
    >
      <a
        href={editFormUrl}
        className={styles.requestIdLink}
        onClick={(e) => {
          // Allow default navigation on click
          // Hover card will show on hover
        }}
        aria-label={`Request ${requestId}${showNewIndicator ? ' (New)' : ''} - Click to edit, hover for details`}
      >
        {requestId}
      </a>
      {showNewIndicator && (
        <span className={styles.newIndicator} aria-label="New item">
          NEW
        </span>
      )}
    </HoverCard>
  );
};

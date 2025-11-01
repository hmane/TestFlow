/**
 * RequestIdHoverCard Component
 *
 * Wrapper component that provides hover card functionality for RequestId field
 * Uses Fluent UI HoverCard with expanding card type
 * - Compact view: Shows static list data immediately
 * - Expanded view: Loads full request details dynamically
 */

import * as React from 'react';
import {
  HoverCard,
  HoverCardType,
  type IExpandingCardProps,
} from '@fluentui/react';
import { RequestCompactCard } from './RequestCompactCard';
import { RequestExpandedCard } from './RequestExpandedCard';
import type { IRequestIdHoverCardProps } from '../types';
import styles from './RequestIdHoverCard.module.scss';

/**
 * RequestIdHoverCard Component
 */
export const RequestIdHoverCard: React.FC<IRequestIdHoverCardProps> = ({
  requestId,
  itemData,
  editFormUrl,
  webUrl,
  listTitle,
}) => {
  /**
   * Render compact card (default view)
   */
  const onRenderCompactCard = React.useCallback(
    (): JSX.Element => {
      return (
        <RequestCompactCard
          itemData={itemData}
          editFormUrl={editFormUrl}
          webUrl={webUrl}
          listTitle={listTitle}
        />
      );
    },
    [itemData, editFormUrl, webUrl, listTitle]
  );

  /**
   * Render expanded card (when user expands)
   */
  const onRenderExpandedCard = React.useCallback(
    (): JSX.Element => {
      return (
        <RequestExpandedCard
          itemId={itemData.id}
          itemData={itemData}
          webUrl={webUrl}
          listTitle={listTitle}
        />
      );
    },
    [itemData, webUrl, listTitle]
  );

  /**
   * Expanding card props configuration
   */
  const expandingCardProps: IExpandingCardProps = React.useMemo(
    () => ({
      onRenderCompactCard,
      onRenderExpandedCard,
      renderData: itemData,
      compactCardHeight: 320,
      expandedCardHeight: 480,
    }),
    [onRenderCompactCard, onRenderExpandedCard, itemData]
  );

  return (
    <HoverCard
      type={HoverCardType.expanding}
      expandingCardProps={expandingCardProps}
      instantOpenOnClick={false}
      cardOpenDelay={300}
      cardDismissDelay={100}
      styles={{
        host: {
          display: 'inline-block',
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
        aria-label={`Request ${requestId} - Click to edit, hover for details`}
      >
        {requestId}
      </a>
    </HoverCard>
  );
};

/**
 * RequestIdHoverCard Component
 *
 * Wrapper component that provides hover card functionality for RequestId field
 * Uses Fluent UI HoverCard with plain card type (no expansion)
 * Shows all request details in a single card view
 */

import * as React from 'react';
import { HoverCard, HoverCardType, type IPlainCardProps } from '@fluentui/react/lib/HoverCard';
import { DirectionalHint } from 'spfx-toolkit/lib/types/fluentui-types';
import { RequestCompactCard } from './RequestCompactCard';
import type { IRequestIdHoverCardProps } from '../types';
import styles from './RequestIdHoverCard.module.scss';

/**
 * RequestIdHoverCard Component
 */
export const RequestIdHoverCard: React.FC<IRequestIdHoverCardProps> = ({
  requestId,
  itemData,
  editFormUrl,
  listId,
}) => {
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

/**
 * TurnAroundDateWrapper Component
 *
 * Main wrapper component for turnaround date field customizer
 * Combines TurnAroundDateDisplay with TurnAroundDateHoverCard
 * Calculates all date information and passes to child components
 * Returns null (renders nothing) when no target date is set
 */

import * as React from 'react';
import { TurnAroundDateDisplay } from './TurnAroundDateDisplay';
import { TurnAroundDateHoverCard } from './TurnAroundDateHoverCard';
import type { ITurnAroundDateWrapperProps } from '../types';
import { calculateDateInfo } from '../utils/dateCalculator';
import styles from './TurnAroundDate.module.scss';

/**
 * TurnAroundDateWrapper Component
 */
export const TurnAroundDateWrapper: React.FC<ITurnAroundDateWrapperProps> = ({
  itemData,
}) => {
  // Calculate date information
  const dateInfo = React.useMemo(() => calculateDateInfo(itemData), [itemData]);

  // If no target date, render nothing (empty cell)
  if (!itemData.targetReturnDate) {
    return null;
  }

  return (
    <div className={styles.wrapper}>
      <TurnAroundDateHoverCard dateData={itemData} dateInfo={dateInfo}>
        <TurnAroundDateDisplay
          targetDate={dateInfo.targetDate}
          color={dateInfo.color}
          displayText={dateInfo.displayText}
        />
      </TurnAroundDateHoverCard>
    </div>
  );
};

/**
 * TurnAroundDateWrapper Component
 *
 * Main wrapper component for turnaround date field customizer
 * Combines TurnAroundDateDisplay with TurnAroundDateHoverCard
 * Calculates all date information and passes to child components
 */

import * as React from 'react';
import { TurnAroundDateDisplay } from './TurnAroundDateDisplay';
import { TurnAroundDateHoverCard } from './TurnAroundDateHoverCard';
import type { ITurnAroundDateWrapperProps } from '../types';
import { calculateDateInfo } from '../utils/dateCalculator';

/**
 * TurnAroundDateWrapper Component
 */
export const TurnAroundDateWrapper: React.FC<ITurnAroundDateWrapperProps> = ({
  itemData,
}) => {
  // Calculate date information
  const dateInfo = React.useMemo(() => calculateDateInfo(itemData), [itemData]);

  return (
    <TurnAroundDateHoverCard dateData={itemData} dateInfo={dateInfo}>
      <TurnAroundDateDisplay
        targetDate={dateInfo.targetDate}
        color={dateInfo.color}
        displayText={dateInfo.displayText}
      />
    </TurnAroundDateHoverCard>
  );
};

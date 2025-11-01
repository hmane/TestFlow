/**
 * RequestStatusProgress Component
 *
 * Main wrapper component for request status field customizer
 * Combines StatusProgressBar with StatusHoverCard
 * Calculates all progress, color, waiting on, and timing information
 */

import * as React from 'react';
import { StatusProgressBar } from './StatusProgressBar';
import { StatusHoverCard } from './StatusHoverCard';
import type { IRequestStatusProgressProps } from '../types';
import { calculateProgress } from '../utils/progressCalculator';
import { determineWaitingOn } from '../utils/waitingOnHelper';
import { getStageTimingInfo } from '../utils/stageTimingHelper';

/**
 * RequestStatusProgress Component
 */
export const RequestStatusProgress: React.FC<IRequestStatusProgressProps> = ({
  itemData,
  webUrl,
  listTitle,
}) => {
  // Calculate progress data
  const progressData = React.useMemo(() => calculateProgress(itemData), [itemData]);

  // Determine who/what is being waited on
  const waitingOn = React.useMemo(() => determineWaitingOn(itemData), [itemData]);

  // Get timing information
  const timingInfo = React.useMemo(() => getStageTimingInfo(itemData), [itemData]);

  return (
    <StatusHoverCard
      itemData={itemData}
      progressData={progressData}
      waitingOn={waitingOn}
      timingInfo={timingInfo}
      webUrl={webUrl}
    >
      <StatusProgressBar
        status={itemData.status}
        progress={progressData.progress}
        color={progressData.color}
      />
    </StatusHoverCard>
  );
};

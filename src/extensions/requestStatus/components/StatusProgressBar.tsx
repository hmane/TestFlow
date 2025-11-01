/**
 * StatusProgressBar Component
 *
 * Renders a visual progress bar showing workflow status
 * - Displays progress percentage with colored fill
 * - Shows status name as centered overlay text
 * - Color-coded based on target date (green/yellow/red/blue/gray)
 */

import * as React from 'react';
import { Text } from '@fluentui/react';
import type { IStatusProgressBarProps } from '../types';
import { getStatusDisplayName } from '../utils/progressCalculator';
import styles from './RequestStatusProgress.module.scss';

/**
 * StatusProgressBar Component
 */
export const StatusProgressBar: React.FC<IStatusProgressBarProps> = React.memo(({
  status,
  progress,
  color,
}) => {
  // Get color class name
  const colorClass = styles[color] || styles.gray;

  return (
    <div
      className={`${styles.progressBarContainer} ${colorClass}`}
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Workflow progress: ${getStatusDisplayName(status)}, ${Math.round(progress)}% complete`}
    >
      {/* Progress bar background */}
      <div className={styles.progressBarTrack}>
        {/* Progress bar fill */}
        <div
          className={`${styles.progressBarFill} ${colorClass}`}
          style={{ width: `${progress}%` }}
        >
          {/* Optional gradient overlay for visual depth */}
          <div className={styles.progressBarGradient} />
        </div>
      </div>

      {/* Status label overlay (centered) */}
      <div className={styles.statusLabelContainer}>
        <Text className={styles.statusLabel}>
          {getStatusDisplayName(status)}
        </Text>
      </div>
    </div>
  );
});

StatusProgressBar.displayName = 'StatusProgressBar';

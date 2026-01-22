/**
 * StatusProgressBar Component
 *
 * Renders a progress bar showing workflow status with:
 * - Light gray background for unfilled portion
 * - Colored progress fill based on urgency (green/yellow/red/blue/gray)
 * - Progress width based on workflow stage
 * - Status name centered with white text
 * - Subtle border for cleaner appearance in list cells
 */

import * as React from 'react';
import { Text } from '@fluentui/react/lib/Text';
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
  // Get color class name for the progress fill
  const colorClass = styles[color] || styles.gray;

  // Ensure progress is a valid number between 0 and 100
  const safeProgress = Math.max(0, Math.min(100, progress || 0));

  return (
    <div
      className={styles.statusContainer}
      role="status"
      aria-label={`Status: ${getStatusDisplayName(status)}, ${Math.round(safeProgress)}% complete`}
      aria-valuenow={safeProgress}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* Progress fill bar */}
      <div
        className={`${styles.progressFill} ${colorClass}`}
        style={{ width: `${safeProgress}%` }}
      />
      {/* Status text (above progress fill) */}
      <Text className={styles.statusLabel}>
        {getStatusDisplayName(status)}
      </Text>
    </div>
  );
});

StatusProgressBar.displayName = 'StatusProgressBar';

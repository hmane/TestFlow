/**
 * StatusProgressBar Component
 *
 * Renders a status badge with:
 * - Full-width colored background based on urgency (green/yellow/red/blue/gray)
 * - Status name with white text
 * - Clean, modern appearance in list cells
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
  // Get color class name for the background
  // Type assertion needed because SCSS module types are auto-generated and may not include all colors
  const colorClass = (styles as Record<string, string>)[color] || styles.gray;

  // Progress is still tracked for accessibility
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
      {/* Colored background - fills entire bar */}
      <div className={`${styles.progressFill} ${colorClass}`} />
      {/* Status text */}
      <Text className={styles.statusLabel}>
        {getStatusDisplayName(status)}
      </Text>
    </div>
  );
});

StatusProgressBar.displayName = 'StatusProgressBar';

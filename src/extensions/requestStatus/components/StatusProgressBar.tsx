/**
 * StatusProgressBar Component
 *
 * Renders a full-width colored container showing workflow status
 * - Full background color based on urgency (green/yellow/red/blue/gray)
 * - Status name centered with white text
 * - No progress bar fill - just solid color background
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
  color,
}) => {
  // Get color class name
  const colorClass = styles[color] || styles.gray;

  return (
    <div
      className={`${styles.statusContainer} ${colorClass}`}
      role="status"
      aria-label={`Status: ${getStatusDisplayName(status)}`}
    >
      <Text className={styles.statusLabel}>
        {getStatusDisplayName(status)}
      </Text>
    </div>
  );
});

StatusProgressBar.displayName = 'StatusProgressBar';

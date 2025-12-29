/**
 * TurnAroundDateDisplay Component
 *
 * Renders a full-width colored container showing the target return date
 * - Similar to progress bar style with complete background coverage
 * - Color-coded based on urgency (green/yellow/red/gray)
 * - Centered white text with shadow for readability
 */

import * as React from 'react';

// Fluent UI - tree-shaken imports
import { Text } from '@fluentui/react/lib/Text';

import type { ITurnAroundDateDisplayProps } from '../types';
import { getColorClassName } from '../utils/dateCalculator';
import styles from './TurnAroundDate.module.scss';

/**
 * TurnAroundDateDisplay Component
 */
export const TurnAroundDateDisplay: React.FC<ITurnAroundDateDisplayProps> = React.memo(({
  targetDate,
  color,
  displayText,
}) => {
  // Get color class name
  const colorClass = styles[getColorClassName(color) as keyof typeof styles] || styles.gray;

  // Build ARIA label
  const ariaLabel = targetDate
    ? `Target return date: ${displayText}`
    : 'No target return date set';

  return (
    <div
      className={`${styles.dateContainer} ${colorClass}`}
      role="status"
      aria-label={ariaLabel}
    >
      {/* Date text centered */}
      <div className={styles.dateTextContainer}>
        <Text className={styles.dateText}>
          {displayText}
        </Text>
      </div>
    </div>
  );
});

TurnAroundDateDisplay.displayName = 'TurnAroundDateDisplay';

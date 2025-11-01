/**
 * LoadingFallback Component
 *
 * Lightweight loading indicator for React.lazy() suspense fallback
 * Used during code-splitting to show loading state
 */

import * as React from 'react';
import { Spinner, SpinnerSize, Stack } from '@fluentui/react';
import './LoadingFallback.scss';

export interface ILoadingFallbackProps {
  /** Optional loading message */
  message?: string;
  /** Minimum height for the loading container */
  minHeight?: number;
}

/**
 * Lightweight loading fallback for lazy-loaded components
 */
export const LoadingFallback: React.FC<ILoadingFallbackProps> = ({
  message = 'Loading...',
  minHeight = 400,
}) => {
  return (
    <div className="loading-fallback" style={{ minHeight: `${minHeight}px` }}>
      <Stack
        horizontalAlign="center"
        verticalAlign="center"
        tokens={{ childrenGap: 16 }}
        styles={{ root: { height: '100%' } }}
      >
        <Spinner size={SpinnerSize.large} label={message} />
      </Stack>
    </div>
  );
};

export default LoadingFallback;

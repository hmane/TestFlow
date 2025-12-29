/**
 * LoadingOverlay Component
 *
 * Displays a loading overlay with spinner and optional message.
 * Can be used as full-page overlay or inline within a container.
 *
 * Features:
 * - Customizable message
 * - Full-page or inline mode
 * - Accessible with aria-live
 * - Optional backdrop blur
 */

import * as React from 'react';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import './LoadingOverlay.scss';

/**
 * LoadingOverlay props
 */
export interface ILoadingOverlayProps {
  /** Message to display below spinner */
  message?: string;

  /** Whether to show as full-page overlay */
  fullPage?: boolean;

  /** Whether to blur backdrop */
  blurBackdrop?: boolean;

  /** Custom CSS class */
  className?: string;

  /** Spinner size */
  spinnerSize?: SpinnerSize;
}

/**
 * LoadingOverlay Component
 */
export const LoadingOverlay: React.FC<ILoadingOverlayProps> = ({
  message = 'Loading...',
  fullPage = false,
  blurBackdrop = true,
  className,
  spinnerSize = SpinnerSize.large,
}) => {
  const containerClass = [
    'loading-overlay',
    fullPage ? 'loading-overlay--full-page' : 'loading-overlay--inline',
    blurBackdrop ? 'loading-overlay--blur' : '',
    className || '',
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClass} role="status" aria-live="polite" aria-busy="true">
      <Stack
        horizontalAlign="center"
        verticalAlign="center"
        tokens={{ childrenGap: 16 }}
        className="loading-overlay__content"
      >
        <Spinner
          size={spinnerSize}
          label={message}
          ariaLive="assertive"
          labelPosition="bottom"
          styles={{
            root: {
              '.ms-Spinner-label': {
                fontSize: '16px',
                fontWeight: 600,
                color: '#323130',
                marginTop: '12px',
              },
            },
          }}
        />
        {message && (
          <Text
            variant="medium"
            styles={{
              root: {
                color: '#605e5c',
                textAlign: 'center',
                maxWidth: '300px',
              },
            }}
          >
            Please wait...
          </Text>
        )}
      </Stack>
    </div>
  );
};

export default LoadingOverlay;

/**
 * ApplicationLoadingScreen Component
 *
 * Custom loading screen for application initialization
 */

import * as React from 'react';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { ProgressIndicator } from '@fluentui/react/lib/ProgressIndicator';
import { ShimmerLoading } from 'spfx-toolkit/lib/components/Card/components/LoadingStates';
import './ApplicationProvider.scss';

/**
 * LoadingStep Component
 */
interface ILoadingStepProps {
  label: string;
  isComplete: boolean;
}

const LoadingStep: React.FC<ILoadingStepProps> = ({ label, isComplete }) => {
  return (
    <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 12 }}>
      <div
        style={{
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: isComplete ? '#107c10' : '#f3f2f1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: isComplete ? 'none' : '2px solid #d2d0ce',
        }}
      >
        {isComplete && (
          <i
            className='ms-Icon ms-Icon--Completed'
            style={{ fontSize: '12px', color: 'white' }}
          />
        )}
        {!isComplete && (
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#0078d4',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        )}
      </div>
      <Text
        variant='medium'
        styles={{
          root: {
            color: isComplete ? '#323130' : '#605e5c',
            fontWeight: isComplete ? 600 : 400,
          },
        }}
      >
        {label}
      </Text>
    </Stack>
  );
};

export interface IApplicationLoadingScreenProps {
  /** Loading message */
  message?: string;

  /** Sub-message or detail */
  subMessage?: string;

  /** Show progress indicator */
  showProgress?: boolean;

  /** Progress percentage (0-100) */
  progress?: number;

  /** Show shimmer effect */
  showShimmer?: boolean;

  /** Custom CSS class */
  className?: string;
}

/**
 * ApplicationLoadingScreen Component
 */
export const ApplicationLoadingScreen: React.FC<IApplicationLoadingScreenProps> = ({
  message = 'Loading Legal Review System',
  subMessage = 'Please wait while we prepare your workspace...',
  showProgress = true,
  progress,
  showShimmer = false,
  className,
}) => {
  const [dots, setDots] = React.useState('');

  // Animated dots effect
  React.useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`application-loading-screen ${className || ''}`}>
      <Stack
        verticalAlign='center'
        horizontalAlign='center'
        styles={{ root: { minHeight: '100vh', padding: '32px' } }}
      >
        <Stack
          tokens={{ childrenGap: 24 }}
          horizontalAlign='center'
          styles={{ root: { maxWidth: '500px', width: '100%' } }}
        >
          {/* Logo or Icon */}
          <div className='loading-icon'>
            <i
              className='ms-Icon ms-Icon--ProtectionCenterLogo32'
              style={{ fontSize: '64px', color: '#0078d4' }}
            />
          </div>

          {/* Loading Message */}
          <Stack tokens={{ childrenGap: 8 }} horizontalAlign='center'>
            <Text variant='xLarge' styles={{ root: { fontWeight: 600, color: '#323130' } }}>
              {message}
              {dots}
            </Text>
            {subMessage && (
              <Text variant='medium' styles={{ root: { color: '#605e5c', textAlign: 'center' } }}>
                {subMessage}
              </Text>
            )}
          </Stack>

          {/* Progress Indicator */}
          {showProgress && (
            <div style={{ width: '100%' }}>
              <ProgressIndicator
                percentComplete={progress ? progress / 100 : undefined}
                barHeight={4}
                styles={{
                  root: { marginTop: '16px' },
                  progressBar: { backgroundColor: '#0078d4' },
                }}
              />
            </div>
          )}

          {/* Shimmer Effect */}
          {showShimmer && (
            <div style={{ width: '100%', marginTop: '24px' }}>
              <ShimmerLoading type='shimmer' style={{ height: '100px' }} />
            </div>
          )}

          {/* Loading Steps */}
          <Stack
            tokens={{ childrenGap: 12 }}
            styles={{ root: { marginTop: '32px', width: '100%' } }}
          >
            <LoadingStep label='Loading configuration' isComplete={false} />
            <LoadingStep label='Loading submission items' isComplete={false} />
            <LoadingStep label='Initializing workspace' isComplete={false} />
          </Stack>
        </Stack>
      </Stack>
    </div>
  );
};



export default ApplicationLoadingScreen;

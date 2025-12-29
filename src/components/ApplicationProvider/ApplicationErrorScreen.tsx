/**
 * ApplicationErrorScreen Component
 *
 * Custom error screen for application initialization failures
 */

import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import * as React from 'react';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import './ApplicationProvider.scss';

export interface IApplicationErrorScreenProps {
  /** Error message */
  error: string;

  /** Retry handler */
  onRetry: () => void;

  /** Show technical details */
  showDetails?: boolean;

  /** Additional error context */
  errorContext?: Record<string, unknown>;

  /** Custom CSS class */
  className?: string;
}

/**
 * ApplicationErrorScreen Component
 */
export const ApplicationErrorScreen: React.FC<IApplicationErrorScreenProps> = ({
  error,
  onRetry,
  showDetails = false,
  errorContext,
  className,
}) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = React.useState(false);

  const handleReload = (): void => {
    window.location.reload();
  };

  const handleCopyError = (): void => {
    const errorText = `
Error: ${error}

Context:
${JSON.stringify(errorContext, null, 2)}

User: ${SPContext.currentUser.email || 'Unknown'}
Site: ${SPContext.pageContext.web.absoluteUrl}
Time: ${new Date().toISOString()}
    `.trim();

    navigator.clipboard.writeText(errorText).then(
      () => {
        SPContext.logger.info('Error details copied to clipboard');
      },
      () => {
        SPContext.logger.warn('Failed to copy error details');
      }
    );
  };

  return (
    <div className={`application-error-screen ${className || ''}`}>
      <Stack
        verticalAlign='center'
        horizontalAlign='center'
        styles={{ root: { minHeight: '100vh', padding: '32px', backgroundColor: '#f3f2f1' } }}
      >
        <Stack
          tokens={{ childrenGap: 24 }}
          styles={{
            root: {
              maxWidth: '600px',
              width: '100%',
              padding: '32px',
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            },
          }}
        >
          {/* Error Icon */}
          <Stack horizontalAlign='center'>
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: '#fde7e9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <i
                className='ms-Icon ms-Icon--ErrorBadge'
                style={{ fontSize: '48px', color: '#a4262c' }}
              />
            </div>
          </Stack>

          {/* Error Title */}
          <Stack tokens={{ childrenGap: 8 }} horizontalAlign='center'>
            <Text
              variant='xxLarge'
              styles={{ root: { fontWeight: 600, color: '#323130', textAlign: 'center' } }}
            >
              Unable to Load Application
            </Text>
            <Text variant='medium' styles={{ root: { color: '#605e5c', textAlign: 'center' } }}>
              We encountered an error while initializing the Legal Review System
            </Text>
          </Stack>

          {/* Error Message */}
          <MessageBar messageBarType={MessageBarType.error} isMultiline={true}>
            {error}
          </MessageBar>

          {/* Action Buttons */}
          <Stack horizontal tokens={{ childrenGap: 12 }} horizontalAlign='center'>
            <PrimaryButton text='Try Again' iconProps={{ iconName: 'Refresh' }} onClick={onRetry} />
            <DefaultButton
              text='Reload Page'
              iconProps={{ iconName: 'NavigateBackMirrored' }}
              onClick={handleReload}
            />
          </Stack>

          {/* Technical Details Section */}
          {showDetails && (
            <Stack tokens={{ childrenGap: 12 }}>
              <Stack horizontal horizontalAlign='space-between' verticalAlign='center'>
                <DefaultButton
                  text={showTechnicalDetails ? 'Hide Technical Details' : 'Show Technical Details'}
                  iconProps={{ iconName: showTechnicalDetails ? 'ChevronUp' : 'ChevronDown' }}
                  onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                  styles={{ root: { minWidth: 'auto' } }}
                />
                {showTechnicalDetails && (
                  <DefaultButton
                    text='Copy Error'
                    iconProps={{ iconName: 'Copy' }}
                    onClick={handleCopyError}
                  />
                )}
              </Stack>

              {showTechnicalDetails && (
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: '#f3f2f1',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontFamily: 'Consolas, Monaco, monospace',
                    maxHeight: '300px',
                    overflow: 'auto',
                  }}
                >
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    <strong>Error:</strong> {error}
                    {'\n\n'}
                    <strong>Context:</strong>
                    {'\n'}
                    {JSON.stringify(errorContext, null, 2)}
                    {'\n\n'}
                    <strong>User:</strong> {SPContext.currentUser.email || 'Unknown'}
                    {'\n'}
                    <strong>Site:</strong> {SPContext.pageContext.web.absoluteUrl}
                    {'\n'}
                    <strong>Time:</strong> {new Date().toISOString()}
                  </pre>
                </div>
              )}
            </Stack>
          )}

          {/* Help Section */}
          <Stack
            tokens={{ childrenGap: 8 }}
            styles={{
              root: {
                padding: '16px',
                backgroundColor: '#eff6fc',
                borderRadius: '4px',
                borderLeft: '4px solid #0078d4',
              },
            }}
          >
            <Text variant='medium' styles={{ root: { fontWeight: 600, color: '#323130' } }}>
              What can you do?
            </Text>
            <Stack tokens={{ childrenGap: 4 }}>
              <Text variant='small' styles={{ root: { color: '#605e5c' } }}>
                • Click "Try Again" to retry the initialization
              </Text>
              <Text variant='small' styles={{ root: { color: '#605e5c' } }}>
                • Check your internet connection
              </Text>
              <Text variant='small' styles={{ root: { color: '#605e5c' } }}>
                • Verify you have necessary permissions
              </Text>
              <Text variant='small' styles={{ root: { color: '#605e5c' } }}>
                • Contact support if the problem persists
              </Text>
            </Stack>
          </Stack>
        </Stack>
      </Stack>
    </div>
  );
};

export default ApplicationErrorScreen;

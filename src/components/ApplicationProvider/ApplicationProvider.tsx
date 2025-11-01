/**
 * ApplicationProvider Component
 *
 * Top-level component that initializes the application and manages global state.
 * Responsibilities:
 * - Initialize all data stores (Config, SubmissionItems, Request)
 * - Provide error boundary for the entire application
 * - Show loading states during initialization
 * - Handle initialization errors gracefully
 * - Provide SPContext to all child components
 */

import { MessageBar, MessageBarType, Stack } from '@fluentui/react';
import * as React from 'react';
import { SPContext } from 'spfx-toolkit';
import { SpinnerLoading } from 'spfx-toolkit/lib/components/Card/components/LoadingStates';
import { ErrorBoundary } from 'spfx-toolkit/lib/components/ErrorBoundary';
import { useConfigStore } from '../../stores/configStore';
import { useRequestStore } from '../../stores/requestStore';
import { useSubmissionItemsStore } from '../../stores/submissionItemsStore';
import type { RequestType } from '../../types';

/**
 * Application initialization state
 */
interface IInitializationState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | undefined;
  configLoaded: boolean;
  submissionItemsLoaded: boolean;
  requestLoaded: boolean;
}

/**
 * ApplicationProvider props
 */
export interface IApplicationProviderProps {
  /** Child components to render after initialization */
  children: React.ReactNode;

  /** Optional request type for specific initialization */
  requestType?: RequestType;

  /** Optional item ID for loading existing request */
  itemId?: number;

  /** Whether to show detailed error information (development mode) */
  isDevelopment?: boolean;

  /** Custom error handler */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;

  /** Custom initialization error handler */
  onInitializationError?: (error: string) => void;

  /** Callback when initialization completes */
  onInitialized?: () => void;

  /** Custom loading component */
  loadingComponent?: React.ReactNode;

  /** Custom error component */
  errorComponent?: React.ComponentType<{ error: string; onRetry: () => void }>;

  /** Application build version */
  buildVersion?: string;

  /** Additional CSS class name */
  className?: string;
}

/**
 * ApplicationProvider Component
 */
export const ApplicationProvider: React.FC<IApplicationProviderProps> = ({
  children,
  requestType,
  itemId,
  isDevelopment = false,
  onError,
  onInitializationError,
  onInitialized,
  loadingComponent,
  errorComponent: ErrorComponent,
  buildVersion,
  className,
}) => {
  const [initState, setInitState] = React.useState<IInitializationState>({
    isInitialized: false,
    isLoading: true,
    error: undefined,
    configLoaded: false,
    submissionItemsLoaded: false,
    requestLoaded: false,
  });

  // Get store methods
  const { loadConfigs } = useConfigStore();
  const { loadItems } = useSubmissionItemsStore();
  const { loadRequest, initializeNewRequest } = useRequestStore();

  /**
   * Initialize application data
   */
  const initializeApplication = React.useCallback(async (): Promise<void> => {
    try {
      setInitState({
        isInitialized: false,
        isLoading: true,
        error: undefined,
        configLoaded: false,
        submissionItemsLoaded: false,
        requestLoaded: false,
      });

      SPContext.logger.info('ApplicationProvider: Starting initialization', {
        requestType,
        itemId,
      });

      // Step 1: Load configurations and submission items in parallel (required for all)
      // ES5 compatible Promise.allSettled alternative
      const corePromises = [loadConfigs(), loadItems()];
      const coreResults: Array<{
        status: 'fulfilled' | 'rejected';
        reason?: unknown;
        value?: unknown;
      }> = [];

      for (const promise of corePromises) {
        try {
          const value = await promise;
          coreResults.push({ status: 'fulfilled', value });
        } catch (reason) {
          coreResults.push({ status: 'rejected', reason });
        }
      }

      // Check if config loading failed
      if (coreResults[0].status === 'rejected') {
        const configError = coreResults[0].reason;
        SPContext.logger.error('ApplicationProvider: Config loading failed', configError);
        throw new Error(
          `Failed to load application configuration: ${
            configError instanceof Error ? configError.message : String(configError)
          }`
        );
      }

      // Check if submission items loading failed
      if (coreResults[1].status === 'rejected') {
        const itemsError = coreResults[1].reason;
        SPContext.logger.error('ApplicationProvider: Submission items loading failed', itemsError);
        throw new Error(
          `Failed to load submission items: ${
            itemsError instanceof Error ? itemsError.message : String(itemsError)
          }`
        );
      }

      // Step 2: Initialize request store (if itemId provided, load existing; otherwise initialize new)
      let requestLoaded = true;
      if (itemId) {
        try {
          SPContext.logger.info('ApplicationProvider: Loading existing request', { itemId });
          await loadRequest(itemId);
          SPContext.logger.success('ApplicationProvider: Request loaded', { itemId });
        } catch (requestError: unknown) {
          SPContext.logger.error('ApplicationProvider: Request loading failed', requestError, {
            itemId,
          });
          throw new Error(
            `Failed to load request: ${
              requestError instanceof Error ? requestError.message : String(requestError)
            }`
          );
        }
      } else {
        // Initialize new request
        try {
          SPContext.logger.info('ApplicationProvider: Initializing new request');
          initializeNewRequest();
          SPContext.logger.success('ApplicationProvider: New request initialized');
        } catch (initError: unknown) {
          SPContext.logger.warn('ApplicationProvider: Request initialization failed', initError);
          // Don't throw - new request initialization is not critical
          requestLoaded = false;
        }
      }

      // All successful
      setInitState({
        isInitialized: true,
        isLoading: false,
        error: undefined,
        configLoaded: true,
        submissionItemsLoaded: true,
        requestLoaded,
      });

      SPContext.logger.success('ApplicationProvider: Initialization complete', {
        configLoaded: true,
        submissionItemsLoaded: true,
        requestLoaded,
        itemId: itemId || 'new',
      });

      if (onInitialized) {
        onInitialized();
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      SPContext.logger.error('ApplicationProvider: Initialization failed', error);

      setInitState({
        isInitialized: false,
        isLoading: false,
        error: errorMessage,
        configLoaded: false,
        submissionItemsLoaded: false,
        requestLoaded: false,
      });

      if (onInitializationError) {
        onInitializationError(errorMessage);
      }
    }
  }, [requestType, itemId, loadConfigs, loadItems, onInitialized, onInitializationError]);

  /**
   * Initialize on mount
   */
  React.useEffect(() => {
    initializeApplication().catch((error: unknown) => {
      SPContext.logger.error('ApplicationProvider: Initialization error', error);
    });
  }, [initializeApplication]);

  /**
   * Handle retry
   */
  const handleRetry = React.useCallback((): void => {
    SPContext.logger.info('ApplicationProvider: Retrying initialization');
    initializeApplication().catch((error: unknown) => {
      SPContext.logger.error('ApplicationProvider: Retry failed', error);
    });
  }, [initializeApplication]);

  /**
   * Render loading state
   */
  if (initState.isLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }

    return (
      <div className={`application-loading ${className || ''}`}>
        <Stack
          verticalAlign='center'
          horizontalAlign='center'
          styles={{ root: { minHeight: '400px' } }}
        >
          <SpinnerLoading
            type='spinner'
            message='Initializing application... Loading configuration and data'
          />
        </Stack>
      </div>
    );
  }

  /**
   * Render error state
   */
  if (initState.error) {
    if (ErrorComponent) {
      return <ErrorComponent error={initState.error} onRetry={handleRetry} />;
    }

    return (
      <div className={`application-error ${className || ''}`}>
        <Stack
          tokens={{ childrenGap: 16 }}
          styles={{ root: { padding: '32px', maxWidth: '600px', margin: '0 auto' } }}
        >
          <MessageBar
            messageBarType={MessageBarType.error}
            isMultiline={true}
            onDismiss={undefined}
          >
            <strong>Application Initialization Error</strong>
            <p>{initState.error}</p>
            {isDevelopment && (
              <details style={{ marginTop: '12px' }}>
                <summary>Technical Details</summary>
                <pre style={{ fontSize: '12px', marginTop: '8px' }}>
                  Config Loaded: {initState.configLoaded ? 'Yes' : 'No'}
                  {'\n'}
                  Submission Items Loaded: {initState.submissionItemsLoaded ? 'Yes' : 'No'}
                  {'\n'}
                  Request Loaded: {initState.requestLoaded ? 'Yes' : 'No'}
                  {'\n'}
                  Request Type: {requestType || 'None'}
                  {'\n'}
                  Item ID: {itemId || 'New Request'}
                </pre>
              </details>
            )}
          </MessageBar>

          <Stack horizontal tokens={{ childrenGap: 8 }}>
            <button
              onClick={handleRetry}
              style={{
                padding: '8px 16px',
                backgroundColor: '#0078d4',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Retry Initialization
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ffffff',
                color: '#0078d4',
                border: '1px solid #0078d4',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Reload Page
            </button>
          </Stack>
        </Stack>
      </div>
    );
  }

  /**
   * Render initialized application with error boundary
   */
  return (
    <ErrorBoundary
      enableRetry={true}
      maxRetries={3}
      showDetailsButton={isDevelopment}
      onError={onError}
      isDevelopment={isDevelopment}
      buildVersion={buildVersion}
      spfxContext={SPContext.pageContext}
      className={className}
    >
      {children}
    </ErrorBoundary>
  );
};

/**
 * Hook to check if application is initialized
 * Note: Request store initialization is optional and doesn't block app initialization
 */
export function useApplicationInitialized(): boolean {
  const { isLoaded: configLoaded } = useConfigStore();
  const { isLoaded: itemsLoaded } = useSubmissionItemsStore();

  // Request store is optional - app is considered initialized if config and items are loaded
  return configLoaded && itemsLoaded;
}

/**
 * Hook to get application initialization status
 */
export function useApplicationStatus(): {
  isInitialized: boolean;
  configLoaded: boolean;
  submissionItemsLoaded: boolean;
  requestLoaded: boolean;
} {
  const { isLoaded: configLoaded } = useConfigStore();
  const { isLoaded: itemsLoaded } = useSubmissionItemsStore();
  const { currentRequest } = useRequestStore();

  return {
    isInitialized: configLoaded && itemsLoaded,
    configLoaded,
    submissionItemsLoaded: itemsLoaded,
    requestLoaded: Boolean(currentRequest),
  };
}

export default ApplicationProvider;

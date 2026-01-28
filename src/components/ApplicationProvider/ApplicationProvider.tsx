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

import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Stack } from '@fluentui/react/lib/Stack';
import * as React from 'react';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import { SpinnerLoading } from 'spfx-toolkit/lib/components/Card/components/LoadingStates';
import { ErrorBoundary } from 'spfx-toolkit/lib/components/ErrorBoundary';
import { useConfigStore } from '@stores/configStore';
import { useRequestStore } from '@stores/requestStore';
import { useShallow } from 'zustand/react/shallow';
import { useSubmissionItemsStore } from '@stores/submissionItemsStore';
import { usePermissionsStore } from '@stores/permissionsStore';
import { useDocumentsStore } from '@stores/documentsStore';
import { RequestCache } from '@utils/requestCache';
import type { RequestType } from '@appTypes/index';

/**
 * Application initialization state
 */
interface IInitializationState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | undefined;
  configLoaded: boolean;
  submissionItemsLoaded: boolean;
  permissionsLoaded: boolean;
  requestLoaded: boolean;
  documentsLoaded: boolean;
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
    permissionsLoaded: false,
    requestLoaded: false,
    documentsLoaded: false,
  });

  // Get store methods
  const { loadConfigs } = useConfigStore();
  const { loadItems } = useSubmissionItemsStore();
  const { loadPermissions } = usePermissionsStore();
  const { loadRequest, initializeNewRequest } = useRequestStore(
    useShallow((s) => ({
      loadRequest: s.loadRequest,
      initializeNewRequest: s.initializeNewRequest,
    }))
  );
  const { loadAllDocuments } = useDocumentsStore();

  /**
   * Initialize application data using store-first architecture
   *
   * Phase 1: Load global data in parallel (required for all views)
   * - Config store (application settings)
   * - Submission items store (request types)
   * - Permissions store (user roles - SINGLE load, no more per-component calls)
   *
   * Phase 2: Load request-specific data (only if itemId provided)
   * - Request store (request data)
   * - Documents store (all documents + library ID in ONE call)
   *
   * This prevents the 400+ duplicate API calls that were causing throttling.
   */
  const initializeApplication = React.useCallback(async (): Promise<void> => {
    try {
      setInitState({
        isInitialized: false,
        isLoading: true,
        error: undefined,
        configLoaded: false,
        submissionItemsLoaded: false,
        permissionsLoaded: false,
        requestLoaded: false,
        documentsLoaded: false,
      });

      SPContext.logger.info('ApplicationProvider: Starting store-first initialization', {
        requestType,
        itemId,
      });

      // ========================================
      // PHASE 1: Load global data in parallel
      // ========================================
      SPContext.logger.info('ApplicationProvider: Phase 1 - Loading global stores');

      const [configResult, itemsResult, permissionsResult] = await Promise.all([
        loadConfigs().then(
          (value) => ({ status: 'fulfilled' as const, value }),
          (reason) => ({ status: 'rejected' as const, reason })
        ),
        loadItems().then(
          (value) => ({ status: 'fulfilled' as const, value }),
          (reason) => ({ status: 'rejected' as const, reason })
        ),
        loadPermissions().then(
          (value) => ({ status: 'fulfilled' as const, value }),
          (reason) => ({ status: 'rejected' as const, reason })
        ),
      ]);

      // Check for failures
      if (configResult.status === 'rejected') {
        const configError = configResult.reason;
        SPContext.logger.error('ApplicationProvider: Config loading failed', configError);
        throw new Error(
          `Failed to load application configuration: ${
            configError instanceof Error ? configError.message : String(configError)
          }`
        );
      }

      if (itemsResult.status === 'rejected') {
        const itemsError = itemsResult.reason;
        SPContext.logger.error('ApplicationProvider: Submission items loading failed', itemsError);
        throw new Error(
          `Failed to load submission items: ${
            itemsError instanceof Error ? itemsError.message : String(itemsError)
          }`
        );
      }

      if (permissionsResult.status === 'rejected') {
        const permError = permissionsResult.reason;
        SPContext.logger.error('ApplicationProvider: Permissions loading failed', permError);
        throw new Error(
          `Failed to load user permissions: ${
            permError instanceof Error ? permError.message : String(permError)
          }`
        );
      }

      SPContext.logger.success('ApplicationProvider: Phase 1 complete - global stores loaded');

      // ========================================
      // PHASE 2: Load request-specific data
      // ========================================
      let requestLoaded = true;
      let documentsLoaded = false;

      if (itemId) {
        SPContext.logger.info('ApplicationProvider: Phase 2 - Loading request-specific data', { itemId });

        // Load request and documents in parallel
        const [requestResult, docsResult] = await Promise.all([
          loadRequest(itemId).then(
            (value) => ({ status: 'fulfilled' as const, value }),
            (reason) => ({ status: 'rejected' as const, reason })
          ),
          loadAllDocuments(itemId).then(
            (value) => ({ status: 'fulfilled' as const, value }),
            (reason) => ({ status: 'rejected' as const, reason })
          ),
        ]);

        if (requestResult.status === 'rejected') {
          const requestError = requestResult.reason;
          SPContext.logger.error('ApplicationProvider: Request loading failed', requestError, { itemId });
          throw new Error(
            `Failed to load request: ${
              requestError instanceof Error ? requestError.message : String(requestError)
            }`
          );
        }

        if (docsResult.status === 'rejected') {
          // Documents failing is not critical - log warning but continue
          SPContext.logger.warn('ApplicationProvider: Documents loading failed', { itemId, error: docsResult.reason });
        } else {
          documentsLoaded = true;
        }

        SPContext.logger.success('ApplicationProvider: Phase 2 complete - request data loaded', { itemId });
      } else {
        // Initialize new request (no documents to load)
        try {
          SPContext.logger.info('ApplicationProvider: Initializing new request');
          initializeNewRequest();
          SPContext.logger.success('ApplicationProvider: New request initialized');
        } catch (initError: unknown) {
          SPContext.logger.warn('ApplicationProvider: Request initialization failed', initError);
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
        permissionsLoaded: true,
        requestLoaded,
        documentsLoaded,
      });

      SPContext.logger.success('ApplicationProvider: Initialization complete', {
        configLoaded: true,
        submissionItemsLoaded: true,
        permissionsLoaded: true,
        requestLoaded,
        documentsLoaded,
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
        permissionsLoaded: false,
        requestLoaded: false,
        documentsLoaded: false,
      });

      if (onInitializationError) {
        onInitializationError(errorMessage);
      }
    }
  }, [requestType, itemId, loadConfigs, loadItems, loadPermissions, loadRequest, loadAllDocuments, initializeNewRequest, onInitialized, onInitializationError]);

  /**
   * Initialize on mount and cleanup on unmount
   */
  React.useEffect(() => {
    initializeApplication().catch((error: unknown) => {
      SPContext.logger.error('ApplicationProvider: Initialization error', error);
    });

    // Cleanup: Reset request cache to stop its interval timer
    return () => {
      SPContext.logger.info('ApplicationProvider: Cleaning up request cache');
      RequestCache.resetInstance();
    };
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
                  Permissions Loaded: {initState.permissionsLoaded ? 'Yes' : 'No'}
                  {'\n'}
                  Request Loaded: {initState.requestLoaded ? 'Yes' : 'No'}
                  {'\n'}
                  Documents Loaded: {initState.documentsLoaded ? 'Yes' : 'No'}
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
   *
   * Note: PermissionsProvider has been replaced with permissionsStore.
   * Permissions are now loaded during initialization (Phase 1) and stored in Zustand.
   * Components use usePermissionsStore selectors instead of PermissionsContext.
   * This prevents duplicate API calls that were causing "page unavailable" errors.
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
  const { isLoaded: permissionsLoaded } = usePermissionsStore();

  // App is considered initialized when global stores are loaded
  return configLoaded && itemsLoaded && permissionsLoaded;
}

/**
 * Hook to get application initialization status
 */
export function useApplicationStatus(): {
  isInitialized: boolean;
  configLoaded: boolean;
  submissionItemsLoaded: boolean;
  permissionsLoaded: boolean;
  requestLoaded: boolean;
} {
  const { isLoaded: configLoaded } = useConfigStore();
  const { isLoaded: itemsLoaded } = useSubmissionItemsStore();
  const { isLoaded: permissionsLoaded } = usePermissionsStore();
  const currentRequest = useRequestStore((s) => s.currentRequest);

  return {
    isInitialized: configLoaded && itemsLoaded && permissionsLoaded,
    configLoaded,
    submissionItemsLoaded: itemsLoaded,
    permissionsLoaded,
    requestLoaded: Boolean(currentRequest),
  };
}

export default ApplicationProvider;

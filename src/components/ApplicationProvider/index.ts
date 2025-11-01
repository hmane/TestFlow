/**
 * ApplicationProvider exports
 */

export { ApplicationProvider, useApplicationInitialized, useApplicationStatus } from './ApplicationProvider';
export type { IApplicationProviderProps } from './ApplicationProvider';

export { ApplicationLoadingScreen } from './ApplicationLoadingScreen';
export type { IApplicationLoadingScreenProps } from './ApplicationLoadingScreen';

export { ApplicationErrorScreen } from './ApplicationErrorScreen';
export type { IApplicationErrorScreenProps } from './ApplicationErrorScreen';

// Re-export ErrorBoundary from spfx-toolkit for convenience
export { ErrorBoundary, useErrorHandler, withErrorBoundary } from 'spfx-toolkit/lib/components/ErrorBoundary';
export type {
  IErrorBoundaryProps,
  IErrorBoundaryState,
  IErrorFallbackProps,
  IErrorDetails,
  ErrorSeverity,
  ErrorCategory,
} from 'spfx-toolkit/lib/components/ErrorBoundary/ErrorBoundary';

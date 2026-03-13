/**
 * Configuration key constants
 *
 * These keys must match the Title values in the SharePoint Configuration list.
 * Used with configStore.getConfig() and configurationService.getConfigValue().
 */
export const ConfigKeys = {
  // Integration
  ApimBaseUrl: 'ApimBaseUrl',
  ApimApiClientId: 'ApimApiClientId',

  // Time Tracking
  WorkingHoursStart: 'WorkingHoursStart',
  WorkingHoursEnd: 'WorkingHoursEnd',
  WorkingDays: 'WorkingDays',

  // File Upload
  AllowedFileExtensions: 'AllowedFileExtensions',
  MaxFileSizeMB: 'MaxFileSizeMB',

  // Search
  SearchResultLimit: 'SearchResultLimit',
  RecentSearchesLimit: 'RecentSearchesLimit',

  // Features
  EnablePhase2RequestTypes: 'EnablePhase2RequestTypes',
  EnableAzureFunctions: 'EnableAzureFunctions',

  // Document Review Tracking
  EnableDocumentCheckout: 'EnableDocumentCheckout',
  AutoCheckoutOnReplace: 'AutoCheckoutOnReplace',
  CheckoutRequiredForTransition: 'CheckoutRequiredForTransition',
} as const;

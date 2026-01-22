/**
 * Azure Function Service
 *
 * Handles synchronous calls to Azure Functions via APIM for permission management.
 * This ensures permissions are set BEFORE user continues, avoiding "item not found" errors
 * that occur when Flow breaks inheritance asynchronously.
 *
 * Uses SPContext.http.callFunction() from spfx-toolkit for:
 * - Azure AD token acquisition and authentication
 * - Automatic retries with exponential backoff
 * - Timeout handling
 * - Correlation ID tracking
 *
 * Authentication Flow:
 * 1. SPFx app acquires token for APIM API (Azure AD) via SPContext.http
 * 2. Token is sent as Bearer token to APIM
 * 3. APIM validates token and forwards to Azure Function
 * 4. Azure Function extracts user identity and checks SharePoint group membership
 */

import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import type { RequestStatus } from '@appTypes/workflowTypes';
import { Lists } from '@sp/Lists';
import { ConfigurationFields } from '@sp/listFields';

/**
 * Request payload for Azure Function permission management
 */
export interface IPermissionManagementRequest {
  /** SharePoint item ID */
  itemId: number;
  /** Current status of the request */
  status: RequestStatus;
  /** SharePoint site URL */
  siteUrl: string;
  /** List title */
  listTitle: string;
}

/**
 * Request payload for adding/removing user permissions
 */
export interface IUserPermissionRequest {
  /** SharePoint item ID */
  requestId: number;
  /** Request title (e.g., "LRQ-2024-001234") */
  requestTitle: string;
  /** User email address */
  userEmail: string;
  /** User display name */
  userName: string;
  /** SharePoint site URL */
  siteUrl: string;
  /** List title */
  listTitle: string;
}

/**
 * Permission principal from ManageAccess component
 */
export interface IPermissionPrincipal {
  /** Principal ID (user or group) */
  id: string;
  /** Display name */
  displayName: string;
  /** Email address (for users) */
  email?: string;
  /** SharePoint login name */
  loginName?: string;
  /** Permission level */
  permissionLevel: 'view' | 'edit';
  /** Whether this is a group */
  isGroup: boolean;
}

/**
 * Response from Azure Function
 */
export interface IPermissionManagementResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// ============================================
// FEATURE FLAG
// ============================================

/**
 * Feature flag to enable/disable Azure Function calls via APIM.
 *
 * Set to `false` while Azure Functions are not yet deployed.
 * Set to `true` once Azure Functions and APIM are deployed and configured.
 *
 * When disabled:
 * - All permission management functions return success immediately
 * - No actual API calls are made
 * - Logs indicate that calls are skipped
 *
 * Configuration items required in SharePoint Configuration list when enabled:
 * - ApimBaseUrl: e.g., "https://legalworkflow-apim.azure-api.net"
 * - ApimApiClientId: Azure AD App Registration Client ID for the API
 */
export const AZURE_FUNCTIONS_ENABLED = false;

/**
 * Default timeout for Azure Function calls (30 seconds)
 */
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * APIM Configuration
 * These values should be loaded from SharePoint Configuration list in production
 */
interface IApimConfig {
  /** APIM base URL (e.g., "https://legalworkflow-apim.azure-api.net") */
  baseUrl: string;
  /** Azure AD Client ID for the API (used for token acquisition) */
  apiClientId: string;
}

/**
 * Cached APIM configuration promise
 * Using a promise prevents race conditions when multiple concurrent calls are made
 */
let apimConfigPromise: Promise<IApimConfig> | undefined;

/**
 * Loads APIM configuration from SharePoint Configuration list
 * This is the actual fetch logic, separated from caching
 */
async function loadApimConfig(): Promise<IApimConfig> {
  // Load from SharePoint Configuration list
  const items = await SPContext.sp.web.lists
    .getByTitle(Lists.Configuration.Title)
    .items.select(ConfigurationFields.Title, ConfigurationFields.ConfigValue)
    .filter(`(${ConfigurationFields.Title} eq 'ApimBaseUrl' or ${ConfigurationFields.Title} eq 'ApimApiClientId') and ${ConfigurationFields.IsActive} eq true`)();

  const configMap = new Map<string, string>();
  for (const item of items) {
    configMap.set(item[ConfigurationFields.Title], item[ConfigurationFields.ConfigValue]);
  }

  const baseUrl = configMap.get('ApimBaseUrl');
  const apiClientId = configMap.get('ApimApiClientId');

  if (!baseUrl) {
    throw new Error('ApimBaseUrl not configured in Configuration list');
  }

  if (!apiClientId) {
    throw new Error('ApimApiClientId not configured in Configuration list');
  }

  return { baseUrl, apiClientId };
}

/**
 * Gets APIM configuration from SharePoint Configuration list
 *
 * Uses promise-based caching to prevent race conditions when multiple
 * concurrent calls are made. All callers will await the same promise.
 *
 * @returns APIM configuration
 * @throws Error if configuration not found
 */
async function getApimConfig(): Promise<IApimConfig> {
  // If we already have a pending or resolved promise, return it
  if (apimConfigPromise) {
    return apimConfigPromise;
  }

  // Create the promise and cache it immediately (before awaiting)
  // This ensures concurrent calls all get the same promise
  apimConfigPromise = loadApimConfig().catch((error: unknown) => {
    // On error, clear the cache so next call can retry
    apimConfigPromise = undefined;
    const message = error instanceof Error ? error.message : String(error);
    SPContext.logger.error('Failed to load APIM configuration', error, { error: message });
    throw new Error(`Failed to load APIM configuration: ${message}`);
  });

  return apimConfigPromise;
}

/**
 * Clears the APIM configuration cache
 * Call this if configuration is updated
 */
export function clearApimConfigCache(): void {
  apimConfigPromise = undefined;
  SPContext.logger.info('APIM configuration cache cleared');
}

/**
 * Request payload for initialize permissions
 */
interface IInitializePermissionsRequest {
  /** SharePoint item ID */
  requestId: number;
  /** Request title (e.g., "CRR-25-1") */
  requestTitle: string;
  /** SharePoint site URL */
  siteUrl: string;
  /** List title */
  listTitle: string;
}

/**
 * Initialize permissions for a request via APIM
 *
 * This function calls the Azure Function through APIM to break inheritance
 * and set initial permissions when a request is first submitted.
 *
 * Called when transitioning from Draft → Legal Intake.
 *
 * Uses SPContext.http.callFunction() which provides:
 * - Automatic Azure AD token acquisition
 * - Retry logic with exponential backoff
 * - Timeout handling
 *
 * @param itemId - SharePoint list item ID
 * @param requestTitle - Request title (e.g., "CRR-25-1")
 * @returns Promise resolving when permissions are initialized
 * @throws Error if initialization fails
 */
export async function initializePermissions(
  itemId: number,
  requestTitle: string
): Promise<void> {
  // Check feature flag
  if (!AZURE_FUNCTIONS_ENABLED) {
    SPContext.logger.info('AzureFunctionService: initializePermissions SKIPPED (Azure Functions disabled)', {
      itemId,
      requestTitle,
      featureFlag: 'AZURE_FUNCTIONS_ENABLED = false',
    });
    return;
  }

  try {
    SPContext.logger.info('AzureFunctionService: Initializing permissions via APIM', {
      itemId,
      requestTitle,
    });

    const config = await getApimConfig();

    const payload: IInitializePermissionsRequest = {
      requestId: itemId,
      requestTitle,
      siteUrl: SPContext.webAbsoluteUrl,
      listTitle: 'Requests',
    };

    const url = `${config.baseUrl}/api/permissions/initialize`;

    // Use SPContext.http.callFunction() for Azure AD authenticated calls
    // This handles token acquisition, retries, and timeouts automatically
    const response = await SPContext.http.callFunction<IPermissionManagementResponse>({
      url,
      method: 'POST',
      data: payload,
      useAuth: true,
      resourceUri: `api://${config.apiClientId}`,
      timeout: DEFAULT_TIMEOUT_MS,
    });

    if (response.ok && response.data.success) {
      SPContext.logger.success('AzureFunctionService: Permissions initialized successfully', {
        itemId,
        requestTitle,
        duration: response.duration,
      });
      return;
    }

    // Handle failure response
    const errorMessage = response.data?.error || response.data?.message || `HTTP ${response.status}`;
    throw new Error(`Permission initialization failed: ${errorMessage}`);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    SPContext.logger.error('AzureFunctionService: Permission initialization error', error, {
      itemId,
      requestTitle,
      error: message,
    });
    throw new Error(`Failed to initialize permissions: ${message}`);
  }
}

/**
 * Manage request permissions via Azure Function
 *
 * This function is called synchronously during workflow transitions to ensure
 * permissions are set before the user continues. This prevents the "item not found"
 * error that occurs when Flow breaks inheritance asynchronously.
 *
 * Uses SPContext.http.callFunction() which provides:
 * - Automatic Azure AD token acquisition
 * - Retry logic with exponential backoff (retries on 5xx, 429)
 * - Timeout handling
 *
 * @param itemId - SharePoint list item ID
 * @param status - New request status
 * @returns Promise resolving when permissions are successfully set
 * @throws Error if permission management fails
 *
 * @example
 * ```typescript
 * try {
 *   // Update SharePoint item
 *   await updateRequest(itemId, { Status: 'InReview' });
 *
 *   // Set permissions synchronously
 *   await manageRequestPermissions(itemId, 'InReview');
 *
 *   // User sees success only after permissions are set
 *   showSuccessMessage('Request submitted successfully');
 * } catch (error) {
 *   // Rollback SharePoint update or show error
 *   showErrorMessage('Failed to submit request');
 * }
 * ```
 *
 * @deprecated Use initializePermissions() for first submit (Draft → Legal Intake).
 * This function is kept for backward compatibility with other status transitions
 * that may still use the legacy flow.
 */
export async function manageRequestPermissions(
  itemId: number,
  status: RequestStatus
): Promise<void> {
  // Check feature flag
  if (!AZURE_FUNCTIONS_ENABLED) {
    SPContext.logger.info('AzureFunctionService: manageRequestPermissions SKIPPED (Azure Functions disabled)', {
      itemId,
      status,
      featureFlag: 'AZURE_FUNCTIONS_ENABLED = false',
    });
    return;
  }

  try {
    const config = await getApimConfig();

    const payload: IPermissionManagementRequest = {
      itemId,
      status,
      siteUrl: SPContext.webAbsoluteUrl,
      listTitle: 'Requests',
    };

    const url = `${config.baseUrl}/api/permissions/manage`;

    SPContext.logger.info('AzureFunctionService: Managing permissions', {
      itemId,
      status,
      url,
    });

    // Use SPContext.http.callFunction() for Azure AD authenticated calls
    const response = await SPContext.http.callFunction<IPermissionManagementResponse>({
      url,
      method: 'POST',
      data: payload,
      useAuth: true,
      resourceUri: `api://${config.apiClientId}`,
      timeout: DEFAULT_TIMEOUT_MS,
    });

    if (response.ok && response.data.success) {
      SPContext.logger.success('AzureFunctionService: Permissions updated successfully', {
        itemId,
        status,
        duration: response.duration,
      });
      return;
    }

    // Handle failure response
    const errorMessage = response.data?.error || response.data?.message || `HTTP ${response.status}`;
    throw new Error(`Permission management failed: ${errorMessage}`);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    SPContext.logger.error('AzureFunctionService: Permission management error', error, {
      itemId,
      status,
      error: message,
    });
    throw new Error(`Failed to manage permissions for request ${itemId}: ${message}`);
  }
}

/**
 * Add user permission to a request via APIM
 *
 * This function calls the Azure Function through APIM to add Read permission
 * for a user on the specified request. The user's token is used for authentication
 * and authorization is checked based on SharePoint group membership.
 *
 * @param itemId - SharePoint list item ID
 * @param requestTitle - Request title (e.g., "LRQ-2024-001234")
 * @param principal - User principal to add
 * @returns Promise resolving to true if successful, false otherwise
 *
 * @example
 * ```typescript
 * const success = await addUserPermission(123, 'LRQ-2024-001234', {
 *   id: '1',
 *   displayName: 'John Doe',
 *   email: 'john.doe@company.com',
 *   permissionLevel: 'view',
 *   isGroup: false
 * });
 * ```
 */
export async function addUserPermission(
  itemId: number,
  requestTitle: string,
  principal: IPermissionPrincipal
): Promise<boolean> {
  // Check feature flag
  if (!AZURE_FUNCTIONS_ENABLED) {
    SPContext.logger.info('AzureFunctionService: addUserPermission SKIPPED (Azure Functions disabled)', {
      itemId,
      requestTitle,
      userEmail: principal.email,
      featureFlag: 'AZURE_FUNCTIONS_ENABLED = false',
    });
    return true; // Return success when disabled
  }

  try {
    SPContext.logger.info('AzureFunctionService: Adding user permission via APIM', {
      itemId,
      requestTitle,
      userEmail: principal.email,
      userName: principal.displayName,
    });

    const config = await getApimConfig();

    const payload: IUserPermissionRequest = {
      requestId: itemId,
      requestTitle,
      userEmail: principal.email || '',
      userName: principal.displayName,
      siteUrl: SPContext.webAbsoluteUrl,
      listTitle: 'Requests',
    };

    const url = `${config.baseUrl}/api/permissions/add-user`;

    // Use SPContext.http.callFunction() for Azure AD authenticated calls
    const response = await SPContext.http.callFunction<IPermissionManagementResponse>({
      url,
      method: 'POST',
      data: payload,
      useAuth: true,
      resourceUri: `api://${config.apiClientId}`,
      timeout: DEFAULT_TIMEOUT_MS,
    });

    if (response.ok && response.data.success) {
      SPContext.logger.success('AzureFunctionService: User permission added successfully', {
        itemId,
        userEmail: principal.email,
        duration: response.duration,
      });
      return true;
    }

    // Handle failure response
    SPContext.logger.warn('AzureFunctionService: Add user permission returned failure', {
      itemId,
      userEmail: principal.email,
      error: response.data?.error || response.data?.message,
      status: response.status,
    });
    return false;

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    SPContext.logger.error('AzureFunctionService: Add user permission error', error, {
      itemId,
      userEmail: principal.email,
      error: message,
    });
    return false;
  }
}

/**
 * Remove user permission from a request via APIM
 *
 * This function calls the Azure Function through APIM to remove permissions
 * for a user on the specified request. The user's token is used for authentication
 * and authorization is checked based on SharePoint group membership.
 *
 * @param itemId - SharePoint list item ID
 * @param requestTitle - Request title (e.g., "LRQ-2024-001234")
 * @param principal - User principal to remove
 * @returns Promise resolving to true if successful, false otherwise
 *
 * @example
 * ```typescript
 * const success = await removeUserPermission(123, 'LRQ-2024-001234', {
 *   id: '1',
 *   displayName: 'John Doe',
 *   email: 'john.doe@company.com',
 *   permissionLevel: 'view',
 *   isGroup: false
 * });
 * ```
 */
export async function removeUserPermission(
  itemId: number,
  requestTitle: string,
  principal: IPermissionPrincipal
): Promise<boolean> {
  // Check feature flag
  if (!AZURE_FUNCTIONS_ENABLED) {
    SPContext.logger.info('AzureFunctionService: removeUserPermission SKIPPED (Azure Functions disabled)', {
      itemId,
      requestTitle,
      userEmail: principal.email,
      featureFlag: 'AZURE_FUNCTIONS_ENABLED = false',
    });
    return true; // Return success when disabled
  }

  try {
    SPContext.logger.info('AzureFunctionService: Removing user permission via APIM', {
      itemId,
      requestTitle,
      userEmail: principal.email,
      userName: principal.displayName,
    });

    const config = await getApimConfig();

    const payload: IUserPermissionRequest = {
      requestId: itemId,
      requestTitle,
      userEmail: principal.email || '',
      userName: principal.displayName,
      siteUrl: SPContext.webAbsoluteUrl,
      listTitle: 'Requests',
    };

    const url = `${config.baseUrl}/api/permissions/remove-user`;

    // Use SPContext.http.callFunction() for Azure AD authenticated calls
    const response = await SPContext.http.callFunction<IPermissionManagementResponse>({
      url,
      method: 'POST',
      data: payload,
      useAuth: true,
      resourceUri: `api://${config.apiClientId}`,
      timeout: DEFAULT_TIMEOUT_MS,
    });

    if (response.ok && response.data.success) {
      SPContext.logger.success('AzureFunctionService: User permission removed successfully', {
        itemId,
        userEmail: principal.email,
        duration: response.duration,
      });
      return true;
    }

    // Handle failure response
    SPContext.logger.warn('AzureFunctionService: Remove user permission returned failure', {
      itemId,
      userEmail: principal.email,
      error: response.data?.error || response.data?.message,
      status: response.status,
    });
    return false;

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    SPContext.logger.error('AzureFunctionService: Remove user permission error', error, {
      itemId,
      userEmail: principal.email,
      error: message,
    });
    return false;
  }
}

/**
 * Handle permission changes from ManageAccess component
 *
 * This function processes add/remove operations from the ManageAccess component
 * and calls the appropriate Azure Function through APIM.
 *
 * @param operation - 'add' or 'remove' operation
 * @param itemId - SharePoint list item ID
 * @param requestTitle - Request title
 * @param principals - Array of principals to add/remove
 * @returns Promise resolving to true if all operations succeeded
 *
 * @example
 * ```typescript
 * // In ManageAccess component callback
 * const handlePermissionChanged = async (
 *   operation: 'add' | 'remove',
 *   principals: IPermissionPrincipal[]
 * ): Promise<boolean> => {
 *   return handleManageAccessChange(operation, itemId, requestTitle, principals);
 * };
 * ```
 */
export async function handleManageAccessChange(
  operation: 'add' | 'remove',
  itemId: number,
  requestTitle: string,
  principals: IPermissionPrincipal[]
): Promise<boolean> {
  SPContext.logger.info('AzureFunctionService: Processing ManageAccess change', {
    operation,
    itemId,
    requestTitle,
    principalCount: principals.length,
  });

  // Process each principal
  const results = await Promise.all(
    principals.map(async (principal) => {
      if (operation === 'add') {
        return addUserPermission(itemId, requestTitle, principal);
      } else {
        return removeUserPermission(itemId, requestTitle, principal);
      }
    })
  );

  // Check if all operations succeeded
  const allSucceeded = results.every((result) => result === true);

  if (allSucceeded) {
    SPContext.logger.success('AzureFunctionService: All ManageAccess changes completed', {
      operation,
      itemId,
      successCount: results.length,
    });
  } else {
    const failedCount = results.filter((r) => !r).length;
    SPContext.logger.warn('AzureFunctionService: Some ManageAccess changes failed', {
      operation,
      itemId,
      successCount: results.filter((r) => r).length,
      failedCount,
    });
  }

  return allSucceeded;
}

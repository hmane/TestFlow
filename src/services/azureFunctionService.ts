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
import { useConfigStore } from '@stores/configStore';
import { ConfigKeys } from '@sp/ConfigKeys';

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

/**
 * Checks if Azure Function calls via APIM are enabled.
 *
 * Reads from the SharePoint Configuration list (key: 'EnableAzureFunctions').
 * Defaults to `false` if configStore is not yet loaded or key is not found.
 *
 * When disabled:
 * - All permission management functions return success immediately
 * - No actual API calls are made
 * - Logs indicate that calls are skipped
 *
 * Configuration items required in SharePoint Configuration list when enabled:
 * - EnableAzureFunctions: "true"
 * - ApimBaseUrl: e.g., "https://legalworkflow-apim.azure-api.net"
 * - ApimApiClientId: Azure AD App Registration Client ID for the API
 */
function isAzureFunctionsEnabled(): boolean {
  const store = useConfigStore.getState();
  if (!store.isLoaded) return false;
  return store.getConfigBoolean(ConfigKeys.EnableAzureFunctions, false);
}

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
 * Gets APIM configuration from the configStore
 *
 * @returns APIM configuration
 * @throws Error if configuration not found or store not loaded
 */
function getApimConfig(): IApimConfig {
  const store = useConfigStore.getState();

  if (!store.isLoaded) {
    throw new Error('ConfigStore not yet loaded - cannot retrieve APIM configuration');
  }

  const baseUrl = store.getConfig(ConfigKeys.ApimBaseUrl);
  const apiClientId = store.getConfig(ConfigKeys.ApimApiClientId);

  if (!baseUrl) {
    throw new Error('ApimBaseUrl not configured in Configuration list');
  }

  if (!apiClientId) {
    throw new Error('ApimApiClientId not configured in Configuration list');
  }

  return { baseUrl, apiClientId };
}

/**
 * Initialize permissions for a request.
 *
 * Permission initialization (break inheritance + set initial permissions) is
 * handled by the Power Automate "On Create" flow. This function is a no-op
 * retained so callers don't need to be changed.
 *
 * @param itemId - SharePoint list item ID
 * @param requestTitle - Request title (e.g., "CRR-25-1")
 */
export async function initializePermissions(
  itemId: number,
  requestTitle: string
): Promise<void> {
  // Permissions are initialized by Power Automate "On Create" flow,
  // not by the SPFx client. Nothing to do here.
  SPContext.logger.info('AzureFunctionService: initializePermissions — handled by Power Automate flow', {
    itemId,
    requestTitle,
  });
}

/**
 * Manage request permissions after a status transition.
 *
 * All status-based permission changes (initialize, transition, complete) are
 * handled by Power Automate flows. This function is a no-op retained so
 * callers don't need to be changed.
 *
 * @param itemId - SharePoint list item ID
 * @param status - New request status
 */
export async function manageRequestPermissions(
  itemId: number,
  status: RequestStatus
): Promise<void> {
  // Permissions for status transitions are managed by Power Automate
  // "On Modify" flow, not by the SPFx client. Nothing to do here.
  SPContext.logger.info('AzureFunctionService: manageRequestPermissions — handled by Power Automate flow', {
    itemId,
    status,
  });
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
  if (!isAzureFunctionsEnabled()) {
    SPContext.logger.info('AzureFunctionService: addUserPermission SKIPPED (Azure Functions disabled)', {
      itemId,
      requestTitle,
      userEmail: principal.email,
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

    const config = getApimConfig();

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
  if (!isAzureFunctionsEnabled()) {
    SPContext.logger.info('AzureFunctionService: removeUserPermission SKIPPED (Azure Functions disabled)', {
      itemId,
      requestTitle,
      userEmail: principal.email,
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

    const config = getApimConfig();

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

/**
 * Azure Function Service
 *
 * Handles synchronous calls to Azure Functions for permission management.
 * This ensures permissions are set BEFORE user continues, avoiding "item not found" errors
 * that occur when Flow breaks inheritance asynchronously.
 */

import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import type { RequestStatus } from '@appTypes/workflowTypes';

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
 * Response from Azure Function
 */
export interface IPermissionManagementResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Configuration for retry logic
 */
const RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  timeoutMs: 30000, // 30 seconds max per attempt
};

/**
 * Get Azure Function URL from configuration
 *
 * Priority:
 * 1. Environment configuration (from config store)
 * 2. Web property bag
 * 3. Environment variable
 *
 * @returns Azure Function URL
 * @throws Error if URL not configured
 */
function getAzureFunctionUrl(): string {
  // TODO: Read from configuration store once environment config is implemented
  // For now, check web properties or environment
  const url = process.env.AZURE_FUNCTION_URL;

  if (!url) {
    throw new Error(
      'Azure Function URL not configured. Please set AZURE_FUNCTION_URL in environment configuration or web property bag.'
    );
  }

  return url;
}

/**
 * Delay execution for specified milliseconds
 *
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after delay
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 *
 * @param attempt - Current attempt number (0-based)
 * @returns Delay in milliseconds
 */
function getBackoffDelay(attempt: number): number {
  const exponentialDelay = RETRY_CONFIG.initialDelayMs * Math.pow(2, attempt);
  return Math.min(exponentialDelay, RETRY_CONFIG.maxDelayMs);
}

/**
 * Execute Azure Function call with timeout
 *
 * @param url - Azure Function endpoint URL
 * @param payload - Request payload
 * @param timeoutMs - Timeout in milliseconds
 * @returns Promise resolving to response
 * @throws Error if timeout exceeded or fetch fails
 */
async function fetchWithTimeout(
  url: string,
  payload: IPermissionManagementRequest,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;

  } catch (error: unknown) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Azure Function call timed out after ${timeoutMs}ms`);
    }

    throw error;
  }
}

/**
 * Manage request permissions via Azure Function (with retry logic)
 *
 * This function is called synchronously during workflow transitions to ensure
 * permissions are set before the user continues. This prevents the "item not found"
 * error that occurs when Flow breaks inheritance asynchronously.
 *
 * **Retry Logic**:
 * - 3 attempts with exponential backoff (1s, 2s, 4s)
 * - 30 second timeout per attempt
 * - Retries on network errors and 5xx server errors
 * - No retry on 4xx client errors (bad request, auth failures)
 *
 * **Error Handling**:
 * - Throws error on final failure (caller should rollback SharePoint update)
 * - Logs all attempts and failures
 *
 * @param itemId - SharePoint list item ID
 * @param status - New request status
 * @returns Promise resolving when permissions are successfully set
 * @throws Error if all retry attempts fail
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
 */
export async function manageRequestPermissions(
  itemId: number,
  status: RequestStatus
): Promise<void> {
  const url = `${getAzureFunctionUrl()}/api/permissions/manage`;

  const payload: IPermissionManagementRequest = {
    itemId,
    status,
    siteUrl: SPContext.webAbsoluteUrl,
    listTitle: 'Requests', // TODO: Use Lists.Requests.Title
  };

  SPContext.logger.info('AzureFunctionService: Managing permissions', {
    itemId,
    status,
    url,
  });

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      // Log retry attempt
      if (attempt > 0) {
        const backoffDelay = getBackoffDelay(attempt - 1);
        SPContext.logger.info(`AzureFunctionService: Retry attempt ${attempt + 1} after ${backoffDelay}ms`, {
          itemId,
          status,
        });
        await delay(backoffDelay);
      }

      // Execute with timeout
      const response = await fetchWithTimeout(url, payload, RETRY_CONFIG.timeoutMs);

      // Check response status
      if (response.ok) {
        const result: IPermissionManagementResponse = await response.json();

        if (result.success) {
          SPContext.logger.success('AzureFunctionService: Permissions updated successfully', {
            itemId,
            status,
            attempts: attempt + 1,
          });
          return; // SUCCESS
        } else {
          // Azure Function returned success: false
          throw new Error(result.error || result.message || 'Permission management failed');
        }
      }

      // Handle HTTP errors
      const errorText = await response.text();

      // Don't retry on 4xx client errors (bad request, unauthorized, etc.)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(
          `Azure Function request failed (${response.status}): ${errorText}. This is likely a configuration or authorization issue.`
        );
      }

      // Retry on 5xx server errors
      if (response.status >= 500) {
        lastError = new Error(
          `Azure Function server error (${response.status}): ${errorText}`
        );
        SPContext.logger.warn('AzureFunctionService: Server error, will retry', {
          error: lastError.message,
          itemId,
          status,
          attempt: attempt + 1,
          httpStatus: response.status,
        });
        continue; // Retry
      }

      // Other errors
      throw new Error(`Unexpected response (${response.status}): ${errorText}`);

    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));

      SPContext.logger.warn('AzureFunctionService: Attempt failed', {
        error: lastError.message,
        itemId,
        status,
        attempt: attempt + 1,
      });

      // Don't retry on certain errors
      if (
        lastError.message.indexOf('not configured') !== -1 ||
        lastError.message.indexOf('configuration') !== -1 ||
        lastError.message.indexOf('authorization') !== -1
      ) {
        break; // Don't retry configuration/auth errors
      }

      // Continue to retry for network errors, timeouts, server errors
    }
  }

  // All attempts failed
  const finalError = new Error(
    `Failed to manage permissions for request ${itemId} after ${RETRY_CONFIG.maxAttempts} attempts: ${lastError?.message || 'Unknown error'}`
  );

  SPContext.logger.error('AzureFunctionService: All retry attempts failed', finalError, {
    itemId,
    status,
    attempts: RETRY_CONFIG.maxAttempts,
  });

  throw finalError;
}

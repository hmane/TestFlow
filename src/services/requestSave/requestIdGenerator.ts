/**
 * Request ID Generator
 *
 * Generates unique request IDs in format {PREFIX}-{YY}-{N}.
 */

import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import { Lists } from '@sp/Lists';

/**
 * Request ID prefix mapping based on request type
 *
 * Format: {PREFIX}-{YY}-{N}
 * - CRR = Communication Review Request
 * - GRR = General Review Request (Phase 2)
 * - IMA = IMA Review Request (Phase 2)
 */
const REQUEST_ID_PREFIXES: Record<string, string> = {
  'Communication': 'CRR',
  'General Review': 'GRR',
  'IMA Review': 'IMA',
};

/**
 * Get 2-digit year from current date
 */
function getTwoDigitYear(): string {
  return new Date().getFullYear().toString().slice(-2);
}

/**
 * Get the next sequence number from RequestIds list
 *
 * Queries the hidden RequestIds list to find the last sequence number
 * for the given prefix and year, then returns the next number.
 *
 * @param prefix - Request type prefix (CRR, GRR, IMA)
 * @param year - 4-digit year
 * @returns Promise resolving to next sequence number
 */
async function getNextSequenceNumber(prefix: string, year: number): Promise<number> {
  try {
    // Query RequestIds list for the last sequence number for this prefix/year
    const items = await SPContext.sp.web.lists
      .getByTitle(Lists.RequestIds.Title)
      .items.select('Sequence')
      .filter(`Prefix eq '${prefix}' and Year eq ${year}`)
      .orderBy('Sequence', false)
      .top(1)();

    if (items.length > 0) {
      // Ensure we get a number - SharePoint may return string for Number fields
      const lastSequence = Number(items[0].Sequence);
      if (!isNaN(lastSequence)) {
        return lastSequence + 1;
      }
      SPContext.logger.warn('RequestSaveService: Invalid sequence value, starting at 1', { sequence: items[0].Sequence });
    }

    return 1;
  } catch (error: unknown) {
    SPContext.logger.warn('RequestSaveService: Failed to query RequestIds list, starting at 1', error);
    return 1;
  }
}

/**
 * Register a new request ID in the RequestIds list
 *
 * Adds an entry to the hidden RequestIds list to track the sequence.
 * This ensures unique IDs even when users can't see all requests.
 *
 * @param requestId - The full request ID (e.g., CRR-25-1)
 * @param prefix - Request type prefix
 * @param year - 4-digit year
 * @param sequence - Sequence number
 */
async function registerRequestId(
  requestId: string,
  prefix: string,
  year: number,
  sequence: number
): Promise<void> {
  try {
    await SPContext.sp.web.lists
      .getByTitle(Lists.RequestIds.Title)
      .items.add({
        Title: requestId,
        Prefix: prefix,
        Year: year,
        Sequence: sequence,
      });

    SPContext.logger.info('RequestSaveService: Request ID registered', { requestId, prefix, year, sequence });
  } catch (error: unknown) {
    SPContext.logger.error('RequestSaveService: Failed to register request ID', error, { requestId });
    // Don't throw - the request ID is still valid, just not tracked
    // This could cause duplicate IDs in edge cases, but better than failing the save
  }
}

/**
 * Generate request ID in format {PREFIX}-{YY}-{N}
 *
 * Uses the hidden RequestIds list to ensure unique sequential numbering
 * regardless of item-level permissions on the Requests list.
 *
 * Format examples:
 * - CRR-25-1 (Communication Review Request, year 2025, first request)
 * - CRR-25-42 (Communication Review Request, year 2025, 42nd request)
 * - GRR-25-1 (General Review Request - Phase 2)
 * - IMA-25-1 (IMA Review Request - Phase 2)
 *
 * @param requestType - Optional request type (defaults to Communication)
 * @returns Promise resolving to new request ID
 */
export async function generateRequestId(requestType?: string): Promise<string> {
  const currentYear = new Date().getFullYear();
  const twoDigitYear = getTwoDigitYear();
  const prefix = REQUEST_ID_PREFIXES[requestType || 'Communication'] || 'CRR';

  try {
    SPContext.logger.info('RequestSaveService: Generating request ID', {
      requestType,
      prefix,
      year: currentYear,
    });

    // Get next sequence number from RequestIds list
    const nextNumber = await getNextSequenceNumber(prefix, currentYear);

    // Build request ID: PREFIX-YY-N (no zero-padding)
    const requestId = `${prefix}-${twoDigitYear}-${nextNumber}`;

    // Register the ID in the RequestIds list
    await registerRequestId(requestId, prefix, currentYear, nextNumber);

    SPContext.logger.info('RequestSaveService: Request ID generated', { requestId });

    return requestId;

  } catch (error: unknown) {
    SPContext.logger.error('RequestSaveService: Failed to generate request ID', error);
    // Fallback to timestamp-based ID
    return `${prefix}-${twoDigitYear}-${Date.now()}`;
  }
}

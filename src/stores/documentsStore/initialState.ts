/**
 * Documents Store Initial State
 *
 * Initial state values for the documents store.
 */

import { DocumentType } from '@appTypes/documentTypes';
import type { IDocument, IUploadProgress } from './types';

/**
 * Initial state for the documents store
 */
export const initialState = {
  libraryId: undefined as string | undefined,
  documents: new Map<DocumentType, IDocument[]>(),
  stagedFiles: [],
  filesToDelete: [],
  filesToRename: [],
  filesToChangeType: [],
  isLoading: false,
  isUploading: false,
  uploadProgress: new Map<string, IUploadProgress>(),
  retryCount: new Map<string, number>(),
  error: undefined,
};

// Track pending load promise to deduplicate concurrent calls
export let pendingLoadPromise: Promise<void> | undefined = undefined;
export let lastLoadedItemId: number | undefined = undefined;

/**
 * Set the pending load promise
 */
export function setPendingLoadPromise(promise: Promise<void> | undefined): void {
  pendingLoadPromise = promise;
}

/**
 * Set the last loaded item ID
 */
export function setLastLoadedItemId(itemId: number | undefined): void {
  lastLoadedItemId = itemId;
}

/**
 * Reset tracking variables
 */
export function resetTrackingVariables(): void {
  pendingLoadPromise = undefined;
  lastLoadedItemId = undefined;
}

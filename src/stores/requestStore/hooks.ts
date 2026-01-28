/**
 * Request Store Hooks
 *
 * Custom hooks for using the request store.
 */

import * as React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

import type { ILegalRequest } from '@appTypes/index';

import { useRequestStore } from './store';

/**
 * Custom hook to use request store
 * Automatically initializes based on itemId parameter
 *
 * Uses shallow comparison to only re-render when the selected fields change.
 * For even more granular control, use the individual selector hooks from selectors.ts.
 *
 * IMPORTANT: This hook does NOT reset the store on unmount to prevent data loss
 * when components remount. The store should be explicitly reset when navigating
 * away from the form (e.g., via onClose handler).
 */
export function useRequest(itemId?: number): {
  currentRequest?: ILegalRequest;
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  error?: string;
  updateField: <K extends keyof ILegalRequest>(field: K, value: ILegalRequest[K]) => void;
  updateMultipleFields: (fields: Partial<ILegalRequest>) => void;
  saveAsDraft: () => Promise<number>;
  submitRequest: () => Promise<number>;
  revertChanges: () => void;
  hasUnsavedChanges: () => boolean;
} {
  const {
    currentRequest,
    isLoading,
    isSaving,
    isDirty,
    error,
    updateField,
    updateMultipleFields,
    saveAsDraft,
    submitRequest,
    revertChanges,
    hasUnsavedChanges,
  } = useRequestStore(
    useShallow((s) => ({
      currentRequest: s.currentRequest,
      isLoading: s.isLoading,
      isSaving: s.isSaving,
      isDirty: s.isDirty,
      error: s.error,
      updateField: s.updateField,
      updateMultipleFields: s.updateMultipleFields,
      saveAsDraft: s.saveAsDraft,
      submitRequest: s.submitRequest,
      revertChanges: s.revertChanges,
      hasUnsavedChanges: s.hasUnsavedChanges,
    }))
  );

  // Track if this effect has already run for this itemId to prevent duplicate loads
  const hasInitializedRef = React.useRef<number | undefined>(undefined);

  // Auto-initialize on mount or when itemId changes
  // Uses a ref to track initialization state and prevent duplicate API calls
  React.useEffect(() => {
    // Skip if already initialized for this itemId
    if (hasInitializedRef.current === itemId) {
      return;
    }

    // Mark as initialized for this itemId
    hasInitializedRef.current = itemId;

    // Access store methods directly to avoid dependency issues
    const store = useRequestStore.getState();

    if (itemId) {
      SPContext.logger.info('useRequest: Loading request', { itemId });
      store.loadRequest(itemId).catch((err: unknown) => {
        SPContext.logger.error('useRequest: Auto-load request failed', err, { itemId });
      });
    } else {
      SPContext.logger.info('useRequest: Initializing new request');
      store.initializeNewRequest();
    }

    // No cleanup - store reset should be handled explicitly by the form's onClose handler
    // This prevents data loss when components temporarily unmount during React reconciliation
  }, [itemId]);

  return {
    currentRequest,
    isLoading,
    isSaving,
    isDirty,
    error,
    updateField,
    updateMultipleFields,
    saveAsDraft,
    submitRequest,
    revertChanges,
    hasUnsavedChanges,
  };
}

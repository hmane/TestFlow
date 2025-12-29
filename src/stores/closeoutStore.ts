/**
 * Closeout Store
 *
 * Zustand store for sharing closeout form data between
 * CloseoutForm and RequestActions components.
 *
 * This store holds the tracking ID and closeout notes
 * that the user enters in the Closeout form.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

/**
 * Closeout form values for batch update
 */
export interface ICloseoutValues {
  trackingId?: string;
  closeoutNotes?: string;
}

/**
 * Closeout form state
 */
export interface ICloseoutState {
  // Form values
  trackingId?: string;
  closeoutNotes?: string;

  // Dirty tracking
  isDirty: boolean;

  // Actions
  setTrackingId: (trackingId: string | undefined) => void;
  setCloseoutNotes: (notes: string | undefined) => void;
  setCloseoutValues: (values: ICloseoutValues) => void;
  reset: () => void;
  getFormData: () => ICloseoutValues;
}

/**
 * Initial state
 */
const initialState = {
  trackingId: undefined,
  closeoutNotes: undefined,
  isDirty: false,
};

/**
 * Create the closeout store
 */
export const useCloseoutStore = create<ICloseoutState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      setTrackingId: (trackingId) => {
        set({
          trackingId,
          isDirty: true,
        });
        SPContext.logger.info('Closeout: Tracking ID updated', { trackingId });
      },

      setCloseoutNotes: (notes) => {
        set({
          closeoutNotes: notes,
          isDirty: true,
        });
      },

      setCloseoutValues: (values) => {
        const currentState = get();
        // Only update if values have changed to prevent unnecessary re-renders
        const hasChanges =
          currentState.trackingId !== values.trackingId ||
          currentState.closeoutNotes !== values.closeoutNotes;

        if (hasChanges) {
          set({
            trackingId: values.trackingId,
            closeoutNotes: values.closeoutNotes,
            isDirty: true,
          });
        }
      },

      reset: () => {
        set(initialState);
        SPContext.logger.info('Closeout: Store reset');
      },

      getFormData: () => {
        const state = get();
        return {
          trackingId: state.trackingId,
          closeoutNotes: state.closeoutNotes,
        };
      },
    }),
    {
      name: 'closeout-store',
    }
  )
);

// ============================================
// ZUSTAND SELECTORS FOR OPTIMIZED RE-RENDERS
// ============================================

/**
 * Selector for tracking ID only
 */
export const useTrackingId = (): string | undefined =>
  useCloseoutStore(state => state.trackingId);

/**
 * Selector for closeout notes only
 */
export const useCloseoutNotes = (): string | undefined =>
  useCloseoutStore(state => state.closeoutNotes);

/**
 * Selector for dirty state only
 */
export const useCloseoutDirty = (): boolean =>
  useCloseoutStore(state => state.isDirty);

/**
 * Selector for closeout store actions only (stable reference)
 * Use this when you only need actions without subscribing to state changes
 */
export const useCloseoutActions = (): {
  setTrackingId: (trackingId: string | undefined) => void;
  setCloseoutNotes: (notes: string | undefined) => void;
  setCloseoutValues: (values: ICloseoutValues) => void;
  reset: () => void;
} =>
  useCloseoutStore(state => ({
    setTrackingId: state.setTrackingId,
    setCloseoutNotes: state.setCloseoutNotes,
    setCloseoutValues: state.setCloseoutValues,
    reset: state.reset,
  }));

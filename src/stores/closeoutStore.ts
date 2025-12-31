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
  /** Whether review comments have been acknowledged (required if outcome was Approved with Comments) */
  commentsAcknowledged?: boolean;
}

/**
 * Closeout form state
 */
export interface ICloseoutState {
  // Form values
  trackingId?: string;
  closeoutNotes?: string;
  /** Whether review comments have been acknowledged */
  commentsAcknowledged: boolean;

  // Dirty tracking
  isDirty: boolean;

  // Actions
  setTrackingId: (trackingId: string | undefined) => void;
  setCloseoutNotes: (notes: string | undefined) => void;
  setCommentsAcknowledged: (acknowledged: boolean) => void;
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
  commentsAcknowledged: false,
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

      setCommentsAcknowledged: (acknowledged) => {
        set({
          commentsAcknowledged: acknowledged,
          isDirty: true,
        });
        SPContext.logger.info('Closeout: Comments acknowledged updated', { acknowledged });
      },

      setCloseoutValues: (values) => {
        const currentState = get();
        // Only update if values have changed to prevent unnecessary re-renders
        const hasChanges =
          currentState.trackingId !== values.trackingId ||
          currentState.closeoutNotes !== values.closeoutNotes ||
          currentState.commentsAcknowledged !== values.commentsAcknowledged;

        if (hasChanges) {
          set({
            trackingId: values.trackingId,
            closeoutNotes: values.closeoutNotes,
            commentsAcknowledged: values.commentsAcknowledged ?? false,
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
          commentsAcknowledged: state.commentsAcknowledged,
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
 * Selector for comments acknowledged state
 */
export const useCommentsAcknowledged = (): boolean =>
  useCloseoutStore(state => state.commentsAcknowledged);

/**
 * Selector for closeout store actions only (stable reference)
 * Use this when you only need actions without subscribing to state changes
 */
export const useCloseoutActions = (): {
  setTrackingId: (trackingId: string | undefined) => void;
  setCloseoutNotes: (notes: string | undefined) => void;
  setCommentsAcknowledged: (acknowledged: boolean) => void;
  setCloseoutValues: (values: ICloseoutValues) => void;
  reset: () => void;
} =>
  useCloseoutStore(state => ({
    setTrackingId: state.setTrackingId,
    setCloseoutNotes: state.setCloseoutNotes,
    setCommentsAcknowledged: state.setCommentsAcknowledged,
    setCloseoutValues: state.setCloseoutValues,
    reset: state.reset,
  }));

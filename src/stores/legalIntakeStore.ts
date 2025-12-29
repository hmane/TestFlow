/**
 * Legal Intake Store
 *
 * Zustand store for sharing legal intake form data between
 * LegalIntakeForm and RequestActions components.
 *
 * This store holds the attorney assignment, notes, and review audience
 * that the user selects/edits in the Legal Intake form.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import type { IPrincipal, ReviewAudience } from '@appTypes/index';

/**
 * Legal intake form values for batch update
 */
export interface ILegalIntakeValues {
  selectedAttorney?: IPrincipal;
  assignmentNotes?: string;
  reviewAudience?: ReviewAudience;
}

/**
 * Legal intake form state
 */
export interface ILegalIntakeState {
  // Form values
  selectedAttorney?: IPrincipal;
  assignmentNotes?: string;
  reviewAudience?: ReviewAudience;

  // Dirty tracking
  isDirty: boolean;

  // Actions
  setSelectedAttorney: (attorney: IPrincipal | undefined) => void;
  setAssignmentNotes: (notes: string | undefined) => void;
  setReviewAudience: (audience: ReviewAudience | undefined) => void;
  setFormValues: (values: {
    attorney?: IPrincipal;
    notes?: string;
    reviewAudience?: ReviewAudience;
  }) => void;
  /** Batch update all legal intake values in a single store update */
  setLegalIntakeValues: (values: ILegalIntakeValues) => void;
  reset: () => void;
  getFormData: () => {
    attorney?: IPrincipal;
    notes?: string;
    reviewAudience?: ReviewAudience;
  };
}

/**
 * Initial state
 */
const initialState = {
  selectedAttorney: undefined,
  assignmentNotes: undefined,
  reviewAudience: undefined,
  isDirty: false,
};

/**
 * Create the legal intake store
 */
export const useLegalIntakeStore = create<ILegalIntakeState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      setSelectedAttorney: (attorney) => {
        set({
          selectedAttorney: attorney,
          isDirty: true,
        });
        SPContext.logger.info('Legal Intake: Attorney selected', {
          attorneyId: attorney?.id,
          attorneyName: attorney?.title,
        });
      },

      setAssignmentNotes: (notes) => {
        set({
          assignmentNotes: notes,
          isDirty: true,
        });
      },

      setReviewAudience: (audience) => {
        set({
          reviewAudience: audience,
          isDirty: true,
        });
        SPContext.logger.info('Legal Intake: Review audience changed', { audience });
      },

      setFormValues: (values) => {
        set({
          selectedAttorney: values.attorney,
          assignmentNotes: values.notes,
          reviewAudience: values.reviewAudience,
          isDirty: true,
        });
      },

      setLegalIntakeValues: (values) => {
        const currentState = get();
        // Only update if values have changed to prevent unnecessary re-renders
        const hasChanges =
          currentState.selectedAttorney !== values.selectedAttorney ||
          currentState.assignmentNotes !== values.assignmentNotes ||
          currentState.reviewAudience !== values.reviewAudience;

        if (hasChanges) {
          set({
            selectedAttorney: values.selectedAttorney,
            assignmentNotes: values.assignmentNotes,
            reviewAudience: values.reviewAudience,
            isDirty: true,
          });
        }
      },

      reset: () => {
        set(initialState);
        SPContext.logger.info('Legal Intake: Store reset');
      },

      getFormData: () => {
        const state = get();
        return {
          attorney: state.selectedAttorney,
          notes: state.assignmentNotes,
          reviewAudience: state.reviewAudience,
        };
      },
    }),
    {
      name: 'legal-intake-store',
    }
  )
);

// ============================================
// ZUSTAND SELECTORS FOR OPTIMIZED RE-RENDERS
// ============================================

/**
 * Selector for selected attorney only
 */
export const useSelectedAttorney = (): IPrincipal | undefined =>
  useLegalIntakeStore(state => state.selectedAttorney);

/**
 * Selector for assignment notes only
 */
export const useAssignmentNotes = (): string | undefined =>
  useLegalIntakeStore(state => state.assignmentNotes);

/**
 * Selector for review audience only
 */
export const useLegalIntakeReviewAudience = (): ReviewAudience | undefined =>
  useLegalIntakeStore(state => state.reviewAudience);

/**
 * Selector for dirty state only
 */
export const useLegalIntakeDirty = (): boolean =>
  useLegalIntakeStore(state => state.isDirty);

/**
 * Selector for legal intake store actions only (stable reference)
 * Use this when you only need actions without subscribing to state changes
 */
export const useLegalIntakeActions = (): {
  setSelectedAttorney: (attorney: IPrincipal | undefined) => void;
  setAssignmentNotes: (notes: string | undefined) => void;
  setReviewAudience: (audience: ReviewAudience | undefined) => void;
  setLegalIntakeValues: (values: ILegalIntakeValues) => void;
  reset: () => void;
} =>
  useLegalIntakeStore(state => ({
    setSelectedAttorney: state.setSelectedAttorney,
    setAssignmentNotes: state.setAssignmentNotes,
    setReviewAudience: state.setReviewAudience,
    setLegalIntakeValues: state.setLegalIntakeValues,
    reset: state.reset,
  }));

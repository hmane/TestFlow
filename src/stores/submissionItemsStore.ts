/**
 * Submission Items Store
 * Read-only store for submission item configuration data
 * Uses pessimistic caching strategy via SPContext.spPessimistic
 */

import * as React from 'react';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists';
import { createSPExtractor } from 'spfx-toolkit/lib/utilities/listItemHelper';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { Lists } from '@sp/Lists';
import { SubmissionItemsFields } from '@sp/listFields/SubmissionItemsFields';

import type { ISubmissionItem, ISubmissionItemListItem } from '@appTypes/index';

/**
 * Submission items store state interface
 */
interface ISubmissionItemsState {
  // State
  items: ISubmissionItem[];
  isLoading: boolean;
  isLoaded: boolean;
  error?: string;
  lastLoadedAt?: Date;

  // Actions
  loadItems: () => Promise<void>;
  getItemById: (id: number) => ISubmissionItem | undefined;
  getItemByTitle: (title: string) => ISubmissionItem | undefined;
  refresh: () => Promise<void>;
  reset: () => void;
}

/**
 * Initial state
 */
const initialState = {
  items: [],
  isLoading: false,
  isLoaded: false,
  error: undefined,
  lastLoadedAt: undefined,
};

/**
 * Map SharePoint list item to domain model
 */
function mapSubmissionItem(item: ISubmissionItemListItem): ISubmissionItem {
  const extractor = createSPExtractor(item);

  return {
    id: extractor.number(SubmissionItemsFields.ID),
    title: extractor.string(SubmissionItemsFields.Title, ''),
    turnAroundTimeInDays: extractor.number(SubmissionItemsFields.TurnAroundTimeInDays, 3),
    description: extractor.string(SubmissionItemsFields.Description),
    displayOrder: extractor.number(SubmissionItemsFields.DisplayOrder),
  };
}

/**
 * Submission items store
 * Pessimistic caching strategy - long-term cache for configuration data
 */
export const useSubmissionItemsStore = create<ISubmissionItemsState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      /**
       * Load submission items from SharePoint
       * Uses pessimistic caching (long-term cache)
       */
      loadItems: async (): Promise<void> => {
        const state = get();

        // If already loaded and not stale, skip reload
        if (state.isLoaded && !state.error) {
          SPContext.logger.info('Submission items already loaded, using cached data', {
            itemCount: state.items.length,
            loadedAt: state.lastLoadedAt,
          });
          return;
        }

        set({ isLoading: true, error: undefined });

        try {
          SPContext.logger.info('Loading submission items with SPContext');

          // Use SPContext for reliable SP operations
          const listItems = (await SPContext.sp.web.lists
            .getByTitle(Lists.SubmissionItems.Title)
            .items.select(SubmissionItemsFields.ID, SubmissionItemsFields.Title, SubmissionItemsFields.TurnAroundTimeInDays, SubmissionItemsFields.Description, SubmissionItemsFields.DisplayOrder)
            .orderBy(SubmissionItemsFields.DisplayOrder, true)
            .orderBy(SubmissionItemsFields.Title, true)
            .top(100)()) as ISubmissionItemListItem[];

          const mappedItems = listItems.map(mapSubmissionItem);

          set({
            items: mappedItems,
            isLoading: false,
            isLoaded: true,
            lastLoadedAt: new Date(),
            error: undefined,
          });

          SPContext.logger.info('Submission items loaded successfully', {
            count: mappedItems.length,
          });
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);

          SPContext.logger.error('Failed to load submission items', error, {
            context: 'submissionItemsStore.loadItems',
          });

          set({
            items: [],
            isLoading: false,
            isLoaded: false,
            error: message,
          });

          throw new Error(`Failed to load submission items: ${message}`);
        }
      },

      /**
       * Get submission item by ID
       */
      getItemById: (id: number): ISubmissionItem | undefined => {
        const state = get();
        for (const item of state.items) {
          if (item.id === id) {
            return item;
          }
        }
        return undefined;
      },

      /**
       * Get submission item by title
       */
      getItemByTitle: (title: string): ISubmissionItem | undefined => {
        const state = get();
        const lowerTitle = title.toLowerCase();
        for (const item of state.items) {
          if (item.title.toLowerCase() === lowerTitle) {
            return item;
          }
        }
        return undefined;
      },

      /**
       * Force refresh submission items (clears cache)
       */
      refresh: async (): Promise<void> => {
        SPContext.logger.info('Forcing refresh of submission items');

        // Clear cache by resetting loaded flag
        set({ isLoaded: false, error: undefined });

        // Reload items
        await get().loadItems();
      },

      /**
       * Reset store to initial state
       */
      reset: (): void => {
        SPContext.logger.info('Resetting submission items store');
        set(initialState);
      },
    }),
    {
      name: 'SubmissionItemsStore',
      // Disable devtools initially to avoid SPContext access at module load
      // Will be enabled after SPContext initializes
      enabled: false,
    }
  )
);

/**
 * Custom hook to use submission items
 * Automatically loads items on first use
 */
export function useSubmissionItems(): {
  items: ISubmissionItem[];
  isLoading: boolean;
  isLoaded: boolean;
  error?: string;
  getItemById: (id: number) => ISubmissionItem | undefined;
  getItemByTitle: (title: string) => ISubmissionItem | undefined;
  refresh: () => Promise<void>;
} {
  const { items, isLoading, isLoaded, error, loadItems, getItemById, getItemByTitle, refresh } =
    useSubmissionItemsStore();

  // Auto-load on first mount
  React.useEffect(() => {
    if (!isLoaded && !isLoading && !error) {
      loadItems().catch(err => {
        SPContext.logger.error('Auto-load submission items failed', err);
      });
    }
  }, [isLoaded, isLoading, error, loadItems]);

  return {
    items,
    isLoading,
    isLoaded,
    error,
    getItemById,
    getItemByTitle,
    refresh,
  };
}

/**
 * Hook to get a specific submission item by ID
 */
export function useSubmissionItem(id: number | undefined): ISubmissionItem | undefined {
  const { items, isLoaded } = useSubmissionItems();

  return React.useMemo(() => {
    if (!isLoaded || !id) {
      return undefined;
    }
    for (const item of items) {
      if (item.id === id) {
        return item;
      }
    }
    return undefined;
  }, [items, isLoaded, id]);
}

/**
 * Configuration Store
 * Read-only store for application configuration data
 * Uses pessimistic caching strategy via SPContext.spPessimistic
 */

import * as React from 'react';
import { SPContext } from 'spfx-toolkit';
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists';
import { createSPExtractor } from 'spfx-toolkit/lib/utilities/listItemHelper';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { Lists } from '@sp/Lists';
import { ConfigurationFields } from '@sp/listFields/ConfigurationFields';

import type { IAppConfiguration, IConfigurationListItem } from '../types';

/**
 * Configuration store state interface
 */
interface IConfigState {
  // State
  configs: IAppConfiguration[];
  configMap: Map<string, string>;
  isLoading: boolean;
  isLoaded: boolean;
  error?: string;
  lastLoadedAt?: Date;

  // Actions
  loadConfigs: () => Promise<void>;
  getConfig: (key: string, defaultValue?: string) => string | undefined;
  getConfigBoolean: (key: string, defaultValue?: boolean) => boolean;
  getConfigNumber: (key: string, defaultValue?: number) => number | undefined;
  refresh: () => Promise<void>;
  reset: () => void;
}

/**
 * Initial state
 */
const initialState = {
  configs: [],
  configMap: new Map<string, string>(),
  isLoading: false,
  isLoaded: false,
  error: undefined,
  lastLoadedAt: undefined,
};

/**
 * Map SharePoint list item to domain model
 */
function mapConfiguration(item: IConfigurationListItem): IAppConfiguration {
  const extractor = createSPExtractor(item);

  return {
    id: extractor.number(ConfigurationFields.ID),
    configKey: extractor.string(ConfigurationFields.Title, ''),
    configValue: extractor.string(ConfigurationFields.ConfigValue, ''),
    description: extractor.string(ConfigurationFields.Description),
    isActive: extractor.boolean(ConfigurationFields.IsActive, true),
    category: extractor.string(ConfigurationFields.Category),
  };
}

/**
 * Configuration store
 * Pessimistic caching strategy - long-term cache for configuration data
 */
export const useConfigStore = create<IConfigState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      /**
       * Load configuration from SharePoint
       * Uses pessimistic caching (long-term cache)
       */
      loadConfigs: async (): Promise<void> => {
        const state = get();

        // If already loaded and not stale, skip reload
        if (state.isLoaded && !state.error) {
          SPContext.logger.info('Configuration already loaded, using cached data', {
            configCount: state.configs.length,
            loadedAt: state.lastLoadedAt,
          });
          return;
        }

        set({ isLoading: true, error: undefined });

        try {
          SPContext.logger.info('Loading configuration with SPContext');

          // Use SPContext for reliable SP operations
          const listItems = (await SPContext.sp.web.lists
            .getByTitle(Lists.Configuration.Title)
            .items.select(ConfigurationFields.ID, ConfigurationFields.Title, ConfigurationFields.ConfigValue, ConfigurationFields.Description, ConfigurationFields.IsActive, ConfigurationFields.Category)
            .filter(`${ConfigurationFields.IsActive} eq true`)
            .top(500)()) as IConfigurationListItem[];

          const mappedConfigs = listItems.map(mapConfiguration);

          // Build config map for fast lookups
          const configMap = new Map<string, string>();
          mappedConfigs.forEach(config => {
            configMap.set(config.configKey.toLowerCase(), config.configValue);
          });

          set({
            configs: mappedConfigs,
            configMap,
            isLoading: false,
            isLoaded: true,
            lastLoadedAt: new Date(),
            error: undefined,
          });

          const categorySet = new Set<string>();
          mappedConfigs.forEach(c => {
            if (c.category) {
              categorySet.add(c.category);
            }
          });
          const categories: string[] = [];
          categorySet.forEach(cat => categories.push(cat));

          SPContext.logger.info('Configuration loaded successfully', {
            count: mappedConfigs.length,
            categories,
          });
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);

          SPContext.logger.error('Failed to load configuration', error, {
            context: 'configStore.loadConfigs',
          });

          set({
            configs: [],
            configMap: new Map(),
            isLoading: false,
            isLoaded: false,
            error: message,
          });

          throw new Error(`Failed to load configuration: ${message}`);
        }
      },

      /**
       * Get configuration value by key
       */
      getConfig: (key: string, defaultValue?: string): string | undefined => {
        const state = get();
        const value = state.configMap.get(key.toLowerCase());

        if (value === undefined && defaultValue !== undefined) {
          return defaultValue;
        }

        return value;
      },

      /**
       * Get configuration value as boolean
       */
      getConfigBoolean: (key: string, defaultValue = false): boolean => {
        const state = get();
        const value = state.configMap.get(key.toLowerCase());

        if (value === undefined) {
          return defaultValue;
        }

        const lowerValue = value.toLowerCase();
        return lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes';
      },

      /**
       * Get configuration value as number
       */
      getConfigNumber: (key: string, defaultValue?: number): number | undefined => {
        const state = get();
        const value = state.configMap.get(key.toLowerCase());

        if (value === undefined) {
          return defaultValue;
        }

        const parsed = parseFloat(value);
        return isNaN(parsed) ? defaultValue : parsed;
      },

      /**
       * Force refresh configuration (clears cache)
       */
      refresh: async (): Promise<void> => {
        SPContext.logger.info('Forcing refresh of configuration');

        // Clear cache by resetting loaded flag
        set({ isLoaded: false, error: undefined });

        // Reload configs
        await get().loadConfigs();
      },

      /**
       * Reset store to initial state
       */
      reset: (): void => {
        SPContext.logger.info('Resetting configuration store');
        set(initialState);
      },
    }),
    {
      name: 'ConfigStore',
      // Disable devtools initially to avoid SPContext access at module load
      // Will be enabled after SPContext initializes
      enabled: false,
    }
  )
);

/**
 * Custom hook to use configuration
 * Automatically loads configs on first use
 */
export function useConfig(): {
  configs: IAppConfiguration[];
  isLoading: boolean;
  isLoaded: boolean;
  error?: string;
  getConfig: (key: string, defaultValue?: string) => string | undefined;
  getConfigBoolean: (key: string, defaultValue?: boolean) => boolean;
  getConfigNumber: (key: string, defaultValue?: number) => number | undefined;
  refresh: () => Promise<void>;
} {
  const {
    configs,
    isLoading,
    isLoaded,
    error,
    loadConfigs,
    getConfig,
    getConfigBoolean,
    getConfigNumber,
    refresh,
  } = useConfigStore();

  // Auto-load on first mount
  React.useEffect(() => {
    if (!isLoaded && !isLoading && !error) {
      loadConfigs().catch(err => {
        SPContext.logger.error('Auto-load configuration failed', err);
      });
    }
  }, [isLoaded, isLoading, error, loadConfigs]);

  return {
    configs,
    isLoading,
    isLoaded,
    error,
    getConfig,
    getConfigBoolean,
    getConfigNumber,
    refresh,
  };
}

/**
 * Hook to get a specific configuration value
 */
export function useConfigValue(key: string, defaultValue?: string): string | undefined {
  const { getConfig, isLoaded } = useConfig();

  return React.useMemo(() => {
    if (!isLoaded) {
      return defaultValue;
    }
    return getConfig(key, defaultValue);
  }, [key, defaultValue, getConfig, isLoaded]);
}

/**
 * Hook to get a configuration value as boolean
 */
export function useConfigBoolean(key: string, defaultValue = false): boolean {
  const { getConfigBoolean, isLoaded } = useConfig();

  return React.useMemo(() => {
    if (!isLoaded) {
      return defaultValue;
    }
    return getConfigBoolean(key, defaultValue);
  }, [key, defaultValue, getConfigBoolean, isLoaded]);
}

/**
 * Hook to get a configuration value as number
 */
export function useConfigNumber(key: string, defaultValue?: number): number | undefined {
  const { getConfigNumber, isLoaded } = useConfig();

  return React.useMemo(() => {
    if (!isLoaded) {
      return defaultValue;
    }
    return getConfigNumber(key, defaultValue);
  }, [key, defaultValue, getConfigNumber, isLoaded]);
}

/**
 * Configuration Service
 *
 * Loads and caches system configuration from SharePoint Configuration list.
 * Provides typed access to configuration values with caching support.
 *
 * @module services/configurationService
 */

import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists';
import { IWorkingHoursConfig, parseWorkingHoursConfig, DEFAULT_WORKING_HOURS } from '@utils/businessHoursCalculator';
import { Lists } from '@sp/Lists';
import { ConfigurationFields } from '@sp/listFields/ConfigurationFields';

/**
 * Configuration cache entry
 */
interface IConfigCacheEntry {
  value: string;
  timestamp: number;
}

/**
 * Configuration cache
 * Map of configuration key to cache entry
 */
const configCache: Map<string, IConfigCacheEntry> = new Map();

/**
 * Cache TTL in milliseconds (5 minutes)
 */
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Working hours configuration cache
 */
let workingHoursCache: { config: IWorkingHoursConfig; timestamp: number } | undefined;

/**
 * Updates the working hours cache with a new entry
 * This helper function exists to satisfy ESLint's require-atomic-updates rule
 */
function updateWorkingHoursCache(config: IWorkingHoursConfig): void {
  workingHoursCache = { config, timestamp: Date.now() };
}

/**
 * Loads all configuration items from SharePoint
 *
 * @returns Map of configuration key to value
 *
 * @example
 * ```typescript
 * const config = await loadSystemConfiguration();
 * console.log(config.get('WorkingHoursStart')); // "8"
 * console.log(config.get('WorkingHoursEnd')); // "17"
 * ```
 */
export async function loadSystemConfiguration(): Promise<Map<string, string>> {
  try {
    SPContext.logger.info('Loading system configuration', { listName: 'Configuration' });

    const items = await SPContext.sp.web.lists
      .getByTitle(Lists.Configuration.Title)
      .items.select(ConfigurationFields.Title, ConfigurationFields.ConfigValue, ConfigurationFields.IsActive)
      .filter(`${ConfigurationFields.IsActive} eq true`)();

    const configMap = new Map<string, string>();
    const now = Date.now();

    for (const item of items) {
      const key = item.Title as string;
      const value = item.ConfigValue as string;

      if (key && value !== null && value !== undefined) {
        configMap.set(key, value);

        // Update cache
        configCache.set(key, { value, timestamp: now });
      }
    }

    SPContext.logger.info('System configuration loaded', { count: configMap.size });

    return configMap;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    SPContext.logger.error('Failed to load system configuration', error, { error: message });
    throw new Error(`Failed to load system configuration: ${message}`);
  }
}

/**
 * Gets a single configuration value by key
 *
 * @param key - Configuration key
 * @param defaultValue - Default value if key not found
 * @returns Configuration value or default value
 *
 * @remarks
 * This function uses a cache with 5-minute TTL. If the cached value is expired,
 * it will reload from SharePoint. If the key is not found and no default is provided,
 * it will throw an error.
 *
 * @example
 * ```typescript
 * // Get with default value
 * const startHour = await getConfigValue('WorkingHoursStart', '9');
 * console.log(startHour); // "8" (from SharePoint) or "9" (default)
 *
 * // Get without default (throws if not found)
 * try {
 *   const value = await getConfigValue('RequiredKey');
 * } catch (error) {
 *   console.error('Configuration key not found');
 * }
 * ```
 */
export async function getConfigValue(key: string, defaultValue?: string): Promise<string> {
  // Check cache first
  const cached = configCache.get(key);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL) {
    SPContext.logger.info('Configuration value retrieved from cache', { key, value: cached.value });
    return cached.value;
  }

  // Cache miss or expired - reload from SharePoint
  try {
    SPContext.logger.info('Loading configuration value from SharePoint', { key });

    const items = await SPContext.sp.web.lists
      .getByTitle(Lists.Configuration.Title)
      .items.select(ConfigurationFields.Title, ConfigurationFields.ConfigValue, ConfigurationFields.IsActive)
      .filter(`${ConfigurationFields.Title} eq '${key}' and ${ConfigurationFields.IsActive} eq true`)
      .top(1)();

    if (items.length > 0) {
      const value = items[0].ConfigValue as string;

      // Update cache
      configCache.set(key, { value, timestamp: now });

      SPContext.logger.info('Configuration value loaded', { key, value });
      return value;
    }

    // Not found - return default or throw
    if (defaultValue !== undefined) {
      SPContext.logger.warn('Configuration key not found, using default', { key, defaultValue });
      return defaultValue;
    }

    throw new Error(`Configuration key not found: ${key}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    SPContext.logger.error('Failed to load configuration value', error, { key, error: message });

    // If default provided, return it on error
    if (defaultValue !== undefined) {
      SPContext.logger.warn('Error loading configuration, using default', { key, defaultValue });
      return defaultValue;
    }

    throw new Error(`Failed to load configuration value for key '${key}': ${message}`);
  }
}

/**
 * Gets the working hours configuration for time tracking
 *
 * @returns Working hours configuration
 *
 * @remarks
 * This function loads the time tracking configuration from SharePoint:
 * - WorkingHoursStart (default: 8)
 * - WorkingHoursEnd (default: 17)
 * - WorkingDays (default: "1,2,3,4,5" = Mon-Fri)
 *
 * The configuration is cached for 5 minutes to reduce SharePoint calls.
 *
 * @example
 * ```typescript
 * const config = await getWorkingHoursConfig();
 * console.log(config);
 * // { startHour: 8, endHour: 17, workingDays: [1, 2, 3, 4, 5] }
 *
 * // Use with business hours calculator
 * import { calculateBusinessHours } from '../utils/businessHoursCalculator';
 * const hours = calculateBusinessHours(startDate, endDate, config);
 * ```
 */
export async function getWorkingHoursConfig(): Promise<IWorkingHoursConfig> {
  const checkTime = Date.now();

  // Check cache first
  if (workingHoursCache && checkTime - workingHoursCache.timestamp < CACHE_TTL) {
    SPContext.logger.info('Working hours configuration retrieved from cache', {
      config: workingHoursCache.config,
    });
    return workingHoursCache.config;
  }

  // Load from SharePoint
  try {
    SPContext.logger.info('Loading working hours configuration from SharePoint');

    const [startHourStr, endHourStr, workingDaysStr] = await Promise.all([
      getConfigValue('WorkingHoursStart', String(DEFAULT_WORKING_HOURS.startHour)),
      getConfigValue('WorkingHoursEnd', String(DEFAULT_WORKING_HOURS.endHour)),
      getConfigValue('WorkingDays', DEFAULT_WORKING_HOURS.workingDays.join(',')),
    ]);

    const config = parseWorkingHoursConfig(startHourStr, endHourStr, workingDaysStr);

    // Update cache with fresh timestamp after async operation completes
    updateWorkingHoursCache(config);

    SPContext.logger.info('Working hours configuration loaded', { config });

    return config;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    SPContext.logger.error('Failed to load working hours configuration, using defaults', error, {
      error: message,
      default: DEFAULT_WORKING_HOURS,
    });

    // Return defaults on error
    return DEFAULT_WORKING_HOURS;
  }
}

/**
 * Clears the configuration cache
 *
 * @remarks
 * Use this function when you know configuration has been updated and you want
 * to force a reload from SharePoint on the next access.
 *
 * @example
 * ```typescript
 * // After updating configuration in SharePoint
 * await updateConfiguration('WorkingHoursStart', '9');
 * clearConfigurationCache();
 *
 * // Next access will reload from SharePoint
 * const config = await getWorkingHoursConfig();
 * ```
 */
export function clearConfigurationCache(): void {
  configCache.clear();
  workingHoursCache = undefined;
  SPContext.logger.info('Configuration cache cleared');
}

/**
 * Updates a configuration value in SharePoint
 *
 * @param key - Configuration key
 * @param value - New configuration value
 *
 * @remarks
 * This function updates the configuration in SharePoint and clears the cache
 * to ensure the next access retrieves the updated value.
 *
 * **Note**: This requires appropriate permissions. Most users will not have
 * permission to update configuration. This is typically for admins only.
 *
 * @example
 * ```typescript
 * // Update working hours start time
 * await updateConfiguration('WorkingHoursStart', '9');
 *
 * // Cache is automatically cleared, next access will get new value
 * const config = await getWorkingHoursConfig();
 * console.log(config.startHour); // 9
 * ```
 */
export async function updateConfiguration(key: string, value: string): Promise<void> {
  try {
    SPContext.logger.info('Updating configuration', { key, value });

    // Find the item
    const items = await SPContext.sp.web.lists
      .getByTitle(Lists.Configuration.Title)
      .items.select(ConfigurationFields.ID, ConfigurationFields.Title)
      .filter(`${ConfigurationFields.Title} eq '${key}'`)
      .top(1)();

    if (items.length === 0) {
      throw new Error(`Configuration key not found: ${key}`);
    }

    const itemId = items[0].Id;

    // Update the item
    await SPContext.sp.web.lists.getByTitle(Lists.Configuration.Title).items.getById(itemId).update({
      [ConfigurationFields.ConfigValue]: value,
    });

    // Clear cache to force reload
    clearConfigurationCache();

    SPContext.logger.info('Configuration updated successfully', { key, value });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    SPContext.logger.error('Failed to update configuration', error, { key, value, error: message });
    throw new Error(`Failed to update configuration for key '${key}': ${message}`);
  }
}

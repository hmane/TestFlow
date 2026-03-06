/**
 * Configuration Service
 *
 * Provides typed access to configuration values via the configStore.
 * The configStore handles loading, caching, and SharePoint queries.
 *
 * @module services/configurationService
 */

import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists';
import { IWorkingHoursConfig, parseWorkingHoursConfig, DEFAULT_WORKING_HOURS } from '@utils/businessHoursCalculator';
import { Lists } from '@sp/Lists';
import { ConfigurationFields } from '@sp/listFields/ConfigurationFields';
import { useConfigStore } from '@stores/configStore';
import { ConfigKeys } from '@sp/ConfigKeys';

/**
 * Default allowed file extensions for document uploads
 */
export const DEFAULT_ALLOWED_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.zip',
  '.msg',
  '.eml',
];

/**
 * Gets a configuration value from the configStore
 *
 * @param key - Configuration key (case-insensitive)
 * @param defaultValue - Default value if key not found
 * @returns Configuration value or default value
 * @throws Error if key not found and no default provided
 *
 * @remarks
 * This function reads from the configStore which loads all configuration
 * items at app startup. No additional SharePoint queries are made.
 */
export function getConfigValue(key: string, defaultValue?: string): string {
  const store = useConfigStore.getState();

  if (!store.isLoaded) {
    SPContext.logger.warn('ConfigStore not yet loaded, using default', { key, defaultValue });
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Configuration not loaded and no default provided for key: ${key}`);
  }

  const value = store.getConfig(key);

  if (value !== undefined) {
    return value;
  }

  if (defaultValue !== undefined) {
    return defaultValue;
  }

  throw new Error(`Configuration key not found: ${key}`);
}

/**
 * Gets the working hours configuration for time tracking
 *
 * @returns Working hours configuration
 *
 * @remarks
 * Reads from the configStore (loaded at app startup):
 * - WorkingHoursStart (default: 8)
 * - WorkingHoursEnd (default: 17)
 * - WorkingDays (default: "1,2,3,4,5" = Mon-Fri)
 *
 * @example
 * ```typescript
 * const config = getWorkingHoursConfig();
 * // { startHour: 8, endHour: 17, workingDays: [1, 2, 3, 4, 5] }
 * ```
 */
export function getWorkingHoursConfig(): IWorkingHoursConfig {
  try {
    const startHourStr = getConfigValue(ConfigKeys.WorkingHoursStart, String(DEFAULT_WORKING_HOURS.startHour));
    const endHourStr = getConfigValue(ConfigKeys.WorkingHoursEnd, String(DEFAULT_WORKING_HOURS.endHour));
    const workingDaysStr = getConfigValue(ConfigKeys.WorkingDays, DEFAULT_WORKING_HOURS.workingDays.join(','));

    return parseWorkingHoursConfig(startHourStr, endHourStr, workingDaysStr);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    SPContext.logger.error('Failed to get working hours configuration, using defaults', error, {
      error: message,
      default: DEFAULT_WORKING_HOURS,
    });

    return DEFAULT_WORKING_HOURS;
  }
}

/**
 * Clears the configuration cache by refreshing the configStore
 */
export function clearConfigurationCache(): void {
  const store = useConfigStore.getState();
  store.reset();
  SPContext.logger.info('Configuration cache cleared');
}

/**
 * Updates a configuration value in SharePoint
 *
 * @param key - Configuration key
 * @param value - New configuration value
 *
 * @remarks
 * Updates the configuration in SharePoint and refreshes the configStore.
 * Requires appropriate permissions (admin only).
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

    // Refresh configStore to pick up the change
    await useConfigStore.getState().refresh();

    SPContext.logger.info('Configuration updated successfully', { key, value });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    SPContext.logger.error('Failed to update configuration', error, { key, value, error: message });
    throw new Error(`Failed to update configuration for key '${key}': ${message}`);
  }
}

/**
 * Local storage hook with type safety
 * Persists state to browser localStorage
 */

import * as React from 'react';
import { SPContext } from 'spfx-toolkit';

/**
 * Custom hook for localStorage with type safety
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  // Prefix key with app name to avoid conflicts
  const prefixedKey = `legalWorkflow_${key}`;

  // State to store our value
  const [storedValue, setStoredValue] = React.useState<T>(() => {
    try {
      const item = window.localStorage.getItem(prefixedKey);

      if (item) {
        return JSON.parse(item) as T;
      }

      return initialValue;
    } catch (error: unknown) {
      SPContext.logger.error('Failed to read from localStorage', error, {
        key: prefixedKey,
      });
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage
  const setValue = React.useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        // Allow value to be a function so we have same API as useState
        const valueToStore = value instanceof Function ? value(storedValue) : value;

        // Save state
        setStoredValue(valueToStore);

        // Save to localStorage
        window.localStorage.setItem(prefixedKey, JSON.stringify(valueToStore));
      } catch (error: unknown) {
        SPContext.logger.error('Failed to write to localStorage', error, {
          key: prefixedKey,
        });
      }
    },
    [prefixedKey, storedValue]
  );

  // Clear value from localStorage
  const clearValue = React.useCallback(() => {
    try {
      window.localStorage.removeItem(prefixedKey);
      setStoredValue(initialValue);
    } catch (error: unknown) {
      SPContext.logger.error('Failed to clear localStorage', error, {
        key: prefixedKey,
      });
    }
  }, [prefixedKey, initialValue]);

  return [storedValue, setValue, clearValue];
}

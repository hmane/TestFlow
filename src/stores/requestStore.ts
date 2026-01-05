/**
 * Request Store
 *
 * This file re-exports all request store functionality from the modular structure
 * for backward compatibility. New code should import directly from
 * '@stores/requestStore' (which resolves to the folder with index.ts).
 *
 * @deprecated Import from '@stores/requestStore' folder instead
 */

// Re-export everything from the requestStore module
export * from './requestStore/index';

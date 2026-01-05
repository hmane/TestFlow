/**
 * Documents Store
 *
 * This file re-exports all documents store functionality from the modular structure
 * for backward compatibility. New code should import directly from
 * '@stores/documentsStore' (which resolves to the folder with index.ts).
 *
 * @deprecated Import from '@stores/documentsStore' folder instead
 */

// Re-export everything from the documentsStore module
export * from './documentsStore/index';

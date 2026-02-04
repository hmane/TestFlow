/**
 * Request Store Helpers
 *
 * Helper functions used by the request store.
 */

import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists';

import { useDocumentsStore } from '@stores/documentsStore';
import { processPendingDocuments } from '@services/requestSaveService';

/**
 * Process pending document operations after a successful save
 * Handles uploads, deletes, and renames, then reloads documents
 * @param itemId - The request item ID
 */
export async function processDocumentOperationsAfterSave(itemId: number): Promise<void> {
  const documentsStore = useDocumentsStore.getState();

  if (!documentsStore.hasPendingOperations()) {
    return;
  }

  SPContext.logger.info('Processing pending document operations', { itemId });

  try {
    // 1. Upload staged files using documentsStore (with progress tracking)
    if (documentsStore.stagedFiles.length > 0) {
      await documentsStore.uploadPendingFiles(
        itemId,
        (fileId, progress, status) => {
          SPContext.logger.info('Upload progress', { fileId, progress, status });
        }
      );
    }

    // 2. Process deletes and renames
    const filesToDelete = documentsStore.filesToDelete;
    const filesToRename = documentsStore.filesToRename.map(rename => ({
      file: rename.file,
      newName: rename.newName,
    }));

    if (filesToDelete.length > 0 || filesToRename.length > 0) {
      const docResults = await processPendingDocuments(
        itemId,
        [], // Empty array - uploads already handled
        filesToDelete,
        filesToRename
      );

      SPContext.logger.success('Document operations completed', docResults);
    }

    // 3. Process document type changes (Review <-> Supplemental)
    if (documentsStore.filesToChangeType.length > 0) {
      await documentsStore.changeTypePendingFiles(itemId);
    }

    // Clear pending operations after successful processing
    documentsStore.clearPendingOperations();

    // Reload documents from SharePoint to display uploaded files
    await documentsStore.loadAllDocuments(itemId, true);
    SPContext.logger.info('Documents reloaded after upload', { itemId });
  } catch (docError) {
    // Log error but don't fail the entire save
    SPContext.logger.error('Document processing failed (request was saved)', docError, { itemId });
    // Note: We don't throw here because the request was successfully saved
  }
}

/**
 * Format admin override audit entry
 * Creates a timestamped, formatted entry for the AdminOverrideNotes field
 */
export function formatAdminAuditEntry(
  action: string,
  details: string,
  reason: string,
  existingNotes?: string
): string {
  const timestamp = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const adminEmail = SPContext.currentUser?.email || 'Unknown';

  const newEntry = `[${timestamp}] ${action} by ${adminEmail}\n${details}\nReason: ${reason}`;

  // Prepend new entry to existing notes (most recent first)
  if (existingNotes) {
    return `${newEntry}\n\n---\n\n${existingNotes}`;
  }
  return newEntry;
}

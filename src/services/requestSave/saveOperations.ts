/**
 * Save Operations
 *
 * Core save operations for requests.
 */

import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import { Lists } from '@sp/Lists';
import { loadRequestById } from '../requestLoadService';
import { batchUploadFiles, deleteFile, renameFile } from '../documentService';

import type { ILegalRequest } from '@appTypes/requestTypes';
import { RequestStatus } from '@appTypes/workflowTypes';
import type { IStagedDocument, IDocument } from '@stores/documentsStore';

import { buildRequestUpdatePayload, buildPartialUpdatePayload } from './payloadBuilder';
import { generateRequestId } from './requestIdGenerator';

/**
 * Process pending document operations (uploads, deletes, renames)
 *
 * This function should be called after the request is successfully saved.
 * It processes all pending document operations from documentsStore.
 *
 * @param itemId - Request item ID
 * @param stagedFiles - Staged files to upload (from documentsStore)
 * @param filesToDelete - Files to delete (from documentsStore)
 * @param filesToRename - Files to rename (from documentsStore)
 * @returns Promise resolving to processing results
 */
export async function processPendingDocuments(
  itemId: number,
  stagedFiles: IStagedDocument[] = [],
  filesToDelete: IDocument[] = [],
  filesToRename: Array<{ file: IDocument; newName: string }> = []
): Promise<{
  uploadSuccess: number;
  uploadErrors: number;
  deleteSuccess: number;
  deleteErrors: number;
  renameSuccess: number;
  renameErrors: number;
}> {
  const results = {
    uploadSuccess: 0,
    uploadErrors: 0,
    deleteSuccess: 0,
    deleteErrors: 0,
    renameSuccess: 0,
    renameErrors: 0,
  };

  try {
    // 1. Upload staged files
    if (stagedFiles.length > 0) {
      SPContext.logger.info('Processing pending file uploads', {
        itemId,
        count: stagedFiles.length,
      });

      const filesForUpload = stagedFiles.map(staged => ({
        file: staged.file,
        documentType: staged.documentType,
      }));

      const uploadResult = await batchUploadFiles(
        filesForUpload,
        itemId,
        (fileId, progress, status) => {
          SPContext.logger.info('Upload progress', { fileId, progress, status });
        },
        (fileId, result) => {
          SPContext.logger.info('Upload complete', { fileId, success: result.success });
        }
      );

      results.uploadSuccess = uploadResult.successCount;
      results.uploadErrors = uploadResult.errorCount;
    }

    // 2. Delete files
    if (filesToDelete.length > 0) {
      SPContext.logger.info('Processing pending file deletions', {
        itemId,
        count: filesToDelete.length,
      });

      for (const file of filesToDelete) {
        try {
          await deleteFile(file);
          results.deleteSuccess++;
        } catch (error) {
          SPContext.logger.error('Failed to delete file', error, { fileName: file.name });
          results.deleteErrors++;
        }
      }
    }

    // 3. Rename files
    if (filesToRename.length > 0) {
      SPContext.logger.info('Processing pending file renames', {
        itemId,
        count: filesToRename.length,
      });

      for (const { file, newName } of filesToRename) {
        try {
          await renameFile(file, newName);
          results.renameSuccess++;
        } catch (error) {
          SPContext.logger.error('Failed to rename file', error, {
            oldName: file.name,
            newName,
          });
          results.renameErrors++;
        }
      }
    }

    SPContext.logger.success('Pending document operations completed', results);

    return results;
  } catch (error) {
    SPContext.logger.error('Failed to process pending documents', error, { itemId });
    throw error;
  }
}

/**
 * Generic save request (flexible, no validation)
 *
 * Updates any fields without business logic or permission management.
 * Use for: auto-save, admin edits, single field updates.
 *
 * Includes change detection - will skip save if no changes detected (when originalData provided).
 *
 * @param itemId - SharePoint list item ID
 * @param data - Request data to update (full or partial)
 * @param originalData - Optional original data for change detection
 * @returns Promise resolving to save result with updated request data
 */
export async function saveRequest(
  itemId: number,
  data: Partial<ILegalRequest>,
  originalData?: ILegalRequest
): Promise<{ saved: boolean; updatedRequest?: ILegalRequest }> {
  try {
    SPContext.logger.info('RequestSaveService: Saving request', { itemId });

    let payload: Record<string, any>;

    if (originalData) {
      // With originalData: use change detection (merge data with originalData)
      const mergedData = { ...originalData, ...data };
      payload = buildRequestUpdatePayload(mergedData as ILegalRequest, originalData);

      // Check if there are any updates to perform
      if (Object.keys(payload).length === 0) {
        SPContext.logger.info('RequestSaveService: No changes detected - skipping save', { itemId });
        return { saved: false };
      }
    } else {
      // Without originalData: build a direct partial update payload
      // This is used for stage-specific updates (Legal Intake, Reviews, etc.)
      // where we only have a few fields to update
      payload = buildPartialUpdatePayload(data);

      // Check if there's anything to save
      if (Object.keys(payload).length === 0) {
        SPContext.logger.info('RequestSaveService: No fields to update', { itemId });
        return { saved: false };
      }
    }

    SPContext.logger.info('RequestSaveService: Saving changes', {
      itemId,
      changedFields: Object.keys(payload),
      payload,
    });

    // Debug: Log priorSubmissions specifically
    if ('PriorSubmissionsId' in payload) {
      SPContext.logger.info('RequestSaveService: PriorSubmissions in payload', {
        priorSubmissionsId: payload.PriorSubmissionsId,
      });
    }

    // Update SharePoint item
    await SPContext.sp.web.lists
      .getByTitle(Lists.Requests.Title)
      .items.getById(itemId)
      .update(payload);

    SPContext.logger.success('RequestSaveService: Request saved successfully', { itemId });

    // Reload request data from SharePoint
    const updatedRequest = await loadRequestById(itemId);

    return { saved: true, updatedRequest };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    SPContext.logger.error('RequestSaveService: Failed to save request', error, { itemId });
    throw new Error(`Failed to save request ${itemId}: ${errorMessage}`);
  }
}

/**
 * Save as draft (create new or update existing)
 *
 * If itemId is provided, updates existing draft.
 * If itemId is undefined, creates new draft with auto-generated RequestID.
 *
 * Includes change detection for updates - will skip save if no changes.
 *
 * @param itemId - Existing item ID (undefined for new draft)
 * @param data - Request data (will be merged with status: Draft)
 * @param originalData - Optional original data for change detection (updates only)
 * @returns Promise resolving to object with itemId, saved flag, and updated request data
 */
export async function saveDraft(
  itemId: number | undefined,
  data: ILegalRequest,
  originalData?: ILegalRequest
): Promise<{ itemId: number; saved: boolean; updatedRequest?: ILegalRequest }> {
  try {
    SPContext.logger.info('RequestSaveService: Saving draft', { itemId, isNew: !itemId });

    if (itemId) {
      // Update existing draft - use saveRequest with change detection
      const mergedData = { ...data, status: RequestStatus.Draft };
      const mergedOriginal = originalData ? { ...originalData, status: RequestStatus.Draft } : undefined;

      const result = await saveRequest(itemId, mergedData as ILegalRequest, mergedOriginal as ILegalRequest);

      if (!result.saved) {
        SPContext.logger.info('RequestSaveService: Draft not saved - no changes detected', { itemId });
      }

      return { itemId, saved: result.saved, updatedRequest: result.updatedRequest };

    } else {
      // Create new draft - pass request type for proper prefix
      const requestId = await generateRequestId(data.requestType);

      // Build payload using buildRequestUpdatePayload (passing undefined for originalRequest)
      const draftData = {
        ...data,
        requestId,
        status: RequestStatus.Draft,
      } as ILegalRequest;

      const payload = buildRequestUpdatePayload(draftData);

      const result = await SPContext.sp.web.lists
        .getByTitle(Lists.Requests.Title)
        .items.add(payload);

      const newItemId = result.data.Id;

      SPContext.logger.success('RequestSaveService: Draft created', { itemId: newItemId, requestId });

      // Reload the created draft
      const updatedRequest = await loadRequestById(newItemId);

      return { itemId: newItemId, saved: true, updatedRequest };
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    SPContext.logger.error('RequestSaveService: Failed to save draft', error, { itemId });
    throw new Error(`Failed to save draft: ${errorMessage}`);
  }
}

/**
 * Documents Store
 *
 * Centralized state management for ALL request documents
 * - Handles both approval documents and general attachments (Review/Supplemental)
 * - Manages pending operations (uploads, deletions, renames, type changes)
 * - Tracks upload progress and retry state
 * - Provides actions for file operations
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import type { FileOperationStatus } from '@services/approvalFileService';
import { DocumentType } from '@appTypes/documentTypes';
import {
  loadDocuments as loadDocumentsFromService,
  getRequestDocumentsLibraryId,
} from '@services/documentService';
import * as documentService from '@services/documentService';

import type {
  IDocumentsState,
  IDocument,
  IStagedDocument,
  IFileTypeChange,
  IUploadProgress,
  IFileUploadCompleteResult,
} from './types';
import {
  initialState,
  pendingLoadPromise,
  lastLoadedItemId,
  setPendingLoadPromise,
  setLastLoadedItemId,
  resetTrackingVariables,
} from './initialState';

/**
 * Documents store
 */
export const useDocumentsStore = create<IDocumentsState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      /**
       * Load ALL documents for an item (CAML query loads all recursively)
       *
       * Deduplication: If multiple components call loadDocuments for the same itemId
       * concurrently, only one API call is made and all callers await the same promise.
       */
      loadDocuments: async (itemId: number, forceReload?: boolean): Promise<void> => {
        // If we already have a pending load for this itemId, wait for it (unless force reload)
        if (pendingLoadPromise && lastLoadedItemId === itemId && !forceReload) {
          SPContext.logger.info('Documents load already in progress, waiting...', { itemId });
          return pendingLoadPromise;
        }

        // If documents are already loaded for this itemId and no force reload, skip
        const state = get();
        if (!forceReload && lastLoadedItemId === itemId && state.documents.size > 0 && !state.isLoading) {
          SPContext.logger.info('Documents already loaded, skipping reload', { itemId });
          return;
        }

        set({ isLoading: true, error: undefined });
        setLastLoadedItemId(itemId);

        // Create the load promise and track it
        const loadPromise = (async (): Promise<void> => {
          try {
            SPContext.logger.info('Loading all documents', { itemId });

            // Load library ID if not already loaded (ONE API call, cached)
            const currentState = get();
            let libraryId = currentState.libraryId;
            if (!libraryId) {
              SPContext.logger.info('Loading RequestDocuments library ID');
              libraryId = await getRequestDocumentsLibraryId();
              set({ libraryId });
              SPContext.logger.success('Library ID loaded', { libraryId });
            }

            // Load ALL documents recursively from RequestDocuments/{itemId}
            // The service now uses CAML query to load all files in one call
            const loadedDocs = await loadDocumentsFromService(itemId);

            // Group documents by type (ES5 compatible)
            const groupedDocs = new Map<DocumentType, IDocument[]>();
            for (let i = 0; i < loadedDocs.length; i++) {
              const doc = loadedDocs[i];
              const existing = groupedDocs.get(doc.documentType) || [];
              existing.push(doc);
              groupedDocs.set(doc.documentType, existing);
            }

            // Replace the documents Map with newly loaded docs
            set({
              documents: groupedDocs,
              isLoading: false,
            });

            SPContext.logger.success('All documents loaded successfully', {
              itemId,
              totalCount: loadedDocs.length,
              typeCount: groupedDocs.size,
            });
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load documents';
            SPContext.logger.error('Failed to load documents', error, { itemId });
            set({ error: errorMessage, isLoading: false });
          } finally {
            // Clear pending promise after completion
            setPendingLoadPromise(undefined);
          }
        })();

        setPendingLoadPromise(loadPromise);
        return loadPromise;
      },

      /**
       * Load all documents for an item (alias for loadDocuments)
       * Both functions now do the same thing since CAML query loads all documents
       */
      loadAllDocuments: async (itemId: number, forceReload?: boolean): Promise<void> => {
        return get().loadDocuments(itemId, forceReload);
      },

      /**
       * Stage files for upload
       */
      stageFiles: (files: File[], documentType: DocumentType, itemId?: number): void => {
        const newStaged: IStagedDocument[] = files.map((file, index) => ({
          id: `staged-${Date.now()}-${index}`,
          file,
          documentType,
          itemId,
          status: 'pending' as FileOperationStatus,
          progress: 0,
        }));

        set(state => ({
          stagedFiles: [...state.stagedFiles, ...newStaged],
        }));

        SPContext.logger.info('Files staged for upload', {
          count: files.length,
          documentType,
          itemId: itemId || 'new draft',
        });
      },

      /**
       * Remove staged file
       */
      removeStagedFile: (fileId: string): void => {
        set(state => ({
          stagedFiles: state.stagedFiles.filter(f => f.id !== fileId),
        }));

        SPContext.logger.info('Staged file removed', { fileId });
      },

      /**
       * Mark file for deletion
       */
      markForDeletion: (file: IDocument): void => {
        set(state => {
          // Check if already marked
          if (state.filesToDelete.some(f => f.uniqueId === file.uniqueId)) {
            return state;
          }

          return {
            filesToDelete: [...state.filesToDelete, file],
          };
        });

        SPContext.logger.info('File marked for deletion', { fileName: file.name });
      },

      /**
       * Undo file deletion
       */
      undoDelete: (file: IDocument): void => {
        set(state => ({
          filesToDelete: state.filesToDelete.filter(f => f.uniqueId !== file.uniqueId),
        }));

        SPContext.logger.info('File deletion undone', { fileName: file.name });
      },

      /**
       * Mark file for rename
       */
      markForRename: (file: IDocument, newName: string): void => {
        set(state => {
          // Remove existing rename for this file
          const filtered = state.filesToRename.filter(r => r.file.uniqueId !== file.uniqueId);

          return {
            filesToRename: [
              ...filtered,
              {
                file,
                newName,
                status: 'pending' as FileOperationStatus,
              },
            ],
          };
        });

        SPContext.logger.info('File marked for rename', {
          oldName: file.name,
          newName,
        });
      },

      /**
       * Cancel file rename
       */
      cancelRename: (fileId: string): void => {
        set(state => ({
          filesToRename: state.filesToRename.filter(r => r.file.uniqueId !== fileId),
        }));

        SPContext.logger.info('File rename canceled', { fileId });
      },

      /**
       * Mark files for type change (Review <-> Supplemental)
       */
      markForTypeChange: (files: IDocument[], newType: DocumentType): void => {
        set(state => {
          // Remove existing type changes for these files
          const fileIds = files.map(f => f.uniqueId);
          // ES5 compatible: Use indexOf instead of includes
          const filtered = state.filesToChangeType.filter(
            tc => fileIds.indexOf(tc.file.uniqueId) === -1
          );

          const newChanges: IFileTypeChange[] = files.map(file => ({
            file,
            newType,
            status: 'pending' as FileOperationStatus,
          }));

          return {
            filesToChangeType: [...filtered, ...newChanges],
          };
        });

        SPContext.logger.info('Files marked for type change', {
          count: files.length,
          newType,
        });
      },

      /**
       * Cancel type changes
       */
      cancelTypeChange: (fileIds: string[]): void => {
        // ES5 compatible: Use indexOf instead of includes
        set(state => ({
          filesToChangeType: state.filesToChangeType.filter(
            tc => fileIds.indexOf(tc.file.uniqueId) === -1
          ),
        }));

        SPContext.logger.info('Type changes canceled', { count: fileIds.length });
      },

      /**
       * Check for duplicate filenames
       */
      checkDuplicates: (files: File[], documentType: DocumentType): string[] => {
        const state = get();
        const existingDocs = state.documents.get(documentType) || [];
        const existingNames = existingDocs.map(d => d.name.toLowerCase());

        const duplicates = files
          .map(f => f.name)
          .filter(name => existingNames.indexOf(name.toLowerCase()) !== -1);

        return duplicates;
      },

      /**
       * Upload pending files
       */
      uploadPendingFiles: async (
        itemId: number,
        onProgress: (fileId: string, progress: number, status: FileOperationStatus) => void
      ): Promise<void> => {
        const state = get();

        if (state.stagedFiles.length === 0) {
          SPContext.logger.info('No files to upload');
          return;
        }

        // Set uploading state and clear previous upload progress
        set({
          isUploading: true,
          uploadProgress: new Map<string, IUploadProgress>(),
          error: undefined
        });

        try {
          SPContext.logger.info('Starting batch file upload', {
            count: state.stagedFiles.length,
            itemId,
          });

          // Import batchUploadFiles dynamically to avoid circular dependency
          const { batchUploadFiles } = await import(
            /* webpackChunkName: "document-service" */
            '../../services/documentService'
          );

          // Prepare files for upload
          const filesForUpload = state.stagedFiles.map(staged => ({
            file: staged.file,
            documentType: staged.documentType,
          }));

          // Upload with progress tracking
          await batchUploadFiles(
            filesForUpload,
            itemId,
            // onFileProgress callback
            (fileId: string, progress: number, status: FileOperationStatus) => {
              // Update upload progress Map
              set(currentState => {
                const newProgress = new Map<string, IUploadProgress>();
                currentState.uploadProgress.forEach((value, key) => {
                  newProgress.set(key, value);
                });

                // Find the staged file to get the filename (ES5 compatible)
                let stagedFile: typeof currentState.stagedFiles[0] | undefined;
                for (let i = 0; i < currentState.stagedFiles.length; i++) {
                  const sf = currentState.stagedFiles[i];
                  if (`upload-${sf.file.name}` === fileId || fileId.indexOf(sf.file.name) !== -1) {
                    stagedFile = sf;
                    break;
                  }
                }
                const fileName = stagedFile ? stagedFile.file.name : 'Unknown';

                newProgress.set(fileId, {
                  fileId,
                  fileName,
                  status,
                  progress,
                  error: undefined,
                  retryCount: currentState.retryCount.get(fileId) || 0,
                  maxRetries: 2, // Default max retries
                });

                return { uploadProgress: newProgress };
              });

              // Call external progress callback
              if (onProgress) {
                onProgress(fileId, progress, status);
              }
            },
            // onFileComplete callback
            (fileId: string, result: IFileUploadCompleteResult) => {
              SPContext.logger.info('File upload complete', {
                fileId,
                success: result.success,
                fileName: result.fileName
              });

              if (!result.success && result.error) {
                // Update progress with error
                set(currentState => {
                  const newProgress = new Map<string, IUploadProgress>();
                  currentState.uploadProgress.forEach((value, key) => {
                    newProgress.set(key, value);
                  });

                  const existing = newProgress.get(fileId);
                  if (existing) {
                    newProgress.set(fileId, {
                      ...existing,
                      status: 'error' as FileOperationStatus,
                      error: result.error,
                    });
                  }

                  return { uploadProgress: newProgress };
                });
              }
            }
          );

          // Clear staged files after successful upload
          set({
            stagedFiles: [],
            isUploading: false
          });

          SPContext.logger.success('Batch upload completed', { itemId });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Upload failed';
          SPContext.logger.error('Batch upload failed', error, { itemId });
          set({
            error: errorMessage,
            isUploading: false
          });
          throw error;
        }
      },

      /**
       * Retry failed upload
       * Note: The file must still be in stagedFiles to retry
       */
      retryUpload: async (fileId: string): Promise<void> => {
        SPContext.logger.info('Retrying file upload', { fileId });

        const state = get();

        // Find the failed file in upload progress
        const failedProgress = state.uploadProgress.get(fileId);
        if (!failedProgress || failedProgress.status !== 'error') {
          SPContext.logger.warn('Cannot retry: file not found or not in error state', { fileId });
          return;
        }

        // Check max retries
        if (failedProgress.retryCount >= failedProgress.maxRetries) {
          SPContext.logger.warn('Cannot retry: max retries exceeded', {
            fileId,
            retryCount: failedProgress.retryCount,
            maxRetries: failedProgress.maxRetries,
          });
          return;
        }

        // Find the staged file by matching the fileId or fileName
        let stagedFile: IStagedDocument | undefined;
        for (let i = 0; i < state.stagedFiles.length; i++) {
          const sf = state.stagedFiles[i];
          if (
            `upload-${sf.file.name}` === fileId ||
            fileId.indexOf(sf.file.name) !== -1 ||
            sf.file.name === failedProgress.fileName
          ) {
            stagedFile = sf;
            break;
          }
        }

        if (!stagedFile || !stagedFile.itemId) {
          SPContext.logger.warn('Cannot retry: staged file not found or missing itemId', {
            fileId,
            fileName: failedProgress.fileName,
          });
          return;
        }

        // Update progress to show retrying
        set(currentState => {
          const newProgress = new Map<string, IUploadProgress>();
          currentState.uploadProgress.forEach((value, key) => {
            newProgress.set(key, value);
          });

          newProgress.set(fileId, {
            ...failedProgress,
            status: 'uploading' as FileOperationStatus,
            progress: 0,
            error: undefined,
            retryCount: failedProgress.retryCount + 1,
          });

          // Update retry count
          const newRetryCount = new Map<string, number>();
          currentState.retryCount.forEach((value, key) => {
            newRetryCount.set(key, value);
          });
          newRetryCount.set(fileId, failedProgress.retryCount + 1);

          return {
            uploadProgress: newProgress,
            retryCount: newRetryCount,
          };
        });

        try {
          // Import batchUploadFiles dynamically
          const { batchUploadFiles } = await import(
            /* webpackChunkName: "document-service" */
            '../../services/documentService'
          );

          // Upload just this one file
          await batchUploadFiles(
            [{ file: stagedFile.file, documentType: stagedFile.documentType }],
            stagedFile.itemId,
            // onFileProgress callback
            (_progressFileId: string, progress: number, status: FileOperationStatus) => {
              set(currentState => {
                const newProgress = new Map<string, IUploadProgress>();
                currentState.uploadProgress.forEach((value, key) => {
                  newProgress.set(key, value);
                });

                const existing = newProgress.get(fileId);
                if (existing) {
                  newProgress.set(fileId, {
                    ...existing,
                    status,
                    progress,
                  });
                }

                return { uploadProgress: newProgress };
              });
            },
            // onFileComplete callback
            (_completeFileId: string, result: IFileUploadCompleteResult) => {
              set(currentState => {
                const newProgress = new Map<string, IUploadProgress>();
                currentState.uploadProgress.forEach((value, key) => {
                  newProgress.set(key, value);
                });

                const existing = newProgress.get(fileId);
                if (existing) {
                  newProgress.set(fileId, {
                    ...existing,
                    status: result.success ? 'success' as FileOperationStatus : 'error' as FileOperationStatus,
                    progress: result.success ? 100 : existing.progress,
                    error: result.error,
                  });
                }

                // If successful, remove from staged files
                let newStagedFiles = currentState.stagedFiles;
                if (result.success && stagedFile) {
                  newStagedFiles = currentState.stagedFiles.filter(
                    sf => sf.file.name !== stagedFile!.file.name
                  );
                }

                return {
                  uploadProgress: newProgress,
                  stagedFiles: newStagedFiles,
                };
              });

              if (result.success) {
                SPContext.logger.success('Retry upload succeeded', { fileId });
              } else {
                SPContext.logger.error('Retry upload failed', result.error, { fileId });
              }
            }
          );
        } catch (error) {
          SPContext.logger.error('Retry upload error', error, { fileId });

          // Update progress with error
          set(currentState => {
            const newProgress = new Map<string, IUploadProgress>();
            currentState.uploadProgress.forEach((value, key) => {
              newProgress.set(key, value);
            });

            const existing = newProgress.get(fileId);
            if (existing) {
              newProgress.set(fileId, {
                ...existing,
                status: 'error' as FileOperationStatus,
                error: error instanceof Error ? error.message : String(error),
              });
            }

            return { uploadProgress: newProgress };
          });
        }
      },

      /**
       * Skip failed upload
       */
      skipUpload: (fileId: string): void => {
        const state = get();

        // ES5 compatible: Manual Map cloning
        const progress = new Map<string, IUploadProgress>();
        state.uploadProgress.forEach((value, key) => {
          progress.set(key, value);
        });

        const current = progress.get(fileId);

        if (current) {
          progress.set(fileId, {
            ...current,
            status: 'skipped' as FileOperationStatus,
          });

          set({ uploadProgress: progress });
        }

        SPContext.logger.info('File upload skipped', { fileId });
      },

      /**
       * Delete pending files
       */
      deletePendingFiles: async (): Promise<void> => {
        const state = get();

        if (state.filesToDelete.length === 0) {
          return;
        }

        try {
          SPContext.logger.info('Deleting files', { count: state.filesToDelete.length });

          // Track affected item IDs for reload
          const itemIds = new Set<number>();

          // Delete each file
          for (let i = 0; i < state.filesToDelete.length; i++) {
            const fileToDelete = state.filesToDelete[i];
            if (fileToDelete.listItemId) {
              itemIds.add(fileToDelete.listItemId);
            }

            try {
              await documentService.deleteFile(fileToDelete);
              SPContext.logger.success('File deleted', { fileName: fileToDelete.name });
            } catch (deleteError) {
              SPContext.logger.error('Failed to delete file', deleteError, {
                fileName: fileToDelete.name,
              });
              // Continue with other deletions even if one fails
            }
          }

          set({ filesToDelete: [] });

          // Reload documents for affected items
          const reloadPromises: Array<Promise<void>> = [];
          itemIds.forEach((itemId) => {
            reloadPromises.push(get().loadDocuments(itemId, true));
          });

          if (reloadPromises.length > 0) {
            await Promise.all(reloadPromises);
          }

          SPContext.logger.success('Files deleted successfully');
        } catch (error: unknown) {
          SPContext.logger.error('File deletion failed', error);
          throw error;
        }
      },

      /**
       * Rename pending files
       */
      renamePendingFiles: async (): Promise<void> => {
        const state = get();

        if (state.filesToRename.length === 0) {
          return;
        }

        try {
          SPContext.logger.info('Renaming files', { count: state.filesToRename.length });

          // Capture itemIds BEFORE processing
          const itemIds = new Set<number>();

          for (let i = 0; i < state.filesToRename.length; i++) {
            const renameInfo = state.filesToRename[i];
            // Extract itemId from file URL or metadata
            if (renameInfo.file.listItemId) {
              itemIds.add(renameInfo.file.listItemId);
            }
          }

          // Rename each file
          const renamePromises: Array<Promise<void>> = [];

          for (let i = 0; i < state.filesToRename.length; i++) {
            const renameInfo = state.filesToRename[i];

            SPContext.logger.info('Renaming file', {
              oldName: renameInfo.file.name,
              newName: renameInfo.newName,
              documentType: renameInfo.file.documentType,
            });

            // Call documentService.renameFile
            renamePromises.push(
              documentService.renameFile(renameInfo.file, renameInfo.newName)
            );
          }

          // Wait for all renames to complete
          await Promise.all(renamePromises);

          SPContext.logger.success('All files renamed successfully');

          // Clear pending renames
          set({ filesToRename: [] });

          // Wait for SharePoint to update its index and clear cache
          SPContext.logger.info('Waiting for SharePoint to update index...');
          await new Promise(resolve => setTimeout(resolve, 1500));

          // Reload documents for each affected itemId
          const reloadPromises: Array<Promise<void>> = [];
          itemIds.forEach((itemId) => {
            SPContext.logger.info('Reloading documents', { itemId });
            reloadPromises.push(get().loadDocuments(itemId, true));
          });

          if (reloadPromises.length > 0) {
            await Promise.all(reloadPromises);
            SPContext.logger.success('Documents reloaded after rename');
          }
        } catch (error: unknown) {
          SPContext.logger.error('File rename failed', error);
          throw error;
        }
      },

      /**
       * Change document types for pending files
       */
      changeTypePendingFiles: async (itemId: number): Promise<void> => {
        const state = get();

        if (state.filesToChangeType.length === 0) {
          return;
        }

        try {
          SPContext.logger.info('Changing document types', {
            count: state.filesToChangeType.length,
            itemId,
          });

          // Group files by their new type
          const filesByNewType = new Map<DocumentType, IDocument[]>();

          for (let i = 0; i < state.filesToChangeType.length; i++) {
            const change = state.filesToChangeType[i];
            const existing = filesByNewType.get(change.newType) || [];
            existing.push(change.file);
            filesByNewType.set(change.newType, existing);
          }

          // Process each group of files by new type
          const changePromises: Array<Promise<void>> = [];
          filesByNewType.forEach((files, newType) => {
            changePromises.push(
              documentService.changeDocumentType(files, newType, itemId)
            );
          });

          await Promise.all(changePromises);

          set({ filesToChangeType: [] });

          // Reload documents for the item
          await get().loadDocuments(itemId, true);

          SPContext.logger.success('Document types changed successfully');
        } catch (error: unknown) {
          SPContext.logger.error('Type change failed', error);
          throw error;
        }
      },

      /**
       * Get documents by type
       */
      getDocuments: (documentType: DocumentType): IDocument[] => {
        const state = get();
        return state.documents.get(documentType) || [];
      },

      /**
       * Get staged files (optionally filtered by type)
       */
      getStagedFiles: (documentType?: DocumentType): IStagedDocument[] => {
        const state = get();

        if (!documentType) {
          return state.stagedFiles;
        }

        return state.stagedFiles.filter(f => f.documentType === documentType);
      },

      /**
       * Get pending operation counts for a document type
       */
      getPendingCounts: (documentType: DocumentType): { newCount: number; modifiedCount: number; deletedCount: number } => {
        const state = get();

        const newCount = state.stagedFiles.filter(f => f.documentType === documentType).length;

        const existingDocs = state.documents.get(documentType) || [];
        const existingIds = existingDocs.map(d => d.uniqueId);

        const modifiedCount = state.filesToRename.filter(
          r => existingIds.indexOf(r.file.uniqueId) !== -1
        ).length + state.filesToChangeType.filter(
          tc => existingIds.indexOf(tc.file.uniqueId) !== -1
        ).length;

        const deletedCount = state.filesToDelete.filter(
          f => f.documentType === documentType
        ).length;

        return {
          newCount,
          modifiedCount,
          deletedCount,
        };
      },

      /**
       * Check if there are any pending operations
       */
      hasPendingOperations: (): boolean => {
        const state = get();

        return (
          state.stagedFiles.length > 0 ||
          state.filesToDelete.length > 0 ||
          state.filesToRename.length > 0 ||
          state.filesToChangeType.length > 0
        );
      },

      /**
       * Clear all pending operations
       */
      clearPendingOperations: (): void => {
        set({
          stagedFiles: [],
          filesToDelete: [],
          filesToRename: [],
          filesToChangeType: [],
          uploadProgress: new Map(),
          retryCount: new Map(),
        });

        SPContext.logger.info('Pending operations cleared');
      },

      /**
       * Clear error state
       */
      clearError: (): void => {
        set({ error: undefined });
      },

      /**
       * Reset store to initial state
       */
      reset: (): void => {
        set(initialState);
        // Reset tracking variables
        resetTrackingVariables();
        SPContext.logger.info('Documents store reset');
      },
    }),
    { name: 'DocumentsStore' }
  )
);

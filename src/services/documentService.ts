/**
 * Document Service
 *
 * Handles all SharePoint document operations for the unified DocumentUpload component
 * - Uploads files to RequestDocuments/{ItemID}/ (attachments) or RequestDocuments/{ItemID}/{ApprovalType}/ (approvals)
 * - Loads existing documents with full metadata
 * - Renames, deletes, and moves files (for type changes)
 * - Handles duplicate detection and conflict resolution
 */

import { SPContext } from 'spfx-toolkit';
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists';

import { Lists } from '@sp/Lists';

import type { IDocument } from '../stores/documentsStore';
import type {
  IUploadResult,
  IBatchOperationResult,
  FileOperationStatus,
} from './approvalFileService';
import { ConflictResolution } from './approvalFileService';
import { DocumentType } from '../types/documentTypes';

/**
 * Document library configuration
 */
const DEFAULT_LIBRARY_TITLE = Lists.RequestDocuments.Title;

/**
 * Get folder path for document
 * - Attachments (Review/Supplemental): RequestDocuments/{itemId}/
 * - Approvals: RequestDocuments/{itemId}/{ApprovalType}/
 */
export function getDocumentFolderPath(itemId: number, documentType: DocumentType): string {
  // Attachments go to root level
  if (documentType === DocumentType.Review || documentType === DocumentType.Supplemental) {
    return `${itemId}`;
  }

  // Approvals go to subfolders
  const approvalFolder = getApprovalFolderName(documentType);
  return `${itemId}/${approvalFolder}`;
}

/**
 * Get approval folder name from DocumentType
 */
function getApprovalFolderName(documentType: DocumentType): string {
  switch (documentType) {
    case DocumentType.CommunicationApproval:
      return 'CommunicationApproval';
    case DocumentType.PortfolioManagerApproval:
      return 'PortfolioManagerApproval';
    case DocumentType.ResearchAnalystApproval:
      return 'ResearchAnalystApproval';
    case DocumentType.SubjectMatterExpertApproval:
      return 'SubjectMatterExpertApproval';
    case DocumentType.PerformanceApproval:
      return 'PerformanceApproval';
    case DocumentType.OtherApproval:
      return 'OtherApproval';
    default:
      return 'Unknown';
  }
}

/**
 * Ensure folder exists in document library
 */
async function ensureFolderExists(libraryTitle: string, folderPath: string): Promise<void> {
  const sp = SPContext.sp;

  try {
    SPContext.logger.info('Ensuring folder exists', { libraryTitle, folderPath });

    // Get library root folder
    const listRootFolder = await sp.web.lists.getByTitle(libraryTitle).rootFolder();
    const libraryServerRelativeUrl = listRootFolder.ServerRelativeUrl;

    // Split path into parts
    const pathParts = folderPath
      .replace(/\\/g, '/')
      .split('/')
      .filter(p => p.length > 0);

    // Create each folder in the path
    let currentFolderUrl = libraryServerRelativeUrl;
    for (const part of pathParts) {
      currentFolderUrl = `${currentFolderUrl}/${part}`;

      try {
        await sp.web.folders.addUsingPath(currentFolderUrl);
        SPContext.logger.info('Folder created/verified', { folder: part, url: currentFolderUrl });
      } catch (folderError) {
        const errorMessage = folderError instanceof Error ? folderError.message : String(folderError);

        // Ignore "already exists" errors
        if (errorMessage.indexOf('already exists') === -1 && errorMessage.indexOf('409') === -1) {
          SPContext.logger.error('Folder creation failed', folderError, { folder: part });
          throw folderError;
        }
      }
    }

    // Verify final folder exists
    const finalFolderUrl = `${libraryServerRelativeUrl}/${folderPath}`;
    await sp.web.getFolderByServerRelativePath(finalFolderUrl).select('Name', 'Exists')();

    SPContext.logger.success('Folder structure ensured', { libraryTitle, folderPath });
  } catch (error) {
    SPContext.logger.error('Failed to ensure folder exists', error, { libraryTitle, folderPath });
    throw new Error(`Failed to create folder '${folderPath}': ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Check for duplicate filenames in target folder
 */
export async function checkDuplicateFiles(
  files: File[],
  itemId: number,
  documentType: DocumentType,
  libraryTitle: string = DEFAULT_LIBRARY_TITLE
): Promise<string[]> {
  try {
    const sp = SPContext.sp;
    const folderPath = getDocumentFolderPath(itemId, documentType);

    // Get library root
    const library = sp.web.lists.getByTitle(libraryTitle);
    const libraryUrl = await library.rootFolder.select('ServerRelativeUrl')();
    const libraryServerRelativeUrl = libraryUrl.ServerRelativeUrl;

    // Get files in target folder
    const folderServerRelativePath = `${libraryServerRelativeUrl}/${folderPath}`;

    try {
      const folder = sp.web.getFolderByServerRelativePath(folderServerRelativePath);
      const existingFiles = await folder.files.select('Name')();

      const existingNames = new Set(existingFiles.map(f => f.Name.toLowerCase()));
      const duplicates = files
        .map(f => f.name)
        .filter(name => existingNames.has(name.toLowerCase()));

      return duplicates;
    } catch (folderError) {
      // Folder doesn't exist yet, no duplicates possible
      return [];
    }
  } catch (error) {
    SPContext.logger.error('Duplicate check failed', error, { itemId, documentType });
    // On error, return no duplicates to allow upload attempt
    return [];
  }
}

/**
 * Upload single file with progress callback
 */
export async function uploadFile(
  libraryTitle: string,
  folderPath: string,
  file: File,
  onProgress?: (progress: number) => void,
  conflictResolution: ConflictResolution = ConflictResolution.Skip
): Promise<IUploadResult> {
  try {
    SPContext.logger.info('Uploading file', {
      libraryTitle,
      folderPath,
      fileName: file.name,
      size: file.size,
    });

    const sp = SPContext.sp;

    // Ensure folder exists
    await ensureFolderExists(libraryTitle, folderPath);

    // Get library root
    const library = sp.web.lists.getByTitle(libraryTitle);
    const libraryUrl = await library.rootFolder.select('ServerRelativeUrl')();
    const libraryServerRelativeUrl = libraryUrl.ServerRelativeUrl;

    // Build folder URL
    const folderServerRelativePath = `${libraryServerRelativeUrl}/${folderPath}`;
    const folder = sp.web.getFolderByServerRelativePath(folderServerRelativePath);

    // Upload file
    const shouldOverwrite = conflictResolution === ConflictResolution.Overwrite;

    const uploadResult = await folder.files.addUsingPath(
      file.name,
      file,
      { Overwrite: shouldOverwrite }
    );

    // Call progress callback
    if (onProgress) {
      onProgress(100);
    }

    SPContext.logger.success('File uploaded successfully', {
      fileName: file.name,
      url: uploadResult.data.ServerRelativeUrl,
    });

    return {
      success: true,
      fileName: file.name,
      serverRelativeUrl: uploadResult.data.ServerRelativeUrl,
      uniqueId: uploadResult.data.UniqueId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    SPContext.logger.error('File upload failed', error, {
      fileName: file.name,
      libraryTitle,
      folderPath,
    });

    return {
      success: false,
      fileName: file.name,
      error: errorMessage,
    };
  }
}

/**
 * Batch upload files with progress tracking and retry support
 */
export async function batchUploadFiles(
  files: Array<{ file: File; documentType: DocumentType }>,
  itemId: number,
  onFileProgress: (fileId: string, progress: number, status: FileOperationStatus) => void,
  onFileComplete: (fileId: string, result: IUploadResult) => void,
  libraryTitle: string = DEFAULT_LIBRARY_TITLE,
  maxRetries: number = 2
): Promise<IBatchOperationResult> {
  const result: IBatchOperationResult = {
    totalFiles: files.length,
    successCount: 0,
    errorCount: 0,
    skippedCount: 0,
    uploadedFiles: [],
    errors: [],
  };

  for (const { file, documentType } of files) {
    const fileId = `upload-${Date.now()}-${file.name}`;
    const folderPath = getDocumentFolderPath(itemId, documentType);

    let retryCount = 0;
    let uploadResult: IUploadResult | null = null;

    // Retry loop
    while (retryCount <= maxRetries) {
      try {
        onFileProgress(fileId, 0, 'uploading' as FileOperationStatus);

        uploadResult = await uploadFile(
          libraryTitle,
          folderPath,
          file,
          (progress) => onFileProgress(fileId, progress, 'uploading' as FileOperationStatus),
          ConflictResolution.Overwrite
        );

        if (uploadResult.success) {
          result.successCount++;
          result.uploadedFiles.push(uploadResult);
          onFileProgress(fileId, 100, 'success' as FileOperationStatus);
          onFileComplete(fileId, uploadResult);
          break; // Success, exit retry loop
        } else {
          // Upload returned error
          retryCount++;
          if (retryCount <= maxRetries) {
            onFileProgress(fileId, 0, 'uploading' as FileOperationStatus);
          } else {
            result.errorCount++;
            result.errors.push({
              fileName: file.name,
              error: uploadResult.error || 'Unknown error',
            });
            onFileProgress(fileId, 0, 'error' as FileOperationStatus);
            onFileComplete(fileId, uploadResult);
          }
        }
      } catch (error) {
        retryCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (retryCount <= maxRetries) {
          SPContext.logger.warn(`Upload failed, retry ${retryCount}/${maxRetries}`, {
            fileName: file.name,
            error: errorMessage,
          });
          onFileProgress(fileId, 0, 'uploading' as FileOperationStatus);
        } else {
          result.errorCount++;
          result.errors.push({ fileName: file.name, error: errorMessage });
          onFileProgress(fileId, 0, 'error' as FileOperationStatus);
          onFileComplete(fileId, {
            success: false,
            fileName: file.name,
            error: errorMessage,
          });
        }
      }
    }
  }

  SPContext.logger.info('Batch upload completed', {
    total: result.totalFiles,
    success: result.successCount,
    errors: result.errorCount,
  });

  return result;
}

/**
 * Load documents for specific type or all attachments
 */
export async function loadDocuments(
  itemId: number,
  documentType?: DocumentType,
  libraryTitle: string = DEFAULT_LIBRARY_TITLE
): Promise<IDocument[]> {
  try {
    const sp = SPContext.sp;
    const library = sp.web.lists.getByTitle(libraryTitle);

    // Get library root
    const libraryUrl = await library.rootFolder.select('ServerRelativeUrl')();
    const libraryServerRelativeUrl = libraryUrl.ServerRelativeUrl;

    let folderPath: string;

    if (documentType) {
      // Load specific type
      folderPath = getDocumentFolderPath(itemId, documentType);
    } else {
      // Load all attachments (Review + Supplemental at root level)
      folderPath = `${itemId}`;
    }

    const folderServerRelativePath = `${libraryServerRelativeUrl}/${folderPath}`;

    try {
      const folder = sp.web.getFolderByServerRelativePath(folderServerRelativePath);
      const files = await folder.files
        .select(
          'Name',
          'ServerRelativeUrl',
          'Length',
          'TimeCreated',
          'TimeLastModified',
          'UniqueId',
          'ListItemAllFields/Id',
          'ListItemAllFields/DocumentType',
          'ListItemAllFields/Author/Title',
          'ListItemAllFields/Author/EMail',
          'ListItemAllFields/Editor/Title',
          'ListItemAllFields/Editor/EMail'
        )
        .expand('ListItemAllFields/Author', 'ListItemAllFields/Editor')();

      const documents: IDocument[] = files.map((file: any) => ({
        name: file.Name,
        url: `${SPContext.webAbsoluteUrl}${file.ServerRelativeUrl}`,
        size: file.Length,
        timeCreated: file.TimeCreated,
        timeLastModified: file.TimeLastModified || file.TimeCreated,
        uniqueId: file.UniqueId,
        createdBy: file.ListItemAllFields?.Author?.Title || 'Unknown',
        createdByEmail: file.ListItemAllFields?.Author?.EMail,
        modifiedBy: file.ListItemAllFields?.Editor?.Title || 'Unknown',
        modifiedByEmail: file.ListItemAllFields?.Editor?.EMail,
        listItemId: file.ListItemAllFields?.Id,
        documentType: (file.ListItemAllFields?.DocumentType as DocumentType) || documentType || DocumentType.Review,
      }));

      SPContext.logger.success('Documents loaded', {
        count: documents.length,
        itemId,
        documentType,
      });

      return documents;
    } catch (folderError) {
      // Folder doesn't exist, return empty array
      SPContext.logger.info('Folder not found (no documents)', { itemId, documentType });
      return [];
    }
  } catch (error) {
    SPContext.logger.error('Failed to load documents', error, { itemId, documentType });
    throw error;
  }
}

/**
 * Delete file from SharePoint
 */
export async function deleteFile(file: IDocument): Promise<void> {
  try {
    SPContext.logger.info('Deleting file', { fileName: file.name, url: file.url });

    const sp = SPContext.sp;

    // Extract server-relative path from URL
    const serverRelativeUrl = file.url.replace(SPContext.webAbsoluteUrl, '');

    await sp.web.getFileByServerRelativePath(serverRelativeUrl).delete();

    SPContext.logger.success('File deleted', { fileName: file.name });
  } catch (error) {
    SPContext.logger.error('File deletion failed', error, { fileName: file.name });
    throw error;
  }
}

/**
 * Rename file in SharePoint
 */
export async function renameFile(file: IDocument, newName: string): Promise<void> {
  try {
    SPContext.logger.info('Renaming file', {
      oldName: file.name,
      newName,
      url: file.url,
    });

    const sp = SPContext.sp;

    // Extract server-relative path
    const serverRelativeUrl = file.url.replace(SPContext.webAbsoluteUrl, '');

    // Use moveTo to rename in same folder
    const folder = serverRelativeUrl.substring(0, serverRelativeUrl.lastIndexOf('/'));
    const newServerRelativePath = `${folder}/${newName}`;

    await (sp.web.getFileByServerRelativePath(serverRelativeUrl) as any).moveTo(newServerRelativePath, true);

    SPContext.logger.success('File renamed', { oldName: file.name, newName });
  } catch (error) {
    SPContext.logger.error('File rename failed', error, { oldName: file.name, newName });
    throw error;
  }
}

/**
 * Change document type (move file between Review/Supplemental)
 * This only applies to attachments at root level
 */
export async function changeDocumentType(
  files: IDocument[],
  newType: DocumentType,
  itemId: number,
  libraryTitle: string = DEFAULT_LIBRARY_TITLE
): Promise<void> {
  try {
    SPContext.logger.info('Changing document types', {
      count: files.length,
      newType,
      itemId,
    });

    const sp = SPContext.sp;
    const library = sp.web.lists.getByTitle(libraryTitle);

    for (const file of files) {
      if (!file.listItemId) {
        SPContext.logger.warn('Skipping file without listItemId', { fileName: file.name });
        continue;
      }

      // Update DocumentType field in list item
      await library.items.getById(file.listItemId).update({
        DocumentType: newType,
      });

      SPContext.logger.success('Document type changed', {
        fileName: file.name,
        newType,
      });
    }

    SPContext.logger.success('All document types changed', { count: files.length, newType });
  } catch (error) {
    SPContext.logger.error('Document type change failed', error, { newType });
    throw error;
  }
}

/**
 * Format relative time with full datetime for tooltip
 */
export function formatRelativeTime(date: Date | string): { text: string; tooltip: string } {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  let text: string;

  if (diffSec < 60) {
    text = 'Just now';
  } else if (diffMin < 60) {
    text = `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
  } else if (diffHour < 24) {
    text = `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
  } else if (diffDay < 7) {
    text = `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
  } else {
    text = dateObj.toLocaleDateString();
  }

  const tooltip = dateObj.toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return { text, tooltip };
}

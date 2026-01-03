/**
 * Approval File Service
 *
 * Handles batch file operations for approval documents
 * - Uploads files to SharePoint in folder structure: RequestDocuments/{RequestID}/{ApprovalType}/
 * - Deletes files from SharePoint
 * - Loads existing files when editing requests
 * - Handles file conflicts (overwrite, rename, skip)
 */

import { SPContext } from 'spfx-toolkit/lib/utilities/context';

import { Lists } from '@sp/Lists';

import type { IExistingFile } from '@stores/documentsStore';
import { ApprovalType } from '@appTypes/approvalTypes';

/**
 * SharePoint file object from PnP query with expanded Author/Editor
 * Note: Length is string in PnP IFileInfo interface
 */
interface ISharePointFileItem {
  Name: string;
  ServerRelativeUrl: string;
  Length: string | number;
  TimeCreated: string;
  TimeLastModified?: string;
  UniqueId: string;
  UIVersionLabel?: string;
  Author?: {
    Title?: string;
    EMail?: string;
  };
  Editor?: {
    Title?: string;
    EMail?: string;
  };
  ListItemAllFields?: {
    Id?: number;
  };
}

/**
 * File operation status
 */
export enum FileOperationStatus {
  Pending = 'pending',
  Uploading = 'uploading',
  Success = 'success',
  Error = 'error',
  Skipped = 'skipped',
}

/**
 * File conflict resolution strategy
 */
export enum ConflictResolution {
  Overwrite = 'overwrite',
  Rename = 'rename',
  Skip = 'skip',
}

/**
 * Staged file for upload
 */
export interface IStagedFile {
  id: string; // Unique ID for tracking
  file: File;
  approvalType: ApprovalType;
  approvalIndex: number;
  status: FileOperationStatus;
  progress: number; // 0-100
  error?: string;
  conflictResolution?: ConflictResolution;
  uploadedFileUrl?: string;
  uploadedFileId?: string;
}

/**
 * File to delete
 */
export interface IFileToDelete {
  id: string;
  fileUrl: string;
  fileName: string;
  status: FileOperationStatus;
  error?: string;
}

/**
 * Upload result
 */
export interface IUploadResult {
  success: boolean;
  fileName: string;
  serverRelativeUrl?: string;
  uniqueId?: string;
  error?: string;
  conflict?: boolean;
}

/**
 * Batch operation result
 */
export interface IBatchOperationResult {
  totalFiles: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
  uploadedFiles: IUploadResult[];
  errors: Array<{ fileName: string; error: string }>;
}

/**
 * Get approval type folder name
 * Must match the folder names used by documentService.ts when uploading files
 */
function getApprovalTypeFolderName(approvalType: ApprovalType): string {
  switch (approvalType) {
    case ApprovalType.Communications:
      return 'CommunicationsApproval';
    case ApprovalType.PortfolioManager:
      return 'PortfolioManagerApproval';
    case ApprovalType.ResearchAnalyst:
      return 'ResearchAnalystApproval';
    case ApprovalType.SubjectMatterExpert:
      return 'SubjectMatterExpertApproval';
    case ApprovalType.Performance:
      return 'PerformanceApproval';
    case ApprovalType.Other:
      return 'OtherApproval';
    default:
      return 'Unknown';
  }
}

/**
 * Get folder path for approval documents
 */
export function getApprovalFolderPath(requestId: string, approvalType: ApprovalType): string {
  const approvalFolder = getApprovalTypeFolderName(approvalType);
  return `${requestId}/${approvalFolder}`;
}

/**
 * Ensure folder exists in document library
 * Uses sp.web.folders.addUsingPath() with full server-relative URLs to create nested folder structure
 */
async function ensureFolderExists(libraryTitle: string, folderPath: string): Promise<void> {
  const sp = SPContext.sp;

  try {
    // Get the server-relative URL of the library's root folder
    const listRootFolder = await sp.web.lists.getByTitle(libraryTitle).rootFolder();
    const libraryServerRelativeUrl = listRootFolder.ServerRelativeUrl;

    // Clean up the input path and split it into parts
    // This handles forward slashes, backslashes, and removes any empty parts
    const pathParts = folderPath
      .replace(/\\/g, '/')
      .split('/')
      .filter(p => p.length > 0);

    // Iterate over each part of the folder path and create it
    let currentFolderUrl = libraryServerRelativeUrl;
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      currentFolderUrl = `${currentFolderUrl}/${part}`;

      try {
        // Use addUsingPath to create the folder with full server-relative URL
        // This method does not throw an error if the folder already exists
        await sp.web.folders.addUsingPath(currentFolderUrl);
      } catch (folderError) {
        const errorMessage = folderError instanceof Error ? folderError.message : String(folderError);

        // Check if it's a "folder already exists" error (which is OK)
        if (errorMessage.indexOf('already exists') !== -1 || errorMessage.indexOf('409') !== -1) {
          SPContext.logger.info('Folder segment already exists (expected)', {
            segment: part,
            url: currentFolderUrl,
          });
        } else {
          // This is a real error
          SPContext.logger.error('Failed to create folder segment', folderError, {
            segment: part,
            url: currentFolderUrl,
            errorMessage,
          });
          throw folderError;
        }
      }
    }

    // Final verification - check that the complete folder path exists
    const finalFolderUrl = `${libraryServerRelativeUrl}/${folderPath}`;

    SPContext.logger.info('Verifying complete folder structure', {
      finalUrl: finalFolderUrl,
    });

    try {
      const verification = await sp.web.getFolderByServerRelativePath(finalFolderUrl).select('Name', 'ServerRelativeUrl', 'Exists')();

      SPContext.logger.success('Complete folder structure verified', {
        name: verification.Name,
        serverRelativeUrl: verification.ServerRelativeUrl,
        exists: verification.Exists,
      });
    } catch (verifyError) {
      SPContext.logger.error('Folder verification failed after creation', verifyError, {
        finalUrl: finalFolderUrl,
      });
      throw new Error(`Folder structure verification failed: ${finalFolderUrl}`);
    }

    SPContext.logger.success('Folder structure ensured successfully', {
      libraryTitle,
      folderPath,
      finalUrl: finalFolderUrl,
    });
  } catch (error) {
    SPContext.logger.error('Failed to ensure folder exists', error, {
      libraryTitle,
      folderPath,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw new Error(
      `Failed to create folder structure '${folderPath}' in library '${libraryTitle}': ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Check if file exists in folder
 */
async function checkFileExists(
  libraryTitle: string,
  folderPath: string,
  fileName: string
): Promise<boolean> {
  try {
    const web = SPContext.sp.web;
    const library = web.lists.getByTitle(libraryTitle);

    // Get the server relative URL of the library
    const libraryUrl = await library.rootFolder.select('ServerRelativeUrl')();
    const libraryServerRelativeUrl = libraryUrl.ServerRelativeUrl;

    // Build full server-relative path to file
    const fileServerRelativePath = `${libraryServerRelativeUrl}/${folderPath}/${fileName}`;

    await web.getFileByServerRelativePath(fileServerRelativePath).select('Name')();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Generate unique file name
 */
function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now();
  const lastDotIndex = originalName.lastIndexOf('.');

  if (lastDotIndex === -1) {
    return `${originalName}_${timestamp}`;
  }

  const nameWithoutExt = originalName.substring(0, lastDotIndex);
  const extension = originalName.substring(lastDotIndex);
  return `${nameWithoutExt}_${timestamp}${extension}`;
}

/**
 * Upload a single file to SharePoint
 */
export async function uploadFile(
  libraryTitle: string,
  folderPath: string,
  file: File,
  conflictResolution: ConflictResolution = ConflictResolution.Overwrite,
  onProgress?: (progress: number) => void
): Promise<IUploadResult> {
  try {
    SPContext.logger.info('Starting file upload', {
      libraryTitle,
      folderPath,
      fileName: file.name,
      size: file.size,
      conflictResolution,
    });

    // Ensure folder exists (this now includes verification)
    SPContext.logger.info('Ensuring folder structure exists', {
      libraryTitle,
      folderPath,
    });

    try {
      await ensureFolderExists(libraryTitle, folderPath);
      SPContext.logger.success('Folder structure ensured', { folderPath });
    } catch (folderError) {
      SPContext.logger.error('Folder creation/verification failed', folderError, {
        libraryTitle,
        folderPath,
      });
      throw new Error(
        `Cannot upload file - folder creation failed: ${
          folderError instanceof Error ? folderError.message : String(folderError)
        }`
      );
    }

    // Check if file exists
    SPContext.logger.info('Checking if file exists', {
      folderPath,
      fileName: file.name,
    });

    const fileExists = await checkFileExists(libraryTitle, folderPath, file.name);
    let fileName = file.name;

    if (fileExists) {
      SPContext.logger.info('File already exists, applying conflict resolution', {
        fileName,
        conflictResolution,
      });

      if (conflictResolution === ConflictResolution.Skip) {
        SPContext.logger.info('File exists, skipping', { fileName });
        return {
          success: false,
          fileName: file.name,
          conflict: true,
          error: 'File already exists (skipped)',
        };
      } else if (conflictResolution === ConflictResolution.Rename) {
        fileName = generateUniqueFileName(file.name);
        SPContext.logger.info('File exists, renaming', {
          original: file.name,
          renamed: fileName,
        });
      }
      // Overwrite: continue with original name
    } else {
      SPContext.logger.info('File does not exist, proceeding with upload', {
        fileName,
      });
    }

    // Report initial progress
    if (onProgress) {
      onProgress(10);
    }

    // Upload file using server-relative path
    SPContext.logger.info('Preparing file upload', {
      fileName,
      folderPath,
    });

    const web = SPContext.sp.web;
    const library = web.lists.getByTitle(libraryTitle);

    // Get the server relative URL of the library
    const libraryUrl = await library.rootFolder.select('ServerRelativeUrl')();
    const libraryServerRelativeUrl = libraryUrl.ServerRelativeUrl;

    // Build full server-relative path to folder
    const folderServerRelativePath = `${libraryServerRelativeUrl}/${folderPath}`;

    SPContext.logger.info('Uploading file to folder', {
      folderServerRelativePath,
      fileName,
    });

    const result = await web
      .getFolderByServerRelativePath(folderServerRelativePath)
      .files.addUsingPath(fileName, file, {
        Overwrite: conflictResolution === ConflictResolution.Overwrite,
      });

    if (onProgress) {
      onProgress(100);
    }

    SPContext.logger.success('File uploaded successfully', {
      fileName,
      serverRelativeUrl: result.data.ServerRelativeUrl,
      uniqueId: result.data.UniqueId,
    });

    return {
      success: true,
      fileName,
      serverRelativeUrl: result.data.ServerRelativeUrl,
      uniqueId: result.data.UniqueId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    SPContext.logger.error('File upload failed', error, {
      fileName: file.name,
      folderPath,
      libraryTitle,
      errorMessage: message,
    });

    return {
      success: false,
      fileName: file.name,
      error: message,
    };
  }
}

/**
 * Delete a file from SharePoint
 */
export async function deleteFile(fileUrl: string): Promise<boolean> {
  try {
    SPContext.logger.info('Deleting file', { fileUrl });

    await SPContext.sp.web.getFileByServerRelativePath(fileUrl).delete();

    SPContext.logger.success('File deleted', { fileUrl });
    return true;
  } catch (error) {
    SPContext.logger.error('Failed to delete file', error, { fileUrl });
    return false;
  }
}

/**
 * Load existing approval files for a specific approval type
 */
export async function loadApprovalFiles(
  requestId: string,
  approvalType: ApprovalType,
  documentLibraryTitle: string = Lists.RequestDocuments.Title
): Promise<IExistingFile[]> {
  try {
    const folderPath = getApprovalFolderPath(requestId, approvalType);

    SPContext.logger.info('Loading approval files', {
      requestId,
      approvalType,
      folderPath,
    });

    const web = SPContext.sp.web;
    const library = web.lists.getByTitle(documentLibraryTitle);

    // Get the server relative URL of the library
    const libraryUrl = await library.rootFolder.select('ServerRelativeUrl')();
    const libraryServerRelativeUrl = libraryUrl.ServerRelativeUrl;

    // Build full server-relative path to folder
    const folderServerRelativePath = `${libraryServerRelativeUrl}/${folderPath}`;

    const files = await web
      .getFolderByServerRelativePath(folderServerRelativePath)
      .files.select(
        'Name',
        'ServerRelativeUrl',
        'Length',
        'TimeCreated',
        'TimeLastModified',
        'UniqueId',
        'UIVersionLabel',
        'Author/Title',
        'Author/EMail',
        'Editor/Title',
        'Editor/EMail',
        'ListItemAllFields/Id'
      )
      .expand('Author', 'Editor', 'ListItemAllFields')();

    // Build absolute URL from server-relative path
    // SPContext.webAbsoluteUrl format: "https://tenant.sharepoint.com/sites/sitename"
    // ServerRelativeUrl format: "/sites/sitename/RequestDocuments/1/file.pdf"
    const urlParts = SPContext.webAbsoluteUrl.split('/');
    const protocol = urlParts[0]; // "https:"
    const domain = urlParts[2]; // "tenant.sharepoint.com"
    const origin = `${protocol}//${domain}`;

    const existingFiles: IExistingFile[] = (files as ISharePointFileItem[]).map((file: ISharePointFileItem) => ({
      name: file.Name,
      url: `${origin}${file.ServerRelativeUrl}`, // Convert to absolute URL for DocumentLink preview
      size: typeof file.Length === 'string' ? parseInt(file.Length, 10) : file.Length,
      timeCreated: file.TimeCreated,
      timeLastModified: file.TimeLastModified,
      uniqueId: file.UniqueId,
      version: file.UIVersionLabel,
      createdBy: file.Author?.Title,
      createdByEmail: file.Author?.EMail,
      modifiedBy: file.Editor?.Title,
      modifiedByEmail: file.Editor?.EMail,
      listItemId: file.ListItemAllFields?.Id,
    }));

    SPContext.logger.success('Approval files loaded', {
      count: existingFiles.length,
    });

    return existingFiles;
  } catch (error) {
    // Folder doesn't exist or no files - return empty array
    SPContext.logger.info('No existing files found (folder may not exist)', {
      requestId,
      approvalType,
    });
    return [];
  }
}

/**
 * Load all approval files for all approval types in a request
 */
export async function loadAllApprovalFiles(
  requestId: string,
  approvalTypes: ApprovalType[],
  documentLibraryTitle: string = Lists.RequestDocuments.Title
): Promise<Map<ApprovalType, IExistingFile[]>> {
  const filesMap = new Map<ApprovalType, IExistingFile[]>();

  // Load files for each approval type in parallel
  const promises = approvalTypes.map(async approvalType => {
    const files = await loadApprovalFiles(requestId, approvalType, documentLibraryTitle);
    return { approvalType, files };
  });

  const results = await Promise.all(promises);

  // Build map
  for (const result of results) {
    filesMap.set(result.approvalType, result.files);
  }

  return filesMap;
}

/**
 * Batch upload files with progress tracking
 */
export async function batchUploadFiles(
  stagedFiles: IStagedFile[],
  requestId: string,
  documentLibraryTitle: string = Lists.RequestDocuments.Title,
  onFileProgress?: (fileId: string, progress: number) => void,
  onFileComplete?: (fileId: string, result: IUploadResult) => void
): Promise<IBatchOperationResult> {
  SPContext.logger.info('Starting batch upload', {
    requestId,
    fileCount: stagedFiles.length,
  });

  const uploadedFiles: IUploadResult[] = [];
  const errors: Array<{ fileName: string; error: string }> = [];
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  // Upload files sequentially to avoid throttling
  for (let i = 0; i < stagedFiles.length; i++) {
    const stagedFile = stagedFiles[i];

    // Skip if already marked as skipped
    if (stagedFile.status === FileOperationStatus.Skipped) {
      skippedCount++;
      continue;
    }

    const folderPath = getApprovalFolderPath(requestId, stagedFile.approvalType);
    const conflictResolution = stagedFile.conflictResolution || ConflictResolution.Overwrite;

    const result = await uploadFile(
      documentLibraryTitle,
      folderPath,
      stagedFile.file,
      conflictResolution,
      progress => {
        if (onFileProgress) {
          onFileProgress(stagedFile.id, progress);
        }
      }
    );

    uploadedFiles.push(result);

    if (result.success) {
      successCount++;
    } else if (result.conflict) {
      skippedCount++;
    } else {
      errorCount++;
      errors.push({
        fileName: stagedFile.file.name,
        error: result.error || 'Unknown error',
      });
    }

    if (onFileComplete) {
      onFileComplete(stagedFile.id, result);
    }
  }

  const batchResult: IBatchOperationResult = {
    totalFiles: stagedFiles.length,
    successCount,
    errorCount,
    skippedCount,
    uploadedFiles,
    errors,
  };

  SPContext.logger.info('Batch upload completed', batchResult);

  return batchResult;
}

/**
 * Batch delete files
 */
export async function batchDeleteFiles(
  filesToDelete: IFileToDelete[],
  onFileComplete?: (fileId: string, success: boolean) => void
): Promise<{ successCount: number; errorCount: number }> {
  SPContext.logger.info('Starting batch delete', {
    fileCount: filesToDelete.length,
  });

  let successCount = 0;
  let errorCount = 0;

  // Delete files sequentially
  for (let i = 0; i < filesToDelete.length; i++) {
    const fileToDelete = filesToDelete[i];
    const success = await deleteFile(fileToDelete.fileUrl);

    if (success) {
      successCount++;
    } else {
      errorCount++;
    }

    if (onFileComplete) {
      onFileComplete(fileToDelete.id, success);
    }
  }

  SPContext.logger.info('Batch delete completed', {
    successCount,
    errorCount,
  });

  return { successCount, errorCount };
}

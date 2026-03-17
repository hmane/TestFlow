/**
 * Document Service
 *
 * Handles all SharePoint document operations for the unified DocumentUpload component
 * - Uploads files to RequestDocuments/{ItemID}/ (attachments) or RequestDocuments/{ItemID}/{ApprovalType}/ (approvals)
 * - Loads existing documents with full metadata
 * - Renames, deletes, and moves files (for type changes)
 * - Handles duplicate detection and conflict resolution
 */

import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists';
import 'spfx-toolkit/lib/utilities/context/pnpImports/files';

import { Lists } from '@sp/Lists';

import type { IDocument } from '@stores/documentsStore';
import type {
  IUploadResult,
  IBatchOperationResult,
  FileOperationStatus,
} from '@services/approvalFileService';
import { ConflictResolution } from '@services/approvalFileService';
import { DocumentType } from '@appTypes/documentTypes';
import {
  isDocumentCheckoutEnabled,
  isAutoCheckoutOnReplaceEnabled,
  supportsReviewTracking,
  startReviewing,
} from '@services/documentCheckoutService';

/**
 * SharePoint document metadata update payload
 */
interface IDocumentUpdatePayload {
  DocumentType?: string;
  RequestId?: number;
}

/**
 * Raw row from renderListDataAsStream for documents
 * Contains the fields returned by SharePoint for file queries
 */
interface IRenderListDataRow {
  ID: string;
  FileLeafRef: string;
  FileRef: string;
  FileDirRef: string;
  File_x0020_Size?: string;
  Created: string;
  Modified?: string;
  UniqueId: string;
  DocumentType?: string;
  Author?: Array<{ title?: string; email?: string; sip?: string }>;
  Editor?: Array<{ title?: string; email?: string; sip?: string }>;
  CheckoutUser?: Array<{ title?: string; email?: string; sip?: string; id?: string }>;
  CheckedOutUserId?: string;
  CheckedOutDate?: string;
  CheckOutType?: string;
}

export function normalizeSharePointCheckOutType(value: unknown): number {
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (!normalized || normalized === '0' || normalized === 'none') {
      return 0;
    }

    const parsed = parseInt(normalized, 10);
    if (!isNaN(parsed)) {
      return parsed;
    }

    if (normalized.indexOf('online') !== -1) {
      return 1;
    }

    if (normalized.indexOf('offline') !== -1) {
      return 2;
    }
  }

  return 0;
}

export function shouldBlockMutationForCheckout(
  checkoutType: number,
  checkedOutByEmail?: string,
  checkedOutByTitle?: string
): boolean {
  if (checkoutType === 0) {
    return false;
  }

  const normalizedEmail = (checkedOutByEmail || '').trim();
  const normalizedTitle = (checkedOutByTitle || '').trim();

  return normalizedEmail !== '' || normalizedTitle !== '';
}

export function resolveEffectiveCheckoutType(
  checkoutType: number,
  checkedOutById?: string,
  checkedOutByName?: string,
  checkedOutByEmail?: string,
  checkedOutByLoginName?: string
): number {
  const hasOwner =
    !!(checkedOutById || '').trim() ||
    !!(checkedOutByName || '').trim() ||
    !!(checkedOutByEmail || '').trim() ||
    !!(checkedOutByLoginName || '').trim();

  if (hasOwner) {
    return checkoutType !== 0 ? checkoutType : 1;
  }

  return 0;
}

/**
 * Document library configuration
 */
const DEFAULT_LIBRARY_TITLE = Lists.RequestDocuments.Title;

function decodeServerRelativePath(path: string): string {
  let decoded = path;
  // SharePoint APIs expect a decoded path; decode at most twice to handle double-encoding.
  for (let i = 0; i < 2; i++) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) {
        break;
      }
      decoded = next;
    } catch (decodeError) {
      SPContext.logger.warn('Failed to decode server-relative URL, using current value', {
        serverRelativeUrl: decoded,
        error: decodeError instanceof Error ? decodeError.message : String(decodeError),
      });
      break;
    }
  }
  return decoded;
}

/**
 * Get folder path for document
 * - Attachments (Review/Supplemental): RequestDocuments/{itemId}/
 * - Foreside: RequestDocuments/{itemId}/ForesideDocuments/
 * - Approvals: RequestDocuments/{itemId}/{ApprovalType}/
 */
export function getDocumentFolderPath(itemId: number, documentType: DocumentType | string): string {
  const normalizedType = String(documentType);

  // Attachments go to root level
  if (normalizedType === DocumentType.Review || normalizedType === 'Review') {
    return `${itemId}`;
  }

  if (normalizedType === DocumentType.Supplemental || normalizedType === 'Supplemental') {
    return `${itemId}`;
  }

  // ReviewFinal documents go to their own subfolder
  if (normalizedType === DocumentType.ReviewFinal || normalizedType === 'Review Final') {
    return `${itemId}/ReviewFinal`;
  }

  // FINRA documents go to their own subfolder
  if (normalizedType === DocumentType.FINRA || normalizedType === 'FINRA') {
    return `${itemId}/FINRADocuments`;
  }

  // Approvals go to subfolders
  const approvalFolder = getApprovalFolderName(normalizedType);
  return `${itemId}/${approvalFolder}`;
}

/**
 * Get approval folder name from DocumentType
 * Also handles string values by normalizing them
 */
function getApprovalFolderName(documentType: DocumentType | string): string {
  // Normalize string to DocumentType enum value
  const normalizedType = String(documentType);

  // Use string comparison for more robust matching
  if (normalizedType === DocumentType.CommunicationApproval || normalizedType === 'Communication Approval') {
    return 'CommunicationsApproval';
  }
  if (normalizedType === DocumentType.PortfolioManagerApproval || normalizedType === 'Portfolio Manager Approval') {
    return 'PortfolioManagerApproval';
  }
  if (normalizedType === DocumentType.ResearchAnalystApproval || normalizedType === 'Research Analyst Approval') {
    return 'ResearchAnalystApproval';
  }
  if (normalizedType === DocumentType.SubjectMatterExpertApproval || normalizedType === 'Subject Matter Expert Approval') {
    return 'SubjectMatterExpertApproval';
  }
  if (normalizedType === DocumentType.PerformanceApproval || normalizedType === 'Performance Approval') {
    return 'PerformanceApproval';
  }
  if (normalizedType === DocumentType.OtherApproval || normalizedType === 'Other Approval') {
    return 'OtherApproval';
  }

  // If we get here, it's not an approval type - ERROR!
  SPContext.logger.error('CRITICAL: Non-approval document type passed to getApprovalFolderName', {
    documentType,
    normalizedType,
    allApprovalTypes: [
      DocumentType.CommunicationApproval,
      DocumentType.PortfolioManagerApproval,
      DocumentType.ResearchAnalystApproval,
      DocumentType.SubjectMatterExpertApproval,
      DocumentType.PerformanceApproval,
      DocumentType.OtherApproval,
    ],
  });

  throw new Error(`Invalid approval document type: ${normalizedType}. This should never happen!`);
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
 * @param skipFolderCreation - Set to true if folder was already created (used by batchUploadFiles)
 */
export async function uploadFile(
  libraryTitle: string,
  folderPath: string,
  file: File,
  onProgress?: (progress: number) => void,
  conflictResolution: ConflictResolution = ConflictResolution.Skip,
  documentType?: DocumentType,
  requestItemId?: number,
  skipFolderCreation: boolean = false,
  isReplacement: boolean = false
): Promise<IUploadResult> {
  try {
    SPContext.logger.info('Uploading file', {
      libraryTitle,
      folderPath,
      fileName: file.name,
      size: file.size,
      skipFolderCreation,
    });

    const sp = SPContext.sp;

    // Ensure folder exists (skip if already created by batch)
    if (!skipFolderCreation) {
      await ensureFolderExists(libraryTitle, folderPath);
    }

    // Get library root
    const library = sp.web.lists.getByTitle(libraryTitle);
    const libraryUrl = await library.rootFolder.select('ServerRelativeUrl')();
    const libraryServerRelativeUrl = libraryUrl.ServerRelativeUrl;

    // Build folder URL
    const folderServerRelativePath = `${libraryServerRelativeUrl}/${folderPath}`;
    const folder = sp.web.getFolderByServerRelativePath(folderServerRelativePath);

    // Upload file
    const shouldOverwrite = conflictResolution === ConflictResolution.Overwrite;

    // Block overwrite when the existing file is checked out by another user.
    // Only applies when AutoCheckoutOnReplace is enabled (sub-flag of EnableDocumentCheckout).
    if (shouldOverwrite && isAutoCheckoutOnReplaceEnabled() && supportsReviewTracking(file.name)) {
      try {
        const existingFiles = await folder.files.select('Name', 'CheckOutType', 'CheckedOutByUser/Title', 'CheckedOutByUser/EMail')
          .expand('CheckedOutByUser')();
        let matchingFile: any = undefined;
        for (let i = 0; i < existingFiles.length; i++) {
          if ((existingFiles[i] as any).Name.toLowerCase() === file.name.toLowerCase()) {
            matchingFile = existingFiles[i];
            break;
          }
        }
        const checkoutType = normalizeSharePointCheckOutType(matchingFile?.CheckOutType);
        if (matchingFile && checkoutType !== 0) {
          const currentUserEmail = (SPContext.currentUser?.email || '').toLowerCase();
          const checkedOutEmail = (matchingFile.CheckedOutByUser?.EMail || '').toLowerCase();
          const checkedOutTitle = (matchingFile.CheckedOutByUser?.Title || '').toLowerCase();

          if (!shouldBlockMutationForCheckout(checkoutType, checkedOutEmail, checkedOutTitle)) {
            SPContext.logger.warn('DocumentService: Non-attributed checkout detected before overwrite; allowing server to decide', {
              fileName: file.name,
              rawCheckOutType: matchingFile?.CheckOutType,
              normalizedCheckOutType: checkoutType,
            });
          } else {
          const isMe = checkedOutEmail !== '' && checkedOutEmail === currentUserEmail;
          if (!isMe) {
            const reviewerName = matchingFile.CheckedOutByUser?.Title || 'another user';
            return {
              success: false,
              fileName: file.name,
              error: `Cannot replace "${file.name}" — it is being reviewed by ${reviewerName}.`,
            };
          }
          }
        }
      } catch (checkError) {
        // Log but don't block — if we can't check, let SharePoint enforce
        SPContext.logger.warn('DocumentService: Could not verify checkout status before overwrite', {
          fileName: file.name,
          error: checkError instanceof Error ? checkError.message : String(checkError),
        });
      }
    }

    const uploadResult = await folder.files.addUsingPath(
      file.name,
      file,
      { Overwrite: shouldOverwrite }
    );

    // Set DocumentType and Request fields if provided
    if (documentType || requestItemId) {
      try {
        const listItem = await uploadResult.file.getItem();
        const updatePayload: IDocumentUpdatePayload = {};

        if (documentType) {
          updatePayload.DocumentType = documentType;
        }

        if (requestItemId) {
          // Set Request lookup field (points to Requests list)
          updatePayload.RequestId = requestItemId;
        }

        await listItem.update(updatePayload);
        SPContext.logger.info('Document metadata set', {
          fileName: file.name,
          documentType,
          requestItemId
        });
      } catch (updateError) {
        SPContext.logger.warn('Failed to set document metadata', {
          fileName: file.name,
          error: updateError
        });
        // Don't fail the upload if field update fails
      }
    }

    // Auto-checkout only when explicitly replacing an existing document during review
    if (isReplacement && isAutoCheckoutOnReplaceEnabled() && supportsReviewTracking(file.name)) {
      try {
        const doc = {
          name: file.name,
          url: uploadResult.data.ServerRelativeUrl,
        };
        const checkoutResult = await startReviewing(doc as any);
        if (checkoutResult.success) {
          SPContext.logger.info('DocumentService: Auto-checkout after replace', { fileName: file.name });
        } else {
          SPContext.logger.warn('DocumentService: Auto-checkout after replace failed', {
            fileName: file.name,
            error: checkoutResult.error,
          });
        }
      } catch (autoCheckoutError) {
        // Non-fatal — the replace succeeded even if auto-checkout fails
        SPContext.logger.warn('DocumentService: Auto-checkout after replace threw', {
          fileName: file.name,
          error: autoCheckoutError instanceof Error ? autoCheckoutError.message : String(autoCheckoutError),
        });
      }
    }

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
  files: Array<{ file: File; documentType: DocumentType; isReplacement?: boolean }>,
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

  // Pre-create all unique folders before uploading files
  // This prevents duplicate folder creation calls when multiple files go to same folder
  const uniqueFolderPaths = new Set<string>();
  for (const { documentType } of files) {
    uniqueFolderPaths.add(getDocumentFolderPath(itemId, documentType));
  }

  // Create all folders upfront
  for (const folderPath of Array.from(uniqueFolderPaths)) {
    try {
      await ensureFolderExists(libraryTitle, folderPath);
      SPContext.logger.info('Folder ensured for batch upload', { folderPath });
    } catch (folderError) {
      SPContext.logger.error('Failed to create folder for batch upload', folderError, { folderPath });
      // Continue - individual uploads will fail if folder really doesn't exist
    }
  }

  for (const { file, documentType, isReplacement } of files) {
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
          ConflictResolution.Overwrite,
          documentType,
          itemId,
          true, // skipFolderCreation - folders already created above
          isReplacement
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
 * Load ALL documents recursively from RequestDocuments/{itemId} using CAML query
 * Much faster than loading documents individually - returns all documents in one call
 */
export async function loadDocuments(
  itemId: number,
  documentType?: DocumentType, // Ignored - kept for backward compatibility
  libraryTitle: string = DEFAULT_LIBRARY_TITLE
): Promise<IDocument[]> {
  try {
    const sp = SPContext.tryGetFreshSP() || SPContext.sp || SPContext.spPessimistic;
    const library = sp.web.lists.getByTitle(libraryTitle);

    // Get library root folder path
    const libraryUrl = await library.rootFolder.select('ServerRelativeUrl')();
    const libraryServerRelativeUrl = libraryUrl.ServerRelativeUrl;
    const folderPath = `${libraryServerRelativeUrl}/${itemId}`;

    SPContext.logger.info('Loading ALL documents recursively with CAML query', {
      itemId,
      libraryServerRelativeUrl,
      folderPath,
      usingFreshSP: sp !== SPContext.sp,
    });

    // Build CAML query to get all files (not folders) recursively from RequestDocuments/{itemId}
    // Use FSObjType = 0 to get files only, and FileDirRef to match the folder
    const camlQuery = `
      <View Scope="RecursiveAll">
        <Query>
          <Where>
            <And>
              <Eq>
                <FieldRef Name="FSObjType" />
                <Value Type="Integer">0</Value>
              </Eq>
              <BeginsWith>
                <FieldRef Name="FileDirRef" />
                <Value Type="Text">${folderPath}</Value>
              </BeginsWith>
            </And>
          </Where>
        </Query>
        <ViewFields>
          <FieldRef Name="ID" />
          <FieldRef Name="FileLeafRef" />
          <FieldRef Name="FileRef" />
          <FieldRef Name="FileDirRef" />
          <FieldRef Name="File_x0020_Size" />
          <FieldRef Name="Created" />
          <FieldRef Name="Modified" />
          <FieldRef Name="UniqueId" />
          <FieldRef Name="DocumentType" />
          <FieldRef Name="Author" />
          <FieldRef Name="Editor" />
          <FieldRef Name="CheckoutUser" />
          <FieldRef Name="CheckedOutUserId" />
          <FieldRef Name="CheckedOutDate" />
          <FieldRef Name="CheckOutType" />
        </ViewFields>
        <RowLimit>5000</RowLimit>
      </View>`;

    // Use renderListDataAsStream for better performance
    const result = await library.renderListDataAsStream({
      ViewXml: camlQuery,
    });

    SPContext.logger.info('CAML query returned', {
      count: result.Row?.length || 0,
      hasRow: !!result.Row,
    });

    // Check if we got any results
    if (!result.Row || result.Row.length === 0) {
      SPContext.logger.info('No documents found', { itemId, folderPath });
      return [];
    }

    // Map renderListDataAsStream results to IDocument
    const documents: IDocument[] = result.Row.map((row: IRenderListDataRow): IDocument | undefined => {
      // Extract file info from renderListDataAsStream format
      const fileName = row.FileLeafRef;
      const serverRelativeUrl = row.FileRef;
      const fileDirRef = row.FileDirRef;
      const fileSize = parseInt(row.File_x0020_Size || '0', 10);

      // Determine document type
      // Documents MUST have DocumentType field set
      let docType: DocumentType;

      if (row.DocumentType) {
        docType = row.DocumentType as DocumentType;
      } else {
        SPContext.logger.error('❌ CRITICAL: Document missing DocumentType field! Skipping this document.', {
          fileName,
          fileDirRef,
          itemId: row.ID,
          serverRelativeUrl,
        });
        return undefined;
      }

      // Build absolute URL
      const urlParts = SPContext.webAbsoluteUrl.split('/');
      const protocol = urlParts[0]; // "https:"
      const domain = urlParts[2]; // "tenant.sharepoint.com"
      const documentUrl = `${protocol}//${domain}${serverRelativeUrl}`;

      const doc: IDocument = {
        name: fileName,
        url: documentUrl,
        size: fileSize,
        timeCreated: row.Created,
        timeLastModified: row.Modified || row.Created,
        uniqueId: row.UniqueId,
        createdBy: row.Author?.[0]?.title || 'Unknown',
        createdByEmail: row.Author?.[0]?.email || row.Author?.[0]?.sip || '',
        modifiedBy: row.Editor?.[0]?.title || 'Unknown',
        modifiedByEmail: row.Editor?.[0]?.email || row.Editor?.[0]?.sip || '',
        listItemId: parseInt(row.ID, 10),
        documentType: docType,
        checkOutType: resolveEffectiveCheckoutType(
          normalizeSharePointCheckOutType(row.CheckOutType),
          row.CheckedOutUserId,
          row.CheckoutUser?.[0]?.title,
          row.CheckoutUser?.[0]?.email || row.CheckoutUser?.[0]?.sip,
          undefined
        ),
        checkedOutById: row.CheckedOutUserId,
        checkedOutByName: row.CheckoutUser?.[0]?.title,
        checkedOutByEmail: row.CheckoutUser?.[0]?.email || row.CheckoutUser?.[0]?.sip,
        checkedOutByLoginName: undefined,
        checkedOutDate: row.CheckedOutDate,
      };

      return doc;
    })
    .filter((doc): doc is IDocument => doc !== undefined); // Remove undefined entries (documents without DocumentType)

    SPContext.logger.success('✅ Documents loaded successfully', {
      count: documents.length,
      itemId,
      documentType,
      documentTypes: documents.map(d => d.documentType),
    });

    return documents;
  } catch (error) {
    SPContext.logger.error('Failed to load documents', error, { itemId, documentType });
    throw error;
  }
}

/**
 * Query SharePoint for live checkout state of a file.
 * Throws if the file is checked out (blocks the mutation).
 *
 * @param file - Document with a URL
 * @param operation - Human-readable operation name for error messages
 */
async function assertFileNotCheckedOut(file: IDocument, operation: string): Promise<void> {
  if (!isDocumentCheckoutEnabled() || !supportsReviewTracking(file.name) || !file.url) {
    return;
  }

  try {
    const urlObj = new URL(file.url);
    const serverRelativeUrl = decodeServerRelativePath(urlObj.pathname);
    const spFile = SPContext.sp.web.getFileByServerRelativePath(serverRelativeUrl);
    SPContext.logger.debug('DocumentService: Verifying live checkout state before mutation', {
      fileName: file.name,
      operation,
      serverRelativeUrl,
      localCheckOutType: file.checkOutType,
      localCheckedOutByName: file.checkedOutByName,
      localCheckedOutByEmail: file.checkedOutByEmail,
      listItemId: file.listItemId,
      uniqueId: file.uniqueId,
    });
    const fileInfo = await spFile.select('CheckOutType', 'CheckedOutByUser/Title', 'CheckedOutByUser/EMail')
      .expand('CheckedOutByUser')() as any;
    SPContext.logger.debug('DocumentService: Live checkout query result', {
      fileName: file.name,
      operation,
      serverRelativeUrl,
      rawCheckOutType: fileInfo?.CheckOutType,
      normalizedCheckOutType: normalizeSharePointCheckOutType(fileInfo?.CheckOutType),
      checkedOutByTitle: fileInfo?.CheckedOutByUser?.Title,
      checkedOutByEmail: fileInfo?.CheckedOutByUser?.EMail,
      fileInfoKeys: fileInfo ? Object.keys(fileInfo) : [],
    });

    const checkoutType = normalizeSharePointCheckOutType(fileInfo.CheckOutType);
    if (checkoutType !== 0) {
      const currentUserEmail = (SPContext.currentUser?.email || '').toLowerCase();
      const currentUserTitle = (SPContext.currentUser?.title || '').toLowerCase();
      const checkedOutEmail = (fileInfo.CheckedOutByUser?.EMail || '').toLowerCase();
      const checkedOutTitle = (fileInfo.CheckedOutByUser?.Title || '').toLowerCase();
      const shouldBlock = shouldBlockMutationForCheckout(
        checkoutType,
        checkedOutEmail,
        checkedOutTitle
      );

      if (!shouldBlock) {
        SPContext.logger.warn('DocumentService: Non-attributed checkout detected; allowing mutation to proceed', {
          fileName: file.name,
          operation,
          serverRelativeUrl,
          rawCheckOutType: fileInfo.CheckOutType,
          normalizedCheckOutType: checkoutType,
        });
        return;
      }

      const isMe =
        (checkedOutEmail !== '' && checkedOutEmail === currentUserEmail) ||
        (checkedOutEmail === '' && checkedOutTitle !== '' && checkedOutTitle === currentUserTitle);
      const reviewer = isMe ? 'you' : (fileInfo.CheckedOutByUser?.Title || 'another user');
      SPContext.logger.warn('DocumentService: Live checkout blocked document mutation', {
        fileName: file.name,
        operation,
        serverRelativeUrl,
        rawCheckOutType: fileInfo.CheckOutType,
        normalizedCheckOutType: checkoutType,
        checkedOutByTitle: fileInfo.CheckedOutByUser?.Title,
        checkedOutByEmail: fileInfo.CheckedOutByUser?.EMail,
        currentUserEmail: SPContext.currentUser?.email,
        currentUserTitle: SPContext.currentUser?.title,
        isCurrentUser: isMe,
      });
      throw new Error(`Cannot ${operation} "${file.name}" — it is being reviewed by ${reviewer}.`);
    }
  } catch (error) {
    // Re-throw checkout validation errors
    if (error instanceof Error && error.message.indexOf('Cannot ') === 0) {
      throw error;
    }
    // For query failures, log and let the operation proceed — SharePoint will enforce server-side
    SPContext.logger.warn('DocumentService: Could not verify checkout status before ' + operation, {
      fileName: file.name,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Delete file from SharePoint
 */
export async function deleteFile(file: IDocument): Promise<void> {
  // Block deletion of files under review (live query)
  await assertFileNotCheckedOut(file, 'delete');

  try {
    SPContext.logger.info('Deleting file', { fileName: file.name, url: file.url });

    const sp = SPContext.sp;

    // Extract server-relative path from absolute URL
    const urlObj = new URL(file.url);
    const serverRelativeUrl = decodeServerRelativePath(urlObj.pathname);

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
  // Block renaming files under review (live query)
  await assertFileNotCheckedOut(file, 'rename');

  try {
    SPContext.logger.info('Renaming file', {
      oldName: file.name,
      newName,
      url: file.url,
      documentType: file.documentType,
      listItemId: file.listItemId,
    });

    const sp = SPContext.sp;

    // Extract server-relative path from absolute URL
    // file.url format: "https://tenant.sharepoint.com/sites/SiteName/RequestDocuments/1/file.pdf"
    // We need: "/sites/SiteName/RequestDocuments/1/file.pdf"
    const urlObj = new URL(file.url);
    const serverRelativeUrl = decodeServerRelativePath(urlObj.pathname);

    SPContext.logger.info('Extracted server-relative URL', {
      absoluteUrl: file.url,
      serverRelativeUrl,
    });

    // Get the file
    const spFile = sp.web.getFileByServerRelativePath(serverRelativeUrl);

    // Build new server-relative path (same folder, new name)
    const lastSlashIndex = serverRelativeUrl.lastIndexOf('/');
    const folderPath = lastSlashIndex >= 0 ? serverRelativeUrl.substring(0, lastSlashIndex) : '';
    const newServerRelativeUrl = folderPath
      ? `${folderPath}/${newName}`
      : `/${newName}`;

    // Prefer move to ensure the file name is updated in SharePoint
    const spFileAny = spFile as any;
    if (typeof spFileAny.moveByPath === 'function') {
      await spFileAny.moveByPath(newServerRelativeUrl, true);
    } else if (typeof spFileAny.moveTo === 'function') {
      await spFileAny.moveTo(newServerRelativeUrl, true);
    } else {
      // Fallback: update FileLeafRef on the list item
      const listItem = await spFile.getItem();
      const updateData = {
        FileLeafRef: newName,
        DocumentType: file.documentType,
      };
      await listItem.update(updateData);
    }

    // Ensure DocumentType is preserved (rename/move can sometimes reset metadata)
    try {
      const updatedFile = sp.web.getFileByServerRelativePath(newServerRelativeUrl);
      const updatedItem = await updatedFile.getItem();
      await updatedItem.update({ DocumentType: file.documentType });
    } catch (metaError) {
      SPContext.logger.warn('Failed to re-apply DocumentType after rename', {
        fileName: newName,
        documentType: file.documentType,
        error: metaError instanceof Error ? metaError.message : String(metaError),
      });
    }

    SPContext.logger.success('File renamed successfully', {
      oldName: file.name,
      newName,
      documentType: file.documentType,
    });
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
  SPContext.logger.debug('DocumentService: changeDocumentType called', {
    itemId,
    newType,
    fileCount: files.length,
    files: files.map(file => ({
      fileName: file.name,
      uniqueId: file.uniqueId,
      listItemId: file.listItemId,
      currentType: file.documentType,
      localCheckOutType: file.checkOutType,
      localCheckedOutByName: file.checkedOutByName,
      localCheckedOutByEmail: file.checkedOutByEmail,
      url: file.url,
    })),
  });

  // Block type change for files under review (live query per file)
  for (let i = 0; i < files.length; i++) {
    await assertFileNotCheckedOut(files[i], 'change type of');
  }

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

// ============================================
// LIBRARY ID CACHING
// ============================================

/**
 * Module-level cache for RequestDocuments library ID
 * Loaded once, shared across all callers
 */
let cachedLibraryId: string | undefined = undefined;
let libraryIdPromise: Promise<string> | undefined = undefined;

/**
 * Get the RequestDocuments library ID with module-level caching
 * Multiple simultaneous calls will share the same promise
 *
 * This is used by:
 * - documentsStore (loads once during initialization)
 * - DocumentCard (for version history)
 */
export async function getRequestDocumentsLibraryId(): Promise<string> {
  // Return cached value if available
  if (cachedLibraryId) {
    SPContext.logger.info('DocumentService: Returning cached library ID');
    return cachedLibraryId;
  }

  // Return pending promise if one exists (deduplication)
  if (libraryIdPromise) {
    SPContext.logger.info('DocumentService: Library ID load in progress, waiting...');
    return libraryIdPromise;
  }

  // IMPORTANT: Assign to module-level variable SYNCHRONOUSLY before any await
  // This ensures concurrent callers will see the promise and wait for it
  libraryIdPromise = (async (): Promise<string> => {
    try {
      SPContext.logger.info('DocumentService: Loading RequestDocuments library ID');
      const list = await SPContext.sp.web.lists.getByTitle(DEFAULT_LIBRARY_TITLE).select('Id')();
      cachedLibraryId = list.Id;
      SPContext.logger.success('DocumentService: Library ID loaded', { libraryId: list.Id });
      return list.Id;
    } catch (error) {
      SPContext.logger.error('DocumentService: Failed to load library ID', error);
      throw error;
    } finally {
      // Clear promise reference after completion (success or failure)
      // Note: cachedLibraryId remains set on success for subsequent calls
      libraryIdPromise = undefined;
    }
  })();

  return libraryIdPromise;
}

/**
 * Clear the library ID cache
 * Useful for testing or when the library might have been recreated
 */
export function clearLibraryIdCache(): void {
  cachedLibraryId = undefined;
  libraryIdPromise = undefined;
  SPContext.logger.info('DocumentService: Library ID cache cleared');
}

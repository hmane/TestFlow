/**
 * Custom hook for document upload with validation
 */

import * as React from 'react';
import { SPContext } from 'spfx-toolkit';
import 'spfx-toolkit/lib/utilities/context/pnpImports/files';
import { documentUploadSchema, validateFile, validateFiles } from '../schemas';
import type { DocumentType } from '../types';

/**
 * Upload progress info
 */
export interface IUploadProgress {
  fileName: string;
  progress: number; // 0-100
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

/**
 * Document upload result
 */
export interface IDocumentUploadResult {
  success: boolean;
  documentId?: number;
  fileName: string;
  serverRelativeUrl?: string;
  error?: string;
}

/**
 * Document upload hook options
 */
export interface IUseDocumentUploadOptions {
  requestId: number;
  documentType: DocumentType;
  onProgress?: (progress: IUploadProgress) => void;
  onComplete?: (result: IDocumentUploadResult) => void;
  onError?: (error: string) => void;
}

/**
 * Document upload hook result
 */
export interface IUseDocumentUploadResult {
  uploadFile: (file: File, description?: string) => Promise<IDocumentUploadResult>;
  uploadFiles: (files: File[], description?: string) => Promise<IDocumentUploadResult[]>;
  isUploading: boolean;
  uploadProgress: IUploadProgress[];
  errors: string[];
  clearErrors: () => void;
}

/**
 * Custom hook for document upload with validation
 */
export function useDocumentUpload(options: IUseDocumentUploadOptions): IUseDocumentUploadResult {
  const { requestId, documentType, onProgress, onComplete, onError } = options;

  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState<IUploadProgress[]>([]);
  const [errors, setErrors] = React.useState<string[]>([]);

  /**
   * Clear all errors
   */
  const clearErrors = React.useCallback(() => {
    setErrors([]);
  }, []);

  /**
   * Upload single file
   */
  const uploadFile = React.useCallback(
    async (file: File, description?: string): Promise<IDocumentUploadResult> => {
      const result: IDocumentUploadResult = {
        success: false,
        fileName: file.name,
      };

      try {
        // Validate file
        const validation = validateFile(file);

        if (!validation.isValid) {
          const errorMsg = validation.errors.join(', ');
          result.error = errorMsg;
          setErrors(prev => [...prev, errorMsg]);
          onError?.(errorMsg);
          return result;
        }

        // Validate with Zod schema
        const schemaValidation = documentUploadSchema.safeParse({
          file,
          documentType,
          requestId,
          description,
        });

        if (!schemaValidation.success) {
          const errorMsg = schemaValidation.error.issues.map(e => e.message).join(', ');
          result.error = errorMsg;
          setErrors(prev => [...prev, errorMsg]);
          onError?.(errorMsg);
          return result;
        }

        setIsUploading(true);

        // Update progress
        const progressInfo: IUploadProgress = {
          fileName: file.name,
          progress: 0,
          status: 'uploading',
        };
        setUploadProgress([progressInfo]);
        onProgress?.(progressInfo);

        SPContext.logger.info('Uploading document', {
          fileName: file.name,
          size: file.size,
          type: documentType,
          requestId,
        });

        // Upload to SharePoint
        const folderPath = `Requests/${requestId}`;
        const fileBuffer = await file.arrayBuffer();

        const uploadResult = await SPContext.sp.web
          .getFolderByServerRelativePath(folderPath)
          .files.addUsingPath(file.name, fileBuffer, { Overwrite: true });

        // Update metadata
        await uploadResult.file.listItemAllFields().then(item => {
          return item.update({
            DocumentType: documentType,
            RequestId: requestId,
            Description: description || '',
          });
        });

        // Update progress to complete
        progressInfo.progress = 100;
        progressInfo.status = 'completed';
        setUploadProgress([progressInfo]);
        onProgress?.(progressInfo);

        result.success = true;
        result.documentId = await uploadResult.file.listItemAllFields().then(item => item.Id);
        result.serverRelativeUrl = await uploadResult.file
          .listItemAllFields()
          .then(item => item.ServerRelativeUrl);

        SPContext.logger.success('Document uploaded successfully', {
          fileName: file.name,
          documentId: result.documentId,
        });

        onComplete?.(result);
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        result.error = errorMsg;
        setErrors(prev => [...prev, errorMsg]);

        SPContext.logger.error('Document upload failed', error, {
          fileName: file.name,
          requestId,
        });

        // Update progress to error
        setUploadProgress(prev =>
          prev.map(p => (p.fileName === file.name ? { ...p, status: 'error', error: errorMsg } : p))
        );

        onError?.(errorMsg);
      } finally {
        setIsUploading(false);
      }

      return result;
    },
    [requestId, documentType, onProgress, onComplete, onError]
  );

  /**
   * Upload multiple files
   */
  const uploadFiles = React.useCallback(
    async (files: File[], description?: string): Promise<IDocumentUploadResult[]> => {
      // Validate all files first
      const validation = validateFiles(files);

      if (!validation.isValid) {
        const errors = validation.fileResults
          .filter(r => !r.isValid)
          .reduce<string[]>((acc, r) => acc.concat(r.errors), []);
        setErrors(errors);
        errors.forEach(error => onError?.(error));

        return files.map(file => ({
          success: false,
          fileName: file.name,
          error: 'Validation failed',
        }));
      }

      setIsUploading(true);

      // Initialize progress for all files
      const initialProgress: IUploadProgress[] = files.map(file => ({
        fileName: file.name,
        progress: 0,
        status: 'pending',
      }));
      setUploadProgress(initialProgress);

      // Upload files sequentially (to avoid overwhelming SharePoint)
      const results: IDocumentUploadResult[] = [];

      for (const file of files) {
        const result = await uploadFile(file, description);
        results.push(result);
      }

      setIsUploading(false);

      return results;
    },
    [uploadFile, onError]
  );

  return {
    uploadFile,
    uploadFiles,
    isUploading,
    uploadProgress,
    errors,
    clearErrors,
  };
}

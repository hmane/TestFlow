/**
 * Zod validation schemas for document uploads and management
 */

import { z } from 'zod';
import { DocumentType } from '../types/documentTypes';

/**
 * Allowed file extensions
 */
const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.zip',
];

/**
 * Maximum file size (in bytes) - default 250MB
 */
const MAX_FILE_SIZE_BYTES = 250 * 1024 * 1024; // 250MB

/**
 * File validation helper
 */
const fileSchema = z.custom<File>(val => val instanceof File, 'Invalid file object');

/**
 * Document upload schema
 */
export const documentUploadSchema = z.object({
  file: fileSchema
    .refine(file => file.size > 0, {
      message: 'File cannot be empty',
    })
    .refine(file => file.size <= MAX_FILE_SIZE_BYTES, {
      message: `File size cannot exceed 250MB`,
    })
    .refine(
      file => {
        const extension = '.' + file.name.split('.').pop()?.toLowerCase();
        return ALLOWED_EXTENSIONS.indexOf(extension) !== -1;
      },
      {
        message: `File type not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`,
      }
    ),
  documentType: z.enum(
    [
      DocumentType.Review,
      DocumentType.Supplemental,
      DocumentType.CommunicationApproval,
      DocumentType.PortfolioManagerApproval,
      DocumentType.ResearchAnalystApproval,
      DocumentType.SubjectMatterExpertApproval,
      DocumentType.PerformanceApproval,
      DocumentType.OtherApproval,
    ],
    {
      message: 'Document type is required',
    }
  ),
  requestId: z.number().min(1, 'Request ID is required'),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
  overwrite: z.boolean().optional(),
});

/**
 * Document metadata update schema
 */
export const documentMetadataUpdateSchema = z.object({
  id: z.number().min(1, 'Document ID is required'),
  documentType: z
    .enum([
      DocumentType.Review,
      DocumentType.Supplemental,
      DocumentType.CommunicationApproval,
      DocumentType.PortfolioManagerApproval,
      DocumentType.ResearchAnalystApproval,
      DocumentType.SubjectMatterExpertApproval,
      DocumentType.PerformanceApproval,
      DocumentType.OtherApproval,
    ])
    .optional(),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
});

/**
 * Document delete schema
 */
export const documentDeleteSchema = z.object({
  id: z.number().min(1, 'Document ID is required'),
  requestId: z.number().min(1, 'Request ID is required'),
});

/**
 * Document validation result schema
 */
export const documentValidationSchema = z.object({
  isValid: z.boolean(),
  fileName: z.string(),
  fileSize: z.number(),
  fileType: z.string(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
});

/**
 * Bulk document upload schema
 */
export const bulkDocumentUploadSchema = z.object({
  files: z
    .array(fileSchema)
    .min(1, 'At least one file is required')
    .max(10, 'Cannot upload more than 10 files at once'),
  documentType: z.enum([
    DocumentType.Review,
    DocumentType.Supplemental,
    DocumentType.CommunicationApproval,
    DocumentType.PortfolioManagerApproval,
    DocumentType.ResearchAnalystApproval,
    DocumentType.SubjectMatterExpertApproval,
    DocumentType.PerformanceApproval,
    DocumentType.OtherApproval,
  ]),
  requestId: z.number().min(1),
  description: z.string().max(500).optional(),
});

/**
 * Document query options schema
 */
export const documentQueryOptionsSchema = z.object({
  requestId: z.number().min(1, 'Request ID is required'),
  documentType: z
    .array(
      z.enum([
        DocumentType.Review,
        DocumentType.Supplemental,
        DocumentType.CommunicationApproval,
        DocumentType.PortfolioManagerApproval,
        DocumentType.ResearchAnalystApproval,
        DocumentType.SubjectMatterExpertApproval,
        DocumentType.PerformanceApproval,
        DocumentType.OtherApproval,
      ])
    )
    .optional(),
  includeVersions: z.boolean().optional(),
  orderBy: z.enum(['created', 'modified', 'name']).optional(),
  orderByDescending: z.boolean().optional(),
});

/**
 * Custom file validation function
 */
export function validateFile(file: File): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check file size
  if (file.size === 0) {
    errors.push('File is empty');
  } else if (file.size > MAX_FILE_SIZE_BYTES) {
    errors.push(`File size exceeds 250MB (${(file.size / (1024 * 1024)).toFixed(2)}MB)`);
  } else if (file.size > 100 * 1024 * 1024) {
    // Warn if over 100MB
    warnings.push(`Large file size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
  }

  // Check file extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (ALLOWED_EXTENSIONS.indexOf(extension) === -1) {
    errors.push(`File type '${extension}' is not allowed`);
  }

  // Check file name
  if (file.name.length > 128) {
    errors.push('File name is too long (max 128 characters)');
  }

  // Check for special characters in file name
  const invalidChars = /[<>:"|?*]/g;
  if (invalidChars.test(file.name)) {
    errors.push('File name contains invalid characters: < > : " | ? *');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate multiple files
 */
export function validateFiles(files: File[]): {
  isValid: boolean;
  fileResults: Array<{ fileName: string; isValid: boolean; errors: string[]; warnings: string[] }>;
  totalSize: number;
} {
  const fileResults = files.map(file => ({
    fileName: file.name,
    ...validateFile(file),
  }));

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const isValid = fileResults.every(result => result.isValid);

  return {
    isValid,
    fileResults,
    totalSize,
  };
}

/**
 * Type exports
 */
export type DocumentUploadType = z.infer<typeof documentUploadSchema>;
export type DocumentMetadataUpdateType = z.infer<typeof documentMetadataUpdateSchema>;
export type DocumentDeleteType = z.infer<typeof documentDeleteSchema>;
export type BulkDocumentUploadType = z.infer<typeof bulkDocumentUploadSchema>;
export type DocumentQueryOptionsType = z.infer<typeof documentQueryOptionsSchema>;

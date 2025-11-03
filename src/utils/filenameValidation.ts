/**
 * Filename Validation Utilities
 * Provides validation and parsing functions for document filenames
 */

import type { IDocument } from '../stores/documentsStore';
import type { DocumentType } from '../types/documentTypes';

/**
 * Invalid characters for SharePoint filenames
 * Based on SharePoint naming restrictions
 */
const INVALID_SHAREPOINT_CHARS = ['~', '"', '#', '%', '&', '*', ':', '<', '>', '?', '/', '\\', '{', '|', '}'];

/**
 * Parsed filename result
 */
export interface IParsedFilename {
  name: string;
  extension: string;
  fullName: string;
}

/**
 * Parse filename into name and extension
 * @param fullName - Full filename with extension (e.g., "document.pdf")
 * @returns Parsed filename object
 */
export function parseFilename(fullName: string): IParsedFilename {
  const lastDotIndex = fullName.lastIndexOf('.');

  if (lastDotIndex === -1 || lastDotIndex === 0) {
    // No extension or starts with dot (.gitignore case)
    return {
      name: fullName,
      extension: '',
      fullName,
    };
  }

  const name = fullName.substring(0, lastDotIndex);
  const extension = fullName.substring(lastDotIndex); // Includes the dot

  return {
    name,
    extension,
    fullName,
  };
}

/**
 * Get invalid SharePoint characters found in filename
 * @param name - Filename to check (without extension)
 * @returns Array of invalid characters found
 */
export function getInvalidCharacters(name: string): string[] {
  const found: string[] = [];

  for (let i = 0; i < INVALID_SHAREPOINT_CHARS.length; i++) {
    const char = INVALID_SHAREPOINT_CHARS[i];
    if (name.indexOf(char) !== -1) {
      found.push(char);
    }
  }

  return found;
}

/**
 * Validate if filename meets SharePoint naming requirements
 * @param name - Filename to validate (without extension)
 * @returns Object with validation result and error message
 */
export function isValidSharePointFilename(name: string): { isValid: boolean; error?: string } {
  // Check if empty
  if (!name || name.trim().length === 0) {
    return {
      isValid: false,
      error: 'Filename cannot be empty',
    };
  }

  // Check for invalid characters
  const invalidChars = getInvalidCharacters(name);
  if (invalidChars.length > 0) {
    return {
      isValid: false,
      error: `Filename contains invalid characters: ${invalidChars.join(', ')}`,
    };
  }

  // Check length (SharePoint limit is 260 chars for full path, keep filename reasonable)
  if (name.length > 128) {
    return {
      isValid: false,
      error: 'Filename is too long (maximum 128 characters)',
    };
  }

  // Check if starts or ends with space
  if (name.charAt(0) === ' ' || name.charAt(name.length - 1) === ' ') {
    return {
      isValid: false,
      error: 'Filename cannot start or end with a space',
    };
  }

  // Check if ends with period (not allowed by SharePoint)
  if (name.charAt(name.length - 1) === '.') {
    return {
      isValid: false,
      error: 'Filename cannot end with a period',
    };
  }

  return { isValid: true };
}

/**
 * Check if a filename already exists in the document list
 * Checks only documents of the same type
 * @param newName - New filename to check (without extension)
 * @param extension - File extension (e.g., ".pdf")
 * @param documentType - Document type to filter by
 * @param existingDocuments - Array of existing documents
 * @param stagedFiles - Array of staged files
 * @param excludeId - ID to exclude from check (current document being renamed)
 * @returns True if duplicate exists, false otherwise
 */
export function checkDuplicateInDocuments(
  newName: string,
  extension: string,
  documentType: DocumentType,
  existingDocuments: IDocument[],
  stagedFiles: Array<{ name: string; documentType: DocumentType }>,
  excludeId?: string
): boolean {
  const fullNewName = `${newName}${extension}`.toLowerCase();

  // Check existing documents
  for (const doc of existingDocuments) {
    // Skip if this is the document being renamed
    if (excludeId && doc.uniqueId === excludeId) {
      continue;
    }

    // Only check documents of the same type
    if (doc.documentType === documentType && doc.name.toLowerCase() === fullNewName) {
      return true;
    }
  }

  // Check staged files
  for (const file of stagedFiles) {
    // Only check files of the same type
    if (file.documentType === documentType && file.name.toLowerCase() === fullNewName) {
      return true;
    }
  }

  return false;
}

/**
 * Validate filename for rename operation
 * Combines all validation checks
 * @param newName - New filename (without extension)
 * @param extension - File extension
 * @param documentType - Document type
 * @param existingDocuments - Existing documents
 * @param stagedFiles - Staged files
 * @param excludeId - ID to exclude from duplicate check
 * @returns Validation result with error message if invalid
 */
export function validateRename(
  newName: string,
  extension: string,
  documentType: DocumentType,
  existingDocuments: IDocument[],
  stagedFiles: Array<{ name: string; documentType: DocumentType }>,
  excludeId?: string
): { isValid: boolean; error?: string } {
  // Validate SharePoint filename rules
  const sharePointValidation = isValidSharePointFilename(newName);
  if (!sharePointValidation.isValid) {
    return sharePointValidation;
  }

  // Check for duplicates
  const isDuplicate = checkDuplicateInDocuments(
    newName,
    extension,
    documentType,
    existingDocuments,
    stagedFiles,
    excludeId
  );

  if (isDuplicate) {
    return {
      isValid: false,
      error: `A file named "${newName}${extension}" already exists for this document type`,
    };
  }

  return { isValid: true };
}

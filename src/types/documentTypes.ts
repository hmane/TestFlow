/**
 * Document management types
 */

import type { IPrincipal, SPLookup } from 'spfx-toolkit/lib/types';

/**
 * Document types for categorization
 */
export enum DocumentType {
  Review = 'Review',
  Supplemental = 'Supplemental',
  Foreside = 'Foreside',
  CommunicationApproval = 'Communication Approval',
  PortfolioManagerApproval = 'Portfolio Manager Approval',
  ResearchAnalystApproval = 'Research Analyst Approval',
  SubjectMatterExpertApproval = 'Subject Matter Expert Approval',
  PerformanceApproval = 'Performance Approval',
  OtherApproval = 'Other Approval',
}

/**
 * Request document interface
 */
export interface IRequestDocument {
  id?: number;
  name: string;
  documentType: DocumentType;
  request?: SPLookup;
  description?: string;
  serverRelativeUrl: string;
  size: number;
  timeCreated: Date;
  timeLastModified: Date;
  uploadedBy: IPrincipal;
  checkOutType?: number;
  version?: string;
  contentType?: string;
}

/**
 * Document upload payload
 */
export interface IDocumentUploadPayload {
  file: File;
  documentType: DocumentType;
  requestId: number;
  description?: string;
  overwrite?: boolean;
}

/**
 * Document list item from SharePoint
 */
export interface IDocumentListItem {
  Id: number;
  FileLeafRef: string;
  FileRef: string;
  File_x0020_Size: number;
  DocumentType: string;
  RequestId?: number;
  Description?: string;
  Created: string;
  AuthorId: number;
  Modified: string;
  EditorId: number;
  CheckOutType: number;
  _UIVersionString?: string;
  ContentType?: string;
}

/**
 * Document metadata update payload
 */
export interface IDocumentMetadataUpdate {
  id: number;
  documentType?: DocumentType;
  description?: string;
}

/**
 * Document version information
 */
export interface IDocumentVersion {
  versionId: number;
  versionLabel: string;
  created: Date;
  createdBy: IPrincipal;
  size: number;
  isCurrentVersion: boolean;
  url: string;
  checkInComment?: string;
}

/**
 * Document validation result
 */
export interface IDocumentValidation {
  isValid: boolean;
  fileName: string;
  fileSize: number;
  fileType: string;
  errors: string[];
  warnings: string[];
}

/**
 * Document folder structure
 */
export interface IDocumentFolder {
  requestId: number;
  folderPath: string;
  documents: IRequestDocument[];
  totalSize: number;
  documentCount: number;
}

/**
 * Document query options
 */
export interface IDocumentQueryOptions {
  requestId: number;
  documentType?: DocumentType[];
  includeVersions?: boolean;
  orderBy?: 'created' | 'modified' | 'name';
  orderByDescending?: boolean;
}

/**
 * Central export point for all Zod validation schemas
 */

// Approval schemas
export {
  communicationsApprovalSchema,
  portfolioManagerApprovalSchema,
  researchAnalystApprovalSchema,
  smeApprovalSchema,
  performanceApprovalSchema,
  otherApprovalSchema,
  approvalSchema,
  approvalsArraySchema,
  addApprovalSchema,
} from './approvalSchema';

export type {
  ApprovalSchemaType,
  ApprovalsArraySchemaType,
  AddApprovalSchemaType,
} from './approvalSchema';

// Review schemas
export {
  legalReviewStatusUpdateSchema,
  complianceReviewStatusUpdateSchema,
  legalReviewCompletionSchema,
  complianceReviewCompletionSchema,
  attorneyAssignmentSchema,
  legalReviewSchema,
  complianceReviewSchema,
} from './reviewSchema';

export type {
  LegalReviewStatusUpdateType,
  ComplianceReviewStatusUpdateType,
  LegalReviewCompletionType,
  ComplianceReviewCompletionType,
  AttorneyAssignmentType,
} from './reviewSchema';

// Request schemas
export {
  requestInformationSchema,
  approvalsSchema,
  createRequestSchema,
  draftRequestSchema,
  updateRequestSchema,
  closeoutRequestSchema,
  closeoutWithTrackingIdSchema,
  cancelRequestSchema,
  holdRequestSchema,
  rushRequestCalculationSchema,
  fullRequestSchema,
} from './requestSchema';

export type {
  RequestInformationType,
  ApprovalsType,
  CreateRequestType,
  DraftRequestType,
  UpdateRequestType,
  CloseoutRequestType,
  CancelRequestType,
  HoldRequestType,
} from './requestSchema';

// Document schemas
export {
  documentUploadSchema,
  documentMetadataUpdateSchema,
  documentDeleteSchema,
  documentValidationSchema,
  bulkDocumentUploadSchema,
  documentQueryOptionsSchema,
  validateFile,
  validateFiles,
} from './documentSchema';

export type {
  DocumentUploadType,
  DocumentMetadataUpdateType,
  DocumentDeleteType,
  BulkDocumentUploadType,
  DocumentQueryOptionsType,
} from './documentSchema';

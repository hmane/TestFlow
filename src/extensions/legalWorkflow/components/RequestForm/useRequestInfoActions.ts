import * as React from 'react';
import type { FieldPath, UseFormClearErrors, UseFormSetError } from 'react-hook-form';

// spfx-toolkit - tree-shaken imports
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

// App imports using path aliases
import { Lists } from '@sp/Lists';
import type { ILegalRequest, IPrincipal, SPLookup, Approval } from '@appTypes/index';
import { ApprovalType } from '@appTypes/approvalTypes';
import { DocumentType } from '@appTypes/documentTypes';
import { saveRequestSchema, submitRequestSchema } from '@schemas/requestSchema';
import type { IValidationError } from '@contexts/RequestFormContext';
import { useDocumentsStore } from '@stores/documentsStore';
import { useRequestStore } from '@stores/requestStore';

/**
 * Approval with validation metadata injected for Zod schema validation
 */
type ApprovalWithValidationMetadata = Approval & {
  _hasDocumentInStore?: boolean;
};

/**
 * Request with validation metadata for schema validation
 */
type RequestWithValidationMetadata = Partial<ILegalRequest> & {
  _hasAttachments?: boolean;
  approvals?: ApprovalWithValidationMetadata[];
};

/**
 * Map ApprovalType to DocumentType for validation
 */
const approvalTypeToDocumentType: Record<ApprovalType, DocumentType> = {
  [ApprovalType.Communications]: DocumentType.CommunicationApproval,
  [ApprovalType.PortfolioManager]: DocumentType.PortfolioManagerApproval,
  [ApprovalType.ResearchAnalyst]: DocumentType.ResearchAnalystApproval,
  [ApprovalType.SubjectMatterExpert]: DocumentType.SubjectMatterExpertApproval,
  [ApprovalType.Performance]: DocumentType.PerformanceApproval,
  [ApprovalType.Other]: DocumentType.OtherApproval,
};

interface IRequestInfoActionsOptions {
  itemId?: number;
  watch: () => ILegalRequest;
  updateMultipleFields: (fields: Partial<ILegalRequest>) => void;
  saveAsDraft: () => Promise<number>;
  setError: UseFormSetError<ILegalRequest>;
  clearErrors: UseFormClearErrors<ILegalRequest>;
  showSuccessNotification?: (message: string) => void;
  showErrorNotification?: (message: string) => void;
}

interface IRequestInfoActionsResult {
  onSubmit: (data: ILegalRequest) => Promise<void>;
  handleSubmitDirect: () => Promise<void>;
  handleSaveDraft: (successMessage?: string) => Promise<void>;
  handleClose: () => void;
  handleCancelRequest: (reason: string) => Promise<void>;
  handlePutOnHold: (reason: string) => Promise<void>;
  validationErrors: IValidationError[];
  setValidationErrors: React.Dispatch<React.SetStateAction<IValidationError[]>>;
  revalidateErrors: (formValues: Partial<ILegalRequest>) => void;
}

const normalizeLookupValue = (value: unknown): SPLookup | undefined => {
  if (!value) {
    return undefined;
  }

  if (typeof value === 'number') {
    return { id: value };
  }

  if (typeof value === 'object') {
    const lookup = value as { id?: number; Id?: number; title?: string; Title?: string };
    const id = lookup.id ?? lookup.Id;
    if (id === undefined) {
      return undefined;
    }

    return {
      id,
      title: lookup.title ?? lookup.Title,
    };
  }

  return undefined;
};

const normalizePrincipalValue = (value: unknown): IPrincipal | undefined => {
  if (!value) {
    return undefined;
  }

  if (typeof value === 'string') {
    return { id: value };
  }

  if (typeof value === 'object') {
    const principal = value as {
      id?: string;
      Id?: number;
      ID?: number;
      email?: string;
      EMail?: string;
      Email?: string;
      title?: string;
      Title?: string;
      value?: string;
      loginName?: string;
      LoginName?: string;
      Name?: string;
      department?: string;
      Department?: string;
      jobTitle?: string;
      JobTitle?: string;
      sip?: string;
      Sip?: string;
      picture?: string;
      Picture?: string;
      key?: string;
      text?: string;
    };

    const idSource =
      principal.id ??
      principal.Id ??
      principal.ID ??
      principal.LoginName ??
      principal.Name ??
      principal.value ??
      principal.key;
    if (!idSource) {
      return undefined;
    }

    const email = principal.email ?? principal.EMail ?? principal.Email;
    const login = principal.loginName ?? principal.LoginName ?? principal.Name ?? email;
    const title = principal.title ?? principal.Title ?? email ?? login;

    if (!title && !login) {
      return undefined;
    }

    return {
      id: String(idSource),
      email,
      title: title ?? '',
      value: principal.value ?? login ?? title ?? '',
      loginName: login,
      department: principal.department ?? principal.Department,
      jobTitle: principal.jobTitle ?? principal.JobTitle,
      sip: principal.sip ?? principal.Sip,
      picture: principal.picture ?? principal.Picture,
    };
  }

  return undefined;
};

const normalizeRequestValues = (values: Partial<ILegalRequest>): Partial<ILegalRequest> => {
  const normalized: Partial<ILegalRequest> = {
    ...values,
  };

  // submissionItem is now a string, no normalization needed

  if (Array.isArray(values.priorSubmissions)) {
    const priorSubmissions = values.priorSubmissions
      .map(normalizeLookupValue)
      .filter((item): item is SPLookup => Boolean(item));
    normalized.priorSubmissions = priorSubmissions;
  }

  if (Array.isArray(values.additionalParty)) {
    const additionalParty = values.additionalParty
      .map(normalizePrincipalValue)
      .filter((item): item is IPrincipal => Boolean(item));
    normalized.additionalParty = additionalParty;
  }

  return normalized;
};

export const useRequestInfoActions = ({
  itemId,
  watch,
  updateMultipleFields,
  saveAsDraft,
  setError,
  clearErrors,
  showSuccessNotification,
  showErrorNotification,
}: IRequestInfoActionsOptions): IRequestInfoActionsResult => {
  const [validationErrors, setValidationErrors] = React.useState<IValidationError[]>([]);

  // Track which schema was used for the last validation (save vs submit)
  const lastValidationSchemaRef = React.useRef<'save' | 'submit' | null>(null);

  // Get document operations and state from store
  const {
    renamePendingFiles,
    deletePendingFiles,
    documents,
    stagedFiles,
    filesToDelete,
  } = useDocumentsStore();

  // Get workflow actions from request store
  const { cancelRequest, holdRequest: putRequestOnHold, submitRequest } = useRequestStore();

  /**
   * Check if an approval type has documents in the documentsStore
   * This checks both existing documents and staged (pending upload) files
   */
  const hasDocumentsForApprovalType = React.useCallback(
    (approvalType: ApprovalType): boolean => {
      const documentType = approvalTypeToDocumentType[approvalType];
      if (!documentType) {
        return false;
      }

      // Check existing documents (already uploaded to SharePoint)
      const existingDocs = documents.get(documentType) || [];
      // Filter out documents marked for deletion
      const activeExistingDocs = existingDocs.filter(doc => {
        return !filesToDelete.some(fd => fd.uniqueId === doc.uniqueId);
      });

      if (activeExistingDocs.length > 0) {
        return true;
      }

      // Check staged files (pending upload)
      const stagedForType = stagedFiles.filter(sf => sf.documentType === documentType);
      if (stagedForType.length > 0) {
        return true;
      }

      return false;
    },
    [documents, stagedFiles, filesToDelete]
  );

  /**
   * Check if there are any attachments (Review or Supplemental documents) in the store
   */
  const hasAttachments = React.useCallback((): boolean => {
    // Check Review documents
    const reviewDocs = documents.get(DocumentType.Review) || [];
    const activeReviewDocs = reviewDocs.filter(doc => {
      return !filesToDelete.some(fd => fd.uniqueId === doc.uniqueId);
    });
    if (activeReviewDocs.length > 0) {
      return true;
    }

    // Check Supplemental documents
    const supplementalDocs = documents.get(DocumentType.Supplemental) || [];
    const activeSupplementalDocs = supplementalDocs.filter(doc => {
      return !filesToDelete.some(fd => fd.uniqueId === doc.uniqueId);
    });
    if (activeSupplementalDocs.length > 0) {
      return true;
    }

    // Check staged files for Review or Supplemental
    const stagedReview = stagedFiles.filter(sf => sf.documentType === DocumentType.Review);
    if (stagedReview.length > 0) {
      return true;
    }

    const stagedSupplemental = stagedFiles.filter(sf => sf.documentType === DocumentType.Supplemental);
    if (stagedSupplemental.length > 0) {
      return true;
    }

    return false;
  }, [documents, stagedFiles, filesToDelete]);

  const completeSave = React.useCallback(async (successMessage?: string): Promise<void> => {
    try {
      // Process document operations BEFORE save to avoid state being cleared by reload
      SPContext.logger.info('RequestInfo: Processing document operations before save');

      try {
        await renamePendingFiles();
        SPContext.logger.success('RequestInfo: Documents renamed successfully');
      } catch (docError: unknown) {
        SPContext.logger.error('RequestInfo: Document rename failed', docError);
        // Don't fail the whole save if document operations fail
      }

      try {
        await deletePendingFiles();
        SPContext.logger.success('RequestInfo: Documents deleted successfully');
      } catch (docError: unknown) {
        SPContext.logger.error('RequestInfo: Document deletion failed', docError);
        // Don't fail the whole save if document operations fail
      }

      // Now save the form - reload will show already-renamed files
      const savedItemId = await saveAsDraft();

      showSuccessNotification?.(successMessage ?? 'Draft saved successfully!');
      SPContext.logger.success('RequestInfo: Draft saved', { itemId: savedItemId });

      // If this was a new request (no itemId before), redirect to edit mode immediately
      // This prevents the user from refreshing and seeing the new form again
      if (!itemId && savedItemId) {
        SPContext.logger.info('RequestInfo: Redirecting to edit mode', { itemId: savedItemId });

        // Build the edit form URL
        const webUrl = SPContext.webAbsoluteUrl;
        const editUrl = `${webUrl}${Lists.Requests.Url}/EditForm.aspx?ID=${savedItemId}`;

        // Use replace() to prevent going back to new form with browser back button
        // Use minimal delay (100ms) just to allow success notification to show briefly
        setTimeout(() => {
          window.location.replace(editUrl);
        }, 100);

        return; // Exit early since we're redirecting
      }
    } catch (error: unknown) {
      SPContext.logger.error('RequestInfo: Save failed', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save draft';
      showErrorNotification?.(errorMessage);
      throw error;
    }
  }, [itemId, saveAsDraft, renamePendingFiles, deletePendingFiles, showSuccessNotification, showErrorNotification]);

  const completeSubmit = React.useCallback(async (): Promise<void> => {
    try {
      // Process document operations BEFORE submit to avoid state being cleared by reload
      SPContext.logger.info('RequestInfo: Processing document operations before submit');

      try {
        await renamePendingFiles();
        SPContext.logger.success('RequestInfo: Documents renamed successfully');
      } catch (docError: unknown) {
        SPContext.logger.error('RequestInfo: Document rename failed', docError);
        // Don't fail the whole submit if document operations fail
      }

      try {
        await deletePendingFiles();
        SPContext.logger.success('RequestInfo: Documents deleted successfully');
      } catch (docError: unknown) {
        SPContext.logger.error('RequestInfo: Document deletion failed', docError);
        // Don't fail the whole submit if document operations fail
      }

      // Submit the request - this changes status from Draft to Legal Intake
      // The submitRequest action saves any pending form changes first, then updates status
      SPContext.logger.info('RequestInfo: Calling submitRequest...');
      const submittedItemId = await submitRequest();
      SPContext.logger.success('RequestInfo: submitRequest completed', { itemId: submittedItemId });

      showSuccessNotification?.('Request submitted successfully!');
      SPContext.logger.success('RequestInfo: Request submitted successfully');

      // If this was a new request (no itemId before), redirect to edit mode immediately
      // This ensures user sees the submitted request, not a blank new form on refresh
      if (!itemId && submittedItemId) {
        SPContext.logger.info('RequestInfo: Redirecting to edit mode after submit', { itemId: submittedItemId });

        // Build the edit form URL
        const webUrl = SPContext.webAbsoluteUrl;
        const editUrl = `${webUrl}${Lists.Requests.Url}/EditForm.aspx?ID=${submittedItemId}`;

        // Use replace() to prevent going back to new form with browser back button
        // Use minimal delay (100ms) just to allow success notification to show briefly
        setTimeout(() => {
          window.location.replace(editUrl);
        }, 100);

        return; // Exit early since we're redirecting
      }
    } catch (error: unknown) {
      SPContext.logger.error('RequestInfo: Submission failed', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit request';
      showErrorNotification?.(errorMessage);
      throw error;
    }
  }, [itemId, submitRequest, renamePendingFiles, deletePendingFiles, showSuccessNotification, showErrorNotification]);


  const validateSubmission = React.useCallback(
    (
      data: Partial<ILegalRequest>,
      schema: typeof submitRequestSchema | typeof saveRequestSchema,
      setFormErrors: UseFormSetError<ILegalRequest>,
      clearFormErrors: () => void,
      schemaType: 'save' | 'submit'
    ): { valid: boolean; normalized?: Partial<ILegalRequest> } => {
      const normalized = normalizeRequestValues(data);

      // Track which schema was used for revalidation later
      lastValidationSchemaRef.current = schemaType;

      // Debug: Log isRushRequest and rushRationale values
      SPContext.logger.info('Validation: Rush request check', {
        isRushRequest: normalized.isRushRequest,
        rushRationale: normalized.rushRationale,
        hasRushRationale: !!normalized.rushRationale,
      });

      // Inject document availability from documentsStore into approvals
      // This allows the Zod schema to validate documents correctly
      const normalizedWithMetadata = normalized as RequestWithValidationMetadata;
      if (normalizedWithMetadata.approvals && Array.isArray(normalizedWithMetadata.approvals)) {
        normalizedWithMetadata.approvals = normalizedWithMetadata.approvals.map((approval: Approval): ApprovalWithValidationMetadata => {
          const hasDoc = hasDocumentsForApprovalType(approval.type as ApprovalType);
          SPContext.logger.info('Validation: Document check for approval', {
            approvalType: approval.type,
            hasDocumentInStore: hasDoc,
          });
          return {
            ...approval,
            // Inject a marker that Zod can check
            _hasDocumentInStore: hasDoc,
          };
        });
      }

      // Inject attachments availability (Review or Supplemental documents)
      const hasAttachmentsValue = hasAttachments();
      SPContext.logger.info('Validation: Attachments check', {
        hasAttachments: hasAttachmentsValue,
      });
      normalizedWithMetadata._hasAttachments = hasAttachmentsValue;

      const validation = schema.safeParse(normalized);

      // Debug: Log validation result
      SPContext.logger.info('Validation: Result', {
        success: validation.success,
        errorCount: validation.success ? 0 : validation.error.issues.length,
        errors: validation.success ? [] : validation.error.issues.map(i => ({ path: i.path, message: i.message })),
      });

      if (validation.success) {
        // Clear any previous errors on successful validation
        clearFormErrors();
        setValidationErrors([]);
        lastValidationSchemaRef.current = null;
        return { valid: true, normalized: validation.data as Partial<ILegalRequest> };
      }

      const errors: IValidationError[] = validation.error.issues.map(issue => ({
        field: issue.path.length > 0 ? issue.path.join('.') : 'form',
        message: issue.message,
      }));

      // Set errors in both custom state and react-hook-form
      // Use spread to ensure new array reference for React state update
      setValidationErrors([...errors]);

      // Set errors in react-hook-form so FormErrorSummary can display them
      // React Hook Form setError with dot notation paths like 'approvals.0.approver'
      // correctly creates nested structure at errors.approvals[0].approver
      errors.forEach(error => {
        SPContext.logger.info('Setting form error', { field: error.field, message: error.message });
        // Type assertion needed: dynamic validation paths are valid FieldPath values
        setFormErrors(error.field as FieldPath<ILegalRequest>, {
          type: 'manual',
          message: error.message,
        });
      });

      return { valid: false };
    },
    [setValidationErrors, hasDocumentsForApprovalType, hasAttachments]
  );

  const onSubmit = React.useCallback(
    async (data: ILegalRequest): Promise<void> => {
      try {
        setValidationErrors([]);
        clearErrors();
        SPContext.logger.info('RequestInfo: Validating for submission', { itemId });

        const { valid, normalized } = validateSubmission(data, submitRequestSchema, setError, clearErrors, 'submit');

        if (!valid || !normalized) {
          SPContext.logger.warn('RequestInfo: Submission validation failed', { itemId });
          return;
        }

        updateMultipleFields(normalized);

        await completeSubmit();
      } catch (error: unknown) {
        SPContext.logger.error('RequestInfo: Submission failed', error);
      }
    },
    [itemId, validateSubmission, updateMultipleFields, completeSubmit, setError, clearErrors]
  );

  const handleSaveDraft = React.useCallback(async (successMessage?: string): Promise<void> => {
    try {
      setValidationErrors([]);
      clearErrors();
      SPContext.logger.info('RequestInfo: Validating for draft save');

      const formValues = watch();

      const { valid, normalized } = validateSubmission(formValues, saveRequestSchema, setError, clearErrors, 'save');

      if (!valid || !normalized) {
        SPContext.logger.warn('RequestInfo: Draft validation failed');
        return;
      }

      updateMultipleFields(normalized);

      await completeSave(successMessage);
    } catch (error: unknown) {
      SPContext.logger.error('RequestInfo: Draft save failed', error);
    }
  }, [watch, validateSubmission, updateMultipleFields, completeSave, setError, clearErrors]);

  /**
   * Direct submit handler that reads form values and validates with submit schema
   * This bypasses React Hook Form's handleSubmit wrapper
   */
  const handleSubmitDirect = React.useCallback(async (): Promise<void> => {
    try {
      setValidationErrors([]);
      clearErrors();
      SPContext.logger.info('RequestInfo: Validating for submission (direct)', { itemId });

      const formValues = watch();

      const { valid, normalized } = validateSubmission(formValues, submitRequestSchema, setError, clearErrors, 'submit');

      if (!valid || !normalized) {
        SPContext.logger.warn('RequestInfo: Submission validation failed (direct)', { itemId });
        return;
      }

      updateMultipleFields(normalized);

      await completeSubmit();
    } catch (error: unknown) {
      SPContext.logger.error('RequestInfo: Submission failed (direct)', error);
    }
  }, [itemId, watch, validateSubmission, updateMultipleFields, completeSubmit, setError, clearErrors]);

  const handleClose = React.useCallback((): void => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.close();
    }
  }, []);

  const handleCancelRequest = React.useCallback(
    async (reason: string): Promise<void> => {
      if (!itemId) {
        SPContext.logger.warn('RequestInfo: Cannot cancel request - no item ID');
        showErrorNotification?.('Cannot cancel request: Item ID not found');
        return;
      }

      try {
        SPContext.logger.info('RequestInfo: Canceling request', { itemId, reason });
        await cancelRequest(reason);
        showSuccessNotification?.('Request canceled successfully!');
        SPContext.logger.success('RequestInfo: Request canceled successfully');
      } catch (error: unknown) {
        SPContext.logger.error('RequestInfo: Cancel request failed', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to cancel request';
        showErrorNotification?.(errorMessage);
      }
    },
    [itemId, cancelRequest, showSuccessNotification, showErrorNotification]
  );

  const handlePutOnHold = React.useCallback(
    async (reason: string): Promise<void> => {
      if (!itemId) {
        SPContext.logger.warn('RequestInfo: Cannot put request on hold - no item ID');
        showErrorNotification?.('Cannot put request on hold: Item ID not found');
        return;
      }

      try {
        SPContext.logger.info('RequestInfo: Putting request on hold', { itemId, reason });
        await putRequestOnHold(reason);
        showSuccessNotification?.('Request put on hold successfully!');
        SPContext.logger.success('RequestInfo: Request put on hold successfully');
      } catch (error: unknown) {
        SPContext.logger.error('RequestInfo: Put on hold failed', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to put request on hold';
        showErrorNotification?.(errorMessage);
      }
    },
    [itemId, putRequestOnHold, showSuccessNotification, showErrorNotification]
  );

  /**
   * Revalidate errors using the same schema that was originally used.
   * This is called when form values change after initial validation to keep
   * the error summary container in sync with the actual form state.
   * Also updates React Hook Form errors so field-level error indicators update.
   */
  const revalidateErrors = React.useCallback(
    (formValues: Partial<ILegalRequest>): void => {
      // If there are no current validation errors or no schema was used, nothing to revalidate
      if (validationErrors.length === 0 || !lastValidationSchemaRef.current) {
        return;
      }

      const normalized = normalizeRequestValues(formValues);

      // Inject document availability for approval validation
      const normalizedWithMetadata = normalized as RequestWithValidationMetadata;
      if (normalizedWithMetadata.approvals && Array.isArray(normalizedWithMetadata.approvals)) {
        normalizedWithMetadata.approvals = normalizedWithMetadata.approvals.map((approval: Approval): ApprovalWithValidationMetadata => {
          const hasDoc = hasDocumentsForApprovalType(approval.type as ApprovalType);
          return {
            ...approval,
            _hasDocumentInStore: hasDoc,
          };
        });
      }

      // Inject attachments availability
      normalizedWithMetadata._hasAttachments = hasAttachments();

      // Use the same schema that was originally used for validation
      const schema = lastValidationSchemaRef.current === 'submit' ? submitRequestSchema : saveRequestSchema;
      const validation = schema.safeParse(normalized);

      if (validation.success) {
        // All errors fixed, clear validation errors and reset schema ref
        clearErrors();
        setValidationErrors([]);
        lastValidationSchemaRef.current = null;
      } else {
        // Build a set of current error field paths for efficient lookup
        const currentErrorFields = new Set<string>();
        const currentErrors: IValidationError[] = validation.error.issues.map(issue => {
          const fieldPath = issue.path.length > 0 ? issue.path.join('.') : 'form';
          currentErrorFields.add(fieldPath);
          return {
            field: fieldPath,
            message: issue.message,
          };
        });

        // Find fields that had errors before but are now fixed
        // Clear those specific errors in React Hook Form
        const fieldsToClear: string[] = [];
        validationErrors.forEach(prevError => {
          if (!currentErrorFields.has(prevError.field)) {
            // This field was fixed, collect it for clearing
            fieldsToClear.push(prevError.field);
          }
        });

        // Clear fixed field errors in React Hook Form
        if (fieldsToClear.length > 0) {
          clearErrors(fieldsToClear as FieldPath<ILegalRequest>[]);
        }

        // Update validation errors state
        setValidationErrors(currentErrors);

        // Update React Hook Form errors for current errors
        currentErrors.forEach(error => {
          // Type assertion needed: dynamic validation paths are valid FieldPath values
          setError(error.field as FieldPath<ILegalRequest>, {
            type: 'manual',
            message: error.message,
          });
        });
      }
    },
    [validationErrors, hasDocumentsForApprovalType, hasAttachments, setValidationErrors, setError, clearErrors]
  );

  return {
    onSubmit,
    handleSubmitDirect,
    handleSaveDraft,
    handleClose,
    handleCancelRequest,
    handlePutOnHold,
    validationErrors,
    setValidationErrors,
    revalidateErrors,
  };
};

export type UseRequestInfoActionsResult = ReturnType<typeof useRequestInfoActions>;

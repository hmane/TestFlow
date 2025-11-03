import * as React from 'react';
import type { UseFormSetError } from 'react-hook-form';

import { Lists } from '@sp/Lists';

import type { ILegalRequest, IPrincipal, SPLookup } from '@appTypes/index';
import { saveRequestSchema, submitRequestSchema } from '@schemas/requestSchema';
import { SPContext } from 'spfx-toolkit';

import type { IValidationError } from '@contexts/RequestFormContext';
import { useDocumentsStore } from '../../../../stores/documentsStore';
import { useRequestStore } from '../../../../stores/requestStore';

interface IRequestInfoActionsOptions {
  itemId?: number;
  watch: () => ILegalRequest;
  updateMultipleFields: (fields: Partial<ILegalRequest>) => void;
  saveAsDraft: () => Promise<number>;
  setError: UseFormSetError<ILegalRequest>;
  clearErrors: () => void;
  showSuccessNotification?: (message: string) => void;
  showErrorNotification?: (message: string) => void;
}

interface IRequestInfoActionsResult {
  onSubmit: (data: ILegalRequest) => Promise<void>;
  handleSaveDraft: () => Promise<void>;
  handleClose: () => void;
  handleCancelRequest: (reason: string) => Promise<void>;
  handlePutOnHold: (reason: string) => Promise<void>;
  validationErrors: IValidationError[];
  setValidationErrors: React.Dispatch<React.SetStateAction<IValidationError[]>>;
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

  // Get document operations from store
  const { renamePendingFiles, deletePendingFiles } = useDocumentsStore();

  // Get workflow actions from request store
  const { cancelRequest, holdRequest: putRequestOnHold } = useRequestStore();

  const completeSave = React.useCallback(async (): Promise<void> => {
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

      showSuccessNotification?.('Draft saved successfully!');
      SPContext.logger.success('RequestInfo: Draft saved', { itemId: savedItemId });

      // If this was a new request (no itemId before), redirect to edit mode
      if (!itemId && savedItemId) {
        SPContext.logger.info('RequestInfo: Redirecting to edit mode', { itemId: savedItemId });

        // Build the edit form URL
        const webUrl = SPContext.webAbsoluteUrl;
        const editUrl = `${webUrl}${Lists.Requests.Url}/EditForm.aspx?ID=${savedItemId}`;

        // Redirect after a short delay to show success message
        setTimeout(() => {
          window.location.href = editUrl;
        }, 1000);
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

      // Now submit the form - reload will show already-renamed files
      // TODO: swap placeholder once submit workflow is implemented
      await saveAsDraft();

      showSuccessNotification?.('Request submitted successfully!');
      SPContext.logger.success('RequestInfo: Request submitted successfully');
    } catch (error: unknown) {
      SPContext.logger.error('RequestInfo: Submission failed', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit request';
      showErrorNotification?.(errorMessage);
      throw error;
    }
  }, [saveAsDraft, renamePendingFiles, deletePendingFiles, showSuccessNotification, showErrorNotification]);


  const validateSubmission = React.useCallback(
    (
      data: Partial<ILegalRequest>,
      schema: typeof submitRequestSchema | typeof saveRequestSchema,
      setFormErrors: UseFormSetError<ILegalRequest>,
      clearFormErrors: () => void
    ): { valid: boolean; normalized?: Partial<ILegalRequest> } => {
      const normalized = normalizeRequestValues(data);
      const validation = schema.safeParse(normalized);

      if (validation.success) {
        // Clear any previous errors on successful validation
        clearFormErrors();
        setValidationErrors([]);
        return { valid: true, normalized: validation.data as Partial<ILegalRequest> };
      }

      const errors: IValidationError[] = validation.error.issues.map(issue => ({
        field: issue.path.length > 0 ? issue.path.join('.') : 'form',
        message: issue.message,
      }));

      // Set errors in both custom state and react-hook-form
      setValidationErrors(errors);

      // Set errors in react-hook-form so FormErrorSummary can display them
      errors.forEach(error => {
        setFormErrors(error.field as any, {
          type: 'manual',
          message: error.message,
        });
      });

      return { valid: false };
    },
    [setValidationErrors]
  );

  const onSubmit = React.useCallback(
    async (data: ILegalRequest): Promise<void> => {
      try {
        setValidationErrors([]);
        clearErrors();
        SPContext.logger.info('RequestInfo: Validating for submission', { itemId });

        const { valid, normalized } = validateSubmission(data, submitRequestSchema, setError, clearErrors);

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

  const handleSaveDraft = React.useCallback(async (): Promise<void> => {
    try {
      setValidationErrors([]);
      clearErrors();
      SPContext.logger.info('RequestInfo: Validating for draft save');

      const formValues = watch();

      const { valid, normalized } = validateSubmission(formValues, saveRequestSchema, setError, clearErrors);

      if (!valid || !normalized) {
        SPContext.logger.warn('RequestInfo: Draft validation failed');
        return;
      }

      updateMultipleFields(normalized);

      await completeSave();
    } catch (error: unknown) {
      SPContext.logger.error('RequestInfo: Draft save failed', error);
    }
  }, [watch, validateSubmission, updateMultipleFields, completeSave, setError, clearErrors]);

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

  return {
    onSubmit,
    handleSaveDraft,
    handleClose,
    handleCancelRequest,
    handlePutOnHold,
    validationErrors,
    setValidationErrors,
  };
};

export type UseRequestInfoActionsResult = ReturnType<typeof useRequestInfoActions>;

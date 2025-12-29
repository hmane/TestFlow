/**
 * Custom hook for managing request form state and validation
 * Combines request store, form validation, and business logic
 */

import * as React from 'react';
import { FieldPath } from 'react-hook-form';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import { createRequestSchema, draftRequestSchema } from '@schemas/index';
import { useRequest } from '@stores/index';
import type { ILegalRequest } from '@appTypes/index';
import { useFormValidation } from './useFormValidation';

/**
 * Request form hook options
 */
export interface IUseRequestFormOptions {
  itemId?: number;
  validateOnChange?: boolean;
}

/**
 * Request form hook result
 */
export interface IUseRequestFormResult {
  // Request data
  currentRequest?: ILegalRequest;
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  error?: string;

  // Form validation
  form: ReturnType<typeof useFormValidation<ILegalRequest>>;
  isFormValid: boolean;
  formErrors: string[];

  // Actions
  updateField: <K extends keyof ILegalRequest>(field: K, value: ILegalRequest[K]) => void;
  updateMultipleFields: (fields: Partial<ILegalRequest>) => void;
  saveAsDraft: () => Promise<number | undefined>;
  submitRequest: () => Promise<number | undefined>;
  revertChanges: () => void;

  // Validation helpers
  validateSection: (section: 'requestInformation' | 'approvals') => Promise<boolean>;
  canSubmit: boolean;
  canSaveDraft: boolean;
}

/**
 * Custom hook for request form management
 * Combines store, validation, and auto-save functionality
 */
export function useRequestForm(options: IUseRequestFormOptions = {}): IUseRequestFormResult {
  const {
    itemId,
    validateOnChange = false,
  } = options;

  // Request store
  const {
    currentRequest,
    isLoading,
    isSaving,
    isDirty,
    error,
    updateField: storeUpdateField,
    updateMultipleFields: storeUpdateMultipleFields,
    saveAsDraft: storeSaveAsDraft,
    submitRequest: storeSubmitRequest,
    revertChanges,
  } = useRequest(itemId);

  // Form validation with Zod
  const formValidation = useFormValidation<ILegalRequest>({
    schema: itemId ? draftRequestSchema : createRequestSchema,
    defaultValues: currentRequest,
    mode: validateOnChange ? 'onChange' : 'onSubmit',
    reValidateMode: 'onChange',
  });

  const { form } = formValidation;

  // Track if we've synced with the current request to prevent infinite loops
  // Uses a string comparison of key fields to detect actual data changes
  const lastSyncedRequestIdRef = React.useRef<string | undefined>(undefined);

  // Sync form values with store when request data actually changes
  // Uses a ref to track the last synced request ID and prevent unnecessary resets
  React.useEffect(() => {
    if (!currentRequest) {
      return;
    }

    // Create a unique identifier for the current request state
    // Using requestId and modified timestamp to detect actual changes
    const requestIdentifier = `${currentRequest.requestId || 'new'}-${currentRequest.modified || ''}`;

    // Only reset form if the request data has actually changed
    if (lastSyncedRequestIdRef.current !== requestIdentifier) {
      lastSyncedRequestIdRef.current = requestIdentifier;
      SPContext.logger.info('useRequestForm: Syncing form with store data', {
        requestId: currentRequest.requestId,
      });
      form.reset(currentRequest);
    }
  }, [currentRequest, form.reset]); // Only depend on reset function which should be stable

  /**
   * Update single field with validation
   */
  const updateField = React.useCallback(
    <K extends keyof ILegalRequest>(field: K, value: ILegalRequest[K]): void => {
      storeUpdateField(field, value);
      form.setValue(field, value as any, { shouldValidate: validateOnChange, shouldDirty: true });
    },
    [storeUpdateField, form, validateOnChange]
  );

  /**
   * Update multiple fields with validation
   */
  const updateMultipleFields = React.useCallback(
    (fields: Partial<ILegalRequest>): void => {
      storeUpdateMultipleFields(fields);

      Object.keys(fields).forEach(key => {
        const typedKey = key as keyof ILegalRequest;
        const value = fields[typedKey];
        form.setValue(typedKey, value as any, {
          shouldValidate: validateOnChange,
          shouldDirty: true,
        });
      });
    },
    [storeUpdateMultipleFields, form, validateOnChange]
  );

  /**
   * Save as draft (no validation)
   */
  const saveAsDraft = React.useCallback(async (): Promise<number | undefined> => {
    try {
      const itemId = await storeSaveAsDraft();
      SPContext.logger.success('Draft saved', { itemId });
      return itemId;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      SPContext.logger.error('Failed to save draft', error);
      throw new Error(message);
    }
  }, [storeSaveAsDraft]);

  /**
   * Submit request (with validation)
   */
  const submitRequest = React.useCallback(async (): Promise<number | undefined> => {
    try {
      // Validate form first
      const isValid = await formValidation.validateForm();

      if (!isValid) {
        SPContext.logger.warn('Form validation failed on submit', {
          errors: form.formState.errors,
        });
        return undefined;
      }

      const itemId = await storeSubmitRequest();
      SPContext.logger.success('Request submitted', { itemId });
      return itemId;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      SPContext.logger.error('Failed to submit request', error);
      throw new Error(message);
    }
  }, [formValidation, form.formState.errors, storeSubmitRequest]);

  /**
   * Validate specific section
   */
  const validateSection = React.useCallback(
    async (section: 'requestInformation' | 'approvals'): Promise<boolean> => {
      const fields: Record<string, Array<keyof ILegalRequest>> = {
        requestInformation: [
          'requestType',
          'requestTitle',
          'purpose',
          'submissionType',
          'submissionItem',
          'targetReturnDate',
          'reviewAudience',
        ],
        approvals: ['requiresCommunicationsApproval', 'approvals'],
      };

      try {
        const sectionFields = fields[section];
        const results = await Promise.all(
          sectionFields.map(field =>
            formValidation.validateField(field as FieldPath<ILegalRequest>)
          )
        );

        return results.every((result: boolean) => result);
      } catch (error: unknown) {
        SPContext.logger.error('Section validation failed', error, { section });
        return false;
      }
    },
    [formValidation]
  );

  // Compute form validity
  const isFormValid = React.useMemo(() => {
    return form.formState.isValid && Object.keys(form.formState.errors).length === 0;
  }, [form.formState.isValid, form.formState.errors]);

  // Extract form errors as array
  const formErrors = React.useMemo(() => {
    return Object.keys(form.formState.errors)
      .map(key => form.formState.errors[key as keyof typeof form.formState.errors]?.message)
      .filter((msg): msg is string => Boolean(msg));
  }, [form.formState.errors]);

  // Can submit when form is valid and not saving
  const canSubmit = React.useMemo(() => {
    return isFormValid && !isSaving && isDirty;
  }, [isFormValid, isSaving, isDirty]);

  // Can save draft when dirty and not saving
  const canSaveDraft = React.useMemo(() => {
    return isDirty && !isSaving;
  }, [isDirty, isSaving]);

  return {
    currentRequest,
    isLoading,
    isSaving,
    isDirty,
    error,
    form: formValidation,
    isFormValid,
    formErrors,
    updateField,
    updateMultipleFields,
    saveAsDraft,
    submitRequest,
    revertChanges,
    validateSection,
    canSubmit,
    canSaveDraft,
  };
}

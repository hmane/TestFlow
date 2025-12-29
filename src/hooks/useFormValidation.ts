/**
 * Form validation hook using Zod schemas
 * Integrates with React Hook Form
 */

import { zodResolver } from '@hookform/resolvers/zod';
import * as React from 'react';
import { DefaultValues, FieldPath, FieldValues, useForm, UseFormReturn } from 'react-hook-form';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import type { z } from 'zod';

/**
 * Form validation hook options
 */
export interface IUseFormValidationOptions<T extends FieldValues> {
  schema: z.ZodSchema;
  defaultValues?: DefaultValues<T>;
  mode?: 'onSubmit' | 'onBlur' | 'onChange' | 'onTouched' | 'all';
  reValidateMode?: 'onBlur' | 'onChange' | 'onSubmit';
  shouldUnregister?: boolean;
}

/**
 * Form validation hook result
 */
export interface IUseFormValidationResult<T extends FieldValues> {
  form: UseFormReturn<T>;
  validateField: (fieldName: FieldPath<T>) => Promise<boolean>;
  validateForm: () => Promise<boolean>;
  getFieldError: (fieldName: FieldPath<T>) => string | undefined;
  hasFieldError: (fieldName: FieldPath<T>) => boolean;
  clearFieldError: (fieldName: FieldPath<T>) => void;
  isFieldDirty: (fieldName: FieldPath<T>) => boolean;
}

/**
 * Custom hook for form validation with Zod schemas
 * Provides enhanced validation methods for form fields
 */
export function useFormValidation<T extends FieldValues>(
  options: IUseFormValidationOptions<T>
): IUseFormValidationResult<T> {
  const {
    schema,
    defaultValues,
    mode = 'onSubmit',
    reValidateMode = 'onChange',
    shouldUnregister = false,
  } = options;

  // Initialize React Hook Form with Zod resolver
  // Note: Type assertion needed due to complex generic constraints between Zod and React Hook Form
  const form = useForm<T>({
    resolver: (zodResolver as (schema: z.ZodSchema) => any)(schema),
    defaultValues,
    mode,
    reValidateMode,
    shouldUnregister,
  });

  const { trigger, formState, clearErrors, getFieldState } = form;

  /**
   * Validate a single field
   */
  const validateField = React.useCallback(
    async (fieldName: FieldPath<T>): Promise<boolean> => {
      try {
        const result = await trigger(fieldName);
        SPContext.logger.info('Field validation', {
          field: String(fieldName),
          isValid: result,
        });
        return result;
      } catch (error: unknown) {
        SPContext.logger.error('Field validation failed', error, {
          field: String(fieldName),
        });
        return false;
      }
    },
    [trigger]
  );

  /**
   * Validate entire form
   */
  const validateForm = React.useCallback(async (): Promise<boolean> => {
    try {
      const result = await trigger();
      SPContext.logger.info('Form validation', {
        isValid: result,
        errorCount: Object.keys(formState.errors).length,
      });
      return result;
    } catch (error: unknown) {
      SPContext.logger.error('Form validation failed', error);
      return false;
    }
  }, [trigger, formState.errors]);

  /**
   * Get error message for a specific field
   */
  const getFieldError = React.useCallback(
    (fieldName: FieldPath<T>): string | undefined => {
      const error = formState.errors[fieldName];
      return error?.message as string | undefined;
    },
    [formState.errors]
  );

  /**
   * Check if field has error
   */
  const hasFieldError = React.useCallback(
    (fieldName: FieldPath<T>): boolean => {
      return Boolean(formState.errors[fieldName]);
    },
    [formState.errors]
  );

  /**
   * Clear error for a specific field
   */
  const clearFieldError = React.useCallback(
    (fieldName: FieldPath<T>): void => {
      clearErrors(fieldName);
    },
    [clearErrors]
  );

  /**
   * Check if field has been modified
   */
  const isFieldDirty = React.useCallback(
    (fieldName: FieldPath<T>): boolean => {
      const fieldState = getFieldState(fieldName);
      return fieldState.isDirty;
    },
    [getFieldState]
  );

  return {
    form: form as UseFormReturn<T>,
    validateField,
    validateForm,
    getFieldError,
    hasFieldError,
    clearFieldError,
    isFieldDirty,
  };
}

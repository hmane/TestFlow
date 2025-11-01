/**
 * Form-related types for React Hook Form and validation
 */

import type { Control, FieldErrors } from 'react-hook-form';
import type { ILegalRequest } from './requestTypes';
import type { RequestStatus } from './workflowTypes';

/**
 * Form mode - determines validation and field display
 */
export enum FormMode {
  Create = 'Create',
  Edit = 'Edit',
  View = 'View',
}

/**
 * Form section visibility configuration
 */
export interface IFormSectionConfig {
  requestInformation: boolean;
  approvals: boolean;
  legalIntake: boolean;
  legalReview: boolean;
  complianceReview: boolean;
  closeout: boolean;
}

/**
 * Form validation context
 */
export interface IFormValidationContext {
  mode: FormMode;
  status: RequestStatus;
  isSubmitting: boolean;
  isDirty: boolean;
  isValid: boolean;
}

/**
 * Form field configuration
 */
export interface IFormFieldConfig {
  name: string;
  label: string;
  required: boolean;
  visible: boolean;
  disabled: boolean;
  helpText?: string;
  placeholder?: string;
  validationRules?: Record<string, unknown>;
}

/**
 * Form submission result
 */
export interface IFormSubmissionResult {
  success: boolean;
  requestId?: number;
  requestNumber?: string;
  message?: string;
  errors?: string[];
}

/**
 * Form action buttons configuration
 */
export interface IFormActionConfig {
  saveDraft: boolean;
  submit: boolean;
  cancel: boolean;
  hold: boolean;
  resume: boolean;
  assignAttorney: boolean;
  sendToCommittee: boolean;
  submitReview: boolean;
  closeout: boolean;
}

/**
 * Form error message
 */
export interface IFormError {
  field: string;
  message: string;
  type?: string;
}

/**
 * Form state for Zustand store
 */
export interface IFormState {
  formMode: FormMode;
  currentRequest?: ILegalRequest;
  isDirty: boolean;
  isSubmitting: boolean;
  errors: IFormError[];
  sectionConfig: IFormSectionConfig;
  actionConfig: IFormActionConfig;
}

/**
 * Form props for main component
 */
export interface ILegalWorkflowFormProps {
  itemId?: number;
  formMode: FormMode;
  onSave: () => void;
  onClose: () => void;
}

/**
 * Section card props
 */
export interface ISectionCardProps {
  title: string;
  isExpanded: boolean;
  isRequired: boolean;
  isComplete: boolean;
  hasErrors: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

/**
 * Form item props for spfx-toolkit integration
 */
export interface IFormItemProps {
  name: string;
  label: string;
  isRequired?: boolean;
  helpText?: string;
  control: Control<ILegalRequest>;
  errors?: FieldErrors<ILegalRequest>;
  disabled?: boolean;
}

/**
 * Validation schema type for Zod
 */
export type ValidationSchema<T> = {
  parse: (data: unknown) => T;
  safeParse: (data: unknown) => { success: boolean; data?: T; error?: unknown };
};

/**
 * Form save options
 */
export interface IFormSaveOptions {
  asDraft?: boolean;
  validateBeforeSave?: boolean;
  showSuccessMessage?: boolean;
  redirectAfterSave?: boolean;
}

/**
 * Form field change event
 */
export interface IFieldChangeEvent<T = unknown> {
  field: string;
  value: T;
  previousValue?: T;
  timestamp: Date;
}

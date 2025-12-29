/**
 * RequestFormContext
 *
 * Provides form state and handlers to child components.
 * Used by RequestInfo to share control and handlers with
 * RequestApprovals and RequestActions components.
 */

import * as React from 'react';
import { Control, UseFormHandleSubmit } from 'react-hook-form';
import type { ILegalRequest } from '@appTypes/index';
import { RequestStatus } from '@appTypes/workflowTypes';

/**
 * Validation error interface
 */
export interface IValidationError {
  field: string;
  message: string;
}

/**
 * Context value interface
 */
export interface IRequestFormContextValue {
  // Form control
  control: Control<ILegalRequest>;

  // Form state
  isDirty: boolean;
  isLoading: boolean;
  itemId?: number;
  status?: RequestStatus;
  validationErrors: IValidationError[];

  // Form handlers
  handleSubmit: UseFormHandleSubmit<ILegalRequest>;
  onSubmit: (data: ILegalRequest) => void | Promise<void>;
  onSubmitDirect: () => void | Promise<void>; // Direct submit without RHF wrapper
  onSaveDraft: () => void | Promise<void>;
  onPutOnHold?: (reason: string) => void | Promise<void>;
  onCancelRequest?: (reason: string) => void | Promise<void>;
  onClose?: () => void;
  setValidationErrors: (errors: IValidationError[]) => void;
}

/**
 * Request Form Context
 */
export const RequestFormContext = React.createContext<IRequestFormContextValue | undefined>(
  undefined
);

/**
 * Hook to use RequestFormContext
 */
export const useRequestFormContext = (): IRequestFormContextValue => {
  const context = React.useContext(RequestFormContext);

  if (!context) {
    throw new Error('useRequestFormContext must be used within a RequestFormContext.Provider');
  }

  return context;
};

/**
 * Provider props
 */
export interface IRequestFormProviderProps {
  value: IRequestFormContextValue;
  children: React.ReactNode;
}

/**
 * Request Form Provider Component
 */
export const RequestFormProvider: React.FC<IRequestFormProviderProps> = ({ value, children }) => {
  return <RequestFormContext.Provider value={value}>{children}</RequestFormContext.Provider>;
};

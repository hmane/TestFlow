/**
 * WorkflowFormWrapper Component
 *
 * Provides RequestFormContext for workflow forms that need to render
 * RequestApprovals and RequestActions components. This wrapper loads
 * the request data and provides the context that these components expect.
 *
 * Used by workflow forms like LegalIntakeForm, LegalReviewForm, etc.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { RequestFormProvider, type IValidationError } from '../../../../contexts/RequestFormContext';
import { fullRequestSchema } from '../../../../schemas/requestSchema';
import { useRequestStore } from '../../../../stores/requestStore';
import type { ILegalRequest } from '../../../../types';

/**
 * Props for WorkflowFormWrapper
 */
export interface IWorkflowFormWrapperProps {
  /** Item ID for the request */
  itemId?: number;

  /** Children to render within the context */
  children: React.ReactNode;

  /** Custom submit handler for the workflow form */
  onSubmit?: (data: ILegalRequest) => void | Promise<void>;

  /** Custom save draft handler */
  onSaveDraft?: () => void | Promise<void>;

  /** Custom put on hold handler */
  onPutOnHold?: () => void | Promise<void>;

  /** Custom cancel handler */
  onCancelRequest?: () => void | Promise<void>;

  /** Custom close handler */
  onClose?: () => void;
}

/**
 * WorkflowFormWrapper Component
 */
export const WorkflowFormWrapper: React.FC<IWorkflowFormWrapperProps> = ({
  itemId,
  children,
  onSubmit: customOnSubmit,
  onSaveDraft: customOnSaveDraft,
  onPutOnHold: customOnPutOnHold,
  onCancelRequest: customOnCancelRequest,
  onClose: customOnClose,
}) => {
  const { currentRequest, isLoading: storeLoading } = useRequestStore();
  const [validationErrors, setValidationErrors] = React.useState<IValidationError[]>([]);

  // Set up form for the current request data
  const {
    control,
    handleSubmit,
    formState: { isDirty, isSubmitting },
    reset,
  } = useForm<ILegalRequest>({
    resolver: zodResolver(fullRequestSchema) as any, // Type assertion: schema validates subset of ILegalRequest fields
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: currentRequest || {},
  });

  // Update form when currentRequest changes
  React.useEffect(() => {
    if (currentRequest) {
      reset(currentRequest);
    }
  }, [currentRequest, reset]);

  // Default handlers that can be overridden
  const handleDefaultSubmit = React.useCallback(
    async (data: ILegalRequest): Promise<void> => {
      if (customOnSubmit) {
        await customOnSubmit(data);
      } else {
        console.warn('WorkflowFormWrapper: No submit handler provided');
      }
    },
    [customOnSubmit]
  );

  const handleDefaultSaveDraft = React.useCallback(async (): Promise<void> => {
    if (customOnSaveDraft) {
      await customOnSaveDraft();
    } else {
      console.warn('WorkflowFormWrapper: No save draft handler provided');
    }
  }, [customOnSaveDraft]);

  const handleDefaultPutOnHold = React.useCallback(async (): Promise<void> => {
    if (customOnPutOnHold) {
      await customOnPutOnHold();
    } else {
      console.warn('WorkflowFormWrapper: No put on hold handler provided');
    }
  }, [customOnPutOnHold]);

  const handleDefaultCancelRequest = React.useCallback(async (): Promise<void> => {
    if (customOnCancelRequest) {
      await customOnCancelRequest();
    } else {
      console.warn('WorkflowFormWrapper: No cancel request handler provided');
    }
  }, [customOnCancelRequest]);

  const handleDefaultClose = React.useCallback((): void => {
    if (customOnClose) {
      customOnClose();
    } else {
      // Default close behavior
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.close();
      }
    }
  }, [customOnClose]);

  // Create context value
  const contextValue = React.useMemo(
    () => ({
      control,
      isDirty,
      isLoading: storeLoading || isSubmitting,
      itemId,
      status: currentRequest?.status,
      validationErrors,
      handleSubmit,
      onSubmit: handleDefaultSubmit,
      onSaveDraft: handleDefaultSaveDraft,
      onPutOnHold: handleDefaultPutOnHold,
      onCancelRequest: handleDefaultCancelRequest,
      onClose: handleDefaultClose,
      setValidationErrors,
    }),
    [
      control,
      isDirty,
      storeLoading,
      isSubmitting,
      itemId,
      currentRequest?.status,
      validationErrors,
      handleSubmit,
      handleDefaultSubmit,
      handleDefaultSaveDraft,
      handleDefaultPutOnHold,
      handleDefaultCancelRequest,
      handleDefaultClose,
    ]
  );

  return <RequestFormProvider value={contextValue}>{children}</RequestFormProvider>;
};

export default WorkflowFormWrapper;

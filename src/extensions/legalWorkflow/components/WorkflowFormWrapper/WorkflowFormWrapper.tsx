/**
 * WorkflowFormWrapper Component
 *
 * Provides RequestFormContext for workflow forms that need to render
 * RequestApprovals and RequestActions components. This wrapper loads
 * the request data and provides the context that these components expect.
 *
 * Used by workflow forms like LegalIntakeForm, LegalReviewForm, etc.
 */

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// spfx-toolkit - tree-shaken imports
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

// App imports using path aliases
import { RequestFormProvider, type IValidationError } from '@contexts/RequestFormContext';
import { fullRequestSchema } from '@schemas/requestSchema';
import { useRequestStore } from '@stores/requestStore';
import { useShallow } from 'zustand/react/shallow';
import type { ILegalRequest } from '@appTypes/index';

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

  /** Custom put on hold handler (receives reason from dialog) */
  onPutOnHold?: (reason: string) => void | Promise<void>;

  /** Custom cancel handler (receives reason from dialog) */
  onCancelRequest?: (reason: string) => void | Promise<void>;

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
  const { currentRequest, isLoading: storeLoading } = useRequestStore(
    useShallow((s) => ({
      currentRequest: s.currentRequest,
      isLoading: s.isLoading,
    }))
  );
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
        SPContext.logger.warn('WorkflowFormWrapper: No submit handler provided');
      }
    },
    [customOnSubmit]
  );

  // Direct submit handler (bypasses RHF's handleSubmit wrapper)
  const handleDefaultSubmitDirect = React.useCallback(async (): Promise<void> => {
    if (customOnSubmit) {
      // Get current form values and pass to submit handler
      const data = currentRequest as ILegalRequest;
      await customOnSubmit(data);
    } else {
      SPContext.logger.warn('WorkflowFormWrapper: No submit handler provided');
    }
  }, [customOnSubmit, currentRequest]);

  const handleDefaultSaveDraft = React.useCallback(async (): Promise<void> => {
    if (customOnSaveDraft) {
      await customOnSaveDraft();
    } else {
      SPContext.logger.warn('WorkflowFormWrapper: No save draft handler provided');
    }
  }, [customOnSaveDraft]);

  const handleDefaultPutOnHold = React.useCallback(async (reason: string): Promise<void> => {
    if (customOnPutOnHold) {
      await customOnPutOnHold(reason);
    } else {
      // Default: use store's holdRequest
      const { holdRequest } = useRequestStore.getState();
      await holdRequest(reason);
      SPContext.logger.success('WorkflowFormWrapper: Request put on hold');
    }
  }, [customOnPutOnHold]);

  const handleDefaultCancelRequest = React.useCallback(async (reason: string): Promise<void> => {
    if (customOnCancelRequest) {
      await customOnCancelRequest(reason);
    } else {
      // Default: use store's cancelRequest
      const { cancelRequest } = useRequestStore.getState();
      await cancelRequest(reason);
      SPContext.logger.success('WorkflowFormWrapper: Request cancelled');
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
      onSubmitDirect: handleDefaultSubmitDirect,
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
      handleDefaultSubmitDirect,
      handleDefaultSaveDraft,
      handleDefaultPutOnHold,
      handleDefaultCancelRequest,
      handleDefaultClose,
    ]
  );

  return <RequestFormProvider value={contextValue}>{children}</RequestFormProvider>;
};

export default WorkflowFormWrapper;

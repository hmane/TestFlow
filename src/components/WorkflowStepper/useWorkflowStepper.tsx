/**
 * Custom hook for using WorkflowStepper in the application
 * Wraps spfx-toolkit WorkflowStepper with application-specific logic
 *
 * OPTIMIZATION: Uses LazyWorkflowStepper for better bundle size (~77-117KB savings)
 */

import * as React from 'react';
import { LazyWorkflowStepper } from 'spfx-toolkit/lib/components/lazy';
import type { StepData } from 'spfx-toolkit/lib/components/WorkflowStepper/types';
import { RequestType } from '../../types';
import { getStepsForStepper } from './workflowStepConfig';
import type { IWorkflowStepperProps } from './WorkflowStepperTypes';

/**
 * Hook result
 */
export interface IUseWorkflowStepperResult {
  /**
   * Render the workflow stepper component
   */
  renderStepper: () => React.ReactElement;

  /**
   * Steps data in toolkit format
   */
  steps: StepData[];

  /**
   * Currently selected step (if any)
   */
  selectedStep: StepData | undefined;

  /**
   * Set the selected step
   */
  setSelectedStep: (stepId: string | undefined) => void;
}

/**
 * Custom hook for workflow stepper
 * Provides easy integration with spfx-toolkit WorkflowStepper
 */
export function useWorkflowStepper(props: IWorkflowStepperProps): IUseWorkflowStepperResult {
  const { mode, requestType, currentStatus, onStepClick, className } = props;

  // Get steps in toolkit format
  const steps = React.useMemo(() => {
    return getStepsForStepper(requestType, currentStatus, mode);
  }, [requestType, currentStatus, mode]);

  // Track selected step
  const [selectedStepId, setSelectedStepId] = React.useState<string | undefined>(undefined);

  // Get selected step object
  const selectedStep = React.useMemo(() => {
    if (!selectedStepId) return undefined;
    for (const step of steps) {
      if (step.id === selectedStepId) {
        return step;
      }
    }
    return undefined;
  }, [selectedStepId, steps]);

  /**
   * Handle step click
   */
  const handleStepClick = React.useCallback(
    (step: StepData): void => {
      setSelectedStepId(step.id);

      // Call parent handler if provided
      if (onStepClick) {
        onStepClick(step);
      }
    },
    [onStepClick]
  );

  /**
   * Set selected step by ID
   */
  const setSelectedStep = React.useCallback((stepId: string | undefined): void => {
    setSelectedStepId(stepId);
  }, []);

  /**
   * Render the stepper component
   * Using LazyWorkflowStepper for optimized bundle size
   */
  const renderStepper = React.useCallback((): React.ReactElement => {
    // Map app mode to toolkit mode
    const stepperMode = mode === 'informational' ? 'fullSteps' : 'progress';

    return React.createElement(LazyWorkflowStepper, {
      steps,
      mode: stepperMode,
      selectedStepId,
      onStepClick: handleStepClick,
      className,
      showScrollHint: true,
    });
  }, [steps, mode, selectedStepId, handleStepClick, className]);

  return {
    renderStepper,
    steps,
    selectedStep,
    setSelectedStep,
  };
}

/**
 * Example usage component (for reference)
 */
export const WorkflowStepperExample: React.FC<{
  requestType: RequestType;
  currentStatus?: any;
}> = ({ requestType, currentStatus }) => {
  const { renderStepper, selectedStep } = useWorkflowStepper({
    mode: currentStatus ? 'progress' : 'informational',
    requestType,
    currentStatus,
    onStepClick: (step) => {
      console.log('Step clicked:', step.id);
    },
  });

  return React.createElement(
    'div',
    null,
    renderStepper(),
    selectedStep &&
      React.createElement(
        'div',
        { style: { marginTop: '20px', padding: '16px', border: '1px solid #ddd' } },
        React.createElement('h3', null, 'Selected Step'),
        React.createElement('p', null, selectedStep.title)
      )
  );
};

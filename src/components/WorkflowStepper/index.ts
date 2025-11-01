/**
 * WorkflowStepper exports
 * Uses spfx-toolkit WorkflowStepper component with application-specific configuration
 */

// Re-export toolkit WorkflowStepper component
export { WorkflowStepper } from 'spfx-toolkit/lib/components/WorkflowStepper';

// Export types
export type {
  StepData,
  StepStatus,
  StepperMode,
  WorkflowStepperProps,
} from 'spfx-toolkit/lib/components/WorkflowStepper/types';

// Export application-specific types
export type {
  IWorkflowStep,
  IStepContent,
  AppStepperMode,
  IWorkflowStepperProps,
  IStepConfiguration,
} from './WorkflowStepperTypes';

// Export configuration functions
export { getWorkflowSteps, getStepsForStepper } from './workflowStepConfig';

// Export custom hook
export { useWorkflowStepper, WorkflowStepperExample } from './useWorkflowStepper';
export type { IUseWorkflowStepperResult } from './useWorkflowStepper';

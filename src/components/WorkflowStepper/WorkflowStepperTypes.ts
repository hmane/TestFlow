/**
 * Workflow stepper types and interfaces
 * Uses spfx-toolkit WorkflowStepper component types
 */

import type { StepData, StepStatus, StepperMode } from 'spfx-toolkit/lib/components/WorkflowStepper/types';
import type { RequestStatus, RequestType } from '../../types';

// Re-export toolkit types for convenience
export type { StepData, StepStatus, StepperMode };

/**
 * Application-specific workflow step with business context
 */
export interface IWorkflowStep {
  key: string;
  label: string;
  description: string;
  requestStatus: RequestStatus;
  isOptional: boolean;
  content?: IStepContent;
  order: number;
}

/**
 * Step content for informational display
 */
export interface IStepContent {
  title: string;
  description: string;
  details: string[];
  tips?: string[];
  estimatedDuration?: string;
  requiredFields?: string[];
  whoIsInvolved?: string[];
}

/**
 * Application stepper mode
 */
export type AppStepperMode = 'informational' | 'progress';

/**
 * Application workflow stepper props
 */
export interface IWorkflowStepperProps {
  mode: AppStepperMode;
  requestType: RequestType;
  currentStatus?: RequestStatus;
  onStepClick?: (step: StepData) => void;
  className?: string;
}

/**
 * Step configuration for different request types
 */
export interface IStepConfiguration {
  requestType: RequestType;
  steps: IWorkflowStep[];
}

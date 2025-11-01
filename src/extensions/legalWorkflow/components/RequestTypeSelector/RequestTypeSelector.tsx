/**
 * RequestTypeSelector Component
 *
 * First-time selection screen for new requests. Users select the request type
 * before proceeding to the full request form.
 *
 * Features:
 * - Displays available request types with descriptions
 * - Shows workflow stepper in informational mode (after type selected)
 * - Workflow steps are clickable to view details
 * - Continue button locks the request type selection
 * - Validates selection before continuing
 * - Integration with request store
 * - Dynamically loads DevExtreme CSS from CDN
 */

import {
  DefaultButton,
  MessageBar,
  MessageBarType,
  PrimaryButton,
  Stack,
  Text,
} from '@fluentui/react';
import * as React from 'react';
import { Card } from 'spfx-toolkit/lib/components/Card';
import { useWorkflowStepper } from '../../../../components/WorkflowStepper/useWorkflowStepper';
import { useRequestStore } from '../../../../stores/requestStore';
import { RequestType } from '../../../../types/requestTypes';
import './RequestTypeSelector.scss';

/**
 * Shared styles to prevent re-creation on every render
 */
const WORKFLOW_PREVIEW_CONTAINER_STYLE: React.CSSProperties = {
  backgroundColor: '#f3f2f1',
  borderRadius: '4px',
  padding: '20px',
  border: '1px solid #edebe9',
};

const EMPTY_STATE_CONTAINER_STYLE: React.CSSProperties = {
  backgroundColor: '#f3f2f1',
  borderRadius: '4px',
  padding: '40px 20px',
  border: '1px solid #edebe9',
  textAlign: 'center',
};

const EMPTY_STATE_ICON_STYLE: React.CSSProperties = {
  fontSize: '48px',
  color: '#d2d0ce',
  marginBottom: '16px',
};

const CARDS_CONTAINER_STYLE: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  flexWrap: 'wrap',
};

/**
 * Fluent UI tokens and styles to prevent re-creation
 */
const CARD_STACK_TOKENS = { childrenGap: 8 };
const CARD_STACK_STYLES = { root: { padding: '16px', height: '100%' } };
const CARD_HEADER_TOKENS = { childrenGap: 10 };
const CARD_TITLE_STYLES = { root: { fontWeight: 600 as const, flex: 1, minWidth: 0 } };
const CARD_DESC_STYLES = { root: { color: '#605e5c', lineHeight: '1.4' } };
const MAIN_STACK_TOKENS = { childrenGap: 20 };
const MAIN_STACK_STYLES = { root: { padding: '20px', maxWidth: '1400px', margin: '0 auto' } };
const HEADER_STACK_TOKENS = { childrenGap: 4 };
const HEADER_TITLE_STYLES = { root: { fontWeight: 600 as const } };
const HEADER_DESC_STYLES = { root: { color: '#605e5c' } };
const PREVIEW_SECTION_TOKENS = { childrenGap: 8 };
const PREVIEW_SECTION_STYLES = { root: { marginBottom: '20px' } };
const PREVIEW_HEADER_TOKENS = { childrenGap: 8 };
const PREVIEW_TITLE_STYLES = { root: { fontWeight: 600 as const, color: '#323130' } };
const PREVIEW_DESC_STYLES = { root: { color: '#605e5c' } };
const EMPTY_TEXT_STYLES = { root: { color: '#a19f9d', display: 'block' } };
const BUTTON_STACK_TOKENS = { childrenGap: 12 };
const BUTTON_STYLES = { root: { minWidth: '120px' } };

/**
 * WorkflowStepperPreview Component - Shows the workflow stepper with built-in step details
 */
interface IWorkflowStepperPreviewProps {
  requestType: RequestType;
}

const WorkflowStepperPreview: React.FC<IWorkflowStepperPreviewProps> = ({ requestType }) => {
  const { renderStepper, setSelectedStep, steps } = useWorkflowStepper({
    requestType,
    currentStatus: undefined,
    mode: 'informational',
    onStepClick: () => {}, // Hook manages selection internally
  });

  /**
   * Reset to first step when request type changes
   * Only depend on requestType, not on steps array
   */
  React.useEffect(() => {
    if (steps && steps.length > 0) {
      setSelectedStep(steps[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestType]); // Only when requestType changes

  return <div>{renderStepper()}</div>;
};

/**
 * Request type option with description
 */
interface IRequestTypeOption {
  type: RequestType;
  title: string;
  description: string;
  icon: string;
  examples: string[];
  isDisabled?: boolean; // For Phase 2 features
}

/**
 * Request type options configuration
 */
const REQUEST_TYPE_OPTIONS: IRequestTypeOption[] = [
  {
    type: RequestType.Communication,
    title: 'Communication',
    description:
      'Review of external communications, marketing materials, presentations, and public-facing content.',
    icon: 'Chat',
    examples: [
      'Marketing materials',
      'Client presentations',
      'Website content',
      'Social media posts',
      'Email campaigns',
    ],
    isDisabled: false,
  },
  {
    type: RequestType.GeneralReview,
    title: 'General Review (Coming Soon)',
    description:
      'General legal review of documents, contracts, agreements, and other legal matters. Available in Phase 2.',
    icon: 'DocumentApproval',
    examples: ['Contracts and agreements', 'Legal documents', 'Policy reviews'],
    isDisabled: true,
  },
  {
    type: RequestType.IMAReview,
    title: 'IMA Review (Coming Soon)',
    description:
      'Investment Management Agreement (IMA) review for institutional clients. Available in Phase 2.',
    icon: 'FileCode',
    examples: ['Investment Management Agreements', 'Institutional client agreements'],
    isDisabled: true,
  },
];

/**
 * RequestTypeCard Component - Individual request type option card
 */
interface IRequestTypeCardProps {
  option: IRequestTypeOption;
  isSelected: boolean;
  onSelect: (type: RequestType) => void;
}

const RequestTypeCard: React.FC<IRequestTypeCardProps> = React.memo(
  ({ option, isSelected, onSelect }) => {
    const isDisabled = option.isDisabled || false;

    const handleClick = React.useCallback((): void => {
      if (!isDisabled) {
        onSelect(option.type);
      }
    }, [option.type, onSelect, isDisabled]);

    const cardWrapperStyle = React.useMemo(
      (): React.CSSProperties => ({
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        border: isSelected ? '2px solid #0078d4' : '1px solid #d2d0ce',
        backgroundColor: isDisabled ? '#faf9f8' : isSelected ? '#f3f9fd' : '#ffffff',
        transition: 'all 0.2s ease',
        borderRadius: '4px',
        opacity: isDisabled ? 0.6 : 1,
        flex: 1,
        minWidth: 0,
      }),
      [isDisabled, isSelected]
    );

    const iconContainerStyle = React.useMemo(
      (): React.CSSProperties => ({
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        backgroundColor: isDisabled ? '#e1dfdd' : isSelected ? '#0078d4' : '#f3f2f1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }),
      [isDisabled, isSelected]
    );

    const iconStyle = React.useMemo(
      (): React.CSSProperties => ({
        fontSize: '16px',
        color: isDisabled ? '#a19f9d' : isSelected ? '#ffffff' : '#605e5c',
      }),
      [isDisabled, isSelected]
    );

    return (
      <div onClick={handleClick} style={cardWrapperStyle}>
        <Card
          id={`request-type-${option.type}`}
          className={`request-type-card ${isSelected ? 'request-type-card--selected' : ''} ${
            isDisabled ? 'request-type-card--disabled' : ''
          }`}
        >
          <Stack tokens={CARD_STACK_TOKENS} styles={CARD_STACK_STYLES}>
            {/* Icon and title */}
            <Stack horizontal verticalAlign='center' tokens={CARD_HEADER_TOKENS}>
              <div style={iconContainerStyle}>
                <i className={`ms-Icon ms-Icon--${option.icon}`} style={iconStyle} />
              </div>
              <Text variant='medium' styles={CARD_TITLE_STYLES}>
                {option.title}
              </Text>
              {isSelected && !isDisabled && (
                <i
                  className='ms-Icon ms-Icon--CheckMark'
                  style={{ fontSize: '14px', color: '#107c10', flexShrink: 0 }}
                />
              )}
              {isDisabled && (
                <i
                  className='ms-Icon ms-Icon--Lock'
                  style={{ fontSize: '12px', color: '#a19f9d', flexShrink: 0 }}
                />
              )}
            </Stack>

            {/* Description - compact */}
            <Text variant='small' styles={CARD_DESC_STYLES}>
              {option.description}
            </Text>
          </Stack>
        </Card>
      </div>
    );
  }
);

/**
 * RequestTypeSelector props
 */
export interface IRequestTypeSelectorProps {
  /** Callback when user clicks Continue */
  onContinue: (requestType: RequestType) => void;

  /** Callback when user clicks Cancel */
  onCancel?: () => void;

  /** Custom CSS class */
  className?: string;

  /** Show cancel button */
  showCancel?: boolean;
}

/**
 * RequestTypeSelector Component
 */
export const RequestTypeSelector: React.FC<IRequestTypeSelectorProps> = ({
  onContinue,
  onCancel,
  className,
  showCancel = false,
}) => {
  const [selectedType, setSelectedType] = React.useState<RequestType | undefined>(undefined);
  const [showError, setShowError] = React.useState<boolean>(false);
  const { updateField } = useRequestStore();

  /**
   * Handle request type selection
   */
  const handleSelectType = React.useCallback((type: RequestType): void => {
    setSelectedType(type);
    setShowError(false);
  }, []);

  /**
   * Handle continue button click - locks the request type
   */
  const handleContinue = React.useCallback((): void => {
    if (!selectedType) {
      setShowError(true);
      return;
    }

    // Update request store
    updateField('requestType', selectedType);

    // Call parent callback (this will lock the selection and show the form)
    onContinue(selectedType);
  }, [selectedType, updateField, onContinue]);

  /**
   * Handle cancel button click
   */
  const handleCancel = React.useCallback((): void => {
    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);

  return (
    <div className={`request-type-selector ${className || ''}`}>
      <Stack tokens={MAIN_STACK_TOKENS} styles={MAIN_STACK_STYLES}>
        {/* Header */}
        <Stack tokens={HEADER_STACK_TOKENS}>
          <Text variant='xxLarge' styles={HEADER_TITLE_STYLES}>
            Select Request Type
          </Text>
          <Text variant='medium' styles={HEADER_DESC_STYLES}>
            Choose a request type, review the workflow, then click Continue.
          </Text>
        </Stack>

        {/* Error message */}
        {showError && (
          <MessageBar
            messageBarType={MessageBarType.error}
            isMultiline={false}
            onDismiss={() => setShowError(false)}
          >
            Please select a request type to continue.
          </MessageBar>
        )}

        {/* Request Type Cards - Horizontal */}
        <div style={CARDS_CONTAINER_STYLE}>
          {REQUEST_TYPE_OPTIONS.map(option => (
            <RequestTypeCard
              key={option.type}
              option={option}
              isSelected={selectedType === option.type}
              onSelect={handleSelectType}
            />
          ))}
        </div>

        {/* Workflow Preview */}
        {selectedType ? (
          <div style={WORKFLOW_PREVIEW_CONTAINER_STYLE}>
            <Stack tokens={PREVIEW_SECTION_TOKENS} styles={PREVIEW_SECTION_STYLES}>
              <Stack horizontal verticalAlign='center' tokens={PREVIEW_HEADER_TOKENS}>
                <i
                  className='ms-Icon ms-Icon--Flow'
                  style={{ fontSize: '20px', color: '#0078d4' }}
                />
                <Text variant='xLarge' styles={PREVIEW_TITLE_STYLES}>
                  Workflow Preview
                </Text>
              </Stack>
              <Text variant='small' styles={PREVIEW_DESC_STYLES}>
                Click on each step to view details about what happens at that stage
              </Text>
            </Stack>
            <WorkflowStepperPreview requestType={selectedType} />
          </div>
        ) : (
          <div style={EMPTY_STATE_CONTAINER_STYLE}>
            <i className='ms-Icon ms-Icon--Flow' style={EMPTY_STATE_ICON_STYLE} />
            <Text variant='large' styles={EMPTY_TEXT_STYLES}>
              Select a request type above to preview the workflow
            </Text>
          </div>
        )}

        {/* Action Buttons */}
        <Stack horizontal tokens={BUTTON_STACK_TOKENS} horizontalAlign='start'>
          <PrimaryButton
            text='Continue'
            iconProps={{ iconName: 'Forward' }}
            onClick={handleContinue}
            disabled={!selectedType}
            styles={BUTTON_STYLES}
          />
          {showCancel && (
            <DefaultButton
              text='Cancel'
              iconProps={{ iconName: 'Cancel' }}
              onClick={handleCancel}
              styles={BUTTON_STYLES}
            />
          )}
        </Stack>
      </Stack>
    </div>
  );
};

export default RequestTypeSelector;

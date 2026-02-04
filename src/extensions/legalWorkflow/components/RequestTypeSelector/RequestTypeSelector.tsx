/**
 * RequestTypeSelector Component
 *
 * Enhanced first-time selection screen for new requests with a refined,
 * professional aesthetic. Users select the request type before proceeding
 * to the full request form.
 *
 * Features:
 * - Elegant card-based selection with sophisticated hover states
 * - Smooth animations and micro-interactions
 * - Premium visual design with depth and layering
 * - Workflow preview with refined styling
 * - Accessibility-compliant interactive elements
 */

import * as React from 'react';

// Fluent UI - tree-shaken imports
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { Icon } from '@fluentui/react/lib/Icon';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';

// App imports using path aliases
import { useWorkflowStepper } from '@components/WorkflowStepper/useWorkflowStepper';
import { useRequestStore } from '@stores/requestStore';
import { RequestType } from '@appTypes/requestTypes';

import './RequestTypeSelector.scss';

// CSS class prefix for BEM naming
const CSS_PREFIX = 'rts';

/**
 * Request type option configuration
 */
interface IRequestTypeOption {
  type: RequestType;
  title: string;
  shortTitle: string;
  description: string;
  icon: string;
  accentColor: string;
  features: string[];
  isDisabled?: boolean;
}

/**
 * External application link configuration
 */
interface IExternalAppOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  url: string;
  accentColor: string;
}

/**
 * Vendor Management request types - external links
 */
const VENDOR_MANAGEMENT_OPTIONS: IExternalAppOption[] = [
  {
    id: 'vm-nda',
    title: 'NDA',
    description: 'Non-Disclosure Agreement request',
    icon: 'ProtectedDocument',
    url: '/sites/vendor-management/Lists/Requests/NewForm.aspx?RequestType=NDA',
    accentColor: '#0e7c86',
  },
  {
    id: 'vm-new',
    title: 'New Vendor',
    description: 'Onboard a new vendor',
    icon: 'AddFriend',
    url: '/sites/vendor-management/Lists/Requests/NewForm.aspx?RequestType=New',
    accentColor: '#0e7c86',
  },
  {
    id: 'vm-amendment',
    title: 'Amendment',
    description: 'Modify existing vendor agreement',
    icon: 'PageEdit',
    url: '/sites/vendor-management/Lists/Requests/NewForm.aspx?RequestType=Amendment',
    accentColor: '#0e7c86',
  },
  {
    id: 'vm-notification',
    title: 'Notification',
    description: 'Vendor status notification',
    icon: 'Ringer',
    url: '/sites/vendor-management/Lists/Requests/NewForm.aspx?RequestType=Notification',
    accentColor: '#0e7c86',
  },
];

/**
 * Request type options with rich metadata
 */
const REQUEST_TYPE_OPTIONS: IRequestTypeOption[] = [
  {
    type: RequestType.Communication,
    title: 'Communication Review',
    shortTitle: 'Communication',
    description: 'External communications, marketing materials, presentations, and public-facing content requiring legal and compliance review.',
    icon: 'Chat',
    accentColor: '#2563eb',
    features: [
      'Marketing materials',
      'Client presentations',
      'Website & social content',
      'Email campaigns',
    ],
    isDisabled: false,
  },
  {
    type: RequestType.GeneralReview,
    title: 'General Review',
    shortTitle: 'General',
    description: 'General legal review of documents, contracts, agreements, and other legal matters requiring attorney oversight.',
    icon: 'DocumentApproval',
    accentColor: '#7c3aed',
    features: [
      'Contracts & agreements',
      'Legal documents',
      'Policy reviews',
    ],
    isDisabled: true,
  },
  {
    type: RequestType.IMAReview,
    title: 'IMA Review',
    shortTitle: 'IMA',
    description: 'Investment Management Agreement review for institutional clients requiring specialized compliance review.',
    icon: 'FileCode',
    accentColor: '#059669',
    features: [
      'Investment agreements',
      'Institutional contracts',
    ],
    isDisabled: true,
  },
];

/**
 * WorkflowStepperPreview - Shows workflow with elegant styling
 */
interface IWorkflowStepperPreviewProps {
  requestType: RequestType;
}

const WorkflowStepperPreview: React.FC<IWorkflowStepperPreviewProps> = ({ requestType }) => {
  const { renderStepper, setSelectedStep, steps } = useWorkflowStepper({
    requestType,
    currentStatus: undefined,
    mode: 'informational',
    onStepClick: () => {},
  });

  React.useEffect(() => {
    if (steps && steps.length > 0) {
      setSelectedStep(steps[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestType]);

  return <div className={`${CSS_PREFIX}__workflow-stepper-content`}>{renderStepper()}</div>;
};

/**
 * RequestTypeCard - Elegant selectable card with animations
 */
interface IRequestTypeCardProps {
  option: IRequestTypeOption;
  isSelected: boolean;
  onSelect: (type: RequestType) => void;
  index: number;
}

/**
 * ExternalAppCard - Card for external application links
 */
interface IExternalAppCardProps {
  option: IExternalAppOption;
  index: number;
}

const ExternalAppCard: React.FC<IExternalAppCardProps> = React.memo(
  ({ option, index }) => {
    const handleClick = React.useCallback((): void => {
      window.open(option.url, '_blank', 'noopener,noreferrer');
    }, [option.url]);

    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent): void => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          window.open(option.url, '_blank', 'noopener,noreferrer');
        }
      },
      [option.url]
    );

    return (
      <div
        className={`${CSS_PREFIX}__external-card`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="link"
        tabIndex={0}
        aria-label={`${option.title} - Opens in new tab`}
        style={{
          '--accent-color': option.accentColor,
          '--animation-delay': `${index * 80}ms`,
        } as React.CSSProperties}
      >
        <div className={`${CSS_PREFIX}__external-card-icon`}>
          <Icon iconName={option.icon} />
        </div>
        <div className={`${CSS_PREFIX}__external-card-content`}>
          <div className={`${CSS_PREFIX}__external-card-title`}>
            {option.title}
            <Icon iconName="OpenInNewTab" className={`${CSS_PREFIX}__external-link-icon`} />
          </div>
          <p className={`${CSS_PREFIX}__external-card-description`}>{option.description}</p>
        </div>
      </div>
    );
  }
);

const RequestTypeCard: React.FC<IRequestTypeCardProps> = React.memo(
  ({ option, isSelected, onSelect, index }) => {
    const isDisabled = option.isDisabled || false;
    const cardRef = React.useRef<HTMLDivElement>(null);

    const handleClick = React.useCallback((): void => {
      if (!isDisabled) {
        onSelect(option.type);
      }
    }, [option.type, onSelect, isDisabled]);

    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent): void => {
        if ((e.key === 'Enter' || e.key === ' ') && !isDisabled) {
          e.preventDefault();
          onSelect(option.type);
        }
      },
      [option.type, onSelect, isDisabled]
    );

    const cardClasses = [
      `${CSS_PREFIX}__card`,
      isSelected ? `${CSS_PREFIX}__card--selected` : '',
      isDisabled ? `${CSS_PREFIX}__card--disabled` : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div
        ref={cardRef}
        className={cardClasses}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={isDisabled ? -1 : 0}
        aria-pressed={isSelected}
        aria-disabled={isDisabled}
        aria-label={`Select ${option.title}${isDisabled ? ' (Coming Soon)' : ''}`}
        style={{
          '--accent-color': option.accentColor,
          '--animation-delay': `${index * 100}ms`,
        } as React.CSSProperties}
      >
        {/* Card content */}
        <div className={`${CSS_PREFIX}__card-content`}>
          {/* Header with title and selection indicator */}
          <div className={`${CSS_PREFIX}__card-header`}>
            <div className={`${CSS_PREFIX}__title-section`}>
              <h3 className={`${CSS_PREFIX}__card-title`}>{option.shortTitle}</h3>
              {isDisabled && (
                <span className={`${CSS_PREFIX}__coming-soon-badge`}>Coming Soon</span>
              )}
            </div>
            {isSelected && !isDisabled && (
              <div className={`${CSS_PREFIX}__selected-indicator`}>
                <Icon iconName="CheckMark" />
              </div>
            )}
          </div>

          {/* Description */}
          <p className={`${CSS_PREFIX}__card-description`}>{option.description}</p>
        </div>
      </div>
    );
  }
);

/**
 * RequestTypeSelector props
 */
export interface IRequestTypeSelectorProps {
  onContinue: (requestType: RequestType) => void;
  onCancel?: () => void;
  className?: string;
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
  const [isAnimatingOut, setIsAnimatingOut] = React.useState<boolean>(false);
  const updateField = useRequestStore((s) => s.updateField);
  // Ref for tracking setTimeout IDs to prevent memory leaks
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup pending timeout on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleSelectType = React.useCallback((type: RequestType): void => {
    setSelectedType(type);
    setShowError(false);
  }, []);

  const handleContinue = React.useCallback((): void => {
    if (!selectedType) {
      setShowError(true);
      return;
    }

    setIsAnimatingOut(true);
    updateField('requestType', selectedType);

    // Small delay for exit animation
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      onContinue(selectedType);
    }, 300);
  }, [selectedType, updateField, onContinue]);

  const handleCancel = React.useCallback((): void => {
    if (onCancel) {
      setIsAnimatingOut(true);
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        onCancel();
      }, 200);
    }
  }, [onCancel]);

  const containerClasses = [
    CSS_PREFIX,
    isAnimatingOut ? `${CSS_PREFIX}--animating-out` : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  // Find selected option for hint text
  const selectedOption = selectedType
    ? REQUEST_TYPE_OPTIONS.filter((o: IRequestTypeOption) => o.type === selectedType)[0]
    : undefined;

  return (
    <div className={containerClasses}>
      {/* Decorative background elements */}
      <div className={`${CSS_PREFIX}__bg-decoration`}>
        <div className={`${CSS_PREFIX}__gradient-orb-1`} />
        <div className={`${CSS_PREFIX}__gradient-orb-2`} />
        <div className={`${CSS_PREFIX}__grid-pattern`} />
      </div>

      <div className={`${CSS_PREFIX}__content-wrapper`}>
        {/* Header section */}
        <header className={`${CSS_PREFIX}__header`}>
          <h1 className={`${CSS_PREFIX}__title`}>New Request</h1>
          <p className={`${CSS_PREFIX}__subtitle`}>
            Select a request type to begin.
          </p>
        </header>

        {/* Error message */}
        {showError && (
          <div className={`${CSS_PREFIX}__error-container`}>
            <MessageBar
              messageBarType={MessageBarType.error}
              isMultiline={false}
              onDismiss={() => setShowError(false)}
              dismissButtonAriaLabel="Close"
            >
              Please select a request type to continue.
            </MessageBar>
          </div>
        )}

        {/* Section label for Legal Workflow */}
        <div className={`${CSS_PREFIX}__section-label`}>
          <div className={`${CSS_PREFIX}__section-label-line`} />
          <span className={`${CSS_PREFIX}__section-label-text`}>
            <Icon iconName="ComplianceAudit" />
            Legal Review System
          </span>
          <div className={`${CSS_PREFIX}__section-label-line`} />
        </div>

        {/* Request type cards grid */}
        <div className={`${CSS_PREFIX}__cards-grid`}>
          {REQUEST_TYPE_OPTIONS.map((option: IRequestTypeOption, index: number) => (
            <RequestTypeCard
              key={option.type}
              option={option}
              isSelected={selectedType === option.type}
              onSelect={handleSelectType}
              index={index}
            />
          ))}
        </div>

        {/* Vendor Management Section */}
        <div className={`${CSS_PREFIX}__external-section`}>
          <div className={`${CSS_PREFIX}__section-label ${CSS_PREFIX}__section-label--external`}>
            <div className={`${CSS_PREFIX}__section-label-line ${CSS_PREFIX}__section-label-line--external`} />
            <span className={`${CSS_PREFIX}__section-label-text ${CSS_PREFIX}__section-label-text--external`}>
              <Icon iconName="BusinessCenterLogo" />
              Vendor Management
              <span className={`${CSS_PREFIX}__external-badge`}>Different App</span>
            </span>
            <div className={`${CSS_PREFIX}__section-label-line ${CSS_PREFIX}__section-label-line--external`} />
          </div>

          <p className={`${CSS_PREFIX}__external-section-hint`}>
            Looking for vendor requests? Select an option below to open the Vendor Management application.
          </p>

          <div className={`${CSS_PREFIX}__external-cards-grid`}>
            {VENDOR_MANAGEMENT_OPTIONS.map((option: IExternalAppOption, index: number) => (
              <ExternalAppCard
                key={option.id}
                option={option}
                index={index}
              />
            ))}
          </div>
        </div>

        {/* Workflow preview section */}
        <section className={`${CSS_PREFIX}__workflow-preview`}>
          <div className={`${CSS_PREFIX}__preview-header`}>
            <h2 className={`${CSS_PREFIX}__preview-title`}>Workflow Preview</h2>
            <p className={`${CSS_PREFIX}__preview-subtitle`}>
              {selectedType
                ? 'Click on each step to view details about what happens at that stage.'
                : 'Select a request type above to preview the review workflow.'}
            </p>
          </div>

          <div className={`${CSS_PREFIX}__preview-content`}>
            {selectedType ? (
              <WorkflowStepperPreview requestType={selectedType} />
            ) : (
              <div className={`${CSS_PREFIX}__empty-preview`}>
                <div className={`${CSS_PREFIX}__empty-preview-icon`}>
                  <Icon iconName="Processing" />
                </div>
                <p className={`${CSS_PREFIX}__empty-preview-text`}>
                  Workflow steps will appear here
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Action buttons */}
        <footer className={`${CSS_PREFIX}__footer`}>
          <div className={`${CSS_PREFIX}__footer-content`}>
            <div className={`${CSS_PREFIX}__button-group`}>
              {showCancel && (
                <DefaultButton
                  text="Cancel"
                  onClick={handleCancel}
                  className={`${CSS_PREFIX}__cancel-button`}
                  iconProps={{ iconName: 'Cancel' }}
                />
              )}
              <PrimaryButton
                text="Continue"
                onClick={handleContinue}
                disabled={!selectedType}
                className={`${CSS_PREFIX}__continue-button`}
                iconProps={{ iconName: 'Forward' }}
              />
            </div>
            {selectedOption && (
              <p className={`${CSS_PREFIX}__selection-hint`}>
                <Icon iconName="Info" />
                You selected <strong>{selectedOption.title}</strong>
              </p>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};

export default RequestTypeSelector;

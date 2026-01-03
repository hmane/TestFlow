/**
 * ReviewAudienceSelector Component
 *
 * A prominent, card-based selector for choosing the review audience.
 * Provides a more visual and user-friendly alternative to a dropdown,
 * making the selection more prominent and easier to understand.
 *
 * Features:
 * - Three selectable cards: Legal, Compliance, Both
 * - Clean text-based design with titles and descriptions
 * - Consistent theme color for selection states
 * - Accessible keyboard navigation
 * - Integrates with React Hook Form
 *
 * @module components/ReviewAudienceSelector
 */

import * as React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { Icon } from '@fluentui/react/lib/Icon';
import { Text } from '@fluentui/react/lib/Text';

import { ReviewAudience } from '@appTypes/index';
import type { ILegalRequest } from '@appTypes/index';

import './ReviewAudienceSelector.scss';

// CSS class prefix for BEM naming
const CSS_PREFIX = 'ras';

/**
 * Review audience option configuration
 */
interface IReviewAudienceOption {
  /** The ReviewAudience enum value */
  value: ReviewAudience;
  /** Display title */
  title: string;
  /** Short description of what this audience means */
  description: string;
}

/**
 * Review audience options with metadata for display
 * Uses a single accent color (SharePoint theme primary) for consistency
 */
const REVIEW_AUDIENCE_OPTIONS: IReviewAudienceOption[] = [
  {
    value: ReviewAudience.Legal,
    title: 'Legal Only',
    description: 'Request will be reviewed by the Legal team only',
  },
  {
    value: ReviewAudience.Compliance,
    title: 'Compliance Only',
    description: 'Request will be reviewed by the Compliance team only',
  },
  {
    value: ReviewAudience.Both,
    title: 'Both',
    description: 'Request will be reviewed by both Legal and Compliance teams',
  },
];

/**
 * ReviewAudienceCard - Individual selectable card
 */
interface IReviewAudienceCardProps {
  option: IReviewAudienceOption;
  isSelected: boolean;
  onSelect: (value: ReviewAudience) => void;
  isDisabled?: boolean;
}

const ReviewAudienceCard: React.FC<IReviewAudienceCardProps> = React.memo(
  ({ option, isSelected, onSelect, isDisabled = false }) => {
    /**
     * Handle card click - select this option
     */
    const handleClick = React.useCallback((): void => {
      if (!isDisabled) {
        onSelect(option.value);
      }
    }, [option.value, onSelect, isDisabled]);

    /**
     * Handle keyboard navigation - Enter/Space to select
     */
    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent): void => {
        if ((e.key === 'Enter' || e.key === ' ') && !isDisabled) {
          e.preventDefault();
          onSelect(option.value);
        }
      },
      [option.value, onSelect, isDisabled]
    );

    // Build CSS classes
    const cardClasses = [
      `${CSS_PREFIX}__card`,
      isSelected ? `${CSS_PREFIX}__card--selected` : '',
      isDisabled ? `${CSS_PREFIX}__card--disabled` : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div
        className={cardClasses}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="radio"
        tabIndex={isDisabled ? -1 : 0}
        aria-checked={isSelected}
        aria-disabled={isDisabled}
        aria-label={`${option.title}: ${option.description}`}
      >
        {/* Content */}
        <div className={`${CSS_PREFIX}__card-content`}>
          <Text className={`${CSS_PREFIX}__card-title`} variant="mediumPlus" block>
            {option.title}
          </Text>
          <Text className={`${CSS_PREFIX}__card-description`} variant="small" block>
            {option.description}
          </Text>
        </div>

        {/* Selection indicator */}
        {isSelected && (
          <div className={`${CSS_PREFIX}__card-check`}>
            <Icon iconName="CheckMark" />
          </div>
        )}
      </div>
    );
  }
);

ReviewAudienceCard.displayName = 'ReviewAudienceCard';

/**
 * ReviewAudienceSelector Props
 */
export interface IReviewAudienceSelectorProps {
  /** Field name for React Hook Form */
  name?: string;
  /** Whether the field is required */
  isRequired?: boolean;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Callback when selection changes (for non-RHF usage) */
  onChange?: (value: ReviewAudience | undefined) => void;
  /** Current value (for non-RHF usage) */
  value?: ReviewAudience;
  /** Additional CSS class */
  className?: string;
}

/**
 * ReviewAudienceSelector Component
 *
 * Renders a set of selectable cards for choosing the review audience.
 * Integrates with React Hook Form when used within a FormProvider context.
 */
export const ReviewAudienceSelector: React.FC<IReviewAudienceSelectorProps> = ({
  name = 'reviewAudience',
  isRequired = false,
  disabled = false,
  onChange,
  value,
  className,
}) => {
  // Try to get form context - will be undefined if not in FormProvider
  const formContext = useFormContext<ILegalRequest>();
  const hasFormContext = !!formContext;

  // Build container classes
  const containerClasses = [CSS_PREFIX, className].filter(Boolean).join(' ');

  /**
   * Render the selector cards with given value and change handler
   */
  const renderCards = (
    currentValue: ReviewAudience | undefined,
    handleChange: (value: ReviewAudience) => void
  ): React.ReactElement => (
    <div className={containerClasses} role="radiogroup" aria-label="Review Audience">
      <div className={`${CSS_PREFIX}__cards`}>
        {REVIEW_AUDIENCE_OPTIONS.map((option) => (
          <ReviewAudienceCard
            key={option.value}
            option={option}
            isSelected={currentValue === option.value}
            onSelect={handleChange}
            isDisabled={disabled}
          />
        ))}
      </div>
    </div>
  );

  // If we have form context, use Controller for integration
  if (hasFormContext) {
    return (
      <Controller
        name={name as keyof ILegalRequest}
        control={formContext.control}
        rules={isRequired ? { required: 'Review audience is required' } : undefined}
        render={({ field }) => renderCards(field.value as ReviewAudience | undefined, field.onChange)}
      />
    );
  }

  // Otherwise, use controlled component pattern
  return renderCards(value, (newValue) => onChange?.(newValue));
};

export default ReviewAudienceSelector;

/**
 * FieldLabelWithTooltip Component
 *
 * Renders a form label with an optional tooltip icon.
 * Provides context-sensitive help for complex fields.
 *
 * Features:
 * - Optional required indicator
 * - Tooltip with detailed help text
 * - Accessible with proper ARIA labels
 * - Consistent styling
 */

import * as React from 'react';
import { Stack } from '@fluentui/react/lib/Stack';
import { Label } from '@fluentui/react/lib/Label';
import { Icon } from '@fluentui/react/lib/Icon';
import { TooltipHost, ITooltipHostStyles } from '@fluentui/react/lib/Tooltip';
import { DirectionalHint } from 'spfx-toolkit/lib/types/fluentui-types';
import { useId } from '@fluentui/react-hooks';
import './FieldLabelWithTooltip.scss';

/**
 * FieldLabelWithTooltip props
 */
export interface IFieldLabelWithTooltipProps {
  /** Label text */
  label: string;

  /** Whether field is required */
  required?: boolean;

  /** Tooltip help text */
  tooltip?: string;

  /** Custom CSS class */
  className?: string;

  /** Associated input ID for accessibility */
  htmlFor?: string;
}

/**
 * FieldLabelWithTooltip Component
 */
export const FieldLabelWithTooltip: React.FC<IFieldLabelWithTooltipProps> = ({
  label,
  required = false,
  tooltip,
  className,
  htmlFor,
}) => {
  const tooltipId = useId('tooltip');

  const tooltipHostStyles: Partial<ITooltipHostStyles> = {
    root: {
      display: 'inline-block',
      marginLeft: '6px',
      cursor: 'help',
    },
  };

  return (
    <Stack
      horizontal
      verticalAlign="center"
      tokens={{ childrenGap: 4 }}
      className={`field-label-with-tooltip ${className || ''}`}
    >
      <Label
        required={required}
        htmlFor={htmlFor}
        styles={{
          root: {
            fontWeight: 600,
            color: '#323130',
            marginBottom: 0,
            padding: 0,
          },
        }}
      >
        {label}
      </Label>

      {tooltip && (
        <TooltipHost
          content={tooltip}
          id={tooltipId}
          directionalHint={DirectionalHint.rightCenter}
          styles={tooltipHostStyles}
        >
          <Icon
            iconName="Info"
            aria-label={`Help for ${label}`}
            tabIndex={0}
            styles={{
              root: {
                fontSize: '14px',
                color: '#0078d4',
                cursor: 'help',
                '&:hover': {
                  color: '#106ebe',
                },
              },
            }}
          />
        </TooltipHost>
      )}
    </Stack>
  );
};

export default FieldLabelWithTooltip;

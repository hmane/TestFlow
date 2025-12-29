/**
 * DropZoneCard Component
 *
 * A drop zone card that appears in the document grid when dragging files.
 * Provides a visual target for file drops without taking permanent space.
 */

import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import { Text } from '@fluentui/react/lib/Text';

/**
 * Props for DropZoneCard
 */
export interface IDropZoneCardProps {
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onClick: () => void;
  className?: string;
  /** Show error state with red border */
  isError?: boolean;
}

/**
 * DropZoneCard Component
 */
export const DropZoneCard: React.FC<IDropZoneCardProps> = ({
  onDrop,
  onDragOver,
  onDragLeave,
  onClick,
  className,
  isError = false,
}) => {
  const [isHovered, setIsHovered] = React.useState(false);

  const handleMouseEnter = React.useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = React.useCallback(() => {
    setIsHovered(false);
  }, []);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    },
    [onClick]
  );

  const cardClassNames = React.useMemo(() => {
    const classes = ['drop-zone-card'];
    if (className) classes.push(className);
    if (isHovered) classes.push('hovered');
    if (isError) classes.push('drop-zone-card--error');
    return classes.join(' ');
  }, [className, isHovered, isError]);

  return (
    <div
      className={cardClassNames}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label="Drop files here to upload or click to browse"
    >
      <Icon
        iconName="CloudUpload"
        className="drop-icon"
        styles={{
          root: {
            fontSize: 48,
            color: '#0078d4',
            marginBottom: 12,
          },
        }}
      />
      <Text
        className="drop-text"
        styles={{
          root: {
            fontSize: 15,
            fontWeight: 600,
            color: '#323130',
            marginBottom: 4,
          },
        }}
      >
        Drop files here to upload
      </Text>
      <Text
        className="drop-subtext"
        styles={{
          root: {
            fontSize: 13,
            color: '#605e5c',
          },
        }}
      >
        or click to browse
      </Text>
    </div>
  );
};

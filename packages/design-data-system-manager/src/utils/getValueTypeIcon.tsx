import React from 'react';
import { 
  Palette, 
  Ruler, 
  Expand, 
  Type, 
  MoveVertical, 
  MoveHorizontal, 
  Timer, 
  Circle, 
  Minus, 
  Plus, 
  SquareRoundCorner,
  PencilRuler,
  SparkleIcon
} from 'lucide-react';
import { Tooltip } from '@chakra-ui/react';

/**
 * Helper function to wrap an icon with an algorithm badge if needed
 * @param icon - The main icon component
 * @param size - The size of the icon
 * @param isGeneratedByAlgorithm - Whether to show the algorithm badge
 * @param type - The resolved value type name to display in the tooltip
 * @returns The icon with optional algorithm badge
 */
const wrapWithAlgorithmBadge = (icon: React.ReactElement, size: number, isGeneratedByAlgorithm: boolean, type: string) => {
  if (!isGeneratedByAlgorithm) {
    return icon;
  }

  return (
    <Tooltip label={`${type} token generated by algorithm`} placement="top" hasArrow>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        {icon}
        <span 
          className="badgeIcon" 
          style={{ 
            position: 'absolute', 
            top: '-8px', 
            right: '-8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <SparkleIcon size={size/2} strokeWidth={3.5}/>
        </span>
      </div>
    </Tooltip>
  );
};

/**
 * Returns the appropriate icon component based on the value type and size
 * @param type - The value type to get an icon for
 * @param size - The size of the icon (defaults to 24)
 * @param isGeneratedByAlgorithm - Whether the token was generated by an algorithm (defaults to false)
 * @param typeName - The display name of the type for tooltip display (defaults to type)
 * @returns A Lucide icon component
 */
export const getValueTypeIcon = (
  type: string | undefined, 
  size: number = 24, 
  isGeneratedByAlgorithm: boolean = false,
  typeName?: string
) => {
  if (!type) return <PencilRuler size={size} />;
  
  // Use typeName if provided, otherwise fall back to type
  const displayName = typeName || type;
  
  switch (type) {
    case 'COLOR':
      return wrapWithAlgorithmBadge(<Palette size={size} />, size, isGeneratedByAlgorithm, displayName);
    case 'DIMENSION':
      return wrapWithAlgorithmBadge(<Ruler size={size} />, size, isGeneratedByAlgorithm, displayName);
    case 'SPACING':
      return wrapWithAlgorithmBadge(<Expand size={size} />, size, isGeneratedByAlgorithm, displayName);
    case 'FONT_FAMILY':
    case 'FONT_WEIGHT':
    case 'FONT_SIZE':
      return wrapWithAlgorithmBadge(<Type size={size} />, size, isGeneratedByAlgorithm, displayName);
    case 'LINE_HEIGHT':
      return wrapWithAlgorithmBadge(<MoveVertical size={size} />, size, isGeneratedByAlgorithm, displayName);
    case 'LETTER_SPACING':
      return wrapWithAlgorithmBadge(<MoveHorizontal size={size} />, size, isGeneratedByAlgorithm, displayName);
    case 'DURATION':
      return wrapWithAlgorithmBadge(<Timer size={size} />, size, isGeneratedByAlgorithm, displayName);
    case 'CUBIC_BEZIER':
      return wrapWithAlgorithmBadge(<Circle size={size} />, size, isGeneratedByAlgorithm, displayName);
    case 'BLUR':
      return wrapWithAlgorithmBadge(<Minus size={size} />, size, isGeneratedByAlgorithm, displayName);
    case 'SPREAD':
      return wrapWithAlgorithmBadge(<Plus size={size} />, size, isGeneratedByAlgorithm, displayName);
    case 'RADIUS':
      return wrapWithAlgorithmBadge(<SquareRoundCorner size={size} />, size, isGeneratedByAlgorithm, displayName);
    default:
      return wrapWithAlgorithmBadge(<PencilRuler size={size} />, size, isGeneratedByAlgorithm, displayName);
  }
}; 
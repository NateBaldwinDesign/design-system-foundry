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
const wrapWithAlgorithmBadge = (icon: React.ReactElement, size: number, isGeneratedByAlgorithm: boolean, type: string, color: string) => {
  if (!isGeneratedByAlgorithm) {
    return icon;
  }

  return (
    <Tooltip label={`${type} token generated by algorithm`} placement="top" hasArrow color={color}>
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
          <SparkleIcon size={size/2} strokeWidth={3.5} color={color}/>
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
  color: string = 'currentColor',
  isGeneratedByAlgorithm: boolean = false,
  typeName?: string
) => {
  if (!type) return <PencilRuler size={size} />;
  
  // Use typeName if provided, otherwise fall back to type
  const displayName = typeName || type;
  
  switch (type) {
    case 'COLOR':
      return wrapWithAlgorithmBadge(<Palette color={color} size={size} />, size, isGeneratedByAlgorithm, displayName, color);
    case 'DIMENSION':
      return wrapWithAlgorithmBadge(<Ruler color={color} size={size} />, size, isGeneratedByAlgorithm, displayName, color);
    case 'SPACING':
      return wrapWithAlgorithmBadge(<Expand color={color} size={size} />, size, isGeneratedByAlgorithm, displayName, color);
    case 'FONT_FAMILY':
    case 'FONT_WEIGHT':
    case 'FONT_SIZE':
      return wrapWithAlgorithmBadge(<Type color={color} size={size} />, size, isGeneratedByAlgorithm, displayName, color);
    case 'LINE_HEIGHT':
      return wrapWithAlgorithmBadge(<MoveVertical color={color} size={size} />, size, isGeneratedByAlgorithm, displayName, color);
    case 'LETTER_SPACING':
      return wrapWithAlgorithmBadge(<MoveHorizontal color={color} size={size} />, size, isGeneratedByAlgorithm, displayName, color);
    case 'DURATION':
      return wrapWithAlgorithmBadge(<Timer color={color} size={size} />, size, isGeneratedByAlgorithm, displayName, color);
    case 'CUBIC_BEZIER':
      return wrapWithAlgorithmBadge(<Circle color={color} size={size} />, size, isGeneratedByAlgorithm, displayName, color);
    case 'BLUR':
      return wrapWithAlgorithmBadge(<Minus color={color} size={size} />, size, isGeneratedByAlgorithm, displayName, color);
    case 'SPREAD':
      return wrapWithAlgorithmBadge(<Plus color={color} size={size} />, size, isGeneratedByAlgorithm, displayName, color);
    case 'RADIUS':
      return wrapWithAlgorithmBadge(<SquareRoundCorner color={color} size={size} />, size, isGeneratedByAlgorithm, displayName, color);
    default:
      return wrapWithAlgorithmBadge(<PencilRuler color={color} size={size} />, size, isGeneratedByAlgorithm, displayName, color);
  }
}; 
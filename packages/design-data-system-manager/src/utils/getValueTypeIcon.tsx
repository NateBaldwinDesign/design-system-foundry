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
  PencilRuler
} from 'lucide-react';

/**
 * Returns the appropriate icon component based on the value type and size
 * @param type - The value type to get an icon for
 * @param size - The size of the icon (defaults to 24)
 * @returns A Lucide icon component
 */
export const getValueTypeIcon = (type: string | undefined, size: number = 24) => {
  if (!type) return <PencilRuler size={size} />;
  
  switch (type) {
    case 'COLOR':
      return <Palette size={size} />;
    case 'DIMENSION':
      return <Ruler size={size} />;
    case 'SPACING':
      return <Expand size={size} />;
    case 'FONT_FAMILY':
    case 'FONT_WEIGHT':
    case 'FONT_SIZE':
      return <Type size={size} />;
    case 'LINE_HEIGHT':
      return <MoveVertical size={size} />;
    case 'LETTER_SPACING':
      return <MoveHorizontal size={size} />;
    case 'DURATION':
      return <Timer size={size} />;
    case 'CUBIC_BEZIER':
      return <Circle size={size} />;
    case 'BLUR':
      return <Minus size={size} />;
    case 'SPREAD':
      return <Plus size={size} />;
    case 'RADIUS':
      return <SquareRoundCorner size={size} />;
    default:
      return <PencilRuler size={size} />;
  }
}; 
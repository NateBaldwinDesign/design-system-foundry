import { ResolvedValueType } from '@token-model/data-model';

type TokenValue = string | number | { value: string | number } | { tokenId: string };

/**
 * Get the type of a resolved value type from its ID
 */
export function getValueTypeFromId(
  resolvedValueTypeId: string,
  resolvedValueTypes: ResolvedValueType[]
): string | undefined {
  const valueType = resolvedValueTypes.find(vt => vt.id === resolvedValueTypeId);
  return valueType?.type;
}

/**
 * Get the ID of a resolved value type from its type
 */
export function getValueTypeIdFromType(
  type: string,
  resolvedValueTypes: ResolvedValueType[]
): string | undefined {
  const valueType = resolvedValueTypes.find(vt => vt.type === type);
  return valueType?.id;
}

/**
 * Get a default value for a resolved value type
 */
export function getDefaultValueForType(
  resolvedValueTypeId: string,
  resolvedValueTypes: ResolvedValueType[]
): TokenValue {
  const valueType = resolvedValueTypes.find(vt => vt.id === resolvedValueTypeId);
  if (!valueType) {
    throw new Error(`Unknown value type: ${resolvedValueTypeId}`);
  }

  // Use type for determining default value
  switch (valueType.type) {
    case 'COLOR':
      return { value: '#000000' };
    case 'DIMENSION':
    case 'SPACING':
    case 'FONT_SIZE':
    case 'LINE_HEIGHT':
    case 'LETTER_SPACING':
    case 'BLUR':
    case 'SPREAD':
    case 'RADIUS':
      return { value: 0 };
    case 'FONT_WEIGHT':
      return { value: 400 };
    case 'FONT_FAMILY':
      return { value: 'system-ui' };
    case 'DURATION':
      return { value: 0 };
    case 'CUBIC_BEZIER':
      return { value: 'cubic-bezier(0.4, 0, 0.2, 1)' };
    default:
      // For custom types or when type is not specified, use a sensible default based on the type
      if (valueType.type === 'LINE_HEIGHT') {
        return { value: 1.5 }; // Default line height is 1.5 (unitless)
      }
      return { value: '' };
  }
}

/**
 * Format a value for display based on its type
 */
export function formatValueForDisplay(
  value: TokenValue,
  resolvedValueTypeId: string,
  resolvedValueTypes: ResolvedValueType[]
): string {
  const valueType = resolvedValueTypes.find(vt => vt.id === resolvedValueTypeId);
  if (!valueType) {
    return String(value);
  }

  // Use type for formatting
  switch (valueType.type) {
    case 'COLOR':
      return typeof value === 'string' ? value : String(value);
    case 'DIMENSION':
    case 'SPACING':
    case 'FONT_SIZE':
    case 'LINE_HEIGHT':
    case 'LETTER_SPACING':
    case 'DURATION':
    case 'BLUR':
    case 'SPREAD':
    case 'RADIUS':
      return `${typeof value === 'number' ? value : Number(value)}px`;
    case 'FONT_WEIGHT':
      return typeof value === 'number' ? value.toString() : String(value);
    case 'FONT_FAMILY':
    case 'CUBIC_BEZIER':
      return typeof value === 'string' ? value : String(value);
    default:
      return typeof value === 'string' ? value : String(value);
  }
} 
import { ResolvedValueType, TokenValue } from '@token-model/data-model';

/**
 * Get the type of a resolved value type from its ID
 */
export function getValueTypeFromId(
  resolvedValueTypeId: string,
  resolvedValueTypes: ResolvedValueType[]
): string | undefined {
  console.debug('[getValueTypeFromId] Input:', { resolvedValueTypeId, availableTypes: resolvedValueTypes.map(vt => ({ id: vt.id, type: vt.type })) });
  const valueType = resolvedValueTypes.find(vt => vt.id === resolvedValueTypeId);
  console.debug('[getValueTypeFromId] Found value type:', valueType);
  return valueType?.type;
}

/**
 * Get the ID of a resolved value type from its type
 */
export function getValueTypeIdFromType(
  type: string,
  resolvedValueTypes: ResolvedValueType[]
): string | undefined {
  console.debug('[getValueTypeIdFromType] Input:', { type, availableTypes: resolvedValueTypes.map(vt => ({ id: vt.id, type: vt.type })) });
  const valueType = resolvedValueTypes.find(vt => vt.type === type);
  console.debug('[getValueTypeIdFromType] Found value type:', valueType);
  return valueType?.id;
}

/**
 * Get a default value for a resolved value type
 */
export function getDefaultValueForType(
  resolvedValueTypeId: string,
  resolvedValueTypes: ResolvedValueType[]
): TokenValue {
  console.debug('[getDefaultValueForType] Input:', { 
    resolvedValueTypeId, 
    availableTypes: resolvedValueTypes.map(vt => ({ id: vt.id, type: vt.type }))
  });

  const valueType = resolvedValueTypes.find(vt => vt.id === resolvedValueTypeId);
  console.debug('[getDefaultValueForType] Found value type:', valueType);

  if (!valueType) {
    console.error('[getDefaultValueForType] Error: Unknown value type', { 
      requestedId: resolvedValueTypeId,
      availableIds: resolvedValueTypes.map(vt => vt.id)
    });
    throw new Error(`Unknown value type: ${resolvedValueTypeId}`);
  }

  // Use type for determining default value
  console.debug('[getDefaultValueForType] Determining default value for type:', valueType.type);
  let defaultValue: TokenValue;

  switch (valueType.type) {
    case 'COLOR':
      defaultValue = { value: '#000000' };
      break;
    case 'DIMENSION':
    case 'SPACING':
    case 'FONT_SIZE':
    case 'LINE_HEIGHT':
    case 'LETTER_SPACING':
    case 'BLUR':
    case 'SPREAD':
    case 'RADIUS':
      defaultValue = { value: 0 };
      break;
    case 'FONT_WEIGHT':
      defaultValue = { value: 400 };
      break;
    case 'FONT_FAMILY':
      defaultValue = { value: 'system-ui' };
      break;
    case 'DURATION':
      defaultValue = { value: 0 };
      break;
    case 'CUBIC_BEZIER':
      defaultValue = { value: 'cubic-bezier(0.4, 0, 0.2, 1)' };
      break;
    default:
      // For custom types or when type is not specified, use a sensible default based on the type
      if (valueType.type === 'LINE_HEIGHT') {
        defaultValue = { value: 1.5 }; // Default line height is 1.5 (unitless)
      } else {
        defaultValue = { value: '' };
      }
  }

  console.debug('[getDefaultValueForType] Generated default value:', defaultValue);
  return defaultValue;
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

  // Extract the actual value from TokenValue
  let actualValue: string | number;
  if (typeof value === 'string') {
    actualValue = value;
  } else if (typeof value === 'object' && value) {
    if ('value' in value) {
      actualValue = value.value;
    } else if ('tokenId' in value) {
      return `alias:${value.tokenId}`;
    } else {
      return String(value);
    }
  } else {
    return String(value);
  }

  // Use type for formatting
  switch (valueType.type) {
    case 'COLOR':
      return typeof actualValue === 'string' ? actualValue : String(actualValue);
    case 'DIMENSION':
    case 'SPACING':
    case 'FONT_SIZE':
    case 'LINE_HEIGHT':
    case 'LETTER_SPACING':
    case 'DURATION':
    case 'BLUR':
    case 'SPREAD':
    case 'RADIUS':
      return `${typeof actualValue === 'number' ? actualValue : Number(actualValue)}px`;
    case 'FONT_WEIGHT':
      return typeof actualValue === 'number' ? actualValue.toString() : String(actualValue);
    case 'FONT_FAMILY':
    case 'CUBIC_BEZIER':
      return typeof actualValue === 'string' ? actualValue : String(actualValue);
    default:
      return typeof actualValue === 'string' ? actualValue : String(actualValue);
  }
} 
import { ResolvedValueType } from '@token-model/data-model';

/**
 * Standard value types as defined in the schema.
 * This array must be kept in sync with the StandardValueType enum in schema.ts
 */
const STANDARD_VALUE_TYPES = [
  'COLOR',
  'DIMENSION',
  'SPACING',
  'FONT_FAMILY',
  'FONT_WEIGHT',
  'FONT_SIZE',
  'LINE_HEIGHT',
  'LETTER_SPACING',
  'DURATION',
  'CUBIC_BEZIER',
  'BLUR',
  'SPREAD',
  'RADIUS'
] as const;

/**
 * Generates default value types based on the standard value types from the schema.
 * This ensures we maintain a single source of truth for value type definitions.
 */
export function generateDefaultValueTypes(): ResolvedValueType[] {
  return STANDARD_VALUE_TYPES.map(type => {
    // Convert UPPER_CASE type to kebab-case id
    const id = type.toLowerCase().replace(/_/g, '-');
    // Convert UPPER_CASE type to Title Case display name
    const displayName = type
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());

    return {
      id,
      displayName,
      type
    };
  });
} 
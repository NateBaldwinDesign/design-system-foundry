/**
 * Creates a unique ID with a type prefix
 * @param type The type of entity (e.g., 'dimension', 'token', 'mode')
 * @returns A unique ID string in the format 'typeId-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
 */
export function createUniqueId(type: string): string {
  let uuid: string;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    uuid = crypto.randomUUID();
  } else {
    // Fallback: manual UUID v4 generator
    uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  return `${type}Id-${uuid}`;
}

export function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export const ID_PREFIXES = {
  DIMENSION: 'dimension',
  TOKEN_COLLECTION: 'tokenCollection',
  TOKEN: 'token',
  MODE: 'mode',
  TOKEN_GROUP: 'tokenGroup',
  TOKEN_VARIANT: 'tokenVariant',
  TAXONOMY_TERM: 'term',
  COMPONENT_PROPERTY: 'component-property',
  COMPONENT_OPTION: 'component-option'
} as const; 
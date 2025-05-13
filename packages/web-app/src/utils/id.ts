export function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export const ID_PREFIXES = {
  DIMENSION: 'dimension',
  TOKEN_COLLECTION: 'tokenCollection',
  TOKEN: 'token',
  MODE: 'mode',
  TOKEN_GROUP: 'tokenGroup',
  TOKEN_VARIANT: 'tokenVariant'
} as const; 
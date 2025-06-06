import type { Token, TokenTaxonomyRef } from '@token-model/data-model';

export function generateTokenName(token: Token, taxonomies: TokenTaxonomyRef[]): string {
  // Preserve existing token name generation logic
  return token.displayName;
} 
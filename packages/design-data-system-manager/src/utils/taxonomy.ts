import type { Taxonomy } from '@token-model/data-model';
import { StorageService } from '../services/storage';

/**
 * Cleans up invalid taxonomy/term references from all tokens.
 * This function should be called after any taxonomy or term is deleted in settings.
 */
export function cleanupTokenTaxonomyReferences(taxonomies: Taxonomy[]): void {
  const tokens = StorageService.getTokens();
  const updatedTokens = tokens.map(token => {
    if (!Array.isArray(token.taxonomies)) return token;
    const validTaxonomies = token.taxonomies.filter(ref =>
      taxonomies.some(tax => tax.id === ref.taxonomyId) &&
      (ref.termId === '' || taxonomies.find(tax => tax.id === ref.taxonomyId)?.terms.some(term => term.id === ref.termId))
    );
    return { ...token, taxonomies: validTaxonomies };
  });
  StorageService.setTokens(updatedTokens);
} 
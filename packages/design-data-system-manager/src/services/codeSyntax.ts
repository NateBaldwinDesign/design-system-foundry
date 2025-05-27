import type { Token, Taxonomy, Platform as PlatformType } from '@token-model/data-model';

interface Schema {
  namingRules?: { taxonomyOrder?: string[] };
  taxonomies: Taxonomy[];
  platforms: PlatformType[];
}

export class CodeSyntaxService {
  static generateCodeSyntax(token: Token, platformId: string, schema: Schema): string {
    // Find the platform object
    const platform = (schema.platforms || []).find(p => p.id === platformId);
    const syntax = platform?.syntaxPatterns || {};
    const taxonomyOrder = schema.namingRules?.taxonomyOrder || [];
    const taxonomies = schema.taxonomies || [];

    // Build parts in taxonomy order
    const parts: string[] = [];
    const usedTaxonomyIds = new Set<string>();
    if (Array.isArray(token.taxonomies) && token.taxonomies.length > 0) {
      // Always use taxonomyOrder from schema.namingRules
      taxonomyOrder.forEach((taxId: string) => {
        const ref = token.taxonomies.find((t: { taxonomyId: string }) => t.taxonomyId === taxId);
        if (ref) {
          const taxonomy = taxonomies.find((tax: Taxonomy) => tax.id === ref.taxonomyId);
          const term = taxonomy?.terms.find((term: { id: string }) => term.id === ref.termId);
          if (term) {
            parts.push(term.name);
            usedTaxonomyIds.add(taxId);
          }
        }
      });
      // Add any remaining taxonomies not in the order, in the order they appear in token.taxonomies
      token.taxonomies.forEach((ref: { taxonomyId: string; termId: string }) => {
        if (!usedTaxonomyIds.has(ref.taxonomyId)) {
          const taxonomy = taxonomies.find((tax: Taxonomy) => tax.id === ref.taxonomyId);
          const term = taxonomy?.terms.find((term: { id: string }) => term.id === ref.termId);
          if (term) parts.push(term.name);
        }
      });
    }
    // Fallback to displayName if no taxonomy terms
    if (parts.length === 0) {
      return '';
    }
    // Capitalization for each part
    let processedParts = parts;
    switch (syntax.capitalization) {
      case 'uppercase':
        processedParts = parts.map((p: string) => p.toUpperCase());
        break;
      case 'lowercase':
        processedParts = parts.map((p: string) => p.toLowerCase());
        break;
      case 'capitalize':
        processedParts = parts.map((p: string) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase());
        break;
      default:
        break;
    }
    // Join parts with delimiter
    const name = processedParts.join(syntax.delimiter ?? '');
    // Apply delimiter and capitalization to prefix and suffix
    let prefix = syntax.prefix ?? '';
    let suffix = syntax.suffix ?? '';
    if (prefix && syntax.delimiter) prefix = prefix.split(/\s+/).join(syntax.delimiter);
    if (suffix && syntax.delimiter) suffix = suffix.split(/\s+/).join(syntax.delimiter);
    // Capitalization for prefix and suffix
    switch (syntax.capitalization) {
      case 'uppercase':
        prefix = prefix.toUpperCase();
        suffix = suffix.toUpperCase();
        break;
      case 'lowercase':
        prefix = prefix.toLowerCase();
        suffix = suffix.toLowerCase();
        break;
      case 'capitalize':
        prefix = prefix.replace(/\b\w/g, (c: string) => c.toUpperCase());
        suffix = suffix.replace(/\b\w/g, (c: string) => c.toUpperCase());
        break;
      default:
        break;
    }
    // Format string or prefix/suffix
    let result = `${prefix}${name}${suffix}`;
    if (syntax.formatString) {
      result = syntax.formatString
        .replace('{prefix}', prefix)
        .replace('{name}', name)
        .replace('{suffix}', suffix);
    }
    return result;
  }

  static generateAllCodeSyntaxes(token: Token, schema: Schema): Array<{ platformId: string, formattedName: string }> {
    return (schema.platforms || []).map(platform => ({
      platformId: platform.id,
      formattedName: this.generateCodeSyntax(token, platform.id, schema) || ''
    }));
  }

  static updateCodeSyntax(token: Token, platform: string, syntax: string): Token {
    return {
      ...token,
      codeSyntax: {
        ...token.codeSyntax,
        [platform]: syntax
      }
    };
  }
}

/**
 * Converts a codeSyntax object to the standard array format
 * @param codeSyntaxObj Object with platform IDs as keys and formatted names as values
 * @returns Array of { platformId, formattedName } objects
 */
export function convertCodeSyntaxToArray(codeSyntaxObj: Record<string, string>): Array<{ platformId: string; formattedName: string }> {
  return Object.entries(codeSyntaxObj).map(([platformId, formattedName]) => ({
    platformId,
    formattedName
  }));
}

/**
 * Ensures codeSyntax is in the correct array format
 * @param codeSyntax Either an array of { platformId, formattedName } or an object with platform IDs as keys
 * @returns Array of { platformId, formattedName } objects
 */
export function ensureCodeSyntaxArrayFormat(codeSyntax: any): Array<{ platformId: string; formattedName: string }> {
  if (Array.isArray(codeSyntax)) {
    return codeSyntax;
  }
  if (typeof codeSyntax === 'object' && codeSyntax !== null) {
    return convertCodeSyntaxToArray(codeSyntax);
  }
  return [];
} 
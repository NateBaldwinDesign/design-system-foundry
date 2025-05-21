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
      taxonomyOrder.forEach(taxId => {
        const ref = token.taxonomies.find(t => t.taxonomyId === taxId);
        if (ref) {
          const taxonomy = taxonomies.find(tax => tax.id === ref.taxonomyId);
          const term = taxonomy?.terms.find(term => term.id === ref.termId);
          if (term) {
            parts.push(term.name);
            usedTaxonomyIds.add(taxId);
          }
        }
      });
      // Add any remaining taxonomies not in the order, in the order they appear in token.taxonomies
      token.taxonomies.forEach(ref => {
        if (!usedTaxonomyIds.has(ref.taxonomyId)) {
          const taxonomy = taxonomies.find(tax => tax.id === ref.taxonomyId);
          const term = taxonomy?.terms.find(term => term.id === ref.termId);
          if (term) parts.push(term.name);
        }
      });
    }
    // Fallback to displayName if no taxonomy terms
    if (parts.length === 0) {
      parts.push(token.displayName);
    }
    // Join parts with delimiter
    let name = parts.join(syntax.delimiter ?? '');
    // Capitalization
    switch (syntax.capitalization) {
      case 'uppercase':
        name = name.toUpperCase();
        break;
      case 'lowercase':
        name = name.toLowerCase();
        break;
      case 'capitalize':
        name = name.replace(/\b\w/g, c => c.toUpperCase());
        break;
      default:
        break;
    }
    // Format string or prefix/suffix
    let result = `${syntax.prefix ?? ''}${name}${syntax.suffix ?? ''}`;
    if (syntax.formatString) {
      result = syntax.formatString
        .replace('{prefix}', syntax.prefix ?? '')
        .replace('{name}', name)
        .replace('{suffix}', syntax.suffix ?? '');
    }
    return result;
  }

  static generateAllCodeSyntaxes(token: Token, schema: Schema): Record<string, string> {
    const syntaxes: Record<string, string> = {};
    (schema.platforms || []).forEach(platform => {
      syntaxes[platform.id] = this.generateCodeSyntax(token, platform.id, schema);
    });
    return syntaxes;
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
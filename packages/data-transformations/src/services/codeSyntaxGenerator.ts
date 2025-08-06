import type { Token, Platform, Taxonomy, PlatformExtension } from '@token-model/data-model';

interface CodeSyntaxGeneratorOptions {
  tokens: Token[];
  platforms: Platform[];
  taxonomies: Taxonomy[];
  taxonomyOrder: string[];
  platformExtensions: Map<string, PlatformExtension>;
}

interface CodeSyntaxResult {
  platformId: string;
  formattedName: string;
}

export class CodeSyntaxGenerator {
  private options: CodeSyntaxGeneratorOptions;
  private cache: Map<string, Map<string, string>> = new Map();

  constructor(options: CodeSyntaxGeneratorOptions) {
    this.options = options;
  }

  /**
   * Generate codeSyntax for a single token across all platforms
   */
  generateTokenCodeSyntax(token: Token): CodeSyntaxResult[] {
    return this.options.platforms.map(platform => ({
      platformId: platform.id,
      formattedName: this.generateFormattedName(token, platform.id)
    }));
  }

  /**
   * Generate codeSyntax for a single token on a specific platform
   */
  generateTokenCodeSyntaxForPlatform(token: Token, platformId: string): string {
    return this.generateFormattedName(token, platformId);
  }

  /**
   * Bulk generate codeSyntax for all tokens across all platforms
   */
  generateAllTokensCodeSyntax(): Map<string, CodeSyntaxResult[]> {
    const result = new Map<string, CodeSyntaxResult[]>();
    
    this.options.tokens.forEach(token => {
      result.set(token.id, this.generateTokenCodeSyntax(token));
    });

    return result;
  }

  /**
   * Generate codeSyntax for all tokens for a specific platform
   */
  generateAllTokensCodeSyntaxForPlatform(platformId: string): Map<string, string> {
    const result = new Map<string, string>();
    
    this.options.tokens.forEach(token => {
      result.set(token.id, this.generateTokenCodeSyntaxForPlatform(token, platformId));
    });

    return result;
  }

  /**
   * Clear the internal cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  private generateFormattedName(token: Token, platformId: string): string {
    // Check cache first
    if (this.cache.has(token.id) && this.cache.get(token.id)!.has(platformId)) {
      return this.cache.get(token.id)!.get(platformId)!;
    }

    const platformExtension = this.options.platformExtensions.get(platformId);
    if (!platformExtension?.syntaxPatterns) {
      throw new Error(`Platform extension not found for platform: ${platformId}`);
    }

    const syntaxPatterns = platformExtension.syntaxPatterns;
    
    // Extract and order taxonomy terms
    const orderedTerms = this.extractOrderedTerms(token);
    
    // Apply syntax patterns
    const result = this.applyFormattingRules(orderedTerms, syntaxPatterns);

    // Cache the result
    if (!this.cache.has(token.id)) {
      this.cache.set(token.id, new Map());
    }
    this.cache.get(token.id)!.set(platformId, result);

    return result;
  }

  private extractOrderedTerms(token: Token): string[] {
    if (!token.taxonomies || token.taxonomies.length === 0) {
      return [token.displayName]; // Fallback to display name
    }

    // Create a map of taxonomyId -> term for this token
    const tokenTerms = new Map<string, string>();
    token.taxonomies.forEach(taxonomy => {
      const taxonomyDef = this.options.taxonomies.find(t => t.id === taxonomy.taxonomyId);
      if (taxonomyDef) {
        const term = taxonomyDef.terms.find(term => term.id === taxonomy.termId);
        if (term) {
          tokenTerms.set(taxonomy.taxonomyId, term.name);
        }
      }
    });

    // Order terms according to taxonomyOrder
    const orderedTerms: string[] = [];
    this.options.taxonomyOrder.forEach(taxonomyId => {
      const term = tokenTerms.get(taxonomyId);
      if (term) {
        orderedTerms.push(term);
      }
    });

    // Add any remaining terms not in the order (fallback)
    tokenTerms.forEach((term, taxonomyId) => {
      if (!this.options.taxonomyOrder.includes(taxonomyId)) {
        orderedTerms.push(term);
      }
    });

    return orderedTerms.length > 0 ? orderedTerms : [token.displayName];
  }

  private applyFormattingRules(terms: string[], syntaxPatterns: any): string {
    let result = terms.join(syntaxPatterns.delimiter || '');
    
    // Apply capitalization
    switch (syntaxPatterns.capitalization) {
      case 'uppercase':
        result = result.toUpperCase();
        break;
      case 'lowercase':
        result = result.toLowerCase();
        break;
      case 'capitalize':
        result = result.split(syntaxPatterns.delimiter || '')
          .map(term => term.charAt(0).toUpperCase() + term.slice(1).toLowerCase())
          .join(syntaxPatterns.delimiter || '');
        break;
      case 'camel':
        const parts = result.split(syntaxPatterns.delimiter || '');
        result = parts[0].toLowerCase() + 
          parts.slice(1).map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join('');
        break;
    }

    // Apply prefix and suffix
    if (syntaxPatterns.prefix) {
      result = syntaxPatterns.prefix + result;
    }
    if (syntaxPatterns.suffix) {
      result = result + syntaxPatterns.suffix;
    }

    // Apply format string if provided
    if (syntaxPatterns.formatString) {
      result = syntaxPatterns.formatString.replace('{name}', result);
    }

    return result;
  }
} 
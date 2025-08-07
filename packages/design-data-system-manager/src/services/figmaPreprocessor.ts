import { TokenSystem, Token, Platform, SyntaxPatterns } from '@token-model/data-model';
import { PlatformSyntaxPatternService } from './platformSyntaxPatternService';
import { DataSourceManager } from './dataSourceManager';
import { StorageService } from './storage';

export interface FigmaPreprocessorOptions {
  // Whether to include platform code syntax
  includePlatformCodeSyntax: boolean;
  
  // Specific platforms to include (if not all)
  targetPlatformIds?: string[];
}

export interface FigmaPreprocessorResult {
  // Enhanced token system with dynamically generated code syntax
  enhancedTokenSystem: TokenSystem;
  
  // Context information for the transformer
  context: {
    targetPlatforms: Platform[];
    figmaSyntaxPatterns: SyntaxPatterns;
    sourceContext: any; // DataSourceContext type
  };
  
  // Validation results
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

export class FigmaPreprocessor {
  private platformSyntaxPatternService = PlatformSyntaxPatternService.getInstance();
  private dataSourceManager = DataSourceManager.getInstance();
  
  async preprocessForFigma(options: FigmaPreprocessorOptions = {}): Promise<FigmaPreprocessorResult> {
    console.log('[FigmaPreprocessor] Starting preprocessing for Figma export...');
    
    // 1. Use existing data management services to get current merged data
    const mergedData = StorageService.getMergedData();
    if (!mergedData) {
      throw new Error('No merged data available for Figma export');
    }
    
    // 2. Get current source context from existing DataSourceManager
    const sourceContext = this.dataSourceManager.getCurrentContext();
    
    // 3. Load all required syntax patterns using existing service
    await this.platformSyntaxPatternService.collectAndStoreSyntaxPatterns();
    
    // 4. Determine target platforms based on current source context and Figma mapping
    const targetPlatforms = this.determineTargetPlatforms(mergedData.platforms || [], sourceContext, options);
    
    // 5. Generate code syntax dynamically for target platforms
    const enhancedTokenSystem = await this.generateCodeSyntax(mergedData, targetPlatforms, options);
    
    // 6. Validate the enhanced data
    const validation = this.validatePreprocessedData(enhancedTokenSystem, targetPlatforms);
    
    // 7. Prepare context for transformer
    const context = {
      targetPlatforms,
      figmaSyntaxPatterns: this.getFigmaSyntaxPatterns(mergedData),
      sourceContext
    };
    
    return {
      enhancedTokenSystem,
      context,
      validation
    };
  }
  
  private determineTargetPlatforms(platforms: Platform[], sourceContext: any, options: FigmaPreprocessorOptions): Platform[] {
    let targetPlatforms = platforms;
    
    // Filter by current source context (using existing source management logic)
    if (sourceContext.currentPlatform && sourceContext.currentPlatform !== 'none') {
      targetPlatforms = targetPlatforms.filter(p => p.id === sourceContext.currentPlatform);
      console.log('[FigmaPreprocessor] Filtered to current platform:', sourceContext.currentPlatform);
    }
    
    // Filter by specific target platforms if specified
    if (options.targetPlatformIds && options.targetPlatformIds.length > 0) {
      targetPlatforms = targetPlatforms.filter(p => options.targetPlatformIds!.includes(p.id));
      console.log('[FigmaPreprocessor] Filtered to specific platforms:', options.targetPlatformIds);
    }
    
    // Filter to only platforms with Figma mapping
    targetPlatforms = targetPlatforms.filter(p => p.figmaPlatformMapping);
    console.log('[FigmaPreprocessor] Final target platforms with Figma mapping:', targetPlatforms.map(p => ({ id: p.id, figmaMapping: p.figmaPlatformMapping })));
    
    return targetPlatforms;
  }
  
  private async generateCodeSyntax(tokenSystem: TokenSystem, targetPlatforms: Platform[], options: FigmaPreprocessorOptions): Promise<TokenSystem> {
    console.log('[FigmaPreprocessor] Generating code syntax for', targetPlatforms.length, 'platforms');
    
    // Get syntax patterns for all target platforms using existing service
    const syntaxPatterns = this.platformSyntaxPatternService.getAllSyntaxPatterns();
    
    // Get Figma syntax patterns from core data for variable naming
    const figmaSyntaxPatterns = this.getFigmaSyntaxPatterns(tokenSystem);
    console.log('[FigmaPreprocessor] Using Figma syntax patterns for variable naming:', figmaSyntaxPatterns);
    
    // Generate code syntax for each token dynamically
    const enhancedTokens = tokenSystem.tokens?.map(token => {
      const codeSyntax: Record<string, string> = {};
      
      // Generate Figma variable name using core figmaConfiguration.syntaxPatterns
      const figmaVariableName = this.generateFigmaVariableName(token, figmaSyntaxPatterns, tokenSystem);
      
      // Generate platform code syntax using platform syntax patterns
      for (const platform of targetPlatforms) {
        const platformPatterns = syntaxPatterns[platform.id];
        if (platformPatterns && platform.figmaPlatformMapping) {
          try {
            const formattedName = this.generateFormattedName(token, platformPatterns, tokenSystem);
            codeSyntax[platform.figmaPlatformMapping] = formattedName;
            console.log(`[FigmaPreprocessor] Generated platform code syntax "${formattedName}" for token ${token.id} on platform ${platform.id}`);
          } catch (error) {
            console.warn(`[FigmaPreprocessor] Failed to generate platform code syntax for token ${token.id} on platform ${platform.id}:`, error);
            // Fallback to display name
            codeSyntax[platform.figmaPlatformMapping] = token.displayName;
          }
        }
      }
      
      return {
        ...token,
        // Store Figma variable name separately from platform code syntax
        figmaVariableName: figmaVariableName,
        codeSyntax: Object.keys(codeSyntax).length > 0 ? codeSyntax : undefined
      };
    }) || [];
    
    return {
      ...tokenSystem,
      tokens: enhancedTokens
    };
  }
  
  /**
   * Generate Figma variable name using core figmaConfiguration.syntaxPatterns
   * This ensures Figma variable names are determined exclusively by core data
   */
  private generateFigmaVariableName(token: Token, figmaSyntaxPatterns: SyntaxPatterns, tokenSystem: TokenSystem): string {
    console.log(`[FigmaPreprocessor] Generating Figma variable name for token ${token.id} using core syntax patterns`);
    
    // Extract taxonomy terms in order
    const orderedTerms = this.extractOrderedTerms(token, tokenSystem);
    
    if (orderedTerms.length === 0) {
      return token.displayName; // Fallback to display name
    }
    
    // Apply Figma syntax patterns (from core data)
    let result = orderedTerms.join(figmaSyntaxPatterns.delimiter || '/');
    
    // Apply capitalization
    switch (figmaSyntaxPatterns.capitalization) {
      case 'camel':
        result = result.replace(/(?:^|[-_\s]+)([a-z])/g, (_, letter) => letter.toUpperCase());
        break;
      case 'uppercase':
        result = result.toUpperCase();
        break;
      case 'lowercase':
        result = result.toLowerCase();
        break;
      case 'capitalize':
        result = result.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
        break;
    }
    
    // Apply prefix and suffix
    result = `${figmaSyntaxPatterns.prefix || ''}${result}${figmaSyntaxPatterns.suffix || ''}`;
    
    console.log(`[FigmaPreprocessor] Generated Figma variable name "${result}" for token ${token.id}`);
    return result;
  }
  
  /**
   * Generate platform code syntax using platform syntax patterns
   * This is separate from Figma variable naming
   */
  private generateFormattedName(token: Token, syntaxPatterns: SyntaxPatterns, tokenSystem: TokenSystem): string {
    // Extract taxonomy terms in order
    const orderedTerms = this.extractOrderedTerms(token, tokenSystem);
    
    if (orderedTerms.length === 0) {
      return token.displayName; // Fallback to display name
    }
    
    // Apply platform syntax patterns
    let result = orderedTerms.join(syntaxPatterns.delimiter || '_');
    
    // Apply capitalization
    switch (syntaxPatterns.capitalization) {
      case 'camel':
        result = result.replace(/(?:^|[-_\s]+)([a-z])/g, (_, letter) => letter.toUpperCase());
        break;
      case 'uppercase':
        result = result.toUpperCase();
        break;
      case 'lowercase':
        result = result.toLowerCase();
        break;
      case 'capitalize':
        result = result.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
        break;
    }
    
    // Apply prefix and suffix
    result = `${syntaxPatterns.prefix || ''}${result}${syntaxPatterns.suffix || ''}`;
    
    return result;
  }
  
  private extractOrderedTerms(token: Token, tokenSystem: TokenSystem): string[] {
    if (!token.taxonomies || token.taxonomies.length === 0) {
      return [];
    }
    
    const taxonomyOrder = tokenSystem.taxonomyOrder || [];
    const orderedTerms: string[] = [];
    
    // Create a map of taxonomy assignments for quick lookup
    const taxonomyMap = new Map<string, string>();
    token.taxonomies.forEach(taxonomyRef => {
      taxonomyMap.set(taxonomyRef.taxonomyId, taxonomyRef.termId);
    });
    
    // Get ordered terms based on taxonomyOrder
    taxonomyOrder.forEach(taxonomyId => {
      const termId = taxonomyMap.get(taxonomyId);
      if (termId) {
        const taxonomy = tokenSystem.taxonomies?.find(t => t.id === taxonomyId);
        const term = taxonomy?.terms.find(term => term.id === termId);
        if (term) {
          orderedTerms.push(term.name);
        }
      }
    });
    
    return orderedTerms;
  }
  
  private getFigmaSyntaxPatterns(tokenSystem: TokenSystem): SyntaxPatterns {
    const figmaConfig = tokenSystem.figmaConfiguration?.syntaxPatterns;
    if (!figmaConfig) {
      // Return defaults if no Figma configuration
      return {
        prefix: '',
        suffix: '',
        delimiter: '/',
        capitalization: 'capitalize',
        formatString: ''
      };
    }
    
    return {
      prefix: figmaConfig.prefix || '',
      suffix: figmaConfig.suffix || '',
      delimiter: figmaConfig.delimiter || '/',
      capitalization: figmaConfig.capitalization || 'capitalize',
      formatString: figmaConfig.formatString || ''
    };
  }
  
  private validatePreprocessedData(tokenSystem: TokenSystem, targetPlatforms: Platform[]): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validate that all target platforms have syntax patterns
    const syntaxPatterns = this.platformSyntaxPatternService.getAllSyntaxPatterns();
    for (const platform of targetPlatforms) {
      if (!syntaxPatterns[platform.id]) {
        errors.push(`Platform ${platform.id} missing syntax patterns`);
      }
    }
    
    // Validate that tokens have code syntax for target platforms
    for (const token of tokenSystem.tokens || []) {
      for (const platform of targetPlatforms) {
        if (platform.figmaPlatformMapping && !token.codeSyntax?.[platform.figmaPlatformMapping]) {
          warnings.push(`Token ${token.id} missing code syntax for platform ${platform.id}`);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
} 
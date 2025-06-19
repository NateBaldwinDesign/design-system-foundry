import type { Token, TokenCollection, Taxonomy } from '@token-model/data-model';
import type { Algorithm, TokenGeneration, Formula, Condition } from '../types/algorithm';
import { createUniqueId } from '../utils/id';
import { AlgorithmExecutionService } from './algorithmExecutionService';

export interface GeneratedToken {
  id: string;
  displayName: string;
  value: number;
  iterationIndex: number;
  logicalTerm?: string;
}

export class TokenGenerationService {
  /**
   * Generate tokens from an algorithm with token generation configuration
   */
  static generateTokens(
    algorithm: Algorithm,
    existingTokens: Token[],
    collections: TokenCollection[],
    taxonomies: Taxonomy[],
    modifyTaxonomiesInPlace: boolean = false
  ): { tokens: Token[]; errors: string[]; newTaxonomies?: Taxonomy[]; updatedTaxonomies?: Taxonomy[] } {
    if (!algorithm.tokenGeneration?.enabled) {
      return { tokens: [], errors: [] };
    }

    const errors: string[] = [];
    const generatedTokens: Token[] = [];

    try {
      // Validate algorithm has required components
      if (algorithm.formulas.length === 0) {
        errors.push('Algorithm must have at least one formula for token generation');
        return { tokens: [], errors };
      }

      // Validate logical mapping configuration
      const { logicalMapping } = algorithm.tokenGeneration;
      if (!logicalMapping.taxonomyId && !logicalMapping.newTaxonomyName) {
        errors.push('Must select an existing taxonomy or provide a name for a new taxonomy');
        return { tokens: [], errors };
      }

      // Generate iteration values
      const iterationValues = this.generateIterationValues(algorithm.tokenGeneration.iterationRange);
      
      // Step 1: Generate terms based on logical mapping
      const generatedTerms = this.generateTermsFromLogicalMapping(iterationValues, logicalMapping);
      
      // Step 2: Handle taxonomy creation or selection
      const { taxonomy, newTaxonomies } = this.handleTaxonomyCreation(
        logicalMapping,
        generatedTerms,
        taxonomies,
        algorithm.tokenGeneration.bulkAssignments.resolvedValueTypeId
      );
      
      // Store original taxonomy state for comparison if we're modifying in place
      const originalTaxonomyState = modifyTaxonomiesInPlace ? {
        id: taxonomy.id,
        termCount: taxonomy.terms.length,
        termNames: taxonomy.terms.map(t => t.name)
      } : null;
      
      // Step 3: Match existing terms or create new ones
      const termMappings = this.matchOrCreateTerms(taxonomy, generatedTerms, iterationValues, modifyTaxonomiesInPlace);
      
      // Step 4: Generate tokens with calculated values
      for (let i = 0; i < iterationValues.length; i++) {
        const n = iterationValues[i];
        
        try {
          // Execute algorithm steps in order to calculate the final value
          const calculatedValue = this.executeAlgorithmSteps(algorithm, n);
          
          // Generate token ID
          const tokenId = this.generateTokenId();
          
          // Check for duplicate ID
          if (existingTokens.some(t => t.id === tokenId)) {
            errors.push(`Token ID "${tokenId}" already exists`);
            continue;
          }
          
          // Get the term mapping for this iteration
          const termMapping = termMappings.find(tm => tm.iterationValue === n);
          if (!termMapping) {
            errors.push(`No term mapping found for iteration ${n}`);
            continue;
          }
          
          // Create token object
          const token = this.createTokenWithLogicalMapping(
            tokenId,
            algorithm,
            calculatedValue,
            n,
            taxonomy,
            termMapping.termId,
            taxonomies
          );
          
          generatedTokens.push(token);
        } catch (error) {
          errors.push(`Error generating token for iteration ${n}: ${error}`);
        }
      }
      
      // Determine if we need to return updated taxonomies
      let updatedTaxonomies: Taxonomy[] | undefined;
      if (logicalMapping.taxonomyId && modifyTaxonomiesInPlace && originalTaxonomyState) {
        // We used an existing taxonomy and may have added new terms to it
        // Check if any new terms were actually added by comparing with the original state
        console.log('TokenGenerationService: Checking for taxonomy updates:', {
          taxonomyId: taxonomy.id,
          taxonomyName: taxonomy.name,
          originalTermCount: originalTaxonomyState.termCount,
          currentTermCount: taxonomy.terms.length,
          originalTerms: originalTaxonomyState.termNames,
          currentTerms: taxonomy.terms.map(t => t.name),
          modifyTaxonomiesInPlace
        });
        
        if (taxonomy.terms.length > originalTaxonomyState.termCount) {
          // New terms were added, return the updated taxonomy
          updatedTaxonomies = [taxonomy];
          console.log('TokenGenerationService: Returning updated taxonomy with new terms:', {
            taxonomyId: taxonomy.id,
            taxonomyName: taxonomy.name,
            originalTermCount: originalTaxonomyState.termCount,
            newTermCount: taxonomy.terms.length,
            newTerms: taxonomy.terms.slice(originalTaxonomyState.termCount).map(t => t.name)
          });
        } else {
          console.log('TokenGenerationService: No new terms added to taxonomy:', {
            taxonomyId: taxonomy.id,
            taxonomyName: taxonomy.name,
            termCount: taxonomy.terms.length
          });
        }
      }
      
      // Return both tokens and any new/updated taxonomies that need to be saved
      return { 
        tokens: generatedTokens, 
        errors,
        newTaxonomies: newTaxonomies.length > 0 ? newTaxonomies : undefined,
        updatedTaxonomies
      };
    } catch (error) {
      errors.push(`Token generation failed: ${error}`);
    }

    return { tokens: generatedTokens, errors };
  }

  /**
   * Generate array of iteration values based on range configuration
   */
  private static generateIterationValues(range: TokenGeneration['iterationRange']): number[] {
    const values: number[] = [];
    const { start, end, step } = range;
    
    for (let i = start; i <= end; i += step) {
      values.push(i);
    }
    
    return values;
  }

  /**
   * Generate unique token ID using the same ID generator as manual token creation
   */
  private static generateTokenId(): string {
    return createUniqueId('token');
  }

  /**
   * Create a token object with the given parameters
   */
  private static createToken(
    id: string,
    algorithm: Algorithm,
    value: number,
    n: number,
    collections: TokenCollection[],
    taxonomies: Taxonomy[]
  ): Token {
    const bulkAssignments = algorithm.tokenGeneration?.bulkAssignments;
    if (!bulkAssignments) {
      throw new Error('Bulk assignments not configured');
    }

    // Create taxonomies array
    const taxonomiesArray = this.createTaxonomiesArray(
      bulkAssignments.taxonomies || [],
      n,
      algorithm.tokenGeneration!.logicalMapping,
      taxonomies
    );

    // Generate display name from taxonomy terms
    const displayName = this.generateDisplayNameFromTaxonomies(taxonomiesArray, taxonomies, n, algorithm.tokenGeneration!.logicalMapping);

    // Create token object
    const token: Token = {
      id,
      displayName,
      resolvedValueTypeId: bulkAssignments.resolvedValueTypeId,
      tokenCollectionId: bulkAssignments.collectionId || undefined,
      description: `Generated by algorithm "${algorithm.name}" with n=${n}`,
      private: bulkAssignments.private,
      status: bulkAssignments.status || 'stable',
      themeable: bulkAssignments.themeable,
      tokenTier: bulkAssignments.tokenTier || 'PRIMITIVE',
      generatedByAlgorithm: true,
      algorithmId: algorithm.id,
      taxonomies: taxonomiesArray,
      propertyTypes: [],
      codeSyntax: [],
      valuesByMode: [
        {
          modeIds: [],
          value: {
            value: `${value}px` // Assuming dimension type, adjust as needed
          }
        }
      ]
    };

    return token;
  }

  /**
   * Generate display name from taxonomy terms
   */
  private static generateDisplayNameFromTaxonomies(
    taxonomiesArray: Array<{ taxonomyId: string; termId: string }>,
    availableTaxonomies: Taxonomy[],
    n: number,
    logicalMapping: TokenGeneration['logicalMapping']
  ): string {
    const termNames: string[] = [];
    
    for (const taxonomyRef of taxonomiesArray) {
      const taxonomy = availableTaxonomies.find(t => t.id === taxonomyRef.taxonomyId);
      if (taxonomy) {
        const term = taxonomy.terms.find(term => term.id === taxonomyRef.termId);
        if (term) {
          termNames.push(term.name);
        }
      }
    }
    
    // If no taxonomy terms found, generate a fallback name
    if (termNames.length === 0) {
      return this.generateFallbackDisplayName(n, logicalMapping);
    }
    
    // Combine taxonomy terms with spaces
    return termNames.join(' ');
  }

  /**
   * Generate fallback display name when no taxonomy terms are available
   */
  private static generateFallbackDisplayName(
    n: number,
    logicalMapping: TokenGeneration['logicalMapping']
  ): string {
    const { scaleType } = logicalMapping;
    
    if (scaleType === 'tshirt') {
      return this.generateTshirtSizeName(n, logicalMapping.defaultValue, logicalMapping.extraPrefix || 'X');
    } else {
      return this.generateNumericSizeName(n, logicalMapping.defaultValue, logicalMapping.increasingStep || 100, logicalMapping.decreasingStep || 25);
    }
  }

  /**
   * Generate t-shirt size name (x-small, small, medium, large, x-large, etc.)
   */
  private static generateTshirtSizeName(n: number, defaultValue: string, extraPrefix: string): string {
    if (n === 0) return defaultValue;
    
    if (n > 0) {
      // Large sizes
      if (n === 1) return 'Large';
      const xCount = n - 1;
      return `${extraPrefix.repeat(xCount)}-Large`;
    } else {
      // Small sizes
      if (n === -1) return 'Small';
      const xCount = Math.abs(n) - 1;
      return `${extraPrefix.repeat(xCount)}-Small`;
    }
  }

  /**
   * Generate numeric size name
   */
  private static generateNumericSizeName(n: number, defaultValue: string, increasingStep: number, decreasingStep: number): string {
    const defaultNum = parseFloat(defaultValue) || 100;
    
    if (n === 0) return defaultValue;
    
    if (n > 0) {
      // Increasing values
      const value = defaultNum + (n * increasingStep);
      return value.toString();
    } else {
      // Decreasing values
      const value = defaultNum + (n * decreasingStep);
      return value.toString();
    }
  }

  /**
   * Create taxonomies array with selected terms
   */
  private static createTaxonomiesArray(
    selectedTaxonomies: Array<{ taxonomyId: string; termId: string }>,
    n: number,
    logicalMapping: TokenGeneration['logicalMapping'],
    availableTaxonomies: Taxonomy[]
  ): Array<{ taxonomyId: string; termId: string }> {
    // Use the exact terms selected by the user
    return selectedTaxonomies.filter(taxonomyRef => {
      const taxonomy = availableTaxonomies.find(t => t.id === taxonomyRef.taxonomyId);
      if (!taxonomy) return false;
      
      // Verify the term exists in the taxonomy
      return taxonomy.terms.some(term => term.id === taxonomyRef.termId);
    });
  }

  /**
   * Find logical term based on iteration value and mapping rules
   */
  private static findLogicalTerm(
    taxonomy: Taxonomy,
    n: number,
    logicalMapping: TokenGeneration['logicalMapping']
  ): { id: string; name: string } | null {
    const { scaleType } = logicalMapping;
    
    if (scaleType === 'tshirt') {
      const sizeName = this.generateTshirtSizeName(n, logicalMapping.defaultValue, logicalMapping.extraPrefix || 'X');
      return taxonomy.terms.find(term => 
        term.name.toLowerCase() === sizeName.toLowerCase()
      ) || null;
    } else {
      // For numeric scale, try to find a term that matches the calculated value
      const calculatedValue = this.generateNumericSizeName(n, logicalMapping.defaultValue, logicalMapping.increasingStep || 100, logicalMapping.decreasingStep || 25);
      return taxonomy.terms.find(term => 
        term.name === calculatedValue ||
        term.name === n.toString()
      ) || null;
    }
  }

  /**
   * Generate terms based on logical mapping
   */
  private static generateTermsFromLogicalMapping(
    iterationValues: number[],
    logicalMapping: TokenGeneration['logicalMapping']
  ): string[] {
    const terms: string[] = [];
    
    for (const n of iterationValues) {
      if (logicalMapping.scaleType === 'tshirt') {
        terms.push(this.generateTshirtSizeName(n, logicalMapping.defaultValue, logicalMapping.extraPrefix || 'X'));
      } else {
        terms.push(this.generateNumericSizeName(n, logicalMapping.defaultValue, logicalMapping.increasingStep || 100, logicalMapping.decreasingStep || 25));
      }
    }
    
    return terms;
  }

  /**
   * Handle taxonomy creation or selection
   */
  private static handleTaxonomyCreation(
    logicalMapping: TokenGeneration['logicalMapping'],
    generatedTerms: string[],
    taxonomies: Taxonomy[],
    resolvedValueTypeId: string
  ): { taxonomy: Taxonomy; newTaxonomies: Taxonomy[] } {
    const newTaxonomies: Taxonomy[] = [];

    // If existing taxonomy is selected
    if (logicalMapping.taxonomyId) {
      const existingTaxonomy = taxonomies.find(t => t.id === logicalMapping.taxonomyId);
      if (!existingTaxonomy) {
        throw new Error(`Selected taxonomy with ID "${logicalMapping.taxonomyId}" not found`);
      }
      return { taxonomy: existingTaxonomy, newTaxonomies };
    }

    // Create new taxonomy
    if (logicalMapping.newTaxonomyName) {
      const newTaxonomy: Taxonomy = {
        id: createUniqueId('taxonomy'),
        name: logicalMapping.newTaxonomyName,
        description: `Generated by algorithm for scale terms`,
        terms: generatedTerms.map(term => ({ 
          id: createUniqueId('term'), 
          name: term,
          description: `Generated term for scale: ${term}`
        })),
        resolvedValueTypeIds: [resolvedValueTypeId]
      };
      newTaxonomies.push(newTaxonomy);
      return { taxonomy: newTaxonomy, newTaxonomies };
    }

    throw new Error('No taxonomy selected or new taxonomy name provided');
  }

  /**
   * Match existing terms or create new ones
   */
  private static matchOrCreateTerms(
    taxonomy: Taxonomy,
    generatedTerms: string[],
    iterationValues: number[],
    modifyTaxonomiesInPlace: boolean = false
  ): Array<{ iterationValue: number; termId: string; termName: string }> {
    const termMappings: Array<{ iterationValue: number; termId: string; termName: string }> = [];
    
    // Create a copy of the taxonomy if we're not modifying in place
    const workingTaxonomy = modifyTaxonomiesInPlace ? taxonomy : {
      ...taxonomy,
      terms: [...taxonomy.terms]
    };
    
    for (let i = 0; i < iterationValues.length; i++) {
      const n = iterationValues[i];
      const termName = generatedTerms[i];
      
      // Try to find existing term with matching name
      let existingTerm = workingTaxonomy.terms.find(term => term.name === termName);
      
      // If term doesn't exist, create it
      if (!existingTerm) {
        const newTerm = {
          id: createUniqueId('term'),
          name: termName,
          description: `Generated term for scale: ${termName}`
        };
        workingTaxonomy.terms.push(newTerm);
        existingTerm = newTerm;
      }
      
      termMappings.push({ 
        iterationValue: n, 
        termId: existingTerm.id, 
        termName: existingTerm.name 
      });
    }
    
    return termMappings;
  }

  /**
   * Create token with logical mapping
   */
  private static createTokenWithLogicalMapping(
    id: string,
    algorithm: Algorithm,
    value: number,
    n: number,
    taxonomy: Taxonomy,
    termId: string,
    availableTaxonomies: Taxonomy[]
  ): Token {
    const { tokenGeneration } = algorithm;
    const { bulkAssignments, logicalMapping } = tokenGeneration!;

    // Start with the manually selected taxonomies from Bulk Assignments
    const taxonomiesArray = [...bulkAssignments.taxonomies];

    // Add the logical mapping taxonomy if it's not already included
    const logicalMappingTaxonomy = {
      taxonomyId: taxonomy.id,
      termId: termId
    };
    
    // Check if this taxonomy is already in the manually selected ones
    const isAlreadyIncluded = taxonomiesArray.some(t => t.taxonomyId === taxonomy.id);
    if (!isAlreadyIncluded) {
      taxonomiesArray.push(logicalMappingTaxonomy);
    }

    // Generate display name from all taxonomy terms
    const displayName = this.generateDisplayNameFromTaxonomies(taxonomiesArray, availableTaxonomies, n, logicalMapping);

    // Create token object
    const token: Token = {
      id,
      displayName,
      resolvedValueTypeId: bulkAssignments.resolvedValueTypeId,
      tokenCollectionId: bulkAssignments.collectionId || undefined,
      description: `Generated by algorithm "${algorithm.name}" with n=${n}`,
      private: bulkAssignments.private,
      status: bulkAssignments.status || 'stable',
      themeable: bulkAssignments.themeable,
      tokenTier: bulkAssignments.tokenTier || 'PRIMITIVE',
      generatedByAlgorithm: true,
      algorithmId: algorithm.id,
      taxonomies: taxonomiesArray,
      propertyTypes: [],
      codeSyntax: [],
      valuesByMode: [
        {
          modeIds: [],
          value: {
            value: `${value}px` // Assuming dimension type, adjust as needed
          }
        }
      ]
    };

    return token;
  }

  /**
   * Execute algorithm steps in order to calculate the final value
   */
  private static executeAlgorithmSteps(algorithm: Algorithm, n: number): number {
    try {
      // Use the new AlgorithmExecutionService for proper algorithm execution
      const executionContext = AlgorithmExecutionService.executeAlgorithm(algorithm, n);
      
      // Ensure the result is a number
      const result = executionContext.finalResult;
      if (typeof result === 'number' && !isNaN(result)) {
        return result;
      } else if (typeof result === 'string') {
        // Try to parse string as number
        const parsed = parseFloat(result);
        if (!isNaN(parsed)) {
          return parsed;
        }
      }
      
      // If we can't get a valid number, throw an error
      throw new Error(`Algorithm execution did not produce a valid number. Got: ${typeof result} ${result}`);
    } catch (error) {
      throw new Error(`Algorithm execution failed: ${error}`);
    }
  }

  /**
   * Evaluate formula with given context (legacy method - use AlgorithmExecutionService instead)
   */
  private static evaluateFormulaWithContext(formula: Formula, context: Record<string, number>): number {
    try {
      // Use the new AlgorithmExecutionService for formula evaluation
      const result = AlgorithmExecutionService.evaluateFormula(formula, context);
      
      if (typeof result === 'number' && !isNaN(result)) {
        return result;
      } else if (typeof result === 'string') {
        const parsed = parseFloat(result);
        if (!isNaN(parsed)) {
          return parsed;
        }
      }
      
      throw new Error(`Formula "${formula.name}" must evaluate to a valid number`);
    } catch (error) {
      throw new Error(`Formula "${formula.name}" evaluation failed: ${error}`);
    }
  }

  /**
   * Evaluate condition with given context (legacy method - use AlgorithmExecutionService instead)
   */
  private static evaluateConditionWithContext(condition: Condition, context: Record<string, number>): boolean {
    try {
      // Use the new AlgorithmExecutionService for condition evaluation
      return AlgorithmExecutionService.evaluateCondition(condition, context);
    } catch (error) {
      throw new Error(`Condition "${condition.name}" evaluation failed: ${error}`);
    }
  }
}
import type { Token, TokenCollection, Taxonomy } from '@token-model/data-model';
import type { Algorithm, TokenGeneration, Formula, Condition } from '../types/algorithm';
import { createUniqueId } from '../utils/id';
import { AlgorithmExecutionService } from './algorithmExecutionService';
import { StorageService } from './storage';
import type { Dimension } from '@token-model/data-model';

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
    modifyTaxonomiesInPlace: boolean = false,
    selectedModes?: Record<string, string[]>
  ): { tokens: Token[]; errors: string[]; newTaxonomies?: Taxonomy[]; updatedTaxonomies?: Taxonomy[] } {
    console.log('🔍 TokenGenerationService.generateTokens: Starting token generation', {
      algorithmId: algorithm.id,
      algorithmName: algorithm.name,
      hasTokenGeneration: !!algorithm.tokenGeneration?.enabled,
      existingTokensCount: existingTokens.length,
      selectedModes,
      modifyTaxonomiesInPlace
    });

    if (!algorithm.tokenGeneration?.enabled) {
      console.log('❌ TokenGenerationService.generateTokens: Token generation not enabled');
      return { tokens: [], errors: [] };
    }

    const errors: string[] = [];
    const generatedTokens: Token[] = [];

    try {
      // Validate algorithm has required components
      if (algorithm.formulas.length === 0) {
        const error = 'Algorithm must have at least one formula for token generation';
        console.error('❌ TokenGenerationService.generateTokens:', error);
        errors.push(error);
        return { tokens: [], errors };
      }

      // Validate logical mapping configuration
      const { logicalMapping } = algorithm.tokenGeneration;
      if (!logicalMapping.taxonomyId && !logicalMapping.newTaxonomyName) {
        const error = 'Must select an existing taxonomy or provide a name for a new taxonomy';
        console.error('❌ TokenGenerationService.generateTokens:', error);
        errors.push(error);
        return { tokens: [], errors };
      }

      console.log('✅ TokenGenerationService.generateTokens: Basic validation passed');

      // Generate iteration values
      const iterationValues = this.generateIterationValues(algorithm.tokenGeneration.iterationRange);
      console.log('📊 TokenGenerationService.generateTokens: Generated iteration values', {
        iterationValues,
        range: algorithm.tokenGeneration.iterationRange
      });
      
      // Step 1: Generate terms based on logical mapping
      const generatedTerms = this.generateTermsFromLogicalMapping(iterationValues, logicalMapping);
      console.log('🏷️ TokenGenerationService.generateTokens: Generated terms', {
        generatedTerms,
        logicalMapping
      });
      
      // Step 2: Handle taxonomy creation or selection
      const { taxonomy, newTaxonomies } = this.handleTaxonomyCreation(
        logicalMapping,
        generatedTerms,
        taxonomies,
        algorithm.tokenGeneration.bulkAssignments.resolvedValueTypeId
      );
      console.log('📚 TokenGenerationService.generateTokens: Taxonomy handling complete', {
        taxonomyId: taxonomy.id,
        taxonomyName: taxonomy.name,
        termCount: taxonomy.terms.length,
        newTaxonomiesCount: newTaxonomies.length
      });
      
      // Store original taxonomy state for comparison if we're modifying in place
      const originalTaxonomyState = modifyTaxonomiesInPlace ? {
        id: taxonomy.id,
        termCount: taxonomy.terms.length,
        termNames: taxonomy.terms.map(t => t.name)
      } : null;
      
      // Step 3: Match existing terms or create new ones
      const termMappings = this.matchOrCreateTerms(taxonomy, generatedTerms, iterationValues, modifyTaxonomiesInPlace);
      console.log('🔗 TokenGenerationService.generateTokens: Term mappings created', {
        termMappingsCount: termMappings.length,
        termMappings: termMappings.slice(0, 3) // Log first 3 for brevity
      });
      
      // Step 4: Generate mode combinations for mode-based variables
      const modeCombinations = this.generateModeCombinations(algorithm, selectedModes);
      console.log('🔄 TokenGenerationService.generateTokens: Mode combinations generated', {
        modeCombinationsCount: modeCombinations.length,
        modeCombinations,
        algorithmVariables: algorithm.variables.map(v => ({
          id: v.id,
          name: v.name,
          modeBased: v.modeBased,
          dimensionId: v.dimensionId,
          hasModeValues: !!v.valuesByMode
        }))
      });
      
      // Step 5: Generate tokens with calculated values for each mode combination
      console.log('🚀 TokenGenerationService.generateTokens: Starting token generation loop', {
        iterationValuesCount: iterationValues.length,
        modeCombinationsCount: modeCombinations.length,
        totalExpectedTokens: iterationValues.length * modeCombinations.length
      });
      
      for (let i = 0; i < iterationValues.length; i++) {
        const n = iterationValues[i];
        console.log(`📈 TokenGenerationService.generateTokens: Processing iteration ${i + 1}/${iterationValues.length}, n=${n}`);
        
        for (let j = 0; j < modeCombinations.length; j++) {
          const modeContext = modeCombinations[j];
          console.log(`🔄 TokenGenerationService.generateTokens: Processing mode combination ${j + 1}/${modeCombinations.length}`, {
            modeContext,
            iterationValue: n,
            modeContextKeys: Object.keys(modeContext),
            modeContextValues: Object.values(modeContext)
          });
          
          try {
            // Execute algorithm steps in order to calculate the final value with mode context
            console.log('⚙️ TokenGenerationService.generateTokens: Executing algorithm steps', {
              algorithmId: algorithm.id,
              stepsCount: algorithm.steps.length,
              modeContext,
              variables: algorithm.variables.map(v => ({
                id: v.id,
                name: v.name,
                modeBased: v.modeBased,
                dimensionId: v.dimensionId,
                defaultValue: v.valuesByMode?.[0]?.value
              }))
            });
            
            const calculatedValue = this.executeAlgorithmSteps(algorithm, n, modeContext);
            console.log('✅ TokenGenerationService.generateTokens: Algorithm execution successful', {
              calculatedValue,
              calculatedValueType: typeof calculatedValue,
              isNumber: typeof calculatedValue === 'number',
              isNaN: typeof calculatedValue === 'number' ? isNaN(calculatedValue) : 'N/A'
            });
            
            // Generate token ID
            const tokenId = this.generateTokenId();
            console.log('🆔 TokenGenerationService.generateTokens: Generated token ID', { tokenId });
            
            // Check for duplicate ID
            if (existingTokens.some(t => t.id === tokenId)) {
              const error = `Token ID "${tokenId}" already exists`;
              console.error('❌ TokenGenerationService.generateTokens:', error);
              errors.push(error);
              continue;
            }
            
            // Get the term mapping for this iteration
            const termMapping = termMappings.find(tm => tm.iterationValue === n);
            if (!termMapping) {
              const error = `No term mapping found for iteration ${n}`;
              console.error('❌ TokenGenerationService.generateTokens:', error, {
                termMappings,
                iterationValue: n
              });
              errors.push(error);
              continue;
            }
            
            console.log('🏷️ TokenGenerationService.generateTokens: Found term mapping', {
              termMapping,
              iterationValue: n
            });
            
            // Create token object with mode context
            const token = this.createTokenWithLogicalMappingAndModes(
              tokenId,
              algorithm,
              calculatedValue,
              n,
              taxonomy,
              termMapping.termId,
              taxonomies,
              modeContext
            );
            
            console.log('🎯 TokenGenerationService.generateTokens: Token created successfully', {
              tokenId: token.id,
              displayName: token.displayName,
              value: token.valuesByMode[0]?.value,
              modeIds: token.valuesByMode[0]?.modeIds,
              taxonomiesCount: token.taxonomies.length
            });
            
            generatedTokens.push(token);
            console.log('✅ TokenGenerationService.generateTokens: Token added to generated tokens array', {
              currentGeneratedTokensCount: generatedTokens.length
            });
          } catch (error) {
            const modeContextStr = Object.keys(modeContext).length > 0 
              ? ` (modes: ${Object.entries(modeContext).map(([dimId, modeId]) => `${dimId}:${modeId}`).join(', ')})`
              : '';
            const errorMsg = `Error generating token for iteration ${n}${modeContextStr}: ${error}`;
            console.error('❌ TokenGenerationService.generateTokens:', errorMsg, {
              error,
              stack: error instanceof Error ? error.stack : undefined
            });
            errors.push(errorMsg);
          }
        }
      }
      
      console.log('🎉 TokenGenerationService.generateTokens: Token generation loop complete', {
        generatedTokensCount: generatedTokens.length,
        errorsCount: errors.length
      });
      
      // Determine if we need to return updated taxonomies
      let updatedTaxonomies: Taxonomy[] | undefined;
      if (logicalMapping.taxonomyId && modifyTaxonomiesInPlace && originalTaxonomyState) {
        // We used an existing taxonomy and may have added new terms to it
        // Check if any new terms were actually added by comparing with the original state
        console.log('🔍 TokenGenerationService.generateTokens: Checking for taxonomy updates:', {
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
          console.log('✅ TokenGenerationService.generateTokens: Returning updated taxonomy with new terms:', {
            taxonomyId: taxonomy.id,
            taxonomyName: taxonomy.name,
            originalTermCount: originalTaxonomyState.termCount,
            newTermCount: taxonomy.terms.length,
            newTerms: taxonomy.terms.slice(originalTaxonomyState.termCount).map(t => t.name)
          });
        } else {
          console.log('ℹ️ TokenGenerationService.generateTokens: No new terms added to taxonomy:', {
            taxonomyId: taxonomy.id,
            taxonomyName: taxonomy.name,
            termCount: taxonomy.terms.length
          });
        }
      }
      
      console.log('🏁 TokenGenerationService.generateTokens: Final results', {
        tokensCount: generatedTokens.length,
        errorsCount: errors.length,
        newTaxonomiesCount: newTaxonomies?.length || 0,
        updatedTaxonomiesCount: updatedTaxonomies?.length || 0
      });
      
      // Return both tokens and any new/updated taxonomies that need to be saved
      return { 
        tokens: generatedTokens, 
        errors,
        newTaxonomies: newTaxonomies.length > 0 ? newTaxonomies : undefined,
        updatedTaxonomies
      };
    } catch (error) {
      const errorMsg = `Token generation failed: ${error}`;
      console.error('💥 TokenGenerationService.generateTokens: Critical error', errorMsg, {
        error,
        stack: error instanceof Error ? error.stack : undefined
      });
      errors.push(errorMsg);
    }

    return { tokens: generatedTokens, errors };
  }

  /**
   * Generate mode combinations for mode-based variables
   */
  private static generateModeCombinations(algorithm: Algorithm, selectedModes?: Record<string, string[]>): Record<string, string>[] {
    console.log('🔄 TokenGenerationService.generateModeCombinations: Starting mode combination generation', {
      algorithmId: algorithm.id,
      algorithmName: algorithm.name,
      selectedModes,
      totalVariables: algorithm.variables.length
    });

    const modeBasedVariables = algorithm.variables.filter(v => v.modeBased && v.dimensionId);
    console.log('🎯 TokenGenerationService.generateModeCombinations: Found mode-based variables', {
      modeBasedVariablesCount: modeBasedVariables.length,
      modeBasedVariables: modeBasedVariables.map(v => ({
        id: v.id,
        name: v.name,
        dimensionId: v.dimensionId,
        modeValues: v.valuesByMode
      }))
    });
    
    if (modeBasedVariables.length === 0) {
      // No mode-based variables, return empty context
      console.log('ℹ️ TokenGenerationService.generateModeCombinations: No mode-based variables found, returning empty context');
      return [{}];
    }

    // Get unique dimensions used by mode-based variables
    const dimensions = StorageService.getDimensions();
    console.log('📏 TokenGenerationService.generateModeCombinations: Retrieved dimensions from storage', {
      totalDimensions: dimensions.length,
      dimensions: dimensions.map(d => ({
        id: d.id,
        displayName: d.displayName,
        modesCount: d.modes.length
      }))
    });

    const usedDimensions = dimensions.filter((dim: Dimension) => 
      modeBasedVariables.some(v => v.dimensionId === dim.id)
    );
    console.log('🎯 TokenGenerationService.generateModeCombinations: Filtered to used dimensions', {
      usedDimensionsCount: usedDimensions.length,
      usedDimensions: usedDimensions.map(d => ({
        id: d.id,
        displayName: d.displayName,
        modesCount: d.modes.length,
        modes: d.modes.map(m => ({ id: m.id, name: m.name }))
      }))
    });

    // Generate all possible mode combinations
    const combinations: Record<string, string>[] = [{}];
    console.log('🚀 TokenGenerationService.generateModeCombinations: Starting combination generation', {
      initialCombinationsCount: combinations.length
    });
    
    for (const dimension of usedDimensions) {
      console.log(`🔄 TokenGenerationService.generateModeCombinations: Processing dimension "${dimension.displayName}" (${dimension.id})`, {
        dimensionId: dimension.id,
        dimensionName: dimension.displayName,
        totalModes: dimension.modes.length
      });

      const currentCombinations = [...combinations];
      combinations.length = 0; // Clear array
      
      // Get modes to use for this dimension
      let modesToUse = dimension.modes;
      if (selectedModes && selectedModes[dimension.id]) {
        // Filter to only selected modes
        modesToUse = dimension.modes.filter(mode => 
          selectedModes[dimension.id].includes(mode.id)
        );
        console.log(`🎯 TokenGenerationService.generateModeCombinations: Filtered modes for dimension "${dimension.displayName}"`, {
          totalModes: dimension.modes.length,
          selectedModes: selectedModes[dimension.id],
          filteredModesCount: modesToUse.length,
          filteredModes: modesToUse.map(m => ({ id: m.id, name: m.name }))
        });
      } else {
        console.log(`ℹ️ TokenGenerationService.generateModeCombinations: Using all modes for dimension "${dimension.displayName}"`, {
          modesCount: modesToUse.length,
          modes: modesToUse.map(m => ({ id: m.id, name: m.name }))
        });
      }
      
      for (const mode of modesToUse) {
        console.log(`🔄 TokenGenerationService.generateModeCombinations: Processing mode "${mode.name}" (${mode.id})`, {
          modeId: mode.id,
          modeName: mode.name,
          currentCombinationsCount: currentCombinations.length
        });

        for (const combination of currentCombinations) {
          const newCombination = {
            ...combination,
            [dimension.id]: mode.id
          };
          combinations.push(newCombination);
        }
      }

      console.log(`✅ TokenGenerationService.generateModeCombinations: Completed dimension "${dimension.displayName}"`, {
        dimensionId: dimension.id,
        dimensionName: dimension.displayName,
        newCombinationsCount: combinations.length,
        sampleCombinations: combinations.slice(0, 3) // Show first 3 for brevity
      });
    }

    console.log('🎉 TokenGenerationService.generateModeCombinations: Mode combination generation complete', {
      finalCombinationsCount: combinations.length,
      combinations: combinations
    });

    return combinations;
  }

  /**
   * Generate array of iteration values based on range configuration
   */
  private static generateIterationValues(range: TokenGeneration['iterationRange']): number[] {
    console.log('📊 TokenGenerationService.generateIterationValues: Generating iteration values', {
      range,
      start: range.start,
      end: range.end,
      step: range.step
    });
    
    const values: number[] = [];
    const { start, end, step } = range;
    
    for (let i = start; i <= end; i += step) {
      values.push(i);
    }
    
    console.log('📊 TokenGenerationService.generateIterationValues: Generated values', {
      values,
      count: values.length
    });
    
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
            value: value.toString() // Return pure numeric value without units
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
    console.log('🏷️ TokenGenerationService.generateTermsFromLogicalMapping: Generating terms', {
      iterationValues,
      logicalMapping,
      scaleType: logicalMapping.scaleType
    });
    
    const terms: string[] = [];
    
    for (const n of iterationValues) {
      let termName: string;
      if (logicalMapping.scaleType === 'tshirt') {
        termName = this.generateTshirtSizeName(n, logicalMapping.defaultValue, logicalMapping.extraPrefix || 'X');
      } else {
        termName = this.generateNumericSizeName(n, logicalMapping.defaultValue, logicalMapping.increasingStep || 100, logicalMapping.decreasingStep || 25);
      }
      terms.push(termName);
      console.log(`🏷️ TokenGenerationService.generateTermsFromLogicalMapping: Generated term for n=${n}: "${termName}"`);
    }
    
    console.log('🏷️ TokenGenerationService.generateTermsFromLogicalMapping: All terms generated', {
      terms,
      count: terms.length
    });
    
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
    console.log('🔗 TokenGenerationService.matchOrCreateTerms: Starting term matching/creation', {
      taxonomyId: taxonomy.id,
      taxonomyName: taxonomy.name,
      existingTermsCount: taxonomy.terms.length,
      generatedTerms,
      iterationValues,
      modifyTaxonomiesInPlace
    });
    
    const termMappings: Array<{ iterationValue: number; termId: string; termName: string }> = [];
    
    // Create a copy of the taxonomy if we're not modifying in place
    const workingTaxonomy = modifyTaxonomiesInPlace ? taxonomy : {
      ...taxonomy,
      terms: [...taxonomy.terms]
    };
    
    for (let i = 0; i < iterationValues.length; i++) {
      const n = iterationValues[i];
      const termName = generatedTerms[i];
      
      console.log(`🔗 TokenGenerationService.matchOrCreateTerms: Processing iteration ${i + 1}/${iterationValues.length}`, {
        iterationValue: n,
        termName,
        existingTerms: workingTaxonomy.terms.map(t => t.name)
      });
      
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
        console.log(`🔗 TokenGenerationService.matchOrCreateTerms: Created new term`, {
          termId: newTerm.id,
          termName: newTerm.name
        });
      } else {
        console.log(`🔗 TokenGenerationService.matchOrCreateTerms: Found existing term`, {
          termId: existingTerm.id,
          termName: existingTerm.name
        });
      }
      
      termMappings.push({ 
        iterationValue: n, 
        termId: existingTerm.id, 
        termName: existingTerm.name 
      });
    }
    
    console.log('🔗 TokenGenerationService.matchOrCreateTerms: Term mappings complete', {
      termMappingsCount: termMappings.length,
      termMappings,
      finalTaxonomyTermsCount: workingTaxonomy.terms.length
    });
    
    return termMappings;
  }

  /**
   * Create token with logical mapping and mode context
   */
  private static createTokenWithLogicalMappingAndModes(
    id: string,
    algorithm: Algorithm,
    value: number,
    n: number,
    taxonomy: Taxonomy,
    termId: string,
    availableTaxonomies: Taxonomy[],
    modeContext: Record<string, string>
  ): Token {
    console.log('🎯 TokenGenerationService.createTokenWithLogicalMappingAndModes: Creating token with mode context', {
      tokenId: id,
      algorithmId: algorithm.id,
      algorithmName: algorithm.name,
      value,
      iterationValue: n,
      taxonomyId: taxonomy.id,
      taxonomyName: taxonomy.name,
      termId,
      modeContext,
      modeContextKeys: Object.keys(modeContext),
      modeContextValues: Object.values(modeContext)
    });

    const { tokenGeneration } = algorithm;
    const { bulkAssignments, logicalMapping } = tokenGeneration!;

    // Start with the manually selected taxonomies from Bulk Assignments
    const taxonomiesArray = [...bulkAssignments.taxonomies];
    console.log('📚 TokenGenerationService.createTokenWithLogicalMappingAndModes: Initial taxonomies array', {
      taxonomiesArray,
      bulkAssignmentsTaxonomies: bulkAssignments.taxonomies
    });

    // Add the logical mapping taxonomy if it's not already included
    const logicalMappingTaxonomy = {
      taxonomyId: taxonomy.id,
      termId: termId
    };
    
    // Check if this taxonomy is already in the manually selected ones
    const isAlreadyIncluded = taxonomiesArray.some(t => t.taxonomyId === taxonomy.id);
    if (!isAlreadyIncluded) {
      taxonomiesArray.push(logicalMappingTaxonomy);
      console.log('📚 TokenGenerationService.createTokenWithLogicalMappingAndModes: Added logical mapping taxonomy', {
        logicalMappingTaxonomy,
        updatedTaxonomiesArray: taxonomiesArray
      });
    } else {
      console.log('📚 TokenGenerationService.createTokenWithLogicalMappingAndModes: Logical mapping taxonomy already included', {
        logicalMappingTaxonomy,
        existingTaxonomiesArray: taxonomiesArray
      });
    }

    // Generate display name from all taxonomy terms
    const displayName = this.generateDisplayNameFromTaxonomies(taxonomiesArray, availableTaxonomies, n, logicalMapping);
    console.log('🏷️ TokenGenerationService.createTokenWithLogicalMappingAndModes: Generated display name', {
      displayName,
      taxonomiesArray,
      iterationValue: n
    });

    // Extract mode IDs from mode context
    const modeIds = Object.values(modeContext).map(modeId => modeId);
    console.log('🔄 TokenGenerationService.createTokenWithLogicalMappingAndModes: Extracted mode IDs from context', {
      modeContext,
      modeIds,
      modeIdsCount: modeIds.length
    });

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
          modeIds: modeIds,
          value: {
            value: value.toString() // Return pure numeric value without units
          }
        }
      ]
    };

    console.log('🎯 TokenGenerationService.createTokenWithLogicalMappingAndModes: Token created successfully', {
      tokenId: token.id,
      displayName: token.displayName,
      resolvedValueTypeId: token.resolvedValueTypeId,
      modeIds: token.valuesByMode[0]?.modeIds,
      value: token.valuesByMode[0]?.value,
      taxonomiesCount: token.taxonomies.length,
      generatedByAlgorithm: token.generatedByAlgorithm,
      algorithmId: token.algorithmId
    });

    return token;
  }

  /**
   * Execute algorithm steps in order to calculate the final value
   * Enhanced to support mode-based variables
   */
  private static executeAlgorithmSteps(algorithm: Algorithm, n: number, modeContext?: Record<string, string>): number {
    console.log('⚙️ TokenGenerationService.executeAlgorithmSteps: Starting algorithm execution', {
      algorithmId: algorithm.id,
      algorithmName: algorithm.name,
      iterationValue: n,
      modeContext,
      stepsCount: algorithm.steps.length,
      variablesCount: algorithm.variables.length
    });

    try {
      // Use the new AlgorithmExecutionService for proper algorithm execution
      console.log('🔧 TokenGenerationService.executeAlgorithmSteps: Calling AlgorithmExecutionService.executeAlgorithm');
      const executionContext = AlgorithmExecutionService.executeAlgorithm(algorithm, n, {}, modeContext);
      
      console.log('✅ TokenGenerationService.executeAlgorithmSteps: Algorithm execution completed', {
        finalResult: executionContext.finalResult,
        finalResultType: typeof executionContext.finalResult,
        variables: executionContext.variables,
        results: executionContext.results
      });
      
      // Ensure the result is a number
      const result = executionContext.finalResult;
      if (typeof result === 'number' && !isNaN(result)) {
        console.log('✅ TokenGenerationService.executeAlgorithmSteps: Valid numeric result', { result });
        return result;
      } else if (typeof result === 'string') {
        // Try to parse string as number
        const parsed = parseFloat(result);
        if (!isNaN(parsed)) {
          console.log('✅ TokenGenerationService.executeAlgorithmSteps: Parsed string result to number', { 
            originalResult: result, 
            parsedResult: parsed 
          });
          return parsed;
        }
      }
      
      // If we can't get a valid number, throw an error
      const error = `Algorithm execution did not produce a valid number. Got: ${typeof result} ${result}`;
      console.error('❌ TokenGenerationService.executeAlgorithmSteps:', error, {
        result,
        resultType: typeof result,
        executionContext
      });
      throw new Error(error);
    } catch (error) {
      const errorMsg = `Algorithm execution failed: ${error}`;
      console.error('❌ TokenGenerationService.executeAlgorithmSteps:', errorMsg, {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        algorithmId: algorithm.id,
        iterationValue: n,
        modeContext
      });
      throw new Error(errorMsg);
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
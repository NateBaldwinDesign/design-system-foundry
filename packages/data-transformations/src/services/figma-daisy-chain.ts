import type { 
  FigmaVariable, 
  FigmaVariableCollection, 
  FigmaVariableModeValue 
} from '../types/figma';
import type { TokenSystem, Token } from '@token-model/data-model';
import { FigmaIdManager } from './figma-id-manager';
import { FigmaValueConverter } from './figma-value-converter';
import { generateUniqueId, mapPropertyTypesToFigmaScopes } from '../utils/helpers';

/**
 * Service for handling daisy-chaining logic for Figma variables
 * Implements the three-stage decomposition process from technical decisions:
 * 1. Intermediary variables in dimension collections for each mode combination
 * 2. Reference variables in subsequent collections that alias to previous intermediaries
 * 3. Final token collection variables
 */
export class FigmaDaisyChainService {
  constructor(
    private idManager: FigmaIdManager,
    private valueConverter: FigmaValueConverter
  ) {}

  /**
   * Transform a token to Figma variables with daisy-chaining
   * Creates proper intermediaries for multi-dimensional mode combinations
   */
  transformTokenWithDaisyChaining(
    token: Token,
    tokenSystem: TokenSystem,
    figmaCodeSyntax: { platformId: string; formattedName: string }
  ): { variables: FigmaVariable[], modeValues: FigmaVariableModeValue[] } {
    const variables: FigmaVariable[] = [];
    const modeValues: FigmaVariableModeValue[] = [];

    // Get dimensions that this token actually uses
    const usedDimensions = this.getUsedDimensionsForToken(token, tokenSystem);
    
    if (usedDimensions.length === 0) {
      console.log(`[FigmaDaisyChain] Token ${token.id} has no dimension dependencies, creating direct variable`);
      const variable = this.createDirectVariable(token, tokenSystem, figmaCodeSyntax);
      variables.push(variable);
      
      // Direct variables don't need mode values - they have direct values
      return { variables, modeValues };
    }

    console.log(`[FigmaDaisyChain] Token ${token.id} uses dimensions:`, usedDimensions.map(d => d.displayName));

    // Stage 1: Create intermediary variables for each dimension
    let modeToVariableMap: Record<string, string> = {};
    
    for (let i = 0; i < usedDimensions.length; i++) {
      const dimension = usedDimensions[i];
      const isFirstDimension = i === 0;
      const isLastDimension = i === usedDimensions.length - 1;
      const isSingleDimension = usedDimensions.length === 1;
      
      console.log(`[FigmaDaisyChain] Stage ${i + 1}: Creating intermediaries for dimension "${dimension.displayName}"`);
      
      if (isFirstDimension && !isSingleDimension) {
        // First dimension (multi-dimensional tokens): create intermediaries with actual values
        const intermediaryResult = this.createIntermediaryVariablesForDimension(
          token,
          tokenSystem,
          figmaCodeSyntax,
          dimension,
          usedDimensions,
          true // isFirstDimension = true
        );
        variables.push(...intermediaryResult.dimensionVariables);
        modeValues.push(...intermediaryResult.dimensionModeValues);
        Object.assign(modeToVariableMap, intermediaryResult.modeToVariableMap);
      } else {
        // Subsequent dimensions OR single dimension: create reference variables that alias to previous intermediaries
        const referenceResult = this.createReferenceVariablesForDimension(
          token,
          tokenSystem,
          figmaCodeSyntax,
          dimension,
          modeToVariableMap,
          usedDimensions.slice(0, i + 1)
        );
        variables.push(...referenceResult.referenceVariables);
        modeValues.push(...referenceResult.referenceModeValues);
        
        // Update the mode to variable map for the next iteration
        Object.assign(modeToVariableMap, referenceResult.newModeToVariableMap);
      }
    }

    // Stage 3: Create the final token variable that references the last intermediary
    console.log(`[FigmaDaisyChain] Stage ${usedDimensions.length + 1}: Creating final token variable`);
    const finalVariable = this.createFinalTokenVariable(
      token,
      tokenSystem,
      figmaCodeSyntax,
      modeToVariableMap
    );
    variables.push(finalVariable);

    // Create mode values for the final token variable for each mode in the last dimension
    if (usedDimensions.length > 0) {
      const lastDimension = usedDimensions[usedDimensions.length - 1];
      const finalModeValues = this.createFinalTokenVariableModeValues(
        token,
        tokenSystem,
        finalVariable.id,
        lastDimension,
        modeToVariableMap
      );
      modeValues.push(...finalModeValues);
    }

    return { variables, modeValues };
  }

  /**
   * Get the dimensions that a token actually uses (has values for)
   * Only includes dimensions where the token has mode-specific values
   */
  private getUsedDimensionsForToken(token: Token, tokenSystem: TokenSystem): any[] {
    const usedDimensionIds = new Set<string>();
    
    // Collect all dimension IDs that the token has values for
    for (const valueByMode of token.valuesByMode || []) {
      for (const modeId of valueByMode.modeIds) {
        // Find which dimension this mode belongs to
        for (const dimension of tokenSystem.dimensions || []) {
          if (dimension.modes?.some((mode: any) => mode.id === modeId)) {
            usedDimensionIds.add(dimension.id);
            break;
          }
        }
      }
    }

    // Return dimensions in the order they appear in dimensionOrder
    const usedDimensions: any[] = [];
    for (const dimensionId of tokenSystem.dimensionOrder || []) {
      if (usedDimensionIds.has(dimensionId)) {
        const dimension = tokenSystem.dimensions?.find((d: any) => d.id === dimensionId);
        if (dimension) {
          usedDimensions.push(dimension);
        }
      }
    }

    return usedDimensions;
  }

  /**
   * Create intermediary variables for a dimension
   * These contain the actual values for each mode combination
   */
  private createIntermediaryVariablesForDimension(
    token: Token,
    tokenSystem: TokenSystem,
    figmaCodeSyntax: { platformId: string; formattedName: string },
    dimension: any,
    allUsedDimensions: any[],
    isFirstDimension: boolean
  ): { 
    dimensionVariables: FigmaVariable[], 
    dimensionModeValues: FigmaVariableModeValue[],
    modeToVariableMap: Record<string, string>
  } {
    const variables: FigmaVariable[] = [];
    const modeValues: FigmaVariableModeValue[] = [];
    const modeToVariableMap: Record<string, string> = {};

    // Generate deterministic ID for the dimension
    const deterministicDimensionId = this.idManager.generateDeterministicId(dimension.id, 'collection');

    if (isFirstDimension) {
      // For the first dimension, create one variable per mode in the next dimension
      const nextDimension = allUsedDimensions[1];
      if (nextDimension) {
        for (const nextMode of nextDimension.modes || []) {
          // Generate deterministic ID for the next mode
          const deterministicNextModeId = this.idManager.generateDeterministicId(nextMode.id, 'mode');
          
          const variableId = `intermediary-${token.id}-${deterministicDimensionId}-${deterministicNextModeId}`;
          const variableName = `${figmaCodeSyntax.formattedName} (${dimension.displayName} - ${nextMode.name})`;
          
          console.log(`[FigmaDaisyChain] Creating intermediary variable "${variableName}" action: CREATE`);
          
          const variable: FigmaVariable = {
            action: this.idManager.determineAction(variableId),
            id: this.idManager.getFigmaId(variableId),
            name: variableName,
            variableCollectionId: this.idManager.getFigmaId(deterministicDimensionId),
            resolvedType: this.valueConverter.mapToFigmaVariableType(token.resolvedValueTypeId, tokenSystem),
            scopes: ['ALL_SCOPES'],
            hiddenFromPublishing: true
          };
          
          variables.push(variable);
          modeToVariableMap[deterministicNextModeId] = this.idManager.getFigmaId(variableId);

          // Create mode values for each mode in the current dimension
          for (const mode of dimension.modes || []) {
            // Generate deterministic ID for the mode
            const deterministicModeId = this.idManager.generateDeterministicId(mode.id, 'mode');
            
            // Find the value for this mode combination
            const valueByMode = this.findValueByModeForModeCombination(token, [deterministicModeId, deterministicNextModeId]);
            
            let modeValue: FigmaVariableModeValue;
            
            // Check if this is a token reference
            if (valueByMode.value && typeof valueByMode.value === 'object' && 'tokenId' in valueByMode.value) {
              // Create VARIABLE_ALIAS to the referenced token
              const referencedTokenId = (valueByMode.value as any).tokenId;
              const referencedToken = tokenSystem.tokens?.find(t => t.id === referencedTokenId);
              
              if (referencedToken) {
                // Find the referenced token's value for this mode
                const referencedValueByMode = referencedToken.valuesByMode?.find(vbm => 
                  vbm.modeIds.includes(mode.id)
                );
                
                if (referencedValueByMode) {
                  // Check if the referenced token is single-dimension or multi-dimensional
                  const referencedTokenDimensions = this.getUsedDimensionsForToken(referencedToken, tokenSystem);
                  
                  if (referencedTokenDimensions.length === 1) {
                    // Single-dimension token: alias to the final token variable (always use mapped Figma ID)
                    const referencedVariableId = this.idManager.getFigmaId(referencedTokenId);
                    modeValue = {
                      variableId: this.idManager.getFigmaId(variableId),
                      modeId: this.idManager.getFigmaId(deterministicModeId),
                      value: {
                        type: 'VARIABLE_ALIAS',
                        id: referencedVariableId
                      }
                    };
                  } else {
                    // Multi-dimensional token: alias to the appropriate intermediary
                    const referencedVariableId = `intermediary-${referencedTokenId}-${deterministicDimensionId}-${deterministicModeId}`;
                    modeValue = {
                      variableId: this.idManager.getFigmaId(variableId),
                      modeId: this.idManager.getFigmaId(deterministicModeId),
                      value: {
                        type: 'VARIABLE_ALIAS',
                        id: this.idManager.getFigmaId(referencedVariableId)
                      }
                    };
                  }
                } else {
                  // Fallback: use placeholder
                  modeValue = {
                    variableId: this.idManager.getFigmaId(variableId),
                    modeId: this.idManager.getFigmaId(deterministicModeId),
                    value: this.valueConverter.getAliasPlaceholderValue(tokenSystem, token.resolvedValueTypeId)
                  };
                }
              } else {
                // Fallback: use placeholder
                modeValue = {
                  variableId: this.idManager.getFigmaId(variableId),
                  modeId: this.idManager.getFigmaId(deterministicModeId),
                  value: this.valueConverter.getAliasPlaceholderValue(tokenSystem, token.resolvedValueTypeId)
                };
              }
            } else {
              // Direct value - convert normally
              const convertedValue = this.valueConverter.convertValue(valueByMode.value, token.resolvedValueTypeId, tokenSystem);
              modeValue = {
                variableId: this.idManager.getFigmaId(variableId),
                modeId: this.idManager.getFigmaId(deterministicModeId),
                value: convertedValue
              };
            }
            
            modeValues.push(modeValue);
          }
        }
      }
    } else {
      // For subsequent dimensions, create one variable for the entire collection
      const variableId = `intermediary-${token.id}-${deterministicDimensionId}`;
      const variableName = `${figmaCodeSyntax.formattedName} (${dimension.displayName})`;
      
      console.log(`[FigmaDaisyChain] Creating intermediary variable "${variableName}" action: CREATE`);
      
      const variable: FigmaVariable = {
        action: this.idManager.determineAction(variableId),
        id: this.idManager.getFigmaId(variableId),
        name: variableName,
        variableCollectionId: this.idManager.getFigmaId(deterministicDimensionId),
        resolvedType: this.valueConverter.mapToFigmaVariableType(token.resolvedValueTypeId, tokenSystem),
        scopes: ['ALL_SCOPES'],
        hiddenFromPublishing: true
      };
      
      variables.push(variable);
      modeToVariableMap[deterministicDimensionId] = this.idManager.getFigmaId(variableId);

      // Create mode values for each mode in this dimension
      for (const mode of dimension.modes || []) {
        // Generate deterministic ID for the mode
        const deterministicModeId = this.idManager.generateDeterministicId(mode.id, 'mode');
        
        // Find the value for this mode
        const valueByMode = this.findValueByModeForModeCombination(token, [deterministicModeId]);
        
        let modeValue: FigmaVariableModeValue;
        
        // Check if this is a token reference
        if (valueByMode.value && typeof valueByMode.value === 'object' && 'tokenId' in valueByMode.value) {
          // Create VARIABLE_ALIAS to the referenced token
          const referencedTokenId = (valueByMode.value as any).tokenId;
          const referencedToken = tokenSystem.tokens?.find(t => t.id === referencedTokenId);
          
          if (referencedToken) {
            // Find the referenced token's value for this mode
            const referencedValueByMode = referencedToken.valuesByMode?.find(vbm => 
              vbm.modeIds.includes(mode.id)
            );
            
            if (referencedValueByMode) {
              // Check if the referenced token is single-dimension or multi-dimensional
              const referencedTokenDimensions = this.getUsedDimensionsForToken(referencedToken, tokenSystem);
              
              if (referencedTokenDimensions.length === 1) {
                // Single-dimension token: alias to the final token variable (always use mapped Figma ID)
                const referencedVariableId = this.idManager.getFigmaId(referencedTokenId);
                modeValue = {
                  variableId: this.idManager.getFigmaId(variableId),
                  modeId: this.idManager.getFigmaId(deterministicModeId),
                  value: {
                    type: 'VARIABLE_ALIAS',
                    id: referencedVariableId
                  }
                };
              } else {
                // Multi-dimensional token: alias to the appropriate intermediary
                const referencedVariableId = `intermediary-${referencedTokenId}-${deterministicDimensionId}-${deterministicModeId}`;
                modeValue = {
                  variableId: this.idManager.getFigmaId(variableId),
                  modeId: this.idManager.getFigmaId(deterministicModeId),
                  value: {
                    type: 'VARIABLE_ALIAS',
                    id: this.idManager.getFigmaId(referencedVariableId)
                  }
                };
              }
            } else {
              // Fallback: use placeholder
              modeValue = {
                variableId: this.idManager.getFigmaId(variableId),
                modeId: this.idManager.getFigmaId(deterministicModeId),
                value: this.valueConverter.getAliasPlaceholderValue(tokenSystem, token.resolvedValueTypeId)
              };
            }
          } else {
            // Fallback: use placeholder
            modeValue = {
              variableId: this.idManager.getFigmaId(variableId),
              modeId: this.idManager.getFigmaId(deterministicModeId),
              value: this.valueConverter.getAliasPlaceholderValue(tokenSystem, token.resolvedValueTypeId)
            };
          }
        } else {
          // Direct value - convert normally
          const convertedValue = this.valueConverter.convertValue(valueByMode.value, token.resolvedValueTypeId, tokenSystem);
          modeValue = {
            variableId: this.idManager.getFigmaId(variableId),
            modeId: this.idManager.getFigmaId(deterministicModeId),
            value: convertedValue
          };
        }
        
        modeValues.push(modeValue);
      }
    }

    return {
      dimensionVariables: variables,
      dimensionModeValues: modeValues,
      modeToVariableMap
    };
  }

  /**
   * Create reference variables for subsequent dimensions
   * These alias to the appropriate intermediaries from previous dimensions
   * For single-dimensional tokens, this creates intermediaries with actual values
   */
  private createReferenceVariablesForDimension(
    token: Token,
    tokenSystem: TokenSystem,
    figmaCodeSyntax: { platformId: string; formattedName: string },
    dimension: any,
    modeToVariableMap: Record<string, string>,
    dimensionsUpToThis: any[]
  ): { 
    referenceVariables: FigmaVariable[], 
    referenceModeValues: FigmaVariableModeValue[],
    newModeToVariableMap: Record<string, string>
  } {
    const variables: FigmaVariable[] = [];
    const modeValues: FigmaVariableModeValue[] = [];
    const newModeToVariableMap: Record<string, string> = {};

    // Generate deterministic ID for the dimension
    const deterministicDimensionId = this.idManager.generateDeterministicId(dimension.id, 'collection');

    // Check if this is a single-dimensional token (no previous intermediaries)
    const isSingleDimension = Object.keys(modeToVariableMap).length === 0;

    if (isSingleDimension) {
      // For single-dimensional tokens, create intermediaries with actual values
      const variableId = `intermediary-${token.id}-${deterministicDimensionId}`;
      const variableName = `${figmaCodeSyntax.formattedName} (${dimension.displayName})`;
      
      console.log(`[FigmaDaisyChain] Creating single-dimension intermediary variable "${variableName}" action: CREATE`);
      
      const variable: FigmaVariable = {
        action: this.idManager.determineAction(variableId),
        id: this.idManager.getFigmaId(variableId),
        name: variableName,
        variableCollectionId: this.idManager.getFigmaId(deterministicDimensionId),
        resolvedType: this.valueConverter.mapToFigmaVariableType(token.resolvedValueTypeId, tokenSystem),
        scopes: ['ALL_SCOPES'],
        hiddenFromPublishing: true
      };
      
      variables.push(variable);
      newModeToVariableMap[deterministicDimensionId] = this.idManager.getFigmaId(variableId);

      // Create mode values for each mode in this dimension
      for (const mode of dimension.modes || []) {
        // Generate deterministic ID for the mode
        const deterministicModeId = this.idManager.generateDeterministicId(mode.id, 'mode');
        
        // Find the value for this mode
        const valueByMode = this.findValueByModeForModeCombination(token, [deterministicModeId]);
        
        let modeValue: FigmaVariableModeValue;
        
        // Check if this is a token reference
        if (valueByMode.value && typeof valueByMode.value === 'object' && 'tokenId' in valueByMode.value) {
          // Create VARIABLE_ALIAS to the referenced token
          const referencedTokenId = (valueByMode.value as any).tokenId;
          const referencedToken = tokenSystem.tokens?.find(t => t.id === referencedTokenId);
          
          if (referencedToken) {
            // Find the referenced token's value for this mode
            const referencedValueByMode = referencedToken.valuesByMode?.find(vbm => 
              vbm.modeIds.includes(mode.id)
            );
            
            if (referencedValueByMode) {
              // Check if the referenced token is single-dimension or multi-dimensional
              const referencedTokenDimensions = this.getUsedDimensionsForToken(referencedToken, tokenSystem);
              
              if (referencedTokenDimensions.length === 1) {
                // Single-dimension token: alias to the final token variable (always use mapped Figma ID)
                const referencedVariableId = this.idManager.getFigmaId(referencedTokenId);
                modeValue = {
                  variableId: this.idManager.getFigmaId(variableId),
                  modeId: this.idManager.getFigmaId(deterministicModeId),
                  value: {
                    type: 'VARIABLE_ALIAS',
                    id: referencedVariableId
                  }
                };
              } else {
                // Multi-dimensional token: alias to the appropriate intermediary
                const referencedVariableId = `intermediary-${referencedTokenId}-${deterministicDimensionId}-${deterministicModeId}`;
                modeValue = {
                  variableId: this.idManager.getFigmaId(variableId),
                  modeId: this.idManager.getFigmaId(deterministicModeId),
                  value: {
                    type: 'VARIABLE_ALIAS',
                    id: this.idManager.getFigmaId(referencedVariableId)
                  }
                };
              }
            } else {
              // Fallback: use placeholder
              modeValue = {
                variableId: this.idManager.getFigmaId(variableId),
                modeId: this.idManager.getFigmaId(deterministicModeId),
                value: this.valueConverter.getAliasPlaceholderValue(tokenSystem, token.resolvedValueTypeId)
              };
            }
          } else {
            // Fallback: use placeholder
            modeValue = {
              variableId: this.idManager.getFigmaId(variableId),
              modeId: this.idManager.getFigmaId(deterministicModeId),
              value: this.valueConverter.getAliasPlaceholderValue(tokenSystem, token.resolvedValueTypeId)
            };
          }
        } else {
          // Direct value - convert normally
          const convertedValue = this.valueConverter.convertValue(valueByMode.value, token.resolvedValueTypeId, tokenSystem);
          modeValue = {
            variableId: this.idManager.getFigmaId(variableId),
            modeId: this.idManager.getFigmaId(deterministicModeId),
            value: convertedValue
          };
        }
        
        modeValues.push(modeValue);
      }
    } else {
      // For multi-dimensional tokens, create reference variables that alias to previous intermediaries
      const referenceVariableId = `reference-${token.id}-${deterministicDimensionId}`;
      const referenceVariableName = `${figmaCodeSyntax.formattedName} (${dimension.displayName})`;
      
      console.log(`[FigmaDaisyChain] Creating reference variable "${referenceVariableName}" action: CREATE`);
      
      const referenceVariable: FigmaVariable = {
        action: this.idManager.determineAction(referenceVariableId),
        id: this.idManager.getFigmaId(referenceVariableId),
        name: referenceVariableName,
        variableCollectionId: this.idManager.getFigmaId(deterministicDimensionId),
        resolvedType: this.valueConverter.mapToFigmaVariableType(token.resolvedValueTypeId, tokenSystem),
        scopes: ['ALL_SCOPES'],
        hiddenFromPublishing: true
      };
      
      variables.push(referenceVariable);

      // Create mode values for each mode in this dimension
      for (const mode of dimension.modes || []) {
        // Generate deterministic ID for the mode
        const deterministicModeId = this.idManager.generateDeterministicId(mode.id, 'mode');
        
        // For multi-dimensional tokens, look up by mode ID
        // For single-dimension tokens, look up by dimension ID
        let targetVariableId = modeToVariableMap[deterministicModeId] || modeToVariableMap[deterministicDimensionId];
        if (targetVariableId && targetVariableId.startsWith('token-')) {
          targetVariableId = this.idManager.getFigmaId(targetVariableId);
        }
        
        if (targetVariableId) {
          const modeValue: FigmaVariableModeValue = {
            variableId: this.idManager.getFigmaId(referenceVariableId),
            modeId: this.idManager.getFigmaId(deterministicModeId),
            value: {
              type: 'VARIABLE_ALIAS',
              id: targetVariableId
            }
          };
          modeValues.push(modeValue);
          newModeToVariableMap[deterministicModeId] = this.idManager.getFigmaId(referenceVariableId);
        }
      }
    }

    return {
      referenceVariables: variables,
      referenceModeValues: modeValues,
      newModeToVariableMap: newModeToVariableMap
    };
  }

  /**
   * Get mode combinations for a dimension
   * Includes all combinations that have at least one mode from this dimension
   */
  private getModeCombinationsForDimension(
    token: Token, 
    dimension: any, 
    allUsedDimensions: any[]
  ): string[][] {
    const combinations: string[][] = [];
    
    // Get all mode combinations from the token's valuesByMode
    for (const valueByMode of token.valuesByMode || []) {
      if (valueByMode.modeIds.length > 0) {
        // Check if this combination includes at least one mode from this dimension
        const hasDimensionMode = valueByMode.modeIds.some(modeId => 
          dimension.modes?.some((m: any) => m.id === modeId)
        );
        
        if (hasDimensionMode) {
          // Fill in missing default modes for other dimensions
          const expandedCombination = this.expandModeCombinationWithDefaults(
            valueByMode.modeIds, 
            allUsedDimensions
          );
          combinations.push(expandedCombination);
        }
      }
    }

    return combinations;
  }



  /**
   * Expand a mode combination to include default modes for missing dimensions
   */
  private expandModeCombinationWithDefaults(
    modeIds: string[], 
    dimensions: any[]
  ): string[] {
    const expanded = [...modeIds];
    
    for (const dimension of dimensions) {
      // Check if this dimension has any modes in the combination
      const hasDimensionMode = modeIds.some(modeId => 
        dimension.modes?.some((m: any) => m.id === modeId)
      );
      
      // If not, add the default mode for this dimension
      if (!hasDimensionMode && dimension.defaultMode) {
        expanded.push(dimension.defaultMode);
      }
    }
    
    return expanded;
  }

  /**
   * Expand a mode combination to include default modes for missing dimensions
   */
  private expandModeCombinations(
    modeIds: string[], 
    dimensions: any[]
  ): string[] {
    const expanded = [...modeIds];
    
    for (const dimension of dimensions) {
      // Check if this dimension has any modes in the combination
      const hasDimensionMode = modeIds.some(modeId => 
        dimension.modes?.some((m: any) => m.id === modeId)
      );
      
      // If not, add the default mode for this dimension
      if (!hasDimensionMode && dimension.defaultMode) {
        expanded.push(dimension.defaultMode);
      }
    }
    
    return expanded;
  }

  /**
   * Find the value for a specific mode combination
   */
  private findValueByModeForModeCombination(token: Token, modeIds: string[]): any {
    return token.valuesByMode?.find(vbm => 
      modeIds.every(modeId => vbm.modeIds.includes(modeId))
    ) || { value: null };
  }

  /**
   * Create a key for a mode combination
   */
  private createModeKey(modeIds: string[]): string {
    return modeIds.sort().join('|');
  }

  /**
   * Get default mode IDs for all dimensions
   */
  private getDefaultModeIdsForDimensions(dimensions: any[]): string[] {
    return dimensions.map(dimension => dimension.defaultMode).filter(Boolean);
  }

  /**
   * Create a final token variable in the collection
   * This variable will be the one that users see and interact with
   */
  private createFinalTokenVariable(
    token: Token,
    tokenSystem: TokenSystem,
    figmaCodeSyntax: { platformId: string; formattedName: string },
    modeToVariableMap: Record<string, string>
  ): FigmaVariable {
    const figmaId = this.idManager.getFigmaId(token.id);
    const action = this.idManager.determineAction(token.id);

    console.log(`[FigmaDaisyChain] Creating final token variable "${figmaCodeSyntax.formattedName}" action: ${action}`);

    const variable: FigmaVariable = {
      action: action,
      id: figmaId,
      name: figmaCodeSyntax.formattedName,
      variableCollectionId: this.getTokenCollectionId(token, tokenSystem),
      resolvedType: this.valueConverter.mapToFigmaVariableType(token.resolvedValueTypeId, tokenSystem),
      scopes: mapPropertyTypesToFigmaScopes(token.propertyTypes || []),
      hiddenFromPublishing: token.private || false,
      codeSyntax: this.buildCodeSyntax(token, tokenSystem)
    };

    // Add description if it exists and is not empty
    if (token.description && token.description.trim() !== '') {
      variable.description = token.description;
      console.log(`[FigmaDaisyChain] Added description to final variable ${token.id}: "${token.description}"`);
    } else {
      console.log(`[FigmaDaisyChain] No valid description for final token ${token.id}`);
    }

    return variable;
  }

  /**
   * Create mode values for the final token variable in the collection
   * Each mode value is a VARIABLE_ALIAS pointing to the correct reference variable or intermediary
   */
  private createFinalTokenVariableModeValues(
    token: Token,
    tokenSystem: TokenSystem,
    finalVariableId: string,
    lastDimension: any,
    modeToVariableMap: Record<string, string>
  ): FigmaVariableModeValue[] {
    const modeValues: FigmaVariableModeValue[] = [];
    
    // Get the token collection that this variable belongs to
    const tokenCollection = this.findTokenCollection(token, tokenSystem);
    
    if (tokenCollection) {
      // Generate deterministic ID for the token collection
      const deterministicCollectionId = this.idManager.generateDeterministicId(tokenCollection.id, 'collection');
      
      // Token collections have a single "Value" mode
      // Use deterministic ID generation: mode-tokenCollection-{collection.id}
      const deterministicModeId = `mode-tokenCollection-${deterministicCollectionId}`;
      const valueModeId = this.idManager.getFigmaId(deterministicModeId);
      
      // For multi-dimensional tokens, we need to find the reference variable that was created for the last dimension
      // The reference variable ID follows the pattern: reference-${token.id}-${lastDimension.id}
      const referenceVariableId = `reference-${token.id}-${lastDimension.id}`;
      
      // Check if this reference variable exists in the modeToVariableMap (it should be mapped by mode IDs)
      let targetVariableId = null;
      
      // First, try to find the reference variable by looking for any mode ID that maps to it
      for (const mode of lastDimension.modes || []) {
        const deterministicModeId = this.idManager.generateDeterministicId(mode.id, 'mode');
        if (modeToVariableMap[deterministicModeId] === this.idManager.getFigmaId(referenceVariableId)) {
          targetVariableId = this.idManager.getFigmaId(referenceVariableId);
          break;
        }
      }
      
      // If not found by mode ID, check if it's mapped by dimension ID (for single-dimensional tokens)
      if (!targetVariableId) {
        const deterministicDimensionId = this.idManager.generateDeterministicId(lastDimension.id, 'collection');
        targetVariableId = modeToVariableMap[deterministicDimensionId];
      }
      
      // If the target is a token ID (starts with 'token-'), convert it to the mapped Figma ID
      if (targetVariableId && targetVariableId.startsWith('token-')) {
        targetVariableId = this.idManager.getFigmaId(targetVariableId);
      }
      
      if (targetVariableId) {
        const modeValue: FigmaVariableModeValue = {
          variableId: finalVariableId,
          modeId: valueModeId,
          value: {
            type: 'VARIABLE_ALIAS',
            id: targetVariableId
          }
        };
        modeValues.push(modeValue);
      }
    } else {
      // Fallback: use dimension modes directly
      for (const mode of lastDimension.modes || []) {
        const targetVariableId = modeToVariableMap[mode.id];
        if (targetVariableId) {
          const modeValue: FigmaVariableModeValue = {
            variableId: finalVariableId,
            modeId: mode.id,
            value: {
              type: 'VARIABLE_ALIAS',
              id: targetVariableId
            }
          };
          modeValues.push(modeValue);
        }
      }
    }

    return modeValues;
  }

  /**
   * Create a direct variable for tokens without dimension dependencies
   */
  private createDirectVariable(
    token: Token,
    tokenSystem: TokenSystem,
    figmaCodeSyntax: { platformId: string; formattedName: string }
  ): FigmaVariable {
    const figmaId = this.idManager.getFigmaId(token.id);
    const action = this.idManager.determineAction(token.id);

    const variable: FigmaVariable = {
      action: action,
      id: figmaId,
      name: figmaCodeSyntax.formattedName,
      variableCollectionId: this.getTokenCollectionId(token, tokenSystem),
      resolvedType: this.valueConverter.mapToFigmaVariableType(token.resolvedValueTypeId, tokenSystem),
      scopes: mapPropertyTypesToFigmaScopes(token.propertyTypes || []),
      hiddenFromPublishing: token.private || false,
      codeSyntax: this.buildCodeSyntax(token, tokenSystem)
    };

    // Add description if it exists and is not empty
    if (token.description && token.description.trim() !== '') {
      variable.description = token.description;
      console.log(`[FigmaDaisyChain] Added description to direct variable ${token.id}: "${token.description}"`);
    } else {
      console.log(`[FigmaDaisyChain] No valid description for direct token ${token.id}`);
    }

    return variable;
  }

  /**
   * Get the token collection ID for a token
   */
  private getTokenCollectionId(token: Token, tokenSystem: TokenSystem): string {
    const tokenCollection = this.findTokenCollection(token, tokenSystem);
    if (!tokenCollection) {
      return 'default-collection';
    }
    
    // Generate deterministic ID for the token collection and get the mapped Figma ID
    const deterministicId = this.idManager.generateDeterministicId(tokenCollection.id, 'collection');
    return this.idManager.getFigmaId(deterministicId);
  }

  /**
   * Find which token collection a token belongs to based on its resolvedValueTypeId
   */
  private findTokenCollection(token: Token, tokenSystem: TokenSystem): any {
    return tokenSystem.tokenCollections?.find((collection: any) => 
      collection.resolvedValueTypeIds.includes(token.resolvedValueTypeId)
    ) || null;
  }

  /**
   * Build code syntax for a token using pre-generated data
   */
  private buildCodeSyntax(token: Token, tokenSystem: TokenSystem): any {
    // Use pre-generated code syntax from the preprocessor
    return (token as Token & { codeSyntax?: Record<string, string> }).codeSyntax || {};
  }

  /**
   * Get unique mode combinations from other dimensions
   * For a given dimension, get all unique combinations of modes from other dimensions
   */
  private getOtherDimensionModeCombinations(token: Token, otherDimensions: any[]): string[][] {
    const combinations: string[][] = [];
    
    // Get all mode combinations from the token's valuesByMode
    for (const valueByMode of token.valuesByMode || []) {
      if (valueByMode.modeIds.length > 0) {
        // Extract only the modes that belong to other dimensions
        const otherDimensionModes = valueByMode.modeIds.filter(modeId => 
          otherDimensions.some(dimension => 
            dimension.modes?.some((m: any) => m.id === modeId)
          )
        );
        
        if (otherDimensionModes.length > 0) {
          // Fill in missing default modes for other dimensions
          const expandedCombination = this.expandModeCombinationWithDefaults(
            otherDimensionModes, 
            otherDimensions
          );
          
          // Check if this combination is unique
          const combinationKey = this.createModeKey(expandedCombination);
          const isUnique = !combinations.some(existing => 
            this.createModeKey(existing) === combinationKey
          );
          
          if (isUnique) {
            combinations.push(expandedCombination);
          }
        }
      }
    }

    return combinations;
  }
} 
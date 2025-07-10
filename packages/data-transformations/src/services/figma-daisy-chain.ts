import type { 
  FigmaVariable, 
  FigmaVariableCollection, 
  FigmaVariableModeValue 
} from '../types/figma';
import type { TokenSystem, Token } from '@token-model/data-model';
import { FigmaIdManager } from './figma-id-manager';
import { FigmaValueConverter } from './figma-value-converter';
import { generateUniqueId } from '../utils/helpers';

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
      
      console.log(`[FigmaDaisyChain] Stage ${i + 1}: Creating intermediaries for dimension "${dimension.displayName}"`);
      
      if (isFirstDimension) {
        // First dimension: create intermediaries with actual values
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
        // Subsequent dimensions: create reference variables that alias to previous intermediaries
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
   * Creates one variable per collection with multiple mode values
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

    // Determine the next dimension (if any)
    const currentDimIndex = allUsedDimensions.findIndex((d: any) => d.id === dimension.id);
    const nextDimension = allUsedDimensions[currentDimIndex + 1];

    if (nextDimension) {
      // For multi-dimensional tokens: create one variable per mode in the next dimension
      for (const nextMode of nextDimension.modes) {
        const variableId = `intermediary-${token.id}-${dimension.id}-${nextMode.id}`;
        const variableName = `${figmaCodeSyntax.formattedName} (${dimension.displayName} - ${nextMode.name})`;
        
        const variable: FigmaVariable = {
          action: 'CREATE',
          id: variableId,
          name: variableName,
          variableCollectionId: dimension.id,
          resolvedType: this.valueConverter.mapToFigmaVariableType(token.resolvedValueTypeId, tokenSystem),
          scopes: ['ALL_SCOPES'],
          hiddenFromPublishing: true
        };
        variables.push(variable);
        
        // Map by next dimension's mode ID
        modeToVariableMap[nextMode.id] = variableId;
        
        // Create mode values for each mode in this dimension
        for (const mode of dimension.modes) {
          // Find the value for this mode combination
          const valueByMode = token.valuesByMode?.find(vbm => 
            vbm.modeIds.includes(mode.id) && vbm.modeIds.includes(nextMode.id)
          );
          
          if (valueByMode) {
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
                      variableId,
                      modeId: mode.id,
                      value: {
                        type: 'VARIABLE_ALIAS',
                        id: referencedVariableId
                      }
                    };
                  } else {
                    // Multi-dimensional token: alias to the appropriate intermediary
                    const referencedVariableId = `intermediary-${referencedTokenId}-${dimension.id}-${mode.id}`;
                    modeValue = {
                      variableId,
                      modeId: mode.id,
                      value: {
                        type: 'VARIABLE_ALIAS',
                        id: referencedVariableId
                      }
                    };
                  }
                } else {
                  // Fallback: use placeholder
                  modeValue = {
                    variableId,
                    modeId: mode.id,
                    value: this.valueConverter.getAliasPlaceholderValue(tokenSystem, token.resolvedValueTypeId)
                  };
                }
              } else {
                // Fallback: use placeholder
                modeValue = {
                  variableId,
                  modeId: mode.id,
                  value: this.valueConverter.getAliasPlaceholderValue(tokenSystem, token.resolvedValueTypeId)
                };
              }
            } else {
              // Direct value - convert normally
              const convertedValue = this.valueConverter.convertValue(valueByMode.value, token.resolvedValueTypeId, tokenSystem);
              modeValue = {
                variableId,
                modeId: mode.id,
                value: convertedValue
              };
            }
            
            modeValues.push(modeValue);
          }
        }
      }
    } else {
      // Single-dimension: create one variable for the entire collection
      const variableId = `intermediary-${token.id}-${dimension.id}`;
      const variableName = `${figmaCodeSyntax.formattedName} (${dimension.displayName})`;
      
      const variable: FigmaVariable = {
        action: 'CREATE',
        id: variableId,
        name: variableName,
        variableCollectionId: dimension.id,
        resolvedType: this.valueConverter.mapToFigmaVariableType(token.resolvedValueTypeId, tokenSystem),
        scopes: ['ALL_SCOPES'],
        hiddenFromPublishing: true
      };
      variables.push(variable);
      
      // Map by dimension ID for single-dimension tokens
      // For single-dimension tokens, map to the intermediary variable ID (not the final token variable)
      modeToVariableMap[dimension.id] = variableId;
      
      // Create mode values for each mode in this dimension
      for (const mode of dimension.modes) {
        // Find the value for this mode
        const valueByMode = token.valuesByMode?.find(vbm => vbm.modeIds.includes(mode.id));
        
        if (valueByMode) {
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
                      variableId,
                      modeId: mode.id,
                      value: {
                        type: 'VARIABLE_ALIAS',
                        id: referencedVariableId
                      }
                    };
                  } else {
                    // Multi-dimensional token: alias to the appropriate intermediary
                    const referencedVariableId = `intermediary-${referencedTokenId}-${dimension.id}-${mode.id}`;
                    modeValue = {
                      variableId,
                      modeId: mode.id,
                      value: {
                        type: 'VARIABLE_ALIAS',
                        id: referencedVariableId
                      }
                    };
                  }
                } else {
                  // Fallback: use placeholder
                  modeValue = {
                    variableId,
                    modeId: mode.id,
                    value: this.valueConverter.getAliasPlaceholderValue(tokenSystem, token.resolvedValueTypeId)
                  };
                }
              } else {
                // Fallback: use placeholder
                modeValue = {
                  variableId,
                  modeId: mode.id,
                  value: this.valueConverter.getAliasPlaceholderValue(tokenSystem, token.resolvedValueTypeId)
                };
              }
          } else {
            // Direct value - convert normally
            const convertedValue = this.valueConverter.convertValue(valueByMode.value, token.resolvedValueTypeId, tokenSystem);
            modeValue = {
              variableId,
              modeId: mode.id,
              value: convertedValue
            };
          }
          
          modeValues.push(modeValue);
        }
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

    // Create one reference variable for this dimension
    const referenceVariableId = `reference-${token.id}-${dimension.id}`;
    const referenceVariableName = `${figmaCodeSyntax.formattedName} (${dimension.displayName})`;
    
    console.log(`[FigmaDaisyChain] Creating reference variable "${referenceVariableName}" action: CREATE`);
    
    const referenceVariable: FigmaVariable = {
      action: 'CREATE',
      id: referenceVariableId,
      name: referenceVariableName,
      variableCollectionId: dimension.id,
      resolvedType: this.valueConverter.mapToFigmaVariableType(token.resolvedValueTypeId, tokenSystem),
      scopes: ['ALL_SCOPES'],
      hiddenFromPublishing: true
    };
    
    variables.push(referenceVariable);

    // Create mode values for each mode in this dimension
    for (const mode of dimension.modes || []) {
      // For multi-dimensional tokens, look up by mode ID
      // For single-dimension tokens, look up by dimension ID
      let targetVariableId = modeToVariableMap[mode.id] || modeToVariableMap[dimension.id];
      if (targetVariableId && targetVariableId.startsWith('token-')) {
        targetVariableId = this.idManager.getFigmaId(targetVariableId);
      }
      
      if (targetVariableId) {
        const modeValue: FigmaVariableModeValue = {
          variableId: referenceVariableId,
          modeId: mode.id,
          value: {
            type: 'VARIABLE_ALIAS',
            id: targetVariableId
          }
        };
        modeValues.push(modeValue);
        newModeToVariableMap[mode.id] = referenceVariableId;
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
   * Find a valueByMode entry for a specific mode combination
   */
  private findValueByModeForModeCombination(token: Token, modeCombination: string[]): any {
    // First try to find an exact match
    let exactMatch = token.valuesByMode?.find((vbm: any) => 
      vbm.modeIds.length === modeCombination.length &&
      vbm.modeIds.every((id: string, index: number) => id === modeCombination[index])
    );
    
    if (exactMatch) {
      return exactMatch;
    }
    
    // If no exact match, try to find a partial match and use defaults for missing modes
    for (const valueByMode of token.valuesByMode || []) {
      const isSubset = valueByMode.modeIds.every((id: string) => modeCombination.includes(id));
      if (isSubset) {
        return valueByMode;
      }
    }
    
    return null;
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
   * Create the final token variable that references the appropriate intermediary
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

    return {
      action: action,
      id: figmaId,
      name: figmaCodeSyntax.formattedName,
      variableCollectionId: this.getTokenCollectionId(token, tokenSystem),
      resolvedType: this.valueConverter.mapToFigmaVariableType(token.resolvedValueTypeId, tokenSystem),
      scopes: this.mapPropertyTypesToScopes(token.propertyTypes || []),
      hiddenFromPublishing: token.private || false,
      codeSyntax: this.buildCodeSyntax(token, tokenSystem)
    };
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
      // Token collections have a single "Value" mode
      const valueModeId = `mode-${tokenCollection.id}`;
      
      // For multi-dimensional tokens, we need to find the reference variable that was created for the last dimension
      // The reference variable ID follows the pattern: reference-${token.id}-${lastDimension.id}
      const referenceVariableId = `reference-${token.id}-${lastDimension.id}`;
      
      // Check if this reference variable exists in the modeToVariableMap (it should be mapped by mode IDs)
      let targetVariableId = null;
      
      // First, try to find the reference variable by looking for any mode ID that maps to it
      for (const mode of lastDimension.modes || []) {
        if (modeToVariableMap[mode.id] === referenceVariableId) {
          targetVariableId = referenceVariableId;
          break;
        }
      }
      
      // If not found by mode ID, check if it's mapped by dimension ID (for single-dimensional tokens)
      if (!targetVariableId) {
        targetVariableId = modeToVariableMap[lastDimension.id];
      }
      
      // If the target is a token ID (starts with 'token-'), convert it to the mapped Figma ID
      if (targetVariableId && targetVariableId.startsWith('token-')) {
        targetVariableId = this.idManager.getFigmaId(targetVariableId);
      }
      
      if (targetVariableId) {
        // Always create a VARIABLE_ALIAS to the target variable
        // For multi-dimensional tokens: aliases to the reference variable
        // For single-dimensional tokens: aliases to the intermediary variable
        modeValues.push({
          variableId: finalVariableId,
          modeId: valueModeId,
          value: {
            type: 'VARIABLE_ALIAS',
            id: targetVariableId
          }
        });
      }
    } else {
      // Fallback: use dimension modes (for backward compatibility)
      for (const mode of lastDimension.modes) {
        let targetVariableId = modeToVariableMap[mode.id] || modeToVariableMap[lastDimension.id];
        if (targetVariableId && targetVariableId.startsWith('token-')) {
          targetVariableId = this.idManager.getFigmaId(targetVariableId);
        }
        if (targetVariableId) {
          modeValues.push({
            variableId: finalVariableId,
            modeId: mode.id,
            value: {
              type: 'VARIABLE_ALIAS',
              id: targetVariableId
            }
          });
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

    return {
      action: action,
      id: figmaId,
      name: figmaCodeSyntax.formattedName,
      variableCollectionId: this.getTokenCollectionId(token, tokenSystem),
      resolvedType: this.valueConverter.mapToFigmaVariableType(token.resolvedValueTypeId, tokenSystem),
      scopes: this.mapPropertyTypesToScopes(token.propertyTypes || []),
      hiddenFromPublishing: token.private || false,
      codeSyntax: this.buildCodeSyntax(token, tokenSystem)
    };
  }

  /**
   * Get the token collection ID for a token
   */
  private getTokenCollectionId(token: Token, tokenSystem: TokenSystem): string {
    const tokenCollection = this.findTokenCollection(token, tokenSystem);
    return tokenCollection?.id || 'default-collection';
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
   * Map property types to Figma scopes
   */
  private mapPropertyTypesToScopes(propertyTypes: string[]): string[] {
    if (propertyTypes.includes('ALL_PROPERTY_TYPES') || propertyTypes.length === 0) {
      return ['ALL_SCOPES'];
    }
    return propertyTypes;
  }

  /**
   * Build code syntax for a token
   */
  private buildCodeSyntax(token: Token, tokenSystem: TokenSystem): any {
    const codeSyntax: any = {};
    
    // Map platform code syntax to Figma's expected format
    for (const cs of token.codeSyntax || []) {
      const platform = tokenSystem.platforms?.find((p: any) => p.id === cs.platformId);
      if (platform) {
        switch (platform.displayName?.toLowerCase()) {
          case 'css':
          case 'web':
            codeSyntax.WEB = cs.formattedName;
            break;
          case 'ios':
            codeSyntax.iOS = cs.formattedName;
            break;
          case 'android':
            codeSyntax.ANDROID = cs.formattedName;
            break;
        }
      }
    }
    
    return codeSyntax;
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
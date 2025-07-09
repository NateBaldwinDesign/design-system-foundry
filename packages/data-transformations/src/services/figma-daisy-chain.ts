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

    // Stage 1: Create intermediary variables for the first dimension with all mode combinations
    const firstDimension = usedDimensions[0];
    console.log(`[FigmaDaisyChain] Stage 1: Creating intermediaries for first dimension "${firstDimension.displayName}"`);
    
    const intermediaryResult = this.createIntermediaryVariablesForFirstDimension(
      token,
      tokenSystem,
      figmaCodeSyntax,
      firstDimension,
      usedDimensions
    );
    variables.push(...intermediaryResult.dimensionVariables);
    modeValues.push(...intermediaryResult.dimensionModeValues);
    const modeToVariableMap = intermediaryResult.modeToVariableMap;

    // Stage 2: Create reference variables for subsequent dimensions (daisy-chaining)
    for (let i = 1; i < usedDimensions.length; i++) {
      const dimension = usedDimensions[i];
      console.log(`[FigmaDaisyChain] Stage ${i + 1}: Creating reference variable for dimension "${dimension.displayName}"`);
      
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

    // Stage 3: Create the final token variable that references the last intermediary
    console.log(`[FigmaDaisyChain] Stage ${usedDimensions.length + 1}: Creating final token variable`);
    const finalVariable = this.createFinalTokenVariable(
      token,
      tokenSystem,
      figmaCodeSyntax,
      modeToVariableMap
    );
    variables.push(finalVariable);

    // Create the mode value for the final token that aliases to the appropriate intermediary
    const tokenCollection = this.findTokenCollection(token, tokenSystem);
    if (tokenCollection) {
      // For the final token, we need to determine which intermediary to alias based on the default modes
      const defaultModeIds = this.getDefaultModeIdsForDimensions(usedDimensions);
      const defaultModeKey = this.createModeKey(defaultModeIds);
      const targetVariableId = modeToVariableMap[defaultModeKey];
      
      if (targetVariableId) {
        // Use the token collection's mode ID
        const finalModeValue: FigmaVariableModeValue = {
          variableId: finalVariable.id,
          modeId: `mode-${tokenCollection.id}`,
          value: {
            type: 'VARIABLE_ALIAS',
            id: targetVariableId
          }
        };
        modeValues.push(finalModeValue);
        console.log(`[FigmaDaisyChain] Created final mode value for "${finalVariable.name}" aliasing to "${targetVariableId}"`);
      }
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
   * Create intermediary variables for the first dimension
   * Creates separate variables for each mode combination that includes modes from this dimension
   */
  private createIntermediaryVariablesForFirstDimension(
    token: Token,
    tokenSystem: TokenSystem,
    figmaCodeSyntax: { platformId: string; formattedName: string },
    firstDimension: any,
    allUsedDimensions: any[]
  ): { 
    dimensionVariables: FigmaVariable[], 
    dimensionModeValues: FigmaVariableModeValue[], 
    modeToVariableMap: Record<string, string> 
  } {
    const variables: FigmaVariable[] = [];
    const modeValues: FigmaVariableModeValue[] = [];
    const modeToVariableMap: Record<string, string> = {};

    // Get all mode combinations that include modes from the first dimension
    const modeCombinations = this.getModeCombinationsForFirstDimension(token, firstDimension, allUsedDimensions);
    
    console.log(`[FigmaDaisyChain] Creating intermediaries for dimension "${firstDimension.displayName}" with mode combinations:`, modeCombinations);

    // Check if this is a single-dimensional token (only one dimension used)
    const isSingleDimensional = allUsedDimensions.length === 1;
    
    if (isSingleDimensional) {
      // For single-dimensional tokens: create ONE variable with multiple mode values
      const variableName = `${figmaCodeSyntax.formattedName} (${firstDimension.displayName})`;
      const variableId = `intermediary-${token.id}-${firstDimension.id}`;
      const figmaId = this.idManager.getOrCreateVariableId(variableId, variableName);
      const action = this.idManager.determineActionByName(variableName);
      
      console.log(`[FigmaDaisyChain] Creating single-dimensional intermediary variable "${variableName}" action: ${action}`);

      const variable: FigmaVariable = {
        action: action,
        id: figmaId,
        name: variableName,
        variableCollectionId: firstDimension.id,
        resolvedType: this.valueConverter.mapToFigmaVariableType(token.resolvedValueTypeId, tokenSystem),
        scopes: this.mapPropertyTypesToScopes(token.propertyTypes || []),
        hiddenFromPublishing: true // Intermediary variables are hidden
      };
      variables.push(variable);

      // Create mode values for each mode in the first dimension
      for (const mode of firstDimension.modes || []) {
        const valueByMode = this.findValueByModeForModeCombination(token, [mode.id]);
        if (valueByMode) {
          let resolvedValue: any;
          if ('tokenId' in valueByMode.value) {
            // Handle token references - use the mapped Figma ID
            const referencedTokenId = valueByMode.value.tokenId;
            const referencedFigmaId = this.idManager.getFigmaId(referencedTokenId);
            resolvedValue = {
              type: 'VARIABLE_ALIAS',
              id: referencedFigmaId
            };
          } else {
            // Handle direct values - convert to Figma format
            resolvedValue = this.valueConverter.convertValue(
              valueByMode.value.value, 
              token.resolvedValueTypeId, 
              tokenSystem
            );
          }
          const modeValue: FigmaVariableModeValue = {
            variableId: figmaId,
            modeId: mode.id,
            value: resolvedValue
          };
          modeValues.push(modeValue);
          
          // Store the mapping for this mode
          modeToVariableMap[mode.id] = figmaId;
        }
      }
    } else {
      // For multi-dimensional tokens: create separate variables for each mode combination
      const createdVariableIds = new Set<string>();
      for (const modeCombination of modeCombinations) {
        const modeNames = modeCombination.map(modeId => {
          const dimension = allUsedDimensions.find(d => d.modes?.some((m: any) => m.id === modeId));
          const mode = dimension?.modes?.find((m: any) => m.id === modeId);
          return mode?.name || modeId;
        });
        
        // Create variable name following the expected pattern
        const additionalModes = modeNames.slice(1);
        const variableName = `${figmaCodeSyntax.formattedName} (${firstDimension.displayName} - ${additionalModes.join(', ')})`;
        
        // Create variable ID following the expected pattern
        // Include the first dimension's mode to ensure uniqueness
        const firstDimModeIdForId = modeCombination.find(id => firstDimension.modes?.some((m: any) => m.id === id));
        const additionalModesForId = modeCombination.filter(id => !firstDimension.modes?.some((m: any) => m.id === id));
        const modeSuffix = additionalModesForId.length > 0 ? `-${additionalModesForId.join('-')}` : '';
        const variableId = `intermediary-${token.id}-${firstDimension.id}-${firstDimModeIdForId}${modeSuffix}`;
        if (createdVariableIds.has(variableId)) continue;
        createdVariableIds.add(variableId);
        const figmaId = this.idManager.getOrCreateVariableId(variableId, variableName);
        const action = this.idManager.determineActionByName(variableName);
        
        console.log(`[FigmaDaisyChain] Creating multi-dimensional intermediary variable "${variableName}" action: ${action}`);

        const variable: FigmaVariable = {
          action: action,
          id: figmaId,
          name: variableName,
          variableCollectionId: firstDimension.id,
          resolvedType: this.valueConverter.mapToFigmaVariableType(token.resolvedValueTypeId, tokenSystem),
          scopes: this.mapPropertyTypesToScopes(token.propertyTypes || []),
          hiddenFromPublishing: true // Intermediary variables are hidden
        };
        variables.push(variable);

        // Create mode value for this specific mode combination (1:1 mapping)
        // Find the mode from the first dimension in this combination
        const firstDimModeId = modeCombination.find(id => firstDimension.modes?.some((m: any) => m.id === id));
        if (firstDimModeId) {
          const valueByMode = this.findValueByModeForModeCombination(token, modeCombination);
          if (valueByMode) {
            let resolvedValue: any;
            if ('tokenId' in valueByMode.value) {
              // Handle token references - use the mapped Figma ID
              const referencedTokenId = valueByMode.value.tokenId;
              const referencedFigmaId = this.idManager.getFigmaId(referencedTokenId);
              resolvedValue = {
                type: 'VARIABLE_ALIAS',
                id: referencedFigmaId
              };
            } else {
              // Handle direct values - convert to Figma format
              resolvedValue = this.valueConverter.convertValue(
                valueByMode.value.value, 
                token.resolvedValueTypeId, 
                tokenSystem
              );
            }
            const modeValue: FigmaVariableModeValue = {
              variableId: figmaId,
              modeId: firstDimModeId,
              value: resolvedValue
            };
            modeValues.push(modeValue);
          }
        }
        // Store the mapping for this mode combination
        const modeKey = this.createModeKey(modeCombination);
        modeToVariableMap[modeKey] = figmaId;
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

    // Get all mode combinations that include this dimension
    const modeCombinations = this.getModeCombinationsForDimension(token, dimension, dimensionsUpToThis);
    
    console.log(`[FigmaDaisyChain] Creating reference variables for dimension "${dimension.displayName}" with mode combinations:`, modeCombinations);

    // Create ONE reference variable for this dimension (not one per mode combination)
    const variableName = `${figmaCodeSyntax.formattedName} (${dimension.displayName})`;
    const variableId = `reference-${token.id}-${dimension.id}`;
    const figmaId = this.idManager.getOrCreateVariableId(variableId, variableName);
    const action = this.idManager.determineActionByName(variableName);
    
    console.log(`[FigmaDaisyChain] Creating reference variable "${variableName}" action: ${action}`);

    const variable: FigmaVariable = {
      action: action,
      id: figmaId,
      name: variableName,
      variableCollectionId: dimension.id,
      resolvedType: this.valueConverter.mapToFigmaVariableType(token.resolvedValueTypeId, tokenSystem),
      scopes: this.mapPropertyTypesToScopes(token.propertyTypes || []),
      hiddenFromPublishing: true // Reference variables are hidden
    };
    variables.push(variable);

    // Create mode values for each mode in this dimension
    for (const mode of dimension.modes || []) {
      // Find the appropriate target variable to alias to for this mode
      // We need to find a mode combination that includes this mode and has a target variable
      const targetModeCombination = modeCombinations.find(combination => 
        combination.includes(mode.id) && modeToVariableMap[this.createModeKey(combination)]
      );
      
      if (targetModeCombination) {
        const targetModeKey = this.createModeKey(targetModeCombination);
        const targetVariableId = modeToVariableMap[targetModeKey];
        
        if (targetVariableId) {
          const modeValue: FigmaVariableModeValue = {
            variableId: figmaId,
            modeId: mode.id,
            value: {
              type: 'VARIABLE_ALIAS',
              id: targetVariableId
            }
          };
          modeValues.push(modeValue);
          
          // Store the mapping for this mode combination
          newModeToVariableMap[targetModeKey] = figmaId;
        }
      }
    }

    return { 
      referenceVariables: variables, 
      referenceModeValues: modeValues,
      newModeToVariableMap
    };
  }

  /**
   * Get mode combinations for the first dimension
   * Includes all combinations that have at least one mode from the first dimension
   */
  private getModeCombinationsForFirstDimension(
    token: Token, 
    firstDimension: any, 
    allUsedDimensions: any[]
  ): string[][] {
    const combinations: string[][] = [];
    
    // Get all mode combinations from the token's valuesByMode
    for (const valueByMode of token.valuesByMode || []) {
      if (valueByMode.modeIds.length > 0) {
        // Check if this combination includes at least one mode from the first dimension
        const hasFirstDimensionMode = valueByMode.modeIds.some(modeId => 
          firstDimension.modes?.some((m: any) => m.id === modeId)
        );
        
        if (hasFirstDimensionMode) {
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
   * Get mode combinations for a subsequent dimension
   * Includes all combinations that include modes from this dimension
   */
  private getModeCombinationsForDimension(
    token: Token, 
    dimension: any, 
    dimensionsUpToThis: any[]
  ): string[][] {
    const combinations: string[][] = [];
    
    // Get all mode combinations from the token's valuesByMode
    for (const valueByMode of token.valuesByMode || []) {
      if (valueByMode.modeIds.length > 0) {
        // Check if this combination includes at least one mode from this dimension
        const hasThisDimensionMode = valueByMode.modeIds.some(modeId => 
          dimension.modes?.some((m: any) => m.id === modeId)
        );
        
        if (hasThisDimensionMode) {
          // Fill in missing default modes for other dimensions
          const expandedCombination = this.expandModeCombinationWithDefaults(
            valueByMode.modeIds, 
            dimensionsUpToThis
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
} 
// Placeholder for Figma transformer implementation
// This will be fully implemented in Phase 2

import type { TokenSystem, Token, ResolvedValueType, Dimension, Mode, TokenCollection } from '@token-model/data-model';
import type { 
  FigmaTransformerOptions, 
  FigmaTransformationResult,
  FigmaVariable,
  FigmaVariableCollection,
  FigmaVariableType,
  FigmaVariableValue,
  FigmaVariableMode,
  FigmaVariableModeValue,
  FigmaFileVariablesResponse
} from '../types/figma';
import { AbstractBaseTransformer } from './base';
import type { ValidationResult } from '../types/common';
import { validateTokenSystem } from '../utils/validation';
import { 
  generateUniqueId, 
  sanitizeVariableName, 
  tokenToVariableName,
  getResolvedValueType,
  getToken,
  resolveTokenValue,
  getAllModeCombinations,
  isHexColor
} from '../utils/helpers';
import Color from 'colorjs.io';

/**
 * Figma transformer for converting token data to Figma Variables API format
 * 
 * This transformer converts design tokens from the token-model schema
 * into the format required by Figma's Variables API.
 * 
 * Strategy:
 * 1. CREATE COLLECTIONS FOR EACH DIMENSION, which support each mode and house tokens that have values for these modes
 * 2. ALIAS VARIABLES from tokens that reference another tokenId as its value (eg value: { tokenId: '' })
 * 3. CREATE MODELESS COLLECTIONS for each tokenCollection. These collections should have Variables that are all ALIASES that point to variables from the DIMENSION / MODE collections.
 */
export class FigmaTransformer extends AbstractBaseTransformer<
  TokenSystem,
  FigmaTransformationResult,
  FigmaTransformerOptions
> {
  readonly id = 'figma-variables';
  readonly displayName = 'Figma Variables';
  readonly description = 'Transform design tokens to Figma Variables API format';
  readonly version = '1.0.0';

  // Cache for token ID to Figma variable ID mapping
  private tokenIdToFigmaIdMap: Map<string, string> = new Map();

  protected async validateInput(
    input: TokenSystem, 
    options?: FigmaTransformerOptions
  ): Promise<ValidationResult> {
    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationResult['warnings'] = [];

    // Use the comprehensive validation from utils
    const validation = validateTokenSystem(input);
    errors.push(...validation.errors);
    warnings.push(...validation.warnings);

    // Figma credentials are only required for publishing, not for export/transform
    if (options) {
      const missingFileKey = !options.fileKey;
      const missingAccessToken = !options.accessToken;
      if (missingFileKey || missingAccessToken) {
        warnings.push({
          path: 'options',
          message: 'Figma file key and access token are required for publishing, but optional for export generation',
          code: 'MISSING_FIGMA_CREDENTIALS'
        });
      }
    }

    const result = {
      isValid: errors.length === 0,
      errors,
      warnings
    };

    return result;
  }

  protected async performTransform(
    input: TokenSystem, 
    options?: FigmaTransformerOptions
  ): Promise<FigmaTransformationResult> {
    console.log('[FigmaTransformer] performTransform called with', input.tokens?.length, 'tokens');
    console.log('[FigmaTransformer] dimensionOrder:', input.dimensionOrder);
    
    // Validate input first
    const validation = await this.validate(input, options);
    // Only fail if there are actual schema errors, not just warnings about credentials
    if (!validation.isValid) {
      return {
        variables: [],
        collections: [],
        variableModes: [],
        stats: {
          created: 0,
          updated: 0,
          deleted: 0,
          collectionsCreated: 0,
          collectionsUpdated: 0
        },
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Input validation failed',
          details: { validationErrors: validation.errors }
        }
      } as any;
    }

    // Build token ID to Figma variable ID mapping from existing data
    this.buildTokenIdMapping(input, options);

    const collections: FigmaVariableCollection[] = [];
    const allVariables: FigmaVariable[] = [];
    const allModeValues: FigmaVariableModeValue[] = [];
    const stats = {
      created: 0,
      updated: 0,
      deleted: 0,
      collectionsCreated: 0,
      collectionsUpdated: 0
    };

    // Phase 1: Create collections for each dimension with modes
    const dimensionCollections = this.createDimensionCollections(input, options);
    collections.push(...dimensionCollections);
    stats.collectionsCreated += dimensionCollections.filter(c => c.action === 'CREATE').length;
    stats.collectionsUpdated += dimensionCollections.filter(c => c.action === 'UPDATE').length;

    // Phase 2: Create modeless collections for each token collection
    const modelessCollections = this.createModelessCollections(input, options);
    collections.push(...modelessCollections);
    stats.collectionsCreated += modelessCollections.filter(c => c.action === 'CREATE').length;
    stats.collectionsUpdated += modelessCollections.filter(c => c.action === 'UPDATE').length;

    // Phase 3: Implement daisy-chaining algorithm for variables
    const { variables, modeValues } = this.createDaisyChainedVariables(
      input,
      dimensionCollections,
      modelessCollections,
      options
    );
    allVariables.push(...variables);
    allModeValues.push(...modeValues);
    stats.created += variables.filter(v => v.action === 'CREATE').length;
    stats.updated += variables.filter(v => v.action === 'UPDATE').length;

    // Phase 4: Create modes for all collections
    const variableModes = this.createVariableModes(input, options?.existingFigmaData);
    stats.collectionsUpdated += variableModes.filter(m => m.action === 'UPDATE').length;

    // Debug: Log the final output structure to check action fields
    console.log('[FigmaTransformer] Final output structure:');
    console.log('[FigmaTransformer] Collections sample:', collections.slice(0, 2).map(c => ({ id: c.id, name: c.name, action: c.action, actionType: typeof c.action })));
    console.log('[FigmaTransformer] Variables sample:', allVariables.slice(0, 2).map(v => ({ id: v.id, name: v.name, action: v.action, actionType: typeof v.action })));
    console.log('[FigmaTransformer] Modes sample:', variableModes.slice(0, 2).map(m => ({ id: m.id, name: m.name, action: m.action, actionType: typeof m.action })));

    return {
      variables: allVariables,
      collections,
      variableModes,
      variableModeValues: allModeValues,
      stats
    };
  }

  /**
   * Build mapping between token IDs and existing Figma variable IDs based on tempToRealId mapping
   * This is used to determine CREATE vs UPDATE actions and proper alias references
   */
  private buildTokenIdMapping(tokenSystem: TokenSystem, options?: FigmaTransformerOptions): void {
    this.tokenIdToFigmaIdMap.clear();
    
    if (!options?.tempToRealId) return;

    // Use the tempToRealId mapping to map token IDs to Figma variable IDs
    for (const [tempId, realFigmaId] of Object.entries(options.tempToRealId)) {
      this.tokenIdToFigmaIdMap.set(tempId, realFigmaId);
    }
  }

  /**
   * Get the appropriate ID for a token - either existing Figma ID or token ID
   */
  private getTokenFigmaId(tokenId: string): string {
    return this.tokenIdToFigmaIdMap.get(tokenId) || tokenId;
  }

  /**
   * Determine if an item exists in the Figma file by checking if its ID is in the tempToRealId mapping
   */
  private itemExistsById(itemId: string, options?: FigmaTransformerOptions): boolean {
    if (!options?.tempToRealId) return false;
    return itemId in options.tempToRealId;
  }

  /**
   * Get the real Figma ID for an item if it exists in the mapping, otherwise return the original ID
   */
  private getRealFigmaId(itemId: string, options?: FigmaTransformerOptions): string {
    if (!options?.tempToRealId) return itemId;
    return options.tempToRealId[itemId] || itemId;
  }

  /**
   * Determine if an item exists in the Figma file by matching name (fallback method)
   */
  private findExistingItemByName<T extends { name: string; id: string }>(
    items: Record<string, T> | undefined,
    name: string
  ): T | undefined {
    if (!items) return undefined;
    
    return Object.values(items).find(item => item.name === name);
  }

  /**
   * Determine if a mode exists in the Figma file by matching name and collection
   */
  private findExistingModeByName(
    existingData: FigmaFileVariablesResponse | undefined,
    modeName: string,
    collectionId: string
  ): any | undefined {
    if (!existingData?.variableCollections) return undefined;
    
    // For now, we'll assume modes are stored in the collection data
    // This may need adjustment based on actual Figma API structure
    const collection = existingData.variableCollections[collectionId];
    if (!collection) return undefined;
    
    // This is a simplified check - in practice, modes might be stored differently
    return undefined;
  }

  /**
   * Create collections for each dimension with modes
   */
  private createDimensionCollections(
    tokenSystem: TokenSystem, 
    options?: FigmaTransformerOptions
  ): FigmaVariableCollection[] {
    const collections: FigmaVariableCollection[] = [];

    for (const dimension of tokenSystem.dimensions || []) {
      // Check if collection already exists by ID using tempToRealId mapping
      const exists = this.itemExistsById(dimension.id, options);
      const realFigmaId = this.getRealFigmaId(dimension.id, options);
      
      // Ensure action is explicitly set to a valid string
      const action = exists ? 'UPDATE' : 'CREATE';
      console.log(`[FigmaTransformer] Collection "${dimension.displayName}" action: ${action} (exists: ${exists})`);
      console.log(`[FigmaTransformer] Action type: ${typeof action}, value: "${action}"`);
      
      const collection: FigmaVariableCollection = {
        action: action,
        id: realFigmaId,
        name: dimension.displayName,
        initialModeId: dimension.defaultMode,
        hiddenFromPublishing: true
      };
      
      collections.push(collection);
    }

    return collections;
  }

  /**
   * Get Figma code syntax for a token
   */
  private getFigmaCodeSyntax(token: Token, tokenSystem: TokenSystem): { platformId: string; formattedName: string } | undefined {
    // Find the Figma platform by displayName
    const figmaPlatform = tokenSystem.platforms?.find((p: any) => p.displayName === 'Figma');
    if (!figmaPlatform) {
      console.warn('[FigmaTransformer] No Figma platform found in token system');
      return undefined;
    }

    // Find the code syntax for the Figma platform
    const figmaCodeSyntax = token.codeSyntax?.find((cs: any) => cs.platformId === figmaPlatform.id);
    if (!figmaCodeSyntax) {
      console.warn(`[FigmaTransformer] No Figma code syntax found for token ${token.id} (platform ID: ${figmaPlatform.id})`);
      return undefined;
    }

    return figmaCodeSyntax;
  }

  /**
   * Create modeless collections for each token collection
   */
  private createModelessCollections(
    tokenSystem: TokenSystem,
    options?: FigmaTransformerOptions
  ): FigmaVariableCollection[] {
    const collections: FigmaVariableCollection[] = [];

    for (const collection of tokenSystem.tokenCollections || []) {
      // Check if collection already exists by ID using tempToRealId mapping
      const exists = this.itemExistsById(collection.id, options);
      const realFigmaId = this.getRealFigmaId(collection.id, options);
      
      // Ensure action is explicitly set to a valid string
      const modelessAction = exists ? 'UPDATE' : 'CREATE';
      console.log(`[FigmaTransformer] Modeless collection "${collection.name}" action: ${modelessAction} (exists: ${exists})`);
      console.log(`[FigmaTransformer] Modeless action type: ${typeof modelessAction}, value: "${modelessAction}"`);
      
      const modelessCollection: FigmaVariableCollection = {
        action: modelessAction,
        id: realFigmaId,
        name: collection.name,
        initialModeId: `mode-${collection.id}`
      };
      
      collections.push(modelessCollection);
    }

    return collections;
  }

  /**
   * Implement daisy-chaining algorithm for variables following the documented structure
   * This creates the three-stage decomposition process:
   * 1. Intermediary variables in dimension collections
   * 2. Reference variables in subsequent collections
   * 3. Final token collection variables
   */
  private createDaisyChainedVariables(
    tokenSystem: TokenSystem,
    dimensionCollections: FigmaVariableCollection[],
    modelessCollections: FigmaVariableCollection[],
    options?: FigmaTransformerOptions
  ): { variables: FigmaVariable[], modeValues: FigmaVariableModeValue[] } {
    const variables: FigmaVariable[] = [];
    const modeValues: FigmaVariableModeValue[] = [];

    // Validate dimensionOrder exists
    if (!tokenSystem.dimensionOrder || tokenSystem.dimensionOrder.length === 0) {
      console.warn('[FigmaTransformer] No dimensionOrder specified, falling back to simple variable creation');
      return this.createSimpleVariables(tokenSystem, options);
    }

    console.log('[FigmaTransformer] Processing tokens with dimensionOrder:', tokenSystem.dimensionOrder);

    for (const token of tokenSystem.tokens || []) {
      const figmaCodeSyntax = this.getFigmaCodeSyntax(token, tokenSystem);
      if (!figmaCodeSyntax) {
        continue; // Skip tokens without Figma code syntax
      }

      // Check if token has mode-specific values
      const hasModeSpecificValues = token.valuesByMode?.some((vbm: any) => vbm.modeIds.length > 0) || false;
      const hasGlobalValues = token.valuesByMode?.some((vbm: any) => vbm.modeIds.length === 0) || false;

      if (hasModeSpecificValues) {
        // Implement daisy-chaining for multi-dimensional tokens
        const { variables: tokenVariables, modeValues: tokenModeValues } = this.transformTokenWithDaisyChaining(
          token, 
          tokenSystem, 
          options
        );
        variables.push(...tokenVariables);
        modeValues.push(...tokenModeValues);
      } else {
        // Create simple variable without daisy-chaining
        const figmaCodeSyntax = token.codeSyntax?.find((cs: { platformId: string; formattedName: string }) => cs.platformId === 'platform-figma');
        if (figmaCodeSyntax) {
          const variable = this.createDirectVariable(token, tokenSystem, figmaCodeSyntax, options);
          variables.push(variable);
        }
      }
    }

    return { variables, modeValues };
  }

  /**
   * Transform a single token to Figma variables with daisy-chaining
   */
  private transformTokenWithDaisyChaining(
    token: Token,
    tokenSystem: TokenSystem,
    options?: FigmaTransformerOptions
  ): { variables: FigmaVariable[], modeValues: FigmaVariableModeValue[] } {
    const variables: FigmaVariable[] = [];
    const modeValues: FigmaVariableModeValue[] = [];

    // Get Figma code syntax for this token
    const figmaCodeSyntax = this.getFigmaCodeSyntax(token, tokenSystem);
    if (!figmaCodeSyntax) {
      console.warn(`[FigmaTransformer] No Figma code syntax found for token ${token.id}`);
      return { variables, modeValues };
    }

    // Get dimensions that this token actually uses
    const usedDimensions = this.getUsedDimensionsForToken(token, tokenSystem);
    console.log(`[FigmaTransformer] Token ${token.id} uses dimensions:`, usedDimensions.map(d => d.displayName));

    if (usedDimensions.length === 0) {
      console.log(`[FigmaTransformer] Token ${token.id} has no dimension dependencies, creating direct variable`);
      // Create a simple variable without daisy-chaining
      const variable = this.createDirectVariable(token, tokenSystem, figmaCodeSyntax, options);
      variables.push(variable);
      return { variables, modeValues };
    }

    // Stage 1: Create intermediary variables for the first dimension with actual values
    const firstDimension = usedDimensions[0];
    console.log(`[FigmaTransformer] Stage 1: Creating intermediaries for first dimension "${firstDimension.displayName}"`);
    
    const intermediaryResult = this.createIntermediaryVariablesForDimension(
      token,
      tokenSystem,
      figmaCodeSyntax,
      firstDimension,
      options
    );
    variables.push(...intermediaryResult.dimensionVariables);
    modeValues.push(...intermediaryResult.dimensionModeValues);
    let lastVariableId = intermediaryResult.lastVariableId;

    // Stage 2: Create reference variables for subsequent dimensions (daisy-chaining)
    for (let i = 1; i < usedDimensions.length; i++) {
      const dimension = usedDimensions[i];
      console.log(`[FigmaTransformer] Stage ${i + 1}: Creating reference variable for dimension "${dimension.displayName}"`);
      
      const referenceResult = this.createReferenceVariables(
        token,
        tokenSystem,
        figmaCodeSyntax,
        dimension,
        lastVariableId,
        options
      );
      variables.push(...referenceResult.referenceVariables);
      modeValues.push(...referenceResult.referenceModeValues);
      lastVariableId = referenceResult.referenceVariables[referenceResult.referenceVariables.length - 1].id;
    }

    // Stage 3: Create the final token variable that references the last intermediary
    console.log(`[FigmaTransformer] Stage ${usedDimensions.length + 1}: Creating final token variable`);
    const finalVariable = this.createFinalTokenVariable(
      token,
      tokenSystem,
      figmaCodeSyntax,
      lastVariableId,
      options
    );
    variables.push(finalVariable);

    // Create the mode value for the final token that aliases to the last intermediary
    const tokenCollection = this.findTokenCollection(token, tokenSystem);
    if (tokenCollection) {
      const finalModeValue: FigmaVariableModeValue = {
        variableId: finalVariable.id,
        modeId: `mode-${tokenCollection.id}`,
        value: {
          type: 'VARIABLE_ALIAS',
          id: lastVariableId
        }
      };
      modeValues.push(finalModeValue);
      console.log(`[FigmaTransformer] Created final mode value for "${finalVariable.name}" aliasing to "${lastVariableId}"`);
    }

    return { variables, modeValues };
  }

  /**
   * Get the dimensions that a token actually uses (has values for)
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
   * Get all unique mode combinations for a token
   */
  private getAllModeCombinations(token: Token, tokenSystem: TokenSystem): string[][] {
    const combinations: string[][] = [];
    
    for (const valueByMode of token.valuesByMode || []) {
      if (valueByMode.modeIds.length > 0) {
        combinations.push([...valueByMode.modeIds].sort());
      }
    }

    // Remove duplicates
    return combinations.filter((combination, index, self) => 
      index === self.findIndex(c => JSON.stringify(c) === JSON.stringify(combination))
    );
  }

  /**
   * Create intermediary variables for a specific dimension
   */
  private createIntermediaryVariablesForDimension(
    token: Token,
    tokenSystem: TokenSystem,
    figmaCodeSyntax: { platformId: string; formattedName: string },
    dimension: any,
    options?: FigmaTransformerOptions
  ): { dimensionVariables: FigmaVariable[], dimensionModeValues: FigmaVariableModeValue[], lastVariableId: string } {
    const variables: FigmaVariable[] = [];
    const modeValues: FigmaVariableModeValue[] = [];
    let lastVariableId = '';

    // Get the modes in this dimension that the token actually has values for
    const usedModeIds = new Set<string>();
    for (const valueByMode of token.valuesByMode || []) {
      for (const modeId of valueByMode.modeIds) {
        // Check if this mode belongs to the current dimension
        if (dimension.modes?.some((mode: any) => mode.id === modeId)) {
          usedModeIds.add(modeId);
        }
      }
    }

    console.log(`[FigmaTransformer] Creating intermediaries for dimension "${dimension.displayName}" with used modes:`, Array.from(usedModeIds));
    
    // Create ONE variable for this dimension (not one per mode)
    const variableName = `${figmaCodeSyntax.formattedName} (${dimension.displayName})`;
    const variableId = generateUniqueId(`intermediary-${token.id}-${dimension.id}`);
    
    // Check if variable already exists by ID using tempToRealId mapping
    const exists = this.itemExistsById(variableId, options);
    const realFigmaId = this.getRealFigmaId(variableId, options);
    const action = exists ? 'UPDATE' : 'CREATE';
    
    console.log(`[FigmaTransformer] Creating intermediary variable "${variableName}" action: ${action}`);
    console.log(`[FigmaTransformer] Variable action type: ${typeof action}, value: "${action}"`);

    const variable: FigmaVariable = {
      action: action,
      id: realFigmaId,
      name: variableName,
      variableCollectionId: dimension.id,
      resolvedType: this.mapToFigmaVariableType(token.resolvedValueTypeId, tokenSystem),
      scopes: this.mapPropertyTypesToScopes(token.propertyTypes || []),
      hiddenFromPublishing: true
    };
    variables.push(variable);

    // Create mode values for each used mode in this dimension
    for (const modeId of usedModeIds) {
      // Find the corresponding value for this specific mode
      const valueByMode = token.valuesByMode?.find((vbm: any) => 
        vbm.modeIds.length === 1 && vbm.modeIds[0] === modeId
      );
      
      if (valueByMode) {
        let resolvedValue: any;
        if ('tokenId' in valueByMode.value) {
          // Handle token references - use the mapped Figma ID
          const referencedTokenId = valueByMode.value.tokenId;
          const referencedFigmaId = this.getTokenFigmaId(referencedTokenId);
          resolvedValue = {
            type: 'VARIABLE_ALIAS',
            id: referencedFigmaId
          };
        } else {
          // Handle direct values - convert to Figma format
          resolvedValue = valueByMode.value.value;
        }

        const figmaValue = this.convertValueToFigmaFormat(resolvedValue, variable.resolvedType);
        modeValues.push({
          variableId: realFigmaId,
          modeId: modeId,
          value: figmaValue
        });
      }
    }

    // Track the last variable ID for the next stage
    lastVariableId = realFigmaId;

    return { dimensionVariables: variables, dimensionModeValues: modeValues, lastVariableId };
  }

  /**
   * Create simple variables for tokens without dimensionOrder (fallback)
   */
  private createSimpleVariables(
    tokenSystem: TokenSystem,
    options?: FigmaTransformerOptions
  ): { variables: FigmaVariable[], modeValues: FigmaVariableModeValue[] } {
    const variables: FigmaVariable[] = [];
    const modeValues: FigmaVariableModeValue[] = [];

    for (const token of tokenSystem.tokens || []) {
      const figmaCodeSyntax = this.getFigmaCodeSyntax(token, tokenSystem);
      if (!figmaCodeSyntax) continue;

      const tokenCollection = this.findTokenCollection(token, tokenSystem);
      if (!tokenCollection) continue;

      // Check if variable already exists by ID using tempToRealId mapping
      const exists = this.itemExistsById(token.id, options);
      const realFigmaId = this.getRealFigmaId(token.id, options);
      const action = exists ? 'UPDATE' : 'CREATE';

      const variable: FigmaVariable = {
        action: action,
        id: realFigmaId,
        name: figmaCodeSyntax.formattedName,
        variableCollectionId: tokenCollection.id,
        resolvedType: this.mapToFigmaVariableType(token.resolvedValueTypeId, tokenSystem),
        scopes: this.mapPropertyTypesToScopes(token.propertyTypes || []),
        hiddenFromPublishing: token.private || false,
        codeSyntax: this.extractCodeSyntax(token)
      };
      variables.push(variable);

      // Create mode value
      const globalValueByMode = token.valuesByMode?.find((vbm: any) => vbm.modeIds.length === 0);
      if (globalValueByMode) {
        let resolvedValue: any;
        if ('tokenId' in globalValueByMode.value) {
          const referencedTokenId = globalValueByMode.value.tokenId;
          const referencedFigmaId = this.getTokenFigmaId(referencedTokenId);
          resolvedValue = {
            type: 'VARIABLE_ALIAS',
            id: referencedFigmaId
          };
        } else {
          resolvedValue = globalValueByMode.value.value;
        }

        const figmaValue = this.convertValueToFigmaFormat(resolvedValue, variable.resolvedType);
        modeValues.push({
          variableId: realFigmaId,
          modeId: `mode-${tokenCollection.id}`,
          value: figmaValue
        });
      }
    }

    return { variables, modeValues };
  }

  /**
   * Create a direct variable for a token (fallback method)
   */
  private createDirectVariable(
    token: Token,
    tokenSystem: TokenSystem,
    figmaCodeSyntax: { platformId: string; formattedName: string },
    options?: FigmaTransformerOptions
  ): FigmaVariable {
    const tokenCollection = this.findTokenCollection(token, tokenSystem);
    if (!tokenCollection) {
      throw new Error(`No token collection found for token ${token.id}`);
    }

    // Check if variable already exists by ID using tempToRealId mapping
    const exists = this.itemExistsById(token.id, options);
    const realFigmaId = this.getRealFigmaId(token.id, options);
    const action = exists ? 'UPDATE' : 'CREATE';

    return {
      action: action,
      id: realFigmaId,
      name: figmaCodeSyntax.formattedName,
      variableCollectionId: tokenCollection.id,
      resolvedType: this.mapToFigmaVariableType(token.resolvedValueTypeId, tokenSystem),
      scopes: this.mapPropertyTypesToScopes(token.propertyTypes || []),
      hiddenFromPublishing: token.private || false,
      codeSyntax: this.buildCodeSyntax(token, tokenSystem)
    };
  }

  /**
   * Create the final token variable that references the last intermediary
   */
  private createFinalTokenVariable(
    token: Token,
    tokenSystem: TokenSystem,
    figmaCodeSyntax: { platformId: string; formattedName: string },
    lastVariableId: string,
    options?: FigmaTransformerOptions
  ): FigmaVariable {
    // Check if variable already exists by ID using tempToRealId mapping
    const exists = this.itemExistsById(token.id, options);
    const realFigmaId = this.getRealFigmaId(token.id, options);
    const action = exists ? 'UPDATE' : 'CREATE';

    console.log(`[FigmaTransformer] Creating final token variable "${figmaCodeSyntax.formattedName}" action: ${action}`);

    return {
      action: action,
      id: realFigmaId,
      name: figmaCodeSyntax.formattedName,
      variableCollectionId: this.getTokenCollectionId(token, tokenSystem),
      resolvedType: this.mapToFigmaVariableType(token.resolvedValueTypeId, tokenSystem),
      scopes: this.mapPropertyTypesToScopes(token.propertyTypes || []),
      hiddenFromPublishing: token.private || false,
      codeSyntax: this.buildCodeSyntax(token, tokenSystem)
    };
  }

  /**
   * Create reference variables that alias to previous dimension variables
   */
  private createReferenceVariables(
    token: Token,
    tokenSystem: TokenSystem,
    figmaCodeSyntax: { platformId: string; formattedName: string },
    dimension: any,
    previousVariableId: string,
    options?: FigmaTransformerOptions
  ): { referenceVariables: FigmaVariable[], referenceModeValues: FigmaVariableModeValue[] } {
    const variables: FigmaVariable[] = [];
    const modeValues: FigmaVariableModeValue[] = [];

    // Get the modes in this dimension that the token actually has values for
    const usedModeIds = new Set<string>();
    for (const valueByMode of token.valuesByMode || []) {
      for (const modeId of valueByMode.modeIds) {
        // Check if this mode belongs to the current dimension
        if (dimension.modes?.some((mode: any) => mode.id === modeId)) {
          usedModeIds.add(modeId);
        }
      }
    }

    console.log(`[FigmaTransformer] Creating reference variable for dimension "${dimension.displayName}" with used modes:`, Array.from(usedModeIds));
    
    // Create ONE reference variable for this dimension
    const variableName = `${figmaCodeSyntax.formattedName} (${dimension.displayName})`;
    const variableId = generateUniqueId(`reference-${token.id}-${dimension.id}`);
    
    // Check if variable already exists by ID using tempToRealId mapping
    const exists = this.itemExistsById(variableId, options);
    const realFigmaId = this.getRealFigmaId(variableId, options);
    const action = exists ? 'UPDATE' : 'CREATE';
    
    console.log(`[FigmaTransformer] Creating reference variable "${variableName}" action: ${action}`);

    const variable: FigmaVariable = {
      action: action,
      id: realFigmaId,
      name: variableName,
      variableCollectionId: dimension.id,
      resolvedType: this.mapToFigmaVariableType(token.resolvedValueTypeId, tokenSystem),
      scopes: this.mapPropertyTypesToScopes(token.propertyTypes || []),
      hiddenFromPublishing: true
    };
    variables.push(variable);

    // Create mode values for each used mode in this dimension
    for (const modeId of usedModeIds) {
      const modeValue: FigmaVariableModeValue = {
        variableId: realFigmaId,
        modeId: modeId,
        value: {
          type: 'VARIABLE_ALIAS',
          id: previousVariableId
        }
      };
      modeValues.push(modeValue);
    }

    return { referenceVariables: variables, referenceModeValues: modeValues };
  }

  /**
   * Get the token collection ID for a token
   */
  private getTokenCollectionId(token: Token, tokenSystem: TokenSystem): string {
    const tokenCollection = this.findTokenCollection(token, tokenSystem);
    return tokenCollection?.id || 'default-collection';
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
   * Map property types to Figma scopes
   */
  private mapPropertyTypesToScopes(propertyTypes: string[]): string[] {
    if (propertyTypes.includes('ALL_PROPERTY_TYPES') || propertyTypes.length === 0) {
      return ['ALL_SCOPES'];
    }
    return propertyTypes;
  }

  /**
   * Extract code syntax for non-Figma platforms
   */
  private extractCodeSyntax(token: Token): Record<string, string> | undefined {
    if (!token.codeSyntax || token.codeSyntax.length <= 1) {
      return undefined;
    }

    const otherPlatformSyntax = token.codeSyntax
      .filter((s: any) => s.platformId !== 'figma' && s.platformId !== 'platform-figma')
      .reduce((acc: any, syntax: any) => {
        // Map platform IDs to display names (you may need to adjust this mapping)
        const platformName = this.mapPlatformIdToName(syntax.platformId);
        acc[platformName] = syntax.formattedName;
        return acc;
      }, {} as Record<string, string>);

    return Object.keys(otherPlatformSyntax).length > 0 ? otherPlatformSyntax : undefined;
  }

  /**
   * Map platform ID to display name
   */
  private mapPlatformIdToName(platformId: string): string {
    // This mapping should be based on the actual platform data
    const platformMap: Record<string, string> = {
      'css': 'CSS',
      'scss': 'SCSS',
      'sass': 'Sass',
      'less': 'Less',
      'js': 'JavaScript',
      'ts': 'TypeScript',
      'react': 'React',
      'vue': 'Vue',
      'angular': 'Angular',
      'ios': 'iOS',
      'android': 'Android',
      'flutter': 'Flutter',
      'swift': 'Swift',
      'kotlin': 'Kotlin'
    };

    return platformMap[platformId] || platformId;
  }

  /**
   * Create modes for all collections
   */
  private createVariableModes(
    tokenSystem: TokenSystem,
    existingData?: FigmaFileVariablesResponse
  ): FigmaVariableMode[] {
    const modes: FigmaVariableMode[] = [];

    // Create "Value" modes for token collections
    for (const collection of tokenSystem.tokenCollections || []) {
      const modeId = `mode-${collection.id}`;
      modes.push({
        action: 'UPDATE', // Initial modes always use UPDATE
        id: modeId,
        name: 'Value',
        variableCollectionId: collection.id
      });
    }

    // Create modes for dimensions
    for (const dimension of tokenSystem.dimensions || []) {
      for (const mode of dimension.modes || []) {
        const isDefaultMode = mode.id === dimension.defaultMode;
        modes.push({
          action: isDefaultMode ? 'UPDATE' : 'CREATE', // Default mode uses UPDATE, others use CREATE
          id: mode.id,
          name: mode.name,
          variableCollectionId: dimension.id
        });
      }
    }

    return modes;
  }

  /**
   * Map resolved value type to Figma variable type
   */
  private mapToFigmaVariableType(resolvedValueTypeId: string, tokenSystem: TokenSystem): FigmaVariableType {
    console.log(`[FigmaTransformer] mapToFigmaVariableType called with resolvedValueTypeId: "${resolvedValueTypeId}"`);
    console.log(`[FigmaTransformer] tokenSystem.resolvedValueTypes:`, tokenSystem.resolvedValueTypes);
    
    const resolvedValueType = getResolvedValueType(tokenSystem, resolvedValueTypeId);
    
    console.log(`[FigmaTransformer] getResolvedValueType result:`, resolvedValueType);
    
    if (!resolvedValueType) {
      console.log(`[FigmaTransformer] No resolvedValueType found, returning 'STRING'`);
      return 'STRING'; // Default fallback
    }

    // Map based on the id field (which is what we use in the schema)
    const type = resolvedValueType.id || resolvedValueType.type || resolvedValueType.displayName?.toLowerCase();

    console.log(`[FigmaTransformer] Mapping resolvedValueTypeId "${resolvedValueTypeId}" to Figma type:`, {
      resolvedValueType,
      type,
      result: type === 'color' ? 'COLOR' : type
    });

    switch (type) {
      case 'color':
        console.log(`[FigmaTransformer] Returning 'COLOR' for type: ${type}`);
        return 'COLOR';
      case 'spacing':
      case 'font-size':
      case 'line_height':
      case 'letter_spacing':
      case 'blur':
      case 'spread':
      case 'radius':
      case 'opacity':
        console.log(`[FigmaTransformer] Returning 'FLOAT' for type: ${type}`);
        return 'FLOAT';
      case 'font_family':
      case 'font_weight':
      case 'duration':
      case 'cubic_bezier':
      case 'shadow':
      case 'border':
      case 'z_index':
        console.log(`[FigmaTransformer] Returning 'STRING' for type: ${type}`);
        return 'STRING';
      default:
        console.log(`[FigmaTransformer] Returning 'STRING' (default) for type: ${type}`);
        return 'STRING';
    }
  }

  /**
   * Convert token value to Figma format
   */
  private convertValueToFigmaFormat(value: unknown, figmaType: FigmaVariableType): FigmaVariableValue {
    console.log(`[FigmaTransformer] convertValueToFigmaFormat called with:`, {
      value,
      figmaType,
      valueType: typeof value
    });

    // Handle alias values directly
    if (typeof value === 'object' && value !== null && 'type' in value && value.type === 'VARIABLE_ALIAS') {
      const aliasValue = value as { type: 'VARIABLE_ALIAS'; id: string; variableId?: string };
      console.log(`[FigmaTransformer] Handling alias value:`, aliasValue);
      return {
        type: 'VARIABLE_ALIAS',
        id: aliasValue.id || aliasValue.variableId || ''
      };
    }

    switch (figmaType) {
      case 'COLOR':
        console.log(`[FigmaTransformer] Converting to COLOR format:`, value);
        return this.convertToFigmaColor(value);
      case 'FLOAT':
        console.log(`[FigmaTransformer] Converting to FLOAT format:`, value);
        return this.convertToFigmaFloat(value);
      case 'STRING':
        console.log(`[FigmaTransformer] Converting to STRING format:`, value);
        return this.convertToFigmaString(value);
      case 'BOOLEAN':
        console.log(`[FigmaTransformer] Converting to BOOLEAN format:`, value);
        return this.convertToFigmaBoolean(value);
      default:
        console.log(`[FigmaTransformer] Converting to default STRING format:`, value);
        return String(value);
    }
  }

  /**
   * Convert value to Figma color format using colorjs.io
   * Returns RGB object with optional alpha: { r: number, g: number, b: number, a?: number }
   * Figma expects linear RGB values in 0-1 range, not 0-255 range
   */
  private convertToFigmaColor(value: unknown): { r: number; g: number; b: number; a?: number } {
    try {
      if (typeof value === 'string') {
        // Check if it's a hex color
        if (isHexColor(value)) {
          // Parse the hex color string using colorjs.io
          const color = new Color(value);
          const rgb = color.to('srgb');
          
          // Convert to 0-1 range (linear RGB) as required by Figma API
          const result: { r: number; g: number; b: number; a?: number } = {
            r: rgb.coords[0],
            g: rgb.coords[1],
            b: rgb.coords[2]
          };

          // Add alpha if not 1.0
          if (rgb.alpha !== undefined && rgb.alpha !== 1) {
            result.a = rgb.alpha;
          }

          console.log(`[FigmaTransformer] Color conversion: "${value}" ->`, result);
          return result;
        } else {
          // Try to parse other color formats
          const color = new Color(value);
          const rgb = color.to('srgb');
          
          const result: { r: number; g: number; b: number; a?: number } = {
            r: rgb.coords[0],
            g: rgb.coords[1],
            b: rgb.coords[2]
          };

          if (rgb.alpha !== undefined && rgb.alpha !== 1) {
            result.a = rgb.alpha;
          }

          console.log(`[FigmaTransformer] Color conversion: "${value}" ->`, result);
          return result;
        }
      }

      if (typeof value === 'object' && value !== null) {
        const colorObj = value as any;
        
        // If it's already an RGB object, convert from 0-255 to 0-1 range if needed
        if (colorObj.r !== undefined && colorObj.g !== undefined && colorObj.b !== undefined) {
          // Check if values are in 0-255 range and convert to 0-1
          const maxValue = Math.max(colorObj.r, colorObj.g, colorObj.b);
          const is255Range = maxValue > 1;
          
          const result: { r: number; g: number; b: number; a?: number } = {
            r: is255Range ? colorObj.r / 255 : colorObj.r,
            g: is255Range ? colorObj.g / 255 : colorObj.g,
            b: is255Range ? colorObj.b / 255 : colorObj.b
          };

          // Add alpha if present
          if (colorObj.a !== undefined) {
            result.a = colorObj.a;
          }

          console.log(`[FigmaTransformer] RGB object conversion:`, colorObj, `->`, result);
          return result;
        }
        
        // If it has hex property, convert it
        if (colorObj.hex) {
          return this.convertToFigmaColor(colorObj.hex);
        }
        
        // If it has rgb property, convert it
        if (colorObj.rgb) {
          const { r, g, b, a } = colorObj.rgb;
          // Check if values are in 0-255 range and convert to 0-1
          const maxValue = Math.max(r, g, b);
          const is255Range = maxValue > 1;
          
          const result: { r: number; g: number; b: number; a?: number } = {
            r: is255Range ? r / 255 : r,
            g: is255Range ? g / 255 : g,
            b: is255Range ? b / 255 : b
          };

          if (a !== undefined) {
            result.a = a;
          }

          console.log(`[FigmaTransformer] RGB property conversion:`, colorObj.rgb, `->`, result);
          return result;
        }
      }

      // Default fallback
      console.log(`[FigmaTransformer] Color conversion fallback for:`, value, `-> {r: 0, g: 0, b: 0}`);
      return { r: 0, g: 0, b: 0 };
    } catch (error) {
      // If colorjs.io fails to parse the color, return default
      console.log(`[FigmaTransformer] Color conversion error for:`, value, `-> {r: 0, g: 0, b: 0}`, error);
      return { r: 0, g: 0, b: 0 };
    }
  }

  /**
   * Convert value to Figma float format
   */
  private convertToFigmaFloat(value: unknown): number {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      // Try to extract numeric value from dimension strings like "16px", "1.5rem"
      const match = value.match(/^([0-9]+(\.[0-9]+)?)/);
      if (match) {
        return parseFloat(match[1]);
      }
    }

    if (typeof value === 'object' && value !== null) {
      const dimObj = value as any;
      if (typeof dimObj.value === 'number') {
        return dimObj.value;
      }
    }

    return 0; // Default fallback
  }

  /**
   * Convert value to Figma string format
   */
  private convertToFigmaString(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }

    return String(value);
  }

  /**
   * Convert value to Figma boolean format
   */
  private convertToFigmaBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    return Boolean(value);
  }

  /**
   * Returns a placeholder value for an alias variable, based on the resolved value type
   */
  private getAliasPlaceholderValue(tokenSystem: TokenSystem, resolvedValueTypeId: string): any {
    const figmaType = this.mapToFigmaVariableType(resolvedValueTypeId, tokenSystem);
    switch (figmaType) {
      case 'COLOR':
        return { r: 0, g: 0, b: 0 }; // 0-1 range as required by Figma API
      case 'FLOAT':
        return 0;
      case 'BOOLEAN':
        return false;
      case 'STRING':
      default:
        return '';
    }
  }

  /**
   * Validate the daisy-chain structure and value assignments
   */
  private validateDaisyChainStructure(
    token: Token,
    tokenSystem: TokenSystem,
    variables: FigmaVariable[],
    modeValues: FigmaVariableModeValue[]
  ): void {
    console.log(`[FigmaTransformer] Validating daisy-chain structure for token "${token.id}"`);
    
    // Check if we have the expected number of variables
    const expectedStages = this.calculateExpectedStages(tokenSystem);
    const actualVariables = variables.length;
    
    console.log(`[FigmaTransformer] Expected stages: ${expectedStages}, Actual variables: ${actualVariables}`);
    
    // Validate that all variables have proper references
    const aliasModeValues = modeValues.filter(mv => 
      typeof mv.value === 'object' && mv.value !== null && 'type' in mv.value && mv.value.type === 'VARIABLE_ALIAS'
    );
    
    console.log(`[FigmaTransformer] Alias mode values: ${aliasModeValues.length}/${modeValues.length}`);
    
    // Validate that direct values are only in the first stage
    const directModeValues = modeValues.filter(mv => 
      typeof mv.value !== 'object' || mv.value === null || !('type' in mv.value)
    );
    
    console.log(`[FigmaTransformer] Direct mode values: ${directModeValues.length}/${modeValues.length}`);
    
    // Log the structure for debugging
    console.log(`[FigmaTransformer] Daisy-chain structure validation complete for token "${token.id}"`);
  }

  /**
   * Calculate the expected number of stages in the daisy-chain
   */
  private calculateExpectedStages(tokenSystem: TokenSystem): number {
    if (!tokenSystem.dimensionOrder || tokenSystem.dimensionOrder.length === 0) {
      return 1; // Simple variable
    }
    
    // Stage 1: Intermediary variables (first dimension)
    // Stage 2: Reference variables (dimensions 2 to n-1)
    // Stage 3: Final variable (token collection)
    const dimensionStages = Math.max(1, tokenSystem.dimensionOrder.length - 1);
    const finalStage = 1; // Token collection variable
    
    return dimensionStages + finalStage;
  }

  /**
   * Find which token collection a token belongs to based on its resolvedValueTypeId
   */
  private findTokenCollection(token: Token, tokenSystem: TokenSystem): any {
    return tokenSystem.tokenCollections?.find((collection: any) => 
      collection.resolvedValueTypeIds.includes(token.resolvedValueTypeId)
    ) || null;
  }

  protected getSupportedInputTypes(): string[] {
    return ['TokenSystem'];
  }

  protected getSupportedOutputTypes(): string[] {
    return ['FigmaTransformationResult'];
  }

  protected getRequiredOptions(): string[] {
    // Only require credentials for publishing, not for export/preview
    return [];
  }

  protected getOptionalOptions(): string[] {
    return [
      'id', 
      'metadata', 
      'updateExisting',
      'existingFigmaData',
      'tempToRealId'
    ];
  }
} 
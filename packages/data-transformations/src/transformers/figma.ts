import type { TokenSystem, Token, Platform, Taxonomy, PlatformExtension } from '@token-model/data-model';
import type { 
  FigmaTransformerOptions, 
  FigmaTransformationResult,
  FigmaVariable,
  FigmaVariableCollection,
  FigmaVariableMode,
  FigmaVariableModeValue
} from '../types/figma';
import { AbstractBaseTransformer } from './base';
import type { ValidationResult } from '../types/common';
import { validateTokenSystem } from '../utils/validation';
import { FigmaIdManager } from '../services/figma-id-manager';
import { FigmaValueConverter } from '../services/figma-value-converter';
import { FigmaDaisyChainService } from '../services/figma-daisy-chain';

import { mapPropertyTypesToFigmaScopes } from '../utils/helpers';

/**
 * Optimized Figma transformer following the intended 8-step workflow:
 * 1. GET local variables from Figma file ('variables/local' endpoint)
 * 2. Get tempToRealId from .figma/mappings/{fileid}.json
 * 3. Prune tempToRealId by removing non-existent Figma IDs
 * 4. Transform canonical data to Figma POST format
 * 5. POST transformed data to Figma REST API
 * 6. Merge API response tempToRealId with existing mapping
 * 7. Update .figma/mappings/{filekey}.json
 * 8. Commit changes to branch
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

  private idManager: FigmaIdManager;
  private valueConverter: FigmaValueConverter;
  private daisyChainService: FigmaDaisyChainService;


  constructor() {
    super();
    this.idManager = new FigmaIdManager();
    this.valueConverter = new FigmaValueConverter();
    this.daisyChainService = new FigmaDaisyChainService(this.idManager, this.valueConverter);
  }

  protected async validateInput(
    input: TokenSystem, 
    options?: FigmaTransformerOptions
  ): Promise<ValidationResult> {
    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationResult['warnings'] = [];

    // Use the comprehensive validation from utils, but skip code syntax validation for Figma export
    // This allows tokens with invalid platform references to still be exported to Figma
    const validation = validateTokenSystem(input, { skipCodeSyntaxValidation: true });
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

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  protected async performTransform(
    input: TokenSystem, 
    options?: FigmaTransformerOptions
  ): Promise<FigmaTransformationResult> {
    console.log('[FigmaTransformer] 🔍 DEEP DEBUG: Starting transformation');
    console.log('[FigmaTransformer] 🔍 DEEP DEBUG: Input tokenSystem structure:', {
      hasTokens: !!input.tokens,
      tokensLength: input.tokens?.length || 0,
      hasCollections: !!input.tokenCollections,
      collectionsLength: input.tokenCollections?.length || 0,
      hasDimensions: !!input.dimensions,
      dimensionsLength: input.dimensions?.length || 0,
      hasPlatforms: !!input.platforms,
      platformsLength: input.platforms?.length || 0,
      hasResolvedValueTypes: !!input.resolvedValueTypes,
      resolvedValueTypesLength: input.resolvedValueTypes?.length || 0,
      dimensionOrder: input.dimensionOrder,
      systemName: input.systemName,
      systemId: input.systemId
    });
    
    if (input.tokens && input.tokens.length > 0) {
      console.log('[FigmaTransformer] 🔍 DEEP DEBUG: Sample tokens:', input.tokens.slice(0, 3).map(t => ({
        id: t.id,
        displayName: t.displayName,
        resolvedValueTypeId: t.resolvedValueTypeId,
        hasValuesByMode: !!t.valuesByMode,
        valuesByModeLength: t.valuesByMode?.length || 0
      })));
    } else {
      console.warn('[FigmaTransformer] 🔍 DEEP DEBUG: NO TOKENS FOUND IN INPUT!');
    }
    
    if (input.platforms && input.platforms.length > 0) {
      console.log('[FigmaTransformer] 🔍 DEEP DEBUG: Available platforms:', input.platforms.map(p => ({
        id: p.id,
        displayName: p.displayName,
        hasFigmaPlatformMapping: !!p.figmaPlatformMapping
      })));
    } else {
      console.warn('[FigmaTransformer] 🔍 DEEP DEBUG: NO PLATFORMS FOUND IN INPUT!');
    }
    
    // Validate input first
    const validation = await this.validate(input, options);
    if (!validation.isValid) {
      return {
        variables: [],
        collections: [],
        variableModes: [],
        variableModeValues: [],
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
      };
    }

    // Initialize ID manager with existing data and tempToRealId mapping
    // This handles steps 1-3 of the intended workflow
    console.log('[FigmaTransformer] 🔍 INITIALIZING ID MANAGER...');
    console.log('[FigmaTransformer] Options passed to ID manager:', {
      hasExistingFigmaData: !!options?.existingFigmaData,
      existingFigmaDataKeys: options?.existingFigmaData ? Object.keys(options.existingFigmaData) : [],
      hasTempToRealId: !!options?.tempToRealId,
      tempToRealIdCount: options?.tempToRealId ? Object.keys(options.tempToRealId).length : 0,
      tempToRealIdSample: options?.tempToRealId ? Object.entries(options.tempToRealId).slice(0, 5) : []
    });
    
    this.idManager.initialize(options?.existingFigmaData, options?.tempToRealId, input);
    
    console.log('[FigmaTransformer] ✅ ID MANAGER INITIALIZED');
    console.log('[FigmaTransformer] ID Manager state after initialization:', {
      tempToRealIdMappingCount: Object.keys(this.idManager.getTempToRealIdMapping()).length,
      tempToRealIdMappingSample: Object.entries(this.idManager.getTempToRealIdMapping()).slice(0, 5)
    });

    // Code syntax is now pre-generated by the preprocessor
    console.log('[FigmaTransformer] ✅ Using pre-generated code syntax from preprocessor');

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

    // Step 4a: Create collections for each dimension with modes
    const dimensionCollections = this.createDimensionCollections(input);
    collections.push(...dimensionCollections);
    stats.collectionsCreated += dimensionCollections.filter(c => c.action === 'CREATE').length;
    stats.collectionsUpdated += dimensionCollections.filter(c => c.action === 'UPDATE').length;

    // Step 4b: Create modeless collections for each token collection
    const modelessCollections = this.createModelessCollections(input);
    collections.push(...modelessCollections);
    stats.collectionsCreated += modelessCollections.filter(c => c.action === 'CREATE').length;
    stats.collectionsUpdated += modelessCollections.filter(c => c.action === 'UPDATE').length;

    // Step 4c-e: Transform tokens with daisy-chaining
    const { variables, modeValues } = this.transformTokensWithDaisyChaining(input, input.figmaConfiguration?.fileColorProfile || 'srgb');
    allVariables.push(...variables);
    allModeValues.push(...modeValues);
    stats.created += variables.filter(v => v.action === 'CREATE').length;
    stats.updated += variables.filter(v => v.action === 'UPDATE').length;

    // Step 4f: Create modes for all collections
    const variableModes = this.createVariableModes(input, collections);
    stats.collectionsUpdated += variableModes.filter(m => m.action === 'UPDATE').length;

    console.log('[FigmaTransformer] Transformation complete:', {
      collections: collections.length,
      variables: allVariables.length,
      modes: variableModes.length,
      modeValues: allModeValues.length
    });

    return {
      variables: allVariables,
      collections,
      variableModes,
      variableModeValues: allModeValues,
      stats
    };
  }

  /**
   * Create collections for each dimension with modes
   * Step 4a of the intended workflow
   */
  private createDimensionCollections(tokenSystem: TokenSystem): FigmaVariableCollection[] {
    const collections: FigmaVariableCollection[] = [];

    for (const dimension of tokenSystem.dimensions || []) {
      // Generate deterministic ID for the dimension collection
      const deterministicId = this.idManager.generateDeterministicId(dimension.id, 'collection');
      const figmaId = this.idManager.getFigmaId(deterministicId);
      const action = this.idManager.determineAction(deterministicId);
      
      console.log(`[FigmaTransformer] Creating dimension collection "${dimension.displayName}" action: ${action}`);
      
      // Find the default mode for this dimension
      const defaultMode = dimension.modes?.find(mode => mode.id === dimension.defaultMode);
      if (!defaultMode) {
        console.warn(`[FigmaTransformer] Default mode ${dimension.defaultMode} not found for dimension ${dimension.id}`);
        continue;
      }
      
      // Generate deterministic ID for the default mode and get the mapped Figma ID
      const deterministicDefaultModeId = this.idManager.generateDeterministicId(defaultMode.id, 'mode');
      const figmaDefaultModeId = this.idManager.getFigmaId(deterministicDefaultModeId);
      
      console.log(`[FigmaTransformer] Dimension collection "${dimension.displayName}":`, {
        collectionId: figmaId,
        defaultModeId: figmaDefaultModeId,
        defaultModeName: defaultMode.name
      });
      
      const collection: FigmaVariableCollection = {
        action: action,
        id: figmaId,
        name: dimension.displayName,
        initialModeId: figmaDefaultModeId,
        hiddenFromPublishing: true // Dimensional collections are hidden
      };
      
      collections.push(collection);
    }

    return collections;
  }

  /**
   * Create modeless collections for each token collection
   * Step 4b of the intended workflow
   */
  private createModelessCollections(tokenSystem: TokenSystem): FigmaVariableCollection[] {
    const collections: FigmaVariableCollection[] = [];

    for (const collection of tokenSystem.tokenCollections || []) {
      // Generate deterministic ID for the token collection
      const deterministicId = this.idManager.generateDeterministicId(collection.id, 'collection');
      const figmaId = this.idManager.getFigmaId(deterministicId);
      const action = this.idManager.determineAction(deterministicId);
      
      console.log(`[FigmaTransformer] Creating modeless collection "${collection.name}" action: ${action}`);
      
      // Generate deterministic ID for the "Value" mode and get the mapped Figma ID
      const deterministicModeId = `mode-tokenCollection-${deterministicId}`;
      const figmaModeId = this.idManager.getFigmaId(deterministicModeId);
      
      console.log(`[FigmaTransformer] Modeless collection "${collection.name}":`, {
        collectionId: figmaId,
        valueModeId: figmaModeId
      });
      
      const modelessCollection: FigmaVariableCollection = {
        action: action,
        id: figmaId,
        name: collection.name,
        initialModeId: figmaModeId
      };
      
      collections.push(modelessCollection);
    }

    return collections;
  }

  /**
   * Transform tokens with daisy-chaining
   * Steps 4c-e of the intended workflow
   */
  private transformTokensWithDaisyChaining(
    tokenSystem: TokenSystem,
    fileColorProfile: 'srgb' | 'display-p3' = 'srgb'
  ): { variables: FigmaVariable[], modeValues: FigmaVariableModeValue[] } {
    const variables: FigmaVariable[] = [];
    const modeValues: FigmaVariableModeValue[] = [];

    // Validate dimensionOrder exists
    console.log('[FigmaTransformer] 🔍 DEEP DEBUG: Checking dimensionOrder for daisy-chaining');
    console.log('[FigmaTransformer] 🔍 DEEP DEBUG: dimensionOrder:', tokenSystem.dimensionOrder);
    console.log('[FigmaTransformer] 🔍 DEEP DEBUG: dimensions:', tokenSystem.dimensions?.map(d => ({ id: d.id, displayName: d.displayName })));
    
    if (!tokenSystem.dimensionOrder || tokenSystem.dimensionOrder.length === 0) {
      console.warn('[FigmaTransformer] No dimensionOrder specified, falling back to simple variable creation');
      console.warn('[FigmaTransformer] This will prevent daisy-chaining from working properly!');
      return this.createSimpleVariables(tokenSystem);
    }

    console.log('[FigmaTransformer] Processing tokens with dimensionOrder:', tokenSystem.dimensionOrder);

    for (const token of tokenSystem.tokens || []) {
      // Use pre-generated code syntax from the preprocessor
      const codeSyntax = this.buildCodeSyntax(token, tokenSystem);
      const figmaCodeSyntax = this.getFigmaCodeSyntax(token, codeSyntax, tokenSystem);
      
      if (!figmaCodeSyntax) {
        console.warn(`[FigmaTransformer] No Figma code syntax found for token ${token.id}, skipping`);
        continue;
      }

      // Check if token has dimension dependencies using the same logic as daisy-chaining service
      const usedDimensions = this.getUsedDimensionsForToken(token, tokenSystem);
      const hasDimensionDependencies = usedDimensions.length > 0;

      console.log(`[FigmaTransformer] Token ${token.id} (${token.displayName}):`, {
        hasDimensionDependencies,
        usedDimensions: usedDimensions.map(d => d.displayName),
        valuesByModeCount: token.valuesByMode?.length || 0,
        hasModeSpecificValues: token.valuesByMode?.some((vbm: any) => vbm.modeIds.length > 0) || false
      });

      if (hasDimensionDependencies) {
        // Use daisy-chaining for tokens with dimension dependencies
        console.log(`[FigmaTransformer] Using daisy-chaining for token ${token.id} with ${usedDimensions.length} dimension dependencies`);
        const { variables: tokenVariables, modeValues: tokenModeValues } = 
          this.daisyChainService.transformTokenWithDaisyChaining(token, tokenSystem, figmaCodeSyntax, fileColorProfile);
        variables.push(...tokenVariables);
        modeValues.push(...tokenModeValues);
      } else {
        // Create simple variable without daisy-chaining for tokens without dimension dependencies
        console.log(`[FigmaTransformer] Creating simple variable for token ${token.id} (no dimension dependencies)`);
        const variable = this.createSimpleVariable(token, tokenSystem, figmaCodeSyntax);
        variables.push(variable);
        
        // Create mode value for simple variable
        const globalValueByMode = token.valuesByMode?.find((vbm: any) => vbm.modeIds.length === 0);
        if (globalValueByMode) {
          const modeValue = this.createModeValueForSimpleVariable(token, tokenSystem, globalValueByMode);
          if (modeValue) {
            modeValues.push(modeValue);
          }
        }
      }
    }

    console.log(`[FigmaTransformer] Daisy-chaining transformation complete: ${variables.length} variables, ${modeValues.length} mode values`);
    return { variables, modeValues };
  }

  /**
   * Create simple variables for tokens without dimensionOrder (fallback)
   */
  private createSimpleVariables(tokenSystem: TokenSystem): { variables: FigmaVariable[], modeValues: FigmaVariableModeValue[] } {
    const variables: FigmaVariable[] = [];
    const modeValues: FigmaVariableModeValue[] = [];

    for (const token of tokenSystem.tokens || []) {
      // Use pre-generated code syntax from the preprocessor
      const codeSyntax = this.buildCodeSyntax(token, tokenSystem);
      const figmaCodeSyntax = this.getFigmaCodeSyntax(token, codeSyntax, tokenSystem);
      
      if (!figmaCodeSyntax) {
        console.warn(`[FigmaTransformer] No Figma code syntax found for token ${token.id}, skipping`);
        continue;
      }

      const variable = this.createSimpleVariable(token, tokenSystem, figmaCodeSyntax);
      variables.push(variable);

      // Create mode value
      const globalValueByMode = token.valuesByMode?.find((vbm: any) => vbm.modeIds.length === 0);
      if (globalValueByMode) {
        const modeValue = this.createModeValueForSimpleVariable(token, tokenSystem, globalValueByMode);
        if (modeValue) {
          modeValues.push(modeValue);
        }
      }
    }

    return { variables, modeValues };
  }

  /**
   * Create a simple variable for a token
   */
  private createSimpleVariable(
    token: Token,
    tokenSystem: TokenSystem,
    figmaCodeSyntax: { platformId: string; formattedName: string }
  ): FigmaVariable {
    const figmaId = this.idManager.getFigmaId(token.id);
    const action = this.idManager.determineAction(token.id);
    const tokenCollection = this.findTokenCollection(token, tokenSystem);

    // Generate deterministic ID for the token collection
    const deterministicCollectionId = tokenCollection 
      ? this.idManager.generateDeterministicId(tokenCollection.id, 'collection')
      : 'default-collection';

    // --- Use the new propertyType-to-Figma-scope mapping utility ---
    const scopes = mapPropertyTypesToFigmaScopes(token.propertyTypes || []);

    const variable: FigmaVariable = {
      action: action,
      id: figmaId,
      name: figmaCodeSyntax.formattedName,
      variableCollectionId: this.idManager.getFigmaId(deterministicCollectionId),
      resolvedType: this.valueConverter.mapToFigmaVariableType(token.resolvedValueTypeId, tokenSystem),
      scopes: scopes,
      hiddenFromPublishing: token.private || false,
      codeSyntax: this.buildCodeSyntax(token, tokenSystem)
    };

    // Add description if it exists and is not empty
    if (token.description && token.description.trim() !== '') {
      variable.description = token.description;
    } 

    return variable;
  }

  /**
   * Create mode value for a simple variable
   */
  private createModeValueForSimpleVariable(
    token: Token,
    tokenSystem: TokenSystem,
    valueByMode: any
  ): FigmaVariableModeValue | null {
    const tokenCollection = this.findTokenCollection(token, tokenSystem);
    if (!tokenCollection) return null;

    // Generate deterministic ID for the token collection
    const deterministicCollectionId = this.idManager.generateDeterministicId(tokenCollection.id, 'collection');

    let resolvedValue: any;
    if ('tokenId' in valueByMode.value) {
      // Handle token references
      const referencedTokenId = valueByMode.value.tokenId;
      const referencedFigmaId = this.idManager.getFigmaId(referencedTokenId);
      resolvedValue = {
        type: 'VARIABLE_ALIAS',
        id: referencedFigmaId
      };
    } else {
      // Handle direct values
      resolvedValue = valueByMode.value.value;
    }

    const figmaValue = this.valueConverter.convertValue(
      resolvedValue, 
      token.resolvedValueTypeId, 
      tokenSystem
    );

    return {
      variableId: this.idManager.getFigmaId(token.id),
      modeId: this.idManager.getFigmaId(`mode-tokenCollection-${deterministicCollectionId}`),
      value: figmaValue
    };
  }

  /**
   * Create modes for all collections
   * Step 4f of the intended workflow
   */
  private createVariableModes(
    tokenSystem: TokenSystem,
    collections: FigmaVariableCollection[]
  ): FigmaVariableMode[] {
    const modes: FigmaVariableMode[] = [];

    // Create "Value" modes for token collections
    // Use deterministic ID generation: mode-tokenCollection-{deterministicCollectionId}
    // This ensures the same ID is always generated for the same collection
    for (const collection of tokenSystem.tokenCollections || []) {
      // Generate deterministic ID for the collection to get the collection ID
      const deterministicCollectionId = this.idManager.generateDeterministicId(collection.id, 'collection');
      
      // Generate deterministic ID for the "Value" mode for this token collection
      const deterministicModeId = `mode-tokenCollection-${deterministicCollectionId}`;
      const modeId = this.idManager.getFigmaId(deterministicModeId);
      let action = this.idManager.determineAction(deterministicModeId);
      
      // Check if this mode is used as initialModeId for any collection
      // If so, force the action to be UPDATE since it already exists in Figma
      const isInitialMode = collections.some(collection => collection.initialModeId === modeId);
      if (isInitialMode) {
        action = 'UPDATE';
        console.log(`[FigmaTransformer] 🔧 FORCING UPDATE for token collection mode "${collection.name}" because it's used as initialModeId`);
      }
      
      console.log(`[FigmaTransformer] Creating "Value" mode for collection "${collection.name}":`, {
        deterministicModeId,
        figmaModeId: modeId,
        action,
        collectionId: this.idManager.getFigmaId(deterministicCollectionId),
        isInitialMode
      });
      
      modes.push({
        action: action,
        id: modeId,
        name: 'Value',
        variableCollectionId: this.idManager.getFigmaId(deterministicCollectionId)
      });
    }

    // Create modes for dimensions
    // These use canonical mode IDs from the schema, so they're already persistent
    for (const dimension of tokenSystem.dimensions || []) {
      // Generate deterministic ID for the dimension collection
      const deterministicDimensionId = this.idManager.generateDeterministicId(dimension.id, 'collection');
      
      for (const mode of dimension.modes || []) {
        // Generate deterministic ID for the mode
        const deterministicModeId = this.idManager.generateDeterministicId(mode.id, 'mode');
        const modeId = this.idManager.getFigmaId(deterministicModeId);
        let action = this.idManager.determineAction(deterministicModeId);
        
        // Check if this mode is used as initialModeId for any collection
        // If so, force the action to be UPDATE since it already exists in Figma
        const isInitialMode = collections.some(collection => collection.initialModeId === modeId);
        if (isInitialMode) {
          action = 'UPDATE';
          console.log(`[FigmaTransformer] 🔧 FORCING UPDATE for mode "${mode.name}" because it's used as initialModeId`);
        }
        
        console.log(`[FigmaTransformer] Creating mode "${mode.name}" for dimension "${dimension.displayName}":`, {
          deterministicModeId,
          figmaModeId: modeId,
          action,
          collectionId: this.idManager.getFigmaId(deterministicDimensionId),
          isDefault: mode.id === dimension.defaultMode,
          isInitialMode
        });
        
        modes.push({
          action: action,
          id: modeId,
          name: mode.name,
          variableCollectionId: this.idManager.getFigmaId(deterministicDimensionId)
        });
      }
    }

    return modes;
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
   * Get Figma variable name and code syntax from pre-generated data
   * Figma variable names are determined exclusively by core figmaConfiguration.syntaxPatterns
   * Platform code syntax is used for the codeSyntax property
   */
  private getFigmaCodeSyntax(token: Token, codeSyntax: Record<string, string>, tokenSystem: TokenSystem): { platformId: string; formattedName: string } | null {
    // Get Figma variable name from pre-generated data (uses core figmaConfiguration.syntaxPatterns)
    const figmaVariableName = (token as Token & { figmaVariableName?: string }).figmaVariableName;
    
    if (figmaVariableName) {
      console.log(`[FigmaTransformer] Using pre-generated Figma variable name for token ${token.id}: "${figmaVariableName}"`);
      return {
        platformId: 'figma', // Figma variable names are determined by core data, not platform
        formattedName: figmaVariableName
      };
    }
    
    // Fallback: if no pre-generated Figma variable name, use display name
    console.warn(`[FigmaTransformer] No pre-generated Figma variable name found for token ${token.id}, using display name`);
    return {
      platformId: 'figma',
      formattedName: token.displayName
    };
  }

  /**
   * Get the dimensions that a token actually uses (has values for)
   * This replicates the logic from FigmaDaisyChainService.getUsedDimensionsForToken
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
   * Get the current tempToRealId mapping for API integration
   * Step 6 of the intended workflow
   */
  getTempToRealIdMapping(): Record<string, string> {
    return this.idManager.getTempToRealIdMapping();
  }

  /**
   * Merge API response with existing tempToRealId mapping
   * Step 6 of the intended workflow
   */
  mergeApiResponse(newTempToRealId: Record<string, string>): void {
    this.idManager.mergeApiResponse(newTempToRealId);
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
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
import { CodeSyntaxGenerator } from '../services/codeSyntaxGenerator';
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
  private codeSyntaxGenerator!: CodeSyntaxGenerator;

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

    // Initialize Code Syntax Generator
    console.log('[FigmaTransformer] 🔍 INITIALIZING CODE SYNTAX GENERATOR...');
    this.codeSyntaxGenerator = new CodeSyntaxGenerator({
      tokens: input.tokens || [],
      platforms: input.platforms || [],
      taxonomies: input.taxonomies || [],
      taxonomyOrder: input.taxonomyOrder || [],
      platformExtensions: this.loadPlatformExtensions(input.platforms || [])
    });
    console.log('[FigmaTransformer] ✅ CODE SYNTAX GENERATOR INITIALIZED');

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
    const { variables, modeValues } = this.transformTokensWithDaisyChaining(input);
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
    tokenSystem: TokenSystem
  ): { variables: FigmaVariable[], modeValues: FigmaVariableModeValue[] } {
    const variables: FigmaVariable[] = [];
    const modeValues: FigmaVariableModeValue[] = [];

    // Validate dimensionOrder exists
    if (!tokenSystem.dimensionOrder || tokenSystem.dimensionOrder.length === 0) {
      console.warn('[FigmaTransformer] No dimensionOrder specified, falling back to simple variable creation');
      return this.createSimpleVariables(tokenSystem);
    }

    console.log('[FigmaTransformer] Processing tokens with dimensionOrder:', tokenSystem.dimensionOrder);

    for (const token of tokenSystem.tokens || []) {
      const figmaVariableName = this.generateFigmaVariableName(token, tokenSystem);
      if (!figmaVariableName) {
        console.warn(`[FigmaTransformer] No Figma variable name generated for token ${token.id}, skipping`);
        continue;
      }

      // Check if token has mode-specific values
      const hasModeSpecificValues = token.valuesByMode?.some((vbm: any) => vbm.modeIds.length > 0) || false;

      if (hasModeSpecificValues) {
        // Use daisy-chaining for multi-dimensional tokens
        const { variables: tokenVariables, modeValues: tokenModeValues } = 
          this.daisyChainService.transformTokenWithDaisyChaining(token, tokenSystem, { platformId: 'figma', formattedName: figmaVariableName });
        variables.push(...tokenVariables);
        modeValues.push(...tokenModeValues);
      } else {
        // Create simple variable without daisy-chaining
        const variable = this.createSimpleVariable(token, tokenSystem, { platformId: 'figma', formattedName: figmaVariableName });
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

    return { variables, modeValues };
  }

  /**
   * Create simple variables for tokens without dimensionOrder (fallback)
   */
  private createSimpleVariables(tokenSystem: TokenSystem): { variables: FigmaVariable[], modeValues: FigmaVariableModeValue[] } {
    const variables: FigmaVariable[] = [];
    const modeValues: FigmaVariableModeValue[] = [];

    for (const token of tokenSystem.tokens || []) {
      const figmaVariableName = this.generateFigmaVariableName(token, tokenSystem);
      if (!figmaVariableName) continue;

      const variable = this.createSimpleVariable(token, tokenSystem, { platformId: 'figma', formattedName: figmaVariableName });
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
   * Generate Figma variable name using figmaConfiguration.syntaxPatterns
   * This uses the new approach where syntax patterns come from figmaConfiguration
   */
  private generateFigmaVariableName(token: Token, tokenSystem: TokenSystem): string {
    console.log(`[FigmaTransformer] 🔍 DEEP DEBUG: Generating Figma variable name for token ${token.id} (${token.displayName})`);
    
    // Get syntax patterns from figmaConfiguration
    const syntaxPatterns = tokenSystem.figmaConfiguration?.syntaxPatterns;
    if (!syntaxPatterns) {
      console.warn(`[FigmaTransformer] 🔍 DEEP DEBUG: No syntax patterns found in figmaConfiguration for token ${token.id}`);
      return token.displayName; // Fallback to display name
    }
    
    console.log(`[FigmaTransformer] 🔍 DEEP DEBUG: Using syntax patterns:`, syntaxPatterns);
    
    // Generate the base token name using syntax patterns
    let baseName = token.displayName;
    
    // Apply capitalization
    switch (syntaxPatterns.capitalization) {
      case 'uppercase':
        baseName = baseName.toUpperCase();
        break;
      case 'lowercase':
        baseName = baseName.toLowerCase();
        break;
      case 'capitalize':
        baseName = baseName.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
        break;
      case 'camel':
        baseName = baseName.split(' ').map((word, index) => 
          index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join('');
        break;
      default:
        // Keep original case
        break;
    }
    
    // Apply delimiter
    if (syntaxPatterns.delimiter) {
      baseName = baseName.replace(/\s+/g, syntaxPatterns.delimiter);
    }
    
    // Apply prefix and suffix
    let formattedName = `${syntaxPatterns.prefix}${baseName}${syntaxPatterns.suffix}`;
    
    // Check for duplicate names and make them unique
    const allTokens = tokenSystem.tokens || [];
    const tokensWithSameDisplayName = allTokens.filter(t => t.displayName === token.displayName);
    
    if (tokensWithSameDisplayName.length > 1) {
      // Find the index of this token in the list of tokens with the same display name
      const tokenIndex = tokensWithSameDisplayName.findIndex(t => t.id === token.id);
      
      // Add a suffix to make the name unique
      // For algorithm-generated tokens, add "(Algorithm)" suffix
      if (token.generatedByAlgorithm) {
        formattedName = `${formattedName} (Algorithm)`;
      } else if (tokenIndex > 0) {
        // For manually created tokens with duplicates, add a number suffix
        formattedName = `${formattedName} (${tokenIndex + 1})`;
      }
      
      console.log(`[FigmaTransformer] 🔍 DEEP DEBUG: Duplicate display name detected for "${token.displayName}". Making unique: "${formattedName}"`);
    }
    
    console.log(`[FigmaTransformer] ✅ DEEP DEBUG: Generated Figma variable name for token ${token.id}: "${formattedName}"`);
    return formattedName;
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
   * Load platform extensions for code syntax generation
   */
  private loadPlatformExtensions(platforms: Platform[]): Map<string, PlatformExtension> {
    const extensions = new Map<string, PlatformExtension>();
    
    for (const platform of platforms) {
      if (platform.extensionSource) {
        // For now, we'll use the platform's own syntax patterns
        // In a full implementation, this would load from the extension source
        if (platform.syntaxPatterns) {
          extensions.set(platform.id, {
            syntaxPatterns: platform.syntaxPatterns
          } as PlatformExtension);
        }
      }
    }
    
    return extensions;
  }

  /**
   * Build code syntax for a token using the new CodeSyntaxGenerator
   */
  private buildCodeSyntax(token: Token, tokenSystem: TokenSystem): any {
    const codeSyntax: any = {};
    
    // Generate code syntax for all platforms that have figmaPlatformMapping
    for (const platform of tokenSystem.platforms || []) {
      if (platform.figmaPlatformMapping) {
        try {
          const formattedName = this.codeSyntaxGenerator.generateTokenCodeSyntaxForPlatform(token, platform.id);
          codeSyntax[platform.figmaPlatformMapping] = formattedName;
        } catch (error) {
          console.warn(`[FigmaTransformer] Failed to generate code syntax for platform ${platform.id}:`, error);
        }
      }
    }
    
    return codeSyntax;
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
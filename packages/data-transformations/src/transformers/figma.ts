import type { TokenSystem, Token } from '@token-model/data-model';
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
    console.log('[FigmaTransformer] Starting transformation with', input.tokens?.length, 'tokens');
    
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
      
      // Generate deterministic ID for the default mode and get the mapped Figma ID
      const deterministicDefaultModeId = this.idManager.generateDeterministicId(dimension.defaultMode, 'mode');
      const figmaDefaultModeId = this.idManager.getFigmaId(deterministicDefaultModeId);
      
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
      
      const modelessCollection: FigmaVariableCollection = {
        action: action,
        id: figmaId,
        name: collection.name,
        initialModeId: this.idManager.getFigmaId(`mode-tokenCollection-${deterministicId}`)
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
      const figmaCodeSyntax = this.getFigmaCodeSyntax(token, tokenSystem);
      if (!figmaCodeSyntax) {
        console.warn(`[FigmaTransformer] No Figma code syntax found for token ${token.id}, skipping`);
        continue;
      }

      // Check if token has mode-specific values
      const hasModeSpecificValues = token.valuesByMode?.some((vbm: any) => vbm.modeIds.length > 0) || false;

      if (hasModeSpecificValues) {
        // Use daisy-chaining for multi-dimensional tokens
        const { variables: tokenVariables, modeValues: tokenModeValues } = 
          this.daisyChainService.transformTokenWithDaisyChaining(token, tokenSystem, figmaCodeSyntax);
        variables.push(...tokenVariables);
        modeValues.push(...tokenModeValues);
      } else {
        // Create simple variable without daisy-chaining
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

    return { variables, modeValues };
  }

  /**
   * Create simple variables for tokens without dimensionOrder (fallback)
   */
  private createSimpleVariables(tokenSystem: TokenSystem): { variables: FigmaVariable[], modeValues: FigmaVariableModeValue[] } {
    const variables: FigmaVariable[] = [];
    const modeValues: FigmaVariableModeValue[] = [];

    for (const token of tokenSystem.tokens || []) {
      const figmaCodeSyntax = this.getFigmaCodeSyntax(token, tokenSystem);
      if (!figmaCodeSyntax) continue;

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

    const variable: FigmaVariable = {
      action: action,
      id: figmaId,
      name: figmaCodeSyntax.formattedName,
      variableCollectionId: this.idManager.getFigmaId(deterministicCollectionId),
      resolvedType: this.valueConverter.mapToFigmaVariableType(token.resolvedValueTypeId, tokenSystem),
      scopes: this.mapPropertyTypesToScopes(token.propertyTypes || []),
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
    // Use deterministic ID generation: mode-tokenCollection-{collection.id}
    // This ensures the same ID is always generated for the same collection
    for (const collection of tokenSystem.tokenCollections || []) {
      // Generate deterministic ID for the token collection
      const deterministicCollectionId = this.idManager.generateDeterministicId(collection.id, 'collection');
      const deterministicModeId = `mode-tokenCollection-${deterministicCollectionId}`;
      const modeId = this.idManager.getFigmaId(deterministicModeId);
      const isInitialMode = this.idManager.isInitialMode(modeId, collections);
      
      // Check if the final mapped ID is a Figma ID (should be UPDATE) or canonical ID (should be CREATE)
      const isFigmaId = this.idManager.isFigmaId(modeId);
      const finalAction = (isInitialMode || isFigmaId) ? 'UPDATE' : 'CREATE';
      
      modes.push({
        action: finalAction,
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
        const isDefaultMode = deterministicModeId === this.idManager.generateDeterministicId(dimension.defaultMode, 'mode');
        const isInitialMode = this.idManager.isInitialMode(deterministicModeId, collections);
        
        // Get the final mapped ID
        const modeId = this.idManager.getFigmaId(deterministicModeId);
        
        // Check if the final mapped ID is a Figma ID (should be UPDATE) or canonical ID (should be CREATE)
        const isFigmaId = this.idManager.isFigmaId(modeId);
        const finalAction = (isDefaultMode || isInitialMode || isFigmaId) ? 'UPDATE' : 'CREATE';
        
        modes.push({
          action: finalAction,
          id: modeId,
          name: mode.name,
          variableCollectionId: this.idManager.getFigmaId(deterministicDimensionId)
        });
      }
    }

    return modes;
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
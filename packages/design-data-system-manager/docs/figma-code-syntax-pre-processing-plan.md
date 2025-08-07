# Figma Code Syntax Pre-processing Plan

## Executive Summary

This plan outlines the implementation of a pre-processing approach for Figma code syntax generation, moving all data preparation logic from the transformer to the design system manager. This creates a cleaner architecture where the `FigmaTransformer` is a pure function that receives all necessary data as parameters, eliminating external dependencies and improving maintainability.

**Key Principle**: Code syntax is **dynamically generated** and **not stored** in the schema, following the code syntax removal plan to eliminate denormalized data.

**Important**: This plan leverages the existing source management infrastructure (`StorageService`, `DataSourceManager`, `DataMergerService`) rather than introducing redundant functionality.

## Architectural Principle: Pure Transformer Function

The `FigmaTransformer` should be a **pure function** that transforms data without side effects or external dependencies. All data preparation should happen in the `design-data-system-manager` package before calling the transformer.

## Revised Architecture

```
Token Data (no codeSyntax)
    ↓
FigmaExportService (design-data-system-manager)
    ↓
Pre-process: Use existing data management services to get merged data and generate code syntax
    ↓
Enhanced Token Data (with dynamically generated codeSyntax)
    ↓
FigmaTransformer (data-transformations) - Pure transformation
    ↓
Figma API Format
```

## Current Problems Identified

1. **Code Syntax Missing**: The Figma transformer is using a `CodeSyntaxGenerator` service that relies on platform extensions loaded at runtime, but the `figmaExport.ts` service isn't properly integrating with `PlatformSyntaxPatternService.ts`

2. **Daisy-chaining Issues**: The transformer is creating intermediary variables but they're missing `codeSyntax` data, which should only be applied to published tokens (non-intermediary)

3. **Values by Mode Missing**: The transformer isn't properly handling all `valuesByMode` combinations, especially for complex multi-dimensional tokens

4. **Integration Gap**: There's a disconnect between how `TokenEditorDialog.tsx` uses `PlatformSyntaxPatternService` and how the Figma transformer accesses syntax patterns

5. **Architectural Issues**: The transformer package shouldn't need to load external JSON from other repositories when the whole purpose is to transform data

6. **Schema Violation**: Previous approach incorrectly assumed `codeSyntax` should be stored in schema

## Detailed Implementation Plan

### Phase 1: Create Simplified Pre-processing Service (Priority: Critical)

#### 1.1 Create FigmaPreprocessor Service
**File**: `packages/design-data-system-manager/src/services/figmaPreprocessor.ts`

**Purpose**: Handle all data preparation before sending to the transformer, including loading syntax patterns, generating code syntax dynamically, and preparing context. **This service leverages existing data management infrastructure.**

**Implementation**:
```typescript
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
    sourceContext: DataSourceContext;
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
  
  private determineTargetPlatforms(platforms: Platform[], sourceContext: DataSourceContext, options: FigmaPreprocessorOptions): Platform[] {
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
    
    // Generate code syntax for each token dynamically
    const enhancedTokens = tokenSystem.tokens?.map(token => {
      const codeSyntax: Record<string, string> = {};
      
      for (const platform of targetPlatforms) {
        const platformPatterns = syntaxPatterns[platform.id];
        if (platformPatterns && platform.figmaPlatformMapping) {
          try {
            const formattedName = this.generateFormattedName(token, platformPatterns, tokenSystem);
            codeSyntax[platform.figmaPlatformMapping] = formattedName;
            console.log(`[FigmaPreprocessor] Generated "${formattedName}" for token ${token.id} on platform ${platform.id}`);
          } catch (error) {
            console.warn(`[FigmaPreprocessor] Failed to generate name for token ${token.id} on platform ${platform.id}:`, error);
            // Fallback to display name
            codeSyntax[platform.figmaPlatformMapping] = token.displayName;
          }
        }
      }
      
      return {
        ...token,
        codeSyntax: Object.keys(codeSyntax).length > 0 ? codeSyntax : undefined
      };
    }) || [];
    
    return {
      ...tokenSystem,
      tokens: enhancedTokens
    };
  }
  
  private generateFormattedName(token: Token, syntaxPatterns: SyntaxPatterns, tokenSystem: TokenSystem): string {
    // Extract taxonomy terms in order
    const orderedTerms = this.extractOrderedTerms(token, tokenSystem);
    
    if (orderedTerms.length === 0) {
      return token.displayName; // Fallback to display name
    }
    
    // Apply syntax patterns
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
```

#### 1.2 Update Figma Export Service
**File**: `packages/design-data-system-manager/src/services/figmaExport.ts`

**Changes**: Use the new preprocessor to prepare data before sending to transformer. **Leverage existing data management services.**

**Implementation**:
```typescript
export class FigmaExportService {
  private transformer: FigmaTransformer;
  private preprocessor: FigmaPreprocessor;

  constructor() {
    this.transformer = new FigmaTransformer();
    this.preprocessor = new FigmaPreprocessor();
  }

  async exportToFigma(options: FigmaExportOptions = {}): Promise<FigmaExportResult> {
    console.log('[FigmaExportService] Starting Figma export...');
    
    try {
      // 1. Use existing data management services to get current merged data
      // No need to manually determine source context - use existing infrastructure
      const mergedData = StorageService.getMergedData();
      if (!mergedData) {
        return {
          success: false,
          error: {
            code: 'NO_DATA_AVAILABLE',
            message: 'No merged data available for export'
          }
        };
      }
      
      // 2. Pre-process the data for Figma export using existing source context
      const preprocessorOptions: FigmaPreprocessorOptions = {
        includePlatformCodeSyntax: true
      };
      
      const preprocessorResult = await this.preprocessor.preprocessForFigma(preprocessorOptions);
      
      // 3. Check validation results
      if (!preprocessorResult.validation.isValid) {
        console.error('[FigmaExportService] Preprocessing validation failed:', preprocessorResult.validation.errors);
        return {
          success: false,
          error: {
            code: 'PREPROCESSING_FAILED',
            message: 'Data preprocessing failed',
            details: preprocessorResult.validation.errors
          }
        };
      }
      
      if (preprocessorResult.validation.warnings.length > 0) {
        console.warn('[FigmaExportService] Preprocessing warnings:', preprocessorResult.validation.warnings);
      }
      
      // 4. Set up transformer options
      const transformerOptions = this.buildTransformerOptions(options);
      
      // 5. Transform the pre-processed data
      console.log('[FigmaExportService] Starting transformation with pre-processed data...');
      const result = await this.transformer.transform(preprocessorResult.enhancedTokenSystem, transformerOptions);
      
      if (!result.success) {
        console.error('[FigmaExportService] Transformation failed:', result.error);
        return {
          success: false,
          error: result.error
        };
      }

      console.log('[FigmaExportService] Export completed successfully');
      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      console.error('[FigmaExportService] Unexpected error during export:', error);
      return {
        success: false,
        error: {
          code: 'TRANSFORMATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown transformation error',
          details: error
        }
      };
    }
  }
  
  private buildTransformerOptions(options: FigmaExportOptions): FigmaTransformerOptions {
    const transformerOptions: Partial<FigmaTransformerOptions> = {
      updateExisting: true
    };
    
    if (options.fileId) transformerOptions.fileKey = options.fileId;
    if (options.accessToken) transformerOptions.accessToken = options.accessToken;
    
    return transformerOptions as FigmaTransformerOptions;
  }
}
```

### Phase 2: Simplify Figma Transformer (Priority: High)

#### 2.1 Remove External Dependencies
**File**: `packages/data-transformations/src/transformers/figma.ts`

**Changes**: Remove all external data loading and make the transformer a pure function.

**Implementation**:
```typescript
export class FigmaTransformer extends AbstractBaseTransformer<
  TokenSystem,
  FigmaTransformationResult,
  FigmaTransformerOptions
> {
  // Remove external dependencies
  // private codeSyntaxGenerator!: CodeSyntaxGenerator;
  
  protected async validateInput(
    input: TokenSystem, 
    options?: FigmaTransformerOptions
  ): Promise<ValidationResult> {
    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationResult['warnings'] = [];

    // Basic schema validation (skip code syntax validation since it's dynamically generated)
    const validation = validateTokenSystem(input, { skipCodeSyntaxValidation: true });
    errors.push(...validation.errors);
    warnings.push(...validation.warnings);

    // Validate that tokens have code syntax for platforms with Figma mapping
    const platformsWithFigmaMapping = input.platforms?.filter(p => p.figmaPlatformMapping) || [];
    for (const platform of platformsWithFigmaMapping) {
      for (const token of input.tokens || []) {
        if (!token.codeSyntax?.[platform.figmaPlatformMapping!]) {
          warnings.push({
            path: `tokens.${token.id}.codeSyntax`,
            message: `Token ${token.id} missing code syntax for platform ${platform.id}`,
            code: 'MISSING_CODE_SYNTAX'
          });
        }
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
    console.log('[FigmaTransformer] Starting transformation with pre-processed data');
    
    // Validate input first
    const validation = await this.validate(input, options);
    if (!validation.isValid) {
      return {
        variables: [],
        collections: [],
        variableModes: [],
        variableModeValues: [],
        stats: { created: 0, updated: 0, deleted: 0, collectionsCreated: 0, collectionsUpdated: 0 },
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Input validation failed',
          details: { validationErrors: validation.errors }
        }
      };
    }

    // Initialize ID manager
    this.idManager.initialize(options?.existingFigmaData, options?.tempToRealId, input);

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

    // Create collections and transform tokens (existing logic)
    const dimensionCollections = this.createDimensionCollections(input);
    collections.push(...dimensionCollections);
    
    const modelessCollections = this.createModelessCollections(input);
    collections.push(...modelessCollections);
    
    const { variables, modeValues } = this.transformTokensWithDaisyChaining(input);
    allVariables.push(...variables);
    allModeValues.push(...modeValues);
    
    const variableModes = this.createVariableModes(input, collections);

    return {
      variables: allVariables,
      collections,
      variableModes,
      variableModeValues: allModeValues,
      stats
    };
  }

  // Simplified buildCodeSyntax - just extract dynamically generated data
  private buildCodeSyntax(token: Token): Record<string, string> {
    return token.codeSyntax || {};
  }

  // Update generateFigmaVariableName to use dynamically generated data
  private generateFigmaVariableName(token: Token, tokenSystem: TokenSystem): string {
    // Use dynamically generated Figma variable name from token data
    // This should be generated by the preprocessor using figmaConfiguration.syntaxPatterns
    const figmaConfig = tokenSystem.figmaConfiguration?.syntaxPatterns;
    if (!figmaConfig) {
      return token.displayName; // Fallback
    }
    
    // Generate using the same logic as the preprocessor
    return this.generateFormattedName(token, figmaConfig, tokenSystem);
  }
}
```

### Phase 3: Update UI Components (Priority: Medium)

#### 3.1 Update Token Editor Dialog
**File**: `packages/design-data-system-manager/src/components/TokenEditorDialog.tsx`

**Changes**: Use the preprocessor for real-time code syntax generation in the UI. **Leverage existing data management services.**

**Implementation**:
```typescript
export function TokenEditorDialog({ token, tokens, platforms, ... }: TokenEditorDialogProps) {
  const [preprocessor] = useState(() => new FigmaPreprocessor());
  const [generatedCodeSyntax, setGeneratedCodeSyntax] = useState<Record<string, string>>({});
  
  // Generate code syntax when token or platforms change
  useEffect(() => {
    const generateCodeSyntax = async () => {
      // Use existing data management services to get current merged data
      const mergedData = StorageService.getMergedData();
      if (!mergedData) return;
      
      // Create a token system with just the current token for preview
      const tokenSystem = {
        ...mergedData,
        tokens: [token] // Only the current token for preview
      };
      
      const result = await preprocessor.preprocessForFigma({
        includePlatformCodeSyntax: true
      });
      
      if (result.enhancedTokenSystem.tokens?.[0]?.codeSyntax) {
        setGeneratedCodeSyntax(result.enhancedTokenSystem.tokens[0].codeSyntax);
      }
    };
    
    generateCodeSyntax();
  }, [token, platforms, mergedData]);
  
  // Use generatedCodeSyntax in the UI
  return (
    // ... existing JSX ...
    <PlatformNamePreview 
      token={token}
      platforms={platforms}
      taxonomies={taxonomies}
      generatedCodeSyntax={generatedCodeSyntax}
    />
    // ... rest of JSX ...
  );
}
```

## Benefits of This Approach

### 1. **Pure Transformer Function**
- No external dependencies or side effects
- Easier to test and reason about
- Predictable behavior

### 2. **Clear Separation of Concerns**
- **Preprocessor**: Handles data preparation and external dependencies
- **Transformer**: Handles pure data transformation
- **Export Service**: Handles API communication and orchestration

### 3. **Leverages Existing Infrastructure**
- **StorageService**: Uses existing merged data management
- **DataSourceManager**: Uses existing source context management
- **PlatformSyntaxPatternService**: Uses existing syntax pattern management
- **No Redundant Services**: Avoids duplicating existing functionality

### 4. **Better Error Handling**
- Preprocessing errors are caught before transformation
- Clear error messages about missing data
- Graceful fallbacks when syntax patterns are unavailable

### 5. **Improved Performance**
- Syntax patterns are loaded once during preprocessing
- No redundant loading during transformation
- Better caching opportunities

### 6. **Easier Testing**
- Transformer can be tested with mock data
- Preprocessor can be tested independently
- No need to mock external API calls in transformer tests

### 7. **Better Maintainability**
- Clear data flow from UI to API
- Single responsibility for each component
- Easier to debug and modify

### 8. **Schema Compliance**
- No `codeSyntax` stored in schema (follows removal plan)
- Dynamic generation eliminates denormalized data
- Maintains single source of truth principle

## Key Principles and Design Decisions

### 1. DRY (Don't Repeat Yourself)
- **Single Preprocessor**: One place for all code syntax generation logic
- **Reuse Platform Syntax Pattern Service**: Leverage existing functionality
- **Use Existing Data Management**: Leverage StorageService, DataSourceManager, DataMergerService
- **Common Validation Logic**: Share validation between UI and transformer

### 2. Separation of Concerns
- **Figma Export Service**: Handles data preparation and API communication
- **Figma Transformer**: Handles data transformation to Figma format
- **Figma Preprocessor**: Handles code syntax generation logic
- **Platform Syntax Pattern Service**: Handles syntax pattern loading and management

### 3. Single Source of Truth
- **Schema-driven**: All data structures follow the schema (without codeSyntax)
- **Platform Extensions**: Single source for platform-specific syntax patterns
- **Core Data**: Single source for taxonomy and platform definitions
- **Existing Infrastructure**: Use existing data management services

### 4. Error Handling and Fallbacks
- **Graceful Degradation**: Fall back to display name when syntax patterns are missing
- **Clear Error Messages**: Provide actionable error messages for debugging
- **Validation**: Validate data at each step of the process

### 5. Performance Considerations
- **Caching**: Cache generated code syntax to avoid redundant computation
- **Bulk Operations**: Generate code syntax for all tokens at once
- **Lazy Loading**: Load platform extensions only when needed

### 6. Schema Compliance
- **No Stored codeSyntax**: Follows code syntax removal plan
- **Dynamic Generation**: All code syntax generated on-demand
- **Validation**: Validate against schema without codeSyntax field

## Migration Strategy

### 1. **Phase 1**: Implement preprocessor (Week 1)
- Create `FigmaPreprocessor` service that leverages existing infrastructure
- Update `FigmaExportService` to use preprocessor
- Test with existing data

### 2. **Phase 2**: Simplify transformer (Week 2)
- Remove external dependencies from transformer
- Update transformer to use pre-generated data
- Update tests

### 3. **Phase 3**: Update UI components (Week 3)
- Update `TokenEditorDialog` to use preprocessor
- Update `PlatformNamePreview` component
- Test UI integration

### 4. **Phase 4**: Remove legacy code (Week 4)
- Remove `CodeSyntaxGenerator` from data-transformations
- Clean up unused dependencies
- Update documentation

## Success Criteria

### Functional Requirements
- ✅ Code syntax is generated dynamically for all platforms with Figma mapping
- ✅ Source context filtering works correctly (core vs platform mode)
- ✅ Daisy-chaining creates all required intermediary variables
- ✅ Only published tokens have code syntax (not intermediary variables)
- ✅ All values by mode combinations are properly processed
- ✅ Error handling provides clear feedback when syntax patterns are missing
- ✅ No `codeSyntax` stored in schema (compliance with removal plan)

### Non-Functional Requirements
- ✅ Performance is acceptable for large token sets
- ✅ Code is maintainable and follows DRY principles
- ✅ Error messages are clear and actionable
- ✅ No regression in existing functionality
- ✅ Schema compliance maintained (no codeSyntax field)

### Technical Requirements
- ✅ Schema compliance maintained throughout (without codeSyntax)
- ✅ Proper separation of concerns
- ✅ Comprehensive test coverage
- ✅ Clear documentation and comments
- ✅ Dynamic generation eliminates denormalized data
- ✅ Leverages existing data management infrastructure

## Risk Mitigation

### Technical Risks
- **Performance Impact**: Implement caching and optimization in preprocessor
- **Data Loss**: Comprehensive testing and rollback procedures
- **Breaking Changes**: Maintain backward compatibility during transition

### User Experience Risks
- **Confusion**: Clear error messages and documentation
- **Performance**: Loading states and progress indicators
- **Functionality Loss**: Thorough testing and validation

### Schema Compliance Risks
- **codeSyntax Storage**: Ensure no codeSyntax is stored in schema
- **Validation Errors**: Update validation to handle dynamic generation
- **Data Integrity**: Maintain single source of truth principle

## Conclusion

This pre-processing approach provides a much cleaner architectural solution that follows the principle of pure functions and proper separation of concerns. The transformer becomes a predictable, testable component while the preprocessor handles all the complex data preparation logic. This approach is simpler, more effective, and maintains proper separation of concerns while eliminating code duplication.

**Key Alignment with Code Syntax Removal Plan**:
- ✅ No `codeSyntax` stored in schema
- ✅ Dynamic generation eliminates denormalized data
- ✅ Maintains single source of truth
- ✅ Improves performance and flexibility
- ✅ Follows schema-driven development principles
- ✅ Leverages existing data management infrastructure

**Key Alignment with Source Management Enhancement Plan**:
- ✅ Uses existing StorageService for merged data
- ✅ Uses existing DataSourceManager for source context
- ✅ Uses existing DataMergerService for data merging
- ✅ No redundant data management functionality
- ✅ Maintains existing data flow patterns

All implementation must adhere to the project rules and preserve existing functionality and design. 
# **🔧 Code Syntax Enhancement Plan: Schema Removal & Centralized Service**

## **📋 Executive Summary**

This plan outlines the complete removal of the `codeSyntax` property from the schema and the implementation of a centralized Code Syntax Generation Service. This addresses data normalization issues, improves consistency, performance, and flexibility while maintaining all existing functionality.

## **🎯 Objectives**

### **Primary Goals:**
1. **Remove `codeSyntax` property** from all schema definitions, validation, and example data
2. **Implement centralized Code Syntax Generation Service** for on-demand generation
3. **Maintain backward compatibility** during transition
4. **Improve data consistency** by eliminating denormalized data
5. **Enhance performance** through selective generation
6. **Increase flexibility** for future platform additions

### **Success Criteria:**
- ✅ `codeSyntax` property completely removed from schema
- ✅ All existing functionality preserved
- ✅ Figma export continues to work
- ✅ UI displays generated names correctly
- ✅ Performance improved for bulk operations
- ✅ No data loss during migration

## **🔍 Current State Analysis**

### **Current `codeSyntax` Usage:**

#### **Schema Level:**
- `packages/data-model/src/schema.json` - Token definition (lines 472-489)
- `packages/data-model/src/schema.ts` - Zod validation (line 228)
- `packages/data-model/src/schema.js` - JavaScript validation (line 185)
- `packages/data-model/src/platform-extension-schema.json` - Platform extension (line 99)

#### **Core Services:**
- `packages/design-data-system-manager/src/services/codeSyntax.ts` - Existing generation service
- `packages/design-data-system-manager/src/services/figmaExport.ts` - Figma export integration
- `packages/design-data-system-manager/src/services/tokenGenerationService.ts` - Token generation

#### **UI Components:**
- `packages/design-data-system-manager/src/components/TokenEditorDialog.tsx` - Token editing
- `packages/design-data-system-manager/src/views/TokensView.tsx` - Token display
- `packages/design-data-system-manager/src/workflows/TokensWorkflow.tsx` - Token workflow

#### **Data Transformations:**
- `packages/data-transformations/src/transformers/figma.ts` - Figma transformer
- `packages/data-transformations/src/utils/helpers.ts` - Helper functions
- `packages/data-transformations/src/utils/validation.ts` - Validation logic

#### **Example Data:**
- `packages/data-model/examples/unthemed/example-minimal-data.json` - Example tokens

## **🏗️ Proposed Solution Architecture**

### **New Code Syntax Generation Service**

```typescript
// Location: packages/data-transformations/src/services/codeSyntaxGenerator.ts

interface CodeSyntaxGeneratorOptions {
  tokens: Token[];
  platforms: Platform[];
  taxonomies: Taxonomy[];
  taxonomyOrder: string[];
  platformExtensions: Map<string, PlatformExtension>;
}

interface CodeSyntaxResult {
  platformId: string;
  formattedName: string;
}

export class CodeSyntaxGenerator {
  // Single token generation
  generateTokenCodeSyntax(token: Token): CodeSyntaxResult[]
  
  // Single platform generation
  generateTokenCodeSyntaxForPlatform(token: Token, platformId: string): string
  
  // Bulk generation
  generateAllTokensCodeSyntax(): Map<string, CodeSyntaxResult[]>
  
  // Platform-specific bulk generation
  generateAllTokensCodeSyntaxForPlatform(platformId: string): Map<string, string>
}
```

### **Service Location Decision:**
**Recommendation: `packages/data-transformations/src/services/codeSyntaxGenerator.ts`**

**Rationale:**
- Aligns with existing transformation services
- Can be used by both UI and transformation layers
- Follows separation of concerns
- Enables reuse across different export formats

## **📋 Implementation Plan**

### **Phase 1: Schema Removal & Migration (Week 1)**

#### **1.1 Schema Updates**
- [ ] Remove `codeSyntax` from `packages/data-model/src/schema.json`
- [ ] Remove `codeSyntax` from `packages/data-model/src/schema.ts`
- [ ] Remove `codeSyntax` from `packages/data-model/src/schema.js`
- [ ] Remove `codeSyntax` from `packages/data-model/src/platform-extension-schema.json`
- [ ] Update `packages/data-model/src/index.ts` to remove `codeSyntax` from exports

#### **1.2 Type Definitions**
- [ ] Update `Token` interface in all type files
- [ ] Remove `codeSyntax` from `ExtendedToken` interface
- [ ] Update validation schemas to exclude `codeSyntax`

#### **1.3 Example Data Cleanup**
- [ ] Remove `codeSyntax` from all example files
- [ ] Update `packages/data-model/examples/unthemed/example-minimal-data.json`
- [ ] Update `packages/data-model/examples/themed/*.json` files
- [ ] Update any other example data files

### **Phase 2: Enhanced Code Syntax Service (Week 2)**

#### **2.1 New Service Implementation**
- [ ] Create `packages/data-transformations/src/services/codeSyntaxGenerator.ts`
- [ ] Implement `CodeSyntaxGenerator` class with all methods
- [ ] Add comprehensive unit tests
- [ ] Add integration tests with existing transformers

#### **2.2 Service Features**
- [ ] **Single Token Generation**: Generate for all platforms
- [ ] **Platform-Specific Generation**: Generate for single platform
- [ ] **Bulk Generation**: Generate for all tokens
- [ ] **Caching**: Implement intelligent caching for performance
- [ ] **Error Handling**: Robust error handling for missing data
- [ ] **Validation**: Validate platform extensions and syntax patterns

#### **2.3 Core Logic Implementation**
- [ ] **Taxonomy Ordering**: Respect `taxonomyOrder` from schema
- [ ] **Syntax Pattern Application**: Apply platform-specific patterns
- [ ] **Fallback Logic**: Handle missing taxonomies gracefully
- [ ] **Duplicate Detection**: Handle duplicate display names
- [ ] **Platform Extension Integration**: Load and use platform extensions

### **Phase 3: UI Integration (Week 3)**

#### **3.1 Token Editor Dialog Updates**
- [ ] Update `TokenEditorDialog.tsx` to use new service
- [ ] Remove `codeSyntax` generation from save logic
- [ ] Add real-time preview of generated names
- [ ] Update "Generated Names Per Platform" table
- [ ] Add loading states for generation

#### **3.2 Token Display Updates**
- [ ] Update `TokensView.tsx` to generate names on-demand
- [ ] Remove `codeSyntax` column from table
- [ ] Add generated names display
- [ ] Optimize for performance with large token sets

#### **3.3 Token Workflow Updates**
- [ ] Update `TokensWorkflow.tsx` to use new service
- [ ] Remove `codeSyntax` from token creation
- [ ] Add preview of generated names during creation

### **Phase 4: Transformation Layer Updates (Week 4)**

#### **4.1 Figma Transformer Updates**
- [ ] Update `packages/data-transformations/src/transformers/figma.ts`
- [ ] Remove `getFigmaCodeSyntax()` method
- [ ] Integrate new `CodeSyntaxGenerator` service
- [ ] Update `generateFigmaVariableName()` to use new service
- [ ] Remove `buildCodeSyntax()` method
- [ ] Update validation to skip `codeSyntax` checks

#### **4.2 Helper Function Updates**
- [ ] Update `packages/data-transformations/src/utils/helpers.ts`
- [ ] Remove `codeSyntax`-related helper functions
- [ ] Add new helpers for code syntax generation

#### **4.3 Validation Updates**
- [ ] Update `packages/data-transformations/src/utils/validation.ts`
- [ ] Remove `codeSyntax` validation logic
- [ ] Add validation for platform extensions
- [ ] Update `validateTokenSystem()` to skip `codeSyntax`

### **Phase 5: Service Layer Updates (Week 5)**

#### **5.1 Figma Export Service**
- [ ] Update `packages/design-data-system-manager/src/services/figmaExport.ts`
- [ ] Remove `codeSyntax` cleaning logic
- [ ] Integrate new `CodeSyntaxGenerator` service
- [ ] Update export methods to generate names on-demand

#### **5.2 Token Generation Service**
- [ ] Update `packages/design-data-system-manager/src/services/tokenGenerationService.ts`
- [ ] Remove `codeSyntax` generation from algorithm execution
- [ ] Integrate new `CodeSyntaxGenerator` service
- [ ] Update token creation to generate names when needed

#### **5.3 Override Manager**
- [ ] Update `packages/design-data-system-manager/src/services/overrideManager.ts`
- [ ] Remove `codeSyntax` copying logic
- [ ] Ensure overrides work without `codeSyntax`

### **Phase 6: Legacy Service Cleanup (Week 6)**

#### **6.1 Remove Old Service**
- [ ] Deprecate `packages/design-data-system-manager/src/services/codeSyntax.ts`
- [ ] Remove all methods and exports
- [ ] Update all imports to use new service
- [ ] Remove utility functions (`convertCodeSyntaxToArray`, `ensureCodeSyntaxArrayFormat`)

#### **6.2 Update Imports**
- [ ] Update all files importing old service
- [ ] Update all files using old utility functions
- [ ] Ensure no broken references remain

### **Phase 7: Testing & Validation (Week 7)**

#### **7.1 Unit Tests**
- [ ] Test new `CodeSyntaxGenerator` service thoroughly
- [ ] Test all generation scenarios
- [ ] Test error handling and edge cases
- [ ] Test performance with large datasets

#### **7.2 Integration Tests**
- [ ] Test Figma export with new service
- [ ] Test UI components with generated names
- [ ] Test token creation and editing workflows
- [ ] Test platform extension integration

#### **7.3 End-to-End Tests**
- [ ] Test complete token lifecycle
- [ ] Test Figma publishing workflow
- [ ] Test platform switching scenarios
- [ ] Test data migration scenarios

### **Phase 8: Documentation & Migration (Week 8)**

#### **8.1 Documentation Updates**
- [ ] Update `packages/data-model/README.md`
- [ ] Update technical decisions documentation
- [ ] Update API documentation
- [ ] Create migration guide for users

#### **8.2 Migration Scripts**
- [ ] Create data migration script to remove `codeSyntax`
- [ ] Create validation script to ensure data integrity
- [ ] Create rollback script if needed

## **🔧 Technical Implementation Details**

### **New Code Syntax Generator Service**

```typescript
// packages/data-transformations/src/services/codeSyntaxGenerator.ts

import type { Token, Platform, Taxonomy, PlatformExtension } from '@token-model/data-model';

interface CodeSyntaxGeneratorOptions {
  tokens: Token[];
  platforms: Platform[];
  taxonomies: Taxonomy[];
  taxonomyOrder: string[];
  platformExtensions: Map<string, PlatformExtension>;
}

interface CodeSyntaxResult {
  platformId: string;
  formattedName: string;
}

export class CodeSyntaxGenerator {
  private options: CodeSyntaxGeneratorOptions;
  private cache: Map<string, Map<string, string>> = new Map();

  constructor(options: CodeSyntaxGeneratorOptions) {
    this.options = options;
  }

  /**
   * Generate codeSyntax for a single token across all platforms
   */
  generateTokenCodeSyntax(token: Token): CodeSyntaxResult[] {
    return this.options.platforms.map(platform => ({
      platformId: platform.id,
      formattedName: this.generateFormattedName(token, platform.id)
    }));
  }

  /**
   * Generate codeSyntax for a single token on a specific platform
   */
  generateTokenCodeSyntaxForPlatform(token: Token, platformId: string): string {
    return this.generateFormattedName(token, platformId);
  }

  /**
   * Bulk generate codeSyntax for all tokens across all platforms
   */
  generateAllTokensCodeSyntax(): Map<string, CodeSyntaxResult[]> {
    const result = new Map<string, CodeSyntaxResult[]>();
    
    this.options.tokens.forEach(token => {
      result.set(token.id, this.generateTokenCodeSyntax(token));
    });

    return result;
  }

  /**
   * Generate codeSyntax for all tokens for a specific platform
   */
  generateAllTokensCodeSyntaxForPlatform(platformId: string): Map<string, string> {
    const result = new Map<string, string>();
    
    this.options.tokens.forEach(token => {
      result.set(token.id, this.generateTokenCodeSyntaxForPlatform(token, platformId));
    });

    return result;
  }

  /**
   * Clear the internal cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  private generateFormattedName(token: Token, platformId: string): string {
    // Check cache first
    const cacheKey = `${token.id}-${platformId}`;
    if (this.cache.has(token.id) && this.cache.get(token.id)!.has(platformId)) {
      return this.cache.get(token.id)!.get(platformId)!;
    }

    const platformExtension = this.options.platformExtensions.get(platformId);
    if (!platformExtension?.syntaxPatterns) {
      throw new Error(`Platform extension not found for platform: ${platformId}`);
    }

    const syntaxPatterns = platformExtension.syntaxPatterns;
    
    // Extract and order taxonomy terms
    const orderedTerms = this.extractOrderedTerms(token);
    
    // Apply syntax patterns
    const result = this.applyFormattingRules(orderedTerms, syntaxPatterns);

    // Cache the result
    if (!this.cache.has(token.id)) {
      this.cache.set(token.id, new Map());
    }
    this.cache.get(token.id)!.set(platformId, result);

    return result;
  }

  private extractOrderedTerms(token: Token): string[] {
    if (!token.taxonomies || token.taxonomies.length === 0) {
      return [token.displayName]; // Fallback to display name
    }

    // Create a map of taxonomyId -> term for this token
    const tokenTerms = new Map<string, string>();
    token.taxonomies.forEach(taxonomy => {
      const taxonomyDef = this.options.taxonomies.find(t => t.id === taxonomy.taxonomyId);
      if (taxonomyDef) {
        const term = taxonomyDef.terms.find(term => term.id === taxonomy.termId);
        if (term) {
          tokenTerms.set(taxonomy.taxonomyId, term.name);
        }
      }
    });

    // Order terms according to taxonomyOrder
    const orderedTerms: string[] = [];
    this.options.taxonomyOrder.forEach(taxonomyId => {
      const term = tokenTerms.get(taxonomyId);
      if (term) {
        orderedTerms.push(term);
      }
    });

    // Add any remaining terms not in the order (fallback)
    tokenTerms.forEach((term, taxonomyId) => {
      if (!this.options.taxonomyOrder.includes(taxonomyId)) {
        orderedTerms.push(term);
      }
    });

    return orderedTerms.length > 0 ? orderedTerms : [token.displayName];
  }

  private applyFormattingRules(terms: string[], syntaxPatterns: any): string {
    let result = terms.join(syntaxPatterns.delimiter || '');
    
    // Apply capitalization
    switch (syntaxPatterns.capitalization) {
      case 'uppercase':
        result = result.toUpperCase();
        break;
      case 'lowercase':
        result = result.toLowerCase();
        break;
      case 'capitalize':
        result = result.split(syntaxPatterns.delimiter || '')
          .map(term => term.charAt(0).toUpperCase() + term.slice(1).toLowerCase())
          .join(syntaxPatterns.delimiter || '');
        break;
      case 'camel':
        const parts = result.split(syntaxPatterns.delimiter || '');
        result = parts[0].toLowerCase() + 
          parts.slice(1).map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join('');
        break;
    }

    // Apply prefix and suffix
    if (syntaxPatterns.prefix) {
      result = syntaxPatterns.prefix + result;
    }
    if (syntaxPatterns.suffix) {
      result = result + syntaxPatterns.suffix;
    }

    // Apply format string if provided
    if (syntaxPatterns.formatString) {
      result = syntaxPatterns.formatString.replace('{name}', result);
    }

    return result;
  }
}
```

### **Figma Transformer Integration**

```typescript
// packages/data-transformations/src/transformers/figma.ts

import { CodeSyntaxGenerator } from '../services/codeSyntaxGenerator';

export class FigmaTransformer extends AbstractBaseTransformer<...> {
  private codeSyntaxGenerator: CodeSyntaxGenerator;

  constructor() {
    super();
    this.idManager = new FigmaIdManager();
    this.valueConverter = new FigmaValueConverter();
    this.daisyChainService = new FigmaDaisyChainService(this.idManager, this.valueConverter);
  }

  protected async performTransform(
    input: TokenSystem, 
    options?: FigmaTransformerOptions
  ): Promise<FigmaTransformationResult> {
    // Initialize code syntax generator
    this.codeSyntaxGenerator = new CodeSyntaxGenerator({
      tokens: input.tokens || [],
      platforms: input.platforms || [],
      taxonomies: input.taxonomies || [],
      taxonomyOrder: input.taxonomyOrder || [],
      platformExtensions: this.loadPlatformExtensions(input.platforms || [])
    });

    // ... rest of transformation logic
  }

  private generateFigmaVariableName(token: Token, tokenSystem: TokenSystem): string {
    // Use the new service instead of stored codeSyntax
    return this.codeSyntaxGenerator.generateTokenCodeSyntaxForPlatform(token, 'figma');
  }

  private buildCodeSyntax(token: Token, tokenSystem: TokenSystem): any {
    // Generate code syntax for all platforms that have figmaPlatformMapping
    const codeSyntax: any = {};
    
    for (const platform of tokenSystem.platforms || []) {
      if (platform.figmaPlatformMapping) {
        const formattedName = this.codeSyntaxGenerator.generateTokenCodeSyntaxForPlatform(token, platform.id);
        codeSyntax[platform.figmaPlatformMapping] = formattedName;
      }
    }
    
    return codeSyntax;
  }

  private loadPlatformExtensions(platforms: Platform[]): Map<string, PlatformExtension> {
    // Load platform extensions for code syntax generation
    const extensions = new Map<string, PlatformExtension>();
    
    for (const platform of platforms) {
      if (platform.extensionSource) {
        // Load platform extension data
        // This would integrate with existing platform extension loading logic
        const extension = this.loadPlatformExtension(platform.extensionSource);
        if (extension) {
          extensions.set(platform.id, extension);
        }
      }
    }
    
    return extensions;
  }
}
```

### **UI Integration Example**

```typescript
// packages/design-data-system-manager/src/components/TokenEditorDialog.tsx

import { CodeSyntaxGenerator } from '@token-model/data-transformations';

export function TokenEditorDialog({ token, platforms, taxonomies, schema, ...props }: TokenEditorDialogProps) {
  const [generatedNames, setGeneratedNames] = useState<Map<string, string>>(new Map());

  // Generate names when token or schema changes
  useEffect(() => {
    if (token && platforms && taxonomies && schema) {
      const generator = new CodeSyntaxGenerator({
        tokens: [token],
        platforms,
        taxonomies,
        taxonomyOrder: schema.taxonomyOrder || [],
        platformExtensions: loadPlatformExtensions(platforms)
      });

      const names = generator.generateAllTokensCodeSyntaxForPlatform('figma');
      setGeneratedNames(names);
    }
  }, [token, platforms, taxonomies, schema]);

  // Display generated names in UI
  const renderGeneratedNames = () => {
    return Array.from(generatedNames.entries()).map(([platformId, name]) => (
      <Text key={platformId}>
        {platformId}: {name}
      </Text>
    ));
  };

  // ... rest of component
}
```

## **🚀 Benefits & Impact**

### **Data Consistency**
- ✅ Eliminates denormalized `codeSyntax` data
- ✅ Ensures names stay in sync with platform changes
- ✅ Prevents stale or inconsistent naming data

### **Performance Improvements**
- ✅ On-demand generation reduces storage overhead
- ✅ Selective generation for specific platforms
- ✅ Intelligent caching for repeated operations
- ✅ Reduced memory usage for large token sets

### **Flexibility & Maintainability**
- ✅ Easy addition of new platforms without schema changes
- ✅ Centralized logic for all naming conventions
- ✅ Consistent behavior across all export formats
- ✅ Better testability and debugging

### **Developer Experience**
- ✅ Simplified token creation (no manual code syntax)
- ✅ Real-time preview of generated names
- ✅ Automatic updates when taxonomies change
- ✅ Clear separation of concerns

## **⚠️ Risks & Mitigation**

### **Migration Risks**
- **Risk**: Data loss during schema migration
- **Mitigation**: Comprehensive migration scripts and rollback procedures

### **Performance Risks**
- **Risk**: Slower initial generation for large datasets
- **Mitigation**: Implement intelligent caching and lazy loading

### **Compatibility Risks**
- **Risk**: Breaking changes for existing integrations
- **Mitigation**: Maintain backward compatibility during transition period

## **📊 Success Metrics**

### **Technical Metrics**
- [ ] Zero `codeSyntax` properties in schema files
- [ ] 100% test coverage for new service
- [ ] <100ms generation time for single token
- [ ] <1s generation time for 1000 tokens

### **User Experience Metrics**
- [ ] No UI regressions
- [ ] Improved token creation workflow
- [ ] Faster Figma export times
- [ ] Consistent naming across platforms

### **Data Quality Metrics**
- [ ] Zero stale naming data
- [ ] 100% consistency between platforms
- [ ] Automatic updates when taxonomies change

## **🎯 Next Steps**

1. **Review and approve** this plan
2. **Set up development environment** for implementation
3. **Begin Phase 1** (Schema Removal & Migration)
4. **Create detailed task breakdown** for each phase
5. **Set up monitoring** for migration progress
6. **Plan user communication** about the changes

## **📚 References**

- [Technical Decisions](../docs/technical-decisions.md)
- [Schema Documentation](../README.md)
- [Platform Extension Schema](../src/platform-extension-schema.json)
- [Example Data](../examples/)

---

*This plan provides a comprehensive roadmap for removing the `codeSyntax` property and implementing a centralized, efficient, and flexible code syntax generation service that addresses all the identified challenges while maintaining full functionality.* 
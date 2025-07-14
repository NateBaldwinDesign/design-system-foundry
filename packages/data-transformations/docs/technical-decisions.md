# Data Transformations Package - Technical Decisions

## Overview

The `data-transformations` package provides a modular, extensible system for transforming design token data between different formats and platforms. It serves as a bridge between the token-model schema and various external systems like Figma Variables API.

## Architecture

### Core Components

1. **Base Transformer Interface** (`src/transformers/base.ts`)
   - Abstract base class providing common transformation logic
   - Standardized validation, error handling, and result formatting
   - Template method pattern for consistent transformer implementation

2. **Type System** (`src/types/`)
   - Platform-specific type definitions (e.g., `figma.ts`)
   - Common types for validation, options, and results
   - Strict typing to ensure API compliance

3. **Utilities** (`src/utils/`)
   - Validation functions for schema compliance
   - Helper functions for common operations
   - Reusable transformation utilities

4. **Schemas** (`src/schemas/`)
   - Platform-specific schema definitions
   - Validation schemas for external APIs

## Key Technical Decisions

### 1. Schema-Driven Development

**Decision**: All transformations must be based on the canonical schema from `@token-model/data-model`.

**Rationale**: 
- Ensures consistency across the entire system
- Prevents drift between data models
- Single source of truth for all data structures

**Implementation**:
- Import types directly from `@token-model/data-model`
- Use schema validation before transformations
- Reject any data that doesn't conform to the schema

### 2. Modular Transformer Architecture

**Decision**: Each platform/format has its own transformer class extending `AbstractBaseTransformer`.

**Rationale**:
- Clear separation of concerns
- Easy to add new platforms
- Consistent interface across all transformers
- Testable in isolation

**Implementation**:
```typescript
export class FigmaTransformer extends AbstractBaseTransformer<
  TokenSystem,
  FigmaTransformationResult,
  FigmaTransformerOptions
> {
  // Platform-specific implementation
}
```

### 3. Comprehensive Validation

**Decision**: Multi-level validation with detailed error reporting.

**Rationale**:
- Catch issues early in the transformation pipeline
- Provide actionable error messages
- Ensure data integrity throughout the process

**Implementation**:
- Schema validation using `validateTokenSystem()`
- Platform-specific validation in transformers
- Detailed error objects with codes and messages

### 4. Figma API Compliance

**Decision**: Strict adherence to Figma Variables API specifications.

**Key Requirements**:
- Proper `action` fields (`CREATE`, `UPDATE`, `DELETE`)
- Correct alias value format: `{ type: 'VARIABLE_ALIAS', id: string }`
- Alpha support in colors: `{ r, g, b, a? }`
- ID mapping for existing variables

**Implementation**:
- Token ID to Figma variable ID mapping based on name matching
- Proper daisy-chaining for dimension and collection variables
- Alpha channel support in color conversion

### 5. Testing Strategy

**Decision**: Use real example data from the monorepo for all tests.

**Rationale**:
- Tests are always schema-compliant
- Future-proof against schema changes
- Realistic test scenarios
- Reduced maintenance overhead

**Implementation**:
```typescript
// Load canonical example data
const minimalDataPath = path.resolve(__dirname, '../../../data-model/examples/unthemed/example-minimal-data.json');
const minimalData: TokenSystem = JSON.parse(fs.readFileSync(minimalDataPath, 'utf-8'));

// For edge cases, clone and modify the example data
const testData: TokenSystem = JSON.parse(JSON.stringify(minimalData));
```

### 6. Error Handling and Result Format

**Decision**: Consistent result format with success/error states.

**Implementation**:
```typescript
interface TransformationResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
```

### 7. Options and Configuration

**Decision**: Flexible options system with required vs optional parameters.

**Implementation**:
- Base options interface for common parameters
- Platform-specific options extending base interface
- Validation of required options
- Warnings for missing optional options

## Figma Transformer Specific Decisions

### Daisy-Chaining Strategy

**Decision**: Implement daisy-chaining for dimension and collection variables.

**Implementation**:
1. Create dimension collections with mode-specific variables
2. Create modeless collections for token collections
3. Token collection variables alias to dimension variables
4. Proper ID mapping for existing Figma variables

### Color Handling

**Decision**: Support alpha channels in color values.

**Implementation**:
- Use `colorjs.io` for robust color parsing
- Convert to RGB with optional alpha: `{ r, g, b, a? }`
- Handle various input formats (hex, RGB objects, etc.)

### Alias Resolution

**Decision**: Map token IDs to existing Figma variable IDs when available.

**Implementation**:
- Build mapping during transformation setup
- Match by variable name
- Use existing Figma IDs for aliases when found
- Fall back to token IDs for new variables

## Package Structure

```
packages/data-transformations/
├── src/
│   ├── transformers/
│   │   ├── base.ts              # Abstract base transformer
│   │   └── figma.ts             # Figma-specific transformer
│   ├── types/
│   │   ├── common.ts            # Common type definitions
│   │   └── figma.ts             # Figma API types
│   ├── utils/
│   │   ├── validation.ts        # Schema validation
│   │   └── helpers.ts           # Common utilities
│   └── schemas/
│       └── figma.ts             # Figma API schemas
├── tests/
│   └── transformers/
│       └── figma.test.ts        # Comprehensive test suite
└── docs/
    └── technical-decisions.md   # This document
```

## Future Considerations

### Extensibility

- New transformers can be added by extending `AbstractBaseTransformer`
- Platform-specific types and schemas can be added to respective directories
- Common utilities can be shared across transformers

### Performance

- Consider caching for expensive operations
- Optimize validation for large datasets
- Profile transformation performance

### Integration

- Ensure transformers work with the web app's export functionality
- Support for GitHub Actions integration
- Consider real-time transformation capabilities

## Best Practices

1. **Always validate input data** against the schema before transformation
2. **Use real example data** for testing to ensure schema compliance
3. **Provide detailed error messages** for debugging and user feedback
4. **Follow platform API specifications** exactly to ensure compatibility
5. **Document platform-specific requirements** and limitations
6. **Test edge cases** thoroughly, especially around aliases and complex data structures

## Dependencies

- `@token-model/data-model`: For schema types and validation
- `colorjs.io`: For robust color parsing and conversion
- `jest`: For comprehensive testing
- `ajv`: For JSON schema validation (if needed)

This document should be updated as new decisions are made or existing ones are refined.

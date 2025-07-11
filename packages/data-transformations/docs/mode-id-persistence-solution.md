# Mode ID Persistence Solution

## Problem Statement

The original Figma transformation process had a critical issue with mode ID generation that prevented proper `tempToRealId` mapping persistence:

### The Issue
- **Token collection modes** were generated as `mode-${collection.id}` using UUIDs
- These IDs were **non-persistent** - they changed on every transformation
- This broke the `tempToRealId` mapping in `.figma/mappings/{filekey}.json`
- Existing variables couldn't be updated, only recreated

### Impact
- **Mapping Loss**: `tempToRealId` mappings became invalid after the first transformation
- **Update Failures**: Variables were always created as new instead of updating existing ones
- **Data Inconsistency**: Figma files accumulated duplicate variables over time

## Solution: Deterministic ID Generation

### Core Principle
**Same input data should always produce the same IDs** to ensure mapping persistence.

### Implementation Strategy

#### 1. **Persistent IDs** (Canonical Data)
These IDs come directly from the schema and are always the same:
```typescript
// Tokens, Collections, Dimensions, Canonical Modes
token-blue-500
collection-color
dimension-color-scheme
mode-light
mode-dark
```

#### 2. **Deterministic Generated IDs** (Transformation-Time)
These IDs are generated during transformation but follow predictable patterns:

```typescript
// OLD (Non-persistent): mode-${collection.id}
// NEW (Deterministic): mode-tokenCollection-${collection.id}

// Examples:
// collection.id = "color" → modeId = "mode-tokenCollection-color"
// collection.id = "typography" → modeId = "mode-tokenCollection-typography"
```

### Code Changes

#### 1. **FigmaTransformer.createVariableModes()**
```typescript
// Before
const modeId = `mode-${collection.id}`;

// After
const modeId = `mode-tokenCollection-${collection.id}`;
```

#### 2. **FigmaDaisyChainService.createFinalTokenVariableModeValues()**
```typescript
// Before
const valueModeId = `mode-${tokenCollection.id}`;

// After
const valueModeId = `mode-tokenCollection-${tokenCollection.id}`;
```

#### 3. **FigmaTransformer.createModelessCollections()**
```typescript
// Before
initialModeId: `mode-${collection.id}`

// After
initialModeId: `mode-tokenCollection-${collection.id}`
```

#### 4. **FigmaTransformer.createModeValueForSimpleVariable()**
```typescript
// Before
modeId: `mode-${tokenCollection.id}`

// After
modeId: `mode-tokenCollection-${tokenCollection.id}`
```

## Benefits

### 1. **Mapping Persistence**
- `tempToRealId` mappings remain valid across transformations
- Existing variables can be updated instead of recreated
- Figma files maintain consistency over time

### 2. **Predictable Behavior**
- Same input data always produces the same IDs
- No more random UUID generation for modes
- Consistent naming patterns across transformations

### 3. **Update Efficiency**
- Variables with existing mappings are updated (UPDATE action)
- Only truly new variables are created (CREATE action)
- Reduces Figma API calls and improves performance

### 4. **Collision Prevention**
- Deterministic patterns prevent naming conflicts
- Clear separation between different ID types
- Easy to debug and trace ID generation

## ID Generation Rules

### For Token Collection Modes
```typescript
// Pattern: mode-tokenCollection-{collection.id}
// Examples:
// collection.id = "color" → modeId = "mode-tokenCollection-color"
// collection.id = "typography" → modeId = "mode-tokenCollection-typography"
// collection.id = "spacing" → modeId = "mode-tokenCollection-spacing"
```

### For Intermediary Variables
```typescript
// Pattern: intermediary-{token.id}-{dimension.id}-{mode.id}
// Examples:
// token.id = "token-blue-500", dimension.id = "dimension-color-scheme", mode.id = "mode-light"
// → intermediary-token-blue-500-dimension-color-scheme-mode-light
```

### For Reference Variables
```typescript
// Pattern: reference-{token.id}-{dimension.id}
// Examples:
// token.id = "token-blue-500", dimension.id = "dimension-contrast"
// → reference-token-blue-500-dimension-contrast
```

## Migration Strategy

### For Existing Projects
1. **Clear existing mappings**: Remove `.figma/mappings/{filekey}.json` files
2. **Re-run transformation**: Generate new mappings with deterministic IDs
3. **Verify consistency**: Ensure same input produces same output

### For New Projects
- No migration needed - deterministic IDs are used from the start
- Mappings will persist correctly from the first transformation

## Testing

### Verification Steps
1. **Run transformation twice** with the same input data
2. **Compare generated IDs** - they should be identical
3. **Check tempToRealId mapping** - should contain the same keys
4. **Verify Figma API calls** - should use UPDATE for existing variables

### Test Cases
- Single-dimensional tokens
- Multi-dimensional tokens
- Token references
- Different collection types
- Mode combinations

## Future Considerations

### Potential Enhancements
1. **ID Validation**: Add validation to ensure deterministic patterns
2. **Migration Tools**: Automated tools for existing project migration
3. **ID Analytics**: Track ID generation patterns and conflicts
4. **Custom Patterns**: Allow custom ID generation patterns per project

### Extension Points
1. **Collection-Specific Patterns**: Different patterns for different collection types
2. **Environment-Specific IDs**: Different patterns for dev/staging/prod
3. **Versioned IDs**: Include version information in generated IDs
4. **Hierarchical IDs**: Support for nested ID structures

## Conclusion

The deterministic ID generation strategy resolves the mode ID persistence issue by ensuring that:

1. **Same input = Same output**: Consistent ID generation across transformations
2. **Mapping persistence**: `tempToRealId` mappings remain valid
3. **Update efficiency**: Existing variables are updated instead of recreated
4. **Predictable behavior**: Clear, traceable ID generation patterns

This solution maintains backward compatibility while providing the foundation for reliable, persistent Figma variable management. 
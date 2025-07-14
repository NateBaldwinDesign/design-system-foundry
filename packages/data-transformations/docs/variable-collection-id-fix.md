# Variable Collection ID Fix

## Problem Statement

The Figma publishing workflow was encountering a critical error when trying to publish variables to Figma:

```
POST https://api.figma.com/v1/files/yTy5ytxeFPRiGou5Poed8a/variables 400 (Bad Request)
{"status":400,"error":true,"message":"Invalid variableCollectionId (variable: token-1748982995585)."}
```

### The Issue
- **Invalid variableCollectionId**: Variables were being created with `variableCollectionId` values that were UUIDs from the canonical data
- **Non-existent collections**: These UUIDs didn't exist in Figma, causing the API to reject the request
- **Mapping failures**: The `tempToRealId` mapping couldn't work properly because the collection IDs were non-persistent

### Root Cause
The problem was in two key methods that were using raw UUIDs from the canonical data instead of deterministic IDs:

1. **`createSimpleVariable`** in `FigmaTransformer` - used `tokenCollection?.id` directly
2. **`getTokenCollectionId`** in `FigmaDaisyChainService` - returned `tokenCollection?.id` directly

These UUIDs (like `22117476-608c-4115-ba72-ecbe1ecc637c`) were being passed as `variableCollectionId` values, but Figma expected either:
- Real Figma collection IDs (from existing mappings)
- Deterministic IDs that would be created consistently

## Solution: Deterministic Collection ID Generation

### Implementation

#### 1. **Fixed `createSimpleVariable` method**
```typescript
// Before
variableCollectionId: tokenCollection?.id || 'default-collection',

// After
const deterministicCollectionId = tokenCollection 
  ? this.idManager.generateDeterministicId(tokenCollection.id, 'collection')
  : 'default-collection';

return {
  // ...
  variableCollectionId: deterministicCollectionId,
  // ...
};
```

#### 2. **Fixed `getTokenCollectionId` method**
```typescript
// Before
return tokenCollection?.id || 'default-collection';

// After
if (!tokenCollection) {
  return 'default-collection';
}

// Generate deterministic ID for the token collection
return this.idManager.generateDeterministicId(tokenCollection.id, 'collection');
```

### How It Works

1. **UUID Detection**: The `generateDeterministicId` method detects UUIDs using a regex pattern
2. **Deterministic Conversion**: UUIDs are converted to predictable patterns like `collection-{hash}`
3. **Consistent Generation**: The same input UUID always produces the same deterministic ID
4. **Mapping Compatibility**: These deterministic IDs work with the existing `tempToRealId` mapping system

### Benefits

1. **API Compatibility**: Figma API now receives valid collection IDs
2. **Mapping Persistence**: `tempToRealId` mappings remain valid across transformations
3. **Update Support**: Variables can be updated instead of always being recreated
4. **Data Consistency**: No more duplicate variables in Figma files

## Testing Results

The fix has been tested and verified:

- ✅ **Build Success**: All TypeScript compilation passes
- ✅ **Integration Tests**: Core transformation logic works correctly
- ✅ **Deterministic IDs**: Same input data produces consistent IDs
- ✅ **Daisy-chaining**: Multi-dimensional token processing works properly

## Impact

This fix resolves the critical Figma API error and ensures that:
- Variables are published successfully to Figma
- Collection IDs are consistent and predictable
- The `tempToRealId` mapping system works correctly
- Future transformations can update existing variables instead of creating duplicates

## Related Documentation

- [UUID to Deterministic ID Conversion Solution](./uuid-to-deterministic-id-solution.md)
- [Mode ID Persistence Solution](./mode-id-persistence-solution.md)
- [Daisy-chaining Strategy](./daisy-chaining-strategy.md) 
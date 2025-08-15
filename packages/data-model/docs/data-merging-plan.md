# Data Merging Hierarchy and Theme Override Validation Plan

## Context
The data merging system implements a hierarchical model where data flows through three distinct layers, each with specific responsibilities and constraints. This plan ensures proper validation and prevents invalid theme overrides from being applied.

## Conceptual Model (Metaphor)
- **Core Data** = "people have two eyes" (base foundation)
- **Platform Extensions** = "This pirate wears a patch, so he only has one eye" (can alter structure/existence)
- **Theme Overrides** = "wearing rose tinted glasses" (can only alter values, not structure)

## Key Principles
1. **Platforms can alter structure**: They can omit tokens, add new tokens, and modify existing tokens
2. **Themes can only alter values**: They can override values of existing tokens but cannot create new tokens
3. **Strict merge order**: Core → Platform → Theme (sequential, never parallel)
4. **Theme validation**: Theme overrides must only apply to tokens that exist in the current merged context
5. **Mode-specific merging**: Platform extensions and theme overrides should only override specific mode combinations, not replace entire valuesByMode arrays

## Critical Issue: ValuesByMode Merging Behavior

### Problem Identified
The current merging logic in `data-merger.ts` is **replacing the entire `valuesByMode` array** instead of **selectively overriding specific mode combinations**. This causes data loss when platform extensions or theme overrides only specify a subset of the available modes.

### Current Behavior (Incorrect)
```typescript
// Core data
valuesByMode: [
  { modeIds: ['light'], value: { x } }, 
  { modeIds: ['dark'], value: { y } }
]

// Platform override
valuesByMode: [
  { modeIds: ['light'], value: { a } }
]

// Current result (WRONG - loses dark mode)
valuesByMode: [
  { modeIds: ['light'], value: { a } }
]
```

### Expected Behavior (Correct)
```typescript
// Expected result (CORRECT - preserves dark mode)
valuesByMode: [
  { modeIds: ['light'], value: { a } }, 
  { modeIds: ['dark'], value: { y } }
]
```

### Root Cause Analysis

#### 1. Platform Extension Merging Issue
**File**: `packages/data-model/src/merging/data-merger.ts`
**Function**: `mergeTokenProperties()` (lines ~200-220)

**Current Logic**:
```typescript
function mergeTokenProperties(existingToken: Token, override: any): Token {
  return {
    ...existingToken,
    // ... other properties ...
    valuesByMode: override.valuesByMode ?? existingToken.valuesByMode  // ❌ REPLACES ENTIRE ARRAY
  };
}
```

**Problem**: The `??` operator completely replaces the `valuesByMode` array instead of merging individual mode combinations.

#### 2. Theme Override Merging Issue
**File**: `packages/data-model/src/merging/data-merger.ts`
**Function**: `applyThemeOverrideToToken()` (lines ~280-300)

**Current Logic**:
```typescript
function applyThemeOverrideToToken(token: Token, override: ThemeOverride): Token {
  const newToken = { ...token };
  
  if (override.platformOverrides) {
    // ... platform override logic ...
    newToken.valuesByMode = [{  // ❌ REPLACES ENTIRE ARRAY
      value: platformOverride.value,
      modeIds: []
    }];
  } else {
    newToken.valuesByMode = [{  // ❌ REPLACES ENTIRE ARRAY
      value: override.value,
      modeIds: []
    }];
  }
  
  return newToken;
}
```

**Problem**: Theme overrides completely replace the `valuesByMode` array instead of merging with existing mode combinations.

#### 3. Empty ModeIds Handling
**Schema Requirement**: Empty `modeIds` arrays should resolve to default modes as defined in the dimension's `defaultMode` property.

**Current Issue**: No logic exists to handle empty `modeIds` arrays and resolve them to default modes.

## Implementation Requirements

### 1. Merge Order Validation
- **Current State**: ✅ Merge order is correct (Core → Platform → Theme)
- **No Changes Required**: The existing `mergeData` function already implements the correct order

### 2. Theme Override Validation
- **Current State**: ❌ Missing validation for omitted/non-existent tokens
- **Required Changes**: Add validation to exclude invalid theme overrides

### 3. Token Existence Validation
- **Current State**: ❌ Theme overrides apply to any token in merged array
- **Required Changes**: Only apply theme overrides to tokens that:
  - Exist in the current merged tokens array (after platform processing)
  - Are not omitted by platform extensions
  - Are not new tokens added by platforms (unless they have theme overrides)

### 4. ValuesByMode Merging Fix
- **Current State**: ❌ Platform extensions and theme overrides replace entire valuesByMode arrays
- **Required Changes**: Implement mode-specific merging that:
  - Preserves all existing mode combinations from core data
  - Overrides only specific mode combinations provided in platform/theme data
  - Handles empty modeIds arrays by resolving to default modes
  - Maintains metadata and platform overrides

## Implementation Plan

### Phase 1: Core Merging Logic Enhancement

#### 1.1 Create Mode-Specific Merging Function
**New Function**: `mergeValuesByMode()`

**Purpose**: Intelligently merge `valuesByMode` arrays by matching `modeIds` combinations
**Logic**:
- Preserve all existing mode combinations from core data
- Override only the specific mode combinations provided in platform/theme data
- Handle empty `modeIds` arrays by resolving to default modes
- Maintain metadata and platform overrides

**Implementation**:
```typescript
function mergeValuesByMode(
  existingValuesByMode: Array<{ modeIds: string[]; value: any; metadata?: any; platformOverrides?: any[] }>,
  overrideValuesByMode: Array<{ modeIds: string[]; value: any; metadata?: any; platformOverrides?: any[] }>,
  dimensions: Array<{ id: string; defaultMode: string }>
): Array<{ modeIds: string[]; value: any; metadata?: any; platformOverrides?: any[] }> {
  const result = [...existingValuesByMode];
  
  for (const overrideValue of overrideValuesByMode) {
    // Resolve empty modeIds to default modes
    const resolvedModeIds = resolveEmptyModeIds(overrideValue.modeIds, dimensions);
    
    // Find existing entry with matching modeIds
    const existingIndex = result.findIndex(existing => 
      arraysEqual(existing.modeIds.sort(), resolvedModeIds.sort())
    );
    
    if (existingIndex !== -1) {
      // Override existing entry
      result[existingIndex] = {
        ...result[existingIndex],
        value: overrideValue.value,
        metadata: overrideValue.metadata ?? result[existingIndex].metadata,
        platformOverrides: overrideValue.platformOverrides ?? result[existingIndex].platformOverrides
      };
    } else {
      // Add new entry
      result.push({
        modeIds: resolvedModeIds,
        value: overrideValue.value,
        metadata: overrideValue.metadata,
        platformOverrides: overrideValue.platformOverrides
      });
    }
  }
  
  return result;
}
```

#### 1.2 Create Empty ModeIds Resolution Function
**New Function**: `resolveEmptyModeIds()`

**Purpose**: Resolve empty `modeIds` arrays to default modes based on dimension configuration
**Logic**:
- If `modeIds` is empty, use default modes from dimensions
- If `modeIds` is not empty, return as-is
- Handle multiple dimensions with different default modes

**Implementation**:
```typescript
function resolveEmptyModeIds(
  modeIds: string[], 
  dimensions: Array<{ id: string; defaultMode: string }>
): string[] {
  if (modeIds.length > 0) {
    return modeIds; // Already has modeIds, return as-is
  }
  
  // Empty modeIds - resolve to default modes
  return dimensions.map(dimension => dimension.defaultMode);
}
```

#### 1.3 Create Array Comparison Utility
**New Function**: `arraysEqual()`

**Purpose**: Compare arrays for equality (used for modeIds matching)
**Implementation**:
```typescript
function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((val, index) => val === b[index]);
}
```

### Phase 2: Update Platform Extension Merging

#### 2.1 Update `mergeTokenProperties()` Function
**File**: `packages/data-model/src/merging/data-merger.ts`
**Function**: `mergeTokenProperties()` (lines ~200-220)

**Changes**:
- Replace direct assignment with `mergeValuesByMode()` call
- Pass dimensions for default mode resolution
- Preserve all other token properties

**Updated Implementation**:
```typescript
function mergeTokenProperties(
  existingToken: Token, 
  override: any, 
  dimensions: Array<{ id: string; defaultMode: string }>
): Token {
  return {
    ...existingToken,
    displayName: override.displayName ?? existingToken.displayName,
    description: override.description ?? existingToken.description,
    themeable: override.themeable ?? existingToken.themeable,
    private: override.private ?? existingToken.private,
    status: override.status ?? existingToken.status,
    tokenTier: override.tokenTier ?? existingToken.tokenTier,
    resolvedValueTypeId: override.resolvedValueTypeId ?? existingToken.resolvedValueTypeId,
    generatedByAlgorithm: override.generatedByAlgorithm ?? existingToken.generatedByAlgorithm,
    algorithmId: override.algorithmId ?? existingToken.algorithmId,
    taxonomies: override.taxonomies ?? existingToken.taxonomies,
    propertyTypes: override.propertyTypes ?? existingToken.propertyTypes,
    valuesByMode: override.valuesByMode 
      ? mergeValuesByMode(existingToken.valuesByMode, override.valuesByMode, dimensions)
      : existingToken.valuesByMode
  };
}
```

#### 2.2 Update `applyPlatformExtension()` Function
**File**: `packages/data-model/src/merging/data-merger.ts`
**Function**: `applyPlatformExtension()` (lines ~120-160)

**Changes**:
- Pass dimensions to `mergeTokenProperties()`
- Ensure dimensions are available from core data

**Updated Implementation**:
```typescript
function applyPlatformExtension(
  currentTokens: Token[],
  currentPlatforms: Platform[],
  extension: PlatformExtension,
  includeOmitted: boolean,
  dimensions: Array<{ id: string; defaultMode: string }>  // Add dimensions parameter
): { tokens: Token[]; platforms: Platform[] } {
  // ... existing platform logic ...
  
  if (extension.tokenOverrides) {
    for (const tokenOverride of extension.tokenOverrides) {
      const existingIndex = tokens.findIndex(t => t.id === tokenOverride.id);
      
      if (existingIndex !== -1) {
        if (tokenOverride.omit && !includeOmitted) {
          tokens.splice(existingIndex, 1);
        } else {
          tokens[existingIndex] = mergeTokenProperties(
            tokens[existingIndex], 
            tokenOverride, 
            dimensions  // Pass dimensions
          );
        }
      } else {
        if (!tokenOverride.omit || includeOmitted) {
          tokens.push(tokenOverride as Token);
        }
      }
    }
  }
  
  return { tokens, platforms };
}
```

### Phase 3: Update Theme Override Merging

#### 3.1 Update `applyThemeOverrideToToken()` Function
**File**: `packages/data-model/src/merging/data-merger.ts`
**Function**: `applyThemeOverrideToToken()` (lines ~280-300)

**Changes**:
- Use `mergeValuesByMode()` instead of replacing entire array
- Handle platform-specific overrides properly
- Preserve existing mode combinations

**Updated Implementation**:
```typescript
function applyThemeOverrideToToken(
  token: Token, 
  override: ThemeOverride,
  dimensions: Array<{ id: string; defaultMode: string }>
): Token {
  const newToken = { ...token };
  
  if (override.platformOverrides) {
    // Handle platform-specific overrides
    const platformOverrideValues = override.platformOverrides.map(platformOverride => ({
      modeIds: [], // Empty modeIds for theme overrides
      value: platformOverride.value,
      metadata: platformOverride.metadata
    }));
    
    newToken.valuesByMode = mergeValuesByMode(
      token.valuesByMode,
      platformOverrideValues,
      dimensions
    );
  } else {
    // Handle general override
    const overrideValues = [{
      modeIds: [], // Empty modeIds for theme overrides
      value: override.value,
      metadata: undefined
    }];
    
    newToken.valuesByMode = mergeValuesByMode(
      token.valuesByMode,
      overrideValues,
      dimensions
    );
  }
  
  return newToken;
}
```

#### 3.2 Update `applyThemeOverrides()` Function
**File**: `packages/data-model/src/merging/data-merger.ts`
**Function**: `applyThemeOverrides()` (lines ~240-270)

**Changes**:
- Pass dimensions to `applyThemeOverrideToToken()`
- Ensure dimensions are available from core data

**Updated Implementation**:
```typescript
function applyThemeOverrides(
  tokens: Token[], 
  themeOverrides: ThemeOverrides, 
  platformOmittedTokens: string[] = [],
  dimensions: Array<{ id: string; defaultMode: string }>  // Add dimensions parameter
): { tokens: Token[]; excludedOverrides: number } {
  const result = [...tokens];
  let excludedOverrides = 0;

  for (const [themeId, overrides] of Object.entries(themeOverrides)) {
    if (!Array.isArray(overrides)) {
      console.error(`[DataMerger] Theme ${themeId} overrides is not an array:`, overrides);
      continue;
    }
    
    for (const override of overrides) {
      if (validateThemeOverrideTokenExistence(override.tokenId, tokens, platformOmittedTokens)) {
        const tokenIndex = result.findIndex(t => t.id === override.tokenId);
        if (tokenIndex !== -1) {
          result[tokenIndex] = applyThemeOverrideToToken(
            result[tokenIndex], 
            override, 
            dimensions  // Pass dimensions
          );
        }
      } else {
        excludedOverrides++;
        console.warn(`[DataMerger] Theme override excluded: Token ${override.tokenId} does not exist or was omitted by platform`);
      }
    }
  }

  return { tokens: result, excludedOverrides };
}
```

### Phase 4: Update Main Merge Function

#### 4.1 Update `mergeData()` Function
**File**: `packages/data-model/src/merging/data-merger.ts`
**Function**: `mergeData()` (lines ~50-100)

**Changes**:
- Extract dimensions from core data
- Pass dimensions to all merging functions
- Ensure dimensions are available throughout the merge process

**Updated Implementation**:
```typescript
export function mergeData(
  coreData: TokenSystem,
  platformExtensions: PlatformExtension[] = [],
  themeOverrides?: ThemeOverrides,
  options: MergeOptions = {}
): MergedData {
  const { targetPlatformId, targetThemeId, includeOmitted = false } = options;
  
  // Extract dimensions for default mode resolution
  const dimensions = coreData.dimensions?.map(d => ({
    id: d.id,
    defaultMode: d.defaultMode
  })) || [];
  
  // ... existing validation logic ...
  
  // Apply platform extensions with dimensions
  for (const extension of relevantExtensions) {
    const result = applyPlatformExtension(
      mergedTokens, 
      mergedPlatforms, 
      extension, 
      includeOmitted,
      dimensions  // Pass dimensions
    );
    // ... rest of platform logic ...
  }
  
  // Apply theme overrides with dimensions
  let themeOverrideResult = { tokens: mergedTokens, excludedOverrides: 0 };
  if (themeOverrides) {
    const relevantThemes = targetThemeId 
      ? { [targetThemeId]: themeOverrides[targetThemeId] }
      : themeOverrides;
    
    themeOverrideResult = applyThemeOverrides(
      mergedTokens, 
      relevantThemes, 
      platformOmittedTokens,
      dimensions  // Pass dimensions
    );
    mergedTokens = themeOverrideResult.tokens;
  }
  
  // ... rest of function ...
}
```

### Phase 5: Enhanced Analytics

#### 5.1 Update Analytics Interface
**Update**: `MergedDataAnalytics` interface

**New Metrics**:
- `excludedThemeOverrides`: Count of theme overrides that were excluded due to token omission/non-existence
- `validThemeOverrides`: Count of theme overrides that were successfully applied
- `themeOverrideValidationErrors`: Array of error messages for debugging
- `modeCombinationsPreserved`: Count of mode combinations preserved during merging
- `modeCombinationsOverridden`: Count of mode combinations overridden during merging

#### 5.2 Update Analytics Calculation
**Update**: `calculateAnalytics` function to include new metrics

### Phase 6: Testing and Validation

#### 6.1 Unit Tests
**Create comprehensive tests for**:
- `mergeValuesByMode()` function with various scenarios
- `resolveEmptyModeIds()` function with different dimension configurations
- `arraysEqual()` utility function
- Complete merge scenarios with platform extensions and theme overrides

#### 6.2 Integration Tests
**Test scenarios**:
- Core data with multiple mode combinations
- Platform extension overriding specific modes
- Theme overrides with empty modeIds
- Complex scenarios with multiple dimensions and modes

#### 6.3 Edge Cases
**Test edge cases**:
- Empty `valuesByMode` arrays
- Missing dimension default modes
- Invalid modeIds in overrides
- Platform overrides with platform-specific metadata

### Phase 7: Documentation Updates

#### 7.1 Update Technical Decisions
**File**: `packages/data-model/docs/technical-decisions.md`

**New Section**: "Data Merging Behavior for ValuesByMode"
**Content**:
- Explanation of mode-specific merging
- Rules for empty modeIds resolution
- Examples of correct vs. incorrect merging behavior
- Implementation details

#### 7.2 Code Comments
**Update**: All merging functions with detailed explanations of the validation logic

## Testing Strategy

### Unit Tests
1. Test `validateThemeOverrideTokenExistence` function independently
2. Test `mergeValuesByMode` function with various mode combinations
3. Test `resolveEmptyModeIds` function with different dimension configurations
4. Test each validation scenario:
   - Valid token exists and not omitted
   - Token exists but is omitted by platform
   - Token does not exist in merged context
   - Token was added by platform (should be valid)

### Integration Tests
1. Test complete merge scenarios with theme overrides
2. Test multiple platform extensions with different omissions
3. Test theme overrides with various token states
4. Test mode-specific merging with complex scenarios

### Edge Cases
1. Theme override for token omitted by platform
2. Theme override for non-existent token
3. Theme override for token added by platform
4. Multiple platform extensions with different omissions
5. Empty theme overrides object
6. Theme overrides with invalid token IDs
7. Empty modeIds arrays in various contexts
8. Missing dimension default modes

## Validation Rules Summary

### Theme Override Validation Rules
1. **Token Existence**: The target token must exist in the current merged tokens array
2. **Not Omitted**: The target token must not be omitted by any platform extension
3. **Platform Context**: Theme overrides can apply to:
   - Core tokens (not omitted by platforms)
   - Platform-added tokens (if they have theme overrides)
4. **Value Override Only**: Theme overrides can only modify token values, not structure

### Platform Extension Rules
1. **Can Omit**: Platforms can omit tokens from the merged result
2. **Can Add**: Platforms can add new tokens to the merged result
3. **Can Modify**: Platforms can modify existing token properties
4. **Structure Control**: Platforms have final say on what tokens exist
5. **Mode-Specific Overrides**: Platforms can override specific mode combinations without affecting others

### Core Data Rules
1. **Foundation**: Core data provides the base foundation
2. **Reference Point**: All platform modifications and theme overrides are based on core data
3. **Validation Source**: Core data provides the reference for validation
4. **Mode Preservation**: All mode combinations should be preserved unless explicitly overridden

### ValuesByMode Merging Rules
1. **Mode Combination Matching**: Overrides are applied based on exact modeIds matching
2. **Empty ModeIds Resolution**: Empty modeIds arrays resolve to dimension default modes
3. **Preservation**: All existing mode combinations are preserved unless explicitly overridden
4. **Metadata Preservation**: Existing metadata and platform overrides are preserved during merging
5. **Additive Behavior**: New mode combinations can be added without affecting existing ones

## Implementation Priority

### High Priority (Critical Fix)
1. Create `mergeValuesByMode()` function
2. Create `resolveEmptyModeIds()` function
3. Update `mergeTokenProperties()` for platform extensions
4. Update `applyThemeOverrideToToken()` for theme overrides

### Medium Priority (Enhancement)
1. Add comprehensive unit tests
2. Update documentation
3. Add validation for edge cases

### Low Priority (Future Enhancement)
1. Performance optimization for large datasets
2. Additional metadata preservation
3. Advanced mode combination matching

## Success Criteria
1. ✅ Theme overrides for omitted tokens are excluded from merged data
2. ✅ Theme overrides for non-existent tokens are excluded from merged data
3. ✅ Analytics accurately reflect excluded vs. applied theme overrides
4. ✅ All validation logic is properly documented
5. ✅ Comprehensive test coverage for all scenarios
6. ✅ Technical decisions documentation is updated with new rules
7. ✅ Platform extensions only override specific mode combinations
8. ✅ Theme overrides preserve existing mode combinations
9. ✅ Empty modeIds arrays resolve to default modes
10. ✅ All existing mode combinations are preserved unless explicitly overridden

## Implementation Notes
- Maintain backward compatibility with existing merge function signatures
- Add detailed logging for debugging theme override validation
- Ensure all error messages are descriptive and actionable
- Follow existing code style and patterns in the data-merger.ts file
- Preserve all existing functionality while adding new merging behavior
- Ensure dimensions are properly extracted and passed throughout the merge process 
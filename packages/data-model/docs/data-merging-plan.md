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

## Implementation Plan

### Phase 1: Update Core Merging Functions

#### 1.1 Update `applyThemeOverrides` Function
**Location**: `packages/data-model/src/merging/data-merger.ts` (lines ~200-220)

**Current Logic**: Applies theme overrides to any token that exists in the merged tokens array
**Required Logic**: Only apply theme overrides to tokens that pass validation

**Function Signature Change**:
```typescript
// Current
function applyThemeOverrides(tokens: Token[], themeOverrides: ThemeOverrides): Token[]

// Updated
function applyThemeOverrides(
  tokens: Token[], 
  themeOverrides: ThemeOverrides,
  platformOmittedTokens?: string[] // IDs of tokens omitted by platforms
): { tokens: Token[], excludedOverrides: number }
```

#### 1.2 Add Token Existence Validation Function
**New Function**: `validateThemeOverrideTokenExistence`

**Purpose**: Check if a theme override's target token exists in the current merged context
**Logic**:
- Check if `override.tokenId` exists in `mergedTokens`
- If not, exclude the override entirely
- Log warning for debugging purposes

**Implementation**:
```typescript
function validateThemeOverrideTokenExistence(
  tokenId: string, 
  mergedTokens: Token[], 
  platformOmittedTokens: string[]
): boolean {
  // Token must exist in merged tokens
  const tokenExists = mergedTokens.some(t => t.id === tokenId);
  
  // Token must not be omitted by platform
  const notOmitted = !platformOmittedTokens.includes(tokenId);
  
  return tokenExists && notOmitted;
}
```

#### 1.3 Update `applyThemeOverrideToToken` Function
**Location**: `packages/data-model/src/merging/data-merger.ts` (lines ~230-250)

**Current Logic**: Applies overrides without checking if the token should receive them
**Required Logic**: Add validation to ensure the token is eligible for theme overrides

### Phase 2: Enhanced Analytics

#### 2.1 Update Analytics Interface
**Update**: `MergedDataAnalytics` interface

**New Metrics**:
- `excludedThemeOverrides`: Count of theme overrides that were excluded due to token omission/non-existence
- `validThemeOverrides`: Count of theme overrides that were successfully applied
- `themeOverrideValidationErrors`: Array of error messages for debugging

#### 2.2 Update Analytics Calculation
**Update**: `calculateAnalytics` function to include new metrics

### Phase 3: Documentation Updates

#### 3.1 Update Technical Decisions
**Location**: `packages/data-model/docs/technical-decisions.md`

**New Section**: "Data Merging Hierarchy and Theme Override Validation"
**Content**:
- Detailed explanation of the merge order principle
- Rules for theme override validation
- Examples using the metaphor
- Implementation details

#### 3.2 Code Comments
**Update**: All merging functions with detailed explanations of the validation logic

## Testing Strategy

### Unit Tests
1. Test `validateThemeOverrideTokenExistence` function independently
2. Test each validation scenario:
   - Valid token exists and not omitted
   - Token exists but is omitted by platform
   - Token does not exist in merged context
   - Token was added by platform (should be valid)

### Integration Tests
1. Test complete merge scenarios with theme overrides
2. Test multiple platform extensions with different omissions
3. Test theme overrides with various token states

### Edge Cases
1. Theme override for token omitted by platform
2. Theme override for non-existent token
3. Theme override for token added by platform
4. Multiple platform extensions with different omissions
5. Empty theme overrides object
6. Theme overrides with invalid token IDs

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

### Core Data Rules
1. **Foundation**: Core data provides the base foundation
2. **Reference Point**: All platform modifications and theme overrides are based on core data
3. **Validation Source**: Core data provides the reference for validation

## Success Criteria
1. ✅ Theme overrides for omitted tokens are excluded from merged data
2. ✅ Theme overrides for non-existent tokens are excluded from merged data
3. ✅ Analytics accurately reflect excluded vs. applied theme overrides
4. ✅ All validation logic is properly documented
5. ✅ Comprehensive test coverage for all scenarios
6. ✅ Technical decisions documentation is updated with new rules

## Implementation Notes
- Maintain backward compatibility with existing merge function signatures
- Add detailed logging for debugging theme override validation
- Ensure all error messages are descriptive and actionable
- Follow existing code style and patterns in the data-merger.ts file 
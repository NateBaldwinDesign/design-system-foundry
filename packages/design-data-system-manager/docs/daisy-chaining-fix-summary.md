# Daisy-Chaining Fix Summary

## Problem Identified

The Figma transformer was not properly implementing the daisy-chaining strategy for tokens with dimension dependencies. The output data was missing intermediary variables and variable mode values necessary for the daisy-chaining strategy to work.

### Root Cause Discovered

**The primary issue was missing `dimensionOrder` at the root level of the TokenSystem.**

The transformer logic checks for `tokenSystem.dimensionOrder` at the root level:

```typescript
// Validate dimensionOrder exists
if (!tokenSystem.dimensionOrder || tokenSystem.dimensionOrder.length === 0) {
  console.warn('[FigmaTransformer] No dimensionOrder specified, falling back to simple variable creation');
  return this.createSimpleVariables(tokenSystem);
}
```

**Issue:** When `dimensionOrder` is missing or empty, the transformer falls back to `createSimpleVariables()` instead of using the daisy-chaining logic, regardless of whether tokens have dimension dependencies.

### Secondary Issue

The transformer was also using incorrect logic to determine whether a token should go through daisy-chaining:

**Old Logic (Incorrect):**
```typescript
const hasModeSpecificValues = token.valuesByMode?.some((vbm: any) => vbm.modeIds.length > 0) || false;
```

This logic only checked if ANY `valuesByMode` entry had mode IDs, but it didn't properly determine if the token had actual dimension dependencies that required daisy-chaining.

## Solution Implemented

### 1. Fixed Transformer Logic

**File:** `packages/data-transformations/src/transformers/figma.ts`

**Changes:**
- Replaced the simple mode-specific values check with proper dimension dependency detection
- Added `getUsedDimensionsForToken()` method that replicates the logic from `FigmaDaisyChainService`
- Updated the routing logic to use dimension dependencies instead of mode-specific values

**New Logic (Correct):**
```typescript
// Check if token has dimension dependencies using the same logic as daisy-chaining service
const usedDimensions = this.getUsedDimensionsForToken(token, tokenSystem);
const hasDimensionDependencies = usedDimensions.length > 0;

if (hasDimensionDependencies) {
  // Use daisy-chaining for tokens with dimension dependencies
  const { variables: tokenVariables, modeValues: tokenModeValues } = 
    this.daisyChainService.transformTokenWithDaisyChaining(token, tokenSystem, figmaCodeSyntax);
  variables.push(...tokenVariables);
  modeValues.push(...tokenModeValues);
} else {
  // Create simple variable without daisy-chaining for tokens without dimension dependencies
  const variable = this.createSimpleVariable(token, tokenSystem, figmaCodeSyntax);
  variables.push(variable);
  // ... create mode values
}
```

### 2. Added Dimension Detection Method

**New Method:** `getUsedDimensionsForToken(token, tokenSystem)`

This method:
1. Collects all dimension IDs that the token has values for
2. Maps mode IDs to their parent dimensions
3. Returns dimensions in the order they appear in `dimensionOrder`
4. Only includes dimensions where the token has actual mode-specific values

### 3. Enhanced Logging

Added detailed logging to help debug the routing decisions:

```typescript
console.log(`[FigmaTransformer] Token ${token.id} (${token.displayName}):`, {
  hasDimensionDependencies,
  usedDimensions: usedDimensions.map(d => d.displayName),
  valuesByModeCount: token.valuesByMode?.length || 0,
  hasModeSpecificValues: token.valuesByMode?.some((vbm: any) => vbm.modeIds.length > 0) || false
});
```

## Critical Data Requirement

**The TokenSystem must include `dimensionOrder` at the root level for daisy-chaining to work:**

```json
{
  "dimensionOrder": [
    "dimensionId-0000-0000-0000",
    "dimensionId-1111-1111-1111", 
    "dimensionId-2222-2222-2222"
  ],
  "dimensions": [...],
  "tokens": [...],
  // ... other properties
}
```

**Without `dimensionOrder`, the transformer will always fall back to simple variable creation, regardless of token dimension dependencies.**

## Expected Results

After this fix, the transformer output should include:

### For Tokens with Dimension Dependencies:
1. **Intermediary Variables** - Variables in dimension collections with actual values
2. **Reference Variables** - Variables that alias to previous intermediaries (for multi-dimensional tokens)
3. **Final Token Variables** - Variables in token collections that reference the last intermediaries
4. **Variable Mode Values** - Proper mode values that create the daisy-chain relationships

### For Tokens without Dimension Dependencies:
1. **Simple Variables** - Direct variables in token collections with global values
2. **Simple Mode Values** - Direct mode values without daisy-chaining

## Testing Results

The fix was validated with test data that revealed:

- **1 multi-dimensional token** ("Accent text color") - should create 4 variables (3 intermediaries + 1 final)
- **2 single-dimensional tokens** ("Black" and "Font primary") - should each create 2 variables (1 intermediary + 1 final)  
- **1 simple token** ("Line height primary") - should create 1 simple variable

**Before fix:** All tokens were creating simple variables due to missing `dimensionOrder`
**After fix:** Tokens with dimension dependencies properly route through daisy-chaining service

## Impact

This fix ensures that:
1. **Daisy-chaining strategy is properly implemented** according to the technical decisions
2. **Intermediary variables are created** for proper mode relationship handling
3. **Variable mode values are generated** to establish the daisy-chain connections
4. **Code syntax data flows correctly** through the transformer
5. **Figma variables have proper structure** for multi-dimensional design tokens

## Files Modified

- `packages/data-transformations/src/transformers/figma.ts` - Updated transformer logic
- `packages/design-data-system-manager/docs/daisy-chaining-fix-summary.md` - This documentation

## Related Documentation

- [Daisy-Chaining Strategy](../data-transformations/docs/daisy-chaining-strategy.md)
- [Figma Code Syntax Implementation Summary](./figma-code-syntax-implementation-summary.md)
- [Figma Code Syntax Pre-Processing Plan](./figma-code-syntax-pre-processing-plan.md) 
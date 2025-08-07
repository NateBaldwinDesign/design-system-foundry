# Figma Variable Naming Fix Summary

## Problem Identified

The Figma variable naming was incorrectly using **platform syntax patterns** instead of being determined **exclusively** by the core data's `figmaConfiguration.syntaxPatterns` as required by the project rules.

### Root Cause

The `FigmaPreprocessor` was using platform syntax patterns to generate names that were then used for Figma variable names:

```typescript
// INCORRECT: Using platform syntax patterns for Figma variable names
const syntaxPatterns = this.platformSyntaxPatternService.getAllSyntaxPatterns();
for (const platform of targetPlatforms) {
  const platformPatterns = syntaxPatterns[platform.id];
  const formattedName = this.generateFormattedName(token, platformPatterns, tokenSystem);
  codeSyntax[platform.figmaPlatformMapping] = formattedName; // This was used for Figma names!
}
```

**Issue:** Figma variable names were being determined by platform-specific syntax patterns instead of the core data's `figmaConfiguration.syntaxPatterns`.

## Solution Implemented

### 1. Separated Name Generation from Code Syntax Generation

**File:** `packages/design-data-system-manager/src/services/figmaPreprocessor.ts`

**Key Changes:**
- **Figma Variable Names**: Generated using core `figmaConfiguration.syntaxPatterns`
- **Platform Code Syntax**: Generated using platform syntax patterns
- **Separate Storage**: Figma variable names stored in `figmaVariableName` property, platform code syntax in `codeSyntax` property

**New Logic:**
```typescript
// Get Figma syntax patterns from core data for variable naming
const figmaSyntaxPatterns = this.getFigmaSyntaxPatterns(tokenSystem);

// Generate Figma variable name using core figmaConfiguration.syntaxPatterns
const figmaVariableName = this.generateFigmaVariableName(token, figmaSyntaxPatterns, tokenSystem);

// Generate platform code syntax using platform syntax patterns
for (const platform of targetPlatforms) {
  const platformPatterns = syntaxPatterns[platform.id];
  const formattedName = this.generateFormattedName(token, platformPatterns, tokenSystem);
  codeSyntax[platform.figmaPlatformMapping] = formattedName;
}

return {
  ...token,
  figmaVariableName: figmaVariableName, // For Figma variable names
  codeSyntax: Object.keys(codeSyntax).length > 0 ? codeSyntax : undefined // For platform code syntax
};
```

### 2. Added Dedicated Figma Variable Name Generation

**New Method:** `generateFigmaVariableName(token, figmaSyntaxPatterns, tokenSystem)`

This method:
- Uses core `figmaConfiguration.syntaxPatterns` exclusively
- Applies the same naming logic as platform code syntax but with core patterns
- Ensures Figma variable names are determined by core data, not platform data

### 3. Updated Transformer to Use Correct Names

**File:** `packages/data-transformations/src/transformers/figma.ts`

**Key Changes:**
- Updated `getFigmaCodeSyntax()` to use `figmaVariableName` property
- Removed platform-based name extraction logic
- Ensures Figma variable names come from core data

**New Logic:**
```typescript
private getFigmaCodeSyntax(token: Token, codeSyntax: Record<string, string>, tokenSystem: TokenSystem): { platformId: string; formattedName: string } | null {
  // Get Figma variable name from pre-generated data (uses core figmaConfiguration.syntaxPatterns)
  const figmaVariableName = (token as Token & { figmaVariableName?: string }).figmaVariableName;
  
  if (figmaVariableName) {
    return {
      platformId: 'figma', // Figma variable names are determined by core data, not platform
      formattedName: figmaVariableName
    };
  }
  
  // Fallback to display name
  return {
    platformId: 'figma',
    formattedName: token.displayName
  };
}
```

## Data Flow

### Before Fix (Incorrect):
```
Token Data
    ↓
FigmaPreprocessor (uses platform syntax patterns for names)
    ↓
Enhanced Token Data (names from platform patterns)
    ↓
FigmaTransformer (uses platform-generated names for Figma variables)
    ↓
Figma API Format (incorrect names)
```

### After Fix (Correct):
```
Token Data
    ↓
FigmaPreprocessor (separates name generation)
    ├── Figma Variable Names (core figmaConfiguration.syntaxPatterns)
    └── Platform Code Syntax (platform syntax patterns)
    ↓
Enhanced Token Data (separate properties)
    ↓
FigmaTransformer (uses core-generated names for Figma variables)
    ↓
Figma API Format (correct names + platform code syntax)
```

## Key Distinctions

### Figma Variable Names (`name` property)
- **Source**: Core data's `figmaConfiguration.syntaxPatterns`
- **Purpose**: Display names in Figma interface
- **Determined by**: Core data exclusively
- **Example**: `"Primary/Blue/500"` (using core delimiter `/`)

### Platform Code Syntax (`codeSyntax` property)
- **Source**: Platform syntax patterns
- **Purpose**: Code generation for different platforms
- **Determined by**: Platform-specific patterns
- **Example**: `{ "WEB": "primary-blue-500", "iOS": "PrimaryBlue500" }`

## Impact

This fix ensures that:

1. **Figma variable names are determined exclusively by core data** as required by project rules
2. **Platform code syntax remains platform-specific** for proper code generation
3. **Clear separation of concerns** between naming and code syntax
4. **Consistent Figma variable naming** regardless of platform configuration
5. **Compliance with project architecture** and data flow principles

## Files Modified

- `packages/design-data-system-manager/src/services/figmaPreprocessor.ts` - Separated name generation
- `packages/data-transformations/src/transformers/figma.ts` - Updated to use correct names

## Related Documentation

- [Figma Code Syntax Implementation Summary](./figma-code-syntax-implementation-summary.md)
- [Figma Code Syntax Pre-Processing Plan](./figma-code-syntax-pre-processing-plan.md)
- [Daisy-Chaining Fix Summary](./daisy-chaining-fix-summary.md) 
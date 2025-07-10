# Figma Daisy-Chaining Strategy

## Overview

The Figma daisy-chaining strategy implements a three-stage decomposition process to transform multi-dimensional design tokens into Figma variables while maintaining proper mode relationships and avoiding circular references.

## Core Architecture

### Three-Stage Decomposition Process

1. **Stage 1: Intermediary Variables** - Create variables in dimension collections for each mode combination
2. **Stage 2: Reference Variables** - Create variables in subsequent collections that alias to previous intermediaries  
3. **Stage 3: Final Token Variables** - Create variables in token collections that reference the last intermediaries

### Key Services

- **FigmaDaisyChainService**: Main orchestration logic
- **FigmaIdManager**: Handles ID mappings and CREATE/UPDATE actions
- **FigmaValueConverter**: Converts token values to Figma format

## Detailed Strategy

### 1. Token Analysis and Dimension Detection

**Method**: `getUsedDimensionsForToken(token, tokenSystem)`

**Process**:
1. Scan all `valuesByMode` entries for the token
2. Extract all `modeIds` from each entry
3. Map each `modeId` to its parent dimension
4. Return dimensions in `dimensionOrder` sequence
5. Only include dimensions where the token has actual mode-specific values

**Output**: Ordered array of dimensions the token actually uses

### 2. Single-Dimension Token Processing

**When**: `usedDimensions.length === 1`

**Process**:
1. Create one intermediary variable in the dimension collection
2. Create mode values for each mode in the dimension
3. Map the dimension ID to the intermediary variable ID (not final token variable)
4. Create final token variable in token collection
5. Create single mode value using token collection's "Value" mode that aliases to the intermediary

**Key Decision**: For single-dimension tokens, the `modeToVariableMap` maps `dimension.id` → `intermediaryVariableId`

### 3. Multi-Dimensional Token Processing

**When**: `usedDimensions.length > 1`

**Process**:
1. **First Dimension**: Create intermediaries with actual values
2. **Subsequent Dimensions**: Create reference variables that alias to previous intermediaries
3. **Final Stage**: Create final token variable that references the last intermediary

### 4. Intermediary Variable Creation

**Method**: `createIntermediaryVariablesForDimension()`

**For Multi-Dimensional Tokens**:
- Create one variable per mode in the next dimension
- Variable ID: `intermediary-${token.id}-${dimension.id}-${nextMode.id}`
- Map by next dimension's mode ID: `modeToVariableMap[nextMode.id] = variableId`

**For Single-Dimensional Tokens**:
- Create one variable for the entire collection
- Variable ID: `intermediary-${token.id}-${dimension.id}`
- Map by dimension ID: `modeToVariableMap[dimension.id] = finalTokenVariableId`

### 5. Token Reference Handling

**Detection**: `valueByMode.value && typeof valueByMode.value === 'object' && 'tokenId' in valueByMode.value`

**Process**:
1. Extract `referencedTokenId` from `valueByMode.value.tokenId`
2. Find the referenced token in `tokenSystem.tokens`
3. Determine if referenced token is single or multi-dimensional
4. Create appropriate `VARIABLE_ALIAS`:

**For Single-Dimension Referenced Tokens**:
```typescript
const referencedVariableId = this.idManager.getFigmaId(referencedTokenId);
// Always use mapped Figma ID, not raw token ID
```

**For Multi-Dimensional Referenced Tokens**:
```typescript
const referencedVariableId = `intermediary-${referencedTokenId}-${dimension.id}-${mode.id}`;
// Alias to appropriate intermediary
```

### 6. Reference Variable Creation

**Method**: `createReferenceVariablesForDimension()`

**Process**:
1. Create one reference variable per dimension
2. Variable ID: `reference-${token.id}-${dimension.id}`
3. For each mode in the dimension:
   - Look up target variable by `mode.id` or `dimension.id`
   - If target is a token ID, convert using `idManager.getFigmaId()`
   - Create `VARIABLE_ALIAS` to target variable

### 7. Final Token Variable Creation

**Method**: `createFinalTokenVariable()`

**Process**:
1. Get Figma ID using `idManager.getFigmaId(token.id)`
2. Determine action using `idManager.determineAction(token.id)`
3. Assign to token collection using `getTokenCollectionId()`
4. Set scopes using `mapPropertyTypesToScopes()`
5. Build code syntax using `buildCodeSyntax()`

### 8. Final Token Variable Mode Values

**Method**: `createFinalTokenVariableModeValues()`

**For Token Collections**:
1. Get token collection using `findTokenCollection()`
2. Use single "Value" mode: `mode-${tokenCollection.id}`
3. **For Multi-Dimensional Tokens**: Find reference variable by pattern `reference-${token.id}-${lastDimension.id}`
4. **For Single-Dimensional Tokens**: Get target variable ID from `modeToVariableMap[lastDimension.id]`
5. **Always Create VARIABLE_ALIAS**: Create `VARIABLE_ALIAS` to target variable
   - For single-dimensional tokens: aliases to intermediary variable
   - For multi-dimensional tokens: aliases to reference variable

**For Dimension Collections (Fallback)**:
- Use dimension modes directly
- Create aliases for each mode in the last dimension

## ID Management Strategy

### FigmaIdManager Responsibilities

1. **Initialize with existing data**: Extract IDs from Figma file response
2. **Load tempToRealId mapping**: Map temporary IDs to real Figma IDs
3. **Prune invalid mappings**: Remove mappings where Figma ID doesn't exist
4. **Provide ID resolution**: `getFigmaId()` returns mapped ID or original
5. **Determine actions**: `determineAction()` returns CREATE/UPDATE

### ID Resolution Flow

1. **For existing tokens**: Use `tempToRealId` mapping if available
2. **For new tokens**: Use generated temporary ID
3. **For aliases**: Always use `idManager.getFigmaId()` to get correct Figma ID
4. **For intermediaries**: Use generated IDs with predictable patterns

## Value Conversion Strategy

### FigmaValueConverter Responsibilities

1. **Type mapping**: Map resolved value types to Figma variable types
2. **Value conversion**: Convert token values to Figma format
3. **Alias handling**: Process `VARIABLE_ALIAS` values
4. **Placeholder generation**: Provide fallback values for missing data

### Conversion Rules

- **COLOR**: Convert to RGB object with 0-1 range values
- **FLOAT**: Convert to number (spacing, font-size, etc.)
- **STRING**: Convert to string (font-family, font-weight, etc.)
- **VARIABLE_ALIAS**: Preserve alias structure with correct ID

## Collection Assignment Strategy

### Dimension Collections
- **Purpose**: Hold intermediary and reference variables
- **Modes**: Use actual dimension modes (e.g., `modeId-light`, `modeId-dark`)
- **Hidden**: Set `hiddenFromPublishing: true`

### Token Collections  
- **Purpose**: Hold final token variables
- **Modes**: Single "Value" mode (`mode-${collection.id}`)
- **Visible**: Set `hiddenFromPublishing: false` (unless token is private)

## Error Prevention Mechanisms

### 1. Self-Aliasing Prevention
- **Detection**: `targetVariableId === finalVariableId`
- **Solution**: Set direct value instead of `VARIABLE_ALIAS`
- **Fallback**: Use placeholder value if no direct value available

### 2. Invalid Mode Prevention
- **Detection**: Token collection mode vs dimension mode mismatch
- **Solution**: Use token collection's "Value" mode for final variables
- **Fallback**: Use dimension modes for backward compatibility

### 3. Missing Token Reference Prevention
- **Detection**: Referenced token not found in `tokenSystem.tokens`
- **Solution**: Use placeholder value from `getAliasPlaceholderValue()`

### 4. ID Mapping Validation
- **Process**: Prune `tempToRealId` mappings where Figma ID doesn't exist
- **Result**: Only valid mappings are used for ID resolution

## Key Decision Points

### 1. Single vs Multi-Dimensional Detection
- **Criteria**: `usedDimensions.length === 1`
- **Impact**: Determines entire processing path

### 2. Token Reference vs Direct Value
- **Criteria**: `'tokenId' in valueByMode.value`
- **Impact**: Creates `VARIABLE_ALIAS` vs direct value

### 3. Single vs Multi-Dimensional Referenced Token
- **Criteria**: `referencedTokenDimensions.length === 1`
- **Impact**: Alias to final token vs intermediary

### 4. Self-Aliasing Detection
- **Criteria**: `targetVariableId === finalVariableId`
- **Impact**: Direct value vs `VARIABLE_ALIAS`

### 5. Token Collection vs Dimension Collection
- **Criteria**: `findTokenCollection()` returns collection
- **Impact**: "Value" mode vs dimension modes

## Common Patterns

### Single-Dimension Color Token
```
Token: Blue 500 (uses Color Scheme dimension)
→ Intermediary: intermediary-token-8888-88888-88888-dimensionId-0000-0000-0000
→ Final: token-8888-88888-88888 (in Color collection, "Value" mode)
```

### Multi-Dimensional Text Token
```
Token: Accent Text (uses Color Scheme + Contrast dimensions)
→ Intermediary 1: intermediary-token-9999-9999-9999-dimensionId-0000-0000-0000-modeId-low
→ Reference: reference-token-9999-9999-9999-dimensionId-1111-1111-1111
→ Final: token-9999-9999-9999 (in Typography collection, "Value" mode) with VARIABLE_ALIAS to reference
```

### Token Reference Pattern
```
Token A references Token B
→ Token A creates VARIABLE_ALIAS to Token B's final variable
→ Uses idManager.getFigmaId() for correct ID resolution
```

## Troubleshooting Guide

### "Invalid mode" Error
- **Cause**: Final variable assigned to token collection but using dimension modes
- **Solution**: Use token collection's "Value" mode (`mode-${collection.id}`)

### "Cannot set variable to itself" Error  
- **Cause**: Final variable aliasing to itself in token collection
- **Solution**: Map dimension ID to intermediary variable ID instead of final token variable ID

### "Invalid value" Error
- **Cause**: Token reference using raw token ID instead of mapped Figma ID
- **Solution**: Always use `idManager.getFigmaId(referencedTokenId)`

### Missing Mode Values
- **Cause**: Token collection mode not found in dimension
- **Solution**: Ensure token collection has "Value" mode created

## Future Considerations

### Potential Improvements
1. **Mode Value Optimization**: Reduce redundant mode values
2. **Collection Consolidation**: Merge similar collections
3. **Reference Optimization**: Minimize intermediary variables
4. **Error Recovery**: Better fallback strategies for missing data

### Extension Points
1. **Custom Value Types**: Support for new resolved value types
2. **Advanced Aliasing**: Support for computed values
3. **Collection Strategies**: Alternative collection assignment logic
4. **Mode Strategies**: Alternative mode handling approaches

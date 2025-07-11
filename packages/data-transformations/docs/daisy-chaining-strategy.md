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

## ID Generation Strategy

### Persistent vs Generated IDs

The system uses two types of ID generation strategies to ensure proper `tempToRealId` mapping persistence:

#### 1. **Persistent IDs** (Canonical Data)
These IDs come directly from the schema and are always the same:
- **Tokens**: `token-blue-500`, `token-spacing-16`
- **Collections**: `collection-color`, `collection-typography`
- **Dimensions**: `dimension-color-scheme`, `dimension-contrast`
- **Canonical Modes**: `mode-light`, `mode-dark`, `mode-regular`

#### 2. **Deterministic Generated IDs** (Transformation-Time)
These IDs are generated during transformation but follow predictable patterns:
- **Intermediary Variables**: `intermediary-${token.id}-${dimension.id}-${mode.id}`
- **Reference Variables**: `reference-${token.id}-${dimension.id}`
- **Token Collection Modes**: `mode-tokenCollection-${collection.id}`

#### 3. **Why Deterministic IDs Matter**
- **Consistency**: Same input data always produces the same IDs
- **Mapping Persistence**: `tempToRealId` mappings remain valid across transformations
- **Update Efficiency**: Existing variables can be updated instead of recreated
- **Collision Prevention**: Predictable patterns prevent naming conflicts

### ID Generation Rules

#### For Token Collection Modes
```typescript
// OLD (Non-persistent): mode-${collection.id}
// NEW (Deterministic): mode-tokenCollection-${collection.id}

// Examples:
// collection.id = "color" → modeId = "mode-tokenCollection-color"
// collection.id = "typography" → modeId = "mode-tokenCollection-typography"
```

#### For Intermediary Variables
```typescript
// Pattern: intermediary-${token.id}-${dimension.id}-${mode.id}
// Examples:
// token.id = "token-blue-500", dimension.id = "dimension-color-scheme", mode.id = "mode-light"
// → intermediary-token-blue-500-dimension-color-scheme-mode-light
```

#### For Reference Variables
```typescript
// Pattern: reference-${token.id}-${dimension.id}
// Examples:
// token.id = "token-blue-500", dimension.id = "dimension-contrast"
// → reference-token-blue-500-dimension-contrast
```

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
1. **First Dimension**: Create intermediaries with actual values for each mode in the next dimension
2. **Subsequent Dimensions**: Create reference variables that alias to previous intermediaries
3. **Final Stage**: Create final token variable that references the last reference variable

**Key Decision**: For multi-dimensional tokens, reference variables are only created for dimensions after the first one

### 4. Intermediary Variable Creation

**Method**: `createIntermediaryVariablesForDimension()`

**For Multi-Dimensional Tokens**:
- Create one variable per mode in the next dimension
- Variable ID: `intermediary-${token.id}-${dimension.id}-${nextMode.id}`
- Variable Name: `${tokenName} (${dimension.displayName} - ${nextMode.name})`
- Map by next dimension's mode ID: `modeToVariableMap[nextMode.id] = variableId`
- **Mode Values**: Create mode values for each mode in the current dimension
- **Token References**: Handle token references by aliasing to appropriate variables based on referenced token dimensionality

**For Single-Dimensional Tokens**:
- Create one variable for the entire collection
- Variable ID: `intermediary-${token.id}-${dimension.id}`
- Variable Name: `${tokenName} (${dimension.displayName})`
- Map by dimension ID: `modeToVariableMap[dimension.id] = variableId`
- **Mode Values**: Create mode values for each mode in the dimension
- **Token References**: Handle token references by aliasing to final token variables or intermediaries

### 5. Token Reference Handling

**Detection**: `valueByMode.value && typeof valueByMode.value === 'object' && 'tokenId' in valueByMode.value`

**Process**:
1. Extract `referencedTokenId` from `valueByMode.value.tokenId`
2. Find the referenced token in `tokenSystem.tokens`
3. Determine if referenced token is single or multi-dimensional using `getUsedDimensionsForToken()`
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

**Fallback Handling**:
- If referenced token not found: Use placeholder value from `getAliasPlaceholderValue()`
- If referenced token has no value for current mode: Use placeholder value

### 6. Reference Variable Creation

**Method**: `createReferenceVariablesForDimension()`

**When**: Only for multi-dimensional tokens (not single-dimensional)

**Process**:
1. Create one reference variable per dimension (except the first dimension)
2. Variable ID: `reference-${token.id}-${dimension.id}`
3. Variable Name: `${tokenName} (${dimension.displayName})`
4. For each mode in the dimension:
   - Look up target variable by `mode.id` or `dimension.id` from `modeToVariableMap`
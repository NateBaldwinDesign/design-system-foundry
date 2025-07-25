# Theme Override figmaFileKey Integration

## Overview

This document outlines the integration of `figmaFileKey` support for theme override files, enabling unique Figma file identification for theme-specific token overrides.

## Changes Made

### 1. Schema Updates

#### Theme Override Schema (`theme-overrides-schema.json`)
- Added `figmaFileKey` field as a required string property
- Enforced pattern validation: `^[a-zA-Z0-9-_]+$` (alphanumeric, hyphens, underscores only)
- Updated description to clarify uniqueness requirements

#### TypeScript Schema (`schema.ts`)
- Added `ThemeOverrideFile` Zod schema for standalone theme override files
- Includes validation for:
  - `systemId` (required)
  - `themeId` (required)
  - `figmaFileKey` (required, pattern validated)
  - `tokenOverrides` (array of token overrides)
- Added `validateThemeOverrideFile` function
- Exported `ThemeOverrideFile` type

#### Index Exports (`index.ts`)
- Exported `ThemeOverrideFile` type
- Exported `validateThemeOverrideFile` function

### 2. Validation Service Updates

#### Schema Validation Service (`validation/schema-validation.ts`)
- Added `validateThemeOverrideFile()` method for individual file validation
- Added `validateFigmaFileKeyUniquenessAcrossAll()` method for cross-file uniqueness validation
- Updated `validateSystem()` method to include theme override file validation
- Comprehensive validation includes:
  - Required field validation
  - figmaFileKey format validation
  - Token override structure validation
  - Uniqueness validation across platform extensions and theme overrides

### 3. Data Merger Updates

#### Data Merger (`merging/data-merger.ts`)
- Added `getFigmaFileKeyForThemeOverride()` function
- Provides consistent access to theme override file keys
- Maintains separation between platform extension and theme override file keys

### 4. Example Data Updates

#### Theme Override Files
- Updated `brand-a-overrides.json` with `figmaFileKey: "brand-a-theme-figma-file"`
- Updated `brand-b-overrides.json` with `figmaFileKey: "brand-b-theme-figma-file"`
- Ensured all existing theme override files have unique figmaFileKeys

### 5. Testing Infrastructure

#### New Test Scripts
- `test-theme-override-validation.mjs`: Basic theme override file validation
- `test-comprehensive-validation.mjs`: Cross-file validation including uniqueness
- `test-validation-errors.mjs`: Error case validation testing

#### Updated Test Suite
- Modified `package.json` test script to include theme override validation
- All tests pass successfully

## Validation Rules

### Individual Theme Override File Validation
1. **Required Fields**: `systemId`, `themeId`, `figmaFileKey`, `tokenOverrides`
2. **figmaFileKey Format**: Must match pattern `^[a-zA-Z0-9-_]+$`
3. **Token Overrides**: Must be valid array structure
4. **Values by Mode**: Must have at least one entry per token override

### Cross-File Uniqueness Validation
1. **Platform Extensions**: Each must have unique `figmaFileKey`
2. **Theme Override Files**: Each must have unique `figmaFileKey`
3. **Cross-Entity Uniqueness**: No `figmaFileKey` can be shared between platform extensions and theme override files

## Usage Examples

### Creating a Theme Override File
```json
{
  "systemId": "core-design-system",
  "themeId": "theme-brand-a",
  "figmaFileKey": "brand-a-theme-figma-file",
  "tokenOverrides": [
    {
      "tokenId": "token-accent-color",
      "valuesByMode": [
        {
          "modeIds": [],
          "value": {
            "type": "COLOR",
            "value": "#FF6F61"
          }
        }
      ]
    }
  ]
}
```

### Validation in Code
```typescript
import { validateThemeOverrideFile } from '@token-model/data-model';

// Validate individual file
const validatedData = validateThemeOverrideFile(themeOverrideData);

// Validate uniqueness across all files
import { SchemaValidationService } from '@token-model/data-model';
const uniquenessResult = SchemaValidationService.validateFigmaFileKeyUniquenessAcrossAll(
  platformExtensions,
  themeOverrideFiles
);
```

### Getting Figma File Key
```typescript
import { getFigmaFileKeyForThemeOverride } from '@token-model/data-model';

const fileKey = getFigmaFileKeyForThemeOverride(themeOverrideFile);
```

## Error Handling

### Common Validation Errors
1. **Missing figmaFileKey**: "Required" error for missing field
2. **Invalid Format**: "Invalid" error for non-alphanumeric characters
3. **Duplicate Keys**: Descriptive error message with conflicting file names
4. **Missing Required Fields**: List of all missing required fields

### Error Response Format
```typescript
{
  isValid: boolean,
  errors: string[],
  warnings: string[]
}
```

## Testing Results

### Validation Tests
- ✅ Individual theme override file validation
- ✅ Cross-file uniqueness validation
- ✅ Error case handling
- ✅ Format validation
- ✅ Required field validation

### Integration Tests
- ✅ Schema compilation
- ✅ TypeScript type generation
- ✅ Export functionality
- ✅ Data merger integration

## Migration Notes

### For Existing Theme Override Files
1. Add `figmaFileKey` field to all theme override files
2. Ensure uniqueness across all files
3. Validate format compliance
4. Update any code that processes theme override files

### Backward Compatibility
- New `figmaFileKey` field is required
- Existing files without this field will fail validation
- No automatic migration provided - manual updates required

## Future Considerations

### Potential Enhancements
1. **Automatic Key Generation**: Generate unique keys based on theme/system names
2. **Key Validation Service**: Centralized service for key management
3. **Migration Tools**: Automated migration for existing files
4. **Key Registry**: Central registry of all figmaFileKeys across the system

### Monitoring
- Track key usage and conflicts
- Monitor validation error patterns
- Consider key naming conventions and standards

## Conclusion

The `figmaFileKey` integration for theme override files provides:
- **Unique Identification**: Each theme override file has a unique Figma file key
- **Cross-Entity Validation**: Ensures no conflicts between platform extensions and theme overrides
- **Comprehensive Validation**: Robust validation at both individual and system levels
- **Type Safety**: Full TypeScript support with proper type definitions
- **Testing Coverage**: Comprehensive test suite for all validation scenarios

This integration maintains the separation between Figma publishing (theme overrides) and runtime platform extensions while ensuring proper uniqueness and validation across the entire system. 
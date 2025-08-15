# Figma Color Profile Support Implementation Plan

## Overview

This document outlines the implementation plan for adding `fileColorProfile` support to the token-model system to fix Figma color conversion issues. The feature will support both sRGB and Display-P3 color profiles with proper inheritance logic.

## Problem Statement

The current Figma export is failing with 400 Bad Request errors due to invalid color values being sent to the Figma API. The error indicates that RGB values are outside the valid 0-1 range. This implementation will ensure proper color space conversion before sending data to Figma.

## Implementation Plan

### 1. Schema Updates

#### 1.1 Update Core Schema (`packages/data-model/src/schema.json`)
- **Add `fileColorProfile` property to `figmaConfiguration` object**
- **Location**: Line ~25, within the `figmaConfiguration` properties
- **Type**: String enum with values `["srgb", "display-p3"]`
- **Default**: `"srgb"`
- **Description**: "Color profile to use when converting colors for Figma export"

#### 1.2 Update Platform Extension Schema (`packages/data-model/src/platform-extension-schema.json`)
- **Add `fileColorProfile` property to root level**
- **Type**: String enum with values `["srgb", "display-p3"]`
- **Default**: `"srgb"`
- **Description**: "Color profile to use when converting colors for Figma export. If not specified, inherits from core system."

#### 1.3 Update Theme Overrides Schema (`packages/data-model/src/theme-overrides-schema.json`)
- **Add `fileColorProfile` property to root level**
- **Type**: String enum with values `["srgb", "display-p3"]`
- **Default**: `"srgb"`
- **Description**: "Color profile to use when converting colors for Figma export. If not specified, inherits from core system or platform extension."

### 2. Data Pipeline Updates

#### 2.1 Update DataMergerService (`packages/design-data-system-manager/src/services/dataMergerService.ts`)
- **Enhance `mergePlatformData()` method**
- **Add logic to preserve `fileColorProfile` from core data**
- **Ensure platform extensions can override core `fileColorProfile`**
- **Add debugging for `fileColorProfile` inheritance**

#### 2.2 Update DataMergerService Theme Merging (`packages/design-data-system-manager/src/services/dataMergerService.ts`)
- **Enhance `mergeThemeData()` method**
- **Add logic to preserve `fileColorProfile` from core/platform data**
- **Ensure themes inherit from core or platform, not override**
- **Add debugging for `fileColorProfile` inheritance chain**

#### 2.3 Update FigmaPreprocessor (`packages/design-data-system-manager/src/services/figmaPreprocessor.ts`)
- **Enhance `preprocessForFigma()` method**
- **Preserve `fileColorProfile` property through preprocessing**
- **Add validation to ensure `fileColorProfile` is not lost**

### 3. Figma Value Converter Updates

#### 3.1 Update FigmaValueConverter (`packages/data-transformations/src/services/figma-value-converter.ts`)
- **Add `fileColorProfile` parameter to `convertToFigmaColor()` method**
- **Enhance `convertStringToFigmaColor()` method**:
  - For `"srgb"`: Convert to sRGB, then map to r,g,b (0-1 range)
  - For `"display-p3"`: Convert to Display-P3, then map to r,g,b (0-1 range)
- **Enhance `convertObjectToFigmaColor()` method** with same logic
- **Add fallback to sRGB when `fileColorProfile` is not specified**

### 4. Transformer Updates

#### 4.1 Update FigmaTransformer (`packages/data-transformations/src/transformers/figma.ts`)
- **Enhance `transformTokensWithDaisyChaining()` method**
- **Pass `fileColorProfile` from token system to value converter**
- **Add debugging for file color profile usage**

#### 4.2 Update FigmaDaisyChainService (`packages/data-transformations/src/services/figma-daisy-chain.ts`)
- **Enhance `transformTokenWithDaisyChaining()` method**
- **Pass `fileColorProfile` to value converter calls**
- **Add debugging for file color profile inheritance**

### 5. UI Component Updates

#### 5.1 Update FigmaConfigurationsView (`packages/design-data-system-manager/src/views/FigmaConfigurationsView.tsx`)
- **Add `fileColorProfile` state variable**
- **Add File Color Profile dropdown to Publishing tab**
- **Location**: After Figma File Key input, before Syntax Patterns section
- **Options**: `"srgb"` and `"display-p3"`
- **Default**: `"srgb"`
- **Add `handleFileColorProfileChange()` method**
- **Update `initializeSettings()` to load `fileColorProfile` from source data**
- **Update `handleFileKeyChange()` and `handleSyntaxPatternsChange()` to include `fileColorProfile` in staged changes**
- **Add inheritance logic: Core → Platform → Theme**
- **Show current inherited value with indicator when not directly set**

### 6. Validation Script Updates

#### 6.1 Update Schema Validation (`packages/data-model/scripts/validate-data.cjs`)
- **Add validation for `fileColorProfile` property**
- **Ensure valid enum values (`"srgb"`, `"display-p3"`)**
- **Validate inheritance from core to platform extensions**

#### 6.2 Update Platform Extension Validation (`packages/data-model/scripts/validate-property-type-mappings.cjs`)
- **Add validation for `fileColorProfile` in platform extensions**
- **Ensure proper inheritance logic**

#### 6.3 Update Theme Override Validation (`packages/data-model/scripts/validate-theme-override-validation.mjs`)
- **Add validation for `fileColorProfile` in theme overrides**
- **Ensure proper inheritance from core/platform**

### 7. Type Definition Updates

#### 7.1 Update TypeScript Types (`packages/data-model/src/index.ts`)
- **Add `fileColorProfile` to TokenSystem interface**
- **Add `fileColorProfile` to PlatformExtension interface**
- **Add `fileColorProfile` to ThemeOverride interface**

### 8. Testing Updates

#### 8.1 Update Figma Transformer Tests (`packages/data-transformations/tests/transformers/figma.test.ts`)
- **Add test cases for both sRGB and Display-P3 color profiles**
- **Test inheritance from core to platform to theme**
- **Test fallback to sRGB**

#### 8.2 Update Value Converter Tests (`packages/data-transformations/tests/services/figma-value-converter.test.ts`)
- **Add test cases for both color profiles**
- **Test color conversion accuracy for each profile**
- **Test fallback behavior**

### 9. Example Data Updates

#### 9.1 Update Example Data (`packages/data-model/examples/unthemed/example-minimal-data.json`)
- **Add `fileColorProfile: "srgb"` to `figmaConfiguration`**
- **Ensure existing colors work with new system**

#### 9.2 Update Platform Extension Examples (`packages/data-model/examples/platform-extensions/`)
- **Add `fileColorProfile` property to example platform extensions**
- **Show inheritance and override scenarios**

#### 9.3 Update Theme Override Examples (`packages/data-model/examples/themed/`)
- **Add `fileColorProfile` property to example theme overrides**
- **Show inheritance from core/platform**

### 10. Documentation Updates

#### 10.1 Update Technical Decisions (`packages/data-model/docs/technical-decisions.md`)
- **Document file color profile decision**
- **Explain inheritance logic: Core → Platform → Theme**
- **Document fallback behavior**

## Implementation Priority

1. **Schema updates** (Core + Platform Extension + Theme Overrides)
2. **Type definition updates**
3. **UI Component updates** (FigmaConfigurationsView)
4. **FigmaValueConverter updates** (Core fix)
5. **Data pipeline updates** (DataMergerService + FigmaPreprocessor)
6. **Transformer updates** (FigmaTransformer + FigmaDaisyChainService)
7. **Validation script updates**
8. **Test updates**
9. **Example data updates**
10. **Documentation updates**

## Inheritance Logic

- **Core System**: Defines default `fileColorProfile`
- **Platform Extensions**: Can override core `fileColorProfile`
- **Theme Overrides**: Inherit from core or platform, cannot override
- **Fallback**: Default to `"srgb"` when not specified

## Backward Compatibility

- **Default to `"srgb"` when `fileColorProfile` is not specified**
- **Preserve existing color conversion behavior for sRGB**
- **Maintain existing API contracts**
- **No breaking changes to existing functionality**

## Validation Points

- **Ensure colors are properly converted to 0-1 range for Figma**
- **Verify inheritance chain: Core → Platform → Theme**
- **Test fallback behavior when `fileColorProfile` is missing**
- **Validate that existing functionality is preserved**
- **Test both sRGB and Display-P3 color conversions**
- **Test UI inheritance display and change handling**

## Technical Details

### Color Conversion Logic

- **sRGB**: Convert color to sRGB color space, then map RGB values to 0-1 range
- **Display-P3**: Convert color to Display-P3 color space, then map RGB values to 0-1 range
- **Fallback**: Use sRGB conversion when `fileColorProfile` is not specified

### Data Flow

1. **Core Data**: Contains default `fileColorProfile` in `figmaConfiguration`
2. **Platform Extensions**: Can override core `fileColorProfile` at root level
3. **Theme Overrides**: Inherit `fileColorProfile` from core or platform
4. **Data Merging**: Preserves `fileColorProfile` through merging process
5. **Preprocessing**: Ensures `fileColorProfile` is not lost during preprocessing
6. **Transformation**: Passes `fileColorProfile` to value converter
7. **Color Conversion**: Uses appropriate color space for conversion
8. **Figma Export**: Sends properly converted colors to Figma API

### UI Behavior

- **Core Data**: Shows current `fileColorProfile` value, allows editing
- **Platform Extensions**: Shows inherited value with override option
- **Theme Overrides**: Shows inherited value, read-only
- **Inheritance Indicator**: Shows when value is inherited vs directly set
- **Change Handling**: Stages changes appropriately for each source type

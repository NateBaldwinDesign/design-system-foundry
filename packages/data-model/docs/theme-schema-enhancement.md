# Theme Schema Enhancement

## Overview

This document outlines the enhancement of the theme schema to support external theme override files and lifecycle management, similar to the platform extension system.

## New Properties Added

### 1. `overrideSource` Object
- **Type**: Optional object
- **Description**: Reference to external theme override file containing theme-specific configuration and overrides
- **Properties**:
  - `repositoryUri`: GitHub repository URI (e.g., 'owner/repo')
  - `filePath`: Path to the theme override file within the repository
- **Required**: Both properties are required when `overrideSource` is present

### 2. `status` Property
- **Type**: String enum with values `"active"` or `"deprecated"`
- **Description**: Lifecycle status of this theme
- **Default**: `"active"`

### 3. `overrideFileUri` Property (Legacy)
- **Type**: Optional string
- **Description**: URI pointing to the theme override file for this theme (legacy property, prefer `overrideSource`)
- **Status**: Maintained for backward compatibility

## Schema Changes

### Updated Theme Schema (schema.ts)
```typescript
export const Theme = z.object({
  id: z.string().regex(/^[a-zA-Z0-9-_]+$/),
  displayName: z.string(),
  description: z.string().optional(),
  isDefault: z.boolean(),
  overrideSource: z.object({
    repositoryUri: z.string(),
    filePath: z.string()
  }).optional(),
  status: z.enum(['active', 'deprecated']).optional(),
  overrideFileUri: z.string().optional()
});
```

### Updated JSON Schema (schema.json)
The `themes` array items now include:
- `overrideSource` object with `repositoryUri` and `filePath` properties
- `status` enum with `"active"` and `"deprecated"` values
- Updated `overrideFileUri` description to indicate legacy status

## Implementation Details

### 1. Validation Scripts
- **New Script**: `test-theme-validation.mjs` - Comprehensive theme validation
- **Enhanced**: Existing validation scripts now support new properties
- **Validation**: Ensures proper structure of `overrideSource` and `status` values

### 2. UI Components
- **ThemesTab.tsx**: Enhanced with new form fields for `overrideSource` and `status`
- **Visual Indicators**: Tags for external sources, deprecated status, and default themes
- **Form Validation**: Ensures both `repositoryUri` and `filePath` are provided when `overrideSource` is used

### 3. Storage Management
- **StorageService**: Automatically handles new properties through existing `getThemes()` and `setThemes()` methods
- **DataManager**: Enhanced with theme override pre-loading functionality
- **ThemeOverrideDataService**: New service for loading external theme override files

### 4. Data Loading
- **Pre-loading**: Themes with `overrideSource` are automatically pre-loaded on app initialization
- **Caching**: Theme override data is cached for performance
- **Fallback**: localStorage fallback for offline access

## Example Usage

### Theme Definition
```json
{
  "id": "theme-brand-a",
  "displayName": "Brand A",
  "description": "Brand A theme with custom color palette",
  "isDefault": false,
  "status": "active",
  "overrideSource": {
    "repositoryUri": "design-system/brand-a-theme",
    "filePath": "theme-brand-a.json"
  },
  "overrideFileUri": "themed/brand-a-overrides.json"
}
```

### External Theme Override File
```json
{
  "systemId": "core-design-system",
  "themeId": "theme-brand-a",
  "figmaFileKey": "brand-a-theme-figma-file",
  "tokenOverrides": [
    {
      "tokenId": "color-primary",
      "valuesByMode": [
        {
          "modeIds": ["mode-light"],
          "value": { "value": "#FF6B35" }
        }
      ]
    }
  ]
}
```

## Benefits

1. **External Management**: Themes can now be managed in separate repositories
2. **Lifecycle Control**: Themes can be marked as deprecated when no longer needed
3. **Consistent Architecture**: Aligns with platform extension system design
4. **Backward Compatibility**: Existing `overrideFileUri` property is preserved
5. **Enhanced UI**: Better visual indicators and form controls for theme management

## Migration Strategy

1. **Existing Themes**: Continue to work with `overrideFileUri` property
2. **New Themes**: Use `overrideSource` for external file references
3. **Gradual Migration**: Themes can be updated to use new properties over time
4. **Validation**: New validation scripts ensure data integrity

## Future Considerations

1. **Multi-Repository Support**: Enhanced support for complex repository structures
2. **Version Management**: Theme versioning and migration strategies
3. **Collaboration**: Multi-user theme development workflows
4. **Analytics**: Theme usage and impact analysis 
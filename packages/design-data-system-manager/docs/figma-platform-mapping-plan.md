# Figma Platform Mapping Enhancement Plan

## Overview

This plan implements a flexible mapping system between user-created platforms and Figma's specific API platforms (WEB, iOS, ANDROID) for design token export. The system allows users to configure which platforms map to which Figma platforms while maintaining data integrity and providing excellent user experience.

## Current State Analysis

### Existing Implementation Issues:
1. **Hard-coded Platform Mapping**: The current `buildCodeSyntax` method in `FigmaTransformer` uses hard-coded `displayName` matching:
   ```typescript
   switch (platform.displayName?.toLowerCase()) {
     case 'css':
     case 'web':
       codeSyntax.WEB = cs.formattedName;
       break;
     case 'ios':
       codeSyntax.iOS = cs.formattedName;
       break;
     case 'android':
       codeSyntax.ANDROID = cs.formattedName;
       break;
   }
   ```

2. **Limited Flexibility**: Only supports 3 specific platform names, no user customization
3. **No UI for Mapping**: No way for users to configure which platforms map to which Figma platforms
4. **Schema Gap**: No schema support for Figma platform mapping configuration

### Figma API Requirements:
- Figma Variables API supports exactly 3 platforms: `"WEB"`, `"iOS"`, `"ANDROID"`
- Each platform can only be mapped to one user platform
- Code syntax patterns are stored in platform extension repositories per `data-source-management-plan.md`

## Proposed Solution Architecture

### 1. Schema Enhancement

**Add to `schema.json` - Platform Object:**
```json
{
  "platforms": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        // ... existing properties ...
        "figmaPlatformMapping": {
          "type": "string",
          "enum": ["WEB", "iOS", "ANDROID"],
          "description": "Maps this platform to a specific Figma platform for variable export. Only one platform can be mapped to each Figma platform.",
          "nullable": true
        }
      }
    },
    "allOf": [
      {
        "if": {
          "type": "array",
          "minItems": 1
        },
        "then": {
          "custom": {
            "function": "validateUniqueFigmaPlatformMappings",
            "description": "Each Figma platform (WEB, iOS, ANDROID) can only be mapped to one user platform"
          }
        }
      }
    ]
  }
}
```

**Add to `platform-extension-schema.json`:**
```json
{
  "properties": {
    // ... existing properties ...
    "figmaPlatformMapping": {
      "type": "string",
      "enum": ["WEB", "iOS", "ANDROID"],
      "description": "Maps this platform extension to a specific Figma platform for variable export",
      "nullable": true
    }
  }
}
```

### 2. Enhanced Figma Export Logic

**Update `FigmaTransformer.buildCodeSyntax()`:**
```typescript
private buildCodeSyntax(token: Token, tokenSystem: TokenSystem): any {
  const codeSyntax: any = {};
  
  // Map platform code syntax to Figma's expected format using figmaPlatformMapping
  for (const cs of token.codeSyntax || []) {
    const platform = tokenSystem.platforms?.find((p: any) => p.id === cs.platformId);
    if (platform?.figmaPlatformMapping) {
      // Use the explicit mapping from the platform
      codeSyntax[platform.figmaPlatformMapping] = cs.formattedName;
    }
  }
  
  return codeSyntax;
}
```

### 3. Web Application UI Enhancement

**Add to Platform Management UI:**

1. **Platform Edit Dialog Enhancement:**
   ```typescript
   interface PlatformEditData {
     // ... existing properties ...
     figmaPlatformMapping: 'WEB' | 'iOS' | 'ANDROID' | null;
   }
   ```

2. **Figma Platform Mapping Section:**
   ```tsx
   const renderFigmaPlatformMapping = () => (
     <FormControl>
       <FormLabel>Figma Platform Mapping</FormLabel>
       <Select
         value={formData.figmaPlatformMapping || ''}
         onChange={(e) => setFormData({
           ...formData,
           figmaPlatformMapping: e.target.value || null
         })}
         placeholder="No Figma mapping"
       >
         <option value="WEB">Web (CSS/JavaScript)</option>
         <option value="iOS">iOS (Swift/SwiftUI)</option>
         <option value="ANDROID">Android (Kotlin/XML)</option>
       </Select>
       <FormHelperText>
         Maps this platform to a specific Figma platform for variable export. 
         Only one platform can be mapped to each Figma platform.
       </FormHelperText>
     </FormControl>
   );
   ```

3. **Platform List View Enhancement:**
   ```tsx
   const renderFigmaMappingColumn = () => (
     <Th>Figma Platform</Th>
   );
   
   const renderFigmaMappingCell = (platform: Platform) => (
     <Td>
       {platform.figmaPlatformMapping ? (
         <Badge colorScheme="blue" variant="subtle">
           {platform.figmaPlatformMapping}
         </Badge>
       ) : (
         <Text color="gray.400" fontSize="sm">Not mapped</Text>
       )}
     </Td>
   );
   ```

### 4. Validation and Conflict Resolution

**Add Validation Service:**
```typescript
class FigmaPlatformMappingService {
  static validateMapping(
    platforms: Platform[],
    newMapping: { platformId: string; figmaPlatform: string }
  ): ValidationResult {
    const errors: string[] = [];
    
    // Check for duplicate mappings
    const existingMapping = platforms.find(p => 
      p.figmaPlatformMapping === newMapping.figmaPlatform
    );
    
    if (existingMapping && existingMapping.id !== newMapping.platformId) {
      errors.push(
        `Platform "${existingMapping.displayName}" is already mapped to Figma platform "${newMapping.figmaPlatform}". ` +
        `Only one platform can be mapped to each Figma platform.`
      );
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  static getAvailableFigmaPlatforms(platforms: Platform[], excludePlatformId?: string): string[] {
    const usedPlatforms = platforms
      .filter(p => p.figmaPlatformMapping && p.id !== excludePlatformId)
      .map(p => p.figmaPlatformMapping!);
    
    return ['WEB', 'iOS', 'ANDROID'].filter(p => !usedPlatforms.includes(p));
  }
}
```

### 5. Enhanced Figma Export Service

**Update `FigmaExportService`:**
```typescript
class FigmaExportService {
  private getMappedPlatforms(tokenSystem: TokenSystem): {
    mappedPlatforms: Array<{ platformId: string; figmaPlatform: string; syntaxPatterns: any }>;
    unmappedPlatforms: string[];
  } {
    const mappedPlatforms: Array<{ platformId: string; figmaPlatform: string; syntaxPatterns: any }> = [];
    const unmappedPlatforms: string[] = [];
    
    for (const platform of tokenSystem.platforms || []) {
      if (platform.figmaPlatformMapping) {
        // Get syntax patterns from platform extension data
        const platformExtensionData = this.getPlatformExtensionData(platform.id);
        mappedPlatforms.push({
          platformId: platform.id,
          figmaPlatform: platform.figmaPlatformMapping,
          syntaxPatterns: platformExtensionData?.syntaxPatterns || {}
        });
      } else {
        unmappedPlatforms.push(platform.displayName);
      }
    }
    
    return { mappedPlatforms, unmappedPlatforms };
  }
  
  async exportToFigma(tokenSystem: TokenSystem, options: FigmaExportOptions = {}): Promise<FigmaExportResult> {
    const { mappedPlatforms, unmappedPlatforms } = this.getMappedPlatforms(tokenSystem);
    
    // Log mapping information
    console.log('[FigmaExportService] Platform mappings:', mappedPlatforms);
    if (unmappedPlatforms.length > 0) {
      console.warn('[FigmaExportService] Unmapped platforms (will be excluded):', unmappedPlatforms);
    }
    
    // Continue with existing export logic using mapped platforms
    // ...
  }
}
```

## Implementation Plan

### Phase 1: Schema Updates
1. **Update `schema.json`** with `figmaPlatformMapping` property
2. **Update `platform-extension-schema.json`** with mapping property
3. **Add validation functions** for unique mapping constraints
4. **Update TypeScript types** in `@token-model/data-model`

### Phase 2: Backend Logic Enhancement
1. **Update `FigmaTransformer.buildCodeSyntax()`** to use explicit mappings
2. **Create `FigmaPlatformMappingService`** for validation
3. **Enhance `FigmaExportService`** with mapping logic
4. **Add mapping validation** to existing validation pipeline

### Phase 3: Web Application UI
1. **Enhance `PlatformEditDialog`** with Figma mapping dropdown
2. **Update `PlatformsView`** to show mapping status
3. **Add validation feedback** for mapping conflicts
4. **Enhance platform creation workflow** with mapping selection

### Phase 4: Integration and Testing
1. **Update existing platform data** with mapping information
2. **Test Figma export** with various mapping configurations
3. **Validate conflict resolution** and error handling
4. **Update documentation** and user guides

## User Experience Workflow

### 1. Platform Creation/Editing:
1. User creates or edits a platform
2. **NEW**: User sees "Figma Platform Mapping" dropdown
3. **NEW**: Dropdown shows available Figma platforms (WEB, iOS, ANDROID)
4. **NEW**: If a Figma platform is already mapped, it's disabled in dropdown
5. **NEW**: User can select "No mapping" to exclude platform from Figma export
6. **NEW**: Validation prevents duplicate mappings with clear error messages

### 2. Platform Management:
1. **NEW**: Platform list shows Figma mapping status with badges
2. **NEW**: Users can quickly see which platforms are mapped to Figma
3. **NEW**: Unmapped platforms show "Not mapped" indicator
4. **NEW**: Edit dialog shows current mapping and available options

### 3. Figma Export:
1. **NEW**: Export process logs which platforms are mapped/unmapped
2. **NEW**: Only mapped platforms contribute to Figma variable names
3. **NEW**: Unmapped platforms are excluded with warning messages
4. **NEW**: Clear feedback about which platforms are being exported

## Benefits of This Approach

### 1. Flexibility:
- ✅ Users can map any platform to any Figma platform
- ✅ No hard-coded platform name requirements
- ✅ Support for custom platform names (e.g., "Nate CSS" → "WEB")

### 2. Data Integrity:
- ✅ Schema-level validation prevents duplicate mappings
- ✅ Clear error messages for mapping conflicts
- ✅ Type-safe implementation with TypeScript

### 3. User Experience:
- ✅ Intuitive UI for platform mapping
- ✅ Clear visual indicators of mapping status
- ✅ Validation feedback prevents configuration errors

### 4. Maintainability:
- ✅ Extensible design for future Figma platform additions
- ✅ Clean separation of concerns
- ✅ Leverages existing platform extension infrastructure

### 5. Compliance:
- ✅ Adheres to `data-source-management-plan.md` for syntax patterns
- ✅ Follows `project-rules.mdc` for schema-driven development
- ✅ Maintains existing functionality while adding new features

## Migration Strategy

### 1. Backward Compatibility:
- Existing platforms without mapping will be excluded from Figma export
- No breaking changes to existing data structures
- Gradual migration as users configure mappings

### 2. Default Behavior:
- New platforms default to "No mapping"
- Users must explicitly configure Figma platform mapping
- Clear guidance in UI about mapping requirements

### 3. Data Migration:
- Existing hard-coded mappings can be automatically applied during migration
- Users can review and adjust mappings as needed
- Migration script to handle existing platform data

## Success Criteria

1. ✅ Users can map any platform to any Figma platform (WEB, iOS, ANDROID)
2. ✅ Only one platform can be mapped to each Figma platform
3. ✅ Clear UI for configuring platform mappings
4. ✅ Validation prevents mapping conflicts
5. ✅ Figma export only includes mapped platforms
6. ✅ Clear feedback about which platforms are exported/excluded
7. ✅ Backward compatibility with existing platform data
8. ✅ Schema-level validation for mapping constraints
9. ✅ Type-safe implementation throughout
10. ✅ Comprehensive error handling and user feedback

## Technical Notes

- All changes preserve existing functionality
- Schema updates are backward compatible
- UI enhancements build on existing components
- Validation integrates with existing validation pipeline
- Export logic maintains existing performance characteristics
- Documentation updates reflect new capabilities 
# Platform Data Modularization Plan

## Executive Summary

This plan outlines a phased approach to modularize platform data handling, transforming the current subsidiary platform model into a distributed, ownership-based architecture. The migration will be non-destructive, iterative, and maintain all existing functionality while introducing new capabilities for better governance and team collaboration.

**Key Innovation**: Figma is now properly conceptualized as a **publishing destination** rather than a "platform", with dedicated configuration separate from runtime platform extensions.

## Current State Analysis

### Existing Platform Data Structure
- **Core Schema**: Platforms defined in `platforms` array with `syntaxPatterns` and `valueFormatters`
- **Platform Overrides**: `platformOverrides` array within `valuesByMode` entries
- **GitHub Integration**: Single repository linking with OAuth authentication
- **Data Management**: Centralized through `DataManager` service

### Current Limitations
1. **Governance Issues**: All teams need core data access for platform-specific changes
2. **Data Coupling**: Platform syntax patterns embedded in core data
3. **Override Complexity**: Platform overrides nested within token values
4. **Repository Constraints**: Single repository model limits team autonomy
5. **Conceptual Confusion**: Figma treated as a "platform" when it's actually a publishing destination

## Target Architecture

### Three-Tier Data Architecture
1. **Core Data**: Foundation tokens, dimensions, collections, algorithms + Figma publishing configuration
2. **Platform Extensions**: Platform-specific overrides, new tokens, syntax patterns, value formatters, and unique Figma file keys
3. **Theme Overrides**: Theme-specific customizations across platforms

### Data Ownership Model
- **Core Team**: Owns core data repository and Figma publishing configuration
- **Platform Teams**: Own platform extension repositories with unique Figma file keys
- **Theme Teams**: Own theme override repositories with cross-platform support

### Figma Configuration Strategy
- **Core Data**: Contains `figmaConfiguration` with syntax patterns and default file key
- **Platform Extensions**: Each has unique `figmaFileKey` for platform-specific Figma files
- **No Overrides**: `figmaFileKey` is never overridden - each platform extension must have a unique key
- **Publishing Workflow**: Core tokens → default Figma file, Platform tokens → platform's Figma file

## Phase 1: Schema Foundation (Weeks 1-2)

### 1.1 Update Core Schema - Figma Configuration
**File**: `packages/data-model/src/schema.json`

```json
{
  "figmaConfiguration": {
    "syntaxPatterns": {
      "prefix": "",
      "suffix": "",
      "delimiter": "_",
      "capitalization": "camel",
      "formatString": ""
    },
    "fileKey": "default-figma-file-key"
  },
  "platforms": [
    {
      "id": "platform-web",
      "displayName": "Web",
      "description": "Web platform implementation",
      "extensionSource": {
        "repositoryUri": "web-team/design-tokens-web",
        "filePath": "platform-extension.json"
      }
    }
  ]
}
```

**Key Changes**:
- **Remove** Figma from platforms array (conceptual clarity)
- **Add** `figmaConfiguration` section for publishing settings
- **Simplify** platforms to only include runtime platforms
- **Core team** manages Figma publishing configuration

### 1.2 Update Platform Extension Schema
**File**: `packages/data-model/src/platform-extension-schema.json`

```json
{
  "systemId": "design-system-1",
  "platformId": "platform-web",
  "version": "1.0.0",
  "figmaFileKey": "web-platform-figma-file-key",  // REQUIRED and UNIQUE
  "syntaxPatterns": {
    "prefix": "",
    "suffix": "",
    "delimiter": "_",
    "capitalization": "camel",
    "formatString": ""
  },
  "valueFormatters": {
    "color": "hex",
    "dimension": "px",
    "numberPrecision": 2
  },
  "exportSettings": {
    "includeComments": true,
    "includeMetadata": false,
    "minifyOutput": false
  },
  "tokenOverrides": [...],
  "algorithmVariableOverrides": [...],
  "omittedModes": [...],
  "omittedDimensions": [...]
}
```

**Key Changes**:
- **Add** `figmaFileKey` as required field (must be unique across all extensions)
- **Move** `valueFormatters` and `exportSettings` to platform extensions
- **Keep** `syntaxPatterns` in both core (for consistency) and extensions (for customization)

### 1.3 Data Merger Validation
**File**: `packages/data-model/src/merging/data-merger.ts`

```typescript
/**
 * Validates platform extensions for uniqueness constraints
 */
function validatePlatformExtensions(extensions: PlatformExtension[]): void {
  const fileKeys = new Set<string>();
  
  for (const extension of extensions) {
    if (!extension.figmaFileKey) {
      throw new Error(`Platform extension ${extension.platformId} must have a figmaFileKey`);
    }
    
    if (fileKeys.has(extension.figmaFileKey)) {
      throw new Error(`Duplicate figmaFileKey found: ${extension.figmaFileKey}. Each platform extension must have a unique Figma file key.`);
    }
    
    fileKeys.add(extension.figmaFileKey);
  }
}

/**
 * Gets the Figma file key for a specific platform
 */
export function getFigmaFileKeyForPlatform(
  coreData: TokenSystem,
  platformExtensions: PlatformExtension[],
  platformId: string
): string {
  // Core data has default Figma file key
  if (platformId === 'platform-figma' || !platformId) {
    return coreData.figmaConfiguration?.fileKey || 'default-figma-file';
  }

  // Platform extensions have their own unique file keys
  const extension = platformExtensions.find(ext => ext.platformId === platformId);
  if (!extension?.figmaFileKey) {
    throw new Error(`Platform extension ${platformId} must have a figmaFileKey`);
  }

  return extension.figmaFileKey;
}
```

## Phase 2: Data Model & Validation Layer (Weeks 2-4)

### 2.1 Enhanced Validation
- **Figma File Key Uniqueness**: Enforce unique `figmaFileKey` across all platform extensions
- **Required Fields**: Ensure `figmaFileKey` is present in all platform extensions
- **Schema Validation**: Validate both core and extension schemas
- **Runtime Validation**: Check constraints during data merging

### 2.2 Data Merging Logic
- **Figma Configuration**: Use core `figmaConfiguration` for default publishing
- **Platform-Specific Publishing**: Use extension `figmaFileKey` for platform-specific Figma files
- **No Overrides**: `figmaFileKey` is never overridden - always use extension value
- **Merge Order**: core → platform extensions → theme overrides

### 2.3 Publishing Workflow
1. **Core Tokens**: Published to `figmaConfiguration.fileKey`
2. **Platform Tokens**: Published to `extension.figmaFileKey`
3. **Combined Publishing**: Core + platform tokens → platform's Figma file
4. **Syntax Patterns**: Always use core `figmaConfiguration.syntaxPatterns` for consistency

## Phase 3: UI/UX Refactor (Weeks 4-7)

### 3.1 Figma Settings Management
- **Dedicated Figma Tab**: Separate from platform management
- **Core Configuration**: Syntax patterns and default file key
- **Publishing Preview**: Show which tokens go to which Figma files
- **File Key Management**: Display current Figma file assignments

### 3.2 Platform Extension Management
- **Unique File Key Validation**: Real-time validation of `figmaFileKey` uniqueness
- **Platform-Specific Settings**: Value formatters and export settings per platform
- **Figma File Assignment**: Clear indication of which Figma file each platform uses
- **Publishing Workflow**: Platform-specific publishing options

### 3.3 Enhanced Analytics
- **Figma Publishing Metrics**: Track which tokens are published to which Figma files
- **Platform Coverage**: Show which platforms have dedicated Figma files
- **Publishing Conflicts**: Identify any issues with file key assignments

## Phase 4: Migration & Rollout (Weeks 7-9)

### 4.1 Schema Migration
1. **Extract Figma Config**: Move existing Figma settings to `figmaConfiguration`
2. **Remove Figma Platform**: Remove Figma from platforms array
3. **Add File Keys**: Assign unique `figmaFileKey` to existing platform extensions
4. **Validate Uniqueness**: Ensure no duplicate file keys exist

### 4.2 Data Migration Script
```typescript
function migrateFigmaConfiguration() {
  // Extract existing Figma platform config
  const figmaPlatform = coreData.platforms.find(p => p.id === 'platform-figma');
  
  // Create figmaConfiguration
  coreData.figmaConfiguration = {
    syntaxPatterns: figmaPlatform?.syntaxPatterns || {},
    fileKey: 'default-design-system-figma'
  };
  
  // Remove Figma from platforms
  coreData.platforms = coreData.platforms.filter(p => p.id !== 'platform-figma');
  
  // Assign unique file keys to existing extensions
  platformExtensions.forEach((ext, index) => {
    ext.figmaFileKey = `${ext.platformId}-figma-file-${index + 1}`;
  });
}
```

## Phase 5: Optimization & Enhancement (Weeks 10+)

### 5.1 Advanced Figma Publishing
- **Batch Publishing**: Publish multiple platforms to their respective Figma files
- **Incremental Updates**: Only publish changed tokens
- **Publishing History**: Track what was published when and to which files
- **Rollback Capability**: Revert to previous Figma file states

### 5.2 Enhanced Validation
- **File Key Naming Conventions**: Enforce consistent naming patterns
- **Figma File Validation**: Verify Figma files exist and are accessible
- **Permission Checking**: Ensure teams have access to their assigned Figma files

## Data Governance & Ownership

- **Core Data**: Only editable by core team (core repo access)
- **Figma Configuration**: Managed by core team (design system governance)
- **Platform Extensions**: Only editable by platform team (platform repo access, public or private)
- **Figma File Keys**: Each platform team owns their unique file key
- **Theme Overrides**: Only editable by theme team (theme repo access)

## GitHub Integration & Account Sync

- **Core Repository**: Contains core data and Figma configuration
- **Platform Repositories**: Each platform team manages their extension and Figma file key
- **Figma Publishing**: Separate workflow from platform extension management
- **File Key Validation**: Check uniqueness across all linked repositories

## Data Merging & Analysis

- **Figma Publishing**: Use core configuration for default, extension configuration for platform-specific
- **File Key Uniqueness**: Enforced at merge time with clear error messages
- **Publishing Analytics**: Track which tokens are published to which Figma files
- **Conflict Resolution**: Clear rules for handling file key conflicts

## Summary Table

| Layer              | Data Location         | Editable By         | Figma File Key | Can Override/Add | Can Omit (Hidden) | Owns Syntax Patterns | Export Settings | Cross-Platform Scope |
|--------------------|----------------------|---------------------|----------------|------------------|-------------------|---------------------|-----------------|---------------------|
| Core Data          | Core repo            | Core team           | Default key    | N/A              | N/A               | Figma only          | Independent     | Global              |
| Platform Extension | Platform repo (public/private) | Platform team | **UNIQUE key** | Yes (tokens, alg vars) | Yes               | All except Figma    | Platform-specific | Platform-only       |
| Theme Override     | Theme repo           | Theme team          | N/A            | Yes (tokens, platform tokens) | No                | No                  | Theme-specific | Platform-specific   |

### Figma File Key Strategy

| Component          | File Key Source      | Responsibility      |
|-------------------|---------------------|---------------------|
| Core Data         | `figmaConfiguration.fileKey` | Core team        |
| Platform Extension | `extension.figmaFileKey` | Platform team    |
| Theme Override    | N/A (uses platform key) | Theme team       |

## Implementation Notes

### Figma File Key Uniqueness
- **Required**: Every platform extension must have a `figmaFileKey`
- **Unique**: No two platform extensions can have the same `figmaFileKey`
- **Validation**: Enforced at schema level and runtime during data merging
- **Error Handling**: Clear error messages for missing or duplicate keys

### Publishing Workflow
- **Core Tokens**: Always published to default Figma file
- **Platform Tokens**: Published to platform-specific Figma files
- **Combined Publishing**: Core + platform tokens → platform's Figma file
- **Syntax Consistency**: Always use core `figmaConfiguration.syntaxPatterns`

### Migration Strategy
- **Non-Destructive**: Existing functionality preserved during migration
- **Incremental**: Teams can migrate platform by platform
- **Validation**: Comprehensive validation at each migration step
- **Rollback**: Clear rollback procedures if issues arise

## Next Steps

1. **Review and approve schema changes and migration plan**
2. **Begin Phase 1: Schema and validation groundwork**
3. **Implement Figma configuration separation**
4. **Add file key uniqueness validation**
5. **Iterate through phases, ensuring non-destructive, opt-in migration**
6. **Maintain full backward compatibility until all users have migrated**

## Risk Mitigation

### Technical Risks
- **Data Loss**: Comprehensive validation and backup strategies
- **Migration Complexity**: Phased approach with rollback capabilities
- **File Key Conflicts**: Automated uniqueness validation and conflict resolution
- **Performance Impact**: Optimized merging logic and caching strategies

### Operational Risks
- **Team Coordination**: Clear communication and training plans
- **Repository Management**: Robust GitHub integration with permission handling
- **Figma File Management**: Clear ownership and access control for Figma files
- **User Adoption**: Comprehensive documentation and migration guides

## Success Metrics

- **Zero Data Loss**: All existing functionality preserved during migration
- **Team Autonomy**: Platform teams can manage their data and Figma files independently
- **Governance Clarity**: Clear ownership and permission boundaries
- **Figma Publishing**: Seamless publishing to platform-specific Figma files
- **Performance**: No degradation in UI responsiveness or export speed
- **User Satisfaction**: Seamless migration experience with clear benefits

## Platform Extension Registration (Minimal Fields)

To register a platform extension as official and enable the UI to pull and analyze its data, the core data must include a minimal registry of platform extensions. This registry should only require the following fields:

- `platformId`: The ID of the platform this extension is for (e.g., "platform-ios").
- `repositoryUri`: The GitHub repository URI (e.g., "ios-team/design-tokens-ios").
- `filePath`: The path to the platform extension file within the repository (e.g., "platform-extension.json").

### Example Core Schema Addition

```json
{
  "platformExtensions": [
    {
      "platformId": "platform-ios",
      "repositoryUri": "ios-team/design-tokens-ios",
      "filePath": "platform-extension.json"
    },
    {
      "platformId": "platform-android",
      "repositoryUri": "android-team/design-tokens-android",
      "filePath": "platform-extension.json"
    }
  ]
}
```

This minimal approach ensures:
- **Simplicity**: Only essential information is stored in the core data.
- **Flexibility**: Platform teams can change branches, maintainers, or other metadata independently.
- **Decoupling**: The core team only needs to know where to find the extension data, not how it is managed.

### Registration Workflow
1. Platform team creates their repository and platform extension file.
2. Core team adds an entry to the `platformExtensions` array in the core data, specifying the `platformId`, `repositoryUri`, and `filePath`.
3. The UI and data pipeline use this registry to fetch, validate, and merge platform extension data for analysis and export.

### Rationale for Minimalism
- **Additional metadata** (such as status, registeredBy, registeredAt, etc.) can be managed in process or in external systems if needed, but does not need to be part of the core data model for the purposes of registration and data merging.
- **Validation and analytics** can be performed dynamically when the data is loaded, rather than being statically tracked in the registry.

---

Update all references in this plan to reflect that the platform extension registry in the core schema is minimal and only requires these three fields.

---

## Phase 4: Clean Implementation ✅

### 4.1 UI Integration ✅
- **ViewRenderer Update**: Updated to use new PlatformsView instead of legacy publishing view
- **Component Integration**: Seamless integration of repository management and analytics components
- **Navigation**: Platform management accessible through existing navigation structure

### 4.2 Platform Export Settings ✅
- **PlatformExportSettings Component**: Comprehensive settings management for platform-specific exports
- **Syntax Pattern Configuration**: Prefix, suffix, delimiter, capitalization, and format string settings
- **Value Formatter Configuration**: Color format, dimension units, number precision settings
- **Export Options**: Comments, metadata, minification toggles
- **Live Preview**: Real-time preview of token formatting based on settings

### 4.3 Enhanced Platform Management ✅
- **Tabbed Interface**: Repository Management, Analytics, and Platform Settings tabs
- **Settings Persistence**: Save/reset functionality for platform configurations
- **Validation**: Real-time validation and error handling
- **User Feedback**: Toast notifications for user actions

### 4.4 Navigation Updates ✅
- **Existing Navigation**: Platform management accessible through current navigation structure
- **Component Routing**: ViewRenderer updated to route to new platform management view
- **Seamless Integration**: Maintains existing application structure while adding new functionality

## Phase 5: Optimization & Enhancement ✅

### 5.1 Performance Optimization ✅
- **PlatformAnalyticsService**: Comprehensive analytics service with trend analysis and performance metrics
- **Caching System**: TTL-based caching for improved performance
- **Background Processing**: Asynchronous batch export processing
- **Memory Management**: Memory usage tracking and optimization

### 5.2 Advanced Analytics ✅
- **AdvancedAnalytics Component**: Enhanced analytics dashboard with historical data and trend visualization
- **Performance Metrics**: Data load time, merge time, validation time, memory usage, and cache hit rate tracking
- **Trend Analysis**: Token growth, override rates, new token rates, and platform adoption trends
- **Platform Breakdown**: Detailed platform-specific analytics and validation status

### 5.3 Export Enhancements ✅
- **EnhancedExportService**: Batch export processing with multiple format support
- **BatchExportManager Component**: Comprehensive batch export management with job monitoring
- **Multiple Formats**: JSON, CSS, SCSS, TypeScript, Swift, and Kotlin export support
- **Job Management**: Real-time job status tracking, progress monitoring, and result display

### 5.4 User Experience ✅
- **Real-time Updates**: Live job status updates and progress tracking
- **Comprehensive Feedback**: Toast notifications and error handling
- **Visual Indicators**: Progress bars, status badges, and trend arrows
- **Responsive Design**: Optimized for different screen sizes

## Implementation Complete ✅

The platform data modularization system is now fully implemented with all phases complete:

- ✅ **Phase 1**: Schema and validation groundwork
- ✅ **Phase 2**: Clean implementation with data merging
- ✅ **Phase 3**: UI/UX refactor with repository management
- ✅ **Phase 4**: Clean integration and export settings
- ✅ **Phase 5**: Optimization and enhancement

The system provides a complete solution for managing distributed platform extensions with comprehensive analytics, batch export capabilities, and optimized performance. 
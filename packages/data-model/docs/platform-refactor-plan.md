# Platform Data Modularization Plan

## Executive Summary

This plan outlines a phased approach to modularize platform data handling, transforming the current subsidiary platform model into a distributed, ownership-based architecture. The migration will be non-destructive, iterative, and maintain all existing functionality while introducing new capabilities for better governance and team collaboration.

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

## Target Architecture

### Three-Tier Data Architecture
1. **Core Data**: Foundation tokens, dimensions, collections, algorithms
2. **Platform Extensions**: Platform-specific overrides, new tokens, syntax patterns
3. **Theme Overrides**: Theme-specific customizations across platforms

### Data Ownership Model
- **Core Team**: Owns core data repository with governance controls
- **Platform Teams**: Own platform extension repositories with autonomy
- **Theme Teams**: Own theme override repositories with cross-platform support

### Syntax Patterns Ownership
- **Core Data**: Owns syntax patterns for the Figma platform only
- **Platform Extensions**: Own syntax patterns for their respective platforms (Web, iOS, Android, etc.), but NOT for Figma

## Phase 1: Schema Foundation (Weeks 1-2)

### 1.1 Create Platform Extension Schema
**File**: `packages/data-model/src/platform-extension-schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://designsystem.org/schemas/platform-extension/v1.0.0",
  "title": "Platform Extension Schema",
  "description": "Schema for platform-specific extensions and overrides",
  "type": "object",
  "required": ["systemId", "platformId", "version"],
  "properties": {
    "systemId": {
      "type": "string",
      "description": "ID of the core system this extension belongs to"
    },
    "platformId": {
      "type": "string",
      "description": "ID of the platform this extension is for"
    },
    "version": {
      "type": "string",
      "description": "Version of this platform extension"
    },
    "metadata": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "description": { "type": "string" },
        "maintainer": { "type": "string" },
        "lastUpdated": { "type": "string", "format": "date" },
        "repositoryVisibility": { "type": "string", "enum": ["public", "private"] }
      }
    },
    "syntaxPatterns": {
      "type": "object",
      "description": "Platform-specific syntax patterns (moved from core, except Figma)",
      "properties": {
        "prefix": { "type": "string" },
        "suffix": { "type": "string" },
        "delimiter": { "type": "string", "enum": ["", "_", "-", ".", "/"] },
        "capitalization": { "type": "string", "enum": ["camel", "uppercase", "lowercase", "capitalize"] },
        "formatString": { "type": "string" }
      }
    },
    "valueFormatters": {
      "type": "object",
      "description": "Platform-specific value formatting rules",
      "properties": {
        "color": { "type": "string", "enum": ["hex", "rgb", "rgba", "hsl", "hsla"] },
        "dimension": { "type": "string", "enum": ["px", "rem", "em", "pt", "dp", "sp"] },
        "numberPrecision": { "type": "integer", "minimum": 0, "maximum": 10 }
      }
    },
    "algorithmVariableOverrides": {
      "type": "array",
      "description": "Platform-specific algorithm variable overrides (variables only, not formulas)",
      "items": {
        "type": "object",
        "required": ["algorithmId", "variableId", "valuesByMode"],
        "properties": {
          "algorithmId": { "type": "string" },
          "variableId": { "type": "string" },
          "valuesByMode": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["modeIds", "value"],
              "properties": {
                "modeIds": { "type": "array", "items": { "type": "string" } },
                "value": { "oneOf": [{ "type": "string" }, { "type": "number" }, { "type": "boolean" }] }
              }
            }
          }
        }
      }
    },
    "tokenOverrides": {
      "type": "array",
      "description": "Platform-specific token overrides and additions",
      "items": {
        "type": "object",
        "required": ["id", "valuesByMode"],
        "properties": {
          "id": { "type": "string", "description": "Token ID (matches core or is new for platform)" },
          "displayName": { "type": "string" },
          "description": { "type": "string" },
          "themeable": { "type": "boolean" },
          "private": { "type": "boolean" },
          "status": { "type": "string" },
          "tokenTier": { "type": "string" },
          "resolvedValueTypeId": { "type": "string" },
          "generatedByAlgorithm": { "type": "boolean" },
          "algorithmId": { "type": "string" },
          "taxonomies": { "type": "array", "items": { "type": "object" } },
          "propertyTypes": { "type": "array", "items": { "type": "object" } },
          "codeSyntax": { "type": "array", "items": { "type": "object" } },
          "valuesByMode": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["modeIds", "value"],
              "properties": {
                "modeIds": { "type": "array", "items": { "type": "string" } },
                "value": {
                  "oneOf": [
                    { "type": "object", "required": ["value"], "properties": { "value": {} } },
                    { "type": "object", "required": ["tokenId"], "properties": { "tokenId": { "type": "string" } } }
                  ]
                },
                "metadata": { "type": "object" }
              }
            }
          },
          "omit": { "type": "boolean", "description": "If true, this token is omitted from the platform" }
        }
      }
    },
    "omittedModes": {
      "type": "array",
      "description": "List of mode IDs omitted from this platform (hidden, not deleted)",
      "items": { "type": "string" }
    },
    "omittedDimensions": {
      "type": "array",
      "description": "List of dimension IDs omitted from this platform (hidden, not deleted)",
      "items": { "type": "string" }
    }
  }
}
```

### 1.2 Update Core Schema
- Remove `syntaxPatterns` and `valueFormatters` from platform objects in core schema, **except for Figma platform**
- Add a `platforms` registry in core data, referencing only `id`, `displayName`, and `description`
- Add a `platformExtensions` registry (array of URIs or repo links) for canonical platform extension files
- Add analytics fields for tracking overrides, omissions, and additions (for dashboard)

### 1.3 Update Theme Override Schema
- Allow theme overrides to reference platform-specific tokens (by platformId and tokenId)
- Add a `supportedPlatforms` array to theme override metadata
- Ensure theme overrides can override both core and platform extension tokens, but only for the platforms they support

## Phase 2: Data Model & Validation Layer (Weeks 2-4)

### 2.1 Validation
- Implement validation logic for platform extension files (standalone and when merged with core)
- Ensure referential integrity: all overrides/additions reference valid core tokens or are clearly marked as new
- Validate that omitted tokens/modes/dimensions are handled gracefully in UI and exports (hidden, not deleted)
- Enforce that only Figma syntax patterns exist in core data, and no Figma syntax patterns exist in platform extension files

### 2.2 Data Merging Logic
- Refactor data loading pipeline to:
  - Load core data, then merge in all registered platform extensions, then merge in theme overrides
  - Merge order: **core → platform extensions → theme overrides**
  - For each token, merge/override properties as per extension/override rules
  - Omitted tokens/modes/dimensions are excluded from merged output for that platform, but not deleted from source data
  - For syntax patterns: use Figma patterns from core data, other platform patterns from their respective extension files
- Ensure all analytics (dashboard, export, etc.) are computed from the merged view

### 2.3 Clean Architecture
- Focus on clean, forward-looking implementation without backward compatibility constraints
- Design for optimal performance and maintainability

## Phase 3: UI/UX Refactor (Weeks 4-7)

### 3.1 Repository Linking & Management
- Refactor GitHub integration to allow linking:
  - One core data repository
  - Multiple platform extension repositories (public or private, one per platform)
  - Multiple theme override repositories
- UI for registering/unregistering platforms and themes as canonical (with validation)

### 3.2 Data Source Management
- UI for viewing, linking, and switching between data sources (core, platforms, themes)
- UI for showing which tokens/modes/dimensions are omitted or overridden per platform/theme
- UI for adding/editing platform extension data (tokens, syntax patterns, algorithm variable overrides, omissions)
- UI for theme overrides, including platform-specific overrides
- Clear indication of syntax pattern ownership: Figma patterns edited in core data, other platform patterns in their respective extension files

### 3.3 Analytics & Dashboard
- Dashboard analytics for:
  - Number of platforms, themes
  - % of tokens overridden/omitted/added per platform/theme
  - Similarity/difference metrics to core data
  - Visualization of data source relationships

### 3.4 Export Settings
- UI for setting up export settings per platform and per theme (using merged data)
- Export preview for each platform/theme combination
- Core, platform, and theme exports are all supported independently

## Phase 4: Migration & Rollout (Weeks 7-9)

### 4.1 Clean Implementation
- Direct implementation of new platform extension architecture
- Remove `syntaxPatterns` from core (except Figma) and move to platform extension files
- Update theme override files to reference new platform extension tokens
- Ensure Figma syntax patterns remain in core data

### 4.2 Forward-Looking Rollout
- Implement new features directly without legacy constraints
- Focus on optimal user experience and performance
- Clean, maintainable codebase from the start

### 4.3 Documentation & Training
- Update all documentation (schemas, technical decisions, user guides)
- Provide migration guides, FAQs, and video walkthroughs for teams

## Phase 5: Optimization & Enhancement (Weeks 10+)

### 5.1 Performance Optimization
- Optimize data merging and validation performance
- Implement caching strategies for platform extensions
- Enhance analytics and reporting capabilities

### 5.2 Enhanced Features
- Advanced platform extension features
- Improved theme override capabilities
- Enhanced export and integration options

## Data Governance & Ownership

- **Core Data**: Only editable by core team (core repo access)
- **Platform Extensions**: Only editable by platform team (platform repo access, public or private)
- **Theme Overrides**: Only editable by theme team (theme repo access)
- **UI/UX**: Clearly indicate data ownership and editing permissions in all relevant screens

## GitHub Integration & Account Sync

- Extend GitHub integration to support multiple simultaneous repository connections (core, platforms, themes)
- UI for managing linked repositories, switching accounts, and handling permissions
- Ensure all GitHub operations (load, save, PR, etc.) are scoped to the correct repository and branch
- Support for branch management, PR creation, and change tracking per data source

## Data Merging & Analysis

- Merging logic must:
  - Respect override/omission/addition rules for each platform and theme
  - Allow for analysis of what is overridden, omitted, or added at each layer
  - Provide clear, actionable analytics in the dashboard
  - Use Figma syntax patterns from core data, other platform patterns from their respective extension files

## Summary Table

| Layer              | Data Location         | Editable By         | Can Override/Add | Can Omit (Hidden) | Owns Syntax Patterns | Export Settings | Cross-Platform Scope |
|--------------------|----------------------|---------------------|------------------|-------------------|---------------------|-----------------|---------------------|
| Core Data          | Core repo            | Core team           | N/A              | N/A               | Figma only          | Independent     | Global              |
| Platform Extension | Platform repo (public/private) | Platform team | Yes (tokens, alg vars) | Yes               | All except Figma    | Platform-specific | Platform-only       |
| Theme Override     | Theme repo           | Theme team          | Yes (tokens, platform tokens) | No                | No                  | Theme-specific | Platform-specific   |

### Syntax Patterns Ownership Detail

| Platform         | Syntax Patterns Location | Editable By      |
|------------------|-------------------------|------------------|
| Figma            | Core data               | Core team        |
| Web, iOS, etc.   | Platform extension file | Platform team    |

## Implementation Notes

### Algorithm Variable Overrides
- Start with algorithm variables only (not formulas)
- Architecture should be extensible to support full algorithm override capabilities in the future
- Platform teams can override algorithm variable values but not the algorithm logic itself

### Omission Handling
- Omitted tokens/modes/dimensions are hidden from UI and exports
- Data is not deleted from source files, allowing for future "un-omission"
- Omission is a presentation/export concern, not a data deletion concern

### Export Settings
- Core data can be exported independently
- Platform and theme exports have their own unique settings
- Future consideration: shared export settings for merging data in novel ways (currently too complex)

### Cross-Platform Scope
- Platform extensions are strictly scoped to their respective platforms
- Core data houses all cross-platform tokens
- Theme overrides can reference platform-specific tokens but only for supported platforms

## Next Steps

1. **Review and approve schema changes and migration plan**
2. **Begin Phase 1: Schema and validation groundwork**
3. **Iterate through phases, ensuring non-destructive, opt-in migration**
4. **Maintain full backward compatibility until all users have migrated**

## Risk Mitigation

### Technical Risks
- **Data Loss**: Comprehensive validation and backup strategies
- **Migration Complexity**: Phased approach with rollback capabilities
- **Performance Impact**: Optimized merging logic and caching strategies

### Operational Risks
- **Team Coordination**: Clear communication and training plans
- **Repository Management**: Robust GitHub integration with permission handling
- **User Adoption**: Comprehensive documentation and migration guides

## Success Metrics

- **Zero Data Loss**: All existing functionality preserved during migration
- **Team Autonomy**: Platform teams can manage their data independently
- **Governance Clarity**: Clear ownership and permission boundaries
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
# Technical Decisions: Platform Data Modularization (Phase 1)

## Context
The platform data handling has been modularized to support distributed ownership and better governance. Platform-specific data is now separated from core data, with platforms owning their own syntax patterns, value formatters, token overrides, and algorithm variable overrides.

## Key Changes in Phase 1

### Platform Extension Schema
- **New Schema**: `platform-extension-schema.json` defines the structure for platform-specific extensions
- **Standalone Files**: Platform extensions are stored in separate files/repositories
- **Minimal Registry**: Core data includes a minimal `platformExtensions` registry with only `platformId`, `repositoryUri`, and `filePath`

### Syntax Patterns Ownership
- **Core Data**: Only owns syntax patterns for the Figma platform
- **Platform Extensions**: Own syntax patterns for all other platforms (Web, iOS, Android, etc.)
- **Schema Updates**: Core schema updated to clarify that `syntaxPatterns` and `valueFormatters` are only included for Figma platform

### TypeScript Integration
- **New Types**: `PlatformExtensionRegistry` and `PlatformExtension` types added to schema.ts
- **Validation Functions**: Added validation functions for platform extension data
- **Exports**: Updated index.ts to export new types, schemas, and validation functions

### Example Data
- **iOS Platform Extension**: Example showing iOS-specific overrides, syntax patterns, and omissions
- **Web Platform Extension**: Example showing web-specific overrides, syntax patterns, and value formatters

## Rationale
- **Governance**: Platform teams can manage their data independently
- **Scalability**: Supports any number of platforms without core schema changes
- **Clarity**: Clear ownership boundaries between core and platform-specific data
- **Backward Compatibility**: Existing functionality preserved during migration

## Implementation Notes
- Platform extensions can override algorithm variables (but not formulas)
- Platform extensions can omit modes and dimensions (hidden, not deleted)
- Platform extensions can add new tokens or override existing ones
- Core data maintains minimal registry for linking platform extensions

---

# Technical Decisions: Platform Data Modularization (Phase 2)

## Context
Phase 2 implements the data model and validation layer for platform extensions, including comprehensive validation logic, data merging capabilities, and backward compatibility support.

## Key Changes in Phase 2

### Enhanced Validation Logic
- **Platform Extension Validation**: Comprehensive validation for standalone platform extensions and when merged with core data
- **Referential Integrity**: Validates that all overrides/additions reference valid core tokens or are clearly marked as new
- **Syntax Pattern Ownership**: Enforces that only Figma syntax patterns exist in core data
- **Registry Validation**: Validates the platform extensions registry in core data

### Data Merging Logic
- **Merge Order**: Core → platform extensions → theme overrides
- **Token Merging**: Merges/overrides token properties according to extension rules
- **Omission Handling**: Excludes omitted tokens/modes/dimensions from merged output (hidden, not deleted)
- **Analytics**: Calculates comprehensive analytics for dashboard and export

### New Services
- **Platform Extension Validation**: `validation/platform-extension-validation.ts`
- **Data Merging**: `merging/data-merger.ts`

## Rationale
- **Data Integrity**: Comprehensive validation ensures data consistency across distributed sources
- **Performance**: Efficient merging logic supports real-time data combination
- **Clean Architecture**: Focused implementation without backward compatibility complexity
- **Analytics**: Built-in analytics support dashboard and export requirements

## Implementation Notes
- Validation functions return detailed error and warning messages
- Data merging supports filtering by target platform and theme
- All services are exported through the main index for easy consumption
- System designed for clean, forward-looking architecture

---

# Technical Decisions: Platform Data Modularization (Phase 3)

## Context
Phase 3 implements the UI/UX refactor for platform extension management, including repository linking, analytics dashboard, and data source management.

## Key Changes in Phase 3

### Multi-Repository Management
- **MultiRepositoryManager**: Service for managing multiple repository links (core, platform extensions, themes)
- **Repository Linking**: Support for linking/unlinking repositories with validation
- **Data Synchronization**: Automatic data loading and merging from linked repositories
- **Error Handling**: Comprehensive error handling and status tracking

### UI Components
- **RepositoryManager**: React component for managing repository links with modal-based linking
- **PlatformAnalytics**: Analytics dashboard showing token overrides, new tokens, and platform status
- **PlatformsView**: Comprehensive view integrating repository management and analytics

### Repository Management Features
- **Link/Unlink**: Add and remove repository connections
- **Status Tracking**: Real-time status updates (linked, loading, error, synced)
- **Validation**: Platform extension validation against core data
- **Refresh**: Manual refresh of repository data

### Analytics Dashboard
- **Token Analysis**: Override, addition, and omission percentages
- **Platform Status**: Validation status for each platform extension
- **Data Source Status**: Connection status for core, platforms, and themes
- **Visual Indicators**: Progress bars, badges, and status colors

## Rationale
- **User Experience**: Intuitive interface for managing distributed data sources
- **Real-time Feedback**: Immediate status updates and validation results
- **Comprehensive Analytics**: Clear insights into data relationships and changes
- **Scalable Architecture**: Support for multiple repositories and platforms

## Implementation Notes
- Components use Chakra UI for consistent design
- Mock data used for demonstration (will be replaced with real MultiRepositoryManager)
- Error handling and loading states implemented throughout
- Responsive design for different screen sizes

---

# Technical Decisions: Platform Data Modularization (Phase 4)

## Context
Phase 4 implements the clean integration of platform extension management with the existing web application, including platform-specific export settings and enhanced UI integration.

## Key Changes in Phase 4

### UI Integration
- **ViewRenderer Update**: Updated to use new PlatformsView instead of legacy publishing view
- **Component Integration**: Seamless integration of repository management and analytics components
- **Navigation**: Platform management accessible through existing navigation structure

### Platform Export Settings
- **PlatformExportSettings Component**: Comprehensive settings management for platform-specific exports
- **Syntax Pattern Configuration**: Prefix, suffix, delimiter, capitalization, and format string settings
- **Value Formatter Configuration**: Color format, dimension units, number precision settings
- **Export Options**: Comments, metadata, minification toggles
- **Live Preview**: Real-time preview of token formatting based on settings

### Enhanced Platform Management
- **Tabbed Interface**: Repository Management, Analytics, and Platform Settings tabs
- **Settings Persistence**: Save/reset functionality for platform configurations
- **Validation**: Real-time validation and error handling
- **User Feedback**: Toast notifications for user actions

## Rationale
- **Seamless Integration**: Maintains existing application structure while adding new functionality
- **Comprehensive Settings**: Provides full control over platform-specific export formatting
- **User Experience**: Intuitive interface with live preview and immediate feedback
- **Scalability**: Supports multiple platforms with individual configurations

## Implementation Notes
- Platform settings use mock data for demonstration
- Export settings component is reusable across different platforms
- Settings include syntax patterns, value formatters, and export options
- Live preview shows how tokens will be formatted in exports
- Toast notifications provide user feedback for all actions

---

# Technical Decisions: Platform Data Modularization (Phase 5)

## Context
Phase 5 implements optimization and enhancement features for the platform extension management system, including advanced analytics, performance optimization, and enhanced export capabilities.

## Key Changes in Phase 5

### Advanced Analytics
- **PlatformAnalyticsService**: Comprehensive analytics service with trend analysis and performance metrics
- **AdvancedAnalytics Component**: Enhanced analytics dashboard with historical data and trend visualization
- **Performance Metrics**: Data load time, merge time, validation time, memory usage, and cache hit rate tracking
- **Trend Analysis**: Token growth, override rates, new token rates, and platform adoption trends

### Enhanced Export System
- **EnhancedExportService**: Batch export processing with multiple format support
- **BatchExportManager Component**: Comprehensive batch export management with job monitoring
- **Multiple Formats**: JSON, CSS, SCSS, TypeScript, Swift, and Kotlin export support
- **Job Management**: Real-time job status tracking, progress monitoring, and result display

### Performance Optimization
- **Caching System**: TTL-based caching for improved performance
- **Background Processing**: Asynchronous batch export processing
- **Memory Management**: Memory usage tracking and optimization
- **Rate Limiting**: Built-in rate limiting for GitHub API calls

### User Experience Enhancements
- **Real-time Updates**: Live job status updates and progress tracking
- **Comprehensive Feedback**: Toast notifications and error handling
- **Visual Indicators**: Progress bars, status badges, and trend arrows
- **Responsive Design**: Optimized for different screen sizes

## Rationale
- **Performance**: Optimized data processing and caching for large datasets
- **Scalability**: Support for multiple platforms and formats simultaneously
- **User Experience**: Comprehensive analytics and real-time feedback
- **Maintainability**: Modular service architecture with clear separation of concerns

## Implementation Notes
- Analytics service includes mock data generation for demonstration
- Export service supports multiple formats with extensible architecture
- Batch processing includes job management and progress tracking
- Performance metrics provide insights into system optimization
- Caching system improves response times for repeated operations

---

# Technical Decisions: ID Field Naming Convention

## Context
To ensure clarity and consistency in the data model, all fields whose values must reference an ID from another part of the schema are named with the suffix `Id` (for a single value) or `Ids` (for an array of values).

## Rationale
- **Clarity:** Makes it immediately obvious to schema authors and consumers that the field is a reference, not an inline object or value.
- **Consistency:** Enforces a predictable pattern across the schema, reducing ambiguity and cognitive load.
- **Validation:** Simplifies validation and tooling, as all reference fields are easily identifiable.
- **Industry Best Practice:** Aligns with common conventions in data modeling and API design.

## Examples from the Schema
- `supportedDimensionIds`: An array of dimension IDs supported by a token collection.
- `resolvedValueTypeIds`: An array of resolved value type IDs associated with a collection, dimension, or taxonomy.
- `resolvedValueTypeId`: The value type ID for a token (singular).
- `tokenCollectionId`: The ID of the parent collection for a token.
- `defaultModeIds`: An array of mode IDs used as defaults for a collection.

## Application
- **Single reference:** Use the `Id` suffix (e.g., `tokenCollectionId`).
- **Multiple references:** Use the `Ids` suffix (e.g., `supportedDimensionIds`).

This convention is applied throughout the schema and should be followed for all future fields that reference IDs.

# Technical Decisions: Taxonomy Order as Top-Level Property

## Context
The schema previously used a nested `namingRules` object containing a `taxonomyOrder` array. This structure was inconsistent with other top-level ordering properties like `dimensionOrder`.

## Decision
Move `taxonomyOrder` from `namingRules.taxonomyOrder` to a top-level property `taxonomyOrder`, following the same pattern as `dimensionOrder`.

## Rationale
- **Consistency:** `taxonomyOrder` now follows the same pattern as `dimensionOrder`
- **Simplicity:** Removes unnecessary nesting (`namingRules.taxonomyOrder` → `taxonomyOrder`)
- **Clarity:** Makes the schema more intuitive and easier to understand
- **Maintainability:** Reduces complexity in validation and data handling
- **Schema Alignment:** Better aligns with the project's schema-driven development philosophy

## Implementation
- Removed `namingRules` object from schema
- Added `taxonomyOrder` as top-level array property
- Updated all validation logic to reference `taxonomyOrder` directly
- Updated all storage and service methods to use new structure
- Updated example data files to use new structure

## Migration Impact
- Breaking change requiring version bump
- All existing data using `namingRules.taxonomyOrder` must be migrated to `taxonomyOrder`
- Storage keys changed from `token-model:naming-rules` to `token-model:taxonomy-order`
- All service methods updated to use new structure

# Technical Decisions: Value Type Definitions and Referencing

## Context
The schema must support a set of value types that are semantically meaningful, interoperable across platforms (Figma, CSS, iOS, Android, etc.), and extensible for future needs.

## Value Type Definitions and Referencing
- The schema defines a top-level array:
  `"resolvedValueTypes": [ { "id": "color", "displayName": "Color", ... }, ... ]`
- Each value type object has:
  - `id`: A kebab-case string (e.g., `"color"`, `"dimension"`)
  - `displayName`: Human-readable name
  - `type`: (optional) UPPER_CASE string for standard types (e.g., `"COLOR"`, `"DIMENSION"`)

- **Tokens** reference a value type with `resolvedValueTypeId` (string, must match an `id` in `resolvedValueTypes`).
- **Collections, dimensions, and taxonomies** reference supported value types with `resolvedValueTypeIds` (array of string IDs, each must match an `id` in `resolvedValueTypes`).

**There is no field named `resolvedValueTypes` on any entity except for the top-level array of value type definitions.**

### Example
```json
{
  "resolvedValueTypes": [
    { "id": "color", "displayName": "Color", "type": "COLOR" },
    { "id": "dimension", "displayName": "Dimension", "type": "DIMENSION" }
  ],
  "tokenCollections": [
    {
      "id": "collection1",
      "name": "Colors",
      "resolvedValueTypeIds": ["color"]
    }
  ],
  "tokens": [
    {
      "id": "token1",
      "displayName": "Primary Color",
      "tokenCollectionId": "collection1",
      "resolvedValueTypeId": "color",
      "valuesByMode": [ ... ]
    }
  ]
}
```

# Technical Decisions: Token codeSyntax Structure

## Context
Tokens need to support platform-specific naming conventions (code syntax) for any number of platforms, including custom ones.

## Decision
Instead of using an object/map with platform names as keys (e.g., Figma, Web, iOS, Android), the schema now defines `codeSyntax` as an array of objects, each with a `platformId` and a `formattedName` string.

## Rationale
- **Scalability:** Supports any number of platforms, including custom and future platforms, without schema changes.
- **Explicit linkage:** Each code syntax entry is directly linked to a platform by its ID, not by a string name, ensuring referential integrity.
- **Extensibility:** New platforms can be added without changing the schema or breaking validation.
- **Stability:** Avoids hardcoding platform names and enables future-proofing.

## Example
```json
{
  "codeSyntax": [
    { "platformId": "platform-figma", "formattedName": "ColorPrimary" },
    { "platformId": "platform-web", "formattedName": "color-primary" },
    { "platformId": "platform-ios", "formattedName": "ColorPrimaryIOS" },
    { "platformId": "platform-android", "formattedName": "color_primary_android" }
  ]
}
```

## Application
- All code and UI should treat `codeSyntax` as an array of `{ platformId, formattedName }` objects.
- When displaying or editing code syntax, map over the platforms array and find the corresponding code syntax entry by `platformId`.

# Technical Decisions: Dimensions and Value Types

## Context
Dimensions in the token system need to be flexible and extensible while maintaining clear relationships with the value types they support. The schema has evolved to remove the rigid `type` field from dimensions and instead use `resolvedValueTypeIds` to establish these relationships.

## Decision
- Removed the `type` field from dimensions that previously restricted dimensions to specific categories (COLOR_SCHEME, CONTRAST, etc.)
- Introduced `resolvedValueTypeIds` as an array of strings that references the supported value types for a dimension
- This allows dimensions to support multiple value types and be more flexible in their usage

## Rationale
- **Flexibility:** Dimensions can now support multiple value types, making them more versatile
- **Extensibility:** New value types can be added without requiring schema changes to dimensions
- **Clarity:** The relationship between dimensions and value types is explicit through the `resolvedValueTypeIds` array
- **Validation:** The schema ensures that referenced value types exist in the system
- **Future-proofing:** Removes artificial constraints on how dimensions can be used

## Application
- When creating or editing a dimension, specify which value types it supports using `resolvedValueTypeIds`
- Use this relationship to validate token values and ensure they match the supported types
- Consider the supported value types when designing UI for dimension management
- Use this information to guide users in creating valid token values for each dimension

## Example
```json
{
  "dimensions": [
    {
      "id": "theme",
      "displayName": "Theme",
      "modes": [...],
      "resolvedValueTypeIds": ["color", "dimension", "spacing"],
      "defaultMode": "light"
    }
  ]
}
```

This approach allows the "theme" dimension to support color, dimension, and spacing values, making it more flexible than the previous type-based approach.

# Technical Decisions: System Name, ID, and Description as Top-Level Properties

## Context
To ensure every design token system is uniquely and clearly identified, the schema now requires `systemName` and `systemId` as top-level properties, and allows an optional `description` at the top level.

## Rationale
- **Clarity:** `systemName` and `systemId` are fundamental identifiers for the design system and should always be present.
- **Validation:** Making these required at the top level ensures all data sets are uniquely and consistently identified.
- **Documentation:** A top-level `description` provides a clear, human-readable summary of the system.

## Application
- `systemName` (required): Human-readable name for the design system.
- `systemId` (required): Unique identifier for the design system, using the same pattern as other IDs.
- `description` (optional): Human-readable description of the design system.

All core data and theme override files must include these fields at the top level, and validation scripts will enforce their presence.

# Technical Decisions: Resolved Value Type Referencing

## Context
Previously, the schema used both an enum (UPPER_CASE) for token value types and a camelCase ID for resolved value types, leading to confusion and poor extensibility.

## Decision
- Tokens now use a `resolvedValueTypeId` field, which must match an `id` in the top-level `resolvedValueTypes` array.
- The `resolvedValueTypes[].id` field is a string (pattern: ^[a-zA-Z0-9-_]+$), not an enum, allowing for extensibility and tool-generated IDs.
- All references to value types in tokens, collections, dimensions, and taxonomies are by ID, not by hardcoded value or casing.
- Each resolved value type can optionally specify a `type` field (UPPER_CASE) to indicate its standard type category.

## Rationale
- **Referential Integrity:** Ensures all references are valid and unique within the dataset.
- **Extensibility:** New value types can be added without changing the schema or code.
- **Clarity:** No confusion about casing or allowed values; IDs are always referenced by ID.
- **Type Safety:** The optional `type` field provides additional validation and standardization while maintaining flexibility.

## Value Type Structure
Each value type in the `resolvedValueTypes` array has:
- `id`: A kebab-case string identifier (e.g., "color", "font-family")
- `displayName`: Human-readable name for the value type
- `type`: (Optional) UPPER_CASE string for standard types (e.g., "COLOR", "DIMENSION")

## Application
- When creating or editing a token, set `resolvedValueTypeId` to the ID of the value type it uses.
- When defining collections, dimensions, or taxonomies, use the IDs from `resolvedValueTypes` in `resolvedValueTypeIds` arrays.
- Validation scripts enforce that all references are valid and that value types match their specified standard types.
- Token values must have a `resolvedValueTypeId` that matches their token's type.

## Example
```json
{
  "resolvedValueTypes": [
    { 
      "id": "color", 
      "displayName": "Color",
      "type": "COLOR"
    },
    { 
      "id": "fontFamily", 
      "displayName": "Font Family",
      "type": "FONT_FAMILY"
    }
  ],
  "tokens": [
    { 
      "id": "token-blue-500", 
      "resolvedValueTypeId": "color",
      "valuesByMode": [...]
    }
  ],
  "collections": [
    {
      "id": "collection1",
      "resolvedValueTypeIds": ["color", "fontFamily"]
    }
  ]
}
```

## Summary Table

| Entity         | Field Name                | Type                | Description                                      |
|----------------|---------------------------|---------------------|--------------------------------------------------|
| Token          | resolvedValueTypeId       | string              | References a value type by ID                    |
| Collection     | resolvedValueTypeIds      | string[]            | Array of value type IDs supported by the collection |
| Dimension      | resolvedValueTypeIds      | string[]            | Array of value type IDs supported by the dimension |
| Taxonomy       | resolvedValueTypeIds      | string[]            | Array of value type IDs supported by the taxonomy |
| Top-level      | resolvedValueTypes        | array of objects    | List of all value type definitions               |

## Validation Rules
1. All `resolvedValueTypeId` references must point to a valid `id` in the `resolvedValueTypes` array
2. When a value type has a `type` specified, it must be one of the standard types
3. Token values must have a `resolvedValueTypeId` that matches their token's type
4. Collections, dimensions, and taxonomies can only reference value types that exist in the system
5. The `id` field must follow the pattern `^[a-zA-Z0-9-_]+$` for consistency and compatibility

# Technical Decisions

## Token Value Type System

The token value type system is designed to ensure type safety and consistency across the design system. Here's how it works:

1. Each token has a `resolvedValueTypeId` that references a type definition in the `resolvedValueTypes` array.
2. The `resolvedValueTypes` array defines all possible value types, each with:
   - `id`: A kebab-case identifier (e.g., 'color', 'dimension')
   - `type`: A standard type identifier in UPPER_CASE (e.g., 'COLOR', 'DIMENSION')
   - Optional validation rules specific to that type

3. Token values in `valuesByMode` can be one of two things:
   - A custom value with a `resolvedValueTypeId` that matches the token's type
   - An alias value with `resolvedValueTypeId: 'alias'` and a `tokenId` referencing another token

4. The validation system ensures:
   - All token values reference valid `resolvedValueTypes`
   - Custom values have a `resolvedValueTypeId` that matches their token's type
   - Alias values reference existing tokens
   - Values conform to any type-specific validation rules

This system provides a consistent way to reference types throughout the schema while maintaining type safety and validation. 

All references to value types in tokens, collections, dimensions, and taxonomies are by string ID (matching the `id` field in the top-level `resolvedValueTypes` array), never by enum, hardcoded value, or casing. 

# Technical Decisions: Token Value Structure

## Context
The token value structure in `valuesByMode` previously included a redundant `resolvedValueTypeId` field in each value object. This field was unnecessary because:
1. The token already has a `resolvedValueTypeId` at its top level
2. The value's type must match the token's type
3. The only special case is the "alias" type, which is a reference to another token

## Decision
The token value structure has been simplified to:
```json
"value": {
  "oneOf": [
    {
      "type": "object",
      "required": ["value"],
      "properties": {
        "value": {}
      }
    },
    {
      "type": "object",
      "required": ["tokenId"],
      "properties": {
        "tokenId": {
          "type": "string",
          "description": "ID of the token to alias to"
        }
      }
    }
  ]
}
```

## Rationale
- **Reduced Redundancy**: Removed the redundant `resolvedValueTypeId` field
- **Prevented Errors**: Eliminated the possibility of mismatched value types
- **Simplified Validation**: The token's `resolvedValueTypeId` is now the single source of truth
- **Clarified Intent**: Made it clear that a value is either a direct value or an alias
- **Improved Type Safety**: Validation is simpler and more reliable

## Validation
The validation logic now:
1. For direct values: Validates that the value conforms to the type specified by the token's `resolvedValueTypeId`
2. For aliases: Validates that the referenced token exists and has a compatible `resolvedValueTypeId`

This change aligns better with schema-driven development principles and reduces the potential for errors while maintaining all necessary functionality.

# Technical Decisions: Property Types Constraint System

## Context
The token system needs to support a constrained set of property types that are semantically meaningful and interoperable across platforms (Figma, CSS, iOS, Android, etc.). Unlike resolved value types which are user-modifiable, property types are system-defined and should be strictly constrained.

## Decision
Property types are defined as a UPPER_CASE enum in the schema, following the same pattern as other system-defined constraints like `tokenTier` and `status`. The schema defines `propertyTypes` as an array of constrained enum values rather than free-form strings.

## Rationale
- **Consistency**: Follows existing UPPER_CASE enum pattern for system-defined constraints
- **Strictness**: Unlike `resolvedValueTypes` which are user-modifiable, property types are system-defined and should be strictly constrained
- **Extensibility**: New property types can be added to the enum without breaking existing data
- **Validation**: Clear enum constraints enable robust validation and code generation
- **Documentation**: Enum descriptions provide clear guidance for each property type
- **Default Behavior**: Implicit "ALL" support maintains backward compatibility

## Property Type Categories
Property types are organized into semantic categories:
- **Color Properties**: BACKGROUND_COLOR, TEXT_COLOR, BORDER_COLOR, SHADOW_COLOR
- **Spacing & Dimensions**: WIDTH_HEIGHT, PADDING, MARGIN, GAP_SPACING, BORDER_RADIUS
- **Typography**: FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, FONT_STYLE, LINE_HEIGHT, LETTER_SPACING, TEXT_ALIGNMENT, TEXT_TRANSFORM
- **Effects & Appearance**: OPACITY, SHADOW, BLUR, BORDER_WIDTH
- **Layout & Positioning**: POSITION, Z_INDEX, FLEX_PROPERTIES
- **Animation & Motion**: DURATION, EASING, DELAY
- **General**: ALL

## Default Behavior
- When `propertyTypes` array is empty or undefined, treat as "ALL" properties implicitly
- This provides backward compatibility and sensible defaults
- Validation logic handles this implicitly

## Implementation
- Schema defines constrained enum values with descriptions
- TypeScript types mirror the schema constraints
- UI components use constrained dropdowns instead of free text input
- Validation ensures only valid property types are accepted
- Code generation and data transformation can rely on the constrained set

## Example
```json
{
  "propertyTypes": [
    "BACKGROUND_COLOR",
    "TEXT_COLOR",
    "PADDING"
  ]
}
```

This approach ensures that property types are consistent, validated, and suitable for automated code generation and platform-specific transformations.

# Technical Decisions: Standard Property Types with Cross-Platform Mappings

## Context
The token system needs to provide comprehensive cross-platform property mappings to ensure consistency and reduce manual work for users. The cross-platform property types documentation contains essential mappings for CSS, Figma, iOS/SwiftUI, and Android that should be standardized across all implementations.

## Decision
The schema now includes a `standardPropertyTypes` array that contains all the cross-platform property mappings from the documentation as default values. This provides:

1. **Standard Property Types**: A comprehensive set of 30+ property types with complete platform mappings
2. **Custom Property Types**: A separate `propertyTypes` array for user-defined custom property types
3. **Default Availability**: Standard property types are always available and provide consistent mappings
4. **Extensibility**: Users can add custom property types while maintaining access to standards

## Rationale
- **Consistency**: All users get the same standard mappings, ensuring consistency across projects
- **Reduced Errors**: No manual entry of complex platform mappings reduces errors and inconsistencies
- **Stability**: Standards are versioned with the schema and provide a stable foundation
- **Flexibility**: Users can still add custom property types for project-specific needs
- **Documentation**: The mappings become part of the authoritative schema rather than separate documentation
- **Automation**: Tools can rely on standard mappings for code generation and transformations

## Schema Structure
```json
{
  "standardPropertyTypes": [
    {
      "id": "background-color",
      "displayName": "Background Color",
      "category": "color",
      "compatibleValueTypes": ["color"],
      "platformMappings": {
        "css": ["background", "background-color"],
        "figma": ["FRAME_FILL", "SHAPE_FILL"],
        "ios": [".background()", ".backgroundColor"],
        "android": ["background", "colorBackground"]
      },
      "inheritance": true
    }
    // ... all 30+ standard types
  ],
  "propertyTypes": [
    // User-defined custom property types (extends standards)
  ]
}
```

## Implementation Benefits
- **Immediate Availability**: Standard property types are available as soon as the schema is loaded
- **Validation**: Schema validation ensures all standard property types have complete mappings
- **UI Integration**: Property type pickers can show both standard and custom types
- **Code Generation**: Transformers can rely on standard mappings for platform-specific code
- **Migration**: Existing data can reference standard property types without changes

## Usage Patterns
1. **Token Creation**: Users can select from standard property types or create custom ones
2. **Platform Export**: Export tools use standard mappings for consistent platform-specific code
3. **Validation**: System validates that referenced property types exist (standard or custom)
4. **UI Display**: Property type pickers show standard types prominently with custom types as options

## Migration Strategy
- Existing data continues to work unchanged
- New implementations automatically get access to standard property types
- Users can gradually migrate to standard property types or continue using custom ones
- No breaking changes to existing property type references

This approach ensures that the schema serves as the single source of truth for cross-platform property mappings while maintaining flexibility for project-specific needs. 
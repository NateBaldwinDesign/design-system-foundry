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
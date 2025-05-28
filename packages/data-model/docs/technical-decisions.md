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
- `resolvedValueTypeIds`: An array of resolved value type IDs associated with a collection, taxonomy, or dimension.
- `tokenCollectionId`: The ID of the parent collection for a token.
- `defaultModeIds`: An array of mode IDs used as defaults for a collection.

## Application
- **Single reference:** Use the `Id` suffix (e.g., `tokenCollectionId`).
- **Multiple references:** Use the `Ids` suffix (e.g., `supportedDimensionIds`).

This convention is applied throughout the schema and should be followed for all future fields that reference IDs.

# Technical Decisions: Value Types

## Context
The schema must support a set of value types that are semantically meaningful, interoperable across platforms (Figma, CSS, iOS, Android, etc.), and extensible for future needs.

## Approach
- The schema enumerates a set of standard value types based on the W3C Design Tokens Community Group specification and common design system needs:
  - color
  - dimension
  - spacing
  - fontFamily
  - fontWeight
  - fontSize
  - lineHeight
  - letterSpacing
  - duration
  - cubicBezier
  - blur
  - spread
  - radius
- These types are included as recommended values for the `id` field in `resolvedValueTypes`.
- The schema allows for custom value types by permitting any string as an `id` (not strictly limited to the enum), supporting future extensibility and proprietary needs.

## Rationale
- **Interoperability:** Standard types map directly to platform-specific representations and transformations.
- **Extensibility:** Custom types can be added as needed, with clear documentation and mapping for platform exports.
- **Stability:** Aligns with industry standards while allowing for project-specific evolution.

## Application
- Use the standard types for all common design token needs.
- When introducing a custom type, document its purpose and how it should be transformed for each platform.
- Update the schema and documentation as new types are added or standardized.

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
- All references to value types in tokens, collections, and dimensions are by ID, not by hardcoded value or casing.

## Rationale
- **Referential Integrity:** Ensures all references are valid and unique within the dataset.
- **Extensibility:** New value types can be added without changing the schema or code.
- **Clarity:** No confusion about casing or allowed values; IDs are always referenced by ID.

## Application
- When creating or editing a token, set `resolvedValueTypeId` to the ID of the value type it uses.
- When defining collections or dimensions, use the IDs from `resolvedValueTypes` in `resolvedValueTypeIds` arrays.
- Validation scripts enforce that all references are valid.

## Example
```json
{
  "resolvedValueTypes": [
    { "id": "color", "displayName": "Color" },
    { "id": "fontFamily", "displayName": "Font Family" }
  ],
  "tokens": [
    { "id": "token-blue-500", "resolvedValueTypeId": "color", ... }
  ]
}
``` 
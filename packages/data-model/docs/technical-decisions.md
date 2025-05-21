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
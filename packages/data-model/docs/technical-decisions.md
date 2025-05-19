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
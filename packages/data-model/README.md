# Token Model Data Model

This package defines the canonical JSON schema and TypeScript types for the Token Model system. It is intended as a reference for implementers and as a source of truth for validation and interoperability.

## Schema Overview

- **systemName**: Human-readable name for this token system. (Required)
- **systemId**: Unique identifier for this token system, using the same pattern as other IDs. (Required)
- **description**: Human-readable description of this token system. (Optional)
- **Dimension**: Represents a dimension (e.g., color scheme, contrast) with a set of modes.
- **Mode**: Represents a mode within a dimension (e.g., Light, Dark).
- **TokenCollection**: A group of tokens, with value type and mode resolution strategy.
- **Token**: The core design token object, with support for global and mode-specific values. Each token references its value type by `resolvedValueTypeId`, which must match an ID in the top-level `resolvedValueTypes` array.
- **TokenValue**: The value of a token (e.g., COLOR, FLOAT, INTEGER, STRING, BOOLEAN, ALIAS).

### Example Top-Level Properties
```json
{
  "systemName": "Acme Design System",
  "systemId": "acme-design-system",
  "description": "The canonical design token set for Acme Corp."
}
```

### Example Token Referencing Value Type
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

## valuesByMode: Global vs. Mode-Specific Values

A token's `valuesByMode` field is an array of objects, each with:
- `modeIds: string[]` — the mode(s) this value applies to
- `value: TokenValue` — the value for those modes

**Rule:**
- If any entry in `valuesByMode` has `modeIds: []`, it must be the only entry in the array (i.e., the value is global and not mode-dependent).
- Otherwise, all entries must have `modeIds.length > 0` (i.e., all values are mode-specific).

This ensures a token can have either a single global value or multiple mode-specific values, but not both.

## Example

**Global value:**
```json
{
  "valuesByMode": [
    { "modeIds": [], "value": { "type": "COLOR", "value": "#000000" } }
  ]
}
```

**Mode-specific values:**
```json
{
  "valuesByMode": [
    { "modeIds": ["modeId-1"], "value": { "type": "COLOR", "value": "#000000" } },
    { "modeIds": ["modeId-2"], "value": { "type": "COLOR", "value": "#FFFFFF" } }
  ]
}
```

## Validation

The schema requires the following top-level fields: `systemName`, `systemId`, `tokenCollections`, `dimensions`, `tokens`, `platforms`, `version`, and `versionHistory`.

The package provides a utility function to validate the above rule:

```ts
import { validateTokenValuesByMode } from '@token-model/data-model';

const result = validateTokenValuesByMode(token.valuesByMode);
if (result !== true) {
  // result is an error message string
  throw new Error(result);
}
```

- Returns `true` if valid.
- Returns an error message string if invalid.

## Data Validation

To validate your example/default data against the schema, run:

```
pnpm --filter @token-model/data-model validate-data
```

This will check that your data (e.g., tokens, collections, dimensions, platforms) conforms to the schema in `src/schema.json`.

## How to Use

1. **Install and import the package:**
   - Use the Zod schemas and TypeScript types for validation and type safety.
2. **Validate tokens:**
   - Use the provided validation functions (e.g., `validateToken`, `validateTokenValuesByMode`).
3. **Reference the schema:**
   - The schema is documented in `schema.ts` and exported as JSON for external use.

## License

MIT 

## Data Extensibility: Core Data and Theme Overrides

### Core Data Model

The core data instance (e.g., `core-data.json`) defines all tokens, collections, dimensions, platforms, taxonomies, and the `namingRules` for code syntax generation. Each token can specify `"themeable": true` to indicate that it is explicitly customizable by themes.

**Example of a themeable token:**
```json
{
  "id": "color-primary",
  "displayName": "Primary Color",
  "themeable": true,
  "valuesByMode": [
    { "modeIds": [], "value": { "type": "COLOR", "value": "#0055FF" } }
  ]
}
```

### Theme Overrides: Extending Core Data

Theme overrides allow you to extend the core data set by providing alternate values for tokens that are marked as `"themeable": true`. This is achieved using separate theme override files, each conforming to the [`theme-overrides-schema.json`](src/theme-overrides-schema.json).

- **systemId** (required): The ID of the core token system this theme override is for. This field is used to identify which core data the theme overrides should be merged with in order to produce a full dataset. It must match the `systemId` of the core data file.
- **Core tokens** and their `"themeable"` status are defined in the main data file (e.g., `core-data.json`).
- **Theme override files** (e.g., `brand-a-overrides.json`) provide overrides for only those tokens that are themeable.

#### How it works

- The main schema's `themes` array includes an `overrideFileUri` property for each theme, which points to a JSON file containing overrides for that theme.
- Each theme override file must reference an existing theme ID and only override tokens with `"themeable": true`.
- Override values must match the type and constraints of the original token.

**Example (in core-data.json):**
```json
"themes": [
  {
    "id": "brand-dark",
    "displayName": "Brand Dark Theme",
    "isDefault": false,
    "overrideFileUri": "themes/brand-dark-overrides.json"
  }
]
```

**Example (brand-dark-overrides.json):**
```json
{
  "themeId": "brand-dark",
  "tokenOverrides": [
    {
      "tokenId": "color-primary",
      "value": { "type": "COLOR", "value": "#003366" }
    }
  ]
}
```

#### Validation & Access Control

- Only tokens with `"themeable": true` may be overridden in theme override files.
- Theme override files must reference existing theme IDs and token IDs.
- Override values must follow the correct type constraints.
- Core token maintainers have access to the main schema file; theme designers have access only to their theme override files.
- Theme override files must include a `systemId` field that matches the core data set they are intended to override.

#### Extensibility Benefits

- New themes can be added without modifying core tokens.
- Theme overrides can evolve independently.
- Different teams can work on different themes concurrently.
- Easily supports future features like theme inheritance or theme composition.

#### Validation

- Use `theme-overrides-schema.json` to validate each theme override file.
- Use the main schema to validate the core tokens and theme metadata.

**Usage Summary:**
- **Core data** defines the full set of tokens and which are themeable.
- **Theme overrides** provide a safe, schema-driven way to extend or customize only the tokens that are explicitly marked as themeable, ensuring data integrity and separation of concerns. 

## Token

- **codeSyntax**: Platform-specific naming conventions for this token. This is now an array of objects, each with a `platformId` (referencing a platform in the platforms array) and a `formattedName` string. This allows for custom platforms and explicit linkage, and is more scalable than the previous object-based approach.

**Example:**
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

**Rationale:**
- Supports any number of platforms, including custom ones.
- Explicitly links code syntax to platforms by ID, not by name.
- Avoids hardcoding platform names and enables future extensibility. 
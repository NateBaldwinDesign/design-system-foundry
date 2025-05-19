# Token Model Data Model

This package defines the canonical JSON schema and TypeScript types for the Token Model system. It is intended as a reference for implementers and as a source of truth for validation and interoperability.

## Schema Overview

- **Dimension**: Represents a dimension (e.g., color scheme, contrast) with a set of modes.
- **Mode**: Represents a mode within a dimension (e.g., Light, Dark).
- **TokenCollection**: A group of tokens, with value type and mode resolution strategy.
- **Token**: The core design token object, with support for global and mode-specific values.
- **TokenValue**: The value of a token (e.g., COLOR, FLOAT, INTEGER, STRING, BOOLEAN, ALIAS).

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

## Theme Overrides: Hybrid File Approach

- **Core Tokens File:** The main schema (schema.json) defines all core tokens and themes.
- **Theme Override Files:** Each theme can reference a separate override file via the new `overrideFileUri` property in the theme object.
- **Reference System:** The main schema's `themes` array includes an `overrideFileUri` property for each theme, which points to a JSON file containing overrides for that theme.

### Example (in schema.json)
```json
"themes": [
  {
    "id": "brand-dark",
    "displayName": "Brand Dark Theme",
    "description": "Dark version of our brand theme",
    "isDefault": false,
    "overrideFileUri": "themes/brand-dark-overrides.json"
  }
]
```

### Example (theme override file)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://designsystem.org/schemas/theme-overrides/v1.0.0",
  "themeId": "brand-dark",
  "tokenOverrides": [
    {
      "tokenId": "color-primary",
      "value": { "type": "COLOR", "value": "#003366" },
      "platformOverrides": [
        {
          "platformId": "iOS",
          "value": { "type": "COLOR", "value": "#004477" }
        }
      ]
    }
  ]
}
```

### Validation & Access Control
- Only tokens with `themeable: true` may be overridden in theme override files.
- Theme override files must reference existing theme IDs and token IDs.
- Override values must follow the correct type constraints.
- Core token maintainers have access to the main schema file; theme designers have access only to their theme override files.

### Extensibility Benefits
- New themes can be added without modifying core tokens.
- Theme overrides can evolve independently.
- Different teams can work on different themes concurrently.
- Easily supports future features like theme inheritance or theme composition.

### Validation
- Use `theme-overrides.schema.json` to validate each theme override file.
- Use the main schema to validate the core tokens and theme metadata. 
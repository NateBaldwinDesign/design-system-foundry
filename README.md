# Token Model

A monorepo containing a JSON data model for tokens and a Design data system manager for managing them.

## Project Structure

- `packages/data-model`: Contains the JSON schema and TypeScript types for tokens
- `packages/design-data-system-manager`: A Vite + React application for managing tokens (Design data system manager)

## Prerequisites

- Node.js 18 or later
- pnpm 8 or later

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Build the data model package:
   ```bash
   pnpm --filter @token-model/data-model build
   ```

3. Start the development server:
   ```bash
   pnpm --filter @token-model/design-data-system-manager dev
   ```

The application will be available at http://localhost:3000

## Development

- `pnpm build`: Build all packages
- `pnpm dev`: Start development servers
- `pnpm lint`: Run linting
- `pnpm test`: Run tests

## Features

- Type-safe token data model using Zod
- Modern React application with Material-UI
- Real-time validation of token data
- Token management interface

# Value Types

The data model supports a set of standard value types, based on the W3C Design Tokens Community Group specification and common design system needs:

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

These types are recommended for use in the `resolvedValueTypes` array in your schema. However, the schema is extensible: you may add custom value types by specifying any string as an `id`.

**Rationale:**
- Standard types ensure interoperability and predictable transformation across platforms (Figma, CSS, iOS, Android, etc.).
- Custom types allow for future extensibility and proprietary needs.

**How to extend:**
- Use the standard types for all common design token needs.
- For custom types, document their purpose and how they should be transformed for each platform.
- Update the schema and documentation as new types are added or standardized.

# Dimensions

Dimensions are a core concept in the token system that allows for organizing and resolving token values across different contexts. Each dimension can support multiple value types through the `resolvedValueTypeIds` array.

## Key Features
- **Flexible Value Type Support:** Dimensions can support multiple value types (e.g., a theme dimension might support colors, dimensions, and spacing)
- **Mode-based Organization:** Each dimension contains modes that represent different states or contexts
- **Default Mode:** Every dimension must specify a default mode for fallback purposes
- **Required Flag:** Dimensions can be marked as required, ensuring they are always specified when resolving tokens

## Example
```json
{
  "dimensions": [
    {
      "id": "theme",
      "displayName": "Theme",
      "modes": [
        { "id": "light", "name": "Light Theme" },
        { "id": "dark", "name": "Dark Theme" }
      ],
      "resolvedValueTypeIds": ["color", "dimension", "spacing"],
      "defaultMode": "light",
      "required": true
    }
  ]
}
```

**Best Practices:**
- Use descriptive IDs and display names for dimensions and modes
- Specify all relevant value types in `resolvedValueTypeIds`
- Always provide a default mode
- Consider which dimensions should be required based on your design system's needs

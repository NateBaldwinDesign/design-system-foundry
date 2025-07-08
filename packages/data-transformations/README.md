# @token-model/data-transformations

A modular package for transforming design token data from the token-model schema to various external formats and APIs.

## Overview

This package provides a flexible and extensible system for transforming design token data that conforms to the `@token-model/data-model` schema into formats required by external systems such as Figma Variables API, CSS custom properties, and other design tool APIs.

## Architecture

### Core Components

- **Base Transformer Interface**: Common interface for all transformers
- **Type Definitions**: TypeScript interfaces for transformation inputs/outputs
- **Validation Layer**: Schema validation for transformation inputs
- **Error Handling**: Standardized error types and handling patterns

### Package Structure

```
src/
├── index.ts              # Main package exports
├── types/                # TypeScript type definitions
│   ├── index.ts
│   ├── figma.ts
│   └── common.ts
├── transformers/         # Transformation implementations
│   ├── index.ts
│   ├── base.ts
│   └── figma.ts
├── utils/               # Utility functions
│   ├── index.ts
│   ├── validation.ts
│   └── helpers.ts
└── schemas/             # External API schemas
    ├── index.ts
    └── figma.ts
```

## Usage

```typescript
import { FigmaTransformer } from '@token-model/data-transformations';

const transformer = new FigmaTransformer();
const figmaVariables = await transformer.transform(tokenData, {
  fileKey: 'your-figma-file-key',
  accessToken: 'your-figma-access-token',
  updateExisting: true, // Optional: defaults to true
  existingFigmaData: existingData // Optional: for determining CREATE vs UPDATE actions
});
```

## Development

### Build
```bash
pnpm build
```

### Test
```bash
pnpm test
```

### Development Mode
```bash
pnpm dev
```

## Schema Compliance

All transformers strictly adhere to the `@token-model/data-model` schema as the single source of truth. Transformations validate input data against the schema before processing and maintain referential integrity throughout the transformation process.

## Error Handling

The package provides comprehensive error handling with:
- Input validation errors
- Transformation errors
- API communication errors
- Detailed error messages for debugging

## Extensibility

New transformers can be easily added by implementing the base transformer interface and following the established patterns for validation, error handling, and type safety. 


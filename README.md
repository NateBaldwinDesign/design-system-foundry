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

# Technical Decisions: Migration Options in Dimension Editing

## Context
The migration section in the dimension editor previously included options for:
- Mapping empty modeIds to arbitrary modes ("Map Empty modeIds To")
- Toggling whether to preserve original values during migration ("Preserve Original Values")

## Decision
Both options have been removed from the UI and underlying logic.

### Rationale
- **Schema Alignment:** The schema defines a single `defaultMode` per dimension, which is the canonical fallback for missing mode assignments. Allowing arbitrary mapping or non-preservation of values introduces ambiguity and complexity not supported by the schema.
- **Simplicity & Predictability:** Fewer options make the UI easier to understand and use. Users can trust that their data will always be preserved unless they explicitly choose to reset or delete it.
- **Data Integrity:** Preserving original values is the only safe, scalable, and user-friendly behavior. Silent data loss or resetting values is never desirable in a design system context.
- **No Real-World Use Case:** There are no strong scenarios where a user would want to discard all original values during migration. If a reset is needed, it should be a separate, explicit action.

### Outcome
- The only valid behavior for "Map to Defaults" is to use the dimension's `defaultMode`.
- Value preservation is always the default and only behavior during migration.
- The migration UI is now simpler, more predictable, and aligned with schema-driven best practices. 

# Code Syntax Preview Mapping in TokenEditorDialog

## Context
In the TokenEditorDialog, the code syntax preview (a list of code syntax strings for each platform) is generated from state and displayed in the dialog UI. There are multiple ways to implement this mapping in React: directly in the render JSX, using a constant, or with useMemo.

## Decision
The mapping of code syntax preview elements is lifted out of the render JSX and assigned to a constant just above the return statement. This approach is:
- Consistent with the rest of the codebase, which favors simple constants for UI mapping logic unless performance requires useMemo.
- Clear and maintainable, making it easy to see how the preview is built and ensuring it always updates when state changes.
- Sufficiently performant for the small number of platforms typically present in a design system.

### Example
```tsx
const codeSyntaxPreview = Object.entries(codeSyntax).map(([key, value]) => (
  <Box key={key} ...>
    <Typography ...>{key}:</Typography>
    <Typography ...>{value}</Typography>
  </Box>
));
// ...
{codeSyntaxPreview}
```

## Outcome
- This pattern should be used for similar UI mapping logic throughout the codebase unless a specific need for memoization or optimization is identified.
- The code syntax preview in TokenEditorDialog is now always up to date, clear, and easy to maintain. 

# UI Architecture, Navigation, and Cursor Rule Usage

## UI Architecture & Navigation
- **Top-level navigation** is handled by a tab/view system, with each view in `src/views/{Name}View.tsx` (e.g., `TokensView`, `SetupView`, `DashboardView`).
- **Header navigation** (`Header.tsx`) uses a `NAV_VIEWS` array to define available tabs, and navigation is handled by `onViewChange`.
- **Each view** is a React component, typically exporting a default functional component.
- **Chakra UI** is the standard for all UI primitives (e.g., `Select`, `Button`, `Box`, `FormControl`).
- **All filter controls and dropdowns** use Chakra UI's `Select` component, never custom or native HTML selects.
- **Component patterns:**
  - UI mapping logic (e.g., code syntax preview) is assigned to a constant above the return statement, not inlined in JSX, unless performance requires memoization.

## Schema-Driven Development
- All data models and UI organization are derived from `schema.json` in the data model package.
- No alternative models or keys are introduced if already defined in the schema.
- All editable fields and data changes are validated against schema constraints.
- Referential integrity is enforced for all IDs and relationships.

## Cursor Rule Usage
- **Cursor rules** are user-provided instructions that guide the AI in codebase navigation, architectural decisions, and coding style.
- Cursor rules are loaded at the start of every session and are referenced on every prompt if they are in the `<available_instructions>` section.
- If you add or update rules, ensure they are included in the `<available_instructions>` or `<custom_instructions>` section for persistent reference.
- If you have rules in a file (e.g., `docs/cursor-rules.md`), mention the path in your prompt or in a persistent configuration so the AI can fetch and use the latest version.
- If you want rules to be always loaded, place them in a file and mention the path in your prompt or configuration.

## Best Practices
- Favor clarity, modularity, and reusability in all UI and data logic.
- Always align new features and UI organization with the schema and technical decisions documented here.
- Use Chakra UI for all UI primitives and controls.
- Validate all user input and data changes using schema-defined constraints. 

# TypeScript and Environmental Issues

## Context
The codebase currently has several TypeScript and environmental issues that need to be addressed:
- Missing React type declarations
- JSX runtime module path issues
- Function argument count mismatches
- Potential type safety improvements in utility functions

## To Do
1. **React Type Declarations**
   - Add proper React type declarations to resolve "Cannot find module 'react'" errors
   - Ensure JSX runtime module path is correctly configured

2. **Function Signature Alignment**
   - Review and update function signatures in utility files (e.g., `dashboardStats.ts`)
   - Fix argument count mismatches (e.g., `getThemeStats` currently expects 1 argument but receives 2)

3. **Type Safety Improvements**
   - Add proper type definitions for all utility functions
   - Implement stricter type checking for data transformations
   - Consider adding runtime type validation for critical data flows

4. **Build Configuration**
   - Review and update TypeScript configuration
   - Ensure all necessary type declarations are included in the build
   - Consider adding stricter TypeScript compiler options

## Rationale
Addressing these issues will:
- Improve code reliability and maintainability
- Catch potential bugs earlier in development
- Provide better developer experience through improved type hints
- Ensure consistent behavior across different environments

## Outcome
Once these issues are resolved, the codebase will have:
- Proper TypeScript support throughout
- Consistent function signatures
- Better type safety
- More reliable build process 

# Validation Handling and Data Integrity Improvements

## Context
Recent updates have focused on ensuring that all data mutations and data loading operations are schema-compliant and robust, in line with the project's schema-driven development philosophy.

## Improvements

### 1. Schema Validation on All Mutations
- All major mutation handlers (tokens, collections, dimensions, platforms, themes, value types, taxonomies) now validate the full data object against the schema before updating state.
- If a mutation would result in invalid data, the update is prevented and the user receives a clear, actionable error message via a toast notification.
- ValidationService is used as the single point of schema validation, ensuring consistency and maintainability.

### 2. Robust Theme Override Merging
- When a theme override file is selected as a data source, the loader now searches all available example data files for a matching core data file (by `systemId` and presence of a `tokens` array), not just those in the same directory.
- The loader merges the override into the full core data object, resulting in a schema-compliant object that includes all required fields.
- This ensures that theme overrides always produce a valid, complete data set, regardless of file placement or naming.

### 3. User Feedback and Error Handling
- All validation errors and important user actions are surfaced via standardized Chakra UI toast notifications.
- Error messages are descriptive and actionable, helping users quickly resolve issues.
- Success and info messages are also standardized for consistency and clarity.

### 4. Alignment with Schema and Technical Decisions
- All validation and merging logic is strictly aligned with the schema (`schema.json`) and the principles outlined in this document.
- No alternative models or keys are introduced; all data flows are schema-driven.
- Referential integrity and required relationships are enforced at every mutation and load step.

## Outcome
- The app now provides robust, user-friendly validation and data integrity guarantees.
- Users are prevented from making invalid changes and are always informed of the reason for any failure.
- Theme overrides are seamlessly merged, and all data sources are loaded in a schema-compliant way. 
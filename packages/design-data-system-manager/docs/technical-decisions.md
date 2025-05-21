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
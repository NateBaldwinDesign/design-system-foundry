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
# Component Registry

*Last updated: May 18, 2025*

This document serves as the central registry for all key components in our application. Each component entry includes its purpose, API interface, usage examples, design constraints, and dependencies.

## Table of Contents
- [UI Components](#ui-components)
  - [Token list](#token-list)
  - [Platform Overrides Table](#platform-overrides-table)
  - [Value By Mode Table](#value-by-mode-table)
  - [Taxonomy Picker](#taxonomy-picker)
- [Form Components](#form-components)
  - [Token Editor Dialog](#token-editor-dialog)
- [Views](#views)
- [Workflows](#workflows)

---

## UI Components

### Token list

**Purpose:** List of all available tokens within the system, their metadata, and actions for editing their values.

**Location:** `/src/components/TokenList.tsx`

**Props:**
```typescript
interface TokenListProps {
  tokens: ExtendedToken[]; // Array of all tokens to display. Used to render the list and provide data for edit/delete actions.
  collections: TokenCollection[]; // Array of all token collections. Used to display collection names for each token.
  modes: Mode[]; // Array of all modes. Used for displaying mode-related info for tokens.
  dimensions: Dimension[]; // Array of all dimensions. Used for displaying dimension info for tokens.
  platforms: Platform[]; // Array of all platforms. Used for displaying platform-specific info for tokens.
  onEdit: (token: ExtendedToken) => void; // Callback fired when the user clicks edit on a token. Receives the token to edit.
  onDelete: (tokenId: string) => void; // Callback fired when the user clicks delete on a token. Receives the token's ID.
  taxonomies: Taxonomy[]; // Array of all taxonomies. Used to display taxonomy/term info for each token.
}
```

**Usage Example:**
```tsx
<Button 
  variant="primary" 
  size="md" 
  onClick={handleSubmit} 
  isLoading={isSubmitting}
>
  Save Changes
</Button>
```

**Design Constraints:**
- Must use data for tokens from local storage.
- Must adhere to and support the data model in schema.json
- Data in token list is not editable
- Edit action launches separate component for token editing 

**Dependencies:**
- 

---

### Platform Overrides Table

**Purpose:** Display and edit platform-specific overrides for token values, grouped by platform.

**Location:** `/src/components/PlatformOverridesTable.tsx`

**Props:**
```typescript
interface PlatformOverridesTableProps {
  platforms: Platform[]; // Array of all platforms. Used to render override columns and match overrides to platforms.
  valuesByMode: any[]; // Array of value-by-mode objects for the token. Used to display/edit overrides for each mode/platform.
  modes: Mode[]; // Array of all modes. Used to map mode IDs to mode names for display.
  getValueEditor: (value: TokenValue | string, modeIndex: number, isOverride?: boolean, onChange?: (newValue: TokenValue) => void) => React.ReactNode; // Function to render the value editor for each override cell. Used for custom value input.
  onPlatformOverrideChange: (platformId: string, modeIndex: number, newValue: TokenValue) => void; // Callback fired when an override value is changed. Receives platform ID, mode index, and new value.
  resolvedValueType: string; // The resolved value type for the token (e.g., 'COLOR'). Used to determine value editor type.
  tokens: Token[]; // Array of all tokens. Used for alias value selection and validation.
  constraints?: any[]; // Optional. Array of constraints for value validation. Used to enforce rules on override values.
  excludeTokenId?: string; // Optional. Token ID to exclude from alias selection (e.g., to prevent self-aliasing).
}
```

**Design Constraints:**
- Only shows platforms with at least one override.
- Uses ValueByModeTable for per-platform value editing.

**Dependencies:**
- ValueByModeTable

---

### Value By Mode Table

**Purpose:** Display and edit token values for all mode combinations in a table format.

**Location:** `/src/components/ValueByModeTable.tsx`

**Props:**
```typescript
interface ValueByModeTableProps {
  valuesByMode: any[]; // Array of value-by-mode objects for the token. Used to render the table rows and cells.
  modes: Mode[]; // Array of all modes. Used to map mode IDs to mode names for display.
  editable?: boolean; // Optional. If true, allows editing values in the table. Defaults to false (read-only).
  onValueChange?: (modeIndex: number, newValue: TokenValue) => void; // Optional. Callback fired when a value is changed. Receives mode index and new value.
  getValueEditor: (value: TokenValue | string, modeIndex: number, isOverride?: boolean, onChange?: (newValue: TokenValue) => void) => React.ReactNode; // Function to render the value editor for each cell. Used for custom value input.
  resolvedValueType: string; // The resolved value type for the token (e.g., 'COLOR'). Used to determine value editor type.
  tokens: Token[]; // Array of all tokens. Used for alias value selection and validation.
  constraints?: any[]; // Optional. Array of constraints for value validation. Used to enforce rules on values.
  excludeTokenId?: string; // Optional. Token ID to exclude from alias selection (e.g., to prevent self-aliasing).
}
```

**Design Constraints:**
- Validates that all mode IDs in valuesByMode exist in the modes array.
- Uses a global, up-to-date list of modes for display.

**Dependencies:**
- TokenValuePicker

---

### Taxonomy Picker

**Purpose:** Allow users to assign taxonomies and terms to a token in a compact, chip-based UI.

**Location:** `/src/components/TaxonomyPicker.tsx`

**Props:**
```typescript
interface TaxonomyPickerProps {
  taxonomies: Taxonomy[]; // Array of all taxonomies. Used to populate the taxonomy/term selection options.
  value: { taxonomyId: string; termId: string }[]; // Array of selected taxonomy/term pairs. Used to display selected chips and as the current value.
  onChange: (value: { taxonomyId: string; termId: string }[]) => void; // Callback fired when the selection changes. Receives the new array of taxonomy/term pairs.
  disabled?: boolean; // Optional. If true, disables the picker UI. Defaults to false.
}
```

**Design Constraints:**
- Only allows assignment of taxonomies not already assigned.
- Only displays selected taxonomy + term pairs as chips.
- UI is compact and user-friendly.

**Dependencies:**
- MUI Chip, Select, Button

---

## Form Components

### Token Editor Dialog

**Purpose:**
Dialog for creating or editing a token, including all metadata, dimensions, taxonomies, and values by mode.

**Location:** `/src/components/TokenEditorDialog.tsx`

**Props:**
```typescript
export interface TokenEditorDialogProps {
  token: ExtendedToken; // The token to edit or create. Used to initialize the dialog state and as the base for edits.
  tokens: ExtendedToken[]; // Array of all tokens. Used for alias value selection and validation.
  dimensions: Dimension[]; // Array of all dimensions. Used to display and edit dimension assignments for the token.
  modes: Mode[]; // Array of all modes. Used to display and edit mode assignments for the token.
  platforms: Platform[]; // Array of all platforms. Used to display and edit platform-specific overrides and code syntax.
  open: boolean; // If true, the dialog is open. Used to control dialog visibility.
  onClose: () => void; // Callback fired when the dialog is closed (cancel or close button).
  onSave: (token: ExtendedToken) => void; // Callback fired when the user saves changes. Receives the updated token.
  taxonomies: Taxonomy[]; // Array of all taxonomies. Used to display and edit taxonomy assignments for the token.
  isNew?: boolean; // Optional. If true, the dialog is for creating a new token. Defaults to false (editing existing token).
}
```

**Design Constraints:**
- All edits are staged in local state and only saved/applied on user action.
- Supports multi-dimensional values, platform overrides, and taxonomy assignment.
- Modular: uses ValueByModeTable, PlatformOverridesTable, and TaxonomyPicker for sub-sections.

**Dependencies:**
- ValueByModeTable
- PlatformOverridesTable
- TaxonomyPicker
- TokenValuePicker

---

## Views

---

## Workflows

### Settings Workflow

**Purpose:** Main settings management interface with tabs for collections, dimensions, modes, value types, themes, taxonomies, and platforms.

**Location:** `/src/views/settings/SettingsWorkflow.tsx`

**Props:**
```typescript
interface SettingsWorkflowProps {
  collections: TokenCollection[];
  setCollections: (collections: TokenCollection[]) => void;
  dimensions: Dimension[];
  setDimensions: (dimensions: Dimension[]) => void;
  modes: Mode[];
  setModes: (modes: Mode[]) => void;
  themes: any[];
  taxonomies: Taxonomy[];
  setTaxonomies: (taxonomies: Taxonomy[]) => void;
}
```

**Design Constraints:**
- Uses tabbed interface for different settings sections
- Each tab is a separate component for modularity
- Maintains local state for new/edit operations
- Persists changes through StorageService

**Dependencies:**
- SettingsCollectionsView
- SettingsDimensionsView
- SettingsValueTypesView
- SettingsThemesTab
- SettingsTaxonomiesTab
- SettingsPlatformsView

---

### Dimensions Workflow

**Purpose:** Manage dimensions and their associated modes, including creation, editing, and deletion.

**Location:** `/src/components/DimensionsWorkflow.tsx`

**Props:**
```typescript
interface DimensionsWorkflowProps {
  dimensions: Dimension[];
  setDimensions: (dims: Dimension[]) => void;
  modes: Mode[];
  setModes: (modes: Mode[]) => void;
}
```

**Design Constraints:**
- Supports adding/removing dimensions and modes
- Maintains referential integrity between dimensions and modes
- Uses dialogs for editing operations
- Validates required fields and relationships

**Dependencies:**
- MUI Dialog, TextField, Select components

---

### Collections Workflow

**Purpose:** Manage token collections, their value types, and mode resolution strategies.

**Location:** `/src/components/CollectionsWorkflow.tsx`

**Props:**
```typescript
interface CollectionsWorkflowProps {
  collections: TokenCollection[];
  modes: Mode[];
  onUpdate: (collections: TokenCollection[]) => void;
}
```

**Design Constraints:**
- Supports multiple value types per collection
- Handles mode resolution strategy configuration
- Validates collection properties
- Uses form-based editing interface

**Dependencies:**
- MUI Form components
- TokenCollection type from data model

---

### Modes Workflow

**Purpose:** Manage modes within dimensions, including creation, editing, and deletion.

**Location:** `/src/components/ModesWorkflow.tsx`

**Props:**
```typescript
interface ModesWorkflowProps {
  modes: Mode[];
  collections: TokenCollection[];
  onUpdate: (modes: Mode[]) => void;
}
```

**Design Constraints:**
- Maintains mode-dimension relationships
- Validates mode properties
- Uses list-based interface for mode management
- Supports bulk operations

**Dependencies:**
- MUI List components
- Mode type from data model

---

## Views

### Settings Collections Tab

**Purpose:** Interface for managing token collections within the settings workflow.

**Location:** `/src/views/settings/SettingsCollectionsView.tsx`

**Props:**
```typescript
interface SettingsCollectionsViewProps {
  collections: TokenCollection[];
  setCollections: (collections: TokenCollection[]) => void;
  newCollection: Partial<TokenCollection>;
  setNewCollection: (c: Partial<TokenCollection>) => void;
  handleAddCollection: () => void;
  handleDeleteCollection: (id: string) => void;
}
```

**Design Constraints:**
- Supports collection creation and deletion
- Handles value type and mode resolution configuration
- Uses form-based interface
- Validates collection properties

**Dependencies:**
- MUI Form components
- TokenCollection type from data model

---

### Settings Dimensions Tab

**Purpose:** Interface for managing dimensions within the settings workflow.

**Location:** `/src/views/settings/SettingsDimensionsView.tsx`

**Props:**
```typescript
interface SettingsDimensionsViewProps {
  dimensions: Dimension[];
  setDimensions: (dimensions: Dimension[]) => void;
  modes: Mode[];
  setModes: (modes: Mode[]) => void;
}
```

**Design Constraints:**
- Delegates to DimensionsWorkflow component
- Maintains dimension-mode relationships
- Handles dimension configuration

**Dependencies:**
- DimensionsWorkflow component

---

### Settings Value Types Tab

**Purpose:** Display and manage supported value types.

**Location:** `/src/views/settings/SettingsValueTypesView.tsx`

**Props:** None

**Design Constraints:**
- Displays current supported value types
- Uses chip-based display
- Static content (no editing)

**Dependencies:**
- MUI Chip component

---

### Settings Themes Tab

**Purpose:** Interface for managing themes within the settings workflow.

**Location:** `/src/views/settings/SettingsThemesTab.tsx`

**Props:**
```typescript
interface SettingsThemesTabProps {
  themes: any[];
  setThemes: (themes: any[]) => void;
}
```

**Design Constraints:**
- Supports theme creation and editing
- Handles default theme selection
- Uses table-based interface
- Persists changes through StorageService

**Dependencies:**
- MUI Table components
- StorageService

---

### Settings Taxonomies Tab

**Purpose:** Interface for managing taxonomies and terms within the settings workflow.

**Location:** `/src/views/settings/SettingsTaxonomiesTab.tsx`

**Props:**
```typescript
interface SettingsTaxonomiesTabProps {
  taxonomies: Taxonomy[];
  setTaxonomies: (taxonomies: Taxonomy[]) => void;
}
```

**Design Constraints:**
- Supports taxonomy and term management
- Handles naming rules and taxonomy order
- Uses table-based interface
- Maintains referential integrity
- Cleans up invalid references

**Dependencies:**
- MUI Table components
- StorageService
- Taxonomy utilities

## Data Model Evolution

### Version History

**Purpose:** Track schema versions and their dimension configurations to support safe evolution of the token system.

**Location:** Schema-level configuration in `schema.json`

**Key Properties:**
```typescript
interface VersionHistoryEntry {
  version: string;
  dimensions: string[];
  date: string;
  migrationStrategy?: {
    emptyModeIds: 'mapToDefaults' | 'preserveEmpty' | 'requireExplicit';
    preserveOriginalValues: boolean;
  };
}
```

**Design Constraints:**
- Each version must be semantically versioned
- Version history must be complete and sequential
- Migration strategies must be explicit
- All dimension changes must be tracked

**Dependencies:**
- Schema validation utilities
- Version comparison utilities

---

### Dimension Evolution

**Purpose:** Define rules for handling dimension changes and their impact on existing tokens.

**Location:** Schema-level configuration in `schema.json`

**Key Properties:**
```typescript
interface DimensionEvolutionRule {
  whenAdding: string;
  mapEmptyModeIdsTo: string[];
  preserveDefaultValues?: boolean;
}
```

**Design Constraints:**
- Rules must be explicit for each new dimension
- Default mode mapping must be valid
- Must maintain referential integrity
- Must support backward compatibility

**Dependencies:**
- Schema validation utilities
- Mode resolution utilities

## Developer Patterns

### Unified ID Generation and Display in Dialogs

**Pattern:**
- When opening a dialog to add a new entity (token, dimension, mode, etc.), generate a unique ID using `createUniqueId('type')` from `src/utils/id.ts`.
- Set this ID in the form state immediately upon dialog initialization.
- Display the ID in a disabled (non-editable) TextField with a label like "Token ID", "Dimension ID", or "Mode ID".
- The user should never be able to edit the ID field.
- This ensures all entities have unique, immutable IDs and a consistent user experience.

**Example:**
```tsx
// When opening the dialog for a new entity
setForm({
  id: createUniqueId('dimension'), // or 'token', 'mode', etc.
  ...otherFields
});

// In the dialog UI
<TextField
  label="Dimension ID"
  value={form.id}
  fullWidth
  required
  disabled
  helperText="Dimension IDs are automatically generated and cannot be edited"
/>
```

**Code Comment Template:**
```tsx
// Always generate a unique ID for new entities using createUniqueId('type')
// Display the ID in a disabled TextField so the user cannot edit it
```

**Where Used:**
- TokenEditorDialog (Token ID)
- DimensionsWorkflow (Dimension ID, Mode ID)
- DimensionsEditor (Dimension ID, Mode ID)
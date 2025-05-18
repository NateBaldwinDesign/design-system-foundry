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
  tokens: ExtendedToken[];
  collections: TokenCollection[];
  modes: Mode[];
  dimensions: Dimension[];
  platforms: Platform[];
  onEdit: (token: ExtendedToken) => void;
  onDelete: (tokenId: string) => void;
  taxonomies: Taxonomy[];
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
  platforms: Platform[];
  valuesByMode: any[];
  modes: Mode[];
  getValueEditor: (value: TokenValue | string, modeIndex: number, isOverride?: boolean, onChange?: (newValue: TokenValue) => void) => React.ReactNode;
  onPlatformOverrideChange: (platformId: string, modeIndex: number, newValue: TokenValue) => void;
  resolvedValueType: string;
  tokens: Token[];
  constraints?: any[];
  excludeTokenId?: string;
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
  valuesByMode: any[];
  modes: Mode[];
  editable?: boolean;
  onValueChange?: (modeIndex: number, newValue: TokenValue) => void;
  getValueEditor: (value: TokenValue | string, modeIndex: number, isOverride?: boolean, onChange?: (newValue: TokenValue) => void) => React.ReactNode;
  resolvedValueType: string;
  tokens: Token[];
  constraints?: any[];
  excludeTokenId?: string;
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
  taxonomies: Taxonomy[];
  value: { taxonomyId: string; termId: string }[];
  onChange: (value: { taxonomyId: string; termId: string }[]) => void;
  disabled?: boolean;
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
  token: ExtendedToken;
  tokens: ExtendedToken[];
  dimensions: Dimension[];
  modes: Mode[];
  platforms: Platform[];
  open: boolean;
  onClose: () => void;
  onSave: (token: ExtendedToken) => void;
  taxonomies: Taxonomy[];
  isNew?: boolean;
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
- SettingsCollectionsTab
- SettingsDimensionsTab
- SettingsValueTypesTab
- SettingsThemesTab
- SettingsTaxonomiesTab
- SettingsPlatformsTab

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

### Value Types Workflow

**Purpose:** Manage supported value types for tokens.

**Location:** `/src/components/ValueTypesWorkflow.tsx`

**Props:**
```typescript
interface ValueTypesWorkflowProps {
  valueTypes: string[];
  onUpdate: (valueTypes: string[]) => void;
}
```

**Design Constraints:**
- Supports predefined value type categories
- Validates value type properties
- Uses form-based editing interface
- Maintains type safety

**Dependencies:**
- MUI Form components

---

## Views

### Settings Collections Tab

**Purpose:** Interface for managing token collections within the settings workflow.

**Location:** `/src/views/settings/SettingsCollectionsTab.tsx`

**Props:**
```typescript
interface SettingsCollectionsTabProps {
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

**Location:** `/src/views/settings/SettingsDimensionsTab.tsx`

**Props:**
```typescript
interface SettingsDimensionsTabProps {
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

**Location:** `/src/views/settings/SettingsValueTypesTab.tsx`

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
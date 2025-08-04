# Data Source Management Plan: EDIT vs VIEW Data Distinction

## Overview

This plan implements a clear distinction between EDIT data and VIEW data in the web application, particularly when platform extensions and theme overrides are involved. The system ensures that users can edit data from the correct source while viewing merged data for a unified experience.

## Core Philosophy

- **VIEW Data**: Merged data for display (core + platform + theme overrides)
- **EDIT Data**: Source-specific data for changes (core repository, platform extension, or theme override)
- **Automatic Override Creation**: When editing platform/theme data, automatically create appropriate overrides
- **Schema Compliance**: All data must conform to their respective schemas during editing
- **Permission-Based Access**: Edit access determined by repository permissions

## Current Implementation Assessment

### ✅ Already Implemented
- Schema-aware storage with separate keys for core/platform/theme data
- Data source context management (platform/theme selection)
- Enhanced data merging with source tracking
- Data transformation between presentation and storage formats
- Permission management per repository
- Theme override validation (only `themeable: true` tokens)
- Change tracking relative to edit source

### 🔄 Partially Implemented
- Automatic override creation when editing platform/theme data
- Clear distinction between VIEW (merged) and EDIT (source) data in UI
- Schema validation per edit source with clear error messages

### ❌ Missing
- Unified edit mode with automatic target determination
- Clear UI indicators for current edit source in save/commit dialogs
- Automatic override creation workflow

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WEB APPLICATION LAYER                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────┐  │
│  │   HEADER UI     │    │   VIEW RENDERER │    │   EDIT DIALOGS          │  │
│  │                 │    │                 │    │                         │  │
│  │ • Platform      │    │ • Displays      │    │ • Save Dialog           │  │
│  │   Dropdown      │    │   MERGED data   │    │ • Commit Dialog         │  │
│  │ • Theme         │    │ • Token Tables  │    │ • Validation Errors     │  │
│  │   Dropdown      │    │ • Components    │    │ • Source Indicators     │  │
│  │ • Edit Button   │    │ • Analytics     │    │ • Override Preview      │  │
│  │ • Edit Context  │    │ • Source Info   │    │                         │  │
│  └─────────────────┘    └─────────────────┘    └─────────────────────────┘  │
│           │                       │                           │              │
│           ▼                       ▼                           ▼              │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                    ENHANCED DATA CONTEXT MANAGER                       │  │
│  │                                                                         │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │  │  VIEW CONTEXT   │  │  EDIT CONTEXT   │  │  OVERRIDE MANAGER       │  │
│  │  │                 │  │                 │  │                         │  │
│  │  │ • Merged Data   │  │ • Edit Source   │  │ • Auto Override         │  │
│  │  │ • Display Logic │  │ • Change Track  │  │   Creation              │  │
│  │  │ • UI State      │  │ • Commit Target │  │ • Theme Restrictions    │  │
│  │  │ • Source Info   │  │ • Validation    │  │ • Override Tracking     │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ENHANCED DATA MERGING & STORAGE                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────┐  │
│  │  ENHANCED DATA  │    │  SCHEMA-AWARE   │    │  CHANGE TRACKING        │  │
│  │     MERGER      │    │    STORAGE      │    │                         │  │
│  │                 │    │                 │    │                         │  │
│  │ • Core +        │    │ • View Data     │    │ • Edit Source           │  │
│  │   Platform      │    │ • Edit Data     │    │   Changes Only          │  │
│  │ • Core +        │    │ • Schema        │    │ • Override Changes      │  │
│  │   Theme         │    │   Compliance    │    │ • Commit History        │  │
│  │ • Full Merge    │    │ • Persistence   │    │ • Validation State      │  │
│  │ • Override      │    │ • Override      │    │ • Source Tracking       │  │
│  │   Tracking      │    │   Management    │    │                         │  │
│  └─────────────────┘    └─────────────────┘    └─────────────────────────┘  │
│           │                       │                           │              │
│           ▼                       ▼                           ▼              │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                    REPOSITORY INTEGRATION                              │  │
│  │                                                                         │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │  │  CORE REPO      │  │  PLATFORM REPO  │  │  THEME REPO             │  │
│  │  │                 │  │                 │  │                         │  │
│  │  │ • schema.json   │  │ • platform-     │  │ • theme-overrides-      │  │
│  │  │ • Main Branch   │  │   extension.json│  │   schema.json           │  │
│  │  │ • Full Access   │  │ • tokenOverrides│  │ • tokenOverrides        │  │
│  │  │                 │  │ • Platform-     │  │ • Themeable Only        │  │
│  │  │                 │  │   Only Access   │  │ • Theme-Only Access     │  │
│  │  │                 │  │ • Auto Override │  │ • Auto Override         │  │
│  │  │                 │  │   Creation      │  │   Creation              │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Rules

### **VIEW Data (Merged for Display)**
- **Core Only**: Display core design system data
- **Core + Platform**: Display merged data (core + platform overrides)
- **Core + Theme**: Display merged data (core + theme overrides)  
- **Core + Platform + Theme**: Display fully merged data (core + platform + theme overrides)

### **EDIT Data (Source for Changes)**
- **Core Only**: Edit core design system repository
- **Platform Selected**: Edit platform extension repository (create `tokenOverrides` entries)
- **Theme Selected**: Edit theme override repository (create `tokenOverrides` entries, only for `themeable: true` tokens)

### **Override Creation Logic**
- When editing platform data, any token modifications create entries in `tokenOverrides` array
- When editing theme data, any token modifications create entries in `tokenOverrides` array
- The system automatically detects if a token exists in the current edit source and creates overrides accordingly

## Implementation Phases

### **Phase 1: Enhance Existing Data Context Management**

#### **1.1 Extend `DataSourceManager` for Edit Context**
```typescript
interface DataSourceContext {
  // Existing properties...
  currentPlatform: string | null;
  currentTheme: string | null;
  availablePlatforms: Platform[];
  availableThemes: Theme[];
  permissions: {
    core: boolean;
    platforms: Record<string, boolean>;
    themes: Record<string, boolean>;
  };
  repositories: {
    core: RepositoryInfo | null;
    platforms: Record<string, RepositoryInfo>;
    themes: Record<string, RepositoryInfo>;
  };
  
  // NEW: Edit context properties
  editMode: {
    isActive: boolean;
    sourceType: 'core' | 'platform-extension' | 'theme-override';
    sourceId: string | null;
    targetRepository: RepositoryInfo | null;
    validationSchema: 'schema' | 'platform-extension' | 'theme-override';
  };
  
  // NEW: View context properties
  viewMode: {
    isMerged: boolean;
    mergeSources: Array<'core' | 'platform-extension' | 'theme-override'>;
    displayData: 'merged' | 'core-only' | 'platform-only' | 'theme-only';
  };
}
```

#### **1.2 Enhance `DataManager` for Edit/View Distinction**
```typescript
class DataManager {
  // NEW: Separate edit and view data
  private editData: {
    core: TokenSystem | null;
    platformExtensions: Record<string, PlatformExtension>;
    themeOverrides: Record<string, ThemeOverrideFile>;
  };
  
  private viewData: MergedDataSnapshot;
  
  // NEW: Methods for edit/view distinction
  getEditData(sourceType: 'core' | 'platform-extension' | 'theme-override', sourceId?: string): Record<string, unknown>;
  getViewData(): MergedDataSnapshot;
  updateEditData(updates: Partial<DataSnapshot>, sourceType: string, sourceId?: string): ValidationResult;
}
```

### **Phase 2: Implement Automatic Override Creation**

#### **2.1 Create `OverrideManager` Service**
```typescript
class OverrideManager {
  // Automatic override creation when editing platform data
  createPlatformOverride(tokenId: string, newValue: any, platformId: string): PlatformExtension;
  
  // Automatic override creation when editing theme data (only for themeable tokens)
  createThemeOverride(tokenId: string, newValue: any, themeId: string): ThemeOverrideFile;
  
  // Validate override creation
  validateOverrideCreation(tokenId: string, sourceType: string, sourceId: string): ValidationResult;
  
  // Check if token is themeable
  isTokenThemeable(tokenId: string): boolean;
  
  // Get override preview
  getOverridePreview(tokenId: string, newValue: any, sourceType: string, sourceId: string): OverridePreview;
}
```

#### **2.2 Enhance `EnhancedDataMerger` for Override Tracking**
```typescript
class EnhancedDataMerger {
  // NEW: Track override creation during editing
  private overrideTracking: Map<string, {
    originalValue: any;
    newValue: any;
    sourceType: string;
    sourceId: string;
    isOverride: boolean;
  }>;
  
  // NEW: Methods for override management
  trackOverride(tokenId: string, originalValue: any, newValue: any, sourceType: string, sourceId: string): void;
  getPendingOverrides(): Array<{tokenId: string, override: any}>;
  commitOverrides(): void;
  discardOverrides(): void;
  
  // NEW: Override-aware merging
  mergeWithOverrides(
    coreData: TokenSystem | null,
    platformExtensions: Record<string, PlatformExtension>,
    themeOverrides: Record<string, ThemeOverrideFile>,
    pendingOverrides: Array<{tokenId: string, override: any}>
  ): MergedDataSnapshot;
}
```

### **Phase 3: Update UI Components for Edit/View Distinction**

#### **3.1 Enhance Header Component**
```typescript
// NEW: Edit mode indicators in Header
interface HeaderProps {
  // Existing props...
  
  // NEW: Edit context props
  editContext: {
    isEditMode: boolean;
    sourceType: 'core' | 'platform-extension' | 'theme-override';
    sourceId: string | null;
    sourceName: string;
  };
  
  // NEW: Edit mode handlers
  onEnterEditMode: () => void;
  onExitEditMode: () => void;
  onSaveChanges: () => void;
  onDiscardChanges: () => void;
  
  // NEW: Override information
  pendingOverrides: Array<{
    tokenId: string;
    tokenName: string;
    overrideType: 'platform' | 'theme';
    overrideSource: string;
  }>;
}
```

#### **3.2 Update Save/Commit Dialogs**
```typescript
// NEW: Enhanced save dialog with edit source information
interface GitHubSaveDialogProps {
  // Existing props...
  
  // NEW: Edit context props
  editContext: {
    sourceType: 'core' | 'platform-extension' | 'theme-override';
    sourceId: string | null;
    sourceName: string;
    targetRepository: RepositoryInfo;
    validationSchema: string;
  };
  
  // NEW: Override information
  pendingOverrides: Array<{
    tokenId: string;
    tokenName: string;
    overrideType: 'platform' | 'theme';
    overrideSource: string;
  }>;
  
  // NEW: Validation results
  validationResults: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}
```

### **Phase 4: Implement Schema Validation Per Edit Source**

#### **4.1 Create `SchemaValidationService` Enhancement**
```typescript
class SchemaValidationService {
  // NEW: Source-specific validation
  validateForEditSource(
    data: Record<string, unknown>,
    sourceType: 'core' | 'platform-extension' | 'theme-override',
    sourceId?: string
  ): ValidationResult;
  
  // NEW: Override-specific validation
  validateOverrideCreation(
    tokenId: string,
    newValue: any,
    sourceType: 'platform-extension' | 'theme-override',
    sourceId: string
  ): ValidationResult;
  
  // NEW: Theme editing restrictions
  validateThemeEdit(tokenId: string, isThemeable: boolean): ValidationResult;
  
  // NEW: Platform editing validation
  validatePlatformEdit(tokenId: string, platformId: string): ValidationResult;
}
```

#### **4.2 Enhance Error Handling with Clear Messages**
```typescript
// NEW: Enhanced error messages for different edit sources
const ERROR_MESSAGES = {
  'theme-not-themeable': 'Token "{tokenId}" is not themeable and cannot be edited in theme mode',
  'platform-override-required': 'Editing "{tokenId}" in platform mode will create a platform override',
  'theme-override-required': 'Editing "{tokenId}" in theme mode will create a theme override',
  'schema-validation-failed': 'Data does not conform to {schemaType} schema: {errors}',
  'permission-denied': 'You do not have write access to {repositoryName}',
  'override-creation-failed': 'Failed to create override for token "{tokenId}": {error}',
  'invalid-edit-source': 'Cannot edit {sourceType} data in current context'
};
```

### **Phase 5: Update Change Tracking for Edit Source**

#### **5.1 Enhance `ChangeTrackingService`**
```typescript
class ChangeTrackingService {
  // NEW: Source-specific change tracking
  trackChangesForSource(
    sourceType: 'core' | 'platform-extension' | 'theme-override',
    sourceId?: string
  ): ChangeSet;
  
  // NEW: Override change tracking
  trackOverrideChanges(
    tokenId: string,
    originalValue: any,
    newValue: any,
    sourceType: string,
    sourceId: string
  ): void;
  
  // NEW: Get changes relative to edit source
  getChangesForEditSource(
    sourceType: 'core' | 'platform-extension' | 'theme-override',
    sourceId?: string
  ): ChangeSet;
  
  // NEW: Override change detection
  getOverrideChanges(): Array<{
    tokenId: string;
    originalValue: any;
    newValue: any;
    sourceType: string;
    sourceId: string;
  }>;
}
```

### **Phase 6: Integration with Existing Workflows**

#### **6.1 Update `DataTransformationService`**
```typescript
class DataTransformationService {
  // NEW: Transform with override creation
  static transformWithOverrides(
    presentationData: DataSnapshot,
    sourceType: 'core' | 'platform-extension' | 'theme-override',
    sourceId?: string,
    pendingOverrides?: Array<{tokenId: string, override: any}>
  ): Record<string, unknown>;
  
  // NEW: Extract overrides from presentation data
  static extractOverridesForSource(
    presentationData: DataSnapshot,
    sourceType: 'platform-extension' | 'theme-override',
    sourceId: string
  ): Array<{tokenId: string, override: any}>;
  
  // NEW: Merge overrides into storage format
  static mergeOverridesIntoStorage(
    storageData: Record<string, unknown>,
    overrides: Array<{tokenId: string, override: any}>,
    sourceType: 'platform-extension' | 'theme-override',
    sourceId: string
  ): Record<string, unknown>;
}
```

#### **6.2 Update `StorageService` for Override Management**
```typescript
class StorageService {
  // NEW: Override-specific storage methods
  static getPendingOverrides(sourceType: string, sourceId: string): Array<{tokenId: string, override: any}>;
  static setPendingOverrides(sourceType: string, sourceId: string, overrides: Array<{tokenId: string, override: any}>): void;
  static clearPendingOverrides(sourceType: string, sourceId: string): void;
  
  // NEW: Edit context storage
  static getEditContext(): {sourceType: string, sourceId?: string, isEditMode: boolean};
  static setEditContext(context: {sourceType: string, sourceId?: string, isEditMode: boolean}): void;
  
  // NEW: Override history
  static getOverrideHistory(): Array<{
    timestamp: string;
    tokenId: string;
    sourceType: string;
    sourceId: string;
    action: 'created' | 'modified' | 'deleted';
  }>;
  static addOverrideHistoryEntry(entry: {
    tokenId: string;
    sourceType: string;
    sourceId: string;
    action: 'created' | 'modified' | 'deleted';
  }): void;
}
```

## Key Integration Points with Existing Code

### **1. Leverage Existing `DataSourceManager`**
- Extend current `DataSourceContext` with edit mode properties
- Use existing permission management
- Integrate with current platform/theme selection logic

### **2. Enhance Existing `DataManager`**
- Add edit/view data distinction to current schema-aware storage
- Integrate with existing `EnhancedDataMerger`
- Use current `DataTransformationService` for format conversion

### **3. Build on Existing `StorageService`**
- Use current schema-specific storage keys
- Add override management to existing storage methods
- Leverage current GitHub authentication preservation

### **4. Extend Existing `data-merger.ts`**
- Use current theme override validation logic
- Build on existing merge order (Core → Platform → Theme)
- Leverage current analytics and validation

## User Experience Workflow

### **1. Core Data Editing**
1. User selects "Core" in platform/theme dropdowns
2. System enters edit mode for core repository
3. **NEW**: Header UI changes to show repository URL + branch and edit source indicator
4. **NEW**: Platform/theme dropdowns are replaced with "Editing: Core Design System"
5. All changes are tracked relative to core data
6. Commit target is core repository
7. Schema validation against `schema.json`
8. **NEW**: After Save/Submit for Review, automatically return to view mode

### **2. Platform Extension Editing**
1. User selects a platform in platform dropdown
2. **NEW**: If on non-main branch with changes, show warning dialog
3. **NEW**: Reset to main branch for platform source (if no changes or user confirms)
4. System enters edit mode for platform extension repository
5. **NEW**: Header UI changes to show platform repository URL + branch
6. **NEW**: Platform/theme dropdowns are replaced with "Editing: Platform Extension - {PlatformName}"
7. Changes to existing tokens create `tokenOverrides` entries
8. New tokens are added to platform extension
9. Commit target is platform extension repository
10. Schema validation against `platform-extension-schema.json`
11. **NEW**: After Save/Submit for Review, automatically return to view mode

### **3. Theme Override Editing**
1. User selects a theme in theme dropdown
2. **NEW**: If on non-main branch with changes, show warning dialog
3. **NEW**: Reset to main branch for theme source (if no changes or user confirms)
4. System enters edit mode for theme override repository
5. **NEW**: Header UI changes to show theme repository URL + branch
6. **NEW**: Platform/theme dropdowns are replaced with "Editing: Theme Override - {ThemeName}"
7. Only `themeable: true` tokens can be edited
8. Changes create `tokenOverrides` entries
9. Commit target is theme override repository
10. Schema validation against `theme-overrides-schema.json`
11. **NEW**: After Save/Submit for Review, automatically return to view mode

### **4. Mixed Context (Platform + Theme)**
1. User selects both platform and theme
2. System prioritizes platform for editing (theme is read-only)
3. View shows merged data (core + platform + theme)
4. Edit operations target platform extension only
5. Theme overrides are preserved but not editable
6. **NEW**: Header shows platform repository URL + branch in edit mode
7. **NEW**: Edit source indicator shows "Editing: Platform Extension - {PlatformName}"

### **5. Two-Tier Permission System**
1. **View-Only Users**:
   - Can switch between platforms and themes to view different merged data scenarios
   - No edit buttons or editing capabilities are available
   - Platform and theme dropdowns remain functional for data viewing
   - Header shows: "Design System Name (branch) - View Only"

2. **Editable Users**:
   - Default mode is always "View" (shows "Edit" button in header)
   - Can enter "Edit" mode to make changes
   - Have access to all editing workflows and branch management
   - Header shows: "Design System Name (branch) - Edit Access" in view mode
   - Header shows: "Design System Name - repo/name@branch - Editing" in edit mode

### **6. Edit Mode UI Workflow**
1. **Enter Edit Mode**:
   - Click "Edit" button in header
   - If on main branch: Open branch creation dialog
   - If on non-main branch: Directly enter edit mode
   - Header UI changes to edit mode layout

2. **Edit Mode Header Layout**:
   ```
   ┌─────────────────────────────────────────────────────────────────────────────┐
   │ Design System Name - company/design-system-ios@feature/design-update - Editing │
   ├─────────────────────────────────────────────────────────────────────────────┤
   │ [Cancel] [Save] [Submit for Review]  Editing: Platform Extension - iOS     │
   └─────────────────────────────────────────────────────────────────────────────┘
   ```

3. **Edit Actions**:
   - **Save Button**: Uses existing commit workflow, returns to view mode
   - **Submit for Review Button**: Reuses existing pull request workflow, returns to view mode
   - **Cancel Button**: Reverts changes and returns to view mode

4. **Exit Edit Mode**:
   - After any edit action (Save/Submit/Cancel), automatically return to view mode
   - Header UI reverts to view mode layout
   - Platform/theme dropdowns become available again

### **7. Source Switching with Branch Management**
1. **No Changes Made**:
   - User switches platform/theme via dropdowns
   - System automatically resets to main branch for new source
   - No warning dialog shown
   - Edit mode is exited (returns to view mode)

2. **Changes Made**:
   - User attempts to switch platform/theme via dropdowns
   - System detects `changeCount > 0`
   - Warning dialog appears: "You have X unsaved changes. Switching sources will reset to main branch and discard changes. Continue?"
   - If user confirms: Reset to main branch, discard changes, switch source, exit edit mode
   - If user cancels: Stay on current source and branch

3. **Branch Reset Logic**:
   - Core → Platform: Reset to main branch of platform repository
   - Core → Theme: Reset to main branch of theme repository
   - Platform → Core: Reset to main branch of core repository
   - Platform → Theme: Reset to main branch of theme repository
   - Theme → Core: Reset to main branch of core repository
   - Theme → Platform: Reset to main branch of platform repository

## Validation Rules

### **Theme Override Validation Rules**
1. **Token Existence**: The target token must exist in the current merged tokens array
2. **Not Omitted**: The target token must not be omitted by any platform extension
3. **Themeable Check**: Only tokens with `themeable: true` can be edited in theme mode
4. **Value Override Only**: Theme overrides can only modify token values, not structure

### **Platform Extension Rules**
1. **Can Omit**: Platforms can omit tokens from the merged result
2. **Can Add**: Platforms can add new tokens to the merged result
3. **Can Modify**: Platforms can modify existing token properties
4. **Structure Control**: Platforms have final say on what tokens exist

### **Core Data Rules**
1. **Foundation**: Core data provides the base foundation
2. **Reference Point**: All platform modifications and theme overrides are based on core data
3. **Validation Source**: Core data provides the reference for validation

## Success Criteria

1. ✅ Clear distinction between VIEW (merged) and EDIT (source) data
2. ✅ Automatic override creation when editing platform/theme data
3. ✅ Theme editing restricted to `themeable: true` tokens only
4. ✅ Change tracking relative to edit source only
5. ✅ Commit target always matches edit source
6. ✅ Schema validation per edit source with clear error messages
7. ✅ Unified edit mode with automatic target determination
8. ✅ Clear UI indicators for current edit source in save/commit dialogs
9. ✅ Integration with existing permission management
10. ✅ Leverage existing data merging and transformation infrastructure
11. **NEW**: Two-tier permission system (view-only vs editable users)
12. **NEW**: Enhanced edit mode UI with repository URL display
13. **NEW**: Source-specific branch management with change detection
14. **NEW**: Automatic return to view mode after edit actions
15. **NEW**: Warning dialogs for unsaved changes during source switching

## Testing Strategy

### **Unit Tests**
1. Test `OverrideManager` override creation logic
2. Test `SchemaValidationService` source-specific validation
3. Test `ChangeTrackingService` source-specific change tracking
4. Test `DataTransformationService` override integration
5. **NEW**: Test source switching logic with change detection
6. **NEW**: Test edit mode UI state management
7. **NEW**: Test two-tier permission system

### **Integration Tests**
1. Test complete edit workflow for each source type
2. Test override creation and persistence
3. Test schema validation during editing
4. Test permission-based access control
5. **NEW**: Test source switching with branch reset logic
6. **NEW**: Test warning dialog workflows
7. **NEW**: Test automatic return to view mode

### **End-to-End Tests**
1. Test platform extension editing workflow
2. Test theme override editing workflow
3. Test mixed context (platform + theme) workflow
4. Test error handling and validation feedback
5. **NEW**: Test view-only user experience
6. **NEW**: Test editable user workflow transitions
7. **NEW**: Test branch creation and management workflows

## Migration Notes

- Existing URL-based access remains unchanged
- Current data merging logic is preserved and enhanced
- Existing permission management is leveraged
- Current storage structure is extended, not replaced
- All existing functionality preserved and enhanced
- **NEW**: Enhanced UI components build on existing infrastructure
- **NEW**: Branch management extends current GitHub integration

## Future Enhancements

- **Repository Scaffolding**: Standardize repository structures for better performance
- **Advanced Search**: Add filters for stars, forks, last updated, etc.
- **Batch Operations**: Support for loading multiple design systems
- **Offline Support**: Cache design systems for offline viewing
- **Conflict Resolution**: Handle conflicts when same token is modified in multiple sources
- **Override History**: Track and visualize override creation history
- **Preview Mode**: Show override preview before committing changes
- **NEW**: Advanced branch management features
- **NEW**: Enhanced permission granularity
- **NEW**: Real-time collaboration features 
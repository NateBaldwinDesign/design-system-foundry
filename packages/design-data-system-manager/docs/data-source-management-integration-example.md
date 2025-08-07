# Data Source Management Integration Example

## Overview
This document demonstrates how all the implemented components work together to provide the EDIT vs VIEW data distinction functionality.

## Complete Workflow Example

### 1. User Selects Platform for Editing

```typescript
// User selects "iOS" platform in the Header dropdown
const dataSourceManager = DataSourceManager.getInstance();

// This automatically updates the edit context
await dataSourceManager.switchToPlatform('ios');

// The edit context is now:
// {
//   isActive: false,
//   sourceType: 'platform-extension',
//   sourceId: 'ios',
//   targetRepository: { fullName: 'company/design-system-ios', ... },
//   validationSchema: 'platform-extension'
// }

// The view context is now:
// {
//   isMerged: true,
//   mergeSources: ['core', 'platform-extension'],
//   displayData: 'platform-only'
// }
```

### 2. User Enters Edit Mode

```typescript
// User clicks "Edit" button in Header
dataSourceManager.enterEditMode();

// Edit context is now active:
// {
//   isActive: true,
//   sourceType: 'platform-extension',
//   sourceId: 'ios',
//   targetRepository: { fullName: 'company/design-system-ios', ... },
//   validationSchema: 'platform-extension'
// }

// NEW: Header UI changes to edit mode layout
// Header now shows: "Design System Name - company/design-system-ios@feature/design-update - Editing"
// Platform/theme dropdowns are replaced with: "Editing: Platform Extension - iOS"
// Edit buttons appear: [Cancel] [Save] [Submit for Review]
```

### 3. User Modifies a Token

```typescript
// User modifies a token value in the UI
const tokenId = 'color-primary';
const originalValue = { valuesByMode: [{ modeIds: ['light'], value: '#007AFF' }] };
const newValue = { valuesByMode: [{ modeIds: ['light'], value: '#FF3B30' }] };

// The system automatically tracks this as an override
const overrideManager = OverrideManager.getInstance();
const changeTrackingService = ChangeTrackingService.getInstance();
const enhancedDataMerger = EnhancedDataMerger.getInstance();

// Track the override change
overrideManager.trackOverrideChanges(tokenId, originalValue, newValue, 'platform-extension', 'ios');
changeTrackingService.trackOverrideChanges(tokenId, originalValue, newValue, 'platform-extension', 'ios');
enhancedDataMerger.trackOverride(tokenId, originalValue, newValue, 'platform-extension', 'ios');

// Store pending overrides
const pendingOverrides = [{ tokenId, override: newValue }];
StorageService.setPendingOverrides('platform-extension', 'ios', pendingOverrides);

// Add to override history
StorageService.addOverrideHistoryEntry({
  tokenId,
  sourceType: 'platform-extension',
  sourceId: 'ios',
  action: 'modified'
});

// NEW: Change count is now > 0, which affects source switching behavior
const changeCount = changeTrackingService.getChangeCount(); // Returns 1
```

### 4. User Attempts to Switch Sources (with changes)

```typescript
// NEW: User tries to switch from iOS platform to Android platform
const handleSourceSwitch = async (newSource: 'platform-extension', newSourceId: 'android') => {
  const changeCount = ChangeTrackingService.getChangeCount();
  
  if (changeCount > 0) {
    // Show warning dialog
    const confirmed = await showWarningDialog({
      title: 'Unsaved Changes',
      message: `You have ${changeCount} unsaved changes. Switching sources will reset to main branch and discard changes. Continue?`,
      confirmText: 'Continue',
      cancelText: 'Stay Here'
    });
    
    if (!confirmed) {
      // User cancels - stay on current source
      return;
    }
  }
  
  // User confirms - proceed with source switch
  // Reset to main branch for new source
  await resetToMainBranch(newSource, newSourceId);
  
  // Exit edit mode
  dataSourceManager.exitEditMode();
  
  // Switch to new source
  await dataSourceManager.switchToPlatform(newSourceId);
  
  // NEW: Header UI reverts to view mode
  // Header now shows: "Design System Name (main) - Edit Access"
  // Platform/theme dropdowns become available again
  // Edit button appears
};
```

### 5. User Saves Changes

```typescript
// User clicks "Save" button in Header
const dataTransformationService = DataTransformationService.getInstance();

// Get current presentation data (merged view)
const presentationData = DataManager.getCurrentPresentationData();

// Get pending overrides
const pendingOverrides = StorageService.getPendingOverrides('platform-extension', 'ios');

// Transform with overrides to storage format
const storageData = dataTransformationService.transformWithOverrides(
  presentationData,
  'platform-extension',
  'ios',
  pendingOverrides
);

// Validate the final storage data
const finalValidation = SchemaValidationService.validateForEditSource(
  storageData,
  'platform-extension',
  'ios'
);

if (finalValidation.isValid) {
  // Save to storage
  StorageService.setPlatformExtensionData('ios', storageData as PlatformExtension);
  
  // Clear pending overrides
  StorageService.clearPendingOverrides('platform-extension', 'ios');
  changeTrackingService.clearOverrideChanges();
  enhancedDataMerger.commitOverrides();
  
  // NEW: Automatically exit edit mode
  dataSourceManager.exitEditMode();
  
  // NEW: Header UI reverts to view mode
  // Header now shows: "Design System Name (feature/design-update) - Edit Access"
  // Platform/theme dropdowns become available again
  // Edit button appears
  
  console.log('Changes saved successfully!');
} else {
  console.error('Final validation failed:', finalValidation.errors);
}
```

### 6. User Submits for Review

```typescript
// NEW: User clicks "Submit for Review" button in Header
// This reuses the existing pull request workflow

const handleSubmitForReview = async () => {
  // Use existing GitHubSaveDialog with pull request mode
  const saveDialog = GitHubSaveDialog({
    saveMode: 'pullRequest',
    onSuccess: (result) => {
      // NEW: Automatically exit edit mode after successful PR creation
      dataSourceManager.exitEditMode();
      
      // NEW: Header UI reverts to view mode
      // Header now shows: "Design System Name (feature/design-update) - Edit Access"
      // Platform/theme dropdowns become available again
      // Edit button appears
      
      // Open PR in new tab
      if (result.pullRequestUrl) {
        window.open(result.pullRequestUrl, '_blank');
      }
    }
  });
  
  saveDialog.open();
};
```

### 7. User Cancels Changes

```typescript
// NEW: User clicks "Cancel" button in Header
const handleCancel = async () => {
  // Revert changes (same as "Refresh (pull)")
  await dataSourceManager.refreshCurrentData();
  
  // Clear pending overrides
  StorageService.clearPendingOverrides('platform-extension', 'ios');
  changeTrackingService.clearOverrideChanges();
  enhancedDataMerger.discardOverrides();
  
  // Exit edit mode
  dataSourceManager.exitEditMode();
  
  // NEW: Header UI reverts to view mode
  // Header now shows: "Design System Name (feature/design-update) - Edit Access"
  // Platform/theme dropdowns become available again
  // Edit button appears
};
```

### 8. Two-Tier Permission System

```typescript
// NEW: View-Only User Experience
const viewOnlyUser = {
  permissionLevel: 'view-only',
  canEdit: false,
  canSwitchSources: true
};

// View-only user can switch between platforms and themes
const handleViewOnlySourceSwitch = async (newSource: 'platform-extension', newSourceId: 'android') => {
  // No change detection needed for view-only users
  await dataSourceManager.switchToPlatform(newSourceId);
  
  // Header shows: "Design System Name (main) - View Only"
  // Platform/theme dropdowns remain functional
  // No edit buttons are available
  // All UI views have editing actions hidden
};

// NEW: Editable User Experience
const editableUser = {
  permissionLevel: 'editable',
  canEdit: true,
  canSwitchSources: true
};

// Editable user in view mode
const handleEditableViewMode = () => {
  // Header shows: "Design System Name (main) - Edit Access"
  // Platform/theme dropdowns are functional
  // Edit button is available
  // All UI views have editing actions hidden
};

// Editable user in edit mode
const handleEditableEditMode = () => {
  // Header shows: "Design System Name - company/design-system-ios@feature/design-update - Editing"
  // Platform/theme dropdowns are replaced with edit source indicator
  // Edit buttons: [Cancel] [Save] [Submit for Review]
  // All UI views show editing actions
};
```

### 9. Edit Mode UI State Management

```typescript
// NEW: Header UI state management for edit mode
const headerUIState = {
  viewMode: {
    title: "Design System Name (main) - Edit Access",
    showDropdowns: true,
    showEditButton: true,
    showSaveButtons: false,
    showCancelButton: false,
    showSubmitButton: false
  },
  
  editMode: {
    title: "Design System Name - company/design-system-ios@feature/design-update - Editing",
    showDropdowns: false,
    showEditButton: false,
    showSaveButtons: true,
    showCancelButton: true,
    showSubmitButton: true,
    editSourceIndicator: "Editing: Platform Extension - iOS"
  },
  
  viewOnlyMode: {
    title: "Design System Name (main) - View Only",
    showDropdowns: true,
    showEditButton: false,
    showSaveButtons: false,
    showCancelButton: false,
    showSubmitButton: false
  }
};

// NEW: Edit source indicator component
const EditSourceIndicator = ({ sourceType, sourceId, sourceName }) => {
  const getIndicatorText = () => {
    switch (sourceType) {
      case 'core':
        return `Editing: Core Design System`;
      case 'platform-extension':
        return `Editing: Platform Extension - ${sourceName}`;
      case 'theme-override':
        return `Editing: Theme Override - ${sourceName}`;
      default:
        return `Editing: ${sourceName}`;
    }
  };
  
  return (
    <Box px={3} py={1} bg="blue.50" borderRadius="md" border="1px solid" borderColor="blue.200">
      <Text fontSize="sm" fontWeight="medium" color="blue.800">
        {getIndicatorText()}
      </Text>
    </Box>
  );
};
```

### 4. Validation During Editing

```typescript
// Before applying changes, validate the override
const validationResult = SchemaValidationService.validateOverrideCreation(
  tokenId,
  newValue,
  'platform-extension',
  'ios'
);

if (!validationResult.isValid) {
  // Show error to user
  console.error('Validation failed:', validationResult.errors);
  return;
}

// Also validate the complete data for the edit source
const currentData = DataManager.getCurrentData();
const editMode = dataSourceManager.getCurrentEditMode();
const sourceValidation = SchemaValidationService.validateForEditSource(
  currentData,
  editMode.sourceType,
  editMode.sourceId
);
```

### 5. User Saves Changes

```typescript
// User clicks "Save" button in Header
const dataTransformationService = DataTransformationService.getInstance();

// Get current presentation data (merged view)
const presentationData = DataManager.getCurrentPresentationData();

// Get pending overrides
const pendingOverrides = StorageService.getPendingOverrides('platform-extension', 'ios');

// Transform with overrides to storage format
const storageData = dataTransformationService.transformWithOverrides(
  presentationData,
  'platform-extension',
  'ios',
  pendingOverrides
);

// Validate the final storage data
const finalValidation = SchemaValidationService.validateForEditSource(
  storageData,
  'platform-extension',
  'ios'
);

if (finalValidation.isValid) {
  // Save to storage
  StorageService.setPlatformExtensionData('ios', storageData as PlatformExtension);
  
  // Clear pending overrides
  StorageService.clearPendingOverrides('platform-extension', 'ios');
  changeTrackingService.clearOverrideChanges();
  enhancedDataMerger.commitOverrides();
  
  // Exit edit mode
  dataSourceManager.exitEditMode();
  
  console.log('Changes saved successfully!');
} else {
  console.error('Final validation failed:', finalValidation.errors);
}
```

### 6. Change Tracking and Commit

```typescript
// Get changes relative to edit source only
const editSourceChanges = changeTrackingService.getChangesForEditSource(
  'platform-extension',
  'ios'
);

// This will only show changes made to the iOS platform extension
console.log('Changes for iOS platform:', editSourceChanges);

// When committing to GitHub, only commit the platform extension file
const targetRepository = dataSourceManager.getCurrentEditMode().targetRepository;
const commitData = StorageService.getPlatformExtensionData('ios');

// Commit to the correct repository
await GitHubApiService.commitFile(
  targetRepository.fullName,
  targetRepository.filePath,
  JSON.stringify(commitData, null, 2),
  'Update iOS platform overrides'
);
```

## Component Integration Summary

### Data Flow Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Header UI     │    │ DataSourceMgr   │    │  OverrideMgr    │
│                 │    │                 │    │                 │
│ • Platform      │───▶│ • Edit Context  │───▶│ • Auto Override │
│   Selection     │    │ • View Context  │    │   Creation      │
│ • Edit Mode     │    │ • Source        │    │ • Validation    │
│   Indicators    │    │   Management    │    │ • Preview       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ EnhancedData    │    │ ChangeTracking  │    │ DataTransform   │
│ Merger          │    │ Service         │    │ Service         │
│                 │    │                 │    │                 │
│ • Override      │    │ • Source-       │    │ • Transform     │
│   Tracking      │    │   Specific      │    │   with Overrides│
│ • Merge with    │    │   Changes       │    │ • Extract       │
│   Overrides     │    │ • Override      │    │   Overrides     │
│                 │    │   Tracking      │    │ • Merge to      │
│                 │    │                 │    │   Storage       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ StorageService  │    │ SchemaValidation│    │ GitHub API      │
│                 │    │ Service         │    │ Service         │
│                 │    │                 │    │                 │
│ • Override      │    │ • Source-       │    │ • Commit to     │
│   Persistence   │    │   Specific      │    │   Correct Repo  │
│ • Edit Context  │    │   Validation    │    │ • Permission    │
│ • History       │    │ • Override      │    │   Checks        │
│   Tracking      │    │   Validation    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Integration Points

1. **Header → DataSourceManager**: Platform/theme selection triggers edit context updates
2. **DataSourceManager → OverrideManager**: Edit context determines override creation rules
3. **OverrideManager → ChangeTrackingService**: Override changes are tracked for commit
4. **EnhancedDataMerger → DataTransformationService**: Override tracking affects data transformation
5. **DataTransformationService → StorageService**: Transformed data with overrides is persisted
6. **SchemaValidationService → All Components**: Validation ensures data integrity
7. **GitHub API Service → DataSourceManager**: Commit target is determined by edit context

### Benefits of This Architecture

1. **Clear Separation**: EDIT data (source-specific) vs VIEW data (merged)
2. **Automatic Override Creation**: System automatically creates appropriate overrides
3. **Source-Specific Validation**: Each edit source validates against its schema
4. **Change Tracking**: Only changes relative to edit source are tracked
5. **Correct Commit Targets**: Changes are committed to the correct repository
6. **UI Feedback**: Clear indicators show current edit source and pending overrides
7. **History Tracking**: Override creation history is maintained
8. **Permission Integration**: Edit permissions are checked per repository

### Error Handling

```typescript
// Example: User tries to edit non-themeable token in theme mode
const tokenId = 'spacing-large';
const isThemeable = overrideManager.isTokenThemeable(tokenId, coreData);

if (!isThemeable && editMode.sourceType === 'theme-override') {
  const validation = SchemaValidationService.validateThemeEdit(tokenId, isThemeable);
  
  // Show error to user
  toast({
    title: 'Cannot Edit Token',
    description: validation.errors[0],
    status: 'error'
  });
  
  return;
}
```

This integration example demonstrates how all the implemented components work together to provide a seamless EDIT vs VIEW data distinction experience while maintaining data integrity and proper validation. 
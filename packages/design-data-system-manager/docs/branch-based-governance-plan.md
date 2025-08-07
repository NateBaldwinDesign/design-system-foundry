# Branch-Based Governance Plan

## Overview

This plan implements app-based governance to protect users from making mistakes, particularly around protecting the main branch of repositories. The system ensures that users cannot directly edit the main branch and must create feature branches for any changes.

## Core Requirements

### 1. Two-Tier Permission System
- **View-Only Users**: Can view all merged data scenarios but cannot edit any data
  - Can switch between platforms and themes to view different merged data scenarios
  - No edit buttons or editing capabilities are available
  - Platform and theme dropdowns remain functional for data viewing
- **Editable Users**: Can switch between View and Edit modes
  - Default mode is always "View" (shows "Edit" button in header)
  - Can enter "Edit" mode to make changes
  - Have access to all editing workflows and branch management

### 2. Default View-Only Mode
- UI is always in view-only mode by default, regardless of user repository permissions
- Users cannot make changes without explicitly entering edit mode
- All UI views have editing actions hidden in view mode

### 3. Edit Button Workflow
- If user has edit access, show an "Edit" button in the Header
- Two separate workflows when "Edit" is clicked:
  - **Main Branch**: Open "Create new branch" dialog → User enters branch name → App switches to new branch → App enters "Edit" state
  - **Non-Main Branch**: Directly switch app to "Edit" state

### 4. Edit State Management
- **Header UI Changes in Edit Mode**:
  - "Edit" button becomes "Save" and "Submit for Review" buttons
  - "Cancel" button appears to return to view mode
  - Platform and theme dropdowns are **replaced** with clear indication of which source is being edited
  - Branch information changes to show the specific repository URL + branch being edited
  - Header displays format: `"Design System Name - company/repo-name@branch-name - Editing"`

### 5. Source-Specific Branch Management
- **Branch Reset Logic**: When switching between sources (core/platform/theme):
  - **No Changes Made**: Automatically switch to main branch of the new source
  - **Changes Made** (change log has count > 0): Show warning dialog before switching
  - **Warning Dialog**: "You have unsaved changes on the current branch. Switching sources will reset to main branch and discard changes. Continue?"
  - **Edit Mode Reset**: Switching sources always returns to View mode

## Implementation Phases

### Phase 1: Core State Management

#### 1.1 App-Level Edit State
- Add `isEditMode` state to `App.tsx` (separate from `hasEditPermissions`)
- Add `currentBranch` state to track the active branch
- Add `editModeBranch` state to track which branch edit mode was initiated on
- Add `userPermissionLevel` state: 'view-only' | 'editable'
- Update URL parameter handling to include branch information

#### 1.2 Header State Updates
- Modify `getTitleAndSubtitle()` to show edit state with repository URL
- Add "Edit" button when user has editable permissions but not in edit mode
- Add "Save", "Submit for Review", and "Cancel" buttons when in edit mode
- **NEW**: Replace platform/theme dropdowns with edit source indicator in edit mode
- **NEW**: Show repository URL + branch in edit mode instead of just branch name

### Phase 2: Enhanced Edit Mode UI

#### 2.1 Edit Mode Header Display
```typescript
// View Mode Header
"Design System Name (main) - Edit Access"

// Edit Mode Header  
"Design System Name - company/design-system-ios@feature/design-update - Editing"
```

#### 2.2 Edit Source Indicator
- **Replace dropdowns** with clear text indicator:
  - Core: "Editing: Core Design System"
  - Platform: "Editing: Platform Extension - iOS"
  - Theme: "Editing: Theme Override - Dark Theme"
- **Show target repository**: Display the specific repository being edited
- **Show current branch**: Display the feature branch being edited

#### 2.3 Edit Mode Buttons
- **Save Button**: Uses existing commit workflow
- **Submit for Review Button**: Reuses existing "Create Pull Request" workflow and dialog
- **Cancel Button**: Reverts changes and returns to view mode
- **Button Layout**: `[Cancel] [Save] [Submit for Review]`

### Phase 3: Source Switching Logic

#### 3.1 Change Detection
- Track changes using existing `ChangeTrackingService`
- Check `changeCount` before allowing source switching
- Show warning dialog if `changeCount > 0`

#### 3.2 Branch Reset Logic
```typescript
const handleSourceSwitch = async (newSource: 'core' | 'platform' | 'theme', sourceId?: string) => {
  const changeCount = ChangeTrackingService.getChangeCount();
  
  if (changeCount > 0) {
    // Show warning dialog
    const confirmed = await showWarningDialog({
      title: 'Unsaved Changes',
      message: `You have ${changeCount} unsaved changes. Switching sources will reset to main branch and discard changes. Continue?`,
      confirmText: 'Continue',
      cancelText: 'Stay Here'
    });
    
    if (!confirmed) return;
  }
  
  // Reset to main branch for new source
  await resetToMainBranch(newSource, sourceId);
  
  // Exit edit mode
  exitEditMode();
  
  // Switch to new source
  await switchToSource(newSource, sourceId);
};
```

#### 3.3 Automatic Return to View Mode
- **After Save**: Automatically return to view mode
- **After Submit for Review**: Automatically return to view mode
- **After Cancel**: Return to view mode
- **After Source Switch**: Always return to view mode

### Phase 4: Branch Creation Dialog

#### 4.1 Create BranchDialog Component
- Input field with placeholder: `{githubUser.login}/design-update-{timestamp}`
- Validation for GitHub branch naming rules:
  - No spaces, no special characters except `-`, `_`, `/`
  - Cannot start with `-` or `.`
  - Cannot contain `..`, `~`, `^`, `:`, `?`, `*`, `[`
  - Cannot end with `/` or `.`
- Display current branch being branched from
- **NEW**: Display target repository information
- Real-time validation and branch existence check
- Error handling for creation failures

#### 4.2 Branch Creation Logic
- Check if branch exists before creating
- Create branch on GitHub via API
- Update URL parameters with new branch
- Switch app to edit mode
- Load data from new branch

### Phase 5: Edit Mode Workflow

#### 5.1 Edit Button Logic
- **Main Branch**: Open branch creation dialog
- **Non-Main Branch**: Directly switch to edit mode
- Update `currentBranch` and `editModeBranch` states

#### 5.2 Save Button Integration
- Use existing `GitHubSaveDialog` component
- Add branch name information to save dialog
- Maintain current commit message functionality
- **NEW**: Automatically return to view mode after successful save

#### 5.3 Submit for Review Button
- **NEW**: Reuse existing "Create Pull Request" workflow and dialog
- Use existing `GitHubSaveDialog` with `saveMode: 'pullRequest'`
- **NEW**: Automatically return to view mode after successful PR creation

#### 5.4 Cancel Button
- **NEW**: Revert changes (same as "Refresh (pull)")
- Switch back to view mode
- Reset `isEditMode` and `editModeBranch` states

### Phase 6: URL Parameter Integration

#### 6.1 URL Structure
- Current: `?repo=owner/repo&path=file.json&branch=main`
- Enhanced: `?repo=owner/repo&path=file.json&branch=feature/design-update`

#### 6.2 URL State Management
- Update URL when switching branches
- Load correct branch from URL parameters
- Manual URL branch changes reset to View mode (not edit mode)

### Phase 7: Error Handling & UX

#### 7.1 Branch Creation Errors
- Toast errors for API failures
- Keep user in view mode on main branch
- Clear error states

#### 7.2 Validation Feedback
- Real-time input validation
- Branch existence checking
- User-friendly error messages

#### 7.3 Source Switching Warnings
- **NEW**: Warning dialog for unsaved changes
- Clear messaging about what will be lost
- Option to stay on current source

### Phase 8: State Persistence

#### 8.1 Edit Mode Persistence
- Persist edit state across page refreshes
- Tie edit state to specific branch
- Handle URL-based navigation

#### 8.2 Branch State Management
- Track current branch in app state
- Sync with URL parameters
- Handle branch switching scenarios

## Key Components to Modify/Create

### New Components
1. `BranchCreationDialog.tsx` - Branch creation workflow with timestamp
2. `BranchValidationUtils.ts` - GitHub branch naming validation
3. **NEW**: `SourceSwitchWarningDialog.tsx` - Warning dialog for unsaved changes
4. **NEW**: `EditSourceIndicator.tsx` - Replace dropdowns in edit mode

### Modified Components
1. `App.tsx` - Add edit mode state management and permission levels
2. `Header.tsx` - Add Edit/Save/Submit/Cancel buttons and edit source indicator
3. `GitHubApiService.ts` - Add branch creation and existence checking
4. `DataSourceManager.ts` - Handle branch switching and source management
5. `GitHubSaveDialog.tsx` - Add branch name information
6. **NEW**: `PlatformDropdown.tsx` - Hide in edit mode
7. **NEW**: `ThemeDropdown.tsx` - Hide in edit mode

### Integration Points
1. URL parameter handling in `App.tsx`
2. GitHub menu integration in `Header.tsx`
3. Save dialog integration with branch info
4. Error handling and toast notifications
5. **NEW**: Change tracking integration for source switching warnings

## Implementation Details

### Branch Name Format
- Placeholder: `{githubUser.login}/design-update-{YYYY-MM-DD-HH-MM}`
- Example: `nbaldwin/design-update-2024-01-15-14-30`

### URL Behavior
- Manual URL changes → Reset to View mode
- Programmatic branch switching → Maintain edit state if applicable
- Branch creation → Update URL and enter edit mode

### Save Dialog Enhancement
- Display current branch name prominently
- Show commit target branch information
- Maintain existing commit message functionality

### Edit Mode UI Layout
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Design System Name - company/design-system-ios@feature/design-update - Editing │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Cancel] [Save] [Submit for Review]  Editing: Platform Extension - iOS     │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Technical Decisions

### State Management
- Edit mode state is separate from permissions state
- Branch information is tracked at app level
- URL parameters drive branch loading
- **NEW**: Permission levels determine available UI elements

### Error Handling
- Graceful degradation on branch creation failures
- Clear user feedback for validation errors
- Fallback to view mode on critical errors
- **NEW**: Warning dialogs for destructive operations

### UX Considerations
- **NEW**: Clear visual distinction between view and edit modes
- **NEW**: Repository URL display in edit mode for clarity
- **NEW**: Edit source indicator replaces dropdowns in edit mode
- Maintain existing save dialog functionality
- **NEW**: Three-button layout for edit actions

## Success Criteria

1. Users cannot edit main branch directly
2. Branch creation workflow is smooth and intuitive
3. Edit state is clearly communicated in the UI
4. URL parameters correctly reflect current branch
5. Error handling provides clear feedback
6. State persistence works across page refreshes
7. **NEW**: View-only users can view all data scenarios but cannot edit
8. **NEW**: Source switching respects unsaved changes
9. **NEW**: Edit mode UI clearly shows target repository and branch
10. **NEW**: Save and Submit for Review automatically return to view mode 
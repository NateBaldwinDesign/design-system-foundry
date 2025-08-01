# Branch-Based Governance Plan

## Overview

This plan implements app-based governance to protect users from making mistakes, particularly around protecting the main branch of repositories. The system ensures that users cannot directly edit the main branch and must create feature branches for any changes.

## Core Requirements

### 1. Default View-Only Mode
- UI is always in view-only mode by default, regardless of user repository permissions
- Users cannot make changes without explicitly entering edit mode

### 2. Edit Button Workflow
- If user has edit access, show an "Edit" button in the Header
- Two separate workflows when "Edit" is clicked:
  - **Main Branch**: Open "Create new branch" dialog → User enters branch name → App switches to new branch → App enters "Edit" state
  - **Non-Main Branch**: Directly switch app to "Edit" state

### 3. Edit State Management
- "Edit" button becomes "Save" button (replaces existing "Save (commit)" in GitHub menu)
- "Cancel" button appears to revert changes and return to view mode
- Header displays "(branch) - Editing" vs "(branch) - Edit Access"

## Implementation Phases

### Phase 1: Core State Management

#### 1.1 App-Level Edit State
- Add `isEditMode` state to `App.tsx` (separate from `hasEditPermissions`)
- Add `currentBranch` state to track the active branch
- Add `editModeBranch` state to track which branch edit mode was initiated on
- Update URL parameter handling to include branch information

#### 1.2 Header State Updates
- Modify `getTitleAndSubtitle()` to show edit state: `"(branch) - Editing"` vs `"(branch) - Edit Access"`
- Add "Edit" button when user has permissions but not in edit mode
- Add "Save" button when in edit mode (replaces "Save (commit)")
- Add "Cancel" button when in edit mode

### Phase 2: Branch Creation Dialog

#### 2.1 Create BranchDialog Component
- Input field with placeholder: `{githubUser.login}/design-update-{timestamp}`
- Validation for GitHub branch naming rules:
  - No spaces, no special characters except `-`, `_`, `/`
  - Cannot start with `-` or `.`
  - Cannot contain `..`, `~`, `^`, `:`, `?`, `*`, `[`
  - Cannot end with `/` or `.`
- Display current branch being branched from
- Real-time validation and branch existence check
- Error handling for creation failures

#### 2.2 Branch Creation Logic
- Check if branch exists before creating
- Create branch on GitHub via API
- Update URL parameters with new branch
- Switch app to edit mode
- Load data from new branch

### Phase 3: Edit Mode Workflow

#### 3.1 Edit Button Logic
- **Main Branch**: Open branch creation dialog
- **Non-Main Branch**: Directly switch to edit mode
- Update `currentBranch` and `editModeBranch` states

#### 3.2 Save Button Integration
- Replace existing "Save (commit)" GitHub menu option
- Use existing `GitHubSaveDialog` component
- Add branch name information to save dialog
- Maintain current commit message functionality

#### 3.3 Cancel Button
- Revert changes (same as "Refresh (pull)")
- Switch back to view mode
- Reset `isEditMode` and `editModeBranch` states

### Phase 4: URL Parameter Integration

#### 4.1 URL Structure
- Current: `?repo=owner/repo&path=file.json&branch=main`
- Enhanced: `?repo=owner/repo&path=file.json&branch=feature/design-update`

#### 4.2 URL State Management
- Update URL when switching branches
- Load correct branch from URL parameters
- Manual URL branch changes reset to View mode (not edit mode)

### Phase 5: Error Handling & UX

#### 5.1 Branch Creation Errors
- Toast errors for API failures
- Keep user in view mode on main branch
- Clear error states

#### 5.2 Validation Feedback
- Real-time input validation
- Branch existence checking
- User-friendly error messages

### Phase 6: State Persistence

#### 6.1 Edit Mode Persistence
- Persist edit state across page refreshes
- Tie edit state to specific branch
- Handle URL-based navigation

#### 6.2 Branch State Management
- Track current branch in app state
- Sync with URL parameters
- Handle branch switching scenarios

## Key Components to Modify/Create

### New Components
1. `BranchCreationDialog.tsx` - Branch creation workflow with timestamp
2. `BranchValidationUtils.ts` - GitHub branch naming validation

### Modified Components
1. `App.tsx` - Add edit mode state management
2. `Header.tsx` - Add Edit/Save/Cancel buttons and state display
3. `GitHubApiService.ts` - Add branch creation and existence checking
4. `DataSourceManager.ts` - Handle branch switching
5. `GitHubSaveDialog.tsx` - Add branch name information

### Integration Points
1. URL parameter handling in `App.tsx`
2. GitHub menu integration in `Header.tsx`
3. Save dialog integration with branch info
4. Error handling and toast notifications

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

## Technical Decisions

### State Management
- Edit mode state is separate from permissions state
- Branch information is tracked at app level
- URL parameters drive branch loading

### Error Handling
- Graceful degradation on branch creation failures
- Clear user feedback for validation errors
- Fallback to view mode on critical errors

### UX Considerations
- No additional visual indicators for edit mode (per user request)
- Maintain existing save dialog functionality
- Clear distinction between view and edit states in header

## Success Criteria

1. Users cannot edit main branch directly
2. Branch creation workflow is smooth and intuitive
3. Edit state is clearly communicated in the UI
4. URL parameters correctly reflect current branch
5. Error handling provides clear feedback
6. State persistence works across page refreshes 
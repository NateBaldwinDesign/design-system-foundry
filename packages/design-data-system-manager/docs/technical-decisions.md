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
- **Chakra UI v2** is the standard for all UI primitives (e.g., `Select`, `Button`, `Box`, `FormControl`).
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
- Use Chakra UI v2 for all UI primitives and controls.
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

# Resolved Value Type Handling in UI Components

## Context
The UI components currently handle resolved value types inconsistently, sometimes using the `id` field and sometimes using the `type` field. This creates potential issues with schema compliance and data integrity.

## Decision
Implement a clear separation between data operations (using `id`) and UI operations (using `type`):

1. **Data Operations**
   - All data storage, validation, and API operations MUST use `resolvedValueTypeId`
   - All references to value types in data structures MUST use `id`
   - No direct usage of `type` enum values in data operations

2. **UI Operations**
   - Use `type` field for:
     - Grouping similar value types
     - Selecting appropriate UI components
     - Formatting values for display
     - Determining default values
   - Use `id` field for:
     - Data validation
     - API operations
     - State management
     - Schema compliance

3. **Implementation Pattern**
   - Create a utility function to map between IDs and types
   - Use type information only for UI/display purposes
   - Use IDs for all data operations and storage
   - Maintain a registry of value type handlers for different operations

### Rationale
- **Schema Compliance:** The schema defines both `id` and `type` fields for different purposes
- **Data Integrity:** Using `id` for data operations ensures referential integrity
- **UI Flexibility:** Using `type` for UI operations provides better grouping and display options
- **Maintainability:** Clear separation of concerns between data and UI operations

### Outcome
- Components will use `resolvedValueTypeId` for all data operations
- UI components will use `type` field for display and formatting
- A utility function will handle mapping between IDs and types
- Value type handlers will support both standard and custom types 

# Unified Storage Management Patterns

## Context
The application currently uses multiple inconsistent patterns for managing local storage and state synchronization:
- Direct `StorageService` calls in components
- App-level state management with periodic refresh
- Component-specific refresh logic with window focus listeners
- Inconsistent state update patterns across different views

## Decision
Implement a unified storage management pattern based on the **App-Level State Management with Centralized Updates** approach, which provides the best balance of consistency, performance, and user experience while avoiding infinite loops.

### Unified Pattern: App-Level State Management with Centralized Updates

#### Core Principles
1. **Single Source of Truth**: App.tsx maintains all global state and syncs with localStorage
2. **One-Time Initialization**: Data is loaded from storage once on mount, not continuously
3. **Centralized Updates**: All mutations go through centralized update handlers
4. **Props-Based Communication**: Components receive state as props and trigger updates through callbacks
5. **No Periodic Refresh**: Eliminates infinite loops and performance issues

#### Implementation Pattern

**App.tsx State Management:**
```tsx
// Global state for all data types
const [tokens, setTokens] = useState<ExtendedToken[]>([]);
const [collections, setCollections] = useState<TokenCollection[]>([]);
// ... other state

// One-time initialization on mount
useEffect(() => {
  // Load all data from storage once on mount
  const storedCollections = StorageService.getCollections();
  const storedTokens = StorageService.getTokens();
  // ... load other data types
  
  // Only set state if we have data and it's different from current state
  if (storedCollections.length > 0 && JSON.stringify(storedCollections) !== JSON.stringify(collections)) {
    setCollections(storedCollections);
  }
  // ... set other state
}, []); // Only run once on mount

// Centralized update handlers
const handleUpdateTokens = (updatedTokens: ExtendedToken[]) => {
  setTokens(updatedTokens);
  StorageService.setTokens(updatedTokens);
};
```

**Component Usage Pattern:**
```tsx
// Components receive state as props and update through callbacks
<TokensView
  tokens={tokens}
  collections={collections}
  onUpdateTokens={handleUpdateTokens}
  onUpdateCollections={handleUpdateCollections}
/>
```

#### Benefits
- **Consistency**: All components follow the same pattern
- **Performance**: No periodic refresh eliminates infinite loops and unnecessary re-renders
- **Reliability**: Centralized state management ensures data consistency
- **User Experience**: Immediate updates through centralized handlers
- **Maintainability**: Centralized logic is easier to debug and modify
- **Type Safety**: Props-based approach provides better TypeScript support

#### Migration Strategy
1. **Phase 1**: Update App.tsx to implement one-time initialization for all data types
2. **Phase 2**: Convert components to receive state as props instead of direct storage calls
3. **Phase 3**: Remove component-specific refresh logic and direct storage calls
4. **Phase 4**: Standardize all update handlers to follow the same pattern

#### Rationale
- **Eliminates Infinite Loops**: One-time initialization prevents the refresh cycles that caused infinite loops
- **Improves Performance**: No periodic refresh reduces unnecessary storage calls and re-renders
- **Enhances Reliability**: Centralized state management ensures UI always reflects current state
- **Simplifies Debugging**: Centralized logic is easier to trace and debug
- **Maintains User Experience**: Centralized update handlers provide immediate feedback
- **Reduces Complexity**: Eliminates the need for complex refresh coordination

### Forbidden Patterns
- Direct `StorageService` calls in components (except in App.tsx)
- Periodic refresh effects with intervals
- Component-specific refresh logic with different intervals
- Manual state synchronization without centralized handlers
- Inconsistent update handler patterns across components

### Outcome
- All components follow the same state management pattern
- App.tsx becomes the single source of truth for all data
- One-time initialization prevents infinite loops
- Centralized update handlers for all data mutations
- Props-based component communication
- Improved performance through elimination of periodic refresh 

# GitHub Integration and Data Management Pipeline

## Overview
The design-data-system-manager project implements a comprehensive GitHub integration system that enables users to load, edit, and save design system data directly to GitHub repositories. The system supports both direct commits and pull request workflows, with robust OAuth authentication and secure token management.

## Authentication Flow

### OAuth Implementation
- **PKCE Flow**: Uses Proof Key for Code Exchange (PKCE) for enhanced security
- **State Parameter**: Implements CSRF protection with random state parameters
- **Token Storage**: Securely stores GitHub access tokens using base64 encoding (upgradable to Web Crypto API)
- **Token Refresh**: Monitors token validity with 30-minute intervals and automatic logout on invalidation

### Security Features
- **SecureStorage Service**: Centralized secure storage for sensitive GitHub data
- **Token Encryption**: Basic base64 encoding for tokens (production should use Web Crypto API)
- **State Verification**: Validates OAuth state parameters to prevent CSRF attacks
- **Automatic Cleanup**: Clears stale OAuth state parameters and invalid tokens

## Data Loading Pipeline

### GitHub Repository Selection
1. **Repository Discovery**: Fetches user's repositories via GitHub API
2. **Branch Selection**: Loads available branches for selected repository
3. **File Scanning**: Automatically detects valid JSON files (schema or theme-override)
4. **File Type Detection**: Distinguishes between core data files and theme override files

### Data Loading Process
1. **File Content Retrieval**: Downloads file content via GitHub API
2. **JSON Parsing**: Validates and parses JSON content
3. **Storage Population**: Loads data into localStorage via StorageService
4. **State Synchronization**: Updates React state through centralized handlers
5. **Repository Tracking**: Stores selected repository info for future operations

### File Type Handling
- **Core Data Files**: Load complete design system data (tokens, collections, dimensions, etc.)
- **Theme Override Files**: Load theme-specific overrides that merge with core data
- **Algorithm Files**: Optional algorithm data loaded alongside core data using naming conventions

## Data Storage Architecture

### Local Storage Strategy
- **App-Level State Management**: Single source of truth in App.tsx
- **One-Time Initialization**: Data loaded from storage once on mount
- **Centralized Updates**: All mutations go through centralized update handlers
- **Props-Based Communication**: Components receive state as props and trigger updates through callbacks

### Storage Keys
- **Token Data**: `token-model:tokens`, `token-model:collections`, `token-model:dimensions`
- **Configuration**: `token-model:value-types`, `token-model:platforms`, `token-model:themes`
- **GitHub Data**: `github_selected_repo`, `github_token_encrypted`, `github_user`
- **Algorithms**: `token-model:algorithms`, `token-model:algorithm-file`

### Change Tracking
- **Baseline Establishment**: Creates baseline data snapshot on initialization
- **Change Detection**: Monitors localStorage modifications to detect changes
- **Change Count**: Tracks number of modifications for UI feedback
- **Unsaved Changes**: Prevents data loss by tracking modification state

## Saving and Publishing Workflow

### Save Options
1. **Direct Save**: Commits changes directly to the current branch
2. **Pull Request**: Creates a new branch and pull request for review

### Branch Management
- **Branch Creation**: Automatically generates unique branch names with timestamps
- **Base Branch Selection**: Allows targeting specific branches (main, master, etc.)
- **Branch Validation**: Ensures target branch exists before creating PR

### Pull Request Workflow
1. **Branch Creation**: Creates new branch from current branch
2. **File Update**: Saves changes to the new branch
3. **PR Creation**: Creates pull request with generated title and description
4. **PR Opening**: Automatically opens PR in new browser tab
5. **Metadata**: Includes change log, timestamp, and file type information

### File Size Management
- **Size Validation**: Checks file size against GitHub's 1MB limit
- **Warning System**: Warns when approaching size limits
- **Error Prevention**: Prevents saves that would exceed limits

## Error Handling and User Feedback

### Authentication Errors
- **Token Validation**: Tests token validity before API calls
- **Re-authentication**: Automatic logout and re-auth flow on token invalidation
- **Error Recovery**: Clear error messages and retry options

### Network and API Errors
- **Graceful Degradation**: Handles network failures with user-friendly messages
- **Retry Mechanisms**: Provides retry options for failed operations
- **Toast Notifications**: Consistent error feedback via Chakra UI toasts

### Data Validation
- **Schema Compliance**: Validates all data against schema before saving
- **File Format Validation**: Ensures JSON validity before parsing
- **Size Limits**: Prevents oversized files from being saved

## Integration Points

### Component Integration
- **Header Component**: Provides GitHub connection status and save options
- **GitHubCallback**: Handles OAuth callback and repository selection
- **GitHubRepoSelector**: Manages repository and file selection
- **GitHubSaveDialog**: Provides save options and PR creation

### Service Integration
- **GitHubAuthService**: Manages OAuth flow and token handling
- **GitHubApiService**: Handles all GitHub API interactions
- **GitHubSaveService**: Manages save operations and PR creation
- **StorageService**: Handles local data persistence
- **SecureStorage**: Manages sensitive GitHub data

### State Management
- **App.tsx**: Centralized state management for all data types
- **Props-Based Updates**: Components trigger updates through callback props
- **Change Tracking**: Monitors data modifications for UI feedback
- **Baseline Management**: Maintains original data for change detection

## Best Practices

### Security
- Use PKCE for OAuth flows
- Implement proper token storage and encryption
- Validate all OAuth parameters
- Clear sensitive data on logout

### Performance
- One-time initialization prevents infinite loops
- Centralized state management reduces re-renders
- Efficient change detection with baseline comparison
- Lazy loading of repository and branch data

### User Experience
- Clear error messages and recovery options
- Consistent toast notifications for feedback
- Automatic file type detection and validation
- Seamless integration between local and remote data

### Data Integrity
- Schema validation before all saves
- File size validation and warnings
- Proper error handling for all operations
- Change tracking and unsaved change detection

## Future Enhancements
- Implement Web Crypto API for token encryption
- Add support for GitHub Apps for enhanced permissions
- Implement conflict resolution for concurrent edits
- Add support for GitHub Actions integration
- Enhance file size optimization and compression

# Centralized Data Management with DataManager Service

## Context
The application previously suffered from race conditions and synchronization issues when loading data from different sources (GitHub, example data, local storage). The main problems were:
- Race conditions between App component initialization and GitHub data loading
- Inconsistent data management patterns across different loading paths
- Storage vs React state synchronization gaps
- Complex and unreliable event handling for data updates

## Decision
Implement a **centralized DataManager service** that provides a single source of truth for all data operations, eliminating race conditions and ensuring consistent state synchronization.

### DataManager Architecture

#### Singleton Pattern
- **Single Instance**: DataManager uses a singleton pattern to ensure consistent data management across the application
- **Centralized Operations**: All data loading, storage, and state synchronization happens through this service
- **Callback System**: Notifies the App component when data changes, ensuring React state stays synchronized

#### Core Methods
- **`initialize(callbacks)`**: Loads initial data from storage and sets up callbacks for data changes
- **`loadFromGitHub(fileContent, fileType)`**: Handles GitHub data loading with proper error handling and state updates
- **`loadFromExampleSource(dataSourceKey, exampleData, algorithmData)`**: Handles example data loading
- **`updateData(updates)`**: Updates specific data and notifies listeners
- **`clearAllData()`**: Clears all data and resets state
- **`hasExistingData()`**: Checks if there's existing data in storage

#### Data Flow
```
GitHub Data Load → DataManager.loadFromGitHub() → StorageService → Callbacks → React State Update
Example Data Load → DataManager.loadFromExampleSource() → StorageService → Callbacks → React State Update
User Edits → DataManager.updateData() → StorageService → Callbacks → React State Update
```

### App Component Integration

#### Simplified Initialization
- **Single useEffect**: One-time initialization that sets up DataManager with callbacks
- **Automatic State Updates**: React state is automatically updated when data changes via callbacks
- **Consistent Data Flow**: All data operations go through the DataManager, ensuring consistency

#### Callback Pattern
```tsx
const callbacks = {
  onDataLoaded: (snapshot: DataSnapshot) => {
    // Update React state with loaded data
    setCollections(snapshot.collections);
    setTokens(snapshot.tokens);
    // ... update other state
  },
  onDataChanged: (snapshot: DataSnapshot) => {
    // Update React state when data changes
    setCollections(snapshot.collections);
    setTokens(snapshot.tokens);
    // ... update other state
  },
  onBaselineUpdated: (snapshot: DataSnapshot) => {
    // Update change tracking baseline
    setChangeLogData({
      currentData: snapshot as unknown as Record<string, unknown>,
      baselineData: snapshot as unknown as Record<string, unknown>
    });
  }
};
```

### Benefits

#### Eliminates Race Conditions
- **Sequential Operations**: DataManager ensures proper sequencing of operations
- **No Timing Issues**: Callbacks ensure React state updates happen immediately after data changes
- **Consistent State**: App component state always reflects current storage state

#### Improves Reliability
- **Single Point of Control**: All data operations go through one service
- **Error Handling**: Centralized error handling for all data operations
- **Type Safety**: Proper TypeScript interfaces for all data operations

#### Enhances Maintainability
- **Centralized Logic**: Easier to debug and modify data operations
- **Consistent Patterns**: All data loading follows the same pattern
- **Clear Separation**: Data management logic is separated from UI logic

#### Prevents Future Issues
- **Consistent Patterns**: Standardized approach prevents similar problems
- **Scalable Architecture**: Easy to add new data sources or operations
- **Robust Error Handling**: Comprehensive error handling prevents data corruption

### Migration from Previous Approach

#### Removed Patterns
- **Direct StorageService calls in components**: All storage operations now go through DataManager
- **Complex event listeners**: Replaced with simple callback system
- **Manual state synchronization**: Automatic via callbacks
- **Multiple data loading paths**: Unified through DataManager

#### Preserved Patterns
- **Props-based component communication**: Components still receive state as props
- **Centralized update handlers**: Still used for user-initiated changes
- **Change tracking**: Maintained through DataManager callbacks

### Implementation Details

#### Type Safety
- **DataSnapshot Interface**: Comprehensive TypeScript interface for all data types
- **Callback Interfaces**: Properly typed callback functions
- **Error Handling**: Typed error responses and validation

#### Performance Considerations
- **One-time Initialization**: Prevents unnecessary re-initialization
- **Efficient Callbacks**: Only update state when data actually changes
- **Memory Management**: Singleton pattern prevents memory leaks

#### Error Handling
- **Comprehensive Validation**: All data is validated before storage
- **Graceful Degradation**: Clear error messages and recovery options
- **State Consistency**: Ensures state remains consistent even on errors

### Outcome
- **Eliminated Race Conditions**: GitHub data loading now works reliably without timing issues
- **Improved Data Persistence**: Data properly persists across page refreshes
- **Enhanced Change Tracking**: ChangeLog shows correct information without false positives
- **Simplified Architecture**: Single, consistent pattern for all data operations
- **Better Developer Experience**: Easier to debug and maintain data-related code
- **Future-Proof Design**: Scalable architecture supports new data sources and operations

This solution provides a **stable, maintainable, and scalable** approach to data management that prevents similar issues in the future while making the codebase easier to understand and extend.

# Revised Sign-In Workflow and Access State Management

## Context
The application needed to support different access states for users based on their authentication status and repository permissions. The previous implementation only distinguished between "logged in" and "logged out" states, but didn't account for users who are authenticated but lack write access to specific repositories.

## Decision
Implement a three-state access system with sophisticated permission checking and URL parameter handling:

### Access States
1. **Logged Out**: Not authenticated, view-only access
2. **Logged In + View Only**: Authenticated but no write access to current repository
3. **Logged In + Read/Write**: Authenticated with write access to current repository

### Sign-In Workflow
- **URL Parameter Detection**: Check for `repo`, `path`, and `branch` parameters on sign-in
- **Permission Checking**: Use GitHub API `/user/repos?affiliation=owner,collaborator` to determine write access
- **State Management**: Track `hasEditPermissions` alongside existing `githubUser` and `isViewOnlyMode` states
- **Conditional UI**: Hide specific GitHub menu actions based on permissions

## Implementation Details

### Permission Checking
```typescript
// GitHubApiService.hasWriteAccessToRepository()
static async hasWriteAccessToRepository(repoFullName: string): Promise<boolean> {
  const response = await fetch(`${GITHUB_CONFIG.apiBaseUrl}/user/repos?affiliation=owner,collaborator&per_page=100`);
  const repos = await response.json();
  return repos.some((repo: GitHubRepo) => repo.full_name === repoFullName);
}
```

### State Management
```typescript
// App.tsx state
const [hasEditPermissions, setHasEditPermissions] = useState(false);

// useAuth hook
const canEdit = useMemo(() => {
  return isAuthenticated && !isViewOnlyMode && hasEditPermissions;
}, [isAuthenticated, isViewOnlyMode, hasEditPermissions]);
```

### Event-Driven Communication
```typescript
// GitHubCallback dispatches permission events
window.dispatchEvent(new CustomEvent('github:permissions-checked', {
  detail: { hasWriteAccess, repoInfo }
}));

// App.tsx listens for permission events
const handlePermissionsChecked = (event: CustomEvent) => {
  const { hasWriteAccess, repoInfo } = event.detail;
  setHasEditPermissions(hasWriteAccess);
  setSelectedRepoInfo(repoInfo);
};
```

### Conditional GitHub Menu Actions
```typescript
// Header.tsx conditionally renders actions
{hasEditPermissions && (
  <>
    <Button>Refresh (pull) data</Button>
    <Button>Save (commit)</Button>
    <Button>Create Pull Request</Button>
  </>
)}
<Button>Copy Repository URL</Button> {/* Always visible */}
```

## Benefits

### User Experience
- **Clear Access Indication**: Users understand their current permissions
- **Seamless Transitions**: Smooth flow between different access states
- **Appropriate Functionality**: UI adapts to user's actual capabilities
- **URL Persistence**: Parameters maintained throughout authentication flow

### Security
- **Permission-Based Access**: Write access verified via GitHub API
- **Defensive Defaults**: Failures default to view-only access
- **Clear Boundaries**: Distinct separation between read and write capabilities

### Maintainability
- **Centralized Logic**: Permission checking in single service
- **Event-Driven Architecture**: Loose coupling between components
- **Type Safety**: Proper TypeScript interfaces for all states
- **Consistent Patterns**: Reusable permission checking logic

## Migration Strategy
- **Backward Compatibility**: All existing functionality preserved
- **Gradual Enhancement**: New states added without breaking changes
- **Clear Documentation**: Comprehensive documentation of new workflow
- **Testing Coverage**: Permission scenarios thoroughly tested

## Future Considerations
- **Permission Caching**: Cache results for better performance
- **Granular Permissions**: Support for read/write/admin distinctions
- **Organization Support**: Handle organization-level permissions
- **Conflict Resolution**: Enhanced handling of concurrent edits

This implementation provides a robust, user-friendly authentication and access control system that adapts to different user scenarios while maintaining security and usability.

# ChangeLog Baseline Reset Implementation

## Context
The ChangeLog component was showing incorrect changes when users loaded new data sources (GitHub repositories, sample data) or performed save operations. The issue was that the baseline data wasn't being properly reset in these scenarios, causing the ChangeLog to compare the old baseline with the new data.

## Decision
Implement proper baseline reset functionality that ensures the ChangeLog shows no changes (0 changes) when:
1. Loading a new GitHub repository
2. Changing sample data sources
3. Resetting data to repository's original state
4. Committing changes to GitHub (direct commit or PR creation)

## Implementation

### DataManager Baseline Reset
```typescript
/**
 * Reset baseline to current data (used after GitHub save operations)
 */
resetBaselineToCurrent(): void {
  console.log('[DataManager] Resetting baseline to current data');
  
  const currentSnapshot = this.getCurrentSnapshot();
  
  // Set new baseline to current data
  this.setBaseline(currentSnapshot);
  
  // Notify that baseline has been updated
  this.callbacks.onBaselineUpdated?.(currentSnapshot);
}
```

### GitHub Save Service Integration
```typescript
// After successful direct save
await GitHubApiService.createFile(/* ... */);

// Reset baseline to current data after successful save
const dataManager = DataManager.getInstance();
dataManager.resetBaselineToCurrent();

// After successful PR creation
const pr = await GitHubApiService.createPullRequest(/* ... */);

// Reset baseline to current data after successful PR creation
const dataManager = DataManager.getInstance();
dataManager.resetBaselineToCurrent();
```

### App Component Baseline Update Handler
```typescript
onBaselineUpdated: (snapshot: DataSnapshot) => {
  console.log('[App] Baseline updated via DataManager');
  // When baseline is updated (new data source loaded), set both current and baseline to the same data
  // This ensures the ChangeLog shows no changes
  const snapshotData = snapshot as unknown as Record<string, unknown>;
  setChangeLogData({
    currentData: snapshotData,
    baselineData: snapshotData
  });
}
```

### Data Loading Baseline Reset
```typescript
// In loadFromGitHub and loadFromExampleSource methods
// Set new baseline for change tracking - this establishes the new "original" state
this.setBaseline(snapshot);

// Notify that data has been loaded with new baseline
this.callbacks.onDataLoaded?.(snapshot);
this.callbacks.onBaselineUpdated?.(snapshot);
```

## Use Cases Covered

1. **GitHub Repository Loading**: When a user loads a repository, the baseline is set to the loaded data
2. **Sample Data Source Changes**: When switching between example data sources, the baseline is reset
3. **Data Reset Operations**: When resetting to GitHub source or baseline, the baseline is updated
4. **GitHub Save Operations**: After successful commits or PR creation, the baseline is reset to current state

## Benefits
1. **Accurate Change Detection**: ChangeLog only shows actual user changes, not data source changes
2. **Consistent User Experience**: Users see 0 changes when loading new data sources
3. **Proper Baseline Management**: Baseline always reflects the "original" state for comparison
4. **Clear Change History**: Users can distinguish between data source changes and their own edits

## Technical Details

### Baseline Reset Triggers
- `DataManager.loadFromGitHub()` - New repository loaded
- `DataManager.loadFromExampleSource()` - Sample data source changed
- `DataManager.resetBaselineToCurrent()` - After save operations
- `Header.handleReloadCurrentFile()` - Reset to GitHub source

### ChangeLog Behavior
- **0 Changes**: When baseline and current data are identical
- **N Changes**: When user has made modifications to the baseline data
- **Reset**: Automatically resets to 0 changes when new data sources are loaded

## Outcome
1. **Fixed ChangeLog Issues**: No more incorrect change counts when loading new data
2. **Improved User Experience**: Clear indication of when changes exist vs. when data is "clean"
3. **Consistent Behavior**: All data loading scenarios properly reset the baseline
4. **Maintainable Solution**: Centralized baseline management through DataManager 
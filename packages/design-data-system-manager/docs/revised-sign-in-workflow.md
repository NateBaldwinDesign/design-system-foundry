# Revised Sign-In Workflow and Access States

## Overview

The application now implements a sophisticated sign-in workflow that distinguishes between different access states and provides appropriate user experiences based on authentication status and repository permissions.

## Access States

### 1. Logged Out
- **Description**: User is not authenticated with GitHub
- **Header Behavior**: Only "Sign in" button visible
- **App Behavior**: View-only access to data (if available via URL parameters)
- **GitHub Menu**: Not visible
- **User Menu**: Not visible

### 2. Logged In + View Only
- **Description**: User is authenticated but has no write access to the current repository
- **Header Behavior**: Shows GitHub menu and User Menu, but hides "Refresh", "Save", and "Create Pull Request" actions
- **App Behavior**: View-only access to data (all edit controls hidden)
- **GitHub Menu**: Visible but with limited actions
- **User Menu**: Visible with full functionality

### 3. Logged In + Read/Write
- **Description**: User is authenticated and has write access to the current repository
- **Header Behavior**: Shows full GitHub menu and User Menu with all actions
- **App Behavior**: Full read/write access to data
- **GitHub Menu**: Visible with all actions
- **User Menu**: Visible with full functionality

## Sign-In Workflow

### URL Parameter Detection
When a user clicks "Sign in", the application first checks for URL parameters:
- `repo`: Repository name (e.g., "owner/repo")
- `path`: File path within the repository
- `branch`: Branch name (defaults to "main")

### Workflow Paths

#### Path 1: URL Parameters Present
1. **Authentication**: User is redirected to GitHub OAuth
2. **Permission Check**: After successful authentication, the app checks if the user has write access to the repository using `/user/repos?affiliation=owner,collaborator`
3. **Data Loading**: Loads the specified file from the repository
4. **State Determination**:
   - If user has write access: "Logged In + Read/Write" state
   - If user has no write access: "Logged In + View Only" state
   - If permission check fails: "Logged In + View Only" state (with warning toast)
5. **URL Persistence**: URL parameters are maintained throughout the process

#### Path 2: No URL Parameters
1. **Authentication**: User is redirected to GitHub OAuth
2. **Repository Selection**: After successful authentication, shows repository selection dialog
3. **Data Loading**: User selects repository and file manually
4. **State Determination**: Always "Logged In + Read/Write" (user owns or has write access to selected repos)

## Technical Implementation

### Permission Checking
- **API Endpoint**: `/user/repos?affiliation=owner,collaborator`
- **Logic**: Checks if the target repository is in the list of repos where user has write access
- **Fallback**: Defaults to view-only access if permission check fails
- **Caching**: Permission check is performed only when switching repositories or on hard refresh

### State Management
- **`hasEditPermissions`**: New state variable tracking user's write access to current repository
- **`useAuth` Hook**: Updated to consider `hasEditPermissions` in `canEdit` calculation
- **Event System**: Uses custom events to communicate permission status between components

### GitHub Menu Actions
The following actions are conditionally hidden based on `hasEditPermissions`:
- **Refresh (pull) data**: Hidden when `hasEditPermissions` is false
- **Save (commit)**: Hidden when `hasEditPermissions` is false
- **Create Pull Request**: Hidden when `hasEditPermissions` is false
- **Copy Repository URL**: Always visible (useful for sharing)

### Error Handling
- **Permission Check Failures**: Default to view-only access with informative toast message
- **Network Errors**: Graceful degradation with clear user feedback
- **OAuth Failures**: Clear error messages with retry options

## User Experience Benefits

### For Repository Owners/Contributors
- Seamless authentication and data loading
- Full access to all features
- Clear indication of write access

### For Repository Viewers
- Ability to view data without edit capabilities
- Clear indication of view-only status
- Access to sharing functionality
- Ability to switch to their own repositories

### For Public Repository Access
- No authentication required for viewing
- Clear distinction between logged-out and logged-in view-only states
- Smooth transition to authenticated state when needed

## Migration from Previous Implementation

### Preserved Features
- All existing view-only logic for logged-out users
- Repository selection dialog for manual repository access
- All existing GitHub integration features

### Enhanced Features
- Automatic permission detection
- URL parameter persistence
- Improved state management
- Better user feedback

### New Features
- "Logged In + View Only" state
- Conditional GitHub menu actions
- Permission-based access control
- Enhanced error handling

## Future Considerations

### Potential Enhancements
- Repository permission caching for better performance
- More granular permission checks (read vs write vs admin)
- Support for organization-level permissions
- Enhanced conflict resolution for concurrent edits

### Security Considerations
- Permission checks are performed server-side via GitHub API
- OAuth tokens are securely stored and managed
- All permission checks default to restrictive access
- Clear audit trail for permission decisions

This implementation provides a robust, user-friendly authentication and access control system that adapts to different user scenarios while maintaining security and usability. 
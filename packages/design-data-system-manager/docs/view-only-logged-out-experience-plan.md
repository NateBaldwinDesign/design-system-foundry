# View-Only Logged-Out Experience Plan

## Overview

The goal is to hide all "Add", "Edit", and "Delete" buttons from the main views when users are logged out and visiting a repository via shared URL parameters. This ensures that logged-out users can view data but cannot modify it, while preserving existing design and functionality.

## Current State Analysis

### Authentication State Flow
- **App.tsx**: Manages `githubUser` state and `isViewOnlyMode` for URL-based access
- **ViewRenderer.tsx**: Passes `githubUser` and `isViewOnlyMode` to individual views
- **Individual Views**: Currently have hardcoded Add/Edit/Delete buttons without authentication checks

### Views Requiring Updates

Based on analysis, the following views contain Add/Edit/Delete functionality that needs to be conditionally hidden:

1. **TokensView.tsx** - Add Token button (already partially handled)
2. **SystemVariablesView.tsx** - Add/Edit/Delete system variables
3. **ComponentsView.tsx** - Add/Edit/Delete components
4. **CollectionsView.tsx** - Add/Edit/Delete collections
5. **ThemesTab.tsx** - Add/Edit/Delete themes
6. **AlgorithmsView.tsx** - Add/Edit/Delete algorithms
7. **System Views** (in `/system/` directory):
   - **DimensionsView.tsx** - Add/Edit/Delete dimensions
   - **TaxonomyView.tsx** - Add/Edit/Delete taxonomies
   - **ValueTypesView.tsx** - Add/Edit/Delete value types
   - **ComponentCategoriesView.tsx** - Add/Edit/Delete component categories
   - **ComponentPropertiesView.tsx** - Add/Edit/Delete component properties

## Implementation Strategy

### 1. Create a Shared Authentication Hook

Create a custom hook to centralize authentication logic:

```typescript
// hooks/useAuth.ts
import { useMemo } from 'react';
import type { GitHubUser } from '../config/github';

interface UseAuthProps {
  githubUser: GitHubUser | null;
  isViewOnlyMode?: boolean;
}

export const useAuth = ({ githubUser, isViewOnlyMode = false }: UseAuthProps) => {
  const isAuthenticated = useMemo(() => {
    return !!githubUser && !isViewOnlyMode;
  }, [githubUser, isViewOnlyMode]);

  const canEdit = useMemo(() => {
    return isAuthenticated;
  }, [isAuthenticated]);

  return {
    isAuthenticated,
    canEdit,
    githubUser,
    isViewOnlyMode
  };
};
```

### 2. Update ViewRenderer to Pass Authentication State

Modify ViewRenderer to pass authentication state to all views:

```typescript
// In ViewRenderer.tsx
import { useAuth } from '../hooks/useAuth';

export const ViewRenderer: React.FC<ViewRendererProps> = ({ ... }) => {
  const auth = useAuth({ githubUser, isViewOnlyMode });
  
  const renderView = () => {
    switch (currentView) {
      case 'tokens':
        return (
          <TokensView
            // ... existing props
            canEdit={auth.canEdit}
          />
        );
      // ... other cases with canEdit prop
    }
  };
};
```

### 3. Update Individual Views

For each view, add the `canEdit` prop and conditionally render Add/Edit/Delete buttons:

#### Pattern for Each View:

```typescript
interface ViewProps {
  // ... existing props
  canEdit?: boolean;
}

export function View({ canEdit = true, ... }: ViewProps) {
  return (
    <Box>
      {/* Only show Add button if canEdit */}
      {canEdit && (
        <Button onClick={handleAdd} leftIcon={<LuPlus />}>
          Add Item
        </Button>
      )}
      
      {/* In item list */}
      {items.map(item => (
        <Box key={item.id}>
          <HStack justify="space-between">
            <Box>{/* item content */}</Box>
            {/* Only show Edit/Delete buttons if canEdit */}
            {canEdit && (
              <HStack>
                <IconButton icon={<LuPencil />} onClick={() => handleEdit(item)} />
                <IconButton icon={<LuTrash2 />} onClick={() => handleDelete(item)} />
              </HStack>
            )}
          </HStack>
        </Box>
      ))}
    </Box>
  );
}
```

### 4. Specific View Updates Required

#### A. SystemVariablesView.tsx
- Add `canEdit` prop
- Conditionally render "Add System Variable" button
- Conditionally render Edit/Delete buttons for each variable

#### B. ComponentsView.tsx
- Add `canEdit` prop
- Conditionally render "Add Component" button
- Conditionally render Edit/Delete buttons for each component

#### C. CollectionsView.tsx
- Add `canEdit` prop
- Conditionally render "Create New Collection" button
- Conditionally render Edit/Delete buttons for each collection

#### D. ThemesTab.tsx
- Add `canEdit` prop
- Conditionally render "Add Theme" button
- Conditionally render Edit/Delete buttons for each theme

#### E. AlgorithmsView.tsx
- Add `canEdit` prop
- Conditionally render "Add Algorithm" button
- Conditionally render Edit/Delete buttons for each algorithm

#### F. System Views (all in `/system/` directory)
- **DimensionsView.tsx**: Add `canEdit` prop, conditionally render Add/Edit/Delete
- **TaxonomyView.tsx**: Add `canEdit` prop, conditionally render Add/Edit/Delete
- **ValueTypesView.tsx**: Add `canEdit` prop, conditionally render Add/Edit/Delete
- **ComponentCategoriesView.tsx**: Add `canEdit` prop, conditionally render Add/Edit/Delete
- **ComponentPropertiesView.tsx**: Add `canEdit` prop, conditionally render Add/Edit/Delete

### 5. Update ViewRenderer Interface

Update the ViewRenderer props interface to include `canEdit` for all views:

```typescript
interface ViewRendererProps {
  // ... existing props
  canEdit?: boolean;
}
```

### 6. Handle Edge Cases

#### A. Empty States
For views that show "Add" buttons when no items exist, provide appropriate messaging:

```typescript
{items.length === 0 && (
  <Box textAlign="center" py={8}>
    <Text color="gray.500">
      {canEdit 
        ? "No items found. Click 'Add' to create your first item."
        : "No items found in this repository."
      }
    </Text>
  </Box>
)}
```

#### B. Tooltips and Accessibility
Add tooltips to explain why buttons are disabled:

```typescript
{!canEdit && (
  <Tooltip label="Sign in to edit this repository">
    <Box>
      <Button isDisabled>Add Item</Button>
    </Box>
  </Tooltip>
)}
```

## Implementation Order

1. **Create useAuth hook** - Centralized authentication logic
2. **Update ViewRenderer** - Pass authentication state to all views
3. **Update TokensView** - Already partially implemented, complete the pattern
4. **Update System Views** - All views in `/system/` directory
5. **Update Main Views** - ComponentsView, CollectionsView, ThemesTab, AlgorithmsView
6. **Update SystemVariablesView** - Standalone view
7. **Test and Validate** - Ensure all edit controls are properly hidden

## Design Principles

- **Preserve Existing Design**: Only toggle visibility, do not replace components or design
- **Maintain Functionality**: All existing functionality remains intact for authenticated users
- **Consistent UX**: All views follow the same pattern for hiding edit controls
- **Schema-Driven**: Follow project rules for data model consistency
- **Type Safe**: TypeScript interfaces ensure proper prop passing

## Benefits

- ✅ **Consistent UX**: All views follow the same pattern for hiding edit controls
- ✅ **Centralized Logic**: Authentication state managed in one place
- ✅ **Maintainable**: Easy to modify authentication behavior across all views
- ✅ **Accessible**: Proper tooltips and messaging for disabled states
- ✅ **Schema-Driven**: Follows project rules for data model consistency
- ✅ **Type Safe**: TypeScript interfaces ensure proper prop passing
- ✅ **Design Preservation**: Existing design and functionality completely preserved

## Testing Strategy

1. **Logged-out URL Access**: Test with `?repo=owner/repo&path=file.json` parameters
2. **Logged-in Access**: Verify all edit controls work normally
3. **Mixed States**: Test transitions between logged-in and logged-out states
4. **Empty States**: Verify appropriate messaging for empty data sets
5. **Accessibility**: Test keyboard navigation and screen reader compatibility

## Success Criteria

- [ ] All Add/Edit/Delete buttons hidden when `githubUser` is null or `isViewOnlyMode` is true
- [ ] All Add/Edit/Delete buttons visible when user is authenticated and not in view-only mode
- [ ] No changes to existing design, layout, or functionality
- [ ] Proper TypeScript types for all new props
- [ ] Consistent behavior across all views
- [ ] Appropriate empty state messaging for logged-out users
- [ ] No console errors or warnings
- [ ] All existing tests pass

This plan ensures that logged-out users can view repository data without any edit capabilities, while maintaining full functionality for authenticated users and preserving all existing design and functionality. 
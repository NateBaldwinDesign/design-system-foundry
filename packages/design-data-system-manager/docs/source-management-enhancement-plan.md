# Source Management Enhancement Plan

## Overview
This document outlines a comprehensive enhancement to the data source management system in the design-data-system-manager. The goal is to simplify and clarify data handling while preserving all existing functionality and design.

## Current State Analysis

### Identified Issues
1. **Data Source Ambiguity**: Unclear distinction between source data, local edits, and merged data
2. **Complex State Management**: Multiple services managing different aspects of data state
3. **Inconsistent Data Access**: Different parts of the app access data through different services
4. **Unclear Change Tracking**: Changes tracked against unclear baselines
5. **Complex Merging Logic**: Merging happens at multiple levels with unclear responsibilities

### Current Data Flow
1. URL parameters trigger data loading
2. Core data loaded from GitHub and stored in localStorage
3. Platform/theme data loaded separately if specified
4. EnhancedDataMerger combines data for UI display
5. Changes made to merged data in memory
6. Changes committed back to source repository

## Proposed Solution

### Core Principles
1. **Clear Data Separation**: Distinct separation between Core Data, Source Snapshot, Local Edits, and Merged Data
2. **Single Source of Truth**: Each data type has a single, clear purpose
3. **Consistent Editing Model**: All editing happens on Local Edits data only
4. **Preserve Existing Functionality**: All current features must continue to work
5. **Maintain Current Design**: UI/UX remains unchanged

### Data Structure

#### New localStorage Structure
```typescript
localStorage:
├── core-data (TokenSystem) - Core design system data
├── source-snapshot (TokenSystem | PlatformExtension | ThemeOverride) - Current source data
├── local-edits (TokenSystem | PlatformExtension | ThemeOverride) - User's current edits
├── merged-data (TokenSystem) - Computed merged data for UI display
└── source-context (SourceContext) - Current source configuration
```

#### Source Context Interface
```typescript
interface SourceContext {
  sourceType: 'core' | 'platform' | 'theme';
  sourceId: string | null;
  coreRepository: RepositoryInfo;
  sourceRepository: RepositoryInfo;
  lastLoadedAt: string;
  hasLocalChanges: boolean;
  editMode: {
    isActive: boolean;
    sourceType: 'core' | 'platform-extension' | 'theme-override';
    sourceId: string | null;
    targetRepository: RepositoryInfo | null;
  };
}
```

## Implementation Plan

### Phase 1: Core Infrastructure (Priority: High)

#### 1.1 Create New Services
**File**: `src/services/dataLoaderService.ts`
- Handle all data loading logic
- Implement step-by-step loading process
- Validate data compliance with schema
- Handle network failures and invalid data

**File**: `src/services/dataEditorService.ts`
- Manage local edits and change tracking
- Compare source-snapshot vs local-edits
- Handle change persistence
- Manage edit mode state

**File**: `src/services/dataMergerService.ts`
- Handle merging logic for platform/theme data
- Compute merged data for UI display
- Optimize merging operations

**File**: `src/services/sourceManagerService.ts`
- Manage source switching and context
- Handle URL parameter parsing
- Manage source context persistence
- Handle change warnings during source switching

#### 1.2 Update Storage Service
**File**: `src/services/storage.ts`
- Add new storage keys for source-snapshot, local-edits, merged-data, source-context
- Maintain backward compatibility with existing keys
- Add migration logic for existing data
- Add validation for new data structure

#### 1.3 Create Data Models
**File**: `src/types/dataManagement.ts`
- Define SourceContext interface
- Define DataSourceType enum
- Define ChangeTracking interfaces
- Define validation schemas

### Phase 2: Data Loading Logic (Priority: High)

#### 2.1 Implement Step-by-Step Loading
**File**: `src/services/dataLoaderService.ts`

```typescript
class DataLoaderService {
  async loadFromURL(urlParams: URLSearchParams): Promise<void> {
    // Step 1: Load core data
    await this.loadCoreData(urlParams.get('repo'), urlParams.get('path'));
    
    // Step 2: Determine and load source data
    const sourceType = this.determineSourceType(urlParams);
    await this.loadSourceData(sourceType, urlParams);
    
    // Step 3: Create merged data
    await this.createMergedData();
    
    // Step 4: Create local edits
    await this.createLocalEdits();
    
    // Step 5: Update source context
    await this.updateSourceContext(sourceType, urlParams);
  }
}
```

#### 2.2 Source Type Determination
```typescript
private determineSourceType(urlParams: URLSearchParams): 'core' | 'platform' | 'theme' {
  if (urlParams.get('theme')) return 'theme';
  if (urlParams.get('platform')) return 'platform';
  return 'core';
}
```

#### 2.3 Data Validation
```typescript
private validateData(data: any, expectedType: 'schema' | 'platform-extension' | 'theme-override'): boolean {
  // Validate against appropriate schema
  // Return true if valid, false if invalid
}
```

### Phase 3: Source Switching (Priority: High)

#### 3.1 Source Switching Logic
**File**: `src/services/sourceManagerService.ts`

```typescript
class SourceManagerService {
  async switchSource(sourceType: 'core' | 'platform' | 'theme', sourceId?: string): Promise<void> {
    // 1. Check for unsaved changes
    if (await this.hasLocalChanges()) {
      const confirmed = await this.showChangeWarning();
      if (!confirmed) return;
    }
    
    // 2. Load new source snapshot
    const newSnapshot = await this.loadSourceSnapshot(sourceType, sourceId);
    
    // 3. Reset local edits to match snapshot
    await this.resetLocalEdits(newSnapshot);
    
    // 4. Recompute merged data
    await this.updateMergedData();
    
    // 5. Update source context
    await this.updateSourceContext(sourceType, sourceId);
  }
}
```

#### 3.2 Change Warning System
```typescript
private async showChangeWarning(): Promise<boolean> {
  // Show confirmation dialog
  // Return true if user confirms, false if cancelled
}
```

### Phase 4: Change Management (Priority: Medium)

#### 4.1 Change Detection
**File**: `src/services/dataEditorService.ts`

```typescript
class DataEditorService {
  hasLocalChanges(): boolean {
    const snapshot = StorageService.getSourceSnapshot();
    const localEdits = StorageService.getLocalEdits();
    return !this.isEqual(snapshot, localEdits);
  }
  
  getChangeCount(): number {
    // Count differences between snapshot and local edits
  }
  
  getChanges(): Change[] {
    // Return detailed change information
  }
}
```

#### 4.2 Change Tracking
```typescript
interface Change {
  type: 'added' | 'modified' | 'deleted';
  path: string[];
  oldValue?: any;
  newValue?: any;
  entityType: 'token' | 'collection' | 'dimension' | 'platform' | 'theme';
  entityId: string;
}
```

### Phase 5: UI Integration (Priority: Medium)

#### 5.1 Update App Component
**File**: `src/App.tsx`
- Update data loading logic to use new services
- Maintain existing props and interfaces
- Preserve all existing functionality
- Add new data source indicators

#### 5.2 Update Header Component
**File**: `src/components/Header.tsx`
- Add source type indicators
- Show change status
- Update source switching UI
- Preserve existing GitHub integration

#### 5.3 Update DataSourceManager
**File**: `src/services/dataSourceManager.ts`
- Integrate with new services
- Maintain existing interfaces
- Add new source context management
- Preserve platform/theme dropdown functionality

### Phase 6: Migration and Cleanup (Priority: Low)

#### 6.1 Data Migration
**File**: `src/services/migrationService.ts`
- Migrate existing localStorage data to new structure
- Preserve all existing data
- Handle migration errors gracefully
- Provide rollback capability

#### 6.2 Service Cleanup
- Remove deprecated methods from existing services
- Update service interfaces
- Remove unused code
- Update documentation

## URL Structure

### Enhanced URL Parameters
```
?repo=owner/repo&path=schema.json&branch=main&platform=web&theme=dark
```

### Parameter Definitions
- `repo`: Core design system repository (required)
- `path`: Path to schema.json file (required)
- `branch`: Git branch (optional, defaults to 'main')
- `platform`: Platform ID from core data (optional)
- `theme`: Theme ID from core data (optional)

## Error Handling

### Network Failures
- Retry logic for failed requests
- Graceful degradation when data unavailable
- Clear error messages to users
- Fallback to cached data when possible

### Data Validation
- Schema compliance validation
- Platform/theme ID validation
- Repository accessibility validation
- Data format validation

### User Experience
- Loading states during data operations
- Progress indicators for long operations
- Clear error messages
- Recovery options for failed operations

## Testing Strategy

### Unit Tests
- Test each service independently
- Test data validation logic
- Test error handling
- Test migration logic

### Integration Tests
- Test complete data loading flow
- Test source switching
- Test change tracking
- Test URL parameter handling

### User Acceptance Tests
- Verify all existing functionality works
- Verify new features work as expected
- Verify error handling works
- Verify performance is acceptable

## Success Criteria

### Functional Requirements
1. ✅ All existing functionality preserved
2. ✅ URL-based data loading works correctly
3. ✅ Platform/theme switching works correctly
4. ✅ Edit mode works correctly
5. ✅ Change tracking works correctly
6. ✅ GitHub integration works correctly

### Non-Functional Requirements
1. ✅ Performance is not degraded
2. ✅ Error handling is robust
3. ✅ Data validation is comprehensive
4. ✅ User experience is improved
5. ✅ Code is maintainable

### Migration Requirements
1. ✅ Existing data is preserved
2. ✅ Migration is automatic and seamless
3. ✅ Rollback capability exists
4. ✅ No data loss occurs

## Implementation Guidelines

### Code Style
- Follow existing TypeScript patterns
- Use existing Chakra UI components
- Maintain existing file structure
- Follow existing naming conventions

### Error Handling
- Use try-catch blocks consistently
- Log errors appropriately
- Show user-friendly error messages
- Provide recovery options

### Performance
- Optimize data loading operations
- Minimize localStorage operations
- Use efficient data structures
- Implement proper caching

### Security
- Validate all input data
- Sanitize URL parameters
- Validate GitHub permissions
- Handle sensitive data appropriately

## Rollback Plan

### If Issues Arise
1. **Immediate Rollback**: Revert to previous version
2. **Data Recovery**: Restore from backup
3. **User Communication**: Notify users of issues
4. **Investigation**: Identify and fix root cause

### Rollback Triggers
- Critical functionality broken
- Data loss or corruption
- Performance degradation
- Security vulnerabilities

## Future Enhancements

### Potential Improvements
1. **Offline Support**: Cache data for offline use
2. **Real-time Sync**: Live updates from GitHub
3. **Conflict Resolution**: Handle merge conflicts
4. **Advanced Change Tracking**: More detailed change history
5. **Data Export**: Export data in various formats

### Considerations
- Maintain backward compatibility
- Preserve existing functionality
- Follow established patterns
- Consider performance impact

## Conclusion

This enhancement plan provides a clear path to improving the data source management system while preserving all existing functionality and design. The phased approach ensures minimal disruption and allows for thorough testing at each stage.

The new system will provide:
- Clearer data separation
- Simplified state management
- Better error handling
- Improved user experience
- Maintainable codebase

All implementation must adhere to the project rules and preserve existing functionality and design. 
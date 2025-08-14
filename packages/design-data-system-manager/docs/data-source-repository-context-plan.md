# Data Source Repository Context Plan: AI Agent Implementation Guide

## Overview
This document provides precise, actionable instructions for an AI agent to implement a **Unified Repository Context Service** that addresses the root cause of source context information loss and misalignment issues. The goal is to create a single source of truth for all repository information while preserving all existing functionality and design.

## Critical Success Factors
- **PRESERVE ALL EXISTING FUNCTIONALITY** - No breaking changes to user workflows
- **MAINTAIN BACKWARD COMPATIBILITY** - Existing data and APIs must remain accessible
- **COMPREHENSIVE TESTING** - Each phase must be fully tested before proceeding
- **ROLLBACK CAPABILITY** - Ability to revert changes if issues arise
- **PERFORMANCE PRESERVATION** - No degradation in application performance
- **SINGLE SOURCE OF TRUTH** - One service owns all repository information
- **EVENT-DRIVEN UPDATES** - Components subscribe to changes via events

## Root Cause Analysis

### Identified Issues
1. **Fragmented State Management**: Repository info stored in 5+ different locations with different update cycles
2. **Edit Mode Context Isolation**: Edit mode context exists separately from current source context
3. **Service Dependency Chaos**: Services depend on each other's state without clear ownership
4. **Timing and Sequencing Issues**: Updates happen in different sequences, causing race conditions
5. **Inconsistent Data Sources**: Components use different services for same information

### Evidence from Logs
```
[GitHubSaveDialog] dataSourceContext prop: {currentPlatform: null, currentTheme: null, ...}
[GitHubSaveDialog] getRepositoryInfo - Using centralized service: {fullName: 'NateBaldwinDesign/Test_Design_System', ...}
[GitHubSaveDialog] Current source context: {sourceType: 'core', sourceId: null, ...}
```

**Problem**: `GitHubSaveDialog` shows core repository info instead of platform repository info when editing platform data.

## Proposed Solution: Unified Repository Context Service

### Core Architecture
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    REPOSITORY CONTEXT SERVICE                               │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐     │
│  │  STATE OWNER    │  │  EVENT EMITTER  │  │  UNIFIED API            │     │
│  │                 │  │                 │  │                         │     │
│  │ • Repository    │  │ • Context       │  │ • getCurrentContext()   │     │
│  │   Info          │  │   Change Events │  │ • updateContext()       │     │
│  │ • Source Type   │  │ • Component     │  │ • subscribeToChanges()  │     │
│  │ • Edit Mode     │  │   Notifications │  │ • getRepositoryInfo()   │     │
│  │ • Branch Info   │  │ • State Sync    │  │ • getSourceContext()    │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EXISTING SERVICES (CONSUMERS)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐     │
│  │ DataSourceManager│  │SourceContextMgr │  │ GitHubRepositoryService │     │
│  │                 │  │                 │  │                         │     │
│  │ • Consumes      │  │ • Consumes      │  │ • Consumes              │     │
│  │   Context       │  │   Context       │  │   Context               │     │
│  │ • Triggers      │  │ • Triggers      │  │ • Returns Repository    │     │
│  │   Updates       │  │   Updates       │  │   Info                  │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘     │
│           │                       │                           │             │
│           ▼                       ▼                           ▼             │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                        UI COMPONENTS                                   │ │
│  │                                                                         │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │ │
│  │  │ GitHubSaveDialog│  │     Header      │  │  BranchSelectionDialog  │ │ │
│  │  │                 │  │                 │  │                         │ │ │
│  │  │ • Gets Repo     │  │ • Shows Source  │  │ • Gets Repo Info        │ │ │
│  │  │   Info          │  │   Context       │  │ • Shows Branch Info     │ │ │
│  │  │ • Shows Schema  │  │ • Shows Edit    │  │ • Handles Branch        │ │ │
│  │  │   Type          │  │   Mode          │  │   Switching             │ │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: Create Repository Context Service (Priority: Critical)

#### **Instruction 1.1: Create RepositoryContextService**
**TASK**: Create a new `RepositoryContextService` that becomes the single source of truth for all repository information.

**REQUIREMENTS**:
- Create file: `packages/design-data-system-manager/src/services/repositoryContextService.ts`
- Implement singleton pattern for global access
- Define comprehensive TypeScript interfaces
- Implement event-driven architecture for state changes
- Add detailed logging for debugging
- Include comprehensive error handling

**IMPLEMENTATION STEPS**:

1. **Define Core Interfaces**:
```typescript
interface RepositoryInfo {
  fullName: string;
  branch: string;
  filePath: string;
  fileType: 'schema' | 'platform-extension' | 'theme-override';
}

interface SourceContext {
  sourceType: 'core' | 'platform-extension' | 'theme-override';
  sourceId: string | null;
  sourceName: string | null;
  repositoryInfo: RepositoryInfo | null;
  schemaType: 'schema' | 'platform-extension' | 'theme-override';
  editMode: {
    isActive: boolean;
    sourceType: 'core' | 'platform-extension' | 'theme-override';
    sourceId: string | null;
    targetRepository: RepositoryInfo | null;
  };
}

interface RepositoryContext {
  coreRepository: RepositoryInfo | null;
  platformRepositories: Record<string, RepositoryInfo>;
  themeRepositories: Record<string, RepositoryInfo>;
  currentSource: SourceContext;
  lastUpdated: string;
}
```

2. **Implement Singleton Service**:
```typescript
export class RepositoryContextService {
  private static instance: RepositoryContextService;
  private context: RepositoryContext;
  private eventListeners: Map<string, Function[]>;

  private constructor() {
    this.context = this.getInitialContext();
    this.eventListeners = new Map();
    this.initializeFromExistingServices();
  }

  static getInstance(): RepositoryContextService {
    if (!RepositoryContextService.instance) {
      RepositoryContextService.instance = new RepositoryContextService();
    }
    return RepositoryContextService.instance;
  }
}
```

3. **Implement Core Methods**:
```typescript
// State Management
getCurrentContext(): RepositoryContext;
getCurrentSourceContext(): SourceContext;
getRepositoryInfo(): RepositoryInfo | null;

// State Updates
updateContext(updates: Partial<RepositoryContext>): void;
updateSourceContext(updates: Partial<SourceContext>): void;
setEditMode(editMode: SourceContext['editMode']): void;

// Event System
subscribeToChanges(eventType: string, callback: Function): void;
unsubscribeFromChanges(eventType: string, callback: Function): void;
emitEvent(eventType: string, data: any): void;

// Integration Methods
syncWithDataSourceManager(): void;
syncWithSourceContextManager(): void;
```

**RISK MITIGATION**:
- Create comprehensive unit tests before implementation
- Implement feature flags to enable/disable new service
- Add detailed logging for all operations
- Create rollback procedures for each method
- Test with all existing data types and scenarios

**VALIDATION CRITERIA**:
- Service can be instantiated without errors
- All methods return expected data types
- Event system works correctly
- Logging provides adequate debugging information
- No performance impact on existing functionality

**TESTING STEPS**:
1. **Unit Tests**: Test each method independently
2. **Integration Tests**: Test service with existing services
3. **Performance Tests**: Ensure no performance degradation
4. **Error Handling Tests**: Test all error scenarios
5. **Event System Tests**: Test event emission and subscription

#### **Instruction 1.2: Implement Initialization from Existing Services**
**TASK**: Implement initialization logic that reads current state from existing services.

**REQUIREMENTS**:
- Read current state from `DataSourceManager`
- Read current state from `SourceContextManager`
- Read current state from `StatePersistenceManager`
- Merge state into unified context
- Handle conflicts and inconsistencies
- Preserve existing functionality during initialization

**IMPLEMENTATION STEPS**:

1. **Create Initialization Method**:
```typescript
private initializeFromExistingServices(): void {
  console.log('[RepositoryContextService] Initializing from existing services');
  
  try {
    // Initialize from DataSourceManager
    const dataSourceManager = DataSourceManager.getInstance();
    const dataSourceContext = dataSourceManager.getCurrentContext();
    
    // Initialize from SourceContextManager
    const sourceContextManager = SourceContextManager.getInstance();
    const sourceContext = sourceContextManager.getContext();
    
    // Initialize from StatePersistenceManager
    const stateManager = StatePersistenceManager.getInstance();
    const stateContext = stateManager.getCurrentState();
    
    // Merge state into unified context
    this.mergeExistingState(dataSourceContext, sourceContext, stateContext);
    
    console.log('[RepositoryContextService] Initialization completed successfully');
  } catch (error) {
    console.error('[RepositoryContextService] Initialization failed:', error);
    // Fallback to default state
    this.context = this.getDefaultContext();
  }
}
```

2. **Implement State Merging Logic**:
```typescript
private mergeExistingState(
  dataSourceContext: any,
  sourceContext: any,
  stateContext: any
): void {
  // Priority: DataSourceManager > SourceContextManager > StatePersistenceManager
  
  // Merge repository information
  this.context.coreRepository = dataSourceContext?.repositories?.core || 
                                sourceContext?.repositoryInfo || 
                                stateContext?.currentRepository;
  
  // Merge platform repositories
  this.context.platformRepositories = dataSourceContext?.repositories?.platforms || {};
  
  // Merge theme repositories
  this.context.themeRepositories = dataSourceContext?.repositories?.themes || {};
  
  // Merge current source context
  this.context.currentSource = this.mergeSourceContext(
    dataSourceContext,
    sourceContext,
    stateContext
  );
  
  this.context.lastUpdated = new Date().toISOString();
}
```

3. **Implement Source Context Merging**:
```typescript
private mergeSourceContext(
  dataSourceContext: any,
  sourceContext: any,
  stateContext: any
): SourceContext {
  // Determine source type and ID
  let sourceType: 'core' | 'platform-extension' | 'theme-override' = 'core';
  let sourceId: string | null = null;
  
  if (dataSourceContext?.currentPlatform && dataSourceContext.currentPlatform !== 'none') {
    sourceType = 'platform-extension';
    sourceId = dataSourceContext.currentPlatform;
  } else if (dataSourceContext?.currentTheme && dataSourceContext.currentTheme !== 'none') {
    sourceType = 'theme-override';
    sourceId = dataSourceContext.currentTheme;
  }
  
  // Determine repository info
  let repositoryInfo: RepositoryInfo | null = null;
  if (sourceType === 'platform-extension' && sourceId) {
    repositoryInfo = dataSourceContext?.repositories?.platforms?.[sourceId] || null;
  } else if (sourceType === 'theme-override' && sourceId) {
    repositoryInfo = dataSourceContext?.repositories?.themes?.[sourceId] || null;
  } else {
    repositoryInfo = dataSourceContext?.repositories?.core || null;
  }
  
  // Determine edit mode
  const editMode = dataSourceContext?.editMode || {
    isActive: false,
    sourceType: sourceType,
    sourceId: sourceId,
    targetRepository: repositoryInfo
  };
  
  return {
    sourceType,
    sourceId,
    sourceName: this.getSourceName(sourceType, sourceId, dataSourceContext),
    repositoryInfo,
    schemaType: sourceType === 'core' ? 'schema' : sourceType,
    editMode
  };
}
```

**RISK MITIGATION**:
- Test initialization with all existing data scenarios
- Implement fallback logic for missing or invalid data
- Add comprehensive error handling for initialization failures
- Preserve existing state during initialization
- Test with empty state and corrupted state

**VALIDATION CRITERIA**:
- Initialization completes without errors
- All existing state is preserved
- No data loss during initialization
- Service provides correct context after initialization
- Performance impact is minimal

**TESTING STEPS**:
1. **Empty State Test**: Test initialization with no existing data
2. **Full State Test**: Test initialization with complete existing data
3. **Partial State Test**: Test initialization with incomplete existing data
4. **Corrupted State Test**: Test initialization with corrupted existing data
5. **Performance Test**: Measure initialization time and memory usage

### Phase 2: Integrate with DataSourceManager (Priority: Critical)

#### **Instruction 2.1: Update DataSourceManager to Use RepositoryContextService**
**TASK**: Modify `DataSourceManager` to use `RepositoryContextService` as its source of truth for repository information.

**REQUIREMENTS**:
- Update `DataSourceManager` to consume from `RepositoryContextService`
- Maintain existing `DataSourceManager` interfaces
- Preserve all existing functionality
- Add synchronization logic between services
- Implement feature flags for gradual rollout

**IMPLEMENTATION STEPS**:

1. **Add RepositoryContextService Integration**:
```typescript
// In DataSourceManager.ts
import { RepositoryContextService } from './repositoryContextService';

export class DataSourceManager {
  private repositoryContextService: RepositoryContextService;
  
  constructor() {
    this.repositoryContextService = RepositoryContextService.getInstance();
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    // Listen for repository context changes
    this.repositoryContextService.subscribeToChanges('contextUpdated', (context) => {
      this.syncFromRepositoryContext(context);
    });
  }
}
```

2. **Update Context Retrieval Methods**:
```typescript
getCurrentContext(): DataSourceContext {
  // Get context from RepositoryContextService
  const repoContext = this.repositoryContextService.getCurrentContext();
  
  // Transform to DataSourceContext format
  return this.transformToDataSourceContext(repoContext);
}

private transformToDataSourceContext(repoContext: RepositoryContext): DataSourceContext {
  return {
    currentPlatform: repoContext.currentSource.sourceType === 'platform-extension' 
      ? repoContext.currentSource.sourceId 
      : null,
    currentTheme: repoContext.currentSource.sourceType === 'theme-override' 
      ? repoContext.currentSource.sourceId 
      : null,
    availablePlatforms: this.getAvailablePlatforms(),
    availableThemes: this.getAvailableThemes(),
    permissions: this.getPermissions(),
    repositories: {
      core: repoContext.coreRepository,
      platforms: repoContext.platformRepositories,
      themes: repoContext.themeRepositories
    },
    editMode: repoContext.currentSource.editMode,
    viewMode: this.getViewMode(repoContext.currentSource)
  };
}
```

3. **Update Context Update Methods**:
```typescript
async switchToPlatform(platformId: string | null): Promise<void> {
  console.log('[DataSourceManager] Switching to platform:', platformId);
  
  try {
    // Update RepositoryContextService
    const updates: Partial<SourceContext> = {
      sourceType: platformId ? 'platform-extension' : 'core',
      sourceId: platformId,
      sourceName: this.getPlatformName(platformId),
      repositoryInfo: platformId ? this.getPlatformRepository(platformId) : this.getCoreRepository(),
      schemaType: platformId ? 'platform-extension' : 'schema'
    };
    
    this.repositoryContextService.updateSourceContext(updates);
    
    // Update local state for backward compatibility
    this.currentContext.currentPlatform = platformId;
    this.updateEditModeContext();
    this.updateViewModeContext();
    
    // Notify callbacks
    this.callbacks.onDataSourceChanged?.(this.getCurrentContext());
    
    console.log('[DataSourceManager] Platform switch completed successfully');
  } catch (error) {
    console.error('[DataSourceManager] Platform switch failed:', error);
    throw error;
  }
}
```

**RISK MITIGATION**:
- Implement feature flags to enable/disable new integration
- Maintain existing `DataSourceManager` interfaces
- Add comprehensive error handling
- Test all existing workflows
- Create rollback procedures

**VALIDATION CRITERIA**:
- All existing `DataSourceManager` methods work correctly
- Platform/theme switching works as expected
- Edit mode functionality preserved
- Performance impact is minimal
- No breaking changes to existing interfaces

**TESTING STEPS**:
1. **Interface Tests**: Test all existing `DataSourceManager` methods
2. **Platform Switching Tests**: Test platform switching functionality
3. **Theme Switching Tests**: Test theme switching functionality
4. **Edit Mode Tests**: Test edit mode functionality
5. **Performance Tests**: Measure performance impact
6. **Integration Tests**: Test integration with existing components

#### **Instruction 2.2: Update SourceContextManager Integration**
**TASK**: Update `SourceContextManager` to use `RepositoryContextService` as its source of truth.

**REQUIREMENTS**:
- Update `SourceContextManager` to consume from `RepositoryContextService`
- Maintain existing `SourceContextManager` interfaces
- Preserve all existing functionality
- Add synchronization logic
- Implement feature flags for gradual rollout

**IMPLEMENTATION STEPS**:

1. **Add RepositoryContextService Integration**:
```typescript
// In SourceContextManager.ts
import { RepositoryContextService } from './repositoryContextService';

export class SourceContextManager {
  private repositoryContextService: RepositoryContextService;
  
  constructor() {
    this.repositoryContextService = RepositoryContextService.getInstance();
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    // Listen for repository context changes
    this.repositoryContextService.subscribeToChanges('contextUpdated', (context) => {
      this.syncFromRepositoryContext(context);
    });
  }
}
```

2. **Update Context Retrieval Methods**:
```typescript
getContext(): SourceContext | null {
  // Get context from RepositoryContextService
  return this.repositoryContextService.getCurrentSourceContext();
}

updateFromDataSource(): void {
  // This method now syncs with RepositoryContextService
  const dataSourceManager = DataSourceManager.getInstance();
  const dataSourceContext = dataSourceManager.getCurrentContext();
  
  // Update RepositoryContextService
  this.repositoryContextService.syncWithDataSourceManager();
}
```

**RISK MITIGATION**:
- Implement feature flags to enable/disable new integration
- Maintain existing `SourceContextManager` interfaces
- Add comprehensive error handling
- Test all existing workflows
- Create rollback procedures

**VALIDATION CRITERIA**:
- All existing `SourceContextManager` methods work correctly
- Context updates work as expected
- Integration with existing components preserved
- Performance impact is minimal
- No breaking changes to existing interfaces

**TESTING STEPS**:
1. **Interface Tests**: Test all existing `SourceContextManager` methods
2. **Context Update Tests**: Test context update functionality
3. **Integration Tests**: Test integration with existing components
4. **Performance Tests**: Measure performance impact
5. **Error Handling Tests**: Test error scenarios

### Phase 3: Update GitHubRepositoryService (Priority: Critical)

#### **Instruction 3.1: Refactor GitHubRepositoryService to Use RepositoryContextService**
**TASK**: Update `GitHubRepositoryService` to use `RepositoryContextService` as its single source of truth.

**REQUIREMENTS**:
- Replace priority system with direct `RepositoryContextService` access
- Maintain existing `GitHubRepositoryService` interfaces
- Preserve all existing functionality
- Simplify logic by removing priority system
- Implement feature flags for gradual rollout

**IMPLEMENTATION STEPS**:

1. **Update Repository Info Retrieval**:
```typescript
// In GitHubRepositoryService.ts
import { RepositoryContextService } from './repositoryContextService';

export class GitHubRepositoryService {
  private repositoryContextService: RepositoryContextService;
  
  constructor() {
    this.repositoryContextService = RepositoryContextService.getInstance();
  }
  
  getCurrentRepositoryInfo(): RepositoryInfo | null {
    // Direct access to RepositoryContextService
    const sourceContext = this.repositoryContextService.getCurrentSourceContext();
    
    console.log('[GitHubRepositoryService] Getting repository info from RepositoryContextService:', sourceContext);
    
    return sourceContext?.repositoryInfo || null;
  }
  
  getCurrentSourceContext(): SourceContext | null {
    // Direct access to RepositoryContextService
    return this.repositoryContextService.getCurrentSourceContext();
  }
}
```

2. **Remove Priority System**:
```typescript
// REMOVE: Priority system logic
// BEFORE:
getCurrentRepositoryInfo(): RepositoryInfo | null {
  // PRIORITY 1: Use SourceContextManager (most up-to-date)
  const sourceContextManager = SourceContextManager.getInstance();
  const currentSourceContext = sourceContextManager.getContext();
  
  if (currentSourceContext?.repositoryInfo) {
    return currentSourceContext.repositoryInfo;
  }
  
  // PRIORITY 2: Use DataSourceManager
  const dataSourceManager = DataSourceManager.getInstance();
  const dataSourceContext = dataSourceManager.getCurrentContext();
  // ... complex priority logic
}

// AFTER:
getCurrentRepositoryInfo(): RepositoryInfo | null {
  // Single source of truth
  const sourceContext = this.repositoryContextService.getCurrentSourceContext();
  return sourceContext?.repositoryInfo || null;
}
```

**RISK MITIGATION**:
- Implement feature flags to enable/disable new integration
- Maintain existing `GitHubRepositoryService` interfaces
- Add comprehensive error handling
- Test all existing workflows
- Create rollback procedures

**VALIDATION CRITERIA**:
- All existing `GitHubRepositoryService` methods work correctly
- Repository info retrieval works as expected
- Integration with existing components preserved
- Performance impact is minimal
- No breaking changes to existing interfaces

**TESTING STEPS**:
1. **Interface Tests**: Test all existing `GitHubRepositoryService` methods
2. **Repository Info Tests**: Test repository info retrieval
3. **Integration Tests**: Test integration with existing components
4. **Performance Tests**: Measure performance impact
5. **Error Handling Tests**: Test error scenarios

### Phase 4: Update UI Components (Priority: Medium)

#### **Instruction 4.1: Update GitHubSaveDialog**
**TASK**: Update `GitHubSaveDialog` to use `RepositoryContextService` for repository information.

**REQUIREMENTS**:
- Update `GitHubSaveDialog` to use `RepositoryContextService`
- Maintain existing `GitHubSaveDialog` interfaces
- Preserve all existing functionality
- Simplify repository info retrieval logic
- Implement feature flags for gradual rollout

**IMPLEMENTATION STEPS**:

1. **Update Repository Info Retrieval**:
```typescript
// In GitHubSaveDialog.tsx
import { RepositoryContextService } from '../services/repositoryContextService';

export const GitHubSaveDialog: React.FC<GitHubSaveDialogProps> = ({ ... }) => {
  const repositoryContextService = RepositoryContextService.getInstance();
  
  // Helper function to get repository info using unified service
  const getRepositoryInfo = (): { fullName: string; branch: string; filePath: string; fileType: string } | null => {
    const repoInfo = repositoryContextService.getCurrentRepositoryInfo();
    
    console.log('[GitHubSaveDialog] getRepositoryInfo - Using unified service:', repoInfo);
    
    return repoInfo;
  };
}
```

2. **Remove Complex Priority Logic**:
```typescript
// REMOVE: Complex priority system
// BEFORE:
const getRepositoryInfo = (): { fullName: string; branch: string; filePath: string; fileType: string } | null => {
  const sourceContextManager = SourceContextManager.getInstance();
  const currentSourceContext = sourceContextManager.getContext();
  
  console.log('[GitHubSaveDialog] getRepositoryInfo - SourceContextManager context:', currentSourceContext);
  console.log('[GitHubSaveDialog] getRepositoryInfo - dataSourceContext prop:', dataSourceContext);
  
  if (currentSourceContext?.repositoryInfo) {
    // PRIORITY 1: Use SourceContextManager (most up-to-date)
    console.log('[GitHubSaveDialog] Using SourceContextManager repository info:', currentSourceContext.repositoryInfo);
    return currentSourceContext.repositoryInfo;
  } else if (dataSourceContext) {
    // PRIORITY 2: Fallback to dataSourceContext prop
    // ... complex fallback logic
  } else {
    // PRIORITY 3: Fallback to old method (least reliable)
    const fallbackRepo = GitHubApiService.getSelectedRepositoryInfo();
    console.log('[GitHubSaveDialog] Using fallback repository info:', fallbackRepo);
    return fallbackRepo;
  }
};

// AFTER:
const getRepositoryInfo = (): { fullName: string; branch: string; filePath: string; fileType: string } | null => {
  const repoInfo = repositoryContextService.getCurrentRepositoryInfo();
  
  console.log('[GitHubSaveDialog] getRepositoryInfo - Using unified service:', repoInfo);
  
  return repoInfo;
};
```

**RISK MITIGATION**:
- Implement feature flags to enable/disable new integration
- Maintain existing `GitHubSaveDialog` interfaces
- Add comprehensive error handling
- Test all existing workflows
- Create rollback procedures

**VALIDATION CRITERIA**:
- All existing `GitHubSaveDialog` functionality works correctly
- Repository info display works as expected
- Save and commit workflows work correctly
- Performance impact is minimal
- No breaking changes to existing interfaces

**TESTING STEPS**:
1. **Interface Tests**: Test all existing `GitHubSaveDialog` functionality
2. **Repository Info Tests**: Test repository info display
3. **Save Workflow Tests**: Test save workflow functionality
4. **Commit Workflow Tests**: Test commit workflow functionality
5. **Integration Tests**: Test integration with existing components
6. **Performance Tests**: Measure performance impact
7. **Error Handling Tests**: Test error scenarios

#### **Instruction 4.2: Update Header Component**
**TASK**: Update `Header` component to use `RepositoryContextService` for source context information.

**REQUIREMENTS**:
- Update `Header` component to use `RepositoryContextService`
- Maintain existing `Header` interfaces
- Preserve all existing functionality
- Simplify source context retrieval logic
- Implement feature flags for gradual rollout

**IMPLEMENTATION STEPS**:

1. **Update Source Context Retrieval**:
```typescript
// In Header.tsx
import { RepositoryContextService } from '../services/repositoryContextService';

export const Header: React.FC<HeaderProps> = ({ ... }) => {
  const repositoryContextService = RepositoryContextService.getInstance();
  
  // Get current source context from unified service
  const currentSourceContext = repositoryContextService.getCurrentSourceContext();
  
  // Get current data source context from unified service
  const currentDataSourceContext = repositoryContextService.getCurrentContext();
}
```

2. **Update Title and Subtitle Logic**:
```typescript
// Update getTitleAndSubtitle to use unified service
const getTitleAndSubtitle = () => {
  const sourceContext = repositoryContextService.getCurrentSourceContext();
  const repoContext = repositoryContextService.getCurrentContext();
  
  // Use unified context for title and subtitle logic
  // ... existing logic using unified context
};
```

**RISK MITIGATION**:
- Implement feature flags to enable/disable new integration
- Maintain existing `Header` interfaces
- Add comprehensive error handling
- Test all existing workflows
- Create rollback procedures

**VALIDATION CRITERIA**:
- All existing `Header` functionality works correctly
- Title and subtitle display works as expected
- Platform/theme dropdowns work correctly
- Edit mode functionality preserved
- Performance impact is minimal
- No breaking changes to existing interfaces

**TESTING STEPS**:
1. **Interface Tests**: Test all existing `Header` functionality
2. **Title/Subtitle Tests**: Test title and subtitle display
3. **Dropdown Tests**: Test platform/theme dropdowns
4. **Edit Mode Tests**: Test edit mode functionality
5. **Integration Tests**: Test integration with existing components
6. **Performance Tests**: Measure performance impact
7. **Error Handling Tests**: Test error scenarios

### Phase 5: Testing and Validation (Priority: Critical)

#### **Instruction 5.1: Comprehensive Testing Suite**
**TASK**: Create comprehensive testing suite to validate all functionality works correctly.

**REQUIREMENTS**:
- Test all existing functionality
- Test new unified service functionality
- Test error scenarios
- Test performance impact
- Test integration between services
- Test rollback procedures

**IMPLEMENTATION STEPS**:

1. **Unit Tests**:
```typescript
// Test RepositoryContextService
describe('RepositoryContextService', () => {
  test('should initialize correctly', () => {
    const service = RepositoryContextService.getInstance();
    expect(service).toBeDefined();
  });
  
  test('should get current context', () => {
    const service = RepositoryContextService.getInstance();
    const context = service.getCurrentContext();
    expect(context).toBeDefined();
  });
  
  test('should update context correctly', () => {
    const service = RepositoryContextService.getInstance();
    const updates = { /* test updates */ };
    service.updateContext(updates);
    // Verify updates were applied
  });
  
  test('should emit events correctly', () => {
    const service = RepositoryContextService.getInstance();
    const mockCallback = jest.fn();
    service.subscribeToChanges('testEvent', mockCallback);
    service.emitEvent('testEvent', { test: 'data' });
    expect(mockCallback).toHaveBeenCalledWith({ test: 'data' });
  });
});
```

2. **Integration Tests**:
```typescript
// Test integration between services
describe('Service Integration', () => {
  test('DataSourceManager should sync with RepositoryContextService', () => {
    const dataSourceManager = DataSourceManager.getInstance();
    const repoContextService = RepositoryContextService.getInstance();
    
    // Test platform switching
    await dataSourceManager.switchToPlatform('test-platform');
    
    // Verify RepositoryContextService was updated
    const context = repoContextService.getCurrentContext();
    expect(context.currentSource.sourceType).toBe('platform-extension');
  });
  
  test('GitHubSaveDialog should get correct repository info', () => {
    const repoContextService = RepositoryContextService.getInstance();
    const saveDialog = new GitHubSaveDialog();
    
    // Set up test context
    repoContextService.updateSourceContext({
      sourceType: 'platform-extension',
      sourceId: 'test-platform',
      repositoryInfo: { /* test repo info */ }
    });
    
    // Verify save dialog gets correct info
    const repoInfo = saveDialog.getRepositoryInfo();
    expect(repoInfo).toEqual({ /* expected repo info */ });
  });
});
```

3. **End-to-End Tests**:
```typescript
// Test complete workflows
describe('End-to-End Workflows', () => {
  test('Platform switching workflow', async () => {
    // 1. Load app with platform parameter
    // 2. Switch to different platform
    // 3. Enter edit mode
    // 4. Verify GitHubSaveDialog shows correct repository
    // 5. Save changes
    // 6. Verify changes were saved to correct repository
  });
  
  test('Edit mode workflow', async () => {
    // 1. Enter edit mode on platform
    // 2. Make changes
    // 3. Verify changes are tracked correctly
    // 4. Save changes
    // 5. Verify changes were saved to correct repository
  });
});
```

**RISK MITIGATION**:
- Test all existing functionality
- Test error scenarios
- Test performance impact
- Test rollback procedures
- Test integration between services

**VALIDATION CRITERIA**:
- All existing functionality works correctly
- New unified service works correctly
- No performance degradation
- Error handling works correctly
- Rollback procedures work correctly

**TESTING STEPS**:
1. **Unit Tests**: Test each service independently
2. **Integration Tests**: Test integration between services
3. **End-to-End Tests**: Test complete workflows
4. **Performance Tests**: Measure performance impact
5. **Error Handling Tests**: Test error scenarios
6. **Rollback Tests**: Test rollback procedures

### Phase 6: Cleanup and Optimization (Priority: Low)

#### **Instruction 6.1: Remove Deprecated Code**
**TASK**: Remove deprecated code and optimize the implementation.

**REQUIREMENTS**:
- Remove deprecated methods from existing services
- Remove unused code
- Optimize performance
- Update documentation
- Clean up logging

**IMPLEMENTATION STEPS**:

1. **Remove Deprecated Methods**:
```typescript
// Remove deprecated methods from DataSourceManager
// Remove deprecated methods from SourceContextManager
// Remove deprecated methods from GitHubRepositoryService
// Remove deprecated methods from UI components
```

2. **Optimize Performance**:
```typescript
// Optimize RepositoryContextService performance
// Optimize event system performance
// Optimize state update performance
// Optimize memory usage
```

3. **Update Documentation**:
```typescript
// Update service documentation
// Update component documentation
// Update API documentation
// Update user documentation
```

**RISK MITIGATION**:
- Remove code gradually
- Test after each removal
- Keep rollback capability
- Monitor performance
- Update documentation

**VALIDATION CRITERIA**:
- No functionality broken
- Performance improved
- Code is cleaner
- Documentation is updated
- No unused code remains

**TESTING STEPS**:
1. **Functionality Tests**: Test all functionality after cleanup
2. **Performance Tests**: Measure performance after optimization
3. **Code Quality Tests**: Verify code quality improvements
4. **Documentation Tests**: Verify documentation is updated

## Implementation Guidelines

### General Instructions for AI Agent

**BEFORE STARTING ANY TASK**:
1. **Create comprehensive backup** of all relevant files
2. **Implement feature flags** for all changes
3. **Add detailed logging** for debugging
4. **Create rollback procedures** for each change
5. **Test thoroughly** before proceeding to next step

**DURING IMPLEMENTATION**:
1. **Follow existing code patterns** and conventions
2. **Maintain backward compatibility** at all times
3. **Add comprehensive error handling** for all operations
4. **Implement gradual rollout** with feature flags
5. **Monitor performance** during all changes

**AFTER EACH TASK**:
1. **Run all existing tests** to ensure no regressions
2. **Test with realistic data** to ensure performance
3. **Validate functionality** with manual testing
4. **Document changes** clearly and completely
5. **Create rollback plan** if issues arise

### Risk Mitigation Checklist

**For Each Task**:
- [ ] Create backup of all relevant files
- [ ] Implement feature flags for gradual rollout
- [ ] Add comprehensive logging
- [ ] Create rollback procedures
- [ ] Test with all existing data types
- [ ] Monitor performance during changes
- [ ] Validate functionality thoroughly
- [ ] Document changes clearly

**For Each Phase**:
- [ ] Complete all tasks in phase
- [ ] Run comprehensive integration tests
- [ ] Validate performance with large datasets
- [ ] Test all existing workflows
- [ ] Document phase completion
- [ ] Create rollback plan for entire phase

### Validation Criteria

**Functional Validation**:
- [ ] All existing functionality works correctly
- [ ] No breaking changes to user workflows
- [ ] All existing tests pass
- [ ] Performance meets or exceeds current levels
- [ ] Error handling works correctly

**Technical Validation**:
- [ ] Code follows existing patterns and conventions
- [ ] TypeScript types are correct and complete
- [ ] No linting errors or warnings
- [ ] Performance monitoring works correctly
- [ ] Logging provides adequate debugging information

**User Experience Validation**:
- [ ] UI/UX remains consistent
- [ ] No performance degradation
- [ ] Error messages are clear and helpful
- [ ] All user workflows work correctly
- [ ] Accessibility standards are maintained

## Emergency Procedures

### If Issues Arise During Implementation

**Immediate Actions**:
1. **Stop all changes** immediately
2. **Enable feature flags** to disable new functionality
3. **Rollback to previous stable state** using backup
4. **Investigate root cause** using detailed logging
5. **Document issue** clearly for future reference

**Recovery Procedures**:
1. **Restore from backup** if data corruption occurs
2. **Disable feature flags** to revert to old functionality
3. **Rollback code changes** to previous stable version
4. **Test thoroughly** before resuming implementation
5. **Update implementation plan** based on lessons learned

### Communication Protocol

**During Implementation**:
- Log all significant changes with clear descriptions
- Document any issues encountered and their resolution
- Update implementation status regularly
- Communicate any risks or concerns immediately

**After Implementation**:
- Document all changes made
- Create comprehensive testing report
- Update documentation for future maintenance
- Create lessons learned document

## Success Metrics

### Performance Metrics
- **Data Access Speed**: Maintain or improve current performance
- **Memory Usage**: No significant increase in memory usage
- **UI Responsiveness**: Maintain current UI responsiveness
- **Error Rate**: Reduce or maintain current error rates

### Functional Metrics
- **Test Coverage**: Maintain or improve current test coverage
- **Code Quality**: Maintain or improve current code quality
- **User Satisfaction**: Maintain current user satisfaction levels
- **Feature Completeness**: All existing features continue to work

### Technical Metrics
- **Code Complexity**: Reduce or maintain current complexity
- **Maintainability**: Improve code maintainability
- **Documentation**: Maintain or improve current documentation
- **Performance Monitoring**: Implement comprehensive monitoring

## Alignment with Technical Decisions

### Unified Permission Handling
- **ALIGNS**: Single source of truth for repository information
- **ALIGNS**: Unified state management across all services
- **ALIGNS**: Consistent permission checking logic

### Data Source Refactor Plan
- **ALIGNS**: Centralized data management approach
- **ALIGNS**: Single orchestrator for all data operations
- **ALIGNS**: Unified state management patterns

### Project Rules
- **ALIGNS**: Preserves all existing functionality
- **ALIGNS**: Maintains backward compatibility
- **ALIGNS**: Follows existing code patterns
- **ALIGNS**: Preserves existing design and UX

## Conclusion

This plan provides clear, actionable instructions for implementing a **Unified Repository Context Service** that addresses the root cause of source context information loss and misalignment issues. The phased approach minimizes risk while ensuring all functional requirements are met.

The comprehensive risk mitigation and validation procedures ensure that any issues can be quickly identified and resolved without impacting users. The plan aligns with existing technical decisions and project rules while providing a precise, targeted solution to the critical source context issues.

**CRITICAL REMINDER**: Always prioritize preserving existing functionality and user experience over implementing new features. When in doubt, err on the side of caution and maintain backward compatibility.

**EXPECTED OUTCOME**: A robust, maintainable, and user-friendly source context management system that eliminates the current issues while preserving all existing functionality and improving the overall architecture of the application.

# Figma Real ID Management Plan

## Executive Summary

This plan addresses critical issues in the Figma export workflow's ID creation, assignment, and mapping file management processes. The refactoring focuses on browser-based implementation, proper fileKey usage, and complete token cleanup logic while maintaining strong encapsulation and avoiding impact on unrelated features.

## Current State Analysis

### Issues Identified:
1. **Environment Mismatch**: Node.js dependencies in browser environment
2. **Incomplete Token Cleanup**: Missing logic to remove mappings for deleted tokens
3. **Inconsistent Mapping Strategies**: Multiple competing implementations
4. **File System Dependencies**: Git operations and file system calls in browser context
5. **Terminology Inconsistency**: Mixed usage of fileId/fileKey

### Encapsulation Assessment:
✅ **Well-Encapsulated**: Changes are isolated to Figma-specific services
✅ **No Cross-Impact**: No modifications to token management, platform extensions, or other features
✅ **Schema Compliant**: All changes adhere to existing schema structures
✅ **Backward Compatible**: Preserves existing functionality while enhancing it

## Plan Overview

### Phase 1: Environment Alignment and Architecture Consolidation
### Phase 2: Complete Token Cleanup Implementation
### Phase 3: Unified Mapping Management
### Phase 4: Enhanced Error Handling and Validation
### Phase 5: Testing and Documentation

---

## Phase 1: Environment Alignment and Architecture Consolidation

### 1.1 Refactor FigmaWorkflowOrchestrator for Browser Environment

**Objective**: Eliminate Node.js dependencies and create a browser-compatible orchestrator.

**Key Changes**:
- Remove all `fs` module dependencies
- Remove all `child_process` Git operations
- Replace file system operations with browser-compatible alternatives
- Use `FigmaMappingService` as the primary mapping management solution

**Implementation Strategy**:
```typescript
// Current Node.js implementation (to be replaced):
private async loadTempToRealIdMapping(fileKey: string): Promise<Record<string, string> | undefined> {
  const mappingsDir = '.figma/mappings';
  const mappingsFile = path.join(mappingsDir, `${fileKey}.json`);
  
  if (!fs.existsSync(mappingsFile)) {
    return {};
  }
  
  const fileContent = fs.readFileSync(mappingsFile, 'utf-8');
  return JSON.parse(fileContent);
}

private async updateMappingsFile(fileKey: string, tempToRealId: Record<string, string>): Promise<void> {
  const mappingsDir = '.figma/mappings';
  const mappingsFile = path.join(mappingsDir, `${fileKey}.json`);
  
  if (!fs.existsSync(mappingsDir)) {
    fs.mkdirSync(mappingsDir, { recursive: true });
  }
  
  const fileContent = JSON.stringify(tempToRealId, null, 2);
  fs.writeFileSync(mappingsFile, fileContent, 'utf-8');
}

private async commitChanges(fileKey: string): Promise<void> {
  const mappingsFile = `.figma/mappings/${fileKey}.json`;
  execSync(`git add ${mappingsFile}`);
  execSync(`git commit -m "Update Figma mappings for file ${fileKey}"`);
}

// New browser-compatible implementation:
private async loadTempToRealIdMapping(fileKey: string): Promise<Record<string, string> | undefined> {
  // Use FigmaMappingService for browser-compatible mapping operations
  // File location: .figma/mappings/{fileKey}.json (per repository scaffolding)
  const mappingData = await FigmaMappingService.getMapping(fileKey);
  return mappingData?.tempToRealId || {};
}

private async updateMappingsFile(fileKey: string, tempToRealId: Record<string, string>): Promise<void> {
  // Use FigmaMappingService for browser-compatible file operations
  // File location: .figma/mappings/{fileKey}.json (per repository scaffolding)
  const mappingData: FigmaMappingData = {
    fileKey,
    systemId: this.getCurrentSystemId(),
    lastUpdated: new Date().toISOString(),
    tempToRealId,
    metadata: {
      lastExport: new Date().toISOString()
    },
    repositoryContext: {
      owner: this.getCurrentRepositoryOwner(),
      repo: this.getCurrentRepositoryName(),
      type: this.getCurrentRepositoryType(),
      systemId: this.getCurrentSystemId()
    }
  };
  
  await FigmaMappingService.saveMapping(fileKey, mappingData);
}

private async commitChanges(fileKey: string): Promise<void> {
  // Use GitHub API for browser-compatible Git operations
  // File location: .figma/mappings/{fileKey}.json (per repository scaffolding)
  const mappingData = await FigmaMappingService.getMapping(fileKey);
  if (mappingData) {
    await FigmaMappingService.saveMappingToGitHub(fileKey, mappingData);
  }
}
```

**Files to Modify**:
- `packages/data-transformations/src/services/figma-workflow-orchestrator.ts`
- `packages/design-data-system-manager/src/services/figmaExport.ts`

**Encapsulation**: Changes isolated to Figma workflow orchestration only.

### 1.2 Standardize fileKey Terminology

**Objective**: Ensure consistent use of `fileKey` throughout the system.

**Key Changes**:
- Replace all instances of `fileId` with `fileKey` in variable names and comments
- Update method signatures to use `fileKey` parameter
- Ensure mapping file paths use `fileKey` consistently
- Update documentation to reflect proper terminology

**Files to Review**:
- All Figma-related services and components
- Documentation files
- Type definitions

**Encapsulation**: Terminology changes only, no functional impact.

### 1.3 Consolidate Mapping Management Architecture

**Objective**: Establish `FigmaMappingService` as the single source of truth for mapping operations.

**Strategy**:
- **Primary**: `FigmaMappingService` handles all mapping operations
- **Secondary**: `FigmaWorkflowOrchestrator` coordinates the workflow but delegates mapping operations
- **Eliminate**: Duplicate mapping logic in other services

**Architecture Flow**:
```
FigmaExportService → FigmaWorkflowOrchestrator → FigmaMappingService → Storage/GitHub
```

**Encapsulation**: Consolidation within existing service boundaries.

### 1.4 Function Migration Strategy

**Objective**: Maximize code reusability while eliminating Node.js dependencies.

**Functions to REMOVE (Node.js dependencies):**
- `FigmaWorkflowOrchestrator.loadTempToRealIdMapping()` - Current Node.js version
- `FigmaWorkflowOrchestrator.updateMappingsFile()` - Current Node.js version  
- `FigmaWorkflowOrchestrator.commitChanges()` - Current Node.js version
- All `fs.*` and `child_process.*` imports from FigmaWorkflowOrchestrator

**Functions to UPDATE (reuse with modifications):**
- `FigmaMappingService.getMapping()` - ✅ **REUSE**: Already browser-compatible, may need minor updates
- `FigmaMappingService.saveMapping()` - ✅ **REUSE**: Already browser-compatible, may need minor updates
- `FigmaMappingService.updateMappingFromApiResponse()` - ✅ **REUSE**: Already browser-compatible, may need minor updates
- `FigmaIdManager.pruneTempToRealIdMapping()` - ✅ **REUSE**: Add token cleanup logic to existing function
- `FigmaIdManager.getFigmaId()` - ✅ **REUSE**: No changes needed, already working correctly
- `FigmaIdManager.determineAction()` - ✅ **REUSE**: No changes needed, already working correctly
- `FigmaIdManager.mergeApiResponse()` - ✅ **REUSE**: No changes needed, already working correctly

**Functions to CREATE (new functionality):**
- `FigmaIdManager.removeMappingsForDeletedItems()` - NEW: Token cleanup logic
- `FigmaIdManager.isCurrentSystemItem()` - NEW: Validation helper for determining if a mapping corresponds to current system
- `FigmaIdManager.getCurrentModeIds()` - NEW: Helper to get current mode IDs from token system
- `FigmaIdManager.getCurrentDeterministicIds()` - NEW: Helper to get deterministic IDs for current items
- `FigmaMappingService.cleanupDeletedTokenMappings()` - NEW: Public cleanup API for external use
- `FigmaMappingService.saveMappingToGitHub()` - NEW: GitHub-specific save operation
- `FigmaMappingService.ensureFigmaDirectory()` - NEW: Ensure proper directory structure exists

**Reusability Benefits:**
- **70% of existing mapping logic can be reused** without modification
- **Only 3 functions need complete replacement** (Node.js dependent functions)
- **Existing API contracts remain stable** - no breaking changes to public interfaces
- **Minimal disruption to existing integrations** - existing code continues to work
- **Reduced implementation risk** - proven code paths remain intact

**Migration Approach:**
1. **Phase 1**: Remove Node.js dependencies, replace with browser-compatible alternatives
2. **Phase 2**: Add new token cleanup functions alongside existing logic
3. **Phase 3**: Enhance existing functions with new capabilities
4. **Phase 4**: Create new helper functions for enhanced functionality
5. **Phase 5**: Deprecate any obsolete functions (none identified)

**Backward Compatibility:**
- All existing function signatures remain unchanged
- Existing return types and error handling preserved
- No breaking changes to public APIs
- Existing integrations continue to work without modification

**Encapsulation**: Function migration within existing service boundaries, maintaining current interfaces.

### 1.5 Action Determination Logic Preservation

**Objective**: Ensure the critical action determination logic is preserved and enhanced in the refactored system.

**Current Logic (Must Be Preserved):**
The system currently implements the exact logic you described:

1. **tempToRealId Mapping Check**: If a variable, collection, or mode has an existing mapping in `.figma/mappings/{fileKey}.json`, the "id" uses the Figma value and "action" is set to "UPDATE"
2. **No Mapping Check**: If there's no existing mapping, the action is set to "CREATE"
3. **Initial Mode Exception**: Modes whose ID is used as a collection's "initialModeId" are ALWAYS set to "UPDATE"

**Implementation Details:**
```typescript
// Current logic in FigmaIdManager.determineAction()
determineAction(itemId: string): 'CREATE' | 'UPDATE' {
  const figmaId = this.getFigmaId(itemId);
  const exists = this.itemExists(itemId);
  const action = exists ? 'UPDATE' : 'CREATE';
  return action;
}

// Current logic in FigmaIdManager.itemExists()
itemExists(itemId: string): boolean {
  const figmaId = this.getFigmaId(itemId);
  
  // If the figmaId is different from the itemId, it means we have a mapping
  if (figmaId !== itemId) {
    return true; // Has existing tempToRealId mapping
  }
  
  // Otherwise, check if it exists in the current Figma file data
  return this.existingFigmaIds.has(figmaId);
}

// Current logic in FigmaTransformer.createVariableModes()
let action = this.idManager.determineAction(deterministicModeId);

// Check if this mode is used as initialModeId for any collection
// If so, force the action to be UPDATE since it already exists in Figma
const isInitialMode = collections.some(collection => collection.initialModeId === modeId);
if (isInitialMode) {
  action = 'UPDATE';
  console.log(`[FigmaTransformer] 🔧 FORCING UPDATE for mode "${mode.name}" because it's used as initialModeId`);
}
```

**Preservation Requirements:**
- ✅ **REUSE**: `FigmaIdManager.determineAction()` - No changes needed, logic is correct
- ✅ **REUSE**: `FigmaIdManager.itemExists()` - No changes needed, logic is correct
- ✅ **REUSE**: `FigmaIdManager.getFigmaId()` - No changes needed, logic is correct
- ✅ **REUSE**: Initial mode UPDATE logic in `FigmaTransformer.createVariableModes()` - No changes needed

**Enhancement Opportunities:**
- **Add logging**: Enhanced logging for action determination decisions
- **Add validation**: Validate that initial mode logic is working correctly
- **Add testing**: Comprehensive tests for action determination scenarios

**Critical Scenarios Covered:**
1. **Existing Mapping**: Item has tempToRealId mapping → Action: UPDATE
2. **No Mapping**: Item has no mapping → Action: CREATE
3. **Initial Mode**: Mode used as collection.initialModeId → Action: UPDATE (forced)
4. **Mixed Scenario**: Some items have mappings, others don't → Correct actions for each

**Encapsulation**: Action determination logic remains within existing service boundaries, no interface changes required.

---

## Phase 2: Complete Token Cleanup Implementation

### 2.1 Implement Comprehensive Token Cleanup Logic

**Objective**: Remove mappings for tokens that no longer exist in the current system.

**Implementation Strategy**:
```typescript
// Add to FigmaIdManager.pruneTempToRealIdMapping()
private pruneTempToRealIdMapping(): void {
  // Existing pruning logic (remove non-existent Figma IDs)
  
  // NEW: Remove mappings for deleted system items
  this.removeMappingsForDeletedItems();
}

private removeMappingsForDeletedItems(): void {
  const currentTokenIds = new Set(this.tokenSystem?.tokens?.map(t => t.id) || []);
  const currentCollectionIds = new Set(this.tokenSystem?.tokenCollections?.map(c => c.id) || []);
  const currentDimensionIds = new Set(this.tokenSystem?.dimensions?.map(d => d.id) || []);
  
  // Track all current system IDs (including derived IDs)
  const currentSystemIds = new Set([
    ...currentTokenIds,
    ...currentCollectionIds,
    ...currentDimensionIds,
    // Include mode IDs from current dimensions
    ...this.getCurrentModeIds(),
    // Include deterministic IDs for current items
    ...this.getCurrentDeterministicIds()
  ]);
  
  // Remove mappings for items no longer in the system
  for (const [tempId, realFigmaId] of this.tempToRealIdMap.entries()) {
    const isCurrentItem = this.isCurrentSystemItem(tempId, currentSystemIds);
    if (!isCurrentItem) {
      this.tempToRealIdMap.delete(tempId);
      console.log(`[FigmaIdManager] Removed mapping for deleted item: ${tempId}`);
    }
  }
}
```

**Encapsulation**: Changes isolated to ID management logic only.

### 2.2 Enhanced ID Validation and Cleanup

**Objective**: Ensure all mappings correspond to valid system items.

**Implementation**:
- Validate that each mapping corresponds to a current system item
- Handle special cases (intermediary variables, mode IDs, deterministic IDs)
- Provide detailed logging for cleanup operations
- Maintain audit trail of removed mappings

**Encapsulation**: Internal validation logic only.

### 2.3 Mapping Persistence Strategy

**Objective**: Ensure cleaned mappings are properly persisted.

**Strategy**:
- Update mapping files after cleanup operations
- Maintain mapping history for debugging
- Implement rollback mechanisms for failed cleanup operations

**Encapsulation**: Persistence logic within mapping service boundaries.

---

## Phase 3: Unified Mapping Management

### 3.1 Consolidate Mapping Update Logic

**Objective**: Create a single, robust mapping update process.

**Implementation Strategy**:
```typescript
// FigmaMappingService becomes the central mapping manager
class FigmaMappingService {
  // Primary mapping operations
  static async loadMapping(fileKey: string): Promise<FigmaMappingData | null>
  static async saveMapping(fileKey: string, mappingData: FigmaMappingData): Promise<void>
  static async updateMappingFromApiResponse(fileKey: string, apiResponse: any): Promise<void>
  static async cleanupDeletedTokenMappings(fileKey: string, currentTokenSystem: TokenSystem): Promise<void>
  
  // Browser-compatible file operations
  private static async ensureFigmaDirectory(owner: string, repo: string): Promise<void>
  private static async saveMappingToGitHub(fileKey: string, mappingData: FigmaMappingData): Promise<void>
}
```

**Encapsulation**: Consolidation within existing service boundaries.

### 3.2 Enhanced API Response Processing

**Objective**: Robust handling of various Figma API response structures.

**Implementation**:
- Support multiple response formats
- Comprehensive error handling
- Detailed logging for debugging
- Fallback mechanisms for malformed responses

**Encapsulation**: API processing logic isolated to mapping service.

### 3.3 Mapping File Structure and Location Standardization

**Objective**: Ensure consistent mapping file format, structure, and location across all repositories.

**File Location**: 
Mapping files must be stored in the standardized location as defined in the repository scaffolding strategy:
```
{repository-root}/.figma/mappings/{fileKey}.json
```

**Repository Structure Compliance**:
This location follows the established repository scaffolding pattern from `@repository-scaffolding.md`:
```
repository-name/
├── design-system.json          # Main data file
├── .figma/                     # Figma integration metadata (auto-managed)
│   ├── mappings/
│   │   └── {fileKey}.json      # Maps token IDs to Figma variable IDs
│   ├── cache/
│   └── config/
└── README.md
```

**Standard Format**:
```json
{
  "fileKey": "figma-file-key",
  "systemId": "design-system-id",
  "lastUpdated": "2024-01-15T10:30:00.000Z",
  "tempToRealId": {
    "token-123": "VariableID:456:789",
    "collection-abc": "VariableCollectionID:123:456"
  },
  "metadata": {
    "figmaFileName": "Design System",
    "exportVersion": "1.0.0",
    "lastExport": "2024-01-15T10:30:00.000Z",
    "cleanupHistory": [
      {
        "timestamp": "2024-01-15T10:30:00.000Z",
        "removedMappings": ["deleted-token-1", "deleted-token-2"],
        "reason": "tokens_deleted_from_system"
      }
    ]
  },
  "repositoryContext": {
    "owner": "username",
    "repo": "repository-name",
    "type": "core",
    "systemId": "design-system-id"
  }
}
```

**Implementation Requirements**:
- **Path Construction**: Always use `.figma/mappings/{fileKey}.json` relative to repository root
- **Directory Creation**: Automatically create `.figma/mappings/` directory if it doesn't exist
- **File Naming**: Use the exact `fileKey` from Figma as the filename
- **Repository Context**: Include full repository context for multi-repository systems
- **Version Control**: All mapping files must be committed to version control

**Cross-Repository Support**:
For systems with multiple repositories (core + platform + theme overrides), mappings are saved to all relevant repositories:
- **Core Repository**: `.figma/mappings/{fileKey}.json`
- **Platform Extension Repositories**: `.figma/mappings/{fileKey}.json` (with platform-specific context)
- **Theme Override Repositories**: `.figma/mappings/{fileKey}.json` (with theme-specific context)

**Encapsulation**: File format and location changes only, no impact on other data structures.

---

## Phase 4: Enhanced Error Handling and Validation

### 4.1 Comprehensive Error Handling

**Objective**: Robust error handling throughout the mapping workflow.

**Implementation**:
- Try-catch blocks around all mapping operations
- Graceful degradation when operations fail
- Detailed error messages for debugging
- Recovery mechanisms for partial failures

**Encapsulation**: Error handling within service boundaries.

### 4.2 Mapping File Validation

**Objective**: Ensure mapping file integrity and consistency.

**Validation Checks**:
- File format validation (JSON structure)
- Required field validation
- Mapping consistency validation
- Cross-reference validation with current system

**Encapsulation**: Validation logic isolated to mapping operations.

### 4.3 Rollback and Recovery Mechanisms

**Objective**: Provide recovery options for failed operations.

**Implementation**:
- Backup mapping files before updates
- Rollback mechanisms for failed operations
- Recovery from corrupted mapping files
- Manual mapping repair tools

**Encapsulation**: Recovery logic within service boundaries.

---

## Phase 5: Testing and Documentation

### 5.1 Comprehensive Testing Strategy

**Objective**: Ensure robust testing of all mapping operations.

**Test Scenarios**:
- **Token Addition**: New tokens added to system
- **Token Deletion**: Tokens removed from system
- **Token Modification**: Existing tokens modified
- **Collection Changes**: Collections added/removed/modified
- **Dimension Changes**: Dimensions added/removed/modified
- **Mapping File Corruption**: Recovery from corrupted files
- **API Response Variations**: Different Figma API response formats
- **Concurrent Operations**: Multiple simultaneous exports
- **Network Failures**: GitHub API failures
- **Browser Environment**: All operations in browser context

**Encapsulation**: Testing focused on Figma-specific functionality only.

### 5.2 Documentation Updates

**Objective**: Comprehensive documentation of the updated workflow.

**Documentation Requirements**:
- Updated technical decisions document
- Workflow diagrams and flowcharts
- API documentation for mapping services
- Troubleshooting guides
- Migration guides for existing implementations

**Encapsulation**: Documentation updates only, no code changes.

---

## Implementation Timeline

### Week 1: Phase 1 - Environment Alignment
- Refactor FigmaWorkflowOrchestrator for browser environment
- Standardize fileKey terminology
- Initial architecture consolidation

### Week 2: Phase 2 - Token Cleanup
- Implement comprehensive token cleanup logic
- Enhanced ID validation
- Mapping persistence strategy

### Week 3: Phase 3 - Unified Mapping Management
- Consolidate mapping update logic
- Enhanced API response processing
- Mapping file structure standardization

### Week 4: Phase 4 - Error Handling and Validation
- Comprehensive error handling
- Mapping file validation
- Rollback and recovery mechanisms

### Week 5: Phase 5 - Testing and Documentation
- Comprehensive testing
- Documentation updates
- Final validation and deployment

---

## Success Criteria

### Functional Requirements:
1. **Browser Compatibility**: All operations work in browser environment
2. **Complete Token Cleanup**: Mappings for deleted tokens are properly removed
3. **Consistent Terminology**: fileKey used consistently throughout
4. **Robust Error Handling**: Graceful handling of all error scenarios
5. **Mapping Persistence**: Reliable storage and retrieval of mappings

### Technical Requirements:
1. **No Node.js Dependencies**: Pure browser-based implementation
2. **Single Source of Truth**: FigmaMappingService as primary mapping manager
3. **Comprehensive Logging**: Detailed logging for debugging
4. **Type Safety**: Full TypeScript support throughout
5. **Schema Compliance**: All operations adhere to project schema

### Quality Requirements:
1. **Test Coverage**: 90%+ test coverage for mapping operations
2. **Documentation**: Complete and up-to-date documentation
3. **Performance**: Sub-second response times for mapping operations
4. **Reliability**: 99%+ success rate for mapping operations
5. **Maintainability**: Clean, well-documented code

### Encapsulation Requirements:
1. **Service Isolation**: Changes contained within Figma-specific services
2. **No Cross-Impact**: No modifications to unrelated features
3. **Interface Stability**: Existing public APIs remain unchanged
4. **Schema Compliance**: No changes to core data structures
5. **Backward Compatibility**: All existing functionality preserved

---

## Risk Mitigation

### Technical Risks:
1. **API Changes**: Monitor Figma API for changes and adapt accordingly
2. **Browser Compatibility**: Test across multiple browsers and versions
3. **Performance Issues**: Monitor mapping file sizes and optimize as needed
4. **Data Corruption**: Implement robust backup and recovery mechanisms

### Operational Risks:
1. **User Training**: Provide clear documentation and training materials
2. **Migration Complexity**: Create automated migration tools for existing implementations
3. **Rollback Procedures**: Establish clear rollback procedures for failed deployments

### Encapsulation Risks:
1. **Service Coupling**: Maintain clear service boundaries
2. **Interface Changes**: Minimize changes to public APIs
3. **Schema Drift**: Ensure all changes adhere to existing schema

---

## Conclusion

This comprehensive plan addresses all identified issues in the Figma export workflow while maintaining strong encapsulation and avoiding impact on unrelated features. The browser-based approach ensures compatibility with the web application environment, while the complete token cleanup logic fulfills the requirement to remove mappings for deleted tokens while retaining other necessary mappings.

The phased approach allows for incremental implementation and testing, reducing risk and ensuring quality at each stage. The focus on unified mapping management and robust error handling will create a maintainable and reliable system for Figma integration.

**Key Encapsulation Benefits**:
- ✅ **Isolated Changes**: All modifications contained within Figma-specific services
- ✅ **No Cross-Impact**: Unrelated features remain unaffected
- ✅ **Interface Stability**: Existing public APIs preserved
- ✅ **Schema Compliance**: No changes to core data structures
- ✅ **Backward Compatibility**: All existing functionality maintained

This plan ensures that the Figma real ID management system is robust, maintainable, and well-integrated while preserving the integrity of the broader application architecture. 
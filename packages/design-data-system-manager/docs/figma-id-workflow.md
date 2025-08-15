# Figma ID Workflow Implementation

## Overview

This document outlines the proper implementation of the Figma ID management workflow to ensure that existing Figma variables are updated rather than duplicated during the publishing process. The workflow addresses the critical issue where transformed data uses source IDs instead of mapped Figma IDs from the `.figma/mappings/{fileKey}.json` file.

## Problem Statement

The current implementation has a critical flaw where:
- Figma variables are duplicated on publish instead of updated
- The application fails to use existing Figma IDs from mapping files
- Repository context awareness is missing in the transformation pipeline
- The complete 14-step workflow is not properly implemented

## Root Cause Analysis

The core issue stems from the Figma transformation pipeline being completely disconnected from the repository-aware mapping system. The `FigmaExportService` transforms data without:

1. **Loading existing `tempToRealId` mappings** from the correct repository
2. **Fetching existing Figma data** to validate mappings
3. **Passing repository context** to the transformer

This causes the `FigmaIdManager` to receive empty data and prune all mappings, resulting in all variables being created as new instead of updating existing ones.

## Complete 14-Step Workflow

### Phase 1: Repository Context and Mapping Retrieval

#### Step 1: Get Source Context
```typescript
const dataSourceManager = DataSourceManager.getInstance();
const context = dataSourceManager.getCurrentContext();

// Determine source type (core, platform-extension, theme-override)
const sourceType = context.currentPlatform ? 'platform-extension' : 
                   context.currentTheme ? 'theme-override' : 'core';
```

#### Step 2: Get Current Source Repository
```typescript
const targetRepository = sourceType === 'core' ? context.repositories.core :
                        sourceType === 'platform-extension' ? context.repositories.platforms[context.currentPlatform!] :
                        context.repositories.themes[context.currentTheme!];

if (!targetRepository) {
  throw new Error(`No repository found for ${sourceType}: ${context.currentPlatform || context.currentTheme}`);
}
```

#### Step 3: Check for Existing Mappings File
```typescript
const mappingFilePath = `.figma/mappings/${fileKey}.json`;
const mappingExists = await FigmaMappingService.checkMappingExists(
  fileKey,
  {
    owner: targetRepository.fullName.split('/')[0],
    repo: targetRepository.fullName.split('/')[1],
    type: sourceType,
    systemId: context.systemId || 'design-system'
  }
);
```

#### Step 4: Load Existing Mappings
```typescript
let tempToRealId: Record<string, string> = {};

if (mappingExists) {
  const existingMappingData = await FigmaMappingService.getMappingFromGitHub(
    fileKey, 
    {
      owner: targetRepository.fullName.split('/')[0],
      repo: targetRepository.fullName.split('/')[1],
      type: sourceType,
      systemId: context.systemId || 'design-system'
    }
  );

  if (existingMappingData?.tempToRealId) {
    tempToRealId = { ...existingMappingData.tempToRealId };
    console.log(`[FigmaExportService] Loaded ${Object.keys(tempToRealId).length} existing mappings`);
  }
}
```

### Phase 2: Figma Data Retrieval and Validation

#### Step 5: GET Variables from Figma API
```typescript
const existingFigmaData = await fetch(`https://api.figma.com/v1/files/${fileKey}/variables/local`, {
  headers: {
    'X-Figma-Token': accessToken,
    'Content-Type': 'application/json'
  }
});

if (!existingFigmaData.ok) {
  throw new Error(`Failed to fetch Figma variables: ${existingFigmaData.status}`);
}

const figmaData = await existingFigmaData.json();
```

#### Step 6: Flatten All IDs into Array
```typescript
const currentFileIds: string[] = [];

// Add variable IDs
Object.keys(figmaData.variables || {}).forEach(id => {
  currentFileIds.push(id);
});

// Add collection IDs
Object.keys(figmaData.variableCollections || {}).forEach(id => {
  currentFileIds.push(id);
});

// Add mode IDs
Object.keys(figmaData.variableModes || {}).forEach(id => {
  currentFileIds.push(id);
});

console.log(`[FigmaExportService] Found ${currentFileIds.length} existing Figma IDs`);
```

#### Step 7: Prune Invalid Mappings
```typescript
const prunedTempToRealId: Record<string, string> = {};
let prunedCount = 0;

for (const [tempId, figmaId] of Object.entries(tempToRealId)) {
  if (currentFileIds.includes(figmaId)) {
    prunedTempToRealId[tempId] = figmaId;
  } else {
    prunedCount++;
    console.log(`[FigmaExportService] Pruned invalid mapping: ${tempId} -> ${figmaId}`);
  }
}

console.log(`[FigmaExportService] Pruned ${prunedCount} invalid mappings, kept ${Object.keys(prunedTempToRealId).length} valid mappings`);
```

### Phase 3: Enhanced Transformer Integration

#### Step 8: Pass Context to Transformer
```typescript
const transformerOptions: FigmaTransformerOptions = {
  fileKey: fileKey,
  accessToken: accessToken,
  updateExisting: true,
  existingFigmaData: figmaData,
  tempToRealId: prunedTempToRealId,
  repositoryContext: {
    owner: targetRepository.fullName.split('/')[0],
    repo: targetRepository.fullName.split('/')[1],
    type: sourceType,
    systemId: context.systemId || 'design-system'
  }
};

const result = await this.transformer.transform(tokenSystem, transformerOptions);
```

### Phase 4: Enhanced ID Manager Logic

#### Step 9: ID Resolution with Mapping Lookup
```typescript
// In FigmaIdManager.getFigmaId()
getFigmaId(sourceId: string): string {
  // First, check if we have a mapping for this source ID
  if (this.tempToRealIdMap.has(sourceId)) {
    const figmaId = this.tempToRealIdMap.get(sourceId)!;
    console.log(`[FigmaIdManager] Found mapping: ${sourceId} -> ${figmaId}`);
    return figmaId;
  }
  
  // Fall back to deterministic ID generation
  const deterministicId = this.generateDeterministicId(sourceId);
  console.log(`[FigmaIdManager] No mapping found, using deterministic ID: ${deterministicId}`);
  return deterministicId;
}
```

#### Step 10: Action Determination
```typescript
// In FigmaIdManager.determineAction()
determineAction(sourceId: string): 'CREATE' | 'UPDATE' {
  // If we have a mapping for this ID, it means it exists in Figma
  if (this.tempToRealIdMap.has(sourceId)) {
    console.log(`[FigmaIdManager] Action: UPDATE (mapping exists for ${sourceId})`);
    return 'UPDATE';
  }
  
  console.log(`[FigmaIdManager] Action: CREATE (no mapping for ${sourceId})`);
  return 'CREATE';
}
```

### Phase 5: API Integration and Response Handling

#### Step 11: POST Data to Figma
```typescript
const apiResponse = await fetch(`https://api.figma.com/v1/files/${fileKey}/variables`, {
  method: 'POST',
  headers: {
    'X-Figma-Token': accessToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    variables: result.data.variables,
    variableCollections: result.data.collections,
    variableModes: result.data.variableModes,
    variableModeValues: result.data.variableModeValues
  })
});

if (!apiResponse.ok) {
  throw new Error(`Figma API request failed: ${apiResponse.status}`);
}

const apiResult = await apiResponse.json();
```

#### Step 12: Merge API Response Mappings
```typescript
// Extract new mappings from API response
const newMappings: Record<string, string> = {};
if (apiResult.tempToRealId) {
  Object.assign(newMappings, apiResult.tempToRealId);
}

// Merge with existing pruned mappings
const mergedTempToRealId = { ...prunedTempToRealId, ...newMappings };

console.log(`[FigmaExportService] Merged ${Object.keys(newMappings).length} new mappings with ${Object.keys(prunedTempToRealId).length} existing mappings`);
```

### Phase 6: Mapping Persistence and Commit

#### Step 13: Update Mappings File
```typescript
const updatedMappingData: FigmaMappingData = {
  fileKey: fileKey,
  systemId: context.systemId || 'design-system',
  lastUpdated: new Date().toISOString(),
  tempToRealId: mergedTempToRealId,
  metadata: {
    lastExport: new Date().toISOString(),
    exportVersion: '1.0.0'
  },
  repositoryContext: {
    owner: targetRepository.fullName.split('/')[0],
    repo: targetRepository.fullName.split('/')[1],
    type: sourceType,
    systemId: context.systemId || 'design-system'
  }
};
```

#### Step 14: Auto-Commit Changes
```typescript
await FigmaMappingService.saveMappingToGitHub(
  fileKey,
  updatedMappingData,
  {
    owner: targetRepository.fullName.split('/')[0],
    repo: targetRepository.fullName.split('/')[1],
    type: sourceType,
    systemId: context.systemId || 'design-system'
  }
);

console.log(`[FigmaExportService] Successfully saved and committed updated mappings`);
```

## Implementation Requirements

### Key Components to Modify

1. **FigmaExportService.publishToFigma()**
   - Implement the complete 14-step workflow
   - Add repository context awareness
   - Integrate mapping loading and validation

2. **FigmaIdManager**
   - Enhance ID resolution logic
   - Improve action determination
   - Add comprehensive logging

3. **FigmaMappingService**
   - Ensure repository-aware mapping operations
   - Add mapping validation methods
   - Implement proper error handling

### Error Handling

- **Missing Repository**: Graceful handling when no repository is found
- **API Failures**: Retry logic for Figma API calls
- **Invalid Mappings**: Logging and cleanup of corrupted mappings
- **Network Issues**: Timeout handling and fallback mechanisms

### Logging and Debugging

- **Repository Context**: Log source type and target repository
- **Mapping Operations**: Track loading, pruning, and merging operations
- **ID Resolution**: Log each ID lookup and action determination
- **API Operations**: Monitor Figma API calls and responses

### Testing Scenarios

1. **New File**: No existing mappings, all CREATE actions
2. **Existing File**: Valid mappings, mix of CREATE and UPDATE actions
3. **Corrupted Mappings**: Invalid mappings that get pruned
4. **Repository Switching**: Different source contexts
5. **API Failures**: Network issues and error recovery

## Expected Outcomes

After implementing this workflow:

- ✅ **No More Duplication**: Existing Figma variables are updated instead of duplicated
- ✅ **Repository Awareness**: Correct mappings are loaded from the right repository
- ✅ **Proper ID Resolution**: Figma IDs are used for existing variables
- ✅ **Mapping Persistence**: Updated mappings are saved and committed
- ✅ **Error Recovery**: Graceful handling of failures and edge cases

## Migration Strategy

1. **Phase 1**: Implement repository context awareness
2. **Phase 2**: Add mapping loading and validation
3. **Phase 3**: Enhance ID manager logic
4. **Phase 4**: Integrate API response handling
5. **Phase 5**: Add mapping persistence and commits
6. **Phase 6**: Comprehensive testing and validation

This workflow ensures that the Figma publishing process correctly handles existing variables, preventing duplication and maintaining proper ID relationships across all repositories and source contexts.

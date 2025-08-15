# Figma ID Workflow Update Plan

## Overview

This document outlines the precise implementation plan to fix the critical issues with Figma ID transformation and mapping management. The current implementation completely bypasses the repository-aware mapping system, causing variables to be duplicated instead of updated.

## Problem Analysis

### Current Implementation Issues

#### 1. Missing Repository Context Awareness
**Current State**: `FigmaExportService.buildTransformerOptions()` only sets basic options:
```typescript
const transformerOptions: Partial<FigmaTransformerOptions> = {
  updateExisting: true
};
if (options.fileId) transformerOptions.fileKey = options.fileId;
if (options.accessToken) transformerOptions.accessToken = options.accessToken;
```

**Missing Components**:
- No repository context retrieval
- No source type determination (core/platform/theme)
- No target repository identification
- No mapping loading from correct repository

#### 2. No Figma Data Fetching
**Current State**: `FigmaExportService` never fetches existing Figma data
**Missing**: Steps 5-6 from workflow (GET variables, flatten IDs)

#### 3. No Mapping Validation/Pruning
**Current State**: `FigmaIdManager.initialize()` receives empty data and prunes all mappings
**Missing**: Step 7 from workflow (prune invalid mappings)

#### 4. Incomplete ID Resolution
**Current State**: `FigmaIdManager.getFigmaId()` has complex fallback logic but no proper mapping lookup
**Missing**: Step 9 from workflow (proper ID resolution with mapping lookup)

#### 5. Disconnected API Response Handling
**Current State**: `FigmaMappingService.updateMappingFromApiResponse()` exists but is called after API call
**Missing**: Steps 11-14 from workflow (proper response merging and persistence)

### Root Cause Summary
The current implementation completely bypasses the repository-aware mapping system. The transformer receives no context about which repository to load mappings from, no existing Figma data to validate against, and no proper ID resolution logic.

## Precise Implementation Plan

### Core Changes Required

#### 1. Enhanced FigmaExportService.publishToFigma()

**Current Implementation**:
```typescript
async publishToFigma(options: FigmaExportOptions): Promise<FigmaExportResult> {
  const result = await this.exportToFigma(options, mergedTokenSystem);
  
  if (result.success && result.data) {
    const publishResult = await this.publishToFigmaAPI(result.data, options);
    return publishResult;
  } else {
    return result;
  }
}
```

**Updated Implementation**:
```typescript
async publishToFigma(options: FigmaExportOptions): Promise<FigmaExportResult> {
  // Step 1-2: Get source context and repository
  const dataSourceManager = DataSourceManager.getInstance();
  const context = dataSourceManager.getCurrentContext();
  
  const sourceType = context.currentPlatform ? 'platform-extension' : 
                     context.currentTheme ? 'theme-override' : 'core';
  
  const targetRepository = sourceType === 'core' ? context.repositories.core :
                          sourceType === 'platform-extension' ? context.repositories.platforms[context.currentPlatform!] :
                          context.repositories.themes[context.currentTheme!];

  if (!targetRepository) {
    return {
      success: false,
      error: {
        code: 'NO_REPOSITORY_FOUND',
        message: `No repository found for ${sourceType}: ${context.currentPlatform || context.currentTheme}`
      }
    };
  }

  // Step 3-4: Load existing mappings from correct repository
  const existingMappingData = await FigmaMappingService.getMappingFromGitHub(
    options.fileId!,
    {
      owner: targetRepository.fullName.split('/')[0],
      repo: targetRepository.fullName.split('/')[1],
      type: sourceType,
      systemId: context.systemId || 'design-system'
    }
  );

  let tempToRealId: Record<string, string> = {};
  if (existingMappingData?.tempToRealId) {
    tempToRealId = { ...existingMappingData.tempToRealId };
    console.log(`[FigmaExportService] Loaded ${Object.keys(tempToRealId).length} existing mappings`);
  }

  // Step 5-6: Fetch and flatten Figma data
  const existingFigmaData = await this.fetchExistingFigmaData(options.fileId!, options.accessToken!);
  const currentFileIds = this.flattenFigmaIds(existingFigmaData);
  console.log(`[FigmaExportService] Found ${currentFileIds.length} existing Figma IDs`);

  // Step 7: Prune invalid mappings
  const prunedTempToRealId = this.pruneMappings(tempToRealId, currentFileIds);
  console.log(`[FigmaExportService] Pruned to ${Object.keys(prunedTempToRealId).length} valid mappings`);

  // Step 8: Transform with proper context
  const transformerOptions: FigmaTransformerOptions = {
    fileKey: options.fileId!,
    accessToken: options.accessToken!,
    updateExisting: true,
    existingFigmaData,
    tempToRealId: prunedTempToRealId,
    repositoryContext: {
      owner: targetRepository.fullName.split('/')[0],
      repo: targetRepository.fullName.split('/')[1],
      type: sourceType,
      systemId: context.systemId || 'design-system'
    }
  };

  const result = await this.transformer.transform(tokenSystem, transformerOptions);

  if (!result.success) {
    return result;
  }

  // Step 11-12: Post to API and merge response
  const apiResponse = await this.postToFigmaAPI(result.data!, options);
  const mergedTempToRealId = { ...prunedTempToRealId, ...apiResponse.tempToRealId };

  // Step 13-14: Save and commit mappings
  await this.saveAndCommitMappings(options.fileId!, mergedTempToRealId, context, targetRepository);

  return { success: true, data: result.data };
}
```

#### 2. Simplified FigmaIdManager.getFigmaId()

**Current Implementation**: Complex fallback logic with multiple checks
**Updated Implementation**:
```typescript
getFigmaId(sourceId: string): string {
  // Step 9: Direct mapping lookup
  if (this.tempToRealIdMap.has(sourceId)) {
    const figmaId = this.tempToRealIdMap.get(sourceId)!;
    console.log(`[FigmaIdManager] Found mapping: ${sourceId} -> ${figmaId}`);
    return figmaId;
  }
  
  // Fallback to deterministic ID
  const deterministicId = this.generateDeterministicId(sourceId, this.determineIdType(sourceId));
  console.log(`[FigmaIdManager] No mapping found, using deterministic ID: ${deterministicId}`);
  return deterministicId;
}
```

#### 3. Simplified FigmaIdManager.determineAction()

**Current Implementation**: Complex existence checking logic
**Updated Implementation**:
```typescript
determineAction(sourceId: string): 'CREATE' | 'UPDATE' {
  // Step 10: Simple mapping check
  const hasMapping = this.tempToRealIdMap.has(sourceId);
  const action = hasMapping ? 'UPDATE' : 'CREATE';
  console.log(`[FigmaIdManager] Action for ${sourceId}: ${action} (has mapping: ${hasMapping})`);
  return action;
}
```

### New Helper Methods

#### FigmaExportService.fetchExistingFigmaData()
```typescript
private async fetchExistingFigmaData(fileKey: string, accessToken: string): Promise<any> {
  try {
    const response = await fetch(`https://api.figma.com/v1/files/${fileKey}/variables/local`, {
      headers: {
        'X-Figma-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`[FigmaExportService] No existing variables found in Figma file (404)`);
        return null;
      }
      throw new Error(`Failed to fetch Figma variables: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`[FigmaExportService] Successfully fetched existing Figma data`);
    return data;
  } catch (error) {
    console.error(`[FigmaExportService] Error fetching Figma data:`, error);
    return null;
  }
}
```

#### FigmaExportService.flattenFigmaIds()
```typescript
private flattenFigmaIds(figmaData: any): string[] {
  const ids: string[] = [];
  
  if (figmaData?.variables) {
    Object.keys(figmaData.variables).forEach(id => ids.push(id));
  }
  
  if (figmaData?.variableCollections) {
    Object.keys(figmaData.variableCollections).forEach(id => ids.push(id));
  }
  
  if (figmaData?.variableModes) {
    Object.keys(figmaData.variableModes).forEach(id => ids.push(id));
  }
  
  return ids;
}
```

#### FigmaExportService.pruneMappings()
```typescript
private pruneMappings(tempToRealId: Record<string, string>, currentFileIds: string[]): Record<string, string> {
  const pruned: Record<string, string> = {};
  let prunedCount = 0;
  
  for (const [tempId, figmaId] of Object.entries(tempToRealId)) {
    if (currentFileIds.includes(figmaId)) {
      pruned[tempId] = figmaId;
    } else {
      prunedCount++;
      console.log(`[FigmaExportService] Pruned invalid mapping: ${tempId} -> ${figmaId}`);
    }
  }
  
  console.log(`[FigmaExportService] Pruned ${prunedCount} invalid mappings, kept ${Object.keys(pruned).length} valid mappings`);
  return pruned;
}
```

#### FigmaExportService.saveAndCommitMappings()
```typescript
private async saveAndCommitMappings(fileKey: string, tempToRealId: Record<string, string>, context: any, targetRepository: any): Promise<void> {
  const mappingData: FigmaMappingData = {
    fileKey,
    systemId: context.systemId || 'design-system',
    lastUpdated: new Date().toISOString(),
    tempToRealId,
    metadata: {
      lastExport: new Date().toISOString(),
      exportVersion: '1.0.0'
    },
    repositoryContext: {
      owner: targetRepository.fullName.split('/')[0],
      repo: targetRepository.fullName.split('/')[1],
      type: context.currentPlatform ? 'platform-extension' : context.currentTheme ? 'theme-override' : 'core',
      systemId: context.systemId || 'design-system'
    }
  };

  await FigmaMappingService.saveMappingToGitHub(fileKey, mappingData, {
    owner: targetRepository.fullName.split('/')[0],
    repo: targetRepository.fullName.split('/')[1],
    type: context.currentPlatform ? 'platform-extension' : context.currentTheme ? 'theme-override' : 'core',
    systemId: context.systemId || 'design-system'
  });

  console.log(`[FigmaExportService] Successfully saved and committed updated mappings`);
}
```

#### FigmaExportService.postToFigmaAPI()
```typescript
private async postToFigmaAPI(data: any, options: FigmaExportOptions): Promise<{ tempToRealId: Record<string, string> }> {
  const response = await fetch(`https://api.figma.com/v1/files/${options.fileId}/variables`, {
    method: 'POST',
    headers: {
      'X-Figma-Token': options.accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      variables: data.variables,
      variableCollections: data.collections,
      variableModes: data.variableModes,
      variableModeValues: data.variableModeValues
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Figma API request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const apiResult = await response.json();
  console.log(`[FigmaExportService] Figma API response received`);
  
  return {
    tempToRealId: apiResult.tempToRealId || {}
  };
}
```

## Implementation Priority

### Phase 1: Repository Context Awareness (Week 1)
- [ ] Implement source context retrieval in `publishToFigma()`
- [ ] Add target repository identification logic
- [ ] Add error handling for missing repositories
- [ ] Test with different source types (core, platform, theme)

### Phase 2: Mapping Loading and Validation (Week 1)
- [ ] Implement `fetchExistingFigmaData()` method
- [ ] Implement `flattenFigmaIds()` method
- [ ] Implement `pruneMappings()` method
- [ ] Test mapping loading from different repositories

### Phase 3: Simplified ID Manager Logic (Week 2)
- [ ] Simplify `FigmaIdManager.getFigmaId()` method
- [ ] Simplify `FigmaIdManager.determineAction()` method
- [ ] Remove complex fallback logic
- [ ] Test ID resolution with existing mappings

### Phase 4: API Integration and Persistence (Week 2)
- [ ] Implement `postToFigmaAPI()` method
- [ ] Implement `saveAndCommitMappings()` method
- [ ] Test complete workflow with existing repositories
- [ ] Verify mapping persistence and commits

### Phase 5: Testing and Validation (Week 3)
- [ ] Test with new files (no existing mappings)
- [ ] Test with existing files (valid mappings)
- [ ] Test with corrupted mappings (pruning validation)
- [ ] Test repository switching scenarios
- [ ] Test API failure scenarios

## Expected Outcomes

### Before Implementation
- ❌ Variables duplicated on every publish
- ❌ No repository context awareness
- ❌ No mapping validation
- ❌ Complex, unreliable ID resolution
- ❌ Missing Figma data fetching

### After Implementation
- ✅ Existing variables updated instead of duplicated
- ✅ Proper repository context awareness
- ✅ Mapping validation against actual Figma data
- ✅ Simple, reliable ID resolution
- ✅ Complete Figma data integration
- ✅ Proper mapping persistence and commits

## Key Benefits

1. **Repository Context Aware**: Properly identifies source type and target repository
2. **Mapping Validation**: Loads and validates mappings against actual Figma data
3. **Proper ID Resolution**: Uses existing Figma IDs for UPDATE actions
4. **Streamlined Logic**: Removes complex fallback logic in favor of direct mapping lookup
5. **Complete Workflow**: Implements all 14 steps from the workflow document
6. **Error Handling**: Graceful handling of missing repositories or API failures
7. **Maintainability**: Simplified code that's easier to debug and extend

## Risk Mitigation

### Technical Risks
- **API Changes**: Monitor Figma API for changes and adapt accordingly
- **Repository Access**: Handle cases where repository access is denied
- **Mapping Corruption**: Validate mapping data before use
- **Network Failures**: Implement retry logic for API calls

### Operational Risks
- **User Training**: Provide clear documentation of new workflow
- **Migration Complexity**: Ensure backward compatibility during transition
- **Rollback Procedures**: Establish clear rollback procedures for failed deployments

## Success Criteria

1. **No More Duplication**: Existing Figma variables are updated instead of duplicated
2. **Repository Awareness**: Correct mappings are loaded from the right repository
3. **Proper ID Resolution**: Figma IDs are used for existing variables
4. **Mapping Persistence**: Updated mappings are saved and committed
5. **Error Recovery**: Graceful handling of failures and edge cases
6. **Performance**: No significant performance degradation
7. **User Experience**: Seamless workflow for users

This implementation plan provides a **precise, effective, and streamlined** solution that addresses all the core issues while maintaining simplicity and following the established technical decisions and project rules.

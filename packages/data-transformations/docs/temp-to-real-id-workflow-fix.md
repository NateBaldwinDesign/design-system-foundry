# tempToRealId Workflow Fix

## Problem Statement

The Figma publishing workflow was not properly using existing Figma IDs from the `tempToRealId` mappings when generating POST data. This caused variables to be recreated instead of updated, even when they already existed in Figma.

### The Issue
- **POST data used canonical IDs**: The transformation process was generating POST data with canonical IDs instead of existing Figma IDs
- **Missing workflow integration**: The publishing process was not using the proper 8-step workflow orchestrator
- **Inconsistent ID usage**: Variables, collections, modes, and mode values were all using canonical IDs instead of mapped Figma IDs
- **Update failures**: Existing variables were always created as new instead of being updated

### Root Cause
The publishing workflow had **two separate processes** that weren't properly integrated:

1. **Export Process** (`handleExport`): Used `FigmaExportService` which properly loaded `tempToRealId` mappings
2. **Publishing Process** (`handlePublish`): Directly called the Figma API with pre-transformed data, bypassing the workflow orchestrator

The publishing process was using **already transformed data** from the export step, but it wasn't ensuring that the transformation used existing Figma IDs from the mappings.

## Solution: Integrated Workflow Orchestrator

### Implementation Strategy

#### 1. **Replace Direct API Calls with Workflow Orchestrator**
The publishing process now uses the `FigmaWorkflowOrchestrator` which implements the complete 8-step workflow:

```typescript
// Before: Direct API call with pre-transformed data
const bulkResponse = await fetch(`https://api.figma.com/v1/files/${fileId}/variables`, {
  method: 'POST',
  headers: { 'X-Figma-Token': accessToken, 'Content-Type': 'application/json' },
  body: JSON.stringify(bulkPayload)
});

// After: Use workflow orchestrator
const { FigmaWorkflowOrchestrator } = await import('@token-model/data-transformations');
const orchestrator = new FigmaWorkflowOrchestrator();
const workflowResult = await orchestrator.executeWorkflow(filteredTokenSystem, {
  fileKey: fileId,
  accessToken,
  updateExisting: true
});
```

#### 2. **Proper 8-Step Workflow Integration**
The workflow orchestrator ensures all 8 steps are executed in order:

1. **GET local variables** from Figma file
2. **Load tempToRealId** from `.figma/mappings/{fileid}.json`
3. **Prune tempToRealId** by removing non-existent Figma IDs
4. **Transform canonical data** to Figma POST format (using existing IDs)
5. **POST transformed data** to Figma REST API
6. **Merge API response** tempToRealId with existing mapping
7. **Update mappings file** `.figma/mappings/{filekey}.json`
8. **Commit changes** to branch

#### 3. **ID Manager Integration**
The `FigmaIdManager` properly handles the `tempToRealId` mappings:

```typescript
// Initialize with existing data and mappings
this.idManager.initialize(options?.existingFigmaData, options?.tempToRealId);

// Get Figma ID (returns real ID if mapped, otherwise canonical ID)
const figmaId = this.idManager.getFigmaId(itemId);
```

### Key Benefits

#### 1. **Proper ID Usage**
- **Collections**: Use existing Figma collection IDs when available
- **Variables**: Use existing Figma variable IDs when available
- **Modes**: Use existing Figma mode IDs when available
- **Mode Values**: Use existing Figma mode value IDs when available

#### 2. **Consistent CREATE/UPDATE Actions**
- **CREATE**: When no mapping exists, use canonical ID
- **UPDATE**: When mapping exists, use real Figma ID

#### 3. **Mapping Persistence**
- **Automatic loading**: Mappings are loaded from `.figma/mappings/{filekey}.json`
- **Automatic updating**: New mappings are saved after successful API calls
- **Automatic pruning**: Invalid mappings are removed

### Code Changes

#### 1. **Updated Publishing Workflow**
```typescript
// packages/design-data-system-manager/src/views/publishing/FigmaExportSettings.tsx
const handlePublish = async (selectedVariables: string[], selectedCollections: string[]) => {
  // Filter token system to selected items
  const filteredTokenSystem = {
    ...canonicalTokenSystem,
    tokens: canonicalTokenSystem.tokens?.filter(token => 
      selectedVariables.includes(token.id)
    ) || [],
    // ... other filtering logic
  };

  // Use workflow orchestrator for complete 8-step process
  const { FigmaWorkflowOrchestrator } = await import('@token-model/data-transformations');
  const orchestrator = new FigmaWorkflowOrchestrator();
  
  const workflowResult = await orchestrator.executeWorkflow(filteredTokenSystem, {
    fileKey: fileId,
    accessToken,
    updateExisting: true
  });
};
```

#### 2. **ID Manager Integration**
```typescript
// packages/data-transformations/src/transformers/figma.ts
protected async performTransform(input: TokenSystem, options?: FigmaTransformerOptions) {
  // Initialize ID manager with existing data and tempToRealId mapping
  this.idManager.initialize(options?.existingFigmaData, options?.tempToRealId);
  
  // All subsequent ID generation uses the manager
  const figmaId = this.idManager.getFigmaId(deterministicId);
  const action = this.idManager.determineAction(deterministicId);
}
```

### Expected Behavior

#### 1. **First Publication**
- All items use canonical IDs
- Figma creates new variables/collections
- `tempToRealId` mappings are saved with real Figma IDs

#### 2. **Subsequent Publications**
- Items with existing mappings use real Figma IDs
- Items without mappings use canonical IDs
- Existing variables are updated instead of recreated
- New variables are created with canonical IDs

#### 3. **Mapping File Structure**
```json
{
  "fileKey": "figma-file-id",
  "systemId": "your-system-id",
  "lastUpdated": "2024-01-15T10:30:00.000Z",
  "tempToRealId": {
    "token-blue-500": "VariableID:123:456",
    "collection-color": "VariableCollectionID:789:012",
    "mode-tokenCollection-color": "VariableModeID:345:678"
  }
}
```

### Testing

The solution has been tested and verified to work correctly:

1. **Deterministic ID generation**: UUIDs are converted to predictable patterns
2. **Daisy-chaining**: Both single and multi-dimensional tokens work correctly
3. **ID mapping**: Existing Figma IDs are properly used when available
4. **Workflow integration**: The 8-step process executes correctly

### Future Considerations

1. **Mapping validation**: Add validation to ensure mapping integrity
2. **Conflict resolution**: Handle cases where canonical IDs conflict with existing Figma IDs
3. **Bulk operations**: Optimize for large-scale updates
4. **Error recovery**: Improve error handling for mapping failures 
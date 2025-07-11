import type { FigmaTransformerOptions, FigmaFileVariablesResponse } from '../types/figma';

/**
 * Manages Figma ID mappings and determines CREATE/UPDATE actions
 * Handles the tempToRealId mapping workflow from the intended functional sequence
 */
export class FigmaIdManager {
  private tempToRealIdMap: Map<string, string> = new Map();
  private existingFigmaIds: Set<string> = new Set();
  private existingVariableNames: Map<string, string> = new Map(); // name -> id mapping
  private existingCollectionNames: Map<string, string> = new Map(); // name -> id mapping
  private initialModeIds: Map<string, string> = new Map(); // collectionId -> initialModeId mapping

  /**
   * Initialize the ID manager with existing Figma data and tempToRealId mapping
   * Steps 1-3 of the intended workflow:
   * 1. GET local variables from Figma file
   * 2. Get tempToRealId from mappings file
   * 3. Prune tempToRealId by removing non-existent Figma IDs
   */
  initialize(
    existingFigmaData: FigmaFileVariablesResponse | undefined,
    tempToRealId: Record<string, string> | undefined
  ): void {
    console.log('[FigmaIdManager] 🚀 STARTING INITIALIZATION...');
    console.log('[FigmaIdManager] Input parameters:', {
      hasExistingFigmaData: !!existingFigmaData,
      existingFigmaDataStructure: existingFigmaData ? {
        hasVariables: !!existingFigmaData.variables,
        variablesCount: Object.keys(existingFigmaData.variables || {}).length,
        hasCollections: !!existingFigmaData.variableCollections,
        collectionsCount: Object.keys(existingFigmaData.variableCollections || {}).length,
        hasModes: !!existingFigmaData.variableModes,
        modesCount: Object.keys(existingFigmaData.variableModes || {}).length
      } : 'NONE',
      hasTempToRealId: !!tempToRealId,
      tempToRealIdCount: tempToRealId ? Object.keys(tempToRealId).length : 0,
      tempToRealIdSample: tempToRealId ? Object.entries(tempToRealId).slice(0, 5) : []
    });
    
    // Step 1: Extract existing Figma IDs from local variables
    this.extractExistingFigmaIds(existingFigmaData);
    
    // Step 2: Load tempToRealId mapping
    this.loadTempToRealIdMapping(tempToRealId);
    
    // Step 3: Prune tempToRealId by removing non-existent Figma IDs
    this.pruneTempToRealIdMapping();
    
    console.log('[FigmaIdManager] ✅ INITIALIZATION COMPLETE');
    console.log('[FigmaIdManager] Final state:', {
      tempToRealIdMapSize: this.tempToRealIdMap.size,
      existingFigmaIdsSize: this.existingFigmaIds.size,
      existingVariableNamesSize: this.existingVariableNames.size,
      existingCollectionNamesSize: this.existingCollectionNames.size,
      finalTempToRealIdSample: Array.from(this.tempToRealIdMap.entries()).slice(0, 5)
    });
  }

  /**
   * Extract existing Figma IDs from the local variables response
   */
  private extractExistingFigmaIds(existingFigmaData: FigmaFileVariablesResponse | undefined): void {
    this.existingFigmaIds.clear();
    this.existingVariableNames.clear();
    this.existingCollectionNames.clear();
    
    console.log(`[FigmaIdManager] 🔍 EXTRACTING: Starting extraction from existingFigmaData:`, {
      hasData: !!existingFigmaData,
      variablesCount: existingFigmaData?.variables ? Object.keys(existingFigmaData.variables).length : 0,
      collectionsCount: existingFigmaData?.variableCollections ? Object.keys(existingFigmaData.variableCollections).length : 0,
      modesCount: existingFigmaData?.variableModes ? Object.keys(existingFigmaData.variableModes).length : 0
    });
    
    if (!existingFigmaData) {
      console.log(`[FigmaIdManager] 🔍 EXTRACTING: No existingFigmaData provided`);
      return;
    }

    // Extract variable IDs and names
    const variableIds: string[] = [];
    Object.entries(existingFigmaData.variables || {}).forEach(([id, variable]) => {
      this.existingFigmaIds.add(id);
      variableIds.push(id);
      if (variable.name) {
        this.existingVariableNames.set(variable.name, id);
      }
    });
    console.log(`[FigmaIdManager] 🔍 EXTRACTING: Found ${variableIds.length} variable IDs:`, variableIds.slice(0, 5));

    // Extract collection IDs and names
    const collectionIds: string[] = [];
    Object.entries(existingFigmaData.variableCollections || {}).forEach(([id, collection]) => {
      this.existingFigmaIds.add(id);
      collectionIds.push(id);
      if (collection.name) {
        this.existingCollectionNames.set(collection.name, id);
      }
    });
    console.log(`[FigmaIdManager] 🔍 EXTRACTING: Found ${collectionIds.length} collection IDs:`, collectionIds.slice(0, 5));

    // Extract mode IDs from collections (modes are nested in collections)
    const modeIds: string[] = [];
    Object.entries(existingFigmaData.variableCollections || {}).forEach(([collectionId, collection]) => {
      // Add the initial mode ID
      if (collection.initialModeId) {
        this.existingFigmaIds.add(collection.initialModeId);
        modeIds.push(collection.initialModeId);
        
        // Store the initial mode ID for this collection
        this.initialModeIds.set(collectionId, collection.initialModeId);
        console.log(`[FigmaIdManager] 🔍 EXTRACTING: Initial mode for collection ${collectionId}: ${collection.initialModeId}`);
      }
      
      // Add any additional modes that might be in the collection
      if (collection.modes) {
        Object.entries(collection.modes).forEach(([modeId, mode]) => {
          this.existingFigmaIds.add(modeId);
          modeIds.push(modeId);
        });
      }
    });
    console.log(`[FigmaIdManager] 🔍 EXTRACTING: Found ${modeIds.length} mode IDs from collections:`, modeIds.slice(0, 5));

    // Extract mode IDs from the dedicated variableModes section if it exists
    const dedicatedModeIds: string[] = [];
    Object.entries(existingFigmaData.variableModes || {}).forEach(([id, mode]) => {
      this.existingFigmaIds.add(id);
      dedicatedModeIds.push(id);
    });
    console.log(`[FigmaIdManager] 🔍 EXTRACTING: Found ${dedicatedModeIds.length} dedicated mode IDs:`, dedicatedModeIds.slice(0, 5));

    console.log(`[FigmaIdManager] 🔍 EXTRACTING: Final summary:`);
    console.log(`[FigmaIdManager] - Total existing Figma IDs: ${this.existingFigmaIds.size}`);
    console.log(`[FigmaIdManager] - Variable names: ${this.existingVariableNames.size}`);
    console.log(`[FigmaIdManager] - Collection names: ${this.existingCollectionNames.size}`);
    console.log(`[FigmaIdManager] - All extracted IDs:`, Array.from(this.existingFigmaIds).slice(0, 10));
  }

  /**
   * Load the tempToRealId mapping from the mappings file
   */
  private loadTempToRealIdMapping(tempToRealId: Record<string, string> | undefined): void {
    this.tempToRealIdMap.clear();
    
    console.log(`[FigmaIdManager] 🔄 LOADING: Starting tempToRealId mapping load`);
    console.log(`[FigmaIdManager] 🔄 LOADING: Input tempToRealId:`, {
      hasData: !!tempToRealId,
      isObject: typeof tempToRealId === 'object',
      keys: tempToRealId ? Object.keys(tempToRealId) : [],
      count: tempToRealId ? Object.keys(tempToRealId).length : 0,
      sample: tempToRealId ? Object.entries(tempToRealId).slice(0, 5) : [],
      fullData: tempToRealId // Log the full data for debugging
    });
    
    if (!tempToRealId) {
      console.log(`[FigmaIdManager] 🔄 LOADING: No tempToRealId provided, skipping load`);
      return;
    }

    for (const [tempId, realFigmaId] of Object.entries(tempToRealId)) {
      this.tempToRealIdMap.set(tempId, realFigmaId);
      console.log(`[FigmaIdManager] 🔄 LOADING: Added mapping ${tempId} -> ${realFigmaId}`);
    }

    console.log(`[FigmaIdManager] 🔄 LOADING: Final result:`, {
      loadedCount: this.tempToRealIdMap.size,
      sampleMappings: Array.from(this.tempToRealIdMap.entries()).slice(0, 5),
      allMappings: Array.from(this.tempToRealIdMap.entries()) // Log all mappings for debugging
    });
  }

  /**
   * Prune tempToRealId by removing mappings where the Figma ID doesn't exist
   * AND add missing initial mode IDs for collections that already exist in Figma
   */
  private pruneTempToRealIdMapping(): void {
    const originalSize = this.tempToRealIdMap.size;
    const prunedIds: string[] = [];
    const keptIds: string[] = [];
    const addedInitialModeIds: string[] = [];

    console.log(`[FigmaIdManager] 🔍 PRUNING: Starting with ${originalSize} mappings`);
    console.log(`[FigmaIdManager] 🔍 PRUNING: Available Figma IDs (${this.existingFigmaIds.size}):`, Array.from(this.existingFigmaIds).slice(0, 10));

    // Step 1: Prune existing mappings
    for (const [tempId, realFigmaId] of this.tempToRealIdMap.entries()) {
      const exists = this.existingFigmaIds.has(realFigmaId);
      console.log(`[FigmaIdManager] 🔍 PRUNING: Checking ${tempId} -> ${realFigmaId} (exists: ${exists})`);
      
      if (!exists) {
        this.tempToRealIdMap.delete(tempId);
        prunedIds.push(tempId);
        console.log(`[FigmaIdManager] ❌ PRUNING: Removed ${tempId} -> ${realFigmaId} (not found in Figma)`);
      } else {
        keptIds.push(tempId);
        console.log(`[FigmaIdManager] ✅ PRUNING: Kept ${tempId} -> ${realFigmaId} (found in Figma)`);
      }
    }

    // Step 2: Add initial mode IDs for collections that already exist in Figma
    console.log(`[FigmaIdManager] 🔍 ADDING INITIAL MODES: Starting initial mode addition for existing Figma collections...`);
    console.log(`[FigmaIdManager] 🔍 ADDING INITIAL MODES: Available initial mode mappings:`, Array.from(this.initialModeIds.entries()));

    // For each collection that exists in Figma (from initialModeIds), add its initial mode to tempToRealId
    for (const [figmaCollectionId, initialModeId] of this.initialModeIds.entries()) {
      console.log(`[FigmaIdManager] 🔍 ADDING INITIAL MODES: Processing Figma collection ${figmaCollectionId} with initial mode ${initialModeId}`);
      
      // Find the corresponding canonical/deterministic collection ID in our tempToRealId mapping
      let canonicalCollectionId: string | undefined;
      
      // Look for a mapping where the Figma ID matches this collection
      for (const [tempId, realFigmaId] of this.tempToRealIdMap.entries()) {
        if (realFigmaId === figmaCollectionId && (tempId.startsWith('tokenCollection-') || tempId.startsWith('collection-') || tempId.startsWith('dimensionId-'))) {
          canonicalCollectionId = tempId;
          console.log(`[FigmaIdManager] 🔍 ADDING INITIAL MODES: Found canonical collection ID ${canonicalCollectionId} for Figma collection ${figmaCollectionId}`);
          break;
        }
      }
      
      if (canonicalCollectionId) {
        // Generate the deterministic mode ID that we would expect for this collection
        const deterministicModeId = `mode-tokenCollection-${canonicalCollectionId}`;
        
        // Check if this mode ID is already in the mapping
        const alreadyMapped = this.tempToRealIdMap.has(deterministicModeId);
        
        if (!alreadyMapped) {
          // Add the missing initial mode mapping
          this.tempToRealIdMap.set(deterministicModeId, initialModeId);
          addedInitialModeIds.push(`${deterministicModeId} -> ${initialModeId}`);
          console.log(`[FigmaIdManager] ✅ ADDING INITIAL MODES: Added ${deterministicModeId} -> ${initialModeId} for collection ${canonicalCollectionId}`);
        } else {
          console.log(`[FigmaIdManager] 🔍 ADDING INITIAL MODES: Initial mode already mapped: ${deterministicModeId}`);
        }
      } else {
        console.log(`[FigmaIdManager] 🔍 ADDING INITIAL MODES: No canonical collection ID found for Figma collection ${figmaCollectionId} (not in tempToRealId mapping)`);
      }
    }

    console.log(`[FigmaIdManager] 🔍 PRUNING: Final results:`);
    console.log(`[FigmaIdManager] - Original mappings: ${originalSize}`);
    console.log(`[FigmaIdManager] - Pruned mappings: ${prunedIds.length}`, prunedIds);
    console.log(`[FigmaIdManager] - Kept mappings: ${keptIds.length}`, keptIds);
    console.log(`[FigmaIdManager] - Added initial mode mappings: ${addedInitialModeIds.length}`, addedInitialModeIds);
    console.log(`[FigmaIdManager] - Remaining valid mappings: ${this.tempToRealIdMap.size}`);
  }

  /**
   * Get the initial mode ID for a collection from the fallback mapping
   * This is used when Figma's POST response doesn't include initial mode IDs
   */
  getInitialModeId(collectionId: string): string | undefined {
    return this.initialModeIds.get(collectionId);
  }

  /**
   * Get the appropriate Figma ID for an item
   * Returns the real Figma ID if it exists in the mapping, otherwise returns the deterministic ID
   * For initial modes, uses fallback mapping from GET response if primary mapping is not available
   */
  getFigmaId(itemId: string): string {
    const mappedId = this.tempToRealIdMap.get(itemId);
    
    // If we have a mapping, use the mapped Figma ID
    if (mappedId) {
      console.log(`[FigmaIdManager] getFigmaId(${itemId}):`, {
        hasMapping: true,
        mappedId: mappedId,
        result: mappedId,
        tempToRealIdMapSize: this.tempToRealIdMap.size,
        tempToRealIdMapKeys: Array.from(this.tempToRealIdMap.keys()).slice(0, 10)
      });
      return mappedId;
    }
    
    // Special handling for initial modes: check fallback mapping
    if (itemId.startsWith('mode-tokenCollection-')) {
      // Extract collection ID from the mode ID
      const collectionId = itemId.replace('mode-tokenCollection-', '');
      let fallbackInitialModeId = this.initialModeIds.get(collectionId);
      
      console.log(`[FigmaIdManager] 🔍 FALLBACK DEBUG for ${itemId}:`, {
        extractedCollectionId: collectionId,
        directFallback: fallbackInitialModeId,
        initialModeIdsMapSize: this.initialModeIds.size,
        initialModeIdsMapKeys: Array.from(this.initialModeIds.keys()),
        initialModeIdsMapValues: Array.from(this.initialModeIds.values())
      });
      
      // If not found with deterministic ID, try with the original collection ID
      if (!fallbackInitialModeId && this.isDeterministicId(collectionId)) {
        // Try to find the original collection ID that maps to this deterministic ID
        for (const [originalId, figmaId] of this.tempToRealIdMap.entries()) {
          if (figmaId === collectionId || this.generateDeterministicId(originalId, 'collection') === collectionId) {
            fallbackInitialModeId = this.initialModeIds.get(originalId);
            if (fallbackInitialModeId) {
              console.log(`[FigmaIdManager] Found fallback via original collection ID: ${originalId} -> ${fallbackInitialModeId}`);
              break;
            }
          }
        }
      }
      
      if (fallbackInitialModeId) {
        console.log(`[FigmaIdManager] getFigmaId(${itemId}):`, {
          hasMapping: false,
          hasFallback: true,
          fallbackInitialModeId: fallbackInitialModeId,
          result: fallbackInitialModeId,
          tempToRealIdMapSize: this.tempToRealIdMap.size,
          tempToRealIdMapKeys: Array.from(this.tempToRealIdMap.keys()).slice(0, 10)
        });
        return fallbackInitialModeId;
      }
    }
    
    // If no mapping, convert to deterministic ID to ensure consistency
    const deterministicId = this.generateDeterministicId(itemId, this.determineIdType(itemId));
    
    console.log(`[FigmaIdManager] getFigmaId(${itemId}):`, {
      hasMapping: false,
      hasFallback: false,
      mappedId: undefined,
      originalId: itemId,
      deterministicId: deterministicId,
      result: deterministicId,
      tempToRealIdMapSize: this.tempToRealIdMap.size,
      tempToRealIdMapKeys: Array.from(this.tempToRealIdMap.keys()).slice(0, 10)
    });
    
    return deterministicId;
  }

  /**
   * Determine the type of an ID based on its pattern
   */
  private determineIdType(id: string): 'collection' | 'mode' | 'variable' {
    if (id.startsWith('tokenCollection-') || id.startsWith('collection-')) {
      return 'collection';
    }
    if (id.startsWith('mode-') || id.includes('mode')) {
      return 'mode';
    }
    if (id.startsWith('token-') || id.startsWith('variable-')) {
      return 'variable';
    }
    // Default to variable for unknown patterns
    return 'variable';
  }

  /**
   * Generate a deterministic ID for UUIDs that come from canonical data
   * This ensures consistent ID generation across transformations
   */
  generateDeterministicId(itemId: string, type: 'collection' | 'mode' | 'variable'): string {
    // If it's already a deterministic ID, return as is
    if (this.isDeterministicId(itemId)) {
      return itemId;
    }

    // If it's a UUID, generate a deterministic ID based on the type
    if (this.isUuid(itemId)) {
      return this.createDeterministicId(itemId, type);
    }

    // Otherwise, return the original ID
    return itemId;
  }

  /**
   * Check if an ID is already deterministic (follows our patterns)
   */
  private isDeterministicId(id: string): boolean {
    // Check for our deterministic patterns
    const deterministicPatterns = [
      /^mode-tokenCollection-/,
      /^intermediary-/,
      /^reference-/,
      /^collection-/,
      /^dimension-/,
      /^token-/,
      /^mode-/
    ];
    
    return deterministicPatterns.some(pattern => pattern.test(id));
  }

  /**
   * Check if an ID is a UUID
   */
  private isUuid(id: string): boolean {
    // UUID v4 pattern: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidPattern.test(id);
  }

  /**
   * Create a deterministic ID from a UUID
   */
  private createDeterministicId(uuid: string, type: 'collection' | 'mode' | 'variable'): string {
    // Use a hash of the UUID to create a consistent but shorter ID
    const hash = this.hashString(uuid);
    const shortId = hash.toString(36).substring(0, 8);
    
    switch (type) {
      case 'collection':
        return `collection-${shortId}`;
      case 'mode':
        return `mode-${shortId}`;
      case 'variable':
        return `variable-${shortId}`;
      default:
        return `${type}-${shortId}`;
    }
  }

  /**
   * Simple hash function for consistent ID generation
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Check if an item exists in Figma by ID
   * This checks both the current Figma file data AND the tempToRealId mapping
   */
  itemExists(itemId: string): boolean {
    // First check if we have a mapping for this item (meaning it was created in a previous publish)
    const figmaId = this.getFigmaId(itemId);
    
    // If the figmaId is different from the itemId, it means we have a mapping
    // This indicates the item was created in a previous publish
    if (figmaId !== itemId) {
      console.log(`[FigmaIdManager] Item ${itemId} exists via mapping: ${figmaId}`);
      return true;
    }
    
    // Otherwise, check if it exists in the current Figma file data
    const existsInCurrentData = this.existingFigmaIds.has(figmaId);
    console.log(`[FigmaIdManager] Item ${itemId} exists in current data: ${existsInCurrentData}`);
    return existsInCurrentData;
  }

  /**
   * Find existing variable by name
   */
  findVariableByName(name: string): string | undefined {
    return this.existingVariableNames.get(name);
  }

  /**
   * Find existing collection by name
   */
  findCollectionByName(name: string): string | undefined {
    return this.existingCollectionNames.get(name);
  }

  /**
   * Get or create Figma ID for a variable, checking by name first
   * This is used for intermediary variables in daisy-chaining to prevent naming collisions
   */
  getOrCreateVariableId(tempId: string, name: string): string {
    // First check if we have a mapping for this temp ID
    const existingMapping = this.tempToRealIdMap.get(tempId);
    if (existingMapping) {
      return existingMapping;
    }

    // Then check if there's an existing variable with this name
    const existingVariableId = this.findVariableByName(name);
    if (existingVariableId) {
      // Add this mapping to our tempToRealId map
      this.tempToRealIdMap.set(tempId, existingVariableId);
      console.log(`[FigmaIdManager] Mapped temp ID ${tempId} to existing variable ${existingVariableId} by name "${name}"`);
      return existingVariableId;
    }

    // Return the temp ID for new variables
    return tempId;
  }

  /**
   * Determine the action (CREATE/UPDATE) for an item
   */
  determineAction(itemId: string): 'CREATE' | 'UPDATE' {
    console.log(`[FigmaIdManager] 🔍 DETERMINING ACTION for itemId: ${itemId}`);
    
    const figmaId = this.getFigmaId(itemId);
    console.log(`[FigmaIdManager] getFigmaId(${itemId}) returned: ${figmaId}`);
    
    const exists = this.itemExists(itemId);
    console.log(`[FigmaIdManager] itemExists(${itemId}) returned: ${exists}`);
    
    const action = exists ? 'UPDATE' : 'CREATE';
    console.log(`[FigmaIdManager] ✅ FINAL ACTION for ${itemId}: ${action}`);
    
    return action;
  }

  /**
   * Determine the action (CREATE/UPDATE) for a variable by name
   * This is used for intermediary variables to check if they already exist
   */
  determineActionByName(name: string): 'CREATE' | 'UPDATE' {
    return this.findVariableByName(name) ? 'UPDATE' : 'CREATE';
  }

  /**
   * Check if a mode ID is referenced as an initialModeId in any collection
   */
  isInitialMode(modeId: string, collections: Array<{ initialModeId: string }>): boolean {
    return collections.some(collection => collection.initialModeId === modeId);
  }

  /**
   * Get the current tempToRealId mapping for merging with API response
   */
  getTempToRealIdMapping(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [tempId, realId] of this.tempToRealIdMap.entries()) {
      result[tempId] = realId;
    }
    return result;
  }

  /**
   * Merge new tempToRealId data from API response
   * Step 6 of the intended workflow
   */
  mergeApiResponse(newTempToRealId: Record<string, string>): void {
    for (const [tempId, realId] of Object.entries(newTempToRealId)) {
      this.tempToRealIdMap.set(tempId, realId);
      this.existingFigmaIds.add(realId);
    }
    
    console.log(`[FigmaIdManager] Merged ${Object.keys(newTempToRealId).length} new mappings`);
  }
} 
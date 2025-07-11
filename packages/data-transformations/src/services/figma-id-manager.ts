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
    // Step 1: Extract existing Figma IDs from local variables
    this.extractExistingFigmaIds(existingFigmaData);
    
    // Step 2: Load tempToRealId mapping
    this.loadTempToRealIdMapping(tempToRealId);
    
    // Step 3: Prune tempToRealId by removing non-existent Figma IDs
    this.pruneTempToRealIdMapping();
    
    console.log(`[FigmaIdManager] Initialized with ${this.tempToRealIdMap.size} valid mappings`);
  }

  /**
   * Extract existing Figma IDs from the local variables response
   */
  private extractExistingFigmaIds(existingFigmaData: FigmaFileVariablesResponse | undefined): void {
    this.existingFigmaIds.clear();
    this.existingVariableNames.clear();
    this.existingCollectionNames.clear();
    
    if (!existingFigmaData) return;

    // Extract variable IDs and names
    Object.entries(existingFigmaData.variables || {}).forEach(([id, variable]) => {
      this.existingFigmaIds.add(id);
      if (variable.name) {
        this.existingVariableNames.set(variable.name, id);
      }
    });

    // Extract collection IDs and names
    Object.entries(existingFigmaData.variableCollections || {}).forEach(([id, collection]) => {
      this.existingFigmaIds.add(id);
      if (collection.name) {
        this.existingCollectionNames.set(collection.name, id);
      }
    });

    console.log(`[FigmaIdManager] Found ${this.existingFigmaIds.size} existing Figma IDs`);
    console.log(`[FigmaIdManager] Found ${this.existingVariableNames.size} existing variable names`);
    console.log(`[FigmaIdManager] Found ${this.existingCollectionNames.size} existing collection names`);
  }

  /**
   * Load the tempToRealId mapping from the mappings file
   */
  private loadTempToRealIdMapping(tempToRealId: Record<string, string> | undefined): void {
    this.tempToRealIdMap.clear();
    
    if (!tempToRealId) return;

    for (const [tempId, realFigmaId] of Object.entries(tempToRealId)) {
      this.tempToRealIdMap.set(tempId, realFigmaId);
    }

    console.log(`[FigmaIdManager] Loaded ${this.tempToRealIdMap.size} tempToRealId mappings`);
  }

  /**
   * Prune tempToRealId by removing mappings where the Figma ID doesn't exist
   */
  private pruneTempToRealIdMapping(): void {
    const originalSize = this.tempToRealIdMap.size;
    const prunedIds: string[] = [];

    for (const [tempId, realFigmaId] of this.tempToRealIdMap.entries()) {
      if (!this.existingFigmaIds.has(realFigmaId)) {
        this.tempToRealIdMap.delete(tempId);
        prunedIds.push(tempId);
      }
    }

    console.log(`[FigmaIdManager] Pruned ${prunedIds.length} invalid mappings:`, prunedIds);
    console.log(`[FigmaIdManager] Remaining valid mappings: ${this.tempToRealIdMap.size}`);
  }

  /**
   * Get the appropriate Figma ID for an item
   * Returns the real Figma ID if it exists in the mapping, otherwise returns the original ID
   */
  getFigmaId(itemId: string): string {
    return this.tempToRealIdMap.get(itemId) || itemId;
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
   */
  itemExists(itemId: string): boolean {
    const figmaId = this.getFigmaId(itemId);
    return this.existingFigmaIds.has(figmaId);
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
    return this.itemExists(itemId) ? 'UPDATE' : 'CREATE';
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
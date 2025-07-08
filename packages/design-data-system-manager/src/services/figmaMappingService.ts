/**
 * Service for managing Figma tempToRealId mappings
 * This service handles storing and retrieving the mapping between temporary IDs
 * used during transformation and the real Figma IDs returned by the API
 */

export interface FigmaMappingData {
  fileKey: string;
  systemId: string;
  lastUpdated: string;
  tempToRealId: Record<string, string>;
  metadata?: {
    figmaFileName?: string;
    collectionName?: string;
    exportVersion?: string;
    exportedFrom?: string;
    lastExport?: string;
  };
}

export class FigmaMappingService {
  private static readonly STORAGE_KEY_PREFIX = 'figma-mapping:';

  /**
   * Save tempToRealId mapping for a specific Figma file
   */
  static saveMapping(fileKey: string, mappingData: FigmaMappingData): void {
    const storageKey = `${this.STORAGE_KEY_PREFIX}${fileKey}`;
    const dataToStore = {
      ...mappingData,
      lastUpdated: new Date().toISOString()
    };
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(dataToStore));
      console.log(`[FigmaMappingService] Saved mapping for file ${fileKey}:`, dataToStore);
    } catch (error) {
      console.error(`[FigmaMappingService] Failed to save mapping for file ${fileKey}:`, error);
    }
  }

  /**
   * Get tempToRealId mapping for a specific Figma file
   */
  static getMapping(fileKey: string): FigmaMappingData | null {
    const storageKey = `${this.STORAGE_KEY_PREFIX}${fileKey}`;
    
    try {
      const storedData = localStorage.getItem(storageKey);
      if (!storedData) {
        console.log(`[FigmaMappingService] No mapping found for file ${fileKey}`);
        return null;
      }
      
      const mappingData = JSON.parse(storedData) as FigmaMappingData;
      console.log(`[FigmaMappingService] Retrieved mapping for file ${fileKey}:`, mappingData);
      return mappingData;
    } catch (error) {
      console.error(`[FigmaMappingService] Failed to retrieve mapping for file ${fileKey}:`, error);
      return null;
    }
  }

  /**
   * Update tempToRealId mapping from Figma API response
   * This processes the response from the Figma Variables API and updates the mapping
   */
  static updateMappingFromApiResponse(
    fileKey: string, 
    apiResponse: Record<string, unknown>
  ): void {
    console.log(`[FigmaMappingService] Processing API response for file ${fileKey}:`, apiResponse);
    
    // Extract the new tempToRealId mapping from the API response
    const newMapping: Record<string, string> = {};
    
    // Process variables
    if (apiResponse.variables && typeof apiResponse.variables === 'object') {
      for (const [tempId, variableData] of Object.entries(apiResponse.variables)) {
        const variable = variableData as Record<string, unknown>;
        if (variable.id && typeof variable.id === 'string') {
          newMapping[tempId] = variable.id;
          console.log(`[FigmaMappingService] Mapped variable ${tempId} -> ${variable.id}`);
        }
      }
    }
    
    // Process collections
    if (apiResponse.variableCollections && typeof apiResponse.variableCollections === 'object') {
      for (const [tempId, collectionData] of Object.entries(apiResponse.variableCollections)) {
        const collection = collectionData as Record<string, unknown>;
        if (collection.id && typeof collection.id === 'string') {
          newMapping[tempId] = collection.id;
          console.log(`[FigmaMappingService] Mapped collection ${tempId} -> ${collection.id}`);
        }
      }
    }
    
    // Merge with existing mapping
    const existingMapping = this.getMapping(fileKey);
    const mergedMapping = {
      ...existingMapping?.tempToRealId,
      ...newMapping
    };
    
    // Save the updated mapping
    const mappingData: FigmaMappingData = {
      fileKey,
      systemId: existingMapping?.systemId || 'design-system',
      lastUpdated: new Date().toISOString(),
      tempToRealId: mergedMapping,
      metadata: {
        ...existingMapping?.metadata,
        lastExport: new Date().toISOString()
      }
    };
    
    this.saveMapping(fileKey, mappingData);
    console.log(`[FigmaMappingService] Updated mapping for file ${fileKey}:`, mappingData);
  }

  /**
   * Clear mapping for a specific file
   */
  static clearMapping(fileKey: string): void {
    const storageKey = `${this.STORAGE_KEY_PREFIX}${fileKey}`;
    localStorage.removeItem(storageKey);
    console.log(`[FigmaMappingService] Cleared mapping for file ${fileKey}`);
  }

  /**
   * List all stored mappings
   */
  static listAllMappings(): FigmaMappingData[] {
    const mappings: FigmaMappingData[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.STORAGE_KEY_PREFIX)) {
        try {
          const mappingData = JSON.parse(localStorage.getItem(key) || '');
          mappings.push(mappingData);
        } catch (error) {
          console.error(`[FigmaMappingService] Failed to parse mapping from key ${key}:`, error);
        }
      }
    }
    
    return mappings;
  }

  /**
   * Get tempToRealId mapping for transformer options
   */
  static getTransformerOptions(fileKey: string): { tempToRealId?: Record<string, string> } {
    const mapping = this.getMapping(fileKey);
    return {
      tempToRealId: mapping?.tempToRealId
    };
  }
} 
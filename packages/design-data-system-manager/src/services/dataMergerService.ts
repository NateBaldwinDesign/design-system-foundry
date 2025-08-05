import { StorageService } from './storage';
import { DataEditorService } from './dataEditorService';
import type { TokenSystem } from '@token-model/data-model';
import type { DataSourceType } from '../types/dataManagement';

export class DataMergerService {
  private static instance: DataMergerService;

  private constructor() {}

  static getInstance(): DataMergerService {
    if (!DataMergerService.instance) {
      DataMergerService.instance = new DataMergerService();
    }
    return DataMergerService.instance;
  }

  /**
   * Compute merged data for UI display
   */
  async computeMergedData(): Promise<TokenSystem | null> {
    const coreData = StorageService.getCoreData();
    const sourceContext = StorageService.getSourceContext();
    
    if (!coreData) {
      console.warn('[DataMergerService] No core data available for merging');
      return null;
    }

    if (!sourceContext) {
      console.warn('[DataMergerService] No source context available for merging');
      return coreData;
    }

    try {
      let mergedData: TokenSystem;

      if (sourceContext.sourceType === 'core') {
        // Core data is the source, no merging needed
        mergedData = coreData;
      } else if (sourceContext.sourceType === 'platform') {
        // Merge core data with platform extension
        mergedData = await this.mergePlatformData(coreData, sourceContext.sourceId);
      } else if (sourceContext.sourceType === 'theme') {
        // Merge core data with theme override
        mergedData = await this.mergeThemeData(coreData, sourceContext.sourceId);
      } else {
        console.warn('[DataMergerService] Unknown source type, using core data');
        mergedData = coreData;
      }

      // Store merged data
      StorageService.setMergedData(mergedData);
      
      // Update DataEditorService
      const dataEditor = DataEditorService.getInstance();
      dataEditor.updateMergedData(mergedData);

      console.log('[DataMergerService] Merged data computed successfully');
      return mergedData;

    } catch (error) {
      console.error('[DataMergerService] Error computing merged data:', error);
      return coreData;
    }
  }

  /**
   * Merge core data with platform extension
   */
  private async mergePlatformData(coreData: TokenSystem, platformId: string | null): Promise<TokenSystem> {
    if (!platformId) {
      console.warn('[DataMergerService] No platform ID provided for merging');
      return coreData;
    }

    const platformData = StorageService.getPlatformExtensionData(platformId);
    if (!platformData) {
      console.warn(`[DataMergerService] No platform data found for ID: ${platformId}`);
      return coreData;
    }

    console.log(`[DataMergerService] Merging platform data for: ${platformId}`);

    // Create a deep copy of core data
    const mergedData: TokenSystem = JSON.parse(JSON.stringify(coreData));

    // Apply platform token overrides
    if (platformData.tokenOverrides) {
      for (const override of platformData.tokenOverrides) {
        const existingTokenIndex = mergedData.tokens?.findIndex(t => t.id === override.id);
        
        if (existingTokenIndex !== undefined && existingTokenIndex >= 0) {
          // Update existing token
          mergedData.tokens![existingTokenIndex] = {
            ...mergedData.tokens![existingTokenIndex],
            ...override
          };
        } else {
          // Add new token
          if (mergedData.tokens) {
            mergedData.tokens.push(override as any);
          } else {
            mergedData.tokens = [override as any];
          }
        }
      }
    }

    // Apply platform algorithm variable overrides
    if (platformData.algorithmVariableOverrides) {
      for (const override of platformData.algorithmVariableOverrides) {
        // Find the algorithm and update its variables
        const algorithm = mergedData.algorithms?.find(a => a.id === override.algorithmId);
        if (algorithm && algorithm.variables) {
          const variable = algorithm.variables.find(v => v.id === override.variableId);
          if (variable) {
            variable.valuesByMode = override.valuesByMode;
          }
        }
      }
    }

    // Apply omitted modes and dimensions
    if (platformData.omittedModes) {
      // Remove omitted modes from tokens
      if (mergedData.tokens) {
        mergedData.tokens = mergedData.tokens.map(token => ({
          ...token,
          valuesByMode: token.valuesByMode?.filter(vbm => 
            !vbm.modeIds.some(modeId => platformData.omittedModes!.includes(modeId))
          ) || []
        }));
      }
    }

    if (platformData.omittedDimensions) {
      // Remove omitted dimensions
      if (mergedData.dimensions) {
        mergedData.dimensions = mergedData.dimensions.filter(d => 
          !platformData.omittedDimensions!.includes(d.id)
        );
      }
    }

    console.log('[DataMergerService] Platform data merged successfully');
    return mergedData;
  }

  /**
   * Merge core data with theme override
   */
  private async mergeThemeData(coreData: TokenSystem, themeId: string | null): Promise<TokenSystem> {
    if (!themeId) {
      console.warn('[DataMergerService] No theme ID provided for merging');
      return coreData;
    }

    const themeData = StorageService.getThemeOverrideData(themeId);
    if (!themeData) {
      console.warn(`[DataMergerService] No theme data found for ID: ${themeId}`);
      return coreData;
    }

    console.log(`[DataMergerService] Merging theme data for: ${themeId}`);

    // Create a deep copy of core data
    const mergedData: TokenSystem = JSON.parse(JSON.stringify(coreData));

    // Apply theme token overrides
    if (themeData.tokenOverrides) {
      for (const override of themeData.tokenOverrides) {
        const existingTokenIndex = mergedData.tokens?.findIndex(t => t.id === override.tokenId);
        
        if (existingTokenIndex !== undefined && existingTokenIndex >= 0) {
          // Update existing token values
          const existingToken = mergedData.tokens![existingTokenIndex];
          if (override.valuesByMode) {
            existingToken.valuesByMode = override.valuesByMode;
          }
        }
      }
    }

    console.log('[DataMergerService] Theme data merged successfully');
    return mergedData;
  }

  /**
   * Optimize merging operations by caching results
   */
  private getMergedDataCacheKey(sourceType: DataSourceType, sourceId: string | null): string {
    const coreData = StorageService.getCoreData();
    const coreDataHash = coreData ? JSON.stringify(coreData).length.toString() : '0';
    return `${sourceType}-${sourceId || 'core'}-${coreDataHash}`;
  }

  /**
   * Clear merged data cache
   */
  clearCache(): void {
    // In a full implementation, this would clear any caching mechanism
    console.log('[DataMergerService] Cache cleared');
  }

  /**
   * Get current merged data
   */
  getCurrentMergedData(): TokenSystem | null {
    return StorageService.getMergedData();
  }

  /**
   * Force recomputation of merged data
   */
  async recomputeMergedData(): Promise<TokenSystem | null> {
    console.log('[DataMergerService] Forcing recomputation of merged data');
    return await this.computeMergedData();
  }

  /**
   * Check if merged data needs to be recomputed
   */
  needsRecomputation(): boolean {
    const sourceContext = StorageService.getSourceContext();
    const mergedData = StorageService.getMergedData();
    
    if (!sourceContext || !mergedData) {
      return true;
    }

    // Check if source context has changed since last merge
    const lastLoadedAt = new Date(sourceContext.lastLoadedAt);
    const now = new Date();
    const timeSinceLastLoad = now.getTime() - lastLoadedAt.getTime();
    
    // Recompute if more than 5 minutes have passed
    return timeSinceLastLoad > 5 * 60 * 1000;
  }
} 
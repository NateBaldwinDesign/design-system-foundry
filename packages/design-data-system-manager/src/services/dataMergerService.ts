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
    console.log('[DataMergerService] computeMergedData called');
    
    const coreData = StorageService.getCoreData();
    const sourceContext = StorageService.getSourceContext();
    
    console.log('[DataMergerService] Source context:', {
      hasSourceContext: !!sourceContext,
      sourceType: sourceContext?.sourceType,
      sourceId: sourceContext?.sourceId,
      sourceContextKeys: sourceContext ? Object.keys(sourceContext) : []
    });
    
    if (!coreData) {
      console.warn('[DataMergerService] No core data available for merging');
      return null;
    }

    // Log core data dimensionOrder for debugging
    console.log('[DataMergerService] Core data dimensionOrder:', coreData.dimensionOrder);
    console.log('[DataMergerService] Core data dimensions:', coreData.dimensions?.map(d => ({ id: d.id, displayName: d.displayName })));

    if (!sourceContext) {
      console.warn('[DataMergerService] No source context available for merging');
      return coreData;
    }

    try {
      // Read current selections from URL (authoritative source for dropdowns)
      const urlParams = new URLSearchParams(window.location.search);
      const currentPlatform = urlParams.get('platform');
      const currentTheme = urlParams.get('theme');
      
      console.log('[DataMergerService] Current URL selections:', { currentPlatform, currentTheme });
      
      let mergedData: TokenSystem = coreData;

      // Apply platform extension if selected (Core + Platform)
      if (currentPlatform && currentPlatform !== 'none') {
        console.log('[DataMergerService] Applying platform extension:', currentPlatform);
        mergedData = await this.mergePlatformData(mergedData, currentPlatform);
        console.log('[DataMergerService] After platform merge - dimensionOrder:', mergedData.dimensionOrder);
      }

      // Apply theme override if selected (Core + Platform + Theme)
      if (currentTheme && currentTheme !== 'none') {
        console.log('[DataMergerService] Applying theme override:', currentTheme);
        mergedData = await this.mergeThemeData(mergedData, currentTheme);
        console.log('[DataMergerService] After theme merge - dimensionOrder:', mergedData.dimensionOrder);
      }
      
      console.log('[DataMergerService] Final merge order applied: Core', 
        currentPlatform && currentPlatform !== 'none' ? '+ Platform(' + currentPlatform + ')' : '', 
        currentTheme && currentTheme !== 'none' ? '+ Theme(' + currentTheme + ')' : '');

      // Final validation of dimensionOrder
      if (!mergedData.dimensionOrder || mergedData.dimensionOrder.length === 0) {
        console.error('[DataMergerService] CRITICAL ERROR: Final merged data missing dimensionOrder!');
        console.error('[DataMergerService] This will break daisy-chaining in Figma export!');
        // Attempt to reconstruct from available dimensions
        mergedData.dimensionOrder = mergedData.dimensions?.map(d => d.id) || [];
        console.log('[DataMergerService] Reconstructed dimensionOrder:', mergedData.dimensionOrder);
      } else {
        console.log('[DataMergerService] Final merged data dimensionOrder is valid:', mergedData.dimensionOrder);
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
    console.log(`[DataMergerService] mergePlatformData called with platformId: ${platformId}`);
    console.log(`[DataMergerService] Core data tokens count: ${coreData.tokens?.length || 0}`);
    
    if (!platformId) {
      console.warn('[DataMergerService] No platform ID provided for merging');
      return coreData;
    }

    const platformData = StorageService.getPlatformExtensionData(platformId);
    console.log(`[DataMergerService] Retrieved platform data:`, {
      hasData: !!platformData,
      dataType: typeof platformData,
      dataKeys: platformData ? Object.keys(platformData) : []
    });
    
    if (!platformData) {
      console.warn(`[DataMergerService] No platform data found for ID: ${platformId}`);
      return coreData;
    }

    console.log(`[DataMergerService] Merging platform data for: ${platformId}`);
    console.log(`[DataMergerService] Platform data structure:`, {
      hasTokenOverrides: !!platformData.tokenOverrides,
      tokenOverridesCount: platformData.tokenOverrides?.length || 0,
      hasAlgorithmVariableOverrides: !!platformData.algorithmVariableOverrides,
      algorithmVariableOverridesCount: platformData.algorithmVariableOverrides?.length || 0,
      hasOmittedModes: !!platformData.omittedModes,
      omittedModesCount: platformData.omittedModes?.length || 0,
      hasOmittedDimensions: !!platformData.omittedDimensions,
      omittedDimensionsCount: platformData.omittedDimensions?.length || 0,
      platformDataKeys: Object.keys(platformData)
    });

    // Create a deep copy of core data
    const mergedData: TokenSystem = JSON.parse(JSON.stringify(coreData));
    
    // Ensure dimensionOrder is preserved (critical for daisy-chaining)
    if (!mergedData.dimensionOrder || mergedData.dimensionOrder.length === 0) {
      console.warn('[DataMergerService] Core data missing dimensionOrder, attempting to reconstruct');
      mergedData.dimensionOrder = coreData.dimensions?.map(d => d.id) || [];
    }

    // Preserve core data properties that should not be overridden
    if (coreData.figmaConfiguration) {
      mergedData.figmaConfiguration = {
        ...coreData.figmaConfiguration,
        // Platform extensions can override fileColorProfile
        fileColorProfile: platformData.fileColorProfile || coreData.figmaConfiguration.fileColorProfile || 'srgb'
      };
      console.log(`[DataMergerService] Preserved figmaConfiguration with fileColorProfile: ${mergedData.figmaConfiguration.fileColorProfile}`);
    }

    // Apply platform token overrides
    if (platformData.tokenOverrides) {
      console.log(`[DataMergerService] Processing ${platformData.tokenOverrides.length} token overrides`);
      let overriddenCount = 0;
      let newCount = 0;
      
      for (const override of platformData.tokenOverrides) {
        const existingTokenIndex = mergedData.tokens?.findIndex(t => t.id === override.id);
        
        if (existingTokenIndex !== undefined && existingTokenIndex >= 0) {
          // Update existing token
          console.log(`[DataMergerService] Overriding existing token: ${override.id}`);
          mergedData.tokens![existingTokenIndex] = {
            ...mergedData.tokens![existingTokenIndex],
            ...override
          };
          overriddenCount++;
        } else {
          // Add new token
          console.log(`[DataMergerService] Adding new token: ${override.id}`);
          if (mergedData.tokens) {
            mergedData.tokens.push(override as any);
          } else {
            mergedData.tokens = [override as any];
          }
          newCount++;
        }
      }
      
      console.log(`[DataMergerService] Token override summary: ${overriddenCount} overridden, ${newCount} new`);
    } else {
      console.log(`[DataMergerService] No token overrides found in platform data`);
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
      
      // Update dimensionOrder to remove omitted dimensions
      if (mergedData.dimensionOrder) {
        mergedData.dimensionOrder = mergedData.dimensionOrder.filter(dimensionId => 
          !platformData.omittedDimensions!.includes(dimensionId)
        );
        console.log(`[DataMergerService] Updated dimensionOrder after removing omitted dimensions:`, mergedData.dimensionOrder);
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
    
    // Ensure dimensionOrder is preserved (critical for daisy-chaining)
    if (!mergedData.dimensionOrder || mergedData.dimensionOrder.length === 0) {
      console.warn('[DataMergerService] Core data missing dimensionOrder, attempting to reconstruct');
      mergedData.dimensionOrder = coreData.dimensions?.map(d => d.id) || [];
    }

    // Preserve core/platform data properties that should not be overridden
    if (coreData.figmaConfiguration) {
      mergedData.figmaConfiguration = {
        ...coreData.figmaConfiguration,
        // Themes inherit fileColorProfile from core/platform, cannot override
        fileColorProfile: coreData.figmaConfiguration.fileColorProfile || 'srgb'
      };
      console.log(`[DataMergerService] Preserved figmaConfiguration with inherited fileColorProfile: ${mergedData.figmaConfiguration.fileColorProfile}`);
    }

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
import { DataLoaderService } from './dataLoaderService';
import { DataEditorService } from './dataEditorService';
import { DataMergerService } from './dataMergerService';
import { StorageService } from './storage';
import type { 
  DataSourceType, 
  SourceContext, 
  SourceSwitchResult, 
  RepositoryInfo 
} from '../types/dataManagement';

export class SourceManagerService {
  private static instance: SourceManagerService;

  private constructor() {}

  static getInstance(): SourceManagerService {
    if (!SourceManagerService.instance) {
      SourceManagerService.instance = new SourceManagerService();
    }
    return SourceManagerService.instance;
  }

  /**
   * Parse URL parameters and determine source configuration
   */
  parseURLParameters(urlParams: URLSearchParams): {
    repo: string | null;
    path: string | null;
    branch: string;
    platformId: string | null;
    themeId: string | null;
    sourceType: DataSourceType;
  } {
    const repo = urlParams.get('repo');
    const path = urlParams.get('path');
    const branch = urlParams.get('branch') || 'main';
    const platformId = urlParams.get('platform');
    const themeId = urlParams.get('theme');

    let sourceType: DataSourceType = 'core';
    if (themeId) {
      sourceType = 'theme';
    } else if (platformId) {
      sourceType = 'platform';
    }

    return {
      repo,
      path,
      branch,
      platformId,
      themeId,
      sourceType
    };
  }

  /**
   * Switch to a different source
   */
  async switchSource(
    sourceType: DataSourceType, 
    sourceId?: string
  ): Promise<SourceSwitchResult> {
    try {
      console.log(`[SourceManagerService] Switching source to ${sourceType}${sourceId ? ` (${sourceId})` : ''}`);

      // 1. Check for unsaved changes
      const dataEditor = DataEditorService.getInstance();
      if (dataEditor.hasLocalChanges()) {
        const confirmed = await this.showChangeWarning();
        if (!confirmed) {
          return {
            success: false,
            error: 'Source switch cancelled by user',
            changesDiscarded: false
          };
        }
      }

      // 2. Get current source context
      const previousSource = StorageService.getSourceContext();

      // 3. Load new source snapshot
      const newSnapshot = await this.loadSourceSnapshot(sourceType, sourceId);
      if (!newSnapshot) {
        return {
          success: false,
          error: `Failed to load source snapshot for ${sourceType}${sourceId ? ` (${sourceId})` : ''}`
        };
      }

      // 4. Reset local edits to match snapshot
      const dataEditorService = DataEditorService.getInstance();
      dataEditorService.resetLocalEdits();

      // 5. Recompute merged data
      const dataMerger = DataMergerService.getInstance();
      await dataMerger.computeMergedData();

      // 6. Update source context
      const newSource = await this.updateSourceContext(sourceType, sourceId);
      if (!newSource) {
        return {
          success: false,
          error: 'Failed to update source context'
        };
      }

      console.log('[SourceManagerService] Source switch completed successfully');
      return {
        success: true,
        previousSource,
        newSource,
        changesDiscarded: dataEditor.hasLocalChanges()
      };

    } catch (error) {
      console.error('[SourceManagerService] Error during source switch:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during source switch'
      };
    }
  }

  /**
   * Load source snapshot for the specified source type and ID
   */
  private async loadSourceSnapshot(
    sourceType: DataSourceType, 
    sourceId?: string
  ): Promise<boolean> {
    const coreData = StorageService.getCoreData();
    if (!coreData) {
      console.error('[SourceManagerService] No core data available for loading source snapshot');
      return false;
    }

    try {
      if (sourceType === 'core') {
        // Use core data as source snapshot
        StorageService.setSourceSnapshot(coreData);
        return true;
      }

      if (sourceType === 'platform' && sourceId) {
        // Load platform extension data
        const platformData = StorageService.getPlatformExtensionData(sourceId);
        if (platformData) {
          StorageService.setSourceSnapshot(platformData);
          return true;
        } else {
          console.error(`[SourceManagerService] Platform data not found for ID: ${sourceId}`);
          return false;
        }
      }

      if (sourceType === 'theme' && sourceId) {
        // Load theme override data
        const themeData = StorageService.getThemeOverrideData(sourceId);
        if (themeData) {
          StorageService.setSourceSnapshot(themeData);
          return true;
        } else {
          console.error(`[SourceManagerService] Theme data not found for ID: ${sourceId}`);
          return false;
        }
      }

      return false;

    } catch (error) {
      console.error('[SourceManagerService] Error loading source snapshot:', error);
      return false;
    }
  }

  /**
   * Update source context for the new source
   */
  private async updateSourceContext(
    sourceType: DataSourceType, 
    sourceId?: string
  ): Promise<SourceContext | null> {
    const currentContext = StorageService.getSourceContext();
    if (!currentContext) {
      console.error('[SourceManagerService] No current source context available');
      return null;
    }

    const newContext: SourceContext = {
      ...currentContext,
      sourceType,
      sourceId: sourceId || null,
      lastLoadedAt: new Date().toISOString(),
      hasLocalChanges: false,
      editMode: {
        ...currentContext.editMode,
        sourceType: sourceType === 'platform' ? 'platform-extension' : 
                   sourceType === 'theme' ? 'theme-override' : 'core',
        sourceId: sourceId || null
      }
    };

    StorageService.setSourceContext(newContext);
    return newContext;
  }

  /**
   * Show change warning dialog
   */
  private async showChangeWarning(): Promise<boolean> {
    // In a real implementation, this would show a confirmation dialog
    // For now, we'll use a simple console confirmation
    console.warn('[SourceManagerService] Unsaved changes detected. User would be prompted to confirm.');
    
    // Simulate user confirmation (in real implementation, this would be user input)
    return true;
  }

  /**
   * Get current source context
   */
  getCurrentSourceContext(): SourceContext | null {
    return StorageService.getSourceContext();
  }

  /**
   * Get current source type
   */
  getCurrentSourceType(): DataSourceType {
    const context = StorageService.getSourceContext();
    return context?.sourceType || 'core';
  }

  /**
   * Get current source ID
   */
  getCurrentSourceId(): string | null {
    const context = StorageService.getSourceContext();
    return context?.sourceId || null;
  }

  /**
   * Check if current source has local changes
   */
  hasLocalChanges(): boolean {
    const dataEditor = DataEditorService.getInstance();
    return dataEditor.hasLocalChanges();
  }

  /**
   * Get available platforms from core data
   */
  getAvailablePlatforms(): Array<{ id: string; displayName: string }> {
    const coreData = StorageService.getCoreData();
    if (!coreData?.platforms) {
      return [];
    }

    return coreData.platforms.map(platform => ({
      id: platform.id,
      displayName: platform.displayName
    }));
  }

  /**
   * Get available themes from core data
   */
  getAvailableThemes(): Array<{ id: string; displayName: string }> {
    const coreData = StorageService.getCoreData();
    if (!coreData?.themes) {
      return [];
    }

    return coreData.themes.map(theme => ({
      id: theme.id,
      displayName: theme.displayName
    }));
  }

  /**
   * Get repository information for current source
   */
  getCurrentRepositoryInfo(): RepositoryInfo | null {
    const context = StorageService.getSourceContext();
    if (!context) {
      return null;
    }

    return context.sourceRepository;
  }

  /**
   * Get core repository information
   */
  getCoreRepositoryInfo(): RepositoryInfo | null {
    const context = StorageService.getSourceContext();
    if (!context) {
      return null;
    }

    return context.coreRepository;
  }

  /**
   * Check if source switching is available
   */
  isSourceSwitchingAvailable(): boolean {
    const coreData = StorageService.getCoreData();
    if (!coreData) {
      return false;
    }

    // Check if there are platforms or themes available
    const hasPlatforms = coreData.platforms && coreData.platforms.length > 0;
    const hasThemes = coreData.themes && coreData.themes.length > 0;

    return hasPlatforms || hasThemes;
  }

  /**
   * Get source switching options
   */
  getSourceSwitchingOptions(): {
    platforms: Array<{ id: string; displayName: string }>;
    themes: Array<{ id: string; displayName: string }>;
  } {
    return {
      platforms: this.getAvailablePlatforms(),
      themes: this.getAvailableThemes()
    };
  }

  /**
   * Validate source configuration
   */
  validateSourceConfiguration(
    sourceType: DataSourceType, 
    sourceId?: string
  ): { isValid: boolean; error?: string } {
    if (sourceType === 'core') {
      return { isValid: true };
    }

    if (sourceType === 'platform') {
      if (!sourceId) {
        return { isValid: false, error: 'Platform ID is required for platform source type' };
      }

      const platforms = this.getAvailablePlatforms();
      const platformExists = platforms.some(p => p.id === sourceId);
      
      if (!platformExists) {
        return { isValid: false, error: `Platform with ID '${sourceId}' not found` };
      }

      return { isValid: true };
    }

    if (sourceType === 'theme') {
      if (!sourceId) {
        return { isValid: false, error: 'Theme ID is required for theme source type' };
      }

      const themes = this.getAvailableThemes();
      const themeExists = themes.some(t => t.id === sourceId);
      
      if (!themeExists) {
        return { isValid: false, error: `Theme with ID '${sourceId}' not found` };
      }

      return { isValid: true };
    }

    return { isValid: false, error: `Unknown source type: ${sourceType}` };
  }
} 
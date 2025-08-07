import { StorageService } from './storage';
import { GitHubApiService } from './githubApi';
import { GitHubAuthService } from './githubAuth';
import type { TokenSystem, PlatformExtension, ThemeOverrideFile } from '@token-model/data-model';
import { OverrideTrackingService } from './overrideTrackingService';
import { FigmaConfigurationOverrideService } from './figmaConfigurationOverrideService';

export interface ChangeTrackingState {
  hasLocalChanges: boolean;
  hasGitHubDivergence: boolean;
  canExport: boolean;
  changeCount: number;
  lastGitHubSync?: string;
}

export class ChangeTrackingService {
  /**
   * Check if there are any local changes compared to the baseline
   */
  static hasLocalChanges(): boolean {
    const currentData = this.getCurrentDataSnapshot();
    const baselineData = this.getBaselineDataSnapshot();
    
    if (!baselineData) {
      // No baseline data means this is a fresh load, so no changes
      return false;
    }
    
    const dataChanges = JSON.stringify(currentData) !== JSON.stringify(baselineData);
    const overrideChanges = OverrideTrackingService.hasPendingOverrides();
    const figmaConfigChanges = FigmaConfigurationOverrideService.hasStagedChanges();
    
    return dataChanges || overrideChanges || figmaConfigChanges;
  }

  /**
   * Count the number of changes by comparing current data with baseline
   */
  static getChangeCount(): number {
    const currentData = this.getCurrentDataSnapshot();
    const baselineData = this.getBaselineDataSnapshot();
    
    if (!baselineData) return 0;
    
    let totalChanges = 0;
    const keyFields = ['tokens', 'collections', 'dimensions', 'themes', 'resolvedValueTypes', 'taxonomies', 'algorithms', 'platforms', 'componentProperties', 'componentCategories', 'components'];
    
    keyFields.forEach(field => {
      const current = (currentData as Record<string, unknown>)[field] as unknown[] || [];
      const baseline = (baselineData as Record<string, unknown>)[field] as unknown[] || [];
      
      if (Array.isArray(current) && Array.isArray(baseline)) {
        const currentIds = new Set(current.map((item: unknown) => {
          const obj = item as Record<string, unknown>;
          return obj?.id as string;
        }).filter(Boolean));
        const baselineIds = new Set(baseline.map((item: unknown) => {
          const obj = item as Record<string, unknown>;
          return obj?.id as string;
        }).filter(Boolean));
        
        // Count added items
        const added = Array.from(currentIds).filter(id => !baselineIds.has(id)).length;
        // Count removed items
        const removed = Array.from(baselineIds).filter(id => !currentIds.has(id)).length;
        
        // Count modified items
        const commonIds = Array.from(currentIds).filter(id => baselineIds.has(id));
        let modified = 0;
        commonIds.forEach(id => {
          const currentItem = current.find((item: unknown) => {
            const obj = item as Record<string, unknown>;
            return obj?.id === id;
          });
          const baselineItem = baseline.find((item: unknown) => {
            const obj = item as Record<string, unknown>;
            return obj?.id === id;
          });
          if (currentItem && baselineItem && JSON.stringify(currentItem) !== JSON.stringify(baselineItem)) {
            modified++;
          }
        });
        
        totalChanges += added + removed + modified;
      }
    });
    
    // Check taxonomyOrder (array)
    const currentTaxonomyOrder = (currentData as Record<string, unknown>).taxonomyOrder as string[] || [];
    const baselineTaxonomyOrder = (baselineData as Record<string, unknown>).taxonomyOrder as string[] || [];
    
    if (JSON.stringify(currentTaxonomyOrder) !== JSON.stringify(baselineTaxonomyOrder)) {
      totalChanges += 1; // Count as one change for taxonomyOrder modifications
    }
    
    // NEW: Include override changes in the total count
    const overrideChanges = OverrideTrackingService.getChangeCount();
    totalChanges += overrideChanges;
    
    // NEW: Include Figma configuration override changes
    const figmaConfigChanges = FigmaConfigurationOverrideService.hasStagedChanges() ? 1 : 0;
    totalChanges += figmaConfigChanges;
    
    return totalChanges;
  }

  /**
   * Check if local data has diverged from GitHub repository
   */
  static async hasGitHubDivergence(): Promise<boolean> {
    // Check if user is connected to GitHub
    if (!GitHubAuthService.isAuthenticated()) {
      console.log('[ChangeTrackingService] No GitHub authentication, no divergence');
      return false;
    }

    // Check if a repository is selected
    const selectedRepo = GitHubApiService.getSelectedRepositoryInfo();
    if (!selectedRepo) {
      console.log('[ChangeTrackingService] No repository selected, no divergence');
      return false;
    }

    // Get baseline data (which represents the original GitHub data)
    const baselineData = this.getBaselineDataSnapshot();
    if (!baselineData) {
      console.log('[ChangeTrackingService] No baseline data, no divergence');
      return false;
    }

    // Get current local data
    const localData = this.getCurrentDataSnapshot();
    
    // Compare key data arrays between current local data and baseline
    const keyFields = ['tokens', 'collections', 'dimensions', 'themes', 'resolvedValueTypes', 'taxonomies', 'algorithms'];
    
    for (const field of keyFields) {
      const local = (localData as Record<string, unknown>)[field] as unknown[] || [];
      const baseline = (baselineData as Record<string, unknown>)[field] as unknown[] || [];
      
      if (JSON.stringify(local) !== JSON.stringify(baseline)) {
        console.log(`[ChangeTrackingService] Divergence detected in field: ${field}`);
        console.log(`[ChangeTrackingService] Local ${field} count:`, local.length);
        console.log(`[ChangeTrackingService] Baseline ${field} count:`, baseline.length);
        return true; // Divergence detected
      }
    }
    
    // Check taxonomyOrder (array)
    const localTaxonomyOrder = (localData as Record<string, unknown>).taxonomyOrder as string[] || [];
    const baselineTaxonomyOrder = (baselineData as Record<string, unknown>).taxonomyOrder as string[] || [];
    
    if (JSON.stringify(localTaxonomyOrder) !== JSON.stringify(baselineTaxonomyOrder)) {
      console.log('[ChangeTrackingService] Divergence detected in field: taxonomyOrder');
      return true; // Divergence detected
    }
    
    console.log('[ChangeTrackingService] No divergence detected');
    return false; // No divergence
  }

  /**
   * Get the complete change tracking state
   */
  static async getChangeTrackingState(): Promise<ChangeTrackingState> {
    const hasLocalChanges = this.hasLocalChanges();
    const hasGitHubDivergence = await this.hasGitHubDivergence();
    const changeCount = this.getChangeCount();
    
    // User CAN generate export if:
    // 1. There are NO local changes (clean state), OR
    // 2. There ARE local changes BUT there is NO GitHub divergence (local changes are in sync with baseline)
    // 
    // This means export is blocked only when:
    // - There are local changes AND the local data has diverged from the baseline (GitHub data)
    const canExport = !hasLocalChanges || !hasGitHubDivergence;
    
    console.log('[ChangeTrackingService] Change tracking state:', {
      hasLocalChanges,
      hasGitHubDivergence,
      canExport,
      changeCount
    });
    
    return {
      hasLocalChanges,
      hasGitHubDivergence,
      canExport,
      changeCount,
      lastGitHubSync: this.getLastGitHubSync()
    };
  }

  /**
   * Get current data snapshot from storage
   */
  static getCurrentDataSnapshot(): Record<string, unknown> {
    return {
      tokens: StorageService.getTokens(),
      collections: StorageService.getCollections(),
      modes: StorageService.getModes(),
      resolvedValueTypes: StorageService.getValueTypes(),
      dimensions: StorageService.getDimensions(),
      dimensionOrder: StorageService.getDimensionOrder(),
      platforms: StorageService.getPlatforms(),
      themes: StorageService.getThemes(),
      taxonomies: StorageService.getTaxonomies(),
      taxonomyOrder: StorageService.getTaxonomyOrder(),
      algorithms: StorageService.getAlgorithms(),
      algorithmFile: StorageService.getAlgorithmFile(),
      platformExtensionFiles: StorageService.getPlatformExtensionFiles(),
      componentProperties: StorageService.getComponentProperties(),
      componentCategories: StorageService.getComponentCategories(),
      components: StorageService.getComponents(),
    };
  }

  /**
   * Get baseline data snapshot from storage
   */
  static getBaselineDataSnapshot(): Record<string, unknown> | null {
    const baselineStr = localStorage.getItem('token-model:baseline-data');
    if (!baselineStr) return null;
    
    try {
      return JSON.parse(baselineStr);
    } catch (error) {
      console.error('[ChangeTrackingService] Error parsing baseline data:', error);
      return null;
    }
  }

  /**
   * Get last GitHub sync timestamp
   */
  private static getLastGitHubSync(): string | undefined {
    return localStorage.getItem('token-model:last-github-sync') || undefined;
  }

  /**
   * Set baseline data (called when new data is loaded)
   */
  static setBaselineData(data: Record<string, unknown>): void {
    localStorage.setItem('token-model:baseline-data', JSON.stringify(data));
  }

  /**
   * Update last GitHub sync timestamp
   */
  static updateLastGitHubSync(): void {
    localStorage.setItem('token-model:last-github-sync', new Date().toISOString());
  }

  // ============================================================================
  // Schema-Aware Change Tracking (Phase 4.6)
  // ============================================================================

  private static baselines: {
    core: TokenSystem | null;
    platformExtensions: Record<string, PlatformExtension>;
    themeOverrides: Record<string, ThemeOverrideFile>;
  } = {
    core: null,
    platformExtensions: {},
    themeOverrides: {}
  };

  /**
   * Set baseline for specific source
   */
  static setBaselineForSource(
    sourceType: 'core' | 'platform-extension' | 'theme-override',
    sourceId: string,
    data: Record<string, unknown>
  ): void {
    switch (sourceType) {
      case 'core': {
        this.baselines.core = data as TokenSystem;
        break;
      }
      case 'platform-extension': {
        this.baselines.platformExtensions[sourceId] = data as PlatformExtension;
        break;
      }
      case 'theme-override': {
        this.baselines.themeOverrides[sourceId] = data as ThemeOverrideFile;
        break;
      }
    }
  }

  /**
   * Check for changes in specific source
   */
  static hasChangesInSource(
    sourceType: 'core' | 'platform-extension' | 'theme-override',
    sourceId: string
  ): boolean {
    const currentData = this.getCurrentDataForSource(sourceType, sourceId);
    const baselineData = this.getBaselineForSource(sourceType, sourceId);
    
    return JSON.stringify(currentData) !== JSON.stringify(baselineData);
  }

  /**
   * Get changes for specific source
   */
  static getChangesForSource(
    sourceType: 'core' | 'platform-extension' | 'theme-override',
    sourceId: string
  ): ChangeSet {
    const currentData = this.getCurrentDataForSource(sourceType, sourceId);
    const baselineData = this.getBaselineForSource(sourceType, sourceId);
    
    return this.computeChanges(baselineData, currentData);
  }

  /**
   * Get current data for specific source
   */
  private static getCurrentDataForSource(
    sourceType: 'core' | 'platform-extension' | 'theme-override',
    sourceId: string
  ): Record<string, unknown> {
    switch (sourceType) {
      case 'core': {
        return StorageService.getCoreData() || {};
      }
      case 'platform-extension': {
        return StorageService.getPlatformExtensionData(sourceId) || {};
      }
      case 'theme-override': {
        return StorageService.getThemeOverrideData(sourceId) || {};
      }
      default:
        throw new Error(`Unknown source type: ${sourceType}`);
    }
  }

  /**
   * Get baseline data for specific source
   */
  private static getBaselineForSource(
    sourceType: 'core' | 'platform-extension' | 'theme-override',
    sourceId: string
  ): Record<string, unknown> {
    switch (sourceType) {
      case 'core': {
        return this.baselines.core || {};
      }
      case 'platform-extension': {
        return this.baselines.platformExtensions[sourceId] || {};
      }
      case 'theme-override': {
        return this.baselines.themeOverrides[sourceId] || {};
      }
      default:
        throw new Error(`Unknown source type: ${sourceType}`);
    }
  }

  /**
   * Compute changes between baseline and current data
   */
  private static computeChanges(
    baselineData: Record<string, unknown>,
    currentData: Record<string, unknown>
  ): ChangeSet {
    const changes: ChangeSet = {
      added: [],
      modified: [],
      removed: [],
      totalChanges: 0
    };

    // Compare objects recursively
    const baselineKeys = Object.keys(baselineData);
    const currentKeys = Object.keys(currentData);

    // Find added keys
    currentKeys.forEach(key => {
      if (!baselineKeys.includes(key)) {
        changes.added.push(key);
      }
    });

    // Find removed keys
    baselineKeys.forEach(key => {
      if (!currentKeys.includes(key)) {
        changes.removed.push(key);
      }
    });

    // Find modified keys
    baselineKeys.forEach(key => {
      if (currentKeys.includes(key)) {
        const baselineValue = baselineData[key];
        const currentValue = currentData[key];
        
        if (JSON.stringify(baselineValue) !== JSON.stringify(currentValue)) {
          changes.modified.push(key);
        }
      }
    });

    changes.totalChanges = changes.added.length + changes.modified.length + changes.removed.length;
    return changes;
  }

  /**
   * Clear all baselines
   */
  static clearAllBaselines(): void {
    this.baselines = {
      core: null,
      platformExtensions: {},
      themeOverrides: {}
    };
  }

  /**
   * Get change summary for all sources
   */
  static getChangeSummary(): {
    core: boolean;
    platforms: Record<string, boolean>;
    themes: Record<string, boolean>;
    totalChanges: number;
  } {
    const summary = {
      core: this.hasChangesInSource('core', ''),
      platforms: {} as Record<string, boolean>,
      themes: {} as Record<string, boolean>,
      totalChanges: 0
    };

    // Check platform changes
    Object.keys(this.baselines.platformExtensions).forEach(platformId => {
      summary.platforms[platformId] = this.hasChangesInSource('platform-extension', platformId);
    });

    // Check theme changes
    Object.keys(this.baselines.themeOverrides).forEach(themeId => {
      summary.themes[themeId] = this.hasChangesInSource('theme-override', themeId);
    });

    // Count total changes
    if (summary.core) summary.totalChanges++;
    Object.values(summary.platforms).forEach(hasChanges => {
      if (hasChanges) summary.totalChanges++;
    });
    Object.values(summary.themes).forEach(hasChanges => {
      if (hasChanges) summary.totalChanges++;
    });

    return summary;
  }

  // NEW: Override change tracking methods
  private static overrideChanges: OverrideChange[] = [];

  /**
   * Track override changes during editing
   */
  static trackOverrideChanges(
    tokenId: string,
    originalValue: Record<string, unknown>,
    newValue: Record<string, unknown>,
    sourceType: string,
    sourceId: string
  ): void {
    const overrideChange: OverrideChange = {
      tokenId,
      originalValue,
      newValue,
      sourceType,
      sourceId,
      timestamp: new Date().toISOString()
    };

    // Remove existing change for this token if it exists
    this.overrideChanges = this.overrideChanges.filter(change => change.tokenId !== tokenId);
    
    // Add new change
    this.overrideChanges.push(overrideChange);
  }

  /**
   * Get override changes
   */
  static getOverrideChanges(): OverrideChange[] {
    return [...this.overrideChanges];
  }

  /**
   * Get changes relative to edit source only
   */
  static getChangesForEditSource(
    sourceType: 'core' | 'platform-extension' | 'theme-override',
    sourceId?: string
  ): ChangeSet {
    if (sourceType === 'core') {
      return this.getChangesForSource('core', 'main');
    } else if (sourceId) {
      return this.getChangesForSource(sourceType, sourceId);
    } else {
      return {
        added: [],
        modified: [],
        removed: [],
        totalChanges: 0
      };
    }
  }

  /**
   * Clear override changes
   */
  static clearOverrideChanges(): void {
    this.overrideChanges = [];
  }

  /**
   * Get override changes for specific source
   */
  static getOverrideChangesForSource(sourceType: string, sourceId: string): OverrideChange[] {
    return this.overrideChanges.filter(change => 
      change.sourceType === sourceType && change.sourceId === sourceId
    );
  }

  /**
   * Check if there are override changes for specific source
   */
  static hasOverrideChangesForSource(sourceType: string, sourceId: string): boolean {
    return this.overrideChanges.some(change => 
      change.sourceType === sourceType && change.sourceId === sourceId
    );
  }
}

/**
 * Change set interface
 */
export interface ChangeSet {
  added: string[];
  modified: string[];
  removed: string[];
  totalChanges: number;
}

// NEW: Override change tracking interface
export interface OverrideChange {
  tokenId: string;
  originalValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
  sourceType: string;
  sourceId: string;
  timestamp: string;
} 
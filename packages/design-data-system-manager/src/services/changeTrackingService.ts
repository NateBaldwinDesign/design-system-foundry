import { StorageService } from './storage';
import { GitHubApiService } from './githubApi';
import { GitHubAuthService } from './githubAuth';

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
    
    return JSON.stringify(currentData) !== JSON.stringify(baselineData);
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
  private static getCurrentDataSnapshot(): Record<string, unknown> {
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
} 
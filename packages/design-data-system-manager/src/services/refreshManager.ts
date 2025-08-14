import { GitHubApiService } from './githubApi';
import { GitHubCacheService } from './githubCache';
import { DataManager } from './dataManager';
import { StorageService } from './storage';
import { PermissionManager } from './permissionManager';
import { DataSourceManager } from './dataSourceManager';
import { StatePersistenceManager, type RepositoryContext } from './statePersistenceManager';
import { OverrideTrackingService } from './overrideTrackingService';
import type { DataSourceContext } from './dataSourceManager';

export interface RefreshOptions {
  preserveRepositoryContext?: boolean;
  preserveBranchCache?: boolean;
  preservePermissions?: boolean;
  clearEditMode?: boolean;
  suppressToast?: boolean;
}

export class RefreshManager {
  private static instance: RefreshManager;

  private constructor() {}

  static getInstance(): RefreshManager {
    if (!RefreshManager.instance) {
      RefreshManager.instance = new RefreshManager();
    }
    return RefreshManager.instance;
  }

  /**
   * Refresh data with context-aware options
   */
  static async refreshWithContext(options: RefreshOptions = {}, repositoryContext?: RepositoryContext): Promise<void> {
    console.log('[RefreshManager] Starting refresh with options:', options, 'repositoryContext:', repositoryContext);
    
    try {
      // 1. Save current state before refresh
      const stateManager = StatePersistenceManager.getInstance();
      const currentState = stateManager.getCurrentState();
      const dataSourceManager = DataSourceManager.getInstance();
      const currentContext = dataSourceManager.getCurrentContext();
      
      console.log('[RefreshManager] Current repository context:', currentState.currentRepository);
      
      // 2. Determine target repository based on provided context or current context
      let targetRepository = repositoryContext || currentState.currentRepository;
      if (!targetRepository) {
        targetRepository = this.getTargetRepositoryFromContext(currentContext);
      }
      
      if (!targetRepository) {
        console.warn('[RefreshManager] No target repository found for refresh');
        throw new Error('No repository information available for refresh.');
      }
      
      console.log('[RefreshManager] Target repository for refresh:', targetRepository);
      
      // 3. Selective cache clearing based on options
      if (!options.preserveBranchCache) {
        console.log('[RefreshManager] Clearing branch cache for repository:', targetRepository.fullName);
        GitHubCacheService.clearBranchesForRepository(targetRepository.fullName);
      } else {
        console.log('[RefreshManager] Preserving branch cache for repository:', targetRepository.fullName);
        GitHubCacheService.preserveBranchesForRepository(targetRepository.fullName);
      }
      
      if (!options.preservePermissions) {
        console.log('[RefreshManager] Clearing permission cache');
        PermissionManager.getInstance().clearCache();
      } else {
        console.log('[RefreshManager] Preserving permission cache');
      }
      
      // 4. Refresh data from repository
      await this.refreshDataFromRepository(targetRepository);
      
      // 5. Restore context after refresh
      if (options.preserveRepositoryContext) {
        console.log('[RefreshManager] Restoring repository context');
        stateManager.restoreRepositoryContext(targetRepository);
      }
      
      // 6. Update edit mode if needed
      if (options.clearEditMode) {
        console.log('[RefreshManager] Clearing edit mode state');
        this.clearEditModeState();
      }
      
      console.log('[RefreshManager] Refresh completed successfully');
      
    } catch (error) {
      console.error('[RefreshManager] Error during refresh:', error);
      throw error;
    }
  }

  /**
   * Get target repository from data source context
   */
  private static getTargetRepositoryFromContext(context: DataSourceContext): RepositoryContext | null {
    let targetRepository = context.repositories.core;
    
    if (context.currentPlatform && context.currentPlatform !== 'none') {
      targetRepository = context.repositories.platforms[context.currentPlatform];
    } else if (context.currentTheme && context.currentTheme !== 'none') {
      targetRepository = context.repositories.themes[context.currentTheme];
    }
    
    if (!targetRepository) {
      return null;
    }
    
    return {
      fullName: targetRepository.fullName,
      branch: targetRepository.branch,
      filePath: targetRepository.filePath,
      fileType: targetRepository.fileType
    };
  }

  /**
   * Refresh data from a specific repository
   */
  private static async refreshDataFromRepository(repository: RepositoryContext): Promise<void> {
    console.log('[RefreshManager] Refreshing data from repository:', repository);
    
    // Try to get access token for authenticated requests
    let fileContent;
    
    try {
      // Try authenticated request first
      fileContent = await GitHubApiService.getFileContent(
        repository.fullName,
        repository.filePath,
        repository.branch
      );
    } catch (error) {
      // If authenticated request fails, try public request
      console.log('[RefreshManager] Authenticated file refresh failed, trying public API');
      fileContent = await GitHubApiService.getPublicFileContent(
        repository.fullName,
        repository.filePath,
        repository.branch
      );
    }
    
    if (!fileContent || !fileContent.content) {
      throw new Error('Failed to load file content from GitHub');
    }
    
    const parsedData = JSON.parse(fileContent.content);
    
    // Load the updated data via DataManager with correct file type
    const dataManager = DataManager.getInstance();
    await dataManager.loadFromGitHub(parsedData, repository.fileType);
    
    // Re-merge data with current platform/theme context
    const dataSourceManager = DataSourceManager.getInstance();
    const currentContext = dataSourceManager.getCurrentContext();
    await this.mergeDataForCurrentContext(currentContext);
    
    console.log('[RefreshManager] Data refresh completed for repository:', repository.fullName);
  }

  /**
   * Merge data for current context (reused from App.tsx)
   */
  private static async mergeDataForCurrentContext(context: DataSourceContext): Promise<void> {
    console.log('[RefreshManager] Merging data for current context');
    
    const dataManager = DataManager.getInstance();
    
    // Get core data from StorageService
    const coreData = StorageService.getCoreData();
    if (!coreData) {
      console.warn('[RefreshManager] No core data available for merging');
      return;
    }
    
    // Get platform extensions
    const platformExtensions: Record<string, any> = {};
    if (context.currentPlatform && context.currentPlatform !== 'none') {
      const platformData = StorageService.getPlatformExtensionData(context.currentPlatform);
      if (platformData) {
        platformExtensions[context.currentPlatform] = platformData;
      }
    }
    
    // Get theme overrides
    const themeOverrides: Record<string, any> = {};
    if (context.currentTheme && context.currentTheme !== 'none') {
      const themeData = StorageService.getThemeOverrideData(context.currentTheme);
      if (themeData) {
        themeOverrides[context.currentTheme] = themeData;
      }
    }
    
    // Update presentation data with merged data
    await dataManager.updatePresentationData({
      core: coreData,
      platformExtensions,
      themeOverrides
    });
    
    console.log('[RefreshManager] Data merging completed');
  }

  /**
   * Clear edit mode state
   */
  private static clearEditModeState(): void {
    console.log('[RefreshManager] Clearing edit mode state');
    
    // Clear override tracking session
    OverrideTrackingService.clearSession();
    
    // Clear edit mode in DataSourceManager
    const dataSourceManager = DataSourceManager.getInstance();
    dataSourceManager.exitEditMode();
    
    // Clear edit mode in state persistence
    const stateManager = StatePersistenceManager.getInstance();
    stateManager.clearEditModeOnly();
  }

  /**
   * Specific refresh scenarios
   */
  
  /**
   * Branch switching - preserve repository context
   */
  static async refreshForBranchSwitch(repository: RepositoryContext): Promise<void> {
    console.log('[RefreshManager] Refreshing for branch switch:', repository);
    
    // Update repository context first
    const stateManager = StatePersistenceManager.getInstance();
    stateManager.updateRepositoryContext(repository);
    
    await this.refreshWithContext({
      preserveRepositoryContext: true,
      preserveBranchCache: true,
      clearEditMode: false,
      suppressToast: true
    }, repository); // Pass the repository context
  }

  /**
   * Exit edit mode - preserve repository context, clear edit mode
   */
  static async refreshForExitEditMode(): Promise<void> {
    console.log('[RefreshManager] Refreshing for exit edit mode');
    
    await this.refreshWithContext({
      preserveRepositoryContext: true,
      preserveBranchCache: true,
      clearEditMode: true,
      suppressToast: true
    });
  }

  /**
   * Manual refresh - clear all cache, preserve repository context
   */
  static async refreshForManualRefresh(): Promise<void> {
    console.log('[RefreshManager] Refreshing for manual refresh');
    
    await this.refreshWithContext({
      preserveRepositoryContext: true,
      preserveBranchCache: false,
      clearEditMode: false,
      suppressToast: false
    });
  }

  /**
   * Source switching - clear cache, preserve repository context
   */
  static async refreshForSourceSwitch(repository: RepositoryContext): Promise<void> {
    console.log('[RefreshManager] Refreshing for source switch:', repository);
    
    // Update repository context first
    const stateManager = StatePersistenceManager.getInstance();
    stateManager.updateRepositoryContext(repository);
    
    await this.refreshWithContext({
      preserveRepositoryContext: true,
      preserveBranchCache: false,
      clearEditMode: true,
      suppressToast: true
    });
  }
} 
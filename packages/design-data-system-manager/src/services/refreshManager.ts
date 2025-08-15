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
    let isNewBranch = false;
    
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
      try {
        fileContent = await GitHubApiService.getPublicFileContent(
          repository.fullName,
          repository.filePath,
          repository.branch
        );
      } catch (publicError) {
        // If both authenticated and public requests fail, this might be a new branch
        console.log('[RefreshManager] Both authenticated and public requests failed, checking if this is a new branch');
        
        // Check if this is a 404 error (file not found) - check both error messages
        const is404Error = (error instanceof Error && error.message.includes('404')) ||
                          (publicError instanceof Error && (publicError.message.includes('404') || publicError.message.includes('File not found')));
        
        if (is404Error) {
          isNewBranch = true;
          console.log('[RefreshManager] Detected new branch, will create initial file content');
        } else {
          // Re-throw the error if it's not a 404
          throw publicError;
        }
      }
    }
    
    if (isNewBranch) {
      // Handle new branch case - create initial file content
      await this.initializeNewBranch(repository);
    } else if (!fileContent || !fileContent.content) {
      throw new Error('Failed to load file content from GitHub');
    } else {
      // Normal case - load existing file content
      const parsedData = JSON.parse(fileContent.content);
      
      // Load the updated data via DataManager with correct file type
      const dataManager = DataManager.getInstance();
      await dataManager.loadFromGitHub(parsedData, repository.fileType);
    }
    
    // Re-merge data with current platform/theme context
    const dataSourceManager = DataSourceManager.getInstance();
    const currentContext = dataSourceManager.getCurrentContext();
    await this.mergeDataForCurrentContext(currentContext);
    
    console.log('[RefreshManager] Data refresh completed for repository:', repository.fullName);
  }

  /**
   * Initialize a new branch with initial file content
   */
  private static async initializeNewBranch(repository: RepositoryContext): Promise<void> {
    console.log('[RefreshManager] Initializing new branch with initial file content:', repository);
    
    try {
      // Get the appropriate initial data based on file type
      let initialData: Record<string, unknown>;
      let commitMessage: string;
      
      if (repository.fileType === 'schema') {
        // For core data, use current core data or create default
        const coreData = StorageService.getCoreData();
        if (coreData) {
          initialData = coreData;
          commitMessage = `Initialize ${repository.filePath} with current core data`;
        } else {
          // Create default core data structure
          initialData = {
            tokens: [],
            collections: [],
            modes: [],
            dimensions: [],
            platforms: [],
            themes: [],
            taxonomies: [],
            resolvedValueTypes: [],
            algorithms: [],
            componentProperties: [],
            componentCategories: [],
            components: [],
            figmaConfiguration: null
          };
          commitMessage = `Initialize ${repository.filePath} with default structure`;
        }
      } else if (repository.fileType === 'platform-extension') {
        // For platform extensions, create default structure
        initialData = {
          platformId: '',
          platformName: '',
          extensions: {
            tokens: [],
            collections: [],
            modes: [],
            dimensions: [],
            resolvedValueTypes: []
          }
        };
        commitMessage = `Initialize ${repository.filePath} with platform extension structure`;
      } else if (repository.fileType === 'theme-override') {
        // For theme overrides, create default structure
        initialData = {
          themeId: '',
          themeName: '',
          overrides: {
            tokens: [],
            collections: [],
            modes: [],
            dimensions: []
          }
        };
        commitMessage = `Initialize ${repository.filePath} with theme override structure`;
      } else {
        throw new Error(`Unknown file type: ${repository.fileType}`);
      }
      
      // Create the initial file in the new branch
      await GitHubApiService.createFile(
        repository.fullName,
        repository.filePath,
        JSON.stringify(initialData, null, 2),
        repository.branch,
        commitMessage
      );
      
      console.log('[RefreshManager] Successfully created initial file content in new branch');
      
      // Load the initial data via DataManager
      const dataManager = DataManager.getInstance();
      await dataManager.loadFromGitHub(initialData, repository.fileType);
      
    } catch (error) {
      console.error('[RefreshManager] Failed to initialize new branch:', error);
      throw new Error(`Failed to initialize new branch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Merge data for current context (reused from App.tsx)
   */
  private static async mergeDataForCurrentContext(context: DataSourceContext): Promise<void> {
    console.log('[RefreshManager] Merging data for current context');
    
    // Get core data from StorageService
    const coreData = StorageService.getCoreData();
    if (!coreData) {
      console.warn('[RefreshManager] No core data available for merging');
      return;
    }
    
    // Get platform extensions
    const platformExtensions: Record<string, unknown> = {};
    if (context.currentPlatform && context.currentPlatform !== 'none') {
      const platformData = StorageService.getPlatformExtensionData(context.currentPlatform);
      if (platformData) {
        platformExtensions[context.currentPlatform] = platformData;
      }
    }
    
    // Get theme overrides
    const themeOverrides: Record<string, unknown> = {};
    if (context.currentTheme && context.currentTheme !== 'none') {
      const themeData = StorageService.getThemeOverrideData(context.currentTheme);
      if (themeData) {
        themeOverrides[context.currentTheme] = themeData;
      }
    }
    
    // The DataManager.loadFromGitHub method already handles updating presentation data
    // No need to call updatePresentationData manually
    
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
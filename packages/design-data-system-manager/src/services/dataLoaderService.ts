import { StorageService } from './storage';
import { GitHubAuthService } from './githubAuth';
import { GitHubApiService } from './githubApi';
import type { TokenSystem, PlatformExtension, ThemeOverrideFile } from '@token-model/data-model';
import type { 
  DataSourceType, 
  SourceContext, 
  DataLoadResult, 
  DataValidationResult 
} from '../types/dataManagement';

export class DataLoaderService {
  private static instance: DataLoaderService;

  private constructor() {}

  static getInstance(): DataLoaderService {
    if (!DataLoaderService.instance) {
      DataLoaderService.instance = new DataLoaderService();
    }
    return DataLoaderService.instance;
  }

  /**
   * Main entry point for loading data from URL parameters
   */
  async loadFromURL(urlParams: URLSearchParams): Promise<DataLoadResult> {
    try {
      console.log('[DataLoaderService] Starting data loading from URL parameters');
      
      // Step 1: Load core data
      const coreResult = await this.loadCoreData(urlParams);
      
      if (!coreResult.success) {
        return coreResult;
      }

      // Step 2: Determine and load source data
      const sourceType = this.determineSourceType(urlParams);
      const sourceResult = await this.loadSourceData(sourceType, urlParams);
      
      if (!sourceResult.success) {
        return sourceResult;
      }

      // Step 3: Create merged data
      await this.createMergedData();

      // Step 4: Create local edits
      await this.createLocalEdits();

      // Step 5: Update source context
      await this.updateSourceContext(sourceType, urlParams);

      console.log('[DataLoaderService] Data loading completed successfully');
      return {
        success: true,
        data: StorageService.getMergedData() || undefined
      };

    } catch (error) {
      console.error('[DataLoaderService] Error during data loading:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during data loading'
      };
    }
  }

/**
 * Step 1: Load core data from GitHub
 */
private async loadCoreData(urlParams: URLSearchParams): Promise<DataLoadResult> {
  const repo = urlParams.get('repo');
  const path = urlParams.get('path');
  const branch = urlParams.get('branch') || 'main';

  if (!repo || !path) {
    return {
      success: false,
      error: 'Repository and path are required for loading core data'
    };
  }

  try {
    console.log(`[DataLoaderService] Loading core data from ${repo}/${path} on branch ${branch}`);

    // Check if user is authenticated
    const isAuthenticated = GitHubAuthService.isAuthenticated();
    console.log(`[DataLoaderService] User is authenticated: ${isAuthenticated}`);

    let data: string;
    if (isAuthenticated) {
      console.log('[DataLoaderService] User is authenticated, trying authenticated access');
      // Use authenticated GitHub API
      const fileContent = await GitHubApiService.getFileContent(repo, path, branch);
      data = fileContent.content;
    } else {
      console.log('[DataLoaderService] User not authenticated, trying public access');
      // Try public access
      const response = await fetch(`https://raw.githubusercontent.com/${repo}/${branch}/${path}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
      }
      data = await response.text();
    }

    // Parse the JSON data
    const parsedData = JSON.parse(data);

    // Validate the data against the schema
    const validation = this.validateData(parsedData, 'schema');
    if (!validation.isValid) {
      return {
        success: false,
        error: `Invalid core data structure: ${validation.errors.join(', ')}`,
        validationResult: validation
      };
    }

    // CRITICAL FIX: Ensure dimensionOrder is present for Figma daisy-chaining
    if (!parsedData.dimensionOrder || !Array.isArray(parsedData.dimensionOrder)) {
      console.warn('[DataLoaderService] Core data missing dimensionOrder, reconstructing from dimensions');
      if (parsedData.dimensions && Array.isArray(parsedData.dimensions)) {
        parsedData.dimensionOrder = parsedData.dimensions.map((dim: { id: string }) => dim.id);
        console.log('[DataLoaderService] Reconstructed dimensionOrder:', parsedData.dimensionOrder);
      } else {
        console.error('[DataLoaderService] Cannot reconstruct dimensionOrder - no dimensions available');
        parsedData.dimensionOrder = [];
      }
    } else {
      console.log('[DataLoaderService] Core data has valid dimensionOrder:', parsedData.dimensionOrder);
    }

    // Store core data
    StorageService.setCoreData(parsedData as TokenSystem);
    
    console.log('[DataLoaderService] Core data loaded and validated successfully');
    return {
      success: true,
      data: parsedData as TokenSystem
    };

  } catch (error) {
    console.error('[DataLoaderService] Error loading core data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load core data'
    };
  }
}

  /**
   * Step 2: Determine and load source data
   */
  private async loadSourceData(
    sourceType: DataSourceType, 
    urlParams: URLSearchParams
  ): Promise<DataLoadResult> {
    const coreData = StorageService.getCoreData();
    if (!coreData) {
      return {
        success: false,
        error: 'Core data must be loaded before loading source data'
      };
    }

    try {
      if (sourceType === 'core') {
        // Use core data as source data
        StorageService.setSourceSnapshot(coreData);
        return { success: true, data: coreData };
      }

      if (sourceType === 'platform') {
        const platformId = urlParams.get('platform');
        if (!platformId) {
          return {
            success: false,
            error: 'Platform ID is required for platform source type'
          };
        }

        return await this.loadPlatformData(platformId, coreData);
      }

      if (sourceType === 'theme') {
        const themeId = urlParams.get('theme');
        if (!themeId) {
          return {
            success: false,
            error: 'Theme ID is required for theme source type'
          };
        }

        return await this.loadThemeData(themeId, coreData);
      }

      return {
        success: false,
        error: `Unknown source type: ${sourceType}`
      };

    } catch (error) {
      console.error('[DataLoaderService] Error loading source data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load source data'
      };
    }
  }

/**
 * Load platform extension data (with public repository fallback)
 */
private async loadPlatformData(platformId: string, coreData: TokenSystem): Promise<DataLoadResult> {
  const platform = coreData.platforms?.find(p => p.id === platformId);
  if (!platform) {
    return {
      success: false,
      error: `Platform with ID '${platformId}' not found in core data`
    };
  }

  if (!platform.extensionSource) {
    return {
      success: false,
      error: `Platform '${platformId}' does not have an extension source configured`
    };
  }

  try {
    const { repositoryUri, filePath } = platform.extensionSource;
    const branch = 'main'; // Default to main branch for platform extensions
    const [owner, repo] = repositoryUri.split('/');
    const fullRepoName = `${owner}/${repo}`;

    console.log(`[DataLoaderService] Loading platform data from ${fullRepoName}/${filePath}`);
    
    let fileContent;
    
    // Try authenticated access first (if user is signed in)
    try {
      if (GitHubAuthService.isAuthenticated()) {
        fileContent = await GitHubApiService.getFileContent(fullRepoName, filePath, branch);
      } else {
        throw new Error('User not authenticated, trying public access');
      }
    } catch (authError) {
      // If authenticated access fails or user isn't authenticated, try public access
      console.log('[DataLoaderService] Platform authenticated access failed, trying public access');
      fileContent = await GitHubApiService.getPublicFileContent(fullRepoName, filePath, branch);
    }
    
    const parsedData = JSON.parse(fileContent.content);
    
    // Validate platform extension data
    const validation = this.validateData(parsedData, 'platform-extension');
    if (!validation.isValid) {
      return {
        success: false,
        error: `Invalid platform extension data: ${validation.errors.join(', ')}`,
        validationResult: validation
      };
    }

    const platformData = parsedData as PlatformExtension;
    StorageService.setSourceSnapshot(platformData);
    StorageService.setPlatformExtensionData(platformId, platformData);
    
    console.log('[DataLoaderService] Platform data loaded successfully');
    return {
      success: true,
      data: platformData
    };

  } catch (error) {
    console.error('[DataLoaderService] Error loading platform data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load platform data'
    };
  }
}

/**
 * Load theme override data (with public repository fallback)
 */
private async loadThemeData(themeId: string, coreData: TokenSystem): Promise<DataLoadResult> {
  const theme = coreData.themes?.find(t => t.id === themeId);
  if (!theme) {
    return {
      success: false,
      error: `Theme with ID '${themeId}' not found in core data`
    };
  }

  if (!theme.overrideSource) {
    return {
      success: false,
      error: `Theme '${themeId}' does not have an override source configured`
    };
  }

  try {
    const { repositoryUri, filePath } = theme.overrideSource;
    const branch = 'main'; // Default to main branch for theme overrides
    const [owner, repo] = repositoryUri.split('/');
    const fullRepoName = `${owner}/${repo}`;

    console.log(`[DataLoaderService] Loading theme data from ${fullRepoName}/${filePath}`);
    
    let fileContent;
    
    // Try authenticated access first (if user is signed in)
    try {
      if (GitHubAuthService.isAuthenticated()) {
        fileContent = await GitHubApiService.getFileContent(fullRepoName, filePath, branch);
      } else {
        throw new Error('User not authenticated, trying public access');
      }
    } catch (authError) {
      // If authenticated access fails or user isn't authenticated, try public access
      console.log('[DataLoaderService] Theme authenticated access failed, trying public access');
      fileContent = await GitHubApiService.getPublicFileContent(fullRepoName, filePath, branch);
    }
    
    const parsedData = JSON.parse(fileContent.content);
    
    // Validate theme override data
    const validation = this.validateData(parsedData, 'theme-override');
    if (!validation.isValid) {
      return {
        success: false,
        error: `Invalid theme override data: ${validation.errors.join(', ')}`,
        validationResult: validation
      };
    }

    const themeData = parsedData as ThemeOverrideFile;
    StorageService.setSourceSnapshot(themeData);
    StorageService.setThemeOverrideData(themeId, themeData);
    
    console.log('[DataLoaderService] Theme data loaded successfully');
    return {
      success: true,
      data: themeData
    };

  } catch (error) {
    console.error('[DataLoaderService] Error loading theme data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load theme data'
    };
  }
}

  /**
   * Step 3: Create merged data
   */
  private async createMergedData(): Promise<void> {
    const coreData = StorageService.getCoreData();
    const sourceSnapshot = StorageService.getSourceSnapshot();
    
    if (!coreData) {
      console.warn('[DataLoaderService] No core data available for merging');
      return;
    }

    if (!sourceSnapshot) {
      console.warn('[DataLoaderService] No source snapshot available for merging');
      return;
    }

    // For now, use the source snapshot as merged data
    // This will be enhanced by the DataMergerService
    if (sourceSnapshot === coreData) {
      // Core data is the source, no merging needed
      StorageService.setMergedData(coreData);
    } else {
      // Platform or theme data, will be merged by DataMergerService
      // For now, use core data as merged data
      StorageService.setMergedData(coreData);
    }

    console.log('[DataLoaderService] Merged data created');
  }

  /**
   * Step 4: Create local edits
   */
  private async createLocalEdits(): Promise<void> {
    const sourceSnapshot = StorageService.getSourceSnapshot();
    if (!sourceSnapshot) {
      console.warn('[DataLoaderService] No source snapshot available for local edits');
      return;
    }

    // Duplicate the source snapshot as local edits
    StorageService.setLocalEdits(sourceSnapshot);
    console.log('[DataLoaderService] Local edits initialized from source snapshot');
  }

  /**
   * Step 5: Update source context
   */
  private async updateSourceContext(sourceType: DataSourceType, urlParams: URLSearchParams): Promise<void> {
    const repo = urlParams.get('repo');
    const path = urlParams.get('path');
    const branch = urlParams.get('branch') || 'main';
    const platformId = urlParams.get('platform');
    const themeId = urlParams.get('theme');

    if (!repo || !path) {
      console.warn('[DataLoaderService] Cannot update source context without repo and path');
      return;
    }

    // Get core data to find platform/theme extension repositories
    const coreData = StorageService.getCoreData();
    
    // Determine the source repository based on the source type
    let sourceRepository: {
      fullName: string;
      branch: string;
      filePath: string;
      fileType: 'schema' | 'platform-extension' | 'theme-override';
    };

    if (sourceType === 'platform' && platformId) {
      // Platform extension - get repository from core data's platforms array
      const platform = coreData?.platforms?.find(p => p.id === platformId);
      if (platform?.extensionSource) {
        sourceRepository = {
          fullName: platform.extensionSource.repositoryUri,
          branch: 'main', // Default to main branch for platform extensions
          filePath: platform.extensionSource.filePath,
          fileType: 'platform-extension'
        };
        console.log(`[DataLoaderService] Platform extension repository: ${platform.extensionSource.repositoryUri}/${platform.extensionSource.filePath}`);
      } else {
        console.warn(`[DataLoaderService] Platform ${platformId} not found in core data or missing extensionSource`);
        // Fallback to core repository
        sourceRepository = {
          fullName: repo,
          branch,
          filePath: path,
          fileType: 'platform-extension'
        };
      }
    } else if (sourceType === 'theme' && themeId) {
      // Theme override - get repository from core data's themes array
      const theme = coreData?.themes?.find(t => t.id === themeId);
      if (theme?.overrideSource) {
        sourceRepository = {
          fullName: theme.overrideSource.repositoryUri,
          branch: 'main', // Default to main branch for theme overrides
          filePath: theme.overrideSource.filePath,
          fileType: 'theme-override'
        };
        console.log(`[DataLoaderService] Theme override repository: ${theme.overrideSource.repositoryUri}/${theme.overrideSource.filePath}`);
      } else {
        console.warn(`[DataLoaderService] Theme ${themeId} not found in core data or missing overrideSource`);
        // Fallback to core repository
        sourceRepository = {
          fullName: repo,
          branch,
          filePath: path,
          fileType: 'theme-override'
        };
      }
    } else {
      // Core data - use the same repository
      sourceRepository = {
        fullName: repo,
        branch,
        filePath: path,
        fileType: 'schema'
      };
    }

    const sourceContext: SourceContext = {
      sourceType,
      sourceId: platformId || themeId || null,
      coreRepository: {
        fullName: repo,
        branch,
        filePath: path,
        fileType: 'schema'
      },
      sourceRepository,
      lastLoadedAt: new Date().toISOString(),
      hasLocalChanges: false,
      editMode: {
        isActive: false,
        sourceType: sourceType === 'platform' ? 'platform-extension' : sourceType === 'theme' ? 'theme-override' : 'core',
        sourceId: platformId || themeId || null,
        targetRepository: null
      }
    };

    StorageService.setSourceContext(sourceContext);
    console.log('[DataLoaderService] Source context updated with proper repository mapping');
  }

  /**
   * Determine source type from URL parameters
   */
  private determineSourceType(urlParams: URLSearchParams): DataSourceType {
    if (urlParams.get('theme')) return 'theme';
    if (urlParams.get('platform')) return 'platform';
    return 'core';
  }

  /**
   * Validate data against appropriate schema
   */
  private validateData(data: unknown, expectedType: 'schema' | 'platform-extension' | 'theme-override'): DataValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic structure validation
    const structureValidation = StorageService.validateDataStructure(data);
    if (!structureValidation.isValid) {
      errors.push(...structureValidation.errors);
    }

    // Type-specific validation
    if (expectedType === 'schema') {
      // Validate TokenSystem structure
      const dataObj = data as Record<string, unknown>;
      if (!dataObj.systemId) {
        errors.push('systemId is required for schema data');
      }
      if (!dataObj.tokens) {
        errors.push('tokens array is required for schema data');
      }
    }

    if (expectedType === 'platform-extension') {
      // Validate PlatformExtension structure
      const dataObj = data as Record<string, unknown>;
      if (!dataObj.platformId) {
        errors.push('platformId is required for platform extension data');
      }
      if (!dataObj.systemId) {
        errors.push('systemId is required for platform extension data');
      }
    }

    if (expectedType === 'theme-override') {
      // Validate ThemeOverride structure
      const dataObj = data as Record<string, unknown>;
      if (!dataObj.themeId) {
        errors.push('themeId is required for theme override data');
      }
      if (!dataObj.systemId) {
        errors.push('systemId is required for theme override data');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
} 
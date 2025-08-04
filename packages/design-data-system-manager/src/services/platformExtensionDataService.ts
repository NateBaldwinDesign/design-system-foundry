import { GitHubApiService } from './githubApi';
import { StorageService } from './storage';
import { JsonValidator } from '../utils/jsonValidator';
import type { GitHubFile } from '../config/github';

export interface PlatformExtensionData {
  systemId: string;
  platformId: string;
  version: string;
  status?: string;
  figmaFileKey?: string;
  syntaxPatterns?: {
    prefix: string;
    suffix: string;
    delimiter: string;
    capitalization: string;
    formatString: string;
  };
  valueFormatters?: {
    color: string;
    dimension: string;
    numberPrecision: number;
  };
  algorithmVariableOverrides?: Array<{
    algorithmId: string;
    variableId: string;
    valuesByMode: Array<{
      modeIds: string[];
      value: string | number | boolean;
    }>;
  }>;
  tokenOverrides?: Array<{
    id: string;
    displayName?: string;
    description?: string;
    themeable?: boolean;
    private?: boolean;
    status?: string;
    tokenTier?: string;
    resolvedValueTypeId?: string;
    generatedByAlgorithm?: boolean;
    algorithmId?: string;
    valuesByMode: Array<{
      modeIds: string[];
      value: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    }>;
    omit?: boolean;
  }>;
  omittedModes?: string[];
  omittedDimensions?: string[];
  metadata?: {
    name: string;
    description?: string;
  };
  displayName?: string;
  description?: string;
}

export interface PlatformExtensionDataResult {
  data: PlatformExtensionData | null;
  source: 'github' | 'cache' | 'localStorage' | 'not-found';
  error?: string;
}

export class PlatformExtensionDataService {
  private static cache = new Map<string, { data: PlatformExtensionData; timestamp: number }>();
  private static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get platform extension data from source, with caching
   */
  static async getPlatformExtensionData(
    repositoryUri: string,
    filePath: string,
    branch: string,
    platformId: string
  ): Promise<PlatformExtensionDataResult> {
    const cacheKey = `${platformId}-${repositoryUri}-${filePath}-${branch}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      console.log(`[PlatformExtensionDataService] Using cached data for ${platformId}`);
      return {
        data: cached.data,
        source: 'cache'
      };
    }

    try {
      console.log(`[PlatformExtensionDataService] Fetching data for ${platformId} from ${repositoryUri}/${filePath}`);
      
      let fileContent: GitHubFile;
      
      // Check if user is authenticated
      const isAuthenticated = await import('./githubAuth').then(module => module.GitHubAuthService.isAuthenticated());
      
      // Check if this is a private repository pattern (company/design-system-*)
      const isPrivateRepoPattern = repositoryUri.match(/^company\/design-system-/);
      
      if (isAuthenticated && !isPrivateRepoPattern) {
        // Use authenticated API call for repositories user has access to
        fileContent = await GitHubApiService.getFileContent(repositoryUri, filePath, branch);
      } else if (isPrivateRepoPattern) {
        // Skip fetching for private repository patterns (user likely doesn't have access)
        console.log(`[PlatformExtensionDataService] Skipping private repository pattern for ${platformId}: ${repositoryUri}`);
        return {
          data: null,
          source: 'not-found',
          error: 'Private repository - access not available'
        };
      } else {
        // Use public API call for unauthenticated users (only for public repositories)
        console.log(`[PlatformExtensionDataService] Using public API for ${platformId} (user not authenticated)`);
        fileContent = await GitHubApiService.getPublicFileContent(repositoryUri, filePath, branch);
      }
      
      if (!fileContent || !fileContent.content) {
        console.warn(`[PlatformExtensionDataService] No content found for ${platformId}`);
        return {
          data: null,
          source: 'not-found',
          error: 'No content found'
        };
      }

      // Parse the JSON content with better error handling
      let data: PlatformExtensionData;
      try {
        data = JSON.parse(fileContent.content) as PlatformExtensionData;
      } catch (parseError) {
        console.error(`[PlatformExtensionDataService] JSON parse error for ${platformId}:`, {
          error: parseError,
          contentLength: fileContent.content.length,
          contentPreview: fileContent.content.substring(0, 200) + '...',
          repositoryUri,
          filePath,
          branch
        });
        
        // Use JsonValidator for detailed error analysis
        if (parseError instanceof SyntaxError) {
          const errorInfo = JsonValidator.formatErrorInfo(
            parseError, 
            fileContent.content, 
            `Platform Extension ${platformId} (${repositoryUri}/${filePath})`
          );
          console.error(errorInfo);
        }
        
        throw parseError;
      }
      
      // Validate that this is a platform extension file
      if (!data.systemId || !data.platformId || !data.version) {
        console.warn(`[PlatformExtensionDataService] Invalid platform extension data for ${platformId}`);
        return {
          data: null,
          source: 'not-found',
          error: 'Invalid platform extension data'
        };
      }

      // Cache the data
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      
      // Also store in localStorage for offline access
      StorageService.setPlatformExtensionFile(platformId, data as unknown as Record<string, unknown>);
      StorageService.setPlatformExtensionFileContent(platformId, fileContent.content);
      
      console.log(`[PlatformExtensionDataService] Successfully fetched and cached data for ${platformId}`);
      return {
        data,
        source: 'github'
      };
      
    } catch (error) {
      console.error(`[PlatformExtensionDataService] Failed to fetch data for ${platformId}:`, error);
      
      // Try to get from localStorage as fallback
      const localData = StorageService.getPlatformExtensionFile(platformId);
      if (localData) {
        console.log(`[PlatformExtensionDataService] Using local storage data for ${platformId}`);
        return {
          data: localData as unknown as PlatformExtensionData,
          source: 'localStorage',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
      
      return {
        data: null,
        source: 'not-found',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Clear cache for a specific platform
   */
  static clearCache(platformId: string): void {
    const keysToDelete: string[] = [];
    for (const [key] of this.cache) {
      if (key.includes(platformId)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`[PlatformExtensionDataService] Cleared cache for ${platformId}`);
  }

  /**
   * Clear all cache
   */
  static clearAllCache(): void {
    this.cache.clear();
    console.log('[PlatformExtensionDataService] Cleared all cache');
  }

  /**
   * Get cached data without fetching from source
   */
  static getCachedData(platformId: string): PlatformExtensionData | null {
    // Check memory cache first
    for (const [key, value] of this.cache) {
      if (key.includes(platformId)) {
        return value.data;
      }
    }
    
    // Check localStorage as fallback
    const localData = StorageService.getPlatformExtensionFile(platformId);
    return localData as unknown as PlatformExtensionData || null;
  }
} 
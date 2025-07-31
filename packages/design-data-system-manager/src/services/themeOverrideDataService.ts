import { GitHubApiService } from './githubApi';
import { GitHubAuthService } from './githubAuth';
import type { ThemeOverrideFile } from '@token-model/data-model';
import { JsonValidator } from '../utils/jsonValidator';

export interface ThemeOverrideDataResult {
  data?: ThemeOverrideFile;
  error?: string;
  source: 'github' | 'cache' | 'localStorage';
}

export class ThemeOverrideDataService {
  private static cache = new Map<string, { data: ThemeOverrideFile; timestamp: number }>();
  private static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get theme override data from GitHub, cache, or localStorage
   */
  static async getThemeOverrideData(
    repositoryUri: string,
    filePath: string,
    branch: string = 'main',
    themeId: string
  ): Promise<ThemeOverrideDataResult> {
    try {
      // Check cache first
      const cacheKey = `${repositoryUri}:${filePath}:${branch}:${themeId}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        console.log(`[ThemeOverrideDataService] Returning cached data for ${themeId}`);
        return { data: cached.data, source: 'cache' };
      }

      // Try to get from GitHub
      let fileContent;
      if (GitHubAuthService.isAuthenticated()) {
        fileContent = await GitHubApiService.getFileContent(repositoryUri, filePath, branch);
      } else {
        fileContent = await GitHubApiService.getPublicFileContent(repositoryUri, filePath, branch);
      }

      if (!fileContent || !fileContent.content) {
        throw new Error(`No content found in ${repositoryUri}/${filePath}`);
      }

      // Parse the JSON content with better error handling
      let data: ThemeOverrideFile;
      try {
        data = JSON.parse(fileContent.content) as ThemeOverrideFile;
      } catch (parseError) {
        console.error(`[ThemeOverrideDataService] JSON parse error for ${themeId}:`, {
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
            `Theme Override ${themeId} (${repositoryUri}/${filePath})`
          );
          console.error(errorInfo);
        }
        
        throw parseError;
      }

      // Validate that the theme ID matches
      if (data.themeId !== themeId) {
        throw new Error(`Theme ID mismatch: expected ${themeId}, got ${data.themeId}`);
      }

      // Cache the result
      this.cache.set(cacheKey, { data, timestamp: Date.now() });

      console.log(`[ThemeOverrideDataService] Successfully loaded theme override data for ${themeId} from ${repositoryUri}/${filePath}`);
      return { data, source: 'github' };

    } catch (error) {
      console.error(`[ThemeOverrideDataService] Failed to load theme override data for ${themeId}:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        repositoryUri,
        filePath,
        branch,
        themeId
      });

      // Try to get from localStorage as fallback
      try {
        const localStorageKey = `theme-override-${themeId}`;
        const stored = localStorage.getItem(localStorageKey);
        if (stored) {
          const data = JSON.parse(stored) as ThemeOverrideFile;
          console.log(`[ThemeOverrideDataService] Using localStorage fallback for ${themeId}`);
          return { data, source: 'localStorage' };
        }
      } catch (localStorageError) {
        console.warn(`[ThemeOverrideDataService] localStorage fallback failed for ${themeId}:`, localStorageError);
      }

      return {
        error: error instanceof Error ? error.message : 'Failed to load theme override data',
        source: 'github'
      };
    }
  }

  /**
   * Clear cache for a specific theme
   */
  static clearCacheForTheme(themeId: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.includes(themeId)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`[ThemeOverrideDataService] Cleared cache for theme ${themeId}`);
  }

  /**
   * Clear all cache
   */
  static clearAllCache(): void {
    this.cache.clear();
    console.log('[ThemeOverrideDataService] Cleared all cache');
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
} 
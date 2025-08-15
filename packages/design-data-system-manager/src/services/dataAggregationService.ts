/**
 * Data Aggregation Service
 * Handles lazy loading of platform and theme data with caching
 * Integrates with existing GitHub API and storage patterns
 */

import type { PlatformExtension } from '@token-model/data-model';
import type { ThemeOverrides } from '@token-model/data-model';
import { GitHubApiService } from './githubApi';
import { GitHubAuthService } from './githubAuth';
import { StorageService } from './storage';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  source: string;
}

interface CacheStatus {
  fresh: boolean;
  age: number;
  source: string;
}

export class DataAggregationService {
  private static instance: DataAggregationService;
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private loadingPromises = new Map<string, Promise<unknown>>();

  private constructor() {}

  public static getInstance(): DataAggregationService {
    if (!DataAggregationService.instance) {
      DataAggregationService.instance = new DataAggregationService();
    }
    return DataAggregationService.instance;
  }

  /**
   * Load platform data on demand with caching
   */
  public async loadPlatformData(platformId: string): Promise<PlatformExtension | null> {
    const cacheKey = `platform-${platformId}`;
    
    // Check if already loading
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey);
    }

    // Check cache first
    if (this.isDataFresh(cacheKey)) {
      const cached = this.getCachedData<PlatformExtension>(cacheKey);
      if (cached) {
        console.log(`[DataAggregationService] Using cached platform data for ${platformId}`);
        return cached;
      }
    }

    // Load from source
    const loadPromise = this.loadPlatformDataFromSource(platformId, cacheKey);
    this.loadingPromises.set(cacheKey, loadPromise);
    
    try {
      const result = await loadPromise;
      this.loadingPromises.delete(cacheKey);
      return result;
    } catch (error) {
      this.loadingPromises.delete(cacheKey);
      console.error(`[DataAggregationService] Failed to load platform data for ${platformId}:`, error);
      return null;
    }
  }

  /**
   * Load theme data on demand with caching
   */
  public async loadThemeData(themeId: string): Promise<ThemeOverrides | null> {
    const cacheKey = `theme-${themeId}`;
    
    // Check if already loading
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey);
    }

    // Check cache first
    if (this.isDataFresh(cacheKey)) {
      const cached = this.getCachedData<ThemeOverrides>(cacheKey);
      if (cached) {
        console.log(`[DataAggregationService] Using cached theme data for ${themeId}`);
        return cached;
      }
    }

    // Load from source
    const loadPromise = this.loadThemeDataFromSource(themeId, cacheKey);
    this.loadingPromises.set(cacheKey, loadPromise);
    
    try {
      const result = await loadPromise;
      this.loadingPromises.delete(cacheKey);
      return result;
    } catch (error) {
      this.loadingPromises.delete(cacheKey);
      console.error(`[DataAggregationService] Failed to load theme data for ${themeId}:`, error);
      return null;
    }
  }

  /**
   * Invalidate cache when data changes
   */
  public invalidateCache(dataType: 'platform' | 'theme', id?: string): void {
    if (id) {
      const cacheKey = `${dataType}-${id}`;
      this.cache.delete(cacheKey);
      console.log(`[DataAggregationService] Invalidated cache for ${cacheKey}`);
    } else {
      // Invalidate all cache entries of this type
      const keysToDelete = Array.from(this.cache.keys()).filter(key => key.startsWith(`${dataType}-`));
      keysToDelete.forEach(key => this.cache.delete(key));
      console.log(`[DataAggregationService] Invalidated all ${dataType} cache entries`);
    }
  }

  /**
   * Check if data is fresh (within TTL)
   */
  public isDataFresh(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    const age = Date.now() - entry.timestamp;
    return age < this.CACHE_TTL;
  }

  /**
   * Get cached data if available
   */
  public getCachedData<T>(key: string): T | null {
    const entry = this.cache.get(key);
    return entry ? entry.data : null;
  }

  /**
   * Get cache status for all entries
   */
  public getCacheStatus(): Record<string, CacheStatus> {
    const status: Record<string, CacheStatus> = {};
    
    for (const [key, entry] of this.cache.entries()) {
      const age = Date.now() - entry.timestamp;
      status[key] = {
        fresh: age < this.CACHE_TTL,
        age,
        source: entry.source
      };
    }
    
    return status;
  }

  /**
   * Clear all cache
   */
  public clearCache(): void {
    this.cache.clear();
    console.log('[DataAggregationService] Cleared all cache');
  }

  /**
   * Get loading status for a specific key
   */
  public isLoading(key: string): boolean {
    return this.loadingPromises.has(key);
  }

  /**
   * Load platform data from GitHub or other sources
   */
  private async loadPlatformDataFromSource(platformId: string, cacheKey: string): Promise<PlatformExtension | null> {
    try {
      console.log(`[DataAggregationService] Loading platform data for ${platformId}`);
      
      // Get platform info from storage
      const mergedData = StorageService.getMergedData();
      const platform = mergedData?.platforms?.find(p => p.id === platformId);
      
      if (!platform?.extensionSource) {
        console.warn(`[DataAggregationService] No extension source found for platform ${platformId}`);
        return null;
      }

      // Load from GitHub with authentication fallback
      const { repositoryUri, filePath } = platform.extensionSource;
      let fileContent;
      
      try {
        // Try authenticated access first (if user is signed in)
        if (GitHubAuthService.isAuthenticated()) {
          fileContent = await GitHubApiService.getFileContent(repositoryUri, filePath, 'main');
        } else {
          throw new Error('User not authenticated, trying public access');
        }
      } catch (authError) {
        // If authenticated access fails or user isn't authenticated, try public access
        console.log(`[DataAggregationService] Platform authenticated access failed, trying public access for ${platformId}`);
        fileContent = await GitHubApiService.getPublicFileContent(repositoryUri, filePath, 'main');
      }
      
      if (!fileContent) {
        console.warn(`[DataAggregationService] No file content found for platform ${platformId}`);
        return null;
      }

      // Parse and validate
      const platformData = JSON.parse(fileContent.content) as PlatformExtension;
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: platformData,
        timestamp: Date.now(),
        source: `github:${repositoryUri}/${filePath}`
      });

      console.log(`[DataAggregationService] Successfully loaded platform data for ${platformId}`);
      return platformData;
      
    } catch (error) {
      console.error(`[DataAggregationService] Error loading platform data for ${platformId}:`, error);
      return null;
    }
  }

  /**
   * Load theme data from GitHub or other sources
   */
  private async loadThemeDataFromSource(themeId: string, cacheKey: string): Promise<ThemeOverrides | null> {
    try {
      console.log(`[DataAggregationService] Loading theme data for ${themeId}`);
      
      // Get theme info from storage
      const mergedData = StorageService.getMergedData();
      const theme = mergedData?.themes?.find(t => t.id === themeId);
      
      if (!theme?.overrideSource) {
        console.warn(`[DataAggregationService] No override source found for theme ${themeId}`);
        return null;
      }

      // Load from GitHub with authentication fallback
      const { repositoryUri, filePath } = theme.overrideSource;
      let fileContent;
      
      try {
        // Try authenticated access first (if user is signed in)
        if (GitHubAuthService.isAuthenticated()) {
          fileContent = await GitHubApiService.getFileContent(repositoryUri, filePath, 'main');
        } else {
          throw new Error('User not authenticated, trying public access');
        }
      } catch (authError) {
        // If authenticated access fails or user isn't authenticated, try public access
        console.log(`[DataAggregationService] Theme authenticated access failed, trying public access for ${themeId}`);
        fileContent = await GitHubApiService.getPublicFileContent(repositoryUri, filePath, 'main');
      }
      
      if (!fileContent) {
        console.warn(`[DataAggregationService] No file content found for theme ${themeId}`);
        return null;
      }

      // Parse and validate
      const themeData = JSON.parse(fileContent.content) as ThemeOverrides;
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: themeData,
        timestamp: Date.now(),
        source: `github:${repositoryUri}/${filePath}`
      });

      console.log(`[DataAggregationService] Successfully loaded theme data for ${themeId}`);
      return themeData;
      
    } catch (error) {
      console.error(`[DataAggregationService] Error loading theme data for ${themeId}:`, error);
      return null;
    }
  }
}

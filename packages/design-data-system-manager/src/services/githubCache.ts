import type { GitHubOrganization, GitHubRepo, GitHubBranch } from '../config/github';

interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  size: number; // Track size for quota management
}

interface CacheConfig {
  repositories: {
    ttl: number; // Time to live in milliseconds (5 minutes)
    maxSize: number; // Maximum size in bytes (1MB)
    maxEntries: number; // Maximum number of repositories to cache
  };
  branches: {
    ttl: number; // Time to live in milliseconds (2 minutes)
    maxSize: number; // Maximum size in bytes (100KB)
  };
  organizations: {
    ttl: number; // Time to live in milliseconds (10 minutes)
    maxSize: number; // Maximum size in bytes (50KB)
  };
  global: {
    maxTotalSize: number; // Maximum total cache size (5MB)
  };
}

const CACHE_CONFIG: CacheConfig = {
  repositories: { 
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 1024 * 1024, // 1MB
    maxEntries: 1000 // Limit to 1000 repositories
  },
  branches: { 
    ttl: 2 * 60 * 1000, // 2 minutes
    maxSize: 100 * 1024 // 100KB
  },
  organizations: { 
    ttl: 10 * 60 * 1000, // 10 minutes
    maxSize: 50 * 1024 // 50KB
  },
  global: {
    maxTotalSize: 5 * 1024 * 1024 // 5MB total cache size
  }
};

// Simplified repository interface for caching (only essential fields)
interface CachedRepository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  updated_at: string;
}

export class GitHubCacheService {
  private static readonly CACHE_PREFIX = 'github_cache_';
  private static readonly ORGANIZATIONS_KEY = 'organizations';
  private static readonly REPOSITORIES_KEY = 'repositories';
  private static readonly BRANCHES_PREFIX = 'branches_';

  /**
   * Get cached organizations
   */
  static getOrganizations(): GitHubOrganization[] | null {
    return this.getCachedData<GitHubOrganization[]>(this.ORGANIZATIONS_KEY);
  }

  /**
   * Cache organizations
   */
  static setOrganizations(organizations: GitHubOrganization[]): void {
    this.setCachedData(this.ORGANIZATIONS_KEY, organizations, CACHE_CONFIG.organizations.ttl, CACHE_CONFIG.organizations.maxSize);
  }

  /**
   * Get cached repositories
   */
  static getRepositories(): GitHubRepo[] | null {
    const cached = this.getCachedData<CachedRepository[]>(this.REPOSITORIES_KEY);
    if (!cached) return null;
    
    // Convert back to full GitHubRepo format
    return cached.map(repo => ({
      ...repo,
      // Add any missing fields that might be expected
      html_url: `https://github.com/${repo.full_name}`,
      clone_url: `https://github.com/${repo.full_name}.git`,
      ssh_url: `git@github.com:${repo.full_name}.git`,
      git_url: `git://github.com/${repo.full_name}.git`,
      svn_url: `https://svn.github.com/${repo.full_name}`,
      homepage: null,
      language: null,
      forks_count: 0,
      stargazers_count: 0,
      watchers_count: 0,
      size: 0,
      default_branch: 'main',
      open_issues_count: 0,
      has_issues: true,
      has_projects: true,
      has_downloads: true,
      has_wiki: true,
      has_pages: false,
      has_discussions: false,
      archived: false,
      disabled: false,
      allow_forking: true,
      is_template: false,
      web_commit_signoff_required: false,
      topics: [],
      visibility: repo.private ? 'private' : 'public',
      pushed_at: repo.updated_at,
      created_at: repo.updated_at,
      permissions: {
        admin: false,
        maintain: false,
        push: false,
        triage: false,
        pull: true
      },
      security_and_analysis: {
        advanced_security: {
          status: 'disabled'
        },
        secret_scanning: {
          status: 'disabled'
        },
        secret_scanning_push_protection: {
          status: 'disabled'
        }
      }
    })) as GitHubRepo[];
  }

  /**
   * Cache repositories with size limits and data compression
   */
  static setRepositories(repositories: GitHubRepo[]): void {
    // Limit the number of repositories to cache
    const limitedRepos = repositories.slice(0, CACHE_CONFIG.repositories.maxEntries);
    
    // Convert to simplified format for caching (only essential fields)
    const cachedRepos: CachedRepository[] = limitedRepos.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      private: repo.private,
      updated_at: repo.updated_at
    }));

    this.setCachedData(this.REPOSITORIES_KEY, cachedRepos, CACHE_CONFIG.repositories.ttl, CACHE_CONFIG.repositories.maxSize);
  }

  /**
   * Get cached branches for a repository
   */
  static getBranches(repoFullName: string): GitHubBranch[] | null {
    const key = `${this.BRANCHES_PREFIX}${repoFullName.replace('/', '_')}`;
    return this.getCachedData<GitHubBranch[]>(key);
  }

  /**
   * Cache branches for a repository
   */
  static setBranches(repoFullName: string, branches: GitHubBranch[]): void {
    const key = `${this.BRANCHES_PREFIX}${repoFullName.replace('/', '_')}`;
    this.setCachedData(key, branches, CACHE_CONFIG.branches.ttl, CACHE_CONFIG.branches.maxSize);
  }

  /**
   * Clear all cached data
   */
  static clearAll(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Clear cached data for a specific repository (useful when repository is updated)
   */
  static clearRepositoryData(repoFullName: string): void {
    // Clear branches for this repository
    const branchesKey = `${this.CACHE_PREFIX}${this.BRANCHES_PREFIX}${repoFullName.replace('/', '_')}`;
    localStorage.removeItem(branchesKey);
  }

  /**
   * Check if cached data is still valid
   */
  private static isCacheValid<T>(cachedData: CachedData<T> | null): boolean {
    if (!cachedData) return false;
    return Date.now() < cachedData.expiresAt;
  }

  /**
   * Get cached data with validation
   */
  private static getCachedData<T>(key: string): T | null {
    try {
      const cached = localStorage.getItem(`${this.CACHE_PREFIX}${key}`);
      if (!cached) return null;

      const cachedData: CachedData<T> = JSON.parse(cached);
      
      if (!this.isCacheValid(cachedData)) {
        // Cache expired, remove it
        localStorage.removeItem(`${this.CACHE_PREFIX}${key}`);
        return null;
      }

      return cachedData.data;
    } catch (error) {
      console.error('Failed to retrieve cached data:', error);
      // Remove corrupted cache
      localStorage.removeItem(`${this.CACHE_PREFIX}${key}`);
      return null;
    }
  }

  /**
   * Check available storage space
   */
  private static getAvailableStorage(): number {
    try {
      // Test storage by trying to set a small value
      const testKey = 'storage_test';
      const testValue = 'test';
      localStorage.setItem(testKey, testValue);
      localStorage.removeItem(testKey);
      
      // Estimate available space (this is approximate)
      let totalSize = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            totalSize += key.length + value.length;
          }
        }
      }
      
      // Assume localStorage has ~5-10MB limit (varies by browser)
      const estimatedLimit = 5 * 1024 * 1024; // 5MB
      return Math.max(0, estimatedLimit - totalSize);
    } catch (error) {
      console.warn('Could not determine available storage:', error);
      return 0;
    }
  }

  /**
   * Implement LRU eviction when storage is full
   */
  private static evictOldestEntries(requiredSize: number): void {
    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
    
    // Get all cache entries with their timestamps
    const entries: Array<{ key: string; timestamp: number; size: number }> = [];
    
    cacheKeys.forEach(key => {
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          const cachedData: CachedData<unknown> = JSON.parse(cached);
          entries.push({
            key,
            timestamp: cachedData.timestamp,
            size: cachedData.size || cached.length
          });
        }
      } catch (error) {
        // Remove corrupted entries
        localStorage.removeItem(key);
      }
    });
    
    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a.timestamp - b.timestamp);
    
    // Remove oldest entries until we have enough space
    let freedSpace = 0;
    for (const entry of entries) {
      if (freedSpace >= requiredSize) break;
      
      localStorage.removeItem(entry.key);
      freedSpace += entry.size;
    }
  }

  /**
   * Set cached data with expiration and size management
   */
  private static setCachedData<T>(key: string, data: T, ttl: number, maxSize?: number): void {
    try {
      const cachedData: CachedData<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl,
        size: 0
      };

      const serialized = JSON.stringify(cachedData);
      const dataSize = serialized.length;
      cachedData.size = dataSize;

      // Check if data exceeds max size limit
      if (maxSize && dataSize > maxSize) {
        console.warn(`Data size (${dataSize} bytes) exceeds limit (${maxSize} bytes) for key: ${key}`);
        return;
      }

      // Check available storage
      const availableStorage = this.getAvailableStorage();
      if (dataSize > availableStorage) {
        console.warn(`Insufficient storage space. Required: ${dataSize}, Available: ${availableStorage}`);
        // Try to evict old entries
        this.evictOldestEntries(dataSize);
      }

      localStorage.setItem(`${this.CACHE_PREFIX}${key}`, JSON.stringify(cachedData));
    } catch (error) {
      console.error('Failed to cache data:', error);
      this.debugCacheIssue('setCachedData', error as Error);
      
      // If localStorage is full, try to clear expired entries and evict oldest
      this.clearExpiredCache();
      this.evictOldestEntries(1024 * 1024); // Try to free 1MB
      
      try {
        const cachedData: CachedData<T> = {
          data,
          timestamp: Date.now(),
          expiresAt: Date.now() + ttl,
          size: 0
        };

        const serialized = JSON.stringify(cachedData);
        const dataSize = serialized.length;
        cachedData.size = dataSize;

        localStorage.setItem(`${this.CACHE_PREFIX}${key}`, JSON.stringify(cachedData));
      } catch (retryError) {
        console.error('Failed to cache data after cleanup:', retryError);
        // If still failing, clear all cache and try one more time
        this.clearAll();
        try {
          const cachedData: CachedData<T> = {
            data,
            timestamp: Date.now(),
            expiresAt: Date.now() + ttl,
            size: 0
          };
          const serialized = JSON.stringify(cachedData);
          cachedData.size = serialized.length;
          localStorage.setItem(`${this.CACHE_PREFIX}${key}`, JSON.stringify(cachedData));
        } catch (finalError) {
          console.error('Failed to cache data after clearing all cache:', finalError);
        }
      }
    }
  }

  /**
   * Clear expired cache entries
   */
  private static clearExpiredCache(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const cachedData: CachedData<unknown> = JSON.parse(cached);
            if (Date.now() >= cachedData.expiresAt) {
              localStorage.removeItem(key);
            }
          }
        } catch (error) {
          // Remove corrupted cache entries
          localStorage.removeItem(key);
        }
      }
    });
  }

  /**
   * Get cache statistics for debugging
   */
  static getCacheStats(): {
    totalEntries: number;
    expiredEntries: number;
    validEntries: number;
    totalSize: number;
    availableStorage: number;
  } {
    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
    
    let expiredEntries = 0;
    let validEntries = 0;
    let totalSize = 0;

    cacheKeys.forEach(key => {
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          totalSize += cached.length;
          const cachedData: CachedData<unknown> = JSON.parse(cached);
          if (Date.now() >= cachedData.expiresAt) {
            expiredEntries++;
          } else {
            validEntries++;
          }
        }
      } catch (error) {
        expiredEntries++;
      }
    });

    return {
      totalEntries: cacheKeys.length,
      expiredEntries,
      validEntries,
      totalSize,
      availableStorage: this.getAvailableStorage(),
    };
  }

  /**
   * Debug method to log cache issues
   */
  static debugCacheIssue(operation: string, error: Error): void {
    const stats = this.getCacheStats();
    console.group('GitHub Cache Debug Info');
    console.log('Operation:', operation);
    console.log('Error:', error.message);
    console.log('Cache Stats:', stats);
    console.log('localStorage length:', localStorage.length);
    console.log('localStorage keys:', Object.keys(localStorage).filter(key => key.startsWith(this.CACHE_PREFIX)));
    console.groupEnd();
  }

  /**
   * Force clear all cache (useful for debugging)
   */
  static forceClearAll(): void {
    console.log('Force clearing all GitHub cache...');
    this.clearAll();
    console.log('GitHub cache cleared successfully');
  }
} 
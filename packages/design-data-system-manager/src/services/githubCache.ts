import type { GitHubOrganization, GitHubRepo, GitHubBranch } from '../config/github';

interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheConfig {
  repositories: {
    ttl: number; // Time to live in milliseconds (5 minutes)
  };
  branches: {
    ttl: number; // Time to live in milliseconds (2 minutes)
  };
  organizations: {
    ttl: number; // Time to live in milliseconds (10 minutes)
  };
}

const CACHE_CONFIG: CacheConfig = {
  repositories: { ttl: 5 * 60 * 1000 }, // 5 minutes
  branches: { ttl: 2 * 60 * 1000 }, // 2 minutes
  organizations: { ttl: 10 * 60 * 1000 }, // 10 minutes
};

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
    this.setCachedData(this.ORGANIZATIONS_KEY, organizations, CACHE_CONFIG.organizations.ttl);
  }

  /**
   * Get cached repositories
   */
  static getRepositories(): GitHubRepo[] | null {
    return this.getCachedData<GitHubRepo[]>(this.REPOSITORIES_KEY);
  }

  /**
   * Cache repositories
   */
  static setRepositories(repositories: GitHubRepo[]): void {
    this.setCachedData(this.REPOSITORIES_KEY, repositories, CACHE_CONFIG.repositories.ttl);
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
    this.setCachedData(key, branches, CACHE_CONFIG.branches.ttl);
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
   * Set cached data with expiration
   */
  private static setCachedData<T>(key: string, data: T, ttl: number): void {
    try {
      const cachedData: CachedData<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl,
      };

      localStorage.setItem(`${this.CACHE_PREFIX}${key}`, JSON.stringify(cachedData));
    } catch (error) {
      console.error('Failed to cache data:', error);
      // If localStorage is full, clear old cache entries
      this.clearExpiredCache();
      
      try {
        const cachedData: CachedData<T> = {
          data,
          timestamp: Date.now(),
          expiresAt: Date.now() + ttl,
        };
        localStorage.setItem(`${this.CACHE_PREFIX}${key}`, JSON.stringify(cachedData));
      } catch (retryError) {
        console.error('Failed to cache data after clearing expired entries:', retryError);
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
    };
  }
} 
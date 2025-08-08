import { GitHubApiService } from './githubApi';
import { GitHubAuthService } from './githubAuth';

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  clone_url: string;
  default_branch: string;
  updated_at: string;
  stargazers_count: number;
  forks_count: number;
  owner: {
    login: string;
    avatar_url: string;
  };
}

export interface SchemaFile {
  path: string;
  name: string;
  size: number;
  lastModified: string;
  repository: string;
  branch: string;
}

export interface PermissionStatus {
  canEdit: boolean;
  canView: boolean;
  reason?: string;
}

export interface SearchResult {
  repository: GitHubRepo;
  schemaFiles: SchemaFile[];
  permissions: PermissionStatus;
}

export class GitHubSearchService {
  private static cache = new Map<string, { data: SearchResult[]; timestamp: number }>();
  private static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Search GitHub for repositories containing design system files
   */
  static async searchRepositories(query: string, page: number = 1): Promise<{
    results: SearchResult[];
    totalCount: number;
    hasNextPage: boolean;
  }> {
    const cacheKey = `search:${query}:${page}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`[GitHubSearchService] Returning cached search results for: ${query}`);
      return { results: cached.data, totalCount: cached.data.length, hasNextPage: false };
    }

    console.log(`[GitHubSearchService] Searching GitHub for: ${query} (page: ${page})`);
    
    try {
      // Try to get access token for authenticated requests (includes private repos)
      let accessToken: string | null = null;
      
      try {
        accessToken = await GitHubAuthService.getValidAccessToken();
        console.log('[GitHubSearchService] Using authenticated search (includes private repositories)');
      } catch (error) {
        console.log('[GitHubSearchService] No valid access token, using public API (public repositories only)');
      }
      
      const perPage = 10;
      
      // Search repositories
      const searchUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&sort=updated&order=desc`;
      
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
      };
      
      // Add authorization header only if we have a valid token
      if (accessToken) {
        headers['Authorization'] = `token ${accessToken}`;
      }
      
      const response = await fetch(searchUrl, { headers });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const searchData = await response.json();
      const repositories = searchData.items as GitHubRepo[];
      
      console.log(`[GitHubSearchService] Found ${repositories.length} repositories`);

      // Process each repository to find schema files
      const results: SearchResult[] = [];
      
      for (const repo of repositories) {
        try {
          const schemaFiles = await this.findSchemaFiles(repo.full_name, repo.default_branch, accessToken || undefined);
          
          // Only include repositories that have schema files
          if (schemaFiles.length > 0) {
            const permissions = await this.checkPermissions(repo.full_name, accessToken || undefined);
            
            results.push({
              repository: repo,
              schemaFiles,
              permissions
            });
          }
        } catch (error) {
          console.warn(`[GitHubSearchService] Error processing repository ${repo.full_name}:`, error);
          // Continue with other repositories
        }
      }

      // Cache the results
      this.cache.set(cacheKey, { data: results, timestamp: Date.now() });

      return {
        results,
        totalCount: searchData.total_count,
        hasNextPage: page * perPage < searchData.total_count
      };

    } catch (error) {
      console.error('[GitHubSearchService] Search failed:', error);
      throw error;
    }
  }

  /**
   * Search by direct repository URL
   */
  static async searchByUrl(url: string): Promise<SearchResult | null> {
    try {
      // Extract repository info from URL
      const repoMatch = url.match(/github\.com\/([^/]+\/[^/]+)/);
      if (!repoMatch) {
        throw new Error('Invalid GitHub repository URL');
      }

      const repoFullName = repoMatch[1];
      console.log(`[GitHubSearchService] Searching by URL: ${repoFullName}`);

      // Try to get access token for authenticated requests
      let accessToken: string | null = null;
      
      try {
        accessToken = await GitHubAuthService.getValidAccessToken();
        console.log('[GitHubSearchService] Using authenticated URL search');
      } catch (error) {
        console.log('[GitHubSearchService] No valid access token, using public API for URL search');
      }

      // Get repository details
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
      };
      
      // Add authorization header only if we have a valid token
      if (accessToken) {
        headers['Authorization'] = `token ${accessToken}`;
      }
      
      const response = await fetch(`https://api.github.com/repos/${repoFullName}`, { headers });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Repository not found');
        }
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const repository = await response.json() as GitHubRepo;
      
      // Find schema files
      const schemaFiles = await this.findSchemaFiles(repoFullName, repository.default_branch, accessToken || undefined);
      
      // Check permissions
      const permissions = await this.checkPermissions(repoFullName, accessToken || undefined);

      return {
        repository,
        schemaFiles,
        permissions
      };

    } catch (error) {
      console.error('[GitHubSearchService] URL search failed:', error);
      throw error;
    }
  }

  /**
   * Scan repository for schema-compliant files
   * TODO: When we address repo creation and standardized repo scaffolding, 
   * we should limit scanning to common paths (root, /src, /data, /schemas) for performance
   */
  static async findSchemaFiles(repo: string, branch: string, accessToken?: string): Promise<SchemaFile[]> {
    console.log(`[GitHubSearchService] Scanning repository ${repo} for schema files`);
    
    try {
      // If no access token provided, try to get one
      let token = accessToken;
      let isAuthenticated = false;
      
      if (!token) {
        try {
          token = await GitHubAuthService.getValidAccessToken();
          isAuthenticated = true;
        } catch (error) {
          console.log('[GitHubSearchService] No access token available, using public API for repository scan');
          isAuthenticated = false;
        }
      } else {
        isAuthenticated = true;
      }
      
      // Get all JSON files in the repository
      const allJsonFiles = isAuthenticated 
        ? await this.getAllJsonFiles(repo, branch, token!)
        : await this.getAllPublicJsonFiles(repo, branch);
        
      console.log(`[GitHubSearchService] Found ${allJsonFiles.length} JSON files in ${repo}`);

      const schemaFiles: SchemaFile[] = [];

      // Check each JSON file for schema compliance
      for (const file of allJsonFiles) {
        try {
          const content = isAuthenticated
            ? await GitHubApiService.getFileContent(repo, file.path, branch)
            : await GitHubApiService.getPublicFileContent(repo, file.path, branch);
            
          const fileType = this.identifySchemaFile(content.content);
          
          if (fileType === 'schema') {
            schemaFiles.push({
              path: file.path,
              name: file.name,
              size: file.size,
              lastModified: file.lastModified || new Date().toISOString(),
              repository: repo,
              branch: branch
            });
          }
        } catch (error) {
          console.warn(`[GitHubSearchService] Error checking file ${file.path}:`, error);
          // Continue with other files
        }
      }

      console.log(`[GitHubSearchService] Found ${schemaFiles.length} schema files in ${repo}`);
      return schemaFiles;

    } catch (error) {
      console.error(`[GitHubSearchService] Error scanning repository ${repo}:`, error);
      throw error;
    }
  }

  /**
   * Check user permissions for a repository
   */
  static async checkPermissions(repo: string, accessToken?: string): Promise<PermissionStatus> {
    try {
      // If no access token provided, try to get one
      let token = accessToken;
      if (!token) {
        try {
          token = await GitHubAuthService.getValidAccessToken();
        } catch (error) {
          // No authentication available - assume view-only access for public repositories
          return {
            canEdit: false,
            canView: true,
            reason: 'Public repository - sign in for edit access'
          };
        }
      }
      
      const hasWriteAccess = await GitHubApiService.hasWriteAccessToRepository(repo);
      
      return {
        canEdit: hasWriteAccess,
        canView: true, // Public repositories are always viewable
        reason: hasWriteAccess ? 'You have write access' : 'View-only access'
      };
    } catch (error) {
      console.warn(`[GitHubSearchService] Error checking permissions for ${repo}:`, error);
      return {
        canEdit: false,
        canView: true,
        reason: 'Permission check failed'
      };
    }
  }

  /**
   * Get all JSON files in a repository recursively
   */
  private static async getAllJsonFiles(
    repo: string, 
    branch: string, 
    accessToken: string,
    path: string = ''
  ): Promise<Array<{ path: string; name: string; size: number; lastModified?: string }>> {
    const url = `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch directory contents: ${response.statusText}`);
    }

    const contents = await response.json();
    const files: Array<{ path: string; name: string; size: number; lastModified?: string }> = [];

    for (const item of contents) {
      if (item.type === 'file' && item.name.endsWith('.json')) {
        files.push({
          path: item.path,
          name: item.name,
          size: item.size,
          lastModified: item.updated_at,
        });
      } else if (item.type === 'dir') {
        // Recursively search subdirectories
        const subFiles = await this.getAllJsonFiles(repo, branch, accessToken, item.path);
        files.push(...subFiles);
      }
    }

    return files;
  }

  /**
   * Get all JSON files in a repository recursively (public access)
   */
  private static async getAllPublicJsonFiles(
    repo: string, 
    branch: string, 
    path: string = ''
  ): Promise<Array<{ path: string; name: string; size: number; lastModified?: string }>> {
    const url = `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch directory contents: ${response.statusText}`);
    }

    const contents = await response.json();
    const files: Array<{ path: string; name: string; size: number; lastModified?: string }> = [];

    for (const item of contents) {
      if (item.type === 'file' && item.name.endsWith('.json')) {
        files.push({
          path: item.path,
          name: item.name,
          size: item.size,
          lastModified: item.updated_at,
        });
      } else if (item.type === 'dir') {
        // Recursively search subdirectories
        const subFiles = await this.getAllPublicJsonFiles(repo, branch, item.path);
        files.push(...subFiles);
      }
    }

    return files;
  }

  /**
   * Identify if a file content matches the schema.json structure
   */
  private static identifySchemaFile(content: string): 'schema' | 'unknown' {
    try {
      const data = JSON.parse(content);
      
      // Check for ALL required properties according to schema.json
      // Required properties: ["systemName", "systemId", "tokenCollections", "dimensions", "tokens", "platforms", "version", "versionHistory", "componentCategories", "components"]
      // Note: "themes" is optional (minItems: 0) and not in the required array
      const hasRequiredProperties = data.systemName && 
                                   data.systemId && 
                                   data.tokenCollections && 
                                   data.dimensions && 
                                   data.tokens && 
                                   data.platforms && 
                                   data.version && 
                                   data.versionHistory && 
                                   data.componentCategories && 
                                   data.components;
      
      // Must not be a platform extension file (should not have platformId)
      const isNotPlatformExtension = !data.platformId;
      
      // Must not be a theme override file (should not have themeId)
      const isNotThemeOverride = !data.themeId;
      
      if (hasRequiredProperties && isNotPlatformExtension && isNotThemeOverride) {
        console.log('[GitHubSearchService] File identified as schema-compliant:', {
          hasSystemName: !!data.systemName,
          hasSystemId: !!data.systemId,
          hasTokenCollections: !!data.tokenCollections,
          hasDimensions: !!data.dimensions,
          hasTokens: !!data.tokens,
          hasPlatforms: !!data.platforms,
          hasVersion: !!data.version,
          hasVersionHistory: !!data.versionHistory,
          hasComponentCategories: !!data.componentCategories,
          hasComponents: !!data.components,
          hasThemes: !!data.themes
        });
        return 'schema';
      }
      
      console.log('[GitHubSearchService] File NOT identified as schema-compliant:', {
        hasRequiredProperties,
        isNotPlatformExtension,
        isNotThemeOverride,
        hasSystemName: !!data.systemName,
        hasSystemId: !!data.systemId,
        hasTokenCollections: !!data.tokenCollections,
        hasDimensions: !!data.dimensions,
        hasTokens: !!data.tokens,
        hasPlatforms: !!data.platforms,
        hasVersion: !!data.version,
        hasVersionHistory: !!data.versionHistory,
        hasComponentCategories: !!data.componentCategories,
        hasComponents: !!data.components,
        hasThemes: !!data.themes
      });
      return 'unknown';
    } catch (error) {
      console.warn('[GitHubSearchService] JSON parse error in identifySchemaFile:', error instanceof Error ? error.message : 'Unknown error');
      return 'unknown';
    }
  }

  /**
   * Clear cache
   */
  static clearCache(): void {
    this.cache.clear();
    console.log('[GitHubSearchService] Cache cleared');
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
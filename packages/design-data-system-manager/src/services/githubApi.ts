import { GITHUB_CONFIG } from '../config/github';
import type { GitHubRepo, GitHubBranch, GitHubFile, GitHubPR, GitHubOrganization } from '../config/github';
import { GitHubAuthService } from './githubAuth';
import { GitHubCacheService } from './githubCache';

export interface ValidFile {
  path: string;
  name: string;
  type: 'schema' | 'theme-override' | 'platform-extension';
  size: number;
  lastModified: string;
}

interface CreateFileBody {
  message: string;
  content: string;
  branch: string;
  sha?: string;
}

export class GitHubApiService {
  /**
   * Get all organizations for the authenticated user
   */
  static async getOrganizations(): Promise<GitHubOrganization[]> {
    // Check cache first
    const cachedOrgs = GitHubCacheService.getOrganizations();
    if (cachedOrgs) {
      console.log('[GitHubApiService] Using cached organizations');
      return cachedOrgs;
    }

    console.log('[GitHubApiService] Fetching organizations from GitHub API');
    const accessToken = await GitHubAuthService.getValidAccessToken();
    
    // Get user info first
    const userResponse = await fetch(`${GITHUB_CONFIG.apiBaseUrl}/user`, {
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    
    if (!userResponse.ok) {
      throw new Error(`Failed to fetch user: ${userResponse.statusText}`);
    }
    
    const user = await userResponse.json();
    
    // Get organizations
    const orgsResponse = await fetch(`${GITHUB_CONFIG.apiBaseUrl}/user/orgs`, {
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    
    if (!orgsResponse.ok) {
      throw new Error(`Failed to fetch organizations: ${orgsResponse.statusText}`);
    }
    
    const orgs = await orgsResponse.json();
    
    // Combine user (as personal organization) with actual organizations
    const personalOrg: GitHubOrganization = {
      id: user.id,
      login: user.login,
      name: user.name || user.login,
      avatar_url: user.avatar_url,
      type: 'User',
    };
    
    const allOrgs = [personalOrg, ...orgs];
    
    // Cache the organizations (with error handling)
    try {
      GitHubCacheService.setOrganizations(allOrgs);
    } catch (error) {
      console.warn('Failed to cache organizations, but continuing with API response:', error);
      // Continue without caching - the data is still available from the API
    }
    
    return allOrgs;
  }

  /**
   * Get all repositories for the authenticated user
   */
  static async getRepositories(): Promise<GitHubRepo[]> {
    // Check cache first
    const cachedRepos = GitHubCacheService.getRepositories();
    if (cachedRepos) {
      console.log('[GitHubApiService] Using cached repositories');
      return cachedRepos;
    }

    console.log('[GitHubApiService] Fetching repositories from GitHub API');
    const accessToken = await GitHubAuthService.getValidAccessToken();
    
    let allRepos: GitHubRepo[] = [];
    let page = 1;
    const perPage = 100;
    let hasMorePages = true;
    
    while (hasMorePages) {
      const response = await fetch(`${GITHUB_CONFIG.apiBaseUrl}/user/repos?sort=updated&per_page=${perPage}&page=${page}`, {
        headers: {
          'Authorization': `token ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch repositories: ${response.statusText}`);
      }
      
      const repos = await response.json();
      
      if (repos.length === 0) {
        hasMorePages = false;
      } else {
        allRepos = allRepos.concat(repos);
        page++;
        
        // Safety check to prevent infinite loops
        if (page > 10) {
          hasMorePages = false;
        }
      }
    }
    
    // Cache the repositories (with error handling)
    try {
      GitHubCacheService.setRepositories(allRepos);
    } catch (error) {
      console.warn('Failed to cache repositories, but continuing with API response:', error);
      // Continue without caching - the data is still available from the API
    }
    
    return allRepos;
  }
  
  /**
   * Get all branches for a repository
   */
  static async getBranches(repo: string): Promise<GitHubBranch[]> {
    // Check cache first
    const cachedBranches = GitHubCacheService.getBranches(repo);
    if (cachedBranches) {
      console.log(`[GitHubApiService] Using cached branches for ${repo}`);
      return cachedBranches;
    }

    console.log(`[GitHubApiService] Fetching branches for ${repo} from GitHub API`);
    const accessToken = await GitHubAuthService.getValidAccessToken();
    
    const response = await fetch(`${GITHUB_CONFIG.apiBaseUrl}/repos/${repo}/branches`, {
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch branches: ${response.statusText}`);
    }
    
    const branches = await response.json();
    
    // Cache the branches (with error handling)
    try {
      GitHubCacheService.setBranches(repo, branches);
    } catch (error) {
      console.warn('Failed to cache branches, but continuing with API response:', error);
      // Continue without caching - the data is still available from the API
    }
    
    return branches;
  }
  
  /**
   * Get file content from a repository
   */
  static async getFileContent(repo: string, path: string, branch: string): Promise<GitHubFile> {
    const accessToken = await GitHubAuthService.getValidAccessToken();
    
    const response = await fetch(`${GITHUB_CONFIG.apiBaseUrl}/repos/${repo}/contents/${path}?ref=${branch}`, {
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file content: ${response.statusText}`);
    }
    
    const fileData = await response.json();
    
    // GitHub API returns content as base64 encoded string
    // We need to decode it to get the actual content
    if (fileData.content && fileData.encoding === 'base64') {
      try {
        // Decode base64 content
        const decodedContent = atob(fileData.content);
        return {
          ...fileData,
          content: decodedContent,
        };
      } catch (error) {
        throw new Error('Failed to decode file content');
      }
    }
    
    return fileData;
  }

  /**
   * Get file content from a public repository (no authentication required)
   */
  static async getPublicFileContent(repo: string, path: string, branch: string): Promise<GitHubFile> {
    console.log('[GitHubApiService] Fetching public file content:', { repo, path, branch });
    
    // First, check if the repository exists
    const repoResponse = await fetch(`${GITHUB_CONFIG.apiBaseUrl}/repos/${repo}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    
    if (!repoResponse.ok) {
      if (repoResponse.status === 404) {
        throw new Error(`Repository not found: ${repo}`);
      } else if (repoResponse.status === 403) {
        throw new Error(`Repository is private: ${repo}`);
      } else {
        throw new Error(`Failed to access repository: ${repoResponse.status} ${repoResponse.statusText}`);
      }
    }
    
    // Now try to get the specific file
    const response = await fetch(`${GITHUB_CONFIG.apiBaseUrl}/repos/${repo}/contents/${path}?ref=${branch}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`File not found: ${path} in ${repo}/${branch}`);
      } else if (response.status === 403) {
        throw new Error(`Repository is private: ${repo}`);
      } else {
        throw new Error(`Failed to fetch file content: ${response.status} ${response.statusText}`);
      }
    }
    
    const fileData = await response.json();
    
    // GitHub API returns content as base64 encoded string
    // We need to decode it to get the actual content
    if (fileData.content && fileData.encoding === 'base64') {
      try {
        // Decode base64 content
        const decodedContent = atob(fileData.content);
        return {
          ...fileData,
          content: decodedContent,
        };
      } catch (error) {
        throw new Error('Failed to decode file content');
      }
    }
    
    return fileData;
  }
  
  /**
   * Create or update a file in the repository (idempotent)
   */
  static async createOrUpdateFile(
    repo: string,
    path: string,
    content: string,
    branch: string,
    message: string = 'Update token data'
  ): Promise<void> {
    const accessToken = await GitHubAuthService.getValidAccessToken();

    // Try to get the current file to get its SHA (if it exists)
    let sha: string | undefined;
    try {
      const currentFile = await this.getFileContent(repo, path, branch);
      sha = currentFile.sha;
    } catch (error) {
      // File doesn't exist, which is fine for creating new files
    }

    const body: CreateFileBody = {
      message,
      content: this.encodeToBase64(content), // Base64 encode content with UTF-8 support
      branch,
    };

    if (sha) {
      body.sha = sha; // Include SHA for updates
    }

    const response = await fetch(`${GITHUB_CONFIG.apiBaseUrl}/repos/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = `Failed to create/update file: ${response.status} ${response.statusText}${errorData.message ? ` - ${errorData.message}` : ''}`;
      throw new Error(errorMessage);
    }
  }

  // For backward compatibility, alias createFile to createOrUpdateFile
  static async createFile(
    repo: string,
    path: string,
    content: string,
    branch: string,
    message: string = 'Update token data'
  ): Promise<void> {
    return this.createOrUpdateFile(repo, path, content, branch, message);
  }

  /**
   * Delete a file from the repository
   */
  static async deleteFile(
    repo: string,
    path: string,
    branch: string,
    message: string = 'Delete file'
  ): Promise<void> {
    const accessToken = await GitHubAuthService.getValidAccessToken();

    // Get the current file to get its SHA (required for deletion)
    let sha: string;
    try {
      const currentFile = await this.getFileContent(repo, path, branch);
      sha = currentFile.sha;
    } catch (error) {
      throw new Error(`File not found or cannot be accessed: ${path}`);
    }

    const body = {
      message,
      sha,
      branch,
    };

    const response = await fetch(`${GITHUB_CONFIG.apiBaseUrl}/repos/${repo}/contents/${path}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to delete file: ${response.statusText}${errorData.message ? ` - ${errorData.message}` : ''}`);
    }
  }
  
  /**
   * Create a pull request
   */
  static async createPullRequest(
    repo: string,
    title: string,
    body: string,
    head: string,
    base: string
  ): Promise<GitHubPR> {
    const accessToken = await GitHubAuthService.getValidAccessToken();
    
    const response = await fetch(`${GITHUB_CONFIG.apiBaseUrl}/repos/${repo}/pulls`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        body,
        head,
        base,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create pull request: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  /**
   * Encode string to base64 with UTF-8 support
   */
  private static encodeToBase64(str: string): string {
    // Convert string to UTF-8 bytes, then to base64
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    const base64 = btoa(String.fromCharCode(...bytes));
    return base64;
  }

  /**
   * Create a new repository
   */
  static async createRepository(config: {
    name: string;
    description?: string;
    private?: boolean;
    autoInit?: boolean;
    organization?: string;
  }): Promise<{
    id: string;
    name: string;
    full_name: string;
    description?: string;
    private: boolean;
    html_url: string;
    clone_url: string;
    default_branch: string;
  }> {
    const accessToken = await GitHubAuthService.getValidAccessToken();
    
    // Determine the endpoint based on whether it's for an organization or user
    const endpoint = config.organization 
      ? `${GITHUB_CONFIG.apiBaseUrl}/orgs/${config.organization}/repos`
      : `${GITHUB_CONFIG.apiBaseUrl}/user/repos`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: config.name,
        description: config.description || '',
        private: config.private || false,
        auto_init: config.autoInit || false,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create repository: ${response.statusText} - ${errorText}`);
    }
    
    return response.json();
  }

  /**
   * Create a new branch
   */
  static async createBranch(repo: string, baseBranch: string, newBranch: string): Promise<void> {
    const accessToken = await GitHubAuthService.getValidAccessToken();
    
    // First, get the SHA of the base branch
    const baseBranchInfo = await fetch(`${GITHUB_CONFIG.apiBaseUrl}/repos/${repo}/branches/${baseBranch}`, {
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    
    if (!baseBranchInfo.ok) {
      throw new Error(`Failed to get base branch info: ${baseBranchInfo.statusText}`);
    }
    
    const baseBranchData = await baseBranchInfo.json();
    
    // Create the new branch
    const response = await fetch(`${GITHUB_CONFIG.apiBaseUrl}/repos/${repo}/git/refs`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: `refs/heads/${newBranch}`,
        sha: baseBranchData.commit.sha,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create branch: ${response.statusText}`);
    }
  }
  
  /**
   * Scan repository for valid JSON files
   */
  static async scanRepositoryForValidFiles(repo: string, branch: string, systemId?: string): Promise<ValidFile[]> {
    const accessToken = await GitHubAuthService.getValidAccessToken();
    
    console.log(`Scanning repository: ${repo} (branch: ${branch})${systemId ? ` for systemId: ${systemId}` : ''}`);
    
    // Get all files in the repository
    const files = await this.getAllJsonFiles(repo, branch, accessToken);
    console.log(`Found ${files.length} JSON files in repository:`, files.map(f => f.path));
    
    const validFiles: ValidFile[] = [];
    
    for (const file of files) {
      try {
        console.log(`Validating file: ${file.path}`);
        const content = await this.getFileContent(repo, file.path, branch);
        const fileType = this.identifyFileType(content.content);
        console.log(`File ${file.path} identified as: ${fileType}`);
        
        if (fileType !== 'unknown') {
          // For platform extension files, validate systemId if provided
          if (fileType === 'platform-extension' && systemId) {
            try {
              const data = JSON.parse(content.content);
              if (data.systemId !== systemId) {
                console.log(`Skipping platform extension file ${file.path}: systemId mismatch (expected: ${systemId}, found: ${data.systemId})`);
                continue;
              }
              console.log(`Platform extension file ${file.path} has matching systemId: ${data.systemId}`);
            } catch (error) {
              console.warn(`Failed to parse systemId from platform extension file ${file.path}:`, error);
              continue;
            }
          }
          
          validFiles.push({
            path: file.path,
            name: file.name,
            type: fileType,
            size: file.size,
            lastModified: file.lastModified || new Date().toISOString(),
          });
        }
      } catch (error) {
        console.warn(`Failed to validate file ${file.path}:`, error);
      }
    }
    
    console.log(`Valid files found: ${validFiles.length}`, validFiles.map(f => `${f.path} (${f.type})`));
    return validFiles.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
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
    const url = `${GITHUB_CONFIG.apiBaseUrl}/repos/${repo}/contents/${path}?ref=${branch}`;
    console.log(`Fetching directory contents from: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch directory contents: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch directory contents: ${response.statusText}`);
    }
    
    const contents = await response.json();
    console.log(`Directory contents for ${path}:`, contents.map((item: { name: string; type: string }) => ({ name: item.name, type: item.type })));
    
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
   * Identify if a file content matches our schemas
   */
  private static identifyFileType(content: string): 'schema' | 'theme-override' | 'platform-extension' | 'unknown' {
    try {
      const data = JSON.parse(content);
      
      // Check for platform-extension.json structure FIRST (most specific)
      if (data.systemId && data.platformId && data.version && data.figmaFileKey) {
        return 'platform-extension';
      }
      
      // Check for theme-override.json structure
      if (data.systemId && data.themeId && data.tokenOverrides && !data.platformId) {
        return 'theme-override';
      }
      
      // Check for schema.json structure (core design system schema) - most general
      // Must have these core properties that define a complete design system
      if (data.tokenCollections && data.dimensions && data.tokens && data.platforms && 
          data.systemName && data.systemId && data.version && !data.platformId) {
        return 'schema';
      }
      
      return 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Get information about the currently selected repository
   */
  static getSelectedRepositoryInfo(): {
    fullName: string;
    branch: string;
    filePath: string;
    fileType: 'schema' | 'theme-override' | 'platform-extension';
  } | null {
    try {
      const repoInfoStr = localStorage.getItem('github_selected_repo');
      if (!repoInfoStr) return null;
      
      return JSON.parse(repoInfoStr);
    } catch (error) {
      console.error('Failed to parse selected repository info:', error);
      return null;
    }
  }

  /**
   * Check if a repository is currently selected
   */
  static hasSelectedRepository(): boolean {
    return this.getSelectedRepositoryInfo() !== null;
  }

  /**
   * Check if the authenticated user has write access to a specific repository
   * Uses /user/repos with affiliation=owner,collaborator to find repos where user has push access
   */
  static async hasWriteAccessToRepository(repoFullName: string): Promise<boolean> {
    console.log(`[GitHubApiService] Checking write access for repository: ${repoFullName}`);
    const accessToken = await GitHubAuthService.getValidAccessToken();
    
    // First, try to get the specific repository directly to check permissions
    try {
      const repoResponse = await fetch(`${GITHUB_CONFIG.apiBaseUrl}/repos/${repoFullName}`, {
        headers: {
          'Authorization': `token ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });
      
      if (repoResponse.ok) {
        const repo = await repoResponse.json();
        // Check if user has push access (admin, write, or maintain permissions)
        const hasPushAccess = repo.permissions?.push === true || 
                             repo.permissions?.admin === true || 
                             repo.permissions?.maintain === true;
        
        console.log(`[GitHubApiService] Direct repo check: User ${hasPushAccess ? 'has' : 'does not have'} write access to ${repoFullName}`);
        return hasPushAccess;
      }
    } catch (error) {
      console.warn(`[GitHubApiService] Direct repo check failed for ${repoFullName}:`, error);
      // Fall back to the list method
    }
    
    // Fallback: Use /user/repos with affiliation=owner,collaborator to get repos where user has write access
    // Fetch all pages to ensure we don't miss repositories due to pagination
    const allRepos: GitHubRepo[] = [];
    let page = 1;
    const perPage = 100;
    
    while (page <= 10) { // Safety limit to prevent infinite loops
      const response = await fetch(`${GITHUB_CONFIG.apiBaseUrl}/user/repos?affiliation=owner,collaborator&per_page=${perPage}&page=${page}`, {
        headers: {
          'Authorization': `token ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });
      
      if (!response.ok) {
        console.error(`[GitHubApiService] Failed to check repository access: ${response.statusText}`);
        // Default to view-only access if we can't determine permissions
        return false;
      }
      
      const repos = await response.json();
      
      // If no more repositories, break
      if (repos.length === 0) {
        break;
      }
      
      allRepos.push(...repos);
      
      // If we got fewer than perPage results, we've reached the end
      if (repos.length < perPage) {
        break;
      }
      
      page++;
    }
    
    // Check if the target repository is in the list of repos where user has write access
    const hasAccess = allRepos.some((repo: GitHubRepo) => repo.full_name === repoFullName);
    
    console.log(`[GitHubApiService] List method: User ${hasAccess ? 'has' : 'does not have'} write access to ${repoFullName} (checked ${allRepos.length} repos)`);
    return hasAccess;
  }
} 
import { GITHUB_CONFIG } from '../config/github';
import type { GitHubRepo, GitHubBranch, GitHubFile, GitHubPR, GitHubOrganization } from '../config/github';
import { GitHubAuthService } from './githubAuth';

export interface ValidFile {
  path: string;
  name: string;
  type: 'schema' | 'theme-override';
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
   * Get all organizations for the authenticated user (including personal account)
   */
  static async getOrganizations(): Promise<GitHubOrganization[]> {
    const accessToken = await GitHubAuthService.getValidAccessToken();
    
    // Get user info first
    const userResponse = await fetch(`${GITHUB_CONFIG.apiBaseUrl}/user`, {
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    
    if (!userResponse.ok) {
      throw new Error(`Failed to fetch user info: ${userResponse.statusText}`);
    }
    
    const user = await userResponse.json();
    
    // Get user's organizations
    const orgsResponse = await fetch(`${GITHUB_CONFIG.apiBaseUrl}/user/orgs?per_page=100`, {
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
    
    return [personalOrg, ...orgs];
  }

  /**
   * Get all repositories for the authenticated user
   */
  static async getRepositories(): Promise<GitHubRepo[]> {
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
    
    return allRepos;
  }
  
  /**
   * Get all branches for a repository
   */
  static async getBranches(repo: string): Promise<GitHubBranch[]> {
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
    
    return response.json();
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
   * Create or update a file in a repository
   */
  static async createFile(
    repo: string, 
    path: string, 
    content: string, 
    branch: string, 
    message: string = 'Update token data'
  ): Promise<void> {
    const accessToken = await GitHubAuthService.getValidAccessToken();
    
    // First, try to get the current file to get its SHA
    let sha: string | undefined;
    try {
      const currentFile = await this.getFileContent(repo, path, branch);
      sha = currentFile.sha;
    } catch (error) {
      // File doesn't exist, which is fine for creating new files
    }
    
    const body: CreateFileBody = {
      message,
      content: btoa(content), // Base64 encode content
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
      throw new Error(`Failed to create/update file: ${response.statusText}`);
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
  static async scanRepositoryForValidFiles(repo: string, branch: string): Promise<ValidFile[]> {
    const accessToken = await GitHubAuthService.getValidAccessToken();
    
    // Get all files in the repository
    const files = await this.getAllJsonFiles(repo, branch, accessToken);
    const validFiles: ValidFile[] = [];
    
    for (const file of files) {
      try {
        const content = await this.getFileContent(repo, file.path, branch);
        const fileType = this.identifyFileType(content.content);
        
        if (fileType !== 'unknown') {
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
    const response = await fetch(`${GITHUB_CONFIG.apiBaseUrl}/repos/${repo}/contents/${path}?ref=${branch}`, {
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
   * Identify if a file content matches our schemas
   */
  private static identifyFileType(content: string): 'schema' | 'theme-override' | 'unknown' {
    try {
      const data = JSON.parse(content);
      
      // Check for schema.json structure
      if (data.tokenCollections && data.dimensions && data.tokens && data.platforms) {
        return 'schema';
      }
      
      // Check for theme-override.json structure
      if (data.systemId && data.themeId && data.tokenOverrides) {
        return 'theme-override';
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
    fileType: 'schema' | 'theme-override';
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
} 
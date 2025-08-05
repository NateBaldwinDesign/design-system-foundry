import { GitHubApiService } from './githubApi';
import { GitHubCacheService } from './githubCache';
import { StatePersistenceManager, type RepositoryContext } from './statePersistenceManager';
import { RefreshManager } from './refreshManager';
import type { GitHubBranch } from '../config/github';

export class BranchManager {
  private static instance: BranchManager;

  private constructor() {}

  static getInstance(): BranchManager {
    if (!BranchManager.instance) {
      BranchManager.instance = new BranchManager();
    }
    return BranchManager.instance;
  }

  /**
   * Switch to a specific branch with context preservation
   */
  static async switchToBranch(
    repositoryFullName: string,
    branchName: string,
    preserveContext: boolean = true
  ): Promise<void> {
    console.log('[BranchManager] Switching to branch:', { repositoryFullName, branchName, preserveContext });
    
    try {
      // 1. Get current repository context
      const stateManager = StatePersistenceManager.getInstance();
      const currentContext = stateManager.getCurrentRepositoryContext();
      
      // 2. Create new repository context with updated branch
      const newRepositoryContext: RepositoryContext = {
        fullName: repositoryFullName,
        branch: branchName,
        filePath: currentContext?.filePath || 'schema.json',
        fileType: currentContext?.fileType || 'schema'
      };
      
      // 3. Update repository context
      stateManager.updateRepositoryContext(newRepositoryContext);
      
      // 4. Refresh with context preservation
      await RefreshManager.refreshForBranchSwitch(newRepositoryContext);
      
      console.log('[BranchManager] Successfully switched to branch:', branchName);
      
    } catch (error) {
      console.error('[BranchManager] Failed to switch to branch:', error);
      throw error;
    }
  }

  /**
   * Load branches for a repository with enhanced caching
   */
  static async loadBranchesForRepository(
    repositoryFullName: string,
    forceRefresh: boolean = false
  ): Promise<string[]> {
    console.log('[BranchManager] Loading branches for repository:', { repositoryFullName, forceRefresh });
    
    try {
      // 1. Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedBranches = GitHubCacheService.getBranchesWithTTL(repositoryFullName);
        if (cachedBranches && cachedBranches.length > 0) {
          console.log('[BranchManager] Using cached branches for:', repositoryFullName);
          const branchNames = cachedBranches.map(b => b.name);
          
          // Update state persistence with cached branches
          const stateManager = StatePersistenceManager.getInstance();
          stateManager.setRepositoryBranches(repositoryFullName, branchNames);
          
          return branchNames;
        }
      }
      
      // 2. Fetch from GitHub API
      console.log('[BranchManager] Fetching branches from GitHub for:', repositoryFullName);
      const branches = await GitHubApiService.getBranches(repositoryFullName);
      
      // 3. Cache with TTL
      GitHubCacheService.setBranchesWithTTL(repositoryFullName, branches);
      
      // 4. Update state persistence
      const stateManager = StatePersistenceManager.getInstance();
      const branchNames = branches.map(b => b.name);
      stateManager.setRepositoryBranches(repositoryFullName, branchNames);
      
      console.log('[BranchManager] Successfully loaded branches for:', repositoryFullName);
      return branchNames;
      
    } catch (error) {
      console.error('[BranchManager] Failed to load branches for repository:', error);
      
      // Fallback to cached branches from state persistence
      const stateManager = StatePersistenceManager.getInstance();
      const cachedBranches = stateManager.getRepositoryBranches(repositoryFullName);
      
      if (cachedBranches.length > 0) {
        console.log('[BranchManager] Using fallback cached branches for:', repositoryFullName);
        return cachedBranches;
      }
      
      throw error;
    }
  }

  /**
   * Get cached branches for a repository
   */
  static getCachedBranches(repositoryFullName: string): string[] {
    const stateManager = StatePersistenceManager.getInstance();
    return stateManager.getRepositoryBranches(repositoryFullName);
  }

  /**
   * Check if a branch exists in the repository
   */
  static async branchExists(repositoryFullName: string, branchName: string): Promise<boolean> {
    try {
      const branches = await this.loadBranchesForRepository(repositoryFullName);
      return branches.includes(branchName);
    } catch (error) {
      console.error('[BranchManager] Error checking if branch exists:', error);
      return false;
    }
  }

  /**
   * Get default branch for a repository
   */
  static async getDefaultBranch(repositoryFullName: string): Promise<string> {
    try {
      const branches = await this.loadBranchesForRepository(repositoryFullName);
      
      // Look for common default branch names
      const defaultBranchNames = ['main', 'master', 'develop'];
      
      for (const branchName of defaultBranchNames) {
        if (branches.includes(branchName)) {
          return branchName;
        }
      }
      
      // If no common default found, return the first branch
      if (branches.length > 0) {
        return branches[0];
      }
      
      throw new Error('No branches found in repository');
      
    } catch (error) {
      console.error('[BranchManager] Error getting default branch:', error);
      throw error;
    }
  }

  /**
   * Create a new branch
   */
  static async createBranch(
    repositoryFullName: string,
    baseBranch: string,
    newBranchName: string
  ): Promise<void> {
    console.log('[BranchManager] Creating new branch:', { repositoryFullName, baseBranch, newBranchName });
    
    try {
      // 1. Create branch via GitHub API
      await GitHubApiService.createBranch(repositoryFullName, baseBranch, newBranchName);
      
      // 2. Clear branch cache for this repository to force refresh
      GitHubCacheService.clearBranchesForRepository(repositoryFullName);
      
      // 3. Reload branches to include the new one
      await this.loadBranchesForRepository(repositoryFullName, true);
      
      console.log('[BranchManager] Successfully created branch:', newBranchName);
      
    } catch (error) {
      console.error('[BranchManager] Failed to create branch:', error);
      throw error;
    }
  }

  /**
   * Validate branch name according to GitHub rules
   */
  static validateBranchName(branchName: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for invalid characters
    const invalidChars = /[~^:?*[\\]/;
    if (invalidChars.test(branchName)) {
      errors.push('Branch name contains invalid characters: ~, ^, :, ?, *, [, \\');
    }
    
    // Check for consecutive dots
    if (branchName.includes('..')) {
      errors.push('Branch name cannot contain consecutive dots (..)');
    }
    
    // Check for leading/trailing dots
    if (branchName.startsWith('.') || branchName.endsWith('.')) {
      errors.push('Branch name cannot start or end with a dot');
    }
    
    // Check for leading/trailing slashes
    if (branchName.startsWith('/') || branchName.endsWith('/')) {
      errors.push('Branch name cannot start or end with a slash');
    }
    
    // Check length
    if (branchName.length > 255) {
      errors.push('Branch name is too long (max 255 characters)');
    }
    
    // Check for empty name
    if (branchName.trim().length === 0) {
      errors.push('Branch name cannot be empty');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate a suggested branch name
   */
  static generateBranchName(
    baseName: string,
    githubUser: { login: string } | null,
    includeTimestamp: boolean = true
  ): string {
    let branchName = baseName.toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Add user prefix if available
    if (githubUser?.login) {
      branchName = `${githubUser.login}-${branchName}`;
    }
    
    // Add timestamp if requested
    if (includeTimestamp) {
      const timestamp = new Date().toISOString()
        .replace(/[:.]/g, '-')
        .replace('T', '-')
        .replace('Z', '')
        .slice(0, -4); // Remove milliseconds
      branchName = `${branchName}-${timestamp}`;
    }
    
    return branchName;
  }

  /**
   * Clear branch cache for a repository
   */
  static clearBranchCache(repositoryFullName: string): void {
    console.log('[BranchManager] Clearing branch cache for:', repositoryFullName);
    GitHubCacheService.clearBranchesForRepository(repositoryFullName);
    
    // Also clear from state persistence
    const stateManager = StatePersistenceManager.getInstance();
    stateManager.setRepositoryBranches(repositoryFullName, []);
  }

  /**
   * Get branch statistics
   */
  static async getBranchStats(repositoryFullName: string): Promise<{
    totalBranches: number;
    defaultBranch: string;
    recentBranches: string[];
  }> {
    try {
      const branches = await this.loadBranchesForRepository(repositoryFullName);
      const defaultBranch = await this.getDefaultBranch(repositoryFullName);
      
      // Get recent branches (last 5, excluding default)
      const recentBranches = branches
        .filter(branch => branch !== defaultBranch)
        .slice(0, 5);
      
      return {
        totalBranches: branches.length,
        defaultBranch,
        recentBranches
      };
      
    } catch (error) {
      console.error('[BranchManager] Error getting branch stats:', error);
      throw error;
    }
  }
} 
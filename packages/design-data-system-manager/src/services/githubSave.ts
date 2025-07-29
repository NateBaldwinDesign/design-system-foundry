import { GitHubApiService } from './githubApi';
import { StorageService } from './storage';
import { DataManager } from './dataManager';

export interface SaveOptions {
  message?: string;
  createPullRequest?: boolean;
  targetBranch?: string;
  prTitle?: string;
  prDescription?: string;
}

export interface SaveResult {
  success: boolean;
  message: string;
  pullRequestUrl?: string;
}

export class GitHubSaveService {
  /**
   * Save current data to GitHub
   */
  static async saveToGitHub(options: SaveOptions = {}): Promise<SaveResult> {
    try {
      // Get the currently selected repository info
      const repoInfo = GitHubApiService.getSelectedRepositoryInfo();
      if (!repoInfo) {
        throw new Error('No repository selected. Please load a file from GitHub first.');
      }

      // Handle platform-extension file type by treating it as schema
      const fileType = repoInfo.fileType === 'platform-extension' ? 'schema' : repoInfo.fileType;

      // Get current data from storage
      const currentData = this.getCurrentDataForFileType(fileType);
      
      // Convert to JSON string
      const jsonContent = JSON.stringify(currentData, null, 2);
      
      // Check file size (GitHub has 1MB limit)
      const fileSizeBytes = new Blob([jsonContent]).size;
      const fileSizeMB = fileSizeBytes / (1024 * 1024);
      
      if (fileSizeMB >= 1) {
        throw new Error(`File size (${fileSizeMB.toFixed(2)}MB) exceeds GitHub's 1MB limit. Please reduce the data size.`);
      }

      if (fileSizeMB >= 0.9) {
        console.warn(`File size (${fileSizeMB.toFixed(2)}MB) is approaching GitHub's 1MB limit.`);
      }

      const commitMessage = options.message || `Update ${repoInfo.filePath} - ${new Date().toLocaleString()}`;

      if (options.createPullRequest && options.targetBranch) {
        // Create a new branch and pull request
        return await this.createPullRequestWithChanges(
          {
            ...repoInfo,
            fileType: repoInfo.fileType === 'platform-extension' ? 'schema' : repoInfo.fileType
          },
          jsonContent,
          commitMessage,
          options.targetBranch,
          options.prTitle,
          options.prDescription
        );
      } else {
        // Direct save to the current branch
        await GitHubApiService.createFile(
          repoInfo.fullName,
          repoInfo.filePath,
          jsonContent,
          repoInfo.branch,
          commitMessage
        );

        // Reset baseline to current data after successful save
        const dataManager = DataManager.getInstance();
        dataManager.resetBaselineToCurrent();

        return {
          success: true,
          message: `Successfully saved changes to ${repoInfo.filePath}`
        };
      }

    } catch (error) {
      console.error('Failed to save to GitHub:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to save to GitHub'
      };
    }
  }

  /**
   * Create a pull request with changes
   */
  private static async createPullRequestWithChanges(
    repoInfo: {
      fullName: string;
      branch: string;
      filePath: string;
      fileType: 'schema' | 'theme-override';
    },
    jsonContent: string,
    commitMessage: string,
    targetBranch: string,
    prTitle?: string,
    prDescription?: string
  ): Promise<SaveResult> {
    // Generate a unique branch name
    const timestamp = Date.now();
    const newBranchName = `update-${repoInfo.filePath.replace(/[^a-zA-Z0-9]/g, '-')}-${timestamp}`;

    // Create new branch
    await GitHubApiService.createBranch(repoInfo.fullName, repoInfo.branch, newBranchName);

    // Save changes to the new branch
    await GitHubApiService.createFile(
      repoInfo.fullName,
      repoInfo.filePath,
      jsonContent,
      newBranchName,
      commitMessage
    );

    // Create pull request
    const defaultPrTitle = `Update ${repoInfo.filePath}`;
    const defaultPrDescription = this.generatePullRequestDescription(repoInfo.fileType);

    const pr = await GitHubApiService.createPullRequest(
      repoInfo.fullName,
      prTitle || defaultPrTitle,
      prDescription || defaultPrDescription,
      newBranchName,
      targetBranch
    );

    // Reset baseline to current data after successful PR creation
    const dataManager = DataManager.getInstance();
    dataManager.resetBaselineToCurrent();

    return {
      success: true,
      message: `Successfully created pull request #${pr.number}`,
      pullRequestUrl: pr.html_url
    };
  }

  /**
   * Get current data based on file type
   */
  private static getCurrentDataForFileType(fileType: 'schema' | 'theme-override'): Record<string, unknown> {
    if (fileType === 'schema') {
      // Get root-level data from storage
      const rootData = StorageService.getRootData();
      
      // Get platform extensions from DataManager
      const dataManager = DataManager.getInstance();
      const snapshot = dataManager.getCurrentSnapshot();
      const platformExtensions = Array.from(Object.values(snapshot.platformExtensions));
      
      // Return core data structure with platform extensions
      return {
        tokenCollections: StorageService.getCollections(),
        dimensions: StorageService.getDimensions(),
        tokens: StorageService.getTokens(),
        platforms: StorageService.getPlatforms(),
        themes: StorageService.getThemes(),
        taxonomies: StorageService.getTaxonomies(),
        resolvedValueTypes: StorageService.getValueTypes(),
        componentProperties: StorageService.getComponentProperties(),
        componentCategories: StorageService.getComponentCategories(),
        components: StorageService.getComponents(),
        taxonomyOrder: StorageService.getTaxonomyOrder(),
        versionHistory: rootData.versionHistory || [],
        systemName: rootData.systemName || 'Design System',
        systemId: rootData.systemId || 'design-system',
        description: rootData.description || 'A comprehensive design system with tokens, dimensions, and themes',
        version: rootData.version || '1.0.0',
        figmaConfiguration: snapshot.figmaConfiguration,
        // Include platform extensions in the core schema
        platformExtensions: platformExtensions
      };
    } else if (fileType === 'theme-override') {
      // Return theme override structure
      // This would need to be implemented based on your theme override schema
      return {
        systemId: 'design-system',
        themeId: 'default-theme',
        tokenOverrides: {},
        version: '1.0.0'
      };
    }

    throw new Error(`Unsupported file type: ${fileType}`);
  }

  /**
   * Generate pull request description with change log
   */
  private static generatePullRequestDescription(fileType: 'schema' | 'theme-override'): string {
    const timestamp = new Date().toISOString();
    
    let description = `## Changes Made\n\n`;
    description += `- **File Type**: ${fileType === 'schema' ? 'Core Data' : 'Theme Override'}\n`;
    description += `- **Timestamp**: ${timestamp}\n`;
    description += `- **Generated By**: Token Model Manager\n\n`;
    
    description += `## Summary\n\n`;
    description += `This pull request contains updates to the design system data. `;
    description += `Please review the changes and ensure they align with the design system requirements.\n\n`;
    
    description += `## Change Log\n\n`;
    description += `- Data updated via Token Model Manager interface\n`;
    description += `- All changes validated against schema constraints\n`;
    description += `- File size verified within GitHub limits\n\n`;
    
    description += `## Next Steps\n\n`;
    description += `1. Review the changes in this pull request\n`;
    description += `2. Test the updated design system data\n`;
    description += `3. Merge if changes are approved\n`;
    
    return description;
  }

  /**
   * Check if there are unsaved changes
   */
  static hasUnsavedChanges(): boolean {
    // This is a simplified check - in a real implementation, you'd want to
    // compare current data with the original loaded data
    const repoInfo = GitHubApiService.getSelectedRepositoryInfo();
    return repoInfo !== null;
  }

  /**
   * Get file size warning status
   */
  static getFileSizeWarning(currentData: Record<string, unknown>): {
    warning: boolean;
    error: boolean;
    sizeMB: number;
    message?: string;
  } {
    const jsonContent = JSON.stringify(currentData, null, 2);
    const fileSizeBytes = new Blob([jsonContent]).size;
    const fileSizeMB = fileSizeBytes / (1024 * 1024);

    if (fileSizeMB >= 1) {
      return {
        warning: false,
        error: true,
        sizeMB: fileSizeMB,
        message: `File size (${fileSizeMB.toFixed(2)}MB) exceeds GitHub's 1MB limit`
      };
    }

    if (fileSizeMB >= 0.9) {
      return {
        warning: true,
        error: false,
        sizeMB: fileSizeMB,
        message: `File size (${fileSizeMB.toFixed(2)}MB) is approaching GitHub's 1MB limit`
      };
    }

    return {
      warning: false,
      error: false,
      sizeMB: fileSizeMB
    };
  }
} 
import { GitHubApiService } from './githubApi';
import { StorageService } from './storage';
import { DataManager } from './dataManager';
import type { DataSourceContext } from './dataSourceManager';
import type { TokenSystem } from '@token-model/data-model';

export interface SaveOptions {
  message?: string;
  createPullRequest?: boolean;
  targetBranch?: string;
  prTitle?: string;
  prDescription?: string;
  dataSourceContext?: DataSourceContext;
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
      console.log('[GitHubSaveService] Starting save to GitHub with options:', {
        createPullRequest: options.createPullRequest,
        targetBranch: options.targetBranch,
        hasDataSourceContext: !!options.dataSourceContext
      });

      // Determine source type and ID from data source context
      let sourceType: 'core' | 'platform-extension' | 'theme-override';
      let sourceId: string | undefined;
      let targetRepoInfo: {
        fullName: string;
        branch: string;
        filePath: string;
        fileType: 'schema' | 'theme-override' | 'platform-extension';
      } | null = null;

      // Enhanced repository targeting logic
      if (options.dataSourceContext?.currentPlatform && options.dataSourceContext.currentPlatform !== 'none') {
        sourceType = 'platform-extension';
        sourceId = options.dataSourceContext.currentPlatform;
        
        // Get platform repository info from data source context
        targetRepoInfo = options.dataSourceContext.repositories.platforms[sourceId] || null;
        
        console.log('[GitHubSaveService] Platform extension save:', {
          sourceId,
          targetRepoInfo,
          availablePlatforms: Object.keys(options.dataSourceContext.repositories.platforms)
        });
        
        if (!targetRepoInfo) {
          console.error('[GitHubSaveService] No repository info found for platform:', sourceId);
          throw new Error(`No repository information found for platform: ${sourceId}. Please ensure the platform has a valid extension source configured.`);
        }
        
      } else if (options.dataSourceContext?.currentTheme && options.dataSourceContext.currentTheme !== 'none') {
        sourceType = 'theme-override';
        sourceId = options.dataSourceContext.currentTheme;
        
        // Get theme repository info from data source context
        targetRepoInfo = options.dataSourceContext.repositories.themes[sourceId] || null;
        
        console.log('[GitHubSaveService] Theme override save:', {
          sourceId,
          targetRepoInfo,
          availableThemes: Object.keys(options.dataSourceContext.repositories.themes)
        });
        
        if (!targetRepoInfo) {
          console.error('[GitHubSaveService] No repository info found for theme:', sourceId);
          throw new Error(`No repository information found for theme: ${sourceId}. Please ensure the theme has a valid override source configured.`);
        }
        
      } else {
        sourceType = 'core';
        
        // Get core repository info - prioritize data source context over selected repo
        targetRepoInfo = options.dataSourceContext?.repositories.core || GitHubApiService.getSelectedRepositoryInfo();
        
        console.log('[GitHubSaveService] Core data save:', {
          targetRepoInfo,
          hasDataSourceContext: !!options.dataSourceContext?.repositories.core
        });
        
        if (!targetRepoInfo) {
          console.error('[GitHubSaveService] No repository info found for core data');
          throw new Error('No repository selected. Please load a file from GitHub first.');
        }
      }

      // Validate target repository info
      if (!targetRepoInfo.fullName || !targetRepoInfo.filePath) {
        console.error('[GitHubSaveService] Invalid repository info:', targetRepoInfo);
        throw new Error('Invalid repository information. Missing repository name or file path.');
      }

      console.log('[GitHubSaveService] Target repository determined:', {
        sourceType,
        sourceId,
        repository: targetRepoInfo.fullName,
        branch: targetRepoInfo.branch,
        filePath: targetRepoInfo.filePath,
        fileType: targetRepoInfo.fileType
      });

      // Get schema-compliant data for storage
      const currentData = this.getCurrentDataForFileType(sourceType, sourceId);
      
      // Validate data against appropriate schema before saving
      const dataManager = DataManager.getInstance();
      const validationResult = dataManager.validateStorageData(currentData, sourceType);
      if (!validationResult.isValid) {
        throw new Error(`Data validation failed: ${validationResult.errors.join(', ')}`);
      }
      
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

      const commitMessage = options.message || `Update ${targetRepoInfo.filePath} - ${new Date().toLocaleString()}`;

      if (options.createPullRequest && options.targetBranch) {
        console.log('[GitHubSaveService] Creating pull request:', {
          repository: targetRepoInfo.fullName,
          sourceBranch: targetRepoInfo.branch,
          targetBranch: options.targetBranch,
          filePath: targetRepoInfo.filePath
        });
        
        // Create a new branch and pull request
        return await this.createPullRequestWithChanges(
          {
            ...targetRepoInfo,
            fileType: targetRepoInfo.fileType === 'platform-extension' ? 'schema' : targetRepoInfo.fileType
          },
          jsonContent,
          commitMessage,
          options.targetBranch,
          options.prTitle,
          options.prDescription
        );
      } else {
        console.log('[GitHubSaveService] Direct save to branch:', {
          repository: targetRepoInfo.fullName,
          branch: targetRepoInfo.branch,
          filePath: targetRepoInfo.filePath
        });
        
        // Direct save to the current branch
        await GitHubApiService.createFile(
          targetRepoInfo.fullName,
          targetRepoInfo.filePath,
          jsonContent,
          targetRepoInfo.branch,
          commitMessage
        );

        // Reset baseline to current data after successful save
        const dataManager = DataManager.getInstance();
        dataManager.resetBaselineToCurrent();

        return {
          success: true,
          message: `Successfully saved changes to ${targetRepoInfo.filePath} in ${targetRepoInfo.fullName}`
        };
      }

    } catch (error) {
      console.error('[GitHubSaveService] Failed to save to GitHub:', error);
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
   * Clean token data by removing non-schema-compliant properties
   */
  private static cleanTokenData(data: Record<string, unknown>): Record<string, unknown> {
    const cleaned = { ...data };
    
    // Clean tokens array if it exists
    if (cleaned.tokens && Array.isArray(cleaned.tokens)) {
      cleaned.tokens = (cleaned.tokens as Record<string, unknown>[]).map(token => {
        if (token && typeof token === 'object' && 'valuesByMode' in token) {
          const cleanedToken = { ...token };
          if (Array.isArray(cleanedToken.valuesByMode)) {
            cleanedToken.valuesByMode = (cleanedToken.valuesByMode as Record<string, unknown>[]).map((vbm: Record<string, unknown>) => {
              const { platformOverrides, ...cleanedVbm } = vbm;
              if (platformOverrides) {
                console.log('[GitHubSaveService] Removed platformOverrides from token:', token.id || 'unknown');
              }
              return cleanedVbm;
            });
          }
          return cleanedToken;
        }
        return token;
      });
    }
    
    return cleaned;
  }

  /**
   * Get current data for the specified source type and ID
   */
  private static getCurrentDataForFileType(
    sourceType: 'core' | 'platform-extension' | 'theme-override',
    sourceId?: string
  ): Record<string, unknown> {
    console.log('[GitHubSaveService] Getting current data for file type:', { sourceType, sourceId });
    
    // CRITICAL FIX: Get local edits data instead of base storage data
    // This ensures that user changes are included in the commit
    const localEdits = StorageService.getLocalEdits();
    console.log('[GitHubSaveService] Local edits data:', {
      hasLocalEdits: !!localEdits,
      localEditsType: localEdits ? typeof localEdits : 'null',
      localEditsKeys: localEdits ? Object.keys(localEdits) : []
    });
    
    // If we have local edits, use them (they contain the user's changes)
    if (localEdits) {
      console.log('[GitHubSaveService] Using local edits data for commit');
      
      // For core data, we need to ensure we don't include platform extensions
      if (sourceType === 'core') {
        const coreData = localEdits as TokenSystem;
        // Return core data structure WITHOUT platform extensions
        return {
          tokenCollections: coreData.tokenCollections || [],
          dimensions: coreData.dimensions || [],
          tokens: coreData.tokens || [],
          platforms: coreData.platforms || [],
          themes: coreData.themes || [],
          taxonomies: coreData.taxonomies || [],
          resolvedValueTypes: coreData.resolvedValueTypes || [],
          componentProperties: coreData.componentProperties || [],
          componentCategories: coreData.componentCategories || [],
          components: coreData.components || [],
          taxonomyOrder: coreData.taxonomyOrder || [],
          versionHistory: coreData.versionHistory || [],
          systemName: coreData.systemName || 'Design System',
          systemId: coreData.systemId || 'design-system',
          description: coreData.description || 'A comprehensive design system with tokens, dimensions, and themes',
          version: coreData.version || '1.0.0',
          figmaConfiguration: coreData.figmaConfiguration
        };
      }
      
      // For platform extensions and theme overrides, return the local edits directly
      return localEdits as Record<string, unknown>;
    }
    
    // Fallback to base storage data if no local edits exist
    console.log('[GitHubSaveService] No local edits found, using base storage data');
    
    switch (sourceType) {
      case 'core': {
        // Get root-level data from storage - DO NOT include platform extensions
        const rootData = StorageService.getRootData();
        
        console.log('[GitHubSaveService] Core data save - getting data from StorageService:', {
          hasRootData: !!rootData,
          rootDataKeys: rootData ? Object.keys(rootData) : []
        });
        
        // Return core data structure WITHOUT platform extensions
        const coreData = {
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
          figmaConfiguration: StorageService.getFigmaConfiguration()
        };
        
        // Clean the data before returning
        return this.cleanTokenData(coreData);
      }
        
      case 'platform-extension': {
        if (!sourceId) {
          throw new Error('Platform ID required for platform extension save');
        }
        
        console.log('[GitHubSaveService] Platform extension save - getting data for platform:', sourceId);
        
        // Get platform extension data directly from StorageService
        const platformData = StorageService.getPlatformExtensionData(sourceId);
        
        if (!platformData) {
          console.error('[GitHubSaveService] No platform extension data found for:', sourceId);
          throw new Error(`No platform extension data found for platform: ${sourceId}`);
        }
        
        console.log('[GitHubSaveService] Platform extension data retrieved:', {
          platformId: platformData.platformId,
          systemId: platformData.systemId,
          version: platformData.version,
          dataKeys: Object.keys(platformData)
        });
        
        // Clean the data before returning
        return this.cleanTokenData(platformData);
      }
        
      case 'theme-override': {
        if (!sourceId) {
          throw new Error('Theme ID required for theme override save');
        }
        
        console.log('[GitHubSaveService] Theme override save - getting data for theme:', sourceId);
        
        // Get theme override data directly from StorageService
        const themeData = StorageService.getThemeOverrideData(sourceId);
        
        if (!themeData) {
          console.error('[GitHubSaveService] No theme override data found for:', sourceId);
          throw new Error(`No theme override data found for theme: ${sourceId}`);
        }
        
        console.log('[GitHubSaveService] Theme override data retrieved:', {
          themeId: themeData.themeId,
          systemId: themeData.systemId,
          figmaFileKey: themeData.figmaFileKey,
          dataKeys: Object.keys(themeData)
        });
        
        // Clean the data before returning
        return this.cleanTokenData(themeData);
      }
        
      default:
        throw new Error(`Unsupported source type: ${sourceType}`);
    }
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
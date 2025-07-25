import { StorageService } from './storage';
import { GitHubApiService } from './githubApi';
import type { Platform } from '@token-model/data-model';

export interface PlatformExtensionSource {
  repositoryUri: string;
  filePath: string;
}

export interface PlatformSourceValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  duplicateSources?: Array<{
    platformId: string;
    displayName: string;
    source: PlatformExtensionSource;
  }>;
}

export interface SourceValidationResult {
  exists: boolean;
  error?: string;
  updatedPath?: string;
}

export class PlatformSourceValidationService {
  /**
   * Validates that platform extension sources are unique across all platforms
   */
  static validateUniqueExtensionSources(): PlatformSourceValidationResult {
    const result: PlatformSourceValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      duplicateSources: []
    };

    try {
      const platforms = StorageService.getPlatforms();

      // Collect all extension sources
      const extensionSources = new Map<string, Array<{ platformId: string; displayName: string; source: PlatformExtensionSource }>>();

      platforms.forEach((platform: Platform) => {
        if (platform.extensionSource) {
          const sourceKey = `${platform.extensionSource.repositoryUri}:${platform.extensionSource.filePath}`;

          if (!extensionSources.has(sourceKey)) {
            extensionSources.set(sourceKey, []);
          }

          extensionSources.get(sourceKey)!.push({
            platformId: platform.id,
            displayName: platform.displayName,
            source: platform.extensionSource
          });
        }
      });

      // Check for duplicates
      extensionSources.forEach((platforms, sourceKey) => {
        if (platforms.length > 1) {
          result.isValid = false;
          result.errors.push(
            `Duplicate extension source found: ${sourceKey}. Used by platforms: ${platforms.map(p => p.displayName).join(', ')}`
          );
          result.duplicateSources = result.duplicateSources || [];
          result.duplicateSources.push(...platforms);
        }
      });

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Checks if a specific extension source is already in use by another platform
   */
  static isExtensionSourceInUse(
    repositoryUri: string,
    filePath: string,
    excludePlatformId?: string
  ): { inUse: boolean; existingPlatform?: { id: string; displayName: string } } {
    try {
      const platforms = StorageService.getPlatforms();

      const existingPlatform = platforms.find((platform: Platform) => {
        // Skip the platform we're editing (if provided)
        if (excludePlatformId && platform.id === excludePlatformId) {
          return false;
        }

        return platform.extensionSource &&
               platform.extensionSource.repositoryUri === repositoryUri &&
               platform.extensionSource.filePath === filePath;
      });

      if (existingPlatform) {
        return {
          inUse: true,
          existingPlatform: {
            id: existingPlatform.id,
            displayName: existingPlatform.displayName
          }
        };
      }

      return { inUse: false };
    } catch (error) {
      console.error('Error checking extension source usage:', error);
      return { inUse: false };
    }
  }

  /**
   * Validates a single extension source against existing platforms
   */
  static validateExtensionSource(
    repositoryUri: string,
    filePath: string,
    excludePlatformId?: string
  ): { isValid: boolean; error?: string } {
    if (!repositoryUri.trim()) {
      return { isValid: false, error: 'Repository URI is required' };
    }

    if (!filePath.trim()) {
      return { isValid: false, error: 'File path is required' };
    }

    const usageCheck = this.isExtensionSourceInUse(repositoryUri, filePath, excludePlatformId);

    if (usageCheck.inUse && usageCheck.existingPlatform) {
      return {
        isValid: false,
        error: `This file is already linked to platform "${usageCheck.existingPlatform.displayName}" (${usageCheck.existingPlatform.id})`
      };
    }

    return { isValid: true };
  }

  /**
   * Validates if an external repository exists
   */
  static async validateExternalRepository(
    repositoryUri: string,
    filePath: string,
    branch: string = 'main'
  ): Promise<SourceValidationResult> {
    try {
      console.log(`[PlatformSourceValidationService] Validating external repository: ${repositoryUri}/${filePath}`);

      // Try to get the file content - this will fail if repository or file doesn't exist
      await GitHubApiService.getFileContent(repositoryUri, filePath, branch);

      return { exists: true };
    } catch (error) {
      console.warn(`[PlatformSourceValidationService] External repository validation failed:`, error);

      if (error instanceof Error) {
        if (error.message.includes('404') || error.message.includes('Not Found')) {
          return {
            exists: false,
            error: `Repository or file not found. The repository may have been moved or deleted.`
          };
        }
        return {
          exists: false,
          error: `Failed to access repository: ${error.message}`
        };
      }

      return {
        exists: false,
        error: 'Failed to validate external repository'
      };
    }
  }

  /**
   * Validates if a local file exists and finds it if it has been moved
   */
  static async validateLocalFile(
    filePath: string,
    platformId: string,
    systemId: string
  ): Promise<SourceValidationResult> {
    try {
      console.log(`[PlatformSourceValidationService] Validating local file: ${filePath}`);

      // Get current repository info
      const repoInfo = GitHubApiService.getSelectedRepositoryInfo();
      if (!repoInfo) {
        return {
          exists: false,
          error: 'No repository selected. Please load a file from GitHub first.'
        };
      }

      // Try to get the file content - this will fail if file doesn't exist
      try {
        await GitHubApiService.getFileContent(repoInfo.fullName, filePath, repoInfo.branch);
        return { exists: true };
      } catch (error) {
        // File doesn't exist at the specified path, try to find it
        console.log(`[PlatformSourceValidationService] File not found at ${filePath}, searching for it...`);

        const updatedPath = await this.findPlatformExtensionFile(
          repoInfo.fullName,
          repoInfo.branch,
          platformId,
          systemId
        );

        if (updatedPath) {
          return {
            exists: true,
            updatedPath: updatedPath
          };
        }

        return {
          exists: false,
          error: `Platform extension file not found. The file may have been moved or deleted.`
        };
      }
    } catch (error) {
      console.error(`[PlatformSourceValidationService] Local file validation failed:`, error);
      return {
        exists: false,
        error: error instanceof Error ? error.message : 'Failed to validate local file'
      };
    }
  }

  /**
   * Finds a platform extension file by platformId and systemId
   */
  private static async findPlatformExtensionFile(
    repositoryUri: string,
    branch: string,
    platformId: string,
    systemId: string
  ): Promise<string | null> {
    try {
      console.log(`[PlatformSourceValidationService] Searching for platform extension file: ${platformId} in ${systemId}`);

      // Scan repository for valid files
      const validFiles = await GitHubApiService.scanRepositoryForValidFiles(repositoryUri, branch, systemId);

      // Filter for platform extension files
      const platformFiles = validFiles.filter(file => file.type === 'platform-extension');

      console.log(`[PlatformSourceValidationService] Found ${platformFiles.length} platform extension files`);

      // Check each platform extension file for matching platformId and systemId
      for (const file of platformFiles) {
        try {
          const fileContent = await GitHubApiService.getFileContent(repositoryUri, file.path, branch);
          if (fileContent && fileContent.content) {
            const data = JSON.parse(fileContent.content);

            if (data.platformId === platformId && data.systemId === systemId) {
              console.log(`[PlatformSourceValidationService] Found matching file: ${file.path}`);
              return file.path;
            }
          }
        } catch (error) {
          console.warn(`[PlatformSourceValidationService] Failed to parse file ${file.path}:`, error);
          continue;
        }
      }

      console.log(`[PlatformSourceValidationService] No matching platform extension file found`);
      return null;
    } catch (error) {
      console.error(`[PlatformSourceValidationService] Failed to search for platform extension file:`, error);
      return null;
    }
  }
} 
import { PlatformExtensionDataService } from './platformExtensionDataService';
import type { Platform } from '@token-model/data-model';

export interface PlatformExtensionStatus {
  platformId: string;
  platformName: string;
  hasError: boolean;
  errorType?: 'file-not-found' | 'repository-not-found' | 'validation-error';
  errorMessage?: string;
  isLocal: boolean;
  repositoryUri?: string;
  filePath?: string;
}

export class PlatformExtensionStatusService {
  private static instance: PlatformExtensionStatusService;
  private cache = new Map<string, { data: PlatformExtensionStatus; timestamp: number }>();
  private CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

  static getInstance(): PlatformExtensionStatusService {
    if (!PlatformExtensionStatusService.instance) {
      PlatformExtensionStatusService.instance = new PlatformExtensionStatusService();
    }
    return PlatformExtensionStatusService.instance;
  }

  async getPlatformExtensionStatus(platform: Platform): Promise<PlatformExtensionStatus> {
    const cacheKey = `platform-status-${platform.id}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    const status = await this.checkPlatformExtensionStatus(platform);
    
    // Cache the result
    this.cache.set(cacheKey, { data: status, timestamp: Date.now() });
    
    return status;
  }

  async getPlatformsExtensionStatus(platforms: Platform[]): Promise<PlatformExtensionStatus[]> {
    const statusPromises = platforms.map(platform => this.getPlatformExtensionStatus(platform));
    return Promise.all(statusPromises);
  }

  private async checkPlatformExtensionStatus(platform: Platform): Promise<PlatformExtensionStatus> {
    // If platform has no extension source, it's not an error
    if (!platform.extensionSource) {
      return {
        platformId: platform.id,
        platformName: platform.displayName,
        hasError: false,
        isLocal: false
      };
    }

    const isLocal = platform.extensionSource.repositoryUri === 'local';
    
    try {
      // Try to load platform extension data
      const result = await PlatformExtensionDataService.getPlatformExtensionData(
        platform.extensionSource.repositoryUri,
        platform.extensionSource.filePath,
        'main', // Default branch
        platform.id
      );

      if (result.data) {
        // For local, only github is valid; for external, any data is valid
        if (isLocal && result.source !== 'github') {
          // Local file, but not from github: error
          const errorType = 'file-not-found';
          const errorMessage = `File not found: ${platform.extensionSource.filePath}`;
          return {
            platformId: platform.id,
            platformName: platform.displayName,
            hasError: true,
            errorType,
            errorMessage,
            isLocal,
            repositoryUri: platform.extensionSource.repositoryUri,
            filePath: platform.extensionSource.filePath
          };
        }
        // Otherwise, data is valid
        return {
          platformId: platform.id,
          platformName: platform.displayName,
          hasError: false,
          isLocal,
          repositoryUri: platform.extensionSource.repositoryUri,
          filePath: platform.extensionSource.filePath
        };
      } else {
        // No data available
        const errorType = isLocal ? 'file-not-found' : 'repository-not-found';
        const errorMessage = isLocal 
          ? `File not found: ${platform.extensionSource.filePath}`
          : `Repository not found: ${platform.extensionSource.repositoryUri}`;
        return {
          platformId: platform.id,
          platformName: platform.displayName,
          hasError: true,
          errorType,
          errorMessage,
          isLocal,
          repositoryUri: platform.extensionSource.repositoryUri,
          filePath: platform.extensionSource.filePath
        };
      }
    } catch (error) {
      // Error occurred during fetch
      const errorType = isLocal ? 'file-not-found' : 'repository-not-found';
      const errorMessage = isLocal 
        ? `File not found: ${platform.extensionSource.filePath}`
        : `Repository not found: ${platform.extensionSource.repositoryUri}`;
      return {
        platformId: platform.id,
        platformName: platform.displayName,
        hasError: true,
        errorType,
        errorMessage,
        isLocal,
        repositoryUri: platform.extensionSource.repositoryUri,
        filePath: platform.extensionSource.filePath
      };
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  clearCacheForPlatform(platformId: string): void {
    const cacheKey = `platform-status-${platformId}`;
    this.cache.delete(cacheKey);
  }
} 
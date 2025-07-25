import { PlatformExtensionDataService } from './platformExtensionDataService';
import type { Platform } from '@token-model/data-model';

export interface PlatformExtensionAnalyticsSummary {
  totalPlatforms: number;
  platformsWithExtensions: number;
  totalTokenOverrides: number;
  totalAlgorithmOverrides: number;
  totalOmittedModes: number;
  totalOmittedDimensions: number;
  platformAnalytics: Array<{
    platformId: string;
    platformName: string;
    version?: string;
    tokenOverridesCount: number;
    algorithmVariableOverridesCount: number;
    omittedModesCount: number;
    omittedDimensionsCount: number;
    hasError?: boolean;
    errorType?: 'file-not-found' | 'repository-not-found' | 'validation-error';
    errorMessage?: string;
  }>;
}

export class PlatformExtensionAnalyticsService {
  private static instance: PlatformExtensionAnalyticsService;
  private cache = new Map<string, { data: PlatformExtensionAnalyticsSummary; timestamp: number }>();
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance(): PlatformExtensionAnalyticsService {
    if (!PlatformExtensionAnalyticsService.instance) {
      PlatformExtensionAnalyticsService.instance = new PlatformExtensionAnalyticsService();
    }
    return PlatformExtensionAnalyticsService.instance;
  }

  async getCachedPlatformExtensionAnalytics(platforms: Platform[]): Promise<PlatformExtensionAnalyticsSummary> {
    const cacheKey = `platform-analytics-${platforms.length}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    const analytics = await this.calculatePlatformExtensionAnalytics(platforms);
    
    // Cache the result
    this.cache.set(cacheKey, { data: analytics, timestamp: Date.now() });
    
    return analytics;
  }

  private async calculatePlatformExtensionAnalytics(platforms: Platform[]): Promise<PlatformExtensionAnalyticsSummary> {
    const platformAnalytics: PlatformExtensionAnalyticsSummary['platformAnalytics'] = [];
    let totalTokenOverrides = 0;
    let totalAlgorithmOverrides = 0;
    let totalOmittedModes = 0;
    let totalOmittedDimensions = 0;
    let platformsWithExtensions = 0;

    for (const platform of platforms) {
      // Check if platform has an extension source
      if (!platform.extensionSource) {
        platformAnalytics.push({
          platformId: platform.id,
          platformName: platform.displayName,
          tokenOverridesCount: 0,
          algorithmVariableOverridesCount: 0,
          omittedModesCount: 0,
          omittedDimensionsCount: 0,
          hasError: false
        });
        continue;
      }

      try {
        // Try to load platform extension data
        const result = await PlatformExtensionDataService.getPlatformExtensionData(
          platform.extensionSource.repositoryUri,
          platform.extensionSource.filePath,
          'main', // Default branch
          platform.id
        );

        if (result.data && result.source === 'github') {
          // Successfully fetched from GitHub
          platformsWithExtensions++;
          
          const tokenOverridesCount = result.data.tokenOverrides?.length || 0;
          const algorithmVariableOverridesCount = result.data.algorithmVariableOverrides?.length || 0;
          const omittedModesCount = result.data.omittedModes?.length || 0;
          const omittedDimensionsCount = result.data.omittedDimensions?.length || 0;

          totalTokenOverrides += tokenOverridesCount;
          totalAlgorithmOverrides += algorithmVariableOverridesCount;
          totalOmittedModes += omittedModesCount;
          totalOmittedDimensions += omittedDimensionsCount;

          platformAnalytics.push({
            platformId: platform.id,
            platformName: platform.displayName,
            version: result.data.version,
            tokenOverridesCount,
            algorithmVariableOverridesCount,
            omittedModesCount,
            omittedDimensionsCount,
            hasError: false
          });
        } else if (result.data && (result.source === 'cache' || result.source === 'localStorage')) {
          // Data available but from fallback source - treat as error for UI purposes
          const isLocalFile = platform.extensionSource.repositoryUri === 'local';
          const errorType = isLocalFile ? 'file-not-found' : 'repository-not-found';
          const errorMessage = isLocalFile 
            ? `File not found: ${platform.extensionSource.filePath}`
            : `Repository not found: ${platform.extensionSource.repositoryUri}`;

          platformAnalytics.push({
            platformId: platform.id,
            platformName: platform.displayName,
            version: result.data.version,
            tokenOverridesCount: result.data.tokenOverrides?.length || 0,
            algorithmVariableOverridesCount: result.data.algorithmVariableOverrides?.length || 0,
            omittedModesCount: result.data.omittedModes?.length || 0,
            omittedDimensionsCount: result.data.omittedDimensions?.length || 0,
            hasError: true,
            errorType,
            errorMessage
          });
          // Don't count this in totals since it's treated as an error
        } else {
          // Data not found - determine if it's a file or repository issue
          const isLocalFile = platform.extensionSource.repositoryUri === 'local';
          const errorType = isLocalFile ? 'file-not-found' : 'repository-not-found';
          const errorMessage = isLocalFile 
            ? `File not found: ${platform.extensionSource.filePath}`
            : `Repository not found: ${platform.extensionSource.repositoryUri}`;

          platformAnalytics.push({
            platformId: platform.id,
            platformName: platform.displayName,
            tokenOverridesCount: 0,
            algorithmVariableOverridesCount: 0,
            omittedModesCount: 0,
            omittedDimensionsCount: 0,
            hasError: true,
            errorType,
            errorMessage
          });
        }
      } catch (error) {
        // Handle validation or other errors
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        // Check if this is a file not found error
        let errorType: 'file-not-found' | 'repository-not-found' | 'validation-error' = 'validation-error';
        if (errorMessage.includes('404') || errorMessage.includes('Not Found') || errorMessage.includes('Failed to fetch file content')) {
          const isLocalFile = platform.extensionSource.repositoryUri === 'local';
          errorType = isLocalFile ? 'file-not-found' : 'repository-not-found';
        }
        
        platformAnalytics.push({
          platformId: platform.id,
          platformName: platform.displayName,
          tokenOverridesCount: 0,
          algorithmVariableOverridesCount: 0,
          omittedModesCount: 0,
          omittedDimensionsCount: 0,
          hasError: true,
          errorType,
          errorMessage: errorType === 'file-not-found' 
            ? `File not found: ${platform.extensionSource.filePath}`
            : errorType === 'repository-not-found'
            ? `Repository not found: ${platform.extensionSource.repositoryUri}`
            : errorMessage
        });
      }
    }

    return {
      totalPlatforms: platforms.length,
      platformsWithExtensions,
      totalTokenOverrides,
      totalAlgorithmOverrides,
      totalOmittedModes,
      totalOmittedDimensions,
      platformAnalytics
    };
  }

  clearCache(): void {
    this.cache.clear();
  }
} 
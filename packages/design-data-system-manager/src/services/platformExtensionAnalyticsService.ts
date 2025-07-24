import type { Platform } from '@token-model/data-model';
import { PlatformExtensionDataService } from './platformExtensionDataService';

export interface PlatformExtensionAnalytics {
  platformId: string;
  platformName: string;
  repositoryUri: string;
  filePath: string;
  tokenOverridesCount: number;
  algorithmVariableOverridesCount: number;
  omittedModesCount: number;
  omittedDimensionsCount: number;
  totalOverrides: number;
  hasExtensionData: boolean;
  error?: string;
}

export interface PlatformExtensionAnalyticsSummary {
  totalPlatforms: number;
  platformsWithExtensions: number;
  totalTokenOverrides: number;
  totalAlgorithmOverrides: number;
  totalOmittedModes: number;
  totalOmittedDimensions: number;
  platformAnalytics: PlatformExtensionAnalytics[];
}

export class PlatformExtensionAnalyticsService {
  private static instance: PlatformExtensionAnalyticsService;

  private constructor() {}

  public static getInstance(): PlatformExtensionAnalyticsService {
    if (!PlatformExtensionAnalyticsService.instance) {
      PlatformExtensionAnalyticsService.instance = new PlatformExtensionAnalyticsService();
    }
    return PlatformExtensionAnalyticsService.instance;
  }

  /**
   * Analyzes all platform extensions for a given set of platforms
   */
  public async analyzePlatformExtensions(platforms: Platform[]): Promise<PlatformExtensionAnalyticsSummary> {
    const platformAnalytics: PlatformExtensionAnalytics[] = [];
    let totalTokenOverrides = 0;
    let totalAlgorithmOverrides = 0;
    let totalOmittedModes = 0;
    let totalOmittedDimensions = 0;
    let platformsWithExtensions = 0;

    for (const platform of platforms) {
      const analytics = await this.analyzeSinglePlatformExtension(platform);
      platformAnalytics.push(analytics);

      if (analytics.hasExtensionData) {
        platformsWithExtensions++;
        totalTokenOverrides += analytics.tokenOverridesCount;
        totalAlgorithmOverrides += analytics.algorithmVariableOverridesCount;
        totalOmittedModes += analytics.omittedModesCount;
        totalOmittedDimensions += analytics.omittedDimensionsCount;
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

  /**
   * Analyzes a single platform extension
   */
  private async analyzeSinglePlatformExtension(platform: Platform): Promise<PlatformExtensionAnalytics> {
    const analytics: PlatformExtensionAnalytics = {
      platformId: platform.id,
      platformName: platform.displayName,
      repositoryUri: '',
      filePath: '',
      tokenOverridesCount: 0,
      algorithmVariableOverridesCount: 0,
      omittedModesCount: 0,
      omittedDimensionsCount: 0,
      totalOverrides: 0,
      hasExtensionData: false
    };

    try {
      // Check if platform has an extension source
      if (!platform.extensionSource) {
        analytics.error = 'No extension source defined';
        return analytics;
      }

      analytics.repositoryUri = platform.extensionSource.repositoryUri;
      analytics.filePath = platform.extensionSource.filePath;

      // Fetch platform extension data
      const extensionData = await PlatformExtensionDataService.getPlatformExtensionData(
        platform.extensionSource.repositoryUri,
        platform.extensionSource.filePath,
        'main', // Default branch
        platform.id
      );

      if (!extensionData) {
        analytics.error = 'Failed to fetch extension data';
        return analytics;
      }

      analytics.hasExtensionData = true;

      // Count token overrides
      analytics.tokenOverridesCount = Array.isArray(extensionData.tokenOverrides) 
        ? extensionData.tokenOverrides.length 
        : 0;

      // Count algorithm variable overrides
      analytics.algorithmVariableOverridesCount = Array.isArray(extensionData.algorithmVariableOverrides) 
        ? extensionData.algorithmVariableOverrides.length 
        : 0;

      // Count omitted modes
      analytics.omittedModesCount = Array.isArray(extensionData.omittedModes) 
        ? extensionData.omittedModes.length 
        : 0;

      // Count omitted dimensions
      analytics.omittedDimensionsCount = Array.isArray(extensionData.omittedDimensions) 
        ? extensionData.omittedDimensions.length 
        : 0;

      // Calculate total overrides
      analytics.totalOverrides = analytics.tokenOverridesCount + analytics.algorithmVariableOverridesCount;

    } catch (error) {
      analytics.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return analytics;
  }

  /**
   * Gets cached analytics for platforms (for performance)
   */
  public async getCachedPlatformExtensionAnalytics(platforms: Platform[]): Promise<PlatformExtensionAnalyticsSummary> {
    // For now, always fetch fresh data
    // In the future, this could implement caching with TTL
    return this.analyzePlatformExtensions(platforms);
  }
} 
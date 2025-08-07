import { ThemeOverrideDataService } from './themeOverrideDataService';
import type { Theme, Token } from '@token-model/data-model';

export interface ThemeAnalyticsSummary {
  totalThemes: number;
  themesWithOverrides: number;
  totalTokenOverrides: number;
  themeableTokensInCore: number;
  themeAnalytics: Array<{
    themeId: string;
    themeName: string;
    version?: string;
    tokenOverridesCount: number;
    percentOfThemeableTokens: number;
    hasError?: boolean;
    errorType?: 'file-not-found' | 'repository-not-found' | 'validation-error' | 'private-repository';
    errorMessage?: string;
  }>;
}

export class ThemeAnalyticsService {
  private static instance: ThemeAnalyticsService;
  private cache = new Map<string, { data: ThemeAnalyticsSummary; timestamp: number }>();
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance(): ThemeAnalyticsService {
    if (!ThemeAnalyticsService.instance) {
      ThemeAnalyticsService.instance = new ThemeAnalyticsService();
    }
    return ThemeAnalyticsService.instance;
  }

  async getCachedThemeAnalytics(themes: Theme[], coreTokens: Token[]): Promise<ThemeAnalyticsSummary> {
    // Create a cache key that includes theme IDs and extension sources
    const themeSignature = themes.map(t => {
      const overrideSource = t.overrideSource 
        ? `${t.overrideSource.repositoryUri}:${t.overrideSource.filePath}`
        : 'no-override';
      return `${t.id}:${overrideSource}`;
    }).join('|');
    
    const tokenSignature = coreTokens.length.toString();
    const cacheKey = `theme-analytics-${themes.length}-${tokenSignature}-${themeSignature}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    const analytics = await this.calculateThemeAnalytics(themes, coreTokens);
    
    // Cache the result
    this.cache.set(cacheKey, { data: analytics, timestamp: Date.now() });
    
    return analytics;
  }

  private async calculateThemeAnalytics(themes: Theme[], coreTokens: Token[]): Promise<ThemeAnalyticsSummary> {
    const themeAnalytics: ThemeAnalyticsSummary['themeAnalytics'] = [];
    let totalTokenOverrides = 0;
    let themesWithOverrides = 0;
    
    // Calculate themeable tokens in core data
    const themeableTokensInCore = coreTokens.filter(token => token.themeable).length;

    for (const theme of themes) {
      // Check if theme has an override source
      if (!theme.overrideSource) {
        themeAnalytics.push({
          themeId: theme.id,
          themeName: theme.displayName,
          tokenOverridesCount: 0,
          percentOfThemeableTokens: 0,
          hasError: false
        });
        continue;
      }

      try {
        // Try to load theme override data
        const result = await ThemeOverrideDataService.getThemeOverrideData(
          theme.overrideSource.repositoryUri,
          theme.overrideSource.filePath,
          'main', // Default branch
          theme.id
        );

        if (result.data && (result.source === 'github' || result.source === 'cache')) {
          // Successfully fetched from GitHub or cache
          const tokenOverridesCount = result.data.tokenOverrides?.length || 0;
          
          if (tokenOverridesCount > 0) {
            themesWithOverrides++;
            totalTokenOverrides += tokenOverridesCount;
          }
          
          const percentOfThemeableTokens = themeableTokensInCore > 0 
            ? (tokenOverridesCount / themeableTokensInCore) * 100 
            : 0;

          themeAnalytics.push({
            themeId: theme.id,
            themeName: theme.displayName,
            version: result.data.version,
            tokenOverridesCount,
            percentOfThemeableTokens,
            hasError: false
          });
        } else {
          // No data found
          themeAnalytics.push({
            themeId: theme.id,
            themeName: theme.displayName,
            tokenOverridesCount: 0,
            percentOfThemeableTokens: 0,
            hasError: true,
            errorType: 'file-not-found',
            errorMessage: 'Theme override file not found'
          });
        }
      } catch (error) {
        console.error(`Error loading theme override data for ${theme.displayName}:`, error);
        
        let errorType: 'file-not-found' | 'repository-not-found' | 'validation-error' | 'private-repository' = 'file-not-found';
        let errorMessage = 'Unknown error occurred';
        
        if (error instanceof Error) {
          if (error.message.includes('404') || error.message.includes('not found')) {
            errorType = 'file-not-found';
            errorMessage = 'Theme override file not found';
          } else if (error.message.includes('403') || error.message.includes('private')) {
            errorType = 'private-repository';
            errorMessage = 'Private repository - sign in with GitHub to access';
          } else if (error.message.includes('validation')) {
            errorType = 'validation-error';
            errorMessage = 'Theme override data validation failed';
          } else {
            errorMessage = error.message;
          }
        }
        
        themeAnalytics.push({
          themeId: theme.id,
          themeName: theme.displayName,
          tokenOverridesCount: 0,
          percentOfThemeableTokens: 0,
          hasError: true,
          errorType,
          errorMessage
        });
      }
    }

    return {
      totalThemes: themes.length,
      themesWithOverrides,
      totalTokenOverrides,
      themeableTokensInCore,
      themeAnalytics
    };
  }

  clearCache(): void {
    this.cache.clear();
  }

  clearCacheForThemes(themeIds: string[]): void {
    for (const [key] of this.cache) {
      if (themeIds.some(themeId => key.includes(themeId))) {
        this.cache.delete(key);
      }
    }
  }
} 
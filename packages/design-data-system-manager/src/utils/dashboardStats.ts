import type { Token, Platform, Theme } from '@token-model/data-model';
import { PlatformExtensionAnalyticsService } from '../services/platformExtensionAnalyticsService';
import { ThemeAnalyticsService } from '../services/themeAnalyticsService';
import { GitHubAnalyticsService } from '../services/githubAnalyticsService';
import type { DataSourceContext } from '../services/dataSourceManager';

export function getTokenStats(tokens: Token[]) {
  const total = tokens.length;
  const privateCount = tokens.filter(t => t.private).length;
  const publicCount = total - privateCount;
  const themeableCount = tokens.filter(t => t.themeable).length;
  const nonThemeableCount = total - themeableCount;
  return {
    total,
    privateCount,
    publicCount,
    privatePercent: total ? (privateCount / total) * 100 : 0,
    publicPercent: total ? (publicCount / total) * 100 : 0,
    themeableCount,
    nonThemeableCount,
    themeablePercent: total ? (themeableCount / total) * 100 : 0,
    nonThemeablePercent: total ? (nonThemeableCount / total) * 100 : 0,
  };
}

// Removed getPlatformOverrideStats function as platformOverrides is no longer part of the schema

export async function getPlatformExtensionStats(platforms: Platform[]) {
  console.log('[DashboardStats] getPlatformExtensionStats called with platforms:', {
    count: platforms.length,
    platforms: platforms.map(p => ({ id: p.id, displayName: p.displayName }))
  });
  
  try {
    const analyticsService = PlatformExtensionAnalyticsService.getInstance();
    console.log('[DashboardStats] Calling getCachedPlatformExtensionAnalytics...');
    const analytics = await analyticsService.getCachedPlatformExtensionAnalytics(platforms);
    console.log('[DashboardStats] getCachedPlatformExtensionAnalytics returned:', {
      totalPlatforms: analytics.totalPlatforms,
      platformsWithExtensions: analytics.platformsWithExtensions,
      platformAnalyticsCount: analytics.platformAnalytics.length,
      platformAnalytics: analytics.platformAnalytics.map(p => ({
        platformId: p.platformId,
        platformName: p.platformName,
        hasError: p.hasError,
        errorType: p.errorType
      }))
    });
    return analytics;
  } catch (error) {
    console.error('[DashboardStats] Failed to get platform extension stats:', error);
    return {
      totalPlatforms: platforms.length,
      platformsWithExtensions: 0,
      totalTokenOverrides: 0,
      totalAlgorithmOverrides: 0,
      totalOmittedModes: 0,
      totalOmittedDimensions: 0,
      platformAnalytics: []
    };
  }
}

export async function getThemeStats(themes: Theme[], coreTokens: Token[]) {
  try {
    const analyticsService = ThemeAnalyticsService.getInstance();
    const analytics = await analyticsService.getCachedThemeAnalytics(themes, coreTokens);
    return analytics;
  } catch (error) {
    console.error('Failed to get theme stats:', error);
    return {
      totalThemes: themes.length,
      themesWithOverrides: 0,
      totalTokenOverrides: 0,
      themeableTokensInCore: coreTokens.filter(token => token.themeable).length,
      themeAnalytics: []
    };
  }
}

export async function getLatestRelease(dataSourceContext: DataSourceContext, systemName: string) {
  try {
    const analyticsService = GitHubAnalyticsService.getInstance();
    const analytics = await analyticsService.getCachedGitHubAnalytics(dataSourceContext, systemName);
    
    if (!analytics || analytics.releases.length === 0) {
      return { 
        version: 'No releases found', 
        date: 'N/A',
        sourceName: analytics?.sourceName || 'Unknown',
        repositoryUrl: analytics?.repositoryUrl || '#'
      };
    }
    
    const latestRelease = analytics.releases[0];
    return {
      version: latestRelease.name,
      date: new Date(latestRelease.published_at).toLocaleDateString(),
      sourceName: analytics.sourceName,
      repositoryUrl: analytics.repositoryUrl,
      releaseUrl: latestRelease.html_url
    };
  } catch (error) {
    console.error('Failed to get latest release:', error);
    return { 
      version: 'Error loading releases', 
      date: 'N/A',
      sourceName: 'Unknown',
      repositoryUrl: '#'
    };
  }
}

export async function getRecentActivity(dataSourceContext: DataSourceContext, systemName: string) {
  try {
    const analyticsService = GitHubAnalyticsService.getInstance();
    const analytics = await analyticsService.getCachedGitHubAnalytics(dataSourceContext, systemName);
    
    if (!analytics || analytics.commits.length === 0) {
      return {
        commits: [],
        sourceName: analytics?.sourceName || 'Unknown',
        repositoryUrl: analytics?.repositoryUrl || '#'
      };
    }
    
    const commits = analytics.commits.map((commit, index) => ({
      id: index + 1,
      sha: commit.sha.substring(0, 7),
      message: commit.commit.message.split('\n')[0], // First line only
      date: new Date(commit.commit.author.date).toLocaleDateString(),
      author: commit.commit.author.name,
      commitUrl: commit.html_url
    }));
    
    return {
      commits,
      sourceName: analytics.sourceName,
      repositoryUrl: analytics.repositoryUrl
    };
  } catch (error) {
    console.error('Failed to get recent activity:', error);
    return {
      commits: [],
      sourceName: 'Unknown',
      repositoryUrl: '#'
    };
  }
} 
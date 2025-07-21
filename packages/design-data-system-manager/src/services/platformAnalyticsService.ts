import type { 
  TokenSystem, 
  PlatformExtension, 
  ThemeOverrides 
} from '@token-model/data-model';

export interface AnalyticsSnapshot {
  timestamp: string;
  totalTokens: number;
  overriddenTokens: number;
  newTokens: number;
  omittedTokens: number;
  platformCount: number;
  themeCount: number;
  validationErrors: number;
  validationWarnings: number;
}

export interface TrendAnalysis {
  period: 'day' | 'week' | 'month';
  data: AnalyticsSnapshot[];
  trends: {
    tokenGrowth: number; // percentage change
    overrideRate: number; // percentage of tokens overridden
    newTokenRate: number; // percentage of new tokens
    omissionRate: number; // percentage of omitted tokens
    platformAdoption: number; // percentage change in platform count
  };
}

export interface PerformanceMetrics {
  dataLoadTime: number; // milliseconds
  mergeTime: number; // milliseconds
  validationTime: number; // milliseconds
  memoryUsage: number; // MB
  cacheHitRate: number; // percentage
}

export interface PlatformAnalyticsData {
  current: AnalyticsSnapshot;
  historical: AnalyticsSnapshot[];
  trends: TrendAnalysis;
  performance: PerformanceMetrics;
  platformBreakdown: Map<string, {
    tokenCount: number;
    overrideCount: number;
    newTokenCount: number;
    omissionCount: number;
    lastUpdated: string;
    validationStatus: 'valid' | 'invalid' | 'warning';
  }>;
}

export class PlatformAnalyticsService {
  private static instance: PlatformAnalyticsService;
  private analyticsHistory: AnalyticsSnapshot[] = [];
  private performanceHistory: PerformanceMetrics[] = [];
  private cache = new Map<string, { data: unknown; timestamp: number; ttl: number }>();

  private constructor() {}

  static getInstance(): PlatformAnalyticsService {
    if (!PlatformAnalyticsService.instance) {
      PlatformAnalyticsService.instance = new PlatformAnalyticsService();
    }
    return PlatformAnalyticsService.instance;
  }

  /**
   * Generate comprehensive analytics for the current state
   */
  async generateAnalytics(
    coreData: TokenSystem | null,
    platformExtensions: PlatformExtension[],
    themeOverrides: ThemeOverrides | null,
    performanceMetrics?: Partial<PerformanceMetrics>
  ): Promise<PlatformAnalyticsData> {
    const startTime = performance.now();
    
    // Generate current snapshot
    const currentSnapshot = this.generateSnapshot(coreData, platformExtensions, themeOverrides);
    
    // Add to history
    this.analyticsHistory.push(currentSnapshot);
    
    // Keep only last 30 days of history
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    this.analyticsHistory = this.analyticsHistory.filter(
      snapshot => new Date(snapshot.timestamp) > thirtyDaysAgo
    );

    // Generate trends
    const trends = this.generateTrendAnalysis();

    // Generate performance metrics
    const performanceMetricsResult = this.generatePerformanceMetrics(startTime, performanceMetrics);

    // Generate platform breakdown
    const platformBreakdown = this.generatePlatformBreakdown(coreData, platformExtensions);

    return {
      current: currentSnapshot,
      historical: this.analyticsHistory,
      trends,
      performance: performanceMetricsResult,
      platformBreakdown
    };
  }

  /**
   * Generate a snapshot of current analytics
   */
  private generateSnapshot(
    coreData: TokenSystem | null,
    platformExtensions: PlatformExtension[],
    themeOverrides: ThemeOverrides | null
  ): AnalyticsSnapshot {
    const totalTokens = coreData?.tokens?.length || 0;
    let overriddenTokens = 0;
    let newTokens = 0;
    let omittedTokens = 0;
    let validationErrors = 0;
    let validationWarnings = 0;

    // Calculate overrides and new tokens from platform extensions
    platformExtensions.forEach(extension => {
      if (extension.tokenOverrides) {
        overriddenTokens += extension.tokenOverrides.length;
      }
      // Count new tokens (tokens not in core data)
      if (extension.tokenOverrides) {
        const coreTokenIds = new Set(coreData?.tokens?.map(t => t.id) || []);
        newTokens += extension.tokenOverrides.filter(t => !coreTokenIds.has(t.id)).length;
      }
      // Count omitted tokens
      if (extension.omittedModes) {
        omittedTokens += extension.omittedModes.length;
      }
      if (extension.omittedDimensions) {
        omittedTokens += extension.omittedDimensions.length;
      }
    });

    // Calculate validation issues
    platformExtensions.forEach(extension => {
      // This would integrate with actual validation logic
      // For now, using mock validation
      if (Math.random() > 0.8) validationErrors++;
      if (Math.random() > 0.6) validationWarnings++;
    });

    return {
      timestamp: new Date().toISOString(),
      totalTokens,
      overriddenTokens,
      newTokens,
      omittedTokens,
      platformCount: platformExtensions.length,
      themeCount: themeOverrides ? 1 : 0,
      validationErrors,
      validationWarnings
    };
  }

  /**
   * Generate trend analysis from historical data
   */
  private generateTrendAnalysis(): TrendAnalysis {
    if (this.analyticsHistory.length < 2) {
      return {
        period: 'day',
        data: this.analyticsHistory,
        trends: {
          tokenGrowth: 0,
          overrideRate: 0,
          newTokenRate: 0,
          omissionRate: 0,
          platformAdoption: 0
        }
      };
    }

    const recent = this.analyticsHistory.slice(-7); // Last 7 days
    const previous = this.analyticsHistory.slice(-14, -7); // Previous 7 days

    const recentAvg = this.calculateAverage(recent);
    const previousAvg = this.calculateAverage(previous);

    const calculatePercentageChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      period: 'day',
      data: this.analyticsHistory,
      trends: {
        tokenGrowth: calculatePercentageChange(recentAvg.totalTokens, previousAvg.totalTokens),
        overrideRate: recentAvg.totalTokens > 0 ? (recentAvg.overriddenTokens / recentAvg.totalTokens) * 100 : 0,
        newTokenRate: recentAvg.totalTokens > 0 ? (recentAvg.newTokens / recentAvg.totalTokens) * 100 : 0,
        omissionRate: recentAvg.totalTokens > 0 ? (recentAvg.omittedTokens / recentAvg.totalTokens) * 100 : 0,
        platformAdoption: calculatePercentageChange(recentAvg.platformCount, previousAvg.platformCount)
      }
    };
  }

  /**
   * Calculate average values from snapshots
   */
  private calculateAverage(snapshots: AnalyticsSnapshot[]) {
    if (snapshots.length === 0) {
      return {
        totalTokens: 0,
        overriddenTokens: 0,
        newTokens: 0,
        omittedTokens: 0,
        platformCount: 0
      };
    }

    const sum = snapshots.reduce((acc, snapshot) => ({
      totalTokens: acc.totalTokens + snapshot.totalTokens,
      overriddenTokens: acc.overriddenTokens + snapshot.overriddenTokens,
      newTokens: acc.newTokens + snapshot.newTokens,
      omittedTokens: acc.omittedTokens + snapshot.omittedTokens,
      platformCount: acc.platformCount + snapshot.platformCount
    }), {
      totalTokens: 0,
      overriddenTokens: 0,
      newTokens: 0,
      omittedTokens: 0,
      platformCount: 0
    });

    return {
      totalTokens: sum.totalTokens / snapshots.length,
      overriddenTokens: sum.overriddenTokens / snapshots.length,
      newTokens: sum.newTokens / snapshots.length,
      omittedTokens: sum.omittedTokens / snapshots.length,
      platformCount: sum.platformCount / snapshots.length
    };
  }

  /**
   * Generate performance metrics
   */
  private generatePerformanceMetrics(
    startTime: number,
    providedMetrics?: Partial<PerformanceMetrics>
  ): PerformanceMetrics {
    const endTime = performance.now();
    const loadTime = endTime - startTime;

    return {
      dataLoadTime: providedMetrics?.dataLoadTime || loadTime,
      mergeTime: providedMetrics?.mergeTime || loadTime * 0.3,
      validationTime: providedMetrics?.validationTime || loadTime * 0.2,
      memoryUsage: providedMetrics?.memoryUsage || this.getMemoryUsage(),
      cacheHitRate: providedMetrics?.cacheHitRate || this.calculateCacheHitRate()
    };
  }

  /**
   * Generate platform-specific breakdown
   */
  private generatePlatformBreakdown(
    coreData: TokenSystem | null,
    platformExtensions: PlatformExtension[]
  ): Map<string, any> {
    const breakdown = new Map();

    platformExtensions.forEach(extension => {
      const tokenCount = coreData?.tokens?.length || 0;
      const overrideCount = extension.tokenOverrides?.length || 0;
      const newTokenCount = extension.tokenOverrides?.filter(t => 
        !coreData?.tokens?.some(ct => ct.id === t.id)
      ).length || 0;
      const omissionCount = (extension.omittedModes?.length || 0) + (extension.omittedDimensions?.length || 0);

      breakdown.set(extension.platformId, {
        tokenCount,
        overrideCount,
        newTokenCount,
        omissionCount,
        lastUpdated: extension.version || new Date().toISOString(),
        validationStatus: this.getValidationStatus(extension)
      });
    });

    return breakdown;
  }

  /**
   * Get validation status for a platform extension
   */
  private getValidationStatus(extension: PlatformExtension): 'valid' | 'invalid' | 'warning' {
    // Mock validation logic - in real implementation this would use actual validation
    if (Math.random() > 0.8) return 'invalid';
    if (Math.random() > 0.6) return 'warning';
    return 'valid';
  }

  /**
   * Get memory usage (mock implementation)
   */
  private getMemoryUsage(): number {
    // In a real implementation, this would use performance.memory or similar
    return Math.random() * 100 + 50; // Mock value between 50-150 MB
  }

  /**
   * Calculate cache hit rate
   */
  private calculateCacheHitRate(): number {
    if (this.cache.size === 0) return 0;
    
    const now = Date.now();
    let hits = 0;
    let total = 0;

    this.cache.forEach((entry) => {
      total++;
      if (now - entry.timestamp < entry.ttl) {
        hits++;
      }
    });

    return total > 0 ? (hits / total) * 100 : 0;
  }

  /**
   * Cache data with TTL
   */
  setCache(key: string, data: any, ttl: number = 300000): void { // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Get cached data
   */
  getCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get analytics history
   */
  getAnalyticsHistory(): AnalyticsSnapshot[] {
    return [...this.analyticsHistory];
  }

  /**
   * Export analytics data
   */
  exportAnalytics(): string {
    return JSON.stringify({
      current: this.analyticsHistory[this.analyticsHistory.length - 1],
      historical: this.analyticsHistory,
      performance: this.performanceHistory
    }, null, 2);
  }
} 
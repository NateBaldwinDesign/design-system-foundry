import { unifiedUIIntegrationService } from './unifiedUIIntegrationService';
import { unifiedEditModeService } from './unifiedEditModeService';
import { dataFlowController } from './dataFlowController';
import { unifiedChangeTrackingService } from './unifiedChangeTrackingService';
import { unifiedStorageService } from './unifiedStorageService';
import { dataValidationService } from './dataValidationService';
import type { UIComponentType } from './unifiedUIIntegrationService';
import type { EditSession } from './unifiedEditModeService';

// Feature flag for gradual rollout
const UNIFIED_PERFORMANCE_ENABLED = process.env.REACT_APP_UNIFIED_PERFORMANCE_ENABLED === 'true' || false;

// Performance metrics interface
export interface PerformanceMetrics {
  operationId: string;
  operationType: string;
  componentType?: UIComponentType;
  startTime: number;
  endTime: number;
  duration: number;
  memoryUsage: number;
  cpuUsage?: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

// Performance threshold interface
export interface PerformanceThreshold {
  maxDuration: number; // milliseconds
  maxMemoryUsage: number; // bytes
  maxCpuUsage?: number; // percentage
  warningThreshold: number; // percentage of max
}

// Performance optimization options
export interface PerformanceOptions {
  enableMonitoring?: boolean;
  enableMemoryManagement?: boolean;
  enableCaching?: boolean;
  enableDebouncing?: boolean;
  enableThrottling?: boolean;
  enableLazyLoading?: boolean;
  cacheSize?: number; // number of items
  cacheTimeout?: number; // milliseconds
  debounceDelay?: number; // milliseconds
  throttleDelay?: number; // milliseconds
  memoryCleanupInterval?: number; // milliseconds
  performanceThresholds?: Partial<PerformanceThreshold>;
}

// Default performance options
const DEFAULT_PERFORMANCE_OPTIONS: PerformanceOptions = {
  enableMonitoring: true,
  enableMemoryManagement: true,
  enableCaching: true,
  enableDebouncing: true,
  enableThrottling: true,
  enableLazyLoading: true,
  cacheSize: 1000,
  cacheTimeout: 300000, // 5 minutes
  debounceDelay: 300,
  throttleDelay: 100,
  memoryCleanupInterval: 60000, // 1 minute
  performanceThresholds: {
    maxDuration: 5000, // 5 seconds
    maxMemoryUsage: 100 * 1024 * 1024, // 100MB
    warningThreshold: 0.8 // 80%
  }
};

// Cache entry interface
export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number; // estimated size in bytes
}

// Debounced function interface
export interface DebouncedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => void;
}

// Throttled function interface
export interface ThrottledFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void;
  cancel: () => void;
}

// Performance event interface
export interface PerformanceEvent {
  type: 'operation-start' | 'operation-complete' | 'threshold-exceeded' | 'memory-warning' | 'cache-cleanup';
  metrics?: PerformanceMetrics;
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// Error types for performance service
export class PerformanceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly metrics?: PerformanceMetrics,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PerformanceError';
  }
}

/**
 * Unified Performance Service - Performance optimization for all data operations
 * 
 * This service provides:
 * - Efficient data access patterns
 * - Minimal re-renders and state updates
 * - Memory management for large datasets
 * - Performance monitoring and optimization
 * - Maintain existing performance levels
 */
export class UnifiedPerformanceService {
  private static instance: UnifiedPerformanceService;
  private eventListeners: Array<(event: PerformanceEvent) => void> = [];
  private performanceCache: Map<string, CacheEntry> = new Map();
  private activeOperations: Map<string, PerformanceMetrics> = new Map();
  private memoryUsageHistory: Array<{ timestamp: number; usage: number }> = [];
  private debouncedFunctions: Map<string, DebouncedFunction<any>> = new Map();
  private throttledFunctions: Map<string, ThrottledFunction<any>> = new Map();
  private options: PerformanceOptions;
  private memoryCleanupTimer: NodeJS.Timeout | null = null;
  private operationCounter = 0;

  private constructor() {
    this.options = { ...DEFAULT_PERFORMANCE_OPTIONS };
    console.log('[UnifiedPerformanceService] Initializing with feature flag:', UNIFIED_PERFORMANCE_ENABLED);
    this.startMemoryCleanup();
  }

  static getInstance(): UnifiedPerformanceService {
    if (!UnifiedPerformanceService.instance) {
      UnifiedPerformanceService.instance = new UnifiedPerformanceService();
    }
    return UnifiedPerformanceService.instance;
  }

  /**
   * Check if unified performance is enabled
   */
  static isEnabled(): boolean {
    return UNIFIED_PERFORMANCE_ENABLED;
  }

  /**
   * Configure performance options
   */
  configure(options: Partial<PerformanceOptions>): void {
    this.options = { ...this.options, ...options };
    console.log('[UnifiedPerformanceService] Configuration updated:', this.options);
  }

  /**
   * Add event listener
   */
  addEventListener(listener: (event: PerformanceEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: (event: PerformanceEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(event: PerformanceEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[UnifiedPerformanceService] Error in event listener:', error);
      }
    });
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${++this.operationCounter}`;
  }

  /**
   * Start performance monitoring for an operation
   */
  startOperation(
    operationType: string,
    componentType?: UIComponentType,
    metadata?: Record<string, unknown>
  ): string {
    if (!this.options.enableMonitoring) {
      return '';
    }

    const operationId = this.generateOperationId();
    const startTime = performance.now();
    const memoryUsage = this.getCurrentMemoryUsage();

    const metrics: PerformanceMetrics = {
      operationId,
      operationType,
      componentType,
      startTime,
      endTime: 0,
      duration: 0,
      memoryUsage,
      success: false,
      metadata
    };

    this.activeOperations.set(operationId, metrics);

    this.emitEvent({
      type: 'operation-start',
      metrics,
      message: `Operation started: ${operationType}`,
      timestamp: new Date().toISOString()
    });

    console.log('[UnifiedPerformanceService] Operation started:', operationId, operationType);
    return operationId;
  }

  /**
   * End performance monitoring for an operation
   */
  endOperation(
    operationId: string,
    success: boolean = true,
    error?: string,
    additionalMetadata?: Record<string, unknown>
  ): PerformanceMetrics | null {
    if (!this.options.enableMonitoring || !operationId) {
      return null;
    }

    const metrics = this.activeOperations.get(operationId);
    if (!metrics) {
      console.warn('[UnifiedPerformanceService] Operation not found:', operationId);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metrics.startTime;
    const memoryUsage = this.getCurrentMemoryUsage();

    metrics.endTime = endTime;
    metrics.duration = duration;
    metrics.memoryUsage = memoryUsage;
    metrics.success = success;
    if (error) {
      metrics.error = error;
    }
    if (additionalMetadata) {
      metrics.metadata = { ...metrics.metadata, ...additionalMetadata };
    }

    this.activeOperations.delete(operationId);
    this.memoryUsageHistory.push({ timestamp: endTime, usage: memoryUsage });

    // Check performance thresholds
    this.checkPerformanceThresholds(metrics);

    this.emitEvent({
      type: 'operation-complete',
      metrics,
      message: `Operation completed: ${metrics.operationType} (${duration.toFixed(2)}ms)`,
      timestamp: new Date().toISOString()
    });

    console.log('[UnifiedPerformanceService] Operation completed:', operationId, duration.toFixed(2), 'ms');
    return metrics;
  }

  /**
   * Get current memory usage
   */
  private getCurrentMemoryUsage(): number {
    if (typeof performance !== 'undefined' && performance.memory) {
      return performance.memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Check performance thresholds
   */
  private checkPerformanceThresholds(metrics: PerformanceMetrics): void {
    const thresholds = this.options.performanceThresholds!;

    // Check duration threshold
    if (metrics.duration > thresholds.maxDuration) {
      this.emitEvent({
        type: 'threshold-exceeded',
        metrics,
        message: `Operation duration exceeded threshold: ${metrics.duration.toFixed(2)}ms > ${thresholds.maxDuration}ms`,
        timestamp: new Date().toISOString()
      });
    }

    // Check memory usage threshold
    if (metrics.memoryUsage > thresholds.maxMemoryUsage) {
      this.emitEvent({
        type: 'memory-warning',
        metrics,
        message: `Memory usage exceeded threshold: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB > ${(thresholds.maxMemoryUsage / 1024 / 1024).toFixed(2)}MB`,
        timestamp: new Date().toISOString()
      });
    }

    // Check warning thresholds
    const warningDuration = thresholds.maxDuration * thresholds.warningThreshold;
    const warningMemory = thresholds.maxMemoryUsage * thresholds.warningThreshold;

    if (metrics.duration > warningDuration || metrics.memoryUsage > warningMemory) {
      console.warn('[UnifiedPerformanceService] Performance warning:', {
        operationId: metrics.operationId,
        duration: metrics.duration,
        memoryUsage: metrics.memoryUsage
      });
    }
  }

  /**
   * Cache data with performance optimization
   */
  cacheData<T>(key: string, data: T, ttl?: number): void {
    if (!this.options.enableCaching) {
      return;
    }

    const now = Date.now();
    const timeout = ttl || this.options.cacheTimeout!;
    const estimatedSize = this.estimateDataSize(data);

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      accessCount: 0,
      lastAccessed: now,
      size: estimatedSize
    };

    this.performanceCache.set(key, entry);

    // Check cache size limit
    if (this.performanceCache.size > this.options.cacheSize!) {
      this.cleanupCache();
    }
  }

  /**
   * Get cached data
   */
  getCachedData<T>(key: string): T | null {
    if (!this.options.enableCaching) {
      return null;
    }

    const entry = this.performanceCache.get(key) as CacheEntry<T> | undefined;
    if (!entry) {
      return null;
    }

    const now = Date.now();
    const timeout = this.options.cacheTimeout!;

    // Check if entry is expired
    if (now - entry.timestamp > timeout) {
      this.performanceCache.delete(key);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;

    return entry.data;
  }

  /**
   * Estimate data size in bytes
   */
  private estimateDataSize(data: unknown): number {
    try {
      const jsonString = JSON.stringify(data);
      return new Blob([jsonString]).size;
    } catch {
      return 1024; // Default estimate
    }
  }

  /**
   * Cleanup expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    const timeout = this.options.cacheTimeout!;
    const maxSize = this.options.cacheSize!;

    // Remove expired entries
    for (const [key, entry] of this.performanceCache.entries()) {
      if (now - entry.timestamp > timeout) {
        this.performanceCache.delete(key);
      }
    }

    // If still over limit, remove least recently used entries
    if (this.performanceCache.size > maxSize) {
      const entries = Array.from(this.performanceCache.entries());
      entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
      
      const toRemove = entries.slice(0, this.performanceCache.size - maxSize);
      toRemove.forEach(([key]) => this.performanceCache.delete(key));
    }

    this.emitEvent({
      type: 'cache-cleanup',
      message: `Cache cleaned up, ${this.performanceCache.size} entries remaining`,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Create debounced function
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    key: string,
    delay?: number
  ): DebouncedFunction<T> {
    if (!this.options.enableDebouncing) {
      return {
        ...func,
        cancel: () => {},
        flush: () => {}
      } as DebouncedFunction<T>;
    }

    const debounceDelay = delay || this.options.debounceDelay!;
    let timeoutId: NodeJS.Timeout | null = null;
    let lastArgs: Parameters<T> | null = null;

    const debounced = (...args: Parameters<T>) => {
      lastArgs = args;
      
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        if (lastArgs) {
          func(...lastArgs);
        }
        timeoutId = null;
        lastArgs = null;
      }, debounceDelay);
    };

    debounced.cancel = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
        lastArgs = null;
      }
    };

    debounced.flush = () => {
      if (timeoutId && lastArgs) {
        clearTimeout(timeoutId);
        func(...lastArgs);
        timeoutId = null;
        lastArgs = null;
      }
    };

    this.debouncedFunctions.set(key, debounced);
    return debounced;
  }

  /**
   * Create throttled function
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    key: string,
    delay?: number
  ): ThrottledFunction<T> {
    if (!this.options.enableThrottling) {
      return {
        ...func,
        cancel: () => {}
      } as ThrottledFunction<T>;
    }

    const throttleDelay = delay || this.options.throttleDelay!;
    let lastCall = 0;
    let timeoutId: NodeJS.Timeout | null = null;
    let lastArgs: Parameters<T> | null = null;

    const throttled = (...args: Parameters<T>) => {
      const now = Date.now();
      lastArgs = args;

      if (now - lastCall >= throttleDelay) {
        func(...args);
        lastCall = now;
      } else {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
          if (lastArgs) {
            func(...lastArgs);
          }
          lastCall = Date.now();
          timeoutId = null;
          lastArgs = null;
        }, throttleDelay - (now - lastCall));
      }
    };

    throttled.cancel = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
        lastArgs = null;
      }
    };

    this.throttledFunctions.set(key, throttled);
    return throttled;
  }

  /**
   * Optimize data loading with lazy loading
   */
  async optimizeDataLoading<T>(
    loader: () => Promise<T>,
    cacheKey?: string,
    options?: {
      useCache?: boolean;
      useLazyLoading?: boolean;
      chunkSize?: number;
    }
  ): Promise<T> {
    const operationId = this.startOperation('data-loading', undefined, { cacheKey });

    try {
      // Check cache first
      if (options?.useCache !== false && cacheKey) {
        const cached = this.getCachedData<T>(cacheKey);
        if (cached) {
          this.endOperation(operationId, true);
          return cached;
        }
      }

      // Load data
      const data = await loader();

      // Cache the result
      if (options?.useCache !== false && cacheKey) {
        this.cacheData(cacheKey, data);
      }

      this.endOperation(operationId, true);
      return data;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.endOperation(operationId, false, errorMessage);
      throw error;
    }
  }

  /**
   * Optimize component rendering
   */
  optimizeComponentRendering(
    componentType: UIComponentType,
    renderFunction: () => void,
    options?: {
      debounceKey?: string;
      throttleKey?: string;
      useMemoization?: boolean;
    }
  ): void {
    const operationId = this.startOperation('component-rendering', componentType);

    try {
      let optimizedRender = renderFunction;

      // Apply debouncing if specified
      if (options?.debounceKey) {
        optimizedRender = this.debounce(renderFunction, options.debounceKey);
      }

      // Apply throttling if specified
      if (options?.throttleKey) {
        optimizedRender = this.throttle(renderFunction, options.throttleKey);
      }

      optimizedRender();
      this.endOperation(operationId, true);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.endOperation(operationId, false, errorMessage);
      throw error;
    }
  }

  /**
   * Optimize edit session operations
   */
  optimizeEditSession(
    session: EditSession,
    operation: () => void | Promise<void>,
    operationType: string
  ): void | Promise<void> {
    const operationId = this.startOperation(operationType, session.componentType, {
      sessionId: session.id,
      entityId: session.entityId
    });

    try {
      const result = operation();
      
      if (result instanceof Promise) {
        return result.then(() => {
          this.endOperation(operationId, true);
        }).catch(error => {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.endOperation(operationId, false, errorMessage);
          throw error;
        });
      } else {
        this.endOperation(operationId, true);
        return result;
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.endOperation(operationId, false, errorMessage);
      throw error;
    }
  }

  /**
   * Start memory cleanup interval
   */
  private startMemoryCleanup(): void {
    if (!this.options.enableMemoryManagement) {
      return;
    }

    this.memoryCleanupTimer = setInterval(() => {
      this.performMemoryCleanup();
    }, this.options.memoryCleanupInterval!);
  }

  /**
   * Perform memory cleanup
   */
  private performMemoryCleanup(): void {
    const currentMemory = this.getCurrentMemoryUsage();
    const threshold = this.options.performanceThresholds!.maxMemoryUsage;

    // Clean up cache if memory usage is high
    if (currentMemory > threshold * 0.8) {
      this.cleanupCache();
    }

    // Clean up old memory usage history
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    this.memoryUsageHistory = this.memoryUsageHistory.filter(
      entry => entry.timestamp > cutoffTime
    );

    // Force garbage collection if available
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc();
    }
  }

  /**
   * Get performance statistics
   */
  getStatistics(): {
    activeOperations: number;
    cacheSize: number;
    cacheHitRate: number;
    averageMemoryUsage: number;
    totalOperations: number;
    averageOperationDuration: number;
    options: PerformanceOptions;
  } {
    const totalOperations = this.memoryUsageHistory.length;
    const averageMemoryUsage = totalOperations > 0
      ? this.memoryUsageHistory.reduce((sum, entry) => sum + entry.usage, 0) / totalOperations
      : 0;

    // Calculate cache hit rate (simplified)
    const cacheHitRate = 0.8; // This would need to be tracked over time

    // Calculate average operation duration (simplified)
    const averageOperationDuration = 100; // This would need to be tracked over time

    return {
      activeOperations: this.activeOperations.size,
      cacheSize: this.performanceCache.size,
      cacheHitRate,
      averageMemoryUsage,
      totalOperations,
      averageOperationDuration,
      options: this.options
    };
  }

  /**
   * Get performance metrics for a specific operation
   */
  getOperationMetrics(operationId: string): PerformanceMetrics | null {
    return this.activeOperations.get(operationId) || null;
  }

  /**
   * Get all active operations
   */
  getActiveOperations(): PerformanceMetrics[] {
    return Array.from(this.activeOperations.values());
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.performanceCache.clear();
    this.debouncedFunctions.clear();
    this.throttledFunctions.clear();
    console.log('[UnifiedPerformanceService] All caches cleared');
  }

  /**
   * Reset service state
   */
  reset(): void {
    this.clearCaches();
    this.activeOperations.clear();
    this.memoryUsageHistory = [];
    this.eventListeners = [];
    console.log('[UnifiedPerformanceService] Service state reset');
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.memoryCleanupTimer) {
      clearInterval(this.memoryCleanupTimer);
      this.memoryCleanupTimer = null;
    }

    this.clearCaches();
    this.activeOperations.clear();
    this.eventListeners = [];
    console.log('[UnifiedPerformanceService] Cleanup completed');
  }
}

// Export singleton instance
export const unifiedPerformanceService = UnifiedPerformanceService.getInstance();

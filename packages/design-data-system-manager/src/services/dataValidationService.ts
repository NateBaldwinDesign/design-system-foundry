import { validateTokenSystem } from '@token-model/data-model';
import type { 
  TokenSystem, 
  PlatformExtension, 
  ThemeOverrideFile,
  Token,
  TokenCollection,
  Mode,
  Dimension,
  Platform,
  Theme,
  Taxonomy,
  ResolvedValueType,
  ComponentProperty,
  ComponentCategory,
  Component
} from '@token-model/data-model';

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data?: unknown;
  validationTime: number;
  timestamp: string;
}

// Validation cache entry interface
export interface ValidationCacheEntry {
  result: ValidationResult;
  timestamp: number;
  hash: string;
}

// Validation options interface
export interface ValidationOptions {
  enableCache?: boolean;
  cacheTimeout?: number; // milliseconds
  strictMode?: boolean;
  includeWarnings?: boolean;
  maxErrors?: number;
}

// Default validation options
const DEFAULT_VALIDATION_OPTIONS: ValidationOptions = {
  enableCache: true,
  cacheTimeout: 5 * 60 * 1000, // 5 minutes
  strictMode: false,
  includeWarnings: true,
  maxErrors: 100
};

// Error types for validation
export class DataValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DataValidationError';
  }
}

/**
 * Data Validation Service - Real-time schema validation for all data types
 * 
 * This service provides:
 * - Real-time schema validation for all data types
 * - Type safety for all data operations
 * - Clear error messages and recovery options
 * - Performance optimization with caching
 * - Integration with existing schema validation
 */
export class DataValidationService {
  private static instance: DataValidationService;
  private validationCache = new Map<string, ValidationCacheEntry>();
  private validationStats = {
    totalValidations: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageValidationTime: 0
  };

  private constructor() {
    this.cleanupExpiredCache();
  }

  static getInstance(): DataValidationService {
    if (!DataValidationService.instance) {
      DataValidationService.instance = new DataValidationService();
    }
    return DataValidationService.instance;
  }

  /**
   * Generate hash for data to use as cache key
   */
  private generateDataHash(data: unknown): string {
    try {
      const jsonString = JSON.stringify(data);
      let hash = 0;
      for (let i = 0; i < jsonString.length; i++) {
        const char = jsonString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return hash.toString(36);
    } catch (error) {
      return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.validationCache.entries()) {
      if (now - entry.timestamp > DEFAULT_VALIDATION_OPTIONS.cacheTimeout!) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.validationCache.delete(key));
    
    if (expiredKeys.length > 0) {
      console.log(`[DataValidationService] Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }

  /**
   * Get validation statistics
   */
  getValidationStats() {
    return { ...this.validationStats };
  }

  /**
   * Clear validation cache
   */
  clearValidationCache(): void {
    this.validationCache.clear();
    console.log('[DataValidationService] Validation cache cleared');
  }

  /**
   * Validate TokenSystem data
   */
  validateTokenSystem(data: unknown, options: ValidationOptions = {}): ValidationResult {
    const startTime = performance.now();
    const opts = { ...DEFAULT_VALIDATION_OPTIONS, ...options };
    
    console.log('[DataValidationService] Validating TokenSystem data');

    try {
      // Check cache first
      if (opts.enableCache) {
        const dataHash = this.generateDataHash(data);
        const cacheKey = `TokenSystem_${dataHash}`;
        const cachedEntry = this.validationCache.get(cacheKey);
        
        if (cachedEntry && (Date.now() - cachedEntry.timestamp) < opts.cacheTimeout!) {
          this.validationStats.cacheHits++;
          console.log('[DataValidationService] Cache hit for TokenSystem validation');
          return cachedEntry.result;
        }
        
        this.validationStats.cacheMisses++;
      }

      const result: ValidationResult = {
        isValid: false,
        errors: [],
        warnings: [],
        validationTime: 0,
        timestamp: new Date().toISOString()
      };

      // Basic type check
      if (!data || typeof data !== 'object') {
        result.errors.push('Data must be a valid object');
        return this.finalizeValidation(result, startTime, opts);
      }

      // Use existing schema validation
      const schemaValidation = validateTokenSystem(data as TokenSystem);
      result.isValid = schemaValidation.isValid;
      result.errors = schemaValidation.errors || [];
      result.warnings = opts.includeWarnings ? (schemaValidation.warnings || []) : [];
      result.data = data;

      // Limit number of errors if specified
      if (opts.maxErrors && result.errors.length > opts.maxErrors) {
        result.errors = result.errors.slice(0, opts.maxErrors);
        result.warnings.push(`Limited to ${opts.maxErrors} errors for performance`);
      }

      // Cache result if enabled
      if (opts.enableCache) {
        const dataHash = this.generateDataHash(data);
        const cacheKey = `TokenSystem_${dataHash}`;
        this.validationCache.set(cacheKey, {
          result,
          timestamp: Date.now(),
          hash: dataHash
        });
      }

      this.validationStats.totalValidations++;
      return this.finalizeValidation(result, startTime, opts);

    } catch (error) {
      console.error('[DataValidationService] TokenSystem validation error:', error);
      const result: ValidationResult = {
        isValid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        validationTime: performance.now() - startTime,
        timestamp: new Date().toISOString()
      };
      return result;
    }
  }

  /**
   * Validate PlatformExtension data
   */
  validatePlatformExtension(data: unknown, options: ValidationOptions = {}): ValidationResult {
    const startTime = performance.now();
    const opts = { ...DEFAULT_VALIDATION_OPTIONS, ...options };
    
    console.log('[DataValidationService] Validating PlatformExtension data');

    try {
      // Check cache first
      if (opts.enableCache) {
        const dataHash = this.generateDataHash(data);
        const cacheKey = `PlatformExtension_${dataHash}`;
        const cachedEntry = this.validationCache.get(cacheKey);
        
        if (cachedEntry && (Date.now() - cachedEntry.timestamp) < opts.cacheTimeout!) {
          this.validationStats.cacheHits++;
          console.log('[DataValidationService] Cache hit for PlatformExtension validation');
          return cachedEntry.result;
        }
        
        this.validationStats.cacheMisses++;
      }

      const result: ValidationResult = {
        isValid: false,
        errors: [],
        warnings: [],
        validationTime: 0,
        timestamp: new Date().toISOString()
      };

      // Basic type check
      if (!data || typeof data !== 'object') {
        result.errors.push('Data must be a valid object');
        return this.finalizeValidation(result, startTime, opts);
      }

      const platformData = data as PlatformExtension;

      // Required fields validation
      if (!platformData.platformId) {
        result.errors.push('platformId is required');
      }

      if (!platformData.systemId) {
        result.errors.push('systemId is required');
      }

      if (!platformData.version) {
        result.errors.push('version is required');
      }

      // Type validation for arrays
      if (platformData.tokens && !Array.isArray(platformData.tokens)) {
        result.errors.push('tokens must be an array');
      }

      if (platformData.tokenCollections && !Array.isArray(platformData.tokenCollections)) {
        result.errors.push('tokenCollections must be an array');
      }

      if (platformData.dimensions && !Array.isArray(platformData.dimensions)) {
        result.errors.push('dimensions must be an array');
      }

      if (platformData.platforms && !Array.isArray(platformData.platforms)) {
        result.errors.push('platforms must be an array');
      }

      if (platformData.themes && !Array.isArray(platformData.themes)) {
        result.errors.push('themes must be an array');
      }

      if (platformData.taxonomies && !Array.isArray(platformData.taxonomies)) {
        result.errors.push('taxonomies must be an array');
      }

      if (platformData.resolvedValueTypes && !Array.isArray(platformData.resolvedValueTypes)) {
        result.errors.push('resolvedValueTypes must be an array');
      }

      if (platformData.componentProperties && !Array.isArray(platformData.componentProperties)) {
        result.errors.push('componentProperties must be an array');
      }

      if (platformData.componentCategories && !Array.isArray(platformData.componentCategories)) {
        result.errors.push('componentCategories must be an array');
      }

      if (platformData.components && !Array.isArray(platformData.components)) {
        result.errors.push('components must be an array');
      }

      // Validate platformId format
      if (platformData.platformId && typeof platformData.platformId !== 'string') {
        result.errors.push('platformId must be a string');
      }

      // Validate systemId format
      if (platformData.systemId && typeof platformData.systemId !== 'string') {
        result.errors.push('systemId must be a string');
      }

      // Validate version format
      if (platformData.version && typeof platformData.version !== 'string') {
        result.errors.push('version must be a string');
      }

      // Set validation result
      result.isValid = result.errors.length === 0;
      result.data = data;

      // Add warnings if enabled
      if (opts.includeWarnings) {
        if (!platformData.tokens || platformData.tokens.length === 0) {
          result.warnings.push('No tokens defined in platform extension');
        }
        if (!platformData.tokenCollections || platformData.tokenCollections.length === 0) {
          result.warnings.push('No token collections defined in platform extension');
        }
      }

      // Limit number of errors if specified
      if (opts.maxErrors && result.errors.length > opts.maxErrors) {
        result.errors = result.errors.slice(0, opts.maxErrors);
        result.warnings.push(`Limited to ${opts.maxErrors} errors for performance`);
      }

      // Cache result if enabled
      if (opts.enableCache) {
        const dataHash = this.generateDataHash(data);
        const cacheKey = `PlatformExtension_${dataHash}`;
        this.validationCache.set(cacheKey, {
          result,
          timestamp: Date.now(),
          hash: dataHash
        });
      }

      this.validationStats.totalValidations++;
      return this.finalizeValidation(result, startTime, opts);

    } catch (error) {
      console.error('[DataValidationService] PlatformExtension validation error:', error);
      const result: ValidationResult = {
        isValid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        validationTime: performance.now() - startTime,
        timestamp: new Date().toISOString()
      };
      return result;
    }
  }

  /**
   * Validate ThemeOverrideFile data
   */
  validateThemeOverrideFile(data: unknown, options: ValidationOptions = {}): ValidationResult {
    const startTime = performance.now();
    const opts = { ...DEFAULT_VALIDATION_OPTIONS, ...options };
    
    console.log('[DataValidationService] Validating ThemeOverrideFile data');

    try {
      // Check cache first
      if (opts.enableCache) {
        const dataHash = this.generateDataHash(data);
        const cacheKey = `ThemeOverrideFile_${dataHash}`;
        const cachedEntry = this.validationCache.get(cacheKey);
        
        if (cachedEntry && (Date.now() - cachedEntry.timestamp) < opts.cacheTimeout!) {
          this.validationStats.cacheHits++;
          console.log('[DataValidationService] Cache hit for ThemeOverrideFile validation');
          return cachedEntry.result;
        }
        
        this.validationStats.cacheMisses++;
      }

      const result: ValidationResult = {
        isValid: false,
        errors: [],
        warnings: [],
        validationTime: 0,
        timestamp: new Date().toISOString()
      };

      // Basic type check
      if (!data || typeof data !== 'object') {
        result.errors.push('Data must be a valid object');
        return this.finalizeValidation(result, startTime, opts);
      }

      const themeData = data as ThemeOverrideFile;

      // Required fields validation
      if (!themeData.themeId) {
        result.errors.push('themeId is required');
      }

      if (!themeData.systemId) {
        result.errors.push('systemId is required');
      }

      // Optional fields validation
      if (themeData.figmaFileKey && typeof themeData.figmaFileKey !== 'string') {
        result.errors.push('figmaFileKey must be a string');
      }

      if (themeData.version && typeof themeData.version !== 'string') {
        result.errors.push('version must be a string');
      }

      // Type validation for arrays
      if (themeData.tokens && !Array.isArray(themeData.tokens)) {
        result.errors.push('tokens must be an array');
      }

      if (themeData.tokenCollections && !Array.isArray(themeData.tokenCollections)) {
        result.errors.push('tokenCollections must be an array');
      }

      if (themeData.dimensions && !Array.isArray(themeData.dimensions)) {
        result.errors.push('dimensions must be an array');
      }

      if (themeData.platforms && !Array.isArray(themeData.platforms)) {
        result.errors.push('platforms must be an array');
      }

      if (themeData.themes && !Array.isArray(themeData.themes)) {
        result.errors.push('themes must be an array');
      }

      if (themeData.taxonomies && !Array.isArray(themeData.taxonomies)) {
        result.errors.push('taxonomies must be an array');
      }

      if (themeData.resolvedValueTypes && !Array.isArray(themeData.resolvedValueTypes)) {
        result.errors.push('resolvedValueTypes must be an array');
      }

      if (themeData.componentProperties && !Array.isArray(themeData.componentProperties)) {
        result.errors.push('componentProperties must be an array');
      }

      if (themeData.componentCategories && !Array.isArray(themeData.componentCategories)) {
        result.errors.push('componentCategories must be an array');
      }

      if (themeData.components && !Array.isArray(themeData.components)) {
        result.errors.push('components must be an array');
      }

      // Validate themeId format
      if (themeData.themeId && typeof themeData.themeId !== 'string') {
        result.errors.push('themeId must be a string');
      }

      // Validate systemId format
      if (themeData.systemId && typeof themeData.systemId !== 'string') {
        result.errors.push('systemId must be a string');
      }

      // Set validation result
      result.isValid = result.errors.length === 0;
      result.data = data;

      // Add warnings if enabled
      if (opts.includeWarnings) {
        if (!themeData.tokens || themeData.tokens.length === 0) {
          result.warnings.push('No tokens defined in theme override');
        }
        if (!themeData.tokenCollections || themeData.tokenCollections.length === 0) {
          result.warnings.push('No token collections defined in theme override');
        }
      }

      // Limit number of errors if specified
      if (opts.maxErrors && result.errors.length > opts.maxErrors) {
        result.errors = result.errors.slice(0, opts.maxErrors);
        result.warnings.push(`Limited to ${opts.maxErrors} errors for performance`);
      }

      // Cache result if enabled
      if (opts.enableCache) {
        const dataHash = this.generateDataHash(data);
        const cacheKey = `ThemeOverrideFile_${dataHash}`;
        this.validationCache.set(cacheKey, {
          result,
          timestamp: Date.now(),
          hash: dataHash
        });
      }

      this.validationStats.totalValidations++;
      return this.finalizeValidation(result, startTime, opts);

    } catch (error) {
      console.error('[DataValidationService] ThemeOverrideFile validation error:', error);
      const result: ValidationResult = {
        isValid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        validationTime: performance.now() - startTime,
        timestamp: new Date().toISOString()
      };
      return result;
    }
  }

  /**
   * Generic validation method
   */
  validateData(data: unknown, dataType: 'TokenSystem' | 'PlatformExtension' | 'ThemeOverrideFile', options: ValidationOptions = {}): ValidationResult {
    switch (dataType) {
      case 'TokenSystem':
        return this.validateTokenSystem(data, options);
      case 'PlatformExtension':
        return this.validatePlatformExtension(data, options);
      case 'ThemeOverrideFile':
        return this.validateThemeOverrideFile(data, options);
      default:
        throw new DataValidationError(
          `Unknown data type: ${dataType}`,
          'UNKNOWN_DATA_TYPE',
          { dataType }
        );
    }
  }

  /**
   * Finalize validation result with timing and statistics
   */
  private finalizeValidation(result: ValidationResult, startTime: number, options: ValidationOptions): ValidationResult {
    const validationTime = performance.now() - startTime;
    result.validationTime = validationTime;

    // Update average validation time
    this.validationStats.averageValidationTime = 
      (this.validationStats.averageValidationTime * (this.validationStats.totalValidations - 1) + validationTime) / 
      this.validationStats.totalValidations;

    // Log validation result
    if (result.isValid) {
      console.log(`[DataValidationService] Validation passed in ${validationTime.toFixed(2)}ms`);
    } else {
      console.warn(`[DataValidationService] Validation failed in ${validationTime.toFixed(2)}ms with ${result.errors.length} errors`);
    }

    return result;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cacheSize: this.validationCache.size,
      cacheHits: this.validationStats.cacheHits,
      cacheMisses: this.validationStats.cacheMisses,
      hitRate: this.validationStats.totalValidations > 0 
        ? (this.validationStats.cacheHits / this.validationStats.totalValidations * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Validate multiple data items
   */
  validateMultipleData(
    dataItems: Array<{ data: unknown; type: 'TokenSystem' | 'PlatformExtension' | 'ThemeOverrideFile' }>,
    options: ValidationOptions = {}
  ): Array<{ index: number; result: ValidationResult }> {
    console.log(`[DataValidationService] Validating ${dataItems.length} data items`);
    
    return dataItems.map((item, index) => ({
      index,
      result: this.validateData(item.data, item.type, options)
    }));
  }

  /**
   * Batch validation with performance optimization
   */
  async validateBatch(
    dataItems: Array<{ data: unknown; type: 'TokenSystem' | 'PlatformExtension' | 'ThemeOverrideFile' }>,
    options: ValidationOptions = {}
  ): Promise<Array<{ index: number; result: ValidationResult }>> {
    console.log(`[DataValidationService] Starting batch validation of ${dataItems.length} items`);
    
    const results: Array<{ index: number; result: ValidationResult }> = [];
    
    // Process in chunks to avoid blocking the main thread
    const chunkSize = 10;
    for (let i = 0; i < dataItems.length; i += chunkSize) {
      const chunk = dataItems.slice(i, i + chunkSize);
      
      // Process chunk
      chunk.forEach((item, chunkIndex) => {
        const index = i + chunkIndex;
        const result = this.validateData(item.data, item.type, options);
        results.push({ index, result });
      });
      
      // Yield control to allow other operations
      if (i + chunkSize < dataItems.length) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    console.log(`[DataValidationService] Batch validation completed for ${dataItems.length} items`);
    return results;
  }
}

// Export singleton instance
export const dataValidationService = DataValidationService.getInstance();

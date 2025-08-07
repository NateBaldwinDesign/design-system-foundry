import type { Platform } from '@token-model/data-model';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FigmaPlatformMapping {
  platformId: string;
  figmaPlatform: string;
}

export class FigmaPlatformMappingService {
  /**
   * Validate a new Figma platform mapping against existing platforms
   */
  static validateMapping(
    platforms: Platform[],
    newMapping: FigmaPlatformMapping
  ): ValidationResult {
    const errors: string[] = [];
    
    // Check for duplicate mappings
    const existingMapping = platforms.find(p => 
      p.figmaPlatformMapping === newMapping.figmaPlatform
    );
    
    if (existingMapping && existingMapping.id !== newMapping.platformId) {
      errors.push(
        `Platform "${existingMapping.displayName}" is already mapped to Figma platform "${newMapping.figmaPlatform}". ` +
        `Only one platform can be mapped to each Figma platform.`
      );
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Get available Figma platforms that are not currently mapped
   */
  static getAvailableFigmaPlatforms(platforms: Platform[], excludePlatformId?: string): string[] {
    const usedPlatforms = platforms
      .filter(p => p.figmaPlatformMapping && p.id !== excludePlatformId)
      .map(p => p.figmaPlatformMapping!);
    
    return ['WEB', 'iOS', 'ANDROID'].filter(p => !usedPlatforms.includes(p));
  }
  
  /**
   * Get all current Figma platform mappings
   */
  static getCurrentMappings(platforms: Platform[]): FigmaPlatformMapping[] {
    return platforms
      .filter(p => p.figmaPlatformMapping)
      .map(p => ({
        platformId: p.id,
        figmaPlatform: p.figmaPlatformMapping!
      }));
  }
  
  /**
   * Check if a platform is mapped to a Figma platform
   */
  static isPlatformMapped(platform: Platform): boolean {
    return !!platform.figmaPlatformMapping;
  }
  
  /**
   * Get the Figma platform mapping for a specific platform
   */
  static getPlatformMapping(platform: Platform): string | null {
    return platform.figmaPlatformMapping || null;
  }
  
  /**
   * Validate that all platforms have unique Figma mappings
   */
  static validateAllMappings(platforms: Platform[]): ValidationResult {
    const errors: string[] = [];
    const mappings = new Map<string, string>();
    
    for (const platform of platforms) {
      if (platform.figmaPlatformMapping) {
        if (mappings.has(platform.figmaPlatformMapping)) {
          const existingPlatform = platforms.find(p => p.id === mappings.get(platform.figmaPlatformMapping));
          errors.push(
            `Multiple platforms are mapped to Figma platform "${platform.figmaPlatformMapping}": ` +
            `"${existingPlatform?.displayName}" and "${platform.displayName}". ` +
            `Only one platform can be mapped to each Figma platform.`
          );
        } else {
          mappings.set(platform.figmaPlatformMapping, platform.id);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Get mapping statistics
   */
  static getMappingStats(platforms: Platform[]): {
    totalPlatforms: number;
    mappedPlatforms: number;
    unmappedPlatforms: number;
    mappedToWeb: number;
    mappedToIos: number;
    mappedToAndroid: number;
  } {
    const mappedPlatforms = platforms.filter(p => p.figmaPlatformMapping);
    const mappedToWeb = mappedPlatforms.filter(p => p.figmaPlatformMapping === 'WEB').length;
    const mappedToIos = mappedPlatforms.filter(p => p.figmaPlatformMapping === 'iOS').length;
    const mappedToAndroid = mappedPlatforms.filter(p => p.figmaPlatformMapping === 'ANDROID').length;
    
    return {
      totalPlatforms: platforms.length,
      mappedPlatforms: mappedPlatforms.length,
      unmappedPlatforms: platforms.length - mappedPlatforms.length,
      mappedToWeb,
      mappedToIos,
      mappedToAndroid
    };
  }
} 
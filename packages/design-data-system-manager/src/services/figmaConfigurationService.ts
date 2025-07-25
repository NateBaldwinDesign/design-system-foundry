import type { SyntaxPatterns } from '../components/shared/SyntaxPatternsEditor';

export interface FigmaConfiguration {
  syntaxPatterns: SyntaxPatterns;
  fileKey: string;
  accessToken?: string;
  autoPublish?: boolean;
  publishStrategy?: 'merge' | 'commit';
  lastUpdated?: string;
}

export class FigmaConfigurationService {
  private static readonly STORAGE_KEY = 'figma-configuration';

  /**
   * Get Figma configuration from storage
   */
  static getConfiguration(): FigmaConfiguration | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;
      
      const config = JSON.parse(stored) as FigmaConfiguration;
      
      // Ensure required fields exist
      if (!config.syntaxPatterns || !config.fileKey) {
        console.warn('[FigmaConfigurationService] Invalid configuration found, resetting to defaults');
        return null;
      }
      
      return config;
    } catch (error) {
      console.error('[FigmaConfigurationService] Error loading configuration:', error);
      return null;
    }
  }

  /**
   * Save Figma configuration to storage
   */
  static saveConfiguration(config: FigmaConfiguration): boolean {
    try {
      const configToSave = {
        ...config,
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(configToSave));
      console.log('[FigmaConfigurationService] Configuration saved:', configToSave);
      return true;
    } catch (error) {
      console.error('[FigmaConfigurationService] Error saving configuration:', error);
      return false;
    }
  }

  /**
   * Get default Figma configuration
   */
  static getDefaultConfiguration(): FigmaConfiguration {
    return {
      syntaxPatterns: {
        prefix: '',
        suffix: '',
        delimiter: '_',
        capitalization: 'none',
        formatString: ''
      },
      fileKey: '',
      accessToken: '',
      autoPublish: false,
      publishStrategy: 'merge'
    };
  }

  /**
   * Load configuration from token system (for migration from old schema)
   */
  static loadFromTokenSystem(): FigmaConfiguration {
    // For now, return default configuration
    // This will be updated when the TokenSystem type includes figmaConfiguration
    return this.getDefaultConfiguration();
  }

  /**
   * Update syntax patterns in configuration
   */
  static updateSyntaxPatterns(syntaxPatterns: SyntaxPatterns): boolean {
    const currentConfig = this.getConfiguration() || this.getDefaultConfiguration();
    return this.saveConfiguration({
      ...currentConfig,
      syntaxPatterns
    });
  }

  /**
   * Update file key in configuration
   */
  static updateFileKey(fileKey: string): boolean {
    const currentConfig = this.getConfiguration() || this.getDefaultConfiguration();
    return this.saveConfiguration({
      ...currentConfig,
      fileKey
    });
  }

  /**
   * Update access token in configuration
   */
  static updateAccessToken(accessToken: string): boolean {
    const currentConfig = this.getConfiguration() || this.getDefaultConfiguration();
    return this.saveConfiguration({
      ...currentConfig,
      accessToken
    });
  }

  /**
   * Update auto publish settings
   */
  static updateAutoPublishSettings(autoPublish: boolean, publishStrategy: 'merge' | 'commit'): boolean {
    const currentConfig = this.getConfiguration() || this.getDefaultConfiguration();
    return this.saveConfiguration({
      ...currentConfig,
      autoPublish,
      publishStrategy
    });
  }

  /**
   * Validate Figma configuration
   */
  static validateConfiguration(config: FigmaConfiguration): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate required fields
    if (!config.fileKey) {
      errors.push('File key is required');
    }

    if (!config.syntaxPatterns) {
      errors.push('Syntax patterns are required');
    } else {
      // Validate syntax patterns
      if (config.syntaxPatterns.delimiter && !['', '_', '-', '.', '/'].includes(config.syntaxPatterns.delimiter)) {
        errors.push('Invalid delimiter value');
      }

      if (config.syntaxPatterns.capitalization && !['none', 'uppercase', 'lowercase', 'capitalize'].includes(config.syntaxPatterns.capitalization)) {
        errors.push('Invalid capitalization value');
      }
    }

    // Validate auto publish settings
    if (config.autoPublish && !config.publishStrategy) {
      errors.push('Publish strategy is required when auto publish is enabled');
    }

    if (config.publishStrategy && !['merge', 'commit'].includes(config.publishStrategy)) {
      errors.push('Invalid publish strategy');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Clear configuration (for testing or reset)
   */
  static clearConfiguration(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('[FigmaConfigurationService] Configuration cleared');
  }

  /**
   * Export configuration for backup
   */
  static exportConfiguration(): string {
    const config = this.getConfiguration();
    if (!config) {
      throw new Error('No configuration to export');
    }
    
    return JSON.stringify(config, null, 2);
  }

  /**
   * Import configuration from backup
   */
  static importConfiguration(configJson: string): boolean {
    try {
      const config = JSON.parse(configJson) as FigmaConfiguration;
      const validation = this.validateConfiguration(config);
      
      if (!validation.isValid) {
        console.error('[FigmaConfigurationService] Invalid configuration during import:', validation.errors);
        return false;
      }
      
      return this.saveConfiguration(config);
    } catch (error) {
      console.error('[FigmaConfigurationService] Error importing configuration:', error);
      return false;
    }
  }
} 
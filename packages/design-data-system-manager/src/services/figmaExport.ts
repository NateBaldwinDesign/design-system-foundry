import { TokenSystem } from '@token-model/data-model';
import { 
  FigmaTransformer, 
  FigmaVariable, 
  FigmaVariableCollection, 
  FigmaVariableMode, 
  FigmaVariableModeValue,
  FigmaTransformerOptions
} from '@token-model/data-transformations';
import { FigmaMappingService } from './figmaMappingService';
import { StorageService } from './storage';
import { DataSourceManager } from './dataSourceManager';
import { EnhancedDataMerger } from './enhancedDataMerger';
import { FigmaPreprocessor, FigmaPreprocessorOptions } from './figmaPreprocessor';

export interface FigmaExportOptions {
  fileId?: string;
  accessToken?: string;
  createNewFile?: boolean;
  fileName?: string;
}

export interface FigmaExportResult {
  success: boolean;
  data?: {
    variables: FigmaVariable[];
    collections: FigmaVariableCollection[];
    variableModes: FigmaVariableMode[];
    variableModeValues: FigmaVariableModeValue[];
    stats: {
      created: number;
      updated: number;
      deleted: number;
      collectionsCreated: number;
      collectionsUpdated: number;
    };
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export class FigmaExportService {
  private transformer: FigmaTransformer;
  private preprocessor: FigmaPreprocessor;

  constructor() {
    this.transformer = new FigmaTransformer();
    this.preprocessor = new FigmaPreprocessor();
  }

  /**
   * Get the appropriate token system data based on current data source context
   * For platform extensions and theme overrides, use merged data instead of core data only
   */
  private getTokenSystemForExport(): TokenSystem {
    const dataSourceManager = DataSourceManager.getInstance();
    const context = dataSourceManager.getCurrentContext();
    
    // Check if we're viewing a platform extension or theme override
    const isPlatformExtension = context.currentPlatform && context.currentPlatform !== 'none';
    const isThemeOverride = context.currentTheme && context.currentTheme !== 'none';
    
    if (isPlatformExtension || isThemeOverride) {
      console.log('[FigmaExportService] Using merged data for Figma export (platform extension or theme override detected)');
      
      // Get merged data using EnhancedDataMerger
      const enhancedMerger = EnhancedDataMerger.getInstance();
      const coreData = StorageService.getCoreData();
      const platformExtensions = StorageService.getAllPlatformExtensionData();
      const themeOverrides = StorageService.getAllThemeOverrideData();
      
      if (coreData) {
        const mergedData = enhancedMerger.mergeData(context, coreData, platformExtensions, themeOverrides);
        
        // Convert MergedDataSnapshot back to TokenSystem format
        const tokenSystem: TokenSystem = {
          ...coreData,
          tokens: mergedData.tokens,
          platforms: mergedData.platforms,
          // Keep other properties from core data
          tokenCollections: coreData.tokenCollections,
          dimensions: coreData.dimensions,
          resolvedValueTypes: coreData.resolvedValueTypes,
          themes: coreData.themes,
          taxonomies: coreData.taxonomies,
          figmaConfiguration: coreData.figmaConfiguration,
          // Add any other required properties
        };
        
        console.log('[FigmaExportService] Merged data stats:', {
          tokensCount: tokenSystem.tokens?.length || 0,
          platformsCount: tokenSystem.platforms?.length || 0,
          currentPlatform: context.currentPlatform,
          currentTheme: context.currentTheme
        });
        
        return tokenSystem;
      }
    }
    
    // Default: use core data from localStorage
    console.log('[FigmaExportService] Using core data for Figma export');
    const coreData = StorageService.getCoreData();
    if (!coreData) {
      throw new Error('No core data available for Figma export');
    }
    return coreData;
  }

  /**
   * Get Figma syntax patterns from core data
   * This ensures all Figma transformations use the same syntax patterns regardless of data source
   */
  private async getFigmaSyntaxPatternsFromCore(): Promise<{
    prefix: string;
    suffix: string;
    delimiter: string;
    capitalization: string;
    formatString: string;
  }> {
    console.log('[FigmaExportService] Getting Figma syntax patterns from core data...');
    
    try {
      // Get core data from storage
      const coreData = StorageService.getCoreData();
      
      if (coreData?.figmaConfiguration?.syntaxPatterns) {
        console.log('[FigmaExportService] Found Figma syntax patterns in core data:', coreData.figmaConfiguration.syntaxPatterns);
        return {
          prefix: coreData.figmaConfiguration.syntaxPatterns.prefix || '',
          suffix: coreData.figmaConfiguration.syntaxPatterns.suffix || '',
          delimiter: coreData.figmaConfiguration.syntaxPatterns.delimiter || '/',
          capitalization: coreData.figmaConfiguration.syntaxPatterns.capitalization || 'capitalize',
          formatString: coreData.figmaConfiguration.syntaxPatterns.formatString || ''
        };
      }
      
      // If no syntax patterns found in core data, use defaults
      console.log('[FigmaExportService] No Figma syntax patterns found in core data, using defaults');
      return {
        prefix: '',
        suffix: '',
        delimiter: '/',
        capitalization: 'capitalize',
        formatString: ''
      };
    } catch (error) {
      console.warn('[FigmaExportService] Error getting Figma syntax patterns from core data:', error);
      // Return defaults on error
      return {
        prefix: '',
        suffix: '',
        delimiter: '/',
        capitalization: 'capitalize',
        formatString: ''
      };
    }
  }

  /**
   * Generate Figma variable names using core syntax patterns
   * This replaces the old platform-based approach for variable naming
   */
  private generateFigmaVariableNames(
    tokenSystem: TokenSystem,
    syntaxPatterns: {
      prefix: string;
      suffix: string;
      delimiter: string;
      capitalization: string;
      formatString: string;
    }
  ): TokenSystem {
    console.log('[FigmaExportService] Generating Figma variable names using syntax patterns:', syntaxPatterns);
    
    // Add the syntax patterns to the token system's figmaConfiguration
    const updatedTokenSystem = {
      ...tokenSystem,
      figmaConfiguration: {
        ...tokenSystem.figmaConfiguration,
        syntaxPatterns: syntaxPatterns
      }
    };
    
    return updatedTokenSystem;
  }

  /**
   * Get mapped platforms for Figma export
   */
  private getMappedPlatforms(tokenSystem: TokenSystem): {
    mappedPlatforms: Array<{ platformId: string; figmaPlatform: string; displayName: string }>;
    unmappedPlatforms: string[];
  } {
    const mappedPlatforms: Array<{ platformId: string; figmaPlatform: string; displayName: string }> = [];
    const unmappedPlatforms: string[] = [];
    
    for (const platform of tokenSystem.platforms || []) {
      if (platform.figmaPlatformMapping) {
        mappedPlatforms.push({
          platformId: platform.id,
          figmaPlatform: platform.figmaPlatformMapping,
          displayName: platform.displayName
        });
      } else {
        unmappedPlatforms.push(platform.displayName);
      }
    }
    
    return { mappedPlatforms, unmappedPlatforms };
  }

  /**
   * Clean legacy platform data from token system
   * This removes deprecated platformOverrides and codeSyntax that reference non-existent platforms
   */
  private cleanLegacyPlatformOverrides(tokenSystem: TokenSystem): TokenSystem {
    console.log('[FigmaExportService] Cleaning legacy platform data...');
    
    // Get valid platform IDs from the token system
    const validPlatformIds = new Set(tokenSystem.platforms?.map(p => p.id) || []);
    console.log('[FigmaExportService] Valid platform IDs:', Array.from(validPlatformIds));
    
    const cleanedTokens = tokenSystem.tokens?.map(token => {
      // Clean valuesByMode - remove platformOverrides
      const cleanedValuesByMode = token.valuesByMode?.map(valueByMode => {
        const { platformOverrides, ...cleanedValueByMode } = valueByMode as any;
        if (platformOverrides) {
          console.log(`[FigmaExportService] Removed platformOverrides from token ${token.id}`);
        }
        return cleanedValueByMode;
      });
      
      // Note: codeSyntax has been removed from the schema - it's now generated on-demand
      
      return {
        ...token,
        valuesByMode: cleanedValuesByMode
      };
    }) || [];
    
    return {
      ...tokenSystem,
      tokens: cleanedTokens
    };
  }

  async exportToFigma(options: FigmaExportOptions = {}): Promise<FigmaExportResult> {
    console.log('[FigmaExportService] Starting Figma export...');
    
    try {
      // 1. Use existing data management services to get current merged data
      // No need to manually determine source context - use existing infrastructure
      const mergedData = StorageService.getMergedData();
      if (!mergedData) {
        return {
          success: false,
          error: {
            code: 'NO_DATA_AVAILABLE',
            message: 'No merged data available for export'
          }
        };
      }
      
      // CRITICAL: Log dimensionOrder for debugging
      console.log('[FigmaExportService] 🔍 CRITICAL DEBUG - mergedData dimensionOrder:', mergedData.dimensionOrder);
      console.log('[FigmaExportService] 🔍 CRITICAL DEBUG - mergedData dimensions:', mergedData.dimensions?.map(d => ({ id: d.id, displayName: d.displayName })));
      
      if (!mergedData.dimensionOrder || mergedData.dimensionOrder.length === 0) {
        console.error('[FigmaExportService] 🚨 CRITICAL ERROR: mergedData dimensionOrder is missing or empty!');
        console.error('[FigmaExportService] 🚨 This will prevent daisy-chaining from working!');
        return {
          success: false,
          error: {
            code: 'MISSING_DIMENSION_ORDER',
            message: 'Design system is missing dimension order. This will prevent proper variable creation.'
          }
        };
      }
      
      // 2. Pre-process the data for Figma export using existing source context
      const preprocessorOptions: FigmaPreprocessorOptions = {
        includePlatformCodeSyntax: true
      };
      
      const preprocessorResult = await this.preprocessor.preprocessForFigma(preprocessorOptions);
      
      // CRITICAL: Log dimensionOrder after preprocessing
      console.log('[FigmaExportService] 🔍 CRITICAL DEBUG - preprocessorResult dimensionOrder:', preprocessorResult.enhancedTokenSystem.dimensionOrder);
      console.log('[FigmaExportService] 🔍 CRITICAL DEBUG - preprocessorResult dimensions:', preprocessorResult.enhancedTokenSystem.dimensions?.map(d => ({ id: d.id, displayName: d.displayName })));
      
      if (!preprocessorResult.enhancedTokenSystem.dimensionOrder || preprocessorResult.enhancedTokenSystem.dimensionOrder.length === 0) {
        console.error('[FigmaExportService] 🚨 CRITICAL ERROR: preprocessorResult dimensionOrder is missing or empty!');
        console.error('[FigmaExportService] 🚨 This will prevent daisy-chaining from working!');
        return {
          success: false,
          error: {
            code: 'PREPROCESSOR_DIMENSION_ORDER_LOST',
            message: 'Dimension order was lost during preprocessing. This will prevent proper variable creation.'
          }
        };
      }
      
      // 3. Check validation results
      if (!preprocessorResult.validation.isValid) {
        console.error('[FigmaExportService] Preprocessing validation failed:', preprocessorResult.validation.errors);
        return {
          success: false,
          error: {
            code: 'PREPROCESSING_FAILED',
            message: 'Data preprocessing failed',
            details: preprocessorResult.validation.errors
          }
        };
      }
      
      if (preprocessorResult.validation.warnings.length > 0) {
        console.warn('[FigmaExportService] Preprocessing warnings:', preprocessorResult.validation.warnings);
      }
      
      // 4. Set up transformer options
      const transformerOptions = this.buildTransformerOptions(options);
      
      // 5. Transform the pre-processed data
      console.log('[FigmaExportService] Starting transformation with pre-processed data...');
      const result = await this.transformer.transform(preprocessorResult.enhancedTokenSystem, transformerOptions);
      
      if (!result.success) {
        console.error('[FigmaExportService] Transformation failed:', result.error);
        return {
          success: false,
          error: result.error
        };
      }

      console.log('[FigmaExportService] Export completed successfully');
      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      console.error('[FigmaExportService] Unexpected error during export:', error);
      return {
        success: false,
        error: {
          code: 'TRANSFORMATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown transformation error',
          details: error
        }
      };
    }
  }
  
  private buildTransformerOptions(options: FigmaExportOptions): FigmaTransformerOptions {
    const transformerOptions: Partial<FigmaTransformerOptions> = {
      updateExisting: true
    };
    
    if (options.fileId) transformerOptions.fileKey = options.fileId;
    if (options.accessToken) transformerOptions.accessToken = options.accessToken;
    
    return transformerOptions as FigmaTransformerOptions;
  }

  /**
   * Get export preview without actually exporting
   */
  async getExportPreview(options: FigmaExportOptions = {}): Promise<FigmaExportResult> {
    return this.exportToFigma(options);
  }

  /**
   * Validate Figma export options
   */
  validateExportOptions(options: FigmaExportOptions): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // For export generation, we don't need fileId (only needed for publishing)
    // if (!options.createNewFile && !options.fileId) {
    //   errors.push('Either fileId or createNewFile must be specified');
    // }

    // Access token is optional for export generation (only needed for publishing)
    // if (!options.accessToken) {
    //   errors.push('Figma access token is required');
    // }

    if (options.createNewFile && !options.fileName) {
      errors.push('fileName is required when creating a new file');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get transformer information
   */
  getTransformerInfo() {
    return this.transformer.getInfo();
  }

  /**
   * Publish the current design system data to Figma Variables API
   */
  async publishToFigma(options: FigmaExportOptions = {}): Promise<FigmaExportResult> {
    console.log('[FigmaExportService] Starting publishing to Figma...');
    console.log('[FigmaExportService] Options:', options);
    
    if (!options.fileId) {
      return {
        success: false,
        error: {
          code: 'MISSING_FILE_ID',
          message: 'File ID is required for publishing to Figma'
        }
      };
    }

    if (!options.accessToken) {
      return {
        success: false,
        error: {
          code: 'MISSING_ACCESS_TOKEN',
          message: 'Access token is required for publishing to Figma'
        }
      };
    }

    console.log('[FigmaExportService] Starting publishing to Figma...');
    
    try {
      // First, transform the data using the existing export logic
      const exportResult = await this.exportToFigma(options);
      
      console.log('[FigmaExportService] Export result:', {
        success: exportResult.success,
        hasData: !!exportResult.data,
        error: exportResult.error
      });
      
      if (!exportResult.success || !exportResult.data) {
        console.error('[FigmaExportService] Export failed or no data:', exportResult.error);
        return exportResult;
      }

      // Validate the data before sending to Figma API
      console.log('[FigmaExportService] 🔍 VALIDATING DATA BEFORE SENDING TO FIGMA:');
      console.log('[FigmaExportService] - Collections count:', exportResult.data.collections.length);
      console.log('[FigmaExportService] - Variables count:', exportResult.data.variables.length);
      console.log('[FigmaExportService] - Variable Modes count:', exportResult.data.variableModes.length);
      console.log('[FigmaExportService] - Variable Mode Values count:', exportResult.data.variableModeValues.length);
      
      // Check for empty or invalid data
      if (exportResult.data.collections.length === 0) {
        console.error('[FigmaExportService] 🚨 CRITICAL ERROR: No collections to send to Figma!');
        return {
          success: false,
          error: {
            code: 'NO_COLLECTIONS',
            message: 'No variable collections to publish to Figma. Please ensure your design system has data.'
          }
        };
      }
      
      if (exportResult.data.variables.length === 0) {
        console.error('[FigmaExportService] 🚨 CRITICAL ERROR: No variables to send to Figma!');
        return {
          success: false,
          error: {
            code: 'NO_VARIABLES',
            message: 'No variables to publish to Figma. Please ensure your design system has tokens.'
          }
        };
      }

      // Step 2: POST the transformed data to Figma API
      console.log('[FigmaExportService] POSTing data to Figma API...');
      console.log('[FigmaExportService] URL:', `https://api.figma.com/v1/files/${options.fileId}/variables`);
      
      // Log the complete POST payload for debugging
      console.log('[FigmaExportService] 🔍 COMPLETE POST PAYLOAD DATA:');
      console.log('[FigmaExportService] Full Collections Array:', JSON.stringify(exportResult.data.collections, null, 2));
      console.log('[FigmaExportService] Full Variables Array:', JSON.stringify(exportResult.data.variables, null, 2));
      console.log('[FigmaExportService] Full Variable Modes Array:', JSON.stringify(exportResult.data.variableModes, null, 2));
      console.log('[FigmaExportService] Full Variable Mode Values Array:', JSON.stringify(exportResult.data.variableModeValues, null, 2));
      
      // Log summary statistics
      console.log('[FigmaExportService] POST PAYLOAD SUMMARY:');
      console.log('[FigmaExportService] - Collections:', {
        total: exportResult.data.collections.length,
        create: exportResult.data.collections.filter(c => c.action === 'CREATE').length,
        update: exportResult.data.collections.filter(c => c.action === 'UPDATE').length
      });
      console.log('[FigmaExportService] - Variables:', {
        total: exportResult.data.variables.length,
        create: exportResult.data.variables.filter(v => v.action === 'CREATE').length,
        update: exportResult.data.variables.filter(v => v.action === 'UPDATE').length
      });
      console.log('[FigmaExportService] - Variable Modes:', {
        total: exportResult.data.variableModes.length,
        create: exportResult.data.variableModes.filter(m => m.action === 'CREATE').length,
        update: exportResult.data.variableModes.filter(m => m.action === 'UPDATE').length
      });
      console.log('[FigmaExportService] - Variable Mode Values:', exportResult.data.variableModeValues.length);
      
      // Log the exact JSON being sent to Figma API
      const postPayload = {
        variables: exportResult.data.variables,
        variableCollections: exportResult.data.collections,
        variableModes: exportResult.data.variableModes,
        variableModeValues: exportResult.data.variableModeValues
      };
      console.log('[FigmaExportService] 🔍 EXACT JSON BEING SENT TO FIGMA API:');
      console.log(JSON.stringify(postPayload, null, 2));
      
      const response = await fetch(`https://api.figma.com/v1/files/${options.fileId}/variables`, {
        method: 'POST',
        headers: {
          'X-Figma-Token': options.accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          variables: exportResult.data.variables,
          variableCollections: exportResult.data.collections,
          variableModes: exportResult.data.variableModes,
          variableModeValues: exportResult.data.variableModeValues
        })
      });

      console.log('[FigmaExportService] Response status:', response.status);
      console.log('[FigmaExportService] Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[FigmaExportService] 🚨 FIGMA API ERROR RESPONSE:');
        console.error('[FigmaExportService] Status:', response.status);
        console.error('[FigmaExportService] Status Text:', response.statusText);
        console.error('[FigmaExportService] Error Body:', errorText);
        return {
          success: false,
          error: {
            code: 'FIGMA_API_ERROR',
            message: `Figma API request failed: ${response.status} ${response.statusText} - ${errorText}`
          }
        };
      }

      const apiResponse = await response.json();
      console.log('[FigmaExportService] Figma API response:', apiResponse);

      // Update mappings with the API response
      await FigmaMappingService.updateMappingFromApiResponse(options.fileId, apiResponse);
      
      console.log('[FigmaExportService] Publishing completed successfully');
      return {
        success: true,
        data: exportResult.data
      };
    } catch (error) {
      console.error('[FigmaExportService] Unexpected error during publishing:', error);
      return {
        success: false,
        error: {
          code: 'PUBLISHING_ERROR',
          message: error instanceof Error ? error.message : 'Unknown publishing error',
          details: error
        }
      };
    }
  }
} 
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

  constructor() {
    this.transformer = new FigmaTransformer();
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
      
      // Clean codeSyntax - remove entries that reference non-existent platforms
      const originalCodeSyntax = token.codeSyntax || [];
      const cleanedCodeSyntax = originalCodeSyntax.filter(syntax => {
        const platformId = (syntax as any).platformId;
        if (platformId && !validPlatformIds.has(platformId)) {
          console.log(`[FigmaExportService] Removed codeSyntax for non-existent platform ${platformId} from token ${token.id}`);
          return false;
        }
        return true;
      });
      
      if (originalCodeSyntax.length !== cleanedCodeSyntax.length) {
        console.log(`[FigmaExportService] Cleaned codeSyntax for token ${token.id}: ${originalCodeSyntax.length} -> ${cleanedCodeSyntax.length} entries`);
      }
      
      return {
        ...token,
        valuesByMode: cleanedValuesByMode,
        codeSyntax: cleanedCodeSyntax
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
      // Get the appropriate token system data based on current data source context
      const tokenSystem = this.getTokenSystemForExport();
      
      // Clean legacy platformOverrides data before processing
      const cleanedTokenSystem = this.cleanLegacyPlatformOverrides(tokenSystem);
      
      // Log platform mapping information
      const { mappedPlatforms, unmappedPlatforms } = this.getMappedPlatforms(cleanedTokenSystem);
      console.log('[FigmaExportService] Platform mappings:', mappedPlatforms);
      if (unmappedPlatforms.length > 0) {
        console.warn('[FigmaExportService] Unmapped platforms (will be excluded):', unmappedPlatforms);
      }
      
      // Get Figma syntax patterns from core data
      const syntaxPatterns = await this.getFigmaSyntaxPatternsFromCore();
      console.log('[FigmaExportService] Figma syntax patterns:', syntaxPatterns);

            // Generate Figma variable names using core syntax patterns
      const tokenSystemWithGeneratedNames = this.generateFigmaVariableNames(cleanedTokenSystem, syntaxPatterns);
      console.log('[FigmaExportService] Token system with generated Figma variable names:', tokenSystemWithGeneratedNames);

      // Convert FigmaExportOptions to FigmaTransformerOptions
      const transformerOptions = {
        updateExisting: true
      } as Partial<FigmaTransformerOptions>;
      if (options.fileId) transformerOptions.fileKey = options.fileId;
      if (options.accessToken) transformerOptions.accessToken = options.accessToken;
      
      // Step 1: Load existing Figma data if we have fileId and accessToken
      let existingFigmaData: any = undefined;
      if (options.fileId && options.accessToken) {
        try {
          console.log('[FigmaExportService] Loading existing Figma data...');
          console.log('[FigmaExportService] API URL:', `https://api.figma.com/v1/files/${options.fileId}/variables/local`);
          console.log('[FigmaExportService] Access token provided:', !!options.accessToken);
          
          const response = await fetch(`https://api.figma.com/v1/files/${options.fileId}/variables/local`, {
            headers: {
              'X-Figma-Token': options.accessToken
            }
          });
          
          console.log('[FigmaExportService] API Response status:', response.status, response.statusText);
          
          if (response.ok) {
            existingFigmaData = await response.json();
            console.log('[FigmaExportService] Raw API response:', existingFigmaData);
            console.log('[FigmaExportService] API response keys:', Object.keys(existingFigmaData));
            
            // Extract the actual data from the nested meta structure
            const extractedData = {
              variables: existingFigmaData.meta?.variables || {},
              variableCollections: existingFigmaData.meta?.variableCollections || {},
              variableModes: {} // Will be populated from collections
            };
            
            // Extract mode IDs from collections (modes are nested in each collection)
            Object.entries(extractedData.variableCollections).forEach(([collectionId, collection]: [string, any]) => {
              if (collection.modes && Array.isArray(collection.modes)) {
                collection.modes.forEach((mode: any) => {
                  if (mode.modeId) {
                    extractedData.variableModes[mode.modeId] = {
                      id: mode.modeId,
                      name: mode.name,
                      variableCollectionId: collectionId
                    };
                  }
                });
              }
            });
            
            console.log('[FigmaExportService] Extracted Figma data:', {
              variablesCount: Object.keys(extractedData.variables).length,
              collectionsCount: Object.keys(extractedData.variableCollections).length,
              modesCount: Object.keys(extractedData.variableModes).length,
              hasVariables: !!extractedData.variables,
              hasCollections: !!extractedData.variableCollections,
              hasModes: !!extractedData.variableModes
            });
            
            // Log sample data to see the structure
            if (extractedData.variables) {
              const sampleVariables = Object.entries(extractedData.variables).slice(0, 3);
              console.log('[FigmaExportService] Sample variables:', sampleVariables);
            }
            if (extractedData.variableCollections) {
              const sampleCollections = Object.entries(extractedData.variableCollections).slice(0, 3);
              console.log('[FigmaExportService] Sample collections:', sampleCollections);
            }
            if (extractedData.variableModes) {
              const sampleModes = Object.entries(extractedData.variableModes).slice(0, 3);
              console.log('[FigmaExportService] Sample modes:', sampleModes);
            }
            
            // Use the extracted data instead of the raw response
            existingFigmaData = extractedData;
          } else {
            const errorText = await response.text();
            console.warn('[FigmaExportService] Failed to load existing Figma data:', response.status, response.statusText);
            console.warn('[FigmaExportService] Error response body:', errorText);
          }
        } catch (error) {
          console.warn('[FigmaExportService] Error loading existing Figma data:', error);
        }
      } else {
        console.log('[FigmaExportService] Skipping existing data load - missing fileId or accessToken:', {
          hasFileId: !!options.fileId,
          hasAccessToken: !!options.accessToken
        });
      }
      
      // Step 2: Get existing tempToRealId mapping if available
      let tempToRealId: Record<string, string> | undefined = undefined;
      if (options.fileId) {
        console.log('[FigmaExportService] Attempting to load tempToRealId mapping for fileId:', options.fileId);
        const mappingOptions = await FigmaMappingService.getTransformerOptions(options.fileId);
        console.log('[FigmaExportService] Raw mapping options from FigmaMappingService:', mappingOptions);
        
        if (mappingOptions.tempToRealId) {
          tempToRealId = mappingOptions.tempToRealId;
          console.log('[FigmaExportService] ✅ SUCCESS: Loaded tempToRealId mapping:', {
            mappingCount: Object.keys(tempToRealId).length,
            sampleMappings: Object.entries(tempToRealId).slice(0, 5)
          });
        } else {
          // For files with no existing variables, we can proceed without tempToRealId mapping
          const hasExistingVariables = existingFigmaData?.meta?.variables && existingFigmaData.meta.variables.length > 0;
          if (hasExistingVariables) {
            console.log('[FigmaExportService] ❌ FAILED: No tempToRealId mapping found for fileId:', options.fileId);
            return {
              success: false,
              error: {
                code: 'MISSING_MAPPING',
                message: 'tempToRealId mapping is required for files with existing variables',
                details: { fileId: options.fileId }
              }
            };
          } else {
            console.log('[FigmaExportService] ℹ️ No tempToRealId mapping found, but file has no existing variables - proceeding with new variable creation');
          }
        }
      } else {
        console.log('[FigmaExportService] No fileId provided, skipping tempToRealId loading');
      }
      
      // Step 3: Set up complete transformer options
      transformerOptions.existingFigmaData = existingFigmaData;
      transformerOptions.tempToRealId = tempToRealId;
      
      // Type assertion to satisfy the transformer
      const finalTransformerOptions = transformerOptions as FigmaTransformerOptions;
      
      console.log('[FigmaExportService] Complete transformer options:', {
        fileKey: finalTransformerOptions.fileKey,
        hasExistingData: !!finalTransformerOptions.existingFigmaData,
        hasTempToRealId: !!finalTransformerOptions.tempToRealId,
        tempToRealIdCount: finalTransformerOptions.tempToRealId ? Object.keys(finalTransformerOptions.tempToRealId).length : 0
      });

      // Validate the token system first
      console.log('[FigmaExportService] Starting validation...');
      const validation = await this.transformer.validate(tokenSystemWithGeneratedNames, finalTransformerOptions);
      console.log('[FigmaExportService] Validation result:', {
        isValid: validation.isValid,
        errorsCount: validation.errors?.length || 0,
        warningsCount: validation.warnings?.length || 0,
        errors: validation.errors,
        warnings: validation.warnings
      });
      
      // DEBUG: Always proceed with transformation to see the output, even if validation fails
      console.log('[FigmaExportService] 🔍 DEBUG MODE: Proceeding with transformation despite validation errors to show transformed data');
      
      if (!validation.isValid) {
        console.error('[FigmaExportService] Validation failed with errors:', validation.errors);
        // Don't return early - continue to transformation for debugging
      }

      // Transform the data to Figma format
      console.log('[FigmaExportService] Starting transformation...');
      const result = await this.transformer.transform(tokenSystemWithGeneratedNames, finalTransformerOptions);
      console.log('[FigmaExportService] Transformation result:', {
        success: result.success,
        hasData: !!result.data,
        variablesCount: result.data?.variables?.length || 0,
        collectionsCount: result.data?.collections?.length || 0,
        variableModeValuesCount: result.data?.variableModeValues?.length || 0,
        error: result.error
      });
      
      // DEBUG: Log the complete transformed data structure
      console.log('[FigmaExportService] 🔍 DEBUG: Complete transformed data structure:', {
        variables: result.data?.variables?.slice(0, 3), // First 3 variables
        collections: result.data?.collections,
        variableModes: result.data?.variableModes,
        variableModeValues: result.data?.variableModeValues?.slice(0, 5), // First 5 mode values
        stats: result.data?.stats
      });
      
      // DEBUG: Log validation errors in detail
      if (!validation.isValid && validation.errors) {
        console.log('[FigmaExportService] 🔍 DEBUG: Detailed validation errors:');
        validation.errors.forEach((error, index) => {
          console.log(`[FigmaExportService] Error ${index + 1}:`, {
            message: error.message,
            path: error.path,
            code: error.code,
            details: error
          });
        });
      }
      
      // Debug: Log sample variable mode values
      if (result.data?.variableModeValues && result.data.variableModeValues.length > 0) {
        console.log('[FigmaExportService] Sample variable mode values (TRANSFORMED OUTPUT):');
        result.data.variableModeValues.slice(0, 5).forEach((vmv, index) => {
          console.log(`[FigmaExportService] Mode value ${index + 1}:`, {
            variableId: vmv.variableId,
            modeId: vmv.modeId,
            value: vmv.value,
            valueType: typeof vmv.value,
            isObject: typeof vmv.value === 'object' && vmv.value !== null,
            isAlias: typeof vmv.value === 'object' && vmv.value !== null && 'type' in vmv.value && vmv.value.type === 'VARIABLE_ALIAS',
            // Add detailed value inspection for debugging
            valueDetails: typeof vmv.value === 'object' && vmv.value !== null ? {
              keys: Object.keys(vmv.value),
              hasR: 'r' in vmv.value,
              hasG: 'g' in vmv.value,
              hasB: 'b' in vmv.value,
              hasA: 'a' in vmv.value,
              isRGB: 'r' in vmv.value && 'g' in vmv.value && 'b' in vmv.value
            } : null
          });
        });
      }
      
      if (!result.success) {
        console.error('[FigmaExportService] Transformation failed:', result.error);
        return {
          success: false,
          error: result.error
        };
      }

      // If validation failed but transformation succeeded, return validation error
      if (!validation.isValid) {
        console.log('[FigmaExportService] 🔍 DEBUG: Transformation succeeded but validation failed - returning validation error');
        return {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Token system validation failed',
            details: validation.errors
          }
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
    if (!options.accessToken || !options.fileId) {
      return {
        success: false,
        error: {
          code: 'MISSING_CREDENTIALS',
          message: 'Figma access token and file ID are required for publishing'
        }
      };
    }

    console.log('[FigmaExportService] Starting publishing to Figma...');
    
    try {
      // First, transform the data using the existing export logic
      const exportResult = await this.exportToFigma(options);
      
      if (!exportResult.success || !exportResult.data) {
        return exportResult;
      }

      // Step 2: POST the transformed data to Figma API
      console.log('[FigmaExportService] POSTing data to Figma API...');
      
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

      if (!response.ok) {
        const errorText = await response.text();
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
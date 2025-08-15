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
        console.log('[FigmaExportService] Core data dimensionOrder before merging:', coreData.dimensionOrder);
        
        const mergedData = enhancedMerger.mergeData(context, coreData, platformExtensions, themeOverrides);
        
        console.log('[FigmaExportService] Merged data dimensionOrder after merging:', mergedData.dimensionOrder);
        
        // Ensure we have a valid fileKey
        const fileKey = coreData.figmaConfiguration?.fileKey || 'default-figma-file';
        
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
          figmaConfiguration: {
            ...coreData.figmaConfiguration,
            fileKey: fileKey,
            fileColorProfile: coreData.figmaConfiguration?.fileColorProfile || 'srgb'
          },
          // Add any other required properties
          systemName: coreData.systemName,
          systemId: coreData.systemId,
          version: coreData.version,
          versionHistory: coreData.versionHistory,
          dimensionOrder: mergedData.dimensionOrder, // Use merged dimensionOrder instead of core
          taxonomyOrder: coreData.taxonomyOrder,
          standardPropertyTypes: coreData.standardPropertyTypes,
          componentProperties: coreData.componentProperties,
          componentCategories: coreData.componentCategories,
          components: coreData.components,
          extensions: coreData.extensions
        };
        
        console.log('[FigmaExportService] Final tokenSystem dimensionOrder:', tokenSystem.dimensionOrder);
        
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
        const { platformOverrides, ...cleanedValueByMode } = valueByMode as { platformOverrides?: unknown; [key: string]: unknown };
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

  /**
   * Export the current design system data to Figma Variables format
   */
  async exportToFigma(options: FigmaExportOptions = {}, mergedTokenSystem?: TokenSystem): Promise<FigmaExportResult> {
    console.log('[FigmaExportService] Starting Figma export...');
    
    try {
      // Use provided merged token system or get it from the standard method
      let tokenSystem: TokenSystem;
      
      if (mergedTokenSystem) {
        console.log('[FigmaExportService] Using provided merged token system');
        tokenSystem = mergedTokenSystem;
      } else {
        console.log('[FigmaExportService] Getting token system for export...');
        tokenSystem = await this.getTokenSystemForExport();
      }
      
      // CRITICAL: Log dimensionOrder for debugging
      console.log('[FigmaExportService] 🔍 CRITICAL DEBUG - tokenSystem dimensionOrder:', tokenSystem.dimensionOrder);
      console.log('[FigmaExportService] 🔍 CRITICAL DEBUG - tokenSystem dimensions:', tokenSystem.dimensions?.map(d => ({ id: d.id, displayName: d.displayName })));
      console.log('[FigmaExportService] 🔍 CRITICAL DEBUG - tokenSystem tokens count:', tokenSystem.tokens?.length);
      
      if (!tokenSystem.dimensionOrder || tokenSystem.dimensionOrder.length === 0) {
        console.error('[FigmaExportService] 🚨 CRITICAL ERROR: tokenSystem dimensionOrder is missing or empty!');
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
  async publishToFigma(options: FigmaExportOptions = {}, mergedTokenSystem?: TokenSystem): Promise<FigmaExportResult> {
    console.log('[FigmaExportService] Starting publishing to Figma...');
    console.log('[FigmaExportService] Options:', options);
    console.log('[FigmaExportService] Merged token system provided:', !!mergedTokenSystem);
    
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

    try {
      // Step 1-2: Get source context and repository
      const dataSourceManager = DataSourceManager.getInstance();
      const context = dataSourceManager.getCurrentContext();
      
      console.log('[FigmaExportService] Debug - Full context:', {
        currentPlatform: context.currentPlatform,
        currentTheme: context.currentTheme,
        repositories: {
          core: context.repositories.core,
          platforms: Object.keys(context.repositories.platforms),
          themes: Object.keys(context.repositories.themes)
        }
      });
      
      const sourceType = context.currentPlatform ? 'platform-extension' : 
                         context.currentTheme ? 'theme-override' : 'core';
      
      let targetRepository = sourceType === 'core' ? context.repositories.core :
                           sourceType === 'platform-extension' ? context.repositories.platforms[context.currentPlatform!] :
                           context.repositories.themes[context.currentTheme!];

      // Fallback: If no repository found in DataSourceManager, try to get from GitHubApiService
      if (!targetRepository) {
        console.log('[FigmaExportService] No repository found in DataSourceManager, trying GitHubApiService fallback...');
        
        try {
          const { GitHubApiService } = await import('./githubApi');
          const selectedRepo = GitHubApiService.getSelectedRepositoryInfo();
          
          if (selectedRepo) {
            console.log('[FigmaExportService] Found repository from GitHubApiService:', selectedRepo);
            targetRepository = {
              fullName: selectedRepo.fullName,
              branch: selectedRepo.branch || 'main',
              filePath: selectedRepo.filePath,
              fileType: selectedRepo.fileType === 'theme-override' ? 'theme-override' : 'schema'
            };
          } else {
            // Try to get from localStorage as another fallback
            const storedRepoStr = localStorage.getItem('github_selected_repo');
            if (storedRepoStr) {
              try {
                const storedRepo = JSON.parse(storedRepoStr);
                console.log('[FigmaExportService] Found repository from localStorage:', storedRepo);
                targetRepository = {
                  fullName: storedRepo.fullName,
                  branch: storedRepo.branch || 'main',
                  filePath: storedRepo.filePath,
                  fileType: storedRepo.fileType === 'theme-override' ? 'theme-override' : 'schema'
                };
              } catch (parseError) {
                console.error('[FigmaExportService] Error parsing stored repository:', parseError);
              }
            } else {
              console.log('[FigmaExportService] No repository found in GitHubApiService or localStorage');
            }
          }
        } catch (error) {
          console.error('[FigmaExportService] Error getting repository from GitHubApiService:', error);
        }
      }

      if (!targetRepository) {
        return {
          success: false,
          error: {
            code: 'NO_REPOSITORY_FOUND',
            message: `No repository found for ${sourceType}: ${context.currentPlatform || context.currentTheme}. Please ensure you have selected a GitHub repository.`
          }
        };
      }

      console.log('[FigmaExportService] Repository context:', {
        sourceType,
        targetRepository: targetRepository.fullName,
        currentPlatform: context.currentPlatform,
        currentTheme: context.currentTheme
      });

      // Step 3-4: Load existing mappings from correct repository
      const existingMappingData = await FigmaMappingService.getMappingFromGitHub(
        options.fileId,
        {
          owner: targetRepository.fullName.split('/')[0],
          repo: targetRepository.fullName.split('/')[1],
          type: sourceType,
          systemId: 'design-system'
        }
      );

      let tempToRealId: Record<string, string> = {};
      if (existingMappingData?.tempToRealId) {
        tempToRealId = { ...existingMappingData.tempToRealId };
        console.log(`[FigmaExportService] 🔍 ORIGINAL tempToRealId mappings loaded:`, {
          count: Object.keys(tempToRealId).length,
          mappings: tempToRealId
        });
      } else {
        console.log(`[FigmaExportService] 🔍 NO existing tempToRealId mappings found`);
      }

      // Step 5-6: Fetch and flatten Figma data
      const existingFigmaData = await this.fetchExistingFigmaData(options.fileId, options.accessToken);
      const currentFileIds = this.flattenFigmaIds(existingFigmaData);
      console.log(`[FigmaExportService] 🔍 Found ${currentFileIds.length} existing Figma IDs:`, currentFileIds);

      // Step 7: Prune invalid mappings
      const prunedTempToRealId = this.pruneMappings(tempToRealId, currentFileIds);
      console.log(`[FigmaExportService] 🔍 PRUNED tempToRealId mappings:`, {
        count: Object.keys(prunedTempToRealId).length,
        mappings: prunedTempToRealId
      });

      // Step 8: Transform with proper context
      const transformerOptions: FigmaTransformerOptions = {
        fileKey: options.fileId,
        accessToken: options.accessToken,
        updateExisting: true,
        existingFigmaData,
        tempToRealId: prunedTempToRealId
      };

      // Use provided merged token system or get it from the standard method
      let tokenSystem: TokenSystem;
      
      if (mergedTokenSystem) {
        console.log('[FigmaExportService] Using provided merged token system');
        tokenSystem = mergedTokenSystem;
      } else {
        console.log('[FigmaExportService] Getting token system for export...');
        tokenSystem = await this.getTokenSystemForExport();
      }

      const result = await this.transformer.transform(tokenSystem, transformerOptions);

      if (!result.success) {
        return result;
      }

      // Step 11-12: Post to API and merge response
      const apiResponse = await this.postToFigmaAPI(result.data!, options);
      console.log(`[FigmaExportService] 🔍 API RESPONSE tempToRealId:`, {
        count: Object.keys(apiResponse.tempToRealId).length,
        mappings: apiResponse.tempToRealId
      });
      
      const mergedTempToRealId = { ...prunedTempToRealId, ...apiResponse.tempToRealId };
      console.log(`[FigmaExportService] 🔍 MERGED tempToRealId mappings:`, {
        count: Object.keys(mergedTempToRealId).length,
        mappings: mergedTempToRealId
      });

      // Step 13-14: Save and commit mappings
      await this.saveAndCommitMappings(options.fileId, mergedTempToRealId, context, targetRepository);

      return { success: true, data: result.data };
    } catch (error) {
      console.error('[FigmaExportService] Publishing failed:', error);
      return {
        success: false,
        error: {
          code: 'PUBLISHING_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error during publishing'
        }
      };
    }
  }

  /**
   * Publish the transformed data to Figma API
   */
  private async publishToFigmaAPI(data: any, options: FigmaExportOptions): Promise<FigmaExportResult> {
    console.log('[FigmaExportService] Publishing to Figma API...');
    
    const response = await fetch(`https://api.figma.com/v1/files/${options.fileId}/variables`, {
      method: 'POST',
      headers: {
        'X-Figma-Token': options.accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        variables: data.variables,
        variableCollections: data.collections,
        variableModes: data.variableModes,
        variableModeValues: data.variableModeValues
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[FigmaExportService] Figma API error:', response.status, errorText);
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
    await FigmaMappingService.updateMappingFromApiResponse(options.fileId!, apiResponse);
    
    return {
      success: true,
      data: data
    };
  }

  /**
   * Fetch existing Figma data from the API
   */
  private async fetchExistingFigmaData(fileKey: string, accessToken: string): Promise<unknown> {
    try {
      const response = await fetch(`https://api.figma.com/v1/files/${fileKey}/variables/local`, {
        headers: {
          'X-Figma-Token': accessToken,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log(`[FigmaExportService] No existing variables found in Figma file (404)`);
          return null;
        }
        throw new Error(`Failed to fetch Figma variables: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`[FigmaExportService] Successfully fetched existing Figma data`);
      return data;
    } catch (error) {
      console.error(`[FigmaExportService] Error fetching Figma data:`, error);
      return null;
    }
  }

  /**
   * Flatten Figma IDs from the API response
   */
  private flattenFigmaIds(figmaData: unknown): string[] {
    const ids: string[] = [];
    
    if (figmaData && typeof figmaData === 'object' && 'variables' in figmaData) {
      const variables = (figmaData as { variables: Record<string, unknown> }).variables;
      Object.keys(variables).forEach(id => ids.push(id));
    }
    
    if (figmaData && typeof figmaData === 'object' && 'variableCollections' in figmaData) {
      const collections = (figmaData as { variableCollections: Record<string, unknown> }).variableCollections;
      Object.keys(collections).forEach(id => ids.push(id));
    }
    
    if (figmaData && typeof figmaData === 'object' && 'variableModes' in figmaData) {
      const modes = (figmaData as { variableModes: Record<string, unknown> }).variableModes;
      Object.keys(modes).forEach(id => ids.push(id));
    }
    
    return ids;
  }

  /**
   * Prune invalid mappings
   */
  private pruneMappings(tempToRealId: Record<string, string>, currentFileIds: string[]): Record<string, string> {
    const pruned: Record<string, string> = {};
    let prunedCount = 0;
    
    for (const [tempId, figmaId] of Object.entries(tempToRealId)) {
      if (currentFileIds.includes(figmaId)) {
        pruned[tempId] = figmaId;
      } else {
        prunedCount++;
        console.log(`[FigmaExportService] Pruned invalid mapping: ${tempId} -> ${figmaId}`);
      }
    }
    
    console.log(`[FigmaExportService] Pruned ${prunedCount} invalid mappings, kept ${Object.keys(pruned).length} valid mappings`);
    return pruned;
  }

  /**
   * Post to Figma API and return tempToRealId mapping
   */
  private async postToFigmaAPI(data: unknown, options: FigmaExportOptions): Promise<{ tempToRealId: Record<string, string> }> {
    const response = await fetch(`https://api.figma.com/v1/files/${options.fileId}/variables`, {
      method: 'POST',
      headers: {
        'X-Figma-Token': options.accessToken!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        variables: (data as any).variables,
        variableCollections: (data as any).collections,
        variableModes: (data as any).variableModes,
        variableModeValues: (data as any).variableModeValues
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Figma API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const apiResult = await response.json();
    console.log(`[FigmaExportService] 🔍 RAW API RESPONSE:`, apiResult);
    console.log(`[FigmaExportService] 🔍 API RESPONSE KEYS:`, Object.keys(apiResult));
    
    // Check for tempToRealId in different possible locations
    let tempToRealId: Record<string, string> = {};
    
    if (apiResult.tempToRealId) {
      tempToRealId = apiResult.tempToRealId;
      console.log(`[FigmaExportService] 🔍 Found tempToRealId in root:`, tempToRealId);
    } else if (apiResult.meta?.tempToRealId) {
      tempToRealId = apiResult.meta.tempToRealId;
      console.log(`[FigmaExportService] 🔍 Found tempToRealId in meta:`, tempToRealId);
    } else if (apiResult.meta?.tempIdToRealId) {
      tempToRealId = apiResult.meta.tempIdToRealId;
      console.log(`[FigmaExportService] 🔍 Found tempIdToRealId in meta:`, tempToRealId);
    } else {
      console.log(`[FigmaExportService] 🔍 NO tempToRealId found in API response`);
      console.log(`[FigmaExportService] 🔍 Meta object:`, apiResult.meta);
    }
    
    console.log(`[FigmaExportService] 🔍 FINAL tempToRealId extracted:`, {
      count: Object.keys(tempToRealId).length,
      mappings: tempToRealId
    });
    
    return {
      tempToRealId: tempToRealId || {}
    };
  }

  /**
   * Save and commit mappings to GitHub
   */
  private async saveAndCommitMappings(fileKey: string, tempToRealId: Record<string, string>, context: any, targetRepository: any): Promise<void> {
    const mappingData: any = {
      fileKey,
      systemId: 'design-system',
      lastUpdated: new Date().toISOString(),
      tempToRealId,
      metadata: {
        lastExport: new Date().toISOString(),
        exportVersion: '1.0.0'
      },
      repositoryContext: {
        owner: targetRepository.fullName.split('/')[0],
        repo: targetRepository.fullName.split('/')[1],
        type: (context.currentPlatform ? 'platform-extension' : context.currentTheme ? 'theme-override' : 'core') as 'theme-override' | 'core',
        systemId: 'design-system'
      }
    };

    await FigmaMappingService.saveMappingToGitHub(fileKey, mappingData, {
      owner: targetRepository.fullName.split('/')[0],
      repo: targetRepository.fullName.split('/')[1],
      type: (context.currentPlatform ? 'platform-extension' : context.currentTheme ? 'theme-override' : 'core') as 'theme-override' | 'core',
      systemId: 'design-system'
    });

    console.log(`[FigmaExportService] Successfully saved and committed updated mappings`);
  }
} 
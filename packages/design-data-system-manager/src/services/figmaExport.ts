import { TokenSystem } from '@token-model/data-model';
import type { Token } from '@token-model/data-model';
import { 
  FigmaTransformer, 
  FigmaVariable, 
  FigmaVariableCollection, 
  FigmaVariableMode, 
  FigmaVariableModeValue,
  FigmaTransformerOptions
} from '@token-model/data-transformations';
import { FigmaMappingService } from './figmaMappingService';

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
   * Export the current design system data to Figma Variables format
   */
  async exportToFigma(tokenSystem: TokenSystem, options: FigmaExportOptions = {}): Promise<FigmaExportResult> {
    console.log('[FigmaExportService] Starting Figma export...');
    
    try {
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
          console.log('[FigmaExportService] ❌ FAILED: No tempToRealId mapping found for fileId:', options.fileId);
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
      const validation = await this.transformer.validate(tokenSystem, finalTransformerOptions);
      console.log('[FigmaExportService] Validation result:', {
        isValid: validation.isValid,
        errorsCount: validation.errors?.length || 0,
        warningsCount: validation.warnings?.length || 0,
        errors: validation.errors,
        warnings: validation.warnings
      });
      
      if (!validation.isValid) {
        console.error('[FigmaExportService] Validation failed with errors:', validation.errors);
        return {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Token system validation failed',
            details: validation.errors
          }
        };
      }

      // Transform the data to Figma format
      console.log('[FigmaExportService] Starting transformation...');
      const result = await this.transformer.transform(tokenSystem, finalTransformerOptions);
      console.log('[FigmaExportService] Transformation result:', {
        success: result.success,
        hasData: !!result.data,
        variablesCount: result.data?.variables?.length || 0,
        collectionsCount: result.data?.collections?.length || 0,
        variableModeValuesCount: result.data?.variableModeValues?.length || 0,
        error: result.error
      });
      
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
  async getExportPreview(tokenSystem: TokenSystem, options: FigmaExportOptions = {}): Promise<FigmaExportResult> {
    return this.exportToFigma(tokenSystem, options);
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
  async publishToFigma(tokenSystem: TokenSystem, options: FigmaExportOptions = {}): Promise<FigmaExportResult> {
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
      const exportResult = await this.exportToFigma(tokenSystem, options);
      
      if (!exportResult.success || !exportResult.data) {
        return exportResult;
      }

      // Step 2: POST the transformed data to Figma API
      console.log('[FigmaExportService] POSTing data to Figma API...');
      
      // Log the complete POST payload for debugging
      console.log('[FigmaExportService] POST PAYLOAD DATA:');
      console.log('[FigmaExportService] Collections:', exportResult.data.collections.map(c => ({
        id: c.id,
        name: c.name,
        action: c.action,
        initialModeId: c.initialModeId
      })));
      console.log('[FigmaExportService] Variables:', exportResult.data.variables.map(v => ({
        id: v.id,
        name: v.name,
        action: v.action,
        variableCollectionId: v.variableCollectionId,
        resolvedType: v.resolvedType
      })));
      console.log('[FigmaExportService] Variable Modes:', exportResult.data.variableModes.map(m => ({
        id: m.id,
        name: m.name,
        action: m.action,
        variableCollectionId: m.variableCollectionId
      })));
      console.log('[FigmaExportService] Variable Mode Values:', exportResult.data.variableModeValues.map(vmv => ({
        variableId: vmv.variableId,
        modeId: vmv.modeId,
        value: vmv.value,
        valueType: typeof vmv.value,
        isAlias: typeof vmv.value === 'object' && vmv.value !== null && 'type' in vmv.value && vmv.value.type === 'VARIABLE_ALIAS'
      })));
      
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
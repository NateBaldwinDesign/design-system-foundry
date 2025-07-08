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
    console.log('[FigmaExportService] Starting export with options:', options);
    console.log('[FigmaExportService] Token system structure:', {
      tokensCount: tokenSystem.tokens?.length || 0,
      collectionsCount: tokenSystem.tokenCollections?.length || 0,
      dimensionsCount: tokenSystem.dimensions?.length || 0,
      platformsCount: tokenSystem.platforms?.length || 0,
      taxonomiesCount: tokenSystem.taxonomies?.length || 0,
      resolvedValueTypesCount: tokenSystem.resolvedValueTypes?.length || 0
    });
    
    // Debug: Log resolved value types
    console.log('[FigmaExportService] Resolved value types:', tokenSystem.resolvedValueTypes);
    
    // Debug: Log first few tokens with their values
    if (tokenSystem.tokens && tokenSystem.tokens.length > 0) {
      console.log('[FigmaExportService] Sample tokens:');
      tokenSystem.tokens.slice(0, 3).forEach((token: Token, index: number) => {
        console.log(`[FigmaExportService] Token ${index + 1}:`, {
          id: token.id,
          displayName: token.displayName,
          resolvedValueTypeId: token.resolvedValueTypeId,
          valuesByMode: token.valuesByMode?.map((vbm: { modeIds: string[]; value: { tokenId?: string; value?: unknown } }) => ({
            modeIds: vbm.modeIds,
            value: vbm.value,
            hasTokenId: 'tokenId' in vbm.value,
            hasValue: 'value' in vbm.value
          }))
        });
      });
    }
    
    try {
      // Convert FigmaExportOptions to FigmaTransformerOptions
      const transformerOptions = {
        updateExisting: true
      } as Partial<FigmaTransformerOptions>;
      if (options.fileId) transformerOptions.fileKey = options.fileId;
      if (options.accessToken) transformerOptions.accessToken = options.accessToken;
      // Type assertion to satisfy the transformer
      const finalTransformerOptions = transformerOptions as FigmaTransformerOptions;
      
      console.log('[FigmaExportService] Transformer options:', finalTransformerOptions);

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
} 
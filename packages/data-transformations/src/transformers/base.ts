import type { 
  BaseTransformer, 
  BaseTransformerOptions, 
  TransformationResult, 
  ValidationResult,
  TransformerInfo 
} from '../types/common';
import type { TokenSystem } from '@token-model/data-model';

/**
 * Abstract base class for all transformers
 */
export abstract class AbstractBaseTransformer<
  TInput = TokenSystem,
  TOutput = unknown,
  TOptions extends BaseTransformerOptions = BaseTransformerOptions
> implements BaseTransformer<TInput, TOutput, TOptions> {
  
  abstract readonly id: string;
  abstract readonly displayName: string;
  abstract readonly description: string;
  abstract readonly version: string;

  /**
   * Validate input data before transformation
   */
  async validate(input: TInput, options?: TOptions): Promise<ValidationResult> {
    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationResult['warnings'] = [];

    try {
      // Basic validation - ensure input is not null/undefined
      if (input === null || input === undefined) {
        errors.push({
          path: 'input',
          message: 'Input data is required',
          code: 'REQUIRED_INPUT'
        });
      }

      // Validate options if provided
      if (options) {
        const optionValidation = this.validateOptions(options);
        errors.push(...optionValidation.errors);
        warnings.push(...optionValidation.warnings);
      }

      // Call abstract method for transformer-specific validation
      const specificValidation = await this.validateInput(input, options);
      errors.push(...specificValidation.errors);
      warnings.push(...specificValidation.warnings);

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      errors.push({
        path: 'validation',
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: 'VALIDATION_ERROR',
        context: { originalError: error }
      });

      return {
        isValid: false,
        errors,
        warnings
      };
    }
  }

  /**
   * Transform the input data to the output format
   */
  async transform(input: TInput, options?: TOptions): Promise<TransformationResult<TOutput>> {
    try {
      // Validate input first
      const validation = await this.validate(input, options);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Input validation failed',
            details: { validationErrors: validation.errors }
          }
        };
      }

      // Perform the transformation
      const result = await this.performTransform(input, options);
      
      return {
        success: true,
        data: result,
        metadata: {
          transformerId: this.id,
          transformerVersion: this.version,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TRANSFORMATION_ERROR',
          message: `Transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          details: { transformerId: this.id },
          originalError: error instanceof Error ? error : new Error(String(error))
        }
      };
    }
  }

  /**
   * Get information about this transformer
   */
  getInfo(): TransformerInfo {
    return {
      id: this.id,
      displayName: this.displayName,
      description: this.description,
      version: this.version,
      supportedInputTypes: this.getSupportedInputTypes(),
      supportedOutputTypes: this.getSupportedOutputTypes(),
      requiredOptions: this.getRequiredOptions(),
      optionalOptions: this.getOptionalOptions()
    };
  }

  /**
   * Validate transformer-specific options
   */
  protected validateOptions(options: TOptions): ValidationResult {
    // Default implementation - no validation
    // Override in subclasses for specific option validation
    return {
      isValid: true,
      errors: [],
      warnings: []
    };
  }

  /**
   * Validate transformer-specific input
   */
  protected abstract validateInput(input: TInput, options?: TOptions): Promise<ValidationResult>;

  /**
   * Perform the actual transformation
   */
  protected abstract performTransform(input: TInput, options?: TOptions): Promise<TOutput>;

  /**
   * Get supported input types
   */
  protected getSupportedInputTypes(): string[] {
    return ['TokenSystem'];
  }

  /**
   * Get supported output types
   */
  protected getSupportedOutputTypes(): string[] {
    return ['unknown'];
  }

  /**
   * Get required options
   */
  protected getRequiredOptions(): string[] {
    return [];
  }

  /**
   * Get optional options
   */
  protected getOptionalOptions(): string[] {
    return ['id', 'metadata'];
  }

  /**
   * Create a standardized error result
   */
  protected createErrorResult(code: string, message: string, details?: Record<string, unknown>): TransformationResult<TOutput> {
    return {
      success: false,
      error: {
        code,
        message,
        details
      }
    };
  }

  /**
   * Create a standardized success result
   */
  protected createSuccessResult(data: TOutput, metadata?: Record<string, unknown>): TransformationResult<TOutput> {
    return {
      success: true,
      data,
      metadata: {
        transformerId: this.id,
        transformerVersion: this.version,
        timestamp: new Date().toISOString(),
        ...metadata
      }
    };
  }
} 
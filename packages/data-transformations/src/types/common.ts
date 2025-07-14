import type { TokenSystem } from '@token-model/data-model';

/**
 * Base interface for all transformer options
 */
export interface BaseTransformerOptions {
  /** Unique identifier for the transformation */
  id?: string;
  /** Metadata about the transformation */
  metadata?: Record<string, unknown>;
}

/**
 * Base interface for transformation results
 */
export interface TransformationResult<T = unknown> {
  /** Whether the transformation was successful */
  success: boolean;
  /** The transformed data */
  data?: T;
  /** Error information if transformation failed */
  error?: TransformationError;
  /** Metadata about the transformation */
  metadata?: Record<string, unknown>;
}

/**
 * Standardized error types for transformations
 */
export interface TransformationError {
  /** Error code for programmatic handling */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Detailed error information */
  details?: Record<string, unknown>;
  /** Original error if available */
  originalError?: Error;
}

/**
 * Validation result for input data
 */
export interface ValidationResult {
  /** Whether the data is valid */
  isValid: boolean;
  /** List of validation errors */
  errors: ValidationError[];
  /** Warnings that don't prevent transformation */
  warnings: ValidationWarning[];
}

/**
 * Individual validation error
 */
export interface ValidationError {
  /** Path to the invalid field */
  path: string;
  /** Error message */
  message: string;
  /** Error code */
  code: string;
  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  /** Path to the field with warning */
  path: string;
  /** Warning message */
  message: string;
  /** Warning code */
  code: string;
  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Base interface for all transformers
 */
export interface BaseTransformer<TInput = TokenSystem, TOutput = unknown, TOptions extends BaseTransformerOptions = BaseTransformerOptions> {
  /** Unique identifier for this transformer */
  readonly id: string;
  /** Display name for this transformer */
  readonly displayName: string;
  /** Description of what this transformer does */
  readonly description: string;
  /** Version of this transformer */
  readonly version: string;
  
  /**
   * Validate input data before transformation
   */
  validate(input: TInput, options?: TOptions): Promise<ValidationResult>;
  
  /**
   * Transform the input data to the output format
   */
  transform(input: TInput, options?: TOptions): Promise<TransformationResult<TOutput>>;
  
  /**
   * Get information about this transformer
   */
  getInfo(): TransformerInfo;
}

/**
 * Information about a transformer
 */
export interface TransformerInfo {
  /** Unique identifier */
  id: string;
  /** Display name */
  displayName: string;
  /** Description */
  description: string;
  /** Version */
  version: string;
  /** Supported input types */
  supportedInputTypes: string[];
  /** Supported output types */
  supportedOutputTypes: string[];
  /** Required options */
  requiredOptions: string[];
  /** Optional options */
  optionalOptions: string[];
}

/**
 * Registry of available transformers
 */
export interface TransformerRegistry {
  /** Register a transformer */
  register(transformer: BaseTransformer): void;
  /** Get a transformer by ID */
  get(id: string): BaseTransformer | undefined;
  /** Get all registered transformers */
  getAll(): BaseTransformer[];
  /** Check if a transformer is registered */
  has(id: string): boolean;
} 
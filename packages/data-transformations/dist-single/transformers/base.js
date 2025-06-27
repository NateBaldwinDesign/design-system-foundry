/**
 * Abstract base class for all transformers
 */
export class AbstractBaseTransformer {
    /**
     * Validate input data before transformation
     */
    async validate(input, options) {
        const errors = [];
        const warnings = [];
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
        }
        catch (error) {
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
    async transform(input, options) {
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
        }
        catch (error) {
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
    getInfo() {
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
    validateOptions(options) {
        // Default implementation - no validation
        // Override in subclasses for specific option validation
        return {
            isValid: true,
            errors: [],
            warnings: []
        };
    }
    /**
     * Get supported input types
     */
    getSupportedInputTypes() {
        return ['TokenSystem'];
    }
    /**
     * Get supported output types
     */
    getSupportedOutputTypes() {
        return ['unknown'];
    }
    /**
     * Get required options
     */
    getRequiredOptions() {
        return [];
    }
    /**
     * Get optional options
     */
    getOptionalOptions() {
        return ['id', 'metadata'];
    }
    /**
     * Create a standardized error result
     */
    createErrorResult(code, message, details) {
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
    createSuccessResult(data, metadata) {
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

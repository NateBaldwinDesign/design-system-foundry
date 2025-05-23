import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import schema from '@token-model/data-model/src/schema.json';

export interface ValidationResult {
  isValid: boolean;
  errors?: any[];
}

export class ValidationService {
  private static validate: any;

  static initialize() {
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    this.validate = ajv.compile(schema);
  }

  static validateData(data: any): ValidationResult {
    if (!this.validate) {
      this.initialize();
    }

    const valid = this.validate(data);
    return {
      isValid: valid,
      errors: valid ? undefined : this.validate.errors
    };
  }
} 
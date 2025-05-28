import { validateTokenSystem } from '@token-model/data-model';

export interface ValidationResult {
  isValid: boolean;
  errors?: any[];
}

export class ValidationService {
  static validateData(data: any): ValidationResult {
    try {
      validateTokenSystem(data);
      return { isValid: true };
    } catch (error: any) {
      // Zod errors have .errors array, fallback to message otherwise
      if (error.errors) {
        return { isValid: false, errors: error.errors };
      }
      return { isValid: false, errors: [error.message || error] };
    }
  }
} 
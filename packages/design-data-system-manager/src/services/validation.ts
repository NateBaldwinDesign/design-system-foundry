import { validateTokenSystem } from '@token-model/data-model';

export interface ValidationResult {
  isValid: boolean;
  errors?: any[];
}

export class ValidationService {
  static validateData(data: any): ValidationResult {
    try {
      // First validate the overall schema
      validateTokenSystem(data);

      // Additional validation for resolvedValueTypeId
      if (data.tokens) {
        const resolvedValueTypeIds = new Set(data.resolvedValueTypes?.map((vt: any) => vt.id) || []);
        
        // Validate tokens
        for (const token of data.tokens) {
          const valueTypeId = token.resolvedValueTypeId;
          if (!valueTypeId) {
            return {
              isValid: false,
              errors: [`Token ${token.id} is missing required resolvedValueTypeId`]
            };
          }
          
          if (!resolvedValueTypeIds.has(valueTypeId)) {
            return {
              isValid: false,
              errors: [`Token ${token.id} has invalid resolvedValueTypeId "${valueTypeId}". Must be one of: ${Array.from(resolvedValueTypeIds).join(', ')}`]
            };
          }
        }

        // Validate dimensions
        if (data.dimensions) {
          for (const dimension of data.dimensions) {
            if (!dimension.resolvedValueTypeIds) {
              return {
                isValid: false,
                errors: [`Dimension ${dimension.id} is missing required resolvedValueTypeIds`]
              };
            }

            // Check that all resolvedValueTypeIds are valid
            for (const typeId of dimension.resolvedValueTypeIds) {
              if (!resolvedValueTypeIds.has(typeId)) {
                return {
                  isValid: false,
                  errors: [`Dimension ${dimension.id} has invalid resolvedValueTypeId "${typeId}". Must be one of: ${Array.from(resolvedValueTypeIds).join(', ')}`]
                };
              }
            }
          }
        }

        // Validate collections
        if (data.tokenCollections) {
          for (const collection of data.tokenCollections) {
            // Handle both resolvedValueTypes and resolvedValueTypeIds
            const collectionTypeIds = collection.resolvedValueTypeIds || 
              (collection.resolvedValueTypes ? collection.resolvedValueTypes.map((vt: any) => vt.id) : []);

            if (!collectionTypeIds || collectionTypeIds.length === 0) {
              return {
                isValid: false,
                errors: [`Collection ${collection.id} is missing required resolvedValueTypeIds`]
              };
            }

            // Check that all resolvedValueTypeIds are valid
            for (const typeId of collectionTypeIds) {
              if (!resolvedValueTypeIds.has(typeId)) {
                return {
                  isValid: false,
                  errors: [`Collection ${collection.id} has invalid resolvedValueTypeId "${typeId}". Must be one of: ${Array.from(resolvedValueTypeIds).join(', ')}`]
                };
              }
            }
          }
        }
      }

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
import { validateTokenSystem, Token, TokenValue } from '@token-model/data-model';

export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
}

export class ValidationService {
  static validateData(data: unknown): ValidationResult {
    try {
      // Debug logging
      console.log('[ValidationService] Data being validated:', JSON.stringify(data, null, 2));
      
      // First validate the overall schema
      validateTokenSystem(data);

      // Additional validation for resolvedValueTypeId
      if (data.tokens) {
        const resolvedValueTypeIds = new Set(data.resolvedValueTypes?.map((vt: { id: string }) => vt.id) || []);
        if (resolvedValueTypeIds.size === 0) {
          return {
            isValid: false,
            errors: ['No resolvedValueTypes found in data. Your system data must include all value types required by your schema.']
          };
        }
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
          // Validate token values
          for (const valueByMode of token.valuesByMode) {
            const value = valueByMode.value as TokenValue;
            if ('tokenId' in value) {
              // Validate alias reference
              const referencedToken = data.tokens.find((t: Token) => t.id === value.tokenId);
              if (!referencedToken) {
                return {
                  isValid: false,
                  errors: [`Token ${token.id} references non-existent token ${value.tokenId} in valuesByMode`]
                };
              }
            }
            // Value validation is handled by the schema validation
          }
        }
        // Validate dimensions
        if (data.dimensions) {
          const dimensionIds = new Set(data.dimensions.map((d: { id: string }) => d.id));
          // Validate dimensionOrder if present
          if (data.dimensionOrder) {
            // Check that all dimensionOrder IDs exist in dimensions
            for (const orderId of data.dimensionOrder) {
              if (!dimensionIds.has(orderId)) {
                return {
                  isValid: false,
                  errors: [`dimensionOrder contains ID "${orderId}" that does not exist in dimensions`]
                };
              }
            }
            // Check that all dimensions are included in dimensionOrder
            const orderSet = new Set(data.dimensionOrder);
            for (const dim of data.dimensions) {
              if (!orderSet.has(dim.id)) {
                return {
                  isValid: false,
                  errors: [`Dimension "${dim.id}" is not included in dimensionOrder`]
                };
              }
            }
            // Check for duplicate IDs in dimensionOrder
            if (new Set(data.dimensionOrder).size !== data.dimensionOrder.length) {
              return {
                isValid: false,
                errors: ['dimensionOrder contains duplicate IDs']
              };
            }
          }
          for (const dimension of data.dimensions) {
            if (!dimension.resolvedValueTypeIds) {
              return {
                isValid: false,
                errors: [`Dimension ${dimension.id} is missing required resolvedValueTypeIds`]
              };
            }
            // Check that all resolvedValueTypeIds are valid and present in the actual resolvedValueTypes array
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
              (collection.resolvedValueTypes ? collection.resolvedValueTypes.map((vt: { id: string }) => vt.id) : []);
            if (!collectionTypeIds || collectionTypeIds.length === 0) {
              return {
                isValid: false,
                errors: [`Collection ${collection.id} is missing required resolvedValueTypeIds`]
              };
            }
            // Check that all resolvedValueTypeIds are valid and present in the actual resolvedValueTypes array
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
    } catch (error: unknown) {
      // Zod errors have .errors array, fallback to message otherwise
      if (error && typeof error === 'object' && 'errors' in error) {
        return { isValid: false, errors: (error as { errors: string[] }).errors };
      }
      return { isValid: false, errors: [error instanceof Error ? error.message : String(error)] };
    }
  }
} 
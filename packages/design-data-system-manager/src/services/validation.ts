import { validateTokenSystem, Token, TokenValue } from '@token-model/data-model';

// Define types based on schema
interface TokenSystem {
  resolvedValueTypes: Array<{ id: string; displayName: string; type?: string }>;
  tokens: Array<Token>;
  dimensions: Array<{
    id: string;
    displayName: string;
    modes: Array<{ id: string; name: string; dimensionId: string }>;
    resolvedValueTypeIds: string[];
  }>;
  tokenCollections: Array<{
    id: string;
    name: string;
    resolvedValueTypeIds: string[];
  }>;
  dimensionOrder?: string[];
  taxonomies?: Array<{
    id: string;
    name: string;
    terms: Array<{ id: string; name: string }>;
    resolvedValueTypeIds?: string[];
  }>;
  themes?: Array<{
    id: string;
    displayName: string;
    isDefault: boolean;
  }>;
  namingRules?: {
    taxonomyOrder?: string[];
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
}

export class ValidationService {
  static validateData(data: unknown): ValidationResult {
    try {
      // Debug logging
      // console.log('[ValidationService] Data being validated:', JSON.stringify(data, null, 2));
      
      // First validate the overall schema
      validateTokenSystem(data);

      // Type assertion after schema validation
      const tokenSystem = data as TokenSystem;

      // Additional validation for resolvedValueTypeId
      if (tokenSystem.tokens) {
        const resolvedValueTypeIds = new Set(tokenSystem.resolvedValueTypes?.map((vt) => vt.id) || []);
        if (resolvedValueTypeIds.size === 0) {
          return {
            isValid: false,
            errors: ['No resolvedValueTypes found in data. Your system data must include all value types required by your schema.']
          };
        }
        // Validate tokens
        for (const token of tokenSystem.tokens) {
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
              const referencedToken = tokenSystem.tokens.find((t) => t.id === value.tokenId);
              if (!referencedToken) {
                return {
                  isValid: false,
                  errors: [`Token ${token.id} references non-existent token ${value.tokenId} in valuesByMode`]
                };
              }
            }
            // Value validation is handled by the schema validation
          }
          // Validate tokenCollectionId if present
          if (token.tokenCollectionId) {
            const collection = tokenSystem.tokenCollections.find(c => c.id === token.tokenCollectionId);
            if (!collection) {
              return {
                isValid: false,
                errors: [`Token ${token.id} references non-existent collection ${token.tokenCollectionId}`]
              };
            }
            if (!collection.resolvedValueTypeIds.includes(token.resolvedValueTypeId)) {
              return {
                isValid: false,
                errors: [`Token ${token.id} has type ${token.resolvedValueTypeId} which is not supported by collection ${collection.id}`]
              };
            }
          }
        }
        // Validate dimensions
        if (tokenSystem.dimensions) {
          const dimensionIds = new Set(tokenSystem.dimensions.map((d) => d.id));
          // Validate dimensionOrder if present
          if (tokenSystem.dimensionOrder) {
            // Check that all dimensionOrder IDs exist in dimensions
            for (const orderId of tokenSystem.dimensionOrder) {
              if (!dimensionIds.has(orderId)) {
                return {
                  isValid: false,
                  errors: [`dimensionOrder contains ID "${orderId}" that does not exist in dimensions`]
                };
              }
            }
            // Check that all dimensions are included in dimensionOrder
            const orderSet = new Set(tokenSystem.dimensionOrder);
            for (const dim of tokenSystem.dimensions) {
              if (!orderSet.has(dim.id)) {
                return {
                  isValid: false,
                  errors: [`Dimension "${dim.id}" is not included in dimensionOrder`]
                };
              }
            }
            // Check for duplicate IDs in dimensionOrder
            if (new Set(tokenSystem.dimensionOrder).size !== tokenSystem.dimensionOrder.length) {
              return {
                isValid: false,
                errors: ['dimensionOrder contains duplicate IDs']
              };
            }
          }
          for (const dimension of tokenSystem.dimensions) {
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
        if (tokenSystem.tokenCollections) {
          for (const collection of tokenSystem.tokenCollections) {
            // Only use resolvedValueTypeIds as per schema
            const collectionTypeIds = collection.resolvedValueTypeIds;
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

        // Validate taxonomies if present
        if (tokenSystem.taxonomies) {
          for (const taxonomy of tokenSystem.taxonomies) {
            // Validate taxonomy terms
            if (!taxonomy.terms || taxonomy.terms.length === 0) {
              return {
                isValid: false,
                errors: [`Taxonomy ${taxonomy.id} must have at least one term`]
              };
            }
            // Validate taxonomy resolvedValueTypeIds if present
            if (taxonomy.resolvedValueTypeIds) {
              for (const typeId of taxonomy.resolvedValueTypeIds) {
                if (!resolvedValueTypeIds.has(typeId)) {
                  return {
                    isValid: false,
                    errors: [`Taxonomy ${taxonomy.id} has invalid resolvedValueTypeId "${typeId}". Must be one of: ${Array.from(resolvedValueTypeIds).join(', ')}`]
                  };
                }
              }
            }
          }
        }

        // Validate themes if present
        if (tokenSystem.themes) {
          const defaultThemes = tokenSystem.themes.filter(theme => theme.isDefault);
          if (defaultThemes.length !== 1) {
            return {
              isValid: false,
              errors: ['Exactly one theme must be marked as default']
            };
          }
        }

        // Validate namingRules if present
        if (tokenSystem.namingRules?.taxonomyOrder) {
          const taxonomyIds = new Set(tokenSystem.taxonomies?.map(t => t.id) || []);
          for (const taxonomyId of tokenSystem.namingRules.taxonomyOrder) {
            if (!taxonomyIds.has(taxonomyId)) {
              return {
                isValid: false,
                errors: [`namingRules.taxonomyOrder contains ID "${taxonomyId}" that does not exist in taxonomies`]
              };
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
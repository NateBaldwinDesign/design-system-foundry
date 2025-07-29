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
  taxonomyOrder?: string[];
  componentProperties?: Array<{
    id: string;
    displayName: string;
    description?: string;
    type: 'boolean' | 'list';
    default: boolean | string;
    options?: Array<{
      id: string;
      displayName: string;
      description?: string;
    }>;
  }>;
}

interface SystemVariableByMode {
  modeIds: string[];
  value: string | number | boolean;
}

interface SystemVariableSchema {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'color';
  description?: string;
  defaultValue?: string | number | boolean;
  constraints?: {
    min?: number;
    max?: number;
    step?: number;
    pattern?: string;
  };
  modeBased?: boolean;
  dimensionId?: string;
  valuesByMode?: SystemVariableByMode[];
}

interface ConfigSchema {
  systemVariables?: SystemVariableSchema[];
  [key: string]: unknown;
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
      const tokenSystem = data as TokenSystem & { config?: ConfigSchema };

      // --- System Variables Validation ---
      if (tokenSystem.config && Array.isArray(tokenSystem.config.systemVariables)) {
        const systemVariables = tokenSystem.config.systemVariables;
        const dimensionIds = new Set((tokenSystem.dimensions || []).map((d) => d.id));
        for (const variable of systemVariables) {
          // Required fields
          if (!variable.id || !variable.name || !variable.type) {
            return {
              isValid: false,
              errors: [
                `System variable is missing required fields (id, name, type): ${JSON.stringify(variable)}`
              ]
            };
          }
          // Type check
          if (!['string', 'number', 'boolean', 'color'].includes(variable.type)) {
            return {
              isValid: false,
              errors: [
                `System variable ${variable.id} has invalid type: ${variable.type}`
              ]
            };
          }
          // Mode-based validation
          if (variable.modeBased) {
            if (!variable.dimensionId) {
              return {
                isValid: false,
                errors: [
                  `System variable ${variable.id} is mode-based but missing dimensionId.`
                ]
              };
            }
            if (!dimensionIds.has(variable.dimensionId)) {
              return {
                isValid: false,
                errors: [
                  `System variable ${variable.id} references non-existent dimensionId: ${variable.dimensionId}`
                ]
              };
            }
            if (!Array.isArray(variable.valuesByMode) || variable.valuesByMode.length === 0) {
              return {
                isValid: false,
                errors: [
                  `System variable ${variable.id} is mode-based but has no valuesByMode array.`
                ]
              };
            }
            for (const vbm of variable.valuesByMode) {
              if (!Array.isArray(vbm.modeIds) || typeof vbm.value === 'undefined') {
                return {
                  isValid: false,
                  errors: [
                    `System variable ${variable.id} has invalid valuesByMode entry: ${JSON.stringify(vbm)}`
                  ]
                };
              }
            }
          }
        }
      }
      // --- End System Variables Validation ---

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

        // Validate taxonomyOrder if present
        if (tokenSystem.taxonomyOrder) {
          const taxonomyIds = new Set(tokenSystem.taxonomies?.map(t => t.id) || []);
          for (const taxonomyId of tokenSystem.taxonomyOrder) {
            if (!taxonomyIds.has(taxonomyId)) {
              return {
                isValid: false,
                errors: [`taxonomyOrder contains ID "${taxonomyId}" that does not exist in taxonomies`]
              };
            }
          }
        }

        // Validate component properties if present
        if (tokenSystem.componentProperties) {
          const componentPropertiesValidation = this.validateComponentProperties(tokenSystem.componentProperties);
          if (!componentPropertiesValidation.isValid) {
            return {
              isValid: false,
              errors: componentPropertiesValidation.errors || []
            };
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

  /**
   * Validates component properties
   */
  static validateComponentProperties(componentProperties: Array<{
    id: string;
    displayName: string;
    description?: string;
    type: 'boolean' | 'list';
    default: boolean | string;
    options?: Array<{
      id: string;
      displayName: string;
      description?: string;
    }>;
  }>): ValidationResult {
    const errors: string[] = [];

    // Check for duplicate component property IDs
    const ids = new Set<string>();
    for (const cp of componentProperties) {
      if (ids.has(cp.id)) {
        errors.push(`Duplicate component property ID: ${cp.id}`);
      }
      ids.add(cp.id);
      
      // Type-specific validation
      if (cp.type === 'list') {
        if (!cp.options || cp.options.length === 0) {
          errors.push(`List component property '${cp.id}' must have at least one option`);
        } else {
          // Check for duplicate option IDs within each list component property
          const optionIds = new Set<string>();
          for (const option of cp.options) {
            if (optionIds.has(option.id)) {
              errors.push(`Duplicate option ID '${option.id}' in component property '${cp.id}'`);
            }
            optionIds.add(option.id);
          }
          
          // Validate that default references an existing option
          if (typeof cp.default === 'string' && !cp.options.some(option => option.id === cp.default)) {
            errors.push(`Default value '${cp.default}' in component property '${cp.id}' does not reference an existing option`);
          }
        }
      } else if (cp.type === 'boolean') {
        // Boolean properties should not have options
        if (cp.options && cp.options.length > 0) {
          errors.push(`Boolean component property '${cp.id}' cannot have options`);
        }
        // Validate default is boolean
        if (typeof cp.default !== 'boolean') {
          errors.push(`Boolean component property '${cp.id}' must have a boolean default value`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
} 
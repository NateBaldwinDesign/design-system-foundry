import { useState, useEffect } from 'react';
import { useStorage } from './useStorage';
import { exampleData } from '@token-model/data-model';
import { StorageService } from '../services/storage';
import { ValidationService } from '../services/validation';
import { useToast } from '@chakra-ui/react';
import type { 
  TokenCollection, 
  Dimension, 
  Platform, 
  Taxonomy, 
  Theme, 
  ResolvedValueType, 
  MigrationStrategy,
  DimensionEvolution,
  TokenGroup,
  TokenVariant,
  TokenStatus,
  TokenTier,
  TokenValue,
  PropertyType,
  ComponentProperty
} from '@token-model/data-model';

export interface Schema {
  version: string;
  description?: string;
  systemName: string;
  systemId: string;
  tokenCollections: TokenCollection[];
  dimensions: Dimension[];
  platforms: Platform[];
  taxonomies: Taxonomy[];
  themes: Theme[];
  componentProperties: ComponentProperty[];
  tokens: Array<{
    id: string;
    displayName: string;
    description?: string;
    tokenCollectionId?: string;
    resolvedValueTypeId: string;
    private: boolean;
    themeable: boolean;
    status?: TokenStatus;
    tokenTier: TokenTier;
    taxonomies: Array<{
      taxonomyId: string;
      termId: string;
    }>;
    propertyTypes: PropertyType[];
    codeSyntax: Array<{
      platformId: string;
      formattedName: string;
    }>;
    valuesByMode: Array<{
      modeIds: string[];
      value: TokenValue;
      metadata?: Record<string, unknown>;
      platformOverrides?: Array<{
        platformId: string;
        value: string;
        metadata?: Record<string, unknown>;
      }>;
    }>;
  }>;
  taxonomyOrder: string[];
  resolvedValueTypes: ResolvedValueType[];
  standardPropertyTypes: PropertyType[];
  versionHistory: Array<{
    version: string;
    dimensions: string[];
    date: string;
    migrationStrategy?: MigrationStrategy;
  }>;
  dimensionOrder?: string[];
  dimensionEvolution?: DimensionEvolution;
  exportConfigurations?: {
    [platformId: string]: {
      prefix: string;
      delimiter: '' | '_' | '-' | '.' | '/';
      capitalization: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
    };
  };
  metadata?: {
    description?: string;
    lastUpdated?: string;
    maintainers?: string[];
  };
  extensions?: {
    tokenGroups?: TokenGroup[];
    tokenVariants?: Record<string, TokenVariant>;
  };
}

export const useSchema = () => {
  const { getItem, setItem } = useStorage();
  const toast = useToast();

  // Helper function to clean up taxonomy order by removing references to non-existent taxonomies
  const cleanTaxonomyOrder = (taxonomyOrder: string[], taxonomies: Array<{ id: string }>) => {
    const taxonomyIds = new Set(taxonomies.map(t => t.id));
    const cleanedTaxonomyOrder = taxonomyOrder.filter(id => taxonomyIds.has(id));
    
    if (cleanedTaxonomyOrder.length !== taxonomyOrder.length) {
      console.warn('[useSchema] Removed invalid taxonomy IDs from taxonomy order:', 
        taxonomyOrder.filter(id => !taxonomyIds.has(id)));
    }
    
    return cleanedTaxonomyOrder;
  };

  // Helper function to clean and migrate naming rules from old nested structure to new top-level structure
  const cleanNamingRules = (namingRules: unknown, taxonomies: Array<{ id: string }>): string[] => {
    // Handle migration from old nested structure to new top-level structure
    if (namingRules && typeof namingRules === 'object') {
      // If namingRules has taxonomyOrder, extract it and clean it
      const rulesObj = namingRules as { taxonomyOrder?: string[] };
      if (rulesObj.taxonomyOrder && Array.isArray(rulesObj.taxonomyOrder)) {
        return cleanTaxonomyOrder(rulesObj.taxonomyOrder, taxonomies);
      }
    }
    
    // If namingRules is already an array (new structure), clean it directly
    if (Array.isArray(namingRules)) {
      return cleanTaxonomyOrder(namingRules as string[], taxonomies);
    }
    
    // Default fallback: return empty array
    return [];
  };

  // Helper function to migrate old string-based propertyTypes to new object-based format
  const migratePropertyTypes = (tokens: unknown[]): unknown[] => {
    return tokens.map(token => {
      const tokenObj = token as { propertyTypes?: unknown[] };
      if (tokenObj.propertyTypes && Array.isArray(tokenObj.propertyTypes)) {
        const migratedPropertyTypes = tokenObj.propertyTypes.map((pt: unknown) => {
          if (typeof pt === 'string') {
            // Convert string to PropertyType object
            const ptString = pt as string;
            return {
              id: ptString,
              displayName: ptString.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase()),
              category: 'layout' as const,
              compatibleValueTypes: [],
              inheritance: false
            };
          }
          return pt; // Already an object
        });
        return { ...tokenObj, propertyTypes: migratedPropertyTypes };
      }
      return token;
    });
  };

  // Helper function to ensure standardPropertyTypes is present
  const ensureStandardPropertyTypes = (data: { standardPropertyTypes?: PropertyType[] }): { standardPropertyTypes: PropertyType[] } => {
    if (!data.standardPropertyTypes) {
      data.standardPropertyTypes = [
        {
          id: "ALL",
          displayName: "All Properties",
          category: "layout",
          compatibleValueTypes: ["color", "dimension", "font-family", "font-weight", "font-size", "line-height", "letter-spacing", "duration", "cubic-bezier", "blur", "radius"],
          inheritance: false
        }
      ];
    }
    return data as { standardPropertyTypes: PropertyType[] };
  };

  const [schema, setSchema] = useState<Schema | null>(() => {
    // Try to load from local storage first
    const stored = getItem('schema');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        
        // Check if this is an old schema version that needs migration
        if (!parsed.standardPropertyTypes || (parsed.tokens && parsed.tokens.length > 0 && typeof parsed.tokens[0].propertyTypes?.[0] === 'string')) {
          console.log('[useSchema] Detected old schema format, clearing storage to load new data');
          // Clear the old schema from storage
          setItem('schema', '');
          return null; // This will trigger loading of new example data
        }
        
        // Check if the stored schema has the old spacing property type mappings
        const hasOldSpacingMappings = parsed.standardPropertyTypes?.some((pt: PropertyType) => 
          (pt.id === 'padding' || pt.id === 'margin' || pt.id === 'gap-spacing') && 
          pt.compatibleValueTypes?.includes('dimension')
        );
        
        if (hasOldSpacingMappings) {
          console.log('[useSchema] Detected old spacing property type mappings, clearing storage to load updated data');
          // Clear the old schema from storage
          setItem('schema', '');
          return null; // This will trigger loading of new example data
        }
        
        // Ensure taxonomy order is included from storage
        const taxonomyOrder = StorageService.getTaxonomyOrder();
        const taxonomies = StorageService.getTaxonomies();
        const cleanedTaxonomyOrder = cleanTaxonomyOrder(taxonomyOrder, taxonomies);
        
        // Apply migrations to stored schema
        const migratedSchema = {
          ...parsed,
          taxonomyOrder: cleanedTaxonomyOrder,
          tokens: migratePropertyTypes(parsed.tokens || []),
          ...ensureStandardPropertyTypes(parsed)
        };
        
        // Validate schema before setting
        const validationResult = ValidationService.validateData(migratedSchema);
        if (validationResult.isValid) {
          return migratedSchema;
        } else {
          console.error('Invalid schema in storage:', validationResult.errors);
          toast({
            title: 'Schema Error',
            description: 'Invalid schema found in storage',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
          return null;
        }
      } catch (err) {
        console.error('Failed to parse stored schema:', err);
        toast({
          title: 'Schema Error',
          description: 'Failed to parse stored schema',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return null;
      }
    }

    // If no schema in storage, try to load from StorageService
    try {
      const tokenCollections = StorageService.getCollections();
      const tokens = StorageService.getTokens();
      const dimensions = StorageService.getDimensions();
      const platforms = StorageService.getPlatforms();
      const themes = StorageService.getThemes();
      const taxonomies = StorageService.getTaxonomies();
      const resolvedValueTypes = StorageService.getValueTypes();
      const taxonomyOrder = StorageService.getTaxonomyOrder();
      const dimensionOrder = StorageService.getDimensionOrder();

      // Only create schema if we have some data
      if (tokenCollections.length > 0 || tokens.length > 0) {
        const cleanedTaxonomyOrder = cleanTaxonomyOrder(taxonomyOrder, taxonomies);
        const schemaFromStorage = {
          version: '1.0.0',
          systemName: 'Design System',
          systemId: 'design-system',
          description: 'A comprehensive design system with tokens, dimensions, and themes',
          tokenCollections,
          tokens: migratePropertyTypes(tokens), // Apply migration here
          dimensions,
          platforms,
          themes,
          taxonomies,
          resolvedValueTypes,
          taxonomyOrder: cleanedTaxonomyOrder,
          dimensionOrder,
          versionHistory: [{
            version: '1.0.0',
            dimensions: dimensions.map(d => d.id),
            date: new Date().toISOString().slice(0, 10)
          }]
        };

        // Validate schema before setting
        const validationResult = ValidationService.validateData(schemaFromStorage);
        if (validationResult.isValid) {
          return schemaFromStorage;
        } else {
          console.error('Invalid schema from storage:', validationResult.errors);
          toast({
            title: 'Schema Error',
            description: 'Invalid schema found in storage',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
          return null;
        }
      }
    } catch (err) {
      console.error('Failed to load schema from storage:', err);
      toast({
        title: 'Schema Error',
        description: 'Failed to load schema from storage',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }

    return null; // We'll load the default data asynchronously
  });

  useEffect(() => {
    const loadDefaultSchema = async () => {
      if (!schema) {
        try {
          const coreDataModule = await exampleData.minimal();
          const coreData = coreDataModule.default;
          
          // Debug log the raw data
          console.debug('[useSchema] Raw core data:', {
            version: coreData.version,
            systemName: coreData.systemName,
            systemId: coreData.systemId,
            hasTokenCollections: !!coreData.tokenCollections,
            tokenCollectionsCount: coreData.tokenCollections?.length,
            hasTokens: !!coreData.tokens,
            tokensCount: coreData.tokens?.length,
            hasDimensions: !!coreData.dimensions,
            dimensionsCount: coreData.dimensions?.length,
            hasPlatforms: !!coreData.platforms,
            platformsCount: coreData.platforms?.length,
            hasTaxonomies: !!coreData.taxonomies,
            taxonomiesCount: coreData.taxonomies?.length,
            hasThemes: !!coreData.themes,
            themesCount: coreData.themes?.length,
            hasResolvedValueTypes: !!coreData.resolvedValueTypes,
            resolvedValueTypesCount: coreData.resolvedValueTypes?.length,
            hasTaxonomyOrder: !!coreData.taxonomyOrder,
            hasVersionHistory: !!coreData.versionHistory,
            versionHistoryCount: coreData.versionHistory?.length
          });
          
          // Process the data to ensure proper typing
          const processedData = {
            ...coreData,
            // Ensure required fields are present
            version: coreData.version || '1.0.0',
            systemName: coreData.systemName || 'Design System',
            systemId: coreData.systemId || 'design-system',
            // Ensure arrays are initialized
            taxonomies: coreData.taxonomies || [],
            tokenCollections: coreData.tokenCollections || [],
            platforms: (coreData.platforms || []).map(platform => ({
              ...platform,
              syntaxPatterns: platform.syntaxPatterns ? {
                ...platform.syntaxPatterns,
                delimiter: platform.syntaxPatterns.delimiter as '' | '_' | '-' | '.' | '/',
                capitalization: platform.syntaxPatterns.capitalization as 'none' | 'uppercase' | 'lowercase' | 'capitalize'
              } : undefined
            })),
            resolvedValueTypes: (coreData.resolvedValueTypes || []).map(type => ({
              ...type,
              type: type.type as 'COLOR' | 'DIMENSION' | 'SPACING' | 'FONT_FAMILY' | 'FONT_WEIGHT' | 'FONT_SIZE' | 'LINE_HEIGHT' | 'LETTER_SPACING' | 'DURATION' | 'CUBIC_BEZIER' | 'BLUR' | 'SPREAD' | 'RADIUS' | undefined
            })),
            // Add standard property types if not present
            standardPropertyTypes: (coreData.standardPropertyTypes || []).map(pt => ({
              ...pt,
              category: pt.category as 'color' | 'typography' | 'spacing' | 'dimension' | 'effect' | 'border' | 'layout' | 'animation'
            })),
            // Ensure tokens are properly typed and convert propertyTypes if needed
            tokens: (coreData.tokens || []).map(token => ({
              ...token,
              status: token.status as TokenStatus | undefined,
              tokenTier: token.tokenTier as TokenTier,
              // Convert old string-based propertyTypes to new object-based format
              propertyTypes: Array.isArray(token.propertyTypes) 
                ? token.propertyTypes.map(pt => {
                    if (typeof pt === 'string') {
                      // Convert string to PropertyType object
                      return {
                        id: pt,
                        displayName: pt.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
                        category: 'color' as const, // Default category, will be overridden by standard types
                        compatibleValueTypes: [],
                        inheritance: false
                      };
                    }
                    return pt as PropertyType;
                  })
                : [],
              valuesByMode: token.valuesByMode.map(mode => ({
                ...mode,
                value: mode.value as TokenValue
              }))
            })),
            // Ensure taxonomy order is present
            taxonomyOrder: cleanTaxonomyOrder(coreData.taxonomyOrder || [], coreData.taxonomies || []),
            // Ensure version history is present
            versionHistory: coreData.versionHistory || [{
              version: coreData.version || '1.0.0',
              dimensions: (coreData.dimensions || []).map(d => d.id),
              date: new Date().toISOString().slice(0, 10)
            }]
          };
          
          // Debug log the processed data structure
          console.debug('[useSchema] Processed data structure:', {
            version: processedData.version,
            systemName: processedData.systemName,
            systemId: processedData.systemId,
            tokenCollections: {
              count: processedData.tokenCollections.length,
              sample: processedData.tokenCollections[0]
            },
            tokens: {
              count: processedData.tokens.length,
              sample: processedData.tokens[0]
            },
            dimensions: {
              count: processedData.dimensions.length,
              sample: processedData.dimensions[0]
            },
            platforms: {
              count: processedData.platforms.length,
              sample: processedData.platforms[0]
            },
            taxonomies: {
              count: processedData.taxonomies.length,
              sample: processedData.taxonomies[0]
            },
            themes: {
              count: processedData.themes.length,
              sample: processedData.themes[0]
            },
            resolvedValueTypes: {
              count: processedData.resolvedValueTypes.length,
              sample: processedData.resolvedValueTypes[0]
            },
            namingRules: processedData.namingRules,
            versionHistory: {
              count: processedData.versionHistory.length,
              sample: processedData.versionHistory[0]
            }
          });
          
          // Validate processed data before setting
          const validationResult = ValidationService.validateData(processedData);
          if (validationResult.isValid) {
            // Store taxonomies first to ensure they exist for naming rules
            StorageService.setTaxonomies(processedData.taxonomies);
            // Then store the complete schema
            setSchema(processedData);
          } else {
            // Enhanced error reporting
            console.error('[useSchema] Schema validation failed:', {
              errors: validationResult.errors,
              dataSummary: {
                version: processedData.version,
                systemName: processedData.systemName,
                systemId: processedData.systemId,
                tokenCollectionsCount: processedData.tokenCollections.length,
                tokensCount: processedData.tokens.length,
                dimensionsCount: processedData.dimensions.length,
                platformsCount: processedData.platforms.length,
                taxonomiesCount: processedData.taxonomies.length,
                themesCount: processedData.themes.length,
                resolvedValueTypesCount: processedData.resolvedValueTypes.length
              }
            });
            throw new Error(`Invalid schema structure in default data: ${validationResult.errors?.join(', ')}`);
          }
        } catch (err) {
          console.error('Failed to load default schema:', err);
          toast({
            title: 'Schema Error',
            description: 'Failed to load default schema',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
        }
      }
    };
    loadDefaultSchema();
  }, [toast]); // Removed schema from dependencies to prevent infinite loop

  useEffect(() => {
    if (schema) {
      try {
        // Validate schema before saving
        const validationResult = ValidationService.validateData(schema);
        if (validationResult.isValid) {
          setItem('schema', JSON.stringify(schema));
        } else {
          throw new Error(`Invalid schema structure: ${validationResult.errors?.join(', ')}`);
        }
      } catch (err) {
        console.error('Failed to save schema:', err);
        toast({
          title: 'Schema Error',
          description: 'Failed to save schema',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    }
  }, [schema, setItem, toast]);

  // Debug: log schema state
  useEffect(() => {
    console.debug('[useSchema] Current schema:', schema);
  }, [schema]);

  const updateSchema = (newSchema: Schema) => {
    try {
      // Validate new schema before updating
      const validationResult = ValidationService.validateData(newSchema);
      if (validationResult.isValid) {
        setSchema(newSchema);
      } else {
        throw new Error(`Invalid schema structure: ${validationResult.errors?.join(', ')}`);
      }
    } catch (err) {
      console.error('Failed to update schema:', err);
      toast({
        title: 'Schema Error',
        description: 'Failed to update schema',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const clearSchemaCache = () => {
    console.log('[useSchema] Clearing schema cache');
    setItem('schema', '');
    setSchema(null);
  };

  return { schema, updateSchema, clearSchemaCache };
}; 
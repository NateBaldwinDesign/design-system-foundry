import { useState, useEffect } from 'react';
import { useStorage } from './useStorage';
import { exampleData } from '@token-model/data-model';
import { StorageService } from '../services/storage';
import { ValidationService } from '../services/validation';
import { useToast } from '@chakra-ui/react';
import type { TokenCollection, Dimension, Platform, Taxonomy, Theme, ResolvedValueType, FallbackStrategy } from '@token-model/data-model';

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
  namingRules: { taxonomyOrder: string[] };
  resolvedValueTypes: ResolvedValueType[];
  versionHistory: Array<{
    version: string;
    dimensions: string[];
    date: string;
  }>;
}

export const useSchema = () => {
  const { getItem, setItem } = useStorage();
  const toast = useToast();
  const [schema, setSchema] = useState<Schema | null>(() => {
    const stored = getItem('schema');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Ensure naming rules are included from storage
        const namingRules = StorageService.getNamingRules();
        const schemaWithNamingRules = { ...parsed, namingRules };
        
        // Validate schema before setting
        const validationResult = ValidationService.validateData(schemaWithNamingRules);
        if (validationResult.isValid) {
          return schemaWithNamingRules;
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
    return null; // We'll load the default data asynchronously
  });

  useEffect(() => {
    const loadDefaultSchema = async () => {
      if (!schema) {
        try {
          const coreDataModule = await exampleData.core();
          const coreData = coreDataModule.default;
          const namingRules = StorageService.getNamingRules();
          
          // Process the data to ensure proper typing
          const processedData = {
            ...coreData,
            namingRules,
            tokenCollections: coreData.tokenCollections.map(collection => ({
              ...collection,
              modeResolutionStrategy: collection.modeResolutionStrategy ? {
                ...collection.modeResolutionStrategy,
                fallbackStrategy: collection.modeResolutionStrategy.fallbackStrategy as FallbackStrategy
              } : undefined
            })),
            platforms: coreData.platforms.map(platform => ({
              ...platform,
              syntaxPatterns: platform.syntaxPatterns ? {
                ...platform.syntaxPatterns,
                delimiter: platform.syntaxPatterns.delimiter as '' | '_' | '-' | '.' | '/',
                capitalization: platform.syntaxPatterns.capitalization as 'none' | 'uppercase' | 'lowercase' | 'capitalize'
              } : undefined
            })),
            resolvedValueTypes: coreData.resolvedValueTypes.map(type => ({
              ...type,
              type: type.type as 'COLOR' | 'DIMENSION' | 'SPACING' | 'FONT_FAMILY' | 'FONT_WEIGHT' | 'FONT_SIZE' | 'LINE_HEIGHT' | 'LETTER_SPACING' | 'DURATION' | 'CUBIC_BEZIER' | 'BLUR' | 'SPREAD' | 'RADIUS' | undefined
            })),
            // Ensure taxonomies are properly loaded from core data
            taxonomies: coreData.taxonomies || []
          };
          
          // Debug log the processed data
          console.debug('[useSchema] Processed data:', {
            taxonomies: processedData.taxonomies,
            namingRules: processedData.namingRules
          });
          
          // Validate processed data before setting
          const validationResult = ValidationService.validateData(processedData);
          if (validationResult.isValid) {
            setSchema(processedData);
          } else {
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
  }, [schema, toast]);

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

  return { schema, updateSchema };
}; 
import React, { useState } from 'react';
import { Box, Button, Text, Stack } from '@chakra-ui/react';
import { 
  Token, 
  TokenCollection, 
  Dimension, 
  Platform, 
  Taxonomy, 
  Theme 
} from '@token-model/data-model';
import { ValidationService } from '../../services/validation';
import { createSchemaJsonFromLocalStorage } from '../../services/createJson';
import type { ValidationResult } from '../../services/validation';

export interface ValidationViewProps {
  tokens: Token[];
  collections: TokenCollection[];
  dimensions: Dimension[];
  platforms: Platform[];
  taxonomies: Taxonomy[];
  themes: Theme[];
  onValidate: () => void;
}

interface ValidationState {
  isRunning: boolean;
  progress: number;
  status: string;
  error: string | null;
  success: boolean;
  results?: ValidationResult;
}

export const ValidationView: React.FC<ValidationViewProps> = ({ 
  tokens,
  collections,
  dimensions,
  platforms,
  taxonomies,
  themes,
  onValidate
}) => {
  const [validationState, setValidationState] = useState<ValidationState>({
    isRunning: false,
    progress: 0,
    status: '',
    error: null,
    success: false,
  });

  const handleValidate = async () => {
    try {
      setValidationState(prev => ({
        ...prev,
        isRunning: true,
        progress: 0,
        status: 'Starting validation...',
        error: null,
        success: false,
      }));

      const schema = await createSchemaJsonFromLocalStorage();
      
      // Validate schema completeness
      const missingTokens = tokens.filter(token => !schema.tokens.some((t: Token) => t.id === token.id));
      const missingCollections = collections.filter(collection => !schema.tokenCollections.some((c: TokenCollection) => c.id === collection.id));
      const missingDimensions = dimensions.filter(dimension => !schema.dimensions.some((d: Dimension) => d.id === dimension.id));
      const missingPlatforms = platforms.filter(platform => !schema.platforms.some((p: Platform) => p.id === platform.id));
      const missingTaxonomies = taxonomies.filter(taxonomy => !schema.taxonomies.some((t: Taxonomy) => t.id === taxonomy.id));
      const missingThemes = themes.filter(theme => !schema.themes.some((th: Theme) => th.id === theme.id));

      const missingItems = [
        ...missingTokens.map(t => `Token: ${t.displayName}`),
        ...missingCollections.map(c => `Collection: ${c.name}`),
        ...missingDimensions.map(d => `Dimension: ${d.displayName}`),
        ...missingPlatforms.map(p => `Platform: ${p.displayName}`),
        ...missingTaxonomies.map(t => `Taxonomy: ${t.name}`),
        ...missingThemes.map(th => `Theme: ${th.displayName}`)
      ];

      if (missingItems.length > 0) {
        throw new Error(`Missing items in schema: ${missingItems.join(', ')}`);
      }

      const result = await ValidationService.validateData(schema);
      
      setValidationState(prev => ({
        ...prev,
        results: result,
        success: result.isValid,
        status: result.isValid ? 'Validation completed successfully' : 'Validation failed',
        progress: 100,
        isRunning: false,
      }));

      onValidate();
    } catch (error) {
      setValidationState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        status: 'Validation failed',
        isRunning: false,
        progress: 100,
      }));
    }
  };

  return (
    <Stack gap={4} align="stretch">
      <Button
        onClick={handleValidate}
        loading={validationState.isRunning}
        colorPalette="blue"
      >
        Validate Tokens
      </Button>
      
      {validationState.isRunning && (
        <Box width="100%">
          <Box 
            width="100%" 
            height="4px" 
            bg="gray.200" 
            borderRadius="full"
            overflow="hidden"
          >
            <Box
              width={`${validationState.progress}%`}
              height="100%"
              bg="blue.500"
              transition="width 0.3s ease-in-out"
            />
          </Box>
          <Text mt={2} fontSize="sm" color="gray.600">
            {validationState.status}
          </Text>
        </Box>
      )}

      {validationState.error && (
        <Text color="red.500">{validationState.error}</Text>
      )}

      {validationState.results && !validationState.isRunning && (
        <Box>
          <Text fontWeight="bold" mb={2}>
            Validation Results:
          </Text>
          {validationState.results.errors?.map((error, index) => (
            <Text key={index} color="red.500">
              {error}
            </Text>
          ))}
        </Box>
      )}
    </Stack>
  );
}; 
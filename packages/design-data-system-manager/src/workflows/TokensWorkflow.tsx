import React, { useState } from 'react';
import {
  Text,
  Box,
  VStack,
  HStack,
  Button,
  Input,
  Grid,
  GridItem,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Select,
  Checkbox,
  useToast
} from '@chakra-ui/react';
import { Token, TokenCollection, Taxonomy, TokenTaxonomyRef, ResolvedValueType } from '@token-model/data-model';
import { Token as TokenSchema, PropertyType } from '../../../data-model/src/schema';
import { ZodError } from 'zod';
import { TaxonomyPicker } from '../components/TaxonomyPicker';
import { PropertyTypePicker } from '../components/PropertyTypePicker';
import { useSchema } from '../hooks/useSchema';
import { CodeSyntaxService } from '../services/codeSyntax';

// Add utility function to filter property types based on resolved value type
const getFilteredPropertyTypes = (resolvedValueTypeId: string, resolvedValueTypes: ResolvedValueType[], standardPropertyTypes: PropertyType[]): PropertyType[] => {
  const resolvedValueType = resolvedValueTypes.find(vt => vt.id === resolvedValueTypeId);
  if (!resolvedValueType || !resolvedValueType.type) {
    // If no type is specified, return all standard property types
    return standardPropertyTypes;
  }

  const standardType = resolvedValueType.type;
  
  // Filter standard property types based on compatible value types
  return standardPropertyTypes.filter(pt => 
    pt.compatibleValueTypes.includes(resolvedValueTypeId)
  );
};

// Add utility function to get default property types for a resolved value type
const getDefaultPropertyTypes = (resolvedValueTypeId: string, resolvedValueTypes: ResolvedValueType[], standardPropertyTypes: PropertyType[]): PropertyType[] => {
  const resolvedValueType = resolvedValueTypes.find(vt => vt.id === resolvedValueTypeId);
  if (!resolvedValueType || !resolvedValueType.type) {
    // If no type is specified, return empty array (no defaults)
    return [];
  }

  // Get filtered property types for this value type
  const filteredPropertyTypes = getFilteredPropertyTypes(resolvedValueTypeId, resolvedValueTypes, standardPropertyTypes);
  
  // For single-option types, return the first compatible property type
  // For multi-option types, return empty array (let user choose)
  const standardType = resolvedValueType.type;
  
  switch (standardType) {
    case 'FONT_FAMILY':
    case 'FONT_WEIGHT':
    case 'FONT_SIZE':
    case 'LINE_HEIGHT':
    case 'LETTER_SPACING':
    case 'DURATION':
    case 'CUBIC_BEZIER':
    case 'BLUR':
    case 'RADIUS':
      // For 1:1 relationships, return the first compatible property type
      return filteredPropertyTypes.slice(0, 1);
    default:
      // For multi-option types like COLOR and DIMENSION, return empty array
      return [];
  }
};

interface TokensWorkflowProps {
  tokens: Token[];
  setTokens: (tokens: Token[]) => void;
  tokenCollections: TokenCollection[];
  taxonomies: Taxonomy[];
}

export default function TokensWorkflow({
  tokens,
  setTokens,
  tokenCollections,
  taxonomies,
}: TokensWorkflowProps) {
  const [newToken, setNewToken] = useState<Partial<Token> & { propertyTypes: PropertyType[] }>({
    displayName: '',
    description: '',
    tokenCollectionId: '',
    resolvedValueTypeId: 'color',
    private: false,
    taxonomies: [] as TokenTaxonomyRef[],
    propertyTypes: [] as PropertyType[],
    codeSyntax: [],
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { schema } = useSchema();
  const toast = useToast();

  // Update property types when resolvedValueTypeId changes
  React.useEffect(() => {
    if (newToken.resolvedValueTypeId && schema?.resolvedValueTypes) {
      const currentPropertyTypes = (newToken.propertyTypes || []) as PropertyType[];
      const filteredPropertyTypes = getFilteredPropertyTypes(newToken.resolvedValueTypeId, schema.resolvedValueTypes, schema.standardPropertyTypes);
      
      // Check if current property types are still valid for the new value type
      const validPropertyTypes = currentPropertyTypes.filter(pt => filteredPropertyTypes.includes(pt));
      
      // If no valid property types remain, set to default
      if (validPropertyTypes.length === 0) {
        const defaultPropertyTypes = getDefaultPropertyTypes(newToken.resolvedValueTypeId, schema.resolvedValueTypes, schema.standardPropertyTypes);
        setNewToken(prev => ({
          ...prev,
          propertyTypes: defaultPropertyTypes
        }));
      } else if (validPropertyTypes.length !== currentPropertyTypes.length) {
        // If some property types were filtered out, update to only valid ones
        setNewToken(prev => ({
          ...prev,
          propertyTypes: validPropertyTypes
        }));
      }
    }
  }, [newToken.resolvedValueTypeId, schema?.resolvedValueTypes]);

  const handleAddToken = () => {
    setFieldErrors({});
    try {
      const validTaxonomies = (newToken.taxonomies || []).filter(
        (ref: TokenTaxonomyRef) => ref.taxonomyId && ref.termId
      );
      const codeSyntax = CodeSyntaxService.generateAllCodeSyntaxes(
        { ...newToken, taxonomies: validTaxonomies } as Token,
        schema || { platforms: [], namingRules: { taxonomyOrder: [] }, taxonomies: [], standardPropertyTypes: [] }
      );
      const token = TokenSchema.parse({
        id: crypto.randomUUID(),
        ...newToken,
        resolvedValueTypeId: (newToken.resolvedValueTypeId as string) || 'color',
        propertyTypes: (newToken.propertyTypes || []).filter(Boolean),
        taxonomies: validTaxonomies,
        codeSyntax
      });
      setTokens([...tokens, token]);
      setNewToken({
        displayName: '',
        description: '',
        tokenCollectionId: '',
        resolvedValueTypeId: 'color',
        private: false,
        taxonomies: [],
        propertyTypes: [],
        codeSyntax: [],
      });
      toast({
        title: 'Token added',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path && err.path.length > 0) {
            errors[err.path[0] as string] = err.message;
          }
        });
        setFieldErrors(errors);
      } else {
        setFieldErrors({ general: 'An unexpected error occurred.' });
      }
      toast({
        title: 'Error adding token',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6}>
      <GridItem>
        <Box p={4} borderWidth={1} borderRadius="md" bg="chakra-body-bg">
          <Text fontSize="xl" fontWeight="bold" mb={4}>
            Add New Token
          </Text>
          <VStack spacing={4} align="stretch">
            <FormControl isInvalid={Boolean(fieldErrors.displayName)}>
              <FormLabel>Display Name</FormLabel>
              <Input
                value={newToken.displayName}
                onChange={(e) => setNewToken({ ...newToken, displayName: e.target.value })}
              />
              <FormErrorMessage>{fieldErrors.displayName}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={Boolean(fieldErrors.description)}>
              <FormLabel>Description</FormLabel>
              <Input
                value={newToken.description}
                onChange={(e) => setNewToken({ ...newToken, description: e.target.value })}
              />
              <FormErrorMessage>{fieldErrors.description}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={Boolean(fieldErrors.tokenCollectionId)}>
              <FormLabel>Token Collection</FormLabel>
              <Select
                value={newToken.tokenCollectionId || ''}
                onChange={(e) => setNewToken({ ...newToken, tokenCollectionId: e.target.value })}
              >
                <option value="">Select a collection</option>
                {tokenCollections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </Select>
              <FormErrorMessage>{fieldErrors.tokenCollectionId}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={Boolean(fieldErrors.resolvedValueTypeId)}>
              <FormLabel>Resolved Value Type</FormLabel>
              <Input
                value={newToken.resolvedValueTypeId}
                onChange={(e) => setNewToken({ ...newToken, resolvedValueTypeId: e.target.value })}
              />
              <FormErrorMessage>{fieldErrors.resolvedValueTypeId}</FormErrorMessage>
            </FormControl>

            <FormControl>
              <Checkbox
                isChecked={!!newToken.private}
                onChange={(e) => setNewToken({ ...newToken, private: e.target.checked })}
              >
                Private
              </Checkbox>
            </FormControl>

            <PropertyTypePicker
              value={newToken.propertyTypes || []}
              onChange={(propertyTypes) => setNewToken({ ...newToken, propertyTypes })}
              availablePropertyTypes={schema?.resolvedValueTypes ? getFilteredPropertyTypes(newToken.resolvedValueTypeId || 'color', schema.resolvedValueTypes, schema.standardPropertyTypes) : undefined}
            />

            <Text fontSize="lg" fontWeight="medium">Taxonomies</Text>
            <TaxonomyPicker
              taxonomies={taxonomies}
              value={Array.isArray(newToken.taxonomies) ? newToken.taxonomies : []}
              onChange={newTaxonomies => setNewToken(prev => ({ ...prev, taxonomies: newTaxonomies }))}
              disabled={taxonomies.length === 0}
            />

            <Text fontSize="lg" fontWeight="medium">Code Syntax (auto-generated)</Text>
            <VStack spacing={2} align="stretch">
              {Object.entries(CodeSyntaxService.generateAllCodeSyntaxes(newToken as Token, schema || { platforms: [], namingRules: { taxonomyOrder: [] }, taxonomies: [], standardPropertyTypes: [] })).map(([key, value]) => (
                <HStack key={key} spacing={2}>
                  <Text fontSize="sm">{key}: {typeof value === 'string' ? value : JSON.stringify(value)}</Text>
                </HStack>
              ))}
            </VStack>

            {fieldErrors.general && (
              <Text color="red.500">{fieldErrors.general}</Text>
            )}

            <Button colorScheme="blue" onClick={handleAddToken}>
              Add Token
            </Button>
          </VStack>
        </Box>
      </GridItem>

      <GridItem>
        <Box p={4} borderWidth={1} borderRadius="md" bg="chakra-body-bg">
          <Text fontSize="xl" fontWeight="bold" mb={4}>
            Tokens List
          </Text>
          <VStack spacing={4} align="stretch">
            {tokens.map((token) => {
              const collection = tokenCollections.find((c) => c.id === token.tokenCollectionId);
              return (
                <Box
                  key={token.id}
                  p={4}
                  borderWidth={1}
                  borderRadius="md"
                  bg="gray.50"
                >
                  <Text fontSize="lg" fontWeight="medium">{token.displayName}</Text>
                  <VStack align="start" spacing={1} mt={2}>
                    <Text fontSize="sm">Description: {token.description}</Text>
                    <Text fontSize="sm">Collection: {collection?.name || 'Unknown'}</Text>
                    <Text fontSize="sm">Resolved Value Type: {token.resolvedValueTypeId}</Text>
                    <Text fontSize="sm">Private: {token.private ? 'Yes' : 'No'}</Text>
                    <Text fontSize="sm">Property Types: {token.propertyTypes.join(', ')}</Text>
                    <Text fontSize="sm">
                      Taxonomies: {Array.isArray(token.taxonomies) && token.taxonomies.length > 0
                        ? token.taxonomies.map(ref => {
                            const taxonomy = taxonomies.find(t => t.id === ref.taxonomyId);
                            const term = taxonomy?.terms.find(term => term.id === ref.termId);
                            return taxonomy && term ? `${taxonomy.name}: ${term.name}` : 'Unknown';
                          }).join(', ')
                        : 'None'}
                    </Text>
                    <Text fontSize="sm">Code Syntax: {
                      Array.isArray(token.codeSyntax)
                        ? token.codeSyntax.map((entry: { platformId: string; formattedName: string }) => `${entry.platformId}: ${entry.formattedName}`).join(', ')
                        : ''
                    }</Text>
                  </VStack>
                </Box>
              );
            })}
          </VStack>
        </Box>
      </GridItem>
    </Grid>
  );
} 
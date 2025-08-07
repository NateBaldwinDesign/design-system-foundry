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
import { useSchema, type Schema } from '../hooks/useSchema';
import { CodeSyntaxGenerator } from '@token-model/data-transformations';

// Add utility function to filter property types based on resolved value type
const getFilteredPropertyTypes = (resolvedValueTypeId: string, resolvedValueTypes: ResolvedValueType[], standardPropertyTypes: PropertyType[]): PropertyType[] => {
  const resolvedValueType = resolvedValueTypes.find(vt => vt.id === resolvedValueTypeId);
  if (!resolvedValueType) {
    // If resolved value type not found, return empty array
    return [];
  }

  // If this is a custom type (no standard type), handle specially
  if (!resolvedValueType.type) {
    // For custom types, check if there's a matching property type by ID pattern
    const matchingPropertyType = standardPropertyTypes.find(pt => 
      pt.id === resolvedValueTypeId || 
      pt.id === resolvedValueTypeId.replace(/_/g, '-') ||
      pt.id === resolvedValueTypeId.replace(/-/g, '_')
    );
    
    if (matchingPropertyType) {
      // Return the matching property type + both options
      return [
        {
          id: "ANY_PROPERTY",
          displayName: "Any Property (undefined)",
          category: "layout",
          compatibleValueTypes: ["color", "dimension", "font-family", "font-weight", "font-size", "line-height", "letter-spacing", "duration", "cubic-bezier", "blur", "radius"],
          inheritance: false
        },
        matchingPropertyType,
        {
          id: "ALL",
          displayName: "Select All",
          category: "layout",
          compatibleValueTypes: ["color", "dimension", "font-family", "font-weight", "font-size", "line-height", "letter-spacing", "duration", "cubic-bezier", "blur", "radius"],
          inheritance: false
        }
      ];
    } else {
      // Return only the options for custom types without matching property types
      return [
        {
          id: "ANY_PROPERTY",
          displayName: "Any Property (undefined)",
          category: "layout",
          compatibleValueTypes: ["color", "dimension", "font-family", "font-weight", "font-size", "line-height", "letter-spacing", "duration", "cubic-bezier", "blur", "radius"],
          inheritance: false
        },
        {
          id: "ALL",
          displayName: "Select All",
          category: "layout",
          compatibleValueTypes: ["color", "dimension", "font-family", "font-weight", "font-size", "line-height", "letter-spacing", "duration", "cubic-bezier", "blur", "radius"],
          inheritance: false
        }
      ];
    }
  }

  // For standard types, filter based on compatible value types
  // Note: PropertyType.compatibleValueTypes use hyphens (e.g., "font-family")
  // while ResolvedValueType.id uses underscores (e.g., "font_family")
  
  console.log('[getFilteredPropertyTypes] Debug filtering:', {
    resolvedValueTypeId,
    standardPropertyTypesCount: standardPropertyTypes.length,
    standardPropertyTypes: standardPropertyTypes.map(pt => ({
      id: pt.id,
      displayName: pt.displayName,
      compatibleValueTypes: pt.compatibleValueTypes
    }))
  });
  
  const compatiblePropertyTypes = standardPropertyTypes.filter(pt => 
    pt.compatibleValueTypes.includes(resolvedValueTypeId) ||
    pt.compatibleValueTypes.includes(resolvedValueTypeId.replace(/_/g, '-'))
  );

  // Define the special options
  const anyPropertyOption: PropertyType = {
    id: "ANY_PROPERTY",
    displayName: "Any Property (undefined)",
    category: "layout" as const,
    compatibleValueTypes: ["color", "dimension", "font-family", "font-weight", "font-size", "line-height", "letter-spacing", "duration", "cubic-bezier", "blur", "radius"],
    inheritance: false
  };

  const selectAllOption: PropertyType = {
    id: "ALL",
    displayName: "Select All",
    category: "layout" as const,
    compatibleValueTypes: ["color", "dimension", "font-family", "font-weight", "font-size", "line-height", "letter-spacing", "duration", "cubic-bezier", "blur", "radius"],
    inheritance: false
  };

  // If no compatible property types found for a standard type, treat as custom type
  if (compatiblePropertyTypes.length === 0) {
    // Check if there's a matching property type by ID pattern
    const matchingPropertyType = standardPropertyTypes.find(pt => 
      pt.id === resolvedValueTypeId || 
      pt.id === resolvedValueTypeId.replace(/_/g, '-') ||
      pt.id === resolvedValueTypeId.replace(/-/g, '_')
    );
    
    if (matchingPropertyType) {
      // Return matching property type + "Any Property" option only (no "Select All" for single option)
      return [
        anyPropertyOption,
        matchingPropertyType
      ];
    } else {
      // Return only "Any Property" option (no "Select All" for no options)
      return [anyPropertyOption];
    }
  }

  // Return compatible property types + options
  // Only include "Select All" if there are multiple compatible property types
  if (compatiblePropertyTypes.length > 1) {
    return [anyPropertyOption, ...compatiblePropertyTypes, selectAllOption];
  } else {
    return [anyPropertyOption, ...compatiblePropertyTypes];
  }
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
      // Note: codeSyntax is no longer part of the schema - it's generated on-demand
      const token = TokenSchema.parse({
        id: crypto.randomUUID(),
        ...newToken,
        resolvedValueTypeId: (newToken.resolvedValueTypeId as string) || 'color',
        propertyTypes: (newToken.propertyTypes || []).filter(Boolean),
        taxonomies: validTaxonomies
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

            <Text fontSize="lg" fontWeight="medium">Generated Names Preview</Text>
            <VStack spacing={2} align="stretch">
              {schema?.platforms && schema.platforms.length > 0 ? (
                schema.platforms.map((platform) => {
                  try {
                    const generator = new CodeSyntaxGenerator({
                      tokens: [newToken as Token],
                      platforms: schema.platforms || [],
                      taxonomies: schema.taxonomies || [],
                      taxonomyOrder: schema.taxonomyOrder || [],
                      platformExtensions: new Map() // TODO: Load platform extensions
                    });
                    const name = generator.generateTokenCodeSyntaxForPlatform(newToken as Token, platform.id);
                    return (
                      <HStack key={platform.id} spacing={2}>
                        <Text fontSize="sm">{platform.displayName}: {name}</Text>
                      </HStack>
                    );
                  } catch (error) {
                    return (
                      <HStack key={platform.id} spacing={2}>
                        <Text fontSize="sm" color="red.500">{platform.displayName}: Error generating name</Text>
                      </HStack>
                    );
                  }
                })
              ) : (
                <Text fontSize="sm" color="gray.500">No platforms configured</Text>
              )}
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
                    <Text fontSize="sm">Generated Names: {
                      schema?.platforms && schema.platforms.length > 0 ? (
                        schema.platforms.map(platform => {
                          try {
                            const generator = new CodeSyntaxGenerator({
                              tokens: [token],
                              platforms: schema.platforms || [],
                              taxonomies: schema.taxonomies || [],
                              taxonomyOrder: schema.taxonomyOrder || [],
                              platformExtensions: new Map() // TODO: Load platform extensions
                            });
                            return `${platform.displayName}: ${generator.generateTokenCodeSyntaxForPlatform(token, platform.id)}`;
                          } catch (error) {
                            return `${platform.displayName}: Error`;
                          }
                        }).join(', ')
                      ) : 'No platforms configured'
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
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
  Field,
  Select,
  Checkbox,
  createListCollection,
} from '@chakra-ui/react';
import { Token, TokenCollection, Taxonomy, TokenTaxonomyRef } from '@token-model/data-model';
import { Token as TokenSchema } from '../../../data-model/src/schema';
import { ZodError } from 'zod';
import { TaxonomyPicker } from '../components/TaxonomyPicker';
import { useSchema } from '../hooks/useSchema';
import { CodeSyntaxService } from '../services/codeSyntax';
import { useToast } from '../hooks/useToast';
import type { ChangeEvent } from 'react';

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
  const [newToken, setNewToken] = useState<Partial<Token>>({
    displayName: '',
    description: '',
    tokenCollectionId: '',
    resolvedValueTypeId: 'color',
    private: false,
    taxonomies: [] as TokenTaxonomyRef[],
    propertyTypes: [],
    codeSyntax: [],
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { schema } = useSchema();
  const toast = useToast();

  const handleAddToken = () => {
    setFieldErrors({});
    try {
      const validTaxonomies = (newToken.taxonomies || []).filter(
        (ref: TokenTaxonomyRef) => ref.taxonomyId && ref.termId
      );
      const codeSyntax = CodeSyntaxService.generateAllCodeSyntaxes(
        { ...newToken, taxonomies: validTaxonomies } as Token,
        schema
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
          <VStack gap={4} align="stretch">
            <Field.Root invalid={Boolean(fieldErrors.displayName)}>
              <Field.Label>Display Name</Field.Label>
              <Input
                value={newToken.displayName}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewToken({ ...newToken, displayName: e.target.value })}
              />
              {fieldErrors.displayName && <Field.ErrorText>{fieldErrors.displayName}</Field.ErrorText>}
            </Field.Root>

            <Field.Root invalid={Boolean(fieldErrors.description)}>
              <Field.Label>Description</Field.Label>
              <Input
                value={newToken.description}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewToken({ ...newToken, description: e.target.value })}
              />
              {fieldErrors.description && <Field.ErrorText>{fieldErrors.description}</Field.ErrorText>}
            </Field.Root>

            <Field.Root invalid={Boolean(fieldErrors.tokenCollectionId)}>
              <Field.Label>Token Collection</Field.Label>
              <Select.Root
                value={[newToken.tokenCollectionId || '']}
                onValueChange={(details) => {
                  const value = Array.isArray(details.value) ? details.value[0] : details.value;
                  setNewToken({ ...newToken, tokenCollectionId: value });
                }}
                collection={createListCollection({
                  items: [
                    { value: '', label: 'Select a collection' },
                    ...tokenCollections.map(collection => ({
                      value: collection.id,
                      label: collection.name
                    }))
                  ]
                })}
              >
                <Select.HiddenSelect />
                <Select.Control>
                  <Select.Trigger>
                    <Select.ValueText placeholder="Select a collection" />
                  </Select.Trigger>
                  <Select.IndicatorGroup>
                    <Select.Indicator />
                  </Select.IndicatorGroup>
                </Select.Control>
                <Select.Positioner>
                  <Select.Content>
                    <Select.Item item={{ value: '', label: 'Select a collection' }}>
                      Select a collection
                      <Select.ItemIndicator />
                    </Select.Item>
                    {tokenCollections.map((collection) => (
                      <Select.Item key={collection.id} item={{ value: collection.id, label: collection.name }}>
                        {collection.name}
                        <Select.ItemIndicator />
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Positioner>
              </Select.Root>
              {fieldErrors.tokenCollectionId && <Field.ErrorText>{fieldErrors.tokenCollectionId}</Field.ErrorText>}
            </Field.Root>

            <Field.Root invalid={Boolean(fieldErrors.resolvedValueTypeId)}>
              <Field.Label>Resolved Value Type</Field.Label>
              <Input
                value={newToken.resolvedValueTypeId}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewToken({ ...newToken, resolvedValueTypeId: e.target.value })}
              />
              {fieldErrors.resolvedValueTypeId && <Field.ErrorText>{fieldErrors.resolvedValueTypeId}</Field.ErrorText>}
            </Field.Root>

            <Field.Root>
              <Checkbox.Root
                checked={!!newToken.private}
                onCheckedChange={(checked: boolean) => setNewToken({ ...newToken, private: checked })}
              >
                <Checkbox.Control />
                <Checkbox.Label>Private</Checkbox.Label>
              </Checkbox.Root>
            </Field.Root>

            <Field.Root invalid={Boolean(fieldErrors.propertyTypes)}>
              <Field.Label>Property Types (comma separated)</Field.Label>
              <Input
                value={(newToken.propertyTypes || []).join(',')}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewToken({ ...newToken, propertyTypes: e.target.value.split(',').map((v) => v.trim()) })}
              />
              {fieldErrors.propertyTypes && <Field.ErrorText>{fieldErrors.propertyTypes}</Field.ErrorText>}
            </Field.Root>

            <Text fontSize="lg" fontWeight="medium">Taxonomies</Text>
            <TaxonomyPicker
              taxonomies={taxonomies}
              value={Array.isArray(newToken.taxonomies) ? newToken.taxonomies : []}
              onChange={newTaxonomies => setNewToken(prev => ({ ...prev, taxonomies: newTaxonomies }))}
              disabled={taxonomies.length === 0}
            />

            <Text fontSize="lg" fontWeight="medium">Code Syntax (auto-generated)</Text>
            {schema && (
              <VStack gap={4} align="stretch">
                {Object.entries(CodeSyntaxService.generateCodeSyntax(newToken, schema)).map(([platformId, formattedName]) => (
                  <HStack key={platformId} gap={4} align="start">
                    <Text fontWeight="medium">{platformId}:</Text>
                    <Text>{formattedName}</Text>
                  </HStack>
                ))}
              </VStack>
            )}

            <HStack gap={4} align="start" mt={4}>
              <Button
                colorPalette="blue"
                onClick={handleAddToken}
                disabled={!newToken.displayName || !newToken.tokenCollectionId}
              >
                Add Token
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setNewToken({});
                  setFieldErrors({});
                }}
              >
                Cancel
              </Button>
            </HStack>
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
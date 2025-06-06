import React, { useState } from "react";
import {
  Box,
  Text,
  Button,
  Field,
  Select,
  VStack,
  Heading,
  Code,
  Dialog,
  createListCollection,
} from '@chakra-ui/react';
import { useTheme } from 'next-themes';
import type { Token, TokenCollection, Dimension, Platform, Taxonomy } from '@token-model/data-model';
import { ValidationService } from '../../services/validation';
import { createSchemaJsonFromLocalStorage } from '../../services/createJson';
import { useToast } from '../../hooks/useToast';

interface ValidationViewProps {
  tokens: Token[];
  collections: TokenCollection[];
  dimensions: Dimension[];
  platforms: Platform[];
  taxonomies: Taxonomy[];
  version: string;
  versionHistory: unknown[];
  onValidate: (token: Token) => void;
}

interface ResolvedValueType {
  id: string;
  displayName: string;
  type?: string;
  description?: string;
  validation?: {
    pattern?: string;
    minimum?: number;
    maximum?: number;
    allowedValues?: string[];
  };
}

interface TokenSystemData {
  systemName: string;
  systemId: string;
  description: string;
  tokenCollections: TokenCollection[];
  dimensions: Dimension[];
  tokens: Token[];
  platforms: Platform[];
  taxonomies: Taxonomy[];
  version: string;
  versionHistory: Array<{
    version: string;
    dimensions: string[];
    date: string;
  }>;
  resolvedValueTypes: ResolvedValueType[];
  themes?: any[];
  themeOverrides?: Record<string, any>;
  extensions?: {
    tokenGroups: any[];
    tokenVariants: Record<string, any>;
  };
  tokenGroups?: any[]; // Optional
  tokenVariants?: any[]; // Optional
}

export default function ValidationView({
  tokens,
  collections,
  dimensions,
  platforms,
  taxonomies,
  version,
  versionHistory,
  onValidate,
}: ValidationViewProps) {
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [validationResults, setValidationResults] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { theme } = useTheme();
  const toast = useToast();

  const handleValidate = async () => {
    if (!selectedToken) return;

    setIsValidating(true);
    try {
      const schema = await createSchemaJsonFromLocalStorage();
      const results = await ValidationService.validateData(schema);
      setValidationResults(results);
      setIsDialogOpen(true);
    } catch (error) {
      toast({
        title: 'Validation Error',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Box p={4}>
      <Heading size="lg" mb={4}>Token Validation</Heading>
      <VStack gap={4} align="stretch">
        <Field.Root>
          <Field.Label>Select Token</Field.Label>
          <Select.Root
            value={selectedToken ? [selectedToken.id] : []}
            onValueChange={(details) => {
              const value = Array.isArray(details.value) ? details.value[0] : details.value;
              const token = tokens.find(t => t.id === value);
              setSelectedToken(token || null);
            }}
            collection={createListCollection({
              items: [
                { value: '', label: 'Select a token' },
                ...tokens.map(token => ({
                  value: token.id,
                  label: token.displayName
                }))
              ]
            })}
          >
            <Select.HiddenSelect />
            <Select.Control>
              <Select.Trigger>
                <Select.ValueText placeholder="Select a token" />
              </Select.Trigger>
              <Select.IndicatorGroup>
                <Select.Indicator />
              </Select.IndicatorGroup>
            </Select.Control>
            <Select.Positioner>
              <Select.Content>
                <Select.Item item={{ value: '', label: 'Select a token' }}>
                  Select a token
                  <Select.ItemIndicator />
                </Select.Item>
                {tokens.map((token) => (
                  <Select.Item key={token.id} item={{ value: token.id, label: token.displayName }}>
                    {token.displayName}
                    <Select.ItemIndicator />
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Positioner>
          </Select.Root>
        </Field.Root>

        <Button
          colorPalette="blue"
          onClick={handleValidate}
          disabled={!selectedToken || isValidating}
        >
          {isValidating ? 'Validating...' : 'Validate Token'}
        </Button>

        <Dialog.Root open={isDialogOpen} onOpenChange={(details) => setIsDialogOpen(details.open)}>
          <Dialog.Content>
            <Dialog.Header>Validation Results</Dialog.Header>
            <Dialog.Body>
              {validationResults && (
                <VStack gap={4} align="stretch">
                  <Text>Validation completed for token: {selectedToken?.displayName}</Text>
                  <Code p={4} borderRadius="md" bg={theme === 'dark' ? 'gray.800' : 'gray.100'}>
                    {JSON.stringify(validationResults, null, 2)}
                  </Code>
                </VStack>
              )}
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Root>
      </VStack>
    </Box>
  );
} 
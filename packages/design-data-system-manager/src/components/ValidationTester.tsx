import React, { useState } from 'react';
import {
  Box,
  Text,
  Input,
  Button,
  VStack,
  HStack,
  IconButton,
  Dialog,
  Field,
  Code,
  Heading
} from '@chakra-ui/react';
import { LuPlus, LuTrash2, LuPencil } from 'react-icons/lu';
import { StorageService } from '../services/storage';
import { ValidationService } from '../services/validation';
import { useToast as useCustomToast } from '../hooks/useToast';
import type { Token, TokenCollection, Dimension, Platform, Taxonomy } from '@token-model/data-model';
import type { ChangeEvent } from 'react';

interface ValidationTesterProps {
  tokens: Token[];
  collections: TokenCollection[];
  onValidate: (token: Token) => void;
}

export function ValidationTester({ tokens = [], collections = [], onValidate }: ValidationTesterProps) {
  const [isGlobalValidationOpen, setIsGlobalValidationOpen] = useState(false);
  const [isTokenValidationOpen, setIsTokenValidationOpen] = useState(false);
  const [globalValidationResult, setGlobalValidationResult] = useState<any>(null);
  const [tokenValidationResult, setTokenValidationResult] = useState<any>(null);
  const toast = useCustomToast();

  const handleGlobalValidation = async () => {
    try {
      const data = {
        tokens,
        tokenCollections: collections,
        dimensions: JSON.parse(localStorage.getItem('dimensions') || '[]'),
        platforms: JSON.parse(localStorage.getItem('platforms') || '[]'),
        taxonomies: JSON.parse(localStorage.getItem('taxonomies') || '[]'),
        resolvedValueTypes: JSON.parse(localStorage.getItem('resolvedValueTypes') || '[]'),
        version: '1.0.0',
        versionHistory: []
      };

      const result = ValidationService.validateData(data);
      setGlobalValidationResult(result);
      setIsGlobalValidationOpen(true);
    } catch (error) {
      toast({
        title: 'Validation failed',
        description: error instanceof Error ? error.message : 'An error occurred during validation',
        status: 'error'
      });
    }
  };

  const handleTokenValidation = async (token: Token) => {
    try {
      const data = {
        tokens: [token],
        tokenCollections: collections,
        dimensions: JSON.parse(localStorage.getItem('dimensions') || '[]'),
        platforms: JSON.parse(localStorage.getItem('platforms') || '[]'),
        taxonomies: JSON.parse(localStorage.getItem('taxonomies') || '[]'),
        resolvedValueTypes: JSON.parse(localStorage.getItem('resolvedValueTypes') || '[]'),
        version: '1.0.0',
        versionHistory: []
      };

      const result = ValidationService.validateData(data);
      setTokenValidationResult(result);
      setIsTokenValidationOpen(true);
    } catch (error) {
      toast({
        title: 'Validation failed',
        description: error instanceof Error ? error.message : 'An error occurred during validation',
        status: 'error'
      });
    }
  };

  return (
    <Box>
      <VStack gap={4} align="stretch">
        <Heading size="md">Validation Tester</Heading>
        <Button onClick={handleGlobalValidation}>
          Validate All Tokens
        </Button>

        <VStack gap={2} align="stretch">
          {tokens.map((token) => (
            <HStack key={token.id} justify="space-between" p={4} borderWidth={1} borderRadius="md">
              <Text>{token.displayName}</Text>
              <Button onClick={() => handleTokenValidation(token)}>
                Validate
              </Button>
            </HStack>
          ))}
        </VStack>
      </VStack>

      {/* Global Validation Dialog */}
      <Dialog.Root open={isGlobalValidationOpen} onOpenChange={(details) => setIsGlobalValidationOpen(details.open)}>
        <Dialog.Content>
          <Dialog.Header>Validation Failed</Dialog.Header>
          <Dialog.Body>
            <Text mb={4}>The following validation errors were found:</Text>
            {globalValidationResult?.errors?.map((error: unknown, index: number) => (
              <Code key={index} display="block" mb={2} p={2} whiteSpace="pre-wrap">
                {JSON.stringify(error, null, 2)}
              </Code>
            ))}
          </Dialog.Body>
          <Dialog.Footer>
            <Button onClick={() => setIsGlobalValidationOpen(false)}>
              Close
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>

      {/* Token Validation Dialog */}
      <Dialog.Root open={isTokenValidationOpen} onOpenChange={(details) => setIsTokenValidationOpen(details.open)}>
        <Dialog.Content>
          <Dialog.Header>Token Validation Failed</Dialog.Header>
          <Dialog.Body>
            <Text mb={4}>The following validation errors were found:</Text>
            {tokenValidationResult?.errors?.map((error: unknown, index: number) => (
              <Code key={index} display="block" mb={2} p={2} whiteSpace="pre-wrap">
                {JSON.stringify(error, null, 2)}
              </Code>
            ))}
          </Dialog.Body>
          <Dialog.Footer>
            <Button onClick={() => setIsTokenValidationOpen(false)}>
              Close
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </Box>
  );
} 
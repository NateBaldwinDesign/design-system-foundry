import React from "react";
import { useState } from 'react';
import {
  Box,
  Text,
  Button,
  FormControl,
  FormLabel,
  Select,
  Alert,
  VStack,
  Heading,
  useColorMode
} from '@chakra-ui/react';
import type { Token, TokenCollection } from '@token-model/data-model';

interface ValidationTesterProps {
  tokens: Token[];
  collections: TokenCollection[];
  onValidate: (token: Token) => void;
}

export function ValidationTester({ tokens = [], collections = [], onValidate }: ValidationTesterProps) {
  const { colorMode } = useColorMode();
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [validationResult, setValidationResult] = useState<string | null>(null);

  const handleTokenSelect = (tokenId: string) => {
    const token = tokens.find(t => t.id === tokenId);
    setSelectedToken(token || null);
    setValidationResult(null);
  };

  const handleValidate = () => {
    if (selectedToken) {
      onValidate(selectedToken);
      setValidationResult('Validation completed. Check console for details.');
    }
  };

  return (
    <Box>
      <Box p={4} borderRadius="md" boxShadow="md" bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
        <Heading as="h2" size="md" mb={4}>
          Token Validation Tester
        </Heading>
        <VStack align="stretch" spacing={4}>
          <FormControl>
            <FormLabel>Select Token</FormLabel>
            <Select
              value={selectedToken?.id || ''}
              onChange={(e) => handleTokenSelect(e.target.value)}
              placeholder="Select token"
            >
              {tokens?.map((token) => (
                <option key={token.id} value={token.id}>
                  {token.displayName}
                </option>
              ))}
            </Select>
          </FormControl>

          {selectedToken && (
            <Box>
              <Text fontWeight="semibold" mb={2}>
                Selected Token Details
              </Text>
              <Text fontSize="sm">
                Name: {selectedToken.displayName}
              </Text>
              <Text fontSize="sm">
                Collection: {collections?.find(c => c.id === selectedToken.tokenCollectionId)?.name}
              </Text>
              <Text fontSize="sm">
                Value Type: {selectedToken.resolvedValueType}
              </Text>
              <Button
                colorScheme="blue"
                onClick={handleValidate}
                mt={3}
              >
                Validate Token
              </Button>
            </Box>
          )}

          {validationResult && (
            <Alert status="info" mt={2}>
              {validationResult}
            </Alert>
          )}
        </VStack>
      </Box>
    </Box>
  );
} 
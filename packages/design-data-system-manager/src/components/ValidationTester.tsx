import React from "react";
import { useState } from 'react';
import {
  Box,
  Text,
  Button,
  FormControl,
  FormLabel,
  Select,
  VStack,
  Heading,
  useColorMode,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  AlertDialogFooter,
  Code
} from '@chakra-ui/react';
import type { Token, TokenCollection } from '@token-model/data-model';
import { ValidationService } from '../services/validation';

interface ValidationTesterProps {
  tokens: Token[];
  collections: TokenCollection[];
  onValidate: (token: Token) => void;
}

export function ValidationTester({ tokens = [], collections = [], onValidate }: ValidationTesterProps) {
  const { colorMode } = useColorMode();
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [isTokenValidationOpen, setIsTokenValidationOpen] = useState(false);
  const [tokenValidationResult, setTokenValidationResult] = useState<{ isValid: boolean; errors?: any[] } | null>(null);
  const [isGlobalValidationOpen, setIsGlobalValidationOpen] = useState(false);
  const [globalValidationResult, setGlobalValidationResult] = useState<{ isValid: boolean; errors?: any[] } | null>(null);
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const toast = useToast();

  const handleGlobalValidate = () => {
    try {
      // Get all data from localStorage
      const data = {
        tokenCollections: JSON.parse(localStorage.getItem('tokenCollections') || '[]'),
        dimensions: JSON.parse(localStorage.getItem('dimensions') || '[]'),
        tokens: JSON.parse(localStorage.getItem('tokens') || '[]'),
        platforms: JSON.parse(localStorage.getItem('platforms') || '[]'),
        taxonomies: JSON.parse(localStorage.getItem('taxonomies') || '[]'),
        version: '1.0.0',
        versionHistory: []
      };

      const result = ValidationService.validateData(data);
      
      if (result.isValid) {
        toast({
          title: 'Validation Successful',
          description: 'Your data is valid according to the schema.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        setGlobalValidationResult(result);
        setIsGlobalValidationOpen(true);
      }
    } catch (error) {
      toast({
        title: 'Validation Error',
        description: 'An error occurred during validation.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleTokenSelect = (tokenId: string) => {
    const token = tokens.find(t => t.id === tokenId);
    setSelectedToken(token || null);
    setTokenValidationResult(null);
  };

  const handleValidate = () => {
    if (selectedToken) {
      try {
        onValidate(selectedToken);
        toast({
          title: 'Token Validation Successful',
          description: 'The selected token is valid.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } catch (error) {
        setTokenValidationResult({
          isValid: false,
          errors: [error]
        });
        setIsTokenValidationOpen(true);
      }
    }
  };

  return (
    <Box>
      <Box p={4}  bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
        <VStack align="stretch" spacing={6}>
          <Box>
            <Heading as="h2" size="md" mb={4}>
              Global Data Validation
            </Heading>
            <Button
              colorScheme="blue"
              onClick={handleGlobalValidate}
              mb={4}
            >
              Validate All Data
            </Button>
          </Box>

          <Box pt={6}>
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
            </VStack>
          </Box>
        </VStack>
      </Box>

      {/* Global Validation Dialog */}
      <AlertDialog
        isOpen={isGlobalValidationOpen}
        leastDestructiveRef={cancelRef}
        onClose={() => setIsGlobalValidationOpen(false)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Validation Failed
            </AlertDialogHeader>

            <AlertDialogBody>
              <Text mb={4}>The following validation errors were found:</Text>
              {globalValidationResult?.errors?.map((error, index) => (
                <Code key={index} display="block" mb={2} p={2} whiteSpace="pre-wrap">
                  {JSON.stringify(error, null, 2)}
                </Code>
              ))}
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={() => setIsGlobalValidationOpen(false)}>
                Close
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Token Validation Dialog */}
      <AlertDialog
        isOpen={isTokenValidationOpen}
        leastDestructiveRef={cancelRef}
        onClose={() => setIsTokenValidationOpen(false)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Token Validation Failed
            </AlertDialogHeader>

            <AlertDialogBody>
              <Text mb={4}>The following validation errors were found:</Text>
              {tokenValidationResult?.errors?.map((error, index) => (
                <Code key={index} display="block" mb={2} p={2} whiteSpace="pre-wrap">
                  {JSON.stringify(error, null, 2)}
                </Code>
              ))}
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={() => setIsTokenValidationOpen(false)}>
                Close
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
} 
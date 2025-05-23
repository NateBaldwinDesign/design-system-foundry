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
  Code,
  Modal as ChakraModal,
  ModalOverlay as ChakraModalOverlay,
  ModalContent as ChakraModalContent,
  ModalHeader as ChakraModalHeader,
  ModalBody as ChakraModalBody,
  ModalCloseButton as ChakraModalCloseButton
} from '@chakra-ui/react';
import type { Token, TokenCollection, Dimension, Platform, Taxonomy } from '@token-model/data-model';
import { ValidationService } from '../../services/validation';

interface ValidationTabProps {
  tokens: Token[];
  collections: TokenCollection[];
  dimensions: Dimension[];
  platforms: Platform[];
  taxonomies: Taxonomy[];
  version: string;
  versionHistory: unknown[];
  onValidate: (token: Token) => void;
}

export function ValidationTab({ tokens = [], collections = [], dimensions = [], platforms = [], taxonomies = [], version = '1.0.0', versionHistory = [], onValidate }: ValidationTabProps) {
  const { colorMode } = useColorMode();
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [isTokenValidationOpen, setIsTokenValidationOpen] = useState(false);
  const [tokenValidationResult, setTokenValidationResult] = useState<{ isValid: boolean; errors?: any[] } | null>(null);
  const [isGlobalValidationOpen, setIsGlobalValidationOpen] = useState(false);
  const [globalValidationResult, setGlobalValidationResult] = useState<{ isValid: boolean; errors?: any[] } | null>(null);
  const [isJsonPreviewOpen, setIsJsonPreviewOpen] = useState(false);
  const [jsonPreview, setJsonPreview] = useState('');
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const toast = useToast();

  const handleGlobalValidate = () => {
    try {
      const data = {
        tokenCollections: collections,
        dimensions,
        tokens,
        platforms,
        taxonomies,
        version,
        versionHistory
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
    } catch (error: unknown) {
      toast({
        title: 'Validation Error',
        description: 'An error occurred during validation.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handlePreviewJson = () => {
    const data = {
      tokenCollections: collections,
      dimensions,
      tokens,
      platforms,
      taxonomies,
      version,
      versionHistory
    };
    console.log('[DEBUG] handlePreviewJson data:', data);
    setJsonPreview(JSON.stringify(data, null, 2));
    setIsJsonPreviewOpen(true);
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
      } catch (error: unknown) {
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
            <Button
              variant="outline"
              colorScheme="gray"
              onClick={handlePreviewJson}
              mb={4}
              ml={2}
            >
              Preview JSON
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
              {globalValidationResult?.errors?.map((error: unknown, index: number) => (
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
              {tokenValidationResult?.errors?.map((error: unknown, index: number) => (
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

      {/* JSON Preview Modal */}
      <ChakraModal isOpen={isJsonPreviewOpen} onClose={() => setIsJsonPreviewOpen(false)} size="6xl">
        <ChakraModalOverlay />
        <ChakraModalContent bg={colorMode === 'dark' ? 'gray.900' : 'white'} maxH="80vh" overflowY="auto">
          <ChakraModalHeader>Local Storage Data Preview</ChakraModalHeader>
          <ChakraModalCloseButton />
          <ChakraModalBody>
            <Box maxH="60vh" overflowY="auto">
              <Code width="100%" whiteSpace="pre" p={4} fontSize="sm" display="block">
                {jsonPreview}
              </Code>
            </Box>
          </ChakraModalBody>
        </ChakraModalContent>
      </ChakraModal>
    </Box>
  );
} 
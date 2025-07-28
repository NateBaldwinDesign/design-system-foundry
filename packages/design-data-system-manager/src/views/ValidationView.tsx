import React, { useState, useEffect } from "react";
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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel
} from '@chakra-ui/react';
import type { Token, TokenCollection, Dimension, Platform, Taxonomy } from '@token-model/data-model';
import { ValidationService } from '../services/validation';
import { createSchemaJsonFromLocalStorage, createAlgorithmJsonFromLocalStorage } from '../services/createJson';

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

export function ValidationView({ tokens = [], collections = [], dimensions = [], platforms = [], taxonomies = [], version = '1.0.0', versionHistory = [], onValidate }: ValidationViewProps) {
  const { colorMode } = useColorMode();
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [isTokenValidationOpen, setIsTokenValidationOpen] = useState(false);
  const [tokenValidationResult, setTokenValidationResult] = useState<{ isValid: boolean; errors?: unknown[] } | null>(null);
  const [isGlobalValidationOpen, setIsGlobalValidationOpen] = useState(false);
  const [globalValidationResult, setGlobalValidationResult] = useState<{ isValid: boolean; errors?: unknown[] } | null>(null);
  const [isJsonPreviewOpen, setIsJsonPreviewOpen] = useState(false);
  const [jsonPreview, setJsonPreview] = useState('');
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const toast = useToast();

  // Refresh JSON preview when data changes
  useEffect(() => {
    if (isJsonPreviewOpen) {
      const data = createSchemaJsonFromLocalStorage();
      setJsonPreview(JSON.stringify(data, null, 2));
    }
  }, [isJsonPreviewOpen, collections, dimensions, tokens, platforms, taxonomies, version, versionHistory]);

  const handleGlobalValidate = () => {
    try {
      const data = createSchemaJsonFromLocalStorage();
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
                    Collection: {selectedToken.tokenCollectionId ? collections?.find(c => c.id === selectedToken.tokenCollectionId)?.name : 'None'}
                  </Text>
                  <Text fontSize="sm">
                    Value Type: {selectedToken.resolvedValueTypeId}
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
      <Modal size="4xl" isOpen={isJsonPreviewOpen} onClose={() => setIsJsonPreviewOpen(false)}>
        <ModalOverlay />
        <ModalContent bg={colorMode === 'dark' ? 'gray.900' : 'white'} maxH="80vh" overflowY="auto">
          <ModalHeader>Local Storage Data Preview</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Tabs isFitted>
              <TabList>
                <Tab>Core Data</Tab>
                <Tab>Algorithm Data</Tab>
              </TabList>

              <TabPanels>
                <TabPanel>
                  <Box maxH="60vh" overflowY="auto">
                    <Code width="100%" whiteSpace="pre" p={4} fontSize="sm" display="block">
                      {jsonPreview}
                    </Code>
                  </Box>
                </TabPanel>
                <TabPanel>
                  <Box maxH="60vh" overflowY="auto">
                    <Code width="100%" whiteSpace="pre" p={4} fontSize="sm" display="block">
                      {JSON.stringify(createAlgorithmJsonFromLocalStorage(), null, 2)}
                    </Code>
                  </Box>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
} 
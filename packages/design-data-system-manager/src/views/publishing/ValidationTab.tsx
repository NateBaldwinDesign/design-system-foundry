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

interface ResolvedValueType {
  id: string;
  displayName: string;
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
  themes: any[];
  themeOverrides: Record<string, any>;
  extensions: {
    tokenGroups: any[];
    tokenVariants: Record<string, any>;
  };
  tokenGroups: any[]; // Required by schema
  tokenVariants: any[]; // Required by schema
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

  // Refresh JSON preview when data changes
  useEffect(() => {
    if (isJsonPreviewOpen) {
      const data = {
        tokenCollections: collections,
        dimensions,
        tokens,
        platforms,
        taxonomies,
        version,
        versionHistory
      };
      setJsonPreview(JSON.stringify(data, null, 2));
    }
  }, [isJsonPreviewOpen, collections, dimensions, tokens, platforms, taxonomies, version, versionHistory]);

  const handleGlobalValidate = () => {
    try {
      // First, collect all unique resolved value types from tokens
      const uniqueValueTypes = new Set<string>();
      tokens.forEach(token => {
        if (token.resolvedValueTypeId) {
          uniqueValueTypes.add(token.resolvedValueTypeId);
        }
      });

      // Create resolvedValueTypes array with unique items
      const resolvedValueTypes = Array.from(uniqueValueTypes).map(id => ({
        id,
        displayName: id
      }));

      // Construct data according to schema requirements
      const data: TokenSystemData = {
        systemName: "Design System", // Required by schema
        systemId: "design-system", // Required by schema
        description: "Design system tokens and configurations", // Required by schema
        tokenCollections: collections.map(collection => ({
          id: collection.id,
          name: collection.name,
          description: collection.description,
          resolvedValueTypeIds: collection.resolvedValueTypeIds || collection.resolvedValueTypes || [], // Map old field to new if needed
          private: collection.private || false,
          defaultModeIds: collection.defaultModeIds || [],
          modeResolutionStrategy: {
            priorityByType: (collection.modeResolutionStrategy?.priorityByType || [])
              .map(type => {
                // Map any non-standard types to COLOR_SCHEME as default
                if (!['COLOR_SCHEME', 'CONTRAST', 'DEVICE_TYPE', 'BRAND', 'THEME', 'MOTION', 'DENSITY'].includes(type)) {
                  return 'COLOR_SCHEME';
                }
                return type;
              }),
            fallbackStrategy: collection.modeResolutionStrategy?.fallbackStrategy || 'DEFAULT_VALUE'
          }
        })),
        dimensions: dimensions.map(dimension => {
          const base = {
            ...dimension,
            type: dimension.type || 'COLOR_SCHEME', // Add required type field
            required: dimension.required || false,
            defaultMode: dimension.defaultMode || dimension.modes[0]?.id || ''
          };
          if (Array.isArray((dimension as any).resolvedValueTypeIds)) {
            return {
              ...base,
              resolvedValueTypeIds: (dimension as any).resolvedValueTypeIds
            };
          }
          return base;
        }),
        tokens: tokens.map(token => ({
          ...token,
          private: token.private || false,
          themeable: token.themeable || false,
          taxonomies: token.taxonomies || [],
          propertyTypes: token.propertyTypes || [],
          resolvedValueTypeId: token.resolvedValueTypeId, // Only use the correct field
          // Convert codeSyntax object to array format
          codeSyntax: typeof token.codeSyntax === 'object' && !Array.isArray(token.codeSyntax) 
            ? Object.entries(token.codeSyntax).map(([platformId, formattedName]) => ({
                platformId,
                formattedName: String(formattedName)
              }))
            : token.codeSyntax || [],
          valuesByMode: token.valuesByMode || []
        })),
        platforms,
        taxonomies: taxonomies.map(taxonomy => ({
          ...taxonomy,
          terms: taxonomy.terms || []
        })),
        version,
        versionHistory: Array.isArray(versionHistory) && versionHistory.length > 0 ? 
          versionHistory.map(entry => ({
            version: typeof entry === 'object' && entry !== null && 'version' in entry ? 
              String(entry.version) : version,
            dimensions: Array.isArray(entry) && entry.length > 0 ? 
              entry.map(d => String(d)) : 
              dimensions.map(d => d.id),
            date: typeof entry === 'object' && entry !== null && 'date' in entry ? 
              String(entry.date) : 
              new Date().toISOString().slice(0, 10)
          })) : 
          [{
            version,
            dimensions: dimensions.map(d => d.id),
            date: new Date().toISOString().slice(0, 10)
          }],
        resolvedValueTypes,
        themes: [], // Will be populated if needed
        themeOverrides: {}, // Will be populated if needed
        extensions: {
          tokenGroups: [], // Required array
          tokenVariants: {} // Required object
        },
        tokenGroups: [], // Required by schema
        tokenVariants: [] // Required by schema
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
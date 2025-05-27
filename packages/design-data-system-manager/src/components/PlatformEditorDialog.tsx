import React, { useState, useMemo } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Box,
  Text,
  Input,
  FormControl,
  FormLabel,
  Select,
  VStack,
  HStack,
  useColorMode
} from '@chakra-ui/react';
import type { Platform } from '@token-model/data-model';
import { CodeSyntaxService } from '../services/codeSyntax';

type CapitalizationType = 'none' | 'uppercase' | 'lowercase' | 'capitalize';
type DelimiterType = '' | '_' | '-' | '.' | '/';

interface PlatformEditorDialogProps {
  platform: Platform;
  open: boolean;
  onClose: () => void;
  onSave: (platform: Platform) => void;
  isNew?: boolean;
}

export function PlatformEditorDialog({ platform, open, onClose, onSave, isNew = false }: PlatformEditorDialogProps) {
  const [editedPlatform, setEditedPlatform] = useState<Platform>(() => ({
    ...platform,
    syntaxPatterns: {
      prefix: platform.syntaxPatterns?.prefix ?? '',
      suffix: platform.syntaxPatterns?.suffix ?? '',
      delimiter: platform.syntaxPatterns?.delimiter ?? '_',
      capitalization: platform.syntaxPatterns?.capitalization ?? 'none',
      formatString: platform.syntaxPatterns?.formatString ?? ''
    }
  }));

  const { colorMode } = useColorMode();

  // Use CodeSyntaxService for preview
  const preview = useMemo(() => {
    // Mock token and schema for preview
    const mockToken: any = {
      taxonomies: [
        { taxonomyId: 'mock1', termId: 'mock1' },
        { taxonomyId: 'mock2', termId: 'mock2' },
        { taxonomyId: 'mock3', termId: 'mock3' }
      ]
    };
    const mockSchema: any = {
      namingRules: { taxonomyOrder: ['mock1', 'mock2', 'mock3'] },
      taxonomies: [
        { id: 'mock1', terms: [{ id: 'mock1', name: 'primary' }] },
        { id: 'mock2', terms: [{ id: 'mock2', name: 'color' }] },
        { id: 'mock3', terms: [{ id: 'mock3', name: 'background' }] }
      ],
      platforms: [
        { id: 'preview', syntaxPatterns: editedPlatform.syntaxPatterns }
      ]
    };
    return CodeSyntaxService.generateCodeSyntax(mockToken, 'preview', mockSchema);
  }, [editedPlatform.syntaxPatterns]);

  // Validation: required fields
  const hasRequiredFieldError =
    !editedPlatform.displayName ||
    editedPlatform.syntaxPatterns?.delimiter === undefined ||
    !editedPlatform.syntaxPatterns?.capitalization;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(editedPlatform);
    onClose();
  };

  return (
    <Modal isOpen={open} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent maxW="900px">
        <ModalHeader>
          {isNew ? 'Create Platform' : `Edit Platform: ${editedPlatform.displayName}`}
          <Text fontSize="xs" color="gray.500" mt={1} fontFamily="mono" wordBreak="break-all">
            {editedPlatform.id}
          </Text>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            {/* Basic Information */}
            <Text fontSize="lg" fontWeight="bold" mb={2}>Basic Information</Text>
            <Box
              p={3}
              borderWidth={1}
              borderRadius="md"
              bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
              borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
            >
              <VStack spacing={3} align="stretch">
                <FormControl isRequired>
                  <FormLabel>Display Name</FormLabel>
                  <Input
                    value={editedPlatform.displayName}
                    onChange={(e) => setEditedPlatform((prev: Platform) => ({ ...prev, displayName: e.target.value }))}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Description</FormLabel>
                  <Input
                    value={editedPlatform.description || ''}
                    onChange={(e) => setEditedPlatform((prev: Platform) => ({ ...prev, description: e.target.value }))}
                  />
                </FormControl>
              </VStack>
            </Box>

            {/* Syntax Patterns */}
            <Text fontSize="lg" fontWeight="bold" mb={2}>Syntax Patterns</Text>
            <Box
              p={3}
              borderWidth={1}
              borderRadius="md"
              bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
              borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
            >
              <HStack spacing={4} align="flex-end">
                <FormControl>
                  <FormLabel>Prefix</FormLabel>
                  <Input
                    value={editedPlatform.syntaxPatterns?.prefix ?? ''}
                    onChange={(e) => setEditedPlatform((prev: Platform) => ({
                      ...prev,
                      syntaxPatterns: { ...prev.syntaxPatterns, prefix: e.target.value }
                    }))}
                    placeholder="e.g., TKN_"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Suffix</FormLabel>
                  <Input
                    value={editedPlatform.syntaxPatterns?.suffix ?? ''}
                    onChange={(e) => setEditedPlatform((prev: Platform) => ({
                      ...prev,
                      syntaxPatterns: { ...prev.syntaxPatterns, suffix: e.target.value }
                    }))}
                    placeholder="e.g., _SUF"
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Delimiter</FormLabel>
                  <Select
                    value={editedPlatform.syntaxPatterns?.delimiter ?? '_'}
                    onChange={(e) => setEditedPlatform((prev: Platform) => ({
                      ...prev,
                      syntaxPatterns: { ...prev.syntaxPatterns, delimiter: e.target.value as DelimiterType }
                    }))}
                  >
                    <option value="">None (no delimiter)</option>
                    <option value="_">Underscore (_)</option>
                    <option value="-">Hyphen (-)</option>
                    <option value=".">Dot (.)</option>
                    <option value="/">Forward slash (/)</option>
                  </Select>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Capitalization</FormLabel>
                  <Select
                    value={editedPlatform.syntaxPatterns?.capitalization ?? 'none'}
                    onChange={(e) => setEditedPlatform((prev: Platform) => ({
                      ...prev,
                      syntaxPatterns: { ...prev.syntaxPatterns, capitalization: e.target.value as CapitalizationType }
                    }))}
                  >
                    <option value="none">None</option>
                    <option value="uppercase">UPPERCASE</option>
                    <option value="lowercase">lowercase</option>
                    <option value="capitalize">Capitalize</option>
                  </Select>
                </FormControl>
              </HStack>
              <VStack spacing={3} align="stretch" mt={4}>
                <FormControl>
                  <FormLabel>Format String</FormLabel>
                  <Input
                    value={editedPlatform.syntaxPatterns?.formatString ?? ''}
                    onChange={(e) => setEditedPlatform((prev: Platform) => ({
                      ...prev,
                      syntaxPatterns: { ...prev.syntaxPatterns, formatString: e.target.value }
                    }))}
                    placeholder="e.g., {prefix}{name}{suffix}"
                    width="100%"
                  />
                </FormControl>
                <Box mt={2} p={3} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.700' : 'gray.100'}>
                  <Text fontSize="sm" color="gray.500" mb={1} fontWeight="bold">Preview</Text>
                  <Text fontFamily="mono" fontSize="md" wordBreak="break-all">{preview}</Text>
                </Box>
              </VStack>
            </Box>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="blue" onClick={handleSave} disabled={hasRequiredFieldError}>
            {isNew ? 'Create Platform' : 'Save'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
} 
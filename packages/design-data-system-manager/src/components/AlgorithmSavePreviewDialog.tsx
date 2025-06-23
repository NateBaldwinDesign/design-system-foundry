import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  VStack,
  HStack,
  Text,
  Box,
  Badge,
  useColorMode,
  Alert,
  AlertIcon,
  Checkbox
} from '@chakra-ui/react';
import { Save, X } from 'lucide-react';
import { TokenCalculationState } from '../services/tokenCalculationService';
import type { Token } from '@token-model/data-model';
import type { Algorithm } from '../types/algorithm';

interface AlgorithmSavePreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedTokenIds: string[]) => void;
  algorithm: Algorithm;
  tokenCalculationStates: Map<string, TokenCalculationState>;
  existingTokens: Token[];
  resolvedValueTypes: Array<{ id: string; displayName: string }>;
}

export const AlgorithmSavePreviewDialog: React.FC<AlgorithmSavePreviewDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  algorithm,
  tokenCalculationStates,
  existingTokens,
  resolvedValueTypes
}) => {
  const { colorMode } = useColorMode();
  const [selectedTokenIds, setSelectedTokenIds] = useState<string[]>([]);

  // Initialize selected tokens with all changed tokens
  React.useEffect(() => {
    if (isOpen) {
      const changedTokenIds = Array.from(tokenCalculationStates.values())
        .filter(state => state.hasChanges)
        .map(state => state.tokenId);
      setSelectedTokenIds(changedTokenIds);
    }
  }, [isOpen, tokenCalculationStates]);

  const changedTokens = Array.from(tokenCalculationStates.values()).filter(state => state.hasChanges);
  const unchangedTokens = Array.from(tokenCalculationStates.values()).filter(state => !state.hasChanges);

  const handleSelectAll = () => {
    setSelectedTokenIds(changedTokens.map(token => token.tokenId));
  };

  const handleDeselectAll = () => {
    setSelectedTokenIds([]);
  };

  const handleTokenToggle = (tokenId: string) => {
    setSelectedTokenIds(prev => 
      prev.includes(tokenId) 
        ? prev.filter(id => id !== tokenId)
        : [...prev, tokenId]
    );
  };

  const handleSave = () => {
    onSave(selectedTokenIds);
    onClose();
  };

  const getValueTypeDisplayName = (tokenId: string) => {
    const token = existingTokens.find(t => t.id === tokenId);
    if (!token) return 'Unknown';
    
    const valueType = resolvedValueTypes.find(vt => vt.id === token.resolvedValueTypeId);
    return valueType?.displayName || 'Unknown';
  };

  const formatValue = (value: unknown) => {
    if (typeof value === 'number') {
      return value.toString();
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    return String(value);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxH="90vh">
        <ModalHeader>
          <HStack spacing={3}>
            <Text>Save Algorithm Changes</Text>
            <Badge colorScheme="blue" variant="subtle">
              {changedTokens.length} tokens affected
            </Badge>
          </HStack>
        </ModalHeader>

        <ModalBody>
          <VStack spacing={4} align="stretch">
            {/* Algorithm Summary */}
            <Box p={4} borderWidth={1} borderRadius="md" bg={colorMode === 'light' ? 'blue.50' : 'blue.900'}>
              <Text fontWeight="bold" mb={2}>Algorithm: {algorithm.name}</Text>
              <Text fontSize="sm" color="gray.600">
                This will update {changedTokens.length} tokens with new calculated values based on your formula changes.
              </Text>
            </Box>

            {/* Selection Controls */}
            {changedTokens.length > 0 && (
              <Box p={3} borderWidth={1} borderRadius="md" bg={colorMode === 'light' ? 'gray.50' : 'gray.700'}>
                <HStack justify="space-between" mb={3}>
                  <Text fontWeight="medium">Select tokens to update:</Text>
                  <HStack spacing={2}>
                    <Button size="sm" variant="outline" onClick={handleSelectAll}>
                      Select All
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleDeselectAll}>
                      Deselect All
                    </Button>
                  </HStack>
                </HStack>
                <Text fontSize="sm" color="gray.500">
                  {selectedTokenIds.length} of {changedTokens.length} tokens selected
                </Text>
              </Box>
            )}

            {/* Changed Tokens */}
            {changedTokens.length > 0 && (
              <Box>
                <Text fontWeight="bold" mb={3} color="orange.600">
                  Tokens with Changes ({changedTokens.length})
                </Text>
                <Box>
                  <VStack spacing={2} align="stretch">
                    {changedTokens.map(calculationState => {
                      const token = existingTokens.find(t => t.id === calculationState.tokenId);
                      if (!token) return null;

                      const isSelected = selectedTokenIds.includes(calculationState.tokenId);
                      const currentValue = calculationState.originalValue && 'value' in calculationState.originalValue 
                        ? formatValue(calculationState.originalValue.value)
                        : 'N/A';
                      const newValue = calculationState.calculatedValue && 'value' in calculationState.calculatedValue
                        ? formatValue(calculationState.calculatedValue.value)
                        : 'N/A';

                      return (
                        <Box
                          key={calculationState.tokenId}
                          p={3}
                          borderWidth={1}
                          borderRadius="md"
                          borderColor={isSelected ? 'blue.300' : 'gray.200'}
                          bg={isSelected ? (colorMode === 'light' ? 'blue.50' : 'blue.900') : (colorMode === 'light' ? 'white' : 'gray.700')}
                        >
                          <HStack justify="space-between" align="start">
                            <VStack align="start" flex={1} spacing={1}>
                              <HStack>
                                <Checkbox
                                  isChecked={isSelected}
                                  onChange={() => handleTokenToggle(calculationState.tokenId)}
                                />
                                <Text fontWeight="medium">{token.displayName}</Text>
                                <Badge size="sm" colorScheme="gray">
                                  {getValueTypeDisplayName(calculationState.tokenId)}
                                </Badge>
                              </HStack>
                              
                              <HStack spacing={4} fontSize="sm">
                                <VStack align="start" spacing={0}>
                                  <Text color="gray.500">Current:</Text>
                                  <Text fontFamily="mono" color="red.500">{currentValue}</Text>
                                </VStack>
                                <Text color="gray.400">→</Text>
                                <VStack align="start" spacing={0}>
                                  <Text color="gray.500">New:</Text>
                                  <Text fontFamily="mono" color="green.500">{newValue}</Text>
                                </VStack>
                              </HStack>
                              
                              <Text fontSize="xs" color="gray.500">
                                Iteration: {calculationState.iterationValue}
                              </Text>
                            </VStack>
                            
                            <Badge colorScheme="orange" variant="subtle">
                              Changed
                            </Badge>
                          </HStack>
                        </Box>
                      );
                    })}
                  </VStack>
                </Box>
              </Box>
            )}

            {/* Unchanged Tokens */}
            {unchangedTokens.length > 0 && (
              <Box>
                <Text fontWeight="bold" mb={3} color="green.600">
                  Tokens Unchanged ({unchangedTokens.length})
                </Text>
                <Box>
                  <VStack spacing={2} align="stretch">
                    {unchangedTokens.slice(0, 5).map(calculationState => {
                      const token = existingTokens.find(t => t.id === calculationState.tokenId);
                      if (!token) return null;

                      const currentValue = calculationState.originalValue && 'value' in calculationState.originalValue 
                        ? formatValue(calculationState.originalValue.value)
                        : 'N/A';

                      return (
                        <Box
                          key={calculationState.tokenId}
                          p={2}
                          borderWidth={1}
                          borderRadius="md"
                          bg={colorMode === 'light' ? 'gray.50' : 'gray.700'}
                          opacity={0.7}
                        >
                          <HStack justify="space-between">
                            <VStack align="start" spacing={0}>
                              <Text fontSize="sm" fontWeight="medium">{token.displayName}</Text>
                              <Text fontSize="xs" color="gray.500">
                                {getValueTypeDisplayName(calculationState.tokenId)} • {currentValue}
                              </Text>
                            </VStack>
                            <Badge colorScheme="green" variant="subtle" size="sm">
                              Unchanged
                            </Badge>
                          </HStack>
                        </Box>
                      );
                    })}
                    {unchangedTokens.length > 5 && (
                      <Text fontSize="sm" color="gray.500" textAlign="center">
                        ... and {unchangedTokens.length - 5} more unchanged tokens
                      </Text>
                    )}
                  </VStack>
                </Box>
              </Box>
            )}

            {/* Warning for no changes */}
            {changedTokens.length === 0 && (
              <Alert status="info">
                <AlertIcon />
                <Text>No token values have changed. The algorithm will be saved without updating any tokens.</Text>
              </Alert>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button variant="ghost" onClick={onClose} leftIcon={<X size={16} />}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSave}
              leftIcon={<Save size={16} />}
              isDisabled={changedTokens.length === 0}
            >
              Save Algorithm
              {selectedTokenIds.length > 0 && ` & Update ${selectedTokenIds.length} Tokens`}
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}; 
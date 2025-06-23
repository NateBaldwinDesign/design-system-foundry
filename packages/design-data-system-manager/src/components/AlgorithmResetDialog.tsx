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
  useColorMode,
  Alert,
  AlertIcon,
  Radio,
  RadioGroup,
  Divider
} from '@chakra-ui/react';
import { RotateCcw } from 'lucide-react';
import type { Algorithm } from '../types/algorithm';
import { AlgorithmHistoryService, AlgorithmHistoryEntry } from '../services/algorithmHistoryService';

interface AlgorithmResetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onReset: (resetType: 'last-save' | 'specific-history' | 'original', historyEntry?: AlgorithmHistoryEntry) => void;
  algorithm: Algorithm;
  hasUnsavedChanges: boolean;
}

export const AlgorithmResetDialog: React.FC<AlgorithmResetDialogProps> = ({
  isOpen,
  onClose,
  onReset,
  algorithm,
  hasUnsavedChanges
}) => {
  const { colorMode } = useColorMode();
  const [resetType, setResetType] = useState<'last-save' | 'specific-history' | 'original'>('last-save');
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<string>('');

  const historyEntries = AlgorithmHistoryService.getHistoryForAlgorithm(algorithm.id);
  const canUndo = AlgorithmHistoryService.canUndo(algorithm.id);
  const canRedo = AlgorithmHistoryService.canRedo(algorithm.id);

  const handleReset = () => {
    let historyEntry: AlgorithmHistoryEntry | undefined;
    
    if (resetType === 'specific-history' && selectedHistoryEntry) {
      historyEntry = historyEntries.find(entry => entry.id === selectedHistoryEntry);
    }
    
    onReset(resetType, historyEntry);
    onClose();
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getResetDescription = (type: string) => {
    switch (type) {
      case 'last-save':
        return 'Revert to the last saved version of the algorithm';
      case 'specific-history':
        return 'Revert to a specific point in the algorithm history';
      case 'original':
        return 'Reset to the original algorithm state (this will clear all history)';
      default:
        return '';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <HStack spacing={3}>
            <RotateCcw size={20} />
            <Text>Reset Algorithm</Text>
          </HStack>
        </ModalHeader>

        <ModalBody>
          <VStack spacing={4} align="stretch">
            {/* Warning for unsaved changes */}
            {hasUnsavedChanges && (
              <Alert status="warning">
                <AlertIcon />
                <Text>You have unsaved changes. Resetting will discard these changes.</Text>
              </Alert>
            )}

            {/* Reset Options */}
            <Box>
              <Text fontWeight="bold" mb={3}>Choose Reset Option:</Text>
              <RadioGroup value={resetType} onChange={(value) => setResetType(value as 'last-save' | 'specific-history' | 'original')}>
                <VStack spacing={3} align="start">
                  <Radio value="last-save" isDisabled={!canUndo}>
                    <VStack align="start" spacing={1}>
                      <Text fontWeight="medium">Last Saved Version</Text>
                      <Text fontSize="sm" color="gray.500">
                        {getResetDescription('last-save')}
                      </Text>
                      {!canUndo && (
                        <Text fontSize="xs" color="orange.500">
                          No saved history available
                        </Text>
                      )}
                    </VStack>
                  </Radio>

                  <Radio value="specific-history" isDisabled={historyEntries.length === 0}>
                    <VStack align="start" spacing={1}>
                      <Text fontWeight="medium">Specific History Point</Text>
                      <Text fontSize="sm" color="gray.500">
                        {getResetDescription('specific-history')}
                      </Text>
                      {historyEntries.length === 0 && (
                        <Text fontSize="xs" color="orange.500">
                          No history available
                        </Text>
                      )}
                    </VStack>
                  </Radio>

                  <Radio value="original">
                    <VStack align="start" spacing={1}>
                      <Text fontWeight="medium">Original State</Text>
                      <Text fontSize="sm" color="gray.500">
                        {getResetDescription('original')}
                      </Text>
                    </VStack>
                  </Radio>
                </VStack>
              </RadioGroup>
            </Box>

            {/* History Selection */}
            {resetType === 'specific-history' && historyEntries.length > 0 && (
              <Box>
                <Divider my={3} />
                <Text fontWeight="bold" mb={3}>Select History Point:</Text>
                <Box maxH="200px" overflowY="auto" borderWidth={1} borderRadius="md" p={2}>
                  <RadioGroup value={selectedHistoryEntry} onChange={setSelectedHistoryEntry}>
                    <VStack spacing={2} align="start">
                      {historyEntries.map((entry) => (
                        <Radio key={entry.id} value={entry.id}>
                          <VStack align="start" spacing={0}>
                            <Text fontSize="sm" fontWeight="medium">
                              {entry.description}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              {formatTimestamp(entry.timestamp)} • {entry.type}
                            </Text>
                          </VStack>
                        </Radio>
                      ))}
                    </VStack>
                  </RadioGroup>
                </Box>
              </Box>
            )}

            {/* Undo/Redo Status */}
            <Box p={3} bg={colorMode === 'light' ? 'gray.50' : 'gray.700'} borderRadius="md">
              <Text fontSize="sm" fontWeight="medium" mb={2}>Current Status:</Text>
              <VStack spacing={1} align="start">
                <Text fontSize="xs" color="gray.500">
                  Undo available: {canUndo ? 'Yes' : 'No'}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  Redo available: {canRedo ? 'Yes' : 'No'}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  History entries: {historyEntries.length}
                </Text>
              </VStack>
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={handleReset}
              leftIcon={<RotateCcw size={16} />}
              isDisabled={
                (resetType === 'last-save' && !canUndo) ||
                (resetType === 'specific-history' && (!selectedHistoryEntry || historyEntries.length === 0))
              }
            >
              Reset Algorithm
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}; 
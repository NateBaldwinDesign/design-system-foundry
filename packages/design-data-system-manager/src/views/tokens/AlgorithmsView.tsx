import React, { useState } from 'react';
import {
  Box,
  Text,
  VStack,
  HStack,
  Button,
  useToast,
  useColorMode,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton
} from '@chakra-ui/react';
import { LuPlus, LuTrash2, LuPencil } from 'react-icons/lu';
import { AlgorithmEditor } from '../../components/AlgorithmEditor';
import { StorageService } from '../../services/storage';
import { Algorithm } from '../../types/algorithm';

const AlgorithmsView: React.FC = () => {
  const { colorMode } = useColorMode();
  const toast = useToast();
  const [algorithms, setAlgorithms] = useState<Algorithm[]>(() => {
    const stored = StorageService.getAlgorithms();
    return stored || [];
  });
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingAlgorithm, setEditingAlgorithm] = useState<Algorithm | undefined>();

  const handleSaveAlgorithm = (algorithm: Algorithm) => {
    const newAlgorithms = editingAlgorithm
      ? algorithms.map(a => a.id === algorithm.id ? algorithm : a)
      : [...algorithms, algorithm];

    setAlgorithms(newAlgorithms);
    StorageService.setAlgorithms(newAlgorithms);
    setIsEditorOpen(false);
    setEditingAlgorithm(undefined);

    toast({
      title: 'Success',
      description: `Algorithm ${editingAlgorithm ? 'updated' : 'created'} successfully`,
      status: 'success',
      duration: 3000,
      isClosable: true
    });
  };

  const handleDeleteAlgorithm = (algorithmId: string) => {
    const newAlgorithms = algorithms.filter(a => a.id !== algorithmId);
    setAlgorithms(newAlgorithms);
    StorageService.setAlgorithms(newAlgorithms);

    toast({
      title: 'Success',
      description: 'Algorithm deleted successfully',
      status: 'success',
      duration: 3000,
      isClosable: true
    });
  };

  const handleEditAlgorithm = (algorithm: Algorithm) => {
    setEditingAlgorithm(algorithm);
    setIsEditorOpen(true);
  };

  return (
    <Box p={4}>
      <VStack spacing={6} align="stretch">
        <HStack justify="space-between">
          <Text fontSize="2xl" fontWeight="bold">Algorithms</Text>
          <Button
            leftIcon={<LuPlus />}
            colorScheme="blue"
            onClick={() => {
              setEditingAlgorithm(undefined);
              setIsEditorOpen(true);
            }}
          >
            New Algorithm
          </Button>
        </HStack>

        {/* Algorithm List */}
        <VStack spacing={4} align="stretch">
          {algorithms.map(algorithm => (
            <Box
              key={algorithm.id}
              p={4}
              bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
              borderRadius="md"
              borderWidth={1}
              borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
            >
              <VStack align="stretch" spacing={2}>
                <HStack justify="space-between">
                  <Text fontSize="lg" fontWeight="bold">{algorithm.name}</Text>
                  <HStack>
                    <IconButton
                      aria-label="Edit algorithm"
                      icon={<LuPencil />}
                      size="sm"
                      onClick={() => handleEditAlgorithm(algorithm)}
                    />
                    <IconButton
                      aria-label="Delete algorithm"
                      icon={<LuTrash2 />}
                      size="sm"
                      colorScheme="red"
                      onClick={() => handleDeleteAlgorithm(algorithm.id)}
                    />
                  </HStack>
                </HStack>
                {algorithm.description && (
                  <Text color="gray.500">{algorithm.description}</Text>
                )}
                <Text fontSize="sm">
                  {algorithm.variables.length} variables • {algorithm.formulas.length} formulas • {algorithm.conditions.length} conditions • {algorithm.steps.length} steps
                </Text>
              </VStack>
            </Box>
          ))}
        </VStack>

        {/* Algorithm Editor Modal */}
        <Modal isOpen={isEditorOpen} onClose={() => setIsEditorOpen(false)} size="6xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              {editingAlgorithm ? 'Edit Algorithm' : 'New Algorithm'}
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <AlgorithmEditor
                algorithm={editingAlgorithm}
                onSave={handleSaveAlgorithm}
              />
            </ModalBody>
          </ModalContent>
        </Modal>
      </VStack>
    </Box>
  );
};

export default AlgorithmsView; 
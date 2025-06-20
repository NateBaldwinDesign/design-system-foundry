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
import { CardTitle } from '../../components/CardTitle';

interface AlgorithmsViewProps {
  algorithms: Algorithm[];
}

const AlgorithmsView: React.FC<AlgorithmsViewProps> = ({ algorithms }) => {
  const { colorMode } = useColorMode();
  const toast = useToast();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingAlgorithm, setEditingAlgorithm] = useState<Algorithm | undefined>();

  // Debug logging
  console.log('[AlgorithmsView] Received', algorithms.length, 'algorithms');

  const handleSaveAlgorithm = (algorithm: Algorithm) => {
    const newAlgorithms = editingAlgorithm
      ? algorithms.map(a => a.id === algorithm.id ? algorithm : a)
      : [...algorithms, algorithm];

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
    <Box>
      <Text fontSize="2xl" fontWeight="bold" mb={4}>Algorithms</Text>
      <Box p={4} mb={4} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
        <Button
            leftIcon={<LuPlus />}
            colorScheme="blue"
            size="sm"
            mb={4}
            onClick={() => {
              setEditingAlgorithm(undefined);
              setIsEditorOpen(true);
            }}
          >
            New Algorithm
          </Button>
        {/* Algorithm List */}
        <VStack align="stretch" spacing={2}>
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
                  <CardTitle title={algorithm.name} cardType="algorithm" />
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
      </Box>
    </Box>
  );
};

export default AlgorithmsView; 
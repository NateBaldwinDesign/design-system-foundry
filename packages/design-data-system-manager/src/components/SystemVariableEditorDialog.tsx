import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Input,
  Select,
  useToast,
  Text
} from '@chakra-ui/react';
import { ModeBasedVariableEditor } from './ModeBasedVariableEditor';
import { generateId } from '../utils/id';
import type { Variable } from '../types/algorithm';
import type { Dimension } from '@token-model/data-model';

interface SystemVariableEditorDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (variable: Variable) => void;
  variable?: Variable | null;
  isNew?: boolean;
  dimensions: Dimension[];
}

export const SystemVariableEditorDialog: React.FC<SystemVariableEditorDialogProps> = ({
  open,
  onClose,
  onSave,
  variable,
  isNew = false,
  dimensions
}) => {
  const toast = useToast();
  // Regex for valid variable names
  const variableNamePattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  
  const [currentVariable, setCurrentVariable] = useState<Variable>({
    id: '',
    name: '',
    type: 'number',
    defaultValue: '',
    description: '',
    modeBased: false,
    valuesByMode: [],
    dimensionId: undefined
  });

  // Validate the current variable name
  const isCurrentNameValid = currentVariable.name ? variableNamePattern.test(currentVariable.name) : true;

  // Initialize currentVariable when variable prop changes
  useEffect(() => {
    if (variable) {
      setCurrentVariable({
        ...variable,
        id: variable.id || generateId('system-variable')
      });
    } else {
      setCurrentVariable({
        id: generateId('system-variable'),
        name: '',
        type: 'number',
        defaultValue: '',
        description: '',
        modeBased: false,
        valuesByMode: [],
        dimensionId: undefined
      });
    }
  }, [variable]);

  const handleSave = () => {
    // Validate required fields
    if (!currentVariable.name?.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a variable name',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    // Validate variable name pattern
    if (!isCurrentNameValid) {
      toast({
        title: 'Error',
        description: 'Variable name must start with a letter or underscore and contain only letters, numbers, and underscores.',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    if (!currentVariable.type) {
      toast({
        title: 'Error',
        description: 'Please select a variable type',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    // Validate mode-based settings
    if (currentVariable.modeBased && !currentVariable.dimensionId) {
      toast({
        title: 'Error',
        description: 'Please select a dimension for mode-based variable',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    onSave(currentVariable);
    onClose();
  };

  const handleVariableChange = (updatedVariable: Variable) => {
    setCurrentVariable(updatedVariable);
  };

  return (
    <Modal isOpen={open} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {isNew ? 'Create New System Variable' : 'Edit System Variable'}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <HStack spacing={4}>
              <FormControl isRequired isInvalid={!!currentVariable.name && !isCurrentNameValid}>
                <FormLabel>Variable Name</FormLabel>
                <Input
                  placeholder="Variable Name"
                  value={currentVariable.name}
                  onChange={(e) => setCurrentVariable(prev => ({ ...prev, name: e.target.value }))}
                />
                {!isCurrentNameValid && currentVariable.name && (
                  <Text fontSize="xs" color="red.500">
                    Variable names must start with a letter or underscore and contain only letters, numbers, and underscores.
                  </Text>
                )}
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Type</FormLabel>
                <Select
                  value={currentVariable.type}
                  onChange={(e) => setCurrentVariable(prev => ({ ...prev, type: e.target.value as Variable['type'] }))}
                >
                  <option value="number">Number</option>
                  <option value="string">String</option>
                  <option value="boolean">Boolean</option>
                  <option value="color">Color</option>
                </Select>
              </FormControl>
            </HStack>

            <FormControl>
              <FormLabel>Default Value</FormLabel>
              <Input
                placeholder="Default Value (optional)"
                value={currentVariable.defaultValue || ''}
                onChange={(e) => setCurrentVariable(prev => ({ ...prev, defaultValue: e.target.value }))}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Description</FormLabel>
              <Input
                placeholder="Description (optional)"
                value={currentVariable.description || ''}
                onChange={(e) => setCurrentVariable(prev => ({ ...prev, description: e.target.value }))}
              />
            </FormControl>

            {/* Mode-Based Variable Settings */}
            <ModeBasedVariableEditor
              variable={currentVariable}
              onVariableChange={handleVariableChange}
              dimensions={dimensions}
            />
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleSave} isDisabled={!isCurrentNameValid}>
              {isNew ? 'Create Variable' : 'Save Changes'}
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}; 
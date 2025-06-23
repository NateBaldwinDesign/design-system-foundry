import React, { useState, useEffect } from 'react';
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
  Checkbox,
  Box,
  Badge,
  useColorMode,
  Alert,
  AlertIcon,
  AlertDescription
} from '@chakra-ui/react';
import type { Algorithm } from '../types/algorithm';
import { StorageService } from '../services/storage';
import { SystemVariableService } from '../services/systemVariableService';

interface ModeSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedModes: Record<string, string[]>) => void;
  algorithm: Algorithm;
}

interface ModeOption {
  dimensionId: string;
  dimensionName: string;
  modeId: string;
  modeName: string;
  isSelected: boolean;
}

export const ModeSelectionDialog: React.FC<ModeSelectionDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  algorithm
}) => {
  const { colorMode } = useColorMode();
  const [modeOptions, setModeOptions] = useState<ModeOption[]>([]);
  const [selectedModes, setSelectedModes] = useState<Record<string, string[]>>({});

  // Load dimensions and detect mode-based variables
  useEffect(() => {
    if (!isOpen) return;

    const storedDimensions = StorageService.getDimensions();

    // Get all variables (algorithm variables + system variables)
    const algorithmVariables = algorithm.variables || [];
    const systemVariables = SystemVariableService.getSystemVariables();
    const allVariables = [...algorithmVariables, ...systemVariables];

    // Find mode-based variables
    const modeBasedVariables = allVariables.filter(v => v.modeBased && v.dimensionId);
    
    if (modeBasedVariables.length === 0) {
      // No mode-based variables, close dialog and proceed with default
      onConfirm({});
      return;
    }

    // Get unique dimensions used by mode-based variables
    const usedDimensions = storedDimensions.filter(dim => 
      modeBasedVariables.some(v => v.dimensionId === dim.id)
    );

    // Create mode options for each dimension
    const options: ModeOption[] = [];
    usedDimensions.forEach(dimension => {
      dimension.modes.forEach(mode => {
        options.push({
          dimensionId: dimension.id,
          dimensionName: dimension.displayName,
          modeId: mode.id,
          modeName: mode.name,
          isSelected: true // Default to all selected
        });
      });
    });

    setModeOptions(options);

    // Initialize selected modes (all modes selected by default)
    const initialSelectedModes: Record<string, string[]> = {};
    usedDimensions.forEach(dimension => {
      initialSelectedModes[dimension.id] = dimension.modes.map(mode => mode.id);
    });
    setSelectedModes(initialSelectedModes);
  }, [isOpen, algorithm, onConfirm]);

  const handleModeToggle = (dimensionId: string, modeId: string, isSelected: boolean) => {
    setSelectedModes(prev => {
      const currentModes = prev[dimensionId] || [];
      if (isSelected) {
        return {
          ...prev,
          [dimensionId]: [...currentModes, modeId]
        };
      } else {
        return {
          ...prev,
          [dimensionId]: currentModes.filter(id => id !== modeId)
        };
      }
    });

    setModeOptions(prev => 
      prev.map(option => 
        option.dimensionId === dimensionId && option.modeId === modeId
          ? { ...option, isSelected }
          : option
      )
    );
  };

  const handleSelectAll = (dimensionId: string) => {
    const dimensionModes = modeOptions.filter(option => option.dimensionId === dimensionId);
    const allModeIds = dimensionModes.map(option => option.modeId);
    
    setSelectedModes(prev => ({
      ...prev,
      [dimensionId]: allModeIds
    }));

    setModeOptions(prev => 
      prev.map(option => 
        option.dimensionId === dimensionId
          ? { ...option, isSelected: true }
          : option
      )
    );
  };

  const handleDeselectAll = (dimensionId: string) => {
    setSelectedModes(prev => ({
      ...prev,
      [dimensionId]: []
    }));

    setModeOptions(prev => 
      prev.map(option => 
        option.dimensionId === dimensionId
          ? { ...option, isSelected: false }
          : option
      )
    );
  };

  const handleConfirm = () => {
    // Filter out dimensions with no selected modes
    const filteredSelectedModes: Record<string, string[]> = {};
    Object.entries(selectedModes).forEach(([dimensionId, modeIds]) => {
      if (modeIds.length > 0) {
        filteredSelectedModes[dimensionId] = modeIds;
      }
    });

    onConfirm(filteredSelectedModes);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  // Group mode options by dimension
  const dimensionGroups = modeOptions.reduce((groups, option) => {
    if (!groups[option.dimensionId]) {
      groups[option.dimensionId] = {
        dimensionName: option.dimensionName,
        options: []
      };
    }
    groups[option.dimensionId].options.push(option);
    return groups;
  }, {} as Record<string, { dimensionName: string; options: ModeOption[] }>);

  // Calculate total combinations
  const totalCombinations = Object.values(selectedModes).reduce((total, modeIds) => {
    return total * Math.max(modeIds.length, 1);
  }, 1);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Select Modes for Token Generation</ModalHeader>
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <AlertDescription>
                Your algorithm contains mode-based variables. Select which modes to generate tokens for.
                {totalCombinations > 1 && (
                  <Text mt={2} fontWeight="bold">
                    This will generate {totalCombinations} tokens per iteration.
                  </Text>
                )}
              </AlertDescription>
            </Alert>

            {Object.entries(dimensionGroups).map(([dimensionId, group]) => {
              const selectedCount = selectedModes[dimensionId]?.length || 0;
              const totalCount = group.options.length;
              
              return (
                <Box key={dimensionId} p={4} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}>
                  <HStack justify="space-between" mb={3}>
                    <Text fontWeight="bold">{group.dimensionName}</Text>
                    <HStack spacing={2}>
                      <Badge colorScheme="blue">
                        {selectedCount}/{totalCount} selected
                      </Badge>
                      <Button size="xs" onClick={() => handleSelectAll(dimensionId)}>
                        Select All
                      </Button>
                      <Button size="xs" onClick={() => handleDeselectAll(dimensionId)}>
                        Deselect All
                      </Button>
                    </HStack>
                  </HStack>
                  
                  <VStack spacing={2} align="stretch">
                    {group.options.map(option => (
                      <Checkbox
                        key={option.modeId}
                        isChecked={option.isSelected}
                        onChange={(e) => handleModeToggle(dimensionId, option.modeId, e.target.checked)}
                      >
                        <HStack>
                          <Text>{option.modeName}</Text>
                          <Badge size="sm" colorScheme="gray" variant="outline">
                            {option.modeId}
                          </Badge>
                        </HStack>
                      </Checkbox>
                    ))}
                  </VStack>
                </Box>
              );
            })}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <HStack spacing={3}>
            <Button onClick={handleCancel}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleConfirm}>
              Generate Tokens ({totalCombinations} per iteration)
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}; 
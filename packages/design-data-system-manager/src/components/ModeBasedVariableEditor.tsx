import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  FormControl,
  FormLabel,
  Select,
  Switch,
  Divider,
  Badge
} from '@chakra-ui/react';
import type { Dimension } from '@token-model/data-model';
import type { Variable } from '../types/algorithm';
import { StorageService } from '../services/storage';

interface ModeBasedVariableEditorProps {
  variable: Variable;
  onVariableChange: (variable: Variable) => void;
}

export const ModeBasedVariableEditor: React.FC<ModeBasedVariableEditorProps> = ({
  variable,
  onVariableChange
}) => {
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [selectedDimension, setSelectedDimension] = useState<Dimension | null>(null);

  // Load dimensions from storage
  useEffect(() => {
    const storedDimensions = StorageService.getDimensions();
    setDimensions(storedDimensions);
    
    // Set selected dimension if variable already has one
    if (variable.dimensionId) {
      const dim = storedDimensions.find(d => d.id === variable.dimensionId);
      setSelectedDimension(dim || null);
    }
  }, [variable.dimensionId]);

  const handleModeBasedToggle = (enabled: boolean) => {
    const updatedVariable: Variable = {
      ...variable,
      modeBased: enabled,
      dimensionId: enabled ? variable.dimensionId : undefined,
      modeValues: enabled ? (variable.modeValues || {}) : undefined
    };

    onVariableChange(updatedVariable);
  };

  const handleDimensionChange = (dimensionId: string) => {
    const dimension = dimensions.find(d => d.id === dimensionId);
    setSelectedDimension(dimension || null);

    const updatedVariable: Variable = {
      ...variable,
      dimensionId: dimensionId,
      modeValues: dimension ? (variable.modeValues || {}) : undefined
    };

    onVariableChange(updatedVariable);
  };

  const handleModeValueChange = (modeId: string, value: string) => {
    const updatedModeValues = {
      ...variable.modeValues,
      [modeId]: value
    };

    const updatedVariable: Variable = {
      ...variable,
      modeValues: updatedModeValues
    };

    onVariableChange(updatedVariable);
  };

  return (
    <Box p={4} borderWidth={1} borderRadius="md" bg="gray.50">
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between">
          <Text fontWeight="bold">Mode-Based Variable Settings</Text>
          <Switch
            isChecked={variable.modeBased || false}
            onChange={(e) => handleModeBasedToggle(e.target.checked)}
          />
        </HStack>

        {variable.modeBased && (
          <>
            <Divider />
            
            <FormControl isRequired>
              <FormLabel>Dimension</FormLabel>
              <Select
                value={variable.dimensionId || ''}
                onChange={(e) => handleDimensionChange(e.target.value)}
                placeholder="Select a dimension"
              >
                {dimensions.map(dimension => (
                  <option key={dimension.id} value={dimension.id}>
                    {dimension.displayName} ({dimension.modes.length} modes)
                  </option>
                ))}
              </Select>
            </FormControl>

            {selectedDimension && (
              <Box>
                <Text fontWeight="medium" mb={3}>
                  Mode-Specific Values for &ldquo;{selectedDimension.displayName}&rdquo;
                </Text>
                <VStack spacing={3} align="stretch">
                  {selectedDimension.modes.map(mode => (
                    <HStack key={mode.id} spacing={3}>
                      <Badge colorScheme="blue" minW="80px">
                        {mode.name}
                      </Badge>
                      <FormControl>
                        <Input
                          placeholder={`Value for ${mode.name}`}
                          value={variable.modeValues?.[mode.id] || ''}
                          onChange={(e) => handleModeValueChange(mode.id, e.target.value)}
                          size="sm"
                        />
                      </FormControl>
                    </HStack>
                  ))}
                </VStack>
                
                {selectedDimension.modes.length === 0 && (
                  <Text fontSize="sm" color="gray.500">
                    No modes available for this dimension
                  </Text>
                )}
              </Box>
            )}
          </>
        )}
      </VStack>
    </Box>
  );
}; 
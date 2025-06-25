import React, { useState, useEffect } from 'react';
import {
  HStack,
  Select,
  Text,
  useColorMode,
} from '@chakra-ui/react';
import { StorageService } from '../services/storage';
import type { Dimension, Mode } from '@token-model/data-model';

interface DimensionsPickerProps {
  onDimensionModeChange?: (dimensionId: string, modeId: string) => void;
}

export const DimensionsPicker: React.FC<DimensionsPickerProps> = ({ 
  onDimensionModeChange 
}) => {
  const { colorMode } = useColorMode();
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [selectedModes, setSelectedModes] = useState<Record<string, string>>({});

  // Load dimensions from storage on mount and when storage changes
  useEffect(() => {
    const loadDimensions = () => {
      const storedDimensions = StorageService.getDimensions();
      setDimensions(storedDimensions);
      
      // Initialize selected modes with default modes for each dimension
      const initialSelectedModes: Record<string, string> = {};
      storedDimensions.forEach(dimension => {
        initialSelectedModes[dimension.id] = dimension.defaultMode;
      });
      setSelectedModes(initialSelectedModes);
    };

    loadDimensions();

    // Listen for storage changes to update dimensions
    const handleStorageChange = () => {
      loadDimensions();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleModeChange = (dimensionId: string, modeId: string) => {
    setSelectedModes(prev => ({
      ...prev,
      [dimensionId]: modeId
    }));
    
    // Call the callback if provided
    if (onDimensionModeChange) {
      onDimensionModeChange(dimensionId, modeId);
    }
  };

  // Don't render anything if no dimensions
  if (dimensions.length === 0) {
    return null;
  }

  const borderColor = colorMode === 'dark' ? 'gray.600' : 'gray.300';

  return (
    <HStack spacing={3} align="center">
      {dimensions.map((dimension) => (
        <HStack key={dimension.id} spacing={2} align="center">
          <Text fontSize="sm" fontWeight="medium" color="gray.600" whiteSpace="nowrap">
            {dimension.displayName}:
          </Text>
          <Select
            value={selectedModes[dimension.id] || dimension.defaultMode}
            onChange={(e) => handleModeChange(dimension.id, e.target.value)}
            size="sm"
            width="auto"
            minW="120px"
            variant="outline"
            bg={colorMode === 'dark' ? 'gray.700' : 'white'}
            borderColor={borderColor}
            _hover={{ borderColor: colorMode === 'dark' ? 'gray.500' : 'gray.400' }}
          >
            {dimension.modes.map((mode: Mode) => (
              <option key={mode.id} value={mode.id}>
                {mode.name}
              </option>
            ))}
          </Select>
        </HStack>
      ))}
    </HStack>
  );
}; 
import React from 'react';
import {
  VStack,
  HStack,
  Text,
  FormControl,
  FormLabel,
  Input,
  Select,
  Box,
  useColorMode,
} from '@chakra-ui/react';

export interface ValueFormatters {
  color: string;
  dimension: string;
  numberPrecision: number;
}

interface ValueFormattersEditorProps {
  valueFormatters: ValueFormatters;
  onValueFormattersChange: (valueFormatters: ValueFormatters) => void;
  isReadOnly?: boolean;
  title?: string;
}

export const ValueFormattersEditor: React.FC<ValueFormattersEditorProps> = ({
  valueFormatters,
  onValueFormattersChange,
  isReadOnly = false,
  title = 'Value Formatters'
}) => {
  const { colorMode } = useColorMode();

  const handleChange = (field: keyof ValueFormatters, value: string | number) => {
    onValueFormattersChange({
      ...valueFormatters,
      [field]: value
    });
  };

  if (isReadOnly) {
    return (
      <VStack spacing={6} align="stretch">
        <Text fontWeight="bold" fontSize="sm" color="gray.600">
          {title} (Read-only from source file)
        </Text>
        <Box
          p={4}
          borderWidth={1}
          borderRadius="md"
          bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
          borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
        >
          <VStack spacing={4} align="stretch">
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={3} color="gray.500">
                Value Formatting
              </Text>
              <VStack spacing={3} align="stretch">
                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.600">Color Format:</Text>
                  <Text fontSize="sm" fontFamily="mono" color="gray.800" bg="gray.100" px={2} py={1} borderRadius="sm">
                    {valueFormatters?.color || 'hex'}
                  </Text>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.600">Dimension Unit:</Text>
                  <Text fontSize="sm" fontFamily="mono" color="gray.800" bg="gray.100" px={2} py={1} borderRadius="sm">
                    {valueFormatters?.dimension || 'px'}
                  </Text>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.600">Number Precision:</Text>
                  <Text fontSize="sm" fontFamily="mono" color="gray.800" bg="gray.100" px={2} py={1} borderRadius="sm">
                    {valueFormatters?.numberPrecision || 2}
                  </Text>
                </HStack>
              </VStack>
            </Box>
          </VStack>
        </Box>
      </VStack>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      <Text fontWeight="bold" fontSize="sm" color="gray.600">
        {title}
      </Text>
      <HStack spacing={4}>
        <FormControl>
          <FormLabel>Color Format</FormLabel>
          <Select
            value={valueFormatters?.color || 'hex'}
            onChange={(e) => handleChange('color', e.target.value)}
          >
            <option value="hex">Hex</option>
            <option value="rgb">RGB</option>
            <option value="rgba">RGBA</option>
            <option value="hsl">HSL</option>
            <option value="hsla">HSLA</option>
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel>Dimension Unit</FormLabel>
          <Select
            value={valueFormatters?.dimension || 'px'}
            onChange={(e) => handleChange('dimension', e.target.value)}
          >
            <option value="px">px</option>
            <option value="rem">rem</option>
            <option value="em">em</option>
            <option value="pt">pt</option>
            <option value="dp">dp</option>
            <option value="sp">sp</option>
          </Select>
        </FormControl>
      </HStack>
      <FormControl>
        <FormLabel>Number Precision</FormLabel>
        <Input
          type="number"
          min={0}
          max={10}
          value={valueFormatters?.numberPrecision || 2}
          onChange={(e) => handleChange('numberPrecision', parseInt(e.target.value))}
        />
      </FormControl>
    </VStack>
  );
}; 
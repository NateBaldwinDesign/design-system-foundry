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

export interface SyntaxPatterns {
  prefix: string;
  suffix: string;
  delimiter: string;
  capitalization: string;
  formatString: string;
}

interface SyntaxPatternsEditorProps {
  syntaxPatterns: SyntaxPatterns;
  onSyntaxPatternsChange: (syntaxPatterns: SyntaxPatterns) => void;
  preview: string;
  isReadOnly?: boolean;
  title?: string;
}

export const SyntaxPatternsEditor: React.FC<SyntaxPatternsEditorProps> = ({
  syntaxPatterns,
  onSyntaxPatternsChange,
  preview,
  isReadOnly = false,
  title = 'Syntax Patterns'
}) => {
  const { colorMode } = useColorMode();

  const handleChange = (field: keyof SyntaxPatterns, value: string) => {
    onSyntaxPatternsChange({
      ...syntaxPatterns,
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
                Naming Patterns
              </Text>
              <VStack spacing={3} align="stretch">
                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.600">Prefix:</Text>
                  <Text fontSize="sm" fontFamily="mono" color="gray.800" bg="gray.100" px={2} py={1} borderRadius="sm">
                    {syntaxPatterns?.prefix || 'None'}
                  </Text>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.600">Suffix:</Text>
                  <Text fontSize="sm" fontFamily="mono" color="gray.800" bg="gray.100" px={2} py={1} borderRadius="sm">
                    {syntaxPatterns?.suffix || 'None'}
                  </Text>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.600">Delimiter:</Text>
                  <Text fontSize="sm" fontFamily="mono" color="gray.800" bg="gray.100" px={2} py={1} borderRadius="sm">
                    {syntaxPatterns?.delimiter || 'None'}
                  </Text>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.600">Capitalization:</Text>
                  <Text fontSize="sm" fontFamily="mono" color="gray.800" bg="gray.100" px={2} py={1} borderRadius="sm">
                    {syntaxPatterns?.capitalization || 'None'}
                  </Text>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.600">Format String:</Text>
                  <Text fontSize="sm" fontFamily="mono" color="gray.800" bg="gray.100" px={2} py={1} borderRadius="sm">
                    {syntaxPatterns?.formatString || 'None'}
                  </Text>
                </HStack>
              </VStack>
            </Box>
            
            {/* Preview */}
            <Box mt={2} p={3} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.700' : 'gray.100'}>
              <Text fontSize="sm" color="gray.500" mb={1} fontWeight="bold">Token name formatting preview</Text>
              <Text fontFamily="mono" fontSize="md" wordBreak="break-all">{preview}</Text>
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
              value={syntaxPatterns?.prefix || ''}
              onChange={(e) => handleChange('prefix', e.target.value)}
              placeholder="e.g., TKN_"
            />
          </FormControl>
          <FormControl>
            <FormLabel>Suffix</FormLabel>
            <Input
              value={syntaxPatterns?.suffix || ''}
              onChange={(e) => handleChange('suffix', e.target.value)}
              placeholder="e.g., _SUF"
            />
          </FormControl>
          <FormControl>
            <FormLabel>Delimiter</FormLabel>
            <Select
              value={syntaxPatterns?.delimiter || '_'}
              onChange={(e) => handleChange('delimiter', e.target.value)}
            >
              <option value="">None</option>
              <option value="_">Underscore (_)</option>
              <option value="-">Hyphen (-)</option>
              <option value=".">Dot (.)</option>
              <option value="/">Slash (/)</option>
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Capitalization</FormLabel>
            <Select
              value={syntaxPatterns?.capitalization || 'none'}
              onChange={(e) => handleChange('capitalization', e.target.value)}
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
              value={syntaxPatterns?.formatString || ''}
              onChange={(e) => handleChange('formatString', e.target.value)}
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
  );
}; 
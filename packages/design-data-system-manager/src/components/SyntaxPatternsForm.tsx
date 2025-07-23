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
  useColorMode
} from '@chakra-ui/react';

// Shared interfaces
export interface SyntaxPatterns {
  prefix?: string;
  suffix?: string;
  delimiter?: '' | '_' | '-' | '.' | '/' | undefined;
  capitalization?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  formatString?: string;
}

interface SyntaxPatternsFormProps {
  syntaxPatterns: SyntaxPatterns;
  onSyntaxPatternChange: (field: keyof SyntaxPatterns, value: string | number | undefined) => void;
  preview?: string;
  title?: string;
  showTitle?: boolean;
}

export const SyntaxPatternsForm: React.FC<SyntaxPatternsFormProps> = ({
  syntaxPatterns,
  onSyntaxPatternChange,
  preview,
  title = "Syntax Patterns",
  showTitle = true
}) => {
  const { colorMode } = useColorMode();

  // Generate preview if not provided
  const generatedPreview = preview || (() => {
    const { prefix = '', suffix = '', delimiter = '_', capitalization = 'none' } = syntaxPatterns;
    let tokenName = 'color-primary-500';
    
    // Apply capitalization
    switch (capitalization) {
      case 'uppercase':
        tokenName = tokenName.toUpperCase();
        break;
      case 'lowercase':
        tokenName = tokenName.toLowerCase();
        break;
      case 'capitalize':
        tokenName = tokenName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('-');
        break;
    }
    
    // Apply delimiter
    if (delimiter) {
      tokenName = tokenName.replace(/-/g, delimiter);
    }
    
    return `${prefix}${tokenName}${suffix}`;
  })();

  return (
    <VStack spacing={4} align="stretch">
      {showTitle && (
        <Text fontWeight="bold" fontSize="sm" color="gray.600">
          {title}
        </Text>
      )}
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
              value={syntaxPatterns.prefix || ''}
              onChange={(e) => onSyntaxPatternChange('prefix', e.target.value)}
              placeholder="e.g., TKN_"
            />
          </FormControl>
          <FormControl>
            <FormLabel>Suffix</FormLabel>
            <Input
              value={syntaxPatterns.suffix || ''}
              onChange={(e) => onSyntaxPatternChange('suffix', e.target.value)}
              placeholder="e.g., _SUF"
            />
          </FormControl>
          <FormControl>
            <FormLabel>Delimiter</FormLabel>
            <Select
              value={syntaxPatterns.delimiter || ''}
              onChange={(e) => onSyntaxPatternChange('delimiter', e.target.value)}
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
              value={syntaxPatterns.capitalization || 'none'}
              onChange={(e) => onSyntaxPatternChange('capitalization', e.target.value)}
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
              value={syntaxPatterns.formatString || ''}
              onChange={(e) => onSyntaxPatternChange('formatString', e.target.value)}
              placeholder="e.g., {prefix}{name}{suffix}"
              width="100%"
            />
          </FormControl>
          <Box mt={2} p={3} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.700' : 'gray.100'}>
            <Text fontSize="sm" color="gray.500" mb={1} fontWeight="bold">Preview</Text>
            <Text fontFamily="mono" fontSize="md" wordBreak="break-all">{generatedPreview}</Text>
          </Box>
        </VStack>
      </Box>
    </VStack>
  );
}; 
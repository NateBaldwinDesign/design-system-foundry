/**
 * Suggestion Buttons Component
 * Displays clickable suggestion buttons for common questions
 */

import React from 'react';
import {
  Box,
  Button,
  Wrap,
  WrapItem,
  useColorMode
} from '@chakra-ui/react';

interface SuggestionButtonsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  disabled?: boolean;
}

export const SuggestionButtons: React.FC<SuggestionButtonsProps> = ({
  suggestions,
  onSelect,
  disabled = false
}) => {
  const { colorMode } = useColorMode();

  return (
    <Wrap spacing={2}>
      {suggestions.map((suggestion, index) => (
        <WrapItem key={index}>
          <Button
            size="sm"
            variant="outline"
            colorScheme="blue"
            onClick={() => onSelect(suggestion)}
            disabled={disabled}
            maxWidth="300px"
            textAlign="left"
            whiteSpace="normal"
            height="auto"
            py={2}
            px={3}
            fontSize="sm"
            bg={colorMode === 'dark' ? 'gray.700' : 'white'}
            borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
            _hover={{
              bg: colorMode === 'dark' ? 'gray.600' : 'gray.50'
            }}
          >
            {suggestion}
          </Button>
        </WrapItem>
      ))}
    </Wrap>
  );
};

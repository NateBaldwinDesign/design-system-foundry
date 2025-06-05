import React, { useState } from 'react';
import {
  Box,
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  HStack,
  Text,
  VStack,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverArrow,
  PopoverCloseButton,
  Button,
  useDisclosure,
  IconButton,
  List,
  ListItem
} from '@chakra-ui/react';
import { Search } from 'lucide-react';
import type { Token, TokenValue, ResolvedValueType } from '@token-model/data-model';
import TokenTag from './TokenTag';

type TokenValueChange = 
  | { value: string }
  | { value: number }
  | { tokenId: string };

interface TokenValuePickerProps {
  value: TokenValue;
  tokens: Token[];
  excludeTokenId?: string;
  modes: string[];
  resolvedValueTypeId: string;
  resolvedValueTypes: ResolvedValueType[];
  onChange: (value: TokenValueChange) => void;
}

// Helper to get a display value for a token
function getTokenDisplayValue(token: Token): string {
  // Try to get the first value in valuesByMode
  const vbm = token.valuesByMode?.[0];
  if (!vbm) return '';
  if ('value' in vbm.value) return String(vbm.value.value);
  if ('tokenId' in vbm.value) return `→ ${vbm.value.tokenId}`;
  return '';
}

export function TokenValuePicker({
  value,
  tokens,
  excludeTokenId,
  resolvedValueTypeId,
  resolvedValueTypes,
  onChange
}: TokenValuePickerProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [searchTerm, setSearchTerm] = useState('');

  // Get the value type from schema
  const valueType = resolvedValueTypes.find(vt => vt.id === resolvedValueTypeId);
  if (!valueType) {
    throw new Error(`Unknown value type: ${resolvedValueTypeId}`);
  }

  // Filter tokens based on search term and value type
  const filteredTokens = tokens.filter(token => {
    if (token.id === excludeTokenId) return false;
    if (token.resolvedValueTypeId !== resolvedValueTypeId) return false;
    if (!token.displayName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Handle token selection (alias)
  const handleTokenSelect = (token: Token) => {
    onChange({ tokenId: token.id } as TokenValueChange);
    onClose();
  };

  // Handle direct value input
  const handleValueChange = (newValue: string | number) => {
    // Use the value type to coerce the value
    if (valueType.type) {
      switch (valueType.type) {
        case 'COLOR':
        case 'FONT_FAMILY':
        case 'CUBIC_BEZIER':
          onChange({ value: String(newValue) } as TokenValueChange);
          break;
        case 'DIMENSION':
        case 'SPACING':
        case 'FONT_WEIGHT':
        case 'FONT_SIZE':
        case 'LINE_HEIGHT':
        case 'LETTER_SPACING':
        case 'DURATION':
        case 'BLUR':
        case 'SPREAD':
        case 'RADIUS':
          onChange({ value: Number(newValue) } as TokenValueChange);
          break;
        default:
          onChange({ value: String(newValue) } as TokenValueChange);
      }
    } else {
      onChange({ value: String(newValue) } as TokenValueChange);
    }
  };

  // Get the appropriate input component based on value type
  const getValueInput = () => {
    if ('tokenId' in value) {
      const referencedToken = tokens.find(t => t.id === value.tokenId);
      if (!referencedToken) return null;

      return (
        <Popover isOpen={isOpen} onClose={onClose} placement="bottom-end">
          <PopoverTrigger>
            <Box width="100%">
              <TokenTag
                displayName={referencedToken.displayName}
                resolvedValueTypeId={referencedToken.resolvedValueTypeId}
                resolvedValueTypes={resolvedValueTypes}
                value={getTokenDisplayValue(referencedToken)}
                onClick={onOpen}
              />
            </Box>
          </PopoverTrigger>
          <PopoverContent width="300px">
            <PopoverArrow />
            <PopoverCloseButton />
            <PopoverBody>
              <VStack spacing={2} align="stretch">
                <Input
                  placeholder="Search tokens..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size="md"
                  variant="outline"
                />
                <List spacing={0} pb={2}>
                  {filteredTokens.map((token) => {
                    const displayValue = getTokenDisplayValue(token);
                    return (
                      <ListItem key={token.id}>
                        <Button
                          size="md"
                          variant="ghost"
                          width="100%"
                          height="auto"
                          justifyContent="flex-start"
                          onClick={() => handleTokenSelect(token)}
                        >
                          <HStack width="100%" p={2} gap={3} align="flex-start">
                            {valueType.type === 'COLOR' && (
                              <div style={{ display: 'flex', flexGrow: 0, flexShrink: 0, width: '24px', height: '24px', borderRadius: '4px', backgroundColor: displayValue }}></div>
                            )}
                            <VStack spacing={1} align="flex-start" width="100%">
                              <HStack justifyContent="space-between" width="100%">
                                <Text>{token.displayName}</Text>
                                <Text fontSize="xs" color="gray.500">
                                  {displayValue}
                                </Text>
                              </HStack>
                              {token.description && (
                                <Text fontSize="xs" color="gray.500">
                                  ({token.description})
                                </Text>
                              )}
                            </VStack>
                          </HStack>
                        </Button>
                      </ListItem>
                    );
                  })}
                </List>
              </VStack>
            </PopoverBody>
          </PopoverContent>
        </Popover>
      );
    }

    const currentValue = value.value;
    switch (valueType.type) {
      case 'COLOR':
        return (
          <Input
            type="color"
            value={typeof currentValue === 'string' ? currentValue : '#000000'}
            onChange={(e) => handleValueChange(e.target.value)}
            width="100%"
            size="md"
            variant="outline"
          />
        );
      case 'DIMENSION':
      case 'SPACING':
      case 'FONT_WEIGHT':
      case 'FONT_SIZE':
      case 'LINE_HEIGHT':
      case 'LETTER_SPACING':
      case 'DURATION':
      case 'BLUR':
      case 'SPREAD':
      case 'RADIUS':
        return (
          <NumberInput
            value={typeof currentValue === 'number' ? currentValue : 0}
            onChange={(_, val) => handleValueChange(val)}
            width="100%"
            size="md"
            variant="outline"
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        );
      case 'FONT_FAMILY':
        return (
          <Input
            value={typeof currentValue === 'string' ? currentValue : ''}
            onChange={(e) => handleValueChange(e.target.value)}
            width="100%"
            size="md"
            variant="outline"
          />
        );
      case 'CUBIC_BEZIER':
        return (
          <Input
            value={typeof currentValue === 'string' ? currentValue : '0, 0, 1, 1'}
            onChange={(e) => handleValueChange(e.target.value)}
            width="100%"
            size="md"
            variant="outline"
            placeholder="0, 0, 1, 1"
          />
        );
      default:
        return (
          <Input
            value={typeof currentValue === 'string' ? currentValue : ''}
            onChange={(e) => handleValueChange(e.target.value)}
            width="100%"
            size="md"
            variant="outline"
          />
        );
    }
  };

  return (
    <VStack spacing={2} align="stretch" width="100%">
      <HStack spacing={2}>
        <Box flex={1}>
          {getValueInput()}
        </Box>
        {!('tokenId' in value) && (
          <Popover isOpen={isOpen} onClose={onClose} placement="bottom-end">
            <PopoverTrigger>
              <IconButton
                aria-label="Search tokens"
                icon={<Search size={16} />}
                size="md"
                variant="outline"
                onClick={onOpen}
              />
            </PopoverTrigger>
            <PopoverContent width="300px">
              <PopoverArrow />
              <PopoverCloseButton />
              <PopoverBody>
                <VStack spacing={2} align="stretch">
                  <Input
                    placeholder="Search tokens..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    size="md"
                    variant="outline"
                  />
                  <List spacing={0} pb={2}>
                    {filteredTokens.map((token) => {
                      const displayValue = getTokenDisplayValue(token);
                      return (
                        <ListItem key={token.id}>
                          <Button
                            size="md"
                            variant="ghost"
                            width="100%"
                            height="auto"
                            justifyContent="flex-start"
                            onClick={() => handleTokenSelect(token)}
                          >
                            <HStack width="100%" p={2} gap={3} align="flex-start">
                              {valueType.type === 'COLOR' && (
                                <div style={{ display: 'flex', flexGrow: 0, flexShrink: 0, width: '24px', height: '24px', borderRadius: '4px', backgroundColor: displayValue }}></div>
                              )}
                              <VStack spacing={1} align="flex-start" width="100%">
                                <HStack justifyContent="space-between" width="100%">
                                  <Text>{token.displayName}</Text>
                                  <Text fontSize="xs" color="gray.500">
                                    {displayValue}
                                  </Text>
                                </HStack>
                                {token.description && (
                                  <Text fontSize="xs" color="gray.500">
                                    ({token.description})
                                  </Text>
                                )}
                              </VStack>
                            </HStack>
                          </Button>
                        </ListItem>
                      );
                    })}
                  </List>
                </VStack>
              </PopoverBody>
            </PopoverContent>
          </Popover>
        )}
      </HStack>
    </VStack>
  );
} 
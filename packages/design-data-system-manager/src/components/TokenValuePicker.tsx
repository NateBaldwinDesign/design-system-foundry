import React, { useState } from 'react';
import {
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  HStack,
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

type TokenValueChange = TokenValue;

interface TokenValuePickerProps {
  value: TokenValue;
  tokens: Token[];
  excludeTokenId?: string;
  modes?: string[];
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

  // Handle direct value input
  const handleValueChange = (newValue: string | number) => {
    // Format the value according to the schema requirements
    if (valueType.type) {
      switch (valueType.type) {
        case 'COLOR':
        case 'FONT_FAMILY':
        case 'CUBIC_BEZIER':
          // String values
          onChange({ value: String(newValue) });
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
          // Numeric values
          onChange({ value: Number(newValue) });
          break;
        default:
          // For custom types, use string
          onChange({ value: String(newValue) });
      }
    } else {
      // For custom types without a standard type, use string
      onChange({ value: String(newValue) });
    }
  };

  // Handle token selection (alias)
  const handleTokenSelect = (token: Token) => {
    onChange({ tokenId: token.id });
    onClose();
  };

  // Render the appropriate input based on value type
  const renderInput = () => {
    if (valueType.type) {
      switch (valueType.type) {
        case 'COLOR':
          return (
            <Input
              value={typeof value === 'object' && 'value' in value ? String(value.value) : ''}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder="Enter color (hex)"
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
              value={typeof value === 'object' && 'value' in value ? Number(value.value) : 0}
              onChange={(_, val) => handleValueChange(val)}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          );
        case 'FONT_FAMILY':
        case 'CUBIC_BEZIER':
          return (
            <Input
              value={typeof value === 'object' && 'value' in value ? String(value.value) : ''}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder={`Enter ${valueType.type.toLowerCase()}`}
            />
          );
        default:
          return (
            <Input
              value={typeof value === 'object' && 'value' in value ? String(value.value) : ''}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder="Enter value"
            />
          );
      }
    }
    return (
      <Input
        value={typeof value === 'object' && 'value' in value ? String(value.value) : ''}
        onChange={(e) => handleValueChange(e.target.value)}
        placeholder="Enter value"
      />
    );
  };

  return (
    <VStack spacing={2} align="stretch">
      <HStack>
        {renderInput()}
        <Popover isOpen={isOpen} onClose={onClose} placement="bottom-start">
          <PopoverTrigger>
            <IconButton
              aria-label="Search tokens"
              icon={<Search />}
              onClick={onOpen}
            />
          </PopoverTrigger>
          <PopoverContent>
            <PopoverArrow />
            <PopoverCloseButton />
            <PopoverBody>
              <VStack spacing={2} align="stretch">
                <Input
                  placeholder="Search tokens..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <List spacing={2}>
                  {filteredTokens.map((token) => (
                    <ListItem key={token.id}>
                      <Button
                        variant="ghost"
                        width="100%"
                        justifyContent="flex-start"
                        onClick={() => handleTokenSelect(token)}
                      >
                        <TokenTag
                          displayName={token.displayName}
                          resolvedValueTypeId={token.resolvedValueTypeId}
                          resolvedValueTypes={resolvedValueTypes}
                          value={getTokenDisplayValue(token)}
                        />
                      </Button>
                    </ListItem>
                  ))}
                </List>
              </VStack>
            </PopoverBody>
          </PopoverContent>
        </Popover>
      </HStack>
    </VStack>
  );
} 
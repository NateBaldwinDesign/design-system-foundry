import React, { useState } from 'react';
import {
  Input,
  InputGroup,
  InputLeftElement,
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
  ListItem,
  Box
} from '@chakra-ui/react';
import { Search, Unlink } from 'lucide-react';
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
  isDisabled?: boolean;
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
  modes,
  resolvedValueTypeId,
  resolvedValueTypes,
  onChange,
  isDisabled
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
            <InputGroup size="sm" width="200px">
              <InputLeftElement>
                <Box
                  width="14px"
                  height="14px"
                  borderRadius="2px"
                  backgroundColor={typeof value === 'object' && 'value' in value ? String(value.value) : '#000000'}
                  border="1px solid"
                  borderColor="rgba(0, 0, 0, 0.1)"
                />
              </InputLeftElement>
              <Input
                value={typeof value === 'object' && 'value' in value ? String(value.value) : ''}
                onChange={(e) => handleValueChange(e.target.value)}
                placeholder="Enter color (hex)"
                isDisabled={isDisabled}
              />
            </InputGroup>
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
              size="sm"
              width="200px"
              value={typeof value === 'object' && 'value' in value ? Number(value.value) : 0}
              onChange={(_, val) => handleValueChange(val)}
              isDisabled={isDisabled}
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
              size="sm"
              width="200px"
              value={typeof value === 'object' && 'value' in value ? String(value.value) : ''}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder={`Enter ${valueType.type.toLowerCase()}`}
              isDisabled={isDisabled}
            />
          );
        default:
          return (
            <Input
              size="sm"
              width="200px"
              value={typeof value === 'object' && 'value' in value ? String(value.value) : ''}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder="Enter value"
              isDisabled={isDisabled}
            />
          );
      }
    }
    return (
      <Input
        size="sm"
        width="200px"
        value={typeof value === 'object' && 'value' in value ? String(value.value) : ''}
        onChange={(e) => handleValueChange(e.target.value)}
        placeholder="Enter value"
        isDisabled={isDisabled}
      />
    );
  };

  // Find the referenced token if value is an alias
  const referencedToken = (typeof value === 'object' && 'tokenId' in value)
    ? tokens.find(t => t.id === value.tokenId)
    : undefined;

  // Helper to resolve the value of a token (using modes or default)
  function resolveTokenValue(token: Token): TokenValue | undefined {
    // Try to find a value for the current modes (if provided)
    if (Array.isArray(token.valuesByMode)) {
      // If modes are provided, try to find a matching entry
      if (Array.isArray(modes) && modes.length > 0) {
        const match = token.valuesByMode.find(vbm =>
          Array.isArray(vbm.modeIds) &&
          vbm.modeIds.length === modes.length &&
          vbm.modeIds.every((id, idx) => id === modes[idx])
        );
        if (match) return match.value;
      }
      // Otherwise, try to find a global/default value (modeIds: [])
      const global = token.valuesByMode.find(vbm => Array.isArray(vbm.modeIds) && vbm.modeIds.length === 0);
      if (global) return global.value;
      // Fallback: just use the first value
      if (token.valuesByMode.length > 0) return token.valuesByMode[0].value;
    }
    return undefined;
  }

  // Handler for unlinking the alias
  const handleUnlink = () => {
    if (referencedToken) {
      const resolved = resolveTokenValue(referencedToken);
      if (resolved && 'value' in resolved) {
        onChange({ value: resolved.value });
      }
    }
  };

  const popoverContent = (
    <PopoverContent>
      <PopoverArrow />
      <PopoverCloseButton />
      <PopoverBody>
        <VStack spacing={2} align="stretch">
          <Input
            placeholder="Search tokens..."
            value={searchTerm}
            size="sm"
            width="calc(100% - 40px)"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <List spacing={0}>
            {filteredTokens.map((token) => (
              <ListItem key={token.id}>
                <Button
                  variant="ghost"
                  width="100%"
                  justifyContent="flex-start"
                  size="sm"
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
  );

  return (
    <VStack spacing={2} align="stretch">
      <HStack>
        {/* If value is an alias (tokenId), show TokenTag as PopoverTrigger, else show input and IconButton as before */}
        {typeof value === 'object' && 'tokenId' in value && referencedToken ? (
          <>
          <Popover isOpen={isOpen} onClose={onClose} placement="bottom-start">
            <PopoverTrigger>
              <Box 
                width="100%" 
                cursor="pointer"
                tabIndex={isDisabled ? -1 : 0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (!isDisabled) onOpen();
                  }
                }}
                minWidth="200px"
                borderRadius="var(--chakra-radii-md)"
                _hover={{ bg: 'gray.100' }}
                _dark={{ _hover: { bg: 'gray.700' } }}
              >
                <TokenTag
                  displayName={referencedToken.displayName}
                  resolvedValueTypeId={referencedToken.resolvedValueTypeId}
                  resolvedValueTypes={resolvedValueTypes}
                  value={getTokenDisplayValue(referencedToken)}
                  onClick={isDisabled ? undefined : onOpen}
                />
              </Box>
            </PopoverTrigger>
            {popoverContent}
          </Popover>
            <IconButton
              size="sm"
              aria-label="Unlink token alias"
              icon={<Unlink size={16} />}
              onClick={handleUnlink}
              isDisabled={isDisabled}
          />
          </>
        ) : (
          <>
            {renderInput()}
            <Popover isOpen={isOpen} onClose={onClose} placement="bottom-start">
              <PopoverTrigger>
                <IconButton
                  size="sm"
                  aria-label="Search tokens"
                  icon={<Search size={16} />}
                  onClick={onOpen}
                  isDisabled={isDisabled}
                />
              </PopoverTrigger>
              {popoverContent}
            </Popover>
          </>
        )}
      </HStack>
    </VStack>
  );
} 
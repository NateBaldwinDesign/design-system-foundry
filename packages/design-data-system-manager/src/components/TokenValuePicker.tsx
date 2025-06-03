import React, { useState } from 'react';
import {
  Box,
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverArrow,
  PopoverCloseButton,
  Input,
  List,
  ListItem,
  Text,
  VStack,
  useDisclosure,
  HStack,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Select,
  ButtonGroup
} from '@chakra-ui/react';
import type { Token, TokenValue } from '@token-model/data-model';

interface TokenValuePickerProps {
  value: TokenValue | string;
  tokens: Token[];
  constraints?: Constraint[];
  onChange: (newValue: TokenValue) => void;
  excludeTokenId?: string;
}

interface Constraint {
  type: 'contrast';
  rule: {
    minimum: number;
    comparator: {
      resolvedValueTypeId: string;
      value: string;
      method: 'WCAG21' | 'APCA' | 'Lstar';
    };
  };
}

export const TokenValuePicker: React.FC<TokenValuePickerProps> = ({
  value,
  tokens,
  onChange,
  excludeTokenId
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [tabIndex, setTabIndex] = useState(0);

  // Filter tokens for the "token" tab
  const filteredTokens = Array.isArray(tokens)
    ? tokens.filter(
        t => typeof value === 'object' && value !== null && 'type' in value && 'type' in t && t.type === value.type && t.id !== excludeTokenId
      )
    : [];

  // Render the value for the button
  let buttonLabel = '';
  let aliasToken: Token | undefined;

  if (typeof value === 'string') {
    buttonLabel = value;
  } else if (value.type === 'ALIAS') {
    aliasToken = tokens.find(t => t.id === value.tokenId);
    buttonLabel = aliasToken ? `Alias: ${aliasToken.displayName}` : `Alias: ${value.tokenId}`;
  } else {
    const typedValue = value as Exclude<TokenValue, { type: 'ALIAS' }>;
    switch (typedValue.type) {
      case 'COLOR':
      case 'FONT_FAMILY':
      case 'CUBIC_BEZIER':
        buttonLabel = typedValue.value;
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
        buttonLabel = String(typedValue.value);
        break;
      default:
        buttonLabel = JSON.stringify(typedValue);
    }
  }

  const renderCustomInput = () => {
    if (typeof value !== 'object' || value === null || !('type' in value)) {
      return null;
    }

    let colorValue: string;
    let fontValue: string;
    let fontWeightValue: number;
    let bezierValue: string;
    let x1: number, y1: number, x2: number, y2: number;
    let durationValue: number;
    let numericValue: number;
    let step: number;
    let unit: string;

    switch (value.type) {
      case 'COLOR':
        colorValue = typeof value === 'object' && value.type === 'COLOR' ? value.value : '#000000';
        return (
          <VStack>
            <Input
              type="color"
              w="40px"
              p={0}
              value={colorValue}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ type: 'COLOR', value: e.target.value })}
            />
            <Input
              size="sm"
              value={colorValue}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ type: 'COLOR', value: e.target.value })}
            />
          </VStack>
        );

      case 'FONT_FAMILY':
        fontValue = typeof value === 'object' && value.type === 'FONT_FAMILY' ? value.value : '';
        return (
          <Input
            size="sm"
            value={fontValue}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ type: 'FONT_FAMILY', value: e.target.value })}
          />
        );

      case 'FONT_WEIGHT':
        fontWeightValue = typeof value === 'object' && value.type === 'FONT_WEIGHT' ? value.value : 400;
        return (
          <Select
            size="sm"
            value={fontWeightValue}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange({ type: 'FONT_WEIGHT', value: Number(e.target.value) })}
          >
            <option value="100">Thin (100)</option>
            <option value="200">Extra Light (200)</option>
            <option value="300">Light (300)</option>
            <option value="400">Regular (400)</option>
            <option value="500">Medium (500)</option>
            <option value="600">Semi Bold (600)</option>
            <option value="700">Bold (700)</option>
            <option value="800">Extra Bold (800)</option>
            <option value="900">Black (900)</option>
          </Select>
        );

      case 'CUBIC_BEZIER':
        bezierValue = typeof value === 'object' && value.type === 'CUBIC_BEZIER' ? value.value : '0, 0, 1, 1';
        [x1, y1, x2, y2] = bezierValue.split(',').map(Number);
        return (
          <VStack>
            <HStack>
              <NumberInput
                size="sm"
                value={x1}
                min={0}
                max={1}
                step={0.1}
                onChange={(_, newVal) => {
                  onChange({ type: 'CUBIC_BEZIER', value: `${newVal}, ${y1}, ${x2}, ${y2}` });
                }}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              <NumberInput
                size="sm"
                value={y1}
                step={0.1}
                onChange={(_, newVal) => {
                  onChange({ type: 'CUBIC_BEZIER', value: `${x1}, ${newVal}, ${x2}, ${y2}` });
                }}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              <NumberInput
                size="sm"
                value={x2}
                min={0}
                max={1}
                step={0.1}
                onChange={(_, newVal) => {
                  onChange({ type: 'CUBIC_BEZIER', value: `${x1}, ${y1}, ${newVal}, ${y2}` });
                }}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              <NumberInput
                size="sm"
                value={y2}
                step={0.1}
                onChange={(_, newVal) => {
                  onChange({ type: 'CUBIC_BEZIER', value: `${x1}, ${y1}, ${x2}, ${newVal}` });
                }}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </HStack>
          </VStack>
        );

      case 'DURATION':
        durationValue = typeof value === 'object' && value.type === 'DURATION' ? value.value : 0;
        return (
          <HStack>
            <NumberInput
              size="sm"
              value={durationValue}
              min={0}
              step={50}
              onChange={(_, newVal) => {
                onChange({ type: 'DURATION', value: newVal });
              }}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
            <Text fontSize="sm">ms</Text>
          </HStack>
        );

      default:
        if (['DIMENSION', 'SPACING', 'FONT_SIZE', 'LINE_HEIGHT', 'LETTER_SPACING', 'BLUR', 'SPREAD', 'RADIUS'].includes(value.type)) {
          const type = value.type as Exclude<TokenValue['type'], 'ALIAS' | 'COLOR' | 'FONT_FAMILY' | 'FONT_WEIGHT' | 'CUBIC_BEZIER' | 'DURATION'>;
          numericValue = typeof value === 'object' && value.type === type ? (value as { type: typeof type; value: number }).value : 0;
          
          // Determine step and unit based on type
          step = 1;
          unit = '';
          
          switch (type) {
            case 'DIMENSION':
            case 'SPACING':
            case 'BLUR':
            case 'SPREAD':
            case 'RADIUS':
              unit = 'px';
              break;
            case 'FONT_SIZE':
              unit = 'px';
              step = 0.5;
              break;
            case 'LINE_HEIGHT':
              step = 0.1;
              break;
            case 'LETTER_SPACING':
              unit = 'px';
              step = 0.5;
              break;
          }

          return (
            <HStack>
              <NumberInput
                size="sm"
                value={numericValue}
                min={0}
                step={step}
                onChange={(_, newVal) => {
                  onChange({ type, value: newVal });
                }}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              {unit && <Text fontSize="sm">{unit}</Text>}
            </HStack>
          );
        }
        return null;
    }
  };

  return (
    <Popover isOpen={isOpen} onClose={onClose} placement="bottom-start">
      <PopoverTrigger>
        <Button variant="outline" minW={32} onClick={onOpen}>
          {buttonLabel || 'Set value'}
        </Button>
      </PopoverTrigger>
      <PopoverContent w="320px">
        <PopoverArrow />
        <PopoverBody>
          <VStack spacing={3}>
            <ButtonGroup
              size="sm"
              isAttached
              variant="outline"
              w="full"
              bg="gray.200"
              p={1}
              borderRadius="md"
            >
              <Button
                flex={1}
                size="xs"
                variant="unstyled"
                onClick={() => setTabIndex(0)}
                bg={tabIndex === 0 ? 'white' : 'transparent'}
                color={tabIndex === 0 ? 'gray.800' : 'gray.600'}
                _hover={{
                  bg: tabIndex === 0 ? 'white' : 'gray.200',
                  color: 'gray.800'
                }}
                transition="all 0.2s"
                boxShadow={tabIndex === 0 ? 'sm' : 'none'}
                borderRadius="md"
                fontWeight="medium"
              >
                Custom
              </Button>
              <Button
                flex={1}
                size='xs'
                variant="unstyled"
                onClick={() => setTabIndex(1)}
                bg={tabIndex === 1 ? 'white' : 'transparent'}
                color={tabIndex === 1 ? 'gray.800' : 'gray.600'}
                _hover={{
                  bg: tabIndex === 1 ? 'white' : 'gray.200',
                  color: 'gray.800'
                }}
                transition="all 0.2s"
                boxShadow={tabIndex === 1 ? 'sm' : 'none'}
                borderRadius="md"
                fontWeight="medium"
              >
                Token
              </Button>
            </ButtonGroup>

            <Box w="full">
              {tabIndex === 0 ? (
                <VStack align="stretch" spacing={3}>
                  {renderCustomInput()}
                </VStack>
              ) : (
                <Box>
                  {filteredTokens.length === 0 ? (
                    <Text color="gray.500">No matching tokens available.</Text>
                  ) : (
                    <List spacing={1}>
                      {filteredTokens.map((token, idx) => (
                        <ListItem
                          key={`${token.id}-${idx}`}
                          cursor="pointer"
                          _hover={{ bg: 'gray.100' }}
                          borderRadius="md"
                          px={2}
                          py={1}
                          onClick={() => {
                            onChange({ type: 'ALIAS', tokenId: token.id });
                            onClose();
                          }}
                        >
                          <Text fontWeight="medium">{token.displayName}</Text>
                          <Text fontSize="sm" color="gray.500">{token.description}</Text>
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>
              )}
            </Box>
          </VStack>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}; 
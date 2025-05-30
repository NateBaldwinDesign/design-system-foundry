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
  Tabs,
  TabList,
  TabPanels,
  TabPanel,
  Tab,
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
  NumberDecrementStepper
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

    let bezierValue: string;
    let x1: number, y1: number, x2: number, y2: number;
    let colorValue: string;
    let fontValue: string;

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
      case 'CUBIC_BEZIER':
        bezierValue = typeof value === 'object' && value.type === 'CUBIC_BEZIER' ? value.value : '0, 0, 1, 1';
        [x1, y1, x2, y2] = bezierValue.split(',').map(Number);
        return (
          <VStack>
            <HStack>
              <NumberInput
                size="sm"
                value={x1}
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
      default:
        if (['DIMENSION', 'SPACING', 'FONT_WEIGHT', 'FONT_SIZE', 'LINE_HEIGHT', 'LETTER_SPACING', 'DURATION', 'BLUR', 'SPREAD', 'RADIUS'].includes(value.type)) {
          const type = value.type as Exclude<TokenValue['type'], 'ALIAS' | 'COLOR' | 'FONT_FAMILY' | 'CUBIC_BEZIER'>;
          const numericValue = typeof value === 'object' && value.type === type ? (value as { type: typeof type; value: number }).value : 0;
          return (
            <NumberInput
              size="sm"
              value={numericValue}
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
        <PopoverCloseButton />
        <PopoverBody>
          <Tabs index={tabIndex} onChange={setTabIndex}>
            <TabList>
              <Tab>Custom</Tab>
              <Tab>Token</Tab>
            </TabList>
            <TabPanels>
              <TabPanel px={0}>
                <VStack align="stretch" spacing={3} mt={2}>
                  {renderCustomInput()}
                </VStack>
              </TabPanel>
              <TabPanel px={0}>
                <Box mt={2}>
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
              </TabPanel>
            </TabPanels>
          </Tabs>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}; 
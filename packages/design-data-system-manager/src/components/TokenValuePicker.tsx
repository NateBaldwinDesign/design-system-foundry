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
import type { Token } from '@token-model/data-model';
import Color from 'colorjs.io';

type TokenValue =
  | { resolvedValueTypeId: 'color'; value: string }
  | { resolvedValueTypeId: 'dimension'; value: number }
  | { resolvedValueTypeId: 'spacing'; value: number }
  | { resolvedValueTypeId: 'font-family'; value: string }
  | { resolvedValueTypeId: 'font-weight'; value: number }
  | { resolvedValueTypeId: 'font-size'; value: number }
  | { resolvedValueTypeId: 'line-height'; value: number }
  | { resolvedValueTypeId: 'letter-spacing'; value: number }
  | { resolvedValueTypeId: 'duration'; value: number }
  | { resolvedValueTypeId: 'cubic-bezier'; value: string }
  | { resolvedValueTypeId: 'blur'; value: number }
  | { resolvedValueTypeId: 'spread'; value: number }
  | { resolvedValueTypeId: 'radius'; value: number }
  | { resolvedValueTypeId: 'alias'; tokenId: string };

interface Constraint {
  resolvedValueTypeId: string;
  rule: {
    comparator: { resolvedValueTypeId: string; value: string; method?: string };
    minimum: number;
  };
}

interface TokenWithCompat extends Token {
  resolvedValueTypeId?: string;
}

interface TokenValuePickerProps {
  resolvedValueTypeId: string;
  value: TokenValue | string;
  tokens: Token[];
  constraints?: Constraint[];
  onChange: (newValue: TokenValue) => void;
  excludeTokenId?: string;
}

function satisfiesConstraints(token: Token, constraints?: Constraint[]): boolean {
  if (!constraints || constraints.length === 0) return true;
  for (const constraint of constraints) {
    if (constraint.resolvedValueTypeId === 'contrast') {
      // Find the color value for this token (global or first mode)
      let color: string | undefined;
      if (token.valuesByMode && token.valuesByMode.length > 0) {
        const vbm = token.valuesByMode[0];
        if (vbm.value && typeof vbm.value === 'object' && vbm.value.type === 'COLOR') {
          color = vbm.value.value;
        }
      }
      if (!color) return false;
      const comparator = constraint.rule.comparator.value;
      const min = constraint.rule.minimum;
      const method = constraint.rule.comparator.method || 'WCAG21';
      let colorjsMethod: string;
      if (method === 'WCAG21') colorjsMethod = 'WCAG21';
      else if (method === 'APCA') colorjsMethod = 'APCA';
      else if (method === 'Lstar') colorjsMethod = 'Lstar';
      else colorjsMethod = 'WCAG21';
      try {
        const c1 = new Color(color);
        const c2 = new Color(comparator);
        if (c1.contrast(c2, colorjsMethod as "WCAG21" | "APCA" | "Lstar" | "Michelson" | "Weber" | "DeltaPhi") < min) return false;
      } catch {
        return false;
      }
    }
    // Add more constraint types here as needed
  }
  return true;
}

export const TokenValuePicker: React.FC<TokenValuePickerProps> = ({
  resolvedValueTypeId,
  value,
  tokens,
  constraints,
  onChange,
  excludeTokenId
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [tabIndex, setTabIndex] = useState(0);

  // Filter tokens for the "token" tab
  const filteredTokens = (tokens as TokenWithCompat[]).filter(
    t =>
      (t.resolvedValueTypeId || t.resolvedValueType) === resolvedValueTypeId &&
      t.id !== excludeTokenId &&
      satisfiesConstraints(t, constraints)
  );

  // Render the value for the button
  let buttonLabel = '';
  let aliasToken: TokenWithCompat | undefined;

  if (typeof value === 'string') {
    buttonLabel = value;
  } else if (value.resolvedValueTypeId === 'alias') {
    aliasToken = tokens.find(t => t.id === value.tokenId);
    buttonLabel = aliasToken ? `Alias: ${aliasToken.displayName}` : `Alias: ${value.tokenId}`;
  } else if ('value' in value) {
    switch (value.resolvedValueTypeId) {
      case 'color':
      case 'font-family':
      case 'cubic-bezier':
        buttonLabel = value.value;
        break;
      case 'dimension':
      case 'spacing':
      case 'font-weight':
      case 'font-size':
      case 'line-height':
      case 'letter-spacing':
      case 'duration':
      case 'blur':
      case 'spread':
      case 'radius':
        buttonLabel = String(value.value);
        break;
      default:
        buttonLabel = JSON.stringify(value);
    }
  }

  const renderCustomInput = () => {
    let bezierValue: string;
    let x1: number, y1: number, x2: number, y2: number;
    let colorValue: string;
    let fontValue: string;

    switch (resolvedValueTypeId) {
      case 'color':
        colorValue = typeof value === 'object' && value.resolvedValueTypeId === 'color' && 'value' in value ? value.value : '#000000';
        return (
          <VStack>
            <Input
              type="color"
              w="40px"
              p={0}
              value={colorValue}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ resolvedValueTypeId: 'color', value: e.target.value })}
            />
            <Input
              size="sm"
              value={colorValue}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ resolvedValueTypeId: 'color', value: e.target.value })}
            />
          </VStack>
        );
      case 'font-family':
        fontValue = typeof value === 'object' && value.resolvedValueTypeId === 'font-family' && 'value' in value ? value.value : '';
        return (
          <Input
            size="sm"
            value={fontValue}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ resolvedValueTypeId: 'font-family', value: e.target.value })}
          />
        );
      case 'cubic-bezier':
        bezierValue = typeof value === 'object' && value.resolvedValueTypeId === 'cubic-bezier' && 'value' in value ? value.value : '0, 0, 1, 1';
        [x1, y1, x2, y2] = bezierValue.split(',').map(Number);
        return (
          <VStack>
            <HStack>
              <NumberInput
                size="sm"
                value={x1}
                onChange={(_, newVal) => {
                  onChange({ resolvedValueTypeId: 'cubic-bezier', value: `${newVal}, ${y1}, ${x2}, ${y2}` });
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
                  onChange({ resolvedValueTypeId: 'cubic-bezier', value: `${x1}, ${newVal}, ${x2}, ${y2}` });
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
                  onChange({ resolvedValueTypeId: 'cubic-bezier', value: `${x1}, ${y1}, ${newVal}, ${y2}` });
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
                  onChange({ resolvedValueTypeId: 'cubic-bezier', value: `${x1}, ${y1}, ${x2}, ${newVal}` });
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
        if (['dimension', 'spacing', 'font-weight', 'font-size', 'line-height', 'letter-spacing', 'duration', 'blur', 'spread', 'radius'].includes(resolvedValueTypeId)) {
          const numericValue = typeof value === 'object' && value.resolvedValueTypeId === resolvedValueTypeId && 'value' in value ? value.value : 0;
          return (
            <NumberInput
              size="sm"
              value={numericValue}
              onChange={(_, newVal) => {
                onChange({ resolvedValueTypeId, value: newVal });
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
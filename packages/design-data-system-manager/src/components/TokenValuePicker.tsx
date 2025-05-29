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
  useDisclosure
} from '@chakra-ui/react';
import type { Token, TokenValue } from '@token-model/data-model';
import Color from 'colorjs.io';

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
  if (typeof value === 'string') {
    buttonLabel = value;
  } else if (value.type === 'COLOR') {
    buttonLabel = value.value;
  } else if (value.type === 'ALIAS') {
    const aliasToken = tokens.find(t => t.id === value.tokenId);
    buttonLabel = aliasToken ? `Alias: ${aliasToken.displayName}` : `Alias: ${value.tokenId}`;
  } else if (value.type === 'FLOAT' || value.type === 'INTEGER') {
    buttonLabel = String(value.value);
  } else if (value.type === 'STRING') {
    buttonLabel = value.value;
  } else if (value.type === 'BOOLEAN') {
    buttonLabel = value.value ? 'True' : 'False';
  } else {
    buttonLabel = JSON.stringify(value);
  }

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
                  {resolvedValueTypeId === 'COLOR' && (
                    <VStack>
                      <Input
                        type="color"
                        w="40px"
                        p={0}
                        value={typeof value === 'object' && value.type === 'COLOR' ? value.value : '#000000'}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ type: 'COLOR', value: e.target.value })}
                      />
                      <Input
                        size="sm"
                        value={typeof value === 'object' && value.type === 'COLOR' ? value.value : ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ type: 'COLOR', value: e.target.value })}
                      />
                    </VStack>
                  )}
                  {(resolvedValueTypeId === 'FLOAT' || resolvedValueTypeId === 'INTEGER') && (
                    <Input
                      type="number"
                      size="sm"
                      value={typeof value === 'object' && (value.type === 'FLOAT' || value.type === 'INTEGER') ? value.value : ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ type: resolvedValueTypeId as 'FLOAT' | 'INTEGER', value: Number(e.target.value) })}
                    />
                  )}
                  {resolvedValueTypeId === 'STRING' && (
                    <Input
                      size="sm"
                      value={typeof value === 'object' && value.type === 'STRING' ? value.value : ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ type: 'STRING', value: e.target.value })}
                    />
                  )}
                  {resolvedValueTypeId === 'BOOLEAN' && (
                    <Button
                      colorScheme={typeof value === 'object' && value.type === 'BOOLEAN' && value.value ? 'green' : 'red'}
                      onClick={() => onChange({ type: 'BOOLEAN', value: !(typeof value === 'object' && value.type === 'BOOLEAN' ? value.value : false) })}
                      size="sm"
                    >
                      {typeof value === 'object' && value.type === 'BOOLEAN' && value.value ? 'True' : 'False'}
                    </Button>
                  )}
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
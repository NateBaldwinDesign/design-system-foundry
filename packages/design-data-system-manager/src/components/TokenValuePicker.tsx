import React from 'react';
import {
  Box,
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  Input,
  List,
  ListItem,
  VStack,
  HStack,
  Text,
  useDisclosure,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  IconButton,
  FormControl,
} from '@chakra-ui/react';
import { Token, TokenValue } from '@token-model/data-model';
import { Hexagon, Link2Off } from 'lucide-react';

interface TokenValuePickerProps {
  value: TokenValue;
  onChange: (value: TokenValue) => void;
  tokens: Token[];
  excludeTokenId?: string;
  modes?: string[];
  resolvedValueTypeId: string;
}

export const TokenValuePicker: React.FC<TokenValuePickerProps> = ({
  value,
  onChange,
  tokens,
  excludeTokenId,
  modes,
  resolvedValueTypeId,
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [searchTerm, setSearchTerm] = React.useState('');

  console.log(modes)
  const filteredTokens = tokens.filter(
    (token) =>
      (!excludeTokenId || token.id !== excludeTokenId) &&
      token.resolvedValueTypeId === resolvedValueTypeId &&
      token.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTokenSelect = (tokenId: string) => {
    onChange({ type: 'ALIAS', tokenId });
    onClose();
  };

  const handleCustomValueChange = (newValue: string | number) => {
    // If the current value is an alias, we need to determine the type from the referenced token
    if ('tokenId' in value) {
      const referencedToken = tokens.find(t => t.id === value.tokenId);
      if (referencedToken) {
        const resolvedValueType = referencedToken.resolvedValueTypeId;
        switch (resolvedValueType) {
          case 'color':
            onChange({ type: 'COLOR', value: String(newValue) });
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
            onChange({ type: 'DIMENSION', value: Number(newValue) });
            break;
          case 'font-family':
            onChange({ type: 'FONT_FAMILY', value: String(newValue) });
            break;
          case 'cubic-bezier':
            onChange({ type: 'CUBIC_BEZIER', value: String(newValue) });
            break;
          default:
            onChange({ type: 'COLOR', value: String(newValue) });
        }
      }
    } else {
      // If it's already a custom value, keep the same type
      switch (value.type) {
        case 'COLOR':
          onChange({ type: 'COLOR', value: String(newValue) });
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
          onChange({ type: value.type, value: Number(newValue) });
          break;
        case 'FONT_FAMILY':
        case 'CUBIC_BEZIER':
          onChange({ type: value.type, value: String(newValue) });
          break;
        default:
          // Do nothing for unhandled types (should not occur)
          break;
      }
    }
  };

  const handleUnlinkToken = () => {
    if ('tokenId' in value) {
      const referencedToken = tokens.find(t => t.id === value.tokenId);
      if (referencedToken) {
        const resolvedValueType = referencedToken.resolvedValueTypeId;
        // Get the actual value from the referenced token
        const referencedValue = referencedToken.valuesByMode?.[0]?.value;
        if (referencedValue && 'value' in referencedValue) {
          // Use the referenced token's value when unlinking
          switch (resolvedValueType) {
            case 'color':
              onChange({ type: 'COLOR', value: String(referencedValue.value) });
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
              onChange({ type: 'DIMENSION', value: Number(referencedValue.value) });
              break;
            case 'font-family':
              onChange({ type: 'FONT_FAMILY', value: String(referencedValue.value) });
              break;
            case 'cubic-bezier':
              onChange({ type: 'CUBIC_BEZIER', value: String(referencedValue.value) });
              break;
            default:
              onChange({ type: 'COLOR', value: '#000000' });
          }
        } else {
          // Fallback to default values if referenced value is not available
          switch (resolvedValueType) {
            case 'color':
              onChange({ type: 'COLOR', value: '#000000' });
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
              onChange({ type: 'DIMENSION', value: 0 });
              break;
            case 'font-family':
              onChange({ type: 'FONT_FAMILY', value: '' });
              break;
            case 'cubic-bezier':
              onChange({ type: 'CUBIC_BEZIER', value: '0, 0, 1, 1' });
              break;
            default:
              onChange({ type: 'COLOR', value: '#000000' });
          }
        }
      }
    }
  };

  // Helper: order-insensitive array equality
  function arraysEqualUnordered(a: string[], b: string[]) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, idx) => val === sortedB[idx]);
  }

  // Helper to get the value for a token given modes
  function getTokenDisplayValue(token: Token): string {
    if (!Array.isArray(token.valuesByMode)) return '-';
    
    // If no modes specified, look for global value (empty modeIds array)
    if (!modes || modes.length === 0) {
      const globalMatch = token.valuesByMode.find(vbm => 
        Array.isArray(vbm.modeIds) && vbm.modeIds.length === 0
      );
      if (globalMatch?.value) {
        return formatTokenValue(globalMatch.value);
      }
      return '-';
    }

    // Try to find an exact match first
    const exactMatch = token.valuesByMode.find(vbm =>
      Array.isArray(vbm.modeIds) && arraysEqualUnordered(vbm.modeIds, modes)
    );
    if (exactMatch?.value) {
      return formatTokenValue(exactMatch.value);
    }

    // If no exact match, try to find a partial match
    // Sort modes by length (longest first) to prioritize more specific matches
    const sortedModes = [...modes].sort((a, b) => b.length - a.length);
    for (const mode of sortedModes) {
      const partialMatch = token.valuesByMode.find(vbm =>
        Array.isArray(vbm.modeIds) && vbm.modeIds.includes(mode)
      );
      if (partialMatch?.value) {
        return formatTokenValue(partialMatch.value);
      }
    }

    // If no matches found, fall back to global value (empty modeIds array)
    const fallbackGlobalMatch = token.valuesByMode.find(vbm => 
      Array.isArray(vbm.modeIds) && vbm.modeIds.length === 0
    );
    if (fallbackGlobalMatch?.value) {
      return formatTokenValue(fallbackGlobalMatch.value);
    }

    return '-';
  }

  // Helper to format token values consistently
  function formatTokenValue(value: TokenValue): string {
    if ('tokenId' in value) {
      const ref = tokens.find(t => t.id === value.tokenId);
      return ref ? ref.displayName : `[alias:${value.tokenId}]`;
    }
    if ('value' in value) {
      if (typeof value.value === 'string' || typeof value.value === 'number') {
        return String(value.value);
      }
      return JSON.stringify(value.value);
    }
    return '-';
  }

  const renderMainInput = () => {
    // If value is an alias, show a button with the token name
    if ('tokenId' in value) {
      const token = tokens.find((t) => t.id === value.tokenId);
      return (
        <Button
          size="sm"
          variant="outline"
          width="100%"
          justifyContent="flex-start"
          onClick={onOpen}
        >
          {token ? token.displayName : value.tokenId}
        </Button>
      );
    }

    // If value is a custom value, show the appropriate input
    const currentValue = value.value;
    const type = value.type;

    switch (type) {
      case 'COLOR':
        return (
          <Input
            type="color"
            value={String(currentValue)}
            onChange={(e) => handleCustomValueChange(e.target.value)}
            size="sm"
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
            value={Number(currentValue)}
            onChange={(_, value) => handleCustomValueChange(value)}
            size="sm"
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
            value={String(currentValue)}
            onChange={(e) => handleCustomValueChange(e.target.value)}
            size="sm"
          />
        );
      default:
        return null;
    }
  };

  console.log('TokenValuePicker popover modes:', modes);

  return (
    <HStack spacing={2} width="100%">
      <Box flex={1}>
        {renderMainInput()}
      </Box>
      <Popover 
        isOpen={isOpen} 
        onClose={onClose} 
        placement="bottom-end"
        modifiers={[
          {
            name: 'preventOverflow',
            options: {
              boundary: 'viewport',
              padding: 8,
            },
          },
          {
            name: 'flip',
            options: {
              fallbackPlacements: ['top-end', 'bottom-start', 'top-start'],
              padding: 8,
            },
          },
        ]}
      >
        <PopoverTrigger>
          <IconButton
            aria-label={('tokenId' in value) ? 'Unlink token' : 'Select token'}
            icon={('tokenId' in value) ? <Link2Off size={16} /> : <Hexagon size={16} />}
            size="sm"
            variant="ghost"
            onClick={('tokenId' in value) ? handleUnlinkToken : onOpen}
          />
        </PopoverTrigger>
        <PopoverContent p={0} width="300px" maxH="400px" overflow="auto">
          <PopoverBody p={0} maxH="400px" overflowY="auto">
            <VStack gap={0} align="stretch">
              <Box position="sticky" top={0} bg="chakra-body-bg" zIndex={1} p={2}>
                <FormControl>
                  <Input
                    placeholder="Search tokens..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    size="sm"
                  />
                </FormControl>
              </Box>
              <List spacing={0} pb={2}>
                {filteredTokens.map((token) => {
                  const displayValue = getTokenDisplayValue(token);
                  return (
                    <ListItem key={token.id}>
                      <Button
                        size="sm"
                        variant="ghost"
                        width="100%"
                        height="auto"
                        justifyContent="flex-start"
                        onClick={() => handleTokenSelect(token.id)}
                      >
                        <HStack width="100%" p={2} gap={3} align="flex-start">
                          {token.valuesByMode?.[0]?.value?.type === 'COLOR' && (
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
    </HStack>
  );
}; 
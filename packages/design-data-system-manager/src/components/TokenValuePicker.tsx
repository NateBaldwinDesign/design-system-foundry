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
} from '@chakra-ui/react';
import { Token, TokenValue } from '@token-model/data-model';

interface TokenValuePickerProps {
  value: TokenValue;
  onChange: (value: TokenValue) => void;
  tokens: Token[];
  excludeTokenId?: string;
}

export const TokenValuePicker: React.FC<TokenValuePickerProps> = ({
  value,
  onChange,
  tokens,
  excludeTokenId,
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredTokens = tokens.filter(
    (token) =>
      !excludeTokenId || token.id !== excludeTokenId &&
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

  const getButtonLabel = () => {
    // If value is an alias (has tokenId)
    if ('tokenId' in value) {
      const token = tokens.find((t) => t.id === value.tokenId);
      return token ? token.displayName : value.tokenId;
    }

    // If value is a custom value
    return String(value.value);
  };

  const renderCustomInput = () => {
    // If value is an alias, don't show custom input
    if ('tokenId' in value) {
      return null;
    }

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

  return (
    <Box>
      <Popover isOpen={isOpen} onClose={onClose} placement="bottom-start">
        <PopoverTrigger>
          <Button
            size="sm"
            variant="outline"
            onClick={onOpen}
            width="100%"
            justifyContent="flex-start"
          >
            {getButtonLabel()}
          </Button>
        </PopoverTrigger>
        <PopoverContent width="300px">
          <PopoverBody p={2}>
            <VStack gap={2} align="stretch">
              <Input
                placeholder="Search tokens..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="sm"
              />
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={1}>
                  Custom Value
                </Text>
                {renderCustomInput()}
              </Box>
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={1}>
                  Tokens
                </Text>
                <List spacing={1}>
                  {filteredTokens.map((token) => (
                    <ListItem key={token.id}>
                      <Button
                        size="sm"
                        variant="ghost"
                        width="100%"
                        justifyContent="flex-start"
                        onClick={() => handleTokenSelect(token.id)}
                      >
                        <HStack spacing={2}>
                          <Text>{token.displayName}</Text>
                          {token.description && (
                            <Text fontSize="xs" color="gray.500">
                              ({token.description})
                            </Text>
                          )}
                        </HStack>
                      </Button>
                    </ListItem>
                  ))}
                </List>
              </Box>
            </VStack>
          </PopoverBody>
        </PopoverContent>
      </Popover>
    </Box>
  );
}; 
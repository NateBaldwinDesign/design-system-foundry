import React from 'react';
import { Box, HStack, Text } from "@chakra-ui/react";
import { getValueTypeIcon } from '../utils/getValueTypeIcon';

interface TokenResolvedValueTagProps {
  resolvedValueType: string;
  rawValue: string | number;
  formattedValue: string;
}

const TokenResolvedValueTag: React.FC<TokenResolvedValueTagProps> = ({
  resolvedValueType,
  rawValue,
  formattedValue
}) => {
  let displayValue: React.ReactNode;
  const iconSize = 14;

  switch (resolvedValueType) {
    case 'COLOR':
      displayValue = (
          <Text>{formattedValue}</Text>
      );
      break;
    case 'DIMENSION':
    case 'SPACING':
    case 'FONT_SIZE':
    case 'LINE_HEIGHT':
    case 'LETTER_SPACING':
    case 'DURATION':
    case 'BLUR':
    case 'SPREAD':
    case 'RADIUS':
      displayValue = `${typeof rawValue === 'number' ? rawValue : Number(rawValue)}px`;
      break;
    case 'FONT_WEIGHT':
      displayValue = typeof rawValue === 'number' ? rawValue.toString() : String(rawValue);
      break;
    case 'FONT_FAMILY':
    case 'CUBIC_BEZIER':
      displayValue = typeof rawValue === 'string' ? rawValue : String(rawValue);
      break;
    default:
      displayValue = formattedValue;
  }

  return (
    <Box
        width="100%"
        textAlign="left"
        borderRadius='md'
        py={1}
        px={2}
        bg='gray.100'
        borderWidth='1px'
        borderColor="gray.200"
    >
      <HStack width="100%" justifyContent="flex-start" gap={2}>
          {resolvedValueType === 'COLOR' && (
            <div style={{ display: 'flex', flexGrow: 0, flexShrink: 0, width: iconSize, height: iconSize, borderRadius: '2px', backgroundColor: String(rawValue) }}></div>
          )}
          {resolvedValueType !== 'COLOR' && (
            <div style={{ display: 'flex', flexGrow: 0, flexShrink: 0, width: iconSize, height: iconSize }}>
              {getValueTypeIcon(resolvedValueType, 16, 'var(--chakra-colors-gray-400)')}
            </div>
          )}
          {typeof displayValue === 'string' ? (
            <Text>{displayValue}</Text>
          ) : (
            displayValue
          )}
      </HStack>
    </Box>
  );
};

export default TokenResolvedValueTag; 
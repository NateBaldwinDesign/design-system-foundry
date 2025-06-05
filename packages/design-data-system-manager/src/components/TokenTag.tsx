import React from 'react';
import { Box, HStack, Text } from "@chakra-ui/react"
import type { ResolvedValueType } from '@token-model/data-model';

interface TokenTagProps {
    displayName: string;
    resolvedValueTypeId: string;
    resolvedValueTypes: ResolvedValueType[];
    value: string | number;
    onClick?: () => void;
}

const TokenTag: React.FC<TokenTagProps> = ({
    displayName,
    resolvedValueTypeId,
    resolvedValueTypes,
    value,
    onClick
}) => {

    const valueType = resolvedValueTypes.find(vt => vt.id === resolvedValueTypeId);
    if (!valueType) {
        throw new Error(`Unknown value type: ${resolvedValueTypeId}`);
    }

    return (
        <Box
            as="button"
            onClick={onClick}
            width="100%"
            textAlign="left"
            _hover={{ bg: 'gray.50' }}
            _active={{ bg: 'gray.100' }}
            borderRadius="md"
            p={2}
        >
            <HStack width="100%" justifyContent="space-between">
                <HStack>
                    {valueType.type === 'COLOR' && (
                        <div style={{ display: 'flex', flexGrow: 0, flexShrink: 0, width: '16px', height: '16px', borderRadius: '4px', backgroundColor: String(value) }}></div>
                    )}
                    <Text className="kode-mono">{displayName}</Text>
                </HStack>
                <Text color="gray.500">{String(value)}</Text>
            </HStack>
        </Box>
    )
}

export default TokenTag;
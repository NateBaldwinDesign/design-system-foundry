import React from 'react';
import { Box, Stack, Text } from "@chakra-ui/react"
import type { ResolvedValueType } from '@token-model/data-model';
import { getValueTypeIcon } from '../utils/getValueTypeIcon';

interface TokenTagProps {
    displayName: string;
    resolvedValueTypeId: string;
    resolvedValueTypes: ResolvedValueType[];
    value: string | number;
    onClick?: () => void;
    isPill?: boolean;
}

const TokenTag: React.FC<TokenTagProps> = ({
    displayName,
    resolvedValueTypeId,
    resolvedValueTypes,
    value,
    isPill = false,
    onClick
}) => {

    const valueType = resolvedValueTypes.find(vt => vt.id === resolvedValueTypeId);
    if (!valueType) {
        throw new Error(`Unknown value type: ${resolvedValueTypeId}`);
    }

    return (
        <Box
            onClick={onClick}
            width="100%"
            textAlign="left"
            borderRadius={isPill ? 'md' : 'md'}
            py={1}
            px={2}
            bg={isPill ? 'gray.100' : 'transparent'}
            borderWidth={isPill ? '1px' : '0'}
            borderColor="gray.200"
        >
            <Stack direction="row" width="100%" justifyContent="space-between">
                <Stack direction="row">
                    {valueType.type === 'COLOR' && (
                        <div style={{ display: 'flex', flexGrow: 0, flexShrink: 0, width: '16px', height: '16px', borderRadius: '4px', backgroundColor: String(value) }}></div>
                    )}
                    {valueType.type !== 'COLOR' && (
                        <div style={{ display: 'flex', flexGrow: 0, flexShrink: 0, width: '16px', height: '16px' }}>
                            {getValueTypeIcon(valueType.type, 16)}
                        </div>
                    )}
                    <Text className="kode-mono">{displayName}</Text>
                </Stack>
                <Text color="gray.500">{String(value)}</Text>
            </Stack>
        </Box>
    )
}

export default TokenTag;
import React from 'react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  Box,
  IconButton
} from '@chakra-ui/react';
import { Trash2 } from 'lucide-react';
import type { Mode } from '@token-model/data-model';
import type { TokenValue } from '@token-model/data-model';

// Utility for mode name lookup
export function getModeName(modeId: string, modes: Mode[]): string {
  const mode = modes.find(m => m.id === modeId);
  if (!mode) {
    console.warn(`Unknown modeId: ${modeId}`);
    return `Unknown Mode (${modeId})`;
  }
  return mode.name;
}

export interface ValueByMode {
  modeIds: string[];
  value: TokenValue;
  platformOverrides?: {
    platformId: string;
    value: string;
  }[];
}

interface ValueByModeTableProps {
  valuesByMode: ValueByMode[];
  modes: Mode[];
  getValueEditor: (value: TokenValue | string, modeIndex: number, isOverride?: boolean, onChange?: (newValue: TokenValue) => void) => React.ReactNode;
}

export function ValueByModeTable({ valuesByMode, modes, getValueEditor }: ValueByModeTableProps) {
  // Group values by mode combinations
  const modeGroups = valuesByMode.reduce<Record<string, ValueByMode[]>>((acc, vbm) => {
    const key = vbm.modeIds.slice().sort().join(',');
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(vbm);
    return acc;
  }, {});

  return (
    <Box overflowX="auto">
      <Table size="sm" variant="simple">
        <Thead>
          <Tr>
            <Th>Modes</Th>
            <Th>Value</Th>
            <Th width="50px" />
          </Tr>
        </Thead>
        <Tbody>
          {Object.entries(modeGroups).map(([modeKey, group]) => {
            const modeIds = modeKey.split(',');
            const modeNames = modeIds.map(id => modes.find(m => m.id === id)?.name || id).join(' + ');
            return (
              <Tr key={modeKey}>
                <Td>
                  <Text fontSize="sm">{modeNames}</Text>
                </Td>
                <Td>
                  {group.map((vbm, idx) => (
                    <Box key={idx} mb={idx < group.length - 1 ? 2 : 0}>
                      {getValueEditor(vbm.value, idx)}
                    </Box>
                  ))}
                </Td>
                <Td>
                  <IconButton
                    aria-label="Remove value"
                    icon={<Trash2 />}
                    size="sm"
                    colorScheme="red"
                    onClick={() => {
                      // Handle remove value
                    }}
                  />
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </Box>
  );
} 
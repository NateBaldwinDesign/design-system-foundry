import React from 'react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  Box
} from '@chakra-ui/react';
import type { Mode, Platform } from '@token-model/data-model';
import type { TokenValue } from '@token-model/data-model';

export interface ValueByMode {
  modeIds: string[];
  value: TokenValue;
  platformOverrides?: {
    platformId: string;
    value: string;
  }[];
}

interface PlatformOverridesTableProps {
  platforms: Platform[];
  valuesByMode: ValueByMode[];
  modes: Mode[];
  getValueEditor: (value: TokenValue | string, modeIndex: number, isOverride?: boolean, onChange?: (newValue: TokenValue) => void) => React.ReactNode;
  onPlatformOverrideChange: (platformId: string, modeIndex: number, newValue: TokenValue) => void;
}

export function PlatformOverridesTable({
  platforms,
  valuesByMode,
  modes,
  getValueEditor,
  onPlatformOverrideChange
}: PlatformOverridesTableProps) {
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
            {platforms.map(platform => (
              <Th key={platform.id}>{platform.displayName}</Th>
            ))}
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
                {platforms.map(platform => {
                  const override = group[0]?.platformOverrides?.find(p => p.platformId === platform.id);
                  return (
                    <Td key={platform.id}>
                      {getValueEditor(
                        override ? override.value : '',
                        group[0] ? valuesByMode.indexOf(group[0]) : 0,
                        true,
                        (newValue) => onPlatformOverrideChange(platform.id, group[0] ? valuesByMode.indexOf(group[0]) : 0, newValue)
                      )}
                    </Td>
                  );
                })}
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </Box>
  );
} 
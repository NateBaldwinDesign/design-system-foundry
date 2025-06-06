import React from 'react';
import {
  Table,
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
  getValueEditor: (value: TokenValue | string, modeIndex: number, modeIds: string[], isOverride?: boolean, onChange?: (newValue: TokenValue) => void) => React.ReactNode;
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
      <Table.Root size="sm" width="100%">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Modes</Table.ColumnHeader>
            {platforms.map(platform => (
              <Table.ColumnHeader key={platform.id}>{platform.displayName}</Table.ColumnHeader>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {Object.entries(modeGroups).map(([modeKey, group]) => {
            const modeIds = modeKey.split(',').filter(Boolean);
            const modeNames = modeIds.map(id => modes.find(m => m.id === id)?.name || id).join(' + ');
            return (
              <Table.Row key={modeKey}>
                <Table.Cell>
                  <Text fontSize="sm">{modeNames}</Text>
                </Table.Cell>
                {platforms.map(platform => {
                  const override = group[0]?.platformOverrides?.find(p => p.platformId === platform.id);
                  return (
                    <Table.Cell key={platform.id}>
                      {getValueEditor(
                        override ? override.value : '',
                        group[0] ? valuesByMode.indexOf(group[0]) : 0,
                        group[0]?.modeIds || [],
                        true,
                        (newValue) => onPlatformOverrideChange(platform.id, group[0] ? valuesByMode.indexOf(group[0]) : 0, newValue)
                      )}
                    </Table.Cell>
                  );
                })}
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table.Root>
    </Box>
  );
} 
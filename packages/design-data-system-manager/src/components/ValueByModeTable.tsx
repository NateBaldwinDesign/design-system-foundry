import React, { useMemo } from 'react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Box
} from '@chakra-ui/react';
import type { TokenValue, Mode } from '@token-model/data-model';

// Utility for mode name lookup
export function getModeName(modeId: string, modes: Mode[]): string {
  const mode = modes.find(m => m.id === modeId);
  if (!mode) {
    console.warn(`Unknown modeId: ${modeId}`);
    return `Unknown Mode (${modeId})`;
  }
  return mode.name;
}

interface ValueByMode {
  modeIds: string[];
  value: TokenValue;
}

interface ValueByModeTableProps {
  valuesByMode: ValueByMode[];
  modes: Mode[];
  getValueEditor: (value: TokenValue | string, modeIndex: number, isOverride?: boolean, onChange?: (newValue: TokenValue) => void) => React.ReactNode;
}

export function ValueByModeTable({ valuesByMode, modes, getValueEditor }: ValueByModeTableProps) {
  // Validate that all mode IDs in valuesByMode exist in the modes array
  const invalidModeIds = useMemo(() => {
    const allModeIds = new Set(modes.map(m => m.id));
    return valuesByMode
      .flatMap(vbm => vbm.modeIds)
      .filter(id => id && !allModeIds.has(id));
  }, [valuesByMode, modes]);

  if (invalidModeIds.length > 0) {
    console.warn('Token contains references to non-existent modes:', invalidModeIds);
  }

  // Get unique mode IDs for columns and rows
  const columns = useMemo(() => {
    return Array.from(
      new Set(
        valuesByMode
          .map(vbm => vbm.modeIds[0])
          .filter(id => !!id)
      )
    ).sort((a, b) => getModeName(a, modes).localeCompare(getModeName(b, modes)));
  }, [valuesByMode, modes]);

  const hasRows = valuesByMode.some(vbm => vbm.modeIds.length > 1);
  const rows = useMemo(() => {
    if (!hasRows) return ['single'];
    return Array.from(
      new Set(
        valuesByMode
          .map(vbm => vbm.modeIds[1])
          .filter(id => !!id)
      )
    ).sort((a, b) => getModeName(a, modes).localeCompare(getModeName(b, modes)));
  }, [valuesByMode, hasRows, modes]);

  const valueMap = useMemo(() => {
    return new Map(
      valuesByMode.map((vbm, idx) => [vbm.modeIds.join(','), { vbm, idx }])
    );
  }, [valuesByMode]);

  const allGlobal = valuesByMode.every(vbm => vbm.modeIds.length === 0);

  return (
    <Box borderWidth={1} borderRadius="md" overflow="hidden">
      <Table size="sm">
        {!allGlobal && (
          <Thead>
            <Tr>
              <Th></Th>
              {columns.map(colId => (
                <Th key={`header-${colId}`} textAlign="center">
                  {getModeName(colId, modes)}
                </Th>
              ))}
            </Tr>
          </Thead>
        )}
        <Tbody>
          {rows.map(rowId => (
            <Tr key={`row-${rowId}`}>
              <Th scope="row">{hasRows ? getModeName(rowId, modes) : ''}</Th>
              {columns.map(colId => {
                let key;
                if (hasRows) {
                  key = [colId, rowId].join(',');
                } else {
                  key = [colId].join(',');
                }
                const entry = valueMap.get(key);
                const cellKey = `cell-${rowId}-${colId}`;
                if (!entry) return <Td key={cellKey} />;
                return (
                  <Td key={cellKey} textAlign="center">
                    {getValueEditor(entry.vbm.value, entry.idx)}
                  </Td>
                );
              })}
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
} 
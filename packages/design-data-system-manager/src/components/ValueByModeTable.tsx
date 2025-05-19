import React, { useMemo } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography } from '@mui/material';
import type { TokenValue, Mode, Token } from '@token-model/data-model';
import { TokenValuePicker } from './TokenValuePicker';

// Utility for mode name lookup
export function getModeName(modeId: string, modes: Mode[]): string {
  const mode = modes.find(m => m.id === modeId);
  if (!mode) {
    console.warn(`Unknown modeId: ${modeId}`);
    return `Unknown Mode (${modeId})`;
  }
  return mode.name;
}

interface ValueByModeTableProps {
  valuesByMode: any[];
  modes: Mode[];
  editable?: boolean;
  onValueChange?: (modeIndex: number, newValue: TokenValue) => void;
  getValueEditor: (value: TokenValue | string, modeIndex: number, isOverride?: boolean, onChange?: (newValue: TokenValue) => void) => React.ReactNode;
  resolvedValueType: string;
  tokens: Token[];
  constraints?: any[];
  excludeTokenId?: string;
}

export function ValueByModeTable({ valuesByMode, modes, editable, onValueChange, getValueEditor, resolvedValueType, tokens, constraints, excludeTokenId }: ValueByModeTableProps) {
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
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        {!allGlobal && (
          <TableHead>
            <TableRow>
              <TableCell></TableCell>
              {columns.map(colId => (
                <TableCell key={`header-${colId}`} align="center">
                  {getModeName(colId, modes)}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
        )}
        <TableBody>
          {rows.map(rowId => (
            <TableRow key={`row-${rowId}`}>
              <TableCell component="th" scope="row">{hasRows ? getModeName(rowId, modes) : ''}</TableCell>
              {columns.map(colId => {
                let key;
                if (hasRows) {
                  key = [colId, rowId].join(',');
                } else {
                  key = [colId].join(',');
                }
                const entry = valueMap.get(key);
                const cellKey = `cell-${rowId}-${colId}`;
                if (!entry) return <TableCell key={cellKey} />;
                return (
                  <TableCell key={cellKey} align="center">
                    {getValueEditor(entry.vbm.value, entry.idx)}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
} 
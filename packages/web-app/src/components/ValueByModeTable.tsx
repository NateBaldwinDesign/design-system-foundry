import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography } from '@mui/material';
import type { TokenValue, Mode, Token } from '@token-model/data-model';
import { TokenValuePicker } from './TokenValuePicker';

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
  const getModeName = (modeId: string) => modes.find(m => m.id === modeId)?.name || modeId;
  const columns = Array.from(
    new Set(
      valuesByMode
        .map(vbm => vbm.modeIds[0])
        .filter(id => !!id)
    )
  );
  columns.sort((a, b) => getModeName(a).localeCompare(getModeName(b)));
  const hasRows = valuesByMode.some(vbm => vbm.modeIds.length > 1);
  let rows: string[] = [];
  if (hasRows) {
    rows = Array.from(
      new Set(
        valuesByMode
          .map(vbm => vbm.modeIds[1])
          .filter(id => !!id)
      )
    );
    rows.sort((a, b) => getModeName(a).localeCompare(getModeName(b)));
  } else {
    rows = ['single'];
  }
  const valueMap = new Map(
    valuesByMode.map((vbm, idx) => [vbm.modeIds.join(','), { vbm, idx }])
  );
  const allGlobal = valuesByMode.every(vbm => vbm.modeIds.length === 0);

  // Debug logs
  console.log('ValueByModeTable: modes', modes);
  console.log('ValueByModeTable: columns', columns);
  console.log('ValueByModeTable: rows', rows);
  valuesByMode.forEach((vbm, idx) => {
    console.log(`ValueByModeTable: valuesByMode[${idx}].modeIds`, vbm.modeIds);
  });

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        {!allGlobal && (
          <TableHead>
            <TableRow>
              <TableCell></TableCell>
              {columns.map((colId: string) => {
                const modeName = getModeName(colId);
                console.log('ValueByModeTable: Looking up mode name for colId', colId, '->', modeName);
                return (
                  <TableCell key={`header-${colId}`} align="center">
                    {modeName !== colId ? modeName : 'Unknown Mode'}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
        )}
        <TableBody>
          {rows.map((rowId: string) => (
            <TableRow key={`row-${rowId}`}>
              <TableCell component="th" scope="row">{hasRows ? getModeName(rowId) : ''}</TableCell>
              {columns.map((colId: string) => {
                let key;
                if (hasRows) {
                  key = [colId, rowId].join(',');
                } else {
                  key = [colId].join(',');
                }
                const entry = valueMap.get(key);
                const cellKey = `cell-${rowId}-${colId}`;
                if (!entry) return <TableCell key={cellKey} />;
                // Use TokenValuePicker for editable cells
                if (editable && onValueChange) {
                  return (
                    <TableCell key={cellKey} align="center">
                      <TokenValuePicker
                        resolvedValueType={resolvedValueType}
                        value={entry.vbm.value}
                        tokens={tokens}
                        constraints={constraints}
                        excludeTokenId={excludeTokenId}
                        onChange={newValue => onValueChange(entry.idx, newValue)}
                      />
                    </TableCell>
                  );
                }
                // Fallback to getValueEditor for non-editable
                return (
                  <TableCell key={cellKey} align="center">
                    {getValueEditor(
                      entry.vbm.value,
                      entry.idx
                    )}
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
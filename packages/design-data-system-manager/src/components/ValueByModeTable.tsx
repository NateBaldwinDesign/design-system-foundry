import React from 'react';
import {
  Box,
  Text,
  IconButton,
  Button,
  Table
} from '@chakra-ui/react';
import { Trash2 } from 'lucide-react';
import type { Mode, Dimension, TokenValue, ResolvedValueType } from '@token-model/data-model';
import { StorageService } from '../services/storage';

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
  dimensions: Dimension[];
  getValueEditor: (value: TokenValue | string, modeIds: string[], isOverride?: boolean, onChange?: (newValue: TokenValue) => void) => React.ReactNode;
  onDeleteValue: (modeIds: string[]) => void;
  resolvedValueTypeId: string;
  resolvedValueTypes: ResolvedValueType[];
  onAddValue: (modeIds: string[], value: TokenValue) => void;
}

// Helper function to get all possible combinations of modes from dimensions
function getModeCombinations(dimensions: Dimension[]): string[][] {
  if (dimensions.length === 0) return [[]];
  
  const modeArrays = dimensions.map(d => d.modes.map(m => m.id));
  return modeArrays.reduce<string[][]>(
    (acc, modes) => acc.flatMap(combo => modes.map(mode => [...combo, mode])),
    [[]]
  );
}

// Helper function to categorize dimensions as column or row dimensions
function categorizeDimensions(dimensions: Dimension[]): {
  columnDimensions: Dimension[];
  rowDimensions: Dimension[];
} {
  // Get the dimension order from storage
  const dimensionOrder = StorageService.getDimensionOrder();

  // Sort dimensions according to the stored order
  const sortedDimensions = [...dimensions].sort((a, b) => {
    const aIndex = dimensionOrder.indexOf(a.id);
    const bIndex = dimensionOrder.indexOf(b.id);
    // If either dimension is not in the order, put it at the end
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  // Find the first dimension with 3 or fewer modes
  const columnDimension = sortedDimensions.find(dim => dim.modes.length <= 3);
  
  // All other dimensions go to rows
  const rowDimensions = sortedDimensions.filter(dim => dim !== columnDimension);

  return {
    columnDimensions: columnDimension ? [columnDimension] : [],
    rowDimensions
  };
}

// Helper function to get a default token value based on schema
function getDefaultTokenValue(resolvedValueTypeId: string, resolvedValueTypes: ResolvedValueType[]): TokenValue {
  const valueType = resolvedValueTypes.find((vt: ResolvedValueType) => vt.id === resolvedValueTypeId);
  if (!valueType) {
    throw new Error(`Unknown value type: ${resolvedValueTypeId}`);
  }

  // Use sensible defaults based on the value type
  switch (valueType.type) {
    case 'COLOR':
      return { value: '#000000' };
    case 'DIMENSION':
    case 'SPACING':
    case 'FONT_SIZE':
    case 'LINE_HEIGHT':
    case 'LETTER_SPACING':
    case 'BLUR':
    case 'SPREAD':
    case 'RADIUS':
      return { value: 0 };
    case 'FONT_WEIGHT':
      return { value: 400 };
    case 'FONT_FAMILY':
      return { value: 'system-ui' };
    case 'DURATION':
      return { value: 0 };
    case 'CUBIC_BEZIER':
      return { value: 'cubic-bezier(0.4, 0, 0.2, 1)' };
    default:
      return { value: '' };
  }
}

// Component for nested table structure
function NestedModeTable({
  columnDimensions,
  rowDimensions,
  modes,
  valueMap,
  getValueEditor,
  onDeleteValue,
  resolvedValueTypeId,
  resolvedValueTypes,
  onAddValue
}: {
  columnDimensions: Dimension[];
  rowDimensions: Dimension[];
  modes: Mode[];
  valueMap: Map<string, ValueByMode>;
  getValueEditor: (value: TokenValue | string, modeIds: string[], isOverride?: boolean, onChange?: (newValue: TokenValue) => void) => React.ReactNode;
  onDeleteValue: (modeIds: string[]) => void;
  resolvedValueTypeId: string;
  resolvedValueTypes: ResolvedValueType[];
  onAddValue: (modeIds: string[], value: TokenValue) => void;
}) {
  const columnCombinations = getModeCombinations(columnDimensions);
  const rowCombinations = getModeCombinations(rowDimensions);

  // If we have more than one row dimension, create nested tables
  if (rowDimensions.length > 1) {
    const primaryRowDim = rowDimensions[0];
    const secondaryRowDims = rowDimensions.slice(1);
    
    return (
      <Table.Root size="sm" width="100%">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>{primaryRowDim.displayName}</Table.ColumnHeader>
            {columnCombinations.map((combo, idx) => (
              <Table.ColumnHeader key={idx} colSpan={1}>
                {combo.map(modeId => getModeName(modeId, modes)).join(' + ')}
              </Table.ColumnHeader>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {primaryRowDim.modes.map(primaryMode => (
            <React.Fragment key={primaryMode.id}>
              {getModeCombinations(secondaryRowDims).map((secondaryCombo, secondaryIdx) => (
                <Table.Row key={`${primaryMode.id}-${secondaryIdx}`}>
                  {secondaryIdx === 0 && (
                    <Table.Cell rowSpan={getModeCombinations(secondaryRowDims).length}>
                      {getModeName(primaryMode.id, modes)}
                    </Table.Cell>
                  )}
                  {columnCombinations.map((colCombo, colIdx) => {
                    const allModeIds = [primaryMode.id, ...secondaryCombo, ...colCombo].sort();
                    return (
                      <Table.Cell key={colIdx}>
                        <Table.Root size="sm">
                          <Table.Body>
                            {secondaryCombo.map((modeId, modeIdx) => {
                              const allModeIds = [primaryMode.id, ...secondaryCombo, ...colCombo].sort();
                              const key = allModeIds.join(',');
                              return (
                                <Table.Row key={modeIdx}>
                                  <Table.Cell align="left">{getModeName(modeId, modes)}</Table.Cell>
                                  <Table.Cell align="left">
                                    <Box display="flex" alignItems="flex-start" gap={2}>
                                      {valueMap.get(key) ? (
                                        getValueEditor(valueMap.get(key)!.value, allModeIds)
                                      ) : (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => onAddValue(allModeIds, getDefaultTokenValue(resolvedValueTypeId, resolvedValueTypes))}
                                        >
                                          Add value
                                        </Button>
                                      )}
                                      {valueMap.get(key) && (
                                        <IconButton
                                          aria-label="Delete value"
                                          size="sm"
                                          colorPalette="red"
                                          onClick={() => onDeleteValue(allModeIds)}
                                        >
                                          <Trash2 width={16} height={16} />
                                        </IconButton>
                                      )}
                                    </Box>
                                  </Table.Cell>
                                </Table.Row>
                              );
                            })}
                          </Table.Body>
                        </Table.Root>
                      </Table.Cell>
                    );
                  })}
                </Table.Row>
              ))}
            </React.Fragment>
          ))}
        </Table.Body>
      </Table.Root>
    );
  }

  // If we have more than one column dimension, create nested tables
  if (columnDimensions.length > 1) {
    const primaryColDim = columnDimensions[0];
    const secondaryColDims = columnDimensions.slice(1);
    
    return (
      <Table.Root size="sm" width="100%">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>{rowDimensions[0]?.displayName}</Table.ColumnHeader>
            {primaryColDim.modes.map(primaryMode => (
              <Table.ColumnHeader key={primaryMode.id} colSpan={1}>
                {getModeName(primaryMode.id, modes)}
              </Table.ColumnHeader>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {rowCombinations.map((rowCombo, rowIdx) => (
            <Table.Row key={rowIdx}>
              <Table.Cell>{getModeName(rowCombo[0], modes)}</Table.Cell>
              {primaryColDim.modes.map(primaryMode => (
                <Table.Cell key={primaryMode.id}>
                  <Table.Root size="sm">
                    <Table.Header>
                      <Table.Row>
                        {getModeCombinations(secondaryColDims).map((combo, idx) => (
                          <Table.ColumnHeader key={idx}>
                            {combo.map(modeId => getModeName(modeId, modes)).join(' + ')}
                          </Table.ColumnHeader>
                        ))}
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      <Table.Row>
                        {getModeCombinations(secondaryColDims).map((combo, idx) => {
                          const allModeIds = [...rowCombo, primaryMode.id, ...combo].sort();
                          const key = allModeIds.join(',');
                          return (
                            <Table.Cell key={idx}>
                              <Box display="flex" alignItems="center" gap={2}>
                                {valueMap.get(key) ? (
                                  getValueEditor(valueMap.get(key)!.value, allModeIds)
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onAddValue(allModeIds, getDefaultTokenValue(resolvedValueTypeId, resolvedValueTypes))}
                                  >
                                    Add value
                                  </Button>
                                )}
                                {valueMap.get(key) && (
                                  <IconButton
                                    aria-label="Delete value"
                                    size="sm"
                                    colorPalette="red"
                                    onClick={() => onDeleteValue(allModeIds)}
                                  >
                                    <Trash2 width={16} height={16} />
                                  </IconButton>
                                )}
                              </Box>
                            </Table.Cell>
                          );
                        })}
                      </Table.Row>
                    </Table.Body>
                  </Table.Root>
                </Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    );
  }

  // Default case: simple table
  return (
    <Table.Root size="sm" width="100%">
      <Table.Header>
        <Table.Row>
          {rowDimensions.map(dim => (
            <Table.ColumnHeader key={dim.id}>{dim.displayName}</Table.ColumnHeader>
          ))}
          {columnCombinations.map((combo, idx) => (
            <Table.ColumnHeader key={idx}>
              {combo.map(modeId => getModeName(modeId, modes)).join(' + ')}
            </Table.ColumnHeader>
          ))}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {rowCombinations.map((rowCombo, rowIdx) => (
          <Table.Row key={rowIdx}>
            {rowCombo.map(modeId => (
              <Table.Cell key={modeId}>
                <Text fontSize="sm">{getModeName(modeId, modes)}</Text>
              </Table.Cell>
            ))}
            {columnCombinations.map((colCombo, colIdx) => {
              const allModeIds = [...rowCombo, ...colCombo].sort();
              const key = allModeIds.join(',');
              return (
                <Table.Cell key={colIdx}>
                  <Box display="flex" alignItems="center" gap={2}>
                    {valueMap.get(key) ? (
                      getValueEditor(valueMap.get(key)!.value, allModeIds)
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onAddValue(allModeIds, getDefaultTokenValue(resolvedValueTypeId, resolvedValueTypes))}
                      >
                        Add value
                      </Button>
                    )}
                    {valueMap.get(key) && (
                      <IconButton
                        aria-label="Delete value"
                        size="sm"
                        colorPalette="red"
                        onClick={() => onDeleteValue(allModeIds)}
                      >
                        <Trash2 width={16} height={16} />
                      </IconButton>
                    )}
                  </Box>
                </Table.Cell>
              );
            })}
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}

export function ValueByModeTable({ 
  valuesByMode, 
  modes, 
  dimensions, 
  getValueEditor, 
  onDeleteValue,
  resolvedValueTypeId,
  resolvedValueTypes,
  onAddValue 
}: ValueByModeTableProps) {
  // Categorize dimensions into columns and rows
  const { columnDimensions, rowDimensions } = categorizeDimensions(dimensions);

  // Create a map of mode combinations to values for quick lookup
  const valueMap = new Map(
    valuesByMode.map(vbm => [vbm.modeIds.slice().sort().join(','), vbm])
  );

  return (
    <Box overflowX="auto">
      <NestedModeTable
        columnDimensions={columnDimensions}
        rowDimensions={rowDimensions}
        modes={modes}
        valueMap={valueMap}
        getValueEditor={getValueEditor}
        onDeleteValue={onDeleteValue}
        resolvedValueTypeId={resolvedValueTypeId}
        resolvedValueTypes={resolvedValueTypes}
        onAddValue={onAddValue}
      />
    </Box>
  );
} 
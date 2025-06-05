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
  IconButton,
  Button
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
      <Table size="sm" variant="simple">
        <Thead>
          <Tr>
            <Th>{primaryRowDim.displayName}</Th>
            {columnCombinations.map((combo, idx) => (
              <Th key={idx} colSpan={2}>
                {combo.map(modeId => getModeName(modeId, modes)).join(' + ')}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {primaryRowDim.modes.map(primaryMode => (
            <React.Fragment key={primaryMode.id}>
              {getModeCombinations(secondaryRowDims).map((secondaryCombo, secondaryIdx) => (
                <Tr key={`${primaryMode.id}-${secondaryIdx}`}>
                  {secondaryIdx === 0 && (
                    <Td rowSpan={getModeCombinations(secondaryRowDims).length}>
                      {getModeName(primaryMode.id, modes)}
                    </Td>
                  )}
                  {columnCombinations.map((colCombo, colIdx) => {
                    const allModeIds = [primaryMode.id, ...secondaryCombo, ...colCombo].sort();
                    const key = allModeIds.join(',');
                    const value = valueMap.get(key);
                    return (
                      <Td key={colIdx}>
                        <Table size="sm" variant="simple">
                          <Tbody>
                            {secondaryCombo.map((modeId, modeIdx) => {
                              const allModeIds = [primaryMode.id, ...secondaryCombo, ...colCombo].sort();
                              const key = allModeIds.join(',');
                              const value = valueMap.get(key);
                              return (
                                <Tr key={modeIdx}>
                                  <Td>{getModeName(modeId, modes)}</Td>
                                  <Td>
                                    <Box display="flex" alignItems="center" gap={2}>
                                      {value ? (
                                        getValueEditor(value.value, allModeIds)
                                      ) : (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => onAddValue(allModeIds, getDefaultTokenValue(resolvedValueTypeId, resolvedValueTypes))}
                                        >
                                          Add value
                                        </Button>
                                      )}
                                      {value && (
                                        <IconButton
                                          aria-label="Remove value"
                                          icon={<Trash2 size={16} />}
                                          size="sm"
                                          variant="ghost"
                                          colorScheme="red"
                                          onClick={() => onDeleteValue(allModeIds)}
                                        />
                                      )}
                                    </Box>
                                  </Td>
                                </Tr>
                              );
                            })}
                          </Tbody>
                        </Table>
                      </Td>
                    );
                  })}
                </Tr>
              ))}
            </React.Fragment>
          ))}
        </Tbody>
      </Table>
    );
  }

  // If we have more than one column dimension, create nested tables
  if (columnDimensions.length > 1) {
    const primaryColDim = columnDimensions[0];
    const secondaryColDims = columnDimensions.slice(1);
    
    return (
      <Table size="sm" variant="simple">
        <Thead>
          <Tr>
            <Th>{rowDimensions[0]?.displayName}</Th>
            {primaryColDim.modes.map(primaryMode => (
              <Th key={primaryMode.id} colSpan={2}>
                {getModeName(primaryMode.id, modes)}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {rowCombinations.map((rowCombo, rowIdx) => (
            <Tr key={rowIdx}>
              <Td>{getModeName(rowCombo[0], modes)}</Td>
              {primaryColDim.modes.map(primaryMode => (
                <Td key={primaryMode.id}>
                  <Table size="sm" variant="simple">
                    <Thead>
                      <Tr>
                        {getModeCombinations(secondaryColDims).map((combo, idx) => (
                          <Th key={idx}>
                            {combo.map(modeId => getModeName(modeId, modes)).join(' + ')}
                          </Th>
                        ))}
                      </Tr>
                    </Thead>
                    <Tbody>
                      <Tr>
                        {getModeCombinations(secondaryColDims).map((combo, idx) => {
                          const allModeIds = [...rowCombo, primaryMode.id, ...combo].sort();
                          const key = allModeIds.join(',');
                          const value = valueMap.get(key);
                          return (
                            <Td key={idx}>
                              <Box display="flex" alignItems="center" gap={2}>
                                {value ? (
                                  getValueEditor(value.value, allModeIds)
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onAddValue(allModeIds, getDefaultTokenValue(resolvedValueTypeId, resolvedValueTypes))}
                                  >
                                    Add value
                                  </Button>
                                )}
                                {value && (
                                  <IconButton
                                    aria-label="Remove value"
                                    icon={<Trash2 size={16} />}
                                    size="sm"
                                    variant="ghost"
                                    colorScheme="red"
                                    onClick={() => onDeleteValue(allModeIds)}
                                  />
                                )}
                              </Box>
                            </Td>
                          );
                        })}
                      </Tr>
                    </Tbody>
                  </Table>
                </Td>
              ))}
            </Tr>
          ))}
        </Tbody>
      </Table>
    );
  }

  // Default case: simple table
  return (
    <Table size="sm" variant="simple">
      <Thead>
        <Tr>
          {rowDimensions.map(dim => (
            <Th key={dim.id}>{dim.displayName}</Th>
          ))}
          {columnCombinations.map((combo, idx) => (
            <Th key={idx}>
              {combo.map(modeId => getModeName(modeId, modes)).join(' + ')}
            </Th>
          ))}
        </Tr>
      </Thead>
      <Tbody>
        {rowCombinations.map((rowCombo, rowIdx) => (
          <Tr key={rowIdx}>
            {rowCombo.map(modeId => (
              <Td key={modeId}>
                <Text fontSize="sm">{getModeName(modeId, modes)}</Text>
              </Td>
            ))}
            {columnCombinations.map((colCombo, colIdx) => {
              const allModeIds = [...rowCombo, ...colCombo].sort();
              const key = allModeIds.join(',');
              const value = valueMap.get(key);
              return (
                <Td key={colIdx}>
                  <Box display="flex" alignItems="center" gap={2}>
                    {value ? (
                      getValueEditor(value.value, allModeIds)
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onAddValue(allModeIds, getDefaultTokenValue(resolvedValueTypeId, resolvedValueTypes))}
                      >
                        Add value
                      </Button>
                    )}
                    {value && (
                      <IconButton
                        aria-label="Remove value"
                        icon={<Trash2 size={16} />}
                        size="sm"
                        variant="ghost"
                        colorScheme="red"
                        onClick={() => onDeleteValue(allModeIds)}
                      />
                    )}
                  </Box>
                </Td>
              );
            })}
          </Tr>
        ))}
      </Tbody>
    </Table>
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
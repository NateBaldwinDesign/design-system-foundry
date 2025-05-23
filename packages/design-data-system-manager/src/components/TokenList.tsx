import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Text,
  Table,
  Tbody,
  Td,
  Th,
  Tr,
  Thead,
  Input,
  Button,
  Tag,
  TagLabel,
  TagCloseButton,
  HStack,
  VStack,
  IconButton,
  Tooltip,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Select,
  useDisclosure,
  Flex
} from '@chakra-ui/react';
import { EditIcon, DeleteIcon, AddIcon } from '@chakra-ui/icons';
import type { Token, TokenCollection, Mode, TokenValue, Dimension, Platform, Taxonomy } from '@token-model/data-model';
import { ValueByModeTable } from './ValueByModeTable';
import { PlatformOverridesTable } from './PlatformOverridesTable';
import { TokenValuePicker } from './TokenValuePicker';
import { TaxonomyPicker } from './TaxonomyPicker';
import { TokenEditorDialog } from './TokenEditorDialog';

// Extend the Token type to include themeable
type ExtendedToken = Token & { themeable?: boolean };

interface TokenListProps {
  tokens: ExtendedToken[];
  collections: TokenCollection[];
  modes: Mode[];
  dimensions: Dimension[];
  platforms: Platform[];
  onEdit: (token: ExtendedToken) => void;
  onDelete: (tokenId: string) => void;
  taxonomies: Taxonomy[];
  resolvedValueTypes: { id: string; displayName: string }[];
  onViewClassifications?: () => void;
}

interface TokenEditorProps {
  token: ExtendedToken;
  tokens: ExtendedToken[];
  dimensions: Dimension[];
  modes: Mode[];
  platforms: Platform[];
  open: boolean;
  onClose: () => void;
  onSave: (token: ExtendedToken) => void;
  taxonomies: Taxonomy[];
  resolvedValueTypes: { id: string; displayName: string }[];
  onViewClassifications?: () => void;
}

interface ContrastConstraint {
  type: 'contrast';
  rule: {
    minimum: number;
    comparator: TokenValue;
    method: 'WCAG21' | 'APCA' | 'Lstar';
  };
}

type Constraint = ContrastConstraint;

function TokenEditor({ token, tokens, dimensions, modes, platforms, open, onClose, onSave, taxonomies, resolvedValueTypes, onViewClassifications }: TokenEditorProps) {
  const [editedToken, setEditedToken] = useState<ExtendedToken & { constraints?: Constraint[] }>(token);
  const [newTaxonomyKey, setNewTaxonomyKey] = useState('');
  const [newTaxonomyValue, setNewTaxonomyValue] = useState('');
  const [newConstraintType, setNewConstraintType] = useState('contrast');
  const [newConstraintMin, setNewConstraintMin] = useState('');
  const [newConstraintComparator, setNewConstraintComparator] = useState('');
  const [newConstraintMethod, setNewConstraintMethod] = useState('WCAG21');

  // Only reset local state when the token or dialog open state changes
  useEffect(() => {
    setEditedToken(token);
  }, [token, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(editedToken);
  };

  const handleValueChange = (modeIndex: number, newValue: TokenValue) => {
    setEditedToken(prev => ({
      ...prev,
      valuesByMode: prev.valuesByMode.map((vbm, idx) => 
        idx === modeIndex ? { ...vbm, value: newValue } : vbm
      )
    }));
  };

  const handlePlatformOverrideChange = (platformId: string, modeIndex: number, newValue: TokenValue) => {
    setEditedToken(prev => ({
      ...prev,
      valuesByMode: prev.valuesByMode.map((vbm, idx) => {
        if (idx !== modeIndex) return vbm;
        
        const existingOverrides = vbm.platformOverrides || [];
        const existingOverrideIndex = existingOverrides.findIndex(po => po.platformId === platformId);
        
        // Convert value to string based on type
        let stringValue: string;
        if (newValue.type === 'ALIAS') {
          stringValue = newValue.tokenId;
        } else {
          stringValue = String(newValue.value);
        }
        
        // Create new platform override array
        const newOverrides = [...existingOverrides];
        if (existingOverrideIndex >= 0) {
          // Update existing override
          newOverrides[existingOverrideIndex] = {
            platformId,
            value: stringValue
          };
        } else {
          // Add new override
          newOverrides.push({
            platformId,
            value: stringValue
          });
        }
        
        return {
          ...vbm,
          platformOverrides: newOverrides
        };
      })
    }));
  };

  const handleFieldChange = (field: keyof ExtendedToken, value: any) => {
    setEditedToken(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddTaxonomy = () => {
    if (newTaxonomyKey && newTaxonomyValue) {
      setEditedToken(prev => ({
        ...prev,
        taxonomies: {
          ...prev.taxonomies,
          [newTaxonomyKey]: newTaxonomyValue
        }
      }));
      setNewTaxonomyKey('');
      setNewTaxonomyValue('');
    }
  };

  const handleRemoveTaxonomy = (key: string) => {
    setEditedToken(prev => {
      const newTaxonomies = { ...prev.taxonomies };
      delete (newTaxonomies as any)[key];
      return {
        ...prev,
        taxonomies: newTaxonomies
      };
    });
  };

  // Constraint handlers
  const handleAddConstraint = () => {
    if (newConstraintType === 'contrast' && newConstraintMin && newConstraintComparator) {
      setEditedToken(prev => ({
        ...prev,
        constraints: [
          ...((prev as any).constraints || []),
          {
            type: 'contrast',
            rule: {
              minimum: Number(newConstraintMin),
              comparator: { type: 'COLOR', value: newConstraintComparator },
              method: newConstraintMethod
            }
          }
        ]
      }));
      setNewConstraintMin('');
      setNewConstraintComparator('');
      setNewConstraintMethod('WCAG21');
    }
  };

  const handleRemoveConstraint = (idx: number) => {
    setEditedToken(prev => ({
      ...prev,
      constraints: (prev.constraints || []).filter((_, i: number) => i !== idx)
    }));
  };

  const handleEditConstraint = (idx: number, field: string, value: any) => {
    setEditedToken(prev => ({
      ...prev,
      constraints: (prev.constraints || []).map((c: Constraint, i: number) =>
        i === idx
          ? {
              ...c,
              rule: {
                ...c.rule,
                [field]: field === 'minimum' ? Number(value) : value
              }
            }
          : c
      )
    }));
  };

  const getValueEditor = (value: TokenValue | string, modeIndex: number, isOverride?: boolean, onChange?: (newValue: TokenValue) => void) => {
    if (typeof value === 'string') {
      return <Text variant="caption" color="text.secondary">{value}</Text>;
    }
    switch (value.type) {
      case 'COLOR':
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 24,
                height: 24,
                borderRadius: 1,
                border: '1px solid #ccc',
                backgroundColor: value.value
              }}
            />
            <Input
              size="sm"
              value={value.value}
              onChange={(e) => {
                const newValue = { type: 'COLOR' as const, value: e.target.value };
                if (onChange) {
                  onChange(newValue);
                } else {
                  handleValueChange(modeIndex, newValue);
                }
              }}
            />
          </Box>
        );
      case 'ALIAS':
        return (
          <FormControl size="sm" sx={{ minWidth: 200 }}>
            <Select
              value={value.tokenId}
              onChange={(e) => {
                const newValue = { type: 'ALIAS' as const, tokenId: e.target.value };
                if (onChange) {
                  onChange(newValue);
                } else {
                  handleValueChange(modeIndex, newValue);
                }
              }}
            >
              {tokens
                .filter(t => t.id !== token.id)
                .map(token => (
                  <option key={token.id} value={token.id}>
                    {token.displayName}
                  </option>
                ))}
            </Select>
          </FormControl>
        );
      case 'FLOAT':
        return (
          <Input
            size="sm"
            type="number"
            value={value.value}
            onChange={(e) => {
              const newValue = { type: 'FLOAT' as const, value: Number(e.target.value) };
              if (onChange) {
                onChange(newValue);
              } else {
                handleValueChange(modeIndex, newValue);
              }
            }}
          />
        );
      case 'INTEGER':
        return (
          <Input
            size="sm"
            type="number"
            value={value.value}
            onChange={(e) => {
              const newValue = { type: 'INTEGER' as const, value: Number(e.target.value) };
              if (onChange) {
                onChange(newValue);
              } else {
                handleValueChange(modeIndex, newValue);
              }
            }}
          />
        );
      case 'STRING':
        return (
          <Input
            size="sm"
            value={value.value}
            onChange={(e) => {
              const newValue = { type: 'STRING' as const, value: e.target.value };
              if (onChange) {
                onChange(newValue);
              } else {
                handleValueChange(modeIndex, newValue);
              }
            }}
          />
        );
      case 'BOOLEAN':
        return (
          <Tag
            size="sm"
            colorScheme={value.value ? "green" : "red"}
            onClick={() => {
              const newValue = { type: 'BOOLEAN' as const, value: !value.value };
              if (onChange) {
                onChange(newValue);
              } else {
                handleValueChange(modeIndex, newValue);
              }
            }}
          >
            {value.value ? "True" : "False"}
          </Tag>
        );
      default:
        return 'Unknown value type';
    }
  };

  const organizeValuesByDimensions = () => {
    if (!dimensions || dimensions.length === 0) {
      console.log('No dimensions available');
      return null;
    }

    // Find the two dimensions that have the most modes
    const dimensionsWithModes = dimensions
      .map(dim => ({
        dimension: dim,
        modeCount: dim.modes.length
      }))
      .sort((a, b) => b.modeCount - a.modeCount);

    if (dimensionsWithModes.length < 2) {
      console.log('Not enough dimensions with modes');
      return null;
    }

    const [rowDimension, colDimension] = dimensionsWithModes.slice(0, 2);

    // Create a map of mode IDs to their values
    const modeValueMap = new Map(
      editedToken.valuesByMode.map(vbm => [
        vbm.modeIds.sort().join(','),
        vbm
      ])
    );

    return {
      rowDimension: rowDimension.dimension,
      colDimension: colDimension.dimension,
      modeValueMap
    };
  };

  const getModeName = (modeId: string) => modes.find(m => m.id === modeId)?.name || modeId;
  const columns = Array.from(
    new Set(
      editedToken.valuesByMode
        .map(vbm => vbm.modeIds[0])
        .filter(id => !!id)
    )
  );
  columns.sort((a, b) => getModeName(a).localeCompare(getModeName(b)));
  const hasRows = editedToken.valuesByMode.some(vbm => vbm.modeIds.length > 1);
  let rows: string[] = [];
  if (hasRows) {
    rows = Array.from(
      new Set(
        editedToken.valuesByMode
          .map(vbm => vbm.modeIds[1])
          .filter(id => !!id)
      )
    );
    rows.sort((a, b) => getModeName(a).localeCompare(getModeName(b)));
  } else {
    rows = ['single'];
  }
  const valueMap = new Map(
    editedToken.valuesByMode.map((vbm, idx) => [vbm.modeIds.join(','), { vbm, idx }])
  );
  const allGlobal = editedToken.valuesByMode.every(vbm => vbm.modeIds.length === 0);

  const renderValueTable = () => {
    return (
      <Table variant="simple">
        {!allGlobal && (
          <Thead>
            <Tr>
              <Th></Th>
              {columns.map(colId => {
                const modeName = getModeName(colId);
                return (
                  <Th key={`header-${colId}`} textAlign="center">
                    {modeName !== colId ? modeName : 'Unknown Mode'}
                  </Th>
                );
              })}
            </Tr>
          </Thead>
        )}
        <Tbody>
          {rows.map(rowId => (
            <Tr key={`row-${rowId}`}>
              <Td>{hasRows ? getModeName(rowId) : ''}</Td>
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
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(editedToken);
  };

  return (
    <TokenEditorDialog
      token={token}
      tokens={tokens}
      dimensions={dimensions}
      modes={modes}
      platforms={platforms}
      open={open}
      onClose={onClose}
      onSave={onSave}
      taxonomies={taxonomies}
      isNew={false}
      resolvedValueTypes={resolvedValueTypes}
      onViewClassifications={onViewClassifications}
    />
  );
}

export function TokenList({ tokens, collections, modes, dimensions, platforms, onEdit, onDelete, taxonomies, resolvedValueTypes, onViewClassifications }: TokenListProps) {
  const [editingToken, setEditingToken] = useState<ExtendedToken | null>(null);

  // Filter state
  const [collectionFilter, setCollectionFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [privateFilter, setPrivateFilter] = useState<string>('');
  const [themeableFilter, setThemeableFilter] = useState<string>('');

  // Filtering logic
  const filteredTokens = useMemo(() => {
    return tokens.filter(token => {
      if (collectionFilter && token.tokenCollectionId !== collectionFilter) return false;
      if (typeFilter && token.resolvedValueType !== typeFilter) return false;
      if (statusFilter && token.status !== statusFilter) return false;
      if (privateFilter && String(token.private) !== privateFilter) return false;
      if (themeableFilter && String(token.themeable) !== themeableFilter) return false;
      return true;
    });
  }, [tokens, collectionFilter, typeFilter, statusFilter, privateFilter, themeableFilter]);

  // Unique values for filters
  const typeOptions = Array.from(new Set(tokens.map(t => t.resolvedValueType))).sort();
  const statusOptions = Array.from(new Set(tokens.map(t => t.status).filter(Boolean))).sort();

  // Add console logging to debug props
  console.log('TokenList props:', { tokens, collections, modes, dimensions });

  const getCollectionName = (collectionId: string) => {
    return collections.find(c => c.id === collectionId)?.name || collectionId;
  };

  const getModeNames = (modeIds: string[]) => {
    return modeIds.map(id => modes.find(m => m.id === id)?.name || id).join(', ');
  };

  const getValueDisplay = (value: TokenValue) => {
    switch (value.type) {
      case 'COLOR':
        return (
          <Box display="flex" alignItems="center" gap={2}>
            <Box w={6} h={6} borderRadius={2} border="1px solid #ccc" bg={value.value} />
            <Text fontSize="sm">{value.value}</Text>
          </Box>
        );
      case 'ALIAS':
        const aliasToken = tokens.find(t => t.id === value.tokenId);
        return (
          <Text fontSize="sm">
            {aliasToken?.displayName || value.tokenId}
          </Text>
        );
      case 'FLOAT':
      case 'INTEGER':
        return <Text fontSize="sm">{value.value}</Text>;
      case 'STRING':
        return <Text fontSize="sm">{value.value}</Text>;
      case 'BOOLEAN':
        return (
          <Tag colorScheme={value.value ? 'green' : 'red'} size="sm">
            {value.value ? 'True' : 'False'}
          </Tag>
        );
      default:
        return 'Unknown value type';
    }
  };

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4}>
        <Text fontSize="2xl" fontWeight="bold">Tokens</Text>
        <Button
          leftIcon={<AddIcon />}
          colorScheme="blue"
          size="sm"
          onClick={() => setEditingToken({
            id: '',
            displayName: '',
            tokenCollectionId: '',
            resolvedValueType: '',
            valuesByMode: [],
            status: 'experimental',
            private: false,
            themeable: false
          })}
        >
          Add Token
        </Button>
      </Flex>

      {/* Filter Controls */}
      <Flex direction='row' mb={4}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <FormLabel>Collection</FormLabel>
          <Select
            value={collectionFilter}
            onChange={e => setCollectionFilter(e.target.value)}
          >
            <option value="">All</option>
            {collections.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <FormLabel>Type</FormLabel>
          <Select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            <option value="">All</option>
            {typeOptions.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <FormLabel>Status</FormLabel>
          <Select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All</option>
            {statusOptions.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <FormLabel>Private</FormLabel>
          <Select
            value={privateFilter}
            onChange={e => setPrivateFilter(e.target.value)}
          >
            <option value="">All</option>
            <option value="true">Private</option>
            <option value="false">Public</option>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <FormLabel>Themeable</FormLabel>
          <Select
            value={themeableFilter}
            onChange={e => setThemeableFilter(e.target.value)}
          >
            <option value="">All</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </Select>
        </FormControl>
      </Flex>

      {/* Token Table */}
      <Box p={0} borderWidth={0} borderRadius="md">
        <Table variant="simple" size="sm">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Collection</Th>
              <Th>Type</Th>
              <Th>Status</Th>
              <Th>Private</Th>
              <Th>Themeable</Th>
              <Th>Values by Mode</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredTokens.map((token) => (
              <Tr key={token.id}>
                <Td>
                  <Text fontWeight="bold">{token.displayName}</Text>
                  {token.description && (
                    <Text fontSize="sm" color="gray.500">
                      {token.description}
                    </Text>
                  )}
                </Td>
                <Td>{getCollectionName(token.tokenCollectionId)}</Td>
                <Td>
                  <Tag colorScheme="blue" size="sm">{token.resolvedValueType}</Tag>
                </Td>
                <Td>
                  {token.status && (
                    <Tag colorScheme={
                      token.status === 'stable'
                        ? 'green'
                        : token.status === 'experimental'
                        ? 'yellow'
                        : 'red'
                    } size="sm">
                      {token.status}
                    </Tag>
                  )}
                </Td>
                <Td>
                  <Tag colorScheme={token.private ? 'gray' : 'green'} size="sm">
                    {token.private ? 'Private' : 'Public'}
                  </Tag>
                </Td>
                <Td>
                  <Tag colorScheme={token.themeable ? 'green' : 'gray'} size="sm">
                    {token.themeable ? 'Yes' : 'No'}
                  </Tag>
                </Td>
                <Td>
                  {token.valuesByMode.map((valueByMode, index) => (
                    <Box key={index} mb={1}>
                      <Text fontSize="xs" color="gray.500">
                        {getModeNames(valueByMode.modeIds)}:
                      </Text>
                      <Box mt={1}>
                        {getValueDisplay(valueByMode.value)}
                      </Box>
                    </Box>
                  ))}
                </Td>
                <Td>
                  <HStack spacing={1}>
                    <IconButton aria-label="Edit token" icon={<EditIcon />} onClick={() => setEditingToken(token)} size="sm" />
                    <IconButton aria-label="Delete token" icon={<DeleteIcon />} onClick={() => onDelete(token.id)} size="sm" />
                  </HStack>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      {editingToken && (
        <TokenEditorDialog
          token={editingToken}
          tokens={tokens}
          dimensions={dimensions || []}
          modes={modes}
          platforms={platforms}
          taxonomies={taxonomies}
          open={true}
          onClose={() => setEditingToken(null)}
          onSave={(updatedToken) => {
            onEdit(updatedToken);
            setEditingToken(null);
          }}
          isNew={!editingToken.id}
          resolvedValueTypes={resolvedValueTypes || []}
          onViewClassifications={onViewClassifications}
        />
      )}
    </Box>
  );
} 
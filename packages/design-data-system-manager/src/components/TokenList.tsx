import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Select,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure
} from '@chakra-ui/react';
import { FiEdit2, FiFilter, FiPlus, FiSearch, FiTrash2 } from 'react-icons/fi';
import type { Token, TokenStatus, TokenTaxonomyRef, ResolvedValueType, TokenValue } from '@token-model/data-model';
import { TokenEditorDialog } from './TokenEditorDialog';
import { TokenDeleteDialog } from './TokenDeleteDialog';

// Extend Token type to include themeable and resolvedValueTypeId
type ExtendedToken = Token & {
  themeable?: boolean;
  resolvedValueTypeId?: string;
};

interface TokenListProps {
  tokens: ExtendedToken[];
  taxonomies: TokenTaxonomyRef[];
  resolvedValueTypes: ResolvedValueType[];
  onTokenUpdate: (token: ExtendedToken) => void;
  onTokenDelete: (tokenId: string) => void;
  onTokenCreate: (token: ExtendedToken) => void;
}

export function TokenList({
  tokens,
  taxonomies,
  resolvedValueTypes,
  onTokenUpdate,
  onTokenDelete,
  onTokenCreate
}: TokenListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [collectionFilter, setCollectionFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<TokenStatus | ''>('');

  const {
    isOpen: isEditorOpen,
    onOpen: onEditorOpen,
    onClose: onEditorClose
  } = useDisclosure();

  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose
  } = useDisclosure();

  const [selectedToken, setSelectedToken] = useState<ExtendedToken | null>(null);

  // Generate type options for filtering
  const typeOptions = useMemo(() => {
    const standardTypes = resolvedValueTypes
      .filter(valueType => valueType.type)
      .map(valueType => ({
        value: valueType.id,
        label: `${valueType.displayName} (Standard)`,
        description: valueType.description
      }));

    const customTypes = resolvedValueTypes
      .filter(valueType => !valueType.type)
      .map(valueType => ({
        value: valueType.id,
        label: `${valueType.displayName} (Custom)`,
        description: valueType.description
      }));

    return [...standardTypes, ...customTypes];
  }, [resolvedValueTypes]);

  // Filter tokens based on search term and filters
  const filteredTokens = useMemo(() => {
    return tokens.filter(token => {
      const matchesSearch = token.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        token.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCollection = !collectionFilter || token.tokenCollectionId === collectionFilter;
      const matchesType = !typeFilter || token.resolvedValueTypeId === typeFilter;
      const matchesStatus = !statusFilter || token.status === statusFilter;

      return matchesSearch && matchesCollection && matchesType && matchesStatus;
    });
  }, [tokens, searchTerm, collectionFilter, typeFilter, statusFilter]);

  // Get unique collections for filter
  const collections = useMemo(() => {
    const uniqueCollections = new Set(tokens.map(token => token.tokenCollectionId));
    return Array.from(uniqueCollections).sort();
  }, [tokens]);

  // Get display name for a value type
  const getTypeDisplay = (typeId: string) => {
    const typeObj = resolvedValueTypes.find(vt => vt.id === typeId);
    if (!typeObj) return typeId;
    return `${typeObj.displayName} (${typeObj.type ? 'Standard' : 'Custom'})`;
  };

  // Get display for a token value
  const getValueDisplay = (token: ExtendedToken) => {
    if (!token.valuesByMode?.[0]?.value) return '-';

    const value = token.valuesByMode[0].value;
    switch (value.type) {
      case 'COLOR':
        return (
          <HStack spacing={2}>
            <Box
              w={4}
              h={4}
              borderRadius="sm"
              bg={value.value}
              border="1px solid"
              borderColor="gray.200"
            />
            <Text>{value.value}</Text>
          </HStack>
        );
      case 'DIMENSION':
      case 'SPACING':
      case 'FONT_SIZE':
      case 'LINE_HEIGHT':
      case 'LETTER_SPACING':
      case 'DURATION':
      case 'BLUR':
      case 'SPREAD':
      case 'RADIUS':
        return `${value.value}px`;
      case 'FONT_WEIGHT':
        return value.value.toString();
      case 'FONT_FAMILY':
      case 'CUBIC_BEZIER':
        return value.value;
      case 'ALIAS':
        const aliasToken = tokens.find(t => t.id === value.tokenId);
        return aliasToken ? aliasToken.displayName : value.tokenId;
      default:
        return '-';
    }
  };

  const handleEdit = (token: ExtendedToken) => {
    setSelectedToken(token);
    onEditorOpen();
  };

  const handleDelete = (token: ExtendedToken) => {
    setSelectedToken(token);
    onDeleteOpen();
  };

  const handleCreate = () => {
    setSelectedToken(null);
    onEditorOpen();
  };

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4}>
        <InputGroup maxW="400px">
          <InputLeftElement pointerEvents="none">
            <Icon as={FiSearch} color="gray.400" />
          </InputLeftElement>
          <Input
            placeholder="Search tokens..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>

        <HStack spacing={4}>
          <Select
            placeholder="Collection"
            value={collectionFilter}
            onChange={(e) => setCollectionFilter(e.target.value)}
            maxW="200px"
          >
            {collections.map(collection => (
              <option key={collection} value={collection}>
                {collection}
              </option>
            ))}
          </Select>

          <Select
            placeholder="Type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            maxW="200px"
          >
            {typeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Select
            placeholder="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TokenStatus | '')}
            maxW="200px"
          >
            <option value="DRAFT">Draft</option>
            <option value="REVIEW">Review</option>
            <option value="APPROVED">Approved</option>
            <option value="DEPRECATED">Deprecated</option>
          </Select>

          <Button
            leftIcon={<Icon as={FiPlus} />}
            colorScheme="blue"
            onClick={handleCreate}
          >
            Create Token
          </Button>
        </HStack>
      </Flex>

      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Name</Th>
            <Th>Collection</Th>
            <Th>Type</Th>
            <Th>Value</Th>
            <Th>Status</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {filteredTokens.map(token => (
            <Tr key={token.id}>
              <Td>{token.displayName}</Td>
              <Td>{token.tokenCollectionId}</Td>
              <Td>{getTypeDisplay(token.resolvedValueTypeId || '')}</Td>
              <Td>{getValueDisplay(token)}</Td>
              <Td>{token.status}</Td>
              <Td>
                <HStack spacing={2}>
                  <IconButton
                    aria-label="Edit token"
                    icon={<Icon as={FiEdit2} />}
                    size="sm"
                    onClick={() => handleEdit(token)}
                  />
                  <IconButton
                    aria-label="Delete token"
                    icon={<Icon as={FiTrash2} />}
                    size="sm"
                    colorScheme="red"
                    onClick={() => handleDelete(token)}
                  />
                </HStack>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      {selectedToken && (
        <TokenEditorDialog
          isOpen={isEditorOpen}
          onClose={onEditorClose}
          token={selectedToken}
          taxonomies={taxonomies}
          resolvedValueTypes={resolvedValueTypes}
          onSave={onTokenUpdate}
        />
      )}

      {selectedToken && (
        <TokenDeleteDialog
          isOpen={isDeleteOpen}
          onClose={onDeleteClose}
          token={selectedToken}
          onDelete={onTokenDelete}
        />
      )}
    </Box>
  );
} 
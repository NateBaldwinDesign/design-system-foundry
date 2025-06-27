import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  VStack,
  HStack,
  Text,
  Box,
  Badge,
  useColorMode,
  Alert,
  AlertIcon,
  AlertDescription,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Checkbox,
  Spinner
} from '@chakra-ui/react';
import { ExternalLink, Check, AlertTriangle } from 'lucide-react';
import type { FigmaTransformationResult } from '@token-model/data-transformations';
import type { TokenSystem } from '@token-model/data-model';

interface FigmaPrePublishDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (selectedVariables: string[], selectedCollections: string[]) => void;
  transformationResult: FigmaTransformationResult;
  tokenSystem: TokenSystem;
  figmaFileId: string;
  accessToken: string;
}

interface ComparisonItem {
  id: string;
  name: string;
  type: 'variable' | 'collection' | 'mode';
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  currentValue?: Record<string, unknown>;
  newValue: Record<string, unknown>;
  hasConflict: boolean;
  conflictDetails?: string;
}

export const FigmaPrePublishDialog: React.FC<FigmaPrePublishDialogProps> = ({
  isOpen,
  onClose,
  onPublish,
  transformationResult,
  figmaFileId,
  accessToken
}) => {
  const { colorMode } = useColorMode();
  
  const [loading, setLoading] = useState(false);
  const [existingVariables, setExistingVariables] = useState<{
    variables?: Record<string, Record<string, unknown>>;
    variableCollections?: Record<string, Record<string, unknown>>;
  } | null>(null);
  const [comparisonItems, setComparisonItems] = useState<ComparisonItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState(0);

  // Load existing Figma variables when dialog opens
  useEffect(() => {
    if (isOpen && figmaFileId && accessToken) {
      loadExistingVariables();
    }
  }, [isOpen, figmaFileId, accessToken]);

  // Generate comparison when both existing and new data are available
  useEffect(() => {
    if (existingVariables && transformationResult) {
      generateComparison();
    }
  }, [existingVariables, transformationResult]);

  const loadExistingVariables = async () => {
    setLoading(true);
    try {
      // This would call the Figma API to get existing variables
      // For now, we'll simulate this with empty data
      const response = await fetch(`https://api.figma.com/v1/files/${figmaFileId}/variables`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setExistingVariables(data);
      } else if (response.status === 404) {
        // 404 means no variables exist in the file - this is normal for new files
        console.log('[FigmaPrePublishDialog] No existing variables found in file (404) - treating as empty file');
        setExistingVariables({ variables: {}, variableCollections: {} });
      } else {
        // Other error status codes - log the error but still assume no existing variables
        console.warn('[FigmaPrePublishDialog] Failed to load existing variables:', response.status, response.statusText);
        setExistingVariables({ variables: {}, variableCollections: {} });
      }
    } catch (error) {
      console.error('Failed to load existing variables:', error);
      // Assume no existing variables on error
      setExistingVariables({ variables: {}, variableCollections: {} });
    } finally {
      setLoading(false);
    }
  };

  const generateComparison = () => {
    const items: ComparisonItem[] = [];

    // Compare collections
    transformationResult.collections.forEach(collection => {
      const existing = existingVariables?.variableCollections?.[collection.id];
      const item: ComparisonItem = {
        id: collection.id,
        name: collection.name,
        type: 'collection',
        action: existing ? 'UPDATE' : 'CREATE',
        currentValue: existing ? { name: existing.name, initialModeId: existing.initialModeId } : undefined,
        newValue: { name: collection.name, initialModeId: collection.initialModeId },
        hasConflict: existing ? (existing.name !== collection.name || existing.initialModeId !== collection.initialModeId) : false
      };
      items.push(item);
    });

    // Compare variables
    transformationResult.variables.forEach(variable => {
      const existing = existingVariables?.variables?.[variable.id];
      const item: ComparisonItem = {
        id: variable.id,
        name: variable.name,
        type: 'variable',
        action: existing ? 'UPDATE' : 'CREATE',
        currentValue: existing ? {
          name: existing.name,
          resolvedType: existing.resolvedType,
          variableCollectionId: existing.variableCollectionId
        } : undefined,
        newValue: {
          name: variable.name,
          resolvedType: variable.resolvedType,
          variableCollectionId: variable.variableCollectionId
        },
        hasConflict: existing ? (
          existing.name !== variable.name ||
          existing.resolvedType !== variable.resolvedType ||
          existing.variableCollectionId !== variable.variableCollectionId
        ) : false
      };
      items.push(item);
    });

    // Compare modes
    transformationResult.variableModes.forEach(mode => {
      const item: ComparisonItem = {
        id: mode.id,
        name: mode.name,
        type: 'mode',
        action: 'CREATE', // Modes are typically created with collections
        newValue: { name: mode.name, variableCollectionId: mode.variableCollectionId },
        hasConflict: false
      };
      items.push(item);
    });

    setComparisonItems(items);
    
    // Auto-select all items by default
    setSelectedItems(new Set(items.map(item => item.id)));
  };

  const handleItemToggle = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    setSelectedItems(new Set(comparisonItems.map(item => item.id)));
  };

  const handleDeselectAll = () => {
    setSelectedItems(new Set());
  };

  const handlePublish = () => {
    const selectedVariables = comparisonItems
      .filter(item => selectedItems.has(item.id) && item.type === 'variable')
      .map(item => item.id);
    
    const selectedCollections = comparisonItems
      .filter(item => selectedItems.has(item.id) && item.type === 'collection')
      .map(item => item.id);

    onPublish(selectedVariables, selectedCollections);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'green';
      case 'UPDATE': return 'blue';
      case 'DELETE': return 'red';
      default: return 'gray';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'variable': return '🔧';
      case 'collection': return '📁';
      case 'mode': return '🎛️';
      default: return '📄';
    }
  };

  const hasConflicts = comparisonItems.some(item => item.hasConflict);
  const selectedCount = selectedItems.size;
  const totalCount = comparisonItems.length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxW="1200px">
        <ModalHeader>
          <VStack align="start" spacing={2}>
            <Text fontSize="xl" fontWeight="bold">Pre-Publish Review</Text>
            <Text fontSize="sm" color="gray.500">
              Review changes before publishing to Figma
            </Text>
          </VStack>
        </ModalHeader>

        <ModalBody>
          {loading ? (
            <VStack spacing={4} py={8}>
              <Spinner size="lg" />
              <Text>Loading existing Figma variables...</Text>
            </VStack>
          ) : (
            <VStack spacing={6} align="stretch">
              {/* Summary Stats */}
              <Box p={4} bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'} borderRadius="md">
                <HStack justify="space-between" mb={3}>
                  <Text fontWeight="bold">Summary</Text>
                  <HStack spacing={4}>
                    <Badge colorScheme="green">{transformationResult.stats.created} to create</Badge>
                    <Badge colorScheme="blue">{transformationResult.stats.updated} to update</Badge>
                    <Badge colorScheme="purple">{transformationResult.collections.length} collections</Badge>
                    <Badge colorScheme="orange">{transformationResult.variableModes.length} modes</Badge>
                  </HStack>
                </HStack>
                <Text fontSize="sm" color="gray.500">
                  {selectedCount} of {totalCount} items selected for publishing
                </Text>
              </Box>

              {/* Conflict Warning */}
              {hasConflicts && (
                <Alert status="warning" borderRadius="md">
                  <AlertIcon />
                  <AlertDescription>
                    Some items have conflicts with existing Figma variables. Review carefully before publishing.
                  </AlertDescription>
                </Alert>
              )}

              {/* Selection Controls */}
              <HStack justify="space-between">
                <HStack spacing={3}>
                  <Button size="sm" variant="outline" onClick={handleSelectAll}>
                    Select All
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleDeselectAll}>
                    Deselect All
                  </Button>
                </HStack>
                <Text fontSize="sm" color="gray.500">
                  {selectedCount} selected
                </Text>
              </HStack>

              {/* Comparison Tabs */}
              <Tabs index={activeTab} onChange={setActiveTab}>
                <TabList>
                  <Tab>All Items ({comparisonItems.length})</Tab>
                  <Tab>Collections ({comparisonItems.filter(i => i.type === 'collection').length})</Tab>
                  <Tab>Variables ({comparisonItems.filter(i => i.type === 'variable').length})</Tab>
                  <Tab>Modes ({comparisonItems.filter(i => i.type === 'mode').length})</Tab>
                  {hasConflicts && (
                    <Tab color="orange.500">
                      Conflicts ({comparisonItems.filter(i => i.hasConflict).length})
                    </Tab>
                  )}
                </TabList>

                <TabPanels>
                  <TabPanel>
                    <ComparisonTable 
                      items={comparisonItems}
                      selectedItems={selectedItems}
                      onItemToggle={handleItemToggle}
                      getActionColor={getActionColor}
                      getTypeIcon={getTypeIcon}
                    />
                  </TabPanel>
                  <TabPanel>
                    <ComparisonTable 
                      items={comparisonItems.filter(i => i.type === 'collection')}
                      selectedItems={selectedItems}
                      onItemToggle={handleItemToggle}
                      getActionColor={getActionColor}
                      getTypeIcon={getTypeIcon}
                    />
                  </TabPanel>
                  <TabPanel>
                    <ComparisonTable 
                      items={comparisonItems.filter(i => i.type === 'variable')}
                      selectedItems={selectedItems}
                      onItemToggle={handleItemToggle}
                      getActionColor={getActionColor}
                      getTypeIcon={getTypeIcon}
                    />
                  </TabPanel>
                  <TabPanel>
                    <ComparisonTable 
                      items={comparisonItems.filter(i => i.type === 'mode')}
                      selectedItems={selectedItems}
                      onItemToggle={handleItemToggle}
                      getActionColor={getActionColor}
                      getTypeIcon={getTypeIcon}
                    />
                  </TabPanel>
                  {hasConflicts && (
                    <TabPanel>
                      <ComparisonTable 
                        items={comparisonItems.filter(i => i.hasConflict)}
                        selectedItems={selectedItems}
                        onItemToggle={handleItemToggle}
                        getActionColor={getActionColor}
                        getTypeIcon={getTypeIcon}
                      />
                    </TabPanel>
                  )}
                </TabPanels>
              </Tabs>
            </VStack>
          )}
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handlePublish}
              isDisabled={selectedCount === 0}
              leftIcon={<ExternalLink size={16} />}
            >
              Publish to Figma ({selectedCount} items)
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

// Comparison Table Component
interface ComparisonTableProps {
  items: ComparisonItem[];
  selectedItems: Set<string>;
  onItemToggle: (itemId: string) => void;
  getActionColor: (action: string) => string;
  getTypeIcon: (type: string) => string;
}

const ComparisonTable: React.FC<ComparisonTableProps> = ({
  items,
  selectedItems,
  onItemToggle,
  getActionColor,
  getTypeIcon
}) => {
  const { colorMode } = useColorMode();

  return (
    <Box overflowX="auto">
      <Table variant="simple" size="sm">
        <Thead>
          <Tr>
            <Th width="50px">
              <Checkbox
                isChecked={items.length > 0 && items.every(item => selectedItems.has(item.id))}
                isIndeterminate={items.some(item => selectedItems.has(item.id)) && !items.every(item => selectedItems.has(item.id))}
                onChange={(e) => {
                  if (e.target.checked) {
                    items.forEach(item => onItemToggle(item.id));
                  } else {
                    items.forEach(item => onItemToggle(item.id));
                  }
                }}
              />
            </Th>
            <Th>Type</Th>
            <Th>Name</Th>
            <Th>Action</Th>
            <Th>Current Value</Th>
            <Th>New Value</Th>
            <Th>Status</Th>
          </Tr>
        </Thead>
        <Tbody>
          {items.map((item) => (
            <Tr key={item.id}>
              <Td>
                <Checkbox
                  isChecked={selectedItems.has(item.id)}
                  onChange={() => onItemToggle(item.id)}
                />
              </Td>
              <Td>
                <HStack spacing={2}>
                  <Text>{getTypeIcon(item.type)}</Text>
                  <Text fontSize="xs" textTransform="uppercase">
                    {item.type}
                  </Text>
                </HStack>
              </Td>
              <Td>
                <Text fontWeight="medium">{item.name}</Text>
                <Text fontSize="xs" color="gray.500" fontFamily="mono">
                  {item.id}
                </Text>
              </Td>
              <Td>
                <Badge colorScheme={getActionColor(item.action)}>
                  {item.action}
                </Badge>
              </Td>
              <Td>
                {item.currentValue ? (
                  <Box fontSize="xs" fontFamily="mono" p={2} bg={colorMode === 'dark' ? 'gray.800' : 'gray.100'} borderRadius="md">
                    {JSON.stringify(item.currentValue, null, 2)}
                  </Box>
                ) : (
                  <Text fontSize="xs" color="gray.400">—</Text>
                )}
              </Td>
              <Td>
                <Box fontSize="xs" fontFamily="mono" p={2} bg={colorMode === 'dark' ? 'gray.800' : 'gray.100'} borderRadius="md">
                  {JSON.stringify(item.newValue, null, 2)}
                </Box>
              </Td>
              <Td>
                {item.hasConflict ? (
                  <HStack spacing={1}>
                    <AlertTriangle size={14} color="orange" />
                    <Text fontSize="xs" color="orange.500">Conflict</Text>
                  </HStack>
                ) : (
                  <HStack spacing={1}>
                    <Check size={14} color="green" />
                    <Text fontSize="xs" color="green.500">OK</Text>
                  </HStack>
                )}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}; 
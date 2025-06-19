import 'katex/dist/katex.min.css';
import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  IconButton,
  useColorMode,
  Input,
  Textarea,
  useToast,
  Badge,
  Select,
  Divider,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  FormControl,
  FormLabel,
  Checkbox
} from '@chakra-ui/react';
import { Plus, Trash2, GripVertical, Save, Edit } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Algorithm, Variable, Formula, Condition, AlgorithmStep } from '../types/algorithm';
import { FormulaEditor } from './FormulaEditor';
import { BlockMath } from 'react-katex';
import { TokenGenerationService } from '../services/tokenGenerationService';
import { StorageService } from '../services/storage';
import { generateId } from '../utils/id';
import type { Token } from '@token-model/data-model';
import type { Taxonomy, ResolvedValueType } from '@token-model/data-model';
import { TaxonomyPicker } from './TaxonomyPicker';

interface AlgorithmEditorProps {
  algorithm?: Algorithm;
  onSave?: (algorithm: Algorithm) => void;
}

const defaultAlgorithm: Algorithm = {
  id: generateId('algorithm'),
  name: 'New Algorithm',
  resolvedValueTypeId: 'color',
  variables: [],
  formulas: [],
  conditions: [],
  steps: [],
  tokenGeneration: {
    enabled: false,
    iterationRange: { start: -2, end: 8, step: 1 },
    bulkAssignments: {
      resolvedValueTypeId: 'color',
      taxonomies: [],
      tokenTier: 'PRIMITIVE',
      private: false,
      status: 'stable',
      themeable: false
    },
    logicalMapping: {
      scaleType: 'numeric',
      defaultValue: '100',
      increasingStep: 100,
      decreasingStep: 25,
      extraPrefix: 'X',
      incrementDirection: 'ascending',
      taxonomyId: undefined,
      newTaxonomyName: undefined
    }
  }
};

export const AlgorithmEditor: React.FC<AlgorithmEditorProps> = ({ 
  algorithm = defaultAlgorithm, 
  onSave = () => {} 
}) => {
  const { colorMode } = useColorMode();
  const toast = useToast();
  const [currentAlgorithm, setCurrentAlgorithm] = useState<Algorithm>(() => {
    if (algorithm) {
      return { ...algorithm };
    }
    return defaultAlgorithm;
  });

  // Sync currentAlgorithm with algorithm prop
  useEffect(() => {
    setCurrentAlgorithm(algorithm ? { ...algorithm } : defaultAlgorithm);
  }, [algorithm]);

  const [newVariable, setNewVariable] = React.useState<Partial<Variable>>({
    name: '',
    type: 'number' as const,
    defaultValue: ''
  });

  const [newStep, setNewStep] = React.useState<Partial<AlgorithmStep>>({
    type: 'formula',
    id: '',
    name: ''
  });

  const [editingVariableId, setEditingVariableId] = useState<string | null>(null);
  const [editingVariable, setEditingVariable] = useState<Partial<Variable>>({});
  const [generatedTokens, setGeneratedTokens] = useState<Token[]>([]);
  const [generationErrors, setGenerationErrors] = useState<string[]>([]);

  // State for filtered taxonomies
  const [filteredTaxonomies, setFilteredTaxonomies] = useState<Taxonomy[]>([]);
  const [selectedTaxonomies, setSelectedTaxonomies] = useState<Array<{ taxonomyId: string; termId: string }>>([]);
  const [resolvedValueTypes, setResolvedValueTypes] = useState<ResolvedValueType[]>([]);

  // Load and filter taxonomies when algorithm changes or window regains focus
  useEffect(() => {
    const loadTaxonomies = () => {
      const allTaxonomies = StorageService.getTaxonomies() as Taxonomy[];
      const currentValueTypeId = currentAlgorithm.tokenGeneration?.bulkAssignments?.resolvedValueTypeId;
      if (currentValueTypeId) {
        const filtered = allTaxonomies.filter(taxonomy => 
          Array.isArray(taxonomy.resolvedValueTypeIds) && 
          taxonomy.resolvedValueTypeIds.includes(currentValueTypeId)
        );
        setFilteredTaxonomies(filtered);
      } else {
        setFilteredTaxonomies([]);
      }
    };
    loadTaxonomies();
    window.addEventListener('focus', loadTaxonomies);
    return () => {
      window.removeEventListener('focus', loadTaxonomies);
    };
  }, [currentAlgorithm.tokenGeneration?.bulkAssignments?.resolvedValueTypeId]);

  // Update selected taxonomies when algorithm changes
  useEffect(() => {
    const currentTaxonomies = currentAlgorithm.tokenGeneration?.bulkAssignments?.taxonomies || [];
    setSelectedTaxonomies(currentTaxonomies);
  }, [currentAlgorithm.tokenGeneration?.bulkAssignments?.taxonomies]);

  // Load resolved value types from storage
  useEffect(() => {
    const valueTypes = StorageService.getValueTypes();
    setResolvedValueTypes(valueTypes);
    if (valueTypes.length > 0) {
      setCurrentAlgorithm(prev => {
        const hasValidType = valueTypes.some(vt => vt.id === prev.resolvedValueTypeId);
        if (!hasValidType) {
          return {
            ...prev,
            resolvedValueTypeId: valueTypes[0].id
          };
        }
        return prev;
      });
    }
  }, []);

  // Handler for taxonomy changes
  const handleTaxonomyChange = (newTaxonomies: Array<{ taxonomyId: string; termId: string }>) => {
    setSelectedTaxonomies(newTaxonomies);
    setCurrentAlgorithm(prev => ({
      ...prev,
      tokenGeneration: {
        ...prev.tokenGeneration!,
        bulkAssignments: {
          ...prev.tokenGeneration!.bulkAssignments,
          taxonomies: newTaxonomies
        }
      }
    }));
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(currentAlgorithm.steps);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setCurrentAlgorithm(prev => ({
      ...prev,
      steps: items
    }));
  };

  const handleAddVariable = () => {
    if (!newVariable.name?.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a variable name',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }
    
    if (!newVariable.type) {
      toast({
        title: 'Error',
        description: 'Please select a variable type',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    const variable: Variable = {
      id: generateId('var'),
      name: newVariable.name,
      type: newVariable.type,
      defaultValue: newVariable.defaultValue
    };

    setCurrentAlgorithm(prev => ({
      ...prev,
      variables: [...prev.variables, variable]
    }));

    setNewVariable({
      name: '',
      type: 'number',
      defaultValue: ''
    });
  };

  const handleAddCondition = () => {
    const newConditionItem: Condition = {
      id: generateId('cond'),
      name: '',
      expression: '',
      variableIds: []
    };
    const updatedAlgorithm = {
      ...currentAlgorithm,
      conditions: [...(currentAlgorithm.conditions || []), newConditionItem]
    };
    setCurrentAlgorithm(updatedAlgorithm);
  };

  const handleAddStep = () => {
    if (!newStep.id || !newStep.name || !newStep.type) {
      toast({
        title: 'Error',
        description: 'Please select a formula or condition',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    const step: AlgorithmStep = {
      type: newStep.type,
      id: newStep.id,
      name: newStep.name
    };

    setCurrentAlgorithm(prev => ({
      ...prev,
      steps: [...prev.steps, step]
    }));

    setNewStep({
      type: 'formula',
      id: '',
      name: ''
    });
  };

  const handleDeleteVariable = (id: string) => {
    setCurrentAlgorithm(prev => ({
      ...prev,
      variables: prev.variables.filter(v => v.id !== id)
    }));
  };

  const handleDeleteStep = (index: number) => {
    setCurrentAlgorithm(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index)
    }));
  };

  const handleSave = () => {
    // Validate algorithm name (required)
    if (!currentAlgorithm.name?.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an algorithm name',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    // Validate variables (name and type are required)
    for (const variable of currentAlgorithm.variables) {
      if (!variable.name?.trim()) {
        toast({
          title: 'Error',
          description: `Variable "${variable.id}" is missing a name`,
          status: 'error',
          duration: 3000,
          isClosable: true
        });
        return;
      }
      if (!variable.type) {
        toast({
          title: 'Error',
          description: `Variable "${variable.name}" is missing a type`,
          status: 'error',
          duration: 3000,
          isClosable: true
        });
        return;
      }
    }

    // Validate formulas (name is required)
    for (const formula of currentAlgorithm.formulas || []) {
      if (!formula.name?.trim()) {
        toast({
          title: 'Error',
          description: `Formula "${formula.id}" is missing a name`,
          status: 'error',
          duration: 3000,
          isClosable: true
        });
        return;
      }
    }

    // Validate conditions (name is required)
    for (const condition of currentAlgorithm.conditions || []) {
      if (!condition.name?.trim()) {
        toast({
          title: 'Error',
          description: `Condition "${condition.id}" is missing a name`,
          status: 'error',
          duration: 3000,
          isClosable: true
        });
        return;
      }
    }

    // Save the algorithm
    onSave(currentAlgorithm);

    // Generate tokens if token generation is enabled
    if (currentAlgorithm.tokenGeneration?.enabled) {
      try {
        const existingTokens = StorageService.getTokens();
        const collections = StorageService.getCollections();
        const taxonomies = StorageService.getTaxonomies();

        const { tokens, errors, newTaxonomies, updatedTaxonomies } = TokenGenerationService.generateTokens(
          currentAlgorithm,
          existingTokens,
          collections,
          taxonomies,
          true // Modify taxonomies in place for actual saving
        );

        console.log('AlgorithmEditor: Received from TokenGenerationService:', {
          tokensCount: tokens.length,
          errorsCount: errors.length,
          newTaxonomiesCount: newTaxonomies?.length || 0,
          updatedTaxonomiesCount: updatedTaxonomies?.length || 0,
          newTaxonomies: newTaxonomies,
          updatedTaxonomies: updatedTaxonomies
        });

        // Save new taxonomies if any were created
        if (newTaxonomies && newTaxonomies.length > 0) {
          const updatedTaxonomiesList = [...taxonomies, ...newTaxonomies];
          StorageService.setTaxonomies(updatedTaxonomiesList);
          console.log('AlgorithmEditor: Saved new taxonomies:', newTaxonomies);
        }

        // Save updated taxonomies if any were modified
        if (updatedTaxonomies && updatedTaxonomies.length > 0) {
          const updatedTaxonomiesList = taxonomies.map(taxonomy => {
            const updatedTaxonomy = updatedTaxonomies.find(ut => ut.id === taxonomy.id);
            return updatedTaxonomy || taxonomy;
          });
          StorageService.setTaxonomies(updatedTaxonomiesList);
          console.log('AlgorithmEditor: Saved updated taxonomies:', updatedTaxonomies);
        }

        if (errors.length > 0) {
          toast({
            title: 'Token Generation Errors',
            description: `Generated ${tokens.length} tokens with ${errors.length} errors. Check the preview for details.`,
            status: 'warning',
            duration: 5000,
            isClosable: true
          });
        }

        if (tokens.length > 0) {
          // Merge generated tokens with existing tokens
          const updatedTokens = [...existingTokens, ...tokens];
          StorageService.setTokens(updatedTokens);

          console.log('new tokens', tokens);

          toast({
            title: 'Success',
            description: `Algorithm saved and ${tokens.length} tokens generated successfully!`,
            status: 'success',
            duration: 3000,
            isClosable: true
          });
        }
      } catch (error) {
        toast({
          title: 'Token Generation Failed',
          description: `Algorithm saved but token generation failed: ${error}`,
          status: 'error',
          duration: 5000,
          isClosable: true
        });
      }
    } else {
      toast({
        title: 'Success',
        description: 'Algorithm saved successfully!',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    }
  };

  const handleVariableTypeChange = (type: Variable['type']) => {
    setNewVariable(prev => ({
      ...prev,
      type
    }));
  };

  const handleVariableDefaultValueChange = (value: string) => {
    setNewVariable(prev => ({
      ...prev,
      defaultValue: value
    }));
  };

  const handleEditVariable = (variable: Variable) => {
    setEditingVariableId(variable.id);
    setEditingVariable({
      name: variable.name,
      type: variable.type,
      defaultValue: variable.defaultValue
    });
  };

  const handleSaveEditVariable = () => {
    if (!editingVariableId) {
      toast({
        title: 'Error',
        description: 'No variable selected for editing',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }
    
    if (!editingVariable.name?.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a variable name',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }
    
    if (!editingVariable.type) {
      toast({
        title: 'Error',
        description: 'Please select a variable type',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    setCurrentAlgorithm(prev => ({
      ...prev,
      variables: prev.variables.map(v => 
        v.id === editingVariableId 
          ? { 
              ...v, 
              name: editingVariable.name!, 
              type: editingVariable.type!, 
              defaultValue: editingVariable.defaultValue 
            }
          : v
      )
    }));

    setEditingVariableId(null);
    setEditingVariable({});
  };

  const handleCancelEdit = () => {
    setEditingVariableId(null);
    setEditingVariable({});
  };

  const generatePreviewTokens = () => {
    if (!currentAlgorithm.tokenGeneration?.enabled) {
      setGeneratedTokens([]);
      setGenerationErrors([]);
      return;
    }

    try {
      const existingTokens = StorageService.getTokens();
      const collections = StorageService.getCollections();
      const taxonomies = StorageService.getTaxonomies();

      const { tokens, errors } = TokenGenerationService.generateTokens(
        currentAlgorithm,
        existingTokens,
        collections,
        taxonomies,
        false // Don't modify taxonomies in place for preview
      );

      setGeneratedTokens(tokens);
      setGenerationErrors(errors);
    } catch (error) {
      setGenerationErrors([`Preview generation failed: ${error}`]);
      setGeneratedTokens([]);
    }
  };

  // Generate preview tokens when algorithm changes
  useEffect(() => {
    generatePreviewTokens();
  }, [currentAlgorithm]);

  const handleAddFormula = () => {
    const newFormula: Formula = {
      id: generateId('formula'),
      name: '',
      expressions: {
        latex: { value: '' },
        javascript: { 
          value: '',
          metadata: {
            allowedOperations: ['math']
          }
        }
      },
      description: '',
      variableIds: []
    };
    const updatedAlgorithm = {
      ...currentAlgorithm,
      formulas: [...(currentAlgorithm.formulas || []), newFormula]
    };
    setCurrentAlgorithm(updatedAlgorithm);
  };

  return (
    <Box>
      <VStack spacing={6} align="stretch">
        {/* Basic Information */}
        <VStack spacing={4} align="stretch">
          <Text fontSize="lg" fontWeight="bold">Basic Information</Text>
          <FormControl isRequired>
            <FormLabel>Algorithm Name</FormLabel>
            <Input
              placeholder="Algorithm Name"
              value={currentAlgorithm.name}
              onChange={e => setCurrentAlgorithm(prev => ({ ...prev, name: e.target.value }))}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Description</FormLabel>
            <Textarea
              placeholder="Description (optional)"
              value={currentAlgorithm.description}
              onChange={e => setCurrentAlgorithm(prev => ({ ...prev, description: e.target.value }))}
            />
          </FormControl>
        </VStack>

        <Divider />

        {/* Tabs Section */}
        <Tabs>
          <TabList>
            <Tab>Variables</Tab>
            <Tab>Formulas</Tab>
            <Tab>Conditions</Tab>
            <Tab>Token Generation</Tab>
            <Tab>Algorithm Steps</Tab>
            <Tab>Preview</Tab>
          </TabList>

          <TabPanels>
            {/* Variables Tab */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                <HStack spacing={4} justify="start">
                  <FormControl isRequired>
                    <FormLabel>Variable Name</FormLabel>
                    <Input
                      placeholder="Variable Name"
                      value={newVariable.name}
                      onChange={e => setNewVariable(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel>Type</FormLabel>
                    <Select
                      value={newVariable.type}
                      onChange={e => handleVariableTypeChange(e.target.value as Variable['type'])}
                    >
                      <option value="number">Number</option>
                      <option value="string">String</option>
                      <option value="boolean">Boolean</option>
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel>Default Value</FormLabel>
                    <Input
                      placeholder="Default Value (optional)"
                      value={newVariable.defaultValue?.toString() || ''}
                      onChange={e => handleVariableDefaultValueChange(e.target.value)}
                    />
                  </FormControl>
                  <Button
                    leftIcon={<Plus size={16} />}
                    flexShrink={0}
                    onClick={handleAddVariable}
                  >
                    Add Variable
                  </Button>
                </HStack>
                <VStack spacing={2} align="stretch">
                  {currentAlgorithm.variables.map(variable => (
                    <HStack key={variable.id} justify="space-between">
                      {editingVariableId === variable.id ? (
                        <HStack spacing={4} flex={1}>
                          <FormControl isRequired>
                            <FormLabel>Variable Name</FormLabel>
                            <Input
                              placeholder="Variable Name"
                              value={editingVariable.name}
                              onChange={e => setEditingVariable(prev => ({ ...prev, name: e.target.value }))}
                            />
                          </FormControl>
                          <FormControl isRequired>
                            <FormLabel>Type</FormLabel>
                            <Select
                              value={editingVariable.type}
                              onChange={e => setEditingVariable(prev => ({ ...prev, type: e.target.value as Variable['type'] }))}
                            >
                              <option value="number">Number</option>
                              <option value="string">String</option>
                              <option value="boolean">Boolean</option>
                            </Select>
                          </FormControl>
                          <FormControl>
                            <FormLabel>Default Value</FormLabel>
                            <Input
                              placeholder="Default Value (optional)"
                              value={editingVariable.defaultValue?.toString() || ''}
                              onChange={e => setEditingVariable(prev => ({ ...prev, defaultValue: e.target.value }))}
                            />
                          </FormControl>
                          <Button
                            size="sm"
                            colorScheme="blue"
                            onClick={handleSaveEditVariable}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleCancelEdit}
                          >
                            Cancel
                          </Button>
                        </HStack>
                      ) : (
                        <>
                          <HStack>
                            <Badge colorScheme="blue">{variable.name}</Badge>
                            <Text fontSize="sm" color="gray.500">({variable.type})</Text>
                            {variable.defaultValue && (
                              <Text fontSize="sm" color="gray.500">= {variable.defaultValue}</Text>
                            )}
                          </HStack>
                          <HStack>
                            <IconButton
                              aria-label="Edit variable"
                              icon={<Edit size={16} />}
                              size="sm"
                              onClick={() => handleEditVariable(variable)}
                            />
                            <IconButton
                              aria-label="Delete variable"
                              icon={<Trash2 size={16} />}
                              size="sm"
                              colorScheme="red"
                              onClick={() => handleDeleteVariable(variable.id)}
                            />
                          </HStack>
                        </>
                      )}
                    </HStack>
                  ))}
                </VStack>
              </VStack>
            </TabPanel>

            {/* Formulas Tab */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <Button
                    size="sm"
                    leftIcon={<Plus size={16} />}
                    onClick={handleAddFormula}
                  >
                    Add Formula
                  </Button>
                </HStack>

                <VStack spacing={4} align="stretch">
                  {(currentAlgorithm.formulas || []).map((formula, index) => (
                    <Box
                      key={formula.id}
                      p={4}
                      borderWidth={1}
                      borderRadius="md"
                      position="relative"
                    >
                      <HStack spacing={4} align="start">
                        <Box flex={1}>
                          <HStack spacing={4} align="start">
                            <FormControl isRequired>
                              <FormLabel>Formula Name</FormLabel>
                              <Input
                                placeholder="Formula Name"
                                value={formula.name}
                                onChange={(e) => {
                                  const newFormulas = [...(currentAlgorithm.formulas || [])];
                                  newFormulas[index] = {
                                    ...formula,
                                    name: e.target.value
                                  };
                                  const updatedAlgorithm = {
                                    ...currentAlgorithm,
                                    formulas: newFormulas
                                  };
                                  setCurrentAlgorithm(updatedAlgorithm);
                                }}
                                mb={2}
                              />
                            </FormControl>
                            <FormControl>
                              <FormLabel>Description</FormLabel>
                              <Input
                                placeholder="Description"
                                value={formula.description}
                                onChange={(e) => {
                                  const newFormulas = [...(currentAlgorithm.formulas || [])];
                                  newFormulas[index] = {
                                    ...formula,
                                    description: e.target.value
                                  };
                                  const updatedAlgorithm = {
                                    ...currentAlgorithm,
                                    formulas: newFormulas
                                  };
                                  setCurrentAlgorithm(updatedAlgorithm);
                                }}
                                mb={2}
                              />
                            </FormControl>
                          </HStack>
                          {formula.expressions.latex.value && (
                            <Box
                              p={2}
                              bg={colorMode === 'light' ? 'gray.50' : 'gray.700'}
                              borderRadius="md"
                              mb={2}
                              fontSize="sm"
                            >
                              <Text mb={-2} fontSize="sm" color="gray.500">LaTeX preview:</Text>
                              <BlockMath math={formula.expressions.latex.value} />
                            </Box>
                          )}
                          <FormulaEditor
                            variables={currentAlgorithm.variables || []}
                            value={formula.expressions.javascript.value}
                            mode="formula"
                            onChange={(value, latexExpression) => {
                              const newFormulas = [...(currentAlgorithm.formulas || [])];
                              newFormulas[index] = {
                                ...formula,
                                expressions: {
                                  latex: { value: latexExpression },
                                  javascript: { 
                                    value: value,
                                    metadata: {
                                      allowedOperations: ['math']
                                    }
                                  }
                                }
                              };
                              const updatedAlgorithm = {
                                ...currentAlgorithm,
                                formulas: newFormulas
                              };
                              setCurrentAlgorithm(updatedAlgorithm);
                            }}
                          />
                        </Box>
                        <IconButton
                          aria-label="Delete formula"
                          icon={<Trash2 size={16} />}
                          size="sm"
                          variant="ghost"
                          colorScheme="red"
                          onClick={() => {
                            const newFormulas = (currentAlgorithm.formulas || []).filter(f => f.id !== formula.id);
                            const updatedAlgorithm = {
                              ...currentAlgorithm,
                              formulas: newFormulas
                            };
                            setCurrentAlgorithm(updatedAlgorithm);
                          }}
                        />
                      </HStack>
                    </Box>
                  ))}
                </VStack>
              </VStack>
            </TabPanel>

            {/* Conditions Tab */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <Button
                    size="sm"
                    leftIcon={<Plus size={16} />}
                    onClick={handleAddCondition}
                  >
                    Add Condition
                  </Button>
                </HStack>

                <VStack spacing={4} align="stretch">
                  {(currentAlgorithm.conditions || []).map((condition, index) => (
                    <Box
                      key={condition.id}
                      p={4}
                      borderWidth={1}
                      borderRadius="md"
                      position="relative"
                    >
                      <HStack spacing={4} align="start">
                        <Box flex={1}>
                          <HStack spacing={4} align="start">
                            <FormControl isRequired>
                              <FormLabel>Condition Name</FormLabel>
                              <Input
                                placeholder="Condition Name"
                                value={condition.name}
                                onChange={(e) => {
                                  const newConditions = [...(currentAlgorithm.conditions || [])];
                                  newConditions[index] = {
                                    ...condition,
                                    name: e.target.value
                                  };
                                  const updatedAlgorithm = {
                                    ...currentAlgorithm,
                                    conditions: newConditions
                                  };
                                  setCurrentAlgorithm(updatedAlgorithm);
                                }}
                                mb={2}
                              />
                            </FormControl>
                          </HStack>
                          <FormulaEditor
                            variables={currentAlgorithm.variables || []}
                            value={condition.expression}
                            mode="condition"
                            onChange={(expression) => {
                              const newConditions = [...(currentAlgorithm.conditions || [])];
                              newConditions[index] = {
                                ...condition,
                                expression: expression
                              };
                              const updatedAlgorithm = {
                                ...currentAlgorithm,
                                conditions: newConditions
                              };
                              setCurrentAlgorithm(updatedAlgorithm);
                            }}
                          />
                        </Box>
                        <IconButton
                          aria-label="Delete condition"
                          icon={<Trash2 size={16} />}
                          size="sm"
                          variant="ghost"
                          colorScheme="red"
                          onClick={() => {
                            const newConditions = (currentAlgorithm.conditions || []).filter(c => c.id !== condition.id);
                            const updatedAlgorithm = {
                              ...currentAlgorithm,
                              conditions: newConditions
                            };
                            setCurrentAlgorithm(updatedAlgorithm);
                          }}
                        />
                      </HStack>
                    </Box>
                  ))}
                </VStack>
              </VStack>
            </TabPanel>

            {/* Token Generation Tab */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <Text fontSize="lg" fontWeight="bold">Token Generation Settings</Text>
                  <Button
                    size="sm"
                    colorScheme={currentAlgorithm.tokenGeneration?.enabled ? "green" : "gray"}
                    onClick={() => {
                      const enabled = !currentAlgorithm.tokenGeneration?.enabled;
                      setCurrentAlgorithm(prev => ({
                        ...prev,
                        tokenGeneration: enabled ? {
                          enabled: true,
                          iterationRange: { start: -2, end: 8, step: 1 },
                          bulkAssignments: {
                            resolvedValueTypeId: resolvedValueTypes.length > 0 ? resolvedValueTypes[0].id : 'color',
                            taxonomies: [],
                            tokenTier: 'PRIMITIVE',
                            private: false,
                            status: 'stable',
                            themeable: false
                          },
                          logicalMapping: {
                            scaleType: 'numeric',
                            defaultValue: '100',
                            increasingStep: 100,
                            decreasingStep: 25,
                            extraPrefix: 'X',
                            incrementDirection: 'ascending',
                            taxonomyId: undefined,
                            newTaxonomyName: undefined
                          }
                        } : undefined
                      }));
                    }}
                  >
                    {currentAlgorithm.tokenGeneration?.enabled ? 'Enabled' : 'Enable Token Generation'}
                  </Button>
                </HStack>

                {currentAlgorithm.tokenGeneration?.enabled && (
                  <VStack spacing={6} align="stretch">
                    {/* Iteration Range */}
                    <Box p={4} borderWidth={1} borderRadius="md">
                      <Text fontWeight="bold" mb={3}>Iteration Range</Text>
                      <HStack spacing={4}>
                        <FormControl>
                          <FormLabel>Start</FormLabel>
                          <Input
                            type="number"
                            value={currentAlgorithm.tokenGeneration.iterationRange.start}
                            onChange={(e) => {
                              setCurrentAlgorithm(prev => ({
                                ...prev,
                                tokenGeneration: {
                                  ...prev.tokenGeneration!,
                                  iterationRange: {
                                    ...prev.tokenGeneration!.iterationRange,
                                    start: parseInt(e.target.value) || 0
                                  }
                                }
                              }));
                            }}
                          />
                        </FormControl>
                        <FormControl>
                          <FormLabel>End</FormLabel>
                          <Input
                            type="number"
                            value={currentAlgorithm.tokenGeneration.iterationRange.end}
                            onChange={(e) => {
                              setCurrentAlgorithm(prev => ({
                                ...prev,
                                tokenGeneration: {
                                  ...prev.tokenGeneration!,
                                  iterationRange: {
                                    ...prev.tokenGeneration!.iterationRange,
                                    end: parseInt(e.target.value) || 0
                                  }
                                }
                              }));
                            }}
                          />
                        </FormControl>
                        <FormControl>
                          <FormLabel>Step</FormLabel>
                          <Input
                            type="number"
                            value={currentAlgorithm.tokenGeneration.iterationRange.step}
                            onChange={(e) => {
                              setCurrentAlgorithm(prev => ({
                                ...prev,
                                tokenGeneration: {
                                  ...prev.tokenGeneration!,
                                  iterationRange: {
                                    ...prev.tokenGeneration!.iterationRange,
                                    step: parseInt(e.target.value) || 1
                                  }
                                }
                              }));
                            }}
                          />
                        </FormControl>
                      </HStack>
                    </Box>

                    {/* Bulk Assignments */}
                    <Box p={4} borderWidth={1} borderRadius="md">
                      <Text fontWeight="bold" mb={3}>Bulk Assignments</Text>
                      <VStack spacing={4} align="stretch">
                        <FormControl>
                          <FormLabel>Resolved Value Type</FormLabel>
                          <Select
                            value={currentAlgorithm.tokenGeneration.bulkAssignments.resolvedValueTypeId}
                            onChange={(e) => {
                              setCurrentAlgorithm(prev => ({
                                ...prev,
                                tokenGeneration: {
                                  ...prev.tokenGeneration!,
                                  bulkAssignments: {
                                    ...prev.tokenGeneration!.bulkAssignments,
                                    resolvedValueTypeId: e.target.value
                                  }
                                }
                              }));
                            }}
                          >
                            {resolvedValueTypes.map(valueType => (
                              <option key={valueType.id} value={valueType.id}>
                                {valueType.displayName}
                              </option>
                            ))}
                          </Select>
                        </FormControl>
                        <FormControl>
                          <FormLabel>Token Tier</FormLabel>
                          <Select
                            value={currentAlgorithm.tokenGeneration.bulkAssignments.tokenTier}
                            onChange={(e) => {
                              setCurrentAlgorithm(prev => ({
                                ...prev,
                                tokenGeneration: {
                                  ...prev.tokenGeneration!,
                                  bulkAssignments: {
                                    ...prev.tokenGeneration!.bulkAssignments,
                                    tokenTier: e.target.value as 'PRIMITIVE' | 'SEMANTIC' | 'COMPONENT'
                                  }
                                }
                              }));
                            }}
                          >
                            <option value="PRIMITIVE">Primitive</option>
                            <option value="SEMANTIC">Semantic</option>
                            <option value="COMPONENT">Component</option>
                          </Select>
                        </FormControl>
                        <FormControl>
                          <FormLabel>Status</FormLabel>
                          <Select
                            value={currentAlgorithm.tokenGeneration.bulkAssignments.status}
                            onChange={(e) => {
                              setCurrentAlgorithm(prev => ({
                                ...prev,
                                tokenGeneration: {
                                  ...prev.tokenGeneration!,
                                  bulkAssignments: {
                                    ...prev.tokenGeneration!.bulkAssignments,
                                    status: e.target.value as 'experimental' | 'stable' | 'deprecated' | ''
                                  }
                                }
                              }));
                            }}
                          >
                            <option value="">None</option>
                            <option value="experimental">Experimental</option>
                            <option value="stable">Stable</option>
                            <option value="deprecated">Deprecated</option>
                          </Select>
                        </FormControl>
                        <VStack spacing={3} align="stretch">
                          <Checkbox
                            isChecked={currentAlgorithm.tokenGeneration.bulkAssignments.private}
                            onChange={(e) => {
                              setCurrentAlgorithm(prev => ({
                                ...prev,
                                tokenGeneration: {
                                  ...prev.tokenGeneration!,
                                  bulkAssignments: {
                                    ...prev.tokenGeneration!.bulkAssignments,
                                    private: e.target.checked
                                  }
                                }
                              }));
                            }}
                          >
                            Private
                          </Checkbox>
                          <Checkbox
                            isChecked={currentAlgorithm.tokenGeneration.bulkAssignments.themeable}
                            onChange={(e) => {
                              setCurrentAlgorithm(prev => ({
                                ...prev,
                                tokenGeneration: {
                                  ...prev.tokenGeneration!,
                                  bulkAssignments: {
                                    ...prev.tokenGeneration!.bulkAssignments,
                                    themeable: e.target.checked
                                  }
                                }
                              }));
                            }}
                          >
                            Themeable
                          </Checkbox>
                        </VStack>
                        <FormControl>
                          <FormLabel>Taxonomies</FormLabel>
                          <VStack spacing={2} align="stretch">
                            <Text fontSize="sm" color="gray.600">
                              Select taxonomies for logical term assignment. Terms will be automatically mapped based on the logical mapping settings.
                            </Text>
                            <TaxonomyPicker
                              taxonomies={filteredTaxonomies}
                              value={selectedTaxonomies}
                              onChange={handleTaxonomyChange}
                              disabled={filteredTaxonomies.length === 0}
                            />
                            {filteredTaxonomies.length === 0 && (
                              <Box p={3} bg={colorMode === 'light' ? 'gray.50' : 'gray.700'} borderRadius="md">
                                <Text fontSize="sm" color="gray.500">
                                  {(() => {
                                    const allTaxonomies = StorageService.getTaxonomies() as Taxonomy[];
                                    const currentValueTypeId = currentAlgorithm.tokenGeneration?.bulkAssignments?.resolvedValueTypeId;
                                    
                                    if (allTaxonomies.length === 0) {
                                      return "No taxonomies have been created yet. Please create taxonomies in the Classification setup first.";
                                    } else if (currentValueTypeId) {
                                      const supportingTaxonomies = allTaxonomies.filter(taxonomy => 
                                        Array.isArray(taxonomy.resolvedValueTypeIds) && 
                                        taxonomy.resolvedValueTypeIds.includes(currentValueTypeId)
                                      );
                                      
                                      if (supportingTaxonomies.length === 0) {
                                        return `No taxonomies support the "${currentValueTypeId}" value type. Please select a different value type (like "color" or "spacing") or create a taxonomy that supports "${currentValueTypeId}".`;
                                      }
                                    }
                                    
                                    return "No taxonomies available for this value type. Please select a different value type or add taxonomies for this type.";
                                  })()}
                                </Text>
                              </Box>
                            )}
                          </VStack>
                        </FormControl>
                      </VStack>
                    </Box>

                    {/* Logical Mapping */}
                    <Box p={4} borderWidth={1} borderRadius="md">
                      <Text fontWeight="bold" mb={3}>Logical Mapping</Text>
                      <VStack spacing={4} align="stretch">
                        <FormControl>
                          <FormLabel>Scale Type</FormLabel>
                          <Select
                            value={currentAlgorithm.tokenGeneration.logicalMapping.scaleType}
                            onChange={(e) => {
                              setCurrentAlgorithm(prev => ({
                                ...prev,
                                tokenGeneration: {
                                  ...prev.tokenGeneration!,
                                  logicalMapping: {
                                    ...prev.tokenGeneration!.logicalMapping,
                                    scaleType: e.target.value as 'numeric' | 'tshirt'
                                  }
                                }
                              }));
                            }}
                          >
                            <option value="numeric">Numeric</option>
                            <option value="tshirt">T-Shirt Sizing</option>
                          </Select>
                        </FormControl>
                        <FormControl>
                          <FormLabel>Taxonomy for Scale Terms</FormLabel>
                          <VStack spacing={3} align="stretch">
                            <Text fontSize="sm" color="gray.600">
                              Select an existing taxonomy or create a new one for the scale terms.
                            </Text>
                            <Select
                              value={currentAlgorithm.tokenGeneration.logicalMapping.taxonomyId || ''}
                              onChange={(e) => {
                                setCurrentAlgorithm(prev => ({
                                  ...prev,
                                  tokenGeneration: {
                                    ...prev.tokenGeneration!,
                                    logicalMapping: {
                                      ...prev.tokenGeneration!.logicalMapping,
                                      taxonomyId: e.target.value || undefined,
                                      newTaxonomyName: e.target.value ? undefined : prev.tokenGeneration!.logicalMapping.newTaxonomyName
                                    }
                                  }
                                }));
                              }}
                            >
                              <option value="">Create new taxonomy</option>
                              {filteredTaxonomies.map(taxonomy => (
                                <option key={taxonomy.id} value={taxonomy.id}>
                                  {taxonomy.name}
                                </option>
                              ))}
                            </Select>
                            {!currentAlgorithm.tokenGeneration.logicalMapping.taxonomyId && (
                              <FormControl>
                                <FormLabel>New Taxonomy Name</FormLabel>
                                <Input
                                  placeholder="Enter taxonomy name"
                                  value={currentAlgorithm.tokenGeneration.logicalMapping.newTaxonomyName || ''}
                                  onChange={(e) => {
                                    setCurrentAlgorithm(prev => ({
                                      ...prev,
                                      tokenGeneration: {
                                        ...prev.tokenGeneration!,
                                        logicalMapping: {
                                          ...prev.tokenGeneration!.logicalMapping,
                                          newTaxonomyName: e.target.value
                                        }
                                      }
                                    }));
                                  }}
                                />
                              </FormControl>
                            )}
                          </VStack>
                        </FormControl>
                        <FormControl>
                          <FormLabel>Default Value</FormLabel>
                          <Input
                            value={currentAlgorithm.tokenGeneration.logicalMapping.defaultValue}
                            onChange={(e) => {
                              setCurrentAlgorithm(prev => ({
                                ...prev,
                                tokenGeneration: {
                                  ...prev.tokenGeneration!,
                                  logicalMapping: {
                                    ...prev.tokenGeneration!.logicalMapping,
                                    defaultValue: e.target.value
                                  }
                                }
                              }));
                            }}
                          />
                        </FormControl>
                        
                        {/* Numeric Scale Type Fields */}
                        {currentAlgorithm.tokenGeneration.logicalMapping.scaleType === 'numeric' && (
                          <>
                            <FormControl>
                              <FormLabel>Steps (Increasing)</FormLabel>
                              <Input
                                type="number"
                                placeholder="100"
                                value={currentAlgorithm.tokenGeneration.logicalMapping.increasingStep || ''}
                                onChange={(e) => {
                                  setCurrentAlgorithm(prev => ({
                                    ...prev,
                                    tokenGeneration: {
                                      ...prev.tokenGeneration!,
                                      logicalMapping: {
                                        ...prev.tokenGeneration!.logicalMapping,
                                        increasingStep: parseInt(e.target.value) || undefined
                                      }
                                    }
                                  }));
                                }}
                              />
                            </FormControl>
                            <FormControl>
                              <FormLabel>Steps (Decreasing)</FormLabel>
                              <Input
                                type="number"
                                placeholder="25"
                                value={currentAlgorithm.tokenGeneration.logicalMapping.decreasingStep || ''}
                                onChange={(e) => {
                                  setCurrentAlgorithm(prev => ({
                                    ...prev,
                                    tokenGeneration: {
                                      ...prev.tokenGeneration!,
                                      logicalMapping: {
                                        ...prev.tokenGeneration!.logicalMapping,
                                        decreasingStep: parseInt(e.target.value) || undefined
                                      }
                                    }
                                  }));
                                }}
                              />
                            </FormControl>
                          </>
                        )}
                        
                        {/* T-Shirt Scale Type Fields */}
                        {currentAlgorithm.tokenGeneration.logicalMapping.scaleType === 'tshirt' && (
                          <FormControl>
                            <FormLabel>Prefix for Extra Sizes</FormLabel>
                            <Select
                              value={currentAlgorithm.tokenGeneration.logicalMapping.extraPrefix || 'X'}
                              onChange={(e) => {
                                setCurrentAlgorithm(prev => ({
                                  ...prev,
                                  tokenGeneration: {
                                    ...prev.tokenGeneration!,
                                    logicalMapping: {
                                      ...prev.tokenGeneration!.logicalMapping,
                                      extraPrefix: e.target.value
                                    }
                                  }
                                }));
                              }}
                            >
                              <option value="X">X (X-Small, X-Large)</option>
                              <option value="extra">extra (extra-small, extra-large)</option>
                            </Select>
                          </FormControl>
                        )}
                      </VStack>
                    </Box>
                  </VStack>
                )}
              </VStack>
            </TabPanel>

            {/* Algorithm Steps Tab */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                <HStack spacing={4}>
                  <Select
                    value={newStep.type}
                    onChange={e => setNewStep(prev => ({ ...prev, type: e.target.value as 'formula' | 'condition' }))}
                  >
                    <option value="formula">Formula</option>
                    <option value="condition">Condition</option>
                  </Select>
                  <Select
                    value={newStep.id}
                    onChange={e => {
                      const items = newStep.type === 'formula' ? currentAlgorithm.formulas : currentAlgorithm.conditions;
                      const item = items.find(i => i.id === e.target.value);
                      setNewStep(prev => ({
                        ...prev,
                        id: e.target.value,
                        name: item?.name || ''
                      }));
                    }}
                  >
                    <option value="">Select {newStep.type === 'formula' ? 'Formula' : 'Condition'}</option>
                    {(newStep.type === 'formula' ? currentAlgorithm.formulas : currentAlgorithm.conditions).map(item => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </Select>
                  <Button leftIcon={<Plus size={16} />} onClick={handleAddStep}>
                    Add Step
                  </Button>
                </HStack>

                <Box
                  p={4}
                  bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
                  borderRadius="md"
                >
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="algorithm-steps">
                      {(provided) => (
                        <VStack
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          spacing={2}
                          align="stretch"
                        >
                          {currentAlgorithm.steps.map((step, index) => {
                            const item = step.type === 'formula'
                              ? currentAlgorithm.formulas.find(f => f.id === step.id)
                              : currentAlgorithm.conditions.find(c => c.id === step.id);

                            return (
                              <Draggable key={`${step.type}_${step.id}_${index}`} draggableId={`${step.type}_${step.id}_${index}`} index={index}>
                                {(provided, snapshot) => (
                                  <HStack
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    p={2}
                                    bg={colorMode === 'dark' ? 'gray.700' : 'white'}
                                    borderRadius="md"
                                    boxShadow={snapshot.isDragging ? "md" : "sm"}
                                    borderWidth={1}
                                    borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                                    justify="space-between"
                                  >
                                    <HStack>
                                      <Box cursor="grab">
                                        <GripVertical size={16} />
                                      </Box>
                                      <Badge colorScheme={step.type === 'formula' ? 'purple' : 'green'}>
                                        {step.type === 'formula' ? 'Formula' : 'Condition'}
                                      </Badge>
                                      <Text>{item?.name}</Text>
                                    </HStack>
                                    <IconButton
                                      aria-label="Delete step"
                                      icon={<Trash2 size={16} />}
                                      size="sm"
                                      colorScheme="red"
                                      onClick={() => handleDeleteStep(index)}
                                    />
                                  </HStack>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </VStack>
                      )}
                    </Droppable>
                  </DragDropContext>
                </Box>
              </VStack>
            </TabPanel>

            {/* Preview Tab */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                {/* Algorithm JSON Preview */}
                <Box
                  p={4}
                  bg={colorMode === 'light' ? 'gray.50' : 'gray.800'}
                  borderRadius="md"
                  fontSize="sm"
                  fontFamily="mono"
                  overflowX="auto"
                >
                  <Text fontWeight="bold" mb={2}>Algorithm JSON Preview</Text>
                  <pre style={{ margin: 0 }}>
                    {JSON.stringify(currentAlgorithm, null, 2)}
                  </pre>
                </Box>

                {/* Generated Tokens Preview */}
                {currentAlgorithm.tokenGeneration?.enabled && (
                  <Box
                    p={4}
                    bg={colorMode === 'light' ? 'gray.50' : 'gray.800'}
                    borderRadius="md"
                    fontSize="sm"
                    fontFamily="mono"
                    overflowX="auto"
                  >
                    <Text fontWeight="bold" mb={2}>Generated Tokens Preview</Text>
                    {generationErrors.length > 0 && (
                      <Box mb={3} p={3} bg="red.100" borderRadius="md">
                        <Text fontWeight="bold" color="red.600">Generation Errors:</Text>
                        {generationErrors.map((error, index) => (
                          <Text key={index} color="red.600" fontSize="xs">• {error}</Text>
                        ))}
                      </Box>
                    )}
                    {generatedTokens.length > 0 && (
                      <Box>
                        <Text mb={2} fontSize="sm" color="gray.500">
                          {generatedTokens.length} tokens will be generated:
                        </Text>
                        <VStack spacing={2} align="stretch">
                          {generatedTokens.slice(0, 10).map((token, index) => (
                            <Box key={index} p={2} bg="white" borderRadius="sm" borderWidth={1}>
                              <Text fontSize="xs" fontWeight="bold">{token.id}</Text>
                              <Text fontSize="xs" color="gray.600">{token.displayName}</Text>
                              <Text fontSize="xs" color="gray.500">
                                Value: {token.valuesByMode[0]?.value && 'value' in token.valuesByMode[0].value ? token.valuesByMode[0].value.value : 'N/A'}
                              </Text>
                            </Box>
                          ))}
                          {generatedTokens.length > 10 && (
                            <Text fontSize="xs" color="gray.500">
                              ... and {generatedTokens.length - 10} more tokens
                            </Text>
                          )}
                        </VStack>
                      </Box>
                    )}
                    {generatedTokens.length === 0 && generationErrors.length === 0 && (
                      <Text fontSize="sm" color="gray.500">
                        No tokens will be generated. Check your algorithm configuration.
                      </Text>
                    )}
                  </Box>
                )}
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>

        {/* Save Button */}
        <Button
          leftIcon={<Save size={16} />}
          colorScheme="blue"
          onClick={handleSave}
          size="lg"
        >
          {currentAlgorithm.tokenGeneration?.enabled ? 'Save and Run' : 'Save Algorithm'}
        </Button>
      </VStack>
    </Box>
  );
}; 
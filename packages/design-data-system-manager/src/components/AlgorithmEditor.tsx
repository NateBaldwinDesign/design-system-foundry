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
  FormLabel
} from '@chakra-ui/react';
import { Plus, Trash2, GripVertical, Save, Edit } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Algorithm, Variable, Formula, Condition, AlgorithmStep } from '../types/algorithm';
import { FormulaEditor } from './FormulaEditor';
import { BlockMath } from 'react-katex';

interface AlgorithmEditorProps {
  algorithm?: Algorithm;
  onSave?: (algorithm: Algorithm) => void;
}

const defaultAlgorithm: Algorithm = {
  id: 'new-algorithm',
  name: 'New Algorithm',
  resolvedValueTypeId: 'dimension',
  variables: [],
  formulas: [],
  conditions: [],
  steps: []
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
      id: `var_${Date.now()}`,
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
      id: `cond_${Date.now()}`,
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

    onSave(currentAlgorithm);
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

  const handleAddFormula = () => {
    const newFormula: Formula = {
      id: `formula-${Date.now()}`,
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
              <Box
                p={4}
                bg={colorMode === 'light' ? 'gray.50' : 'gray.800'}
                borderRadius="md"
                fontSize="sm"
                fontFamily="mono"
                overflowX="auto"
              >
                <Text fontWeight="bold" mb={2}>JSON Preview</Text>
                <pre style={{ margin: 0 }}>
                  {JSON.stringify(currentAlgorithm, null, 2)}
                </pre>
              </Box>
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
          Save Algorithm
        </Button>
      </VStack>
    </Box>
  );
}; 
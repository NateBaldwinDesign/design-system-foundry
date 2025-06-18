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
  TabPanel
} from '@chakra-ui/react';
import { Plus, Trash2, GripVertical, Save, Edit } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Algorithm, Variable, Formula, Condition, AlgorithmStep } from '../types/algorithm';
import { FormulaEditor } from './FormulaEditor';
import { BlockMath } from 'react-katex';

// Add type declaration for react-katex
declare module 'react-katex';

interface AlgorithmEditorProps {
  algorithm?: Algorithm;
  onSave?: (algorithm: Algorithm) => void;
}

const defaultAlgorithm: Algorithm = {
  id: 'new-algorithm',
  name: 'New Algorithm',
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

  const [newFormula, setNewFormula] = React.useState<Partial<Formula>>({
    name: '',
    expression: '',
    latexExpression: '',
    variableIds: []
  });

  const [newCondition, setNewCondition] = React.useState<Partial<Condition>>({
    name: '',
    expression: '',
    variableIds: []
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
    if (!newVariable.name || !newVariable.type) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
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

  const handleAddFormula = () => {
    const newFormula: Formula = {
      id: `formula-${Date.now()}`,
      name: '',
      expression: '',
      latexExpression: '',
      description: '',
      variableIds: []
    };
    const updatedAlgorithm = {
      ...currentAlgorithm,
      formulas: [...(currentAlgorithm.formulas || []), newFormula]
    };
    setCurrentAlgorithm(updatedAlgorithm);
  };

  const handleAddCondition = () => {
    if (!newCondition.name || !newCondition.expression) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    const condition: Condition = {
      id: `cond_${Date.now()}`,
      name: newCondition.name,
      expression: newCondition.expression,
      variableIds: newCondition.variableIds || []
    };

    setCurrentAlgorithm(prev => ({
      ...prev,
      conditions: [...prev.conditions, condition]
    }));

    setNewCondition({
      name: '',
      expression: '',
      variableIds: []
    });
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

  const handleDeleteFormula = (id: string) => {
    setCurrentAlgorithm(prev => ({
      ...prev,
      formulas: prev.formulas.filter(f => f.id !== id),
      steps: prev.steps.filter(s => s.id !== id)
    }));
  };

  const handleDeleteCondition = (id: string) => {
    setCurrentAlgorithm(prev => ({
      ...prev,
      conditions: prev.conditions.filter(c => c.id !== id),
      steps: prev.steps.filter(s => s.id !== id)
    }));
  };

  const handleDeleteStep = (index: number) => {
    setCurrentAlgorithm(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index)
    }));
  };

  const handleSave = () => {
    if (!currentAlgorithm.name) {
      toast({
        title: 'Error',
        description: 'Please enter an algorithm name',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
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
    if (!editingVariableId || !editingVariable.name || !editingVariable.type) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
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

  return (
    <Box>
      <VStack spacing={6} align="stretch">
        {/* Basic Information */}
        <VStack spacing={4} align="stretch">
          <Text fontSize="lg" fontWeight="bold">Basic Information</Text>
          <Input
            placeholder="Algorithm Name"
            value={currentAlgorithm.name}
            onChange={e => setCurrentAlgorithm(prev => ({ ...prev, name: e.target.value }))}
          />
          <Textarea
            placeholder="Description (optional)"
            value={currentAlgorithm.description}
            onChange={e => setCurrentAlgorithm(prev => ({ ...prev, description: e.target.value }))}
          />
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
                  <Input
                    flex="1"
                    maxW="200px"
                    placeholder="Variable Name"
                    value={newVariable.name}
                    onChange={e => setNewVariable(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <Select
                    flex="1"
                    maxW="140px"
                    value={newVariable.type}
                    onChange={e => handleVariableTypeChange(e.target.value as Variable['type'])}
                  >
                    <option value="number">Number</option>
                    <option value="string">String</option>
                    <option value="boolean">Boolean</option>
                  </Select>
                  <Input
                    flex="1"
                    maxW="180px"
                    placeholder="Default Value (optional)"
                    value={newVariable.defaultValue?.toString() || ''}
                    onChange={e => handleVariableDefaultValueChange(e.target.value)}
                  />
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
                          <Input
                            flex="1"
                            maxW="200px"
                            placeholder="Variable Name"
                            value={editingVariable.name}
                            onChange={e => setEditingVariable(prev => ({ ...prev, name: e.target.value }))}
                          />
                          <Select
                            flex="1"
                            maxW="140px"
                            value={editingVariable.type}
                            onChange={e => setEditingVariable(prev => ({ ...prev, type: e.target.value as Variable['type'] }))}
                          >
                            <option value="number">Number</option>
                            <option value="string">String</option>
                            <option value="boolean">Boolean</option>
                          </Select>
                          <Input
                            flex="1"
                            maxW="180px"
                            placeholder="Default Value (optional)"
                            value={editingVariable.defaultValue?.toString() || ''}
                            onChange={e => setEditingVariable(prev => ({ ...prev, defaultValue: e.target.value }))}
                          />
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

                          </HStack>
                          {formula.latexExpression && (
                            <Box
                              p={2}
                              bg={colorMode === 'light' ? 'gray.50' : 'gray.700'}
                              borderRadius="md"
                              mb={2}
                              fontSize="sm"
                            >
                              <Text mb={-2} fontSize="sm" color="gray.500">LaTeX preview:</Text>
                              <BlockMath math={formula.latexExpression} />
                            </Box>
                          )}
                          <FormulaEditor
                            variables={currentAlgorithm.variables || []}
                            value={formula.expression}
                            mode="formula"
                            onChange={(value, latexExpression) => {
                              const newFormulas = [...(currentAlgorithm.formulas || [])];
                              newFormulas[index] = {
                                ...formula,
                                expression: value,
                                latexExpression
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
                <VStack spacing={4} align="stretch">
                  <Input
                    placeholder="Condition Name"
                    value={newCondition.name}
                    onChange={e => setNewCondition(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <FormulaEditor
                    variables={currentAlgorithm.variables || []}
                    value={newCondition.expression || ''}
                    mode="condition"
                    onChange={expression => setNewCondition(prev => ({ ...prev, expression }))}
                  />
                  <Button leftIcon={<Plus size={16} />} onClick={handleAddCondition}>
                    Add Condition
                  </Button>
                </VStack>
                <VStack spacing={2} align="stretch">
                  {currentAlgorithm.conditions.map(condition => (
                    <HStack key={condition.id} justify="space-between">
                      <VStack align="start" spacing={1}>
                        <Badge colorScheme="green">{condition.name}</Badge>
                        <Text fontSize="sm" color="gray.500">{condition.expression}</Text>
                      </VStack>
                      <IconButton
                        aria-label="Delete condition"
                        icon={<Trash2 size={16} />}
                        size="sm"
                        colorScheme="red"
                        onClick={() => handleDeleteCondition(condition.id)}
                      />
                    </HStack>
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
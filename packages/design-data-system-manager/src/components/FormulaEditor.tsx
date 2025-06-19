import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Button,
  IconButton,
  useColorMode,
  Input,
  Badge,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Alert,
  AlertIcon,
  AlertDescription
} from '@chakra-ui/react';
import { Plus, Trash2, GripVertical, Parentheses, Check, ChevronDown, SquareFunction, VariableIcon, TextCursorInputIcon, SplitIcon } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Variable } from '../types/algorithm';

interface FormulaBlock {
  id: string;
  type: 'variable' | 'operator' | 'group' | 'value';
  content: string;
  value?: string | number;
  children?: FormulaBlock[];
}

interface FormulaEditorProps {
  variables: Variable[];
  value: string;
  onChange: (value: string, latexExpression: string) => void;
  mode?: 'formula' | 'condition';
}

const MATH_OPERATORS = [
  { id: '+', label: 'Add (+)', symbol: '+', latex: '+' },
  { id: '-', label: 'Subtract (-)', symbol: '-', latex: '-' },
  { id: '×', label: 'Multiply (×)', symbol: '*', latex: '\\times' },
  { id: '/', label: 'Divide (÷)', symbol: '/', latex: '\\div' },
  { id: '^', label: 'Power (^)', symbol: '^', latex: '^' },
  { id: '%', label: 'Modulo (%)', symbol: '%', latex: '\\bmod' },
  { id: '=', label: 'Equals (=)', symbol: '=', latex: '=' }
];

const CONDITIONAL_OPERATORS = [
  { id: '=', label: 'Equals (=)', symbol: '=', latex: '=' },
  { id: '>', label: 'Greater Than (>)', symbol: '>', latex: '>' },
  { id: '<', label: 'Less Than (<)', symbol: '<', latex: '<' },
  { id: '>=', label: 'Greater Than or Equal (≥)', symbol: '>=', latex: '\\geq' },
  { id: '<=', label: 'Less Than or Equal (≤)', symbol: '<=', latex: '\\leq' },
  { id: '!=', label: 'Not Equal (≠)', symbol: '!=', latex: '\\neq' }
];

const FormulaBlockComponent: React.FC<{
  block: FormulaBlock;
  index: number;
  onDelete: (id: string) => void;
  colorMode: 'light' | 'dark';
}> = ({ block, index, onDelete, colorMode }) => {
  if (block.type === 'group') {
    return (
      <Draggable draggableId={block.id} index={index}>
        {(provided, snapshot) => (
          <Box
            ref={provided.innerRef}
            {...provided.draggableProps}
            p={2}
            bg={colorMode === 'dark' ? 'gray.700' : 'white'}
            borderRadius="md"
            boxShadow={snapshot.isDragging ? "md" : "sm"}
            borderWidth={1}
            borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
          >
            <HStack spacing={2} mb={2}>
              <Box {...provided.dragHandleProps} cursor="grab">
                <GripVertical size={16} />
              </Box>
              <Badge colorScheme="green">Group</Badge>
              <IconButton
                aria-label="Delete group"
                icon={<Trash2 size={16} />}
                size="xs"
                colorScheme="red"
                onClick={() => onDelete(block.id)}
              />
            </HStack>
            <Droppable droppableId={block.id} direction="horizontal">
              {(provided) => (
                <Box
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  p={2}
                  bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
                  borderRadius="md"
                  minH="50px"
                >
                  <HStack spacing={2} wrap="wrap">
                    {block.children?.map((child, childIndex) => (
                      <FormulaBlockComponent
                        key={child.id}
                        block={child}
                        index={childIndex}
                        onDelete={onDelete}
                        colorMode={colorMode}
                      />
                    ))}
                    {provided.placeholder}
                  </HStack>
                </Box>
              )}
            </Droppable>
          </Box>
        )}
      </Draggable>
    );
  }

  return (
    <Draggable draggableId={block.id} index={index}>
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
        >
          <Box cursor="grab">
            <GripVertical size={16} />
          </Box>
          <Badge
            colorScheme={
              block.type === 'variable' ? 'blue' :
              block.type === 'operator' ? 'purple' :
              block.type === 'value' ? 'gray' : 'green'
            }
          >
            {block.content}
          </Badge>
          <IconButton
            aria-label="Delete block"
            icon={<Trash2 size={16} />}
            size="xs"
            colorScheme="red"
            onClick={() => onDelete(block.id)}
          />
        </HStack>
      )}
    </Draggable>
  );
};

export const FormulaEditor: React.FC<FormulaEditorProps> = ({ 
  variables, 
  value, 
  onChange,
  mode = 'formula'
}) => {
  const { colorMode } = useColorMode();
  const [blocks, setBlocks] = useState<FormulaBlock[]>(() => {
    if (!value) return [];
    return parseFormulaToBlocks(value);
  });
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedBlock, setSelectedBlock] = useState<FormulaBlock | null>(null);
  const [validationMessage, setValidationMessage] = useState<string>('');

  // UI Mapping Logic - moved to constants above return statement per project rules
  const operatorOptions = mode === 'formula' ? MATH_OPERATORS : CONDITIONAL_OPERATORS;
  const operatorMenuItems = operatorOptions.map(op => (
    <MenuItem
      key={op.id}
      onClick={() => handleAddOperator(op.id)}
    >
      {op.label}
    </MenuItem>
  ));

  // Create system variables (always available)
  const systemVariables: Variable[] = [
    {
      id: 'system_n',
      name: 'n',
      type: 'number',
      defaultValue: '0'
    }
  ];

  // Combine system variables with user variables
  const allVariables = [...systemVariables, ...variables];

  const variableMenuItems = allVariables.map(variable => (
    <MenuItem
      key={variable.id}
      onClick={() => handleAddVariable(variable)}
      icon={<Plus size={16} />}
    >
      {variable.name}
      {variable.id === 'system_n' && (
        <Badge ml={2} size="sm" colorScheme="green">System</Badge>
      )}
    </MenuItem>
  ));

  // Progressive validation function for inline feedback
  const validateFormulaStructure = (blocks: FormulaBlock[]): string => {
    if (blocks.length === 0) {
      return 'Formula is empty. Add variables, values, or operators.';
    }

    const hasOperators = blocks.some(block => block.type === 'operator');
    const valueCount = blocks.filter(block => block.type === 'variable' || block.type === 'value').length;
    const operatorCount = blocks.filter(block => block.type === 'operator').length;

    if (hasOperators && operatorCount > valueCount) {
      return `Formula has ${operatorCount} operators but only ${valueCount} values. Consider adding more values or variables.`;
    }

    if (hasOperators && valueCount < 2) {
      return 'Formula has operators but needs at least 2 values or variables to be valid.';
    }

    return '';
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination } = result;
    const newBlocks = Array.from(blocks);

    // Find the block being moved
    const [movedBlock] = newBlocks.splice(source.index, 1);

    // If dropping into a group
    if (destination.droppableId !== 'formula-blocks') {
      const groupId = destination.droppableId;
      const group = findBlockById(newBlocks, groupId);
      if (group && group.type === 'group') {
        if (!group.children) group.children = [];
        group.children.splice(destination.index, 0, movedBlock);
      }
    } else {
      // Dropping in the main area
      newBlocks.splice(destination.index, 0, movedBlock);
    }

    setBlocks(newBlocks);
  };

  const findBlockById = (blocks: FormulaBlock[], id: string): FormulaBlock | null => {
    for (const block of blocks) {
      if (block.id === id) return block;
      if (block.children) {
        const found = findBlockById(block.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const handleAddVariable = (variable: Variable) => {
    const newBlock: FormulaBlock = {
      id: `var_${Date.now()}`,
      type: 'variable',
      content: variable.name
    };

    setBlocks(prev => [...prev, newBlock]);
  };

  const handleAddOperator = (operatorId: string) => {
    const operators = mode === 'formula' ? MATH_OPERATORS : CONDITIONAL_OPERATORS;
    const operator = operators.find(op => op.id === operatorId);
    if (!operator) return;

    const newBlock: FormulaBlock = {
      id: `op_${Date.now()}`,
      type: 'operator',
      content: operator.symbol
    };

    setBlocks(prev => [...prev, newBlock]);
  };

  const handleAddGroup = () => {
    const newBlock: FormulaBlock = {
      id: `group_${Date.now()}`,
      type: 'group',
      content: '()',
      children: []
    };

    setBlocks(prev => [...prev, newBlock]);
  };

  const handleAddValue = () => {
    setSelectedBlock({
      id: `value_${Date.now()}`,
      type: 'value',
      content: '',
      value: ''
    });
    onOpen();
  };

  const handleValueSave = (value: string | number) => {
    if (!selectedBlock) return;

    const newBlock: FormulaBlock = {
      ...selectedBlock,
      content: String(value),
      value
    };

    setBlocks(prev => [...prev, newBlock]);
    onClose();
  };

  const handleDeleteBlock = (blockId: string) => {
    const deleteFromBlocks = (blocks: FormulaBlock[]): FormulaBlock[] => {
      return blocks.filter(block => {
        if (block.id === blockId) return false;
        if (block.children) {
          block.children = deleteFromBlocks(block.children);
        }
        return true;
      });
    };

    setBlocks(prev => deleteFromBlocks(prev));
  };

  // Add useEffect to handle formula updates with progressive validation
  useEffect(() => {
    const buildFormula = (blocks: FormulaBlock[]): string => {
      return blocks.map(block => {
        switch (block.type) {
          case 'variable':
            return block.content;
          case 'operator':
            return ` ${block.content} `;
          case 'group':
            return `(${block.children ? buildFormula(block.children) : ''})`;
          case 'value':
            return block.content;
          default:
            return '';
        }
      }).join('').trim();
    };

    const formula = buildFormula(blocks);
    const latexExpression = buildLatexFormula(blocks);
    
    // Progressive validation for inline feedback
    const validationMsg = validateFormulaStructure(blocks);
    setValidationMessage(validationMsg);
    
    onChange(formula, latexExpression);
  }, [blocks, onChange, variables, mode]);

  const buildLatexFormula = (blocks: FormulaBlock[]): string => {
    let latex = '';
    let i = 0;

    while (i < blocks.length) {
      const block = blocks[i];
      let groupContent = '';
      
      switch (block.type) {
        case 'variable':
          // Use \mathit for multi-character variable names
          latex += block.content.length > 1 ? `\\mathit{${block.content}}` : block.content;
          break;

        case 'operator':
          if (block.content === '^') {
            // Power operator with proper LaTeX syntax
            i++;
            if (i < blocks.length) {
              const exponent = blocks[i];
              latex += '^{' + buildLatexFormula([exponent]) + '}';
            }
          } else {
            // Map operators to their proper LaTeX symbols using the operator arrays
            const operator = MATH_OPERATORS.find(op => op.symbol === block.content) || 
                           CONDITIONAL_OPERATORS.find(op => op.symbol === block.content);
            if (operator) {
              // Use the latex property from the operator definition
              latex += ' ' + operator.latex + ' ';
            } else {
              // Fallback for unknown operators
              latex += ' ' + block.content + ' ';
            }
          }
          break;

        case 'group':
          groupContent = block.children ? buildLatexFormula(block.children) : '';
          latex += `\\left(${groupContent}\\right)`;
          break;

        case 'value':
          // Numbers should be in math mode
          latex += block.content;
          break;
      }
      i++;
    }

    return latex;
  };

  return (
    <Box>
      <VStack spacing={4} align="stretch">
        {/* Toolbar */}
        <HStack spacing={2} wrap="wrap">
          <Menu>
            <MenuButton 
              as={Button} 
              size="sm"
              rightIcon={<ChevronDown size={16} />}
              leftIcon={<VariableIcon size={16} />}
            >
              Variable
            </MenuButton>
            <MenuList>
              {variableMenuItems}
            </MenuList>
          </Menu>

          <Menu>
            <MenuButton
              as={Button}
              rightIcon={<ChevronDown size={16} />}
              leftIcon={mode === 'formula' ? <SquareFunction size={16} /> : <SplitIcon size={16} />}
              size="sm"
            >
              {mode === 'formula' ? 'Math Operator' : 'Condition'}
            </MenuButton>
            <MenuList>
              {operatorMenuItems}
            </MenuList>
          </Menu>

          <Button
            aria-label="Add parentheses group"
            leftIcon={<Parentheses size={16} />}
            size="sm"
            onClick={handleAddGroup}
          >
            Parentheses
          </Button>

          <Button
            aria-label="Add value"
            leftIcon={<TextCursorInputIcon size={16} />}
            size="sm"
            onClick={handleAddValue}
          >
            Value
          </Button>
        </HStack>
        
        {/* Formula Blocks */}
        <Box
          p={4}
          bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
          borderRadius="md"
          minH="100px"
        >
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="formula-blocks" direction="horizontal">
              {(provided) => (
                <Box
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  <HStack spacing={2} wrap="wrap">
                    {blocks.map((block, index) => (
                      <FormulaBlockComponent
                        key={block.id}
                        block={block}
                        index={index}
                        onDelete={handleDeleteBlock}
                        colorMode={colorMode}
                      />
                    ))}
                    {provided.placeholder}
                  </HStack>
                </Box>
              )}
            </Droppable>
          </DragDropContext>
        </Box>

        {/* Inline Validation Feedback */}
        {validationMessage && (
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            <AlertDescription fontSize="sm">
              {validationMessage}
            </AlertDescription>
          </Alert>
        )}
      </VStack>

      {/* Value Input Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Enter Value</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} pb={4}>
              <Input
                placeholder="Enter a value"
                onChange={e => {
                  if (selectedBlock) {
                    setSelectedBlock({
                      ...selectedBlock,
                      content: e.target.value,
                      value: e.target.value
                    });
                  }
                }}
              />
              <Button
                leftIcon={<Check size={16} />}
                colorScheme="blue"
                onClick={() => selectedBlock && handleValueSave(selectedBlock.value || '')}
              >
                Add Value
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

// Helper function to parse formula string into blocks
function parseFormulaToBlocks(formula: string): FormulaBlock[] {
  const tokens = formula.split(/\s+/);
  return tokens.map(token => {
    if (token.match(/^[+\-*/=><]$/)) {
      return {
        id: `op_${Date.now()}_${Math.random()}`,
        type: 'operator',
        content: token
      };
    } else if (token.startsWith('(') && token.endsWith(')')) {
      return {
        id: `group_${Date.now()}_${Math.random()}`,
        type: 'group',
        content: '()',
        children: parseFormulaToBlocks(token.slice(1, -1))
      };
    } else if (token.match(/^\d+(\.\d+)?$/)) {
      return {
        id: `value_${Date.now()}_${Math.random()}`,
        type: 'value',
        content: token,
        value: Number(token)
      };
    } else {
      return {
        id: `var_${Date.now()}_${Math.random()}`,
        type: 'variable',
        content: token
      };
    }
  });
} 
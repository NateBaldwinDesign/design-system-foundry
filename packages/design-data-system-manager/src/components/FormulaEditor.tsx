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
import { DragDropContext, Droppable, Draggable, DropResult, DragUpdate } from '@hello-pangea/dnd';
import { Variable } from '../types/algorithm';

interface FormulaBlock {
  id: string;
  type: 'variable' | 'operator' | 'group' | 'value' | 'array' | 'range';
  content: string;
  value?: string | number;
  children?: FormulaBlock[];
  // For array and range types
  arrayValues?: number[];
  rangeStart?: number;
  rangeEnd?: number;
  rangeStep?: number;
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

// JavaScript to LaTeX lookup table for common patterns
const JAVASCRIPT_TO_LATEX_LOOKUP: Record<string, string> = {
  // Math functions
  'Math.pow': '^{',
  'Math.sqrt': '\\sqrt{',
  'Math.abs': '|',
  'Math.floor': '\\lfloor ',
  'Math.ceil': '\\lceil ',
  'Math.round': '\\text{round}(',
  'Math.min': '\\min(',
  'Math.max': '\\max(',
  'Math.sin': '\\sin(',
  'Math.cos': '\\cos(',
  'Math.tan': '\\tan(',
  'Math.log': '\\ln(',
  'Math.log10': '\\log_{10}(',
  'Math.exp': 'e^{',
  
  // Common variable patterns
  'Base': '\\mathit{Base}',
  'Ratio': '\\mathit{Ratio}',
  'Increment': '\\mathit{Increment}',
  'BaseSpacing': '\\mathit{BaseSpacing}',
  'Multiplier': '\\mathit{Multiplier}',
  'n': 'n',
  
  // Common expressions
  'Base * Math.pow(Ratio, Increment)': '\\mathit{Base} \\times \\mathit{Ratio}^{\\mathit{Increment}}',
  'BaseSpacing * Math.pow(Multiplier, n)': '\\mathit{BaseSpacing} \\times \\mathit{Multiplier}^{n}',
  'x + y': 'x + y',
  'x * y': 'x \\times y',
  
  // Fallback patterns
  'Math.': '\\text{Math.}',
  'function': '\\text{function}',
  '=>': '\\Rightarrow'
};

// Function to convert JavaScript expression to LaTeX using lookup table
function convertJavaScriptToLatex(javascriptExpression: string): string {
  // First check for exact matches
  if (JAVASCRIPT_TO_LATEX_LOOKUP[javascriptExpression]) {
    return JAVASCRIPT_TO_LATEX_LOOKUP[javascriptExpression];
  }
  
  // Try to convert common patterns
  let latex = javascriptExpression;
  
  // Replace Math.pow(a, b) with a^{b}
  latex = latex.replace(/Math\.pow\(([^,]+),\s*([^)]+)\)/g, '$1^{$2}');
  
  // Replace Math.sqrt(a) with \sqrt{a}
  latex = latex.replace(/Math\.sqrt\(([^)]+)\)/g, '\\sqrt{$1}');
  
  // Replace Math.abs(a) with |a|
  latex = latex.replace(/Math\.abs\(([^)]+)\)/g, '|$1|');
  
  // Replace Math.floor(a) with \lfloor a \rfloor
  latex = latex.replace(/Math\.floor\(([^)]+)\)/g, '\\lfloor $1 \\rfloor');
  
  // Replace Math.ceil(a) with \lceil a \rceil
  latex = latex.replace(/Math\.ceil\(([^)]+)\)/g, '\\lceil $1 \\rceil');
  
  // Replace Math.round(a) with \text{round}(a)
  latex = latex.replace(/Math\.round\(([^)]+)\)/g, '\\text{round}($1)');
  
  // Replace Math.min(a, b) with \min(a, b)
  latex = latex.replace(/Math\.min\(([^)]+)\)/g, '\\min($1)');
  
  // Replace Math.max(a, b) with \max(a, b)
  latex = latex.replace(/Math\.max\(([^)]+)\)/g, '\\max($1)');
  
  // Replace Math.sin(a) with \sin(a)
  latex = latex.replace(/Math\.sin\(([^)]+)\)/g, '\\sin($1)');
  
  // Replace Math.cos(a) with \cos(a)
  latex = latex.replace(/Math\.cos\(([^)]+)\)/g, '\\cos($1)');
  
  // Replace Math.tan(a) with \tan(a)
  latex = latex.replace(/Math\.tan\(([^)]+)\)/g, '\\tan($1)');
  
  // Replace Math.log(a) with \ln(a)
  latex = latex.replace(/Math\.log\(([^)]+)\)/g, '\\ln($1)');
  
  // Replace Math.log10(a) with \log_{10}(a)
  latex = latex.replace(/Math\.log10\(([^)]+)\)/g, '\\log_{10}($1)');
  
  // Replace Math.exp(a) with e^{a}
  latex = latex.replace(/Math\.exp\(([^)]+)\)/g, 'e^{$1}');
  
  // Replace * with \times
  latex = latex.replace(/\*/g, ' \\times ');
  
  // Replace / with \div
  latex = latex.replace(/\//g, ' \\div ');
  
  // Replace % with \bmod
  latex = latex.replace(/%/g, ' \\bmod ');
  
  // Replace >= with \geq
  latex = latex.replace(/>=/g, ' \\geq ');
  
  // Replace <= with \leq
  latex = latex.replace(/<=/g, ' \\leq ');
  
  // Replace != with \neq
  latex = latex.replace(/!=/g, ' \\neq ');
  
  // Replace => with \Rightarrow
  latex = latex.replace(/=>/g, ' \\Rightarrow ');
  
  // Wrap multi-character variable names in \mathit{}
  // But exclude LaTeX commands and common math terms
  latex = latex.replace(/\b([a-zA-Z][a-zA-Z0-9]*)\b/g, (_, varName) => {
    if (varName.length > 1 && 
        !['sin', 'cos', 'tan', 'log', 'ln', 'min', 'max', 'round', 'times', 'div', 'bmod', 'geq', 'leq', 'neq'].includes(varName)) {
      return `\\mathit{${varName}}`;
    }
    return varName;
  });
  
  // Fix: Don't wrap LaTeX commands in \mathit{}
  // This prevents \times, \div, \bmod, etc. from being treated as variables
  latex = latex.replace(/\\mathit\{([^}]+)\}/g, (match, content) => {
    // If the content starts with a backslash, it's a LaTeX command, so don't wrap it
    if (content.startsWith('\\')) {
      return content;
    }
    return match;
  });
  
  // After all replacements, clean up spaces around operators and exponents
  // Remove space before caret and format as ^{n}
  latex = latex.replace(/\s*\^\s*([a-zA-Z0-9]+)/g, '^{$1}');
  // Remove extra spaces around \times, \div, etc.
  latex = latex.replace(/\s*\\(times|div|bmod|geq|leq|neq|Rightarrow)\s*/g, ' \\$1 ');
  
  return latex.trim();
}

const FormulaBlockComponent: React.FC<{
  block: FormulaBlock;
  index: number;
  onDelete: (id: string) => void;
  colorMode: 'light' | 'dark';
  isGroupDropTarget?: boolean;
}> = ({ block, index, onDelete, colorMode, isGroupDropTarget }) => {
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
            <Box
              p={2}
              bg={isGroupDropTarget ? 'blue.100' : colorMode === 'dark' ? 'gray.800' : 'gray.50'}
              borderRadius="md"
              minH="50px"
            >
              <HStack spacing={2} wrap="wrap">
                {block.children?.map((child) => (
                  <Box
                    key={child.id}
                    p={1}
                    bg={colorMode === 'dark' ? 'gray.700' : 'white'}
                    borderRadius="sm"
                    borderWidth={1}
                    borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                  >
                    <Badge
                      size="sm"
                      colorScheme={
                        child.type === 'variable' ? 'blue' :
                        child.type === 'operator' ? 'purple' :
                        child.type === 'value' ? 'gray' : 'green'
                      }
                    >
                      {child.content}
                    </Badge>
                  </Box>
                ))}
              </HStack>
            </Box>
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
              block.type === 'value' ? 'gray' :
              block.type === 'array' ? 'orange' :
              block.type === 'range' ? 'teal' : 'green'
            }
          >
            {block.type === 'array' && block.arrayValues ? 
              `[${block.arrayValues.join(', ')}]` :
              block.type === 'range' && block.rangeStart !== undefined ? 
                `${block.rangeStart}..${block.rangeEnd} (${block.rangeStep})` :
              block.content}
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
    // Parse all expressions into blocks - the lookup table will handle conversion
    const parsedBlocks = parseFormulaToBlocks(value);
    console.log('FormulaEditor: Parsed blocks for expression:', value, parsedBlocks);
    return parsedBlocks;
  });
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isArrayOpen, onOpen: onArrayOpen, onClose: onArrayClose } = useDisclosure();
  const { isOpen: isRangeOpen, onOpen: onRangeOpen, onClose: onRangeClose } = useDisclosure();
  const [selectedBlock, setSelectedBlock] = useState<FormulaBlock | null>(null);
  const [validationMessage, setValidationMessage] = useState<string>('');
  const [groupDropTargetId, setGroupDropTargetId] = useState<string>('');
  const [arrayInput, setArrayInput] = useState<string>('');
  const [rangeStart, setRangeStart] = useState<string>('0');
  const [rangeEnd, setRangeEnd] = useState<string>('10');
  const [rangeStep, setRangeStep] = useState<string>('1');

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
    if (!result.destination) {
      setGroupDropTargetId('');
      return;
    }

    const { source, destination } = result;
    const newBlocks = Array.from(blocks);
    const [movedBlock] = newBlocks.splice(source.index, 1);

    // Check if the destination is a group block
    const destinationBlock = newBlocks[destination.index];
    
    // If dropping onto a group block, insert into that group's children
    if (destinationBlock && destinationBlock.type === 'group') {
      destinationBlock.children = destinationBlock.children || [];
      destinationBlock.children.push(movedBlock);
      setBlocks(newBlocks);
      setGroupDropTargetId('');
      return;
    }

    // Otherwise, reorder at the top level
    newBlocks.splice(destination.index, 0, movedBlock);
    setBlocks(newBlocks);
    setGroupDropTargetId('');
  };

  const handleDragStart = () => {
    // Clear any existing drop target when starting a new drag
    setGroupDropTargetId('');
  };

  const handleDragUpdate = (update: DragUpdate) => {
    if (!update.destination) {
      setGroupDropTargetId('');
      return;
    }

    // Check if hovering over a group block
    const destinationBlock = blocks[update.destination.index];
    if (destinationBlock && destinationBlock.type === 'group') {
      setGroupDropTargetId(destinationBlock.id);
    } else {
      setGroupDropTargetId('');
    }
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

  const handleAddArray = () => {
    setArrayInput('');
    onArrayOpen();
  };

  const handleAddRange = () => {
    setRangeStart('0');
    setRangeEnd('10');
    setRangeStep('1');
    onRangeOpen();
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

  const handleArraySave = () => {
    const values = arrayInput
      .split(',')
      .map(v => v.trim())
      .filter(v => v !== '')
      .map(v => Number(v))
      .filter(n => !isNaN(n));

    if (values.length > 0) {
      const newBlock: FormulaBlock = {
        id: `array_${Date.now()}`,
        type: 'array',
        content: `[${values.join(', ')}]`,
        arrayValues: values
      };

      setBlocks(prev => [...prev, newBlock]);
      onArrayClose();
    }
  };

  const handleRangeSave = () => {
    const start = Number(rangeStart);
    const end = Number(rangeEnd);
    const step = Number(rangeStep);

    if (!isNaN(start) && !isNaN(end) && !isNaN(step) && step > 0) {
      const newBlock: FormulaBlock = {
        id: `range_${Date.now()}`,
        type: 'range',
        content: `${start}..${end} (step ${step})`,
        rangeStart: start,
        rangeEnd: end,
        rangeStep: step
      };

      setBlocks(prev => [...prev, newBlock]);
      onRangeClose();
    }
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
      let formula = '';
      let i = 0;

      while (i < blocks.length) {
        const block = blocks[i];
        
        switch (block.type) {
          case 'variable':
            formula += block.content;
            break;
          case 'operator':
            if (block.content === '^') {
              // Handle power operator - convert to Math.pow if there are variables
              const base = formula.trim();
              i++;
              if (i < blocks.length) {
                const exponent = buildFormula([blocks[i]]);
                // Check if base and exponent are variables (not numbers)
                const baseIsVar = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(base);
                const exponentIsVar = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(exponent);
                
                if (baseIsVar || exponentIsVar) {
                  // Use Math.pow for variables
                  formula = `Math.pow(${base}, ${exponent})`;
                } else {
                  // Use ^ for simple expressions
                  formula += ` ^ ${exponent}`;
                }
              }
            } else {
              formula += ` ${block.content} `;
            }
            break;
          case 'group':
            formula += `(${block.children ? buildFormula(block.children) : ''})`;
            break;
          case 'value':
            formula += block.content;
            break;
          case 'array':
            if (block.arrayValues) {
              formula += `[${block.arrayValues.join(', ')}]`;
            }
            break;
          case 'range':
            if (block.rangeStart !== undefined && block.rangeEnd !== undefined && block.rangeStep !== undefined) {
              // Generate range array: [start, start+step, start+2*step, ..., end]
              const rangeValues = [];
              for (let i = block.rangeStart; i <= block.rangeEnd; i += block.rangeStep) {
                rangeValues.push(i);
              }
              formula += `[${rangeValues.join(', ')}]`;
            }
            break;
          default:
            formula += '';
        }
        i++;
      }

      return formula.trim();
    };

    // If blocks are empty, only call onChange if the current value is different from empty
    if (blocks.length === 0) {
      // Only convert and call onChange if there's actually a value to convert
      if (value && value.trim() !== '') {
        const latexExpression = convertJavaScriptToLatex(value);
        console.log('FormulaEditor: Converting JavaScript to LaTeX for empty blocks:', {
          javascript: value,
          latex: latexExpression
        });
        onChange(value, latexExpression);
      }
      setValidationMessage('');
      return;
    }

    const formula = buildFormula(blocks);
    const latexExpression = convertJavaScriptToLatex(formula);
    
    // Progressive validation for inline feedback
    const validationMsg = validateFormulaStructure(blocks);
    setValidationMessage(validationMsg);
    
    // Only call onChange if the formula has actually changed from the current value
    if (formula !== value) {
      onChange(formula, latexExpression);
    }
  }, [blocks, onChange, variables, mode, value]);

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

          <Button
            aria-label="Add array"
            leftIcon={<SquareFunction size={16} />}
            size="sm"
            onClick={handleAddArray}
          >
            Array
          </Button>

          <Button
            aria-label="Add range"
            leftIcon={<SquareFunction size={16} />}
            size="sm"
            onClick={handleAddRange}
          >
            Range
          </Button>
        </HStack>
        
        {/* Formula Blocks */}
        <Box
          p={4}
          bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
          borderRadius="md"
          minH="100px"
        >
          <DragDropContext onDragEnd={handleDragEnd} onDragStart={handleDragStart} onDragUpdate={handleDragUpdate}>
            <Droppable droppableId="formula-blocks" direction="horizontal">
              {(provided) => (
                <HStack
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  spacing={2}
                  wrap="wrap"
                  minH="60px"
                  align="start"
                >
                  {blocks.map((block, index) => (
                    <FormulaBlockComponent
                      key={block.id}
                      block={block}
                      index={index}
                      onDelete={handleDeleteBlock}
                      colorMode={colorMode}
                      isGroupDropTarget={groupDropTargetId === block.id}
                    />
                  ))}
                  {provided.placeholder}
                </HStack>
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

      {/* Array Input Modal */}
      <Modal isOpen={isArrayOpen} onClose={onArrayClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create Array</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} pb={4}>
              <Input
                placeholder="Enter numbers separated by commas (e.g., 1, 2, 3, 4, 5)"
                value={arrayInput}
                onChange={e => setArrayInput(e.target.value)}
              />
              <Button
                leftIcon={<Check size={16} />}
                colorScheme="blue"
                onClick={handleArraySave}
              >
                Create Array
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Range Input Modal */}
      <Modal isOpen={isRangeOpen} onClose={onRangeClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create Range</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} pb={4}>
              <HStack spacing={2}>
                <Input
                  placeholder="Start"
                  value={rangeStart}
                  onChange={e => setRangeStart(e.target.value)}
                />
                <Input
                  placeholder="End"
                  value={rangeEnd}
                  onChange={e => setRangeEnd(e.target.value)}
                />
                <Input
                  placeholder="Step"
                  value={rangeStep}
                  onChange={e => setRangeStep(e.target.value)}
                />
              </HStack>
              <Button
                leftIcon={<Check size={16} />}
                colorScheme="blue"
                onClick={handleRangeSave}
              >
                Create Range
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
  // Handle Math.pow(a, b) expressions by converting them to a^b structure
  if (formula.includes('Math.pow(')) {
    // Find all Math.pow calls and replace them with a^b format
    let processedFormula = formula;
    const mathPowMatches = formula.match(/Math\.pow\(([^,]+),\s*([^)]+)\)/g);
    
    if (mathPowMatches) {
      mathPowMatches.forEach(match => {
        const innerMatch = match.match(/Math\.pow\(([^,]+),\s*([^)]+)\)/);
        if (innerMatch) {
          const base = innerMatch[1].trim();
          const exponent = innerMatch[2].trim();
          const replacement = `${base} ^ ${exponent}`;
          processedFormula = processedFormula.replace(match, replacement);
        }
      });
    }
    
    // Now parse the processed formula
    return parseSimpleExpression(processedFormula);
  }
  
  // For other expressions, use the simple parser
  return parseSimpleExpression(formula);
}

// Helper function to parse simple expressions (no Math.pow)
function parseSimpleExpression(formula: string): FormulaBlock[] {
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
        children: parseSimpleExpression(token.slice(1, -1))
      };
    } else if (token.startsWith('[') && token.endsWith(']')) {
      // Parse array: [1, 2, 3, 4]
      const arrayContent = token.slice(1, -1);
      const values = arrayContent
        .split(',')
        .map(v => v.trim())
        .map(v => Number(v))
        .filter(n => !isNaN(n));
      
      return {
        id: `array_${Date.now()}_${Math.random()}`,
        type: 'array',
        content: token,
        arrayValues: values
      };
    } else if (token.match(/^\d+\.\.\d+/)) {
      // Parse range: 0..10 or 0..10:1
      const rangeMatch = token.match(/^(\d+)\.\.(\d+)(?::(\d+))?$/);
      if (rangeMatch) {
        const start = Number(rangeMatch[1]);
        const end = Number(rangeMatch[2]);
        const step = rangeMatch[3] ? Number(rangeMatch[3]) : 1;
        
        return {
          id: `range_${Date.now()}_${Math.random()}`,
          type: 'range',
          content: `${start}..${end} (step ${step})`,
          rangeStart: start,
          rangeEnd: end,
          rangeStep: step
        };
      }
    } else if (token.match(/^\d+(\.\d+)?$/)) {
      return {
        id: `value_${Date.now()}_${Math.random()}`,
        type: 'value',
        content: token,
        value: Number(token)
      };
    }
    
    // Default case: treat as variable
    return {
      id: `var_${Date.now()}_${Math.random()}`,
      type: 'variable',
      content: token
    };
  });
}
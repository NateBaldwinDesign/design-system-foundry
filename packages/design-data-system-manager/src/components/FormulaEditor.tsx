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
  AlertDescription,
  Divider,
  AlertTitle
} from '@chakra-ui/react';
import { Plus, Trash2, GripVertical, Parentheses, Check, ChevronDown, SquareFunction, VariableIcon, TextCursorInputIcon, SplitIcon } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult, DragUpdate } from '@hello-pangea/dnd';
import { Variable, ASTNode } from '../types/algorithm';
import { SystemVariableService } from '../services/systemVariableService';
import { ASTService } from '../services/astService';

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
  onChange: (value: string, latexExpression: string, ast: ASTNode) => void;
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

// Function to convert JavaScript expression to LaTeX using lookup table
function convertJavaScriptToLatex(javascriptExpression: string): string {
  if (!javascriptExpression || javascriptExpression.trim() === '') {
    return '';
  }

  try {
    let latexExpression = javascriptExpression;

    // Handle Math.pow(a, b) -> a^b
    latexExpression = latexExpression.replace(/Math\.pow\(([^,]+),\s*([^)]+)\)/g, '($1)^{$2}');
    
    // Handle Math.sqrt(a) -> \sqrt{a}
    latexExpression = latexExpression.replace(/Math\.sqrt\(([^)]+)\)/g, '\\sqrt{$1}');
    
    // Handle Math.abs(a) -> |a|
    latexExpression = latexExpression.replace(/Math\.abs\(([^)]+)\)/g, '|$1|');
    
    // Handle Math.floor(a) -> \lfloor a \rfloor
    latexExpression = latexExpression.replace(/Math\.floor\(([^)]+)\)/g, '\\lfloor $1 \\rfloor');
    
    // Handle Math.ceil(a) -> \lceil a \rceil
    latexExpression = latexExpression.replace(/Math\.ceil\(([^)]+)\)/g, '\\lceil $1 \\rceil');
    
    // Handle Math.round(a) -> \text{round}(a)
    latexExpression = latexExpression.replace(/Math\.round\(([^)]+)\)/g, '\\text{round}($1)');
    
    // Handle Math.min(a, b) -> \min(a, b)
    latexExpression = latexExpression.replace(/Math\.min\(([^)]+)\)/g, '\\min($1)');
    
    // Handle Math.max(a, b) -> \max(a, b)
    latexExpression = latexExpression.replace(/Math\.max\(([^)]+)\)/g, '\\max($1)');
    
    // Handle basic operators
    latexExpression = latexExpression.replace(/\*/g, '\\cdot ');
    latexExpression = latexExpression.replace(/\//g, '\\div ');
    
    // Handle comparison operators for conditions
    latexExpression = latexExpression.replace(/==/g, '=');
    latexExpression = latexExpression.replace(/!=/g, '\\neq ');
    latexExpression = latexExpression.replace(/>=/g, '\\geq ');
    latexExpression = latexExpression.replace(/<=/g, '\\leq ');
    
    // Handle logical operators
    latexExpression = latexExpression.replace(/&&/g, '\\land ');
    latexExpression = latexExpression.replace(/\|\|/g, '\\lor ');
    latexExpression = latexExpression.replace(/!/g, '\\neg ');
    
    // Handle arrays [1, 2, 3] -> [1, 2, 3]
    latexExpression = latexExpression.replace(/\[([^\]]+)\]/g, '[$1]');
    
    // Handle ranges 0..10 -> [0, 1, 2, ..., 10]
    latexExpression = latexExpression.replace(/(\d+)\.\.(\d+)/g, '[$1, $1+1, ..., $2]');
    
    // Clean up extra spaces
    latexExpression = latexExpression.replace(/\s+/g, ' ').trim();
    
    return latexExpression;
  } catch (error) {
    console.warn('LaTeX conversion error:', error);
    return javascriptExpression; // Fallback to original expression
  }
}

const FormulaBlockComponent: React.FC<{
  block: FormulaBlock;
  index: number;
  onDelete: (id: string) => void;
  colorMode: 'light' | 'dark';
  isGroupDropTarget?: boolean;
  onClick?: (block: FormulaBlock) => void;
}> = ({ block, index, onDelete, colorMode, isGroupDropTarget, onClick }) => {
  // Syntax highlighting colors
  const getSyntaxColors = (content: string, type: string) => {
    const isDark = colorMode === 'dark';
    
    // Math functions
    if (content.startsWith('Math.')) {
      return {
        bg: isDark ? 'purple.800' : 'purple.100',
        color: isDark ? 'purple.200' : 'purple.800',
        border: isDark ? 'purple.600' : 'purple.300'
      };
    }
    
    // Operators
    if (['+', '-', '*', '/', '^', '==', '!=', '>', '<', '>=', '<=', '&&', '||', '!'].includes(content)) {
      return {
        bg: isDark ? 'orange.800' : 'orange.100',
        color: isDark ? 'orange.200' : 'orange.800',
        border: isDark ? 'orange.600' : 'orange.300'
      };
    }
    
    // Numbers
    if (/^\d+(\.\d+)?$/.test(content)) {
      return {
        bg: isDark ? 'green.800' : 'green.100',
        color: isDark ? 'green.200' : 'green.800',
        border: isDark ? 'green.600' : 'green.300'
      };
    }
    
    // Variables
    if (type === 'variable') {
      return {
        bg: isDark ? 'blue.800' : 'blue.100',
        color: isDark ? 'blue.200' : 'blue.800',
        border: isDark ? 'blue.600' : 'blue.300'
      };
    }
    
    // Arrays and ranges
    if (type === 'array' || type === 'range') {
      return {
        bg: isDark ? 'teal.800' : 'teal.100',
        color: isDark ? 'teal.200' : 'teal.800',
        border: isDark ? 'teal.600' : 'teal.300'
      };
    }
    
    // Default
    return {
      bg: isDark ? 'gray.700' : 'white',
      color: isDark ? 'gray.200' : 'gray.800',
      border: isDark ? 'gray.600' : 'gray.200'
    };
  };

  const syntaxColors = getSyntaxColors(block.content, block.type);

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
                {block.children?.map((child) => {
                  const childColors = getSyntaxColors(child.content, child.type);
                  return (
                    <Box
                      key={child.id}
                      p={1}
                      bg={childColors.bg}
                      color={childColors.color}
                      borderRadius="sm"
                      borderWidth={1}
                      borderColor={childColors.border}
                      cursor={onClick && (child.type === 'variable' || child.type === 'operator') ? 'pointer' : 'default'}
                      onClick={() => onClick && onClick(child)}
                      _hover={onClick && (child.type === 'variable' || child.type === 'operator') ? {
                        opacity: 0.8,
                        transform: 'scale(1.05)'
                      } : {}}
                    >
                      <Badge
                        size="sm"
                        colorScheme={
                          child.type === 'variable' ? 'blue' :
                          child.type === 'operator' ? 'purple' :
                          child.type === 'value' ? 'gray' : 'green'
                        }
                        bg="transparent"
                        color="inherit"
                      >
                        {child.content}
                      </Badge>
                    </Box>
                  );
                })}
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
          bg={syntaxColors.bg}
          color={syntaxColors.color}
          borderRadius="md"
          boxShadow={snapshot.isDragging ? "md" : "sm"}
          borderWidth={1}
          borderColor={syntaxColors.border}
          cursor={onClick && (block.type === 'variable' || block.type === 'operator') ? 'pointer' : 'default'}
          onClick={() => onClick && onClick(block)}
          _hover={onClick && (block.type === 'variable' || block.type === 'operator') ? {
            opacity: 0.8,
            transform: 'scale(1.02)'
          } : {}}
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
            onClick={(e) => {
              e.stopPropagation();
              onDelete(block.id);
            }}
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
  const [systemVariables, setSystemVariables] = useState<Variable[]>([]);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editingBlockType, setEditingBlockType] = useState<'variable' | 'operator' | null>(null);
  const [astValidationErrors, setAstValidationErrors] = useState<string[]>([]);
  const [astComplexity, setAstComplexity] = useState<'low' | 'medium' | 'high'>('low');
  const [showAutoComplete, setShowAutoComplete] = useState(false);
  const [autoCompleteSuggestions, setAutoCompleteSuggestions] = useState<Array<{id: string, label: string, type: 'variable' | 'operator' | 'template'}>>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [optimizationResult, setOptimizationResult] = useState<{original: string, optimized: string, improvements: string[]} | null>(null);

  // Load system variables on mount and when window gains focus
  useEffect(() => {
    const loadSystemVariables = () => {
      const userSystemVariables = SystemVariableService.getSystemVariables();
      const allSystemVariables: Variable[] = [
        // Built-in system variable 'n' (always available)
        {
          id: 'system_n',
          name: 'n',
          type: 'number',
          defaultValue: '0'
        },
        // User-defined system variables from storage
        ...userSystemVariables
      ];
      setSystemVariables(allSystemVariables);
    };

    loadSystemVariables();
    
    const handleFocus = () => {
      loadSystemVariables();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

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

  // Combine system variables with user variables
  const allVariables = [...systemVariables, ...variables];

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

    // Enhanced validation for formula dependencies and system variables
    const variableBlocks = blocks.filter(block => block.type === 'variable').map(block => block.content);
    const systemVarNames = systemVariables.map(v => v.name);
    const algorithmVarNames = variables.map(v => v.name);
    
    // Check for undefined variables
    const undefinedVariables = variableBlocks.filter(v => 
      !systemVarNames.includes(v) && !algorithmVarNames.includes(v)
    );
    
    if (undefinedVariables.length > 0) {
      return `Undefined variables detected: ${undefinedVariables.join(', ')}. Make sure all variables are defined in the Variables tab.`;
    }

    // Check for system variable usage
    const usedSystemVariables = variableBlocks.filter(v => systemVarNames.includes(v));
    if (usedSystemVariables.length > 0) {
      return `Using system variables: ${usedSystemVariables.join(', ')}. These will be automatically available during execution.`;
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

  const handleBlockClick = (block: FormulaBlock) => {
    if (block.type === 'variable') {
      setEditingBlockId(block.id);
      setEditingBlockType('variable');
    } else if (block.type === 'operator') {
      setEditingBlockId(block.id);
      setEditingBlockType('operator');
    }
  };

  const handleVariableChange = (variable: Variable) => {
    if (editingBlockId) {
      setBlocks(prev => prev.map(block => 
        block.id === editingBlockId 
          ? { ...block, content: variable.name }
          : block
      ));
      setEditingBlockId(null);
      setEditingBlockType(null);
    }
  };

  const handleOperatorChange = (operatorId: string) => {
    if (editingBlockId) {
      const updatedBlocks = blocks.map(block => 
        block.id === editingBlockId 
          ? { ...block, content: operatorId }
          : block
      );
      setBlocks(updatedBlocks);
      setEditingBlockId(null);
      setEditingBlockType(null);
    }
  };

  // Auto-completion functionality
  const generateAutoCompleteSuggestions = (input: string) => {
    const suggestions: Array<{id: string, label: string, type: 'variable' | 'operator' | 'template'}> = [];
    
    // Variable suggestions
    allVariables.forEach(variable => {
      if (variable.name.toLowerCase().includes(input.toLowerCase())) {
        suggestions.push({
          id: variable.id,
          label: variable.name,
          type: 'variable'
        });
      }
    });
    
    // Operator suggestions
    const operators = mode === 'formula' 
      ? ['+', '-', '*', '/', '^', 'Math.pow', 'Math.sqrt', 'Math.abs', 'Math.round', 'Math.floor', 'Math.ceil']
      : ['==', '!=', '>', '<', '>=', '<=', '&&', '||', '!'];
    
    operators.forEach(op => {
      if (op.toLowerCase().includes(input.toLowerCase())) {
        suggestions.push({
          id: op,
          label: op,
          type: 'operator'
        });
      }
    });
    
    // Expression templates
    const templates = [
      { id: 'pow', label: 'Power (a^b)', type: 'template' as const },
      { id: 'sqrt', label: 'Square Root', type: 'template' as const },
      { id: 'abs', label: 'Absolute Value', type: 'template' as const },
      { id: 'round', label: 'Round to Integer', type: 'template' as const },
      { id: 'min', label: 'Minimum of Values', type: 'template' as const },
      { id: 'max', label: 'Maximum of Values', type: 'template' as const }
    ];
    
    templates.forEach(template => {
      if (template.label.toLowerCase().includes(input.toLowerCase())) {
        suggestions.push(template);
      }
    });
    
    return suggestions.slice(0, 8); // Limit to 8 suggestions
  };

  const handleAutoCompleteInput = (input: string) => {
    if (input.length >= 2) {
      const suggestions = generateAutoCompleteSuggestions(input);
      setAutoCompleteSuggestions(suggestions);
      setShowAutoComplete(suggestions.length > 0);
      setSelectedSuggestionIndex(0);
    } else {
      setShowAutoComplete(false);
    }
  };

  const handleAutoCompleteSelect = (suggestion: {id: string, label: string, type: 'variable' | 'operator' | 'template'}) => {
    if (suggestion.type === 'variable') {
      const variable = allVariables.find(v => v.id === suggestion.id);
      if (variable) {
        handleAddVariable(variable);
      }
    } else if (suggestion.type === 'operator') {
      handleAddOperator(suggestion.id);
    } else if (suggestion.type === 'template') {
      handleAddTemplate(suggestion.id);
    }
    setShowAutoComplete(false);
  };

  const handleAddTemplate = (templateId: string) => {
    const templateBlocks: FormulaBlock[] = [];
    
    switch (templateId) {
      case 'pow':
        templateBlocks.push(
          { id: `var_${Date.now()}_1`, type: 'variable', content: 'base' },
          { id: `op_${Date.now()}_1`, type: 'operator', content: '^' },
          { id: `var_${Date.now()}_2`, type: 'variable', content: 'exponent' }
        );
        break;
      case 'sqrt':
        templateBlocks.push(
          { id: `op_${Date.now()}_1`, type: 'operator', content: 'Math.sqrt' },
          { id: `group_${Date.now()}_1`, type: 'group', content: '()', children: [
            { id: `var_${Date.now()}_1`, type: 'variable', content: 'value' }
          ]}
        );
        break;
      case 'abs':
        templateBlocks.push(
          { id: `op_${Date.now()}_1`, type: 'operator', content: 'Math.abs' },
          { id: `group_${Date.now()}_1`, type: 'group', content: '()', children: [
            { id: `var_${Date.now()}_1`, type: 'variable', content: 'value' }
          ]}
        );
        break;
      case 'round':
        templateBlocks.push(
          { id: `op_${Date.now()}_1`, type: 'operator', content: 'Math.round' },
          { id: `group_${Date.now()}_1`, type: 'group', content: '()', children: [
            { id: `var_${Date.now()}_1`, type: 'variable', content: 'value' }
          ]}
        );
        break;
      case 'min':
        templateBlocks.push(
          { id: `op_${Date.now()}_1`, type: 'operator', content: 'Math.min' },
          { id: `group_${Date.now()}_1`, type: 'group', content: '()', children: [
            { id: `var_${Date.now()}_1`, type: 'variable', content: 'value1' },
            { id: `op_${Date.now()}_2`, type: 'operator', content: ',' },
            { id: `var_${Date.now()}_2`, type: 'variable', content: 'value2' }
          ]}
        );
        break;
      case 'max':
        templateBlocks.push(
          { id: `op_${Date.now()}_1`, type: 'operator', content: 'Math.max' },
          { id: `group_${Date.now()}_1`, type: 'group', content: '()', children: [
            { id: `var_${Date.now()}_1`, type: 'variable', content: 'value1' },
            { id: `op_${Date.now()}_2`, type: 'operator', content: ',' },
            { id: `var_${Date.now()}_2`, type: 'variable', content: 'value2' }
          ]}
        );
        break;
    }
    
    setBlocks([...blocks, ...templateBlocks]);
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
        // Generate AST for the existing value
        const ast = ASTService.parseExpression(value);
        console.log('FormulaEditor: Converting JavaScript to LaTeX for empty blocks:', {
          javascript: value,
          latex: latexExpression,
          ast: ast
        });
        onChange(value, latexExpression, ast);
      }
      setValidationMessage('');
      return;
    }

    const formula = buildFormula(blocks);
    const latexExpression = convertJavaScriptToLatex(formula);
    
    // Generate AST for the formula
    const ast = ASTService.parseExpression(formula);
    
    // Validate AST and update validation state
    const validationErrors = ASTService.validateAST(ast);
    setAstValidationErrors(validationErrors);
    setAstComplexity(ast.metadata?.complexity || 'low');
    
    // Progressive validation for inline feedback
    const validationMsg = validateFormulaStructure(blocks);
    setValidationMessage(validationMsg);
    
    // Only call onChange if the formula has actually changed from the current value
    if (formula !== value) {
      onChange(formula, latexExpression, ast);
    }
  }, [blocks, onChange, variables, mode, value]);

  // Build formula from blocks (extracted from useEffect for reuse)
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

  // Expression optimization
  const handleOptimizeExpression = () => {
    if (blocks.length === 0) return;
    
    try {
      const currentFormula = buildFormula(blocks);
      const currentAST = ASTService.parseExpression(currentFormula);
      const optimizedAST = ASTService.optimizeExpression(currentAST);
      const optimizedFormula = ASTService.generateCode(optimizedAST);
      
      // Calculate improvements
      const improvements: string[] = [];
      const originalComplexity = ASTService.calculateComplexity(currentAST);
      const optimizedComplexity = ASTService.calculateComplexity(optimizedAST);
      
      if (optimizedComplexity !== originalComplexity) {
        improvements.push(`Complexity reduced from ${originalComplexity} to ${optimizedComplexity}`);
      }
      
      if (currentFormula !== optimizedFormula) {
        improvements.push('Expression simplified');
      }
      
      // Check for specific optimizations
      if (optimizedAST.type === 'literal' && currentAST.type !== 'literal') {
        improvements.push('Constant expression evaluated');
      }
      
      setOptimizationResult({
        original: currentFormula,
        optimized: optimizedFormula,
        improvements
      });
      
      // Apply optimization if there are improvements
      if (improvements.length > 0) {
        const optimizedBlocks = parseFormulaToBlocks(optimizedFormula);
        setBlocks(optimizedBlocks);
      }
      
    } catch (error) {
      console.warn('Optimization failed:', error);
      setOptimizationResult({
        original: buildFormula(blocks),
        optimized: buildFormula(blocks),
        improvements: ['No optimizations found']
      });
    }
  };

  return (
    <Box>
      <VStack spacing={4} align="stretch">
        {/* Toolbar */}
        <HStack spacing={2} wrap="wrap">
          {/* Auto-completion Input */}
          <Box position="relative" flex="1" maxW="300px">
            <Input
              placeholder="Type to search variables, operators, or templates..."
              size="sm"
              onChange={(e) => handleAutoCompleteInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSelectedSuggestionIndex(prev => 
                    prev < autoCompleteSuggestions.length - 1 ? prev + 1 : 0
                  );
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSelectedSuggestionIndex(prev => 
                    prev > 0 ? prev - 1 : autoCompleteSuggestions.length - 1
                  );
                } else if (e.key === 'Enter' && showAutoComplete && autoCompleteSuggestions.length > 0) {
                  e.preventDefault();
                  handleAutoCompleteSelect(autoCompleteSuggestions[selectedSuggestionIndex]);
                } else if (e.key === 'Escape') {
                  setShowAutoComplete(false);
                }
              }}
            />
            {showAutoComplete && autoCompleteSuggestions.length > 0 && (
              <Box
                position="absolute"
                top="100%"
                left={0}
                right={0}
                bg={colorMode === 'dark' ? 'gray.800' : 'white'}
                border="1px solid"
                borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                borderRadius="md"
                boxShadow="lg"
                zIndex={1000}
                maxH="200px"
                overflowY="auto"
              >
                {autoCompleteSuggestions.map((suggestion, index) => (
                  <Box
                    key={suggestion.id}
                    px={3}
                    py={2}
                    cursor="pointer"
                    bg={index === selectedSuggestionIndex ? (colorMode === 'dark' ? 'blue.600' : 'blue.100') : 'transparent'}
                    _hover={{ bg: colorMode === 'dark' ? 'blue.600' : 'blue.100' }}
                    onClick={() => handleAutoCompleteSelect(suggestion)}
                  >
                    <HStack spacing={2}>
                      <Box fontSize="sm" fontWeight="medium">
                        {suggestion.label}
                      </Box>
                      <Badge size="sm" colorScheme={
                        suggestion.type === 'variable' ? 'green' : 
                        suggestion.type === 'operator' ? 'blue' : 'purple'
                      }>
                        {suggestion.type}
                      </Badge>
                    </HStack>
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          <Menu>
            <MenuButton 
              as={Button} 
              size="sm"
              rightIcon={<ChevronDown size={16} />}
              leftIcon={<VariableIcon size={16} />}
            >
              Variable ({allVariables.length})
            </MenuButton>
            <MenuList>
              {systemVariables.length > 0 && (
                <>
                  {systemVariables.map(variable => (
                    <MenuItem
                      key={variable.id}
                      onClick={() => handleAddVariable(variable)}
                      icon={<Plus size={16} />}
                    >
                      {variable.name}
                      {variable.id === 'system_n' && (
                        <Badge ml={2} size="sm" colorScheme="green">Built-in</Badge>
                      )}
                      {variable.id !== 'system_n' && variable.id.startsWith('system-') && (
                        <Badge ml={2} size="sm" colorScheme="blue">System</Badge>
                      )}
                    </MenuItem>
                  ))}
                  {variables.length > 0 && <Divider />}
                </>
              )}
              {variables.map(variable => (
                <MenuItem
                  key={variable.id}
                  onClick={() => handleAddVariable(variable)}
                  icon={<Plus size={16} />}
                >
                  {variable.name}
                </MenuItem>
              ))}
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

          <Menu>
            <MenuButton
              as={Button}
              rightIcon={<ChevronDown size={16} />}
              leftIcon={<SquareFunction size={16} />}
              size="sm"
            >
              Templates
            </MenuButton>
            <MenuList>
              <MenuItem onClick={() => handleAddTemplate('pow')}>
                Power (a^b)
              </MenuItem>
              <MenuItem onClick={() => handleAddTemplate('sqrt')}>
                Square Root
              </MenuItem>
              <MenuItem onClick={() => handleAddTemplate('abs')}>
                Absolute Value
              </MenuItem>
              <MenuItem onClick={() => handleAddTemplate('round')}>
                Round to Integer
              </MenuItem>
              <MenuItem onClick={() => handleAddTemplate('min')}>
                Minimum of Values
              </MenuItem>
              <MenuItem onClick={() => handleAddTemplate('max')}>
                Maximum of Values
              </MenuItem>
            </MenuList>
          </Menu>

          <Button
            aria-label="Optimize expression"
            leftIcon={<SquareFunction size={16} />}
            size="sm"
            onClick={handleOptimizeExpression}
            colorScheme="green"
          >
            Optimize
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
                      onClick={handleBlockClick}
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

        {/* AST Validation Feedback */}
        {astValidationErrors.length > 0 && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <VStack align="start" spacing={1}>
              <AlertTitle fontSize="sm">Syntax Errors</AlertTitle>
              <AlertDescription fontSize="sm">
                {astValidationErrors.map((error, index) => (
                  <Box key={index} color="red.200">
                    • {error}
                  </Box>
                ))}
              </AlertDescription>
            </VStack>
          </Alert>
        )}

        {/* AST Complexity Indicator */}
        {astComplexity !== 'low' && (
          <Alert 
            status={astComplexity === 'high' ? 'warning' : 'info'} 
            borderRadius="md"
          >
            <AlertIcon />
            <AlertDescription fontSize="sm">
              Formula complexity: <Badge colorScheme={astComplexity === 'high' ? 'orange' : 'blue'}>{astComplexity}</Badge>
              {astComplexity === 'high' && ' - Consider breaking into smaller expressions'}
            </AlertDescription>
          </Alert>
        )}

        {/* Optimization Results */}
        {optimizationResult && (
          <Alert status="success" borderRadius="md">
            <AlertIcon />
            <VStack align="start" spacing={2}>
              <AlertTitle fontSize="sm">Optimization Applied</AlertTitle>
              <AlertDescription fontSize="sm">
                <VStack align="start" spacing={1}>
                  <Box>
                    <strong>Original:</strong> <code>{optimizationResult.original}</code>
                  </Box>
                  <Box>
                    <strong>Optimized:</strong> <code>{optimizationResult.optimized}</code>
                  </Box>
                  {optimizationResult.improvements.length > 0 && (
                    <Box>
                      <strong>Improvements:</strong>
                      {optimizationResult.improvements.map((improvement, index) => (
                        <Box key={index} ml={2} color="green.200">
                          • {improvement}
                        </Box>
                      ))}
                    </Box>
                  )}
                </VStack>
              </AlertDescription>
            </VStack>
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

      {/* Variable Selection Menu */}
      <Menu isOpen={editingBlockType === 'variable'} onClose={() => setEditingBlockType(null)}>
        <MenuList>
          {systemVariables.length > 0 && (
            <>
              {systemVariables.map(variable => (
                <MenuItem
                  key={variable.id}
                  onClick={() => handleVariableChange(variable)}
                  icon={<Plus size={16} />}
                >
                  {variable.name}
                  {variable.id === 'system_n' && (
                    <Badge ml={2} size="sm" colorScheme="green">Built-in</Badge>
                  )}
                  {variable.id !== 'system_n' && variable.id.startsWith('system-') && (
                    <Badge ml={2} size="sm" colorScheme="blue">System</Badge>
                  )}
                </MenuItem>
              ))}
              {variables.length > 0 && <Divider />}
            </>
          )}
          {variables.map(variable => (
            <MenuItem
              key={variable.id}
              onClick={() => handleVariableChange(variable)}
              icon={<Plus size={16} />}
            >
              {variable.name}
            </MenuItem>
          ))}
        </MenuList>
      </Menu>

      {/* Operator Selection Menu */}
      <Menu isOpen={editingBlockType === 'operator'} onClose={() => setEditingBlockType(null)}>
        <MenuList>
          {operatorOptions.map(op => (
            <MenuItem
              key={op.id}
              onClick={() => handleOperatorChange(op.id)}
            >
              {op.label}
            </MenuItem>
          ))}
        </MenuList>
      </Menu>
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
    }
    return {
      id: `var_${Date.now()}_${Math.random()}`,
      type: 'variable',
      content: token
    };
  });
}
import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Button,
  IconButton,
  useColorMode,
  Input,
  Tooltip,
  Badge,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Wrap,
  WrapItem,
  Menu,
  MenuButton,
  MenuList,
  MenuItem
} from '@chakra-ui/react';
import { Plus, Trash2, GripVertical, Parentheses, X, Check, ChevronDown } from 'lucide-react';
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
}

const OPERATORS = [
  { id: '+', label: 'Add (+)', symbol: '+', latex: '+' },
  { id: '-', label: 'Subtract (-)', symbol: '-', latex: '-' },
  { id: '*', label: 'Multiply (×)', symbol: '*', latex: '\\times' },
  { id: '/', label: 'Divide (÷)', symbol: '/', latex: '\\div' },
  { id: '^', label: 'Power (^)', symbol: '^', latex: '^' },
  { id: '%', label: 'Modulo (%)', symbol: '%', latex: '\\bmod' },
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

export const FormulaEditor: React.FC<FormulaEditorProps> = ({ variables, value, onChange }) => {
  const { colorMode } = useColorMode();
  const [blocks, setBlocks] = useState<FormulaBlock[]>(() => {
    if (!value) return [];
    return parseFormulaToBlocks(value);
  });
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedBlock, setSelectedBlock] = useState<FormulaBlock | null>(null);

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
    updateFormula(newBlocks);
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

    setBlocks(prev => {
      const newBlocks = [...prev, newBlock];
      updateFormula(newBlocks);
      return newBlocks;
    });
  };

  const handleAddOperator = (operatorId: string) => {
    const operator = OPERATORS.find(op => op.id === operatorId);
    if (!operator) return;

    const newBlock: FormulaBlock = {
      id: `op_${Date.now()}`,
      type: 'operator',
      content: operator.symbol
    };

    setBlocks(prev => {
      const newBlocks = [...prev, newBlock];
      updateFormula(newBlocks);
      return newBlocks;
    });
  };

  const handleAddGroup = () => {
    const newBlock: FormulaBlock = {
      id: `group_${Date.now()}`,
      type: 'group',
      content: '()',
      children: []
    };

    setBlocks(prev => {
      const newBlocks = [...prev, newBlock];
      updateFormula(newBlocks);
      return newBlocks;
    });
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

    setBlocks(prev => {
      const newBlocks = [...prev, newBlock];
      updateFormula(newBlocks);
      return newBlocks;
    });
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

    setBlocks(prev => {
      const newBlocks = deleteFromBlocks(prev);
      updateFormula(newBlocks);
      return newBlocks;
    });
  };

  const buildLatexFormula = (blocks: FormulaBlock[]): string => {
    let latex = '';
    let i = 0;

    while (i < blocks.length) {
      const block = blocks[i];
      const nextBlock = blocks[i + 1];
      const prevBlock = blocks[i - 1];
      let operator;
      let groupContent;

      switch (block.type) {
        case 'variable':
          latex += `{${block.content}}`;
          break;

        case 'operator':
          operator = OPERATORS.find(op => op.symbol === block.content);
          if (!operator) {
            latex += block.content;
            break;
          }

          // Special handling for division
          if (operator.id === '/') {
            if (prevBlock && nextBlock) {
              // Only slice if prevBlock is a variable or value
              if (prevBlock.type === 'variable' || prevBlock.type === 'value') {
                latex = latex.slice(0, -(`{${prevBlock.content}}`.length));
              }
              latex += `\\frac{{${prevBlock.content}}}{{${nextBlock.content}}}`;
              i++; // Skip the next block as it's now part of the fraction
            } else {
              latex += ` ${operator.latex} `;
            }
          }
          // Special handling for power
          else if (operator.id === '^') {
            if (prevBlock && nextBlock) {
              // Only slice if prevBlock is a variable or value
              if (prevBlock.type === 'variable' || prevBlock.type === 'value') {
                latex = latex.slice(0, -(`{${prevBlock.content}}`.length));
              }
              latex += `{${prevBlock.content}}^{${nextBlock.content}}`;
              i++; // Skip the next block as it's now part of the power
            } else {
              latex += ` ${operator.latex} `;
            }
          }
          // Special handling for multiplication
          else if (operator.id === '*') {
            latex += ` ${operator.latex} `;
          }
          // All other operators
          else {
            latex += ` ${operator.latex} `;
          }
          break;

        case 'group': {
          groupContent = block.children ? buildLatexFormula(block.children) : '';
          latex += `\\left(${groupContent}\\right)`;
          break;
        }

        case 'value':
          if (!isNaN(Number(block.content))) {
            latex += block.content;
          } else {
            latex += `{${block.content}}`;
          }
          break;
      }
      i++;
    }

    return latex;
  };

  const updateFormula = (blocks: FormulaBlock[]) => {
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
    onChange(formula, latexExpression);
  };

  return (
    <Box>
      <VStack spacing={4} align="stretch">
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

        {/* Toolbar */}
        <HStack spacing={2} wrap="wrap">
          <Wrap spacing={2}>
            {variables.map(variable => (
              <WrapItem key={variable.id}>
                <Tooltip label={`Add ${variable.name}`}>
                  <Button
                    size="sm"
                    leftIcon={<Plus size={16} />}
                    onClick={() => handleAddVariable(variable)}
                  >
                    {variable.name}
                  </Button>
                </Tooltip>
              </WrapItem>
            ))}
          </Wrap>

          <Menu>
            <MenuButton
              as={Button}
              rightIcon={<ChevronDown size={16} />}
              size="sm"
              width="200px"
            >
              Operations
            </MenuButton>
            <MenuList>
              {OPERATORS.map(op => (
                <MenuItem
                  key={op.id}
                  onClick={() => handleAddOperator(op.id)}
                >
                  {op.label}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>

          <Tooltip label="Add Group">
            <IconButton
              aria-label="Add group"
              icon={<Parentheses size={16} />}
              size="sm"
              onClick={handleAddGroup}
            />
          </Tooltip>

          <Tooltip label="Add Value">
            <IconButton
              aria-label="Add value"
              icon={<X size={16} />}
              size="sm"
              onClick={handleAddValue}
            />
          </Tooltip>
        </HStack>
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
import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  useColorModeValue,
  Heading,
  Divider,
  IconButton,
  Tooltip
} from '@chakra-ui/react';
import { Variable, Formula } from '../types/algorithm';
import { ASTService } from '../services/astService';
import { GitBranch, GitPullRequest } from 'lucide-react';

interface FormulaDependencyVisualizationProps {
  formulas: Formula[];
  variables: Variable[];
  selectedFormulaId?: string;
  onFormulaSelect?: (formulaId: string) => void;
}

interface DependencyNode {
  id: string;
  type: 'formula' | 'variable';
  name: string;
  dependencies: string[];
  dependents: string[];
  complexity: 'low' | 'medium' | 'high';
}

export const FormulaDependencyVisualization: React.FC<FormulaDependencyVisualizationProps> = ({
  formulas,
  variables,
  selectedFormulaId,
  onFormulaSelect
}) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'gray.200');

  // Build dependency graph
  const buildDependencyGraph = (): DependencyNode[] => {
    const nodes: DependencyNode[] = [];
    
    // Add variables
    variables.forEach(variable => {
      nodes.push({
        id: variable.id,
        type: 'variable',
        name: variable.name,
        dependencies: [],
        dependents: [],
        complexity: 'low'
      });
    });
    
    // Add formulas and their dependencies
    formulas.forEach(formula => {
      const dependencies: string[] = [];
      
      // Extract variable dependencies from AST
      if (formula.expressions.ast) {
        dependencies.push(...ASTService.extractVariables(formula.expressions.ast));
      }
      
      // Also check the variableIds array
      dependencies.push(...formula.variableIds);
      
      // Remove duplicates
      const uniqueDependencies = [...new Set(dependencies)];
      
      nodes.push({
        id: formula.id,
        type: 'formula',
        name: formula.name,
        dependencies: uniqueDependencies,
        dependents: [],
        complexity: formula.expressions.ast ? 
          ASTService.calculateComplexity(formula.expressions.ast) : 'low'
      });
    });
    
    // Build dependents relationships
    nodes.forEach(node => {
      node.dependencies.forEach(depId => {
        const depNode = nodes.find(n => n.id === depId);
        if (depNode && !depNode.dependents.includes(node.id)) {
          depNode.dependents.push(node.id);
        }
      });
    });
    
    return nodes;
  };

  const dependencyGraph = buildDependencyGraph();
  const selectedNode = selectedFormulaId ? 
    dependencyGraph.find(node => node.id === selectedFormulaId) : null;

  const getComplexityColor = (complexity: 'low' | 'medium' | 'high') => {
    switch (complexity) {
      case 'low': return 'green';
      case 'medium': return 'yellow';
      case 'high': return 'red';
      default: return 'gray';
    }
  };

  const renderDependencyTree = (node: DependencyNode, depth: number = 0) => {
    const isSelected = node.id === selectedFormulaId;
    
    return (
      <Box key={node.id} ml={depth * 4}>
        <HStack
          spacing={2}
          p={2}
          bg={isSelected ? useColorModeValue('blue.50', 'blue.900') : 'transparent'}
          borderRadius="md"
          borderWidth={isSelected ? 2 : 1}
          borderColor={isSelected ? 'blue.500' : borderColor}
          cursor="pointer"
          onClick={() => onFormulaSelect?.(node.id)}
          _hover={{
            bg: useColorModeValue('gray.50', 'gray.700')
          }}
        >
          <Badge
            colorScheme={node.type === 'formula' ? 'purple' : 'blue'}
            size="sm"
          >
            {node.type}
          </Badge>
          <Text fontSize="sm" fontWeight="medium" color={textColor}>
            {node.name}
          </Text>
          <Badge
            colorScheme={getComplexityColor(node.complexity)}
            size="sm"
          >
            {node.complexity}
          </Badge>
          {node.dependencies.length > 0 && (
            <Tooltip label={`Depends on ${node.dependencies.length} items`}>
              <IconButton
                aria-label="Dependencies"
                icon={<GitBranch size={12} />}
                size="xs"
                variant="ghost"
              />
            </Tooltip>
          )}
          {node.dependents.length > 0 && (
            <Tooltip label={`Used by ${node.dependents.length} items`}>
              <IconButton
                aria-label="Dependents"
                icon={<GitPullRequest size={12} />}
                size="xs"
                variant="ghost"
              />
            </Tooltip>
          )}
        </HStack>
        
        {/* Show dependencies */}
        {isSelected && node.dependencies.length > 0 && (
          <VStack align="start" spacing={1} mt={2} ml={4}>
            <Text fontSize="xs" color="gray.500" fontWeight="medium">
              Dependencies:
            </Text>
            {node.dependencies.map(depId => {
              const depNode = dependencyGraph.find(n => n.id === depId);
              if (depNode) {
                return renderDependencyTree(depNode, depth + 1);
              }
              return null;
            })}
          </VStack>
        )}
      </Box>
    );
  };

  return (
    <Box bg={bgColor} borderRadius="lg" borderWidth={1} borderColor={borderColor} p={4}>
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between">
          <Heading size="sm" color={textColor}>
            Formula Dependencies
          </Heading>
          <Badge colorScheme="blue" size="sm">
            {formulas.length} formulas, {variables.length} variables
          </Badge>
        </HStack>
        
        <Divider />
        
        {selectedNode ? (
          <VStack align="start" spacing={3}>
            <Box>
              <Text fontSize="sm" fontWeight="medium" color={textColor}>
                Selected: {selectedNode.name}
              </Text>
              <Text fontSize="xs" color="gray.500">
                {selectedNode.dependencies.length} dependencies, {selectedNode.dependents.length} dependents
              </Text>
            </Box>
            
            <VStack align="start" spacing={1} w="full">
              {renderDependencyTree(selectedNode)}
            </VStack>
          </VStack>
        ) : (
          <VStack align="start" spacing={2}>
            <Text fontSize="sm" color="gray.500">
              Click on a formula to view its dependencies
            </Text>
            
            <VStack align="start" spacing={1} w="full">
              {formulas.map(formula => {
                const node = dependencyGraph.find(n => n.id === formula.id);
                return node ? renderDependencyTree(node) : null;
              })}
            </VStack>
          </VStack>
        )}
      </VStack>
    </Box>
  );
}; 
import React, { useMemo } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Heading,
  Divider,
  Tooltip,
  Alert,
  AlertIcon,
  AlertDescription,
  SimpleGrid,
  Card,
  CardBody,
  CardHeader,
  Icon
} from '@chakra-ui/react';
import { 
  ArrowRight, 
  Variable, 
  CheckCircle, 
  AlertTriangle, 
  Info,
  GitBranch,
  GitCommit
} from 'lucide-react';
import { Algorithm } from '../types/algorithm';
import { 
  FormulaDependencyService, 
  ValidationResult
} from '../services/formulaDependencyService';

interface DependencyVisualizationProps {
  algorithm: Algorithm;
  showValidation?: boolean;
  showExecutionTrace?: boolean;
  executionContext?: Record<string, unknown>;
}

export const DependencyVisualization: React.FC<DependencyVisualizationProps> = ({
  algorithm,
  showValidation = true,
  showExecutionTrace = false,
  executionContext = {}
}) => {
  // UI Mapping Logic - moved to constants above return statement per project rules
  const dependencyGraph = useMemo(() => 
    FormulaDependencyService.analyzeFormulaDependencies(algorithm), 
    [algorithm]
  );

  const validationResults = useMemo(() => 
    showValidation ? FormulaDependencyService.validateFormulaDependencies(algorithm) : [],
    [algorithm, showValidation]
  );

  const executionTrace = useMemo(() => 
    showExecutionTrace ? FormulaDependencyService.generateExecutionTrace(algorithm, executionContext) : null,
    [algorithm, showExecutionTrace, executionContext]
  );

  const getNodeColor = (type: 'formula' | 'condition') => {
    return type === 'formula' ? 'purple' : 'green';
  };

  const getValidationIcon = (type: ValidationResult['type']) => {
    switch (type) {
      case 'error':
        return AlertTriangle;
      case 'warning':
        return AlertTriangle;
      case 'info':
        return Info;
      default:
        return Info;
    }
  };

  const getValidationColor = (type: ValidationResult['type']) => {
    switch (type) {
      case 'error':
        return 'red';
      case 'warning':
        return 'orange';
      case 'info':
        return 'blue';
      default:
        return 'gray';
    }
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Dependency Graph Overview */}
      <Card>
        <CardHeader>
          <HStack>
            <Icon as={GitBranch} />
            <Heading size="md">Dependency Graph</Heading>
          </HStack>
        </CardHeader>
        <CardBody>
          <VStack spacing={4} align="stretch">
            {/* Nodes Summary */}
            <SimpleGrid columns={2} spacing={4}>
              <Box>
                <Text fontWeight="bold" mb={2}>Formulas ({dependencyGraph.nodes.filter(n => n.type === 'formula').length})</Text>
                <VStack align="start" spacing={1}>
                  {dependencyGraph.nodes
                    .filter(node => node.type === 'formula')
                    .map(node => (
                      <HStack key={node.id} spacing={2}>
                        <Badge colorScheme={getNodeColor(node.type)} size="sm">
                          {node.type}
                        </Badge>
                        <Text fontSize="sm">{node.name}</Text>
                        {node.inputs.length > 0 && (
                          <Tooltip label={`Uses: ${node.inputs.join(', ')}`}>
                            <Badge size="sm" colorScheme="blue" variant="outline">
                              {node.inputs.length} inputs
                            </Badge>
                          </Tooltip>
                        )}
                      </HStack>
                    ))}
                </VStack>
              </Box>
              
              <Box>
                <Text fontWeight="bold" mb={2}>Conditions ({dependencyGraph.nodes.filter(n => n.type === 'condition').length})</Text>
                <VStack align="start" spacing={1}>
                  {dependencyGraph.nodes
                    .filter(node => node.type === 'condition')
                    .map(node => (
                      <HStack key={node.id} spacing={2}>
                        <Badge colorScheme={getNodeColor(node.type)} size="sm">
                          {node.type}
                        </Badge>
                        <Text fontSize="sm">{node.name}</Text>
                        {node.inputs.length > 0 && (
                          <Tooltip label={`Uses: ${node.inputs.join(', ')}`}>
                            <Badge size="sm" colorScheme="blue" variant="outline">
                              {node.inputs.length} inputs
                            </Badge>
                          </Tooltip>
                        )}
                      </HStack>
                    ))}
                </VStack>
              </Box>
            </SimpleGrid>

            {/* Execution Order */}
            <Divider />
            <Box>
              <Text fontWeight="bold" mb={2}>Execution Order</Text>
              <HStack spacing={2} flexWrap="wrap">
                {dependencyGraph.executionOrder.map((stepId, index) => {
                  const node = dependencyGraph.nodes.find(n => n.id === stepId);
                  if (!node) return null;
                  
                  return (
                    <HStack key={stepId} spacing={1}>
                      <Badge colorScheme="gray" size="sm">
                        {index + 1}
                      </Badge>
                      <Badge colorScheme={getNodeColor(node.type)} size="sm">
                        {node.type}
                      </Badge>
                      <Text fontSize="sm">{node.name}</Text>
                      {index < dependencyGraph.executionOrder.length - 1 && (
                        <Icon as={ArrowRight} size={16} />
                      )}
                    </HStack>
                  );
                })}
              </HStack>
            </Box>

            {/* Dependencies */}
            {dependencyGraph.edges.length > 0 && (
              <>
                <Divider />
                <Box>
                  <Text fontWeight="bold" mb={2}>Dependencies</Text>
                  <VStack align="start" spacing={1}>
                    {dependencyGraph.edges.map((edge, index) => {
                      const sourceNode = dependencyGraph.nodes.find(n => n.id === edge.source);
                      const targetNode = dependencyGraph.nodes.find(n => n.id === edge.target);
                      
                      if (!sourceNode || !targetNode) return null;
                      
                      return (
                        <HStack key={index} spacing={2}>
                          <Text fontSize="sm" fontWeight="medium">{sourceNode.name}</Text>
                          <Icon as={ArrowRight} size={14} />
                          <Text fontSize="sm" fontWeight="medium">{targetNode.name}</Text>
                          {edge.variableName && (
                            <Tooltip label={`Via variable: ${edge.variableName}`}>
                              <Badge size="sm" colorScheme="teal" variant="outline">
                                {edge.variableName}
                              </Badge>
                            </Tooltip>
                          )}
                        </HStack>
                      );
                    })}
                  </VStack>
                </Box>
              </>
            )}
          </VStack>
        </CardBody>
      </Card>

      {/* Variable Usage */}
      <Card>
        <CardHeader>
          <HStack>
            <Icon as={Variable} />
            <Heading size="md">Variable Usage</Heading>
          </HStack>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={2} spacing={4}>
            {Object.entries(dependencyGraph.variableUsage).map(([varName, usage]) => (
              <Box key={varName} p={3} borderWidth={1} borderRadius="md">
                <HStack justify="space-between" mb={2}>
                  <Text fontWeight="bold">{varName}</Text>
                  {usage.isSystemVariable && (
                    <Badge size="sm" colorScheme="green">System</Badge>
                  )}
                </HStack>
                {usage.formulas.length > 0 && (
                  <Text fontSize="sm" color="gray.500">
                    Used by {usage.formulas.length} formula{usage.formulas.length !== 1 ? 's' : ''}
                  </Text>
                )}
                {usage.conditions.length > 0 && (
                  <Text fontSize="sm" color="gray.500">
                    Used by {usage.conditions.length} condition{usage.conditions.length !== 1 ? 's' : ''}
                  </Text>
                )}
              </Box>
            ))}
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Validation Results */}
      {showValidation && validationResults.length > 0 && (
        <Card>
          <CardHeader>
            <HStack>
              <Icon as={CheckCircle} />
              <Heading size="md">Validation Results</Heading>
            </HStack>
          </CardHeader>
          <CardBody>
            <VStack spacing={3} align="stretch">
              {validationResults.map((result, index) => (
                <Alert key={index} status={result.type === 'error' ? 'error' : result.type === 'warning' ? 'warning' : 'info'}>
                  <AlertIcon as={getValidationIcon(result.type)} />
                  <AlertDescription>
                    {result.message}
                    {result.formulaId && (
                      <Badge ml={2} colorScheme={getValidationColor(result.type)} size="sm">
                        Formula
                      </Badge>
                    )}
                    {result.conditionId && (
                      <Badge ml={2} colorScheme={getValidationColor(result.type)} size="sm">
                        Condition
                      </Badge>
                    )}
                  </AlertDescription>
                </Alert>
              ))}
            </VStack>
          </CardBody>
        </Card>
      )}

      {/* Execution Trace */}
      {showExecutionTrace && executionTrace && (
        <Card>
          <CardHeader>
            <HStack>
              <Icon as={GitCommit} />
              <Heading size="md">Execution Trace</Heading>
            </HStack>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              {executionTrace.errors.length > 0 && (
                <Alert status="error">
                  <AlertIcon />
                  <AlertDescription>
                    {executionTrace.errors.length} error{executionTrace.errors.length !== 1 ? 's' : ''} occurred during execution
                  </AlertDescription>
                </Alert>
              )}
              
              <Box>
                <Text fontWeight="bold" mb={2}>Execution Steps</Text>
                <VStack spacing={2} align="stretch">
                  {executionTrace.steps.map((step, index) => (
                    <Box key={step.stepId} p={3} borderWidth={1} borderRadius="md">
                      <HStack justify="space-between" mb={2}>
                        <HStack>
                          <Badge colorScheme="gray" size="sm">
                            {index + 1}
                          </Badge>
                          <Badge colorScheme={getNodeColor(step.stepType)} size="sm">
                            {step.stepType}
                          </Badge>
                          <Text fontWeight="medium">{step.stepName}</Text>
                        </HStack>
                        <Text fontSize="sm" color="gray.500">
                          {step.executionTime}ms
                        </Text>
                      </HStack>
                      
                      {step.error ? (
                        <Alert status="error" size="sm">
                          <AlertIcon />
                          <AlertDescription>{step.error}</AlertDescription>
                        </Alert>
                      ) : (
                        <VStack align="start" spacing={1}>
                          <Text fontSize="sm">
                            <strong>Output:</strong> {String(step.outputValue)}
                          </Text>
                          {step.dependencies.length > 0 && (
                            <Text fontSize="sm">
                              <strong>Dependencies:</strong> {step.dependencies.join(', ')}
                            </Text>
                          )}
                        </VStack>
                      )}
                    </Box>
                  ))}
                </VStack>
              </Box>
              
              <Divider />
              <Box>
                <Text fontWeight="bold">Final Result</Text>
                <Text>{String(executionTrace.finalResult)}</Text>
                <Text fontSize="sm" color="gray.500" mt={1}>
                  Total execution time: {executionTrace.executionTime}ms
                </Text>
              </Box>
            </VStack>
          </CardBody>
        </Card>
      )}
    </VStack>
  );
}; 
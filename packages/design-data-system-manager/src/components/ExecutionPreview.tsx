import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Badge,
  useColorMode,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Input,
  Alert,
  AlertIcon,
  AlertDescription,
  Icon
} from '@chakra-ui/react';
import { 
  Play, 
  StepForward, 
  RotateCcw, 
  GitCommit, 
  Clock, 
  Variable, 
  AlertTriangle 
} from 'lucide-react';
import { Algorithm, Variable as VariableType } from '../types/algorithm';
import { FormulaDependencyService, ExecutionTrace } from '../services/formulaDependencyService';
import { SystemVariableService } from '../services/systemVariableService';

interface ExecutionPreviewProps {
  algorithm: Algorithm;
  onExecutionComplete?: (trace: ExecutionTrace) => void;
}

export const ExecutionPreview: React.FC<ExecutionPreviewProps> = ({
  algorithm,
  onExecutionComplete
}) => {
  const { colorMode } = useColorMode();
  const [executionContext, setExecutionContext] = useState<Record<string, unknown>>({});
  const [executionTrace, setExecutionTrace] = useState<ExecutionTrace | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [systemVariables, setSystemVariables] = useState<VariableType[]>([]);

  // Load system variables on mount
  useEffect(() => {
    const loadSystemVariables = () => {
      const userSystemVariables = SystemVariableService.getSystemVariables();
      const allSystemVariables: VariableType[] = [
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
  }, []);

  // UI Mapping Logic - moved to constants above return statement per project rules
  const stepCount = algorithm.steps.length;
  const hasSteps = stepCount > 0;

  const handleRunExecution = () => {
    setIsRunning(true);
    try {
      const trace = FormulaDependencyService.generateExecutionTrace(algorithm, executionContext);
      setExecutionTrace(trace);
      setCurrentStepIndex(trace.steps.length - 1);
      onExecutionComplete?.(trace);
    } catch (error) {
      console.error('Execution failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleStepExecution = () => {
    if (currentStepIndex < stepCount - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handleReset = () => {
    setCurrentStepIndex(-1);
    setExecutionTrace(null);
  };

  const handleContextChange = (key: string, value: unknown) => {
    setExecutionContext(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getStepStatus = (stepIndex: number) => {
    if (!executionTrace) return 'pending';
    if (stepIndex > currentStepIndex) return 'pending';
    if (executionTrace.steps[stepIndex]?.error) return 'error';
    return 'completed';
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'green';
      case 'error':
        return 'red';
      case 'pending':
        return 'gray';
      default:
        return 'gray';
    }
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return 'undefined';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Execution Controls */}
      <Card>
        <CardHeader>
          <HStack>
            <Icon as={Play} />
            <Heading size="md">Execution Preview</Heading>
          </HStack>
        </CardHeader>
        <CardBody>
          <VStack spacing={4} align="stretch">
            {/* Context Configuration */}
            <Box>
              <Text fontWeight="bold" mb={3}>Execution Context</Text>
              <VStack spacing={3} align="stretch">
                {/* System Variables */}
                {systemVariables.map(variable => (
                  <FormControl key={variable.id}>
                    <FormLabel>
                      {variable.name} ({variable.type})
                      {variable.id === 'system_n' && (
                        <Badge ml={2} size="sm" colorScheme="green">Built-in</Badge>
                      )}
                      {variable.id !== 'system_n' && variable.id.startsWith('system-') && (
                        <Badge ml={2} size="sm" colorScheme="blue">System</Badge>
                      )}
                    </FormLabel>
                    {variable.type === 'number' ? (
                      <NumberInput
                        value={executionContext[variable.name] as number || Number(variable.defaultValue) || 0}
                        onChange={(_, value) => handleContextChange(variable.name, value)}
                        min={-10}
                        max={100}
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    ) : (
                      <Input
                        value={executionContext[variable.name] as string || variable.defaultValue || ''}
                        onChange={(e) => handleContextChange(variable.name, e.target.value)}
                        placeholder={`Enter ${variable.name}`}
                      />
                    )}
                  </FormControl>
                ))}

                {/* User Variables */}
                {algorithm.variables.map(variable => (
                  <FormControl key={variable.id}>
                    <FormLabel>{variable.name} ({variable.type})</FormLabel>
                    {variable.type === 'number' ? (
                      <NumberInput
                        value={executionContext[variable.name] as number || Number(variable.defaultValue) || 0}
                        onChange={(_, value) => handleContextChange(variable.name, value)}
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    ) : (
                      <Input
                        value={executionContext[variable.name] as string || variable.defaultValue || ''}
                        onChange={(e) => handleContextChange(variable.name, e.target.value)}
                        placeholder={`Enter ${variable.name}`}
                      />
                    )}
                  </FormControl>
                ))}
              </VStack>
            </Box>

            {/* Control Buttons */}
            <HStack spacing={3}>
              <Button
                leftIcon={<Play size={16} />}
                colorScheme="green"
                onClick={handleRunExecution}
                isLoading={isRunning}
                isDisabled={!hasSteps}
              >
                Run Execution
              </Button>
              <Button
                leftIcon={<StepForward size={16} />}
                onClick={handleStepExecution}
                isDisabled={currentStepIndex >= stepCount || !executionTrace}
              >
                Step Forward
              </Button>
              <Button
                leftIcon={<RotateCcw size={16} />}
                onClick={handleReset}
                variant="outline"
              >
                Reset
              </Button>
            </HStack>

            {/* Progress Indicator */}
            {hasSteps && (
              <Box>
                <Text fontSize="sm" color="gray.500" mb={2}>
                  Progress: {currentStepIndex} / {stepCount} steps
                </Text>
                <Box
                  w="100%"
                  h={2}
                  bg={colorMode === 'light' ? 'gray.200' : 'gray.700'}
                  borderRadius="full"
                  overflow="hidden"
                >
                  <Box
                    h="100%"
                    bg="blue.500"
                    w={`${(currentStepIndex / stepCount) * 100}%`}
                    transition="width 0.3s ease"
                  />
                </Box>
              </Box>
            )}
          </VStack>
        </CardBody>
      </Card>

      {/* Execution Steps */}
      {executionTrace && (
        <Card>
          <CardHeader>
            <HStack>
              <Icon as={GitCommit} />
              <Heading size="md">Execution Steps</Heading>
              {executionTrace.errors.length > 0 && (
                <Badge colorScheme="red" size="sm">
                  {executionTrace.errors.length} Error{executionTrace.errors.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </HStack>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              {/* Execution Summary */}
              <Box p={3} bg={colorMode === 'light' ? 'gray.50' : 'gray.700'} borderRadius="md">
                <HStack justify="space-between">
                  <Text fontWeight="bold">Execution Summary</Text>
                  <HStack>
                    <Icon as={Clock} size={14} />
                    <Text fontSize="sm">{executionTrace.executionTime}ms</Text>
                  </HStack>
                </HStack>
                <Text fontSize="sm" color="gray.500" mt={1}>
                  Final Result: {formatValue(executionTrace.finalResult)}
                </Text>
              </Box>

              {/* Step Details */}
              <VStack spacing={3} align="stretch">
                {executionTrace.steps.map((step, index) => {
                  const status = getStepStatus(index);
                  const isVisible = index <= currentStepIndex;
                  
                  return (
                    <Box
                      key={step.stepId}
                      p={4}
                      borderWidth={1}
                      borderRadius="md"
                      opacity={isVisible ? 1 : 0.5}
                      transition="opacity 0.3s ease"
                    >
                      <HStack justify="space-between" mb={3}>
                        <HStack>
                          <Badge colorScheme="gray" size="sm">
                            {index + 1}
                          </Badge>
                          <Badge colorScheme={getStepColor(status)} size="sm">
                            {step.stepType}
                          </Badge>
                          <Text fontWeight="medium">{step.stepName}</Text>
                        </HStack>
                        <HStack>
                          <Icon as={Clock} size={14} />
                          <Text fontSize="sm">{step.executionTime}ms</Text>
                        </HStack>
                      </HStack>

                      {isVisible && (
                        <VStack spacing={3} align="stretch">
                          {/* Input Values */}
                          <Box>
                            <Text fontSize="sm" fontWeight="medium" mb={2}>Input Values</Text>
                            <HStack spacing={2} flexWrap="wrap">
                              {Object.entries(step.inputValues).map(([key, value]) => (
                                <Badge key={key} size="sm" colorScheme="blue" variant="outline">
                                  <HStack spacing={1}>
                                    <Icon as={Variable} size={10} />
                                    <Text>{key}: {formatValue(value)}</Text>
                                  </HStack>
                                </Badge>
                              ))}
                            </HStack>
                          </Box>

                          {/* Output */}
                          <Box>
                            <Text fontSize="sm" fontWeight="medium" mb={2}>Output</Text>
                            {step.error ? (
                              <Alert status="error" size="sm">
                                <AlertIcon as={AlertTriangle} />
                                <AlertDescription>{step.error}</AlertDescription>
                              </Alert>
                            ) : (
                              <Text fontSize="sm" p={2} bg={colorMode === 'light' ? 'green.50' : 'green.900'} borderRadius="md">
                                {formatValue(step.outputValue)}
                              </Text>
                            )}
                          </Box>

                          {/* Dependencies */}
                          {step.dependencies.length > 0 && (
                            <Box>
                              <Text fontSize="sm" fontWeight="medium" mb={2}>Dependencies</Text>
                              <HStack spacing={2} flexWrap="wrap">
                                {step.dependencies.map(dep => (
                                  <Badge key={dep} size="sm" colorScheme="purple" variant="outline">
                                    <HStack spacing={1}>
                                      <Icon as={Variable} size={10} />
                                      <Text>{dep}</Text>
                                    </HStack>
                                  </Badge>
                                ))}
                              </HStack>
                            </Box>
                          )}
                        </VStack>
                      )}
                    </Box>
                  );
                })}
              </VStack>

              {/* Errors Summary */}
              {executionTrace.errors.length > 0 && (
                <Alert status="error">
                  <AlertIcon />
                  <AlertDescription>
                    {executionTrace.errors.length} error{executionTrace.errors.length !== 1 ? 's' : ''} occurred during execution
                  </AlertDescription>
                </Alert>
              )}
            </VStack>
          </CardBody>
        </Card>
      )}
    </VStack>
  );
}; 
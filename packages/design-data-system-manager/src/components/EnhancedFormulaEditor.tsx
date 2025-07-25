import React, { useMemo, useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Alert,
  AlertIcon,
  AlertDescription,
  useColorMode,
  Icon,
  Tooltip
} from '@chakra-ui/react';
import { 
  Variable, 
  AlertTriangle, 
  Info,
  Link,
  Eye
} from 'lucide-react';
import { Variable as VariableType, Formula, Algorithm } from '../types/algorithm';
import { FormulaEditor } from './FormulaEditor';
import { FormulaDependencyService } from '../services/formulaDependencyService';
import { SystemVariableService } from '../services/systemVariableService';

interface EnhancedFormulaEditorProps {
  variables: VariableType[];
  value: string;
  onChange: (value: string, latexExpression: string) => void;
  mode?: 'formula' | 'condition';
  formula?: Formula; // Optional formula object for enhanced analysis
  algorithm?: Algorithm; // Optional algorithm for dependency analysis
}

export const EnhancedFormulaEditor: React.FC<EnhancedFormulaEditorProps> = ({
  variables,
  value,
  onChange,
  mode = 'formula',
  formula,
  algorithm
}) => {
  const { colorMode } = useColorMode();
  const [systemVariables, setSystemVariables] = useState<VariableType[]>([]);

  // Load system variables on mount and when window gains focus
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
    
    const handleFocus = () => {
      loadSystemVariables();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // UI Mapping Logic - moved to constants above return statement per project rules
  const variableUsage = useMemo(() => {
    if (!value) return [];
    return FormulaDependencyService.getVariableUsage({ 
      id: formula?.id || 'temp', 
      name: formula?.name || 'Formula', 
      expressions: { 
        latex: { value: '' }, 
        javascript: { value },
        ast: {
          type: 'literal',
          value: value,
          metadata: {
            astVersion: '1.0.0',
            validationErrors: [],
            complexity: 'low'
          }
        }
      },
      variableIds: []
    });
  }, [value, formula]);

  const validationResults = useMemo(() => {
    if (!algorithm) return [];
    return FormulaDependencyService.validateFormulaDependencies(algorithm);
  }, [algorithm]);

  const formulaValidationResults = useMemo(() => {
    if (!formula) return [];
    return validationResults.filter(result => result.formulaId === formula.id);
  }, [validationResults, formula]);

  const undefinedVariables = useMemo(() => {
    return variableUsage.filter(varName => {
      const variableExists = variables.some(v => v.name === varName);
      const systemVariableExists = systemVariables.some(v => v.name === varName);
      return !variableExists && !systemVariableExists;
    });
  }, [variableUsage, variables, systemVariables]);

  const getVariableType = (varName: string) => {
    const variable = variables.find(v => v.name === varName);
    const systemVariable = systemVariables.find(v => v.name === varName);
    return variable?.type || systemVariable?.type || 'unknown';
  };

  const getVariableDefaultValue = (varName: string) => {
    const variable = variables.find(v => v.name === varName);
    const systemVariable = systemVariables.find(v => v.name === varName);
    return variable?.defaultValue || systemVariable?.defaultValue || '';
  };

  const isSystemVariable = (varName: string) => {
    return systemVariables.some(v => v.name === varName);
  };

  // Combine system variables with user variables for the FormulaEditor
  const allVariables = [...systemVariables, ...variables];

  return (
    <VStack spacing={4} align="stretch">
      {/* Enhanced Formula Editor */}
      <Box>
        <FormulaEditor
          variables={allVariables}
          value={value}
          onChange={onChange}
          mode={mode}
        />
      </Box>

      {/* Dependency Analysis Panel */}
      <Box
        p={4}
        borderWidth={1}
        borderRadius="md"
        bg={colorMode === 'light' ? 'gray.50' : 'gray.700'}
      >
        <HStack justify="space-between" mb={3}>
          <HStack>
            <Icon as={Eye} size={16} />
            <Text fontWeight="bold">Dependency Analysis</Text>
          </HStack>
          <Badge 
            colorScheme={formulaValidationResults.length > 0 ? 'red' : 'green'} 
            size="sm"
          >
            {formulaValidationResults.length > 0 ? 'Issues Found' : 'Valid'}
          </Badge>
        </HStack>

        {/* Variable Usage Summary */}
        <VStack spacing={3} align="stretch">
          <Box>
            <Text fontWeight="medium" mb={2}>Variables Used ({variableUsage.length})</Text>
            {variableUsage.length > 0 ? (
              <HStack spacing={2} flexWrap="wrap">
                {variableUsage.map(varName => (
                  <Tooltip 
                    key={varName} 
                    label={`Type: ${getVariableType(varName)}${getVariableDefaultValue(varName) ? `, Default: ${getVariableDefaultValue(varName)}` : ''}`}
                  >
                    <Badge 
                      colorScheme={isSystemVariable(varName) ? 'green' : 'blue'} 
                      variant="outline"
                      size="sm"
                    >
                      <HStack spacing={1}>
                        <Icon as={Variable} size={12} />
                        <Text>{varName}</Text>
                        {isSystemVariable(varName) && (
                          <Text fontSize="xs">(System)</Text>
                        )}
                      </HStack>
                    </Badge>
                  </Tooltip>
                ))}
              </HStack>
            ) : (
              <Text fontSize="sm" color="gray.500">No variables detected</Text>
            )}
          </Box>

          {/* Undefined Variables Warning */}
          {undefinedVariables.length > 0 && (
            <Alert status="warning" size="sm">
              <AlertIcon as={AlertTriangle} />
              <AlertDescription>
                Undefined variables: {undefinedVariables.join(', ')}
              </AlertDescription>
            </Alert>
          )}

          {/* Validation Results */}
          {formulaValidationResults.length > 0 && (
            <Box>
              <Text fontWeight="medium" mb={2}>Validation Issues</Text>
              <VStack spacing={2} align="stretch">
                {formulaValidationResults.map((result, index) => (
                  <Alert 
                    key={index} 
                    status={result.type === 'error' ? 'error' : 'warning'} 
                    size="sm"
                  >
                    <AlertIcon as={result.type === 'error' ? AlertTriangle : Info} />
                    <AlertDescription>
                      {result.message}
                    </AlertDescription>
                  </Alert>
                ))}
              </VStack>
            </Box>
          )}

          {/* Dependency Information */}
          {algorithm && (
            <Box>
              <Text fontWeight="medium" mb={2}>Dependencies</Text>
              <VStack spacing={2} align="stretch">
                {variableUsage.map(varName => {
                  const variable = variables.find(v => v.name === varName);
                  const systemVariable = systemVariables.find(v => v.name === varName);
                  const foundVariable = variable || systemVariable;
                  
                  if (!foundVariable) return null;

                  return (
                    <HStack key={varName} justify="space-between" p={2} borderWidth={1} borderRadius="md">
                      <HStack>
                        <Icon as={Variable} size={14} />
                        <Text fontSize="sm" fontWeight="medium">{varName}</Text>
                        <Badge size="sm" colorScheme="gray">
                          {foundVariable.type}
                        </Badge>
                        {systemVariable && (
                          <Badge size="sm" colorScheme="green">
                            System
                          </Badge>
                        )}
                      </HStack>
                      {foundVariable.defaultValue && (
                        <Text fontSize="sm" color="gray.500">
                          = {foundVariable.defaultValue}
                        </Text>
                      )}
                    </HStack>
                  );
                })}
              </VStack>
            </Box>
          )}

          {/* Formula Dependencies (if algorithm provided) */}
          {algorithm && formula && (
            <Box>
              <Text fontWeight="medium" mb={2}>Formula Dependencies</Text>
              <HStack spacing={2}>
                <Icon as={Link} size={14} />
                <Text fontSize="sm">
                  This formula depends on {variableUsage.length} variable{variableUsage.length !== 1 ? 's' : ''}
                </Text>
              </HStack>
              {variableUsage.length > 0 && (
                <Text fontSize="sm" color="gray.500" mt={1}>
                  Variables: {variableUsage.join(', ')}
                </Text>
              )}
            </Box>
          )}
        </VStack>
      </Box>
    </VStack>
  );
}; 
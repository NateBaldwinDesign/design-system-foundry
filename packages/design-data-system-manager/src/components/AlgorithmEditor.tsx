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
  FormLabel,
  Checkbox
} from '@chakra-ui/react';
import { Plus, Trash2, GripVertical, Save, Edit, RotateCcw, Undo2, Redo2 } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Algorithm, Variable, Formula, Condition, AlgorithmStep } from '../types/algorithm';
import { FormulaEditor } from './FormulaEditor';
import { BlockMath } from 'react-katex';
import { TokenGenerationService } from '../services/tokenGenerationService';
import { StorageService } from '../services/storage';
import { TokenCalculationService, TokenCalculationState, FormulaDependency } from '../services/tokenCalculationService';
import { AlgorithmHistoryService, AlgorithmHistoryEntry } from '../services/algorithmHistoryService';
import { generateId } from '../utils/id';
import type { Token } from '@token-model/data-model';
import type { Taxonomy, ResolvedValueType } from '@token-model/data-model';
import { TaxonomyPicker } from './TaxonomyPicker';
import { AlgorithmSavePreviewDialog } from './AlgorithmSavePreviewDialog';
import { AlgorithmResetDialog } from './AlgorithmResetDialog';
import { DependencyVisualization } from './DependencyVisualization';
import { ExecutionPreview } from './ExecutionPreview';
import { ModeBasedVariableEditor } from './ModeBasedVariableEditor';
import { ModeSelectionDialog } from './ModeSelectionDialog';
import { SystemVariableService } from '../services/systemVariableService';
import { VariableMappingService } from '../services/variableMappingService';

interface AlgorithmEditorProps {
  algorithm?: Algorithm;
  onSave?: (algorithm: Algorithm) => void;
  onUpdateTokens?: (updatedTokens: Token[]) => void;
}

const defaultAlgorithm: Algorithm = {
  id: generateId('algorithm'),
  name: 'New Algorithm',
  resolvedValueTypeId: 'color',
  variables: [],
  formulas: [],
  conditions: [],
  steps: [],
  tokenGeneration: {
    enabled: false,
    iterationRange: { start: -2, end: 8, step: 1 },
    bulkAssignments: {
      resolvedValueTypeId: 'color',
      taxonomies: [],
      tokenTier: 'PRIMITIVE',
      private: false,
      status: 'stable',
      themeable: false
    },
    logicalMapping: {
      scaleType: 'numeric',
      defaultValue: '100',
      increasingStep: 100,
      decreasingStep: 25,
      extraPrefix: 'X',
      incrementDirection: 'ascending',
      taxonomyId: undefined,
      newTaxonomyName: undefined
    }
  }
};

export const AlgorithmEditor: React.FC<AlgorithmEditorProps> = ({ 
  algorithm = defaultAlgorithm, 
  onSave = () => {}, 
  onUpdateTokens = () => {}
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
  const [generatedTokens, setGeneratedTokens] = useState<Token[]>([]);
  const [generationErrors, setGenerationErrors] = useState<string[]>([]);

  // Token detection state for Phase 1
  const [existingTokens, setExistingTokens] = useState<Token[]>([]);
  const [hasExistingTokens, setHasExistingTokens] = useState(false);
  const [tokenCalculationStates, setTokenCalculationStates] = useState<Map<string, TokenCalculationState>>(new Map());

  // Formula change tracking for Phase 2
  const [changedFormulaIds, setChangedFormulaIds] = useState<string[]>([]);
  const [formulaDependencies, setFormulaDependencies] = useState<FormulaDependency[]>([]);

  // Save preview dialog state for Phase 3
  const [showSavePreview, setShowSavePreview] = useState(false);

  // History and reset state for Phase 4
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedState, setLastSavedState] = useState<Algorithm | null>(null);

  // Mode selection state for mode-based variables
  const [showModeSelectionDialog, setShowModeSelectionDialog] = useState(false);
  const [selectedModes, setSelectedModes] = useState<Record<string, string[]>>({});
  const [hasModeBasedVariables, setHasModeBasedVariables] = useState(false);

  // State for filtered taxonomies
  const [filteredTaxonomies, setFilteredTaxonomies] = useState<Taxonomy[]>([]);
  const [selectedTaxonomies, setSelectedTaxonomies] = useState<Array<{ taxonomyId: string; termId: string }>>([]);
  const [resolvedValueTypes, setResolvedValueTypes] = useState<ResolvedValueType[]>([]);

  // Add state to track if token generation configuration is complete
  const [tokenGenerationConfigured, setTokenGenerationConfigured] = useState(false);

  // Track changes for history
  useEffect(() => {
    if (lastSavedState) {
      const hasChanges = JSON.stringify(currentAlgorithm) !== JSON.stringify(lastSavedState);
      setHasUnsavedChanges(hasChanges);
    }
  }, [currentAlgorithm, lastSavedState]);

  // Initialize last saved state
  useEffect(() => {
    if (algorithm) {
      setLastSavedState({ ...algorithm });
    }
  }, [algorithm]);

  // Load and filter taxonomies when algorithm changes or window regains focus
  useEffect(() => {
    const loadTaxonomies = () => {
      const allTaxonomies = StorageService.getTaxonomies() as Taxonomy[];
      const currentValueTypeId = currentAlgorithm.tokenGeneration?.bulkAssignments?.resolvedValueTypeId;
      if (currentValueTypeId) {
        const filtered = allTaxonomies.filter(taxonomy => 
          Array.isArray(taxonomy.resolvedValueTypeIds) && 
          taxonomy.resolvedValueTypeIds.includes(currentValueTypeId)
        );
        setFilteredTaxonomies(filtered);
      } else {
        setFilteredTaxonomies([]);
      }
    };
    loadTaxonomies();
    window.addEventListener('focus', loadTaxonomies);
    return () => {
      window.removeEventListener('focus', loadTaxonomies);
    };
  }, [currentAlgorithm.tokenGeneration?.bulkAssignments?.resolvedValueTypeId]);

  // Update selected taxonomies when algorithm changes
  useEffect(() => {
    const currentTaxonomies = currentAlgorithm.tokenGeneration?.bulkAssignments?.taxonomies || [];
    setSelectedTaxonomies(currentTaxonomies);
  }, [currentAlgorithm.tokenGeneration?.bulkAssignments?.taxonomies]);

  // Load resolved value types from storage
  useEffect(() => {
    const valueTypes = StorageService.getValueTypes();
    setResolvedValueTypes(valueTypes);
    if (valueTypes.length > 0) {
      setCurrentAlgorithm(prev => {
        const hasValidType = valueTypes.some(vt => vt.id === prev.resolvedValueTypeId);
        if (!hasValidType) {
          return {
            ...prev,
            resolvedValueTypeId: valueTypes[0].id
          };
        }
        return prev;
      });
    }
  }, []);

  // Detect mode-based variables
  useEffect(() => {
    const algorithmVariables = currentAlgorithm.variables || [];
    
    // Only check system variables that are actually referenced in formulas
    const referencedSystemVariableNames = new Set<string>();
    currentAlgorithm.formulas?.forEach(formula => {
      if (formula.expressions.javascript.value) {
        // Extract variable names from JavaScript expression
        const variableMatches = formula.expressions.javascript.value.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];
        variableMatches.forEach(varName => {
          // Check if this variable name is not in algorithm variables (might be a system variable)
          if (!algorithmVariables.some(v => v.name === varName)) {
            referencedSystemVariableNames.add(varName);
          }
        });
      }
    });
    
    // Get only the system variables that are actually referenced
    const systemVariables = SystemVariableService.getSystemVariables();
    const referencedSystemVariables = systemVariables.filter(v => 
      referencedSystemVariableNames.has(v.name)
    );
    
    const allVariables = [...algorithmVariables, ...referencedSystemVariables];
    
    const modeBasedVariables = allVariables.filter(v => v.modeBased && v.dimensionId);
    setHasModeBasedVariables(modeBasedVariables.length > 0);
  }, [currentAlgorithm.variables, currentAlgorithm.formulas]);

  // Token detection logic - Phase 1
  useEffect(() => {
    const detectExistingTokens = () => {
      const allTokens = StorageService.getTokens() as Token[];
      const algorithmTokens = TokenCalculationService.findTokensByAlgorithm(currentAlgorithm.id, allTokens);
      
      setExistingTokens(algorithmTokens);
      setHasExistingTokens(algorithmTokens.length > 0);
      
      // Auto-enable token generation if tokens exist
      if (algorithmTokens.length > 0 && !currentAlgorithm.tokenGeneration?.enabled) {
        setCurrentAlgorithm(prev => ({
          ...prev,
          tokenGeneration: {
            enabled: true,
            iterationRange: { start: -2, end: 8, step: 1 },
            bulkAssignments: {
              resolvedValueTypeId: prev.resolvedValueTypeId,
              taxonomies: [],
              tokenTier: 'PRIMITIVE',
              private: false,
              status: 'stable',
              themeable: false
            },
            logicalMapping: {
              scaleType: 'numeric',
              defaultValue: '100',
              increasingStep: 100,
              decreasingStep: 25,
              extraPrefix: 'X',
              incrementDirection: 'ascending',
              taxonomyId: undefined,
              newTaxonomyName: undefined
            }
          }
        }));
        
        toast({
          title: 'Token Generation Auto-Enabled',
          description: `Found ${algorithmTokens.length} existing tokens generated by this algorithm. Token generation has been enabled.`,
          status: 'info',
          duration: 5000,
          isClosable: true
        });
      }
    };

    detectExistingTokens();
  }, [currentAlgorithm.id, currentAlgorithm.tokenGeneration?.enabled, toast]);

  // Calculate token values when algorithm changes
  useEffect(() => {
    if (hasExistingTokens && currentAlgorithm.tokenGeneration?.enabled) {
      const allTokens = StorageService.getTokens() as Token[];
      const calculationStates = TokenCalculationService.calculateTokenValues(currentAlgorithm, allTokens);
      setTokenCalculationStates(calculationStates);
    }
  }, [currentAlgorithm, hasExistingTokens]);

  // Formula change detection and selective recalculation
  useEffect(() => {
    if (hasExistingTokens && currentAlgorithm.tokenGeneration?.enabled) {
      // Debounce formula changes to avoid excessive recalculations
      const timeoutId = setTimeout(() => {
        const allTokens = StorageService.getTokens() as Token[];
        
        // Analyze formula dependencies
        const dependencies = TokenCalculationService.analyzeFormulaDependencies(currentAlgorithm, allTokens);
        setFormulaDependencies(dependencies);
        
        // Use selective recalculation if specific formulas changed
        const calculationStates = changedFormulaIds.length > 0
          ? TokenCalculationService.calculateTokenValuesSelective(currentAlgorithm, allTokens, changedFormulaIds)
          : TokenCalculationService.calculateTokenValues(currentAlgorithm, allTokens);
        
        setTokenCalculationStates(calculationStates);
        
        // Show notification if there are changes
        const changedTokens = Array.from(calculationStates.values()).filter(state => state.hasChanges);
        if (changedTokens.length > 0) {
          toast({
            title: 'Formula Changes Detected',
            description: `${changedTokens.length} tokens have updated values based on formula changes.`,
            status: 'info',
            duration: 3000,
            isClosable: true
          });
        }
        
        // Clear changed formula IDs after processing
        setChangedFormulaIds([]);
      }, 500); // 500ms debounce

      return () => clearTimeout(timeoutId);
    }
  }, [
    currentAlgorithm.formulas,
    currentAlgorithm.variables,
    currentAlgorithm.steps,
    currentAlgorithm.tokenGeneration?.iterationRange,
    hasExistingTokens,
    changedFormulaIds
  ]);

  // Handler for taxonomy changes
  const handleTaxonomyChange = (newTaxonomies: Array<{ taxonomyId: string; termId: string }>) => {
    setSelectedTaxonomies(newTaxonomies);
    setCurrentAlgorithm(prev => ({
      ...prev,
      tokenGeneration: {
        ...prev.tokenGeneration!,
        bulkAssignments: {
          ...prev.tokenGeneration!.bulkAssignments,
          taxonomies: newTaxonomies
        }
      }
    }));
  };

  // Track formula changes for selective recalculation
  const trackFormulaChange = (formulaId: string) => {
    setChangedFormulaIds(prev => [...new Set([...prev, formulaId])]);
  };

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
    
    const newVariableObj: Variable = {
      id: generateId('variable'),
      name: newVariable.name,
      type: newVariable.type || 'number',
      defaultValue: newVariable.defaultValue || '',
      // Include mode-based properties
      modeBased: newVariable.modeBased,
      dimensionId: newVariable.dimensionId,
      valuesByMode: newVariable.valuesByMode || []
    };

    const updatedAlgorithm = {
      ...currentAlgorithm,
      variables: [...currentAlgorithm.variables, newVariableObj]
    };
    setCurrentAlgorithm(updatedAlgorithm);
    setNewVariable({ name: '', type: 'number', defaultValue: '', modeBased: false, dimensionId: undefined, valuesByMode: [] });
    
    // Track history
    trackHistoryChange(`Added variable: ${newVariableObj.name}`, 'variable');
  };

  const handleAddCondition = () => {
    const newConditionItem: Condition = {
      id: generateId('cond'),
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
    const variable = currentAlgorithm.variables.find(v => v.id === id);
    const updatedAlgorithm = {
      ...currentAlgorithm,
      variables: currentAlgorithm.variables.filter(v => v.id !== id)
    };
    setCurrentAlgorithm(updatedAlgorithm);
    
    // Track history
    if (variable) {
      trackHistoryChange(`Deleted variable: ${variable.name}`, 'variable');
    }
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
          description: `Variable with ID "${variable.id}" is missing a name`,
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
          description: `Formula with ID "${formula.id}" is missing a name`,
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
          description: `Condition with ID "${condition.id}" is missing a name`,
          status: 'error',
          duration: 3000,
          isClosable: true
        });
        return;
      }
    }

    // Validate token generation configuration if enabled
    if (currentAlgorithm.tokenGeneration?.enabled && !hasExistingTokens) {
      const { logicalMapping } = currentAlgorithm.tokenGeneration;
      const hasTaxonomyConfig = logicalMapping.taxonomyId || logicalMapping.newTaxonomyName?.trim();
      
      if (!hasTaxonomyConfig) {
        toast({
          title: 'Token Generation Configuration Required',
          description: 'Please configure the taxonomy settings in the Token Generation tab before saving.',
          status: 'error',
          duration: 5000,
          isClosable: true
        });
        return;
      }

      // Check if algorithm has minimum required configuration
      const hasVariables = currentAlgorithm.variables && currentAlgorithm.variables.length > 0;
      const hasFormulas = currentAlgorithm.formulas && currentAlgorithm.formulas.length > 0;
      
      if (!hasVariables || !hasFormulas) {
        const missingItems = [];
        if (!hasVariables) missingItems.push('variables');
        if (!hasFormulas) missingItems.push('formulas');
        
        toast({
          title: 'Algorithm Configuration Required',
          description: `Please add ${missingItems.join(' and ')} before saving.`,
          status: 'error',
          duration: 5000,
          isClosable: true
        });
        return;
      }
    }

    // If there are existing tokens and changes, show preview dialog
    if (hasExistingTokens && Array.from(tokenCalculationStates.values()).some(state => state.hasChanges)) {
      setShowSavePreview(true);
      return;
    }

    // Check if we need to show mode selection dialog
    if (currentAlgorithm.tokenGeneration?.enabled && hasModeBasedVariables && !hasExistingTokens) {
      setShowModeSelectionDialog(true);
      return;
    }

    // Otherwise, save directly
    performSave([]);
  };

  const performSave = (selectedTokenIds: string[], modes?: Record<string, string[]>) => {
    // Save the algorithm
    onSave(currentAlgorithm);
    
    // Debug log: Log algorithm data in schema format
    const algorithmDataForStorage = {
      schemaVersion: "5.0.0",
      profile: "basic",
      metadata: {
        name: "Algorithm Collection",
        description: "Collection of algorithms for design token generation",
        version: "1.0.0"
      },
      config: {},
      algorithms: [currentAlgorithm],
      execution: {
        order: [],
        parallel: false,
        onError: "stop"
      },
      integration: {
        targetSchema: "https://designsystem.org/schemas/tokens/v1.0.0",
        outputFormat: "design-tokens",
        mergeStrategy: "merge",
        validation: true
      },
      examples: []
    };
    
    console.log('AlgorithmEditor: Saving algorithm in schema format:', {
      algorithmId: currentAlgorithm.id,
      algorithmName: currentAlgorithm.name,
      schemaData: algorithmDataForStorage,
      rawAlgorithm: currentAlgorithm
    });
    
    // Update last saved state
    setLastSavedState({ ...currentAlgorithm });
    setHasUnsavedChanges(false);

    // Track history
    trackHistoryChange('Saved algorithm', 'general');

    // Update selected tokens if any
    if (selectedTokenIds.length > 0) {
      try {
        const allTokens = StorageService.getTokens() as Token[];
        const updatedTokens = allTokens.map(token => {
          if (selectedTokenIds.includes(token.id)) {
            const calculationState = tokenCalculationStates.get(token.id);
            if (calculationState && calculationState.hasChanges) {
              return {
                ...token,
                valuesByMode: [
                  {
                    modeIds: token.valuesByMode[0]?.modeIds || [],
                    value: calculationState.calculatedValue
                  }
                ]
              };
            }
          }
          return token;
        });

        onUpdateTokens(updatedTokens);

        toast({
          title: 'Success',
          description: `Algorithm saved and ${selectedTokenIds.length} tokens updated successfully!`,
          status: 'success',
          duration: 3000,
          isClosable: true
        });
      } catch (error) {
        toast({
          title: 'Token Update Failed',
          description: `Algorithm saved but token updates failed: ${error}`,
          status: 'error',
          duration: 5000,
          isClosable: true
        });
      }
    } else {
      // Generate new tokens if token generation is enabled and no existing tokens
      if (currentAlgorithm.tokenGeneration?.enabled && !hasExistingTokens) {
        try {
          const existingTokens = StorageService.getTokens();
          const collections = StorageService.getCollections();
          const taxonomies = StorageService.getTaxonomies();

          const { tokens, errors, newTaxonomies, updatedTaxonomies } = TokenGenerationService.generateTokens(
            currentAlgorithm,
            existingTokens,
            collections,
            taxonomies,
            true, // Modify taxonomies in place for actual saving
            modes
          );

          console.log('AlgorithmEditor: Received from TokenGenerationService:', {
            tokensCount: tokens.length,
            errorsCount: errors.length,
            newTaxonomiesCount: newTaxonomies?.length || 0,
            updatedTaxonomiesCount: updatedTaxonomies?.length || 0,
            newTaxonomies: newTaxonomies,
            updatedTaxonomies: updatedTaxonomies
          });

          // Save new taxonomies if any were created
          if (newTaxonomies && newTaxonomies.length > 0) {
            const updatedTaxonomiesList = [...taxonomies, ...newTaxonomies];
            StorageService.setTaxonomies(updatedTaxonomiesList);
            console.log('AlgorithmEditor: Saved new taxonomies:', newTaxonomies);
          }

          // Save updated taxonomies if any were modified
          if (updatedTaxonomies && updatedTaxonomies.length > 0) {
            const updatedTaxonomiesList = taxonomies.map(taxonomy => {
              const updatedTaxonomy = updatedTaxonomies.find(ut => ut.id === taxonomy.id);
              return updatedTaxonomy || taxonomy;
            });
            StorageService.setTaxonomies(updatedTaxonomiesList);
            console.log('AlgorithmEditor: Saved updated taxonomies:', updatedTaxonomies);
          }

          if (errors.length > 0) {
            toast({
              title: 'Token Generation Errors',
              description: `Generated ${tokens.length} tokens with ${errors.length} errors. Check the preview for details.`,
              status: 'warning',
              duration: 5000,
              isClosable: true
            });
          }

          if (tokens.length > 0) {
            // Merge generated tokens with existing tokens
            const updatedTokens = [...existingTokens, ...tokens];
            onUpdateTokens(updatedTokens);

            console.log('new tokens', tokens);

            toast({
              title: 'Success',
              description: `Algorithm saved and ${tokens.length} tokens generated successfully!`,
              status: 'success',
              duration: 3000,
              isClosable: true
            });
          }
        } catch (error) {
          toast({
            title: 'Token Generation Failed',
            description: `Algorithm saved but token generation failed: ${error}`,
            status: 'error',
            duration: 5000,
            isClosable: true
          });
        }
      } else {
        toast({
          title: 'Success',
          description: 'Algorithm saved successfully!',
          status: 'success',
          duration: 3000,
          isClosable: true
        });
      }
    }
  };

  const handleVariableTypeChange = (type: Variable['type']) => {
    setNewVariable(prev => ({ ...prev, type }));
  };

  const handleVariableDefaultValueChange = (value: string) => {
    setNewVariable(prev => ({ ...prev, defaultValue: value }));
  };

  const handleEditVariable = (variable: Variable) => {
    setEditingVariableId(variable.id);
    setEditingVariable(variable);
  };

  const handleSaveEditVariable = () => {
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

    // Validate variable name pattern
    if (!variableNamePattern.test(editingVariable.name)) {
      toast({
        title: 'Error',
        description: 'Variable name must start with a letter or underscore and contain only letters, numbers, and underscores.',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    const updatedAlgorithm = {
      ...currentAlgorithm,
      variables: currentAlgorithm.variables.map(v => 
        v.id === editingVariableId 
          ? { ...v, ...editingVariable }
          : v
      )
    };
    setCurrentAlgorithm(updatedAlgorithm);
    setEditingVariableId(null);
    setEditingVariable({});
    
    // Track history
    trackHistoryChange(`Updated variable: ${editingVariable.name}`, 'variable');
  };

  const handleCancelEdit = () => {
    setEditingVariableId(null);
    setEditingVariable({});
  };

  const generatePreviewTokens = () => {
    if (!currentAlgorithm.tokenGeneration?.enabled) {
      setGeneratedTokens([]);
      setGenerationErrors([]);
      return;
    }

    // Only generate preview if configuration is complete
    if (!tokenGenerationConfigured) {
      setGeneratedTokens([]);
      setGenerationErrors([]);
      return;
    }

    // Additional validation before attempting generation
    const hasVariables = currentAlgorithm.variables && currentAlgorithm.variables.length > 0;
    const hasFormulas = currentAlgorithm.formulas && currentAlgorithm.formulas.length > 0;
    
    if (!hasExistingTokens && (!hasVariables || !hasFormulas)) {
      setGeneratedTokens([]);
      setGenerationErrors(['Please add variables and formulas before generating tokens.']);
      return;
    }

    // Check for missing variables referenced in formulas
    if (hasFormulas) {
      // Get both algorithm variables and system variables
      const algorithmVariableNames = new Set(currentAlgorithm.variables.map(v => v.name));
      const systemVariables = SystemVariableService.getSystemVariables();
      const systemVariableNames = new Set(systemVariables.map(v => v.name));
      const allDefinedVariableNames = new Set([...algorithmVariableNames, ...systemVariableNames]);
      
      const missingVariables: string[] = [];
      const syntaxErrors: string[] = [];
      
      // Check each formula for missing variables and syntax errors
      currentAlgorithm.formulas.forEach(formula => {
        if (formula.expressions.javascript.value) {
          const jsExpression = formula.expressions.javascript.value;
          
          // Check for common syntax errors
          if (jsExpression.includes('Math.pow(') && jsExpression.includes('=')) {
            syntaxErrors.push(`Formula "${formula.name}" has invalid Math.pow syntax. Assignment cannot be done inside Math.pow().`);
          }
          
          // Check for malformed function calls
          if (jsExpression.includes('(') && !jsExpression.includes(')')) {
            syntaxErrors.push(`Formula "${formula.name}" has unmatched parentheses.`);
          }
          
          // Convert formula from IDs to names for validation
          const formulaWithNames = VariableMappingService.convertFormulaToNames(
            jsExpression, 
            currentAlgorithm.variables
          );
          
          // Extract variable names from the JavaScript expression
          const variableMatches = formulaWithNames.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];
          const uniqueVariables = [...new Set(variableMatches)];
          
          // Filter out JavaScript keywords and functions
          const jsKeywords = ['Math', 'Array', 'Object', 'String', 'Number', 'Boolean', 'Date', 'RegExp', 'Function', 'undefined', 'null', 'true', 'false', 'NaN', 'Infinity'];
          const formulaVariables = uniqueVariables.filter(v => !jsKeywords.includes(v));
          
          // Check for missing variables
          formulaVariables.forEach(varName => {
            if (!allDefinedVariableNames.has(varName)) {
              missingVariables.push(varName);
            }
          });
        }
      });
      
      // Report syntax errors first
      if (syntaxErrors.length > 0) {
        setGeneratedTokens([]);
        setGenerationErrors(syntaxErrors);
        return;
      }
      
      if (missingVariables.length > 0) {
        const uniqueMissingVars = [...new Set(missingVariables)];
        setGeneratedTokens([]);
        setGenerationErrors([
          `The following variables are referenced in formulas but not defined: ${uniqueMissingVars.join(', ')}. Please add them in the Variables tab or ensure system variables are properly configured.`
        ]);
        return;
      }
      
      // Check for missing variableIds in formulas
      const variableIdErrors: string[] = [];
      currentAlgorithm.formulas.forEach(formula => {
        if (formula.expressions.javascript.value) {
          const jsExpression = formula.expressions.javascript.value;
          const formulaWithNames = VariableMappingService.convertFormulaToNames(
            jsExpression, 
            currentAlgorithm.variables
          );
          
          // Extract variable names from the JavaScript expression
          const variableMatches = formulaWithNames.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];
          const uniqueVariables = [...new Set(variableMatches)];
          
          // Filter out JavaScript keywords and functions
          const jsKeywords = ['Math', 'Array', 'Object', 'String', 'Number', 'Boolean', 'Date', 'RegExp', 'Function', 'undefined', 'null', 'true', 'false', 'NaN', 'Infinity'];
          const formulaVariables = uniqueVariables.filter(v => !jsKeywords.includes(v));
          
          // Get all variable mappings to check IDs
          const allVariableMappings = VariableMappingService.getAllVariableMappings(currentAlgorithm.variables);
          const referencedVariableIds = new Set<string>();
          
          formulaVariables.forEach(varName => {
            const mapping = allVariableMappings.find(m => m.name === varName);
            if (mapping) {
              referencedVariableIds.add(mapping.id);
            }
          });
          
          // Check if all referenced variables are in variableIds
          const missingVariableIds = Array.from(referencedVariableIds).filter(id => 
            !formula.variableIds.includes(id)
          );
          
          if (missingVariableIds.length > 0) {
            const missingNames = missingVariableIds.map(id => {
              const mapping = allVariableMappings.find(m => m.id === id);
              return mapping ? mapping.name : id;
            });
            variableIdErrors.push(`Formula "${formula.name}" references variables not listed in variableIds: ${missingNames.join(', ')}`);
          }
        }
      });
      
      if (variableIdErrors.length > 0) {
        setGeneratedTokens([]);
        setGenerationErrors(variableIdErrors);
        return;
      }
    }

    try {
      const existingTokens = StorageService.getTokens();
      const collections = StorageService.getCollections();
      const taxonomies = StorageService.getTaxonomies();

      const { tokens, errors } = TokenGenerationService.generateTokens(
        currentAlgorithm,
        existingTokens,
        collections,
        taxonomies,
        false, // Don't modify taxonomies in place for preview
        selectedModes
      );

      setGeneratedTokens(tokens);
      setGenerationErrors(errors);
    } catch (error) {
      console.error('Preview generation error:', error);
      setGenerationErrors([`Preview generation failed: ${error}`]);
      setGeneratedTokens([]);
    }
  };

  // Generate preview tokens when algorithm changes and configuration is complete
  useEffect(() => {
    generatePreviewTokens();
  }, [currentAlgorithm, selectedModes, tokenGenerationConfigured]);

  // Check if token generation configuration is complete
  useEffect(() => {
    if (!currentAlgorithm.tokenGeneration?.enabled) {
      setTokenGenerationConfigured(false);
      return;
    }

    const { logicalMapping } = currentAlgorithm.tokenGeneration;
    
    // Check if either an existing taxonomy is selected OR a new taxonomy name is provided
    const hasTaxonomyConfig = logicalMapping.taxonomyId || logicalMapping.newTaxonomyName?.trim();
    
    // Check if algorithm has minimum required configuration
    const hasVariables = currentAlgorithm.variables && currentAlgorithm.variables.length > 0;
    const hasFormulas = currentAlgorithm.formulas && currentAlgorithm.formulas.length > 0;
    
    // For new algorithms, require at least variables and formulas
    // For existing algorithms with tokens, we can be more lenient
    const hasMinimumConfig = hasExistingTokens ? true : (hasVariables && hasFormulas);
    
    setTokenGenerationConfigured(!!hasTaxonomyConfig && hasMinimumConfig);
  }, [
    currentAlgorithm.tokenGeneration?.logicalMapping?.taxonomyId, 
    currentAlgorithm.tokenGeneration?.logicalMapping?.newTaxonomyName, 
    currentAlgorithm.tokenGeneration?.enabled,
    currentAlgorithm.variables,
    currentAlgorithm.formulas,
    hasExistingTokens
  ]);

  const handleAddFormula = () => {
    const newFormula: Formula = {
      id: generateId('formula'),
      name: '',
      description: '',
      expressions: {
        latex: { value: '' },
        javascript: { 
          value: '',
          metadata: {
            allowedOperations: ['math']
          }
        },
        ast: {
          type: 'literal',
          value: '',
          metadata: {
            astVersion: '1.0.0',
            validationErrors: [],
            complexity: 'low'
          }
        }
      },
      variableIds: []
    };
    const updatedAlgorithm = {
      ...currentAlgorithm,
      formulas: [...(currentAlgorithm.formulas || []), newFormula]
    };
    setCurrentAlgorithm(updatedAlgorithm);
    
    // Track history
    AlgorithmHistoryService.saveToHistory(
      updatedAlgorithm,
      'Added new formula',
      'formula'
    );
  };

  // History tracking functions for Phase 4
  const trackHistoryChange = (description: string, type: AlgorithmHistoryEntry['type']) => {
    AlgorithmHistoryService.saveToHistory(currentAlgorithm, description, type);
  };

  const handleUndo = () => {
    const previousAlgorithm = AlgorithmHistoryService.undo(currentAlgorithm.id);
    if (previousAlgorithm) {
      setCurrentAlgorithm(previousAlgorithm);
      toast({
        title: 'Undo Successful',
        description: 'Algorithm reverted to previous state',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    } else {
      toast({
        title: 'Nothing to Undo',
        description: 'No previous states available',
        status: 'info',
        duration: 3000,
        isClosable: true
      });
    }
  };

  const handleRedo = () => {
    const nextAlgorithm = AlgorithmHistoryService.redo(currentAlgorithm.id);
    if (nextAlgorithm) {
      setCurrentAlgorithm(nextAlgorithm);
      toast({
        title: 'Redo Successful',
        description: 'Algorithm restored to next state',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    } else {
      toast({
        title: 'Nothing to Redo',
        description: 'No future states available',
        status: 'info',
        duration: 3000,
        isClosable: true
      });
    }
  };

  const handleReset = (resetType: 'last-save' | 'specific-history' | 'original', historyEntry?: AlgorithmHistoryEntry) => {
    let resetAlgorithm: Algorithm;

    switch (resetType) {
      case 'last-save':
        if (lastSavedState) {
          resetAlgorithm = { ...lastSavedState };
        } else {
          toast({
            title: 'Reset Failed',
            description: 'No saved state available',
            status: 'error',
            duration: 3000,
            isClosable: true
          });
          return;
        }
        break;
      
      case 'specific-history':
        if (historyEntry) {
          resetAlgorithm = { ...historyEntry.algorithm };
        } else {
          toast({
            title: 'Reset Failed',
            description: 'No history entry selected',
            status: 'error',
            duration: 3000,
            isClosable: true
          });
          return;
        }
        break;
      
      case 'original':
        // Reset to original algorithm state
        resetAlgorithm = algorithm ? { ...algorithm } : defaultAlgorithm;
        // Clear history for this algorithm
        AlgorithmHistoryService.clearHistory(currentAlgorithm.id);
        break;
      
      default:
        return;
    }

    setCurrentAlgorithm(resetAlgorithm);
    setLastSavedState(resetAlgorithm);
    setHasUnsavedChanges(false);

    toast({
      title: 'Reset Successful',
      description: `Algorithm reset to ${resetType.replace('-', ' ')}`,
      status: 'success',
      duration: 3000,
      isClosable: true
    });
  };

  const handleModeSelectionConfirm = (modes: Record<string, string[]>) => {
    setSelectedModes(modes);
    setShowModeSelectionDialog(false);
    performSave([], modes);
  };

  const canUndo = AlgorithmHistoryService.canUndo(currentAlgorithm.id);
  const canRedo = AlgorithmHistoryService.canRedo(currentAlgorithm.id);

  // Helper function to get mode name from mode ID
  const getModeName = (modeId: string, dimensionId?: string): string => {
    if (!dimensionId) return modeId;
    const dimensions = StorageService.getDimensions();
    const dimension = dimensions.find(d => d.id === dimensionId);
    if (!dimension) return modeId;
    const mode = dimension.modes.find(m => m.id === modeId);
    return mode ? mode.name : modeId;
  };

  // Regex for valid variable names
  const variableNamePattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  const isVariableNameValid = newVariable.name ? variableNamePattern.test(newVariable.name) : false;
  const isEditingVariableNameValid = editingVariable.name ? variableNamePattern.test(editingVariable.name) : true;

  return (
    <Box>
      <VStack spacing={6} align="stretch">
        {/* Header with Undo/Redo/Reset Controls */}
        <HStack justify="space-between" align="center">
          <Text fontSize="xl" fontWeight="bold">Algorithm Editor</Text>
          <HStack spacing={2}>
            <IconButton
              aria-label="Undo"
              icon={<Undo2 size={16} />}
              size="sm"
              variant="ghost"
              isDisabled={!canUndo}
              onClick={handleUndo}
              title={canUndo ? 'Undo last change' : 'Nothing to undo'}
            />
            <IconButton
              aria-label="Redo"
              icon={<Redo2 size={16} />}
              size="sm"
              variant="ghost"
              isDisabled={!canRedo}
              onClick={handleRedo}
              title={canRedo ? 'Redo last undone change' : 'Nothing to redo'}
            />
            <IconButton
              aria-label="Reset Algorithm"
              icon={<RotateCcw size={16} />}
              size="sm"
              variant="ghost"
              colorScheme="orange"
              onClick={() => setShowResetDialog(true)}
              title="Reset algorithm to previous state"
            />
          </HStack>
        </HStack>

        {/* Change Status Indicator */}
        {hasUnsavedChanges && (
          <Box p={2} bg="orange.100" borderRadius="md" borderWidth={1} borderColor="orange.200">
            <Text fontSize="sm" color="orange.700">
              ⚠️ You have unsaved changes
            </Text>
          </Box>
        )}

        {/* Basic Information */}
        <VStack spacing={4} align="stretch">
          <Text fontSize="lg" fontWeight="bold">Basic Information</Text>
          <FormControl isRequired>
            <FormLabel>Algorithm Name</FormLabel>
            <Input
              placeholder="Algorithm Name"
              value={currentAlgorithm.name}
              onChange={e => {
                setCurrentAlgorithm(prev => ({ ...prev, name: e.target.value }));
                trackHistoryChange('Updated algorithm name', 'general');
              }}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Description</FormLabel>
            <Textarea
              placeholder="Description (optional)"
              value={currentAlgorithm.description}
              onChange={e => {
                setCurrentAlgorithm(prev => ({ ...prev, description: e.target.value }));
                trackHistoryChange('Updated algorithm description', 'general');
              }}
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
            <Tab>Token Generation</Tab>
            <Tab>Algorithm Steps</Tab>
            <Tab>Preview</Tab>
            <Tab>Dependency Visualization</Tab>
          </TabList>

          <TabPanels>
            {/* Variables Tab */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                <HStack spacing={4} justify="start">
                  <FormControl isRequired isInvalid={!!newVariable.name && !isVariableNameValid}>
                    <FormLabel>Variable Name</FormLabel>
                    <Input
                      placeholder="Variable Name"
                      value={newVariable.name}
                      onChange={e => setNewVariable(prev => ({ ...prev, name: e.target.value }))}
                    />
                    {!isVariableNameValid && newVariable.name && (
                      <Text fontSize="xs" color="red.500">
                        Variable names must start with a letter or underscore and contain only letters, numbers, and underscores.
                      </Text>
                    )}
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
                    isDisabled={!isVariableNameValid}
                  >
                    Add Variable
                  </Button>
                </HStack>
                
                {/* Mode-Based Variable Settings for New Variable */}
                {newVariable.name && (
                  <ModeBasedVariableEditor
                    variable={newVariable as Variable}
                    onVariableChange={(updatedVariable) => setNewVariable(updatedVariable)}
                    dimensions={StorageService.getDimensions()}
                  />
                )}
                
                <VStack spacing={2} align="stretch">
                  {currentAlgorithm.variables.map(variable => (
                    <Box key={variable.id} p={3} borderWidth={1} borderRadius="md">
                      <HStack justify="space-between" mb={2}>
                        {editingVariableId === variable.id ? (
                          <VStack spacing={4} flex={1} align="stretch">
                            <HStack spacing={4}>
                              <FormControl isRequired isInvalid={!!editingVariable.name && !isEditingVariableNameValid}>
                                <FormLabel>Variable Name</FormLabel>
                                <Input
                                  placeholder="Variable Name"
                                  value={editingVariable.name}
                                  onChange={e => setEditingVariable(prev => ({ ...prev, name: e.target.value }))}
                                />
                                {!isEditingVariableNameValid && editingVariable.name && (
                                  <Text fontSize="xs" color="red.500">
                                    Variable names must start with a letter or underscore and contain only letters, numbers, and underscores.
                                  </Text>
                                )}
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
                            </HStack>
                            
                            {/* Mode-Based Variable Settings for Editing */}
                            <ModeBasedVariableEditor
                              variable={editingVariable as Variable}
                              onVariableChange={(updatedVariable) => setEditingVariable(updatedVariable)}
                              dimensions={StorageService.getDimensions()}
                            />
                            
                            <HStack spacing={2}>
                              <Button
                                size="sm"
                                colorScheme="blue"
                                onClick={handleSaveEditVariable}
                                isDisabled={!isEditingVariableNameValid}
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
                          </VStack>
                        ) : (
                          <>
                            <VStack align="start" flex={1} spacing={1}>
                              <HStack>
                                <Badge colorScheme="blue">{variable.name}</Badge>
                                <Text fontSize="sm" color="gray.500">({variable.type})</Text>
                                {variable.defaultValue && !variable.modeBased && (
                                  <Text fontSize="sm" color="gray.500">= {variable.defaultValue}</Text>
                                )}
                                {variable.modeBased && (
                                  <Badge colorScheme="green" size="sm">Mode-Based</Badge>
                                )}
                              </HStack>
                              
                              {/* Display mode-specific values */}
                              {variable.modeBased && variable.valuesByMode && variable.valuesByMode.length > 0 && (
                                <Box>
                                  <Text fontSize="xs" color="gray.500" mb={1}>Mode Values:</Text>
                                  <HStack spacing={2} wrap="wrap">
                                    {variable.valuesByMode.map(({ modeIds, value }) => (
                                      <Badge key={modeIds.join(', ')} size="sm" colorScheme="purple" variant="outline">
                                        {getModeName(modeIds[0], variable.dimensionId)}: {value}
                                      </Badge>
                                    ))}
                                  </HStack>
                                </Box>
                              )}
                            </VStack>
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
                    </Box>
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
                                  trackFormulaChange(formula.id);
                                  trackHistoryChange(`Updated formula name: ${e.target.value}`, 'formula');
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
                                  trackFormulaChange(formula.id);
                                  trackHistoryChange(`Updated formula description: ${e.target.value}`, 'formula');
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
                            onChange={(value, latexExpression, ast) => {
                              // Convert the formula from display names to IDs for storage
                              const formulaWithIds = VariableMappingService.convertFormulaToIds(value, currentAlgorithm.variables);
                              const latexWithIds = VariableMappingService.convertLatexToIds(latexExpression, currentAlgorithm.variables);
                              const astWithIds = VariableMappingService.convertASTToIds(ast, currentAlgorithm.variables);
                              
                              const newFormulas = [...(currentAlgorithm.formulas || [])];
                              newFormulas[index] = {
                                ...formula,
                                expressions: {
                                  latex: { value: latexWithIds },
                                  javascript: { 
                                    value: formulaWithIds,
                                    metadata: {
                                      allowedOperations: ['math']
                                    }
                                  },
                                  ast: astWithIds
                                }
                              };
                              const updatedAlgorithm = {
                                ...currentAlgorithm,
                                formulas: newFormulas
                              };
                              setCurrentAlgorithm(updatedAlgorithm);
                              trackFormulaChange(formula.id);
                              trackHistoryChange(`Updated formula expression: ${formula.name}`, 'formula');
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
                            
                            trackHistoryChange(`Deleted formula: ${formula.name}`, 'formula');
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

            {/* Token Generation Tab */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <Text fontSize="lg" fontWeight="bold">Token Generation Settings</Text>
                  <Button
                    size="sm"
                    colorScheme={currentAlgorithm.tokenGeneration?.enabled ? "green" : "gray"}
                    onClick={() => {
                      const enabled = !currentAlgorithm.tokenGeneration?.enabled;
                      setCurrentAlgorithm(prev => ({
                        ...prev,
                        tokenGeneration: enabled ? {
                          enabled: true,
                          iterationRange: { start: -2, end: 8, step: 1 },
                          bulkAssignments: {
                            resolvedValueTypeId: resolvedValueTypes.length > 0 ? resolvedValueTypes[0].id : 'color',
                            taxonomies: [],
                            tokenTier: 'PRIMITIVE',
                            private: false,
                            status: 'stable',
                            themeable: false
                          },
                          logicalMapping: {
                            scaleType: 'numeric',
                            defaultValue: '100',
                            increasingStep: 100,
                            decreasingStep: 25,
                            extraPrefix: 'X',
                            incrementDirection: 'ascending',
                            taxonomyId: undefined,
                            newTaxonomyName: undefined
                          }
                        } : undefined
                      }));
                    }}
                  >
                    {currentAlgorithm.tokenGeneration?.enabled ? 'Enabled' : 'Enable Token Generation'}
                  </Button>
                </HStack>

                {/* Mode-based variables indicator */}
                {hasModeBasedVariables && currentAlgorithm.tokenGeneration?.enabled && (
                  <Box p={4} borderWidth={1} borderRadius="md" bg={colorMode === 'light' ? 'blue.50' : 'blue.900'}>
                    <HStack justify="space-between" mb={3}>
                      <Text fontWeight="bold" color="blue.600">
                        Mode-Based Variables Detected
                      </Text>
                      <Badge colorScheme="blue">Mode Selection Required</Badge>
                    </HStack>
                    <Text fontSize="sm" color="gray.600" mb={3}>
                      Your algorithm contains variables with mode-specific values. When you save, you&apos;ll be prompted to select which modes to generate tokens for.
                    </Text>
                    {Object.keys(selectedModes).length > 0 && (
                      <Box>
                        <Text fontSize="sm" fontWeight="medium" mb={2}>Selected Modes:</Text>
                        <VStack spacing={1} align="stretch">
                          {Object.entries(selectedModes).map(([dimensionId, modeIds]) => {
                            const dimension = StorageService.getDimensions().find(d => d.id === dimensionId);
                            return (
                              <HStack key={dimensionId} spacing={2}>
                                <Badge size="sm" colorScheme="green">
                                  {dimension?.displayName || dimensionId}
                                </Badge>
                                <Text fontSize="xs" color="gray.500">
                                  {modeIds.length} mode{modeIds.length !== 1 ? 's' : ''} selected
                                </Text>
                              </HStack>
                            );
                          })}
                        </VStack>
                      </Box>
                    )}
                  </Box>
                )}

                {/* Show existing tokens info when tokens exist */}
                {hasExistingTokens && (
                  <Box p={4} borderWidth={1} borderRadius="md" bg={colorMode === 'light' ? 'blue.50' : 'blue.900'}>
                    <HStack justify="space-between" mb={3}>
                      <Text fontWeight="bold" color="blue.600">
                        Existing Tokens ({existingTokens.length})
                      </Text>
                      <Badge colorScheme="blue">Algorithm-Generated</Badge>
                    </HStack>
                    <Text fontSize="sm" color="gray.600" mb={3}>
                      This algorithm has generated {existingTokens.length} tokens. Token generation settings are simplified to focus on formula-driven updates.
                    </Text>
                    
                    {/* Simplified token table */}
                    <VStack spacing={2} align="stretch" maxH="300px" overflowY="auto">
                      {existingTokens.map(token => {
                        const calculationState = tokenCalculationStates.get(token.id);
                        const valueType = resolvedValueTypes.find(vt => vt.id === token.resolvedValueTypeId);
                        
                        // Find formulas that affect this token
                        const affectingFormulas = formulaDependencies
                          .filter(dep => dep.affectedTokens.includes(token.id))
                          .map(dep => dep.formulaName);
                        
                        return (
                          <HStack key={token.id} p={2} borderWidth={1} borderRadius="md" bg={colorMode === 'light' ? 'white' : 'gray.700'}>
                            <VStack align="start" flex={1} spacing={1}>
                              <Text fontWeight="medium" fontSize="sm">{token.displayName}</Text>
                              <HStack spacing={2}>
                                <Badge size="sm" colorScheme="gray">{valueType?.displayName || 'Unknown Type'}</Badge>
                                {calculationState && (
                                  <Badge 
                                    size="sm" 
                                    colorScheme={calculationState.hasChanges ? 'orange' : 'green'}
                                  >
                                    {calculationState.hasChanges ? 'Has Changes' : 'Up to Date'}
                                  </Badge>
                                )}
                                {calculationState && (
                                  <Text fontSize="xs" color="gray.500">
                                    Iteration: {calculationState.iterationValue}
                                  </Text>
                                )}
                              </HStack>
                              {affectingFormulas.length > 0 && (
                                <Text fontSize="xs" color="blue.500">
                                  Affected by: {affectingFormulas.join(', ')}
                                </Text>
                              )}
                            </VStack>
                            <VStack align="end" spacing={1}>
                              <Text fontSize="xs" color="gray.500">
                                Current: {token.valuesByMode[0]?.value && 'value' in token.valuesByMode[0].value ? token.valuesByMode[0].value.value : 'N/A'}
                              </Text>
                              {calculationState && calculationState.hasChanges && (
                                <Text fontSize="xs" color="orange.500">
                                  New: {calculationState.calculatedValue && 'value' in calculationState.calculatedValue ? calculationState.calculatedValue.value : 'N/A'}
                                </Text>
                              )}
                            </VStack>
                          </HStack>
                        );
                      })}
                    </VStack>
                  </Box>
                )}

                {currentAlgorithm.tokenGeneration?.enabled && (
                  <VStack spacing={6} align="stretch">
                    {/* Iteration Range */}
                    <Box p={4} borderWidth={1} borderRadius="md">
                      <Text fontWeight="bold" mb={3}>Iteration Range</Text>
                      <HStack spacing={4}>
                        <FormControl>
                          <FormLabel>Start</FormLabel>
                          <Input
                            type="number"
                            value={currentAlgorithm.tokenGeneration.iterationRange.start}
                            onChange={(e) => {
                              setCurrentAlgorithm(prev => ({
                                ...prev,
                                tokenGeneration: {
                                  ...prev.tokenGeneration!,
                                  iterationRange: {
                                    ...prev.tokenGeneration!.iterationRange,
                                    start: parseInt(e.target.value) || 0
                                  }
                                }
                              }));
                            }}
                          />
                        </FormControl>
                        <FormControl>
                          <FormLabel>End</FormLabel>
                          <Input
                            type="number"
                            value={currentAlgorithm.tokenGeneration.iterationRange.end}
                            onChange={(e) => {
                              setCurrentAlgorithm(prev => ({
                                ...prev,
                                tokenGeneration: {
                                  ...prev.tokenGeneration!,
                                  iterationRange: {
                                    ...prev.tokenGeneration!.iterationRange,
                                    end: parseInt(e.target.value) || 0
                                  }
                                }
                              }));
                            }}
                          />
                        </FormControl>
                        <FormControl>
                          <FormLabel>Step</FormLabel>
                          <Input
                            type="number"
                            value={currentAlgorithm.tokenGeneration.iterationRange.step}
                            onChange={(e) => {
                              setCurrentAlgorithm(prev => ({
                                ...prev,
                                tokenGeneration: {
                                  ...prev.tokenGeneration!,
                                  iterationRange: {
                                    ...prev.tokenGeneration!.iterationRange,
                                    step: parseInt(e.target.value) || 1
                                  }
                                }
                              }));
                            }}
                          />
                        </FormControl>
                      </HStack>
                    </Box>

                    {/* Only show bulk assignments and logical mapping if no existing tokens */}
                    {!hasExistingTokens && (
                      <>
                        {/* Bulk Assignments */}
                        <Box p={4} borderWidth={1} borderRadius="md">
                          <Text fontWeight="bold" mb={3}>Bulk Assignments</Text>
                          <VStack spacing={4} align="stretch">
                            <FormControl>
                              <FormLabel>Resolved Value Type</FormLabel>
                              <Select
                                value={currentAlgorithm.tokenGeneration.bulkAssignments.resolvedValueTypeId}
                                onChange={(e) => {
                                  setCurrentAlgorithm(prev => ({
                                    ...prev,
                                    tokenGeneration: {
                                      ...prev.tokenGeneration!,
                                      bulkAssignments: {
                                        ...prev.tokenGeneration!.bulkAssignments,
                                        resolvedValueTypeId: e.target.value
                                      }
                                    }
                                  }));
                                }}
                              >
                                {resolvedValueTypes.map(valueType => (
                                  <option key={valueType.id} value={valueType.id}>
                                    {valueType.displayName}
                                  </option>
                                ))}
                              </Select>
                            </FormControl>
                            <FormControl>
                              <FormLabel>Token Tier</FormLabel>
                              <Select
                                value={currentAlgorithm.tokenGeneration.bulkAssignments.tokenTier}
                                onChange={(e) => {
                                  setCurrentAlgorithm(prev => ({
                                    ...prev,
                                    tokenGeneration: {
                                      ...prev.tokenGeneration!,
                                      bulkAssignments: {
                                        ...prev.tokenGeneration!.bulkAssignments,
                                        tokenTier: e.target.value as 'PRIMITIVE' | 'SEMANTIC' | 'COMPONENT'
                                      }
                                    }
                                  }));
                                }}
                              >
                                <option value="PRIMITIVE">Primitive</option>
                                <option value="SEMANTIC">Semantic</option>
                                <option value="COMPONENT">Component</option>
                              </Select>
                            </FormControl>
                            <FormControl>
                              <FormLabel>Status</FormLabel>
                              <Select
                                value={currentAlgorithm.tokenGeneration.bulkAssignments.status}
                                onChange={(e) => {
                                  setCurrentAlgorithm(prev => ({
                                    ...prev,
                                    tokenGeneration: {
                                      ...prev.tokenGeneration!,
                                      bulkAssignments: {
                                        ...prev.tokenGeneration!.bulkAssignments,
                                        status: e.target.value as 'experimental' | 'stable' | 'deprecated' | ''
                                      }
                                    }
                                  }));
                                }}
                              >
                                <option value="">None</option>
                                <option value="experimental">Experimental</option>
                                <option value="stable">Stable</option>
                                <option value="deprecated">Deprecated</option>
                              </Select>
                            </FormControl>
                            <VStack spacing={3} align="stretch">
                              <Checkbox
                                isChecked={currentAlgorithm.tokenGeneration.bulkAssignments.private}
                                onChange={(e) => {
                                  setCurrentAlgorithm(prev => ({
                                    ...prev,
                                    tokenGeneration: {
                                      ...prev.tokenGeneration!,
                                      bulkAssignments: {
                                        ...prev.tokenGeneration!.bulkAssignments,
                                        private: e.target.checked
                                      }
                                    }
                                  }));
                                }}
                              >
                                Private
                              </Checkbox>
                              <Checkbox
                                isChecked={currentAlgorithm.tokenGeneration.bulkAssignments.themeable}
                                onChange={(e) => {
                                  setCurrentAlgorithm(prev => ({
                                    ...prev,
                                    tokenGeneration: {
                                      ...prev.tokenGeneration!,
                                      bulkAssignments: {
                                        ...prev.tokenGeneration!.bulkAssignments,
                                        themeable: e.target.checked
                                      }
                                    }
                                  }));
                                }}
                              >
                                Themeable
                              </Checkbox>
                            </VStack>
                            <FormControl>
                              <FormLabel>Taxonomies</FormLabel>
                              <VStack spacing={2} align="stretch">
                                <Text fontSize="sm" color="gray.600">
                                  Select taxonomies for logical term assignment. Terms will be automatically mapped based on the logical mapping settings.
                                </Text>
                                <TaxonomyPicker
                                  taxonomies={filteredTaxonomies}
                                  value={selectedTaxonomies}
                                  onChange={handleTaxonomyChange}
                                  disabled={filteredTaxonomies.length === 0}
                                />
                                {filteredTaxonomies.length === 0 && (
                                  <Box p={3} bg={colorMode === 'light' ? 'gray.50' : 'gray.700'} borderRadius="md">
                                    <Text fontSize="sm" color="gray.500">
                                      {(() => {
                                        const allTaxonomies = StorageService.getTaxonomies() as Taxonomy[];
                                        const currentValueTypeId = currentAlgorithm.tokenGeneration?.bulkAssignments?.resolvedValueTypeId;
                                        
                                        if (allTaxonomies.length === 0) {
                                          return "No taxonomies have been created yet. Please create taxonomies in the Classification setup first.";
                                        } else if (currentValueTypeId) {
                                          const supportingTaxonomies = allTaxonomies.filter(taxonomy => 
                                            Array.isArray(taxonomy.resolvedValueTypeIds) && 
                                            taxonomy.resolvedValueTypeIds.includes(currentValueTypeId)
                                          );
                                          
                                          if (supportingTaxonomies.length === 0) {
                                            return `No taxonomies support the "${currentValueTypeId}" value type. Please select a different value type (like "color" or "spacing") or create a taxonomy that supports "${currentValueTypeId}".`;
                                          }
                                        }
                                        
                                        return "No taxonomies available for this value type. Please select a different value type or add taxonomies for this type.";
                                      })()}
                                    </Text>
                                  </Box>
                                )}
                              </VStack>
                            </FormControl>
                          </VStack>
                        </Box>

                        {/* Logical Mapping */}
                        <Box p={4} borderWidth={1} borderRadius="md">
                          <Text fontWeight="bold" mb={3}>Logical Mapping</Text>
                          <VStack spacing={4} align="stretch">
                            <FormControl>
                              <FormLabel>Scale Type</FormLabel>
                              <Select
                                value={currentAlgorithm.tokenGeneration.logicalMapping.scaleType}
                                onChange={(e) => {
                                  setCurrentAlgorithm(prev => ({
                                    ...prev,
                                    tokenGeneration: {
                                      ...prev.tokenGeneration!,
                                      logicalMapping: {
                                        ...prev.tokenGeneration!.logicalMapping,
                                        scaleType: e.target.value as 'numeric' | 'tshirt'
                                      }
                                    }
                                  }));
                                }}
                              >
                                <option value="numeric">Numeric</option>
                                <option value="tshirt">T-Shirt Sizing</option>
                              </Select>
                            </FormControl>
                            <FormControl isRequired={!tokenGenerationConfigured}>
                              <FormLabel>
                                Taxonomy for Scale Terms
                                {!tokenGenerationConfigured && <Text as="span" color="red.500"> *</Text>}
                              </FormLabel>
                              <VStack spacing={3} align="stretch">
                                <Text fontSize="sm" color="gray.600">
                                  Choose an existing taxonomy or create a new one for the scale terms. This is required for token generation.
                                </Text>
                                <Select
                                  value={currentAlgorithm.tokenGeneration.logicalMapping.taxonomyId || ''}
                                  onChange={(e) => {
                                    setCurrentAlgorithm(prev => ({
                                      ...prev,
                                      tokenGeneration: {
                                        ...prev.tokenGeneration!,
                                        logicalMapping: {
                                          ...prev.tokenGeneration!.logicalMapping,
                                          taxonomyId: e.target.value || undefined,
                                          newTaxonomyName: e.target.value ? undefined : prev.tokenGeneration!.logicalMapping.newTaxonomyName
                                        }
                                      }
                                    }));
                                  }}
                                >
                                  <option value="">Create new taxonomy</option>
                                  {filteredTaxonomies.map(taxonomy => (
                                    <option key={taxonomy.id} value={taxonomy.id}>
                                      {taxonomy.name}
                                    </option>
                                  ))}
                                </Select>
                                {!currentAlgorithm.tokenGeneration.logicalMapping.taxonomyId && (
                                  <FormControl isRequired={!tokenGenerationConfigured}>
                                    <FormLabel>
                                      New Taxonomy Name
                                      {!tokenGenerationConfigured && <Text as="span" color="red.500"> *</Text>}
                                    </FormLabel>
                                    <Input
                                      placeholder="Enter taxonomy name (e.g., 'Scale Terms', 'Size Categories')"
                                      value={currentAlgorithm.tokenGeneration.logicalMapping.newTaxonomyName || ''}
                                      onChange={(e) => {
                                        setCurrentAlgorithm(prev => ({
                                          ...prev,
                                          tokenGeneration: {
                                            ...prev.tokenGeneration!,
                                            logicalMapping: {
                                              ...prev.tokenGeneration!.logicalMapping,
                                              newTaxonomyName: e.target.value
                                            }
                                          }
                                        }));
                                      }}
                                    />
                                    <Text fontSize="xs" color="gray.500" mt={1}>
                                      Provide a descriptive name for the new taxonomy that will contain the scale terms.
                                    </Text>
                                  </FormControl>
                                )}
                                {!tokenGenerationConfigured && (
                                  <Box p={3} bg="orange.50" borderRadius="md" borderWidth={1} borderColor="orange.200">
                                    <Text fontSize="sm" color="orange.700" mb={2}>
                                      ⚠️ Please complete the following to enable token generation preview:
                                    </Text>
                                    <VStack spacing={1} align="start">
                                      {!currentAlgorithm.tokenGeneration?.logicalMapping?.taxonomyId && 
                                       !currentAlgorithm.tokenGeneration?.logicalMapping?.newTaxonomyName?.trim() && (
                                        <Text fontSize="xs" color="orange.600">• Configure taxonomy settings above</Text>
                                      )}
                                      {!hasExistingTokens && currentAlgorithm.variables.length === 0 && (
                                        <Text fontSize="xs" color="orange.600">• Add variables in the Variables tab</Text>
                                      )}
                                      {!hasExistingTokens && currentAlgorithm.formulas.length === 0 && (
                                        <Text fontSize="xs" color="orange.600">• Add formulas in the Formulas tab</Text>
                                      )}
                                    </VStack>
                                  </Box>
                                )}
                              </VStack>
                            </FormControl>
                            <FormControl>
                              <FormLabel>Default Value</FormLabel>
                              <Input
                                value={currentAlgorithm.tokenGeneration.logicalMapping.defaultValue}
                                onChange={(e) => {
                                  setCurrentAlgorithm(prev => ({
                                    ...prev,
                                    tokenGeneration: {
                                      ...prev.tokenGeneration!,
                                      logicalMapping: {
                                        ...prev.tokenGeneration!.logicalMapping,
                                        defaultValue: e.target.value
                                      }
                                    }
                                  }));
                                }}
                              />
                            </FormControl>
                            
                            {/* Numeric Scale Type Fields */}
                            {currentAlgorithm.tokenGeneration.logicalMapping.scaleType === 'numeric' && (
                              <>
                                <FormControl>
                                  <FormLabel>Steps (Increasing)</FormLabel>
                                  <Input
                                    type="number"
                                    placeholder="100"
                                    value={currentAlgorithm.tokenGeneration.logicalMapping.increasingStep || ''}
                                    onChange={(e) => {
                                      setCurrentAlgorithm(prev => ({
                                        ...prev,
                                        tokenGeneration: {
                                          ...prev.tokenGeneration!,
                                          logicalMapping: {
                                            ...prev.tokenGeneration!.logicalMapping,
                                            increasingStep: parseInt(e.target.value) || undefined
                                          }
                                        }
                                      }));
                                    }}
                                  />
                                </FormControl>
                                <FormControl>
                                  <FormLabel>Steps (Decreasing)</FormLabel>
                                  <Input
                                    type="number"
                                    placeholder="25"
                                    value={currentAlgorithm.tokenGeneration.logicalMapping.decreasingStep || ''}
                                    onChange={(e) => {
                                      setCurrentAlgorithm(prev => ({
                                        ...prev,
                                        tokenGeneration: {
                                          ...prev.tokenGeneration!,
                                          logicalMapping: {
                                            ...prev.tokenGeneration!.logicalMapping,
                                            decreasingStep: parseInt(e.target.value) || undefined
                                          }
                                        }
                                      }));
                                    }}
                                  />
                                </FormControl>
                              </>
                            )}
                            
                            {/* T-Shirt Scale Type Fields */}
                            {currentAlgorithm.tokenGeneration.logicalMapping.scaleType === 'tshirt' && (
                              <FormControl>
                                <FormLabel>Prefix for Extra Sizes</FormLabel>
                                <Select
                                  value={currentAlgorithm.tokenGeneration.logicalMapping.extraPrefix || 'X'}
                                  onChange={(e) => {
                                    setCurrentAlgorithm(prev => ({
                                      ...prev,
                                      tokenGeneration: {
                                        ...prev.tokenGeneration!,
                                        logicalMapping: {
                                          ...prev.tokenGeneration!.logicalMapping,
                                          extraPrefix: e.target.value
                                        }
                                      }
                                    }));
                                  }}
                                >
                                  <option value="X">X (X-Small, X-Large)</option>
                                  <option value="extra">extra (extra-small, extra-large)</option>
                                </Select>
                              </FormControl>
                            )}
                          </VStack>
                        </Box>
                      </>
                    )}
                  </VStack>
                )}
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
              <VStack spacing={4} align="stretch">
                {/* Algorithm JSON Preview */}
                <Box
                  p={4}
                  bg={colorMode === 'light' ? 'gray.50' : 'gray.800'}
                  borderRadius="md"
                  fontSize="sm"
                  fontFamily="mono"
                  overflowX="auto"
                >
                  <Text fontWeight="bold" mb={2}>Algorithm JSON Preview</Text>
                  <pre style={{ margin: 0 }}>
                    {JSON.stringify(currentAlgorithm, null, 2)}
                  </pre>
                </Box>

                {/* Generated Tokens Preview */}
                {currentAlgorithm.tokenGeneration?.enabled && (
                  <Box
                    p={4}
                    bg={colorMode === 'light' ? 'gray.50' : 'gray.800'}
                    borderRadius="md"
                    fontSize="sm"
                    fontFamily="mono"
                    overflowX="auto"
                  >
                    <Text fontWeight="bold" mb={2}>Generated Tokens Preview</Text>
                    {!tokenGenerationConfigured && (
                      <Box mb={3} p={3} bg="orange.100" borderRadius="md">
                        <Text fontWeight="bold" color="orange.600">Configuration Required</Text>
                        <VStack spacing={1} align="start" mt={2}>
                          {!currentAlgorithm.tokenGeneration?.logicalMapping?.taxonomyId && 
                           !currentAlgorithm.tokenGeneration?.logicalMapping?.newTaxonomyName?.trim() && (
                            <Text color="orange.600" fontSize="xs">• Configure taxonomy settings in the Token Generation tab</Text>
                          )}
                          {!hasExistingTokens && currentAlgorithm.variables.length === 0 && (
                            <Text color="orange.600" fontSize="xs">• Add variables in the Variables tab</Text>
                          )}
                          {!hasExistingTokens && currentAlgorithm.formulas.length === 0 && (
                            <Text color="orange.600" fontSize="xs">• Add formulas in the Formulas tab</Text>
                          )}
                        </VStack>
                      </Box>
                    )}
                    {generationErrors.length > 0 && (
                      <Box mb={3} p={3} bg="red.100" borderRadius="md">
                        <Text fontWeight="bold" color="red.600">Generation Errors:</Text>
                        {generationErrors.map((error, index) => (
                          <Text key={index} color="red.600" fontSize="xs">• {error}</Text>
                        ))}
                      </Box>
                    )}
                    {generatedTokens.length > 0 && (
                      <Box>
                        <Text mb={2} fontSize="sm" color="gray.500">
                          {generatedTokens.length} tokens will be generated:
                        </Text>
                        <VStack spacing={2} align="stretch">
                          {generatedTokens.slice(0, 10).map((token, index) => (
                            <Box key={index} p={2} bg="white" borderRadius="sm" borderWidth={1}>
                              <Text fontSize="xs" fontWeight="bold">{token.id}</Text>
                              <Text fontSize="xs" color="gray.600">{token.displayName}</Text>
                              <Text fontSize="xs" color="gray.500">
                                Value: {token.valuesByMode[0]?.value && 'value' in token.valuesByMode[0].value ? token.valuesByMode[0].value.value : 'N/A'}
                              </Text>
                              {token.valuesByMode[0]?.modeIds && token.valuesByMode[0].modeIds.length > 0 && (
                                <Text fontSize="xs" color="blue.500">
                                  Modes: {token.valuesByMode[0].modeIds.join(', ')}
                                </Text>
                              )}
                            </Box>
                          ))}
                          {generatedTokens.length > 10 && (
                            <Text fontSize="xs" color="gray.500">
                              ... and {generatedTokens.length - 10} more tokens
                            </Text>
                          )}
                        </VStack>
                      </Box>
                    )}
                    {generatedTokens.length === 0 && generationErrors.length === 0 && tokenGenerationConfigured && (
                      <Text fontSize="sm" color="gray.500">
                        No tokens will be generated. Check your algorithm configuration and iteration range settings.
                      </Text>
                    )}
                  </Box>
                )}
              </VStack>
            </TabPanel>

            {/* Dependency Visualization Tab */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <DependencyVisualization
                  algorithm={currentAlgorithm}
                  showValidation={true}
                  showExecutionTrace={false}
                />
                <ExecutionPreview
                  algorithm={currentAlgorithm}
                  onExecutionComplete={(trace) => {
                    console.log('Execution completed:', trace);
                  }}
                />
              </VStack>
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
          {currentAlgorithm.tokenGeneration?.enabled ? 'Save and Run' : 'Save Algorithm'}
        </Button>

        {/* Save Preview Dialog */}
        <AlgorithmSavePreviewDialog
          isOpen={showSavePreview}
          onClose={() => setShowSavePreview(false)}
          onSave={performSave}
          algorithm={currentAlgorithm}
          tokenCalculationStates={tokenCalculationStates}
          existingTokens={existingTokens}
          resolvedValueTypes={resolvedValueTypes}
        />

        {/* Reset Dialog */}
        <AlgorithmResetDialog
          isOpen={showResetDialog}
          onClose={() => setShowResetDialog(false)}
          onReset={handleReset}
          algorithm={currentAlgorithm}
          hasUnsavedChanges={hasUnsavedChanges}
        />

        {/* Mode Selection Dialog */}
        <ModeSelectionDialog
          isOpen={showModeSelectionDialog}
          onClose={() => setShowModeSelectionDialog(false)}
          onConfirm={handleModeSelectionConfirm}
          algorithm={currentAlgorithm}
        />
      </VStack>
    </Box>
  );
}; 
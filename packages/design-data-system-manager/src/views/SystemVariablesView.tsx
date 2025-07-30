import React, { useState, useEffect } from 'react';
import { Box, Text, HStack, VStack, IconButton, Badge, Button, useColorMode, useToast } from '@chakra-ui/react';
import { LuPlus, LuPencil, LuTrash2 } from 'react-icons/lu';
import type { Dimension } from '@token-model/data-model';
import { SystemVariableEditorDialog } from '../components/SystemVariableEditorDialog';
import { SystemVariableService, SystemVariable } from '../services/systemVariableService';

interface SystemVariablesViewProps {
  dimensions: Dimension[];
  canEdit?: boolean;
}

export function SystemVariablesView({ dimensions, canEdit = true }: SystemVariablesViewProps) {
  const { colorMode } = useColorMode();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVariable, setEditingVariable] = useState<SystemVariable | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [systemVariables, setSystemVariables] = useState<SystemVariable[]>([]);
  const toast = useToast();

  // Load system variables from storage on mount
  useEffect(() => {
    const variables = SystemVariableService.getSystemVariables();
    setSystemVariables(variables);
  }, []);

  // Open dialog for creating a new system variable
  const handleOpenCreate = () => {
    setEditingVariable(null);
    setIsNew(true);
    setDialogOpen(true);
  };

  // Open dialog for editing an existing system variable
  const handleOpenEdit = (variable: SystemVariable) => {
    setEditingVariable(variable);
    setIsNew(false);
    setDialogOpen(true);
  };

  // Save handler for dialog
  const handleDialogSave = (variable: SystemVariable) => {
    const success = SystemVariableService.saveSystemVariable(variable);
    
    if (success) {
      // Refresh the list by getting updated data from storage
      const updatedVariables = SystemVariableService.getSystemVariables();
      setSystemVariables(updatedVariables);
      toast({ 
        title: isNew ? 'System variable created' : 'System variable updated', 
        status: 'success', 
        duration: 2000 
      });
    } else {
      toast({
        title: 'Error',
        description: 'Failed to save system variable',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
    
    setDialogOpen(false);
  };

  // Close dialog
  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const handleDeleteVariable = (variableId: string) => {
    const success = SystemVariableService.deleteSystemVariable(variableId);
    
    if (success) {
      // Refresh the list by getting updated data from storage
      const updatedVariables = SystemVariableService.getSystemVariables();
      setSystemVariables(updatedVariables);
      toast({ 
        title: 'System variable deleted', 
        status: 'info', 
        duration: 2000 
      });
    } else {
      toast({
        title: 'Error',
        description: 'Failed to delete system variable',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  // Helper function to get mode name from mode ID
  const getModeName = (modeId: string, dimensionId?: string): string => {
    if (!dimensionId) return modeId;
    const dimension = dimensions.find(d => d.id === dimensionId);
    if (!dimension) return modeId;
    const mode = dimension.modes.find(m => m.id === modeId);
    return mode ? mode.name : modeId;
  };

  return (
    <Box>
      <Text fontSize="2xl" fontWeight="bold" mb={2}>System Variables</Text>
      <Text fontSize="sm" color="gray.600" mb={6}>System variables define global values that can be referenced by algorithms and tokens throughout the design system.</Text>
      <Box p={4} mb={4} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
        {canEdit && (
          <Button size="sm" onClick={handleOpenCreate} colorScheme="blue" mb={4} leftIcon={<LuPlus />}>
            Add System Variable
          </Button>
        )}
        {systemVariables.length === 0 ? (
          <Box textAlign="center" py={8}>
            <Text color="gray.500">
              {canEdit 
                ? "No system variables found. Click 'Add System Variable' to create your first variable."
                : "No system variables found in this repository."
              }
            </Text>
          </Box>
        ) : (
          <VStack align="stretch" spacing={3}>
            {systemVariables.map((variable) => (
              <Box
                key={variable.id}
                p={3}
                borderWidth={1}
                borderRadius="md"
                bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
                borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
              >
                <HStack justify="space-between" align="center">
                  <Box>
                    <Text fontSize="lg" fontWeight="medium">{variable.name}</Text>
                    <Text fontSize="sm" color="gray.600">{variable.description}</Text>
                    <Text fontSize="sm" color="gray.600">
                      Value: {variable.defaultValue} | Type: {variable.type}
                    </Text>
                    {variable.modeBased && (
                      <Text fontSize="sm" color="gray.600">Mode-based variable</Text>
                    )}
                    
                    {/* Display mode-specific values */}
                    {variable.modeBased && variable.valuesByMode && variable.valuesByMode.length > 0 && (
                      <Box mt={2}>
                        <Text fontSize="xs" color="gray.500" mb={1}>Mode Values:</Text>
                        <HStack spacing={2} wrap="wrap">
                          {variable.valuesByMode.map((entry, idx) => (
                            <Badge key={entry.modeIds.join('-') || idx} size="sm" colorScheme="purple" variant="outline">
                              {entry.modeIds.map(modeId => getModeName(modeId, variable.dimensionId)).join(', ')}: {entry.value}
                            </Badge>
                          ))}
                        </HStack>
                      </Box>
                    )}
                  </Box>
                  
                  {canEdit && (
                    <HStack>
                      <IconButton 
                        aria-label="Edit system variable" 
                        icon={<LuPencil />} 
                        size="sm" 
                        onClick={() => handleOpenEdit(variable)} 
                      />
                      <IconButton 
                        aria-label="Delete system variable" 
                        icon={<LuTrash2 />} 
                        size="sm" 
                        colorScheme="red" 
                        onClick={() => handleDeleteVariable(variable.id)} 
                      />
                    </HStack>
                  )}
                </HStack>
              </Box>
            ))}
          </VStack>
        )}
      </Box>
      
      {canEdit && (
        <SystemVariableEditorDialog
          open={dialogOpen}
          onClose={handleDialogClose}
          onSave={handleDialogSave}
          variable={editingVariable}
          isNew={isNew}
          dimensions={dimensions}
        />
      )}
    </Box>
  );
} 
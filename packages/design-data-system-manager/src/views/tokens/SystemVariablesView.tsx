import React, { useState, useEffect } from 'react';
import {
  Box,
  Text,
  Button,
  IconButton,
  VStack,
  HStack,
  useToast,
  useColorMode,
  Center,
  Icon,
  Badge
} from '@chakra-ui/react';
import { LuTrash2, LuPencil, LuPlus, LuSettings } from 'react-icons/lu';
import { SystemVariableEditorDialog } from '../../components/SystemVariableEditorDialog';
import { SystemVariableService, SystemVariable } from '../../services/systemVariableService';
import { StorageService } from '../../services/storage';
import { CardTitle } from '../../components/CardTitle';

export function SystemVariablesView() {
  const { colorMode } = useColorMode();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVariable, setEditingVariable] = useState<SystemVariable | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [systemVariables, setSystemVariables] = useState<SystemVariable[]>([]);
  const toast = useToast();

  // Load system variables from storage
  const loadSystemVariables = () => {
    const variables = SystemVariableService.getSystemVariables();
    setSystemVariables(variables);
  };

  // Load variables on mount and when window gains focus
  useEffect(() => {
    loadSystemVariables();
    
    const handleFocus = () => {
      loadSystemVariables();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
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
      loadSystemVariables(); // Refresh the list
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

  const handleDeleteVariable = (variableName: string) => {
    const success = SystemVariableService.deleteSystemVariable(variableName);
    
    if (success) {
      loadSystemVariables(); // Refresh the list
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
    const dimensions = StorageService.getDimensions();
    const dimension = dimensions.find(d => d.id === dimensionId);
    if (!dimension) return modeId;
    const mode = dimension.modes.find(m => m.id === modeId);
    return mode ? mode.name : modeId;
  };

  return (
    <Box>
      <Text fontSize="2xl" fontWeight="bold" mb={4}>System Variables</Text>
      <Box p={4} mb={4} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
        <Button size="sm" onClick={handleOpenCreate} colorScheme="blue" mb={4} leftIcon={<LuPlus />}>
          Create New System Variable
        </Button>
        
        {systemVariables.length === 0 ? (
          <Center p={8}>
            <VStack spacing={4}>
              <Icon as={LuSettings} boxSize={12} color="gray.400" />
              <VStack spacing={2}>
                <Text fontSize="lg" fontWeight="medium">
                  No system variables found
                </Text>
                <Text color="gray.500" textAlign="center">
                  Get started by adding your first system variable
                </Text>
              </VStack>
              <Box mt={2}>
                <Button size="sm" onClick={handleOpenCreate} colorScheme="blue" leftIcon={<LuPlus />}>
                  Create New System Variable
                </Button>
              </Box>
            </VStack>
          </Center>
        ) : (
          <VStack align="stretch" spacing={2}>
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
                  <Box flex={1}>
                    <HStack spacing={2} mb={1}>
                    <CardTitle title={variable.name} cardType="system-variable" />
                      <Badge colorScheme="blue" size="sm">{variable.type}</Badge>
                      {variable.modeBased && (
                        <Badge colorScheme="green" size="sm">Mode-Based</Badge>
                      )}
                    </HStack>
                    
                    {variable.description && (
                      <Text fontSize="sm" color="gray.600" mb={1}>
                        {variable.description}
                      </Text>
                    )}
                    
                    {variable.defaultValue && !variable.modeBased && (
                      <Text fontSize="sm" color="gray.500">
                        Default: {variable.defaultValue}
                      </Text>
                    )}
                    
                    {/* Display mode-specific values */}
                    {variable.modeBased && variable.modeValues && Object.keys(variable.modeValues).length > 0 && (
                      <Box mt={2}>
                        <Text fontSize="xs" color="gray.500" mb={1}>Mode Values:</Text>
                        <HStack spacing={2} wrap="wrap">
                          {Object.entries(variable.modeValues).map(([modeId, value]) => (
                            <Badge key={modeId} size="sm" colorScheme="purple" variant="outline">
                              {getModeName(modeId, variable.dimensionId)}: {value}
                            </Badge>
                          ))}
                        </HStack>
                      </Box>
                    )}
                  </Box>
                  
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
                      onClick={() => handleDeleteVariable(variable.name)} 
                    />
                  </HStack>
                </HStack>
              </Box>
            ))}
          </VStack>
        )}
      </Box>
      
      <SystemVariableEditorDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        onSave={handleDialogSave}
        variable={editingVariable}
        isNew={isNew}
      />
    </Box>
  );
} 
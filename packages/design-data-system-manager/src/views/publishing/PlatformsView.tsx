import React, { useState } from 'react';
import {
  Box,
  Text,
  VStack,
  HStack,
  IconButton,
  Tooltip,
  Button,
  useColorModeValue,
  useColorMode,
  useToast
} from '@chakra-ui/react';
import { LuTrash2, LuPencil, LuPlus } from 'react-icons/lu';
import { PlatformEditorDialog } from '../../components/PlatformEditorDialog';
import { createUniqueId } from '../../utils/id';
import { CodeSyntaxService } from '../../services/codeSyntax';
import { Platform, Taxonomy } from '@token-model/data-model';
import { ValidationService } from '../../services/validation';
import { ExtendedToken } from '../../components/TokenEditorDialog';
import { StorageService } from '../../services/storage';
import { useToast as useCustomToast } from '../../hooks/useToast';

interface PlatformsViewProps {
  platforms: Platform[];
  setPlatforms: (platforms: Platform[]) => void;
  tokens: ExtendedToken[];
  setTokens: (tokens: ExtendedToken[]) => void;
  taxonomies: Taxonomy[];
}

export const PlatformsView: React.FC<PlatformsViewProps> = ({ 
  platforms: initialPlatforms, 
  setPlatforms,
  tokens,
  setTokens,
  taxonomies
}: PlatformsViewProps) => {
  const { colorMode } = useColorMode();
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const cardBg = useColorModeValue('gray.50', 'gray.800');
  const cardBorder = useColorModeValue('gray.200', 'gray.600');
  const toast = useCustomToast();

  const validateAndSetPlatforms = (updatedPlatforms: Platform[]) => {
    // Get all required data from storage
    const tokenCollections = StorageService.getCollections();
    const dimensions = StorageService.getDimensions();
    const tokens = StorageService.getTokens();
    const taxonomies = StorageService.getTaxonomies();
    const resolvedValueTypes = StorageService.getValueTypes();
    // Optionally, get systemName/systemId/version from root or a config
    const root = JSON.parse(localStorage.getItem('token-model:root') || '{}');
    const {
      systemName = 'Design System',
      systemId = 'design-system',
      version = '1.0.0',
      versionHistory = []
    } = root;

    const data = {
      systemName,
      systemId,
      tokenCollections,
      dimensions,
      tokens,
      platforms: updatedPlatforms,
      taxonomies,
      resolvedValueTypes,
      version,
      versionHistory
    };
    const result = ValidationService.validateData(data);
    if (!result.isValid) {
      toast({
        title: 'Schema Validation Failed',
        description: result.errors?.map(e => e.message).join('\n') || 'Your change would make the data invalid. See the Validation tab for details.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return false;
    }
    setPlatforms(updatedPlatforms);
    return true;
  };

  const handleDeletePlatform = (platformId: string) => {
    const platformToDelete = initialPlatforms.find((p: Platform) => p.id === platformId);
    const updated = initialPlatforms.filter((p: Platform) => p.id !== platformId);
    if (!validateAndSetPlatforms(updated)) return;
    toast({ 
      title: 'Platform Deleted', 
      description: `Successfully deleted platform "${platformToDelete?.displayName}"`,
      status: 'info', 
      duration: 3000,
      isClosable: true 
    });
  };

  const handleEditPlatform = (platform: Platform) => {
    setEditingPlatform(platform);
    setIsDialogOpen(true);
    setIsNew(false);
  };

  const handleAddPlatform = () => {
    setEditingPlatform({
      id: createUniqueId('platform'),
      displayName: '',
      description: '',
      syntaxPatterns: {
        prefix: '',
        suffix: '',
        delimiter: '_',
        capitalization: 'none',
        formatString: ''
      }
    });
    setIsDialogOpen(true);
    setIsNew(true);
  };

  const handleDialogSave = (updatedPlatform: Platform) => {
    let updatedPlatforms;
    if (isNew) {
      const newId = updatedPlatform.displayName.trim().replace(/\s+/g, '_').toLowerCase() || `platform_${Date.now()}`;
      updatedPlatforms = [
        ...initialPlatforms,
        {
          ...updatedPlatform,
          id: newId
        }
      ];
    } else {
      updatedPlatforms = initialPlatforms.map((p: Platform) =>
        p.id === updatedPlatform.id ? updatedPlatform : p
      );
    }
    if (!validateAndSetPlatforms(updatedPlatforms)) {
      return;
    }
    const schema = { platforms: updatedPlatforms, taxonomies };
    const updatedTokens = tokens.map((token: ExtendedToken) => {
      const codeSyntax = updatedPlatforms.map((platform: Platform) => ({
        platformId: platform.id,
        formattedName: CodeSyntaxService.generateCodeSyntax(token, platform.id, schema)
      }));
      return {
        ...token,
        codeSyntax
      };
    });
    setTokens(updatedTokens);
    setIsDialogOpen(false);
    setEditingPlatform(null);
    setIsNew(false);
  };

  return (
    <Box>
      <Text fontSize="2xl" fontWeight="bold" mb={4}>Platforms</Text>
      <Box p={4} mb={4} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
        <Button size="sm" leftIcon={<LuPlus />} onClick={handleAddPlatform} colorScheme="blue" mb={4}>
          Add Platform
        </Button>
        <VStack align="stretch" spacing={3}>
          {initialPlatforms.map((platform: Platform) => {
            const syntax = platform.syntaxPatterns || {};
            return (
              <Box
                key={platform.id}
                p={3}
                borderWidth={1}
                borderRadius="md"
                bg={cardBg}
                borderColor={cardBorder}
              >
                <HStack justify="space-between" align="flex-start">
                  <Box flex={1} minW={0}>
                    <Text fontSize="lg" fontWeight="medium">{platform.displayName}</Text>
                    {platform.description && (
                      <Text fontSize="sm" color="gray.500">{platform.description}</Text>
                    )}
                    <Box mt={2}>
                      <Text fontWeight="bold" fontSize="sm" mb={1}>Syntax Patterns</Text>
                      <HStack spacing={4} wrap="wrap">
                        <Text fontSize="sm"><b>Prefix:</b> {syntax.prefix || <span style={{ color: '#888' }}>none</span>}</Text>
                        <Text fontSize="sm"><b>Suffix:</b> {syntax.suffix || <span style={{ color: '#888' }}>none</span>}</Text>
                        <Text fontSize="sm"><b>Delimiter:</b> {syntax.delimiter || <span style={{ color: '#888' }}>none</span>}</Text>
                        <Text fontSize="sm"><b>Capitalization:</b> {syntax.capitalization || <span style={{ color: '#888' }}>none</span>}</Text>
                        <Text fontSize="sm"><b>Format String:</b> {syntax.formatString || <span style={{ color: '#888' }}>none</span>}</Text>
                      </HStack>
                    </Box>
                  </Box>
                  <HStack spacing={2} align="flex-start">
                    <Tooltip label="Edit Platform">
                      <IconButton
                        aria-label="Edit platform"
                        icon={<LuPencil />}
                        size="sm"
                        onClick={() => handleEditPlatform(platform)}
                      />
                    </Tooltip>
                    <Tooltip label="Delete Platform">
                      <IconButton
                        aria-label="Delete platform"
                        colorScheme="red"
                        size="sm"
                        icon={<LuTrash2 />}
                        onClick={() => handleDeletePlatform(platform.id)}
                      />
                    </Tooltip>
                  </HStack>
                </HStack>
              </Box>
            );
          })}
        </VStack>
      </Box>
      {editingPlatform && (
        <PlatformEditorDialog
          platform={editingPlatform}
          open={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false);
            setEditingPlatform(null);
            setIsNew(false);
          }}
          onSave={handleDialogSave}
          isNew={isNew}
        />
      )}
    </Box>
  );
}; 
import React, { useEffect, useState } from 'react';
import {
  Box,
  Text,
  VStack,
  HStack,
  IconButton,
  Tooltip,
  Button,
  useColorModeValue,
  useColorMode
} from '@chakra-ui/react';
import { DeleteIcon, EditIcon, AddIcon } from '@chakra-ui/icons';
import { StorageService } from '../../services/storage';
import { PlatformEditorDialog } from '../../components/PlatformEditorDialog';
import { createUniqueId } from '../../utils/id';
import { CodeSyntaxService, ensureCodeSyntaxArrayFormat } from '../../services/codeSyntax';

interface Platform {
  id: string;
  displayName: string;
  description?: string;
  syntaxPatterns?: {
    prefix?: string;
    suffix?: string;
    delimiter?: string;
    capitalization?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
    formatString?: string;
  };
  valueFormatters?: {
    color?: 'hex' | 'rgb' | 'rgba' | 'hsl' | 'hsla';
    dimension?: 'px' | 'rem' | 'em' | 'pt' | 'dp' | 'sp';
    numberPrecision?: number;
  };
}

interface PlatformsTabProps {
  onDataChange?: () => void;
}

export const PlatformsTab: React.FC<PlatformsTabProps> = ({ onDataChange }) => {
  const { colorMode } = useColorMode();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const cardBg = useColorModeValue('gray.50', 'gray.800');
  const cardBorder = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    const loaded = StorageService.getPlatforms() || [];
    const normalized = loaded.map((p: Platform) => ({
      ...p,
      syntaxPatterns: {
        prefix: p.syntaxPatterns?.prefix ?? '',
        suffix: p.syntaxPatterns?.suffix ?? '',
        delimiter: p.syntaxPatterns?.delimiter ?? '_',
        capitalization: p.syntaxPatterns?.capitalization ?? 'none',
        formatString: p.syntaxPatterns?.formatString ?? ''
      }
    }));
    setPlatforms(normalized);
    StorageService.setPlatforms(normalized);
  }, []);

  const handleDeletePlatform = (platformId: string) => {
    const updated = platforms.filter((p: Platform) => p.id !== platformId);
    setPlatforms(updated);
    StorageService.setPlatforms(updated);
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
    let isPlatformNew = false;
    if (isNew) {
      const newId = updatedPlatform.displayName.trim().replace(/\s+/g, '_').toLowerCase() || `platform_${Date.now()}`;
      updatedPlatforms = [
        ...platforms,
        {
          ...updatedPlatform,
          id: newId
        }
      ];
      updatedPlatform = { ...updatedPlatform, id: newId };
      isPlatformNew = true;
    } else {
      updatedPlatforms = platforms.map((p: Platform) =>
        p.id === updatedPlatform.id ? updatedPlatform : p
      );
    }
    setPlatforms(updatedPlatforms);
    StorageService.setPlatforms(updatedPlatforms);

    // Update codeSyntax for all tokens in local storage
    const allTokens = StorageService.getTokens();
    const taxonomies = StorageService.getTaxonomies() || [];
    let schema: { platforms: Platform[]; taxonomies: Taxonomy[]; namingRules?: any } = { platforms: updatedPlatforms, taxonomies };
    if (typeof (StorageService as any).getNamingRules === 'function') {
      schema.namingRules = (StorageService as any).getNamingRules();
    }

    const updatedTokens = allTokens.map(token => {
      let codeSyntax = Array.isArray(token.codeSyntax) ? [...token.codeSyntax] : [];
      if (isPlatformNew) {
        // Add new codeSyntax entry for the new platform if missing
        const exists = codeSyntax.some(cs => cs.platformId === updatedPlatform.id);
        if (!exists) {
          codeSyntax.push({
            platformId: updatedPlatform.id,
            formattedName: CodeSyntaxService.generateCodeSyntax(token, updatedPlatform.id, schema)
          });
        }
      } else {
        // Edit: update codeSyntax entry for the edited platform
        codeSyntax = codeSyntax.map(cs =>
          cs.platformId === updatedPlatform.id
            ? {
                platformId: updatedPlatform.id,
                formattedName: CodeSyntaxService.generateCodeSyntax(token, updatedPlatform.id, schema)
              }
            : cs
        );
      }
      return {
        ...token,
        codeSyntax
      };
    });
    StorageService.setTokens(updatedTokens);

    if (onDataChange) onDataChange();
    setIsDialogOpen(false);
    setEditingPlatform(null);
    setIsNew(false);
  };

  return (
    <Box>
      <Text fontSize="2xl" fontWeight="bold" mb={4}>Platforms</Text>
      <Box p={4} mb={4} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
        <Button size="sm" leftIcon={<AddIcon />} onClick={handleAddPlatform} colorScheme="blue" mb={4}>
          Add Platform
        </Button>
        <VStack align="stretch" spacing={3}>
          {platforms.map((platform: Platform) => {
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
                        icon={<EditIcon />}
                        size="sm"
                        onClick={() => handleEditPlatform(platform)}
                      />
                    </Tooltip>
                    <Tooltip label="Delete Platform">
                      <IconButton
                        aria-label="Delete platform"
                        colorScheme="red"
                        size="sm"
                        icon={<DeleteIcon />}
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
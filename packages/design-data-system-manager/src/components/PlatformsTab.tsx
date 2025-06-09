import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Text,
  IconButton,
  Tooltip,
  HStack
} from '@chakra-ui/react';
import { useColorMode } from '../components/ui/color-mode';
import { LuPencil, LuTrash2 } from 'react-icons/lu';
import { StorageService } from '../services/storage';
import { CodeSyntaxService } from '../services/codeSyntax';
import type { Platform } from '@token-model/data-model';
import { PlatformEditorDialog } from './PlatformEditorDialog';

export function PlatformsView() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { colorMode } = useColorMode();

  useEffect(() => {
    loadPlatforms();
  }, []);

  const loadPlatforms = () => {
    const storedPlatforms = StorageService.getPlatforms();
    setPlatforms(storedPlatforms);
  };

  const handleEdit = (platform: Platform) => {
    setEditingPlatform(platform);
    setIsDialogOpen(true);
  };

  const handleDelete = (platformId: string) => {
    const updatedPlatforms = platforms.filter((p: Platform) => p.id !== platformId);
    StorageService.setPlatforms(updatedPlatforms);
    setPlatforms(updatedPlatforms);
    applyNamingRulesToAllTokens(updatedPlatforms);
  };

  const handleSave = (updatedPlatform: Platform) => {
    const updatedPlatforms = platforms.map((p: Platform) => 
      p.id === updatedPlatform.id ? updatedPlatform : p
    );
    StorageService.setPlatforms(updatedPlatforms);
    setPlatforms(updatedPlatforms);
    applyNamingRulesToAllTokens(updatedPlatforms);
  };

  const handleCreate = () => {
    const newPlatform: Platform = {
      id: `platform_${Date.now()}`,
      displayName: 'New Platform',
      description: '',
      syntaxPatterns: {
        prefix: '',
        suffix: '',
        delimiter: '_',
        capitalization: 'none',
        formatString: ''
      }
    };
    setEditingPlatform(newPlatform);
    setIsDialogOpen(true);
  };

  const applyNamingRulesToAllTokens = (updatedPlatforms: Platform[]) => {
    const tokens = StorageService.getTokens();
    const taxonomies = StorageService.getTaxonomies();
    const schema = {
      platforms: updatedPlatforms,
      taxonomies: taxonomies
    };
    const updatedTokens = tokens.map(token => {
      const updatedCodeSyntax = CodeSyntaxService.generateAllCodeSyntaxes(token, schema);
      return {
        ...token,
        codeSyntax: updatedCodeSyntax
      };
    });
    StorageService.setTokens(updatedTokens);
  };

  return (
    <Box>
      <Box mb={4}>
        <Button colorScheme="blue" onClick={handleCreate}>
          Create Platform
        </Button>
      </Box>

      <Box overflowX="auto">
        <Box as="table" width="100%" borderCollapse="collapse">
          <Box as="thead" bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}>
            <Box as="tr">
              <Box as="th" p={4} textAlign="left" borderBottom="1px" borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'}>Name</Box>
              <Box as="th" p={4} textAlign="left" borderBottom="1px" borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'}>Description</Box>
              <Box as="th" p={4} textAlign="left" borderBottom="1px" borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'}>Syntax Patterns</Box>
              <Box as="th" p={4} textAlign="left" borderBottom="1px" borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'}>Actions</Box>
            </Box>
          </Box>
          <Box as="tbody">
            {platforms.map((platform: Platform) => (
              <Box as="tr" key={platform.id} _hover={{ bg: colorMode === 'dark' ? 'gray.800' : 'gray.50' }}>
                <Box as="td" p={4} borderBottom="1px" borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'}>
                  <Text fontWeight="bold">{platform.displayName}</Text>
                  <Text fontSize="xs" color="gray.500" fontFamily="mono">
                    {platform.id}
                  </Text>
                </Box>
                <Box as="td" p={4} borderBottom="1px" borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'}>{platform.description || '-'}</Box>
                <Box as="td" p={4} borderBottom="1px" borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'}>
                  <Box
                    p={2}
                    borderRadius="md"
                    bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
                    borderWidth={1}
                    borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                  >
                    <Text fontSize="sm">
                      <strong>Prefix:</strong> {platform.syntaxPatterns?.prefix || '-'}
                    </Text>
                    <Text fontSize="sm">
                      <strong>Suffix:</strong> {platform.syntaxPatterns?.suffix || '-'}
                    </Text>
                    <Text fontSize="sm">
                      <strong>Delimiter:</strong> {platform.syntaxPatterns?.delimiter || '-'}
                    </Text>
                    <Text fontSize="sm">
                      <strong>Capitalization:</strong> {platform.syntaxPatterns?.capitalization || 'none'}
                    </Text>
                    <Text fontSize="sm">
                      <strong>Format:</strong> {platform.syntaxPatterns?.formatString || '-'}
                    </Text>
                  </Box>
                </Box>
                <Box as="td" p={4} borderBottom="1px" borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'}>
                  <HStack gap={2}>
                    <Tooltip.Root>
                      <Tooltip.Trigger>
                        <IconButton
                          aria-label="Edit platform"
                          size="sm"
                          onClick={() => handleEdit(platform)}
                          asChild
                        >
                          <LuPencil />
                        </IconButton>
                      </Tooltip.Trigger>
                      <Tooltip.Positioner>
                        <Tooltip.Content>Edit Platform</Tooltip.Content>
                      </Tooltip.Positioner>
                    </Tooltip.Root>
                    <Tooltip.Root>
                      <Tooltip.Trigger>
                        <IconButton
                          aria-label="Delete platform"
                          size="sm"
                          colorScheme="red"
                          onClick={() => handleDelete(platform.id)}
                          asChild
                        >
                          <LuTrash2 />
                        </IconButton>
                      </Tooltip.Trigger>
                      <Tooltip.Positioner>
                        <Tooltip.Content>Delete Platform</Tooltip.Content>
                      </Tooltip.Positioner>
                    </Tooltip.Root>
                  </HStack>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {editingPlatform && (
        <PlatformEditorDialog
          platform={editingPlatform}
          open={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false);
            setEditingPlatform(null);
          }}
          onSave={handleSave}
          isNew={!platforms.some((p: Platform) => p.id === editingPlatform.id)}
        />
      )}
    </Box>
  );
} 
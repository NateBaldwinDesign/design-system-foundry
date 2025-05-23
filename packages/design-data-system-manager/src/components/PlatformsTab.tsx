import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  useColorMode,
  IconButton,
  Tooltip,
  HStack
} from '@chakra-ui/react';
import { EditIcon, DeleteIcon } from '@chakra-ui/icons';
import { StorageService } from '../services/storage';
import { CodeSyntaxService } from '../services/codeSyntax';
import type { Platform, Taxonomy } from '@token-model/data-model';
import { PlatformEditorDialog } from './PlatformEditorDialog';

export function PlatformsTab() {
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

      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Name</Th>
            <Th>Description</Th>
            <Th>Syntax Patterns</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {platforms.map((platform: Platform) => (
            <Tr key={platform.id}>
              <Td>
                <Text fontWeight="bold">{platform.displayName}</Text>
                <Text fontSize="xs" color="gray.500" fontFamily="mono">
                  {platform.id}
                </Text>
              </Td>
              <Td>{platform.description || '-'}</Td>
              <Td>
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
              </Td>
              <Td>
                <HStack spacing={2}>
                  <Tooltip label="Edit Platform">
                    <IconButton
                      aria-label="Edit platform"
                      icon={<EditIcon />}
                      size="sm"
                      onClick={() => handleEdit(platform)}
                    />
                  </Tooltip>
                  <Tooltip label="Delete Platform">
                    <IconButton
                      aria-label="Delete platform"
                      icon={<DeleteIcon />}
                      size="sm"
                      colorScheme="red"
                      onClick={() => handleDelete(platform.id)}
                    />
                  </Tooltip>
                </HStack>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

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
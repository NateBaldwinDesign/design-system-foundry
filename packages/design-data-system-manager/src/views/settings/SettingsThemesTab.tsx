import React, { useState, useEffect } from 'react';
import {
  Box,
  Text,
  Button,
  IconButton,
  Select,
  FormControl,
  FormLabel,
  Tag,
  VStack,
  useToast,
  Input,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  TableContainer,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td
} from '@chakra-ui/react';
import { EditIcon, AddIcon } from '@chakra-ui/icons';
import { StorageService } from '../../services/storage';

interface Theme {
  id: string;
  displayName: string;
  description?: string;
  isDefault?: boolean;
}

interface SettingsThemesTabProps {
  themes: Theme[];
  setThemes: (themes: Theme[]) => void;
}

export function SettingsThemesTab({ themes, setThemes }: SettingsThemesTabProps) {
  const [editTheme, setEditTheme] = useState<Theme | null>(null);
  const [editThemeFields, setEditThemeFields] = useState<Theme | null>(null);
  const [themeList, setThemeList] = useState<Theme[]>(themes);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTheme, setNewTheme] = useState<Theme>({ id: '', displayName: '', description: '', isDefault: false });
  const toast = useToast();

  useEffect(() => {
    setThemeList(themes);
  }, [themes]);

  const handleCreateTheme = () => {
    if (!newTheme.displayName.trim()) return;
    const id = newTheme.displayName.trim().replace(/\s+/g, '_').toLowerCase();
    if (themeList.some(t => t.id === id)) return;
    const theme: Theme = { ...newTheme, id };
    const updatedThemes = [...themeList, theme];
    setThemeList(updatedThemes);
    setThemes(updatedThemes);
    StorageService.setThemes(updatedThemes);
    setNewTheme({ id: '', displayName: '', description: '', isDefault: false });
    setCreateDialogOpen(false);
    toast({ title: 'Theme created', status: 'success', duration: 2000 });
  };

  return (
    <Box p={3} bg="chakra-body-bg" borderRadius="md" boxShadow="md">
      <Text fontSize="xl" fontWeight="bold" mb={4}>
        Themes
      </Text>
      <Box mb={2} display="flex" gap={2}>
        <Button colorScheme="blue" size="sm" leftIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
          Add Theme
        </Button>
      </Box>
      {/* Default Theme Picker */}
      <Box mb={2} maxW={"400px"}>
        <FormControl>
          <FormLabel>Default Theme</FormLabel>
          <Select
            value={themeList.find(t => t.isDefault)?.id || ''}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              const selectedId = e.target.value;
              const updatedThemes = themeList.map(t => ({ ...t, isDefault: t.id === selectedId }));
              setThemeList(updatedThemes);
              setThemes(updatedThemes);
              StorageService.setThemes(updatedThemes);
            }}
          >
            {themeList.map(theme => (
              <option key={theme.id} value={theme.id}>{theme.displayName}</option>
            ))}
          </Select>
        </FormControl>
      </Box>
      <TableContainer>
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>ID</Th>
              <Th>Display Name</Th>
              <Th>Description</Th>
              <Th>Default</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {themeList.map(theme => (
              <Tr key={theme.id}>
                <Td>{theme.id}</Td>
                <Td>{theme.displayName}</Td>
                <Td>{theme.description || ''}</Td>
                <Td>
                  {theme.isDefault ? (
                    <Tag colorScheme="green" size="sm">Default</Tag>
                  ) : ''}
                </Td>
                <Td>
                  <IconButton
                    aria-label="Edit theme"
                    icon={<EditIcon />}
                    size="sm"
                    onClick={() => { setEditTheme(theme); setEditThemeFields({ ...theme }); }}
                  />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
      {/* Create Theme Modal */}
      <Modal isOpen={createDialogOpen} onClose={() => setCreateDialogOpen(false)}>
        <ModalOverlay />
        <ModalContent minW="400px">
          <ModalHeader>Add Theme</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired>
                <FormLabel>Display Name</FormLabel>
                <Input
                  value={newTheme.displayName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTheme({ ...newTheme, displayName: e.target.value })}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Input
                  value={newTheme.description}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTheme({ ...newTheme, description: e.target.value })}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleCreateTheme}>
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      {/* Edit Theme Modal */}
      <Modal isOpen={!!editTheme} onClose={() => setEditTheme(null)}>
        <ModalOverlay />
        <ModalContent minW="400px">
          <ModalHeader>Edit Theme</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Display Name</FormLabel>
                <Input
                  value={editThemeFields?.displayName || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditThemeFields(editThemeFields ? { ...editThemeFields, displayName: e.target.value } : null)}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Input
                  value={editThemeFields?.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditThemeFields(editThemeFields ? { ...editThemeFields, description: e.target.value } : null)}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setEditTheme(null)}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={() => {
                const updatedThemes = themeList.map(t =>
                  t.id === (editTheme?.id || '') ? { ...t, ...editThemeFields } : t
                );
                setThemeList(updatedThemes);
                setThemes(updatedThemes);
                StorageService.setThemes(updatedThemes);
                setEditTheme(null);
                toast({ title: 'Theme updated', status: 'success', duration: 2000 });
              }}
            >
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
} 
import React, { useState } from 'react';
import {
  Box,
  Text,
  Tag,
  TagLabel,
  HStack,
  VStack,
  IconButton,
  Table,
  Tbody,
  Td,
  Th,
  Tr,
  Thead,
  Input,
  Button,
  Alert,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  FormControl,
  FormLabel,
  TableContainer
} from '@chakra-ui/react';
import { EditIcon, DeleteIcon, AddIcon } from '@chakra-ui/icons';
import type { Taxonomy, TaxonomyTerm } from '@token-model/data-model';
import { generateId, ID_PREFIXES } from '../../utils/id';
import { cleanupTokenTaxonomyReferences } from '../../utils/taxonomy';

interface SettingsTaxonomiesTabProps {
  taxonomies: Taxonomy[];
  setTaxonomies: (taxonomies: Taxonomy[]) => void;
}

export function SettingsTaxonomiesTab({ taxonomies, setTaxonomies }: SettingsTaxonomiesTabProps) {
  const [editTaxonomy, setEditTaxonomy] = useState<Taxonomy | null>(null);
  const [editFields, setEditFields] = useState<Taxonomy | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTaxonomy, setNewTaxonomy] = useState<Taxonomy>({
    id: '',
    name: '',
    description: '',
    terms: []
  });
  const [deleteTermDialog, setDeleteTermDialog] = useState<{
    open: boolean;
    taxonomyId: string;
    termId: string;
    termName: string;
    usageCount: number;
  }>({
    open: false,
    taxonomyId: '',
    termId: '',
    termName: '',
    usageCount: 0
  });
  const { onClose } = useDisclosure();

  const confirmDeleteTerm = () => {
    const { taxonomyId, termId } = deleteTermDialog;
    const taxonomy = taxonomies.find(t => t.id === taxonomyId);
    if (!taxonomy) return;

    const updatedTaxonomy = {
      ...taxonomy,
      terms: taxonomy.terms.filter((t: TaxonomyTerm) => t.id !== termId)
    };

    setTaxonomies(taxonomies.map(t => t.id === taxonomyId ? updatedTaxonomy : t));
    setDeleteTermDialog({ ...deleteTermDialog, open: false });
    onClose();

    // Clean up invalid taxonomy/term references from all tokens
    cleanupTokenTaxonomyReferences(taxonomies);
  };

  const handleCreateTaxonomy = () => {
    if (!newTaxonomy.name.trim()) return;
    const id = generateId(ID_PREFIXES.TOKEN_COLLECTION); // fallback to TOKEN_COLLECTION for unique id
    setTaxonomies([
      ...taxonomies,
      { ...newTaxonomy, id }
    ]);
    setNewTaxonomy({ id: '', name: '', description: '', terms: [] });
    setCreateDialogOpen(false);
  };

  return (
    <Box p={3} bg="chakra-body-bg" borderRadius="md" boxShadow="md">
      <Text fontSize="xl" fontWeight="bold" mb={4}>Taxonomies</Text>
      <Box mb={2} display="flex" gap={2}>
        <Button colorScheme="blue" size="sm" leftIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
          Add Taxonomy
        </Button>
      </Box>
      <TableContainer>
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>ID</Th>
              <Th>Name</Th>
              <Th>Description</Th>
              <Th>Terms</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {taxonomies.map((taxonomy: Taxonomy) => (
              <Tr key={taxonomy.id}>
                <Td>{taxonomy.id}</Td>
                <Td>{taxonomy.name}</Td>
                <Td>{taxonomy.description}</Td>
                <Td>
                  <HStack wrap="wrap" spacing={1}>
                    {taxonomy.terms.map((term: TaxonomyTerm) => (
                      <Tag key={term.id} size="sm" colorScheme="blue" title={term.description || ''}>
                        <TagLabel>{term.name}</TagLabel>
                      </Tag>
                    ))}
                  </HStack>
                </Td>
                <Td>
                  <IconButton aria-label="Edit" icon={<EditIcon />} size="sm" onClick={() => { setEditTaxonomy(taxonomy); setEditFields({ ...taxonomy, terms: taxonomy.terms.map(term => ({ ...term })) }); }} />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>

      {/* Create Taxonomy Modal */}
      <Modal isOpen={createDialogOpen} onClose={() => setCreateDialogOpen(false)} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Taxonomy</ModalHeader>
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <FormControl isRequired>
                <FormLabel>Name</FormLabel>
                <Input
                  value={newTaxonomy.name}
                  onChange={e => setNewTaxonomy({ ...newTaxonomy, name: e.target.value })}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Input
                  value={newTaxonomy.description}
                  onChange={e => setNewTaxonomy({ ...newTaxonomy, description: e.target.value })}
                />
              </FormControl>
              <Box>
                <Text fontWeight="semibold" mb={2}>Terms</Text>
                <VStack align="stretch" spacing={2}>
                  {newTaxonomy.terms.map((term: TaxonomyTerm, idx: number) => (
                    <HStack key={term.id} spacing={2} align="center">
                      <Input
                        placeholder="Term Name"
                        value={term.name}
                        onChange={e => {
                          const newTerms = [...newTaxonomy.terms];
                          newTerms[idx] = { ...term, name: e.target.value };
                          setNewTaxonomy({ ...newTaxonomy, terms: newTerms });
                        }}
                        size="sm"
                      />
                      <Input
                        placeholder="Description"
                        value={term.description || ''}
                        onChange={e => {
                          const newTerms = [...newTaxonomy.terms];
                          newTerms[idx] = { ...term, description: e.target.value };
                          setNewTaxonomy({ ...newTaxonomy, terms: newTerms });
                        }}
                        size="sm"
                      />
                      <IconButton
                        aria-label="Delete term"
                        icon={<DeleteIcon />}
                        size="sm"
                        colorScheme="red"
                        onClick={() => {
                          setNewTaxonomy({
                            ...newTaxonomy,
                            terms: newTaxonomy.terms.filter((_, i) => i !== idx)
                          });
                        }}
                      />
                    </HStack>
                  ))}
                  <Button
                    leftIcon={<AddIcon />}
                    size="sm"
                    mt={2}
                    onClick={() => {
                      const newTerm: TaxonomyTerm = {
                        id: generateId(ID_PREFIXES.TAXONOMY_TERM),
                        name: '',
                        description: ''
                      };
                      setNewTaxonomy({
                        ...newTaxonomy,
                        terms: [...newTaxonomy.terms, newTerm]
                      });
                    }}
                  >
                    Add Term
                  </Button>
                </VStack>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleCreateTaxonomy}>
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Taxonomy Modal */}
      <Modal isOpen={!!editTaxonomy} onClose={() => setEditTaxonomy(null)} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Taxonomy</ModalHeader>
          <ModalBody>
            {editFields && (
              <VStack align="stretch" spacing={4}>
                <FormControl>
                  <FormLabel>Name</FormLabel>
                  <Input
                    value={editFields.name}
                    onChange={e => setEditFields({ ...editFields, name: e.target.value })}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Description</FormLabel>
                  <Input
                    value={editFields.description}
                    onChange={e => setEditFields({ ...editFields, description: e.target.value })}
                  />
                </FormControl>
                <Box>
                  <Text fontWeight="semibold" mb={2}>Terms</Text>
                  <VStack align="stretch" spacing={2}>
                    {editFields.terms.map((term: TaxonomyTerm, idx: number) => (
                      <HStack key={term.id} spacing={2} align="center">
                        <Input
                          placeholder="Term Name"
                          value={term.name}
                          onChange={e => {
                            const newTerms = [...editFields.terms];
                            newTerms[idx] = { ...term, name: e.target.value };
                            setEditFields({ ...editFields, terms: newTerms });
                          }}
                          size="sm"
                        />
                        <Input
                          placeholder="Description"
                          value={term.description || ''}
                          onChange={e => {
                            const newTerms = [...editFields.terms];
                            newTerms[idx] = { ...term, description: e.target.value };
                            setEditFields({ ...editFields, terms: newTerms });
                          }}
                          size="sm"
                        />
                        <IconButton
                          aria-label="Delete term"
                          icon={<DeleteIcon />}
                          size="sm"
                          colorScheme="red"
                          onClick={() => {
                            setEditFields({
                              ...editFields,
                              terms: editFields.terms.filter((_, i) => i !== idx)
                            });
                          }}
                        />
                      </HStack>
                    ))}
                    <Button
                      leftIcon={<AddIcon />}
                      size="sm"
                      mt={2}
                      onClick={() => {
                        if (!editFields) return;
                        const newTerm: TaxonomyTerm = {
                          id: generateId(ID_PREFIXES.TAXONOMY_TERM),
                          name: '',
                          description: ''
                        };
                        setEditFields({
                          ...editFields,
                          terms: [...editFields.terms, newTerm]
                        });
                      }}
                    >
                      Add Term
                    </Button>
                  </VStack>
                </Box>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setEditTaxonomy(null)}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={() => {
              if (editFields) {
                setTaxonomies(taxonomies.map(t => t.id === editFields.id ? editFields : t));
                setEditTaxonomy(null);
              }
            }}>
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Term Confirmation Modal */}
      <Modal isOpen={deleteTermDialog.open} onClose={() => setDeleteTermDialog({ ...deleteTermDialog, open: false })}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete Term</ModalHeader>
          <ModalBody>
            <Text>Are you sure you want to delete the term &apos;{deleteTermDialog.termName}&apos;?</Text>
            {deleteTermDialog.usageCount > 0 && (
              <Alert status="warning" mt={2}>
                This term is used in {deleteTermDialog.usageCount} token(s) and will be removed from those tokens.
              </Alert>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setDeleteTermDialog({ ...deleteTermDialog, open: false })}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={confirmDeleteTerm}>
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
} 
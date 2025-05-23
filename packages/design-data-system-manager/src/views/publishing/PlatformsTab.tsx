import React from 'react';
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Input,
  Select,
  FormControl,
  IconButton,
  Button,
  useColorModeValue,
  Text,
  HStack
} from '@chakra-ui/react';
import { DeleteIcon, AddIcon } from '@chakra-ui/icons';
import { useSchema } from '../../hooks/useSchema';

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
}

export const PlatformsTab: React.FC = () => {
  const { schema, updateSchema } = useSchema();
  const [newPlatformName, setNewPlatformName] = React.useState('');
  const bg = useColorModeValue('white', 'gray.800');

  const handleUpdatePlatform = (
    platformId: string,
    field: keyof NonNullable<Platform['syntaxPatterns']>,
    value: string
  ) => {
    updateSchema({
      ...schema,
      platforms: (schema.platforms || []).map((p: Platform) =>
        p.id === platformId
          ? {
              ...p,
              syntaxPatterns: {
                ...p.syntaxPatterns,
                [field]: value
              }
            }
          : p
      )
    });
  };

  const handleAddPlatform = () => {
    if (!newPlatformName.trim()) return;
    const newId = newPlatformName.trim().replace(/\s+/g, '_').toLowerCase();
    if (schema.platforms?.some((p: Platform) => p.id === newId)) return;
    const newPlatform: Platform = {
      id: newId,
      displayName: newPlatformName.trim(),
      syntaxPatterns: {
        prefix: '',
        suffix: '',
        delimiter: '_',
        capitalization: 'none',
        formatString: ''
      }
    };
    updateSchema({
      ...schema,
      platforms: [...(schema.platforms || []), newPlatform],
    });
    setNewPlatformName('');
  };

  const handleDeletePlatform = (platformId: string) => {
    updateSchema({
      ...schema,
      platforms: (schema.platforms || []).filter((p: Platform) => p.id !== platformId),
    });
  };

  const handleEditPlatformName = (platformId: string, newName: string) => {
    updateSchema({
      ...schema,
      platforms: (schema.platforms || []).map((p: Platform) =>
        p.id === platformId ? { ...p, displayName: newName } : p
      ),
    });
  };

  return (
    <Box>
      <Text fontSize="2xl" fontWeight="bold" mb={4}>Platforms</Text>
      <Box p={4} mb={4} borderWidth={1} borderRadius="md" bg={bg}>
        <HStack mb={4} spacing={2}>
          <Input
            size="sm"
            placeholder="New Platform Name"
            value={newPlatformName}
            onChange={e => setNewPlatformName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddPlatform(); }}
            maxW="250px"
          />
          <Button colorScheme="blue" size="sm" onClick={handleAddPlatform} leftIcon={<AddIcon boxSize={4} />}>
            Add Platform
          </Button>
        </HStack>
        <TableContainer>
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Platform Name</Th>
                <Th>Prefix</Th>
                <Th>Suffix</Th>
                <Th>Delimiter</Th>
                <Th>Capitalization</Th>
                <Th>Format String</Th>
                <Th>Preview</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {(schema.platforms || []).map((platform: Platform) => {
                const syntax = platform.syntaxPatterns || {};
                return (
                  <Tr key={platform.id}>
                    <Td>
                      <Input
                        size="sm"
                        value={platform.displayName}
                        onChange={e => handleEditPlatformName(platform.id, e.target.value)}
                      />
                    </Td>
                    <Td>
                      <Input
                        size="sm"
                        value={syntax.prefix ?? ''}
                        onChange={e => handleUpdatePlatform(platform.id, 'prefix', e.target.value)}
                        placeholder="e.g., TKN_"
                      />
                    </Td>
                    <Td>
                      <Input
                        size="sm"
                        value={syntax.suffix ?? ''}
                        onChange={e => handleUpdatePlatform(platform.id, 'suffix', e.target.value)}
                        placeholder="e.g., _SUF"
                      />
                    </Td>
                    <Td>
                      <FormControl size="sm">
                        <Select
                          size="sm"
                          value={syntax.delimiter ?? ''}
                          onChange={e => handleUpdatePlatform(platform.id, 'delimiter', e.target.value)}
                        >
                          <option value="">None (no delimiter)</option>
                          <option value="_">Underscore (_)</option>
                          <option value="-">Hyphen (-)</option>
                          <option value=".">Dot (.)</option>
                          <option value="/">Forward slash (/)</option>
                        </Select>
                      </FormControl>
                    </Td>
                    <Td>
                      <FormControl size="sm">
                        <Select
                          size="sm"
                          value={syntax.capitalization ?? 'none'}
                          onChange={e => handleUpdatePlatform(platform.id, 'capitalization', e.target.value)}
                        >
                          <option value="none">None</option>
                          <option value="uppercase">UPPERCASE</option>
                          <option value="lowercase">lowercase</option>
                          <option value="capitalize">Capitalize</option>
                        </Select>
                      </FormControl>
                    </Td>
                    <Td>
                      <Input
                        size="sm"
                        value={syntax.formatString ?? ''}
                        onChange={e => handleUpdatePlatform(platform.id, 'formatString', e.target.value)}
                        placeholder="e.g., {prefix}{name}{suffix}"
                      />
                    </Td>
                    <Td>
                      {(() => {
                        // Example token name parts
                        const exampleParts = ['primary', 'color', 'background'];
                        let name = exampleParts.join(syntax.delimiter ?? '_');
                        // Format prefix and suffix with delimiter and capitalization
                        let prefix = syntax.prefix ?? '';
                        let suffix = syntax.suffix ?? '';
                        if (prefix && syntax.delimiter) prefix = prefix.split(/\s+/).join(syntax.delimiter);
                        if (suffix && syntax.delimiter) suffix = suffix.split(/\s+/).join(syntax.delimiter);
                        switch (syntax.capitalization) {
                          case 'uppercase':
                            name = name.toUpperCase();
                            prefix = prefix.toUpperCase();
                            suffix = suffix.toUpperCase();
                            break;
                          case 'lowercase':
                            name = name.toLowerCase();
                            prefix = prefix.toLowerCase();
                            suffix = suffix.toLowerCase();
                            break;
                          case 'capitalize':
                            name = name.replace(/\b\w/g, c => c.toUpperCase());
                            prefix = prefix.replace(/\b\w/g, c => c.toUpperCase());
                            suffix = suffix.replace(/\b\w/g, c => c.toUpperCase());
                            break;
                          default:
                            break;
                        }
                        let preview = `${prefix}${name}${suffix}`;
                        if (syntax.formatString) {
                          preview = syntax.formatString
                            .replace('{prefix}', prefix)
                            .replace('{name}', name)
                            .replace('{suffix}', suffix);
                        }
                        return preview;
                      })()}
                    </Td>
                    <Td>
                      <IconButton
                        aria-label="Delete platform"
                        colorScheme="red"
                        size="sm"
                        icon={<DeleteIcon />}
                        onClick={() => handleDeletePlatform(platform.id)}
                      />
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
}; 
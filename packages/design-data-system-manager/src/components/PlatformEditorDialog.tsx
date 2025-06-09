import React, { useState } from 'react';
import {
  Dialog,
  Button,
  Input,
  Field,
  Select,
  Stack,
  createListCollection
} from '@chakra-ui/react';
import { useTheme } from 'next-themes';
import type { Platform } from '@token-model/data-model';

type CapitalizationType = 'none' | 'uppercase' | 'lowercase' | 'capitalize';

interface PlatformEditorDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (platform: Platform) => void;
  platform?: Platform;
  isNew?: boolean;
}

export function PlatformEditorDialog({ open, onClose, onSave, platform, isNew = false }: PlatformEditorDialogProps) {
  const { resolvedTheme } = useTheme();
  const [editedPlatform, setEditedPlatform] = useState(() => ({
    id: platform?.id || '',
    displayName: platform?.displayName || '',
    description: platform?.description || '',
    syntaxPatterns: platform?.syntaxPatterns || {
      capitalization: 'none'
    }
  }));

  const handleChange = (field: keyof typeof editedPlatform, value: string) => {
    setEditedPlatform(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCodeSyntaxChange = (field: keyof typeof editedPlatform.syntaxPatterns, value: string) => {
    setEditedPlatform(prev => ({
      ...prev,
      syntaxPatterns: {
        ...prev.syntaxPatterns,
        [field]: value
      }
    }));
  };

  const handleSave = () => {
    onSave(editedPlatform);
  };

  const capitalizationOptions = [
    { value: 'none', label: 'None' },
    { value: 'uppercase', label: 'Uppercase' },
    { value: 'lowercase', label: 'Lowercase' },
    { value: 'capitalize', label: 'Capitalize' }
  ];

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content bg={resolvedTheme === 'dark' ? 'gray.900' : 'white'}>
          <Dialog.Header>
            <Dialog.Title>{isNew ? 'Create Platform' : 'Edit Platform'}</Dialog.Title>
            <Dialog.CloseTrigger />
          </Dialog.Header>
          <Dialog.Body>
            <Stack gap={4} align="stretch">
              <Field.Root required>
                <Field.Label>Display Name</Field.Label>
                <Field.RequiredIndicator />
                <Input
                  value={editedPlatform.displayName}
                  onChange={e => handleChange('displayName', e.target.value)}
                />
              </Field.Root>
              <Field.Root>
                <Field.Label>Description</Field.Label>
                <Input
                  value={editedPlatform.description || ''}
                  onChange={e => handleChange('description', e.target.value)}
                />
              </Field.Root>
              <Field.Root>
                <Field.Label>Capitalization</Field.Label>
                <Select.Root
                  value={[editedPlatform.syntaxPatterns?.capitalization || 'none']}
                  onValueChange={(details) => {
                    const value = Array.isArray(details.value) ? details.value[0] : details.value;
                    handleCodeSyntaxChange('capitalization', value as CapitalizationType);
                  }}
                  collection={createListCollection({
                    items: capitalizationOptions
                  })}
                >
                  <Select.HiddenSelect />
                  <Select.Control>
                    <Select.Trigger>
                      <Select.ValueText placeholder="Select capitalization" />
                    </Select.Trigger>
                    <Select.IndicatorGroup>
                      <Select.Indicator />
                    </Select.IndicatorGroup>
                  </Select.Control>
                  <Select.Positioner>
                    <Select.Content>
                      {capitalizationOptions.map((option) => (
                        <Select.Item key={option.value} item={option}>
                          {option.label}
                          <Select.ItemIndicator />
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Positioner>
                </Select.Root>
              </Field.Root>
            </Stack>
          </Dialog.Body>
          <Dialog.Footer>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorPalette="blue" onClick={handleSave}>
              {isNew ? 'Create' : 'Save'}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
} 
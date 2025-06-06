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

interface SyntaxPatterns {
  prefix: string;
  suffix: string;
  delimiter: string;
  capitalization: CapitalizationType;
}

interface PlatformEditorDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (platform: Platform) => void;
  platform?: Platform;
  isNew?: boolean;
}

export function PlatformEditorDialog({ open, onClose, onSave, platform, isNew = false }: PlatformEditorDialogProps) {
  const { theme } = useTheme();
  const colorMode = theme === 'dark' ? 'dark' : 'light';
  const [editedPlatform, setEditedPlatform] = useState<Platform>(() => ({
    id: platform?.id || '',
    displayName: platform?.displayName || '',
    description: platform?.description || '',
    syntaxPatterns: platform?.syntaxPatterns || {
      prefix: '',
      suffix: '',
      delimiter: '_',
      capitalization: 'none' as CapitalizationType
    }
  }));

  const handleChange = (field: keyof Platform, value: string) => {
    setEditedPlatform(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCodeSyntaxChange = (field: keyof SyntaxPatterns, value: string) => {
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

  const capitalizationOptions = createListCollection({
    items: [
      { value: 'none', label: 'None' },
      { value: 'uppercase', label: 'Uppercase' },
      { value: 'lowercase', label: 'Lowercase' },
      { value: 'capitalize', label: 'Capitalize' }
    ]
  });

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Content bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
        <Dialog.Header>{isNew ? 'Create Platform' : 'Edit Platform'}</Dialog.Header>
        <Dialog.CloseTrigger />
        <Dialog.Body>
          <Stack gap={4} align="stretch">
            <Field.Root required>
              <Field.Label>Display Name</Field.Label>
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
              <Field.Label>Code Syntax</Field.Label>
              <Stack gap={4}>
                <Field.Root>
                  <Field.Label>Prefix</Field.Label>
                  <Input
                    value={editedPlatform.syntaxPatterns?.prefix || ''}
                    onChange={e => handleCodeSyntaxChange('prefix', e.target.value)}
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Suffix</Field.Label>
                  <Input
                    value={editedPlatform.syntaxPatterns?.suffix || ''}
                    onChange={e => handleCodeSyntaxChange('suffix', e.target.value)}
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Separator</Field.Label>
                  <Input
                    value={editedPlatform.syntaxPatterns?.delimiter || ''}
                    onChange={e => handleCodeSyntaxChange('delimiter', e.target.value)}
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
                    collection={capitalizationOptions}
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
                        <Select.Item item={{ value: 'none', label: 'None' }}>None</Select.Item>
                        <Select.Item item={{ value: 'uppercase', label: 'Uppercase' }}>Uppercase</Select.Item>
                        <Select.Item item={{ value: 'lowercase', label: 'Lowercase' }}>Lowercase</Select.Item>
                        <Select.Item item={{ value: 'capitalize', label: 'Capitalize' }}>Capitalize</Select.Item>
                      </Select.Content>
                    </Select.Positioner>
                  </Select.Root>
                </Field.Root>
              </Stack>
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
    </Dialog.Root>
  );
} 
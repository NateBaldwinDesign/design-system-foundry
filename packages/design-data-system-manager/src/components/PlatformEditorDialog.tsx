import React, { useState, useMemo } from 'react';
import {
  Dialog,
  Button,
  Box,
  Text,
  Input,
  Field,
  Select,
  Stack,
  useColorMode
} from '@chakra-ui/react';
import type { Platform } from '@token-model/data-model';
import { CodeSyntaxService } from '../services/codeSyntax';

type CapitalizationType = 'none' | 'uppercase' | 'lowercase' | 'capitalize';

interface PlatformEditorDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (platform: Platform) => void;
  platform?: Platform;
  isNew?: boolean;
}

export function PlatformEditorDialog({ open, onClose, onSave, platform, isNew = false }: PlatformEditorDialogProps) {
  const { colorMode } = useColorMode();
  const [editedPlatform, setEditedPlatform] = useState<Platform>(() => ({
    id: platform?.id || '',
    displayName: platform?.displayName || '',
    description: platform?.description || '',
    codeSyntax: platform?.codeSyntax || {
      prefix: '',
      suffix: '',
      separator: '_',
      capitalization: 'none' as CapitalizationType
    }
  }));

  const handleChange = (field: keyof Platform, value: any) => {
    setEditedPlatform(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCodeSyntaxChange = (field: keyof Platform['codeSyntax'], value: string) => {
    setEditedPlatform(prev => ({
      ...prev,
      codeSyntax: {
        ...prev.codeSyntax,
        [field]: value
      }
    }));
  };

  const handleSave = () => {
    onSave(editedPlatform);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Content bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
        <Dialog.Header>{isNew ? 'Create Platform' : 'Edit Platform'}</Dialog.Header>
        <Dialog.CloseButton />
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
                    value={editedPlatform.codeSyntax.prefix}
                    onChange={e => handleCodeSyntaxChange('prefix', e.target.value)}
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Suffix</Field.Label>
                  <Input
                    value={editedPlatform.codeSyntax.suffix}
                    onChange={e => handleCodeSyntaxChange('suffix', e.target.value)}
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Separator</Field.Label>
                  <Input
                    value={editedPlatform.codeSyntax.separator}
                    onChange={e => handleCodeSyntaxChange('separator', e.target.value)}
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Capitalization</Field.Label>
                  <Select
                    value={editedPlatform.codeSyntax.capitalization}
                    onChange={e => handleCodeSyntaxChange('capitalization', e.target.value as CapitalizationType)}
                  >
                    <option value="none">None</option>
                    <option value="uppercase">Uppercase</option>
                    <option value="lowercase">Lowercase</option>
                    <option value="capitalize">Capitalize</option>
                  </Select>
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
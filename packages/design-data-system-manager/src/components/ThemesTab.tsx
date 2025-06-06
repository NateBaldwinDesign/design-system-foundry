import React from 'react';
import {
  Dialog,
  Field,
  Input,
  Button,
  Stack,
  Checkbox
} from '@chakra-ui/react';
import { useTheme } from 'next-themes';
import type { Theme } from '@token-model/data-model';

interface ThemesTabProps {
  open: boolean;
  onClose: () => void;
  onSave: (theme: Theme) => void;
  theme?: Theme;
  isNew?: boolean;
}

export function ThemesTab({
  open,
  onClose,
  onSave,
  theme,
  isNew = false
}: ThemesTabProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [editedTheme, setEditedTheme] = React.useState(() => ({
    id: theme?.id || '',
    displayName: theme?.displayName || '',
    description: theme?.description || '',
    isDefault: theme?.isDefault || false
  }));

  const handleChange = (field: string, value: any) => {
    setEditedTheme(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    onSave(editedTheme);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(details) => onClose()}>
      <Dialog.Content>
        <Dialog.Header>{isNew ? 'Create Theme' : 'Edit Theme'}</Dialog.Header>
        <Dialog.Body>
          <Stack gap={4} align="stretch">
            <Field.Root required>
              <Field.Label>Name</Field.Label>
              <Input
                value={editedTheme.displayName}
                onChange={e => handleChange('displayName', e.target.value)}
              />
            </Field.Root>
            <Field.Root>
              <Field.Label>Description</Field.Label>
              <Input
                value={editedTheme.description || ''}
                onChange={e => handleChange('description', e.target.value)}
              />
            </Field.Root>
            <Field.Root>
              <Field.Label>Is Default</Field.Label>
              <Checkbox.Root
                checked={editedTheme.isDefault}
                onCheckedChange={(details) => handleChange('isDefault', details.checked === true)}
              >
                <Checkbox.Control />
                <Checkbox.Label>Set as default theme</Checkbox.Label>
              </Checkbox.Root>
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
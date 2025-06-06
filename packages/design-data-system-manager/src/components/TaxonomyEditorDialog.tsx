import React from 'react';
import {
  Dialog,
  Field,
  Input,
  Button,
  Stack,
  Select,
  createListCollection
} from '@chakra-ui/react';
import type { TaxonomyTerm } from '@token-model/data-model';

export interface ResolvedValueTypeOption {
  id: string;
  name: string;
}

interface TaxonomyEditorDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (taxonomy: {
    id: string;
    displayName: string;
    description: string;
    resolvedValueTypeIds: string[];
    terms: TaxonomyTerm[];
  }) => void;
  taxonomy?: {
    id: string;
    displayName: string;
    description: string;
    resolvedValueTypeIds: string[];
    terms: TaxonomyTerm[];
  };
  isNew?: boolean;
  resolvedValueTypes: ResolvedValueTypeOption[];
}

export const TaxonomyEditorDialog: React.FC<TaxonomyEditorDialogProps> = ({
  open,
  onClose,
  onSave,
  taxonomy,
  isNew,
  resolvedValueTypes
}) => {
  const [displayName, setDisplayName] = React.useState(taxonomy?.displayName || '');
  const [description, setDescription] = React.useState(taxonomy?.description || '');
  const [selectedValueTypes, setSelectedValueTypes] = React.useState<string[]>(taxonomy?.resolvedValueTypeIds || []);

  React.useEffect(() => {
    if (taxonomy) {
      setDisplayName(taxonomy.displayName);
      setDescription(taxonomy.description || '');
      setSelectedValueTypes(taxonomy.resolvedValueTypeIds || []);
    }
  }, [taxonomy]);

  const handleSave = () => {
    onSave({
      id: taxonomy?.id || '',
      displayName,
      description,
      resolvedValueTypeIds: selectedValueTypes,
      terms: taxonomy?.terms || []
    });
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>{isNew ? 'New Taxonomy' : 'Edit Taxonomy'}</Dialog.Header>
          <Dialog.Body>
            <Stack gap={4}>
              <Field.Root>
                <Field.Label>Name</Field.Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter taxonomy name"
                />
              </Field.Root>
              <Field.Root>
                <Field.Label>Description</Field.Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter taxonomy description"
                />
              </Field.Root>
              <Field.Root>
                <Field.Label>Value Types</Field.Label>
                <Select.Root
                  value={selectedValueTypes}
                  onValueChange={(details) => {
                    const value = Array.isArray(details.value) ? details.value : [details.value];
                    setSelectedValueTypes(value);
                  }}
                  collection={createListCollection({
                    items: resolvedValueTypes.map(type => ({
                      value: type.id,
                      label: type.name
                    }))
                  })}
                >
                  <Select.HiddenSelect />
                  <Select.Control>
                    <Select.Trigger>
                      <Select.ValueText placeholder="Select value types" />
                    </Select.Trigger>
                    <Select.IndicatorGroup>
                      <Select.Indicator />
                    </Select.IndicatorGroup>
                  </Select.Control>
                  <Select.Positioner>
                    <Select.Content>
                      {resolvedValueTypes.map((type) => (
                        <Select.Item key={type.id} item={{ value: type.id, label: type.name }}>
                          {type.name}
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
            <Button
              onClick={onClose}
              variant="ghost"
              colorPalette="gray"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              colorPalette="blue"
              ml={3}
            >
              Save
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}; 
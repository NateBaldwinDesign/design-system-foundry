import React, { useState } from 'react';
import {
  Button,
  Dialog,
  Field,
  Input,
  Select,
  Textarea,
  VStack,
  HStack
} from '@chakra-ui/react';
import { createUniqueId } from '../utils/id';
import { createListCollection } from '@chakra-ui/react';
import type { 
  Token,
  TokenStatus,
  TokenTaxonomyRef,
  TokenCollection
} from '@token-model/data-model';

interface ExtendedToken extends Omit<Token, 'valuesByMode' | 'private'> {
  valuesByMode: Array<{
    modeIds: string[];
    value: { value?: unknown; tokenId?: string };
    metadata?: Record<string, unknown>;
    platformOverrides?: Array<{ platformId: string; value: string }>;
  }>;
  themeable: boolean;
  private: boolean;
  tokenCollectionId: string;
  taxonomies: TokenTaxonomyRef[];
}

interface ExtendedSchema {
  extensions: {
    tokenGroups: Array<{
      id: string;
      tokenIds: string[];
    }>;
    tokenVariants: Record<string, Record<string, { tokenId: string }>>;
  };
  themes: Array<{
    id: string;
    displayName: string;
    isDefault: boolean;
    description?: string;
    overrides: {
      tokenOverrides: Array<{
        tokenId: string;
      }>;
    };
  }>;
}

interface TokenEditorDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (token: ExtendedToken) => void;
  token: ExtendedToken;
  isNew?: boolean;
  tokenCollections: TokenCollection[];
  schema: ExtendedSchema | null;
  onDeleteToken: (tokenId: string) => void;
}

export function TokenEditorDialog({ 
  open, 
  onClose, 
  onSave, 
  token, 
  isNew = false,
  tokenCollections,
  onDeleteToken
}: TokenEditorDialogProps) {
  const [editedToken, setEditedToken] = useState<ExtendedToken>(() => {
    if (isNew) {
      return {
        ...token,
        id: createUniqueId('token'),
        displayName: '',
        description: '',
        resolvedValueTypeId: '',
        tokenCollectionId: '',
        private: false,
        propertyTypes: [],
        taxonomies: [],
        valuesByMode: [],
        codeSyntax: [],
        platformOverrides: []
      };
    }
    return token;
  });

  const handleChange = (field: keyof ExtendedToken, value: unknown) => {
    setEditedToken((prev: ExtendedToken) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(editedToken);
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>{isNew ? 'Create Token' : 'Edit Token'}</Dialog.Title>
            <Dialog.CloseTrigger />
          </Dialog.Header>
          <Dialog.Body>
            <VStack gap={4}>
              <Field.Root required>
                <Field.Label>Display Name</Field.Label>
                <Input
                  value={editedToken.displayName}
                  onChange={(e) => handleChange('displayName', e.target.value)}
                  placeholder="Enter display name"
                />
              </Field.Root>

              <Field.Root>
                <Field.Label>Description</Field.Label>
                <Textarea
                  value={editedToken.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Enter description"
                />
              </Field.Root>

              <Field.Root required>
                <Field.Label>Token Collection</Field.Label>
                <Select.Root
                  value={[editedToken.tokenCollectionId]}
                  onValueChange={(details) => {
                    const value = Array.isArray(details.value) ? details.value[0] : details.value;
                    handleChange('tokenCollectionId', value);
                  }}
                  collection={createListCollection({
                    items: tokenCollections.map(collection => ({
                      value: collection.id,
                      label: collection.name
                    }))
                  })}
                >
                  <Select.HiddenSelect />
                  <Select.Control>
                    <Select.Trigger>
                      <Select.ValueText placeholder="Select collection..." />
                    </Select.Trigger>
                    <Select.IndicatorGroup>
                      <Select.Indicator />
                    </Select.IndicatorGroup>
                  </Select.Control>
                  <Select.Positioner>
                    <Select.Content>
                      {tokenCollections.map((collection) => (
                        <Select.Item key={collection.id} item={{ value: collection.id, label: collection.name }}>
                          {collection.name}
                          <Select.ItemIndicator />
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Positioner>
                </Select.Root>
              </Field.Root>

              <Field.Root>
                <Field.Label>Status</Field.Label>
                <Select.Root
                  value={[editedToken.status || '']}
                  onValueChange={(details) => {
                    const value = Array.isArray(details.value) ? details.value[0] : details.value;
                    handleChange('status', value as TokenStatus);
                  }}
                  collection={createListCollection({
                    items: [
                      { value: 'experimental', label: 'Experimental' },
                      { value: 'stable', label: 'Stable' },
                      { value: 'deprecated', label: 'Deprecated' }
                    ]
                  })}
                >
                  <Select.HiddenSelect />
                  <Select.Control>
                    <Select.Trigger>
                      <Select.ValueText placeholder="Select status..." />
                    </Select.Trigger>
                    <Select.IndicatorGroup>
                      <Select.Indicator />
                    </Select.IndicatorGroup>
                  </Select.Control>
                  <Select.Positioner>
                    <Select.Content>
                      <Select.Item item={{ value: 'experimental', label: 'Experimental' }}>Experimental</Select.Item>
                      <Select.Item item={{ value: 'stable', label: 'Stable' }}>Stable</Select.Item>
                      <Select.Item item={{ value: 'deprecated', label: 'Deprecated' }}>Deprecated</Select.Item>
                    </Select.Content>
                  </Select.Positioner>
                </Select.Root>
              </Field.Root>
            </VStack>
          </Dialog.Body>
          <Dialog.Footer>
            <HStack gap={2}>
              <Button onClick={onClose}>Cancel</Button>
              <Button colorPalette="blue" onClick={handleSave}>Save</Button>
            </HStack>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
} 
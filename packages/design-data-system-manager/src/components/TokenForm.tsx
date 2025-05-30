import React, { useState, useEffect } from 'react';
import {
  Box,
  Text,
  Input,
  Button,
  FormControl,
  FormLabel,
  Select,
  VStack,
  HStack,
  IconButton,
  useToast,
  Checkbox
} from '@chakra-ui/react';
import { Plus, Trash2 } from 'lucide-react';
import type { Token, TokenCollection, Mode, TokenValue, Dimension, Taxonomy, TokenTaxonomyRef } from '@token-model/data-model';
import { TaxonomyPicker } from './TaxonomyPicker';
import { useSchema } from '../hooks/useSchema';
import { CodeSyntaxService } from '../services/codeSyntax';

interface TokenFormProps {
  collections: TokenCollection[];
  modes: Mode[];
  dimensions: Dimension[];
  tokens: Token[];
  taxonomies: Taxonomy[];
  onSubmit: (token: Omit<Token, 'id'>) => void;
  initialData?: Token;
}

export function TokenForm({ collections, modes, dimensions, tokens, taxonomies, onSubmit, initialData }: TokenFormProps) {
  const safeTaxonomies = Array.isArray(taxonomies) ? taxonomies : [];
  const [formData, setFormData] = useState<Token>(() => ({
    id: crypto.randomUUID(),
    displayName: '',
    description: '',
    tokenCollectionId: '',
    resolvedValueTypeId: 'color',
    private: false,
    themeable: false,
    taxonomies: [] as TokenTaxonomyRef[],
    propertyTypes: ['ALL_PROPERTY_TYPES'],
    codeSyntax: [],
    valuesByMode: []
  }));
  const { schema } = useSchema();
  const toast = useToast();

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        taxonomies: Array.isArray(initialData.taxonomies)
          ? (initialData.taxonomies as TokenTaxonomyRef[])
          : []
      });
    }
  }, [initialData]);

  useEffect(() => {
    setFormData((prev: Token) => ({
      ...prev,
      taxonomies: (prev.taxonomies || []).filter((ref: TokenTaxonomyRef) =>
        safeTaxonomies.some((tax: Taxonomy) => tax.id === ref.taxonomyId) &&
        (ref.termId === '' || safeTaxonomies.find((tax: Taxonomy) => tax.id === ref.taxonomyId)?.terms.some((term: { id: string }) => term.id === ref.termId))
      )
    }));
  }, [safeTaxonomies]);

  const handleInputChange = (field: keyof Token, value: string | string[] | boolean | TokenTaxonomyRef[]) => {
    if (field === 'resolvedValueTypeId' && typeof value === 'string') {
      const validTypes = ['color', 'dimension', 'spacing', 'font_family', 'font_weight', 'font_size', 'line_height', 'letter_spacing', 'duration', 'cubic_bezier', 'blur', 'spread', 'radius', 'alias'];
      if (!validTypes.includes(value)) {
        console.error(`Invalid resolvedValueTypeId: ${value}`);
        return;
      }
    }
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleValueByModeChange = (index: number, field: 'modeIds' | 'value', value: string[] | TokenValue) => {
    setFormData((prev: Token) => ({
      ...prev,
      valuesByMode: (prev.valuesByMode || []).map((item: { modeIds: string[]; value: TokenValue }, i: number) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addValueByMode = () => {
    const requiredModeIds = dimensions
      .filter(d => d.required)
      .map(d => modes.find(m => m.dimensionId === d.id && m.name === d.defaultMode)?.id)
      .filter(Boolean) as string[];
    setFormData((prev: Token) => ({
      ...prev,
      valuesByMode: [...(prev.valuesByMode || []), {
        modeIds: requiredModeIds,
        value: { type: 'COLOR', value: '#000000' }
      }]
    }));
  };

  const removeValueByMode = (index: number) => {
    setFormData((prev: Token) => ({
      ...prev,
      valuesByMode: (prev.valuesByMode || []).filter((_: unknown, i: number) => i !== index)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validTaxonomies = formData.taxonomies.filter(ref =>
      safeTaxonomies.some(tax => tax.id === ref.taxonomyId) &&
      (ref.termId === '' || safeTaxonomies.find(tax => tax.id === ref.taxonomyId)?.terms.some(term => term.id === ref.termId))
    );
    const codeSyntax = CodeSyntaxService.generateAllCodeSyntaxes(
      { ...formData, taxonomies: validTaxonomies },
      schema
    );
    onSubmit({ ...formData, taxonomies: validTaxonomies, codeSyntax });
    toast({ title: 'Token saved', status: 'success', duration: 2000 });
  };

  const getValueInput = (value: TokenValue, onChange: (value: TokenValue) => void) => {
    switch (value.type) {
      case 'COLOR':
        return (
          <Input
            type="color"
            value={value.value}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ type: 'COLOR', value: e.target.value })}
            size="sm"
            w="100px"
          />
        );
      case 'ALIAS':
        return (
          <FormControl>
            <FormLabel>Alias Token</FormLabel>
            <Select
              value={value.tokenId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange({ type: 'ALIAS', tokenId: e.target.value })}
            >
              {tokens.map(token => (
                <option key={token.id} value={token.id}>{token.displayName}</option>
              ))}
            </Select>
          </FormControl>
        );
      case 'DIMENSION':
      case 'SPACING':
      case 'FONT_WEIGHT':
      case 'FONT_SIZE':
      case 'LINE_HEIGHT':
      case 'LETTER_SPACING':
      case 'DURATION':
      case 'BLUR':
      case 'SPREAD':
      case 'RADIUS':
        return (
          <Input
            type="number"
            value={value.value}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ type: value.type, value: parseFloat(e.target.value) })}
            size="sm"
            w="100px"
          />
        );
      case 'FONT_FAMILY':
      case 'CUBIC_BEZIER':
        return (
          <Input
            value={value.value}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ type: value.type, value: e.target.value })}
            size="sm"
            w="100px"
          />
        );
      default:
        return null;
    }
  };

  return (
    <Box as="form" onSubmit={handleSubmit} maxW="800px" mx="auto" p={4}>
      <VStack align="stretch" spacing={4}>
        <Text fontSize="xl" fontWeight="bold">{initialData ? 'Edit Token' : 'Create Token'}</Text>
        <FormControl isRequired>
          <FormLabel>Display Name</FormLabel>
          <Input
            value={formData.displayName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('displayName', e.target.value)}
          />
        </FormControl>
        <FormControl>
          <FormLabel>Description</FormLabel>
          <Input
            value={formData.description}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('description', e.target.value)}
          />
        </FormControl>
        <FormControl isRequired>
          <FormLabel>Collection</FormLabel>
          <Select
            value={formData.tokenCollectionId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('tokenCollectionId', e.target.value)}
            placeholder="Select collection"
          >
            {collections.map(collection => (
              <option key={collection.id} value={collection.id}>{collection.name}</option>
            ))}
          </Select>
        </FormControl>
        <FormControl isRequired>
          <FormLabel>Resolved Value Type</FormLabel>
          <Select
            value={formData.resolvedValueTypeId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('resolvedValueTypeId', e.target.value)}
            placeholder="Select value type"
          >
            <option value="color">Color</option>
            <option value="dimension">Dimension</option>
            <option value="spacing">Spacing</option>
            <option value="font_family">Font Family</option>
            <option value="font_weight">Font Weight</option>
            <option value="font_size">Font Size</option>
            <option value="line_height">Line Height</option>
            <option value="letter_spacing">Letter Spacing</option>
            <option value="duration">Duration</option>
            <option value="cubic_bezier">Cubic Bezier</option>
            <option value="blur">Blur</option>
            <option value="spread">Spread</option>
            <option value="radius">Radius</option>
            <option value="alias">Alias</option>
          </Select>
        </FormControl>
        <FormControl>
          <Checkbox
            isChecked={!!formData.private}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('private', e.target.checked)}
          >
            Private
          </Checkbox>
        </FormControl>
        <FormControl>
          <Checkbox
            isChecked={!!formData.themeable}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('themeable', e.target.checked)}
          >
            Themeable
          </Checkbox>
        </FormControl>
        <FormControl>
          <FormLabel>Property Types (comma separated)</FormLabel>
          <Input
            value={(formData.propertyTypes || []).join(',')}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('propertyTypes', e.target.value.split(',').map((v: string) => v.trim()))}
          />
        </FormControl>
        <Text fontSize="lg" fontWeight="medium">Taxonomies</Text>
        <TaxonomyPicker
          taxonomies={taxonomies}
          value={Array.isArray(formData.taxonomies) ? formData.taxonomies : []}
          onChange={newTaxonomies => handleInputChange('taxonomies', newTaxonomies)}
          disabled={taxonomies.length === 0}
        />
        <Text fontSize="lg" fontWeight="medium">Values By Mode</Text>
        <VStack align="stretch" spacing={2}>
          {(formData.valuesByMode || []).map((valueByMode: { modeIds: string[]; value: TokenValue }, index: number) => (
            <Box key={index} p={2} borderWidth={1} borderRadius="md" bg="gray.50">
              <HStack spacing={2} mb={2}>
                <FormControl>
                  <FormLabel>Mode IDs</FormLabel>
                  <Select
                    multiple
                    value={valueByMode.modeIds}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleValueByModeChange(index, 'modeIds', Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value))}
                  >
                    {modes.map(mode => (
                      <option key={mode.id} value={mode.id}>{mode.name}</option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Value</FormLabel>
                  {getValueInput(valueByMode.value, (v) => handleValueByModeChange(index, 'value', v))}
                </FormControl>
                <IconButton
                  aria-label="Delete value by mode"
                  icon={<Trash2 />}
                  size="sm"
                  colorScheme="red"
                  onClick={() => removeValueByMode(index)}
                />
              </HStack>
            </Box>
          ))}
          <Button leftIcon={<Plus />} onClick={addValueByMode} colorScheme="blue" size="sm">
            Add Value by Mode
          </Button>
        </VStack>
        <Button type="submit" colorScheme="blue" size="lg" mt={4}>
          {initialData ? 'Update Token' : 'Create Token'}
        </Button>
      </VStack>
    </Box>
  );
} 
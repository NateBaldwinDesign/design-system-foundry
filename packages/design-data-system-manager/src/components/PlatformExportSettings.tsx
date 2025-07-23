import React, { useState } from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Input,
  Select,
  Switch,
  Button,
  Badge,
  Alert,
  AlertIcon,
  useToast
} from '@chakra-ui/react';
import { SyntaxPatternsForm, SyntaxPatterns } from './SyntaxPatternsForm';



interface ValueFormatters {
  colorFormat?: 'hex' | 'rgb' | 'rgba' | 'hsl' | 'hsla';
  dimensionUnit?: 'px' | 'rem' | 'em' | 'pt' | 'dp' | 'sp';
  numberPrecision?: number;
  dateFormat?: string;
}

interface PlatformExportSettingsProps {
  platformId: string;
  platformName: string;
  syntaxPatterns: SyntaxPatterns;
  valueFormatters: ValueFormatters;
  onSave: (settings: { syntaxPatterns: SyntaxPatterns; valueFormatters: ValueFormatters }) => void;
  onReset: () => void;
}

export const PlatformExportSettings: React.FC<PlatformExportSettingsProps> = ({
  platformId,
  platformName,
  syntaxPatterns,
  valueFormatters,
  onSave,
  onReset
}) => {
  const [currentSyntaxPatterns, setCurrentSyntaxPatterns] = useState<SyntaxPatterns>(syntaxPatterns);
  const [currentValueFormatters, setCurrentValueFormatters] = useState<ValueFormatters>(valueFormatters);
  const [isDirty, setIsDirty] = useState(false);
  const toast = useToast();

  const handleSyntaxPatternChange = (field: keyof SyntaxPatterns, value: string | number | undefined) => {
    setCurrentSyntaxPatterns(prev => ({
      ...prev,
      [field]: value
    }));
    setIsDirty(true);
  };

  const handleValueFormatterChange = (field: keyof ValueFormatters, value: string | number | undefined) => {
    setCurrentValueFormatters(prev => ({
      ...prev,
      [field]: value
    }));
    setIsDirty(true);
  };

  const handleSave = () => {
    onSave({
      syntaxPatterns: currentSyntaxPatterns,
      valueFormatters: currentValueFormatters
    });
    setIsDirty(false);
    toast({
      title: 'Settings Saved',
      description: `Export settings for ${platformName} have been updated.`,
      status: 'success',
      duration: 3000,
      isClosable: true
    });
  };

  const handleReset = () => {
    setCurrentSyntaxPatterns(syntaxPatterns);
    setCurrentValueFormatters(valueFormatters);
    setIsDirty(false);
    onReset();
    toast({
      title: 'Settings Reset',
      description: `Export settings for ${platformName} have been reset to defaults.`,
      status: 'info',
      duration: 3000,
      isClosable: true
    });
  };

  const getPreviewToken = () => {
    const { prefix = '', suffix = '', delimiter = '_', capitalization = 'none' } = currentSyntaxPatterns;
    let tokenName = 'color-primary-500';
    
    // Apply capitalization
    switch (capitalization) {
      case 'uppercase':
        tokenName = tokenName.toUpperCase();
        break;
      case 'lowercase':
        tokenName = tokenName.toLowerCase();
        break;
      case 'capitalize':
        tokenName = tokenName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('-');
        break;
    }
    
    // Apply delimiter
    if (delimiter) {
      tokenName = tokenName.replace(/-/g, delimiter);
    }
    
    return `${prefix}${tokenName}${suffix}`;
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <Box>
        <HStack justify="space-between" align="center">
          <Box>
            <Heading size="md">{platformName} Export Settings</Heading>
            <Text color="gray.600" mt={1}>
              Configure how tokens are formatted and exported for {platformName}
            </Text>
          </Box>
          <Badge colorScheme="blue" variant="outline">
            {platformId}
          </Badge>
        </HStack>
      </Box>

      {/* Syntax Patterns */}
      <Card>
        <CardHeader>
          <Heading size="sm">Syntax Patterns</Heading>
          <Text fontSize="sm" color="gray.600">
            Define how token names are formatted in the exported code
          </Text>
        </CardHeader>
        <CardBody>
          <SyntaxPatternsForm
            syntaxPatterns={currentSyntaxPatterns}
            onSyntaxPatternChange={handleSyntaxPatternChange}
            preview={getPreviewToken()}
            showTitle={false}
          />
        </CardBody>
      </Card>

      {/* Value Formatters */}
      <Card>
        <CardHeader>
          <Heading size="sm">Value Formatters</Heading>
          <Text fontSize="sm" color="gray.600">
            Define how token values are formatted in the exported code
          </Text>
        </CardHeader>
        <CardBody>
          <VStack spacing={4} align="stretch">
            <HStack spacing={4}>
              <FormControl>
                <FormLabel fontSize="sm">Color Format</FormLabel>
                <Select
                  size="sm"
                  value={currentValueFormatters.colorFormat || 'hex'}
                  onChange={(e) => handleValueFormatterChange('colorFormat', e.target.value)}
                >
                  <option value="hex">Hex (#RRGGBB)</option>
                  <option value="rgb">RGB (rgb(r, g, b))</option>
                  <option value="rgba">RGBA (rgba(r, g, b, a))</option>
                  <option value="hsl">HSL (hsl(h, s%, l%))</option>
                  <option value="hsla">HSLA (hsla(h, s%, l%, a))</option>
                </Select>
              </FormControl>
              
              <FormControl>
                <FormLabel fontSize="sm">Dimension Unit</FormLabel>
                <Select
                  size="sm"
                  value={currentValueFormatters.dimensionUnit || 'px'}
                  onChange={(e) => handleValueFormatterChange('dimensionUnit', e.target.value)}
                >
                  <option value="px">Pixels (px)</option>
                  <option value="rem">Root em (rem)</option>
                  <option value="em">Em (em)</option>
                  <option value="pt">Points (pt)</option>
                  <option value="dp">Density-independent pixels (dp)</option>
                  <option value="sp">Scale-independent pixels (sp)</option>
                </Select>
              </FormControl>
            </HStack>

            <FormControl>
              <FormLabel fontSize="sm">Number Precision</FormLabel>
              <Input
                size="sm"
                type="number"
                min="0"
                max="10"
                value={currentValueFormatters.numberPrecision || 2}
                onChange={(e) => handleValueFormatterChange('numberPrecision', parseInt(e.target.value))}
                placeholder="2"
              />
            </FormControl>
          </VStack>
        </CardBody>
      </Card>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <Heading size="sm">Export Options</Heading>
          <Text fontSize="sm" color="gray.600">
            Additional export configuration options
          </Text>
        </CardHeader>
        <CardBody>
          <VStack spacing={4} align="stretch">
            <FormControl display="flex" alignItems="center">
              <FormLabel fontSize="sm" mb="0">
                Include comments
              </FormLabel>
              <Switch size="sm" />
            </FormControl>
            
            <FormControl display="flex" alignItems="center">
              <FormLabel fontSize="sm" mb="0">
                Include metadata
              </FormLabel>
              <Switch size="sm" />
            </FormControl>
            
            <FormControl display="flex" alignItems="center">
              <FormLabel fontSize="sm" mb="0">
                Minify output
              </FormLabel>
              <Switch size="sm" />
            </FormControl>
          </VStack>
        </CardBody>
      </Card>

      {/* Actions */}
      <HStack spacing={3} justify="flex-end">
        <Button variant="outline" onClick={handleReset}>
          Reset to Defaults
        </Button>
        <Button
          colorScheme="blue"
          onClick={handleSave}
          isDisabled={!isDirty}
        >
          Save Settings
        </Button>
      </HStack>

      {isDirty && (
        <Alert status="info" size="sm">
          <AlertIcon />
          You have unsaved changes. Click "Save Settings" to apply them.
        </Alert>
      )}
    </VStack>
  );
}; 
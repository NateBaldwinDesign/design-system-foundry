import React, { useEffect, useState } from 'react';
import {
  Box,
  Text,
  VStack,
  HStack,
  Badge,
  useColorMode,
  Alert,
  AlertIcon,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td
} from '@chakra-ui/react';
import { StorageService } from '../services/storage';

interface PlatformNamePreviewProps {
  token: {
    id: string;
    taxonomies: Array<{
      taxonomyId: string;
      termId: string;
    }>;
  };
  platforms: Array<{
    id: string;
    displayName: string;
    extensionSource?: {
      repositoryUri: string;
      filePath: string;
    };
    syntaxPatterns?: {
      prefix?: string;
      suffix?: string;
      delimiter?: string;
      capitalization?: 'lowercase' | 'uppercase' | 'camelcase' | 'pascalcase' | 'kebabcase' | 'snakecase';
    };
  }>;
}

// Helper function to format token name based on syntax patterns and taxonomy order
const formatTokenName = (
  platformId: string,
  tokenTaxonomies: Array<{ taxonomyId: string; termId: string }>,
  syntaxPatterns: Record<string, any>,
  taxonomyOrder: string[],
  availableTaxonomies: Array<{ id: string; name: string; terms: Array<{ id: string; name: string }> }>
): string => {
  console.log(`[formatTokenName] Starting formatting for platform: ${platformId}`);
  console.log(`[formatTokenName] Token taxonomies:`, tokenTaxonomies);
  console.log(`[formatTokenName] Available syntax patterns:`, syntaxPatterns);
  console.log(`[formatTokenName] Taxonomy order:`, taxonomyOrder);
  
  const patterns = syntaxPatterns[platformId];
  if (!patterns) {
    console.log(`[formatTokenName] No syntax patterns found for platform: ${platformId}`);
    return '';
  }
  
  console.log(`[formatTokenName] Using patterns for ${platformId}:`, patterns);
  
  // Create a map of taxonomy IDs to their terms for quick lookup
  const taxonomyMap = new Map();
  availableTaxonomies.forEach(taxonomy => {
    taxonomyMap.set(taxonomy.id, taxonomy);
  });
  
  // Order terms according to taxonomy order
  const orderedTerms: string[] = [];
  
  for (const taxonomyId of taxonomyOrder) {
    console.log(`[formatTokenName] Processing taxonomy order item: ${taxonomyId}`);
    
    // Find the term for this taxonomy in the token's taxonomies
    const tokenTaxonomy = tokenTaxonomies.find((t: { taxonomyId: string; termId: string }) => t.taxonomyId === taxonomyId);
    if (tokenTaxonomy) {
      console.log(`[formatTokenName] Found termId: ${tokenTaxonomy.termId} for taxonomyId: ${taxonomyId}`);
      
      const taxonomy = taxonomyMap.get(taxonomyId);
      if (taxonomy) {
        console.log(`[formatTokenName] Found taxonomy: ${taxonomy.name}`);
        
        const term = taxonomy.terms.find((t: { id: string; name: string }) => t.id === tokenTaxonomy.termId);
        if (term) {
          console.log(`[formatTokenName] Added term: ${term.name}`);
          orderedTerms.push(term.name);
        } else {
          console.log(`[formatTokenName] Term not found for termId: ${tokenTaxonomy.termId}`);
        }
      } else {
        console.log(`[formatTokenName] Taxonomy not found for taxonomyId: ${taxonomyId}`);
      }
    } else {
      console.log(`[formatTokenName] No taxonomy found in token for taxonomyId: ${taxonomyId}`);
    }
  }
  
  console.log(`[formatTokenName] Ordered terms:`, orderedTerms);
  
  if (orderedTerms.length === 0) {
    console.log(`[formatTokenName] No terms found, returning empty string`);
    return '';
  }
  
  // Join terms with delimiter
  const delimiter = patterns.delimiter || '';
  let formattedName = orderedTerms.join(delimiter);
  console.log(`[formatTokenName] Joined terms with delimiter '${delimiter}': ${formattedName}`);
  
  // Apply capitalization
  const capitalization = patterns.capitalization || 'lowercase';
  switch (capitalization) {
    case 'uppercase':
      formattedName = formattedName.toUpperCase();
      break;
    case 'camelcase':
      formattedName = formattedName.replace(/\s+/g, '').replace(/^./, str => str.toLowerCase());
      break;
    case 'pascalcase':
      formattedName = formattedName.replace(/\s+/g, '').replace(/^./, str => str.toUpperCase());
      break;
    case 'kebabcase':
      formattedName = formattedName.toLowerCase().replace(/\s+/g, '-');
      break;
    case 'snakecase':
      formattedName = formattedName.toLowerCase().replace(/\s+/g, '_');
      break;
    case 'lowercase':
    default:
      formattedName = formattedName.toLowerCase();
      break;
  }
  console.log(`[formatTokenName] Applied ${capitalization}: ${formattedName}`);
  
  // Add prefix and suffix
  const prefix = patterns.prefix || '';
  const suffix = patterns.suffix || '';
  const finalName = `${prefix}${formattedName}${suffix}`;
  console.log(`[formatTokenName] Final name with prefix '${prefix}' and suffix '${suffix}': ${finalName}`);
  
  return finalName;
};

export const PlatformNamePreview: React.FC<PlatformNamePreviewProps> = ({ token, platforms }) => {
  const { colorMode } = useColorMode();
  const [generatedNames, setGeneratedNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generateNames = async () => {
      try {
        console.log('[PlatformNamePreview] Starting simple name generation for token:', token.id);
        console.log('[PlatformNamePreview] Token taxonomies:', token.taxonomies);
        console.log('[PlatformNamePreview] Available platforms:', platforms.map(p => ({ id: p.id, displayName: p.displayName, extensionSource: p.extensionSource })));
        
        // Debug: List all localStorage keys containing "platform"
        const allKeys = Object.keys(localStorage);
        const platformKeys = allKeys.filter(key => key.toLowerCase().includes('platform'));
        console.log('[PlatformNamePreview] All localStorage keys containing "platform":', platformKeys);
        
        // Debug: Check what's stored in the existing platform extension data key
        const existingKey = 'token-model:platform-extension-data:NateBaldwinDesign/Test_Auto_platform';
        const existingData = localStorage.getItem(existingKey);
        if (existingData) {
          try {
            const parsedData = JSON.parse(existingData);
            console.log('[PlatformNamePreview] Existing platform extension data:', parsedData);
          } catch (err) {
            console.warn('[PlatformNamePreview] Failed to parse existing data:', err);
          }
        } else {
          console.log('[PlatformNamePreview] No data found in existing key');
        }
        
        setIsLoading(true);
        setError(null);

        // Get taxonomy order from merged data
        const mergedData = StorageService.getMergedData();
        const taxonomyOrder = mergedData?.taxonomyOrder || [];
        console.log('[PlatformNamePreview] Taxonomy order from core data:', taxonomyOrder);
        
        // Get available taxonomies from merged data
        const availableTaxonomies = mergedData?.taxonomies || [];
        console.log('[PlatformNamePreview] Available taxonomies:', availableTaxonomies);
        
        // Get syntax patterns from stored platform extensions using StorageService
        const syntaxPatterns: Record<string, any> = {};
        
        // First, get the existing platform extension data we found
        const existingPlatformExtensionData = existingData ? JSON.parse(existingData) : null;
        
        // Read syntax patterns from each platform's stored extension data
        for (const platform of platforms) {
          console.log(`[PlatformNamePreview] Processing platform: ${platform.id} (${platform.displayName})`);
          
          // First, try to get platform extension data using the platform ID
          let platformExtensionData = StorageService.getPlatformExtensionData(platform.id);
          console.log(`[PlatformNamePreview] Platform extension data for ${platform.id}:`, platformExtensionData ? 'Found' : 'Not found');
          
          // If not found by platform ID, check if it matches the existing data we found
          if (!platformExtensionData && existingPlatformExtensionData && existingPlatformExtensionData.platformId === platform.id) {
            console.log(`[PlatformNamePreview] Found matching platform in existing data for ${platform.id}`);
            platformExtensionData = existingPlatformExtensionData;
          }
          
          // If still not found, try using the repository/file path format
          if (!platformExtensionData && platform.extensionSource) {
            const alternativeKey = `${platform.extensionSource.repositoryUri}/${platform.extensionSource.filePath}`;
            console.log(`[PlatformNamePreview] Trying alternative key: ${alternativeKey}`);
            
            // Check if this key exists in localStorage
            const storedData = localStorage.getItem(`token-model:platform-extension-data:${alternativeKey}`);
            if (storedData) {
              try {
                platformExtensionData = JSON.parse(storedData);
                console.log(`[PlatformNamePreview] Found platform extension data with alternative key:`, platformExtensionData);
              } catch (err) {
                console.warn(`[PlatformNamePreview] Failed to parse platform extension data:`, err);
              }
            } else {
              console.log(`[PlatformNamePreview] No data found with alternative key: ${alternativeKey}`);
            }
          }
          
          if (platformExtensionData && platformExtensionData.syntaxPatterns) {
            syntaxPatterns[platform.id] = platformExtensionData.syntaxPatterns;
            console.log(`[PlatformNamePreview] Found syntax patterns for ${platform.id}:`, platformExtensionData.syntaxPatterns);
          } else {
            console.log(`[PlatformNamePreview] No syntax patterns found in extension data for ${platform.id}, checking core platform data`);
            
            // Fallback: Check if platform has syntax patterns in core data
            if (platform.syntaxPatterns) {
              syntaxPatterns[platform.id] = platform.syntaxPatterns;
              console.log(`[PlatformNamePreview] Using core syntax patterns for ${platform.id}:`, platform.syntaxPatterns);
            } else {
              console.log(`[PlatformNamePreview] No syntax patterns found in core data for ${platform.id}`);
            }
          }
        }
        
        console.log('[PlatformNamePreview] All syntax patterns collected:', syntaxPatterns);
        
        // Generate names for each platform using simple formatting
        const names: Record<string, string> = {};
        
        for (const platform of platforms) {
          console.log(`[PlatformNamePreview] Generating name for platform: ${platform.id}`);
          const formattedName = formatTokenName(platform.id, token.taxonomies, syntaxPatterns, taxonomyOrder, availableTaxonomies);
          console.log(`[PlatformNamePreview] Generated name for ${platform.id}: "${formattedName}"`);
          if (formattedName) {
            names[platform.id] = formattedName;
          }
        }

        console.log('[PlatformNamePreview] Final generated names:', names);
        setGeneratedNames(names);
        
      } catch (err) {
        console.error('[PlatformNamePreview] Error generating platform names:', err);
        setError(err instanceof Error ? err.message : 'Failed to generate platform names');
      } finally {
        setIsLoading(false);
      }
    };

    generateNames();
  }, [token, platforms]);

  if (isLoading) {
    return (
      <Box flex={1} minW={0}>
        <Text fontSize="sm" fontWeight="medium" mb={1}>Platform Names</Text>
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <Text fontSize="sm">
            Generating platform names...
          </Text>
        </Alert>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flex={1} minW={0}>
        <Text fontSize="sm" fontWeight="medium" mb={1}>Platform Names</Text>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <Text fontSize="sm">
            {error}
          </Text>
        </Alert>
      </Box>
    );
  }

  return (
    <Box flex={1} minW={0}>
      <Text fontSize="sm" fontWeight="medium" mb={1}>
        Platform Names
      </Text>
      {Object.keys(generatedNames).length === 0 ? (
        <Alert status="warning" borderRadius="md">
          <AlertIcon />
          <VStack align="start" spacing={1}>
            <Text fontSize="sm" fontWeight="medium">
              No platform names could be generated.
            </Text>
            <Text fontSize="xs">
              Check that the token has valid taxonomy assignments and that taxonomy order is configured in the core data.
            </Text>
            <Text fontSize="xs" color="gray.500">
              Debug info: Token has {token.taxonomies?.length || 0} taxonomies
            </Text>
          </VStack>
        </Alert>
      ) : (
        <Table size="sm" variant="simple">
          <Thead>
            <Tr>
              <Th fontSize="xs" py={2}>Platform</Th>
              <Th fontSize="xs" py={2}>Formatted name</Th>
            </Tr>
          </Thead>
          <Tbody>
            {Object.entries(generatedNames).map(([platformId, generatedName]) => {
              const platform = platforms.find(p => p.id === platformId);
              const platformDisplayName = platform?.displayName || platformId;
              
              return (
                <Tr key={platformId}>
                  <Td py={2}>
                    <Text 
                      fontSize="sm"
                    >
                      {platformDisplayName}
                    </Text>
                  </Td>
                  <Td py={2}>
                    <Text 
                      fontSize="sm" 
                      fontFamily="mono"
                      color={colorMode === 'dark' ? 'gray.300' : 'gray.700'}
                      bg={colorMode === 'dark' ? 'gray.800' : 'gray.100'}
                      px={2}
                      py={1}
                      borderRadius="md"
                      display="inline-block"
                    >
                      {generatedName}
                    </Text>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      )}
    </Box>
  );
}; 
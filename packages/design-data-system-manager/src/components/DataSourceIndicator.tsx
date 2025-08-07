import React from 'react';
import {
  HStack,
  VStack,
  Badge,
  Text,
  Spinner,
  Tooltip,
  useColorMode,
  Icon,
} from '@chakra-ui/react';
import { Monitor, Palette, Database, AlertCircle } from 'lucide-react';
import type { DataSourceContext } from '../services/dataSourceManager';

export interface DataSourceIndicatorProps {
  dataSourceContext: DataSourceContext | null;
  isLoading?: boolean;
  error?: string | null;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const DataSourceIndicator: React.FC<DataSourceIndicatorProps> = ({
  dataSourceContext,
  isLoading = false,
  error = null,
  showDetails = false,
  size = 'md',
}) => {
  const { colorMode } = useColorMode();

  if (!dataSourceContext) {
    return null;
  }

  const { currentPlatform, currentTheme, availablePlatforms, availableThemes } = dataSourceContext;

  // Determine current data source type
  const getDataSourceType = () => {
    if (currentPlatform && currentPlatform !== 'none') return 'platform';
    if (currentTheme && currentTheme !== 'none') return 'theme';
    return 'core';
  };

  const dataSourceType = getDataSourceType();

  // Get display names
  const getPlatformDisplayName = () => {
    if (!currentPlatform || currentPlatform === 'none') return null;
    return availablePlatforms.find(p => p.id === currentPlatform)?.displayName || currentPlatform;
  };

  const getThemeDisplayName = () => {
    if (!currentTheme || currentTheme === 'none') return null;
    return availableThemes.find(t => t.id === currentTheme)?.displayName || currentTheme;
  };

  // Get appropriate icon and color scheme
  const getDataSourceConfig = () => {
    switch (dataSourceType) {
      case 'platform':
        return {
          icon: Monitor,
          colorScheme: 'blue',
          label: 'Platform',
          value: getPlatformDisplayName(),
        };
      case 'theme':
        return {
          icon: Palette,
          colorScheme: 'purple',
          label: 'Theme',
          value: getThemeDisplayName(),
        };
      default:
        return {
          icon: Database,
          colorScheme: 'gray',
          label: 'Core Data',
          value: null,
        };
    }
  };

  const config = getDataSourceConfig();

  // Handle loading state
  if (isLoading) {
    return (
      <HStack spacing={2} alignItems="center">
        <Spinner size={size === 'sm' ? 'xs' : 'sm'} />
        <Text fontSize={size === 'sm' ? 'xs' : 'sm'} color="gray.500">
          Switching data source...
        </Text>
      </HStack>
    );
  }

  // Handle error state
  if (error) {
    return (
      <HStack spacing={2} alignItems="center">
        <Icon as={AlertCircle} color="red.500" boxSize={size === 'sm' ? 3 : 4} />
        <Text fontSize={size === 'sm' ? 'xs' : 'sm'} color="red.500">
          Error loading data source
        </Text>
      </HStack>
    );
  }

  return (
    <VStack spacing={1} align="start">
      <HStack spacing={2} alignItems="center">
        <Icon as={config.icon} color={`${config.colorScheme}.500`} boxSize={size === 'sm' ? 3 : 4} />
        <Text fontSize={size === 'sm' ? 'xs' : 'sm'} fontWeight="medium" color="gray.600">
          {config.label}:
        </Text>
        
        <Tooltip
          label={config.value ? `Currently viewing ${config.label.toLowerCase()} data` : 'Viewing core data'}
          placement="top"
        >
          <Badge
            colorScheme={config.colorScheme}
            variant="subtle"
            fontSize={size === 'sm' ? 'xs' : 'sm'}
            px={2}
            py={1}
            borderRadius="md"
            bg={colorMode === 'dark' ? `${config.colorScheme}.900` : `${config.colorScheme}.50`}
            color={colorMode === 'dark' ? `${config.colorScheme}.100` : `${config.colorScheme}.700`}
            borderWidth={1}
            borderColor={colorMode === 'dark' ? `${config.colorScheme}.700` : `${config.colorScheme}.200`}
          >
            {config.value || 'Core Data'}
          </Badge>
        </Tooltip>
      </HStack>

      {showDetails && (currentTheme && currentTheme !== 'none') && (
        <HStack spacing={2} alignItems="center" ml={6}>
          <Icon as={Palette} color="purple.500" boxSize={size === 'sm' ? 3 : 4} />
          <Text fontSize={size === 'sm' ? 'xs' : 'sm'} color="gray.500">
            Theme: {getThemeDisplayName()}
          </Text>
        </HStack>
      )}
    </VStack>
  );
}; 
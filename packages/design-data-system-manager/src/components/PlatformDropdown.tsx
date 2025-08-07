import React from 'react';
import {
  Select,
  HStack,
  Text,
  useColorMode,
} from '@chakra-ui/react';
import { Monitor } from 'lucide-react';
import type { Platform } from '@token-model/data-model';

export interface PlatformDropdownProps {
  availablePlatforms: Platform[];
  currentPlatform: string | null;
  permissions: Record<string, boolean>;
  onPlatformChange: (platformId: string | null) => void;
}

export const PlatformDropdown: React.FC<PlatformDropdownProps> = ({
  availablePlatforms,
  currentPlatform,
  permissions,
  onPlatformChange,
}) => {
  const { colorMode } = useColorMode();

  // Don't render if no platforms are available
  if (availablePlatforms.length === 0) {
    return null;
  }

  const handlePlatformChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    const platformId = value === 'none' ? null : value;
    onPlatformChange(platformId);
  };





  const getPlatformStatus = (platformId: string) => {
    const hasPermission = permissions[platformId] || false;
    return {
      hasPermission,
      status: hasPermission ? 'accessible' : 'no-access' as const,
    };
  };

  return (
    <HStack spacing={2} alignItems="center">
      <Monitor size={16} />
      <Text fontSize="sm" fontWeight="medium" color="gray.600">
        Platform:
      </Text>
      
      <Select
        size="sm"
        value={currentPlatform || 'none'}
        onChange={handlePlatformChange}
        minW="150px"
        maxW="200px"
        bg={colorMode === 'dark' ? 'gray.700' : 'white'}
        borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.300'}
      >
        <option value="none">None (Core Data)</option>
        {availablePlatforms.map((platform) => {
          const { hasPermission } = getPlatformStatus(platform.id);
          return (
            <option key={platform.id} value={platform.id}>
              {platform.displayName}
              {!hasPermission && ' (No Access)'}
            </option>
          );
        })}
      </Select>


    </HStack>
  );
}; 
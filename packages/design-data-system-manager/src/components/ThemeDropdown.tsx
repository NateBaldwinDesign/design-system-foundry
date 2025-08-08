import React from 'react';
import {
  Select,
  HStack,
  Text,
  useColorMode,
} from '@chakra-ui/react';
import { Palette } from 'lucide-react';
import type { Theme } from '@token-model/data-model';

export interface ThemeDropdownProps {
  availableThemes: Theme[];
  currentTheme: string | null;
  permissions: Record<string, boolean>;
  onThemeChange: (themeId: string | null) => void;
}

export const ThemeDropdown: React.FC<ThemeDropdownProps> = ({
  availableThemes,
  currentTheme,
  permissions,
  onThemeChange,
}) => {
  const { colorMode } = useColorMode();

  // Don't render if no themes are available
  if (availableThemes.length === 0) {
    return null;
  }

  const handleThemeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    const themeId = value === 'none' ? null : value;
    onThemeChange(themeId);
  };



  const getThemeStatus = (themeId: string) => {
    const hasPermission = permissions[themeId] || false;
    return {
      hasPermission,
    };
  };

  return (
    <HStack spacing={2} alignItems="center">
      <Palette size={16} />
      <Text fontSize="sm" fontWeight="medium" color="gray.600">
        Theme:
      </Text>
      
      <Select
        size="sm"
        value={currentTheme || 'none'}
        onChange={handleThemeChange}
        minW="150px"
        maxW="200px"
        bg={colorMode === 'dark' ? 'gray.700' : 'white'}
        borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.300'}
      >
        <option value="none">None (Core Data)</option>
        {availableThemes.map((theme) => {
          return (
            <option key={theme.id} value={theme.id}>
              {theme.displayName}
            </option>
          );
        })}
      </Select>


    </HStack>
  );
}; 
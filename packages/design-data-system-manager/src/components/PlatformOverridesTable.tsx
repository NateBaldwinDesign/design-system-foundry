import React from 'react';
import { Box, Text, VStack } from '@chakra-ui/react';
import type { Mode, Platform, TokenValue, PlatformOverride } from '@token-model/data-model';
import { ValueByModeTable } from './ValueByModeTable';

interface ValueByMode {
  modeIds: string[];
  value: TokenValue;
  platformOverrides?: PlatformOverride[];
}

interface PlatformOverridesTableProps {
  platforms: Platform[];
  valuesByMode: ValueByMode[];
  modes: Mode[];
  getValueEditor: (value: TokenValue | string, modeIndex: number, isOverride?: boolean, onChange?: (newValue: TokenValue) => void) => React.ReactNode;
  onPlatformOverrideChange: (platformId: string, modeIndex: number, newValue: TokenValue) => void;
}

export function PlatformOverridesTable({ platforms, valuesByMode, modes, getValueEditor, onPlatformOverrideChange }: PlatformOverridesTableProps) {
  // For each platform, build a valuesByMode array with override or 'inherit from default'
  return (
    <Box mt={4}>
      <Text fontSize="xl" fontWeight="bold" mb={4}>
        Platform overrides
      </Text>
      <VStack spacing={6} align="stretch">
        {platforms && platforms.length > 0 && platforms.map(platform => {
          // Build override valuesByMode for this platform
          const platformValues = valuesByMode.map(vbm => {
            const override = vbm.platformOverrides?.find((po: PlatformOverride) => po.platformId === platform.id);
            
            // If there's no override, return the default value
            if (!override) {
              return {
                ...vbm,
                value: vbm.value
              };
            }

            // If there is an override, create a TokenValue with the override value
            // The type should match the default value's type
            const overrideValue: TokenValue = {
              ...vbm.value,
              value: override.value
            };

            return {
              ...vbm,
              value: overrideValue
            };
          });

          // Only show platforms that have at least one override
          const hasAnyOverride = valuesByMode.some(vbm => 
            vbm.platformOverrides?.some((po: PlatformOverride) => po.platformId === platform.id)
          );

          if (!hasAnyOverride) return null;

          return (
            <Box key={platform.id}>
              <Text fontSize="lg" fontWeight="medium" mb={2}>
                {platform.displayName}
              </Text>
              <ValueByModeTable
                valuesByMode={platformValues}
                modes={modes}
                getValueEditor={(value, modeIndex) => getValueEditor(value, modeIndex, true, (newValue) => onPlatformOverrideChange(platform.id, modeIndex, newValue))}
              />
            </Box>
          );
        })}
      </VStack>
    </Box>
  );
} 
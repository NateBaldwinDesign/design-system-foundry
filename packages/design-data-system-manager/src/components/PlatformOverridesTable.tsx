import React from 'react';
import { Box, Typography } from '@mui/material';
import type { Mode, Platform, TokenValue, PlatformOverride, Token } from '@token-model/data-model';
import { ValueByModeTable, getModeName } from './ValueByModeTable';

interface PlatformOverridesTableProps {
  platforms: Platform[];
  valuesByMode: any[];
  modes: Mode[];
  getValueEditor: (value: TokenValue | string, modeIndex: number, isOverride?: boolean, onChange?: (newValue: TokenValue) => void) => React.ReactNode;
  onPlatformOverrideChange: (platformId: string, modeIndex: number, newValue: TokenValue) => void;
  resolvedValueType: string;
  tokens: Token[];
  constraints?: any[];
  excludeTokenId?: string;
}

export function PlatformOverridesTable({ platforms, valuesByMode, modes, getValueEditor, onPlatformOverrideChange, resolvedValueType, tokens, constraints, excludeTokenId }: PlatformOverridesTableProps) {
  // For each platform, build a valuesByMode array with override or 'inherit from default'
  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        Platform overrides
      </Typography>
      {platforms && platforms.length > 0 && platforms.map(platform => {
        // Build override valuesByMode for this platform
        const platformValues = valuesByMode.map((vbm, idx) => {
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
          <Box key={platform.id} sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              {platform.displayName}
            </Typography>
            <ValueByModeTable
              valuesByMode={platformValues}
              modes={modes}
              editable={true}
              onValueChange={(modeIndex, newValue) => onPlatformOverrideChange(platform.id, modeIndex, newValue)}
              getValueEditor={getValueEditor}
              resolvedValueType={resolvedValueType}
              tokens={tokens}
              constraints={constraints}
              excludeTokenId={excludeTokenId}
            />
          </Box>
        );
      })}
    </Box>
  );
} 
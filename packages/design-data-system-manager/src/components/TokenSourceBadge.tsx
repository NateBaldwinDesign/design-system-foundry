import React from 'react';
import { Badge, Tooltip, useColorMode } from '@chakra-ui/react';
import { Monitor, Palette, Database } from 'lucide-react';

export type TokenSource = 'core' | 'platform' | 'theme' | 'merged';

export interface TokenSourceBadgeProps {
  source: TokenSource;
  platformName?: string;
  themeName?: string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export const TokenSourceBadge: React.FC<TokenSourceBadgeProps> = ({
  source,
  platformName,
  themeName,
  size = 'sm',
  showIcon = true,
}) => {
  const { colorMode } = useColorMode();

  const getSourceConfig = () => {
    switch (source) {
      case 'platform':
        return {
          icon: Monitor,
          colorScheme: 'blue',
          label: 'Platform',
          tooltip: platformName ? `From ${platformName} platform` : 'Platform override',
        };
      case 'theme':
        return {
          icon: Palette,
          colorScheme: 'purple',
          label: 'Theme',
          tooltip: themeName ? `From ${themeName} theme` : 'Theme override',
        };
      case 'merged':
        return {
          icon: Database,
          colorScheme: 'green',
          label: 'Merged',
          tooltip: 'Combined from multiple sources',
        };
      default:
        return {
          icon: Database,
          colorScheme: 'gray',
          label: 'Core',
          tooltip: 'From core data',
        };
    }
  };

  const config = getSourceConfig();

  return (
    <Tooltip label={config.tooltip} placement="top">
      <Badge
        colorScheme={config.colorScheme}
        variant="subtle"
        size={size}
        fontSize={size === 'sm' ? 'xs' : 'sm'}
        px={2}
        py={1}
        borderRadius="md"
        bg={colorMode === 'dark' ? `${config.colorScheme}.900` : `${config.colorScheme}.50`}
        color={colorMode === 'dark' ? `${config.colorScheme}.100` : `${config.colorScheme}.700`}
        borderWidth={1}
        borderColor={colorMode === 'dark' ? `${config.colorScheme}.700` : `${config.colorScheme}.200`}
        display="inline-flex"
        alignItems="center"
        gap={1}
      >
        {showIcon && <config.icon size={size === 'sm' ? 12 : 14} />}
        {config.label}
      </Badge>
    </Tooltip>
  );
}; 
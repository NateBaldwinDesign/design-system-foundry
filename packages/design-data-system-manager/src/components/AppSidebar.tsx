import React, { useState } from 'react';
import {
  Box,
  VStack,
  Text,
  useColorMode,
  Tooltip,
  Button,
} from '@chakra-ui/react';
import {
  ChevronLeft,
  ChevronRight,
  Gauge,
  Shapes,
  PaletteIcon,
  MonitorSmartphone,
  FigmaIcon,
  Waypoints,
  FileCode,
  Boxes,
  ChartPie,
} from 'lucide-react';
import Logo from './Logo';
import TokenIcon from '../icons/TokenIcon';
import type { ViewId } from '../hooks/useViewState';

interface NavItem {
  id: ViewId;
  label: string;
  icon?: React.ElementType;
  children?: NavItem[];
}

interface AppSidebarProps {
  currentView: ViewId;
  onNavigate: (viewId: ViewId) => void;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Gauge },
  { id: 'system', label: 'System', icon: Waypoints },
  { id: 'foundations', label: 'Foundations', icon: Shapes },
  { id: 'tokens', label: 'Tokens', icon: TokenIcon },
  { id: 'components', label: 'Components', icon: Boxes },
  { id: 'themes', label: 'Themes', icon: PaletteIcon },
  { id: 'platforms', label: 'Platforms', icon: MonitorSmartphone },
  { id: 'figma-settings', label: 'Figma', icon: FigmaIcon },
  { id: 'analysis', label: 'Analysis', icon: ChartPie },
  
  // { id: 'validation', label: 'Validation', icon: CircleCheckBig },
  { id: 'schemas', label: 'Schemas', icon: FileCode },
];

export const AppSidebar: React.FC<AppSidebarProps> = ({ currentView, onNavigate }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { colorMode } = useColorMode();
  const bgColor = colorMode === 'dark' ? 'gray.800' : 'white';
  const borderColor = colorMode === 'dark' ? 'gray.700' : 'gray.200';

  const renderNavItem = (item: NavItem, isChild: boolean = false) => {
    const isActive = currentView === item.id;
    const Icon = item.icon;

    // If it's a parent item (has children), render it as a header
    if (item.children && !isChild) {
      if (isCollapsed) {
        return null; // Don't render parent headers when collapsed
      }
      return (
        <Text
          key={item.id}
          fontSize="xs"
          fontWeight="bold"
          color="gray.500"
          textTransform="uppercase"
          letterSpacing="wider"
          mt={4}
          mb={2}
          px={2}
        >
          {item.label}
        </Text>
      );
    }

    // Render child items or items without children
    const content = (
      <Box
        key={item.id}
        display="flex"
        alignItems="center"
        p={2}
        borderRadius="md"
        bg={isActive ? 'gray.600' : 'transparent'}
        color={isActive ? 'white' : 'inherit'}
        _hover={{
          bg: isActive ? 'gray.800' : colorMode === 'dark' ? 'gray.700' : 'gray.100',
        }}
        cursor="pointer"
        role="menuitem"
        aria-current={isActive ? 'page' : undefined}
        tabIndex={0}
        textDecoration="none"
        onClick={() => onNavigate(item.id)}
      >
        {Icon && <Icon size={20} />}
        {!isCollapsed && (
          <Text ml={3} fontSize="sm">
            {item.label}
          </Text>
        )}
      </Box>
    );

    if (isCollapsed) {
      return (
        <Tooltip label={item.label} placement="right" key={item.id}>
          {content}
        </Tooltip>
      );
    }
    return content;
  };

  return (
    <Box
      as="nav"
      position="relative"
      w={isCollapsed ? '64px' : '220px'}
      h="100vh"
      bg={bgColor}
      borderRight="1px"
      borderColor={borderColor}
      transition="width 0.2s"
      role="navigation"
      aria-label="Main navigation"
    >
      <VStack spacing={0} align="stretch" h="full">
        {/* Logo */}
        <Box px={4} py={3} borderBottom="1px" borderColor={borderColor} display="flex" gap={2} justifyContent="center" alignItems="center">
          <Logo size={28} color={colorMode === 'dark' ? 'white' : 'black'} />
          {/* Title */}
          {!isCollapsed && (
            <Text fontSize="sm" lineHeight="1" fontWeight="bold">
              Design System<br/>Foundry
            </Text>
          )}
        </Box>
        {/* Navigation Items */}
        <VStack spacing={1} align="stretch" p={4} flex={1}>
          {NAV_ITEMS.map((item) => {
            if (item.children) {
              return (
                <Box key={item.id}>
                  {renderNavItem(item)}
                  <VStack key={`${item.id}-children`} spacing={1} align="stretch" ml={0} mt={1}>
                    {item.children.map((child) => renderNavItem(child, true))}
                  </VStack>
                </Box>
              );
            }
            return renderNavItem(item);
          })}
        </VStack>

        {/* Collapse Toggle Button */}
        <Box px={4} py={2} borderBottom="1px" borderColor={borderColor}>
          <Button
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            size="sm"
            leftIcon={isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            onClick={() => setIsCollapsed(!isCollapsed)}
            variant="ghost"
            w="full"
            gap={1}
            justifyContent="flex-start"
          >
            {!isCollapsed && 'Collapse'}
          </Button>
        </Box>
      </VStack>
    </Box>
  );
}; 
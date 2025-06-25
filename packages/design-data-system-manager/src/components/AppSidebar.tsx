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
  Settings,
  LayoutDashboard,
  Folders,
  SquareFunction,
  Tag,
  SquareStack,
  ListOrdered,
  PencilRuler,
  Palette,
  MonitorSmartphone,
  CircleCheckBig,
  History,
  Users,
  FileCode,
  ChartNetwork,
  Blend
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import Logo from './Logo';
import TokenIcon from '../icons/TokenIcon';

interface NavItem {
  id: string;
  label: string;
  icon?: React.ElementType;
  route?: string;
  children?: NavItem[];
}

interface AppSidebarProps {
  // Data source control props removed - now handled in Header
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, route: '/dashboard' },
  {
    id: 'tokens',
    label: 'Tokens',
    children: [
      { id: 'tokens', label: 'Tokens', icon: TokenIcon, route: '/tokens/tokens' },
      { id: 'collections', label: 'Collections', icon: Folders, route: '/tokens/collections' },
      { id: 'system-variables', label: 'System Variables', icon: Blend, route: '/tokens/system-variables' },
      { id: 'algorithms', label: 'Algorithms', icon: SquareFunction, route: '/tokens/algorithms' },
      { id: 'analysis', label: 'Analysis', icon: ChartNetwork, route: '/tokens/analysis' },
    ],
  },
  {
    id: 'setup',
    label: 'Setup',
    children: [
      { id: 'dimensions', label: 'Dimensions', icon: SquareStack, route: '/dimensions' },
      { id: 'classification', label: 'Classification', icon: Tag, route: '/classification' },
      { id: 'naming-rules', label: 'Naming Rules', icon: ListOrdered, route: '/naming-rules' },
      { id: 'value-types', label: 'Value Types', icon: PencilRuler, route: '/value-types' },
    ],
  },
  { id: 'themes', label: 'Themes', icon: Palette, route: '/themes' },
  {
    id: 'publishing',
    label: 'Publishing',
    children: [
      { id: 'platforms', label: 'Platforms', icon: MonitorSmartphone, route: '/platforms' },
      { id: 'export-settings', label: 'Export Settings', icon: Settings, route: '/export-settings' },
      { id: 'validation', label: 'Validation', icon: CircleCheckBig, route: '/validation' },
      { id: 'version-history', label: 'Version History', icon: History, route: '/version-history' },
    ],
  },
  { id: 'access', label: 'Access', icon: Users, route: '/access' },
  {
    id: 'schemas',
    label: 'Schemas',
    children: [
      { id: 'core-data', label: 'Core Data', icon: FileCode, route: '/schemas/core-data' },
      { id: 'theme-overrides', label: 'Theme Overrides', icon: FileCode, route: '/schemas/theme-overrides' },
      { id: 'algorithm-data', label: 'Algorithm Data', icon: FileCode, route: '/schemas/algorithm-data' },
    ],
  },
];

export const AppSidebar: React.FC<AppSidebarProps> = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { colorMode } = useColorMode();
  const location = useLocation();
  const bgColor = colorMode === 'dark' ? 'gray.800' : 'white';
  const borderColor = colorMode === 'dark' ? 'gray.700' : 'gray.200';

  const renderNavItem = (item: NavItem, isChild: boolean = false) => {
    const isActive = location.pathname === item.route;
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
        as={Link}
        to={item.route}
        display="flex"
        alignItems="center"
        p={2}
        borderRadius="md"
        bg={isActive ? 'blue.500' : 'transparent'}
        color={isActive ? 'white' : 'inherit'}
        _hover={{
          bg: isActive ? 'blue.600' : colorMode === 'dark' ? 'gray.700' : 'gray.100',
        }}
        cursor="pointer"
        role="menuitem"
        aria-current={isActive ? 'page' : undefined}
        tabIndex={0}
        textDecoration="none"
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
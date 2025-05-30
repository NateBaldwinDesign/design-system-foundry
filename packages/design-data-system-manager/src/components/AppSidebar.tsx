import React, { useState } from 'react';
import {
  Box,
  VStack,
  IconButton,
  Text,
  useColorMode,
  Tooltip,
  Button,
  Select,
  HStack,
} from '@chakra-ui/react';
import {
  Star,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Settings,
  LayoutDashboard,
  Hexagon,
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
  FileJson,
  FileCode
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import Logo from './Logo';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  route: string;
  children?: NavItem[];
}

interface AppSidebarProps {
  dataSource?: string;
  setDataSource?: (source: string) => void;
  dataOptions?: { label: string; value: string; filePath: string }[];
  onResetData?: () => void;
  onExportData?: () => void;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, route: '/dashboard' },
  {
    id: 'tokens',
    label: 'Tokens',
    icon: Star,
    route: '/tokens',
    children: [
      { id: 'tokens', label: 'Tokens', icon: Hexagon, route: '/tokens/tokens' },
      { id: 'collections', label: 'Collections', icon: Folders, route: '/tokens/collections' },
      { id: 'algorithms', label: 'Algorithms', icon: SquareFunction, route: '/tokens/algorithms' },
    ],
  },
  {
    id: 'schemas',
    label: 'Schemas',
    icon: FileJson,
    route: '/schemas',
    children: [
      { id: 'core-data', label: 'Core Data', icon: FileCode, route: '/schemas/core-data' },
      { id: 'theme-overrides', label: 'Theme Overrides', icon: FileCode, route: '/schemas/theme-overrides' },
    ],
  },
  {
    id: 'setup',
    label: 'Setup',
    icon: Settings,
    route: '/setup',
    children: [
      { id: 'dimensions', label: 'Dimensions', icon: SquareStack, route: '/setup/dimensions' },
      { id: 'classification', label: 'Classification', icon: Tag, route: '/setup/classification' },
      { id: 'naming-rules', label: 'Naming Rules', icon: ListOrdered, route: '/setup/naming-rules' },
      { id: 'value-types', label: 'Value Types', icon: PencilRuler, route: '/setup/value-types' },
    ],
  },
  { id: 'themes', label: 'Themes', icon: Palette, route: '/themes' },
  {
    id: 'publishing',
    label: 'Publishing',
    icon: Download,
    route: '/publishing',
    children: [
      { id: 'platforms', label: 'Platforms', icon: MonitorSmartphone, route: '/publishing/platforms' },
      { id: 'export-settings', label: 'Export Settings', icon: Settings, route: '/publishing/export-settings' },
      { id: 'validation', label: 'Validation', icon: CircleCheckBig, route: '/publishing/validation' },
      { id: 'version-history', label: 'Version History', icon: History, route: '/publishing/version-history' },
    ],
  },
  { id: 'access', label: 'Access', icon: Users, route: '/access' },
];

export const AppSidebar: React.FC<AppSidebarProps> = ({
  dataSource,
  setDataSource,
  dataOptions,
  onResetData,
  onExportData,
}: AppSidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { colorMode } = useColorMode();
  const location = useLocation();
  const bgColor = colorMode === 'dark' ? 'gray.800' : 'white';
  const borderColor = colorMode === 'dark' ? 'gray.700' : 'gray.200';

  const renderNavItem = (item: NavItem) => {
    const isActive = location.pathname === item.route;
    const Icon = item.icon;
    const content = (
      <Box
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
        <Icon size={20} />
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
      w={isCollapsed ? '64px' : '260px'}
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
        <Box p={4} borderBottom="1px" borderColor={borderColor} display="flex" gap={2} justifyContent="center" alignItems="center">
          <Logo size={34} color={colorMode === 'dark' ? 'white' : 'black'} />
          {/* Title */}
          {!isCollapsed && (
            <Text fontSize="md" lineHeight="1" fontWeight="bold">
              Design System<br/>Foundry
            </Text>
          )}
        </Box>

        {/* Collapse Toggle Button */}
        <Box p={2} borderBottom="1px" borderColor={borderColor}>
          <IconButton
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            icon={isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            w="full"
          />
        </Box>
        {/* Navigation Items */}
        <VStack spacing={1} align="stretch" p={4} flex={1}>
          {NAV_ITEMS.map((item) => {
            if (item.children) {
              return (
                <Box key={item.id}>
                  {renderNavItem(item)}
                  {!isCollapsed && (
                    <VStack spacing={1} align="stretch" ml={6} mt={1}>
                      {item.children.map((child) => renderNavItem(child))}
                    </VStack>
                  )}
                </Box>
              );
            }
            return renderNavItem(item);
          })}
        </VStack>
        {/* Data Source Controls (optional) */}
        {!isCollapsed && dataOptions && dataSource && setDataSource && onResetData && (
          <Box p={4} borderTop="1px" borderColor={borderColor}>
            <VStack spacing={2} align="stretch">
              <Select
                size="sm"
                value={dataSource}
                onChange={(e) => setDataSource(e.target.value)}
              >
                {dataOptions.map((option) => (
                  <option key={option.filePath} value={option.filePath}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </VStack>
          </Box>
        )}
         {!isCollapsed && dataOptions && dataSource && setDataSource && onResetData && (
            <HStack gap={2} p={2} borderTop="1px" borderColor={borderColor}>
              {/* Export Button (optional) */}
              {onExportData && (
                  <Button
                    size="sm"
                    leftIcon={<Download size={16} />}
                    onClick={onExportData}
                    variant="outline"
                    w="full"
                  >
                    {!isCollapsed && 'Export Data'}
                  </Button>
              )}
              <Button
                size="sm"
                leftIcon={<RefreshCw size={16} />}
                onClick={onResetData}
                variant="outline"
                w="full"
              >
                Reset Data
              </Button>
            </HStack>
         )}
      </VStack>
    </Box>
  );
}; 
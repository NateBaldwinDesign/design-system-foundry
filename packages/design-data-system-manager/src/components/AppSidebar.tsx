import React, { useState } from 'react';
import {
  Box,
  Stack,
  IconButton,
  Text,
  Button,
  Select,
  Tooltip,
  createListCollection,
} from '@chakra-ui/react';
import {
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
  MonitorSmartphone,
  CircleCheckBig,
  History,
  Users,
  FileCode,
  LucideIcon
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import Logo from './Logo';

interface NavItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  route?: string;
  children?: NavItem[];
}

interface AppSidebarProps {
  dataSource?: string;
  setDataSource?: (source: string) => void;
  dataOptions?: Array<{ filePath: string; label: string }>;
  onResetData?: () => void;
  onExportData?: () => void;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    route: '/'
  },
  {
    id: 'tokens',
    label: 'Tokens',
    icon: Hexagon,
    route: '/tokens'
  },
  {
    id: 'collections',
    label: 'Collections',
    icon: Folders,
    route: '/collections'
  },
  {
    id: 'value-types',
    label: 'Value Types',
    icon: SquareFunction,
    route: '/value-types'
  },
  {
    id: 'taxonomies',
    label: 'Taxonomies',
    icon: Tag,
    route: '/taxonomies'
  },
  {
    id: 'dimensions',
    label: 'Dimensions',
    icon: SquareStack,
    route: '/dimensions'
  },
  {
    id: 'naming-rules',
    label: 'Naming Rules',
    icon: ListOrdered,
    route: '/naming-rules'
  },
  {
    id: 'platforms',
    label: 'Platforms',
    icon: MonitorSmartphone,
    route: '/platforms'
  },
  {
    id: 'validation',
    label: 'Validation',
    icon: CircleCheckBig,
    route: '/validation'
  },
  {
    id: 'history',
    label: 'History',
    icon: History,
    route: '/history'
  },
  {
    id: 'users',
    label: 'Users',
    icon: Users,
    route: '/users'
  },
  {
    id: 'code',
    label: 'Code',
    icon: FileCode,
    route: '/code'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    route: '/settings'
  }
];

export const AppSidebar: React.FC<AppSidebarProps> = ({
  dataSource,
  setDataSource,
  dataOptions,
  onResetData,
  onExportData,
}: AppSidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const bgColor = 'gray.800';
  const borderColor = 'gray.700';

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
      <Link
        key={item.id}
        to={item.route || '#'}
        style={{ textDecoration: 'none' }}
      >
        <Box
          display="flex"
          alignItems="center"
          p={2}
          borderRadius="md"
          bg={isActive ? 'blue.500' : 'transparent'}
          color={isActive ? 'white' : 'inherit'}
          _hover={{
            bg: isActive ? 'blue.600' : 'gray.700',
          }}
          cursor="pointer"
          role="menuitem"
          aria-current={isActive ? 'page' : undefined}
          tabIndex={0}
        >
          {Icon && <Icon width={20} height={20} />}
          {!isCollapsed && (
            <Text ml={3} fontSize="sm">
              {item.label}
            </Text>
          )}
        </Box>
      </Link>
    );

    if (isCollapsed) {
      return (
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            {content}
          </Tooltip.Trigger>
          <Tooltip.Positioner>
            <Tooltip.Content>
              {item.label}
            </Tooltip.Content>
          </Tooltip.Positioner>
        </Tooltip.Root>
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
      <Stack gap={0} align="stretch" h="full">
        {/* Logo */}
        <Box p={4} borderBottom="1px" borderColor={borderColor} display="flex" gap={2} justifyContent="center" alignItems="center">
          <Logo size={34} color="white" />
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
            onClick={() => setIsCollapsed(!isCollapsed)}
            variant="ghost"
            size="sm"
            w="full"
          >
            {isCollapsed ? <ChevronRight width={16} height={16} /> : <ChevronLeft width={16} height={16} />}
          </IconButton>
        </Box>

        {/* Navigation Items */}
        <Stack gap={1} align="stretch" p={4} flex={1}>
          {NAV_ITEMS.map((item) => {
            if (item.children) {
              return (
                <Box key={item.id}>
                  {renderNavItem(item)}
                  <Stack key={`${item.id}-children`} gap={1} align="stretch" ml={0} mt={1}>
                    {item.children.map((child) => renderNavItem(child, true))}
                  </Stack>
                </Box>
              );
            }
            return renderNavItem(item);
          })}
        </Stack>

        {/* Data Source Controls (optional) */}
        {!isCollapsed && dataOptions && dataSource && setDataSource && onResetData && (
          <Box p={4} borderTop="1px" borderColor={borderColor}>
            <Stack gap={2} align="stretch">
              <Select.Root
                value={[dataSource]}
                onValueChange={(details) => {
                  const value = Array.isArray(details.value) ? details.value[0] : details.value;
                  setDataSource(value);
                }}
                collection={createListCollection({
                  items: dataOptions.map(opt => ({
                    value: opt.filePath,
                    label: opt.label
                  }))
                })}
              >
                <Select.HiddenSelect />
                <Select.Control>
                  <Select.Trigger>
                    <Select.ValueText placeholder="Select data source" />
                  </Select.Trigger>
                  <Select.IndicatorGroup>
                    <Select.Indicator />
                  </Select.IndicatorGroup>
                </Select.Control>
                <Select.Positioner>
                  <Select.Content>
                    {dataOptions.map((option) => (
                      <Select.Item key={option.filePath} item={{ value: option.filePath, label: option.label }}>
                        {option.label}
                        <Select.ItemIndicator />
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Positioner>
              </Select.Root>
            </Stack>
          </Box>
        )}

        {!isCollapsed && dataOptions && dataSource && setDataSource && onResetData && (
          <Stack direction="row" gap={2} p={2} borderTop="1px" borderColor={borderColor}>
            {/* Export Button (optional) */}
            {onExportData && (
              <Button
                size="sm"
                variant="outline"
                onClick={onExportData}
              >
                <Download width={16} height={16} style={{ marginRight: '8px' }} />
                Export
              </Button>
            )}
            {/* Reset Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={onResetData}
            >
              <RefreshCw width={16} height={16} style={{ marginRight: '8px' }} />
              Reset
            </Button>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}; 
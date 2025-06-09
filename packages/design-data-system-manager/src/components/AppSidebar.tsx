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
          {Icon && <Icon size={20} />}
          {!isCollapsed && (
            <Text ml={3} fontSize="sm">
              {item.label}
            </Text>
          )}
        </Box>
      </Link>
    );

    // Wrap in tooltip if collapsed
    if (isCollapsed && Icon) {
      return (
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            {content}
          </Tooltip.Trigger>
          <Tooltip.Positioner>
            <Tooltip.Content>
              <Tooltip.Arrow />
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
      position="fixed"
      left={0}
      top={0}
      bottom={0}
      width={isCollapsed ? '60px' : '240px'}
      bg={bgColor}
      borderRight="1px"
      borderColor={borderColor}
      transition="width 0.2s"
      zIndex={10}
    >
      <Stack h="full" gap={0}>
        <Box p={4} borderBottom="1px" borderColor={borderColor}>
          <Logo />
        </Box>

        <Box flex="1" overflowY="auto" py={4}>
          <Stack gap={1}>
            {NAV_ITEMS.map(item => renderNavItem(item))}
          </Stack>
        </Box>

        {dataSource && setDataSource && dataOptions && (
          <Box p={4} borderTop="1px" borderColor={borderColor}>
            <Stack gap={4}>
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
                <Select.Trigger>
                  <Select.ValueText placeholder="Select data source" />
                </Select.Trigger>
                <Select.Positioner>
                  <Select.Content>
                    {dataOptions.map(option => (
                      <Select.Item key={option.filePath} item={{ value: option.filePath, label: option.label }}>
                        {option.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Positioner>
              </Select.Root>

              <Stack direction="row" gap={2}>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onResetData}
                >
                  <RefreshCw size={16} style={{ marginRight: '8px' }} />
                  Reset
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onExportData}
                >
                  <Download size={16} style={{ marginRight: '8px' }} />
                  Export
                </Button>
              </Stack>
            </Stack>
          </Box>
        )}

        <Box p={2} borderTop="1px" borderColor={borderColor}>
          <IconButton
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setIsCollapsed(!isCollapsed)}
            variant="ghost"
            size="sm"
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </IconButton>
        </Box>
      </Stack>
    </Box>
  );
}; 
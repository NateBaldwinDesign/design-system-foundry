import React from "react";
import { 
  Flex, 
  Heading, 
  HStack, 
  FormControl, 
  FormLabel, 
  Select, 
  Button, 
  Box
} from '@chakra-ui/react';

interface HeaderProps {
  dataSource: string;
  setDataSource: (v: string) => void;
  dataOptions: { label: string; value: string; filePath: string }[];
  handleResetData: () => void;
  handleExportData: () => void;
  activeView: string;
  onViewChange: (view: string) => void;
}

const NAV_VIEWS = [
  { key: 'tokens', label: 'Tokens' },
  { key: 'setup', label: 'Setup' },
  { key: 'themes', label: 'Themes' },
  { key: 'publishing', label: 'Publishing' },
  { key: 'access', label: 'Access' }
];

const Header: React.FC<HeaderProps> = ({
  dataSource,
  setDataSource,
  dataOptions,
  handleResetData,
  handleExportData,
  activeView,
  onViewChange
}) => {
  return (
    <Box as="header" position="sticky" top={0} zIndex={1} bg="chakra-body-bg" borderBottom="1px" borderColor="chakra-border-color" p={4}>
      <Flex justify="space-between" align="center">
        <Heading size="xl">DDSM</Heading>
        <HStack spacing={4}>
          {NAV_VIEWS.map(view => (
            <Button
              key={view.key}
              variant={activeView === view.key ? 'solid' : 'ghost'}
              colorScheme={activeView === view.key ? 'blue' : undefined}
              onClick={() => onViewChange(view.key)}
            >
              {view.label}
            </Button>
          ))}
        </HStack>
        <HStack spacing={6}>
          <FormControl w="250px">
            <FormLabel htmlFor="data-source-picker" mb={0} fontWeight="semibold" fontSize="sm">Data Source</FormLabel>
            <Select
              id="data-source-picker"
              value={dataSource}
              onChange={e => setDataSource(e.target.value)}
              size="md"
              bg="chakra-body-bg"
            >
              {dataOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          </FormControl>
          <Button onClick={handleResetData} colorScheme="gray">
            Reset Data
          </Button>
          <Button onClick={handleExportData} colorScheme="green">
            Export Data
          </Button>
        </HStack>
      </Flex>
    </Box>
  );
};

export default Header; 
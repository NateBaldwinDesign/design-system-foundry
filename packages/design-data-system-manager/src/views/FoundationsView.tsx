import React from 'react';
import {
  Box,
  Text,
  VStack,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useColorMode,
  HStack,
} from '@chakra-ui/react';
import { PageTemplate } from '../components/PageTemplate';
import { CircleSmall, Icon, Palette, PenTool, Ruler, Type } from 'lucide-react';

interface FoundationsViewProps {
  canEdit?: boolean;
}

const FoundationsView: React.FC<FoundationsViewProps> = ({ canEdit = false }) => {
  const { colorMode } = useColorMode();

  return (
    <PageTemplate
      title="Foundations"
    >
      <>
        <Tabs colorScheme="blue">
          <TabList mb={8}>
            <Tab><HStack gap={2}><Type size={16} /> <Text>Typography</Text></HStack></Tab>
            <Tab><HStack gap={2}><PenTool size={16} /> <Text>Iconography</Text></HStack></Tab>
            <Tab><HStack gap={2}><Ruler size={16} /> <Text>Spacing</Text></HStack></Tab>
            <Tab><HStack gap={2}><Palette size={16} /> <Text>Color</Text></HStack></Tab>
          </TabList>

          <TabPanels>
            <TabPanel  p={0} m={0}>
                <Box p={4} mb={4} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
                    Typography here
                </Box>
            </TabPanel>

            <TabPanel  p={0} m={0}>
                <Box p={4} mb={4} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
                    Iconography here
                </Box>
            </TabPanel>

            <TabPanel  p={0} m={0}>
                <Box p={4} mb={4} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
                    Spacing here
                </Box>
            </TabPanel>

            <TabPanel  p={0} m={0}>
                <Box p={4} mb={4} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
                    Color here
                </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </>
    </PageTemplate>
  );
};

export default FoundationsView;

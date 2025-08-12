import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,

  Card,
  CardBody,
  CardHeader,
  Heading,
  SimpleGrid,
  Badge,
  Alert,
  AlertIcon,
  AlertDescription,
  Spinner,
  Center,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel
} from '@chakra-ui/react';
import { RefreshCw } from 'lucide-react';
import { PageTemplate } from '../components/PageTemplate';
import { NetworkDiagram } from '../components/visualizations/NetworkDiagram';
import { CirclePack } from '../components/visualizations/CirclePack';
import { VisualizationContainer, VisualizationToolbar, VisualizationLegend } from '../components/visualizations/shared';
import { DataTransformationService } from '../services/visualizations';
import { StorageService } from '../services/storage';
import { useTabState } from '../hooks/useTabState';
import type { 
  TokenDependencyGraph,
  CirclePackResult,
  LegendItem
} from '../services/visualizations/types';
import type { FilterOptions } from '../services/visualizations/types/network-data';
import type { NetworkDiagramRef as ComponentRef } from '../components/visualizations/NetworkDiagram/types';
import type { CirclePackRef, D3CirclePackNode } from '../components/visualizations/CirclePack/types';

const AnalysisView: React.FC = () => {
  // Use tab state management with URL parameters
  const { currentTab, navigateToTab } = useTabState('analysis', 0);
  
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [networkData, setNetworkData] = useState<TokenDependencyGraph | null>(null);
  const [circlePackData, setCirclePackData] = useState<CirclePackResult | null>(null);
  const [currentLayout, setCurrentLayout] = useState<'force' | 'hierarchical' | 'circular'>('force');

  const [showLabels] = useState(true);
  const [showStatistics] = useState(true);
  const [filterOptions] = useState<FilterOptions>({
    hideIsolatedNodes: false,
    showOnlyCircular: false
  });

  // Component refs
  const networkDiagramRef = useRef<ComponentRef>(null);
  const circlePackRef = useRef<CirclePackRef>(null);

  // Load and transform data
  const loadAnalysisData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get merged data from storage
      const mergedData = StorageService.getMergedData();
      if (!mergedData) {
        throw new Error('No data available for analysis. Please load a design system first.');
      }

      console.log('[AnalysisView] Loading analysis data:', {
        tokenCount: mergedData.tokens?.length || 0,
        hasResolvedValueTypes: !!mergedData.resolvedValueTypes
      });

      // Transform data using the visualization service
      const transformationService = DataTransformationService.getInstance();
      
      // Transform for network diagram
      const transformedNetworkData = await transformationService.transformMergedData<TokenDependencyGraph>(
        mergedData,
        'network',
        {
          layout: { type: currentLayout, clustering: true },
          metadata: { generatedBy: 'AnalysisView' }
        }
      );

      // Transform for circle pack
      const transformedCirclePackData = await transformationService.transformMergedData<CirclePackResult>(
        mergedData,
        'circlePack',
        {
          metadata: { generatedBy: 'AnalysisView' }
        }
      );

      setNetworkData(transformedNetworkData);
      setCirclePackData(transformedCirclePackData);
      console.log('[AnalysisView] Analysis data loaded successfully:', {
        networkNodes: transformedNetworkData.nodes.length,
        networkEdges: transformedNetworkData.edges.length,
        circlePackNodes: transformedCirclePackData.data.children?.length || 0,
        circularDependencies: transformedNetworkData.circularDependencies.length
      });

    } catch (err) {
      console.error('[AnalysisView] Error loading analysis data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analysis data');
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadAnalysisData();
  }, []);

  // Create legend items from network data
  const legendItems: LegendItem[] = networkData ? [
    {
      id: 'base-tokens',
      label: 'Base Tokens',
      color: '#48BB78',
      shape: 'circle',
      count: networkData.nodes.filter(n => n.type === 'base').length
    },
    {
      id: 'alias-tokens',
      label: 'Alias Tokens',
      color: '#4299E1',
      shape: 'circle',
      count: networkData.nodes.filter(n => n.type === 'alias').length
    },
    {
      id: 'circular-deps',
      label: 'Circular Dependencies',
      color: '#F56565',
      shape: 'circle',
      count: networkData.nodes.filter(n => n.hasCircularDependency).length
    },
    {
      id: 'direct-deps',
      label: 'Direct Dependencies',
      color: '#4A5568',
      shape: 'line',
      count: networkData.edges.filter(e => e.type === 'direct').length
    },
    {
      id: 'circular-edges',
      label: 'Circular References',
      color: '#F56565',
      shape: 'line',
      count: networkData.edges.filter(e => e.type === 'circular').length
    }
  ] : [];

  // Toolbar handlers
  const handleZoomIn = () => networkDiagramRef.current?.zoomIn();
  const handleZoomOut = () => networkDiagramRef.current?.zoomOut();
  const handleReset = () => networkDiagramRef.current?.resetView();
  const handleLayoutChange = (newLayout: string) => {
    setCurrentLayout(newLayout as 'force' | 'hierarchical' | 'circular');
    networkDiagramRef.current?.changeLayout(newLayout as 'force' | 'hierarchical' | 'circular');
  };
  const handleExport = (format: 'png' | 'svg' | 'json') => {
    networkDiagramRef.current?.exportVisualization(format);
  };


  const handleCirclePackNodeClick = (node: D3CirclePackNode) => {
    console.log('[AnalysisView] Circle pack node clicked:', node);
  };
  const handleCirclePackZoomChange = (path: string[]) => {
    console.log('[AnalysisView] Circle pack zoom changed:', path);
  };

  // Statistics display
  const renderStatistics = () => {
    if (!networkData || !showStatistics) return null;

    const stats = networkData.statistics;
    return (
      <Card>
        <CardHeader>
          <Heading size="sm">Dependency Statistics</Heading>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={2} spacing={4}>
            <Box>
              <Text fontSize="sm" color="gray.600">Total Tokens</Text>
              <Text fontSize="lg" fontWeight="bold">{stats.totalTokens}</Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.600">Dependencies</Text>
              <Text fontSize="lg" fontWeight="bold">{stats.totalDependencies}</Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.600">Max Depth</Text>
              <Text fontSize="lg" fontWeight="bold">{stats.maxDependencyDepth}</Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.600">Avg Depth</Text>
              <Text fontSize="lg" fontWeight="bold">{stats.avgDependencyDepth.toFixed(1)}</Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.600">Isolated Tokens</Text>
              <Text fontSize="lg" fontWeight="bold">{stats.isolatedTokens}</Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.600">Circular Issues</Text>
              <Badge colorScheme={stats.circularDependencies > 0 ? 'red' : 'green'}>
                {stats.circularDependencies}
              </Badge>
            </Box>
          </SimpleGrid>
          
          {stats.mostReferencedToken && (
            <Box mt={4}>
              <Text fontSize="sm" color="gray.600">Most Referenced</Text>
              <Text fontSize="md" fontWeight="medium">
                {stats.mostReferencedToken.name} ({stats.mostReferencedToken.referenceCount} refs)
              </Text>
            </Box>
          )}
        </CardBody>
      </Card>
    );
  };

  // Render loading state
  if (isLoading) {
    return (
      <PageTemplate title="Analysis">
        <Center h="400px">
          <VStack spacing={4}>
            <Spinner size="xl" color="blue.500" />
            <Text>Analyzing token dependencies...</Text>
          </VStack>
        </Center>
      </PageTemplate>
    );
  }

  // Render error state
  if (error) {
    return (
      <PageTemplate title="Analysis">
        <Alert status="error">
          <AlertIcon />
          <VStack align="start" spacing={2}>
            <AlertDescription fontWeight="medium">
              {error}
            </AlertDescription>
            <Button
              size="sm"
              leftIcon={<RefreshCw size={16} />}
              onClick={loadAnalysisData}
              colorScheme="red"
              variant="outline"
            >
              Retry
            </Button>
          </VStack>
        </Alert>
      </PageTemplate>
    );
  }

  // Render main analysis view
  return (
    <PageTemplate title="Analysis" maxWidth="100%">
      <Tabs index={currentTab} onChange={navigateToTab}>
        <TabList>
          <Tab>System</Tab>
          <Tab>Tokens</Tab>
          <Tab>Modes</Tab>
          <Tab>Platforms & Themes</Tab>
          <Tab>Taxonomies</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <VStack spacing={6} align="stretch">
              {/* Circle Pack Visualization */}
              <Card>
                <CardHeader>
                  <Heading size="md">System Overview</Heading>
                  <Text fontSize="sm" color="gray.600">
                    Interactive visualization of your entire design system ecosystem
                  </Text>
                </CardHeader>
                <CardBody>
                  <HStack align="start" spacing={6}>
                    {/* Circle Pack */}
                    <Box flex={1}>
                      <VisualizationContainer
                        height={600}
                      >
                        {circlePackData && (
                          <CirclePack
                            ref={circlePackRef}
                            data={circlePackData.data}

                            onNodeClick={handleCirclePackNodeClick}
                            onZoomChange={handleCirclePackZoomChange}
                            width={800}
                            height={600}
                            showLabels={true}
                            showBreadcrumbs={true}
                            interactive={true}
                          />
                        )}
                      </VisualizationContainer>
                    </Box>

                    {/* System Statistics */}
                    <Box minW="250px">
                      {circlePackData && (
                        <Card>
                          <CardHeader>
                            <Heading size="sm">System Statistics</Heading>
                          </CardHeader>
                          <CardBody>
                            <VStack spacing={4} align="stretch">
                              <SimpleGrid columns={1} spacing={3}>
                                <Box>
                                  <Text fontSize="sm" color="gray.600">Total Nodes</Text>
                                  <Text fontSize="lg" fontWeight="bold">{circlePackData.statistics.totalNodes}</Text>
                                </Box>
                              <Box>
                                <Text fontSize="sm" color="gray.600">Core Entities</Text>
                                <Text fontSize="lg" fontWeight="bold">{circlePackData.statistics.totalCoreEntities}</Text>
                              </Box>
                              <Box>
                                <Text fontSize="sm" color="gray.600">Platforms</Text>
                                <Text fontSize="lg" fontWeight="bold">{circlePackData.statistics.totalPlatforms}</Text>
                              </Box>
                              <Box>
                                <Text fontSize="sm" color="gray.600">Themes</Text>
                                <Text fontSize="lg" fontWeight="bold">{circlePackData.statistics.totalThemes}</Text>
                              </Box>
                              <Box>
                                <Text fontSize="sm" color="gray.600">Max Depth</Text>
                                <Text fontSize="lg" fontWeight="bold">{circlePackData.statistics.maxDepth}</Text>
                              </Box>
                              <Box>
                                <Text fontSize="sm" color="gray.600">Avg Depth</Text>
                                <Text fontSize="lg" fontWeight="bold">{circlePackData.statistics.averageDepth.toFixed(1)}</Text>
                              </Box>
                            </SimpleGrid>
                          </VStack>
                        </CardBody>
                        </Card>
                      )}
                    </Box>
                  </HStack>
                </CardBody>
              </Card>
            </VStack>
          </TabPanel>
          <TabPanel>
            <VStack spacing={6} align="stretch">
              {/* Token Dependency Network */}
              <Card>
                <CardHeader>
                  <Heading size="md">Token Dependency Network</Heading>
                  <Text fontSize="sm" color="gray.600">
                    Interactive visualization showing token alias relationships and circular dependencies
                  </Text>
                </CardHeader>
                <CardBody>
                  <HStack align="start" spacing={6}>
                    {/* Visualization */}
                    <Box flex={1}>
                      <VisualizationContainer
                        toolbar={
                          <VisualizationToolbar
                            onZoomIn={handleZoomIn}
                            onZoomOut={handleZoomOut}
                            onReset={handleReset}
                            onExport={handleExport}
                            onLayoutChange={handleLayoutChange}
                            availableLayouts={['force', 'hierarchical', 'circular']}
                            currentLayout={currentLayout}
                          />
                        }
                        legend={
                          <VisualizationLegend
                            items={legendItems}
                            title="Legend"
                          />
                        }
                        height={500}
                      >
                        {networkData && (
                          <NetworkDiagram
                            ref={networkDiagramRef}
                            data={networkData}
                            layout={currentLayout}
                            showLabels={showLabels}
                            showStatistics={showStatistics}
                            width={700}
                            height={500}
                            clustered={true}
                            filterOptions={filterOptions}
                            onNodeClick={(node) => {
                              console.log('[AnalysisView] Node clicked:', node);
                            }}
                            onNodeHover={() => {
                              // Hover feedback is handled by the NetworkDiagram component
                            }}
                          />
                        )}
                      </VisualizationContainer>
                    </Box>

                    {/* Statistics Sidebar */}
                    <Box minW="250px">
                      {renderStatistics()}
                    </Box>
                  </HStack>
                </CardBody>
              </Card>

              
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
      
    </PageTemplate>
  );
};

export default AnalysisView;

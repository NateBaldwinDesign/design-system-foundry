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
import { ChordDiagram } from '../components/visualizations/ChordDiagram';
import { VisualizationContainer, VisualizationToolbar, VisualizationLegend } from '../components/visualizations/shared';
import { DataTransformationService } from '../services/visualizations';
import { StorageService } from '../services/storage';
import type { 
  TokenDependencyGraph,
  ChordDiagramData,
  LegendItem
} from '../services/visualizations/types';
import type { FilterOptions } from '../services/visualizations/types/network-data';
import type { NetworkDiagramRef as ComponentRef } from '../components/visualizations/NetworkDiagram/types';

const AnalysisView: React.FC = () => {
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [networkData, setNetworkData] = useState<TokenDependencyGraph | null>(null);
  const [chordData, setChordData] = useState<ChordDiagramData | null>(null);
  const [currentLayout, setCurrentLayout] = useState<'force' | 'hierarchical' | 'circular'>('force');
  const [showLabels] = useState(true);
  const [showStatistics] = useState(true);
  const [filterOptions] = useState<FilterOptions>({
    hideIsolatedNodes: false,
    showOnlyCircular: false
  });

  // Component ref
  const networkDiagramRef = useRef<ComponentRef>(null);

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

      // Transform for chord diagram
      const transformedChordData = await transformationService.transformMergedData<ChordDiagramData>(
        mergedData,
        'chord',
        {
          metadata: { generatedBy: 'AnalysisView' }
        }
      );

      setNetworkData(transformedNetworkData);
      setChordData(transformedChordData);
      console.log('[AnalysisView] Analysis data loaded successfully:', {
        networkNodes: transformedNetworkData.nodes.length,
        networkEdges: transformedNetworkData.edges.length,
        chordNodes: transformedChordData.nodes.length,
        chordLinks: transformedChordData.links.length,
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
      <Tabs>
        <TabList>
          <Tab>System</Tab>
          <Tab>Tokens</Tab>
          <Tab>Modes</Tab>
          <Tab>Platforms & Themes</Tab>
          <Tab>Taxonomies</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            {/* System analysis visualizations go here */}
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

              {/* Mode & Platform Analysis Chord Diagram */}
              <Card>
                <CardHeader>
                  <Heading size="md">Mode & Platform Relationships</Heading>
                  <Text fontSize="sm" color="gray.600">
                    Chord diagram showing token value flows between different mode states and platform overrides
                  </Text>
                </CardHeader>
                <CardBody>
                  <HStack align="start" spacing={6}>
                    {/* Chord Diagram */}
                    <Box flex={1}>
                      <VisualizationContainer
                        height={500}
                      >
                        {chordData && (
                          <ChordDiagram
                            data={chordData}
                            showLabels={showLabels}
                            showStatistics={false}
                            width={500}
                            height={500}
                            interactive={true}
                            onNodeClick={(node) => {
                              console.log('[AnalysisView] Chord node clicked:', node);
                            }}
                            onLinkClick={(link) => {
                              console.log('[AnalysisView] Chord link clicked:', link);
                            }}
                          />
                        )}
                      </VisualizationContainer>
                    </Box>

                    {/* Chord Statistics */}
                    <Box minW="300px">
                      {chordData && (
                        <Card>
                          <CardHeader>
                            <Heading size="sm">Mode Analysis</Heading>
                          </CardHeader>
                          <CardBody>
                            <SimpleGrid columns={1} spacing={3}>
                              <Box>
                                <Text fontSize="sm" color="gray.600">Total Modes</Text>
                                <Text fontSize="lg" fontWeight="bold">{chordData.statistics.totalModes}</Text>
                              </Box>
                              <Box>
                                <Text fontSize="sm" color="gray.600">Mode Conflicts</Text>
                                <Text fontSize="lg" fontWeight="bold">{chordData.statistics.totalConflicts}</Text>
                              </Box>
                              <Box>
                                <Text fontSize="sm" color="gray.600">Coupling Score</Text>
                                <Badge colorScheme={chordData.statistics.modeCouplingScore > 0.7 ? 'red' : 'green'}>
                                  {(chordData.statistics.modeCouplingScore * 100).toFixed(0)}%
                                </Badge>
                              </Box>
                              <Box>
                                <Text fontSize="sm" color="gray.600">Platform Complexity</Text>
                                <Badge colorScheme={chordData.statistics.platformComplexityScore > 0.7 ? 'red' : 'green'}>
                                  {(chordData.statistics.platformComplexityScore * 100).toFixed(0)}%
                                </Badge>
                              </Box>
                            </SimpleGrid>
                            
                            {chordData.statistics.recommendations.length > 0 && (
                              <Box mt={4}>
                                <Text fontSize="sm" fontWeight="bold" mb={2}>Recommendations</Text>
                                {chordData.statistics.recommendations.slice(0, 3).map((rec, index) => (
                                  <Alert key={index} status={rec.severity === 'error' ? 'error' : 'warning'} size="sm" mb={2}>
                                    <AlertIcon />
                                    <Box>
                                      <Text fontSize="xs" fontWeight="bold">{rec.title}</Text>
                                      <Text fontSize="xs">{rec.description}</Text>
                                    </Box>
                                  </Alert>
                                ))}
                              </Box>
                            )}
                          </CardBody>
                        </Card>
                      )}
                    </Box>
                  </HStack>
                </CardBody>
              </Card>

              {/* Circular Dependencies Alert */}
              {networkData && networkData.circularDependencies.length > 0 && (
                <Alert status="warning">
                  <AlertIcon />
                  <Box>
                    <Text fontWeight="bold">
                      {networkData.circularDependencies.length} Circular Dependencies Detected
                    </Text>
                    <Text fontSize="sm">
                      These may cause issues in your design system. Click on highlighted nodes to explore the dependency chains.
                    </Text>
                  </Box>
                </Alert>
              )}
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
      
    </PageTemplate>
  );
};

export default AnalysisView;

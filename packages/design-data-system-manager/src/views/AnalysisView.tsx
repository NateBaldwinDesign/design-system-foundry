import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Select,
  Switch,
  FormControl,
  FormLabel,
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
  Center
} from '@chakra-ui/react';
import { RefreshCw } from 'lucide-react';
import { PageTemplate } from '../components/PageTemplate';
import { NetworkDiagram } from '../components/visualizations/NetworkDiagram';
import { VisualizationContainer, VisualizationToolbar, VisualizationLegend } from '../components/visualizations/shared';
import { DataTransformationService } from '../services/visualizations';
import { StorageService } from '../services/storage';
import type { 
  TokenDependencyGraph, 
  LegendItem
} from '../services/visualizations/types';
import type { FilterOptions } from '../services/visualizations/types/network-data';
import type { NetworkDiagramRef as ComponentRef } from '../components/visualizations/NetworkDiagram/types';

const AnalysisView: React.FC = () => {
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [networkData, setNetworkData] = useState<TokenDependencyGraph | null>(null);
  const [currentLayout, setCurrentLayout] = useState<'force' | 'hierarchical' | 'circular'>('force');
  const [showLabels, setShowLabels] = useState(true);
  const [showStatistics] = useState(true);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
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
      const transformedData = await transformationService.transformMergedData<TokenDependencyGraph>(
        mergedData,
        'network',
        {
          layout: { type: currentLayout, clustering: true },
          metadata: { generatedBy: 'AnalysisView' }
        }
      );

      setNetworkData(transformedData);
      console.log('[AnalysisView] Analysis data loaded successfully:', {
        nodeCount: transformedData.nodes.length,
        edgeCount: transformedData.edges.length,
        circularDependencies: transformedData.circularDependencies.length
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
    <PageTemplate title="Token Dependency Analysis">
      <VStack spacing={6} align="stretch">
        {/* Main Content */}
        <HStack align="start" spacing={6}>
          {/* Visualization */}
          <Box flex={1}>
            <VisualizationContainer
              title="Token Dependency Network"
              description="Interactive visualization showing token alias relationships and circular dependencies"
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
              height={600}
            >
              {networkData && (
                <NetworkDiagram
                  ref={networkDiagramRef}
                  data={networkData}
                  layout={currentLayout}
                  showLabels={showLabels}
                  showStatistics={showStatistics}
                  width={800}
                  height={600}
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
    </PageTemplate>
  );
};

export default AnalysisView;

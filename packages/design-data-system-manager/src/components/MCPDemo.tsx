import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  VStack,
  HStack,
  Select,
  Textarea,
  Badge,
  Alert,
  AlertIcon,
  Code,
  Divider,
  List,
  ListItem,
  ListIcon
} from '@chakra-ui/react';
import type { TokenSystem } from '@token-model/data-model';
import { MCPIntegration, MCPGenerator, type MCPQuery, type MCPResponse } from '../services/mcp';

interface MCPDemoProps {
  schema: TokenSystem;
}

export const MCPDemo: React.FC<MCPDemoProps> = ({ schema }) => {
  const [mcpIntegration, setMcpIntegration] = useState<MCPIntegration | null>(null);
  const [mcpGenerator, setMcpGenerator] = useState<MCPGenerator | null>(null);
  const [selectedQueryType, setSelectedQueryType] = useState<string>('schema');
  const [selectedOperation, setSelectedOperation] = useState<string>('');
  const [queryParameters, setQueryParameters] = useState<string>('');
  const [mcpResponse, setMcpResponse] = useState<MCPResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize MCP services
    const integration = new MCPIntegration();
    integration.initializeContext(schema);
    setMcpIntegration(integration);

    const generator = new MCPGenerator();
    setMcpGenerator(generator);
  }, [schema]);

  const handleExecuteQuery = async () => {
    if (!mcpIntegration) return;

    setIsLoading(true);
    setError(null);
    setMcpResponse(null);

    try {
      let parameters: Record<string, unknown> = {};
      if (queryParameters.trim()) {
        try {
          parameters = JSON.parse(queryParameters);
        } catch (e) {
          throw new Error('Invalid JSON in parameters');
        }
      }

      const query: MCPQuery = {
        type: selectedQueryType as 'schema' | 'transformation' | 'customer' | 'validation' | 'analytics',
        operation: selectedOperation,
        parameters
      };

      const response = await mcpIntegration.executeQuery(query);
      setMcpResponse(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateCustomerMCP = async () => {
    if (!mcpGenerator) return;

    setIsLoading(true);
    setError(null);

    try {
      const customerMCP = await mcpGenerator.generateCustomerMCP(schema, {
        customerId: 'demo-customer',
        customerName: 'Demo Customer',
        includeTransformations: true,
        includeAnalytics: true
      });

      console.log('Generated Customer MCP:', customerMCP);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate customer MCP');
    } finally {
      setIsLoading(false);
    }
  };

  const getAvailableOperations = () => {
    switch (selectedQueryType) {
      case 'schema':
        return [
          'getResolvedValueTypes',
          'getTokenCollections',
          'getDimensions',
          'getTokens',
          'getPlatforms',
          'getThemes',
          'getTaxonomies',
          'getTokensByCollection',
          'getTokensByValueType',
          'getCompatibleCollections',
          'getModesByDimension',
          'getTokensByTier',
          'getPrivateTokens',
          'getPublicTokens',
          'searchTokens',
          'searchCollections',
          'searchDimensions',
          'getSystemInfo'
        ];
      case 'transformation':
        return [
          'getAvailableTransformers',
          'getTransformerCapabilities',
          'transformToFigma',
          'transformToCSS',
          'transformToDesignTokens',
          'transformToSCSS',
          'transformToJSON',
          'transformToTypeScript',
          'validateTransformationConfig',
          'validateSourceForTransformation',
          'getTransformationConfig'
        ];
      case 'validation':
        return [
          'validateToken',
          'validateCollection',
          'validateDimension',
          'validateCustomerToken',
          'validateCustomerCollection',
          'validateCustomerDimension'
        ];
      case 'analytics':
        return [
          'getCustomerAnalytics',
          'getSystemAnalytics'
        ];
      default:
        return [];
    }
  };

  const getMCPContext = () => {
    return mcpIntegration?.generateMCPContext() || 'MCP not initialized';
  };

  return (
    <Box p={6}>
      <VStack spacing={6} align="stretch">
        <Card>
          <CardHeader>
            <Heading size="md">MCP (Model Context Protocol) Demo</Heading>
            <Text fontSize="sm" color="gray.600" mt={2}>
              Test structured, type-safe access to design token system data
            </Text>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <HStack spacing={4}>
                <Box flex={1}>
                  <Text fontSize="sm" fontWeight="bold" mb={2}>
                    Query Type
                  </Text>
                  <Select
                    value={selectedQueryType}
                    onChange={(e) => {
                      setSelectedQueryType(e.target.value);
                      setSelectedOperation('');
                    }}
                  >
                    <option value="schema">Schema</option>
                    <option value="transformation">Transformation</option>
                    <option value="customer">Customer</option>
                    <option value="validation">Validation</option>
                    <option value="analytics">Analytics</option>
                  </Select>
                </Box>
                <Box flex={1}>
                  <Text fontSize="sm" fontWeight="bold" mb={2}>
                    Operation
                  </Text>
                  <Select
                    value={selectedOperation}
                    onChange={(e) => setSelectedOperation(e.target.value)}
                    placeholder="Select operation"
                  >
                    {getAvailableOperations().map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </Select>
                </Box>
              </HStack>

              <Box>
                <Text fontSize="sm" fontWeight="bold" mb={2}>
                  Parameters (JSON)
                </Text>
                <Textarea
                  value={queryParameters}
                  onChange={(e) => setQueryParameters(e.target.value)}
                  placeholder='{"collectionId": "example-collection"}'
                  rows={3}
                />
              </Box>

              <HStack spacing={4}>
                <Button
                  colorScheme="blue"
                  onClick={handleExecuteQuery}
                  isLoading={isLoading}
                  loadingText="Executing..."
                  isDisabled={!selectedOperation}
                >
                  Execute MCP Query
                </Button>
                <Button
                  colorScheme="green"
                  onClick={handleGenerateCustomerMCP}
                  isLoading={isLoading}
                  loadingText="Generating..."
                >
                  Generate Customer MCP
                </Button>
              </HStack>

              {error && (
                <Alert status="error">
                  <AlertIcon />
                  {error}
                </Alert>
              )}

              {mcpResponse && (
                <Card>
                  <CardHeader>
                    <Heading size="sm">MCP Response</Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack spacing={3} align="stretch">
                      <HStack>
                        <Badge
                          colorScheme={mcpResponse.success ? 'green' : 'red'}
                        >
                          {mcpResponse.success ? 'Success' : 'Error'}
                        </Badge>
                        {mcpResponse.metadata && (
                          <Text fontSize="sm" color="gray.600">
                            Execution time: {mcpResponse.metadata.executionTime}ms
                          </Text>
                        )}
                      </HStack>

                      {mcpResponse.error && (
                        <Alert status="error">
                          <AlertIcon />
                          {mcpResponse.error}
                        </Alert>
                      )}

                      {mcpResponse.warnings && mcpResponse.warnings.length > 0 && (
                        <Alert status="warning">
                          <AlertIcon />
                                                     <VStack align="start" spacing={1}>
                             {mcpResponse.warnings.map((warning, index) => (
                               <Text key={index}>{String(warning)}</Text>
                             ))}
                           </VStack>
                        </Alert>
                      )}

                      {mcpResponse.data && (
                        <Box>
                          <Text fontSize="sm" fontWeight="bold" mb={2}>
                            Data:
                          </Text>
                          <Code p={3} borderRadius="md" display="block" whiteSpace="pre-wrap">
                            {JSON.stringify(mcpResponse.data, null, 2)}
                          </Code>
                        </Box>
                      )}
                    </VStack>
                  </CardBody>
                </Card>
              )}
            </VStack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <Heading size="md">MCP Context</Heading>
            <Text fontSize="sm" color="gray.600" mt={2}>
              Current MCP context and available functions
            </Text>
          </CardHeader>
          <CardBody>
            <Code p={4} borderRadius="md" display="block" whiteSpace="pre-wrap" fontSize="sm">
              {getMCPContext()}
            </Code>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <Heading size="md">MCP Features</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Box>
                <Heading size="sm" mb={3}>Schema Access</Heading>
                <List spacing={2}>
                  <ListItem>
                                      <ListIcon color="green.500" />
                  Query tokens, collections, dimensions, and value types
                </ListItem>
                <ListItem>
                  <ListIcon color="green.500" />
                  Search functionality with filters
                </ListItem>
                <ListItem>
                  <ListIcon color="green.500" />
                  Relationship queries (tokens by collection, etc.)
                </ListItem>
                </List>
              </Box>

              <Divider />

              <Box>
                <Heading size="sm" mb={3}>Data Transformations</Heading>
                <List spacing={2}>
                  <ListItem>
                                      <ListIcon color="green.500" />
                  Transform to Figma, CSS, SCSS, JSON, TypeScript
                </ListItem>
                <ListItem>
                  <ListIcon color="green.500" />
                  Configuration validation
                </ListItem>
                <ListItem>
                  <ListIcon color="green.500" />
                  Source validation for target formats
                </ListItem>
              </List>
            </Box>

            <Divider />

            <Box>
              <Heading size="sm" mb={3}>Validation</Heading>
              <List spacing={2}>
                <ListItem>
                  <ListIcon color="green.500" />
                  Token validation against schema
                </ListItem>
                <ListItem>
                  <ListIcon color="green.500" />
                  Collection validation
                </ListItem>
                <ListItem>
                  <ListIcon color="green.500" />
                  Dimension validation
                </ListItem>
              </List>
            </Box>

            <Divider />

            <Box>
              <Heading size="sm" mb={3}>Customer-Specific MCPs</Heading>
              <List spacing={2}>
                <ListItem>
                  <ListIcon color="green.500" />
                  Generate tailored MCPs for specific customers
                </ListItem>
                <ListItem>
                  <ListIcon color="green.500" />
                  Custom validations and queries
                </ListItem>
                <ListItem>
                  <ListIcon color="green.500" />
                  Customer analytics and insights
                </ListItem>
                </List>
              </Box>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}; 
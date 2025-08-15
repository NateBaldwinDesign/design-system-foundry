/**
 * Circle Pack Transformer
 * Transforms token system data into hierarchical circle pack format
 * Extends BaseDataTransformer and follows schema.json compliance
 */

import type { TokenSystem, Token } from '@token-model/data-model';
import { BaseDataTransformer } from './baseTransformer';
import { DataAggregationService } from '../../dataAggregationService';

import type {
  TransformOptions
} from '../types/visualization-data';
import type {
  CirclePackData,
  CirclePackNode,
  CirclePackStatistics,
  CirclePackResult
} from '../types/circle-pack-data';

export class CirclePackTransformer extends BaseDataTransformer<TokenSystem, CirclePackResult> {
  private dataAggregationService: DataAggregationService;

  constructor() {
    super('CirclePackTransformer');
    this.dataAggregationService = DataAggregationService.getInstance();
  }

  /**
   * Transform token system data into circle pack format
   */
  public async transformData(
    tokenSystem: TokenSystem, 
    _options?: TransformOptions
  ): Promise<CirclePackResult> {
    try {
      this.logProgress('Starting circle pack transformation');

      // Validate input
      if (!this.validateInput(tokenSystem)) {
        throw new Error('Invalid token system input');
      }

      this.logProgress('Building system hierarchy', {
        tokenCount: tokenSystem.tokens?.length || 0,
        platformCount: tokenSystem.platforms?.length || 0,
        themeCount: tokenSystem.themes?.length || 0
      });

      // Build the main system hierarchy (now async)
      const systemNode = await this.buildSystemNode(tokenSystem);
      
      // Calculate statistics
      const statistics = this.calculateStatistics(systemNode);
      
      // Get cache status
      const cacheStatus = this.dataAggregationService.getCacheStatus();

      const result: CirclePackResult = {
        data: systemNode,
        statistics,
        metadata: {
          generatedAt: new Date().toISOString(),
          dataSources: ['core', 'platforms', 'themes'],
          cacheStatus: Object.fromEntries(
            Object.entries(cacheStatus).map(([key, status]) => [
              key, 
              status.fresh ? 'fresh' as const : 'stale' as const
            ])
          )
        }
      };

      this.logProgress('Circle pack transformation completed', {
        totalNodes: statistics.totalNodes,
        maxDepth: statistics.maxDepth
      });

      return result;
    } catch (error) {
      console.error('[CirclePackTransformer] Error during transformation:', error);
      throw error;
    }
  }

  /**
   * Build the main system node with all children
   */
  private async buildSystemNode(tokenSystem: TokenSystem): Promise<CirclePackData> {
    const children: CirclePackNode[] = [];

    // Add core data node
    const coreDataNode = this.buildCoreDataNode(tokenSystem);
    if (coreDataNode.hasChildren) {
      children.push(coreDataNode);
    }

    // Add platforms node (now async)
    const platformsNode = await this.buildPlatformsNode(tokenSystem);
    if (platformsNode.hasChildren) {
      children.push(platformsNode);
    }

    // Add themes node (now async)
    const themesNode = await this.buildThemesNode(tokenSystem);
    if (themesNode.hasChildren) {
      children.push(themesNode);
    }

    return {
      name: 'Design System',
      children,
      type: 'system',
      value: children.length, // Add value for proper sizing
      hasChildren: children.length > 0
    };
  }

  /**
   * Build core data node with all schema entities
   */
  private buildCoreDataNode(tokenSystem: TokenSystem): CirclePackNode {
    const children: CirclePackNode[] = [];

    // Add tokens
    if (tokenSystem.tokens && tokenSystem.tokens.length > 0) {
      children.push({
        name: 'Tokens',
        type: 'entity',
        entityType: 'tokens',
        value: tokenSystem.tokens.length,
        hasChildren: tokenSystem.tokens.length > 0,
        dataSource: 'core',
        children: tokenSystem.tokens.map(token => ({
          name: token.displayName || `Token ${token.id}`,
          type: 'token',
          tokenId: token.id,
          value: 1,
          hasChildren: false,
          dataSource: 'core'
        }))
      });
    }

    // Add token collections
    if (tokenSystem.tokenCollections && tokenSystem.tokenCollections.length > 0) {
      children.push({
        name: 'Collections',
        type: 'entity',
        entityType: 'collections',
        value: tokenSystem.tokenCollections.length,
        hasChildren: tokenSystem.tokenCollections.length > 0,
        dataSource: 'core',
        children: tokenSystem.tokenCollections.map(collection => ({
          name: collection.name || `Collection ${collection.id}`,
          type: 'collection',
          collectionId: collection.id,
          value: 1,
          hasChildren: false,
          dataSource: 'core'
        }))
      });
    }

    // Add dimensions
    if (tokenSystem.dimensions && tokenSystem.dimensions.length > 0) {
      children.push({
        name: 'Dimensions',
        type: 'entity',
        entityType: 'dimensions',
        value: tokenSystem.dimensions.length,
        hasChildren: tokenSystem.dimensions.length > 0,
        dataSource: 'core',
        children: tokenSystem.dimensions.map(dimension => ({
          name: dimension.displayName || `Dimension ${dimension.id}`,
          type: 'dimension',
          dimensionId: dimension.id,
          value: dimension.modes?.length || 0,
          hasChildren: (dimension.modes && dimension.modes.length > 0) || false,
          dataSource: 'core',
          children: dimension.modes?.map(mode => ({
            name: mode.name || `Mode ${mode.id}`,
            type: 'mode',
            modeId: mode.id,
            value: 1,
            hasChildren: false,
            dataSource: 'core'
          })) || []
        }))
      });
    }

    // Add taxonomies
    if (tokenSystem.taxonomies && tokenSystem.taxonomies.length > 0) {
      children.push({
        name: 'Taxonomies',
        type: 'entity',
        entityType: 'taxonomies',
        value: tokenSystem.taxonomies.length,
        hasChildren: tokenSystem.taxonomies.length > 0,
        dataSource: 'core',
        children: tokenSystem.taxonomies.map(taxonomy => ({
          name: taxonomy.name || `Taxonomy ${taxonomy.id}`,
          type: 'taxonomy',
          taxonomyId: taxonomy.id,
          value: taxonomy.terms?.length || 0,
          hasChildren: (taxonomy.terms && taxonomy.terms.length > 0) || false,
          dataSource: 'core',
          children: taxonomy.terms?.map(term => ({
            name: term.name || `Term ${term.id}`,
            type: 'term',
            termId: term.id,
            value: 1,
            hasChildren: false,
            dataSource: 'core'
          })) || []
        }))
      });
    }

    // Add components
    if (tokenSystem.components && tokenSystem.components.length > 0) {
      children.push({
        name: 'Components',
        type: 'entity',
        entityType: 'components',
        value: tokenSystem.components.length,
        hasChildren: tokenSystem.components.length > 0,
        dataSource: 'core',
        children: tokenSystem.components.map(component => ({
          name: component.name || `Component ${component.id}`,
          type: 'component',
          componentId: component.id,
          value: 1,
          hasChildren: false,
          dataSource: 'core'
        }))
      });
    }

    // Add component categories
    if (tokenSystem.componentCategories && tokenSystem.componentCategories.length > 0) {
      children.push({
        name: 'Component Categories',
        type: 'entity',
        entityType: 'componentCategories',
        value: tokenSystem.componentCategories.length,
        hasChildren: tokenSystem.componentCategories.length > 0,
        dataSource: 'core',
        children: tokenSystem.componentCategories.map(category => ({
          name: category.name || `Category ${category.id}`,
          type: 'componentCategory',
          categoryId: category.id,
          value: 1,
          hasChildren: false,
          dataSource: 'core'
        }))
      });
    }

    // Add component properties
    if (tokenSystem.componentProperties && tokenSystem.componentProperties.length > 0) {
      children.push({
        name: 'Component Properties',
        type: 'entity',
        entityType: 'componentProperties',
        value: tokenSystem.componentProperties.length,
        hasChildren: tokenSystem.componentProperties.length > 0,
        dataSource: 'core',
        children: tokenSystem.componentProperties.map(property => ({
          name: property.name || `Property ${property.id}`,
          type: 'componentProperty',
          propertyId: property.id,
          value: 1,
          hasChildren: false,
          dataSource: 'core'
        }))
      });
    }

    // Add resolved value types
    if (tokenSystem.resolvedValueTypes && tokenSystem.resolvedValueTypes.length > 0) {
      children.push({
        name: 'Value Types',
        type: 'entity',
        entityType: 'resolvedValueTypes',
        value: tokenSystem.resolvedValueTypes.length,
        hasChildren: tokenSystem.resolvedValueTypes.length > 0,
        dataSource: 'core',
        children: tokenSystem.resolvedValueTypes.map(valueType => ({
          name: valueType.name || `Value Type ${valueType.id}`,
          type: 'valueType',
          valueTypeId: valueType.id,
          value: 1,
          hasChildren: false,
          dataSource: 'core'
        }))
      });
    }

    // Add standard property types
    if (tokenSystem.standardPropertyTypes && tokenSystem.standardPropertyTypes.length > 0) {
      children.push({
        name: 'Standard Property Types',
        type: 'entity',
        entityType: 'standardPropertyTypes',
        value: tokenSystem.standardPropertyTypes.length,
        hasChildren: tokenSystem.standardPropertyTypes.length > 0,
        dataSource: 'core',
        children: tokenSystem.standardPropertyTypes.map(propertyType => ({
          name: propertyType.name || `Property Type ${propertyType.id}`,
          type: 'standardPropertyType',
          propertyTypeId: propertyType.id,
          value: 1,
          hasChildren: false,
          dataSource: 'core'
        }))
      });
    }

    // Add custom property types
    if (tokenSystem.propertyTypes && tokenSystem.propertyTypes.length > 0) {
      children.push({
        name: 'Custom Property Types',
        type: 'entity',
        entityType: 'propertyTypes',
        value: tokenSystem.propertyTypes.length,
        hasChildren: tokenSystem.propertyTypes.length > 0,
        dataSource: 'core',
        children: tokenSystem.propertyTypes.map(propertyType => ({
          name: propertyType.name || `Property Type ${propertyType.id}`,
          type: 'customPropertyType',
          propertyTypeId: propertyType.id,
          value: 1,
          hasChildren: false,
          dataSource: 'core'
        }))
      });
    }

    // Add algorithms
    if (tokenSystem.algorithms && tokenSystem.algorithms.length > 0) {
      children.push({
        name: 'Algorithms',
        type: 'entity',
        entityType: 'algorithms',
        value: tokenSystem.algorithms.length,
        hasChildren: tokenSystem.algorithms.length > 0,
        dataSource: 'core',
        children: tokenSystem.algorithms.map(algorithm => ({
          name: algorithm.name || `Algorithm ${algorithm.id}`,
          type: 'algorithm',
          algorithmId: algorithm.id,
          value: 1,
          hasChildren: false,
          dataSource: 'core'
        }))
      });
    }

    return {
      name: 'Core Data',
      children,
      type: 'core',
      value: children.length,
      hasChildren: children.length > 0,
      dataSource: 'core'
    };
  }

  /**
   * Build platforms node with actual platform extension data
   */
  private async buildPlatformsNode(tokenSystem: TokenSystem): Promise<CirclePackNode> {
    const children: CirclePackNode[] = [];

    if (tokenSystem.platforms) {
      for (const platform of tokenSystem.platforms) {
        try {
          // Load and transform platform data using existing method
          const platformNode = await this.loadPlatformData(platform.id);
          
          if (platformNode) {
            children.push(platformNode);
          } else {
            // Fallback if data loading fails
            children.push({
              name: platform.displayName || platform.id,
              type: 'platform',
              platformId: platform.id,
              value: 1,
              hasChildren: false,
              dataSource: 'platform',
              error: 'No data found'
            });
          }
        } catch (error) {
          console.error(`[CirclePackTransformer] Error loading platform data for ${platform.id}:`, error);
          children.push({
            name: platform.displayName || platform.id,
            type: 'platform',
            platformId: platform.id,
            value: 1,
            hasChildren: false,
            dataSource: 'platform',
            error: 'Failed to load data'
          });
        }
      }
    }

    return {
      name: 'Platforms',
      children,
      type: 'platform',
      value: children.length,
      hasChildren: children.length > 0,
      dataSource: 'platform'
    };
  }

  /**
   * Build themes node with actual theme extension data
   */
  private async buildThemesNode(tokenSystem: TokenSystem): Promise<CirclePackNode> {
    const children: CirclePackNode[] = [];

    if (tokenSystem.themes) {
      for (const theme of tokenSystem.themes) {
        try {
          // Load and transform theme data using existing method
          const themeNode = await this.loadThemeData(theme.id, tokenSystem.tokens);
          
          if (themeNode) {
            children.push(themeNode);
          } else {
            // Fallback if data loading fails
            children.push({
              name: theme.displayName || theme.id,
              type: 'theme',
              themeId: theme.id,
              value: 1,
              hasChildren: false,
              dataSource: 'theme',
              error: 'No data found'
            });
          }
        } catch (error) {
          console.error(`[CirclePackTransformer] Error loading theme data for ${theme.id}:`, error);
          children.push({
            name: theme.displayName || theme.id,
            type: 'theme',
            themeId: theme.id,
            value: 1,
            hasChildren: false,
            dataSource: 'theme',
            error: 'Failed to load data'
          });
        }
      }
    }

    return {
      name: 'Themes',
      children,
      type: 'theme',
      value: children.length,
      hasChildren: children.length > 0,
      dataSource: 'theme'
    };
  }

  /**
   * Load and transform platform data for a specific platform
   */
  public async loadPlatformData(platformId: string): Promise<CirclePackNode | null> {
    try {
      const platformData = await this.dataAggregationService.loadPlatformData(platformId);
      
      if (!platformData) {
        return null;
      }

      // Transform platform data into circle pack format
      const children: CirclePackNode[] = [];

      // Add platform-specific entities
      if (platformData.tokenOverrides && platformData.tokenOverrides.length > 0) {
        children.push({
          name: 'Token Overrides',
          type: 'entity',
          entityType: 'tokenOverrides',
          value: platformData.tokenOverrides.length,
          hasChildren: platformData.tokenOverrides.length > 0,
          dataSource: 'platform',
          children: platformData.tokenOverrides.map(override => ({
            name: override.displayName || override.id,
            type: 'tokenOverride',
            tokenId: override.id,
            value: 1,
            hasChildren: false,
            dataSource: 'platform'
          }))
        });
      }

      if (platformData.algorithmVariableOverrides && platformData.algorithmVariableOverrides.length > 0) {
        children.push({
          name: 'Algorithm Overrides',
          type: 'entity',
          entityType: 'algorithmVariableOverrides',
          value: platformData.algorithmVariableOverrides.length,
          hasChildren: platformData.algorithmVariableOverrides.length > 0,
          dataSource: 'platform'
        });
      }

      if (platformData.componentImplementations && platformData.componentImplementations.length > 0) {
        children.push({
          name: 'Component Implementations',
          type: 'entity',
          entityType: 'componentImplementations',
          value: platformData.componentImplementations.length,
          hasChildren: platformData.componentImplementations.length > 0,
          dataSource: 'platform'
        });
      }

      return {
        name: platformData.platformName || platformData.platformId || 'Platform',
        children,
        type: 'platform',
        platformId: platformData.platformId,
        value: children.length,
        hasChildren: children.length > 0,
        dataSource: 'platform'
      };

    } catch (error) {
      console.error(`[CirclePackTransformer] Error loading platform data for ${platformId}:`, error);
      return null;
    }
  }

  /**
   * Load and transform theme data for a specific theme
   */
  public async loadThemeData(themeId: string, coreTokens?: Token[]): Promise<CirclePackNode | null> {
    try {
      const themeData = await this.dataAggregationService.loadThemeData(themeId);
      
      if (!themeData) {
        return null;
      }

      // Transform theme data into circle pack format
      const children: CirclePackNode[] = [];

      // Add theme-specific entities
      if (themeData.tokenOverrides && themeData.tokenOverrides.length > 0) {
        children.push({
          name: 'Token Overrides',
          type: 'entity',
          entityType: 'tokenOverrides',
          value: themeData.tokenOverrides.length,
          hasChildren: themeData.tokenOverrides.length > 0,
          dataSource: 'theme',
          children: themeData.tokenOverrides.map(override => {
            // Look up the token's display name from core tokens if available
            const coreToken = coreTokens?.find(token => token.id === override.tokenId);
            const displayName = coreToken?.displayName || coreToken?.name || override.tokenId;
            
            return {
              name: displayName,
              type: 'tokenOverride',
              tokenId: override.tokenId,
              value: 1,
              hasChildren: false,
              dataSource: 'theme'
            };
          })
        });
      }

      return {
        name: themeData.themeName || String(themeData.themeId) || 'Theme',
        children,
        type: 'theme',
        themeId: String(themeData.themeId),
        value: children.length,
        hasChildren: children.length > 0,
        dataSource: 'theme'
      };

    } catch (error) {
      console.error(`[CirclePackTransformer] Error loading theme data for ${themeId}:`, error);
      return null;
    }
  }

  /**
   * Calculate statistics for the circle pack data
   */
  private calculateStatistics(data: CirclePackData): CirclePackStatistics {
    const allNodes = this.flattenNodes(data);
    
    const coreEntities = allNodes.filter(n => n.type === 'entity' && n.dataSource === 'core');
    const platforms = allNodes.filter(n => n.type === 'platform');
    const themes = allNodes.filter(n => n.type === 'theme');
    
    const depths = allNodes.map(n => n.depth || 0);
    const maxDepth = Math.max(...depths, 0);
    const averageDepth = depths.length > 0 ? depths.reduce((a, b) => a + b, 0) / depths.length : 0;
    
    const nodesWithValues = allNodes.filter(n => n.value !== undefined);
    const largestNode = nodesWithValues.length > 0 
      ? nodesWithValues.reduce((a, b) => (a.value || 0) > (b.value || 0) ? a : b)
      : null;
    const smallestNode = nodesWithValues.length > 0
      ? nodesWithValues.reduce((a, b) => (a.value || 0) < (b.value || 0) ? a : b)
      : null;

    return {
      totalNodes: allNodes.length,
      totalCoreEntities: coreEntities.length,
      totalPlatforms: platforms.length,
      totalThemes: themes.length,
      maxDepth,
      averageDepth,
      largestNode,
      smallestNode
    };
  }

  /**
   * Flatten all nodes in the hierarchy for statistics calculation
   */
  private flattenNodes(node: CirclePackNode): CirclePackNode[] {
    const nodes: CirclePackNode[] = [node];
    
    if (node.children) {
      for (const child of node.children) {
        nodes.push(...this.flattenNodes(child));
      }
    }
    
    return nodes;
  }
}

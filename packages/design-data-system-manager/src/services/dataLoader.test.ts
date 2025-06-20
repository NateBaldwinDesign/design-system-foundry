import { describe, it, expect } from 'vitest';
import { loadDataWithAlgorithms, getDataSourceOptionsWithAlgorithms } from './dataLoader';

// Mock the data imports
const mockExampleDataFiles = {
  'example-minimal-data.json': () => Promise.resolve(JSON.stringify({
    systemName: 'Test System',
    systemId: 'test-system',
    tokens: [],
    dimensions: [],
    modes: [],
    platforms: [],
    taxonomies: [],
    resolvedValueTypes: [],
    tokenCollections: []
  })),
  'examples/algorithms/example-minimal-algorithms.json': () => Promise.resolve(JSON.stringify({
    algorithms: [
      {
        id: 'test-algo',
        name: 'Test Algorithm',
        description: 'A test algorithm',
        steps: []
      }
    ]
  }))
};

describe('DataLoader', () => {
  describe('loadDataWithAlgorithms', () => {
    it('should load core data successfully', async () => {
      const result = await loadDataWithAlgorithms('example-minimal-data.json', mockExampleDataFiles);
      
      expect(result.coreData).toBeDefined();
      expect(result.coreData.systemName).toBe('Test System');
      expect(result.coreData.systemId).toBe('test-system');
    });

    it('should load algorithm data when available', async () => {
      const result = await loadDataWithAlgorithms('example-minimal-data.json', mockExampleDataFiles);
      
      expect(result.algorithmData).toBeDefined();
      expect(result.algorithmData).toHaveLength(1);
      expect(result.algorithmData![0].id).toBe('test-algo');
      expect(result.algorithmData![0].name).toBe('Test Algorithm');
    });

    it('should handle missing algorithm data gracefully', async () => {
      // Mock a data source without algorithms
      const filesWithoutAlgorithms = {
        'no-algorithms-data.json': () => Promise.resolve(JSON.stringify({
          systemName: 'No Algo System',
          systemId: 'no-algo-system',
          tokens: [],
          dimensions: [],
          modes: [],
          platforms: [],
          taxonomies: [],
          resolvedValueTypes: [],
          tokenCollections: []
        }))
      };

      const result = await loadDataWithAlgorithms('no-algorithms-data.json', filesWithoutAlgorithms);
      
      expect(result.coreData).toBeDefined();
      expect(result.algorithmData).toBeNull();
    });
  });

  describe('getDataSourceOptionsWithAlgorithms', () => {
    it('should return data source options with algorithm information', () => {
      const options = getDataSourceOptionsWithAlgorithms(mockExampleDataFiles);
      
      expect(options).toHaveLength(1);
      expect(options[0].value).toBe('example-minimal-data.json');
      expect(options[0].hasAlgorithms).toBe(true);
      expect(options[0].label).toContain('Example Minimal');
    });
  });
}); 
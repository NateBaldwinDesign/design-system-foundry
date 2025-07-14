import { ChangeTrackingService } from './changeTrackingService';
import { StorageService } from './storage';

// Mock the dependencies
jest.mock('./storage');
jest.mock('./githubApi');
jest.mock('./githubAuth');

const mockStorageService = StorageService as jest.Mocked<typeof StorageService>;

describe('ChangeTrackingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear localStorage
    localStorage.clear();
  });

  describe('hasLocalChanges', () => {
    it('should return false when no baseline data exists', () => {
      const result = ChangeTrackingService.hasLocalChanges();
      expect(result).toBe(false);
    });

    it('should return false when current data matches baseline', () => {
      const baselineData = {
        tokens: [{ id: 'token-1', name: 'Test Token' }],
        collections: [],
        modes: [],
        dimensions: [],
        resolvedValueTypes: [],
        platforms: [],
        themes: [],
        taxonomies: [],
        algorithms: [],
        namingRules: { taxonomyOrder: [] },
        dimensionOrder: [],
        algorithmFile: null
      };

      // Set baseline data
      localStorage.setItem('token-model:baseline-data', JSON.stringify(baselineData));

      // Mock current data to match baseline
      mockStorageService.getTokens.mockReturnValue(baselineData.tokens);
      mockStorageService.getCollections.mockReturnValue(baselineData.collections);
      mockStorageService.getModes.mockReturnValue(baselineData.modes);
      mockStorageService.getDimensions.mockReturnValue(baselineData.dimensions);
      mockStorageService.getValueTypes.mockReturnValue(baselineData.resolvedValueTypes);
      mockStorageService.getPlatforms.mockReturnValue(baselineData.platforms);
      mockStorageService.getThemes.mockReturnValue(baselineData.themes);
      mockStorageService.getTaxonomies.mockReturnValue(baselineData.taxonomies);
      mockStorageService.getAlgorithms.mockReturnValue(baselineData.algorithms);
      mockStorageService.getNamingRules.mockReturnValue(baselineData.namingRules);
      mockStorageService.getDimensionOrder.mockReturnValue(baselineData.dimensionOrder);
      mockStorageService.getAlgorithmFile.mockReturnValue(baselineData.algorithmFile);

      const result = ChangeTrackingService.hasLocalChanges();
      expect(result).toBe(false);
    });

    it('should return true when current data differs from baseline', () => {
      const baselineData = {
        tokens: [{ id: 'token-1', name: 'Test Token' }],
        collections: [],
        modes: [],
        dimensions: [],
        resolvedValueTypes: [],
        platforms: [],
        themes: [],
        taxonomies: [],
        algorithms: [],
        namingRules: { taxonomyOrder: [] },
        dimensionOrder: [],
        algorithmFile: null
      };

      // Set baseline data
      localStorage.setItem('token-model:baseline-data', JSON.stringify(baselineData));

      // Mock current data to be different from baseline
      const currentData = {
        tokens: [{ id: 'token-1', name: 'Modified Token' }], // Different name
        collections: [],
        modes: [],
        dimensions: [],
        resolvedValueTypes: [],
        platforms: [],
        themes: [],
        taxonomies: [],
        algorithms: [],
        namingRules: { taxonomyOrder: [] },
        dimensionOrder: [],
        algorithmFile: null
      };

      mockStorageService.getTokens.mockReturnValue(currentData.tokens);
      mockStorageService.getCollections.mockReturnValue(currentData.collections);
      mockStorageService.getModes.mockReturnValue(currentData.modes);
      mockStorageService.getDimensions.mockReturnValue(currentData.dimensions);
      mockStorageService.getValueTypes.mockReturnValue(currentData.resolvedValueTypes);
      mockStorageService.getPlatforms.mockReturnValue(currentData.platforms);
      mockStorageService.getThemes.mockReturnValue(currentData.themes);
      mockStorageService.getTaxonomies.mockReturnValue(currentData.taxonomies);
      mockStorageService.getAlgorithms.mockReturnValue(currentData.algorithms);
      mockStorageService.getNamingRules.mockReturnValue(currentData.namingRules);
      mockStorageService.getDimensionOrder.mockReturnValue(currentData.dimensionOrder);
      mockStorageService.getAlgorithmFile.mockReturnValue(currentData.algorithmFile);

      const result = ChangeTrackingService.hasLocalChanges();
      expect(result).toBe(true);
    });
  });

  describe('getChangeCount', () => {
    it('should return 0 when no baseline data exists', () => {
      const result = ChangeTrackingService.getChangeCount();
      expect(result).toBe(0);
    });

    it('should count added, removed, and modified items', () => {
      const baselineData = {
        tokens: [
          { id: 'token-1', name: 'Token 1' },
          { id: 'token-2', name: 'Token 2' }
        ],
        collections: [],
        modes: [],
        dimensions: [],
        resolvedValueTypes: [],
        platforms: [],
        themes: [],
        taxonomies: [],
        algorithms: [],
        namingRules: { taxonomyOrder: [] },
        dimensionOrder: [],
        algorithmFile: null
      };

      // Set baseline data
      localStorage.setItem('token-model:baseline-data', JSON.stringify(baselineData));

      // Mock current data with changes:
      // - token-1 modified (name changed)
      // - token-2 removed
      // - token-3 added
      const currentData = {
        tokens: [
          { id: 'token-1', name: 'Modified Token 1' }, // Modified
          { id: 'token-3', name: 'Token 3' } // Added
        ],
        collections: [],
        modes: [],
        dimensions: [],
        resolvedValueTypes: [],
        platforms: [],
        themes: [],
        taxonomies: [],
        algorithms: [],
        namingRules: { taxonomyOrder: [] },
        dimensionOrder: [],
        algorithmFile: null
      };

      mockStorageService.getTokens.mockReturnValue(currentData.tokens);
      mockStorageService.getCollections.mockReturnValue(currentData.collections);
      mockStorageService.getModes.mockReturnValue(currentData.modes);
      mockStorageService.getDimensions.mockReturnValue(currentData.dimensions);
      mockStorageService.getValueTypes.mockReturnValue(currentData.resolvedValueTypes);
      mockStorageService.getPlatforms.mockReturnValue(currentData.platforms);
      mockStorageService.getThemes.mockReturnValue(currentData.themes);
      mockStorageService.getTaxonomies.mockReturnValue(currentData.taxonomies);
      mockStorageService.getAlgorithms.mockReturnValue(currentData.algorithms);
      mockStorageService.getNamingRules.mockReturnValue(currentData.namingRules);
      mockStorageService.getDimensionOrder.mockReturnValue(currentData.dimensionOrder);
      mockStorageService.getAlgorithmFile.mockReturnValue(currentData.algorithmFile);

      const result = ChangeTrackingService.getChangeCount();
      expect(result).toBe(3); // 1 modified + 1 removed + 1 added
    });
  });

  describe('setBaselineData', () => {
    it('should store baseline data in localStorage', () => {
      const testData = {
        tokens: [{ id: 'token-1', name: 'Test Token' }],
        collections: [],
        modes: [],
        dimensions: [],
        resolvedValueTypes: [],
        platforms: [],
        themes: [],
        taxonomies: [],
        algorithms: [],
        namingRules: { taxonomyOrder: [] },
        dimensionOrder: [],
        algorithmFile: null
      };

      ChangeTrackingService.setBaselineData(testData);

      const stored = localStorage.getItem('token-model:baseline-data');
      expect(stored).toBe(JSON.stringify(testData));
    });
  });

  describe('updateLastGitHubSync', () => {
    it('should store current timestamp in localStorage', () => {
      const before = new Date();
      ChangeTrackingService.updateLastGitHubSync();
      const after = new Date();

      const stored = localStorage.getItem('token-model:last-github-sync');
      expect(stored).toBeDefined();

      const timestamp = new Date(stored!);
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
}); 
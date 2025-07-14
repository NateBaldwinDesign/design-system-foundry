import { FigmaIdManager } from '../../src/services/figma-id-manager';

describe('FigmaIdManager', () => {
  let idManager: FigmaIdManager;

  beforeEach(() => {
    idManager = new FigmaIdManager();
  });

  describe('ID Resolution and Action Determination', () => {
    it('should properly resolve IDs and determine actions with existing mappings', () => {
      // Test data: existing Figma variables and collections
      const existingFigmaData = {
        variables: {
          'figma-var-123': {
            id: 'figma-var-123',
            name: 'Primary Color',
            action: 'UPDATE' as const,
            variableCollectionId: 'figma-collection-456',
            resolvedType: 'COLOR' as const,
            scopes: ['ALL_SCOPES'],
            hiddenFromPublishing: false
          },
          'figma-var-789': {
            id: 'figma-var-789',
            name: 'Secondary Color',
            action: 'UPDATE' as const,
            variableCollectionId: 'figma-collection-456',
            resolvedType: 'COLOR' as const,
            scopes: ['ALL_SCOPES'],
            hiddenFromPublishing: false
          }
        },
        variableCollections: {
          'figma-collection-456': {
            id: 'figma-collection-456',
            name: 'Colors',
            action: 'UPDATE' as const,
            initialModeId: 'figma-mode-abc',
            modes: {
              'figma-mode-abc': {
                name: 'Light',
                modeId: 'figma-mode-abc'
              }
            }
          }
        }
      };

      // Test data: tempToRealId mappings from previous publish
      const tempToRealId = {
        'collection-colors': 'figma-collection-456',
        'variable-primary-color': 'figma-var-123',
        'variable-secondary-color': 'figma-var-789',
        'mode-light': 'figma-mode-abc'
      };

      // Initialize the ID manager
      idManager.initialize(existingFigmaData, tempToRealId, undefined);

      // Test ID resolution
      expect(idManager.getFigmaId('collection-colors')).toBe('figma-collection-456');
      expect(idManager.getFigmaId('variable-primary-color')).toBe('figma-var-123');
      expect(idManager.getFigmaId('variable-secondary-color')).toBe('figma-var-789');
      expect(idManager.getFigmaId('mode-light')).toBe('figma-mode-abc');

      // Test action determination for existing items
      expect(idManager.determineAction('collection-colors')).toBe('UPDATE');
      expect(idManager.determineAction('variable-primary-color')).toBe('UPDATE');
      expect(idManager.determineAction('variable-secondary-color')).toBe('UPDATE');
      expect(idManager.determineAction('mode-light')).toBe('UPDATE');

      // Test action determination for new items
      expect(idManager.determineAction('collection-new')).toBe('CREATE');
      expect(idManager.determineAction('variable-new')).toBe('CREATE');
      expect(idManager.determineAction('mode-new')).toBe('CREATE');
    });

    it('should handle items that exist in current data but not in mappings', () => {
      // Test data: existing Figma variables (manually created in Figma)
      const existingFigmaData = {
        variables: {
          'figma-var-manual': {
            id: 'figma-var-manual',
            name: 'Manual Variable',
            action: 'UPDATE' as const,
            variableCollectionId: 'figma-collection-manual',
            resolvedType: 'COLOR' as const,
            scopes: ['ALL_SCOPES'],
            hiddenFromPublishing: false
          }
        },
        variableCollections: {
          'figma-collection-manual': {
            id: 'figma-collection-manual',
            name: 'Manual Collection',
            action: 'UPDATE' as const,
            initialModeId: 'figma-mode-manual',
            modes: {
              'figma-mode-manual': {
                name: 'Default',
                modeId: 'figma-mode-manual'
              }
            }
          }
        }
      };

      // No tempToRealId mappings (first time publishing)
      const tempToRealId = {};

      // Initialize the ID manager
      idManager.initialize(existingFigmaData, tempToRealId, undefined);

      // Test action determination for items that exist in current data
      expect(idManager.determineAction('figma-var-manual')).toBe('UPDATE');
      expect(idManager.determineAction('figma-collection-manual')).toBe('UPDATE');
      expect(idManager.determineAction('figma-mode-manual')).toBe('UPDATE');

      // Test action determination for new items
      expect(idManager.determineAction('new-variable')).toBe('CREATE');
      expect(idManager.determineAction('new-collection')).toBe('CREATE');
    });

    it('should handle mixed scenarios with both mapped and unmapped items', () => {
      // Test data: mix of existing and new items
      const existingFigmaData = {
        variables: {
          'figma-var-existing': {
            id: 'figma-var-existing',
            name: 'Existing Variable',
            action: 'UPDATE' as const,
            variableCollectionId: 'figma-collection-existing',
            resolvedType: 'COLOR' as const,
            scopes: ['ALL_SCOPES'],
            hiddenFromPublishing: false
          },
          'figma-var-new': {
            id: 'figma-var-new',
            name: 'New Variable',
            action: 'UPDATE' as const,
            variableCollectionId: 'figma-collection-new',
            resolvedType: 'COLOR' as const,
            scopes: ['ALL_SCOPES'],
            hiddenFromPublishing: false
          }
        },
        variableCollections: {
          'figma-collection-existing': {
            id: 'figma-collection-existing',
            name: 'Existing Collection',
            action: 'UPDATE' as const,
            initialModeId: 'figma-mode-existing',
            modes: {
              'figma-mode-existing': {
                name: 'Default',
                modeId: 'figma-mode-existing'
              }
            }
          },
          'figma-collection-new': {
            id: 'figma-collection-new',
            name: 'New Collection',
            action: 'UPDATE' as const,
            initialModeId: 'figma-mode-new',
            modes: {
              'figma-mode-new': {
                name: 'Default',
                modeId: 'figma-mode-new'
              }
            }
          }
        }
      };

      // tempToRealId mappings for some items
      const tempToRealId = {
        'collection-existing': 'figma-collection-existing',
        'variable-existing': 'figma-var-existing'
        // Note: collection-new and variable-new are not in mappings
      };

      // Initialize the ID manager
      idManager.initialize(existingFigmaData, tempToRealId, undefined);

      // Test mapped items (should be UPDATE)
      expect(idManager.determineAction('collection-existing')).toBe('UPDATE');
      expect(idManager.determineAction('variable-existing')).toBe('UPDATE');

      // Test unmapped items that exist in current data (should be UPDATE)
      expect(idManager.determineAction('figma-collection-new')).toBe('UPDATE');
      expect(idManager.determineAction('figma-var-new')).toBe('UPDATE');

      // Test completely new items (should be CREATE)
      expect(idManager.determineAction('collection-completely-new')).toBe('CREATE');
      expect(idManager.determineAction('variable-completely-new')).toBe('CREATE');
    });

    it('should prune invalid mappings', () => {
      // Test data: existing Figma variables
      const existingFigmaData = {
        variables: {
          'figma-var-valid': {
            id: 'figma-var-valid',
            name: 'Valid Variable',
            action: 'UPDATE' as const,
            variableCollectionId: 'figma-collection-valid',
            resolvedType: 'COLOR' as const,
            scopes: ['ALL_SCOPES'],
            hiddenFromPublishing: false
          }
        },
        variableCollections: {
          'figma-collection-valid': {
            id: 'figma-collection-valid',
            name: 'Valid Collection',
            action: 'UPDATE' as const,
            initialModeId: 'figma-mode-valid',
            modes: {
              'figma-mode-valid': {
                name: 'Default',
                modeId: 'figma-mode-valid'
              }
            }
          }
        }
      };

      // tempToRealId mappings with some invalid IDs
      const tempToRealId = {
        'collection-valid': 'figma-collection-valid',
        'variable-valid': 'figma-var-valid',
        'collection-invalid': 'figma-collection-invalid', // This doesn't exist in current data
        'variable-invalid': 'figma-var-invalid' // This doesn't exist in current data
      };

      // Initialize the ID manager
      idManager.initialize(existingFigmaData, tempToRealId, undefined);

      // Test that valid mappings are preserved
      expect(idManager.getFigmaId('collection-valid')).toBe('figma-collection-valid');
      expect(idManager.getFigmaId('variable-valid')).toBe('figma-var-valid');
      expect(idManager.determineAction('collection-valid')).toBe('UPDATE');
      expect(idManager.determineAction('variable-valid')).toBe('UPDATE');

      // Test that invalid mappings are pruned (should fall back to original ID)
      expect(idManager.getFigmaId('collection-invalid')).toBe('collection-invalid');
      expect(idManager.getFigmaId('variable-invalid')).toBe('variable-invalid');
      expect(idManager.determineAction('collection-invalid')).toBe('CREATE');
      expect(idManager.determineAction('variable-invalid')).toBe('CREATE');
    });

    it('should handle deterministic ID generation', () => {
      const uuid = '12345678-1234-4123-8123-123456789abc';
      
      // Test deterministic ID generation
      expect(idManager.generateDeterministicId(uuid, 'collection')).toMatch(/^collection-[a-z0-9]+$/);
      expect(idManager.generateDeterministicId(uuid, 'variable')).toMatch(/^variable-[a-z0-9]+$/);
      expect(idManager.generateDeterministicId(uuid, 'mode')).toMatch(/^mode-[a-z0-9]+$/);

      // Test that same UUID generates same deterministic ID
      const collectionId1 = idManager.generateDeterministicId(uuid, 'collection');
      const collectionId2 = idManager.generateDeterministicId(uuid, 'collection');
      expect(collectionId1).toBe(collectionId2);

      // Test that already deterministic IDs are returned as-is
      expect(idManager.generateDeterministicId('collection-abc123', 'collection')).toBe('collection-abc123');
      expect(idManager.generateDeterministicId('variable-def456', 'variable')).toBe('variable-def456');
    });
  });

  describe('Integration with Figma Data', () => {
    it('should work with real Figma API response structure', () => {
      // Simulate real Figma API response
      const existingFigmaData = {
        variables: {
          'VariableID:1:2': {
            id: 'VariableID:1:2',
            name: 'Colors/Primary',
            action: 'UPDATE' as const,
            resolvedType: 'COLOR' as const,
            variableCollectionId: 'VariableCollectionId:1:2',
            scopes: ['ALL_SCOPES'],
            hiddenFromPublishing: false,
            description: 'Primary brand color'
          },
          'VariableID:2:3': {
            id: 'VariableID:2:3',
            name: 'Colors/Secondary',
            action: 'UPDATE' as const,
            resolvedType: 'COLOR' as const,
            variableCollectionId: 'VariableCollectionId:1:2',
            scopes: ['ALL_SCOPES'],
            hiddenFromPublishing: false,
            description: 'Secondary brand color'
          }
        },
        variableCollections: {
          'VariableCollectionId:1:2': {
            id: 'VariableCollectionId:1:2',
            name: 'Colors',
            action: 'UPDATE' as const,
            initialModeId: 'VariableModeId:1:2',
            modes: {
              'VariableModeId:1:2': {
                name: 'Light',
                modeId: 'VariableModeId:1:2'
              }
            }
          }
        }
      };

      // tempToRealId mappings from previous publish
      const tempToRealId = {
        'collection-colors': 'VariableCollectionId:1:2',
        'variable-primary': 'VariableID:1:2',
        'variable-secondary': 'VariableID:2:3',
        'mode-light': 'VariableModeId:1:2'
      };

      // Initialize the ID manager
      idManager.initialize(existingFigmaData, tempToRealId, undefined);

      // Test that the mappings work correctly
      expect(idManager.determineAction('collection-colors')).toBe('UPDATE');
      expect(idManager.determineAction('variable-primary')).toBe('UPDATE');
      expect(idManager.determineAction('variable-secondary')).toBe('UPDATE');
      expect(idManager.determineAction('mode-light')).toBe('UPDATE');

      // Test that new items are marked as CREATE
      expect(idManager.determineAction('collection-new')).toBe('CREATE');
      expect(idManager.determineAction('variable-new')).toBe('CREATE');
    });
  });
}); 
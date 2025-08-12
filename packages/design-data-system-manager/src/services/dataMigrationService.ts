import { unifiedStorageService, type MigrationStatus } from './unifiedStorageService';
import { StorageService } from './storage';
import type { TokenSystem, PlatformExtension, ThemeOverrideFile } from '@token-model/data-model';

// Migration step definitions
export interface MigrationStep {
  id: string;
  name: string;
  description: string;
  execute: () => Promise<boolean>;
  rollback: () => Promise<boolean>;
  validate: () => Promise<boolean>;
}

// Migration result interface
export interface MigrationResult {
  success: boolean;
  completedSteps: string[];
  failedSteps: string[];
  errors: string[];
  warnings: string[];
  rollbackRequired: boolean;
}

/**
 * Data Migration Service - Handles migration of existing data to unified storage
 * 
 * This service provides:
 * - Comprehensive data migration with validation
 * - Rollback capability for failed migrations
 * - Dry-run mode for testing
 * - Progress tracking and status reporting
 * - Error handling and recovery
 */
export class DataMigrationService {
  private static instance: DataMigrationService;
  private migrationSteps: MigrationStep[] = [];
  private isDryRun: boolean = false;

  private constructor() {
    this.initializeMigrationSteps();
  }

  static getInstance(): DataMigrationService {
    if (!DataMigrationService.instance) {
      DataMigrationService.instance = new DataMigrationService();
    }
    return DataMigrationService.instance;
  }

  /**
   * Initialize migration steps
   */
  private initializeMigrationSteps(): void {
    this.migrationSteps = [
      {
        id: 'core-data-migration',
        name: 'Core Data Migration',
        description: 'Migrate core TokenSystem data to unified storage',
        execute: this.migrateCoreData.bind(this),
        rollback: this.rollbackCoreData.bind(this),
        validate: this.validateCoreData.bind(this)
      },
      {
        id: 'platform-extensions-migration',
        name: 'Platform Extensions Migration',
        description: 'Migrate platform extension data to unified storage',
        execute: this.migratePlatformExtensions.bind(this),
        rollback: this.rollbackPlatformExtensions.bind(this),
        validate: this.validatePlatformExtensions.bind(this)
      },
      {
        id: 'theme-overrides-migration',
        name: 'Theme Overrides Migration',
        description: 'Migrate theme override data to unified storage',
        execute: this.migrateThemeOverrides.bind(this),
        rollback: this.rollbackThemeOverrides.bind(this),
        validate: this.validateThemeOverrides.bind(this)
      },
      {
        id: 'source-context-migration',
        name: 'Source Context Migration',
        description: 'Migrate source context data to unified storage',
        execute: this.migrateSourceContext.bind(this),
        rollback: this.rollbackSourceContext.bind(this),
        validate: this.validateSourceContext.bind(this)
      },
      {
        id: 'local-edits-migration',
        name: 'Local Edits Migration',
        description: 'Migrate local edits data to unified storage',
        execute: this.migrateLocalEdits.bind(this),
        rollback: this.rollbackLocalEdits.bind(this),
        validate: this.validateLocalEdits.bind(this)
      }
    ];
  }

  /**
   * Set dry-run mode
   */
  setDryRun(enabled: boolean): void {
    this.isDryRun = enabled;
    console.log(`[DataMigrationService] Dry-run mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get migration status
   */
  getMigrationStatus(): MigrationStatus | null {
    return unifiedStorageService.getMigrationStatus();
  }

  /**
   * Check if migration is needed
   */
  isMigrationNeeded(): boolean {
    const status = this.getMigrationStatus();
    return !status || !status.isComplete;
  }

  /**
   * Perform dry-run migration
   */
  async performDryRun(): Promise<MigrationResult> {
    console.log('[DataMigrationService] Starting dry-run migration');
    this.setDryRun(true);
    const result = await this.performMigration();
    this.setDryRun(false);
    return result;
  }

  /**
   * Perform full migration
   */
  async performMigration(): Promise<MigrationResult> {
    console.log('[DataMigrationService] Starting data migration');
    
    const result: MigrationResult = {
      success: false,
      completedSteps: [],
      failedSteps: [],
      errors: [],
      warnings: []
    };

    try {
      // Validate current state before migration
      const validationResult = await this.validateCurrentState();
      if (!validationResult.success) {
        result.errors.push(...validationResult.errors);
        return result;
      }

      // Execute migration steps
      for (const step of this.migrationSteps) {
        console.log(`[DataMigrationService] Executing step: ${step.name}`);
        
        try {
          const stepSuccess = await step.execute();
          
          if (stepSuccess) {
            result.completedSteps.push(step.id);
            unifiedStorageService.updateMigrationStep(step.id, true);
            console.log(`[DataMigrationService] Step completed: ${step.name}`);
          } else {
            result.failedSteps.push(step.id);
            result.errors.push(`Failed to execute step: ${step.name}`);
            unifiedStorageService.updateMigrationStep(step.id, false);
            console.error(`[DataMigrationService] Step failed: ${step.name}`);
            
            // Rollback completed steps
            await this.rollbackCompletedSteps(result.completedSteps);
            result.rollbackRequired = true;
            break;
          }
        } catch (error) {
          result.failedSteps.push(step.id);
          result.errors.push(`Error in step ${step.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          unifiedStorageService.updateMigrationStep(step.id, false);
          console.error(`[DataMigrationService] Step error: ${step.name}`, error);
          
          // Rollback completed steps
          await this.rollbackCompletedSteps(result.completedSteps);
          result.rollbackRequired = true;
          break;
        }
      }

      // Validate final state
      if (result.completedSteps.length === this.migrationSteps.length) {
        const finalValidation = await this.validateFinalState();
        if (finalValidation.success) {
          result.success = true;
          console.log('[DataMigrationService] Migration completed successfully');
        } else {
          result.errors.push(...finalValidation.errors);
          result.rollbackRequired = true;
          await this.rollbackCompletedSteps(result.completedSteps);
        }
      }

    } catch (error) {
      result.errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('[DataMigrationService] Migration failed:', error);
    }

    return result;
  }

  /**
   * Rollback completed steps
   */
  private async rollbackCompletedSteps(completedSteps: string[]): Promise<void> {
    console.log('[DataMigrationService] Rolling back completed steps');
    
    for (let i = completedSteps.length - 1; i >= 0; i--) {
      const stepId = completedSteps[i];
      const step = this.migrationSteps.find(s => s.id === stepId);
      
      if (step) {
        try {
          await step.rollback();
          console.log(`[DataMigrationService] Rolled back step: ${step.name}`);
        } catch (error) {
          console.error(`[DataMigrationService] Failed to rollback step: ${step.name}`, error);
        }
      }
    }
  }

  /**
   * Validate current state before migration
   */
  private async validateCurrentState(): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      // Check if unified storage is available
      if (!unifiedStorageService) {
        errors.push('Unified storage service is not available');
      }

      // Check if existing storage has data
      const hasExistingData = this.hasExistingData();
      if (!hasExistingData) {
        console.log('[DataMigrationService] No existing data found, migration not needed');
      }

    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      success: errors.length === 0,
      errors
    };
  }

  /**
   * Validate final state after migration
   */
  private async validateFinalState(): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      // Validate each migration step
      for (const step of this.migrationSteps) {
        const stepValidation = await step.validate();
        if (!stepValidation) {
          errors.push(`Validation failed for step: ${step.name}`);
        }
      }

    } catch (error) {
      errors.push(`Final validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      success: errors.length === 0,
      errors
    };
  }

  /**
   * Check if existing data is present
   */
  private hasExistingData(): boolean {
    try {
      // Check for core data
      const coreData = StorageService.getCoreData();
      if (coreData) return true;

      // Check for individual storage keys
      const tokens = StorageService.getTokens();
      if (tokens && tokens.length > 0) return true;

      const collections = StorageService.getCollections();
      if (collections && collections.length > 0) return true;

      const dimensions = StorageService.getDimensions();
      if (dimensions && dimensions.length > 0) return true;

      return false;
    } catch (error) {
      console.error('[DataMigrationService] Error checking existing data:', error);
      return false;
    }
  }

  // Migration step implementations

  private async migrateCoreData(): Promise<boolean> {
    try {
      console.log('[DataMigrationService] Migrating core data');
      
      const coreData = StorageService.getCoreData();
      if (!coreData) {
        console.log('[DataMigrationService] No core data to migrate');
        return true;
      }

      if (!this.isDryRun) {
        unifiedStorageService.setData('token-model:unified:core-data', coreData, 'TokenSystem');
      }

      console.log('[DataMigrationService] Core data migration completed');
      return true;
    } catch (error) {
      console.error('[DataMigrationService] Core data migration failed:', error);
      return false;
    }
  }

  private async rollbackCoreData(): Promise<boolean> {
    try {
      console.log('[DataMigrationService] Rolling back core data migration');
      
      if (!this.isDryRun) {
        unifiedStorageService.deleteData('token-model:unified:core-data');
      }

      return true;
    } catch (error) {
      console.error('[DataMigrationService] Core data rollback failed:', error);
      return false;
    }
  }

  private async validateCoreData(): Promise<boolean> {
    try {
      const coreData = unifiedStorageService.getData<TokenSystem>('token-model:unified:core-data', 'TokenSystem');
      return coreData !== null;
    } catch (error) {
      console.error('[DataMigrationService] Core data validation failed:', error);
      return false;
    }
  }

  private async migratePlatformExtensions(): Promise<boolean> {
    try {
      console.log('[DataMigrationService] Migrating platform extensions');
      
      const platformExtensions = StorageService.getPlatformExtensions();
      if (!platformExtensions || Object.keys(platformExtensions).length === 0) {
        console.log('[DataMigrationService] No platform extensions to migrate');
        return true;
      }

      if (!this.isDryRun) {
        for (const [platformId, extension] of Object.entries(platformExtensions)) {
          const key = `token-model:unified:platform-extension-${platformId}`;
          unifiedStorageService.setData(key, extension, 'PlatformExtension');
        }
      }

      console.log('[DataMigrationService] Platform extensions migration completed');
      return true;
    } catch (error) {
      console.error('[DataMigrationService] Platform extensions migration failed:', error);
      return false;
    }
  }

  private async rollbackPlatformExtensions(): Promise<boolean> {
    try {
      console.log('[DataMigrationService] Rolling back platform extensions migration');
      
      if (!this.isDryRun) {
        // Remove all platform extension keys
        const keys = Object.keys(localStorage).filter(key => 
          key.startsWith('token-model:unified:platform-extension-')
        );
        keys.forEach(key => unifiedStorageService.deleteData(key));
      }

      return true;
    } catch (error) {
      console.error('[DataMigrationService] Platform extensions rollback failed:', error);
      return false;
    }
  }

  private async validatePlatformExtensions(): Promise<boolean> {
    try {
      const platformExtensions = StorageService.getPlatformExtensions();
      if (!platformExtensions) return true;

      for (const platformId of Object.keys(platformExtensions)) {
        const key = `token-model:unified:platform-extension-${platformId}`;
        const extension = unifiedStorageService.getData<PlatformExtension>(key, 'PlatformExtension');
        if (!extension) return false;
      }

      return true;
    } catch (error) {
      console.error('[DataMigrationService] Platform extensions validation failed:', error);
      return false;
    }
  }

  private async migrateThemeOverrides(): Promise<boolean> {
    try {
      console.log('[DataMigrationService] Migrating theme overrides');
      
      const themeOverrides = StorageService.getThemeOverrides();
      if (!themeOverrides || Object.keys(themeOverrides).length === 0) {
        console.log('[DataMigrationService] No theme overrides to migrate');
        return true;
      }

      if (!this.isDryRun) {
        for (const [themeId, override] of Object.entries(themeOverrides)) {
          const key = `token-model:unified:theme-override-${themeId}`;
          unifiedStorageService.setData(key, override, 'ThemeOverrideFile');
        }
      }

      console.log('[DataMigrationService] Theme overrides migration completed');
      return true;
    } catch (error) {
      console.error('[DataMigrationService] Theme overrides migration failed:', error);
      return false;
    }
  }

  private async rollbackThemeOverrides(): Promise<boolean> {
    try {
      console.log('[DataMigrationService] Rolling back theme overrides migration');
      
      if (!this.isDryRun) {
        // Remove all theme override keys
        const keys = Object.keys(localStorage).filter(key => 
          key.startsWith('token-model:unified:theme-override-')
        );
        keys.forEach(key => unifiedStorageService.deleteData(key));
      }

      return true;
    } catch (error) {
      console.error('[DataMigrationService] Theme overrides rollback failed:', error);
      return false;
    }
  }

  private async validateThemeOverrides(): Promise<boolean> {
    try {
      const themeOverrides = StorageService.getThemeOverrides();
      if (!themeOverrides) return true;

      for (const themeId of Object.keys(themeOverrides)) {
        const key = `token-model:unified:theme-override-${themeId}`;
        const override = unifiedStorageService.getData<ThemeOverrideFile>(key, 'ThemeOverrideFile');
        if (!override) return false;
      }

      return true;
    } catch (error) {
      console.error('[DataMigrationService] Theme overrides validation failed:', error);
      return false;
    }
  }

  private async migrateSourceContext(): Promise<boolean> {
    try {
      console.log('[DataMigrationService] Migrating source context');
      
      const sourceContext = StorageService.getSourceContext();
      if (!sourceContext) {
        console.log('[DataMigrationService] No source context to migrate');
        return true;
      }

      if (!this.isDryRun) {
        unifiedStorageService.setData('token-model:unified:source-context', sourceContext);
      }

      console.log('[DataMigrationService] Source context migration completed');
      return true;
    } catch (error) {
      console.error('[DataMigrationService] Source context migration failed:', error);
      return false;
    }
  }

  private async rollbackSourceContext(): Promise<boolean> {
    try {
      console.log('[DataMigrationService] Rolling back source context migration');
      
      if (!this.isDryRun) {
        unifiedStorageService.deleteData('token-model:unified:source-context');
      }

      return true;
    } catch (error) {
      console.error('[DataMigrationService] Source context rollback failed:', error);
      return false;
    }
  }

  private async validateSourceContext(): Promise<boolean> {
    try {
      const sourceContext = unifiedStorageService.getData('token-model:unified:source-context');
      return sourceContext !== null;
    } catch (error) {
      console.error('[DataMigrationService] Source context validation failed:', error);
      return false;
    }
  }

  private async migrateLocalEdits(): Promise<boolean> {
    try {
      console.log('[DataMigrationService] Migrating local edits');
      
      const localEdits = StorageService.getLocalEdits();
      if (!localEdits) {
        console.log('[DataMigrationService] No local edits to migrate');
        return true;
      }

      if (!this.isDryRun) {
        unifiedStorageService.setData('token-model:unified:local-edits', localEdits);
      }

      console.log('[DataMigrationService] Local edits migration completed');
      return true;
    } catch (error) {
      console.error('[DataMigrationService] Local edits migration failed:', error);
      return false;
    }
  }

  private async rollbackLocalEdits(): Promise<boolean> {
    try {
      console.log('[DataMigrationService] Rolling back local edits migration');
      
      if (!this.isDryRun) {
        unifiedStorageService.deleteData('token-model:unified:local-edits');
      }

      return true;
    } catch (error) {
      console.error('[DataMigrationService] Local edits rollback failed:', error);
      return false;
    }
  }

  private async validateLocalEdits(): Promise<boolean> {
    try {
      const localEdits = unifiedStorageService.getData('token-model:unified:local-edits');
      return localEdits !== null;
    } catch (error) {
      console.error('[DataMigrationService] Local edits validation failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const dataMigrationService = DataMigrationService.getInstance();

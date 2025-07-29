import type { ComponentCategory, ComponentProperty, Component } from '@token-model/data-model';

export interface ComponentRegistryExport {
  exportDate: string;
  componentCategories: ComponentCategory[];
  componentProperties: ComponentProperty[];
  components: Component[];
  summary: {
    totalCategories: number;
    totalProperties: number;
    totalComponents: number;
    propertyTypeDistribution: {
      boolean: number;
      list: number;
    };
    componentsByCategory: Array<{
      categoryName: string;
      count: number;
    }>;
  };
}

export interface ComponentRegistryChangeLog {
  exportDate: string;
  changes: Array<{
    type: 'category' | 'property' | 'component';
    action: 'added' | 'modified' | 'removed';
    entityName: string;
    entityId: string;
    timestamp: string;
    details?: string;
  }>;
  summary: {
    totalChanges: number;
    changesByType: {
      category: number;
      property: number;
      component: number;
    };
    changesByAction: {
      added: number;
      modified: number;
      removed: number;
    };
  };
}

export interface ComponentRegistryValidationReport {
  exportDate: string;
  isValid: boolean;
  errors: Array<{
    type: string;
    message: string;
    entityId?: string;
    severity: 'error' | 'warning' | 'info';
  }>;
  summary: {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsBySeverity: {
      error: number;
      warning: number;
      info: number;
    };
  };
}

export const exportComponentRegistryData = (
  componentCategories: ComponentCategory[],
  componentProperties: ComponentProperty[],
  components: Component[]
): ComponentRegistryExport => {
  const propertyTypeDistribution = {
    boolean: componentProperties.filter(p => p.type === 'boolean').length,
    list: componentProperties.filter(p => p.type === 'list').length,
  };

  const componentsByCategory = componentCategories.map(category => ({
    categoryName: category.displayName,
    count: components.filter(c => c.componentCategoryId === category.id).length,
  }));

  return {
    exportDate: new Date().toISOString(),
    componentCategories,
    componentProperties,
    components,
    summary: {
      totalCategories: componentCategories.length,
      totalProperties: componentProperties.length,
      totalComponents: components.length,
      propertyTypeDistribution,
      componentsByCategory,
    },
  };
};

export const exportComponentRegistryChangeLog = (
  changes: Array<{
    type: 'category' | 'property' | 'component';
    action: 'added' | 'modified' | 'removed';
    entityName: string;
    entityId: string;
    timestamp: string;
    details?: string;
  }>
): ComponentRegistryChangeLog => {
  const changesByType = {
    category: changes.filter(c => c.type === 'category').length,
    property: changes.filter(c => c.type === 'property').length,
    component: changes.filter(c => c.type === 'component').length,
  };

  const changesByAction = {
    added: changes.filter(c => c.action === 'added').length,
    modified: changes.filter(c => c.action === 'modified').length,
    removed: changes.filter(c => c.action === 'removed').length,
  };

  return {
    exportDate: new Date().toISOString(),
    changes,
    summary: {
      totalChanges: changes.length,
      changesByType,
      changesByAction,
    },
  };
};

export const exportComponentRegistryValidationReport = (
  isValid: boolean,
  errors: Array<{
    type: string;
    message: string;
    entityId?: string;
    severity: 'error' | 'warning' | 'info';
  }>
): ComponentRegistryValidationReport => {
  const errorsByType: Record<string, number> = {};
  const errorsBySeverity = {
    error: errors.filter(e => e.severity === 'error').length,
    warning: errors.filter(e => e.severity === 'warning').length,
    info: errors.filter(e => e.severity === 'info').length,
  };

  errors.forEach(error => {
    errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
  });

  return {
    exportDate: new Date().toISOString(),
    isValid,
    errors,
    summary: {
      totalErrors: errors.length,
      errorsByType,
      errorsBySeverity,
    },
  };
};

export const downloadAsJson = (data: unknown, filename: string): void => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}; 
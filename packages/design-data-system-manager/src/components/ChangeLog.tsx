import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  useColorMode,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from '@chakra-ui/react';
import {
  Plus,
  Minus,
  Edit,
  FileCode,
  Palette,
  Layers,
  Tag,
  Database,
  Settings,
  FunctionSquareIcon,
  SquareFunctionIcon,
  Folders,
  Settings2,
  FigmaIcon,
  SquareStack,
  Boxes,
  FoldersIcon,
  MonitorSmartphone,
  BookMarked,
  PencilRuler,
} from 'lucide-react';
import TokenIcon from '../icons/TokenIcon';
import { Figma } from 'lucide-react';
import { OverrideTrackingService } from '../services/overrideTrackingService';

interface ChangeLogProps {
  previousData?: Record<string, unknown> | null | undefined;
  currentData: Record<string, unknown> | null | undefined;
}

interface ChangeEntry {
  type: 'added' | 'removed' | 'modified';
  entityType: string;
  entityId: string;
  entityName: string;
  changes: Array<{
    field: string;
    oldValue?: unknown;
    newValue?: unknown;
    context?: string;
  }>;
}

const getEntityIcon = (entityType: string) => {
  switch (entityType) {
    case 'token': return TokenIcon;
    case 'theme': return Palette;
    case 'dimension': return SquareStack;
    case 'mode': return Settings;
    case 'resolvedValueType': return PencilRuler;
    case 'taxonomy': return Tag;
    case 'term': return Tag;
    case 'algorithm': return SquareFunctionIcon;
    case 'collection': return FoldersIcon;
    case 'platform': return MonitorSmartphone;
    case 'platformExtensionFile': return FileCode;
    case 'repository': return BookMarked;
    case 'figmaConfiguration': return Figma;
    case 'componentProperty': return Settings2;
    case 'componentCategory': return FoldersIcon;
    case 'component': return Boxes;
    default: return FileCode;
  }
};

const getChangeIcon = (type: 'added' | 'removed' | 'modified') => {
  switch (type) {
    case 'added': return Plus;
    case 'removed': return Minus;
    case 'modified': return Edit;
  }
};

const formatValue = (value: unknown, maxLength: number = 50): string => {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') {
    return value.length > maxLength ? `${value.substring(0, maxLength)}...` : value;
  }
  if (typeof value === 'object') {
    const str = JSON.stringify(value);
    return str.length > maxLength ? `${str.substring(0, maxLength)}...` : str;
  }
  return String(value);
};

const compareValuesByMode = (oldValues: unknown[], newValues: unknown[]): Array<{
  field: string;
  oldValue?: unknown;
  newValue?: unknown;
  context?: string;
}> => {
  const changes: Array<{
    field: string;
    oldValue?: unknown;
    newValue?: unknown;
    context?: string;
  }> = [];

  // Create maps for easier comparison
  const oldMap = new Map();
  const newMap = new Map();

  oldValues?.forEach((item, index) => {
    if (typeof item === 'object' && item !== null) {
      const key = (item as { modeIds?: string[] }).modeIds?.join(',') || `index-${index}`;
      oldMap.set(key, item);
    }
  });

  newValues?.forEach((item, index) => {
    if (typeof item === 'object' && item !== null) {
      const key = (item as { modeIds?: string[] }).modeIds?.join(',') || `index-${index}`;
      newMap.set(key, item);
    }
  });

  // Check for added, removed, and modified values
  for (const [key, newItem] of newMap) {
    const oldItem = oldMap.get(key);
    if (!oldItem) {
      // Added
      changes.push({
        field: 'valuesByMode',
        newValue: (newItem as { value?: unknown }).value,
        context: `Added for modes: ${(newItem as { modeIds?: string[] }).modeIds?.join(', ') || 'global'}`,
      });
    } else if (JSON.stringify((oldItem as { value?: unknown }).value) !== JSON.stringify((newItem as { value?: unknown }).value)) {
      // Modified
      changes.push({
        field: 'valuesByMode',
        oldValue: (oldItem as { value?: unknown }).value,
        newValue: (newItem as { value?: unknown }).value,
        context: `Modified for modes: ${(newItem as { modeIds?: string[] }).modeIds?.join(', ') || 'global'}`,
      });
    }
  }

  for (const [key, oldItem] of oldMap) {
    if (!newMap.has(key)) {
      // Removed
      changes.push({
        field: 'valuesByMode',
        oldValue: (oldItem as { value?: unknown }).value,
        context: `Removed for modes: ${(oldItem as { modeIds?: string[] }).modeIds?.join(', ') || 'global'}`,
      });
    }
  }

  return changes;
};

const comparePlatformOverrides = (oldOverrides: unknown[], newOverrides: unknown[]): Array<{
  field: string;
  oldValue?: unknown;
  newValue?: unknown;
  context?: string;
}> => {
  const changes: Array<{
    field: string;
    oldValue?: unknown;
    newValue?: unknown;
    context?: string;
  }> = [];

  const oldMap = new Map();
  const newMap = new Map();

  oldOverrides?.forEach(item => {
    if (typeof item === 'object' && item !== null) {
      oldMap.set((item as { platformId?: string }).platformId, item);
    }
  });

  newOverrides?.forEach(item => {
    if (typeof item === 'object' && item !== null) {
      newMap.set((item as { platformId?: string }).platformId, item);
    }
  });

  for (const [platformId, newOverride] of newMap) {
    const oldOverride = oldMap.get(platformId);
    if (!oldOverride) {
      changes.push({
        field: 'platformOverrides',
        newValue: (newOverride as { value?: unknown }).value,
        context: `Added for platform: ${platformId}`,
      });
    } else if ((oldOverride as { value?: unknown }).value !== (newOverride as { value?: unknown }).value) {
      changes.push({
        field: 'platformOverrides',
        oldValue: (oldOverride as { value?: unknown }).value,
        newValue: (newOverride as { value?: unknown }).value,
        context: `Modified for platform: ${platformId}`,
      });
    }
  }

  for (const [platformId, oldOverride] of oldMap) {
    if (!newMap.has(platformId)) {
      changes.push({
        field: 'platformOverrides',
        oldValue: (oldOverride as { value?: unknown }).value,
        context: `Removed for platform: ${platformId}`,
      });
    }
  }

  return changes;
};

const compareArrays = (oldArray: unknown[], newArray: unknown[], idField: string = 'id'): Array<{
  field: string;
  oldValue?: unknown;
  newValue?: unknown;
  context?: string;
}> => {
  const changes: Array<{
    field: string;
    oldValue?: unknown;
    newValue?: unknown;
    context?: string;
  }> = [];

  const oldMap = new Map();
  const newMap = new Map();

  oldArray?.forEach(item => {
    if (typeof item === 'object' && item !== null) {
      oldMap.set((item as Record<string, unknown>)[idField], item);
    }
  });

  newArray?.forEach(item => {
    if (typeof item === 'object' && item !== null) {
      newMap.set((item as Record<string, unknown>)[idField], item);
    }
  });

  for (const [id, newItem] of newMap) {
    const oldItem = oldMap.get(id);
    if (!oldItem) {
      const item = newItem as Record<string, unknown>;
      changes.push({
        field: 'array',
        newValue: (item.name || item.displayName || id) as string,
        context: `Added ${id}`,
      });
    }
  }

  for (const [id, oldItem] of oldMap) {
    if (!newMap.has(id)) {
      const item = oldItem as Record<string, unknown>;
      changes.push({
        field: 'array',
        oldValue: (item.name || item.displayName || id) as string,
        context: `Removed ${id}`,
      });
    }
  }

  return changes;
};

const detectChanges = (previousData: Record<string, unknown> | null | undefined, currentData: Record<string, unknown> | null | undefined): ChangeEntry[] => {
  const changes: ChangeEntry[] = [];

  // Handle null/undefined data
  if (!previousData || !currentData) {
    return changes;
  }

  // Compare linked repositories
  const oldRepositories = (previousData.linkedRepositories as unknown[]) || [];
  const newRepositories = (currentData.linkedRepositories as unknown[]) || [];
  
  const oldRepoMap = new Map();
  const newRepoMap = new Map();

  oldRepositories.forEach((r: unknown) => {
    if (typeof r === 'object' && r !== null) {
      const repo = r as { id?: string };
      if (repo.id) {
        oldRepoMap.set(repo.id, repo);
      }
    }
  });

  newRepositories.forEach((r: unknown) => {
    if (typeof r === 'object' && r !== null) {
      const repo = r as { id?: string };
      if (repo.id) {
        newRepoMap.set(repo.id, repo);
      }
    }
  });

  // Check for added repositories
  for (const [id, repo] of newRepoMap) {
    if (!oldRepoMap.has(id)) {
      const repoObj = repo as { type?: string; repositoryUri?: string };
      changes.push({
        type: 'added',
        entityType: 'repository',
        entityId: id,
        entityName: `${repoObj.type || 'unknown'} repository`,
        changes: [{
          field: 'repository',
          newValue: `Added ${repoObj.type || 'unknown'} repository: ${repoObj.repositoryUri || id}`,
        }],
      });
    }
  }

  // Check for removed repositories
  for (const [id, repo] of oldRepoMap) {
    if (!newRepoMap.has(id)) {
      const repoObj = repo as { type?: string; repositoryUri?: string };
      changes.push({
        type: 'removed',
        entityType: 'repository',
        entityId: id,
        entityName: `${repoObj.type || 'unknown'} repository`,
        changes: [{
          field: 'repository',
          oldValue: `Removed ${repoObj.type || 'unknown'} repository: ${repoObj.repositoryUri || id}`,
        }],
      });
    }
  }

  // Compare platform extensions
  const oldExtensions = Object.values(previousData.platformExtensions as Record<string, unknown> || {});
  const newExtensions = Object.values(currentData.platformExtensions as Record<string, unknown> || {});
  
  const oldExtMap = new Map();
  const newExtMap = new Map();

  oldExtensions.forEach((e: unknown) => {
    if (typeof e === 'object' && e !== null) {
      const ext = e as { platformId?: string };
      if (ext.platformId) {
        oldExtMap.set(ext.platformId, ext);
      }
    }
  });

  newExtensions.forEach((e: unknown) => {
    if (typeof e === 'object' && e !== null) {
      const ext = e as { platformId?: string };
      if (ext.platformId) {
        newExtMap.set(ext.platformId, ext);
      }
    }
  });

  // Check for added extensions
  for (const [id] of newExtMap) {
    if (!oldExtMap.has(id)) {
      changes.push({
        type: 'added',
        entityType: 'platformExtension',
        entityId: id,
        entityName: `Platform Extension: ${id}`,
        changes: [{
          field: 'extension',
          newValue: `Added platform extension for: ${id}`,
        }],
      });
    }
  }

  // Check for removed extensions
  for (const [id] of oldExtMap) {
    if (!newExtMap.has(id)) {
      changes.push({
        type: 'removed',
        entityType: 'platformExtension',
        entityId: id,
        entityName: `Platform Extension: ${id}`,
        changes: [{
          field: 'extension',
          oldValue: `Removed platform extension for: ${id}`,
        }],
      });
    }
  }

  // Compare tokens
  const oldTokens = (previousData.tokens as unknown[]) || [];
  const newTokens = (currentData.tokens as unknown[]) || [];
  
  const oldTokenMap = new Map();
  const newTokenMap = new Map();

  oldTokens.forEach((t: unknown) => {
    if (typeof t === 'object' && t !== null) {
      const token = t as { id?: string };
      if (token.id) {
        oldTokenMap.set(token.id, token);
      }
    }
  });

  newTokens.forEach((t: unknown) => {
    if (typeof t === 'object' && t !== null) {
      const token = t as { id?: string };
      if (token.id) {
        newTokenMap.set(token.id, token);
      }
    }
  });

  // Check for added tokens
  for (const [id, token] of newTokenMap) {
    if (!oldTokenMap.has(id)) {
      const tokenObj = token as { displayName?: string; resolvedValueTypeId?: string };
      changes.push({
        type: 'added',
        entityType: 'token',
        entityId: id,
        entityName: tokenObj.displayName || id,
        changes: [{
          field: 'token',
          newValue: `Added token: ${tokenObj.displayName || id} (${tokenObj.resolvedValueTypeId || 'unknown'})`,
        }],
      });
    }
  }

  // Check for removed tokens
  for (const [id, token] of oldTokenMap) {
    if (!newTokenMap.has(id)) {
      const tokenObj = token as { displayName?: string };
      changes.push({
        type: 'removed',
        entityType: 'token',
        entityId: id,
        entityName: tokenObj.displayName || id,
        changes: [{
          field: 'token',
          oldValue: `Removed token: ${tokenObj.displayName || id}`,
        }],
      });
    }
  }

  // Check for modified tokens
  for (const [id, newToken] of newTokenMap) {
    const oldToken = oldTokenMap.get(id);
    if (oldToken) {
      const tokenChanges: Array<{
        field: string;
        oldValue?: unknown;
        newValue?: unknown;
        context?: string;
      }> = [];

      const newTokenObj = newToken as Record<string, unknown>;
      const oldTokenObj = oldToken as Record<string, unknown>;

      // Compare basic fields
      const fieldsToCompare = ['displayName', 'description', 'tokenTier', 'status', 'themeable', 'private'];
      fieldsToCompare.forEach(field => {
        if (oldTokenObj[field] !== newTokenObj[field]) {
          tokenChanges.push({
            field,
            oldValue: formatValue(oldTokenObj[field]),
            newValue: formatValue(newTokenObj[field]),
          });
        }
      });

      // Compare valuesByMode
      const valueChanges = compareValuesByMode(
        oldTokenObj.valuesByMode as unknown[] || [], 
        newTokenObj.valuesByMode as unknown[] || []
      );
      tokenChanges.push(...valueChanges);

      // Compare platform overrides within valuesByMode
      const oldValuesByMode = oldTokenObj.valuesByMode as unknown[] || [];
      const newValuesByMode = newTokenObj.valuesByMode as unknown[] || [];
      if (oldValuesByMode.length > 0 || newValuesByMode.length > 0) {
        for (let i = 0; i < Math.max(oldValuesByMode.length, newValuesByMode.length); i++) {
          const oldValue = oldValuesByMode[i] as { platformOverrides?: unknown[] } | undefined;
          const newValue = newValuesByMode[i] as { platformOverrides?: unknown[] } | undefined;
          if (oldValue?.platformOverrides || newValue?.platformOverrides) {
            const overrideChanges = comparePlatformOverrides(
              oldValue?.platformOverrides || [],
              newValue?.platformOverrides || []
            );
            tokenChanges.push(...overrideChanges);
          }
        }
      }

      if (tokenChanges.length > 0) {
        changes.push({
          type: 'modified',
          entityType: 'token',
          entityId: id,
          entityName: newTokenObj.displayName as string || id,
          changes: tokenChanges,
        });
      }
    }
  }

  // Compare themes
  const oldThemes = (previousData.themes as unknown[]) || [];
  const newThemes = (currentData.themes as unknown[]) || [];
  
  const oldThemeMap = new Map();
  const newThemeMap = new Map();

  oldThemes.forEach((t: unknown) => {
    if (typeof t === 'object' && t !== null) {
      const theme = t as { id?: string };
      if (theme.id) {
        oldThemeMap.set(theme.id, theme);
      }
    }
  });

  newThemes.forEach((t: unknown) => {
    if (typeof t === 'object' && t !== null) {
      const theme = t as { id?: string };
      if (theme.id) {
        newThemeMap.set(theme.id, theme);
      }
    }
  });

  for (const [id, theme] of newThemeMap) {
    if (!oldThemeMap.has(id)) {
      const themeObj = theme as { displayName?: string };
      changes.push({
        type: 'added',
        entityType: 'theme',
        entityId: id,
        entityName: themeObj.displayName || id,
        changes: [{
          field: 'theme',
          newValue: `Added theme: ${themeObj.displayName || id}`,
        }],
      });
    } else {
      const oldTheme = oldThemeMap.get(id);
      const themeChanges: Array<{
        field: string;
        oldValue?: unknown;
        newValue?: unknown;
        context?: string;
      }> = [];

      const oldThemeObj = oldTheme as Record<string, unknown>;
      const themeObj = theme as Record<string, unknown>;

      ['displayName', 'description', 'isDefault'].forEach(field => {
        if (oldThemeObj[field] !== themeObj[field]) {
          themeChanges.push({
            field,
            oldValue: formatValue(oldThemeObj[field]),
            newValue: formatValue(themeObj[field]),
          });
        }
      });

      if (themeChanges.length > 0) {
        changes.push({
          type: 'modified',
          entityType: 'theme',
          entityId: id,
          entityName: themeObj.displayName as string || id,
          changes: themeChanges,
        });
      }
    }
  }

  for (const [id, theme] of oldThemeMap) {
    if (!newThemeMap.has(id)) {
      const themeObj = theme as { displayName?: string };
      changes.push({
        type: 'removed',
        entityType: 'theme',
        entityId: id,
        entityName: themeObj.displayName || id,
        changes: [{
          field: 'theme',
          oldValue: `Removed theme: ${themeObj.displayName || id}`,
        }],
      });
    }
  }

  // Compare dimensions and modes
  const oldDimensions = (previousData.dimensions as unknown[]) || [];
  const newDimensions = (currentData.dimensions as unknown[]) || [];
  
  const oldDimensionMap = new Map();
  const newDimensionMap = new Map();

  oldDimensions.forEach((d: unknown) => {
    if (typeof d === 'object' && d !== null) {
      const dimension = d as { id?: string };
      if (dimension.id) {
        oldDimensionMap.set(dimension.id, dimension);
      }
    }
  });

  newDimensions.forEach((d: unknown) => {
    if (typeof d === 'object' && d !== null) {
      const dimension = d as { id?: string };
      if (dimension.id) {
        newDimensionMap.set(dimension.id, dimension);
      }
    }
  });

  for (const [id, dimension] of newDimensionMap) {
    if (!oldDimensionMap.has(id)) {
      const dimensionObj = dimension as { displayName?: string };
      changes.push({
        type: 'added',
        entityType: 'dimension',
        entityId: id,
        entityName: dimensionObj.displayName || id,
        changes: [{
          field: 'dimension',
          newValue: `Added dimension: ${dimensionObj.displayName || id}`,
        }],
      });
    } else {
      const oldDimension = oldDimensionMap.get(id);
      const dimensionChanges: Array<{
        field: string;
        oldValue?: unknown;
        newValue?: unknown;
        context?: string;
      }> = [];

      const oldDimensionObj = oldDimension as Record<string, unknown>;
      const dimensionObj = dimension as Record<string, unknown>;

      ['displayName', 'description', 'required', 'defaultMode'].forEach(field => {
        if (oldDimensionObj[field] !== dimensionObj[field]) {
          dimensionChanges.push({
            field,
            oldValue: formatValue(oldDimensionObj[field]),
            newValue: formatValue(dimensionObj[field]),
          });
        }
      });

      // Compare modes
      const modeChanges = compareArrays(
        oldDimensionObj.modes as unknown[] || [], 
        dimensionObj.modes as unknown[] || []
      );
      dimensionChanges.push(...modeChanges);

      if (dimensionChanges.length > 0) {
        changes.push({
          type: 'modified',
          entityType: 'dimension',
          entityId: id,
          entityName: dimensionObj.displayName as string || id,
          changes: dimensionChanges,
        });
      }
    }
  }

  for (const [id, dimension] of oldDimensionMap) {
    if (!newDimensionMap.has(id)) {
      const dimensionObj = dimension as { displayName?: string };
      changes.push({
        type: 'removed',
        entityType: 'dimension',
        entityId: id,
        entityName: dimensionObj.displayName || id,
        changes: [{
          field: 'dimension',
          oldValue: `Removed dimension: ${dimensionObj.displayName || id}`,
        }],
      });
    }
  }

  // Compare resolved value types
  const oldValueTypes = (previousData.resolvedValueTypes as unknown[]) || [];
  const newValueTypes = (currentData.resolvedValueTypes as unknown[]) || [];
  
  const oldValueTypeMap = new Map();
  const newValueTypeMap = new Map();

  oldValueTypes.forEach((v: unknown) => {
    if (typeof v === 'object' && v !== null) {
      const valueType = v as { id?: string };
      if (valueType.id) {
        oldValueTypeMap.set(valueType.id, valueType);
      }
    }
  });

  newValueTypes.forEach((v: unknown) => {
    if (typeof v === 'object' && v !== null) {
      const valueType = v as { id?: string };
      if (valueType.id) {
        newValueTypeMap.set(valueType.id, valueType);
      }
    }
  });

  for (const [id, valueType] of newValueTypeMap) {
    if (!oldValueTypeMap.has(id)) {
      const valueTypeObj = valueType as { displayName?: string };
      changes.push({
        type: 'added',
        entityType: 'resolvedValueType',
        entityId: id,
        entityName: valueTypeObj.displayName || id,
        changes: [{
          field: 'resolvedValueType',
          newValue: `Added value type: ${valueTypeObj.displayName || id}`,
        }],
      });
    } else {
      const oldValueType = oldValueTypeMap.get(id);
      const valueTypeChanges: Array<{
        field: string;
        oldValue?: unknown;
        newValue?: unknown;
        context?: string;
      }> = [];

      const oldValueTypeObj = oldValueType as Record<string, unknown>;
      const valueTypeObj = valueType as Record<string, unknown>;

      ['displayName', 'description', 'type'].forEach(field => {
        if (oldValueTypeObj[field] !== valueTypeObj[field]) {
          valueTypeChanges.push({
            field,
            oldValue: formatValue(oldValueTypeObj[field]),
            newValue: formatValue(valueTypeObj[field]),
          });
        }
      });

      if (valueTypeChanges.length > 0) {
        changes.push({
          type: 'modified',
          entityType: 'resolvedValueType',
          entityId: id,
          entityName: valueTypeObj.displayName as string || id,
          changes: valueTypeChanges,
        });
      }
    }
  }

  for (const [id, valueType] of oldValueTypeMap) {
    if (!newValueTypeMap.has(id)) {
      const valueTypeObj = valueType as { displayName?: string };
      changes.push({
        type: 'removed',
        entityType: 'resolvedValueType',
        entityId: id,
        entityName: valueTypeObj.displayName || id,
        changes: [{
          field: 'resolvedValueType',
          oldValue: `Removed value type: ${valueTypeObj.displayName || id}`,
        }],
      });
    }
  }

  // Compare taxonomies and terms
  const oldTaxonomies = (previousData.taxonomies as unknown[]) || [];
  const newTaxonomies = (currentData.taxonomies as unknown[]) || [];
  
  const oldTaxonomyMap = new Map();
  const newTaxonomyMap = new Map();

  oldTaxonomies.forEach((t: unknown) => {
    if (typeof t === 'object' && t !== null) {
      const taxonomy = t as { id?: string };
      if (taxonomy.id) {
        oldTaxonomyMap.set(taxonomy.id, taxonomy);
      }
    }
  });

  newTaxonomies.forEach((t: unknown) => {
    if (typeof t === 'object' && t !== null) {
      const taxonomy = t as { id?: string };
      if (taxonomy.id) {
        newTaxonomyMap.set(taxonomy.id, taxonomy);
      }
    }
  });

  for (const [id, taxonomy] of newTaxonomyMap) {
    if (!oldTaxonomyMap.has(id)) {
      const taxonomyObj = taxonomy as { name?: string };
      changes.push({
        type: 'added',
        entityType: 'taxonomy',
        entityId: id,
        entityName: taxonomyObj.name || id,
        changes: [{
          field: 'taxonomy',
          newValue: `Added taxonomy: ${taxonomyObj.name || id}`,
        }],
      });
    } else {
      const oldTaxonomy = oldTaxonomyMap.get(id);
      const taxonomyChanges: Array<{
        field: string;
        oldValue?: unknown;
        newValue?: unknown;
        context?: string;
      }> = [];

      const oldTaxonomyObj = oldTaxonomy as Record<string, unknown>;
      const taxonomyObj = taxonomy as Record<string, unknown>;

      ['name', 'description'].forEach(field => {
        if (oldTaxonomyObj[field] !== taxonomyObj[field]) {
          taxonomyChanges.push({
            field,
            oldValue: formatValue(oldTaxonomyObj[field]),
            newValue: formatValue(taxonomyObj[field]),
          });
        }
      });

      // Compare terms
      const termChanges = compareArrays(
        oldTaxonomyObj.terms as unknown[] || [], 
        taxonomyObj.terms as unknown[] || []
      );
      taxonomyChanges.push(...termChanges);

      if (taxonomyChanges.length > 0) {
        changes.push({
          type: 'modified',
          entityType: 'taxonomy',
          entityId: id,
          entityName: taxonomyObj.name as string || id,
          changes: taxonomyChanges,
        });
      }
    }
  }

  for (const [id, taxonomy] of oldTaxonomyMap) {
    if (!newTaxonomyMap.has(id)) {
      const taxonomyObj = taxonomy as { name?: string };
      changes.push({
        type: 'removed',
        entityType: 'taxonomy',
        entityId: id,
        entityName: taxonomyObj.name || id,
        changes: [{
          field: 'taxonomy',
          oldValue: `Removed taxonomy: ${taxonomyObj.name || id}`,
        }],
      });
    }
  }

  // Compare algorithms
  const oldAlgorithms = (previousData.algorithms as unknown[]) || [];
  const newAlgorithms = (currentData.algorithms as unknown[]) || [];
  
  const oldAlgorithmMap = new Map();
  const newAlgorithmMap = new Map();

  oldAlgorithms.forEach((a: unknown) => {
    if (typeof a === 'object' && a !== null) {
      const algorithm = a as { id?: string };
      if (algorithm.id) {
        oldAlgorithmMap.set(algorithm.id, algorithm);
      }
    }
  });

  newAlgorithms.forEach((a: unknown) => {
    if (typeof a === 'object' && a !== null) {
      const algorithm = a as { id?: string };
      if (algorithm.id) {
        newAlgorithmMap.set(algorithm.id, algorithm);
      }
    }
  });

  for (const [id, algorithm] of newAlgorithmMap) {
    if (!oldAlgorithmMap.has(id)) {
      const algorithmObj = algorithm as { name?: string };
      changes.push({
        type: 'added',
        entityType: 'algorithm',
        entityId: id,
        entityName: algorithmObj.name || id,
        changes: [{
          field: 'algorithm',
          newValue: `Added algorithm: ${algorithmObj.name || id}`,
        }],
      });
    } else {
      const oldAlgorithm = oldAlgorithmMap.get(id);
      const algorithmChanges: Array<{
        field: string;
        oldValue?: unknown;
        newValue?: unknown;
        context?: string;
      }> = [];

      const oldAlgorithmObj = oldAlgorithm as Record<string, unknown>;
      const algorithmObj = algorithm as Record<string, unknown>;

      ['name', 'description', 'resolvedValueTypeId'].forEach(field => {
        if (oldAlgorithmObj[field] !== algorithmObj[field]) {
          algorithmChanges.push({
            field,
            oldValue: formatValue(oldAlgorithmObj[field]),
            newValue: formatValue(algorithmObj[field]),
          });
        }
      });

      if (algorithmChanges.length > 0) {
        changes.push({
          type: 'modified',
          entityType: 'algorithm',
          entityId: id,
          entityName: algorithmObj.name as string || id,
          changes: algorithmChanges,
        });
      }
    }
  }

  for (const [id, algorithm] of oldAlgorithmMap) {
    if (!newAlgorithmMap.has(id)) {
      const algorithmObj = algorithm as { name?: string };
      changes.push({
        type: 'removed',
        entityType: 'algorithm',
        entityId: id,
        entityName: algorithmObj.name || id,
        changes: [{
          field: 'algorithm',
          oldValue: `Removed algorithm: ${algorithmObj.name || id}`,
        }],
      });
    }
  }

  // Compare component properties
  const oldComponentProperties = (previousData.componentProperties as unknown[]) || [];
  const newComponentProperties = (currentData.componentProperties as unknown[]) || [];
  
  const oldComponentPropertyMap = new Map();
  const newComponentPropertyMap = new Map();

  oldComponentProperties.forEach((cp: unknown) => {
    if (typeof cp === 'object' && cp !== null) {
      const componentProperty = cp as { id?: string };
      if (componentProperty.id) {
        oldComponentPropertyMap.set(componentProperty.id, componentProperty);
      }
    }
  });

  newComponentProperties.forEach((cp: unknown) => {
    if (typeof cp === 'object' && cp !== null) {
      const componentProperty = cp as { id?: string };
      if (componentProperty.id) {
        newComponentPropertyMap.set(componentProperty.id, componentProperty);
      }
    }
  });

  // Check for added component properties
  for (const [id, componentProperty] of newComponentPropertyMap) {
    if (!oldComponentPropertyMap.has(id)) {
      const componentPropertyObj = componentProperty as { displayName?: string; type?: string };
      changes.push({
        type: 'added',
        entityType: 'componentProperty',
        entityId: id,
        entityName: componentPropertyObj.displayName || id,
        changes: [{
          field: 'componentProperty',
          newValue: `Added component property: ${componentPropertyObj.displayName || id} (${componentPropertyObj.type || 'unknown'})`,
        }],
      });
    } else {
      // Check for modified component properties
      const oldComponentProperty = oldComponentPropertyMap.get(id);
      const componentPropertyChanges: Array<{
        field: string;
        oldValue?: unknown;
        newValue?: unknown;
        context?: string;
      }> = [];

      const oldComponentPropertyObj = oldComponentProperty as Record<string, unknown>;
      const componentPropertyObj = componentProperty as Record<string, unknown>;

      // Compare basic fields
      ['displayName', 'description', 'type', 'default'].forEach(field => {
        if (oldComponentPropertyObj[field] !== componentPropertyObj[field]) {
          componentPropertyChanges.push({
            field,
            oldValue: formatValue(oldComponentPropertyObj[field]),
            newValue: formatValue(componentPropertyObj[field]),
          });
        }
      });

      // Compare options for list type properties
      if (componentPropertyObj.type === 'list') {
        const oldOptions = oldComponentPropertyObj.options as unknown[] || [];
        const newOptions = componentPropertyObj.options as unknown[] || [];
        
        const oldOptionsMap = new Map();
        const newOptionsMap = new Map();

        oldOptions.forEach((opt: unknown) => {
          if (typeof opt === 'object' && opt !== null) {
            const option = opt as { id?: string };
            if (option.id) {
              oldOptionsMap.set(option.id, option);
            }
          }
        });

        newOptions.forEach((opt: unknown) => {
          if (typeof opt === 'object' && opt !== null) {
            const option = opt as { id?: string };
            if (option.id) {
              newOptionsMap.set(option.id, option);
            }
          }
        });

        // Check for added options
        for (const [optionId, option] of newOptionsMap) {
          if (!oldOptionsMap.has(optionId)) {
            const optionObj = option as { displayName?: string };
            componentPropertyChanges.push({
              field: 'options',
              newValue: `Added option: ${optionObj.displayName || optionId}`,
              context: 'Component property option',
            });
          } else {
            // Check for modified options
            const oldOption = oldOptionsMap.get(optionId);
            const oldOptionObj = oldOption as Record<string, unknown>;
            const optionObj = option as Record<string, unknown>;

            ['displayName', 'description'].forEach(field => {
              if (oldOptionObj[field] !== optionObj[field]) {
                componentPropertyChanges.push({
                  field: `options.${field}`,
                  oldValue: formatValue(oldOptionObj[field]),
                  newValue: formatValue(optionObj[field]),
                  context: `Option: ${optionObj.displayName || optionId}`,
                });
              }
            });
          }
        }

        // Check for removed options
        for (const [optionId, option] of oldOptionsMap) {
          if (!newOptionsMap.has(optionId)) {
            const optionObj = option as { displayName?: string };
            componentPropertyChanges.push({
              field: 'options',
              oldValue: `Removed option: ${optionObj.displayName || optionId}`,
              context: 'Component property option',
            });
          }
        }
      }

      if (componentPropertyChanges.length > 0) {
        changes.push({
          type: 'modified',
          entityType: 'componentProperty',
          entityId: id,
          entityName: componentPropertyObj.displayName as string || id,
          changes: componentPropertyChanges,
        });
      }
    }
  }

  // Check for removed component properties
  for (const [id, componentProperty] of oldComponentPropertyMap) {
    if (!newComponentPropertyMap.has(id)) {
      const componentPropertyObj = componentProperty as { displayName?: string };
      changes.push({
        type: 'removed',
        entityType: 'componentProperty',
        entityId: id,
        entityName: componentPropertyObj.displayName || id,
        changes: [{
          field: 'componentProperty',
          oldValue: `Removed component property: ${componentPropertyObj.displayName || id}`,
        }],
      });
    }
  }

  // Compare component categories
  const oldComponentCategories = (previousData.componentCategories as unknown[]) || [];
  const newComponentCategories = (currentData.componentCategories as unknown[]) || [];
  
  const oldComponentCategoryMap = new Map();
  const newComponentCategoryMap = new Map();

  oldComponentCategories.forEach((cc: unknown) => {
    if (typeof cc === 'object' && cc !== null) {
      const componentCategory = cc as { id?: string };
      if (componentCategory.id) {
        oldComponentCategoryMap.set(componentCategory.id, componentCategory);
      }
    }
  });

  newComponentCategories.forEach((cc: unknown) => {
    if (typeof cc === 'object' && cc !== null) {
      const componentCategory = cc as { id?: string };
      if (componentCategory.id) {
        newComponentCategoryMap.set(componentCategory.id, componentCategory);
      }
    }
  });

  // Check for added component categories
  for (const [id, componentCategory] of newComponentCategoryMap) {
    if (!oldComponentCategoryMap.has(id)) {
      const componentCategoryObj = componentCategory as { displayName?: string };
      changes.push({
        type: 'added',
        entityType: 'componentCategory',
        entityId: id,
        entityName: componentCategoryObj.displayName || id,
        changes: [{
          field: 'componentCategory',
          newValue: `Added component category: ${componentCategoryObj.displayName || id}`,
        }],
      });
    }
  }

  // Check for removed component categories
  for (const [id, componentCategory] of oldComponentCategoryMap) {
    if (!newComponentCategoryMap.has(id)) {
      const componentCategoryObj = componentCategory as { displayName?: string };
      changes.push({
        type: 'removed',
        entityType: 'componentCategory',
        entityId: id,
        entityName: componentCategoryObj.displayName || id,
        changes: [{
          field: 'componentCategory',
          oldValue: `Removed component category: ${componentCategoryObj.displayName || id}`,
        }],
      });
    }
  }

  // Compare components
  const oldComponents = (previousData.components as unknown[]) || [];
  const newComponents = (currentData.components as unknown[]) || [];
  
  const oldComponentMap = new Map();
  const newComponentMap = new Map();

  oldComponents.forEach((c: unknown) => {
    if (typeof c === 'object' && c !== null) {
      const component = c as { id?: string };
      if (component.id) {
        oldComponentMap.set(component.id, component);
      }
    }
  });

  newComponents.forEach((c: unknown) => {
    if (typeof c === 'object' && c !== null) {
      const component = c as { id?: string };
      if (component.id) {
        newComponentMap.set(component.id, component);
      }
    }
  });

  // Check for added and modified components
  for (const [id, component] of newComponentMap) {
    if (!oldComponentMap.has(id)) {
      const componentObj = component as { displayName?: string; componentCategoryId?: string };
      changes.push({
        type: 'added',
        entityType: 'component',
        entityId: id,
        entityName: componentObj.displayName || id,
        changes: [{
          field: 'component',
          newValue: `Added component: ${componentObj.displayName || id} (Category: ${componentObj.componentCategoryId || 'unknown'})`,
        }],
      });
    } else {
      // Check for modified components
      const oldComponent = oldComponentMap.get(id);
      const componentChanges: Array<{
        field: string;
        oldValue?: unknown;
        newValue?: unknown;
        context?: string;
      }> = [];

      const oldComponentObj = oldComponent as Record<string, unknown>;
      const componentObj = component as Record<string, unknown>;

      // Compare basic fields
      ['displayName', 'description', 'componentCategoryId'].forEach(field => {
        if (oldComponentObj[field] !== componentObj[field]) {
          componentChanges.push({
            field,
            oldValue: formatValue(oldComponentObj[field]),
            newValue: formatValue(componentObj[field]),
          });
        }
      });

      // Compare component properties
      const oldProperties = oldComponentObj.componentProperties as unknown[] || [];
      const newProperties = componentObj.componentProperties as unknown[] || [];
      
      if (oldProperties.length !== newProperties.length) {
        componentChanges.push({
          field: 'componentProperties',
          oldValue: `${oldProperties.length} properties`,
          newValue: `${newProperties.length} properties`,
        });
      }

      if (componentChanges.length > 0) {
        changes.push({
          type: 'modified',
          entityType: 'component',
          entityId: id,
          entityName: componentObj.displayName as string || id,
          changes: componentChanges,
        });
      }
    }
  }

  // Check for removed components
  for (const [id, component] of oldComponentMap) {
    if (!newComponentMap.has(id)) {
      const componentObj = component as { displayName?: string; componentCategoryId?: string };
      changes.push({
        type: 'removed',
        entityType: 'component',
        entityId: id,
        entityName: componentObj.displayName || id,
        changes: [{
          field: 'component',
          oldValue: `Removed component: ${componentObj.displayName || id}`,
        }],
      });
    }
  }

  // Compare platform extensions
  const oldPlatformExtensions = (previousData.platformExtensions as Record<string, unknown>) || {};
  const newPlatformExtensions = (currentData.platformExtensions as Record<string, unknown>) || {};
  
  const oldPlatformExtensionIds = Object.keys(oldPlatformExtensions);
  const newPlatformExtensionIds = Object.keys(newPlatformExtensions);
  
  // Check for added platform extensions
  for (const platformId of newPlatformExtensionIds) {
    if (!oldPlatformExtensionIds.includes(platformId)) {
      const platformExtension = newPlatformExtensions[platformId] as { platformId?: string; metadata?: { name?: string } };
      const displayName = platformExtension.metadata?.name || platformExtension.platformId || platformId;
      changes.push({
        type: 'added',
        entityType: 'platformExtension',
        entityId: platformId,
        entityName: displayName,
        changes: [{
          field: 'platformExtension',
          newValue: `Added platform extension: ${displayName}`,
        }],
      });
    } else {
      // Check for modified platform extensions
      const oldExtension = oldPlatformExtensions[platformId] as Record<string, unknown>;
      const newExtension = newPlatformExtensions[platformId] as Record<string, unknown>;
      
      const extensionChanges: Array<{
        field: string;
        oldValue?: unknown;
        newValue?: unknown;
        context?: string;
      }> = [];

      // Compare metadata
      const oldMetadata = oldExtension.metadata as Record<string, unknown> || {};
      const newMetadata = newExtension.metadata as Record<string, unknown> || {};
      
      ['name', 'description', 'maintainer', 'lastUpdated'].forEach(field => {
        if (oldMetadata[field] !== newMetadata[field]) {
          extensionChanges.push({
            field: `metadata.${field}`,
            oldValue: formatValue(oldMetadata[field]),
            newValue: formatValue(newMetadata[field]),
          });
        }
      });

      // Compare version
      if (oldExtension.version !== newExtension.version) {
        extensionChanges.push({
          field: 'version',
          oldValue: formatValue(oldExtension.version),
          newValue: formatValue(newExtension.version),
        });
      }

      // Compare syntax patterns
      const oldSyntaxPatterns = oldExtension.syntaxPatterns as Record<string, unknown> || {};
      const newSyntaxPatterns = newExtension.syntaxPatterns as Record<string, unknown> || {};
      
      ['prefix', 'suffix', 'delimiter', 'capitalization', 'formatString'].forEach(field => {
        if (oldSyntaxPatterns[field] !== newSyntaxPatterns[field]) {
          extensionChanges.push({
            field: `syntaxPatterns.${field}`,
            oldValue: formatValue(oldSyntaxPatterns[field]),
            newValue: formatValue(newSyntaxPatterns[field]),
          });
        }
      });

      // Compare value formatters
      const oldValueFormatters = oldExtension.valueFormatters as Record<string, unknown> || {};
      const newValueFormatters = newExtension.valueFormatters as Record<string, unknown> || {};
      
      ['color', 'dimension', 'numberPrecision'].forEach(field => {
        if (oldValueFormatters[field] !== newValueFormatters[field]) {
          extensionChanges.push({
            field: `valueFormatters.${field}`,
            oldValue: formatValue(oldValueFormatters[field]),
            newValue: formatValue(newValueFormatters[field]),
          });
        }
      });

      // Compare algorithm variable overrides
      const oldAlgorithmOverrides = oldExtension.algorithmVariableOverrides as unknown[] || [];
      const newAlgorithmOverrides = newExtension.algorithmVariableOverrides as unknown[] || [];
      
      if (oldAlgorithmOverrides.length !== newAlgorithmOverrides.length) {
        extensionChanges.push({
          field: 'algorithmVariableOverrides',
          oldValue: `${oldAlgorithmOverrides.length} overrides`,
          newValue: `${newAlgorithmOverrides.length} overrides`,
        });
      }

      // Compare token overrides
      const oldTokenOverrides = oldExtension.tokenOverrides as unknown[] || [];
      const newTokenOverrides = newExtension.tokenOverrides as unknown[] || [];
      
      if (oldTokenOverrides.length !== newTokenOverrides.length) {
        extensionChanges.push({
          field: 'tokenOverrides',
          oldValue: `${oldTokenOverrides.length} overrides`,
          newValue: `${newTokenOverrides.length} overrides`,
        });
      }

      // Compare omitted modes and dimensions
      const oldOmittedModes = oldExtension.omittedModes as string[] || [];
      const newOmittedModes = newExtension.omittedModes as string[] || [];
      
      if (JSON.stringify(oldOmittedModes.sort()) !== JSON.stringify(newOmittedModes.sort())) {
        extensionChanges.push({
          field: 'omittedModes',
          oldValue: oldOmittedModes.length > 0 ? oldOmittedModes.join(', ') : 'none',
          newValue: newOmittedModes.length > 0 ? newOmittedModes.join(', ') : 'none',
        });
      }

      const oldOmittedDimensions = oldExtension.omittedDimensions as string[] || [];
      const newOmittedDimensions = newExtension.omittedDimensions as string[] || [];
      
      if (JSON.stringify(oldOmittedDimensions.sort()) !== JSON.stringify(newOmittedDimensions.sort())) {
        extensionChanges.push({
          field: 'omittedDimensions',
          oldValue: oldOmittedDimensions.length > 0 ? oldOmittedDimensions.join(', ') : 'none',
          newValue: newOmittedDimensions.length > 0 ? newOmittedDimensions.join(', ') : 'none',
        });
      }

      if (extensionChanges.length > 0) {
        const newMetadata = newExtension.metadata as Record<string, unknown> || {};
        const displayName = (newMetadata.name as string) || (newExtension.platformId as string) || platformId;
        changes.push({
          type: 'modified',
          entityType: 'platformExtension',
          entityId: platformId,
          entityName: displayName,
          changes: extensionChanges,
        });
      }
    }
  }

  // Check for removed platform extensions
  for (const platformId of oldPlatformExtensionIds) {
    if (!newPlatformExtensionIds.includes(platformId)) {
      const platformExtension = oldPlatformExtensions[platformId] as { platformId?: string; metadata?: { name?: string } };
      const displayName = platformExtension.metadata?.name || platformExtension.platformId || platformId;
      changes.push({
        type: 'removed',
        entityType: 'platformExtension',
        entityId: platformId,
        entityName: displayName,
        changes: [{
          field: 'platformExtension',
          oldValue: `Removed platform extension: ${displayName}`,
        }],
      });
    }
  }

  // Compare platform extensions
  const oldPlatformExtensionFiles = (previousData.platformExtensionFiles as Record<string, unknown>) || {};
  const newPlatformExtensionFiles = (currentData.platformExtensionFiles as Record<string, unknown>) || {};
  
  const oldPlatformExtensionFileIds = Object.keys(oldPlatformExtensionFiles);
  const newPlatformExtensionFileIds = Object.keys(newPlatformExtensionFiles);
  
  // Check for added platform extension files
  for (const platformId of newPlatformExtensionFileIds) {
    if (!oldPlatformExtensionFileIds.includes(platformId)) {
      const platformExtensionFile = newPlatformExtensionFiles[platformId] as { platformId?: string; metadata?: { name?: string } };
      const displayName = platformExtensionFile.metadata?.name || platformExtensionFile.platformId || platformId;
      changes.push({
        type: 'added',
        entityType: 'platformExtensionFile',
        entityId: platformId,
        entityName: displayName,
        changes: [{
          field: 'platformExtensionFile',
          newValue: `Added platform extension file: ${displayName}`,
        }],
      });
    } else {
      // Check for modified platform extension files
      const oldFile = oldPlatformExtensionFiles[platformId] as Record<string, unknown>;
      const newFile = newPlatformExtensionFiles[platformId] as Record<string, unknown>;
      
      const fileChanges: Array<{
        field: string;
        oldValue?: unknown;
        newValue?: unknown;
        context?: string;
      }> = [];

      // Compare metadata
      const oldMetadata = oldFile.metadata as Record<string, unknown> || {};
      const newMetadata = newFile.metadata as Record<string, unknown> || {};
      
      ['name', 'description', 'maintainer', 'lastUpdated'].forEach(field => {
        if (oldMetadata[field] !== newMetadata[field]) {
          fileChanges.push({
            field: `metadata.${field}`,
            oldValue: formatValue(oldMetadata[field]),
            newValue: formatValue(newMetadata[field]),
          });
        }
      });

      // Compare version
      if (oldFile.version !== newFile.version) {
        fileChanges.push({
          field: 'version',
          oldValue: formatValue(oldFile.version),
          newValue: formatValue(newFile.version),
        });
      }

      // Compare syntax patterns
      const oldSyntaxPatterns = oldFile.syntaxPatterns as Record<string, unknown> || {};
      const newSyntaxPatterns = newFile.syntaxPatterns as Record<string, unknown> || {};
      
      ['prefix', 'suffix', 'delimiter', 'capitalization', 'formatString'].forEach(field => {
        if (oldSyntaxPatterns[field] !== newSyntaxPatterns[field]) {
          fileChanges.push({
            field: `syntaxPatterns.${field}`,
            oldValue: formatValue(oldSyntaxPatterns[field]),
            newValue: formatValue(newSyntaxPatterns[field]),
          });
        }
      });

      // Compare value formatters
      const oldValueFormatters = oldFile.valueFormatters as Record<string, unknown> || {};
      const newValueFormatters = newFile.valueFormatters as Record<string, unknown> || {};
      
      ['color', 'dimension', 'numberPrecision'].forEach(field => {
        if (oldValueFormatters[field] !== newValueFormatters[field]) {
          fileChanges.push({
            field: `valueFormatters.${field}`,
            oldValue: formatValue(oldValueFormatters[field]),
            newValue: formatValue(newValueFormatters[field]),
          });
        }
      });

      if (fileChanges.length > 0) {
        const newMetadata = newFile.metadata as Record<string, unknown> || {};
        const displayName = (newMetadata.name as string) || (newFile.platformId as string) || platformId;
        changes.push({
          type: 'modified',
          entityType: 'platformExtensionFile',
          entityId: platformId,
          entityName: displayName,
          changes: fileChanges,
        });
      }
    }
  }

  // Check for removed platform extension files
  for (const platformId of oldPlatformExtensionFileIds) {
    if (!newPlatformExtensionFileIds.includes(platformId)) {
      const platformExtensionFile = oldPlatformExtensionFiles[platformId] as { platformId?: string; metadata?: { name?: string } };
      const displayName = platformExtensionFile.metadata?.name || platformExtensionFile.platformId || platformId;
      changes.push({
        type: 'removed',
        entityType: 'platformExtensionFile',
        entityId: platformId,
        entityName: displayName,
        changes: [{
          field: 'platformExtensionFile',
          oldValue: `Removed platform extension file: ${displayName}`,
        }],
      });
    }
  }

  // Compare platforms (core data platforms array)
  const oldPlatforms = (previousData.platforms as unknown[]) || [];
  const newPlatforms = (currentData.platforms as unknown[]) || [];
  

  
  const oldPlatformMap = new Map();
  const newPlatformMap = new Map();

  oldPlatforms.forEach((p: unknown) => {
    if (typeof p === 'object' && p !== null) {
      const platform = p as { id?: string };
      if (platform.id) {
        oldPlatformMap.set(platform.id, platform);
      }
    }
  });

  newPlatforms.forEach((p: unknown) => {
    if (typeof p === 'object' && p !== null) {
      const platform = p as { id?: string };
      if (platform.id) {
        newPlatformMap.set(platform.id, platform);
      }
    }
  });

  // Check for added platforms
  for (const [id, platform] of newPlatformMap) {
    if (!oldPlatformMap.has(id)) {
      const platformObj = platform as { displayName?: string };

      changes.push({
        type: 'added',
        entityType: 'platform',
        entityId: id,
        entityName: platformObj.displayName || id,
        changes: [{
          field: 'platform',
          newValue: `Added platform: ${platformObj.displayName || id}`,
        }],
      });
    } else {
      // Check for modified platforms
      const oldPlatform = oldPlatformMap.get(id);
      const platformChanges: Array<{
        field: string;
        oldValue?: unknown;
        newValue?: unknown;
        context?: string;
      }> = [];

      const oldPlatformObj = oldPlatform as Record<string, unknown>;
      const platformObj = platform as Record<string, unknown>;

      // Compare basic fields
      ['displayName', 'description'].forEach(field => {
        if (oldPlatformObj[field] !== platformObj[field]) {
          platformChanges.push({
            field,
            oldValue: formatValue(oldPlatformObj[field]),
            newValue: formatValue(platformObj[field]),
          });
        }
      });

      // Compare syntax patterns
      const oldSyntaxPatterns = oldPlatformObj.syntaxPatterns as Record<string, unknown> || {};
      const newSyntaxPatterns = platformObj.syntaxPatterns as Record<string, unknown> || {};
      
      ['prefix', 'suffix', 'delimiter', 'capitalization', 'formatString'].forEach(field => {
        if (oldSyntaxPatterns[field] !== newSyntaxPatterns[field]) {
          platformChanges.push({
            field: `syntaxPatterns.${field}`,
            oldValue: formatValue(oldSyntaxPatterns[field]),
            newValue: formatValue(newSyntaxPatterns[field]),
          });
        }
      });

      // Compare value formatters
      const oldValueFormatters = oldPlatformObj.valueFormatters as Record<string, unknown> || {};
      const newValueFormatters = platformObj.valueFormatters as Record<string, unknown> || {};
      
      ['color', 'dimension', 'numberPrecision'].forEach(field => {
        if (oldValueFormatters[field] !== newValueFormatters[field]) {
          platformChanges.push({
            field: `valueFormatters.${field}`,
            oldValue: formatValue(oldValueFormatters[field]),
            newValue: formatValue(newValueFormatters[field]),
          });
        }
      });

      // Compare extension source (this is the key change from PlatformsView)
      const oldExtensionSource = oldPlatformObj.extensionSource as Record<string, unknown> | undefined;
      const newExtensionSource = platformObj.extensionSource as Record<string, unknown> | undefined;
      
      if (!oldExtensionSource && newExtensionSource) {
        // Extension source was added
        platformChanges.push({
          field: 'extensionSource',
          newValue: `Linked to extension: ${newExtensionSource.repositoryUri || 'unknown'} - ${newExtensionSource.filePath || 'unknown'}`,
        });
      } else if (oldExtensionSource && !newExtensionSource) {
        // Extension source was removed
        platformChanges.push({
          field: 'extensionSource',
          oldValue: `Unlinked from extension: ${oldExtensionSource.repositoryUri || 'unknown'} - ${oldExtensionSource.filePath || 'unknown'}`,
        });
      } else if (oldExtensionSource && newExtensionSource) {
        // Extension source was modified
        if (oldExtensionSource.repositoryUri !== newExtensionSource.repositoryUri || 
            oldExtensionSource.filePath !== newExtensionSource.filePath) {
          platformChanges.push({
            field: 'extensionSource',
            oldValue: `${oldExtensionSource.repositoryUri || 'unknown'} - ${oldExtensionSource.filePath || 'unknown'}`,
            newValue: `${newExtensionSource.repositoryUri || 'unknown'} - ${newExtensionSource.filePath || 'unknown'}`,
          });
        }
      }

      if (platformChanges.length > 0) {
        changes.push({
          type: 'modified',
          entityType: 'platform',
          entityId: id,
          entityName: platformObj.displayName as string || id,
          changes: platformChanges,
        });
      }
    }
  }

  // Check for removed platforms
  for (const [id, platform] of oldPlatformMap) {
    if (!newPlatformMap.has(id)) {
      const platformObj = platform as { displayName?: string };
      changes.push({
        type: 'removed',
        entityType: 'platform',
        entityId: id,
        entityName: platformObj.displayName || id,
        changes: [{
          field: 'platform',
          oldValue: `Removed platform: ${platformObj.displayName || id}`,
        }],
      });
    }
  }

  // Compare taxonomy order
  const oldTaxonomyOrder = (previousData.taxonomyOrder as string[]) || [];
  const newTaxonomyOrder = (currentData.taxonomyOrder as string[]) || [];
  
  if (JSON.stringify(oldTaxonomyOrder) !== JSON.stringify(newTaxonomyOrder)) {
    changes.push({
      type: 'modified',
      entityType: 'taxonomy',
      entityId: 'taxonomyOrder',
      entityName: 'Taxonomy Order',
      changes: [{
        field: 'taxonomyOrder',
        oldValue: oldTaxonomyOrder.length > 0 ? oldTaxonomyOrder.join(', ') : 'none',
        newValue: newTaxonomyOrder.length > 0 ? newTaxonomyOrder.join(', ') : 'none',
        context: 'Taxonomy ordering for code syntax generation',
      }],
    });
  }

  // Compare dimension order
  const oldDimensionOrder = (previousData.dimensionOrder as string[]) || [];
  const newDimensionOrder = (currentData.dimensionOrder as string[]) || [];
  
  if (JSON.stringify(oldDimensionOrder) !== JSON.stringify(newDimensionOrder)) {
    changes.push({
      type: 'modified',
      entityType: 'dimension',
      entityId: 'dimensionOrder',
      entityName: 'Dimension Order',
      changes: [{
        field: 'dimensionOrder',
        oldValue: oldDimensionOrder.length > 0 ? oldDimensionOrder.join(', ') : 'none',
        newValue: newDimensionOrder.length > 0 ? newDimensionOrder.join(', ') : 'none',
        context: 'Dimension ordering for token structure generation',
      }],
    });
  }

  // Compare figmaConfiguration
  const oldFigmaConfig = (previousData.figmaConfiguration as Record<string, unknown>) || {};
  const newFigmaConfig = (currentData.figmaConfiguration as Record<string, unknown>) || {};
  
  // Compare fileKey
  if (oldFigmaConfig.fileKey !== newFigmaConfig.fileKey) {
    changes.push({
      type: 'modified',
      entityType: 'figmaConfiguration',
      entityId: 'figmaConfiguration',
      entityName: 'Figma Configuration',
      changes: [{
        field: 'fileKey',
        oldValue: formatValue(oldFigmaConfig.fileKey),
        newValue: formatValue(newFigmaConfig.fileKey),
        context: 'Figma file key for publishing',
      }],
    });
  }

  // Compare syntaxPatterns
  const oldSyntaxPatterns = (oldFigmaConfig.syntaxPatterns as Record<string, unknown>) || {};
  const newSyntaxPatterns = (newFigmaConfig.syntaxPatterns as Record<string, unknown>) || {};
  
  ['prefix', 'suffix', 'delimiter', 'capitalization', 'formatString'].forEach(field => {
    if (oldSyntaxPatterns[field] !== newSyntaxPatterns[field]) {
      changes.push({
        type: 'modified',
        entityType: 'figmaConfiguration',
        entityId: 'figmaConfiguration',
        entityName: 'Figma Configuration',
        changes: [{
          field: `syntaxPatterns.${field}`,
          oldValue: formatValue(oldSyntaxPatterns[field]),
          newValue: formatValue(newSyntaxPatterns[field]),
          context: 'Figma token naming patterns',
        }],
      });
    }
  });

  // Add pending override changes
  const pendingOverrides = OverrideTrackingService.getPendingOverrides();
  pendingOverrides.forEach(override => {
    changes.push({
      type: 'modified',
      entityType: 'token',
      entityId: override.tokenId,
      entityName: `Token ${override.tokenId} (${override.sourceType})`,
      changes: [{
        field: 'override',
        oldValue: 'Original value',
        newValue: 'Override value',
        context: `${override.sourceType} override for ${override.sourceId}`,
      }],
    });
  });

  return changes;
};

export const ChangeLog: React.FC<ChangeLogProps> = ({ previousData, currentData }) => {
  const { colorMode } = useColorMode();
  
  // Handle null/undefined data
  if (!previousData || !currentData) {
    return (
      <Box p={4} textAlign="center">
        <Text color="gray.500">No data available for comparison</Text>
      </Box>
    );
  }
  
  // Use the previousData prop directly instead of managing internal baseline
  const changes = detectChanges(previousData, currentData);

  if (changes.length === 0) {
    return (
      <Box p={4} textAlign="center">
        <Text color="gray.500">No changes detected</Text>
      </Box>
    );
  }

  const groupedChanges = changes.reduce((acc, change) => {
    if (!acc[change.entityType]) {
      acc[change.entityType] = [];
    }
    acc[change.entityType].push(change);
    return acc;
  }, {} as Record<string, ChangeEntry[]>);

  return (
    <Box>
      <Text fontSize="md" fontWeight="bold" mb={4}>
        Changes ({changes.length} changes)
      </Text>
      
      <Accordion allowMultiple>
        {Object.entries(groupedChanges).map(([entityType, entityChanges]) => {
          const Icon = getEntityIcon(entityType);
          const entityTypeLabel = entityType.charAt(0).toUpperCase() + entityType.slice(1);
          
          return (
            <AccordionItem key={entityType}>
              <AccordionButton>
                <HStack flex="1" justify="flex-start">
                  <Icon size={16} />
                  <Text fontWeight="medium">{entityTypeLabel}</Text>
                  <Badge colorScheme="blue" ml="auto">
                    {entityChanges.length}
                  </Badge>
                </HStack>
                <AccordionIcon />
              </AccordionButton>
              
              <AccordionPanel>
                <VStack spacing={3} align="stretch">
                  {entityChanges.map((change, index) => {
                    const ChangeIcon = getChangeIcon(change.type);
                    const changeColor = change.type === 'added' ? 'green' : 
                                       change.type === 'removed' ? 'red' : 'orange';
                    
                    return (
                      <Box
                        key={`${change.entityId}-${index}`}
                        p={3}
                        border="1px"
                        borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                        borderRadius="md"
                        bg={colorMode === 'dark' ? 'gray.700' : 'gray.50'}
                      >
                        <HStack spacing={2} mb={2}>
                          <ChangeIcon size={16} color={changeColor === 'green' ? '#22c55e' : changeColor === 'red' ? '#ef4444' : '#f97316'} />
                          <Badge colorScheme={changeColor} size="sm">
                            {change.type.toUpperCase()}
                          </Badge>
                          <Text fontWeight="medium" fontSize="sm">
                            {change.entityName}
                          </Text>
                        </HStack>
                        
                        <VStack spacing={1} align="stretch">
                          {change.changes.map((fieldChange, fieldIndex) => (
                            <Box key={fieldIndex} pl={4}>
                              {fieldChange.context && (
                                <Text fontSize="xs" color="gray.500" mb={1}>
                                  {fieldChange.context}
                                </Text>
                              )}
                              {fieldChange.oldValue !== undefined && fieldChange.oldValue !== null && (
                                <Text fontSize="sm" color="red.500">
                                  <Text as="span" fontWeight="medium">-</Text> {String(formatValue(fieldChange.oldValue))}
                                </Text>
                              )}
                              {fieldChange.newValue !== undefined && fieldChange.newValue !== null && (
                                <Text fontSize="sm" color="green.500">
                                  <Text as="span" fontWeight="medium">+</Text> {String(formatValue(fieldChange.newValue))}
                                </Text>
                              )}
                            </Box>
                          ))}
                        </VStack>
                      </Box>
                    );
                  })}
                </VStack>
              </AccordionPanel>
            </AccordionItem>
          );
        })}
      </Accordion>
    </Box>
  );
}; 
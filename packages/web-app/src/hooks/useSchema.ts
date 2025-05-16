import { useState, useEffect } from 'react';
import { useStorage } from './useStorage';
import defaultData from '../services/data/default-data.json';

export interface ExportConfiguration {
  prefix: string;
  delimiter: string;
  capitalization: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

export interface Platform {
  id: string;
  displayName: string;
}

export interface Schema {
  version: string;
  metadata?: {
    description?: string;
    lastUpdated?: string;
    maintainers?: string[];
  };
  platforms?: Platform[];
  exportConfigurations?: Record<string, ExportConfiguration>;
  // Add other schema properties as needed
}

export const useSchema = () => {
  const { getItem, setItem } = useStorage();
  const [schema, setSchema] = useState<Schema>(() => {
    const stored = getItem('schema');
    let base = stored ? JSON.parse(stored) : (defaultData as any);
    if (!('version' in base) || !base.version) base.version = '1.0.0';
    if (!Array.isArray(base.platforms) || base.platforms.length === 0) {
      base.platforms = (defaultData as any).platforms;
    }
    return base as Schema;
  });

  useEffect(() => {
    setItem('schema', JSON.stringify(schema));
  }, [schema, setItem]);

  // Debug: log platforms
  useEffect(() => {
    console.log('Loaded platforms:', schema.platforms);
  }, [schema.platforms]);

  const updateSchema = (newSchema: Schema) => {
    setSchema(newSchema);
  };

  return { schema, updateSchema };
}; 
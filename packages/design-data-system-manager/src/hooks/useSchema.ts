import { useState, useEffect } from 'react';
import { useStorage } from './useStorage';
import coreData from '@token-model/data-model/examples/themed/core-data.json';

export interface ExportConfiguration {
  prefix: string;
  delimiter: string;
  capitalization: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

export interface Platform {
  id: string;
  displayName: string;
  description?: string;
  syntaxPatterns?: {
    prefix?: string;
    suffix?: string;
    delimiter?: string;
    capitalization?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
    formatString?: string;
  };
  valueFormatters?: {
    color?: 'hex' | 'rgb' | 'rgba' | 'hsl' | 'hsla';
    dimension?: 'px' | 'rem' | 'em' | 'pt' | 'dp' | 'sp';
    numberPrecision?: number;
  };
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
  const [schema, setSchema] = useState<any>(() => {
    const stored = getItem('schema');
    if (stored) return JSON.parse(stored);
    return coreData; // Use the full data instance as the default
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
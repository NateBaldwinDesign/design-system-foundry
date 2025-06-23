import { Algorithm } from '../types/algorithm';

export interface LoadedDataResult {
  coreData: Record<string, unknown>;
  algorithmData: Algorithm[] | null;
  dataSource: string;
}

/**
 * Extracts the base name from a file path to find corresponding algorithm files
 * Example: "example-minimal-data.json" -> "example-minimal"
 */
function extractBaseName(filePath: string): string {
  const fileName = filePath.split('/').pop() || '';
  // Remove "-data.json" suffix to get base name
  return fileName.replace(/-data\.json$/, '');
}

/**
 * Constructs the algorithm file path based on the core data file path
 * Example: "example-minimal-data.json" -> "example-minimal-algorithms.json"
 * Algorithm files are stored in a separate algorithms directory at the same level
 */
function getAlgorithmFilePath(coreDataPath: string): string {
  const baseName = extractBaseName(coreDataPath);
  
  // Get the examples directory path (remove the subdirectory like 'unthemed' or 'themed')
  const pathParts = coreDataPath.split('/');
  const examplesIndex = pathParts.findIndex(part => part === 'examples');
  
  if (examplesIndex === -1) {
    console.warn('[DataLoader] Could not find "examples" in path:', coreDataPath);
    return '';
  }
  
  // Construct path: examples/algorithms/{baseName}-algorithms.json
  const examplesPath = pathParts.slice(0, examplesIndex + 1).join('/');
  const algorithmPath = `${examplesPath}/algorithms/${baseName}-algorithms.json`;
  
  return algorithmPath;
}

/**
 * Loads both core data and algorithm data using the naming convention
 * @param filePath Path to the core data file
 * @param exampleDataFiles Object containing all available data files
 * @returns Promise with both core and algorithm data
 */
export async function loadDataWithAlgorithms(
  filePath: string, 
  exampleDataFiles: Record<string, () => Promise<string>>
): Promise<LoadedDataResult> {
  console.log('[DataLoader] Loading data from:', filePath);
  
  // Load core data
  const coreDataContent = await exampleDataFiles[filePath]();
  if (!coreDataContent || coreDataContent.trim() === '') {
    throw new Error('The selected data file is empty. Please choose a valid JSON file.');
  }
  const coreData = JSON.parse(coreDataContent);
  console.log('[DataLoader] Core data loaded successfully:', coreData.systemName);

  // Try to load corresponding algorithm data
  const algorithmFilePath = getAlgorithmFilePath(filePath);
  let algorithmData: Algorithm[] | null = null;

  try {
    if (exampleDataFiles[algorithmFilePath]) {
      console.log('[DataLoader] Loading algorithm data from:', algorithmFilePath);
      const algorithmContent = await exampleDataFiles[algorithmFilePath]();
      if (algorithmContent && algorithmContent.trim() !== '') {
        const algorithmFile = JSON.parse(algorithmContent);
        algorithmData = algorithmFile.algorithms || null;
        console.log(`[DataLoader] Loaded ${algorithmData?.length || 0} algorithms`);
      }
    } else {
      console.log('[DataLoader] No algorithm file found at:', algorithmFilePath);
    }
  } catch (algorithmError) {
    console.warn(`[DataLoader] Error loading algorithm data:`, algorithmError);
    // Algorithm data is optional, so we don't throw here
  }

  return {
    coreData,
    algorithmData,
    dataSource: filePath
  };
}

/**
 * Gets available data source options with algorithm information
 * @param exampleDataFiles Object containing all available data files
 * @returns Array of data source options with algorithm availability
 */
export function getDataSourceOptionsWithAlgorithms(
  exampleDataFiles: Record<string, () => Promise<string>>
): Array<{ value: string; label: string; hasAlgorithms: boolean }> {
  const options: Array<{ value: string; label: string; hasAlgorithms: boolean }> = [];
  
  Object.keys(exampleDataFiles).forEach(filePath => {
    // Only include core data files (those ending with -data.json)
    if (filePath.endsWith('-data.json')) {
      const algorithmFilePath = getAlgorithmFilePath(filePath);
      const hasAlgorithms = !!exampleDataFiles[algorithmFilePath];
      
      // Create a user-friendly label
      const baseName = extractBaseName(filePath);
      const label = baseName
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      options.push({
        value: filePath,
        label: `${label}${hasAlgorithms ? ' (with algorithms)' : ''}`,
        hasAlgorithms
      });
    }
  });

  return options.sort((a, b) => a.label.localeCompare(b.label));
} 
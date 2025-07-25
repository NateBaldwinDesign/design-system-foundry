// No imports needed for this service

export type DataType = 'core' | 'extension' | 'theme';

export interface DataTypeDetectionResult {
  type: DataType;
  confidence: number;
  reasons: string[];
}

/**
 * Detects the type of data loaded from GitHub based on schema compliance
 */
export class DataTypeDetector {
  /**
   * Detect if the loaded data is core, extension, or theme
   */
  static detectDataType(fileContent: Record<string, unknown>): DataTypeDetectionResult {
    const reasons: string[] = [];
    let coreScore = 0;
    let extensionScore = 0;
    let themeScore = 0;

    // Check for core schema indicators
    if (fileContent.systemName && typeof fileContent.systemName === 'string') {
      coreScore += 2;
      reasons.push('Has systemName (core indicator)');
    }
    if (fileContent.tokenCollections && Array.isArray(fileContent.tokenCollections)) {
      coreScore += 2;
      reasons.push('Has tokenCollections array (core indicator)');
    }
    if (fileContent.dimensions && Array.isArray(fileContent.dimensions)) {
      coreScore += 2;
      reasons.push('Has dimensions array (core indicator)');
    }
    if (fileContent.tokens && Array.isArray(fileContent.tokens)) {
      coreScore += 2;
      reasons.push('Has tokens array (core indicator)');
    }
    if (fileContent.platforms && Array.isArray(fileContent.platforms)) {
      coreScore += 1;
      reasons.push('Has platforms array (core indicator)');
    }

    // Check for extension schema indicators
    if (fileContent.systemId && typeof fileContent.systemId === 'string') {
      extensionScore += 1;
      reasons.push('Has systemId (extension indicator)');
    }
    if (fileContent.platformId && typeof fileContent.platformId === 'string') {
      extensionScore += 3;
      reasons.push('Has platformId (strong extension indicator)');
    }
    if (fileContent.tokenOverrides && Array.isArray(fileContent.tokenOverrides)) {
      extensionScore += 3;
      reasons.push('Has tokenOverrides array (strong extension indicator)');
    }
    if (fileContent.syntaxPatterns && typeof fileContent.syntaxPatterns === 'object') {
      extensionScore += 2;
      reasons.push('Has syntaxPatterns (extension indicator)');
    }
    if (fileContent.valueFormatters && typeof fileContent.valueFormatters === 'object') {
      extensionScore += 2;
      reasons.push('Has valueFormatters (extension indicator)');
    }

    // Check for theme schema indicators
    if (fileContent.themeId && typeof fileContent.themeId === 'string') {
      themeScore += 3;
      reasons.push('Has themeId (strong theme indicator)');
    }
    if (fileContent.themeOverrides && Array.isArray(fileContent.themeOverrides)) {
      themeScore += 3;
      reasons.push('Has themeOverrides array (strong theme indicator)');
    }
    if (fileContent.isDefault !== undefined) {
      themeScore += 1;
      reasons.push('Has isDefault property (theme indicator)');
    }

    // Determine the type based on highest score
    const maxScore = Math.max(coreScore, extensionScore, themeScore);
    let type: DataType = 'core';
    let confidence = 0;

    if (maxScore === coreScore && coreScore > 0) {
      type = 'core';
      confidence = coreScore / 9; // Normalize to 0-1 range
    } else if (maxScore === extensionScore && extensionScore > 0) {
      type = 'extension';
      confidence = extensionScore / 11; // Normalize to 0-1 range
    } else if (maxScore === themeScore && themeScore > 0) {
      type = 'theme';
      confidence = themeScore / 7; // Normalize to 0-1 range
    }

    return {
      type,
      confidence: Math.min(confidence, 1),
      reasons
    };
  }

  /**
   * Validate that the detected type matches the expected schema
   */
  static validateDataType(data: Record<string, unknown>, expectedType: DataType): boolean {
    const detection = this.detectDataType(data);
    
    if (detection.type !== expectedType) {
      console.warn(`[DataTypeDetector] Expected ${expectedType} but detected ${detection.type}`, detection);
      return false;
    }

    return detection.confidence > 0.5;
  }
} 
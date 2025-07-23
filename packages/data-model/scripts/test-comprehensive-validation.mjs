#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { validateThemeOverrideFile } from '../dist/schema.js';
import { SchemaValidationService } from '../dist/validation/schema-validation.js';

const examplesDir = path.join(process.cwd(), 'examples/themed');
const platformExtensionsDir = path.join(process.cwd(), 'examples/platform-extensions');

console.log('🔍 Comprehensive Theme Override and Platform Extension Validation...\n');

let allValid = true;

// Test 1: Validate individual theme override files
console.log('📋 Test 1: Individual Theme Override File Validation');
console.log('='.repeat(50));

const themeOverrideFiles = [
  'brand-a-overrides.json',
  'brand-b-overrides.json'
];

for (const filename of themeOverrideFiles) {
  const filePath = path.join(examplesDir, filename);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filename}`);
    allValid = false;
    continue;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    console.log(`📄 Validating ${filename}...`);
    
    try {
      const validatedData = validateThemeOverrideFile(data);
      console.log(`✅ ${filename} is valid`);
      console.log(`   🔑 Figma File Key: ${validatedData.figmaFileKey}`);
      console.log(`   🎨 Theme ID: ${validatedData.themeId}`);
      console.log(`   🏗️  System ID: ${validatedData.systemId}`);
      console.log(`   📝 Token Overrides: ${validatedData.tokenOverrides.length}`);
      
    } catch (validationError) {
      console.log(`❌ ${filename} has validation errors:`);
      console.log(`   - ${validationError.message}`);
      allValid = false;
    }
    
  } catch (error) {
    console.log(`❌ Error reading ${filename}: ${error.message}`);
    allValid = false;
  }
  
  console.log('');
}

// Test 2: Validate platform extensions
console.log('📋 Test 2: Platform Extension Validation');
console.log('='.repeat(50));

const platformExtensionFiles = [
  'ios-platform-extension.json',
  'web-platform-extension.json'
];

const platformExtensions = [];

for (const filename of platformExtensionFiles) {
  const filePath = path.join(platformExtensionsDir, filename);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filename}`);
    allValid = false;
    continue;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    console.log(`📄 Validating ${filename}...`);
    
    try {
      // Use the platform extension validation
      const validationResult = SchemaValidationService.validatePlatformExtension(data);
      
      if (validationResult.isValid) {
        console.log(`✅ ${filename} is valid`);
        console.log(`   🔑 Figma File Key: ${data.figmaFileKey}`);
        console.log(`   📱 Platform ID: ${data.platformId}`);
        platformExtensions.push(data);
      } else {
        console.log(`❌ ${filename} has validation errors:`);
        validationResult.errors.forEach(error => console.log(`   - ${error}`));
        allValid = false;
      }
      
    } catch (validationError) {
      console.log(`❌ ${filename} has validation errors:`);
      console.log(`   - ${validationError.message}`);
      allValid = false;
    }
    
  } catch (error) {
    console.log(`❌ Error reading ${filename}: ${error.message}`);
    allValid = false;
  }
  
  console.log('');
}

// Test 3: Validate uniqueness across all files
console.log('📋 Test 3: figmaFileKey Uniqueness Validation');
console.log('='.repeat(50));

try {
  const themeFiles = themeOverrideFiles.map(filename => {
    const filePath = path.join(examplesDir, filename);
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  });
  
  const uniquenessResult = SchemaValidationService.validateFigmaFileKeyUniquenessAcrossAll(
    platformExtensions, 
    themeFiles
  );
  
  if (uniquenessResult.isValid) {
    console.log('✅ All figmaFileKeys are unique across platform extensions and theme override files');
    
    // Show all file keys
    console.log('\n📋 All figmaFileKeys found:');
    const allFileKeys = new Set();
    
    platformExtensions.forEach(ext => {
      if (ext.figmaFileKey) {
        allFileKeys.add(ext.figmaFileKey);
        console.log(`   🔑 Platform Extension (${ext.platformId}): ${ext.figmaFileKey}`);
      }
    });
    
    themeFiles.forEach(theme => {
      if (theme.figmaFileKey) {
        allFileKeys.add(theme.figmaFileKey);
        console.log(`   🎨 Theme Override (${theme.themeId}): ${theme.figmaFileKey}`);
      }
    });
    
    console.log(`\n📊 Total unique figmaFileKeys: ${allFileKeys.size}`);
    
  } else {
    console.log('❌ figmaFileKey uniqueness validation failed:');
    uniquenessResult.errors.forEach(error => console.log(`   - ${error}`));
    allValid = false;
  }
  
  if (uniquenessResult.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    uniquenessResult.warnings.forEach(warning => console.log(`   - ${warning}`));
  }
  
} catch (error) {
  console.log(`❌ Error testing uniqueness: ${error.message}`);
  allValid = false;
}

console.log('\n' + '='.repeat(50));
if (allValid) {
  console.log('🎉 All validation tests passed!');
  console.log('✅ Theme override files are valid');
  console.log('✅ Platform extensions are valid');
  console.log('✅ All figmaFileKeys are unique');
  process.exit(0);
} else {
  console.log('❌ Some validation tests failed');
  process.exit(1);
} 
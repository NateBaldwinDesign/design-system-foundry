#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { validateTokenSystem } from '../dist/schema.js';

const examplesDir = path.join(process.cwd(), 'examples/themed');
const coreDataFile = path.join(examplesDir, 'core-data.json');

console.log('🔍 Testing Theme Validation with New Properties...\n');

let allValid = true;

// Test 1: Validate core data file with themes
console.log('📋 Test 1: Core Data Theme Validation');
console.log('='.repeat(50));

if (!fs.existsSync(coreDataFile)) {
  console.log(`❌ Core data file not found: ${coreDataFile}`);
  process.exit(1);
}

try {
  const content = fs.readFileSync(coreDataFile, 'utf8');
  const data = JSON.parse(content);
  
  console.log(`📄 Validating core data file...`);
  
      try {
      const validatedData = validateTokenSystem(data);
      console.log(`✅ Core data file is valid`);
      

    
    // Validate themes specifically
    if (validatedData.themes && Array.isArray(validatedData.themes)) {
      console.log(`🎨 Found ${validatedData.themes.length} themes`);
      
      for (const theme of validatedData.themes) {
        console.log(`\n   Theme: ${theme.displayName} (${theme.id})`);
        console.log(`   - Status: ${theme.status || 'active'}`);
        
        if (theme.overrideSource) {
          console.log(`   - External Source: ${theme.overrideSource.repositoryUri}/${theme.overrideSource.filePath}`);
        } else {
          console.log(`   - External Source: None`);
        }
        
        // Validate overrideSource structure if present
        if (theme.overrideSource) {
          if (!theme.overrideSource.repositoryUri) {
            console.log(`   ❌ Missing repositoryUri in overrideSource`);
            allValid = false;
          }
          if (!theme.overrideSource.filePath) {
            console.log(`   ❌ Missing filePath in overrideSource`);
            allValid = false;
          }
        }
        
        // Validate status
        if (theme.status && !['active', 'deprecated'].includes(theme.status)) {
          console.log(`   ❌ Invalid status: ${theme.status}. Must be 'active' or 'deprecated'`);
          allValid = false;
        }
      }
      
    } else {
      console.log(`ℹ️  No themes found in core data (themes are optional)`);
      // Themes are now optional, so this is not an error
    }
    
  } catch (validationError) {
    console.log(`❌ Core data file has validation errors:`);
    console.log(`   - ${validationError.message}`);
    allValid = false;
  }
  
} catch (error) {
  console.log(`❌ Error reading core data file: ${error.message}`);
  allValid = false;
}

console.log('\n' + '='.repeat(50));

// Test 2: Validate theme override files
console.log('📋 Test 2: Theme Override File Validation');
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
    
    // Basic validation
    if (!data.systemId) {
      console.log(`   ❌ Missing systemId`);
      allValid = false;
    }
    if (!data.themeId) {
      console.log(`   ❌ Missing themeId`);
      allValid = false;
    }
    if (!data.tokenOverrides || !Array.isArray(data.tokenOverrides)) {
      console.log(`   ❌ Missing or invalid tokenOverrides array`);
      allValid = false;
    } else {
      console.log(`   ✅ Token overrides: ${data.tokenOverrides.length}`);
    }
    
    if (data.figmaFileKey) {
      console.log(`   🔑 Figma File Key: ${data.figmaFileKey}`);
    }
    
  } catch (error) {
    console.log(`❌ Error validating ${filename}: ${error.message}`);
    allValid = false;
  }
  
  console.log('');
}

console.log('='.repeat(50));
if (allValid) {
  console.log('🎉 All theme validations passed!');
  process.exit(0);
} else {
  console.log('❌ Some theme validations failed');
  process.exit(1);
} 
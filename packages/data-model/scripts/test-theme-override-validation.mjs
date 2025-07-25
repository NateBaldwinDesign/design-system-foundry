#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { validateThemeOverrideFile } from '../dist/schema.js';

const examplesDir = path.join(process.cwd(), 'examples/themed');
const themeOverrideFiles = [
  'brand-a-overrides.json',
  'brand-b-overrides.json'
];

console.log('🔍 Testing Theme Override File Validation...\n');

let allValid = true;

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
      
      // Additional validation for figmaFileKey
      if (validatedData.figmaFileKey) {
        console.log(`   🔑 Figma File Key: ${validatedData.figmaFileKey}`);
      } else {
        console.log(`   ❌ Missing figmaFileKey`);
        allValid = false;
      }
      
    } catch (validationError) {
      console.log(`❌ ${filename} has validation errors:`);
      console.log(`   - ${validationError.message}`);
      allValid = false;
    }
    
    // Additional validation for figmaFileKey
    if (data.figmaFileKey) {
      console.log(`   🔑 Figma File Key: ${data.figmaFileKey}`);
    } else {
      console.log(`   ❌ Missing figmaFileKey`);
      allValid = false;
    }
    
  } catch (error) {
    console.log(`❌ Error validating ${filename}: ${error.message}`);
    allValid = false;
  }
  
  console.log('');
}

console.log('='.repeat(50));
if (allValid) {
  console.log('🎉 All theme override files are valid!');
  process.exit(0);
} else {
  console.log('❌ Some theme override files have validation errors');
  process.exit(1);
} 
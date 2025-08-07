#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Remove codeSyntax blocks from JSON files
 */
function removeCodeSyntaxFromFile(filePath) {
  console.log(`Processing: ${filePath}`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    let modified = false;
    
    // Recursively remove codeSyntax from all objects
    function removeCodeSyntax(obj) {
      if (typeof obj !== 'object' || obj === null) {
        return;
      }
      
      if (Array.isArray(obj)) {
        obj.forEach(item => removeCodeSyntax(item));
        return;
      }
      
      if (obj.codeSyntax !== undefined) {
        delete obj.codeSyntax;
        modified = true;
      }
      
      // Recursively process all properties
      Object.values(obj).forEach(value => removeCodeSyntax(value));
    }
    
    removeCodeSyntax(data);
    
    if (modified) {
      // Write back the modified content
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`✅ Removed codeSyntax from: ${filePath}`);
    } else {
      console.log(`ℹ️  No codeSyntax found in: ${filePath}`);
    }
    
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

/**
 * Process all JSON files in the examples directory
 */
function processExamplesDirectory() {
  const examplesDir = path.join(__dirname, '..', 'examples');
  
  if (!fs.existsSync(examplesDir)) {
    console.error('Examples directory not found');
    return;
  }
  
  function processDirectory(dir) {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        processDirectory(itemPath);
      } else if (item.endsWith('.json')) {
        removeCodeSyntaxFromFile(itemPath);
      }
    });
  }
  
  processDirectory(examplesDir);
  console.log('🎉 Finished processing all example files');
}

// Run the script
if (require.main === module) {
  processExamplesDirectory();
}

module.exports = { removeCodeSyntaxFromFile, processExamplesDirectory }; 
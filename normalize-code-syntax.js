const fs = require('fs');

// Path to your JSON file (relative to current working directory)
const filePath = '../data-model/examples/themed/core-data.json';

// Load the file
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Build a mapping from platform displayName (case-insensitive) to platform id
const platformNameToId = {};
(data.platforms || []).forEach(platform => {
  platformNameToId[platform.displayName.toLowerCase()] = platform.id;
});

// Convert codeSyntax for each token
(data.tokens || []).forEach(token => {
  if (token.codeSyntax && !Array.isArray(token.codeSyntax)) {
    // It's an object, convert to array
    const arr = [];
    for (const [platformName, formattedName] of Object.entries(token.codeSyntax)) {
      const platformId = platformNameToId[platformName.toLowerCase()];
      if (platformId) {
        arr.push({ platformId, formattedName });
      } else {
        // Fallback: use the original key if no match
        arr.push({ platformId: platformName, formattedName });
      }
    }
    token.codeSyntax = arr;
  }
});

// Save the updated file
fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
console.log('codeSyntax fields have been normalized to array format!'); 
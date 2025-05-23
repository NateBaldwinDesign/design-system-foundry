const path = require('path');
const { readFileSync } = require('fs');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

// Load the schema
const schemaPath = path.resolve(__dirname, '../src/schema.json');
const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));

// Load the default data from the web-app
const storagePath = path.resolve(__dirname, '../../web-app/src/services/storage.ts');
const storageSource = readFileSync(storagePath, 'utf-8');

// Extract the default data arrays from the storage.ts file
function extractArray(name) {
  const match = storageSource.match(new RegExp(`const ${name}: [^=]+ = (\[[\s\S]*?\n\]);`, 'm'));
  if (!match) throw new Error(`Could not find array: ${name}`);
  // eslint-disable-next-line no-eval
  return eval(match[1]);
}

const tokenCollections = extractArray('DEFAULT_COLLECTIONS');
const dimensions = extractArray('DEFAULT_DIMENSIONS');
const tokens = extractArray('DEFAULT_TOKENS');
const platforms = extractArray('DEFAULT_PLATFORMS');
const taxonomies = extractArray('DEFAULT_TAXONOMIES');

// Compose the data as expected by the schema
const data = {
  systemName: 'Test System',
  systemId: 'test-system',
  tokenCollections,
  dimensions,
  tokens,
  platforms,
  taxonomies
};

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

const valid = validate(data);
if (valid) {
  console.log('✅ Data is valid against the schema.');
  process.exit(0);
} else {
  console.error('❌ Data validation failed:');
  console.error(validate.errors);
  process.exit(1);
} 
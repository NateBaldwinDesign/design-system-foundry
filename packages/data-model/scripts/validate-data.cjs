const path = require('path');
const { readFileSync } = require('fs');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

// Load the schema
const schemaPath = path.resolve(__dirname, '../src/schema.json');
const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));

// Load the unified default data
const dataPath = path.resolve(__dirname, '../examples/themed/core-data.json');
const data = JSON.parse(readFileSync(dataPath, 'utf-8'));

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
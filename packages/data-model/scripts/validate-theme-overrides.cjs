const path = require('path');
const fs = require('fs');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const schemaPath = path.resolve(__dirname, '../src/theme-overrides-schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

const themedDir = path.resolve(__dirname, '../examples/themed');
const files = fs.readdirSync(themedDir).filter(f => f.endsWith('-overrides.json'));

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

let allValid = true;

for (const file of files) {
  const filePath = path.join(themedDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const valid = validate(data);
  if (valid) {
    console.log(`✅ ${file} is valid.`);
  } else {
    allValid = false;
    console.error(`❌ ${file} failed validation:`);
    console.error(validate.errors);
  }
}

if (!allValid) {
  process.exit(1);
} else {
  process.exit(0);
} 
import path from 'path';
import fs from 'fs';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
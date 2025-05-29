const path = require('path');
const fs = require('fs');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const schemaPath = path.resolve(__dirname, '../src/theme-overrides-schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

const themedDir = path.resolve(__dirname, '../examples/themed');
const files = fs.readdirSync(themedDir).filter(f => f.endsWith('-overrides.json'));

// Load core data to validate against
const coreDataPath = path.join(themedDir, 'core-data.json');
const coreData = JSON.parse(fs.readFileSync(coreDataPath, 'utf-8'));

// Create a map of token IDs to their resolved value types
const tokenValueTypes = new Map();
coreData.tokens.forEach(token => {
  tokenValueTypes.set(token.id, token.resolvedValueTypeId);
});

// Create a map of resolved value type IDs to their definitions
const valueTypeDefinitions = new Map();
coreData.resolvedValueTypes.forEach(type => {
  valueTypeDefinitions.set(type.id, type);
});

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

// Add custom validation for theme overrides
ajv.addKeyword({
  keyword: 'validateThemeOverride',
  validate: function validateThemeOverride(schema, data) {
    // Get the token's value type
    const tokenId = data.tokenId;
    const valueTypeId = tokenValueTypes.get(tokenId);
    if (!valueTypeId) {
      validateThemeOverride.errors = [{
        keyword: 'validateThemeOverride',
        message: `Token ID not found in core data: ${tokenId}`,
        params: { tokenId }
      }];
      return false;
    }
    // Get the value type definition
    const valueType = valueTypeDefinitions.get(valueTypeId);
    if (!valueType) {
      validateThemeOverride.errors = [{
        keyword: 'validateThemeOverride',
        message: `Value type not found in core data: ${valueTypeId}`,
        params: { valueTypeId }
      }];
      return false;
    }
    // Validate each valuesByMode entry
    if (Array.isArray(data.valuesByMode)) {
      for (const entry of data.valuesByMode) {
        const value = entry.value && entry.value.value;
        // Validate pattern if present
        if (valueType.validation && valueType.validation.pattern) {
          const pattern = new RegExp(valueType.validation.pattern);
          if (!pattern.test(value)) {
            validateThemeOverride.errors = [{
              keyword: 'validateThemeOverride',
              message: `Value does not match pattern for type ${valueTypeId}`,
              params: { value, pattern: valueType.validation.pattern }
            }];
            return false;
          }
        }
        // Validate numeric range if present
        if (typeof value === 'number') {
          if (valueType.validation && valueType.validation.minimum !== undefined && value < valueType.validation.minimum) {
            validateThemeOverride.errors = [{
              keyword: 'validateThemeOverride',
              message: `Value is below minimum for type ${valueTypeId}`,
              params: { value, minimum: valueType.validation.minimum }
            }];
            return false;
          }
          if (valueType.validation && valueType.validation.maximum !== undefined && value > valueType.validation.maximum) {
            validateThemeOverride.errors = [{
              keyword: 'validateThemeOverride',
              message: `Value is above maximum for type ${valueTypeId}`,
              params: { value, maximum: valueType.validation.maximum }
            }];
            return false;
          }
        }
        // Validate units if present
        if (valueType.validation && valueType.validation.allowedUnits && typeof value === 'string') {
          const hasValidUnit = valueType.validation.allowedUnits.some(unit =>
            value.endsWith(unit)
          );
          if (!hasValidUnit) {
            validateThemeOverride.errors = [{
              keyword: 'validateThemeOverride',
              message: `Value has invalid unit for type ${valueTypeId}`,
              params: { value, allowedUnits: valueType.validation.allowedUnits }
            }];
            return false;
          }
        }
      }
    }
    return true;
  }
});

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
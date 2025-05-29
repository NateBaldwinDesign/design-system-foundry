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

// Add custom validation for resolvedValueTypes
ajv.addKeyword({
  keyword: 'validateResolvedValueType',
  validate: function validateResolvedValueType(schema, data) {
    // If type is provided, validate against standard types
    if (data.type) {
      const standardTypes = [
        'color', 'dimension', 'spacing', 'fontFamily', 'fontWeight',
        'fontSize', 'lineHeight', 'letterSpacing', 'duration',
        'cubicBezier', 'blur', 'spread', 'radius'
      ];
      
      if (!standardTypes.includes(data.type)) {
        validateResolvedValueType.errors = [{
          keyword: 'validateResolvedValueType',
          message: `Invalid standard type: ${data.type}`,
          params: { type: data.type }
        }];
        return false;
      }

      // Validate that id matches type for standard types
      if (data.id !== data.type) {
        validateResolvedValueType.errors = [{
          keyword: 'validateResolvedValueType',
          message: `Standard type ID must match type: ${data.id} !== ${data.type}`,
          params: { id: data.id, type: data.type }
        }];
        return false;
      }
    }

    // Validate custom validation rules if present
    if (data.validation) {
      if (data.validation.pattern && !(data.validation.pattern instanceof RegExp)) {
        try {
          new RegExp(data.validation.pattern);
        } catch (e) {
          validateResolvedValueType.errors = [{
            keyword: 'validateResolvedValueType',
            message: `Invalid validation pattern: ${data.validation.pattern}`,
            params: { pattern: data.validation.pattern }
          }];
          return false;
        }
      }

      if (data.validation.minimum !== undefined && data.validation.maximum !== undefined) {
        if (data.validation.minimum > data.validation.maximum) {
          validateResolvedValueType.errors = [{
            keyword: 'validateResolvedValueType',
            message: 'Minimum value cannot be greater than maximum value',
            params: { minimum: data.validation.minimum, maximum: data.validation.maximum }
          }];
          return false;
        }
      }
    }

    return true;
  }
});

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
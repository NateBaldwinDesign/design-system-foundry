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
    // If type is provided, validate against standard types (UPPER_CASE)
    if (data.type) {
      const standardTypes = [
        'COLOR', 'DIMENSION', 'SPACING', 'FONT_FAMILY', 'FONT_WEIGHT',
        'FONT_SIZE', 'LINE_HEIGHT', 'LETTER_SPACING', 'DURATION',
        'CUBIC_BEZIER', 'BLUR', 'SPREAD', 'RADIUS'
      ];
      if (!standardTypes.includes(data.type)) {
        validateResolvedValueType.errors = [{
          keyword: 'validateResolvedValueType',
          message: `Invalid standard type: ${data.type}`,
          params: { type: data.type }
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

// Add custom validation for token values
ajv.addKeyword({
  keyword: 'validateTokenValue',
  validate: function validateTokenValue(schema, data, parentSchema, dataPath, parentData, propertyName, rootData) {
    // Skip validation if not a token value
    if (!parentData || !parentData.resolvedValueTypeId) return true;

    // Get the token's resolvedValueTypeId
    const tokenResolvedValueTypeId = parentData.resolvedValueTypeId;

    // If it's an alias value
    if (data.resolvedValueTypeId === 'alias') {
      // Validate that the referenced token exists
      const referencedToken = rootData.tokens.find(t => t.id === data.tokenId);
      if (!referencedToken) {
        validateTokenValue.errors = [{
          keyword: 'validateTokenValue',
          message: `Referenced token ${data.tokenId} does not exist`,
          params: { tokenId: data.tokenId }
        }];
        return false;
      }
      return true;
    }

    // For non-alias values, validate that the resolvedValueTypeId matches the token's type
    const resolvedValueType = rootData.resolvedValueTypes.find(t => t.id === data.resolvedValueTypeId);
    if (!resolvedValueType) {
      validateTokenValue.errors = [{
        keyword: 'validateTokenValue',
        message: `Invalid resolvedValueTypeId: ${data.resolvedValueTypeId}`,
        params: { resolvedValueTypeId: data.resolvedValueTypeId }
      }];
      return false;
    }

    const tokenResolvedValueType = rootData.resolvedValueTypes.find(t => t.id === tokenResolvedValueTypeId);
    if (!tokenResolvedValueType) {
      validateTokenValue.errors = [{
        keyword: 'validateTokenValue',
        message: `Invalid token resolvedValueTypeId: ${tokenResolvedValueTypeId}`,
        params: { resolvedValueTypeId: tokenResolvedValueTypeId }
      }];
      return false;
    }

    if (resolvedValueType.type !== tokenResolvedValueType.type) {
      validateTokenValue.errors = [{
        keyword: 'validateTokenValue',
        message: `Value resolvedValueTypeId ${data.resolvedValueTypeId} does not match token's type ${tokenResolvedValueTypeId}`,
        params: { 
          valueResolvedValueTypeId: data.resolvedValueTypeId,
          tokenResolvedValueTypeId: tokenResolvedValueTypeId
        }
      }];
      return false;
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
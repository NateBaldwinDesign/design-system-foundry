#!/bin/bash

# Test runner script for data-model package
# This script runs all validation tests including the new property type mapping tests

set -e  # Exit on any error

echo "🧪 Running Data Model Test Suite"
echo "=================================="

# Run all tests (including property type mapping validation)
echo ""
echo "📋 Running all validation tests..."
npm run test

echo ""
echo "✅ All tests completed successfully!"
echo ""
echo "Test Summary:"
echo "- Data validation: ✅"
echo "- Theme overrides validation: ✅"
echo "- Property type mapping validation: ✅" 
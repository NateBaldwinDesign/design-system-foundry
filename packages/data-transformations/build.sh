#!/bin/bash

# Data Transformations Build Script
# This script builds the data-transformations package with comprehensive error checking

set -e  # Exit on any error

echo "🔨 Building @token-model/data-transformations..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[BUILD]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "tsconfig.json" ]; then
    print_error "Must be run from the data-transformations package directory"
    exit 1
fi

# Step 1: Clean previous build
print_status "Cleaning previous build..."
rm -rf dist/
print_success "Clean complete"

# Step 2: Install dependencies (if needed)
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
    print_success "Dependencies installed"
fi

# Step 3: Lint the code
print_status "Running ESLint..."
if npm run lint; then
    print_success "Linting passed"
else
    print_error "Linting failed"
    exit 1
fi

# Step 4: Type check
print_status "Running TypeScript type check..."
if npx tsc --noEmit; then
    print_success "Type checking passed"
else
    print_error "Type checking failed"
    exit 1
fi

# Step 5: Build the package
print_status "Building TypeScript..."
if npm run build; then
    print_success "Build completed"
else
    print_error "Build failed"
    exit 1
fi

# Step 6: Verify build output
print_status "Verifying build output..."
if [ -d "dist" ] && [ -f "dist/data-transformations/src/index.js" ]; then
    print_success "Build output verified"
else
    print_error "Build output verification failed"
    exit 1
fi

# Step 7: Run tests (if they exist)
if [ -d "tests" ] && [ "$(ls -A tests)" ]; then
    print_status "Running tests..."
    if npm test; then
        print_success "Tests passed"
    else
        print_warning "Tests failed (but build succeeded)"
    fi
else
    print_warning "No tests found, skipping test execution"
fi

# Step 8: Generate build report
print_status "Generating build report..."
BUILD_TIME=$(date)
BUILD_SIZE=$(du -sh dist/ 2>/dev/null | cut -f1 || echo "unknown")

echo "=========================================="
echo "           BUILD REPORT"
echo "=========================================="
echo "Package: @token-model/data-transformations"
echo "Build Time: $BUILD_TIME"
echo "Build Size: $BUILD_SIZE"
echo "TypeScript: $(npx tsc --version | head -n1)"
echo "Node: $(node --version)"
echo "=========================================="

print_success "Build completed successfully! 🎉" 
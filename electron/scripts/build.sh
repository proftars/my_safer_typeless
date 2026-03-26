#!/bin/bash

# Build script for My Safer Typeless Electron app

set -e

echo "🔨 Building My Safer Typeless Electron App..."

# Check if we're in the electron directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Run this script from the electron directory."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build TypeScript
echo "📝 Compiling TypeScript..."
npm run build

# Create distribution package
echo "📦 Packaging application..."
npm run package:mac

echo "✅ Build complete!"
echo ""
echo "Distribution file is ready in the 'dist' directory."

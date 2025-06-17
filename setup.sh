#!/bin/bash

# Building Automation Point Grouping Setup Script
echo "🏗️  Setting up Building Automation Point Grouping System..."

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Installing pnpm..."
    npm install -g pnpm
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Create .env.local from example if it doesn't exist
if [ ! -f .env.local ]; then
    echo "🔧 Creating .env.local from example..."
    cp .env.example .env.local
    echo "✅ Created .env.local - please update with your actual values"
fi

# Build the project to check for errors
echo "🔨 Building project..."
pnpm build

echo "✅ Setup complete!"
echo ""
echo "🚀 To start the development server:"
echo "   pnpm dev"
echo ""
echo "🧪 To run tests:"
echo "   pnpm test"
echo ""
echo "📖 Visit http://localhost:3000 to view the application"
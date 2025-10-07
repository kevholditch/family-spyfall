#!/bin/bash

# Family Spyfall Setup Script
# This script helps you get started with the Family Spyfall game

set -e

echo "🎮 Welcome to Family Spyfall Setup!"
echo "=================================="

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install pnpm first:"
    echo "   npm install -g pnpm"
    exit 1
fi

echo "✅ pnpm is installed"

# Check if Node.js version is 18+
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version $(node -v) is compatible"

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📄 Creating .env file from template..."
    cp env.example .env
    echo "✅ Created .env file. You can modify it if needed."
else
    echo "✅ .env file already exists"
fi

# Build applications
echo "🔨 Building applications..."
pnpm build

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To start the application:"
echo "  pnpm dev"
echo ""
echo "This will start:"
echo "  - Server on http://localhost:4000"
echo "  - Web app on http://localhost:5173"
echo ""
echo "To run tests:"
echo "  pnpm test"
echo ""
echo "To run with Docker:"
echo "  docker-compose up --build"
echo ""
echo "Happy gaming! 🎮"

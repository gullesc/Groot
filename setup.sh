#!/bin/bash

# GROOT Setup Script
# Run this after cloning/downloading the project

echo ""
echo "  🌳 G.R.O.O.T. Setup"
echo "  Guided Resource for Organized Objective Training"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ is required. Current version: $(node -v)"
    exit 1
fi
echo "✅ Node.js $(node -v) detected"

# Check BEADS
if ! command -v bd &> /dev/null; then
    echo ""
    echo "⚠️  BEADS is not installed."
    echo "   Install with: curl -fsSL https://raw.githubusercontent.com/steveyegge/beads/main/scripts/install.sh | bash"
    echo ""
    read -p "Continue without BEADS? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✅ BEADS detected"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ npm install failed"
    exit 1
fi
echo "✅ Dependencies installed"

# Build project
echo ""
echo "🔨 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi
echo "✅ Build complete"

# Initialize BEADS if available
if command -v bd &> /dev/null; then
    if [ ! -d ".beads" ]; then
        echo ""
        echo "🌱 Initializing BEADS..."
        bd init --quiet
        echo "✅ BEADS initialized"
    fi
fi

# Check for API key
echo ""
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "⚠️  ANTHROPIC_API_KEY is not set"
    echo "   Set it with: export ANTHROPIC_API_KEY=your-key-here"
else
    echo "✅ ANTHROPIC_API_KEY is set"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🌳 GROOT is ready!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Try these commands:"
echo "    npm run dev status         - Check system status"
echo "    npm run dev ask \"Hello!\"   - Chat with Bark"
echo ""
echo "  Or after setting up your PATH:"
echo "    groot status"
echo "    groot ask \"What is RAG?\""
echo ""
echo "  📚 See docs/beads-setup.md for BEADS task setup"
echo ""

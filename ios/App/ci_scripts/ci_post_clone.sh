#!/bin/sh
# Xcode Cloud — post-clone script
# Runs automatically after repo clone, BEFORE Swift Package Manager resolves dependencies
# Purpose: install node_modules so local SPM path references (Capacitor plugins) can resolve

set -e

echo "📦 ci_post_clone.sh — installing npm dependencies"
echo "CI_PRIMARY_REPOSITORY_PATH: $CI_PRIMARY_REPOSITORY_PATH"

# Navigate to project root
cd "$CI_PRIMARY_REPOSITORY_PATH"

# Install Homebrew if not available (older Xcode Cloud VMs)
if ! command -v brew &>/dev/null; then
  echo "🍺 Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Install Node.js if not available
if ! command -v node &>/dev/null; then
  echo "📗 Installing Node.js via Homebrew..."
  brew install node
fi

echo "✅ Node $(node --version), npm $(npm --version)"

# Install dependencies
echo "📦 Running npm install..."
npm install

echo "✅ node_modules ready — Capacitor plugins available for SPM resolution"

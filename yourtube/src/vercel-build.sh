#!/bin/bash
set -e

echo "🧹 Cleaning cache..."
rm -rf node_modules .next

echo "📦 Installing fresh dependencies..."
npm install

echo "🔨 Building..."
npm run build
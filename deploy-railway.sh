#!/bin/bash
set -e

echo "🚀 Deploying to Railway..."

# Install Railway CLI if not present
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "npm install -g @railway/cli"
    exit 1
fi

# Login check
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway. Please run: railway login"
    exit 1
fi

# Generate Prisma client
echo "📦 Generating Prisma client..."
pnpm run db:generate

# Build the application
echo "🔨 Building application..."
pnpm run build

# Deploy to Railway
echo "🚀 Deploying to Railway..."
railway up --detach

echo "✅ Deployment initiated! Check Railway dashboard for status."

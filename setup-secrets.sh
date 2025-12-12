#!/bin/bash

# MiniZ Flash Pro - Security Setup Script
# This script helps you configure environment variables securely

echo "🔐 MiniZ Flash Pro - Security Setup"
echo "===================================="
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found!"
    echo "📦 Install: npm install -g wrangler"
    exit 1
fi

echo "✅ Wrangler CLI found"
echo ""

# Check if logged in
if ! wrangler whoami &> /dev/null; then
    echo "🔑 Please login to Cloudflare first:"
    wrangler login
fi

echo ""
echo "📋 Setting up secrets for your worker..."
echo ""

# SECRET_KEY
echo "1️⃣  Setting SECRET_KEY"
echo "   (Use a random string, 32+ characters recommended)"
echo "   Example: minizflashnew-$(date +%s)-$(openssl rand -hex 16)"
wrangler secret put SECRET_KEY

echo ""

# GITHUB_TOKEN
echo "2️⃣  Setting GITHUB_TOKEN"
echo "   (GitHub Personal Access Token with 'repo' permission)"
echo "   Create at: https://github.com/settings/tokens"
wrangler secret put GITHUB_TOKEN

echo ""

# Optional: TURNSTILE_SECRET
read -p "Do you want to set TURNSTILE_SECRET? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "3️⃣  Setting TURNSTILE_SECRET"
    echo "   (Get from Cloudflare Dashboard → Turnstile)"
    wrangler secret put TURNSTILE_SECRET
fi

echo ""
echo "✅ Secrets configured successfully!"
echo ""
echo "📦 Next steps:"
echo "   1. Update wrangler.toml with your KV namespace ID"
echo "   2. Deploy: wrangler deploy"
echo "   3. Test: wrangler tail"
echo ""

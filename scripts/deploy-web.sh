#!/bin/bash
set -e

# Splitify Web App Deployment Script
# Builds Expo Web SPA, syncs static assets to S3, and invalidates CloudFront CDN cache.

STACK_NAME=${1:-"splitify-api"}

echo "🚀 Starting Splitify Web Deployment..."

# 1. Fetch AWS Stack Outputs
echo "🔍 Fetching AWS Stack Outputs for stack '${STACK_NAME}'..."
BUCKET_NAME=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='WebAppBucketName'].OutputValue" --output text 2>/dev/null || echo "")
DISTRIBUTION_ID=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text 2>/dev/null || echo "")
WEB_URL=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='WebAppUrl'].OutputValue" --output text 2>/dev/null || echo "")

if [ -z "$BUCKET_NAME" ]; then
  echo "⚠️ Could not auto-detect WebAppBucketName from stack '${STACK_NAME}'."
  if [ -z "$WEB_S3_BUCKET" ]; then
    echo "❌ Error: WEB_S3_BUCKET environment variable is not set and stack output was not found."
    exit 1
  fi
  BUCKET_NAME="$WEB_S3_BUCKET"
fi

echo "📦 Target S3 Bucket: $BUCKET_NAME"
if [ -n "$DISTRIBUTION_ID" ]; then
  echo "⚡ CloudFront Distribution ID: $DISTRIBUTION_ID"
fi

# 2. Build Web Export
echo "🔨 Building Expo Web application..."
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$ROOT_DIR/apps/mobile-web"
EXPO_NO_TELEMETRY=1 npx expo export --platform web

BUILD_DIR="$ROOT_DIR/apps/mobile-web/dist"
if [ ! -d "$BUILD_DIR" ]; then
  BUILD_DIR="$ROOT_DIR/apps/mobile-web/web-build"
fi

if [ ! -d "$BUILD_DIR" ]; then
  echo "❌ Error: Build output directory not found!"
  exit 1
fi

echo "📂 Static assets exported to: $BUILD_DIR"

# 3. Sync Assets to S3
echo "☁️ Syncing assets to s3://$BUCKET_NAME..."
aws s3 sync "$BUILD_DIR" "s3://$BUCKET_NAME" --delete --exact-timestamps

# 4. Invalidate CloudFront Cache
if [ -n "$DISTRIBUTION_ID" ]; then
  echo "🔄 Creating CloudFront cache invalidation for distribution $DISTRIBUTION_ID..."
  aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths "/*"
fi

echo "🎉 Deployment complete!"
if [ -n "$WEB_URL" ]; then
  echo "🌐 Live Web App URL: $WEB_URL"
fi

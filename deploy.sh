#!/bin/bash
set -e

REPO_DIR="/tmp/property-leadgen"
ENV_FILE="/docker/autoagent/.env"
IMAGE="property-leadgen:latest"

echo "Pulling latest code..."
rm -rf "$REPO_DIR"
git clone https://github.com/purekiwinz/property-leadgen.git "$REPO_DIR"

echo "Loading env vars..."
source "$ENV_FILE"

echo "Building Docker image..."
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  --build-arg NEXT_PUBLIC_MAPBOX_API_KEY="$NEXT_PUBLIC_MAPBOX_API_KEY" \
  --build-arg NEXT_PUBLIC_META_PIXEL_ID="$NEXT_PUBLIC_META_PIXEL_ID" \
  --build-arg NEXT_PUBLIC_LINKEDIN_PARTNER_ID="$NEXT_PUBLIC_LINKEDIN_PARTNER_ID" \
  --build-arg NEXT_PUBLIC_LINKEDIN_CONVERSION_ID="$NEXT_PUBLIC_LINKEDIN_CONVERSION_ID" \
  -t "$IMAGE" \
  "$REPO_DIR"

echo "Restarting container..."
cd /docker/autoagent && docker-compose up -d leadgen

echo "Done. Site is live at https://leads.edscanlan.co.nz"

#!/bin/bash
set -e

# ============================================
# Build & Push cerc-spot image to Scaleway
# ============================================

REGISTRY="rg.fr-par.scw.cloud/funcscwnscercspotj2rciose"
IMAGE_NAME="cerc-spot"
DEFAULT_TAG=$(node -p "require('./package.json').version")

# Ask for tag
read -rp "Tag de l'image [$DEFAULT_TAG]: " TAG
TAG="${TAG:-$DEFAULT_TAG}"

FULL_IMAGE="$REGISTRY/$IMAGE_NAME:$TAG"

echo ""
echo "=> Build de $FULL_IMAGE ..."
docker build -t "$FULL_IMAGE" .

# Tag also as latest
docker tag "$FULL_IMAGE" "$REGISTRY/$IMAGE_NAME:latest"

echo ""
echo "=> Login au registry Scaleway ..."
scw registry login

echo ""
echo "=> Push de $FULL_IMAGE ..."
docker push "$FULL_IMAGE"
docker push "$REGISTRY/$IMAGE_NAME:latest"

echo ""
echo "=> Done! Image pushed:"
echo "   $FULL_IMAGE"
echo "   $REGISTRY/$IMAGE_NAME:latest"
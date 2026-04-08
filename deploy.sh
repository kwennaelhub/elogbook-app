#!/bin/bash
# Script de déploiement E-Logbook → Vercel
# Contourne le bug Git/Login Connection en déployant depuis un répertoire sans .git

set -e

export PATH="$HOME/.nvm/versions/node/v24.14.1/bin:$PATH"
APP_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "📦 Build local..."
cd "$APP_DIR"
npx vercel pull --yes --environment=production
npx vercel build --prod

echo "🚀 Préparation du déploiement..."
TMPDIR=$(mktemp -d)
rsync -a --exclude='.git' --exclude='.vercel' "$APP_DIR/" "$TMPDIR/"
cp -r "$APP_DIR/.vercel" "$TMPDIR/"

echo "☁️  Envoi vers Vercel..."
cd "$TMPDIR"
npx vercel deploy --prebuilt --prod

echo "🔗 Mise à jour de l'alias..."
DEPLOY_URL=$(npx vercel ls 2>&1 | grep "elogbook-v2" | head -1 | awk '{print $3}')
if [ -n "$DEPLOY_URL" ]; then
  npx vercel alias set "$DEPLOY_URL" elogbook-app.vercel.app
fi

echo "🧹 Nettoyage..."
rm -rf "$TMPDIR"

echo "✅ Déployé sur https://elogbook-app.vercel.app"

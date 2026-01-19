#!/bin/bash
# scripts/verify-codegen.sh
# Verifies codegen infrastructure is intact

set -e

echo "🔍 Verifying codegen infrastructure..."

# Check Orval configs exist
for app in web admin landing; do
    CONFIG="apps/$app/orval.config.mjs"
    if [ -f "$CONFIG" ] || [ -f "apps/$app/orval.config.ts" ]; then
        echo "✅ Orval config exists for $app"
    else
        echo "❌ Missing Orval config for $app"
        exit 1
    fi
done

# Check generated folders exist
if [ -d "apps/web/src/api/generated" ]; then
    echo "✅ Generated API folder exists"
else
    echo "❌ Generated API folder missing"
    exit 1
fi

# Check index file exists
if [ -f "apps/web/src/api/generated/index.ts" ]; then
    echo "✅ Generated index.ts exists"
else
    echo "⚠️ Generated index.ts missing (run npm run gen:api)"
fi

# Count generated files
HOOK_COUNT=$(find apps/web/src/api/generated -name "*.ts" 2>/dev/null | wc -l | tr -d ' ')
echo "📊 Found $HOOK_COUNT generated TypeScript files"

# Check for manual edits marker
if grep -r "MANUALLY EDITED" apps/web/src/api/generated/ 2>/dev/null; then
    echo "⚠️ Warning: Manual edits detected in generated files!"
else
    echo "✅ No manual edits in generated files"
fi

# Verify Orval diff lock (if API is running)
if curl -s http://localhost:5003/openapi.json > /dev/null 2>&1; then
    echo ""
    echo "🔄 Running Orval diff check..."
    cd apps/web
    npm run gen:api 2>/dev/null || true
    if git diff --quiet src/api/generated/ 2>/dev/null; then
        echo "✅ Orval output matches committed files"
    else
        echo "⚠️ Orval output differs from committed files"
        git diff --stat src/api/generated/ 2>/dev/null || true
    fi
    cd ../..
else
    echo "⏭️ Skipping Orval diff check (API not running)"
fi

echo ""
echo "✅ Codegen infrastructure verification complete"

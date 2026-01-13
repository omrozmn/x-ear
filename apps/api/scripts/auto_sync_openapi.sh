#!/bin/bash
# Otomatik OpenAPI sync script
# Backend değişikliklerinden sonra OpenAPI'yi günceller ve tüm frontend app'leri regenerate eder

set -e

echo "🔄 OpenAPI Auto-Sync başlatılıyor..."
echo ""

# 1. Backend'den OpenAPI generate et
echo "📝 Backend route'lardan OpenAPI generate ediliyor..."
cd "$(dirname "$0")/.."
python scripts/generate_openapi.py --output ../../openapi.generated.yaml

# 2. Manuel spec ile merge et
echo "🔀 Manuel spec ile merge ediliyor..."
python scripts/merge_openapi.py

echo ""
echo "🎨 Frontend API client'ları regenerate ediliyor..."
echo ""

# 3. Web app
echo "  📱 Web app..."
cd ../web
npm run gen:api
echo "     ✅ Web app tamamlandı"

# 4. Admin app
echo "  🔧 Admin app..."
cd ../admin
npm run gen:api
echo "     ✅ Admin app tamamlandı"

# 5. Landing app
echo "  🌐 Landing app..."
cd ../landing
npm run orval
echo "     ✅ Landing app tamamlandı"

cd ../..

echo ""
echo "✅ OpenAPI sync tamamlandı!"
echo ""
echo "📊 Değişiklikleri kontrol edin:"
echo "   git diff openapi.yaml"
echo "   git diff apps/web/src/api/generated"
echo "   git diff apps/admin/src/lib/api"
echo "   git diff apps/landing/src/lib/api/generated"

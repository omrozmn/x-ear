#!/bin/bash
# Optimized Schemathesis test configuration

set -e

echo "🔐 Getting authentication token..."

# Admin login
ADMIN_TOKEN=$(curl -s -X POST "http://localhost:5003/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@x-ear.com","password":"admin123"}' | jq -r '.data.token')

if [ "$ADMIN_TOKEN" == "null" ] || [ -z "$ADMIN_TOKEN" ]; then
    echo "❌ Failed to get admin token"
    exit 1
fi

# Tenant impersonation
IMPERSONATE_TOKEN=$(curl -s -X POST "http://localhost:5003/api/admin/debug/switch-tenant" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"targetTenantId":"938ab3ec-192a-4f89-8a63-6941212e2f2a"}' | jq -r '.data.accessToken')

if [ "$IMPERSONATE_TOKEN" == "null" ] || [ -z "$IMPERSONATE_TOKEN" ]; then
    echo "❌ Failed to get impersonation token"
    exit 1
fi

echo "✓ Got impersonation token"
echo ""

echo "🧪 Running Schemathesis tests..."
echo "Configuration:"
echo "  - Max examples: 5 (reduced for speed)"
echo "  - Workers: 8"
echo "  - Checks: Only critical ones"
echo "  - Hypothesis: Suppressed health checks"
echo ""

# Activate venv
source apps/api/.venv/bin/activate

# Run Schemathesis with optimized settings
schemathesis run http://localhost:5003/openapi.json \
  --url http://localhost:5003 \
  --header "Authorization: Bearer $IMPERSONATE_TOKEN" \
  --max-examples 5 \
  --workers 8 \
  --checks not_a_server_error \
  --checks status_code_conformance \
  --checks content_type_conformance \
  --checks response_schema_conformance \
  --hypothesis-suppress-health-check=too_slow \
  --hypothesis-suppress-health-check=filter_too_much \
  --hypothesis-deadline=None \
  --request-timeout=30000 \
  --validate-schema=false

echo ""
echo "✓ Tests completed"

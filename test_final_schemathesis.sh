#!/bin/bash
# Schemathesis test with idempotency middleware disabled

set -e

echo "🔐 Getting authentication token..."

# Admin login
ADMIN_TOKEN=$(curl -s -X POST "http://localhost:5003/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: admin-login-$(date +%s)" \
  -d '{"email":"admin@x-ear.com","password":"admin123"}' | jq -r '.data.token')

# Tenant impersonation
IMPERSONATE_TOKEN=$(curl -s -X POST "http://localhost:5003/api/admin/debug/switch-tenant" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: tenant-switch-$(date +%s)" \
  -d '{"targetTenantId":"938ab3ec-192a-4f89-8a63-6941212e2f2a"}' | jq -r '.data.accessToken')

echo "✓ Got impersonation token"
echo ""

echo "🧪 Running Schemathesis tests on /api/parties..."
echo "=" * 60

# Run with wrapper
source apps/api/.venv/bin/activate

# Set TESTING=true to disable idempotency middleware
export TESTING=true

schemathesis run http://localhost:5003/openapi.json \
  --url http://localhost:5003 \
  --header "Authorization: Bearer $IMPERSONATE_TOKEN" \
  --max-examples 10 \
  --workers 8 \
  --exclude-checks unsupported_method

echo ""
echo "✓ Tests completed"

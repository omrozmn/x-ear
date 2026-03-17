#!/bin/bash
# Test ONLY for server errors (500s) - fastest way to find real bugs

set -e

echo "🔐 Getting authentication token..."

# Admin login
ADMIN_TOKEN=$(curl -s -X POST "http://localhost:5003/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@x-ear.com","password":"admin123"}' | jq -r '.data.token')

# Tenant impersonation
IMPERSONATE_TOKEN=$(curl -s -X POST "http://localhost:5003/api/admin/debug/switch-tenant" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"targetTenantId":"938ab3ec-192a-4f89-8a63-6941212e2f2a"}' | jq -r '.data.accessToken')

echo "✓ Got impersonation token"
echo ""

echo "🧪 Testing for SERVER ERRORS ONLY (500s)..."
echo "This will be FAST - only checking if endpoints crash"
echo ""

source apps/api/.venv/bin/activate

schemathesis run http://localhost:5003/openapi.json \
  --url http://localhost:5003 \
  --header "Authorization: Bearer $IMPERSONATE_TOKEN" \
  --max-examples 3 \
  --workers 8 \
  --checks not_a_server_error

echo ""
echo "✓ Server error check completed"

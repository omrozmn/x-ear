#!/bin/bash
# Analyze 401 errors by category

echo "=== 401 Error Analysis ==="
echo ""

echo "1. ADMIN endpoints requiring tenant context:"
grep "401 - Tenant context required" x-ear/failed_endpoints.txt | wc -l

echo ""
echo "2. TENANT_WEB_APP endpoints with 'Invalid token':"
grep "/api/" x-ear/failed_endpoints.txt | grep "401 - Invalid token" | grep -v "/api/admin" | wc -l

echo ""
echo "3. SYSTEM endpoints with 'Invalid token':"
grep "401 - Invalid token" x-ear/failed_endpoints.txt | grep -E "^(GET|POST|PUT|DELETE|PATCH) /" | grep -v "^(GET|POST|PUT|DELETE|PATCH) /api/" | wc -l

echo ""
echo "4. AFFILIATE endpoints:"
grep "/api/affiliates" x-ear/failed_endpoints.txt | wc -l

echo ""
echo "5. AI endpoints with 'Token expired or invalid':"
grep "/api/ai" x-ear/failed_endpoints.txt | grep "401" | wc -l

echo ""
echo "=== Sample errors by category ==="
echo ""
echo "ADMIN (tenant context required):"
grep "401 - Tenant context required" x-ear/failed_endpoints.txt | head -3

echo ""
echo "TENANT_WEB_APP (Invalid token):"
grep "/api/" x-ear/failed_endpoints.txt | grep "401 - Invalid token" | grep -v "/api/admin" | grep -v "/api/affiliates" | head -3

echo ""
echo "AFFILIATE:"
grep "/api/affiliates" x-ear/failed_endpoints.txt | head -3

echo ""
echo "AI:"
grep "/api/ai" x-ear/failed_endpoints.txt | head -3

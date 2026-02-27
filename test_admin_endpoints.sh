#!/bin/bash

# Test all admin endpoints
TOKEN=$(cat /tmp/admin_token.txt)
BASE_URL="http://localhost:5003"

echo "=== Testing Admin Endpoints ==="
echo ""

PASSED=0
FAILED=0
MISSING=0

# Extract all admin endpoints from OpenAPI
ENDPOINTS=$(grep -E '^\s+/api/admin/' openapi.yaml | sed 's/://g' | sed 's/^\s*//')

# Test each endpoint
while IFS= read -r endpoint; do
    # Skip if empty
    [ -z "$endpoint" ] && continue
    
    # Replace path parameters with dummy values
    test_endpoint=$(echo "$endpoint" | sed 's/{[^}]*}/test-id/g')
    
    # Determine method (GET for list endpoints, others need specific testing)
    if [[ "$test_endpoint" == *"test-id"* ]]; then
        # Skip detail endpoints for now
        continue
    fi
    
    # Test GET endpoint
    response=$(curl -s -X GET "${BASE_URL}${test_endpoint}?page=1&perPage=5" \
        -H "Authorization: Bearer $TOKEN" \
        -w "\n%{http_code}" | tail -1)
    
    if [ "$response" = "200" ]; then
        echo "✓ $endpoint"
        ((PASSED++))
    elif [ "$response" = "404" ]; then
        echo "✗ $endpoint [404 NOT FOUND]"
        ((MISSING++))
    else
        echo "⚠ $endpoint [$response]"
        ((FAILED++))
    fi
    
done <<< "$ENDPOINTS"

echo ""
echo "=== Summary ==="
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo "Missing (404): $MISSING"
echo "Total: $((PASSED + FAILED + MISSING))"

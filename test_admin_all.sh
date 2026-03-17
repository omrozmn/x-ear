#!/bin/bash
# Master test runner for all admin endpoints

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         X-Ear Admin Endpoints Test Suite                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if backend is running
echo "🔍 Checking if backend is running..."
if ! curl -s http://localhost:5003/health > /dev/null 2>&1; then
    echo "❌ Backend is not running at http://localhost:5003"
    echo ""
    echo "💡 Start the backend first:"
    echo "   cd x-ear/apps/api && python main.py"
    echo ""
    exit 1
fi
echo "✓ Backend is running"
echo ""

# Run GET endpoints test
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Testing GET Endpoints"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
python3 test_all_admin_endpoints.py
GET_RESULT=$?
echo ""

# Run mutation endpoints test
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. Testing POST/PUT/DELETE Endpoints"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
python3 test_admin_mutations.py
MUTATION_RESULT=$?
echo ""

# Final summary
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    Final Summary                           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

if [ $GET_RESULT -eq 0 ]; then
    echo "✅ GET Endpoints: PASSED"
else
    echo "❌ GET Endpoints: FAILED"
fi

if [ $MUTATION_RESULT -eq 0 ]; then
    echo "✅ Mutation Endpoints: PASSED"
else
    echo "❌ Mutation Endpoints: FAILED"
fi

echo ""

# Exit with error if any test failed
if [ $GET_RESULT -ne 0 ] || [ $MUTATION_RESULT -ne 0 ]; then
    echo "❌ Some tests failed"
    exit 1
else
    echo "✅ All tests passed!"
    exit 0
fi

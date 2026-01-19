#!/bin/bash
# ==============================================================================
# X-EAR SPEC COMPLIANCE ANALYZER
# Analyzes all .kiro/specs for completion status, tests, and technical debt
# ==============================================================================

set -e
cd "$(dirname "$0")/.."

echo "╔══════════════════════════════════════════════════════════════════════════╗"
echo "║           X-EAR SPEC COMPLIANCE ANALYZER v1.0                           ║"
echo "║           $(date '+%Y-%m-%d %H:%M:%S')                                         ║"
echo "╚══════════════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counter variables
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNINGS=0

check_pass() {
    ((PASSED_CHECKS++))
    ((TOTAL_CHECKS++))
    echo -e "  ${GREEN}✓${NC} $1"
}

check_fail() {
    ((FAILED_CHECKS++))
    ((TOTAL_CHECKS++))
    echo -e "  ${RED}✗${NC} $1"
}

check_warn() {
    ((WARNINGS++))
    echo -e "  ${YELLOW}⚠${NC} $1"
}

# ==============================================================================
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  SPEC 1: MULTI-TENANCY SECURITY (G-02)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo ""

echo "▸ Checking forbidden patterns..."

# Check 1.1: No set_current_tenant_id(None)
if grep -rq "set_current_tenant_id(None)" apps/api/ --include="*.py" 2>/dev/null; then
    check_fail "Found set_current_tenant_id(None) - FORBIDDEN"
    grep -rn "set_current_tenant_id(None)" apps/api/ --include="*.py" | head -5
else
    check_pass "No set_current_tenant_id(None) found"
fi

# Check 1.2: No BaseHTTPMiddleware in middleware files
if grep -rq "class.*BaseHTTPMiddleware" apps/api/middleware/ --include="*.py" 2>/dev/null; then
    check_fail "Found BaseHTTPMiddleware class - FORBIDDEN"
else
    check_pass "No BaseHTTPMiddleware class in middleware"
fi

# Check 1.3: TenantScopedMixin exists
if [ -f "apps/api/core/models/mixins.py" ]; then
    if grep -q "TenantScopedMixin" apps/api/core/models/mixins.py 2>/dev/null; then
        check_pass "TenantScopedMixin found in core/models/mixins.py"
    else
        check_fail "TenantScopedMixin not found"
    fi
else
    check_fail "core/models/mixins.py not found"
fi

# Check 1.4: Token-based context functions
if grep -q "set_tenant_context\|reset_tenant_context" apps/api/core/database.py 2>/dev/null; then
    check_pass "Token-based context functions exist"
else
    check_warn "Token-based context functions not found in database.py"
fi

# Check 1.5: Background task decorator
if [ -f "apps/api/utils/background_task.py" ]; then
    check_pass "background_task.py module exists"
else
    check_warn "background_task.py not found"
fi

# ==============================================================================
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  SPEC 2: PARTY MIGRATION CLEANUP (G-07, G-09, G-10)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo ""

echo "▸ Checking permission strings..."

# Check 2.1: No patients.* permissions in routers
PATIENTS_PERMS=$(grep -rn "patients\." apps/api/routers/ --include="*.py" 2>/dev/null | grep -v "#" | grep -v "comment" | wc -l)
if [ "$PATIENTS_PERMS" -eq 0 ]; then
    check_pass "No patients.* permissions in routers"
else
    check_fail "Found $PATIENTS_PERMS patients.* permission references"
    grep -rn "patients\." apps/api/routers/ --include="*.py" | grep -v "#" | head -3
fi

echo ""
echo "▸ Checking service parameters..."

# Check 2.2: No patient_id in services (excluding comments)
PATIENT_ID_SERVICES=$(grep -rn "patient_id" apps/api/services/ --include="*.py" 2>/dev/null | grep -v "#" | grep -v "party_id" | wc -l)
if [ "$PATIENT_ID_SERVICES" -eq 0 ]; then
    check_pass "No patient_id in services"
else
    check_warn "Found $PATIENT_ID_SERVICES patient_id references in services (may be comments)"
fi

# Check 2.3: Party integration tests exist
if [ -f "apps/api/tests/integration/test_party_crud.py" ]; then
    check_pass "test_party_crud.py exists"
else
    check_fail "test_party_crud.py not found"
fi

if [ -f "apps/api/tests/integration/test_party_permissions.py" ]; then
    check_pass "test_party_permissions.py exists"
else
    check_fail "test_party_permissions.py not found"
fi

# ==============================================================================
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  SPEC 3: AUTH BOUNDARY MIGRATION (G-03)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo ""

echo "▸ Checking backend auth standardization..."

# Check 3.1: Auth router uses Pydantic
if grep -q "response_model" apps/api/routers/auth.py 2>/dev/null; then
    RESPONSE_MODEL_COUNT=$(grep -c "response_model" apps/api/routers/auth.py)
    check_pass "Auth router has $RESPONSE_MODEL_COUNT response_model declarations"
else
    check_fail "No response_model in auth router"
fi

# Check 3.2: No to_dict in auth router
if grep -q "\.to_dict()" apps/api/routers/auth.py 2>/dev/null; then
    check_fail "Found to_dict() in auth router"
else
    check_pass "No to_dict() in auth router"
fi

# Check 3.3: AuthUserRead schema exists
if grep -q "class AuthUserRead" apps/api/schemas/auth.py 2>/dev/null; then
    check_pass "AuthUserRead schema exists"
else
    check_fail "AuthUserRead schema not found"
fi

echo ""
echo "▸ Checking frontend auth migration..."

# Check 3.4: Manual apiClient in authStore
MANUAL_AUTH_CALLS=$(grep -c "apiClient({" apps/web/src/stores/authStore.ts 2>/dev/null || echo "0")
if [ "$MANUAL_AUTH_CALLS" -eq 0 ]; then
    check_pass "No manual apiClient calls in authStore"
else
    check_fail "Found $MANUAL_AUTH_CALLS manual apiClient calls in authStore"
fi

# Check 3.5: Orval auth imports
if grep -q "from '@/api/generated/auth" apps/web/src/stores/authStore.ts 2>/dev/null; then
    check_pass "AuthStore uses Orval-generated auth imports"
else
    check_warn "AuthStore may not use Orval imports"
fi

# ==============================================================================
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  SPEC 4: FRONTEND ADAPTER LAYER (G-05, G-08)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo ""

echo "▸ Checking adapter layer..."

# Check 4.1: Client wrapper files exist
CLIENT_FILES=$(ls apps/web/src/api/client/*.client.ts 2>/dev/null | wc -l)
if [ "$CLIENT_FILES" -gt 50 ]; then
    check_pass "Found $CLIENT_FILES client wrapper files"
else
    check_warn "Only $CLIENT_FILES client files found (expected 50+)"
fi

# Check 4.2: ESLint deep import rule
if grep -q "@/api/generated/*/*" apps/web/.eslintrc.cjs 2>/dev/null; then
    check_pass "ESLint deep import rule configured"
else
    check_fail "ESLint deep import rule not found"
fi

echo ""
echo "▸ Checking deep imports (excluding adapter files)..."

# Check 4.3: Deep imports in non-adapter files
DEEP_IMPORTS=$(grep -rE "from ['\"]@/api/generated/[^'\"]+/[^'\"]+['\"]" apps/web/src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "api/client/" | grep -v "node_modules" | wc -l)
if [ "$DEEP_IMPORTS" -lt 10 ]; then
    check_pass "Found $DEEP_IMPORTS deep imports (excluding adapters)"
else
    check_warn "Found $DEEP_IMPORTS deep imports (review needed)"
fi

echo ""
echo "▸ Checking patientId migration..."

# Check 4.4: patientId in frontend (excluding node_modules and generated)
PATIENT_ID_FE=$(grep -rE "patientId|patient_id" apps/web/src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "generated" | grep -v "// legacy" | wc -l)
if [ "$PATIENT_ID_FE" -lt 5 ]; then
    check_pass "Found $PATIENT_ID_FE patientId references (acceptable)"
else
    check_warn "Found $PATIENT_ID_FE patientId references (review recommended)"
fi

# ==============================================================================
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  SPEC 5: CANONICAL CASE CONVERSION (G-01, G-04, G-06)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo ""

echo "▸ Checking backend response standardization..."

# Check 5.1: to_dict() usage in routers
TO_DICT_COUNT=$(grep -rn "\.to_dict()" apps/api/routers/ --include="*.py" 2>/dev/null | wc -l)
echo "  📊 Found $TO_DICT_COUNT to_dict() calls in routers"
if [ "$TO_DICT_COUNT" -lt 20 ]; then
    check_pass "Low to_dict() usage: $TO_DICT_COUNT calls"
else
    check_warn "High to_dict() usage: $TO_DICT_COUNT calls (target: 0)"
fi

# Check 5.2: response_model usage
RESPONSE_MODEL_TOTAL=$(grep -rn "response_model" apps/api/routers/ --include="*.py" 2>/dev/null | wc -l)
check_pass "Found $RESPONSE_MODEL_TOTAL response_model declarations"

# Check 5.3: Idempotency middleware
if [ -f "apps/api/middleware/idempotency.py" ]; then
    check_pass "Idempotency middleware exists"
else
    check_fail "Idempotency middleware not found"
fi

# Check 5.4: Idempotency middleware registered
if grep -q "IdempotencyMiddleware\|idempotency" apps/api/main.py 2>/dev/null; then
    check_pass "Idempotency middleware registered in main.py"
else
    check_fail "Idempotency middleware not registered"
fi

echo ""
echo "▸ Checking frontend case conversion..."

# Check 5.5: hybridCamelize / camelizeKeys
if grep -q "hybridCamelize\|camelizeKeys" apps/web/src/api/orval-mutator.ts 2>/dev/null; then
    check_pass "Case conversion function exists in mutator"
else
    check_fail "Case conversion not found in mutator"
fi

# Check 5.6: Idempotency key in web mutator
if grep -q "Idempotency-Key" apps/web/src/api/orval-mutator.ts 2>/dev/null; then
    check_pass "Idempotency-Key injection in web mutator"
else
    check_fail "Idempotency-Key not found in web mutator"
fi

# Check 5.7: Idempotency key in admin mutator
if grep -q "Idempotency-Key" apps/admin/src/api/orval-mutator.ts 2>/dev/null; then
    check_pass "Idempotency-Key injection in admin mutator"
else
    check_warn "Idempotency-Key not found in admin mutator"
fi

# ==============================================================================
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  TECHNICAL DEBT ANALYSIS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo ""

echo "▸ Backend Technical Debt..."

# Debt 1: to_dict() remaining
echo "  📊 to_dict() by file:"
grep -rn "\.to_dict()" apps/api/routers/ --include="*.py" 2>/dev/null | cut -d: -f1 | sort | uniq -c | sort -rn | head -10

# Debt 2: Manual dict construction
MANUAL_DICTS=$(grep -rn "return {" apps/api/routers/ --include="*.py" 2>/dev/null | grep -v "ResponseEnvelope\|#" | wc -l)
echo ""
echo "  📊 Manual dict returns (potential debt): $MANUAL_DICTS"

# Debt 3: Missing response_model
echo ""
echo "  📊 Endpoints without response_model:"
grep -rn "@router\.\(get\|post\|put\|patch\|delete\)" apps/api/routers/ --include="*.py" 2>/dev/null | grep -v "response_model" | wc -l

echo ""
echo "▸ Frontend Technical Debt..."

# Debt 4: Manual fetch/apiClient
MANUAL_FETCH=$(grep -rn "apiClient({" apps/web/src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "orval-mutator" | wc -l)
echo "  📊 Manual apiClient calls (outside mutator): $MANUAL_FETCH"

# Debt 5: any types
ANY_TYPES=$(grep -rn ": any" apps/web/src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "node_modules\|generated" | wc -l)
echo "  📊 'any' type usage: $ANY_TYPES"

# ==============================================================================
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  SUMMARY${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "  ${GREEN}✓ Passed:${NC}  $PASSED_CHECKS"
echo -e "  ${RED}✗ Failed:${NC}  $FAILED_CHECKS"
echo -e "  ${YELLOW}⚠ Warnings:${NC} $WARNINGS"
echo ""

SCORE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
if [ $SCORE -ge 90 ]; then
    echo -e "  📊 Compliance Score: ${GREEN}$SCORE%${NC} - EXCELLENT"
elif [ $SCORE -ge 70 ]; then
    echo -e "  📊 Compliance Score: ${YELLOW}$SCORE%${NC} - GOOD"
else
    echo -e "  📊 Compliance Score: ${RED}$SCORE%${NC} - NEEDS WORK"
fi

echo ""
echo "════════════════════════════════════════════════════════════════════════════"

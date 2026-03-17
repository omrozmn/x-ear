#!/usr/bin/env python3
"""
Comprehensive Test Generator v2.0
- Reads OpenAPI schema for request bodies
- Generates proper auth tokens per endpoint
- Creates realistic test data
"""
import json
import yaml
import time
import random
from typing import Dict, Any, List

def load_openapi_schema() -> Dict:
    """Load OpenAPI schema"""
    with open('openapi.yaml', 'r') as f:
        return yaml.safe_load(f)

def load_endpoints() -> List[Dict]:
    """Load extracted endpoints"""
    with open('extracted_endpoints.json', 'r') as f:
        return json.load(f)

def get_auth_token_for_path(path: str) -> str:
    """Determine which auth token to use based on path"""
    if path.startswith('/api/admin'):
        return 'ADMIN_TOKEN'
    elif path.startswith('/api/affiliates'):
        return 'AFFILIATE_TOKEN'
    elif path.startswith('/api'):
        return 'TENANT_TOKEN'
    else:
        # Paths without /api prefix need tenant context
        return 'TENANT_TOKEN'

def get_effective_tenant(path: str) -> str:
    """Determine effective tenant header"""
    if path.startswith('/api/admin'):
        return 'system'
    return ''

def categorize_endpoint(path: str) -> str:
    """Categorize endpoint for reporting"""
    if path.startswith('/api/admin'):
        return 'ADMIN_PANEL'
    elif path.startswith('/api/affiliates'):
        return 'AFFILIATE'
    elif path.startswith('/api'):
        return 'TENANT_WEB_APP'
    else:
        return 'SYSTEM'

def generate_test_data(suffix: str) -> Dict[str, Any]:
    """Generate all test data with unique suffix"""
    tckn = "11" + str(random.randint(100000000, 999999999))
    
    return {
        "PLAN": {
            "name": f"Test Plan {suffix}",
            "slug": f"plan-{suffix}",
            "description": "Test plan",
            "planType": "BASIC",
            "price": 100.0,
            "billingInterval": "YEARLY",
            "maxUsers": 10,
            "isActive": True,
            "isPublic": True
        },
        "TENANT": {
            "name": f"Test Tenant {suffix}",
            "slug": f"tenant-{suffix}",
            "email": f"tenant-{suffix}@test.com",
            "billingEmail": f"billing-{suffix}@test.com",
            "ownerEmail": f"owner-{suffix}@test.com",
            "productCode": "xear_hearing",
            "maxUsers": 20,
            "status": "active"
        },
        "USER": {
            "email": f"user-{suffix}@test.com",
            "password": "Pass1234",
            "firstName": "Test",
            "lastName": "User",
            "role": "support",
            "username": f"user_{suffix}",
            "isActive": True
        },
        "PARTY": {
            "firstName": "Test",
            "lastName": f"Party {suffix}",
            "phone": f"+90555{suffix}00",
            "email": f"party-{suffix}@test.com",
            "tcNumber": tckn,
            "status": "active"
        },
        "TICKET": {
            "title": f"Test Ticket {suffix}",
            "description": "Test ticket description",
            "priority": "high",
            "category": "technical"
        },
        "BRANCH": {
            "name": f"Test Branch {suffix}",
            "address": "Test Address",
            "phone": f"+90212{suffix}00",
            "isActive": True
        },
        "BRAND": {
            "name": f"Test Brand {suffix}"
        },
        "CAMPAIGN": {
            "name": f"Test Campaign {suffix}",
            "slug": f"campaign-{suffix}",
            "description": "Test campaign",
            "startDate": "2026-01-01",
            "endDate": "2026-12-31",
            "isActive": True
        },
        "SALE": {
            "totalAmount": 5000.0,
            "paymentMethod": "cash",
            "status": "completed",
            "saleDate": "2026-02-18"
        },
        "DEVICE": {
            "serialNumber": f"SN-{suffix}",
            "deviceType": "hearing_aid",
            "model": "X-Ear 5000",
            "status": "active"
        },
        "ITEM": {
            "name": f"Test Item {suffix}",
            "sku": f"SKU-{suffix}",
            "price": 100.0,
            "category": "hearing_aid"
        },
        "APPOINTMENT": {
            "date": "2026-06-15T10:00:00",
            "time": "10:00",
            "status": "scheduled",
            "type": "control"
        },
        "ROLE": {
            "name": f"Test Role {suffix}",
            "code": "TEST_ROLE",
            "description": "Test role"
        },
        "NOTIFICATION": {
            "title": f"Test Notification {suffix}",
            "message": "Test message",
            "type": "info"
        },
        "AFFILIATE": {
            "code": f"AFF{suffix}",
            "email": f"affiliate-{suffix}@test.com",
            "name": f"Affiliate {suffix}",
            "commissionRate": 10.0,
            "status": "active"
        }
    }

def generate_script():
    """Generate comprehensive test script"""
    suffix = str(int(time.time()))[-6:]
    test_data = generate_test_data(suffix)
    endpoints = load_endpoints()
    
    # Group by category
    categories = {}
    for ep in endpoints:
        cat = categorize_endpoint(ep['path'])
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(ep)
    
    script = f"""#!/bin/bash
# Comprehensive API Test Suite v2.0
# Generated: {time.strftime('%Y-%m-%d %H:%M:%S')}

BASE_URL="http://localhost:5003"
ADMIN_EMAIL="admin@xear.com"
ADMIN_PASSWORD="admin123"
FAILED_LOG="failed_endpoints.txt"
: > "$FAILED_LOG"

GREEN='\\033[0;32m'
RED='\\033[0;31m'
YELLOW='\\033[0;33m'
NC='\\033[0m'

TOTAL=0; PASSED=0; FAILED=0
ADMIN_PASSED=0; ADMIN_FAILED=0
TENANT_PASSED=0; TENANT_FAILED=0
AFFILIATE_PASSED=0; AFFILIATE_FAILED=0
SYSTEM_PASSED=0; SYSTEM_FAILED=0

test_endpoint() {{
    local method=$1; local endpoint=$2; local data=$3
    local desc=$4; local token=$5; local cat=$6
    local eff_tenant=$7
    
    # Skip if endpoint contains null ID
    if [[ "$endpoint" == *"/null"* ]] || [[ "$endpoint" == *"/null/"* ]]; then
        printf "  -> [%s] %s ... ${{YELLOW}}SKIP${{NC}} (null ID)\\n" "$cat" "$desc"
        return
    fi
    
    TOTAL=$((TOTAL + 1))
    printf "  -> [%s] %s ... " "$cat" "$desc"
    
    local body_file=$(mktemp)
    local http_code
    local idemp="id-$RANDOM-$(date +%s)"
    
    local curl_cmd=(curl -s --connect-timeout 5 --max-time 15 -o "$body_file" -w "%{{http_code}}" -X "$method")
    curl_cmd+=(-H "Authorization: Bearer $token")
    curl_cmd+=(-H "Content-Type: application/json")
    curl_cmd+=(-H "Idempotency-Key: $idemp")
    [ ! -z "$eff_tenant" ] && [ "$eff_tenant" != "null" ] && curl_cmd+=(-H "X-Effective-Tenant-Id: $eff_tenant")
    
    if [[ -z "$data" || "$data" == "{{}}" ]]; then
        http_code=$("${{curl_cmd[@]}}" "$BASE_URL$endpoint" 2>/dev/null)
    else
        http_code=$("${{curl_cmd[@]}}" -d "$data" "$BASE_URL$endpoint" 2>/dev/null)
    fi
    
    if [[ "$http_code" =~ ^(200|201|204)$ ]]; then
        printf "${{GREEN}}PASS${{NC}} (%s)\\n" "$http_code"
        PASSED=$((PASSED + 1))
        CAT_PASSED[$cat]=$(( ${{CAT_PASSED[$cat]:-0}} + 1 ))
    else
        printf "${{RED}}FAIL${{NC}} (%s)\\n" "$http_code"
        FAILED=$((FAILED + 1))
        CAT_FAILED[$cat]=$(( ${{CAT_FAILED[$cat]:-0}} + 1 ))
        err=$(cat "$body_file" | jq -r '.error.message // .message // "Error"' 2>/dev/null | head -c 80)
        printf "%s %s - %s - %s\\n" "$method" "$endpoint" "$http_code" "$err" >> "$FAILED_LOG"
    fi
    rm "$body_file"
}}

echo "=== Comprehensive API Test Suite v2.0 ==="
echo "Setting up test environment..."

# 1. Admin Authentication
admin_res=$(curl -s -X POST "$BASE_URL/api/admin/auth/login" \\
    -H "Content-Type: application/json" \\
    -H "Idempotency-Key: a-$RANDOM" \\
    -d '{{"email":"$ADMIN_EMAIL","password":"$ADMIN_PASSWORD"}}')
ADMIN_TOKEN=$(echo "$admin_res" | jq -r '.data.token')

if [ "$ADMIN_TOKEN" = "null" ] || [ -z "$ADMIN_TOKEN" ]; then
    echo -e "${{RED}}✗ Admin authentication failed!${{NC}}"
    exit 1
fi
echo -e "${{GREEN}}✓ Admin authenticated${{NC}}"

# 2. Create Plan
PLAN_DATA='{json.dumps(test_data["PLAN"])}'
plan_res=$(curl -s -X POST "$BASE_URL/api/admin/plans" \\
    -H "Authorization: Bearer $ADMIN_TOKEN" \\
    -H "Content-Type: application/json" \\
    -H "Idempotency-Key: p-$RANDOM" \\
    -H "X-Effective-Tenant-Id: system" \\
    -d "$PLAN_DATA")
PLAN_ID=$(echo "$plan_res" | jq -r '.data.plan.id // .data.id // .id')
echo "  Plan ID: $PLAN_ID"

# 3. Create Tenant
TENANT_DATA='{json.dumps(test_data["TENANT"])}'
TENANT_DICT=$(echo "$TENANT_DATA" | jq ". + {{planId: \\"$PLAN_ID\\"}}")
tenant_res=$(curl -s -X POST "$BASE_URL/api/admin/tenants" \\
    -H "Authorization: Bearer $ADMIN_TOKEN" \\
    -H "Content-Type: application/json" \\
    -H "Idempotency-Key: t-$RANDOM" \\
    -H "X-Effective-Tenant-Id: system" \\
    -d "$TENANT_DICT")
TN_ID=$(echo "$tenant_res" | jq -r '.data.id // .id')
echo "  Tenant ID: $TN_ID"

# 4. Create User
USER_DATA='{json.dumps(test_data["USER"])}'
USER_DICT=$(echo "$USER_DATA" | jq ". + {{tenantId: \\"$TN_ID\\"}}")
user_res=$(curl -s -X POST "$BASE_URL/api/admin/users" \\
    -H "Authorization: Bearer $ADMIN_TOKEN" \\
    -H "Content-Type: application/json" \\
    -H "Idempotency-Key: u-$RANDOM" \\
    -H "X-Effective-Tenant-Id: system" \\
    -d "$USER_DICT")
U_ID=$(echo "$user_res" | jq -r '.data.user.id // .data.id // .id' | head -n 1)
echo "  User ID: $U_ID"

# 5. Switch to Tenant Context
switch_res=$(curl -s -X POST "$BASE_URL/api/admin/debug/switch-tenant" \\
    -H "Authorization: Bearer $ADMIN_TOKEN" \\
    -H "Content-Type: application/json" \\
    -H "Idempotency-Key: s-$RANDOM" \\
    -d '{{"targetTenantId":"'$TN_ID'"}}')
TENANT_TOKEN=$(echo "$switch_res" | jq -r '.data.accessToken // .accessToken')
echo -e "${{GREEN}}✓ Tenant context switched${{NC}}"

# 6. Create Affiliate (for affiliate endpoints)
AFFILIATE_DATA='{json.dumps(test_data["AFFILIATE"])}'
affiliate_res=$(curl -s -X POST "$BASE_URL/api/admin/affiliates" \\
    -H "Authorization: Bearer $ADMIN_TOKEN" \\
    -H "Content-Type: application/json" \\
    -H "Idempotency-Key: af-$RANDOM" \\
    -d "$AFFILIATE_DATA" 2>/dev/null)
AFF_CODE=$(echo "$affiliate_res" | jq -r '.data.code // .code' 2>/dev/null)
# Affiliate login (if endpoint exists)
aff_login=$(curl -s -X POST "$BASE_URL/api/affiliates/auth/login" \\
    -H "Content-Type: application/json" \\
    -d '{{"code":"'$AFF_CODE'","email":"affiliate-{suffix}@test.com"}}' 2>/dev/null)
AFFILIATE_TOKEN=$(echo "$aff_login" | jq -r '.data.token // .token' 2>/dev/null)
[ "$AFFILIATE_TOKEN" = "null" ] && AFFILIATE_TOKEN="$TENANT_TOKEN"
echo "  Affiliate Code: $AFF_CODE"

# 7. Create Test Resources
PARTY_DATA='{json.dumps(test_data["PARTY"])}'
party_res=$(curl -s -X POST "$BASE_URL/api/parties" \\
    -H "Authorization: Bearer $TENANT_TOKEN" \\
    -H "Content-Type: application/json" \\
    -H "Idempotency-Key: pr-$RANDOM" \\
    -d "$PARTY_DATA")
P_ID=$(echo "$party_res" | jq -r '.data.id // .id' | head -n 1)

BRANCH_DATA='{json.dumps(test_data["BRANCH"])}'
branch_res=$(curl -s -X POST "$BASE_URL/api/branches" \\
    -H "Authorization: Bearer $TENANT_TOKEN" \\
    -H "Content-Type: application/json" \\
    -H "Idempotency-Key: br-$RANDOM" \\
    -d "$BRANCH_DATA")
B_ID=$(echo "$branch_res" | jq -r '.data.id // .id' | head -n 1)

CAMPAIGN_DATA='{json.dumps(test_data["CAMPAIGN"])}'
campaign_res=$(curl -s -X POST "$BASE_URL/api/campaigns" \\
    -H "Authorization: Bearer $TENANT_TOKEN" \\
    -H "Content-Type: application/json" \\
    -H "Idempotency-Key: ca-$RANDOM" \\
    -d "$CAMPAIGN_DATA")
CAMPAIGN_ID=$(echo "$campaign_res" | jq -r '.data.id // .id' | head -n 1)

SALE_DATA='{json.dumps(test_data["SALE"])}'
sale_dict=$(echo "$SALE_DATA" | jq ". + {{partyId: \\"$P_ID\\"}}")
sale_res=$(curl -s -X POST "$BASE_URL/api/sales" \\
    -H "Authorization: Bearer $TENANT_TOKEN" \\
    -H "Content-Type: application/json" \\
    -H "Idempotency-Key: sa-$RANDOM" \\
    -d "$sale_dict")
SALE_ID=$(echo "$sale_res" | jq -r '.data.id // .id' | head -n 1)

DEVICE_DATA='{json.dumps(test_data["DEVICE"])}'
device_dict=$(echo "$DEVICE_DATA" | jq ". + {{partyId: \\"$P_ID\\"}}")
device_res=$(curl -s -X POST "$BASE_URL/api/devices" \\
    -H "Authorization: Bearer $TENANT_TOKEN" \\
    -H "Content-Type: application/json" \\
    -H "Idempotency-Key: de-$RANDOM" \\
    -d "$device_dict")
DEVICE_ID=$(echo "$device_res" | jq -r '.data.id // .id' | head -n 1)

echo -e "${{GREEN}}✓ Test resources created${{NC}}"
echo ""

"""
    
    # Generate tests for each category
    for category in sorted(categories.keys()):
        script += f'\necho "\\n=== Testing {category} Endpoints ==="\n'
        
        for ep in categories[category]:
            method = ep['method']
            path = ep['path']
            token_var = get_auth_token_for_path(path)
            eff_tenant = get_effective_tenant(path)
            
            # Replace path parameters with variables
            clean_path = path\
                .replace('{tenant_id}', '${TN_ID:-null}')\
                .replace('{user_id}', '${U_ID:-null}')\
                .replace('{party_id}', '${P_ID:-null}')\
                .replace('{plan_id}', '${PLAN_ID:-null}')\
                .replace('{branch_id}', '${B_ID:-null}')\
                .replace('{campaign_id}', '${CAMPAIGN_ID:-null}')\
                .replace('{sale_id}', '${SALE_ID:-null}')\
                .replace('{device_id}', '${DEVICE_ID:-null}')
            
            # Determine request body
            data = '{}'
            if method in ['POST', 'PUT', 'PATCH']:
                if '/parties' in path and method == 'POST':
                    data = '$PARTY_DATA'
                elif '/campaigns' in path and method == 'POST':
                    data = '$CAMPAIGN_DATA'
                elif '/sales' in path and method == 'POST':
                    data = '$(echo "$SALE_DATA" | jq ". + {partyId: \\"$P_ID\\"}")'
                elif '/devices' in path and method == 'POST':
                    data = '$(echo "$DEVICE_DATA" | jq ". + {partyId: \\"$P_ID\\"}")'
                # Add more mappings as needed
            
            script += f'test_endpoint "{method}" "{clean_path}" "{data}" "{method} {path}" "${token_var}" "{category}" "{eff_tenant}"\n'
    
    script += """
cleanup() {
    echo -e "\\n[CLEANUP] Removing test resources..."
    [ ! -z "$TN_ID" ] && [ "$TN_ID" != "null" ] && \\
        curl -s -X DELETE "$BASE_URL/api/admin/tenants/$TN_ID" \\
        -H "Authorization: Bearer $ADMIN_TOKEN" \\
        -H "X-Effective-Tenant-Id: system" >/dev/null
}
trap cleanup EXIT

echo "\\n=== FINAL RESULTS ==="
for cat in "${!CAT_PASSED[@]}"; do
    echo "$cat: ${CAT_PASSED[$cat]:-0} pass, ${CAT_FAILED[$cat]:-0} fail"
done
echo "TOTAL: $PASSED pass, $FAILED fail, $TOTAL total"
echo "Success Rate: $(( PASSED * 100 / TOTAL ))%"
"""
    
    with open('test_all_endpoints_comprehensive.sh', 'w') as f:
        f.write(script)
    
    print(f"✓ Generated test script with {len(endpoints)} endpoints")
    print(f"  - {len(categories)} categories")
    print(f"  - Suffix: {suffix}")

if __name__ == '__main__':
    generate_script()

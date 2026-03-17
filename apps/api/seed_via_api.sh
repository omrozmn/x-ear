#!/bin/bash
# COMPREHENSIVE SEED DATA via API
# Creates test data using REST API endpoints

BASE_URL="http://localhost:5003/api"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "============================================================"
echo "🌱 COMPREHENSIVE SEED DATA via API"
echo "============================================================"
echo ""

# Login
echo -e "${YELLOW}🔐 Logging in...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin@x-ear.com",
    "password": "admin123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken // .accessToken // ""')
TENANT_ID=$(echo $LOGIN_RESPONSE | jq -r '.data.tenantId // .tenantId // ""')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
    echo "❌ Failed to login"
    exit 1
fi

echo -e "${GREEN}✅ Logged in (Tenant: $TENANT_ID)${NC}"
echo ""

# Create 100 parties
echo -e "${YELLOW}👥 Creating 100 parties...${NC}"
FIRST_NAMES=("Ahmet" "Mehmet" "Ayşe" "Fatma" "Ali" "Zeynep" "Mustafa" "Emine" "Hüseyin" "Hatice")
LAST_NAMES=("Yılmaz" "Kaya" "Demir" "Şahin" "Çelik" "Yıldız" "Aydın" "Özdemir" "Arslan" "Doğan")
STATUSES=("active" "inactive")
SEGMENTS=("new" "trial" "customer" "vip")
ACQ_TYPES=("referral" "online" "walk-in" "social-media" "advertisement")

for i in {1..100}; do
    FIRST=${FIRST_NAMES[$((RANDOM % 10))]}
    LAST=${LAST_NAMES[$((RANDOM % 10))]}
    STATUS=${STATUSES[$((RANDOM % 2))]}
    SEGMENT=${SEGMENTS[$((RANDOM % 4))]}
    ACQ=${ACQ_TYPES[$((RANDOM % 5))]}
    
    curl -s -X POST "$BASE_URL/parties" \
      -H "Authorization: Bearer $TOKEN" \
      -H "X-Tenant-ID: $TENANT_ID" \
      -H "Content-Type: application/json" \
      -H "Idempotency-Key: seed-party-$i-$(date +%s)" \
      -d "{
        \"firstName\": \"$FIRST\",
        \"lastName\": \"$LAST\",
        \"phone\": \"+90500$(printf '%07d' $i)\",
        \"email\": \"hasta$i@demo.com\",
        \"tcNumber\": \"$(printf '%011d' $((10000000000 + RANDOM)))\",
        \"status\": \"$STATUS\",
        \"segment\": \"$SEGMENT\",
        \"acquisitionType\": \"$ACQ\",
        \"birthDate\": \"$(printf '19%02d-01-01' $((50 + RANDOM % 50)))\"
      }" > /dev/null
    
    if [ $((i % 20)) -eq 0 ]; then
        echo -e "${GREEN}  Created $i parties...${NC}"
    fi
done

echo -e "${GREEN}✅ Created 100 parties${NC}"
echo ""

# Get parties to use in appointments
echo -e "${YELLOW}📋 Fetching created parties...${NC}"
PARTIES_RESPONSE=$(curl -s -X GET "$BASE_URL/parties?limit=100" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID")

PARTY_IDS=$(echo $PARTIES_RESPONSE | jq -r '.data[].id // empty' | head -50)
PARTY_ARRAY=($PARTY_IDS)

echo -e "${GREEN}✅ Found ${#PARTY_ARRAY[@]} parties for appointments${NC}"
echo ""

# Create 50 appointments
echo -e "${YELLOW}📅 Creating 50 appointments...${NC}"
APT_TYPES=("consultation" "fitting" "repair" "checkup" "followup")

for i in {1..50}; do
    # Random party
    PARTY_ID=${PARTY_ARRAY[$((RANDOM % ${#PARTY_ARRAY[@]}))]}
    
    # Random date (next 30 days)
    DAYS_FROM_NOW=$((RANDOM % 30))
    APT_DATE=$(date -v +${DAYS_FROM_NOW}d '+%Y-%m-%dT%H:%M:%S')
    
    APT_TYPE=${APT_TYPES[$((RANDOM % 5))]}
    
    curl -s -X POST "$BASE_URL/appointments" \
      -H "Authorization: Bearer $TOKEN" \
      -H "X-Tenant-ID: $TENANT_ID" \
      -H "Content-Type: application/json" \
      -H "Idempotency-Key: seed-apt-$i-$(date +%s)" \
      -d "{
        \"partyId\": \"$PARTY_ID\",
        \"scheduledAt\": \"$APT_DATE\",
        \"durationMinutes\": 30,
        \"appointmentType\": \"$APT_TYPE\",
        \"status\": \"scheduled\",
        \"notes\": \"Seed randevu $i\"
      }" > /dev/null
    
    if [ $((i % 10)) -eq 0 ]; then
        echo -e "${GREEN}  Created $i appointments...${NC}"
    fi
done

echo -e "${GREEN}✅ Created 50 appointments${NC}"
echo ""

echo "============================================================"
echo -e "${GREEN}✅ SEED DATA COMPLETE!${NC}"
echo "============================================================"
echo ""
echo "📊 Summary:"
echo "  • 100 Parties (diverse status, segments, acquisition types)"
echo "  • 50 Appointments (next 30 days)"
echo ""
echo "🎯 Tenant ID: $TENANT_ID"
echo "🔑 Login: admin@x-ear.com / admin123"
echo ""
echo "🔄 Refresh your browser to see the data!"

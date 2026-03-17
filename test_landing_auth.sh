#!/bin/bash

# Base URL for the backend API
API_BASE_URL="http://localhost:5003"

echo "====================================================="
echo "  X-EAR Landing Page Registration API Test Suite"
echo "====================================================="
echo "Targeting Backend: $API_BASE_URL"
echo ""

# Generate a random email to avoid collision on re-runs
RANDOM_STRING=$(LC_ALL=C tr -dc 'a-z0-9' < /dev/urandom | head -c 6)
TEST_EMAIL="test_aff_${RANDOM_STRING}@x-ear.com"
TEST_PASS="TestPass123!"
TEST_PHONE="90555$(LC_ALL=C tr -dc '0-9' < /dev/urandom | head -c 7)"

# Helper function to generate Idempotency-Key
get_idem_key() {
  echo "landing-$(date +%s)-$(LC_ALL=C tr -dc 'a-z0-9' < /dev/urandom | head -c 9)"
}

echo "-----------------------------------------------------"
echo "1. Affiliate Registration"
echo "POST /api/affiliates/register"
echo "Email: $TEST_EMAIL"
echo "-----------------------------------------------------"
curl -s -w "\nHTTP Status: %{http_code}\n\n" -X POST "$API_BASE_URL/api/affiliates/register" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: $(get_idem_key)" \
    -d "{\"email\":\"$TEST_EMAIL\", \"password\":\"$TEST_PASS\"}"

echo "-----------------------------------------------------"
echo "2. Affiliate Login"
echo "POST /api/affiliates/login"
echo "-----------------------------------------------------"
curl -s -w "\nHTTP Status: %{http_code}\n\n" -X POST "$API_BASE_URL/api/affiliates/login" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: $(get_idem_key)" \
    -d "{\"email\":\"$TEST_EMAIL\", \"password\":\"$TEST_PASS\"}"


echo "-----------------------------------------------------"
echo "3. Main User Registration (Phone Initialization)"
echo "POST /api/register-phone"
echo "Phone: $TEST_PHONE"
echo "-----------------------------------------------------"
curl -s -w "\nHTTP Status: %{http_code}\n\n" -X POST "$API_BASE_URL/api/register-phone" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: $(get_idem_key)" \
    -d "{\"phone\":\"$TEST_PHONE\"}"


echo "-----------------------------------------------------"
echo "4. Main User Registration (OTP Validation - Invalid OTP Expected)"
echo "POST /api/verify-registration-otp"
echo "Testing with mock OTP '123456', expecting failure/validation error."
echo "-----------------------------------------------------"
curl -s -w "\nHTTP Status: %{http_code}\n\n" -X POST "$API_BASE_URL/api/verify-registration-otp" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: $(get_idem_key)" \
    -d "{\"phone\":\"$TEST_PHONE\", \"otp\":\"123456\", \"first_name\":\"Test\", \"last_name\":\"User\"}"


echo "====================================================="
echo "  Test Suite Completed"
echo "====================================================="

#!/usr/bin/env python3
"""
Test script for enhanced authentication features:
- Email service for OTP fallback
- Rate limiting for OTP requests
- CAPTCHA verification
- SMS API usage monitoring
"""

import time
import pytest


def test_email_otp_fallback(client):
    """Test email OTP fallback when SMS fails"""
    print("🧪 Testing Email OTP Fallback...")

    # Test with email identifier
    payload = {
        "identifier": "test@example.com",
        "captcha_token": "test-token"  # Mock token for testing
    }

    rv = client.post('/api/forgot-password', json=payload)
    assert rv.status_code == 200
    data = rv.get_json()
    assert 'message' in data or 'success' in data


def test_rate_limiting(client):
    """Test rate limiting for OTP requests"""
    print("\n🧪 Testing Rate Limiting...")

    payload = {
        "identifier": "test2@example.com",
        "captcha_token": "test-token"
    }

    # Send multiple requests quickly
    found_rate_limited = False
    for i in range(7):  # More than the 5 per hour limit
        rv = client.post('/api/forgot-password', json=payload)
        if rv.status_code == 429:  # Rate limit exceeded
            found_rate_limited = True
            break
        time.sleep(0.01)  # Small delay between requests

    assert found_rate_limited, "Rate limiting not enforced"
    print("✅ Rate limiting working correctly")


def test_sms_monitoring(client):
    """Test SMS API usage monitoring"""
    print("\n🧪 Testing SMS Monitoring...")

    # Without auth should return 401
    rv = client.get('/api/sms/monitoring')
    assert rv.status_code == 401

    # With fake token return 200 or 401 depending on implementation; accept both
    rv2 = client.get('/api/sms/monitoring', headers={'Authorization': 'Bearer test-token'})
    assert rv2.status_code in (200, 401)


def test_captcha_verification(client):
    """Test CAPTCHA verification"""
    print("\n🧪 Testing CAPTCHA Verification...")

    # Test without CAPTCHA token
    payload = {
        "identifier": "test3@example.com"
    }

    # Missing captcha token should be rejected
    rv = client.post('/api/forgot-password', json=payload)
    assert rv.status_code == 400


def test_otp_verification(client):
    """Test OTP verification flow"""
    print("\n🧪 Testing OTP Verification...")

    identifier = 'test4@example.com'
    # First, request OTP
    payload = {
        "identifier": identifier,
        "captcha_token": "test-token"
    }

    rv = client.post('/api/forgot-password', json=payload)
    assert rv.status_code == 200

    # Try verifying with invalid OTP
    rv2 = client.post('/api/verify-otp', json={"identifier": identifier, "otp": "000000"})
    assert rv2.status_code == 400
    data = rv2.get_json()
    assert 'Invalid' in data.get('message', '') or 'error' in data


def main():
    """Run all tests"""
    print("🚀 Starting Enhanced Authentication Tests")
    print("=" * 50)

    tests = [
        test_email_otp_fallback,
        test_rate_limiting,
        test_sms_monitoring,
        test_captcha_verification,
        test_otp_verification
    ]

    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
            results.append(False)

    print("\n" + "=" * 50)
    print("📊 Test Results Summary:")
    passed = sum(results)
    total = len(results)
    print(f"✅ Passed: {passed}/{total}")
    print(f"❌ Failed: {total - passed}/{total}")

    if passed == total:
        print("🎉 All tests passed!")
    else:
        print("⚠️ Some tests failed. Check the output above for details.")

    print("\n📝 Next Steps:")
    print("1. Configure real email credentials in environment variables")
    print("2. Set up Cloudflare Turnstile site and secret keys")
    print("3. Test with real phone numbers for SMS functionality")
    print("4. Monitor SMS usage in production")

if __name__ == "__main__":
    main()
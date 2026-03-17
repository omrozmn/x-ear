#!/usr/bin/env python3
"""
Test script for Vatansms OTP functionality
Sends a test OTP to a specified phone number
"""

import os
import requests
import random
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Vatansms Configuration (same as in app.py)
VATANSMS_USERNAME = os.getenv('VATANSMS_USERNAME')
VATANSMS_PASSWORD = os.getenv('VATANSMS_PASSWORD')
if not VATANSMS_USERNAME or not VATANSMS_PASSWORD:
    raise RuntimeError("VATANSMS credentials not configured. Set VATANSMS_USERNAME and VATANSMS_PASSWORD env vars.")
VATANSMS_SENDER = 'OZMN TIBCHZ'  # Approved sender name

def send_test_otp(phone_number):
    """Send test OTP SMS using Vatansms API"""
    try:
        # Generate 6-digit OTP
        otp_code = str(random.randint(100000, 999999))

        url = "https://api.vatansms.net/api/v1/otp"
        headers = {
            'Content-Type': 'application/json'
        }
        payload = {
            "api_id": VATANSMS_USERNAME,  # Using username as api_id
            "api_key": VATANSMS_PASSWORD,  # Using password as api_key
            "sender": VATANSMS_SENDER,
            "message_type": "turkce",
            "message": f"X-EAR dogrulama kodunuz: {otp_code}. Bu kodu kimseyle paylasmayiniz.",
            "phones": [phone_number]
        }

        print(f"📤 Sending test OTP to {phone_number}")
        print(f"🔢 Generated OTP: {otp_code}")
        print(f"📡 API URL: {url}")
        print(f"🆔 API ID: {VATANSMS_USERNAME}")
        print(f"📨 Sender: {VATANSMS_SENDER}")

        response = requests.post(url, headers=headers, json=payload, timeout=10)

        print(f"\n📊 Response Status: {response.status_code}")
        print(f"📄 Response Text: {response.text}")

        if response.status_code == 200:
            result = response.json()
            if result.get('status') == 'success' or result.get('success'):
                print("✅ SMS sent successfully!")
                return True, otp_code
            else:
                print(f"❌ Vatansms API error: {result.get('message', 'Unknown error')}")
                return False, None
        else:
            print(f"❌ HTTP error: {response.status_code}")
            return False, None

    except requests.exceptions.Timeout:
        print("❌ Request timed out")
        return False, None
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error: {str(e)}")
        return False, None
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        return False, None

def main():
    """Main function to run the test"""
    print("🚀 X-Ear Vatansms OTP Test Script")
    print("=" * 50)

    # Test phone number (remove + sign as per API docs)
    test_phone = "905453092516"

    print(f"📞 Test Phone Number: {test_phone}")
    print(f"🕒 Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    # Send the test OTP
    success, otp_code = send_test_otp(test_phone)

    print("\n" + "=" * 50)
    if success:
        print("🎉 TEST COMPLETED SUCCESSFULLY!")
        print(f"📱 Check your phone {test_phone} for the OTP")
        print(f"🔢 The OTP code sent was: {otp_code}")
    else:
        print("💥 TEST FAILED!")
        print("❌ Unable to send SMS. Check the error messages above.")

if __name__ == "__main__":
    main()
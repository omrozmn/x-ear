import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

import logging

logging.basicConfig(filename='sms_test.log', level=logging.INFO, format='%(asctime)s - %(message)s', filemode='w', force=True)


def send_test_sms(phone_number):
    """Send a test SMS using VATANSMS API"""
    username = os.getenv("VATANSMS_USERNAME")
    password = os.getenv("VATANSMS_PASSWORD")

    if not username or not password:
        logging.error("❌ VATANSMS_USERNAME and VATANSMS_PASSWORD must be set in your .env file.")
        return

    url = "https://api.vatansms.net/rest/v1/tr/sms/send"
    
    payload = {
        "username": username,
        "password": password,
        "gsm": phone_number,
        "message": "This is a test message from x-ear.",
        "type": "1:N"
    }
    
    headers = {
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(url, headers=headers, data=json.dumps(payload))
        logging.info(f"Response Status Code: {response.status_code}")
        logging.info(f"Response Text: {response.text}")
        response.raise_for_status()
        result = response.json()
        
        if result.get("status") == "success":
            logging.info(f"✅ SMS sent successfully to {phone_number}.")
            logging.info(f"VATANSMS Response: {json.dumps(result, indent=2)}")
        else:
            logging.error(f"❌ Failed to send SMS: {result.get('message')}")

    except requests.exceptions.RequestException as e:
        logging.error(f"❌ An error occurred: {e}")

if __name__ == "__main__":
    phone_number = "+905453092516"
    logging.info(f"Testing VATANSMS integration by sending an SMS to {phone_number}...")
    send_test_sms(phone_number)
import requests
import json
import logging

logger = logging.getLogger(__name__)

class VatanSMSService:
    BASE_URL = "https://api.vatansms.net/api/v1"

    def __init__(self, api_id, api_key, sender):
        self.api_id = api_id
        self.api_key = api_key
        self.sender = sender

    def send_sms(self, phones, message):
        """
        Send SMS to multiple phones.
        phones: list of strings (e.g. ['5551234567'])
        message: string
        """
        url = f"{self.BASE_URL}/1toN"
        
        payload = {
            "api_id": self.api_id,
            "api_key": self.api_key,
            "sender": self.sender,
            "message_type": "normal",
            "message": message,
            "phones": phones
        }
        
        try:
            response = requests.post(url, json=payload, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"VatanSMS send error: {e}")
            if hasattr(e, 'response') and e.response:
                logger.error(f"Response: {e.response.text}")
            raise e

    def get_sender_names(self):
        url = f"{self.BASE_URL}/senders"
        payload = {
            "api_id": self.api_id,
            "api_key": self.api_key
        }
        try:
            response = requests.post(url, json=payload, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"VatanSMS get senders error: {e}")
            raise e

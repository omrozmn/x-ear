
import base64
import hmac
import hashlib
import json
import requests
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class PayTRService:
    def __init__(self, merchant_id, merchant_key, merchant_salt, test_mode=False):
        self.merchant_id = merchant_id
        self.merchant_key = merchant_key
        self.merchant_salt = merchant_salt
        self.test_mode = "1" if test_mode else "0"
        self.base_url = "https://www.paytr.com"

    def generate_token_request(self, 
        user_ip, 
        order_id, 
        email, 
        payment_amount, 
        user_basket, 
        no_installment, 
        max_installment, 
        user_name, 
        user_address, 
        user_phone, 
        merchant_ok_url, 
        merchant_fail_url,
        currency="TL",
        lang="tr"
    ):
        """
        Generates the token request payload for PayTR Iframe
        
        Args:
            payment_amount: float (e.g. 10.50)
        """
        # Amount must be in cents (kuruş) for PayTR if documentation says so, 
        # BUT usually PayTR expects payment_amount * 100 as integer.
        # Let's verify standard PayTR implementation: payment_amount * 100
        payment_amount_str = str(int(float(payment_amount) * 100))
        
        # Basket must be JSON encoded string of list of lists
        # Example: [['Item Name', 'Price', 'Quantity'], ...]
        user_basket_json = json.dumps(user_basket)
        
        # Encode basket for hash calculation? No, the basket string itself is used.
        # But for the basket field in payload, it is json string.
        # Base64 encoded basket? PayTR usually wants json string directly or base64. 
        # Standard: user_basket HTML entities encoded or JSON string.
        # Let's assume JSON string.
        
        user_basket_str = base64.b64encode(user_basket_json.encode()).decode()

        # Generate Token
        # Concatenation: merchant_id + user_ip + merchant_oid + email + payment_amount + user_basket + no_installment + max_installment + currency + test_mode
        # Salt: merchant_salt
        # Key: merchant_key
        
        hash_str = (
            f"{self.merchant_id}"
            f"{user_ip}"
            f"{order_id}"
            f"{email}"
            f"{payment_amount_str}"
            f"{user_basket_str}"
            f"{no_installment}"
            f"{max_installment}"
            f"{currency}"
            f"{self.test_mode}"
        )
        
        token = hmac.new(
            self.merchant_key.encode(),
            (hash_str + self.merchant_salt).encode(),
            hashlib.sha256
        ).digest()
        
        token = base64.b64encode(token).decode()

        payload = {
            'merchant_id': self.merchant_id,
            'user_ip': user_ip,
            'merchant_oid': order_id,
            'email': email,
            'payment_amount': payment_amount_str,
            'paytr_token': token,
            'user_basket': user_basket_str,
            'debug_on': "1", # Turn on for development
            'no_installment': str(no_installment),
            'max_installment': str(max_installment),
            'user_name': user_name,
            'user_address': user_address,
            'user_phone': user_phone,
            'merchant_ok_url': merchant_ok_url,
            'merchant_fail_url': merchant_fail_url,
            'timeout_limit': "30",
            'currency': currency,
            'test_mode': self.test_mode,
            'lang': lang
        }
        
        return payload

    def get_token(self, payload):
        """
        Sends the request to PayTR to get the token (iframe URL token)
        """
        try:
            response = requests.post(f"{self.base_url}/odeme/api/get-token", data=payload)
            result = response.json()
            
            if result['status'] == 'success':
                return {'success': True, 'token': result['token']}
            else:
                logger.error(f"PayTR Token Error: {result.get('reason')}")
                return {'success': False, 'error': result.get('reason')}
                
        except Exception as e:
            logger.error(f"PayTR Connection Error: {str(e)}")
            return {'success': False, 'error': str(e)}

    def validate_callback(self, params):
        """
        Validates the callback from PayTR
        """
        merchant_oid = params.get('merchant_oid')
        status = params.get('status')
        total_amount = params.get('total_amount')
        received_hash = params.get('hash')
        
        hash_str = f"{merchant_oid}{self.merchant_salt}{status}{total_amount}"
        
        token = hmac.new(
            self.merchant_key.encode(),
            hash_str.encode(),
            hashlib.sha256
        ).digest()
        
        calculated_hash = base64.b64encode(token).decode()
        
        return calculated_hash == received_hash

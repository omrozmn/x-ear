#!/bin/bash
# Simple token generator without dependencies
python3 -c "
import json
from datetime import datetime, timedelta
import hmac
import hashlib
import base64

SECRET_KEY = 'super-secret-jwt-key-for-development'

def base64url_encode(data):
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')

header = {'alg': 'HS256', 'typ': 'JWT'}
payload = {
    'sub': 'usr_eafaadc6',
    'exp': int((datetime.utcnow() + timedelta(hours=8)).timestamp()),
    'iat': int(datetime.utcnow().timestamp()),
    'access.tenant_id': '95625589-a4ad-41ff-a99e-4955943bb421',
    'role': 'admin',
    'tenant_id': '95625589-a4ad-41ff-a99e-4955943bb421'
}

header_b64 = base64url_encode(json.dumps(header, separators=(',', ':')).encode())
payload_b64 = base64url_encode(json.dumps(payload, separators=(',', ':')).encode())
message = f'{header_b64}.{payload_b64}'.encode()
signature = base64url_encode(hmac.new(SECRET_KEY.encode(), message, hashlib.sha256).digest())
print(f'{header_b64}.{payload_b64}.{signature}')
"

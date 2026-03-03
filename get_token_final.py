#!/usr/bin/env python3
import sys
import os

# Add API path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'apps/api'))

# Import after path setup
from routers.auth import create_access_token

# Create token for the deneme tenant user
token_data = {
    "sub": "usr_eafaadc6", 
    "tenant_id": "95625589-a4ad-41ff-a99e-4955943bb421"
}

token = create_access_token(token_data)

# Extract just the token part (after any debug output)
lines = token.split('\n') if '\n' in token else [token]
for line in lines:
    line = line.strip()
    if line.startswith('eyJ'):
        print(line)
        break
else:
    # If no JWT found, print the last non-empty line
    for line in reversed(lines):
        if line.strip():
            print(line.strip())
            break
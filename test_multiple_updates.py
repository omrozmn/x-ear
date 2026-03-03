#!/usr/bin/env python3
import subprocess
import json
import time

# Get token
token_result = subprocess.run(['python', 'gen_token_deneme.py'], capture_output=True, text=True, cwd='.')
token = token_result.stdout.strip()

print('🔄 Testing multiple updates...')
print('=' * 50)

for i in range(3):
    # Update sale
    update_cmd = f'''curl -s -X PUT "http://localhost:5003/api/sales/2603010102" \
      -H "Authorization: Bearer {token}" \
      -H "Content-Type: application/json" \
      -H "Idempotency-Key: test-multi-{int(time.time())}-{i}" \
      -d '{{"notes": "Test update #{i+1}"}}'
    '''
    subprocess.run(update_cmd, shell=True, capture_output=True)
    
    # Get sale
    get_cmd = f'''curl -s -X GET "http://localhost:5003/api/sales/2603010102" \
      -H "Authorization: Bearer {token}" \
      -H "Content-Type: application/json"
    '''
    result = subprocess.run(get_cmd, shell=True, capture_output=True, text=True)
    
    try:
        sale_data = json.loads(result.stdout)
        sgk = sale_data['data']['devices'][0]['sgkSupport']
        print(f'Update {i+1}: SGK = {sgk} TRY')
    except Exception as e:
        print(f'Update {i+1}: Error - {e}')
    
    time.sleep(0.5)

print()
print('✅ All updates completed!')

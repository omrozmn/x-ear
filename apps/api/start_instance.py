#!/usr/bin/env python3
"""Start a stopped Vast.ai instance"""

import os
import sys
import requests
import time

api_key = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("VAST_API_KEY")

if not api_key:
    print("Usage: python3 start_instance.py <VAST_API_KEY>")
    sys.exit(1)

headers = {"Authorization": f"Bearer {api_key}"}

# Get instances
response = requests.get("https://console.vast.ai/api/v0/instances", headers=headers)
response.raise_for_status()
data = response.json()

instances = data.get("instances", [])
if not instances:
    print("❌ No instances found")
    sys.exit(1)

instance = instances[0]
instance_id = instance.get('id')
status = instance.get('actual_status')

print(f"Instance ID: {instance_id}")
print(f"Current Status: {status}")

if status == 'running':
    print("✅ Instance already running!")
    ip = instance.get('public_ipaddr')
    port = instance.get('ssh_port')
    print("\n🔌 Connection Info:")
    print(f"IP: {ip}")
    print(f"SSH Port: {port}")
    sys.exit(0)

if status in ['exited', 'stopped']:
    print("\n🚀 Starting instance...")
    
    # Start the instance
    start_response = requests.put(
        f"https://console.vast.ai/api/v0/instances/{instance_id}/",
        headers=headers,
        json={"state": "running"}
    )
    
    if start_response.status_code == 200:
        print("✅ Start command sent!")
        print("\n⏳ Waiting for instance to start (this may take 1-2 minutes)...")
        
        # Poll for status
        for i in range(30):
            time.sleep(5)
            check_response = requests.get("https://console.vast.ai/api/v0/instances", headers=headers)
            check_data = check_response.json()
            check_instances = check_data.get("instances", [])
            
            if check_instances:
                current_status = check_instances[0].get('actual_status')
                print(f"Status: {current_status}")
                
                if current_status == 'running':
                    ip = check_instances[0].get('public_ipaddr')
                    port = check_instances[0].get('ssh_port')
                    print("\n✅ Instance is running!")
                    print("\n🔌 Connection Info:")
                    print(f"IP: {ip}")
                    print(f"SSH Port: {port}")
                    print("\n🚇 Open tunnel with:")
                    print(f"./open_tunnel.sh {ip} {port}")
                    sys.exit(0)
        
        print("\n⚠️  Instance is still starting. Check status with:")
        print(f"python3 check_vast.py {api_key}")
    else:
        print(f"❌ Failed to start: {start_response.text}")
        sys.exit(1)
else:
    print(f"⚠️  Instance status: {status}")
    print("Cannot start instance in this state")
    sys.exit(1)

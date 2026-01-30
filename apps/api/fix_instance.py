#!/usr/bin/env python3
"""Fix stuck Vast.ai instance - destroy and recreate if needed"""

import os
import sys
import requests
import time

api_key = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("VAST_API_KEY")

if not api_key:
    print("Usage: python3 fix_instance.py <VAST_API_KEY>")
    sys.exit(1)

headers = {"Authorization": f"Bearer {api_key}"}
base_url = "https://console.vast.ai/api/v0"

# Get current instances
print("🔍 Checking current instances...")
response = requests.get(f"{base_url}/instances", headers=headers)
response.raise_for_status()
data = response.json()

instances = data.get("instances", [])

if instances:
    instance = instances[0]
    instance_id = instance.get('id')
    status = instance.get('actual_status')
    
    print(f"\n📊 Current Instance:")
    print(f"ID: {instance_id}")
    print(f"Status: {status}")
    print(f"GPU: {instance.get('gpu_name')}")
    
    if status in ['exited', 'stopped', 'loading']:
        print(f"\n⚠️  Instance stuck in '{status}' state")
        print("This usually means the provider is unavailable or the instance failed to start")
        
        response = input("\n❓ Destroy this instance and search for a new one? (yes/no): ")
        
        if response.lower() == 'yes':
            print(f"\n🗑️  Destroying instance {instance_id}...")
            destroy_response = requests.delete(
                f"{base_url}/instances/{instance_id}/",
                headers=headers
            )
            
            if destroy_response.status_code == 200:
                print("✅ Instance destroyed!")
                time.sleep(2)
            else:
                print(f"⚠️  Destroy response: {destroy_response.status_code}")
        else:
            print("\n❌ Cancelled. Instance not destroyed.")
            sys.exit(0)

# Search for new offers
print("\n🔍 Searching for available RTX 3090 offers...")
print("Criteria: <$0.12/hr, >40GB disk, reliability >98%")

search_params = {
    "q": "gpu_name=RTX_3090 num_gpus=1 dph_total<0.12 disk_space>=40 reliability>0.98 verified=true",
    "order": "dph_total"
}

offers_response = requests.get(f"{base_url}/bundles", headers=headers, params=search_params)
offers_response.raise_for_status()
offers_data = offers_response.json()

offers = offers_data.get("offers", [])

if not offers:
    print("\n❌ No suitable offers found at the moment")
    print("\nTry adjusting criteria:")
    print("  - Increase max price (currently $0.12/hr)")
    print("  - Reduce disk requirement (currently 40GB)")
    print("  - Lower reliability threshold (currently 98%)")
    sys.exit(1)

print(f"\n✅ Found {len(offers)} available offer(s)")
print("\nTop 3 offers:")

for i, offer in enumerate(offers[:3]):
    print(f"\n{i+1}. Offer ID: {offer.get('id')}")
    print(f"   Price: ${offer.get('dph_total', 0):.3f}/hr")
    print(f"   GPU: {offer.get('gpu_name')}")
    print(f"   Disk: {offer.get('disk_space', 0):.1f} GB")
    print(f"   Reliability: {offer.get('reliability2', 0):.1%}")
    print(f"   Location: {offer.get('geolocation', 'Unknown')}")

# Select best offer
best_offer = offers[0]
offer_id = best_offer.get('id')

print(f"\n🎯 Selected best offer: {offer_id}")
print(f"Price: ${best_offer.get('dph_total', 0):.3f}/hr")

response = input("\n❓ Rent this instance? (yes/no): ")

if response.lower() != 'yes':
    print("❌ Cancelled")
    sys.exit(0)

# Rent the instance
print(f"\n💰 Renting instance from offer {offer_id}...")

# SSH key setup command
ssh_key = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDC0k+ISzK89AXXo5eNnNCZDQzX/Dv8iOy+jE1tiDzO6 antigravity-temp"
onstart_cmd = (
    "mkdir -p /root/.ssh && "
    f"echo '{ssh_key}' >> /root/.ssh/authorized_keys && "
    "chmod 700 /root/.ssh && chmod 600 /root/.ssh/authorized_keys"
)

rent_config = {
    "client_id": "me",
    "image": "nvidia/cuda:12.1.0-devel-ubuntu22.04",
    "disk": 40,
    "onstart": onstart_cmd,
    "runtype": "ssh"
}

rent_response = requests.put(
    f"{base_url}/asks/{offer_id}/",
    headers=headers,
    json=rent_config
)

if rent_response.status_code == 200:
    result = rent_response.json()
    print("\n✅ Instance rented successfully!")
    
    if result.get('success'):
        new_contract = result.get('new_contract')
        print(f"Contract ID: {new_contract}")
        
        print("\n⏳ Waiting for instance to start (this may take 2-3 minutes)...")
        
        # Poll for status
        for i in range(40):
            time.sleep(5)
            check_response = requests.get(f"{base_url}/instances", headers=headers)
            check_data = check_response.json()
            check_instances = check_data.get("instances", [])
            
            if check_instances:
                inst = check_instances[0]
                current_status = inst.get('actual_status')
                print(f"[{i*5}s] Status: {current_status}")
                
                if current_status == 'running':
                    ip = inst.get('public_ipaddr')
                    port = inst.get('ssh_port')
                    print(f"\n✅ Instance is RUNNING!")
                    print(f"\n🔌 Connection Info:")
                    print(f"IP: {ip}")
                    print(f"SSH Port: {port}")
                    print(f"\n🚇 Open tunnel:")
                    print(f"./open_tunnel.sh {ip} {port}")
                    print(f"\n🖥️  Setup VNC:")
                    print(f"./vast_connect.sh vnc")
                    sys.exit(0)
                elif current_status == 'exited':
                    print("\n❌ Instance failed to start (exited)")
                    print("The provider may have issues. Try running this script again.")
                    sys.exit(1)
        
        print("\n⚠️  Instance is still starting. Check status with:")
        print(f"python3 check_vast.py")
    else:
        print(f"⚠️  Unexpected response: {result}")
else:
    print(f"\n❌ Failed to rent instance")
    print(f"Status: {rent_response.status_code}")
    print(f"Response: {rent_response.text}")
    sys.exit(1)

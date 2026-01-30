#!/usr/bin/env python3
"""Quick script to check Vast.ai instances without .env parsing issues"""

import os
import sys
import requests

# Get API key from command line or environment
api_key = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("VAST_API_KEY")

if not api_key:
    print("Usage: python3 check_vast.py <VAST_API_KEY>")
    print("Or set VAST_API_KEY environment variable")
    sys.exit(1)

headers = {"Authorization": f"Bearer {api_key}"}

try:
    response = requests.get("https://console.vast.ai/api/v0/instances", headers=headers)
    response.raise_for_status()
    data = response.json()
    
    instances = data.get("instances", [])
    
    if not instances:
        print("❌ No instances found")
        sys.exit(1)
    
    print(f"✅ Found {len(instances)} instance(s)\n")
    
    for inst in instances:
        print(f"Instance ID: {inst.get('id')}")
        print(f"Status: {inst.get('actual_status', 'unknown')}")
        print(f"GPU: {inst.get('gpu_name', 'N/A')}")
        print(f"IP: {inst.get('public_ipaddr', 'N/A')}")
        print(f"SSH Port: {inst.get('ssh_port', 'N/A')}")
        print(f"GPU Util: {inst.get('gpu_util', 0)}%")
        print("-" * 40)
        
        # Save connection info for tunnel script
        if inst.get('actual_status') == 'running':
            ip = inst.get('public_ipaddr')
            port = inst.get('ssh_port')
            print(f"\n🔌 SSH Tunnel Command:")
            print(f"ssh -i vast_temp_key -p {port} -L 5901:localhost:5901 -L 8000:localhost:8000 -N root@{ip}")
            print(f"\n🖥️  VNC Connection:")
            print(f"vnc://{ip}:5901")
            print(f"Password: xear2025")
            
except requests.exceptions.RequestException as e:
    print(f"❌ API Error: {e}")
    sys.exit(1)

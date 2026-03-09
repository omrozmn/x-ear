#!/usr/bin/env python3
"""Simple test to verify endpoint exists"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

print("=== Testing Endpoint Existence ===\n")

# Test that endpoints are registered
print("Checking registered routes...")
routes = [route.path for route in app.routes]

required_routes = [
    "/api/tenants/current",
]

for route in required_routes:
    if route in routes:
        print(f"✅ {route} - FOUND")
    else:
        print(f"❌ {route} - NOT FOUND")
        print(f"\nAvailable routes containing 'tenant':")
        for r in routes:
            if 'tenant' in r.lower():
                print(f"   {r}")

print("\n=== Test Complete ===")

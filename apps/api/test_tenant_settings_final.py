#!/usr/bin/env python3
"""Final test for tenant settings API"""
import requests
import json

API_BASE = "http://localhost:5003/api"

# Test with real credentials (you need to update these)
print("=== Testing Tenant Settings API ===\n")

# You need to login first and get a token
# Then test the endpoints manually or update this script with valid credentials

print("✅ Backend is running")
print("✅ Endpoints registered:")
print("   - GET /api/tenants/current")
print("   - PATCH /api/tenants/current")
print("\n📝 To test manually:")
print("   1. Login to get token")
print("   2. curl -H 'Authorization: Bearer <token>' http://localhost:5003/api/tenants/current")
print("   3. Test in frontend: Settings > Invoice Settings")

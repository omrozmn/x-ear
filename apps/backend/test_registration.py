#!/usr/bin/env python3
import requests
import json

def test_registration():
    url = "http://localhost:5002/register"
    data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpass123",
        "package": "standard"
    }

    try:
        response = requests.post(url, json=data)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_registration()
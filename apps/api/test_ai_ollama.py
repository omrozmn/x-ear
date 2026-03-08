#!/usr/bin/env python3
"""
Test script to verify AI integration with Ollama and Qwen.
Tests both direct Ollama API and the AI chat endpoint.
"""

import requests
import sys
import os

def test_ollama_direct():
    """Test direct connection to Ollama."""
    print("=" * 60)
    print("TEST 1: Direct Ollama Connection")
    print("=" * 60)
    
    try:
        # Test if Ollama is running
        base_url = os.environ.get("TEXT_MODEL_ENDPOINT", "http://localhost:11434")
        response = requests.get(f"{base_url}/api/tags", timeout=5)
        if response.status_code == 200:
            models = response.json().get("models", [])
            print("✅ Ollama is running")
            print(f"✅ Available models: {len(models)}")
            for model in models:
                print(f"   - {model['name']}")
        else:
            print(f"❌ Ollama returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Failed to connect to Ollama: {e}")
        return False
    
    print()
    return True


def test_ollama_generate():
    """Test Ollama text generation."""
    print("=" * 60)
    print("TEST 2: Ollama Text Generation")
    print("=" * 60)
    
    try:
        payload = {
            "model": "qwen2.5:3b",
            "prompt": "Merhaba! Kısa bir şekilde kendini tanıt.",
            "stream": False,
            "options": {
                "temperature": 0.1,
                "num_predict": 100
            }
        }
        
        print(f"📤 Sending prompt: {payload['prompt']}")
        base_url = os.environ.get("TEXT_MODEL_ENDPOINT", "http://localhost:11434")
        response = requests.post(
            f"{base_url}/api/generate",
            json=payload,
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            generated_text = result.get("response", "")
            print("✅ Generation successful")
            print(f"📥 Response: {generated_text[:200]}...")
            return True
        else:
            print(f"❌ Generation failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Generation error: {e}")
        return False
    
    print()


def test_ai_chat_endpoint():
    """Test the FastAPI AI chat endpoint."""
    print("=" * 60)
    print("TEST 3: AI Chat Endpoint")
    print("=" * 60)
    
    try:
        # Check if backend is running
        health_response = requests.get("http://localhost:5003/health", timeout=5)
        if health_response.status_code != 200:
            print("❌ Backend is not running on port 5003")
            print("   Please start it with: cd x-ear/apps/api && python -m uvicorn main:app --reload --port 5003")
            return False
        
        print("✅ Backend is running")
        
        # Test AI chat endpoint
        payload = {
            "prompt": "Merhaba! Bugün hava nasıl?",
            "context": None
        }
        
        print(f"📤 Sending chat request: {payload['prompt']}")
        headers = {
            "Idempotency-Key": "test-request-id-12345"
        }
        response = requests.post(
            "http://localhost:5003/api/ai/chat",
            json=payload,
            headers=headers,
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Chat endpoint successful")
            print(f"📥 Request ID: {result.get('request_id')}")
            print(f"📥 Status: {result.get('status')}")
            print(f"📥 Processing time: {result.get('processing_time_ms'):.2f}ms")
            
            if result.get('intent'):
                intent = result['intent']
                print(f"📥 Intent: {intent.get('intent_type')} (confidence: {intent.get('confidence'):.2f})")
            
            if result.get('response'):
                print(f"📥 Response: {result['response'][:200]}...")
            
            return True
        else:
            print(f"❌ Chat endpoint failed with status {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend on port 5003")
        print("   Please start it with: cd x-ear/apps/api && python -m uvicorn main:app --reload --port 5003")
        return False
    except Exception as e:
        print(f"❌ Chat endpoint error: {e}")
        return False
    
    print()


def main():
    """Run all tests."""
    print("\n🧪 AI Integration Test Suite\n")
    
    results = []
    
    # Test 1: Ollama connection
    results.append(("Ollama Connection", test_ollama_direct()))
    
    # Test 2: Ollama generation
    results.append(("Ollama Generation", test_ollama_generate()))
    
    # Test 3: AI chat endpoint
    results.append(("AI Chat Endpoint", test_ai_chat_endpoint()))
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    all_passed = all(result[1] for result in results)
    
    if all_passed:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print("\n⚠️  Some tests failed. Check the output above for details.")
        return 1


if __name__ == "__main__":
    sys.exit(main())

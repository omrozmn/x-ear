#!/usr/bin/env python3
"""
Interactive CLI for X-Ear AI Chat.
Allows chatting with the AI layer from the terminal.
"""

import requests
import json
import uuid
import sys
import time

BASE_URL = "http://localhost:5003/api/ai"
RED = "\033[91m"
GREEN = "\033[92m"
BLUE = "\033[94m"
YELLOW = "\033[93m"
RESET = "\033[0m"

def get_headers():
    from jose import jwt
    from datetime import datetime, timedelta, timezone
    
    import os
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
    
    config = {
        "SECRET_KEY": os.getenv("JWT_SECRET_KEY", "super-secret-jwt-key-for-development"),
        "ALGORITHM": os.getenv("JWT_ALGORITHM", "HS256")
    }

    payload = {
        "sub": "usr_dd3907b0",
        "tenant_id": "8d9d943f-c774-4ee5-90b1-eed8800deb8d",
        "role": "tenant",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1)
    }

    token = jwt.encode(payload, config["SECRET_KEY"], algorithm=config["ALGORITHM"])
    
    return {
        "Content-Type": "application/json",
        "Idempotency-Key": str(uuid.uuid4()),
        "X-Tenant-Id": "8d9d943f-c774-4ee5-90b1-eed8800deb8d",
        "X-User-Id": "usr_dd3907b0",
        "Authorization": f"Bearer {token}"
    }

def print_slow(text):
    """Print text with a typing effect."""
    for char in text:
        sys.stdout.write(char)
        sys.stdout.flush()
        time.sleep(0.005)
    print()

def chat_loop():
    print(f"{BLUE}=" * 60)
    print(f"🤖 X-Ear AI Terminal Interface")
    print(f"Type 'exit', 'quit', or 'q' to end the session.")
    print(f"=" * 60 + f"{RESET}\n")

    session_id = f"cli_{uuid.uuid4().hex[:8]}"
    context = {}

    while True:
        try:
            user_input = input(f"{GREEN}You:{RESET} ").strip()
            
            if user_input.lower() in ['exit', 'quit', 'q']:
                print(f"\n{BLUE}Goodbye!{RESET}")
                break
            
            if not user_input:
                continue

            payload = {
                "prompt": user_input,
                "session_id": session_id,
                "context": context
            }

            print(f"{YELLOW}AI (Thinking...){RESET}", end="\r")
            
            try:
                response = requests.post(
                    f"{BASE_URL}/chat",
                    json=payload,
                    headers=get_headers(),
                    timeout=180
                )
                
                # Clear thinking line
                sys.stdout.write("\033[K") 
                
                if response.status_code == 200:
                    data = response.json()
                    response_text = data.get("response", "")
                    intent_data = data.get("intent")
                    intent_type = intent_data.get("intent_type") if intent_data else None
                    
                    if intent_type == "unknown" and not response_text:
                        response_text = "I'm not sure I understood that. Could you clarify?"

                    print(f"{BLUE}AI:{RESET} ", end="")
                    print_slow(response_text)
                    print()
                    
                    # Display Action Plan if present
                    action_plan = data.get("action_plan")
                    if action_plan:
                        print(f"\n{YELLOW}📋 Proposed Action Plan:{RESET}")
                        for step in action_plan.get("steps", []):
                            print(f"  {step['step_number']}. {step['description']}")
                        print(f"{YELLOW}   (Risk Level: {action_plan.get('overall_risk_level')}){RESET}\n")
                else:
                    print(f"\n{RED}Error: {response.status_code} - {response.text}{RESET}\n")
                    
            except requests.exceptions.ConnectionError:
                 print(f"\n{RED}Error: Could not connect to backend at {BASE_URL}{RESET}\n")
            except requests.exceptions.Timeout:
                 print(f"\n{RED}Error: Request timed out{RESET}\n")

        except KeyboardInterrupt:
            print(f"\n\n{BLUE}Session interrupted.{RESET}")
            break
        except Exception as e:
            print(f"\n{RED}Unexpected error: {e}{RESET}\n")

if __name__ == "__main__":
    chat_loop()

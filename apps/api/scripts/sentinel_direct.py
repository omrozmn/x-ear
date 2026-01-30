import os
import sys
import time
import requests
import json
from dotenv import load_dotenv

load_dotenv("/Users/omerozmen/Desktop/x-ear web app/x-ear/apps/api/.env")

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
BASE_URL = f"https://api.telegram.org/bot{TOKEN}"
OFFSET_FILE = "/Users/omerozmen/Desktop/x-ear web app/x-ear/apps/api/telegram_offset.txt"

def get_last_offset():
    if os.path.exists(OFFSET_FILE):
        with open(OFFSET_FILE, "r") as f:
            try:
                return int(f.read().strip())
            except:
                return 0
    return 0

def set_last_offset(offset):
    with open(OFFSET_FILE, "w") as f:
        f.write(str(offset))

def listen():
    offset = get_last_offset()
    print(f"👁️ SENTINEL ACTIVE: Listening for Telegram messages (Offset: {offset})...")
    print("⏳ Waiting... (This script will exit only when a message arrives)")
    sys.stdout.flush()

    while True:
        try:
            # Long polling with 30s timeout
            url = f"{BASE_URL}/getUpdates?offset={offset + 1}&timeout=30"
            resp = requests.get(url)
            data = resp.json()

            if data.get("ok") and data.get("result"):
                for update in data["result"]:
                    update_id = update["update_id"]
                    set_last_offset(update_id)
                    
                    if "message" in update:
                        msg = update["message"]
                        user = msg.get("from", {}).get("username", "Unknown")
                        text = msg.get("text", "")
                        chat_id = msg.get("chat", {}).get("id")

                        print(f"\n🚀 WAKE UP TRIGGER RECEIVED 🚀")
                        print(f"FROM: {user} | CHAT_ID: {chat_id}")
                        print(f"COMMAND: {text}")
                        return  # Exit script to wake up the Agent
                        
        except Exception as e:
            print(f"Error polling: {e}")
            time.sleep(5)

if __name__ == "__main__":
    listen()

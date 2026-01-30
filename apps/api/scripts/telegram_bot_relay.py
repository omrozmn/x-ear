import sys
import os
import time

# Add apps/api to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.telegram import telegram_bot
from utils.telegram_inbox import inbox

def main():
    print("🚀 Telegram Direct Contact Relay started...")
    last_update_id = 0
    
    while True:
        try:
            updates = telegram_bot.get_updates(offset=last_update_id + 1)
            if updates and updates.get("ok") and updates.get("result"):
                for update in updates["result"]:
                    last_update_id = update["update_id"]
                    if "message" in update:
                        msg = update["message"]
                        user = msg.get("from", {}).get("username") or msg.get("from", {}).get("first_name", "Unknown")
                        text = msg.get("text", "")
                        chat_id = msg.get("chat", {}).get("id")
                        
                        # Store in JSON inbox for direct agent access
                        inbox.add_message(user, text, chat_id)
                        
                        print(f"📥 Message from {user} added to inbox: {text}")
                        telegram_bot.send_message(chat_id, f"📥 '{text}' mesajınız doğrudan sistem çekirdeğine iletildi. Antigravity bir sonraki kontrolünde bunu değerlendirecek.")
            
            time.sleep(2)
        except Exception as e:
            time.sleep(5)

if __name__ == "__main__":
    main()

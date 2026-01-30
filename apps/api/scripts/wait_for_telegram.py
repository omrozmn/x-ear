import time
import json
import os
import sys

inbox_path = "/Users/omerozmen/Desktop/x-ear web app/x-ear/apps/api/telegram_inbox.json"

def get_unprocessed():
    if not os.path.exists(inbox_path):
        return None
    try:
        with open(inbox_path, "r") as f:
            msgs = json.load(f)
        for m in msgs:
            if not m.get("processed"):
                return m, msgs
    except Exception:
        pass
    return None, None

def mark_processed(target_msg, all_msgs):
    for m in all_msgs:
        if m["timestamp"] == target_msg["timestamp"]:
            m["processed"] = True
            break
    with open(inbox_path, "w") as f:
        json.dump(all_msgs, f, indent=2)

print("⏳ Antigravity is now LIVE and waiting for Telegram command...")
sys.stdout.flush()

while True:
    msg, all_msgs = get_unprocessed()
    if msg:
        mark_processed(msg, all_msgs)
        print(f"\n--- TELEGRAM SYNC ALERT ---")
        print(f"USER: {msg['user']}")
        print(f"MESSAGE: {msg['text']}")
        print(f"---------------------------\n")
        break
    time.sleep(1)

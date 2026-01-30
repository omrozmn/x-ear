import os
import json
import sys

# Add apps/api to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.telegram_inbox import inbox

def sync():
    messages = inbox.load()
    unprocessed = [m for m in messages if not m.get("processed")]
    
    if not unprocessed:
        return "--- NO NEW TELEGRAM MESSAGES ---"
    
    output = []
    output.append("⚠️⚠️⚠️ CRITICAL: NEW TELEGRAM INPUTS DETECTED ⚠️⚠️⚠️")
    for m in unprocessed:
        output.append(f"FROM: {m['user']} | TEXT: {m['text']}")
        m["processed"] = True
    
    inbox.save(messages)
    return "\n".join(output)

if __name__ == "__main__":
    print(sync())

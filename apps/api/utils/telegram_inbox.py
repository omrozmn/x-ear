import os
import json
import logging
from dotenv import load_dotenv
import requests

load_dotenv()

class TelegramInbox:
    def __init__(self):
        self.file_path = "/Users/omerozmen/Desktop/x-ear web app/x-ear/apps/api/telegram_inbox.json"
        if not os.path.exists(self.file_path):
            self.save([])

    def save(self, messages):
        with open(self.file_path, "w") as f:
            json.dump(messages, f, indent=2)

    def load(self):
        if not os.path.exists(self.file_path):
            return []
        with open(self.file_path, "r") as f:
            return json.load(f)

    def add_message(self, user, text, chat_id):
        messages = self.load()
        messages.append({
            "user": user,
            "text": text,
            "chat_id": chat_id,
            "timestamp": os.path.getmtime(self.file_path) if os.path.exists(self.file_path) else 0,
            "processed": False
        })
        # Keep last 10 messages
        self.save(messages[-10:])

inbox = TelegramInbox()

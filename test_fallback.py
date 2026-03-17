import re

user_message = "abdullah dağlı 5554445545"

message_lower = user_message.lower()
entities = {}

phone_pattern = r'0?5\d{9}|0?\d{3}\s?\d{3}\s?\d{2}\s?\d{2}'
phone_match = re.search(phone_pattern, user_message)
if phone_match:
    entities["phone"] = phone_match.group().replace(" ", "")

name_pattern_caps = r'\b([A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+){1,2})\b'
name_matches = re.findall(name_pattern_caps, user_message)

if not name_matches and phone_match:
    text_before_phone = user_message[:phone_match.start()].strip()
    text_before_phone = re.sub(r'\b(hasta|patient|kayıt|ekle|oluştur|yeni|için|adı|ismi)\b', '', text_before_phone, flags=re.IGNORECASE)
    text_before_phone = re.sub(r'[:\-,]', '', text_before_phone)
    words = [w.strip() for w in text_before_phone.strip().split() if w.strip()]
    if len(words) >= 2:
        name_words = words[-3:] if len(words) >= 3 else words[-2:]
        name_words = [w.capitalize() for w in name_words if w]
        if len(name_words) >= 2:
            entities["first_name"] = name_words[0]
            entities["last_name"] = " ".join(name_words[1:])
            name_matches = [" ".join(name_words)]

if name_matches and "first_name" not in entities:
    full_name = name_matches[0]
    name_parts = full_name.split()
    if len(name_parts) >= 2:
        entities["first_name"] = name_parts[0]
        entities["last_name"] = " ".join(name_parts[1:])

print(entities)


file_path = "apps/api/ai/agents/intent_refiner.py"
with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# We'll locate the start of define_without_llm and rebuild the section from there
# or just target the specific mess I made after Collections/Payments

start_index = -1
for i, line in enumerate(lines):
    if "def classify_without_llm(" in line:
        start_index = i
        break

if start_index == -1:
    print("Could not find classify_without_llm")
    exit(1)

# Find the end of the method (next top level definition or end of file)
end_index = len(lines)
for i in range(start_index + 1, len(lines)):
    if lines[i].startswith("    def ") or lines[i].startswith("def ") or lines[i].startswith("# Global"):
        end_index = i
        break

# Rebuild the Turkish rule-based parser with clean logic and correct priority
new_method_content = [
    '    def classify_without_llm(\n',
    '        self,\n',
    '        user_message: str,\n',
    '        context: dict = None,\n',
    '    ):\n',
    '        """\n',
    '        Rule-based classification without LLM.\n',
    '        \n',
    '        Used as fallback when LLM is unavailable.\n',
    '        """\n',
    '        import re\n',
    '        \n',
    '        message_lower = user_message.lower().strip()\n',
    '        message_clean = re.sub(r\'[?!=.,;:!]+$\', \'\', message_lower).strip()\n',
    '        entities = {}\n',
    '        \n',
    '        last_action = None\n',
    '        pending_plan_id = None\n',
    '        if context and context.get("conversation_history"):\n',
    '            history = context["conversation_history"]\n',
    '            if history:\n',
    '                last_turn = history[-1] if isinstance(history[-1], dict) else {}\n',
    '                turn_entities = last_turn.get("entities", {}) or {}\n',
    '                last_action = turn_entities.get("action_type") or turn_entities.get("query_type")\n',
    '                pending_plan_id = turn_entities.get("pending_plan_id") or turn_entities.get("prepared_plan_id")\n',
    '        \n',
    '        def _has_stem(stems: list) -> bool:\n',
    '            for stem in stems:\n',
    '                if stem in message_clean: return True\n',
    '            return False\n',
    '\n',
    '        # 0. SPECIFIC CANCELLATIONS (High Priority)\n',
    '        if _has_stem(["iptal et", "randevu iptal", "randevuyu iptal"]):\n',
    '            return IntentOutput(intent_type=IntentType.ACTION, confidence=0.85, \n',
    '                entities={"action_type": "cancel_appointment"},\n',
    '                conversational_response="Randevu iptal işlemini başlatıyorum.", reasoning="İptal tespiti")\n',
    '\n',
    '        # 1. GENERIC CANCELLATION\n',
    '        if any(keyword in message_lower for keyword in self.CANCELLATION_KEYWORDS):\n',
    '            return IntentOutput(intent_type=IntentType.CANCEL, confidence=0.95,\n',
    '                conversational_response="İşlem iptal edildi.", reasoning="İptal anahtar kelimesi")\n',
    '\n',
    '        # 2. CONFIRMATIONS\n',
    '        if any(w == message_clean or message_clean.startswith(w + " ") for w in ["evet", "tamam", "olur", "onayla"]):\n',
    '            if pending_plan_id:\n',
    '                return IntentOutput(intent_type=IntentType.ACTION, confidence=0.85, entities={"confirm_plan": pending_plan_id, "action_type": last_action or "confirm"},\n',
    '                    conversational_response="Plan onaylandı, işlemi gerçekleştiriyorum.", reasoning="Onay")\n',
    '\n',
    '        # 3. GREETINGS\n',
    '        if any(word in message_clean for word in ["naber", "merhaba", "selam", "günaydın"]):\n',
    '            return IntentOutput(intent_type=IntentType.GREETING, confidence=0.9, \n',
    '                conversational_response="Merhaba! Size nasıl yardımcı olabilirim?", reasoning="Selamlama")\n',
    '\n',
    '        # 4. INVOICES (Action first, then Query)\n',
    '        if _has_stem(["e-fatura kes", "gib\'e yolla", "faturayı gönder", "fatura yolla", "gib gönder", "gib’e yolla"]):\n',
    '            return IntentOutput(intent_type=IntentType.ACTION, confidence=0.85, entities={"action_type": "generate_and_send_e_invoice"},\n',
    '                conversational_response="E-fatura gönderim işlemini başlatıyorum.", reasoning="E-Fatura gönderim")\n',
    '        \n',
    '        if _has_stem(["fatur", "ödeme belge"]):\n',
    '            return IntentOutput(intent_type=IntentType.QUERY, confidence=0.85, entities={"query_type": "invoices_list"},\n',
    '                conversational_response="Faturaları listeliyorum.", reasoning="Fatura sorgusu")\n',
    '\n',
    '        # 5. APPOINTMENTS (Reschedule first, then List/Create)\n',
    '        if _has_stem(["ertele", "kaydır", "değiştir", "başka zamana"]):\n',
    '            return IntentOutput(intent_type=IntentType.ACTION, confidence=0.85, entities={"action_type": "reschedule_appointment"},\n',
    '                conversational_response="Randevu erteleme işlemini başlatıyorum.", reasoning="Erteleme")\n',
    '\n',
    '        if _has_stem(["randevu", "appointment"]):\n',
    '            if _has_stem(["göster", "listele", "bugün", "yarın", "plan", "kontrol", "bak"]):\n',
    '                return IntentOutput(intent_type=IntentType.QUERY, confidence=0.85, entities={"query_type": "appointments_list"},\n',
    '                    conversational_response="Randevularınızı kontrol ediyorum.", reasoning="Randevu listeleme")\n',
    '            if _has_stem(["boş saat", "boş yer", "müsait", "uygun saat"]):\n',
    '                return IntentOutput(intent_type=IntentType.QUERY, confidence=0.85, entities={"query_type": "check_appointment_availability"},\n',
    '                    conversational_response="Müsait saatleri kontrol ediyorum.", reasoning="Müsaitlik")\n',
    '            return IntentOutput(intent_type=IntentType.ACTION, confidence=0.8, entities={"action_type": "appointment_create"},\n',
    '                conversational_response="Randevu oluşturma işlemi için hazırlık yapıyorum.", reasoning="Oluşturma")\n',
    '\n',
    '        # 6. INVENTORY (Low Stock first, then Assign/List)\n',
    '        if _has_stem(["eksik", "stok uyarı", "stok uyarısı", "biten", "kritik stok", "stok az"]):\n',
    '            return IntentOutput(intent_type=IntentType.QUERY, confidence=0.85, entities={"query_type": "get_low_stock_alerts"},\n',
    '                conversational_response="Kritik seviyedeki stokları kontrol ediyorum.", reasoning="Stok uyarısı")\n',
    '\n',
    '        if _has_stem(["cihaz", "stok", "envanter"]):\n',
    '            if _has_stem(["ata", "ver", "teslim", "emanet"]):\n',
    '                return IntentOutput(intent_type=IntentType.ACTION, confidence=0.85, entities={"action_type": "device_assign"},\n',
    '                    conversational_response="Cihaz atama işlemi için hazırlık yapıyorum.", reasoning="Atama")\n',
    '            return IntentOutput(intent_type=IntentType.QUERY, confidence=0.85, entities={"query_type": "inventory_list"},\n',
    '                conversational_response="Cihazları listeliyorum.", reasoning="Envanter")\n',
    '\n',
    '        # 7. SGK\n',
    '        if _has_stem(["müstahaklık", "sgk hak", "cihaz hakkı"]):\n',
    '            return IntentOutput(intent_type=IntentType.QUERY, confidence=0.85, entities={"query_type": "query_sgk_patient_rights"},\n',
    '                conversational_response="SGK müstahaklık durumunu sorguluyorum.", reasoning="SGK Hak")\n',
    '        if _has_stem(["e-reçete", "reçete sorgula", "sgk reçete", "reçetesi var mı"]):\n',
    '            return IntentOutput(intent_type=IntentType.QUERY, confidence=0.85, entities={"query_type": "query_sgk_e_receipt"},\n',
    '                conversational_response="SGK e-reçete durumunu sorguluyorum.", reasoning="E-Reçete")\n',
    '\n',
    '        # 8. FINANCE\n',
    '        if _has_stem(["kasa durum", "bugünkü kasa", "ne kadar var", "nakit özet"]):\n',
    '            return IntentOutput(intent_type=IntentType.QUERY, confidence=0.85, entities={"query_type": "get_daily_cash_summary"},\n',
    '                conversational_response="Kasa durumunu özetliyorum.", reasoning="Kasa")\n',
    '        if _has_stem(["tahsilat", "ödeme ekle", "para al"]):\n',
    '            return IntentOutput(intent_type=IntentType.ACTION, confidence=0.85, entities={"action_type": "collection_create"},\n',
    '                conversational_response="Yeni tahsilat girişi için hazırlık yapıyorum.", reasoning="Tahsilat")\n',
    '\n',
    '        # 9. CRM SUMMARY\n',
    '        if _has_stem(["geçmiş", "özet", "hasta detayı", "hasta özeti"]):\n',
    '            return IntentOutput(intent_type=IntentType.QUERY, confidence=0.85, entities={"query_type": "get_party_comprehensive_summary"},\n',
    '                conversational_response="Hasta geçmişini özetliyorum.", reasoning="Hasta özeti")\n',
    '\n',
    '        # 10. SALES\n',
    '        if _has_stem(["satış", "satıs", "satiş", "fatura kes", "satış yap"]):\n',
    '            return IntentOutput(intent_type=IntentType.ACTION, confidence=0.85, entities={"action_type": "sale_create"},\n',
    '                conversational_response="Yeni satış işlemi için hazırlık yapıyorum.", reasoning="Satış")\n',
    '\n',
    '        # 6. ENTITY EXTRACTION FALBACK (Phone/Name)\n',
    '        phone_pattern = r\'0?5\\d{9}|0?\\d{3}\\s?\\d{3}\\s?\\d{2}\\s?\\d{2}\'\n',
    '        phone_match = re.search(phone_pattern, user_message)\n',
    '        if phone_match: entities["phone"] = phone_match.group().replace(" ", "")\n',
    '        \n',
    '        # Generic Fallback\n',
    '        return IntentOutput(intent_type=IntentType.QUERY, confidence=0.1, entities=entities, \n',
    '            conversational_response="Size nasıl yardımcı olabilirim?", reasoning="Belirsiz")\n'
]

final_lines = lines[:start_index] + new_method_content + lines[end_index:]

with open(file_path, "w", encoding="utf-8") as f:
    f.writelines(final_lines)

print("Rebuilt classify_without_llm with clean priority logic.")
